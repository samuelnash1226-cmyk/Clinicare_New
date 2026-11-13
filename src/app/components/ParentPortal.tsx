import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ClinicVisit } from '../lib/firestore-setup';
import { Bell, Clock, Activity, FileText, Calendar, Heart, AlertCircle, UserCheck, GraduationCap, User, Pill, Search, X, Check, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface ParentPortalProps {
  userEmail: string;
  studentIds: string[];
}

interface StudentInfo {
  id: string;
  name: string;
  grade: string;
  studentId: string;
  allergies?: string[];
}

export function ParentPortal({ userEmail, studentIds }: ParentPortalProps) {
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupNeeded, setPickupNeeded] = useState(0);
  const [selectedChildId, setSelectedChildId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const normUserEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
      console.log('🔍 ParentPortal: Starting to load data for email:', normUserEmail);

      // 1. Gather all explicit student IDs from props and from current user's document in Firestore
      const explicitIds = new Set<string>();
      (studentIds || []).forEach(id => {
        if (id && typeof id === 'string') explicitIds.add(id.trim());
      });

      if (auth.currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            if (Array.isArray(uData.studentIds)) {
              uData.studentIds.forEach((id: any) => {
                if (id && typeof id === 'string') explicitIds.add(id.trim());
              });
            }
          }
        } catch (e) {
          console.warn('ParentPortal: could not load user doc:', e);
        }
      }

      // 2. Fetch all student records to find linked children
      const matchedStudentsMap = new Map<string, StudentInfo>();
      try {
        const studentsSnap = await getDocs(collection(db, 'students'));
        studentsSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const schoolId = String(data.studentId || '').trim();
          const pEmail = String(data.parentEmail || '').trim().toLowerCase();

          const isExplicit = explicitIds.has(docId) || (schoolId && explicitIds.has(schoolId));
          const isEmailLinked = Boolean(normUserEmail && pEmail && pEmail === normUserEmail);

          if (isExplicit || isEmailLinked) {
            matchedStudentsMap.set(docId, {
              id: docId,
              name: data.name || 'Student',
              grade: data.grade || '',
              studentId: data.studentId || docId,
              allergies: data.allergies || [],
            });
          }
        });
      } catch (e) {
        console.warn('ParentPortal: could not load students:', e);
      }

      // 3. Fetch all visits
      const visitsRef = collection(db, 'clinicVisits');
      const snapshot = await getDocs(visitsRef);
      const allVisits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // 4. If no students were matched yet, search visits where parentEmail matches user's email
      if (matchedStudentsMap.size === 0 && normUserEmail) {
        allVisits.forEach((v: any) => {
          const vPEmail = String(v.parentEmail || '').trim().toLowerCase();
          if (vPEmail && vPEmail === normUserEmail && v.studentName) {
            const key = v.studentId || v.studentName;
            if (!matchedStudentsMap.has(key)) {
              matchedStudentsMap.set(key, {
                id: v.studentId || key,
                name: v.studentName,
                grade: v.grade || '',
                studentId: v.studentId || 'N/A',
                allergies: [],
              });
            }
          }
        });
      }

      const studentsData = Array.from(matchedStudentsMap.values());
      setStudents(studentsData);

      // 5. Gather all child identifiers
      const childDocIds = new Set(studentsData.map(s => s.id.toLowerCase()));
      const childSchoolIds = new Set(studentsData.map(s => String(s.studentId).trim().toLowerCase()).filter(Boolean));
      const childNames = new Set(studentsData.map(s => s.name.trim().toLowerCase()).filter(Boolean));

      // 6. Filter visits belonging to parent's children or parent's email
      const parentVisits = allVisits.filter((v: any) => {
        const vPEmail = String(v.parentEmail || '').trim().toLowerCase();
        if (normUserEmail && vPEmail && vPEmail === normUserEmail) return true;

        const vStudentId = String(v.studentId || '').trim().toLowerCase();
        if (vStudentId && (childDocIds.has(vStudentId) || childSchoolIds.has(vStudentId))) return true;

        const vStudentName = String(v.studentName || '').trim().toLowerCase();
        if (vStudentName && childNames.has(vStudentName)) return true;

        return false;
      }) as ClinicVisit[];

      // Sort visits most recent first
      parentVisits.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis?.() || (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime());
        const timeB = b.timestamp?.toMillis?.() || (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime());
        return timeB - timeA;
      });

      setVisits(parentVisits);
      const needsPickup = parentVisits.filter((v: any) => v.pickupRequired || v.needsPickup).length;
      setPickupNeeded(needsPickup);
    } catch (error: any) {
      console.error('❌ Error loading parent portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userEmail, studentIds]);

  // Check if a visit corresponds to a particular child
  const isVisitForStudent = (visit: any, student: StudentInfo) => {
    const vStudentId = String(visit.studentId || '').trim().toLowerCase();
    const vStudentName = String(visit.studentName || '').trim().toLowerCase();
    const sDocId = String(student.id || '').trim().toLowerCase();
    const sSchoolId = String(student.studentId || '').trim().toLowerCase();
    const sName = String(student.name || '').trim().toLowerCase();

    if (vStudentId && (vStudentId === sDocId || (sSchoolId && vStudentId === sSchoolId))) {
      return true;
    }
    if (vStudentName && sName && vStudentName === sName) {
      return true;
    }
    return false;
  };

  // Selected child object (if any)
  const selectedChild = useMemo(() => {
    if (selectedChildId === 'ALL') return null;
    return students.find(s => s.id === selectedChildId) || null;
  }, [students, selectedChildId]);

  // Visits filtered by selected child
  const childFilteredVisits = useMemo(() => {
    if (selectedChildId === 'ALL' || !selectedChild) {
      return visits;
    }
    return visits.filter(v => isVisitForStudent(v, selectedChild));
  }, [visits, selectedChild, selectedChildId]);

  // Filtered visits further filtered by search query
  const displayedVisits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return childFilteredVisits;

    return childFilteredVisits.filter(v => {
      const sName = String(v.studentName || '').toLowerCase();
      const sGrade = String(v.grade || '').toLowerCase();
      const symptoms = String(v.symptoms || '').toLowerCase();
      const treatment = String(v.treatment || '').toLowerCase();
      const notes = String(v.notes || '').toLowerCase();
      const nurse = String(v.nurseName || '').toLowerCase();
      const dateStr = v.timestamp?.toDate
        ? v.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase()
        : '';

      return (
        sName.includes(term) ||
        sGrade.includes(term) ||
        symptoms.includes(term) ||
        treatment.includes(term) ||
        notes.includes(term) ||
        nurse.includes(term) ||
        dateStr.includes(term)
      );
    });
  }, [childFilteredVisits, searchTerm]);

  // Stats dynamically calculated for the currently viewed child / all children
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentVisitsCount = childFilteredVisits.filter(v => {
    const visitDate = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
    return visitDate >= thirtyDaysAgo;
  }).length;
  const activePickupNeeded = childFilteredVisits.filter(v => v.pickupRequired || v.needsPickup).length;
  const activeNotificationsCount = childFilteredVisits.filter(v => v.notifyParent).length;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Parent Portal</h1>
        <p className="mt-2 text-slate-600">
          Monitor your child's health records and clinic visit history
        </p>
      </div>

      {/* Children Information Cards / Sibling Filter */}
      {students.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-ndkc-green" />
                Your Children
              </h2>
              <p className="text-xs text-slate-500">
                Click a child's card to view their specific clinic history and records
              </p>
            </div>
            {students.length > 1 && (
              <Button
                variant={selectedChildId === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChildId('ALL')}
                className={selectedChildId === 'ALL'
                  ? 'bg-ndkc-green text-white hover:bg-emerald-700 h-8 text-xs font-semibold'
                  : 'h-8 text-xs font-medium text-slate-600 border-slate-200 hover:bg-slate-50'}
              >
                All Children ({students.length})
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => {
              const isSelected = selectedChildId === student.id;
              const childVisitsCount = visits.filter(v => isVisitForStudent(v, student)).length;

              return (
                <div
                  key={student.id}
                  onClick={() => {
                    setSelectedChildId(prev => prev === student.id ? 'ALL' : student.id);
                  }}
                  className={`group relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 select-none ${
                    isSelected
                      ? 'border-ndkc-green bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 shadow-md ring-2 ring-ndkc-green/20'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Selected Pill Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-ndkc-green px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                      <Check className="h-3 w-3" />
                      Active Filter
                    </div>
                  )}

                  <div className="flex items-start gap-3.5">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                      isSelected
                        ? 'bg-ndkc-green text-white shadow-md shadow-emerald-500/30'
                        : 'bg-emerald-100 text-ndkc-green group-hover:scale-105'
                    }`}>
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <h3 className="font-bold text-slate-900 truncate text-base">{student.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">ID: {student.studentId}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{student.grade}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visit count & prompt */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      🏥 {childVisitsCount} visit{childVisitsCount !== 1 ? 's' : ''} recorded
                    </span>
                    <span className={`font-semibold ${isSelected ? 'text-ndkc-green' : 'text-slate-400 group-hover:text-ndkc-green'}`}>
                      {isSelected ? 'Viewing Records →' : 'Click to filter →'}
                    </span>
                  </div>

                  {/* Allergies if any */}
                  {student.allergies && student.allergies.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3" /> Allergies:
                      </span>
                      {student.allergies.map((allergy, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white border-red-200 text-red-700 text-[10px] px-1.5 py-0">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Visits {selectedChild ? `(${selectedChild.name})` : ''}
            </CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
              <Activity className="h-5 w-5 text-ndkc-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{childFilteredVisits.length}</div>
            <p className="mt-1 text-sm text-slate-500">
              {selectedChild ? `Recorded for ${selectedChild.name}` : 'All time records'}
            </p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Last 30 Days</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2.5 transition-colors group-hover:bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{recentVisitsCount}</div>
            <p className="mt-1 text-sm text-slate-500">Recent visits</p>
          </CardContent>
        </Card>

        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Notifications</CardTitle>
            <div className="rounded-lg bg-purple-50 p-2.5 transition-colors group-hover:bg-purple-100">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {activeNotificationsCount}
            </div>
            <p className="mt-1 text-sm text-slate-500">Alerts sent to you</p>
          </CardContent>
        </Card>

        {activePickupNeeded > 0 && (
          <Card className="group border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-lg shadow-amber-500/20 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-900">Pickup Needed</CardTitle>
              <div className="rounded-lg bg-amber-200 p-2.5 transition-colors group-hover:bg-amber-300">
                <UserCheck className="h-5 w-5 text-amber-900" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{activePickupNeeded}</div>
              <p className="mt-1 text-sm text-amber-700">Requires immediate pickup</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visits Table with Search Bar & Child Filter */}
      <Card className="border-slate-200 bg-white shadow-lg overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-slate-900">Clinic Visit History</CardTitle>
                {selectedChild && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {selectedChild.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChildId('ALL');
                      }}
                      className="ml-1 hover:text-red-600"
                      title="Clear child filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {selectedChild
                  ? `Showing records specifically for ${selectedChild.name}`
                  : `Showing all visits for ${students.map(s => s.name).join(', ') || 'your children'}`}
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 w-full md:w-80">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search symptoms, treatment, notes..."
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
            </div>
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
          ) : displayedVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-slate-100 p-4">
                <Activity className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-slate-700 font-semibold">
                {searchTerm
                  ? `No visits found matching "${searchTerm}"`
                  : selectedChild
                  ? `No clinic visits recorded for ${selectedChild.name}`
                  : 'No clinic visits recorded'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm
                  ? 'Try checking for typos or searching a different keyword'
                  : 'Records will appear here as soon as a nurse logs a clinic visit'}
              </p>
              {(searchTerm || selectedChildId !== 'ALL') && (
                <div className="mt-4 flex gap-2">
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="text-xs"
                    >
                      Clear Search
                    </Button>
                  )}
                  {selectedChildId !== 'ALL' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChildId('ALL')}
                      className="text-xs"
                    >
                      Show All Children
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50">
                    <TableHead className="font-semibold text-slate-700">Date & Time</TableHead>
                    <TableHead className="font-semibold text-slate-700">Student</TableHead>
                    <TableHead className="font-semibold text-slate-700">Grade</TableHead>
                    <TableHead className="font-semibold text-slate-700">Symptoms</TableHead>
                    <TableHead className="font-semibold text-slate-700">Treatment</TableHead>
                    <TableHead className="font-semibold text-slate-700">Notes</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedVisits.map((visit, index) => (
                    <TableRow 
                      key={visit.id} 
                      className={`border-slate-100 transition-colors hover:bg-slate-50/50 ${visit.needsPickup ? 'bg-amber-50/30' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="font-medium">{formatTime(visit.timestamp)}</p>
                            <p className="text-xs text-slate-500">
                              {visit.timestamp?.toDate ? visit.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{visit.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{visit.grade}</TableCell>
                      <TableCell className="text-slate-600">{visit.symptoms}</TableCell>
                      <TableCell className="text-slate-600">{visit.treatment}</TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">
                        {visit.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {visit.needsPickup && (
                            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 w-fit border border-amber-200">
                              <UserCheck className="mr-1 h-3 w-3" />
                              Pickup Required
                            </Badge>
                          )}
                          {visit.notifyParent && (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 w-fit">
                              <Bell className="mr-1 h-3 w-3" />
                              Email Sent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}