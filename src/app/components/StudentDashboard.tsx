import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Activity, Calendar, Clock, FileText, Heart, TrendingUp, AlertCircle, User, Download, Search, X } from 'lucide-react';
import { MedicalCertificateModal } from './MedicalCertificateModal';

interface Visit {
  id: string;
  studentId: string;
  studentName: string;
  symptoms: string;
  treatment: string;
  bloodPressure?: string;
  timestamp: any;
  nurseEmail: string;
  nurseName?: string;
  grade: string;
  notes?: string;
  pickupRequired?: boolean;
}

interface StudentDashboardProps {
  userEmail: string;
}

export function StudentDashboard({ userEmail }: StudentDashboardProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStudentData();
  }, [userEmail]);

  const loadStudentData = async () => {
    try {
      setLoading(true);

      const normalizedEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();

      // 1. Get user document from 'users'
      let userData: any = null;
      if (auth.currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            userData = userDoc.data();
          }
        } catch (e) {
          console.warn('Could not fetch user doc by uid:', e);
        }
      }

      if (!userData && normalizedEmail) {
        try {
          const usersQuery = query(collection(db, 'users'), where('email', '==', userEmail));
          const usersSnapshot = await getDocs(usersQuery);
          if (!usersSnapshot.empty) {
            userData = usersSnapshot.docs[0].data();
          }
        } catch (e) {
          console.warn('Could not query users by email:', e);
        }
      }

      // 2. Fetch all student docs to match student record
      let matchedStudent: any = null;
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentDocs = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        matchedStudent = studentDocs.find((s: any) => {
          const sEmail = String(s.email || '').trim().toLowerCase();
          const sStudentId = String(s.studentId || '').trim().toLowerCase();
          const sName = String(s.name || '').trim().toLowerCase();
          const userStudentId = String(userData?.studentId || '').trim().toLowerCase();
          const userName = String(userData?.name || '').trim().toLowerCase();

          if (normalizedEmail && sEmail && sEmail === normalizedEmail) return true;
          if (userStudentId && sStudentId && sStudentId === userStudentId) return true;
          if (userName && sName && sName === userName) return true;
          return false;
        });
      } catch (e) {
        console.warn('Could not query students collection:', e);
      }

      // Assemble unified student data
      const mergedStudentData = {
        name: userData?.name || matchedStudent?.name || (normalizedEmail ? normalizedEmail.split('@')[0] : 'Student'),
        studentId: userData?.studentId || matchedStudent?.studentId || 'N/A',
        grade: userData?.grade || matchedStudent?.grade || 'N/A',
        email: userData?.email || matchedStudent?.email || userEmail,
        role: userData?.role || 'student',
        ...(matchedStudent || {}),
        ...(userData || {}),
      };
      setStudentData(mergedStudentData);

      // Collect all possible identifiers for this student to match visits
      const possibleIds = new Set<string>();
      if (matchedStudent?.id) possibleIds.add(String(matchedStudent.id).trim().toLowerCase());
      if (matchedStudent?.studentId) possibleIds.add(String(matchedStudent.studentId).trim().toLowerCase());
      if (userData?.studentId) possibleIds.add(String(userData.studentId).trim().toLowerCase());

      const possibleNames = new Set<string>();
      if (mergedStudentData.name) possibleNames.add(mergedStudentData.name.trim().toLowerCase());
      if (userData?.name) possibleNames.add(String(userData.name).trim().toLowerCase());
      if (matchedStudent?.name) possibleNames.add(String(matchedStudent.name).trim().toLowerCase());

      const possibleEmails = new Set<string>();
      if (normalizedEmail) possibleEmails.add(normalizedEmail);
      if (mergedStudentData.email) possibleEmails.add(String(mergedStudentData.email).trim().toLowerCase());

      // 3. Load clinic visits
      const visitsSnapshot = await getDocs(collection(db, 'clinicVisits'));
      const allVisits = visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const studentVisits = allVisits.filter((v: any) => {
        const vStudentId = String(v.studentId || '').trim().toLowerCase();
        const vStudentName = String(v.studentName || '').trim().toLowerCase();
        const vEmail = String(v.studentEmail || v.email || '').trim().toLowerCase();

        if (vStudentId && possibleIds.has(vStudentId)) return true;
        if (vStudentName && possibleNames.has(vStudentName)) return true;
        if (vEmail && possibleEmails.has(vEmail)) return true;
        return false;
      }) as Visit[];

      // Sort by most recent first
      studentVisits.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.timestamp || a.createdAt || 0));
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.timestamp || b.createdAt || 0));
        return dateB.getTime() - dateA.getTime();
      });

      setVisits(studentVisits);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      if (!timestamp) return 'N/A';
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timestamp: any) => {
    try {
      if (!timestamp) return 'N/A';
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  // Calculate stats
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const thisMonthVisits = visits.filter(v => {
    const date = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
    return date >= thisMonth;
  }).length;

  const commonSymptoms = visits.reduce((acc, visit) => {
    const symptoms = visit.symptoms?.toLowerCase() || '';
    if (symptoms.includes('headache')) acc.headache = (acc.headache || 0) + 1;
    if (symptoms.includes('fever')) acc.fever = (acc.fever || 0) + 1;
    if (symptoms.includes('stomach')) acc.stomach = (acc.stomach || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonSymptom = Object.entries(commonSymptoms).sort((a, b) => b[1] - a[1])[0];

  const displayedVisits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return visits;
    return visits.filter(v => {
      const symptoms = String(v.symptoms || '').toLowerCase();
      const treatment = String(v.treatment || '').toLowerCase();
      const notes = String(v.notes || '').toLowerCase();
      const nurse = String(v.nurseName || v.nurseEmail || '').toLowerCase();
      const dateStr = v.timestamp?.toDate
        ? v.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase()
        : '';
      return (
        symptoms.includes(term) ||
        treatment.includes(term) ||
        notes.includes(term) ||
        nurse.includes(term) ||
        dateStr.includes(term)
      );
    });
  }, [visits, searchTerm]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">My Health Records</h1>
          <p className="mt-2 text-slate-600">
            View your clinic visit history and health information
          </p>
        </div>
      </div>

      {/* Student Info Card */}
      {studentData && (
        <Card className="border-slate-200 bg-gradient-to-br from-ndkc-green/5 to-emerald-50/30 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ndkc-green to-emerald-600 shadow-xl shadow-emerald-500/40">
                <Heart className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">{studentData.name}</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Badge className="bg-white text-slate-700 border border-slate-200">
                    {studentData.role === 'personnel' ? 'Employee ID' : 'Student ID'}: {studentData.studentId}
                  </Badge>
                  <Badge className="bg-white text-slate-700 border border-slate-200">
                    {studentData.role === 'personnel' ? 'Personnel' : studentData.grade}
                  </Badge>
                  <Badge className="bg-white text-slate-700 border border-slate-200">
                    {studentData.email}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Visits</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{visits.length}</div>
            <p className="mt-1 text-sm text-slate-500">All time clinic visits</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">This Month</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <Calendar className="h-5 w-5 text-ndkc-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{thisMonthVisits}</div>
            <p className="mt-1 text-sm text-slate-500">Visits this month</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Most Common</CardTitle>
            <div className="rounded-lg bg-amber-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 capitalize">
              {mostCommonSymptom ? mostCommonSymptom[0] : 'None'}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {mostCommonSymptom ? `${mostCommonSymptom[1]} occurrences` : 'No symptoms recorded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visit History */}
      <Card className="border-slate-200 bg-white shadow-lg overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-ndkc-green" />
                Visit History
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">Your complete clinic visit records</p>
            </div>

            {/* Search Bar */}
            {visits.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search symptoms, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-9 pr-8 text-sm border-slate-200 focus-visible:ring-ndkc-green"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-8 w-8 animate-pulse text-slate-400" />
              <p className="mt-3 text-slate-500">Loading your health records...</p>
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-slate-600">No clinic visits recorded yet</p>
              <p className="text-sm text-slate-500">Your visit history will appear here</p>
            </div>
          ) : displayedVisits.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-slate-700 font-semibold">No visits found matching "{searchTerm}"</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="mt-3 text-xs"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedVisits.map((visit, index) => (
                <div
                  key={visit.id}
                  className="group rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-6 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ndkc-green/10">
                          <Activity className="h-5 w-5 text-ndkc-green" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Visit #{visits.length - index}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(visit.timestamp)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(visit.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 ml-13">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Symptoms
                            </p>
                            <p className="text-sm text-slate-700">{visit.symptoms}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              Treatment
                            </p>
                            <p className="text-sm text-slate-700">{visit.treatment}</p>
                          </div>

                          {visit.bloodPressure && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                              <p className="text-xs font-semibold text-rose-700 mb-1 flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                Blood Pressure
                              </p>
                              <p className="text-sm font-semibold text-slate-800">{visit.bloodPressure}</p>
                            </div>
                          )}
                        </div>

                        {visit.notes && (
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Nurse's Notes</p>
                            <p className="text-sm text-slate-700">{visit.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                              <User className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Treated by</p>
                              <p className="text-sm font-medium text-slate-900">{visit.nurseName || visit.nurseEmail}</p>
                            </div>
                          </div>

                          {visit.pickupRequired && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                              Pickup Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          setSelectedVisit(visit);
                          setShowCertificate(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-ndkc-green text-ndkc-green hover:bg-ndkc-green/10"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Certificate
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Certificate Modal */}
      {showCertificate && selectedVisit && (
        <MedicalCertificateModal
          visitData={{
            visitId: selectedVisit.id,
            studentName: selectedVisit.studentName,
            grade: selectedVisit.grade,
            symptoms: selectedVisit.symptoms,
            treatment: selectedVisit.treatment,
            bloodPressure: selectedVisit.bloodPressure,
            notes: selectedVisit.notes,
            nurseName: selectedVisit.nurseName || selectedVisit.nurseEmail,
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
