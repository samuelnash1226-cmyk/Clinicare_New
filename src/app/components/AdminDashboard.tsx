import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Activity, TrendingUp, Download, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalVisits: 0,
    thisWeekVisits: 0,
    avgVisitsPerDay: 0
  });

  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [gradeData, setGradeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const symptomChartRef = useRef<HTMLDivElement>(null);
  const gradeChartRef = useRef<HTMLDivElement>(null);

  const loadAnalytics = async () => {
    try {
      // Load students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const totalStudents = studentsSnapshot.size;

      // Load visits
      const visitsSnapshot = await getDocs(collection(db, 'clinicVisits'));
      const visits = visitsSnapshot.docs.map(doc => doc.data());
      
      // Calculate stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const thisWeekVisits = visits.filter(v => {
        const date = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
        return date >= weekAgo;
      }).length;

      // Analyze symptoms
      const symptomCounts: Record<string, number> = {};
      visits.forEach(visit => {
        const symptoms = visit.symptoms?.toLowerCase() || '';
        if (symptoms.includes('headache')) symptomCounts['Headache'] = (symptomCounts['Headache'] || 0) + 1;
        if (symptoms.includes('fever')) symptomCounts['Fever'] = (symptomCounts['Fever'] || 0) + 1;
        if (symptoms.includes('stomach')) symptomCounts['Stomachache'] = (symptomCounts['Stomachache'] || 0) + 1;
        if (symptoms.includes('cough')) symptomCounts['Cough'] = (symptomCounts['Cough'] || 0) + 1;
        if (symptoms.includes('cold')) symptomCounts['Cold'] = (symptomCounts['Cold'] || 0) + 1;
      });

      const symptomChartData = Object.entries(symptomCounts).map(([name, count], index) => ({
        id: `symptom-${name}-${index}`,
        name,
        count
      }));

      // Analyze by grade
      const gradeCounts: Record<string, number> = {};
      visits.forEach(visit => {
        const grade = visit.grade || 'Unknown';
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
      });

      const gradeChartData = Object.entries(gradeCounts).map(([name, value], index) => ({
        id: `grade-${name}-${index}`,
        name,
        value
      }));

      setStats({
        totalStudents,
        totalVisits: visits.length,
        thisWeekVisits,
        avgVisitsPerDay: thisWeekVisits / 7
      });

      setSymptomData(symptomChartData);
      setGradeData(gradeChartData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const COLORS = ['#1C7C54', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];

  const handleDownloadReport = async () => {
    if (!symptomChartRef.current || !gradeChartRef.current) {
      toast.error('Charts not ready. Please wait...');
      return;
    }

    setDownloading(true);
    try {
      // Capture chart images
      const symptomChartImage = await toPng(symptomChartRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      const gradeChartImage = await toPng(gradeChartRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = 20;

      // Decorative Header Background
      pdf.setFillColor(28, 124, 84); // NDKC Green
      pdf.rect(0, 0, pageWidth, 35, 'F');

      // Header - White text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NDKC ClinicCare', pageWidth / 2, 15, { align: 'center' });

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Analytics & Health Report', pageWidth / 2, 23, { align: 'center' });

      // Date Badge
      pdf.setFontSize(9);
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.text(`Report Generated: ${dateStr}`, pageWidth / 2, 30, { align: 'center' });

      yPosition = 45;

      // Reset text color to black for content
      pdf.setTextColor(0, 0, 0);

      // Summary Statistics Section with colored boxes
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(28, 124, 84);
      pdf.text('Summary Statistics', margin, yPosition);
      yPosition += 12;

      // Stat boxes
      const boxWidth = (pageWidth - (margin * 2) - 5) / 2;
      const boxHeight = 22;

      // Total Students Box
      pdf.setFillColor(59, 130, 246); // Blue
      pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('Total Students', margin + 5, yPosition + 7);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.totalStudents.toString(), margin + 5, yPosition + 17);

      // Total Visits Box
      pdf.setFillColor(16, 185, 129); // Green
      pdf.roundedRect(margin + boxWidth + 5, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Total Clinic Visits', margin + boxWidth + 10, yPosition + 7);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.totalVisits.toString(), margin + boxWidth + 10, yPosition + 17);

      yPosition += boxHeight + 5;

      // This Week Box
      pdf.setFillColor(245, 158, 11); // Amber
      pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Visits This Week', margin + 5, yPosition + 7);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.thisWeekVisits.toString(), margin + 5, yPosition + 17);

      // Daily Average Box
      pdf.setFillColor(168, 85, 247); // Purple
      pdf.roundedRect(margin + boxWidth + 5, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Daily Average', margin + boxWidth + 10, yPosition + 7);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.avgVisitsPerDay.toFixed(1), margin + boxWidth + 10, yPosition + 17);

      yPosition += boxHeight + 15;

      // Common Symptoms Chart
      if (symptomData.length > 0) {
        pdf.setTextColor(28, 124, 84);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Common Symptoms Analysis', margin, yPosition);
        yPosition += 8;

        const chartWidth = pageWidth - (margin * 2);
        const chartHeight = 70;
        pdf.addImage(symptomChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Visits by Grade Chart
      if (gradeData.length > 0) {
        // Add new page if needed
        if (yPosition + 80 > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setTextColor(28, 124, 84);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Visits by Grade/Year Level', margin, yPosition);
        yPosition += 8;

        const chartWidth = pageWidth - (margin * 2);
        const chartHeight = 70;
        pdf.addImage(gradeChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 10;

        // Add percentage breakdown
        yPosition += 5;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 65, 85);
        pdf.text('Distribution Breakdown:', margin, yPosition);
        yPosition += 7;

        const totalGradeVisits = gradeData.reduce((sum, item) => sum + item.value, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        gradeData.forEach((item, index) => {
          const percentage = ((item.value / totalGradeVisits) * 100).toFixed(1);
          const color = COLORS[index % COLORS.length];

          // Color indicator
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
          };

          const rgb = hexToRgb(color);
          pdf.setFillColor(rgb.r, rgb.g, rgb.b);
          pdf.circle(margin + 2, yPosition - 1, 1.5, 'F');

          pdf.setTextColor(51, 65, 85);
          pdf.text(`${item.name}: ${item.value} visits (${percentage}%)`, margin + 6, yPosition);
          yPosition += 6;
        });
      }

      // Footer with styling
      const footerY = pageHeight - 12;
      pdf.setDrawColor(28, 124, 84);
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Generated by SRB ClinicCare System', pageWidth / 2, footerY, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text('Notre Dame of Kidapawan College', pageWidth / 2, footerY + 4, { align: 'center' });

      // Save PDF
      pdf.save(`NDKC_ClinicCare_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('World-class report downloaded! 🎉');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Analytics and system overview
          </p>
        </div>
        <Button
          onClick={handleDownloadReport}
          disabled={downloading || loading}
          className="h-12 px-6 bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Export Report
            </>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Students</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2.5 transition-colors group-hover:bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalStudents}</div>
            <p className="mt-1 text-sm text-slate-500">Registered in system</p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Visits</CardTitle>
            <div className="rounded-lg bg-green-50 p-2.5 transition-colors group-hover:bg-green-100">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalVisits}</div>
            <p className="mt-1 text-sm text-slate-500">All time clinic visits</p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">This Week</CardTitle>
            <div className="rounded-lg bg-amber-50 p-2.5 transition-colors group-hover:bg-amber-100">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.thisWeekVisits}</div>
            <p className="mt-1 text-sm text-slate-500">Visits in last 7 days</p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Daily Average</CardTitle>
            <div className="rounded-lg bg-purple-50 p-2.5 transition-colors group-hover:bg-purple-100">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.avgVisitsPerDay.toFixed(1)}</div>
            <p className="mt-1 text-sm text-slate-500">Per day this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Symptoms Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Common Symptoms</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Most reported health concerns</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : symptomData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No symptom data available yet
              </div>
            ) : (
              <div ref={symptomChartRef}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={symptomData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="#1C7C54" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Visits by Grade</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Distribution across year levels</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : gradeData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No grade data available yet
              </div>
            ) : (
              <div ref={gradeChartRef}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gradeData.map((entry) => (
                        <Cell key={entry.id} fill={COLORS[gradeData.indexOf(entry) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}