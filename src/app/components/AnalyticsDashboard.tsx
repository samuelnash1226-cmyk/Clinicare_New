import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Calendar,
  Activity,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  totalVisits: number;
  pickupRequired: number;
  uniqueStudents: number;
  visitsByGrade: { grade: string; count: number }[];
  visitsByDay: { day: string; count: number }[];
  commonSymptoms: { symptom: string; count: number }[];
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVisits: 0,
    pickupRequired: 0,
    uniqueStudents: 0,
    visitsByGrade: [],
    visitsByDay: [],
    commonSymptoms: [],
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();

    switch (timeRange) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { start, end: now };
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const visitsQuery = query(
        collection(db, 'clinicVisits'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end))
      );

      const snapshot = await getDocs(visitsQuery);
      const visits = snapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const uniqueStudentIds = new Set(visits.map(v => v.studentId));
      const pickupCount = visits.filter(v => v.pickupRequired).length;

      // Visits by grade
      const gradeMap = new Map<string, number>();
      visits.forEach(v => {
        if (v.grade) {
          gradeMap.set(v.grade, (gradeMap.get(v.grade) || 0) + 1);
        }
      });
      const visitsByGrade = Array.from(gradeMap.entries())
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => b.count - a.count);

      // Visits by day (last 7 days)
      const dayMap = new Map<string, number>();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      last7Days.forEach(day => dayMap.set(day, 0));

      visits.forEach(v => {
        if (v.timestamp) {
          const date = v.timestamp.toDate();
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          if (dayMap.has(dayName)) {
            dayMap.set(dayName, (dayMap.get(dayName) || 0) + 1);
          }
        }
      });

      const visitsByDay = Array.from(dayMap.entries()).map(([day, count]) => ({
        day,
        count,
      }));

      // Common symptoms
      const symptomMap = new Map<string, number>();
      visits.forEach(v => {
        if (v.symptoms) {
          const symptoms = v.symptoms.split(',').map((s: string) => s.trim().toLowerCase());
          symptoms.forEach((symptom: string) => {
            symptomMap.set(symptom, (symptomMap.get(symptom) || 0) + 1);
          });
        }
      });

      const commonSymptoms = Array.from(symptomMap.entries())
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalVisits: visits.length,
        pickupRequired: pickupCount,
        uniqueStudents: uniqueStudentIds.size,
        visitsByGrade,
        visitsByDay,
        commonSymptoms,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportData = () => {
    const csvContent = `
Visit Analytics Report
Time Range: ${timeRange}
Generated: ${new Date().toLocaleString()}

Summary:
Total Visits: ${analytics.totalVisits}
Unique Students: ${analytics.uniqueStudents}
Pickup Required: ${analytics.pickupRequired}

Visits by Grade:
${analytics.visitsByGrade.map(g => `${g.grade}: ${g.count}`).join('\n')}

Common Symptoms:
${analytics.commonSymptoms.map(s => `${s.symptom}: ${s.count}`).join('\n')}
    `;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Analytics exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-ndkc-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">Analytics Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Comprehensive insights into clinic visit patterns and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Visits
              </CardTitle>
              <Calendar className="h-5 w-5 text-ndkc-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {analytics.totalVisits}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {timeRange === 'week' ? 'This week' : timeRange === 'month' ? 'This month' : 'This year'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Unique Students
              </CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {analytics.uniqueStudents}
            </div>
            <p className="text-sm text-slate-500 mt-1">Different students</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pickup Required
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {analytics.pickupRequired}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {analytics.totalVisits > 0
                ? `${Math.round((analytics.pickupRequired / analytics.totalVisits) * 100)}% of visits`
                : 'No visits'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Avg per Day
              </CardTitle>
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {timeRange === 'week'
                ? Math.round(analytics.totalVisits / 7)
                : timeRange === 'month'
                ? Math.round(analytics.totalVisits / 30)
                : Math.round(analytics.totalVisits / 365)}
            </div>
            <p className="text-sm text-slate-500 mt-1">Visits per day</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits by Day */}
        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle>Visits Trend</CardTitle>
            <CardDescription>Daily visit count (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.visitsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visits by Grade */}
        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle>Visits by Grade</CardTitle>
            <CardDescription>Distribution across grade levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.visitsByGrade}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="grade" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Common Symptoms */}
      <Card className="border-slate-200 bg-white shadow-md">
        <CardHeader>
          <CardTitle>Most Common Symptoms</CardTitle>
          <CardDescription>Top 5 reported symptoms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.commonSymptoms.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-ndkc-green to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 capitalize">
                      {item.symptom}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {item.count} visits
                    </Badge>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ndkc-green to-emerald-600 rounded-full"
                      style={{
                        width: `${(item.count / analytics.totalVisits) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
