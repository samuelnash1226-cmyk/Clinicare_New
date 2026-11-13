import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Activity, TrendingUp, Download, BarChart3, BookOpen, GraduationCap, Building2, Layers, Filter, FileSpreadsheet, Printer, CalendarDays, FileText, ClipboardList, Pill, Clock } from 'lucide-react';
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
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  type ReportFrequency = 'monthly' | 'weekly';
  const [reportFrequency, setReportFrequency] = useState<ReportFrequency>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  const symptomChartRef = useRef<HTMLDivElement>(null);
  const gradeChartRef = useRef<HTMLDivElement>(null);
  const deptChartRef = useRef<HTMLDivElement>(null);
  const medChartRef = useRef<HTMLDivElement>(null);

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

      // Load inventory transactions
      const txSnapshot = await getDocs(collection(db, 'inventoryTransactions'));
      const txList = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllTransactions(txList);
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

  // Generate month options from all visits
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    allVisits.forEach(v => {
      const d = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp || v.createdAt || 0);
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [allVisits]);

  // Generate week options (last 12 weeks)
  const weekOptions = useMemo(() => {
    const list: { id: string; label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    
    // Find current Monday
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 12; i++) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() - (i * 7));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      let prefix = '';
      if (i === 0) prefix = 'This Week: ';
      else if (i === 1) prefix = 'Last Week: ';
      else prefix = `${i} wks ago: `;

      const id = i === 0 ? 'current' : `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
      list.push({
        id,
        label: `${prefix}${startStr} – ${endStr}`,
        start,
        end,
      });
    }

    return list;
  }, []);

  // Filter visits by selected period (Monthly or Weekly)
  const periodFilteredVisits = useMemo(() => {
    if (reportFrequency === 'monthly') {
      if (selectedMonth === 'ALL') return filteredVisits;
      const [y, m] = selectedMonth.split('-').map(Number);
      return filteredVisits.filter(v => {
        const d = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp || v.createdAt || 0);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    } else {
      const activeWeek = weekOptions.find(w => w.id === selectedWeek) || weekOptions[0];
      if (!activeWeek) return filteredVisits;
      return filteredVisits.filter(v => {
        const d = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp || v.createdAt || 0);
        return d >= activeWeek.start && d <= activeWeek.end;
      });
    }
  }, [filteredVisits, reportFrequency, selectedMonth, selectedWeek, weekOptions]);

  // Backward compatibility alias for any existing reference
  const monthFilteredVisits = periodFilteredVisits;

  // Filter transactions by selected period (Monthly or Weekly) and active department branch
  const periodFilteredTransactions = useMemo(() => {
    let txs = allTransactions;
    if (reportFrequency === 'monthly') {
      if (selectedMonth !== 'ALL') {
        const [y, m] = selectedMonth.split('-').map(Number);
        txs = txs.filter(tx => {
          const d = tx.timestamp?.toDate ? tx.timestamp.toDate() : (tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.timestamp || tx.createdAt || 0));
          return d.getFullYear() === y && d.getMonth() + 1 === m;
        });
      }
    } else {
      const activeWeek = weekOptions.find(w => w.id === selectedWeek) || weekOptions[0];
      if (activeWeek) {
        txs = txs.filter(tx => {
          const d = tx.timestamp?.toDate ? tx.timestamp.toDate() : (tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.timestamp || tx.createdAt || 0));
          return d >= activeWeek.start && d <= activeWeek.end;
        });
      }
    }

    // Filter by branch if activeBranch !== 'ALL'
    if (activeBranch !== 'ALL') {
      const studentMap = new Map(allStudents.map(s => [s.id, s]));
      const studentIdMap = new Map(allStudents.map(s => [s.studentId, s]));
      const studentNameMap = new Map(allStudents.map(s => [(s.name || '').toLowerCase(), s]));

      txs = txs.filter(tx => {
        let grade = tx.grade;
        if (!grade && tx.studentId) {
          grade = studentMap.get(tx.studentId)?.grade || studentIdMap.get(tx.studentId)?.grade;
        }
        if (!grade && tx.patientName) {
          grade = studentNameMap.get((tx.patientName || '').toLowerCase())?.grade;
        }
        if (!grade) {
          const pName = (tx.patientName || '').toLowerCase();
          if (pName.includes('college') || pName.includes('staff') || pName.includes('faculty') || pName.includes('personnel')) {
            grade = 'College';
          }
        }
        if (!grade) return false;
        return getBranchFromGrade(grade) === activeBranch;
      });
    }

    // Sort recent first
    txs.sort((a: any, b: any) => {
      const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
      const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
      return tB - tA;
    });
    return txs;
  }, [allTransactions, allStudents, activeBranch, reportFrequency, selectedMonth, selectedWeek, weekOptions]);

  // Backward compatibility alias
  const monthFilteredTransactions = periodFilteredTransactions;

  const reportPeriodLabel = useMemo(() => {
    if (reportFrequency === 'monthly') {
      return selectedMonth === 'ALL'
        ? 'All Months (All Time)'
        : new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      const activeWeek = weekOptions.find(w => w.id === selectedWeek) || weekOptions[0];
      return activeWeek ? activeWeek.label : 'Weekly';
    }
  }, [reportFrequency, selectedMonth, selectedWeek, weekOptions]);

  const reportTitle = reportFrequency === 'weekly' ? 'Weekly Health Report' : 'Monthly Health Report';
  const selectedMonthLabel = reportPeriodLabel;

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

  // Department breakdown for selected period
  const periodBranchCounts = {
    IBED: periodFilteredVisits.filter(v => getBranchFromGrade(v.grade) === 'IBED').length,
    SHS: periodFilteredVisits.filter(v => getBranchFromGrade(v.grade) === 'SHS').length,
    College: periodFilteredVisits.filter(v => getBranchFromGrade(v.grade) === 'College').length,
  };

  // Department distribution chart data for ALL view (affected by period filter)
  const departmentChartData = [
    { name: 'IBED', value: periodBranchCounts.IBED, color: '#3B82F6' },
    { name: 'Senior High School (SHS)', value: periodBranchCounts.SHS, color: '#8B5CF6' },
    { name: 'College / Personnel', value: periodBranchCounts.College, color: '#10B981' },
  ].filter(item => item.value > 0);

  // Common Symptoms Analysis for periodFilteredVisits (affected by branch, month, and week filters)
  const symptomCounts: Record<string, number> = {};
  periodFilteredVisits.forEach(visit => {
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

  // Visits by Grade/Year level for periodFilteredVisits (affected by branch, month, and week filters)
  const gradeCounts: Record<string, number> = {};
  periodFilteredVisits.forEach(visit => {
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

  // Dispensed Medicines Analysis for periodFilteredTransactions (affected by branch, month, and week filters)
  const dispensedMedCounts: Record<string, { name: string; brand: string; genericName: string; count: number; unit: string }> = {};

  periodFilteredTransactions.forEach(tx => {
    const isDispensed = tx.type === 'dispensed' || tx.type === 'dispense' || (tx.quantityDispensed && tx.quantityDispensed > 0);
    if (!isDispensed) return;

    const brand = (tx.brand || '').trim();
    const genericName = (tx.genericName || tx.itemName || 'Medicine').trim();
    
    // Display name: prefer "Brand (Generic)" if both exist, otherwise Brand or Generic
    const displayName = brand && genericName && brand.toLowerCase() !== genericName.toLowerCase()
      ? `${brand} (${genericName})`
      : (brand || genericName);

    const qty = Number(tx.quantityDispensed) || Math.abs(Number(tx.quantityChanged) || 0) || 1;
    const unit = tx.unit || 'pcs';

    if (!dispensedMedCounts[displayName]) {
      dispensedMedCounts[displayName] = {
        name: displayName,
        brand,
        genericName,
        count: 0,
        unit
      };
    }
    dispensedMedCounts[displayName].count += qty;
  });

  const dispensedMedChartData = Object.values(dispensedMedCounts)
    .map((item, index) => ({
      id: `dispensed-med-${index}`,
      name: item.name,
      brand: item.brand,
      genericName: item.genericName,
      count: item.count,
      unit: item.unit
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 dispensed medicines

  const totalDispensedInPeriod = dispensedMedChartData.reduce((acc, curr) => acc + curr.count, 0);

  // Comprehensive Itemized Report PDF Export (Weekly or Monthly)
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      let y = 0;

      const addPageIfNeeded = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 20) {
          pdf.addPage();
          y = 15;
          return true;
        }
        return false;
      };

      const activeLabel = BRANCHES.find(b => b.id === activeBranch)?.label || 'All Departments';

      // ===== PAGE 1: HEADER + SUMMARY =====
      // Header band
      pdf.setFillColor(28, 124, 84);
      pdf.rect(0, 0, pageWidth, 32, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NDKC ClinicCare', pageWidth / 2, 12, { align: 'center' });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Itemized ${reportTitle}`, pageWidth / 2, 19, { align: 'center' });

      pdf.setFontSize(9);
      pdf.text(`${activeLabel} • ${reportPeriodLabel}`, pageWidth / 2, 25, { align: 'center' });

      pdf.setFontSize(7);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 30, { align: 'center' });

      y = 40;

      // Summary Stats
      pdf.setTextColor(28, 124, 84);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, y);
      y += 8;

      const summaryVisits = periodFilteredVisits;
      const summaryTx = periodFilteredTransactions;
      const uniquePatients = new Set(summaryVisits.map((v: any) => v.studentId || v.studentName)).size;
      const totalMedsDispensed = summaryTx.filter((t: any) => t.type === 'dispensed').reduce((sum: number, t: any) => sum + (t.quantityDispensed || Math.abs(t.quantityChanged || 0)), 0);

      const summaryItems = [
        { label: 'Total Clinic Visits', value: summaryVisits.length.toString() },
        { label: 'Unique Patients', value: uniquePatients.toString() },
        { label: 'Medicine Releases', value: summaryTx.filter((t: any) => t.type === 'dispensed').length.toString() },
        { label: 'Total Medicines Dispensed', value: `${totalMedsDispensed} units` },
      ];

      const boxW = (contentWidth - 6) / 2;
      const boxH = 16;
      const colors = [[59,130,246],[16,185,129],[245,158,11],[168,85,247]];
      summaryItems.forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = margin + col * (boxW + 6);
        const by = y + row * (boxH + 4);
        pdf.setFillColor(colors[i][0], colors[i][1], colors[i][2]);
        pdf.roundedRect(bx, by, boxW, boxH, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, bx + 4, by + 6);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.value, bx + 4, by + 13);
      });
      y += (boxH + 4) * 2 + 8;

      // Charts (if available)
      try {
        if (symptomChartRef.current) {
          const symptomImg = await toPng(symptomChartRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
          addPageIfNeeded(75);
          pdf.setTextColor(28, 124, 84);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Common Symptoms Analysis', margin, y);
          y += 6;
          pdf.addImage(symptomImg, 'PNG', margin, y, contentWidth, 60);
          y += 65;
        }
        if (medChartRef.current) {
          addPageIfNeeded(75);
          const medImg = await toPng(medChartRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
          pdf.setTextColor(28, 124, 84);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Dispensed Medicines Analysis', margin, y);
          y += 6;
          pdf.addImage(medImg, 'PNG', margin, y, contentWidth, 60);
          y += 65;
        }
        if (gradeChartRef.current) {
          addPageIfNeeded(75);
          const gradeImg = await toPng(gradeChartRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
          pdf.setTextColor(28, 124, 84);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Visits by Grade / Department', margin, y);
          y += 6;
          pdf.addImage(gradeImg, 'PNG', margin, y, contentWidth, 60);
          y += 65;
        }
      } catch (chartErr) {
        console.warn('Chart images not available for PDF:', chartErr);
      }

      // ===== SECTION 2: ITEMIZED ILLNESS COMPLAINTS & VISITS =====
      pdf.addPage();
      y = 15;

      pdf.setFillColor(28, 124, 84);
      pdf.rect(0, 0, pageWidth, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Itemized Clinic Visits & Illness Complaints — ${reportPeriodLabel}`, pageWidth / 2, 7, { align: 'center' });
      y = 18;

      // Table header
      const visitCols = [
        { label: 'Date & Time', w: 28 },
        { label: 'Student', w: 28 },
        { label: 'Grade', w: 22 },
        { label: 'Symptoms', w: 38 },
        { label: 'Treatment', w: 35 },
        { label: 'Nurse', w: 20 },
        { label: 'Status', w: 15 },
      ];

      const drawVisitHeader = () => {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, y, contentWidth, 7, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        let cx = margin + 1;
        visitCols.forEach(col => {
          pdf.text(col.label, cx, y + 5);
          cx += col.w;
        });
        y += 8;
      };

      drawVisitHeader();

      // Sort visits recent first
      const sortedVisits = [...summaryVisits].sort((a: any, b: any) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
        return tB - tA;
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);

      sortedVisits.forEach((v: any, idx: number) => {
        if (y + 8 > pageHeight - 20) {
          pdf.addPage();
          y = 15;
          drawVisitHeader();
        }

        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y - 1, contentWidth, 7, 'F');
        }

        const d = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp || v.createdAt || 0);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        pdf.setTextColor(30, 41, 59);
        let cx = margin + 1;

        const truncate = (str: string, maxLen: number) => str && str.length > maxLen ? str.substring(0, maxLen - 2) + '..' : (str || '');

        pdf.text(`${dateStr} ${timeStr}`, cx, y + 4); cx += visitCols[0].w;
        pdf.text(truncate(v.studentName || '', 18), cx, y + 4); cx += visitCols[1].w;
        pdf.text(truncate(v.grade || '', 14), cx, y + 4); cx += visitCols[2].w;
        pdf.text(truncate(v.symptoms || '', 26), cx, y + 4); cx += visitCols[3].w;
        pdf.text(truncate(v.treatment || '', 24), cx, y + 4); cx += visitCols[4].w;
        pdf.text(truncate(v.nurseName || '', 14), cx, y + 4); cx += visitCols[5].w;
        pdf.text(truncate(v.status || 'Completed', 10), cx, y + 4);

        y += 7;
      });

      if (sortedVisits.length === 0) {
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(9);
        pdf.text('No clinic visits recorded for this period.', pageWidth / 2, y + 10, { align: 'center' });
        y += 20;
      }

      // ===== SECTION 3: ITEMIZED MEDICINE RELEASES =====
      pdf.addPage();
      y = 15;

      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Itemized Medicine Releases — ${reportPeriodLabel}`, pageWidth / 2, 7, { align: 'center' });
      y = 18;

      const medCols = [
        { label: 'Date & Time', w: 30 },
        { label: 'Brand', w: 30 },
        { label: 'Generic Name', w: 32 },
        { label: 'Qty', w: 14 },
        { label: 'Patient', w: 30 },
        { label: 'Dispensed By', w: 28 },
      ];

      const drawMedHeader = () => {
        pdf.setFillColor(239, 246, 255);
        pdf.rect(margin, y, contentWidth, 7, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        let cx = margin + 1;
        medCols.forEach(col => {
          pdf.text(col.label, cx, y + 5);
          cx += col.w;
        });
        y += 8;
      };

      drawMedHeader();

      const dispensedTx = summaryTx.filter((t: any) => t.type === 'dispensed');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);

      dispensedTx.forEach((tx: any, idx: number) => {
        if (y + 8 > pageHeight - 20) {
          pdf.addPage();
          y = 15;
          drawMedHeader();
        }

        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y - 1, contentWidth, 7, 'F');
        }

        const d = tx.timestamp?.toDate ? tx.timestamp.toDate() : (tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.timestamp || tx.createdAt || 0));
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const qty = tx.quantityDispensed || Math.abs(tx.quantityChanged || 0);

        pdf.setTextColor(30, 41, 59);
        let cx = margin + 1;

        const truncate = (str: string, maxLen: number) => str && str.length > maxLen ? str.substring(0, maxLen - 2) + '..' : (str || '');

        pdf.text(`${dateStr} ${timeStr}`, cx, y + 4); cx += medCols[0].w;
        pdf.text(truncate(tx.brand || '—', 20), cx, y + 4); cx += medCols[1].w;
        pdf.text(truncate(tx.genericName || tx.itemName || '', 22), cx, y + 4); cx += medCols[2].w;
        pdf.text(`${qty} ${tx.unit || 'pcs'}`, cx, y + 4); cx += medCols[3].w;
        pdf.text(truncate(tx.patientName || '—', 20), cx, y + 4); cx += medCols[4].w;
        pdf.text(truncate(tx.dispensedBy || '—', 18), cx, y + 4);

        y += 7;
      });

      if (dispensedTx.length === 0) {
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(9);
        pdf.text('No medicine releases recorded for this period.', pageWidth / 2, y + 10, { align: 'center' });
        y += 20;
      }

      // ===== SIGN-OFF SECTION =====
      addPageIfNeeded(50);
      y += 15;

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      const sigWidth = (contentWidth - 20) / 2;
      // Prepared by
      pdf.text('Prepared by:', margin, y);
      y += 15;
      pdf.line(margin, y, margin + sigWidth, y);
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.text('School Nurse', margin, y);
      pdf.setFont('helvetica', 'normal');
      y += 4;
      pdf.text('NDKC Clinic', margin, y);

      // Noted by (same row)
      const noteX = margin + sigWidth + 20;
      y -= 23;
      pdf.text('Noted by:', noteX, y);
      y += 15;
      pdf.line(noteX, y, noteX + sigWidth, y);
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.text('School Physician / Administrator', noteX, y);
      pdf.setFont('helvetica', 'normal');
      y += 4;
      pdf.text('Notre Dame of Kidapawan College', noteX, y);

      // Footer on all pages
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Generated by NDKC ClinicCare Analytics System • Notre Dame of Kidapawan College', pageWidth / 2, pageHeight - 6, { align: 'center' });
        pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      const periodSlug = reportFrequency === 'weekly' ? (selectedWeek || 'current') : (selectedMonth === 'ALL' ? 'AllTime' : selectedMonth);
      const fileName = `NDKC_${reportFrequency === 'weekly' ? 'Weekly' : 'Monthly'}_Report_${activeBranch}_${periodSlug}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success(`Itemized ${reportFrequency} report downloaded! 📄`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setDownloading(false);
    }
  };

  // Print Report (Weekly or Monthly)
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the report');
      return;
    }

    const sortedVisits = [...periodFilteredVisits].sort((a: any, b: any) => {
      const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
      const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });

    const dispensedTx = periodFilteredTransactions.filter((t: any) => t.type === 'dispensed');

    const formatDate = (v: any) => {
      const d = v.timestamp?.toDate ? v.timestamp.toDate() : (v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.timestamp || v.createdAt || 0));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const activeLabel = BRANCHES.find(b => b.id === activeBranch)?.label || 'All Departments';

    printWindow.document.write(`<!DOCTYPE html><html><head><title>NDKC ${reportTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
        h1 { font-size: 20px; color: #1C7C54; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #1C7C54; margin: 16px 0 8px; border-bottom: 2px solid #1C7C54; padding-bottom: 4px; }
        .subtitle { text-align: center; color: #64748b; margin-bottom: 16px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
        th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
        td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .sig-section { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig-box { width: 45%; }
        .sig-line { border-top: 1px solid #334155; margin-top: 30px; padding-top: 4px; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>NDKC ClinicCare</h1>
      <div class="subtitle">Itemized ${reportTitle} • ${activeLabel} • ${reportPeriodLabel}</div>

      <h2>Clinic Visits & Illness Complaints (${sortedVisits.length} records)</h2>
      <table>
        <thead><tr><th>Date & Time</th><th>Student</th><th>Grade</th><th>Symptoms</th><th>Treatment</th><th>Nurse</th><th>Status</th></tr></thead>
        <tbody>${sortedVisits.map((v: any) => `<tr>
          <td>${formatDate(v)}</td>
          <td>${v.studentName || ''}</td>
          <td>${v.grade || ''}</td>
          <td>${v.symptoms || ''}</td>
          <td>${v.treatment || ''}</td>
          <td>${v.nurseName || ''}</td>
          <td>${v.status || 'Completed'}</td>
        </tr>`).join('')}</tbody>
      </table>

      <h2>Medicine Releases (${dispensedTx.length} records)</h2>
      <table>
        <thead><tr><th>Date & Time</th><th>Brand</th><th>Generic Name</th><th>Qty</th><th>Patient</th><th>Dispensed By</th></tr></thead>
        <tbody>${dispensedTx.map((tx: any) => `<tr>
          <td>${formatDate(tx)}</td>
          <td>${tx.brand || '—'}</td>
          <td>${tx.genericName || tx.itemName || ''}</td>
          <td>${tx.quantityDispensed || Math.abs(tx.quantityChanged || 0)} ${tx.unit || 'pcs'}</td>
          <td>${tx.patientName || '—'}</td>
          <td>${tx.dispensedBy || '—'}</td>
        </tr>`).join('')}</tbody>
      </table>

      <div class="sig-section">
        <div class="sig-box"><div class="sig-line"><strong>School Nurse</strong><br/>NDKC Clinic</div></div>
        <div class="sig-box"><div class="sig-line"><strong>School Physician / Administrator</strong><br/>Notre Dame of Kidapawan College</div></div>
      </div>
      </body></html>`);

    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // CSV Backup Export — downloads two CSV files: Clinic Visits & Students
  const handleDownloadCSV = async () => {
    setDownloadingCsv(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const branchLabel = activeBranch === 'ALL' ? 'AllDepts' : activeBranch;

      // Helper: escape a single CSV field
      const esc = (val: any): string => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      // Helper: trigger a file download in the browser
      const triggerDownload = (content: string, filename: string) => {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      // --- 1. Clinic Visits CSV ---
      const visitsToExport = activeBranch === 'ALL' ? allVisits : filteredVisits;

      const visitHeaders = [
        'Date & Time', 'Student Name', 'Student ID', 'Grade / Department',
        'Symptoms', 'Treatment', 'Nurse Name', 'Nurse Email',
        'Pickup Required', 'Needs Bed Rest', 'Status',
        'Blood Pressure', 'Temperature', 'Heart Rate',
        'Bed Name', 'Bed Start Time', 'Bed End Time',
        'Parent Name', 'Parent Email', 'Parent Phone',
        'Notes', 'Record ID'
      ];

      const visitRows = visitsToExport.map(v => {
        const dateStr = v.timestamp?.toDate
          ? v.timestamp.toDate().toLocaleString('en-PH')
          : v.createdAt?.toDate
          ? v.createdAt.toDate().toLocaleString('en-PH')
          : '';
        const bedStart = v.bedStartTime?.toDate ? v.bedStartTime.toDate().toLocaleString('en-PH') : '';
        const bedEnd   = v.bedEndTime?.toDate   ? v.bedEndTime.toDate().toLocaleString('en-PH')   : '';
        return [
          dateStr,
          v.studentName       ?? '',
          v.studentId         ?? '',
          v.grade             ?? '',
          v.symptoms          ?? '',
          v.treatment         ?? '',
          v.nurseName         ?? '',
          v.nurseEmail        ?? '',
          v.pickupRequired    ? 'Yes' : 'No',
          v.needsBedRest      ? 'Yes' : 'No',
          v.status            ?? '',
          v.bloodPressure     ?? '',
          v.temperature       ?? '',
          v.heartRate         ?? '',
          v.bedName           ?? '',
          bedStart,
          bedEnd,
          v.parentName        ?? '',
          v.parentEmail       ?? '',
          v.parentPhone       ?? '',
          v.notes             ?? '',
          v.id                ?? '',
        ];
      });

      const visitsCsv = [visitHeaders, ...visitRows]
        .map(row => row.map(esc).join(','))
        .join('\r\n');

      triggerDownload(visitsCsv, `NDKC_ClinicVisits_${branchLabel}_${today}.csv`);

      // --- 2. Students CSV ---
      const studentsToExport = activeBranch === 'ALL' ? allStudents : filteredStudents;

      const studentHeaders = [
        'Student Name', 'Student ID', 'Grade / Department',
        'Email', 'Parent Name', 'Parent Email', 'Parent Phone',
        'Record ID'
      ];

      const studentRows = studentsToExport.map(s => [
        s.name         ?? s.studentName ?? '',
        s.studentId    ?? s.id          ?? '',
        s.grade        ?? '',
        s.email        ?? '',
        s.parentName   ?? '',
        s.parentEmail  ?? '',
        s.parentPhone  ?? '',
        s.id           ?? '',
      ]);

      const studentsCsv = [studentHeaders, ...studentRows]
        .map(row => row.map(esc).join(','))
        .join('\r\n');

      // Slight delay so both downloads don't collide in the browser
      setTimeout(() => {
        triggerDownload(studentsCsv, `NDKC_Students_${branchLabel}_${today}.csv`);
      }, 600);

      toast.success(
        `CSV backup downloaded! ${visitsToExport.length} visit records & ${studentsToExport.length} student records exported.`
      );
    } catch (error: any) {
      console.error('CSV export error:', error);
      toast.error(`CSV export failed: ${error.message}`);
    } finally {
      setDownloadingCsv(false);
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
        <div className="flex flex-wrap gap-2 items-center">
          {/* Report Frequency Switcher: Monthly vs Weekly */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button
              onClick={() => setReportFrequency('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                reportFrequency === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setReportFrequency('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                reportFrequency === 'weekly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Period Selector (Month or Week Dropdown) */}
          {reportFrequency === 'monthly' ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-ndkc-green/30 cursor-pointer"
            >
              <option value="ALL">All Months (All Time)</option>
              {monthOptions.map(m => {
                const [yr, mo] = m.split('-');
                const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
          ) : (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-ndkc-green/30 cursor-pointer"
            >
              {weekOptions.map(w => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          )}

          {/* Print Report */}
          <Button
            onClick={handlePrintReport}
            disabled={loading}
            variant="outline"
            className="h-11 px-4 border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {reportFrequency === 'weekly' ? 'Weekly' : 'Monthly'} Report
          </Button>

          {/* CSV Backup Download */}
          <Button
            onClick={handleDownloadCSV}
            disabled={downloadingCsv || loading}
            variant="outline"
            className="h-11 px-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 disabled:opacity-50"
          >
            {downloadingCsv ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                Exporting CSV...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download CSV Backup
              </>
            )}
          </Button>

          {/* PDF Report Export */}
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
                Export {reportFrequency === 'weekly' ? 'Weekly' : 'Monthly'} (PDF)
              </>
            )}
          </Button>
        </div>
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
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Showing Data For:</span>
          <Badge className={BRANCHES.find(b => b.id === activeBranch)?.badgeColor}>
            {BRANCHES.find(b => b.id === activeBranch)?.label}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            {reportPeriodLabel}
          </Badge>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {periodFilteredVisits.length} visit{periodFilteredVisits.length !== 1 ? 's' : ''} recorded in {reportPeriodLabel}
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
            <CardTitle className="text-sm font-medium text-slate-600">
              {reportFrequency === 'weekly' ? 'Visits (Selected Week)' : selectedMonth === 'ALL' ? 'Total Visits (All Time)' : 'Visits (Selected Month)'}
            </CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{periodFilteredVisits.length}</div>
            <p className="mt-1 text-sm text-slate-500">{reportPeriodLabel}</p>
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
                { name: 'IBED', count: periodBranchCounts.IBED, color: 'border-blue-300 bg-blue-50 text-blue-800', icon: BookOpen, desc: 'Kindergarten to Grade 10' },
                { name: 'Senior High School (SHS)', count: periodBranchCounts.SHS, color: 'border-violet-300 bg-violet-50 text-violet-800', icon: GraduationCap, desc: 'Grade 11 & Grade 12' },
                { name: 'College / Personnel', count: periodBranchCounts.College, color: 'border-emerald-300 bg-emerald-50 text-emerald-800', icon: Building2, desc: 'Higher Ed & Campus Staff' },
              ].map(dept => {
                const Icon = dept.icon;
                const pct = periodFilteredVisits.length > 0 ? ((dept.count / periodFilteredVisits.length) * 100).toFixed(1) : '0';
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
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                  {reportPeriodLabel}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {activeBranch} View
                </Badge>
              </div>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Most reported health concerns in {activeBranch === 'ALL' ? 'all departments' : activeBranch} for {reportPeriodLabel}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : symptomChartData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No symptom data available for {activeBranch} in {reportPeriodLabel}
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
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                  {reportPeriodLabel}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {activeBranch} View
                </Badge>
              </div>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Distribution across grade levels for {activeBranch === 'ALL' ? 'all departments' : activeBranch} ({reportPeriodLabel})
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : gradeChartData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No grade data available for {activeBranch} in {reportPeriodLabel}
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

        {/* Dispensed Medicines Chart */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" />
                <span>Dispensed Medicine Analysis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                  {reportPeriodLabel}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {activeBranch} View
                </Badge>
              </div>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Most released medications in {activeBranch === 'ALL' ? 'all departments' : activeBranch} for {reportPeriodLabel}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading chart data...
              </div>
            ) : dispensedMedChartData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No medicine releases recorded for {activeBranch} in {reportPeriodLabel}
              </div>
            ) : (
              <div ref={medChartRef}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dispensedMedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
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
                      formatter={(value: any, _name: any, item: any) => [
                        `${value} ${item?.payload?.unit || 'units'}`,
                        'Quantity Dispensed'
                      ]}
                    />
                    <Bar dataKey="count" fill="#0D9488" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Medicine Releases Breakdown */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-ndkc-green" />
                <span>Medicine Releases Summary</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                  {reportPeriodLabel}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {activeBranch} View
                </Badge>
              </div>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Ranking and distribution of dispensed inventory items ({reportPeriodLabel})
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                Loading summary...
              </div>
            ) : dispensedMedChartData.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-slate-400">
                No medicine release activity for {activeBranch} in {reportPeriodLabel}
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {dispensedMedChartData.map((item, idx) => {
                  const sharePct = totalDispensedInPeriod > 0
                    ? Math.round((item.count / totalDispensedInPeriod) * 100)
                    : 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.brand && (
                              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 font-semibold rounded">
                                {item.brand}
                              </Badge>
                            )}
                            <span className="font-semibold text-slate-800 text-sm truncate">
                              {item.genericName || item.name}
                            </span>
                          </div>
                          <div className="w-36 bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-base font-bold text-slate-900">{item.count}</span>
                        <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                        <p className="text-[10px] font-semibold text-emerald-700">{sharePct}% of total</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}