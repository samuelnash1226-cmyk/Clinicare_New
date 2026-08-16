import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Activity, TrendingUp, Download, BarChart3, BookOpen, GraduationCap, Building2, Layers, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

export type BranchFilter = 'ALL' | 'IBED' | 'SHS' | 'College';

export function getBranchFromGrade(grade?: string): 'IBED' | 'SHS' | 'College' {
  if (!grade) return 'IBED';
  const g = grade.trim().toLowerCase();
  if (
    g.includes('college') ||
    g.includes('personnel') ||
    g.includes('staff') ||
    g.includes('faculty') ||
    g.includes('bs') ||
    g.includes('ba') ||
    g.includes('tertiary') ||
    g.includes('1st year') ||
    g.includes('2nd year') ||
    g.includes('3rd year') ||
    g.includes('4th year')
  ) {
    return 'College';
  }
  if (
    g.includes('grade 11') ||
    g.includes('grade 12') ||
    g.includes('shs') ||
    g.includes('senior high') ||
    g.includes('g11') ||
    g.includes('g12')
  ) {
    return 'SHS';
  }
  return 'IBED';
}

const BRANCHES: { id: BranchFilter; label: string; icon: React.ElementType; color: string; badgeColor: string }[] = [
  { id: 'ALL', label: 'All-in-One (All Departments)', icon: Layers, color: 'text-slate-700', badgeColor: 'bg-slate-900 text-white' },
  { id: 'IBED', label: 'IBED', icon: BookOpen, color: 'text-blue-600', badgeColor: 'bg-blue-600 text-white' },
  { id: 'SHS', label: 'Senior High School (SHS)', icon: GraduationCap, color: 'text-violet-600', badgeColor: 'bg-violet-600 text-white' },
  { id: 'College', label: 'College / Personnel', icon: Building2, color: 'text-emerald-600', badgeColor: 'bg-emerald-600 text-white' },
];

const COLORS = ['#1C7C54', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#6366F1'];

export function AdminDashboard() {
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [activeBranch, setActiveBranch] = useState<BranchFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const symptomChartRef = useRef<HTMLDivElement>(null);
  const gradeChartRef = useRef<HTMLDivElement>(null);
  const deptChartRef = useRef<HTMLDivElement>(null);

  const loadRawData = async () => {
    setLoading(true);
    try {
      // Load students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllStudents(students);

      // Load visits
      const visitsSnapshot = await getDocs(collection(db, 'clinicVisits'));
      const visits = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllVisits(visits);
    } catch (error) {
      console.error('Error loading analytics raw data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRawData();
  }, []);

  // Filter visits based on active branch
  const filteredVisits = allVisits.filter(visit => {
    if (activeBranch === 'ALL') return true;
    return getBranchFromGrade(visit.grade) === activeBranch;
  });

  // Filter students based on active branch
  const filteredStudents = allStudents.filter(student => {
    if (activeBranch === 'ALL') return true;
    return getBranchFromGrade(student.grade) === activeBranch;
  });

  // Calculate statistics for active filter
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const thisWeekVisits = filteredVisits.filter(v => {
    const date = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
    return date >= weekAgo;
  }).length;

  const stats = {
    totalStudents: filteredStudents.length,
    totalVisits: filteredVisits.length,
    thisWeekVisits,
    avgVisitsPerDay: thisWeekVisits / 7
  };

  // Branch visit breakdown counts
  const branchCounts = {
    ALL: allVisits.length,
    IBED: allVisits.filter(v => getBranchFromGrade(v.grade) === 'IBED').length,
    SHS: allVisits.filter(v => getBranchFromGrade(v.grade) === 'SHS').length,
    College: allVisits.filter(v => getBranchFromGrade(v.grade) === 'College').length,
  };

  // Department distribution chart data for ALL view
  const departmentChartData = [
    { name: 'IBED', value: branchCounts.IBED, color: '#3B82F6' },
    { name: 'Senior High School (SHS)', value: branchCounts.SHS, color: '#8B5CF6' },
    { name: 'College / Personnel', value: branchCounts.College, color: '#10B981' },
  ].filter(item => item.value > 0);

  // Common Symptoms Analysis for filtered visits
  const symptomCounts: Record<string, number> = {};
  filteredVisits.forEach(visit => {
    const symptoms = (visit.symptoms || '').toLowerCase();
    if (!symptoms) return;

    if (symptoms.includes('headache')) symptomCounts['Headache'] = (symptomCounts['Headache'] || 0) + 1;
    if (symptoms.includes('fever')) symptomCounts['Fever'] = (symptomCounts['Fever'] || 0) + 1;
    if (symptoms.includes('stomach') || symptoms.includes('abdominal')) symptomCounts['Stomachache'] = (symptomCounts['Stomachache'] || 0) + 1;
    if (symptoms.includes('cough')) symptomCounts['Cough'] = (symptomCounts['Cough'] || 0) + 1;
    if (symptoms.includes('cold') || symptoms.includes('flu')) symptomCounts['Cold / Flu'] = (symptomCounts['Cold / Flu'] || 0) + 1;
    if (symptoms.includes('dizzy') || symptoms.includes('dizziness')) symptomCounts['Dizziness'] = (symptomCounts['Dizziness'] || 0) + 1;
    if (symptoms.includes('nausea') || symptoms.includes('vomit')) symptomCounts['Nausea / Vomiting'] = (symptomCounts['Nausea / Vomiting'] || 0) + 1;
    if (symptoms.includes('injury') || symptoms.includes('wound') || symptoms.includes('cut')) symptomCounts['Injury / Wound'] = (symptomCounts['Injury / Wound'] || 0) + 1;
    if (symptoms.includes('cramps') || symptoms.includes('dysmenorrhea')) symptomCounts['Dysmenorrhea'] = (symptomCounts['Dysmenorrhea'] || 0) + 1;
    if (symptoms.includes('tooth')) symptomCounts['Toothache'] = (symptomCounts['Toothache'] || 0) + 1;

    // If none of standard keywords matched, fall back to capitalising the phrase
    const matchedKnown = ['headache', 'fever', 'stomach', 'abdominal', 'cough', 'cold', 'flu', 'dizzy', 'dizziness', 'nausea', 'vomit', 'injury', 'wound', 'cut', 'cramps', 'dysmenorrhea', 'tooth'].some(k => symptoms.includes(k));
    if (!matchedKnown && symptoms.trim()) {
      const formatted = visit.symptoms.trim().charAt(0).toUpperCase() + visit.symptoms.trim().slice(1);
      symptomCounts[formatted] = (symptomCounts[formatted] || 0) + 1;
    }
  });

  const symptomChartData = Object.entries(symptomCounts)
    .map(([name, count], index) => ({
      id: `symptom-${name}-${index}`,
      name,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 symptoms

  // Visits by Grade/Year level for filtered visits
  const gradeCounts: Record<string, number> = {};
  filteredVisits.forEach(visit => {
    const grade = visit.grade || 'Unspecified';
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
  });

  const gradeChartData = Object.entries(gradeCounts)
    .map(([name, value], index) => ({
      id: `grade-${name}-${index}`,
      name,
      value
    }))
    .sort((a, b) => b.value - a.value);

  // PDF Report Export
  const handleDownloadReport = async () => {
    if (!symptomChartRef.current || !gradeChartRef.current) {
      toast.error('Charts not ready. Please wait...');
      return;
    }

    setDownloading(true);
    try {
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

      // Header Background
      pdf.setFillColor(28, 124, 84);
      pdf.rect(0, 0, pageWidth, 35, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NDKC ClinicCare', pageWidth / 2, 14, { align: 'center' });

      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'normal');
      const activeLabel = BRANCHES.find(b => b.id === activeBranch)?.label || 'All Departments';
      pdf.text(`Analytics & Health Report (${activeLabel})`, pageWidth / 2, 22, { align: 'center' });

      pdf.setFontSize(9);
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.text(`Report Generated: ${dateStr}`, pageWidth / 2, 29, { align: 'center' });

      yPosition = 45;

      // Summary Statistics Section
      pdf.setTextColor(28, 124, 84);
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary Statistics', margin, yPosition);
      yPosition += 10;

      const boxWidth = (pageWidth - (margin * 2) - 5) / 2;
      const boxHeight = 22;

      // Total Students Box
      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Total Students', margin + 5, yPosition + 7);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.totalStudents.toString(), margin + 5, yPosition + 17);

      // Total Visits Box
      pdf.setFillColor(16, 185, 129);
      pdf.roundedRect(margin + boxWidth + 5, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Total Clinic Visits', margin + boxWidth + 10, yPosition + 7);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.totalVisits.toString(), margin + boxWidth + 10, yPosition + 17);

      yPosition += boxHeight + 5;

      // Visits This Week Box
      pdf.setFillColor(245, 158, 11);
      pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Visits This Week', margin + 5, yPosition + 7);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.thisWeekVisits.toString(), margin + 5, yPosition + 17);

      // Daily Average Box
      pdf.setFillColor(168, 85, 247);
      pdf.roundedRect(margin + boxWidth + 5, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Daily Average', margin + boxWidth + 10, yPosition + 7);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stats.avgVisitsPerDay.toFixed(1), margin + boxWidth + 10, yPosition + 17);

      yPosition += boxHeight + 15;

      // Common Symptoms Chart
      if (symptomChartData.length > 0) {
        pdf.setTextColor(28, 124, 84);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Common Symptoms Analysis', margin, yPosition);
        yPosition += 8;

        const chartWidth = pageWidth - (margin * 2);
        const chartHeight = 65;
        pdf.addImage(symptomChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Visits by Grade Chart
      if (gradeChartData.length > 0) {
        if (yPosition + 75 > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setTextColor(28, 124, 84);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Visits by Grade / Department Breakdown', margin, yPosition);
        yPosition += 8;

        const chartWidth = pageWidth - (margin * 2);
        const chartHeight = 65;
        pdf.addImage(gradeChartImage, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 10;
      }

      // Footer
      const footerY = pageHeight - 12;
      pdf.setDrawColor(28, 124, 84);
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Generated by NDKC ClinicCare Analytics System', pageWidth / 2, footerY, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text('Notre Dame of Kidapawan College', pageWidth / 2, footerY + 4, { align: 'center' });

      pdf.save(`NDKC_Analytics_${activeBranch}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Analytics report downloaded successfully! 🎉');
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
          <h1 className="text-slate-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ndkc-green to-emerald-700 shadow-md shadow-emerald-500/20 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            Analytics & Health Overview
          </h1>
          <p className="mt-1 text-slate-600">
            Real-time symptoms and clinic visit trends partitioned by department
          </p>
        </div>
        <Button
          onClick={handleDownloadReport}
          disabled={downloading || loading}
          className="h-11 px-5 bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50"
        >
          {downloading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </>
          )}
        </Button>
      </div>

      {/* Branch / Department Partition Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm space-y-2">
        <div className="flex items-center gap-2 px-3 pt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5 text-ndkc-green" />
          Partition Analytics by Department:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BRANCHES.map(branch => {
            const Icon = branch.icon;
            const isActive = activeBranch === branch.id;
            const count = branchCounts[branch.id];
            return (
              <button
                key={branch.id}
                onClick={() => setActiveBranch(branch.id)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-ndkc-green to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : branch.color}`} />
                  <span>{branch.label.split(' ')[0]}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white border-white/40' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Indicator */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Showing Data For:</span>
          <Badge className={BRANCHES.find(b => b.id === activeBranch)?.badgeColor}>
            {BRANCHES.find(b => b.id === activeBranch)?.label}
          </Badge>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {stats.totalVisits} visit{stats.totalVisits !== 1 ? 's' : ''} recorded
        </span>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Students ({activeBranch})</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2.5 transition-colors group-hover:bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalStudents}</div>
            <p className="mt-1 text-sm text-slate-500">Registered in {activeBranch === 'ALL' ? 'system' : activeBranch}</p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Visits</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalVisits}</div>
            <p className="mt-1 text-sm text-slate-500">Total for {activeBranch === 'ALL' ? 'all departments' : activeBranch}</p>
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
            <p className="mt-1 text-sm text-slate-500">Visits/day this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown Overview (Shown when All-in-One is selected) */}
      {activeBranch === 'ALL' && departmentChartData.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-ndkc-green" />
              Visits Partitioned by Department
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">Overall comparison between IBED, Senior High School, and College</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { name: 'IBED', count: branchCounts.IBED, color: 'border-blue-300 bg-blue-50 text-blue-800', icon: BookOpen, desc: 'Kindergarten to Grade 10' },
                { name: 'Senior High School (SHS)', count: branchCounts.SHS, color: 'border-violet-300 bg-violet-50 text-violet-800', icon: GraduationCap, desc: 'Grade 11 & Grade 12' },
                { name: 'College / Personnel', count: branchCounts.College, color: 'border-emerald-300 bg-emerald-50 text-emerald-800', icon: Building2, desc: 'Higher Ed & Campus Staff' },
              ].map(dept => {
                const Icon = dept.icon;
                const pct = allVisits.length > 0 ? ((dept.count / allVisits.length) * 100).toFixed(1) : '0';
                return (
                  <div key={dept.name} className={`rounded-2xl border-2 p-5 ${dept.color} transition-all hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="h-6 w-6" />
                      <Badge variant="outline" className="bg-white/80 font-bold text-xs">{pct}% of total</Badge>
                    </div>
                    <p className="text-sm font-semibold">{dept.name}</p>
                    <p className="text-xs opacity-75 mt-0.5">{dept.desc}</p>
                    <p className="text-3xl font-bold mt-3">{dept.count} <span className="text-sm font-normal opacity-80">visits</span></p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Symptoms Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Common Symptoms Analysis</span>
              <Badge variant="outline" className="text-xs font-normal">
                {activeBranch} View
              </Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Most reported health concerns in {activeBranch === 'ALL' ? 'all departments' : activeBranch}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : symptomChartData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No symptom data available for {activeBranch}
              </div>
            ) : (
              <div ref={symptomChartRef}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={symptomChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748B"
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      fontSize={11}
                    />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
            <CardTitle className="flex items-center justify-between">
              <span>Visits by Grade / Year Level</span>
              <Badge variant="outline" className="text-xs font-normal">
                {activeBranch} View
              </Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Distribution across grade levels for {activeBranch === 'ALL' ? 'all departments' : activeBranch}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : gradeChartData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No grade data available for {activeBranch}
              </div>
            ) : (
              <div ref={gradeChartRef}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={gradeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={95}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gradeChartData.map((entry, index) => (
                        <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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