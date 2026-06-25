import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ClinicVisit } from '../lib/firestore-setup';
import { Plus, Search, Activity, Bell, TrendingUp, Calendar, Clock, UserCheck, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { MedicalCertificateModal } from './MedicalCertificateModal';

interface NurseDashboardProps {
  onAddVisit: () => void;
  userEmail: string;
}

export function NurseDashboard({ onAddVisit, userEmail }: NurseDashboardProps) {
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<ClinicVisit | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [stats, setStats] = useState({
    todayVisits: 0,
    notificationsSent: 0,
    commonSymptom: 'Headache'
  });

  const loadTodayVisits = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const visitsRef = collection(db, 'clinicVisits');
      const q = query(
        visitsRef,
        where('timestamp', '>=', Timestamp.fromDate(today)),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const visitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClinicVisit));
      
      setVisits(visitsData);
      
      // Calculate most common symptom
      const symptomCounts: { [key: string]: number } = {};
      visitsData.forEach(visit => {
        const symptoms = visit.symptoms.toLowerCase().split(',').map(s => s.trim());
        symptoms.forEach(symptom => {
          if (symptom) {
            symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
          }
        });
      });
      
      // Find the most common symptom
      let mostCommonSymptom = 'None';
      let maxCount = 0;
      Object.entries(symptomCounts).forEach(([symptom, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonSymptom = symptom.charAt(0).toUpperCase() + symptom.slice(1);
        }
      });
      
      setStats({
        todayVisits: visitsData.length,
        notificationsSent: visitsData.filter(v => v.notifyParent).length,
        commonSymptom: mostCommonSymptom
      });
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayVisits();
  }, []);

  const filteredVisits = visits.filter(visit =>
    visit.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.symptoms.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">Clinic Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Manage student health records and clinic visits
          </p>
        </div>
        <Button
          onClick={onAddVisit}
          className="h-12 bg-gradient-to-r from-ndkc-green to-emerald-600 px-6 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Log New Visit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Visits Today</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
              <Activity className="h-5 w-5 text-ndkc-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.todayVisits}</div>
            <p className="mt-1 flex items-center text-sm text-slate-500">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Notifications Sent</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2.5 transition-colors group-hover:bg-blue-100">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.notificationsSent}</div>
            <p className="mt-1 text-sm text-slate-500">
              Parents notified today
            </p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Common Symptom</CardTitle>
            <div className="rounded-lg bg-purple-50 p-2.5 transition-colors group-hover:bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.commonSymptom}</div>
            <p className="mt-1 text-sm text-slate-500">
              Most frequent this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by student name or symptoms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 border-slate-200 bg-white pl-12 shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
        />
      </div>

      {/* Visits Table */}
      <Card className="border-slate-200 bg-white shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">Today's Clinic Visits</CardTitle>
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              <Clock className="mr-1.5 h-3 w-3" />
              Live Updates
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="mx-auto h-8 w-8 animate-pulse text-slate-400" />
                <p className="mt-3 text-sm text-slate-500">Loading visits...</p>
              </div>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-slate-100 p-4">
                <Activity className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-slate-600">No clinic visits recorded today</p>
              <p className="mt-1 text-sm text-slate-500">Click "Log New Visit" to add a visit</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50">
                    <TableHead className="font-semibold text-slate-700">Time</TableHead>
                    <TableHead className="font-semibold text-slate-700">Student</TableHead>
                    <TableHead className="font-semibold text-slate-700">Grade</TableHead>
                    <TableHead className="font-semibold text-slate-700">Symptoms</TableHead>
                    <TableHead className="font-semibold text-slate-700">Treatment</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisits.map((visit, index) => (
                    <TableRow 
                      key={visit.id} 
                      className="border-slate-100 transition-colors hover:bg-slate-50/50"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatTime(visit.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {visit.studentName}
                      </TableCell>
                      <TableCell className="text-slate-600">{visit.grade}</TableCell>
                      <TableCell className="text-slate-600">{visit.symptoms}</TableCell>
                      <TableCell className="text-slate-600">{visit.treatment}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {visit.notifyParent && (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 w-fit">
                              <Bell className="mr-1 h-3 w-3" />
                              Notified
                            </Badge>
                          )}
                          {visit.needsPickup && (
                            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 w-fit">
                              <UserCheck className="mr-1 h-3 w-3" />
                              Needs Pickup
                            </Badge>
                          )}
                          {!visit.notifyParent && !visit.needsPickup && (
                            <Badge variant="outline" className="border-slate-200 text-slate-600 w-fit">
                              No Alert
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowCertificate(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-ndkc-green hover:bg-ndkc-green/10 hover:text-ndkc-green"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Certificate Modal */}
      {showCertificate && selectedVisit && (
        <MedicalCertificateModal
          visitData={{
            visitId: selectedVisit.id || '',
            studentName: selectedVisit.studentName,
            grade: selectedVisit.grade,
            symptoms: selectedVisit.symptoms,
            treatment: selectedVisit.treatment,
            notes: selectedVisit.notes,
            nurseName: selectedVisit.nurseName || userEmail,
            timestamp: selectedVisit.timestamp?.toDate
              ? selectedVisit.timestamp.toDate()
              : new Date(selectedVisit.timestamp),
          }}
          onClose={() => {
            setShowCertificate(false);
            setSelectedVisit(null);
          }}
        />
      )}
    </div>
  );
}