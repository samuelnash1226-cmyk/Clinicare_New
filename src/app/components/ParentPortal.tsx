import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ClinicVisit } from '../lib/firestore-setup';
import { Bell, Clock, Activity, FileText, Calendar, Heart, AlertCircle, UserCheck, GraduationCap, User, Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
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

  const loadData = async () => {
    try {
      console.log('🔍 ParentPortal: Starting to load data...');
      console.log('📧 Parent email:', userEmail);
      console.log('👨‍👩‍👧‍👦 Student IDs from props:', studentIds);

      // Check if studentIds is valid
      if (!studentIds || studentIds.length === 0) {
        console.warn('⚠️ ParentPortal: No linked students found for parent:', userEmail);
        console.log('💡 TIP: Link this parent to students in User Management');
        setLoading(false);
        return;
      }

      // Filter out any undefined/null values from studentIds
      const validStudentIds = studentIds.filter(id => id && typeof id === 'string');
      console.log('✅ Valid student IDs:', validStudentIds);
      
      if (validStudentIds.length === 0) {
        console.warn('⚠️ ParentPortal: No valid student IDs after filtering');
        setLoading(false);
        return;
      }

      // Load student information
      const studentsData: StudentInfo[] = [];
      for (const studentId of validStudentIds) {
        console.log('🔍 Loading student document:', studentId);
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (studentDoc.exists()) {
          const student = {
            id: studentDoc.id,
            ...studentDoc.data()
          } as StudentInfo;
          studentsData.push(student);
          console.log('✅ Found student:', student.name, '(ID:', studentDoc.id, ')');
        } else {
          console.warn('⚠️ Student document not found:', studentId);
        }
      }
      setStudents(studentsData);
      console.log('📚 Total students loaded:', studentsData.length);

      // Load clinic visits - use validStudentIds
      console.log('🏥 Querying clinic visits for student IDs:', validStudentIds);
      const visitsRef = collection(db, 'clinicVisits');
      
      try {
        // Try with composite index query (orderBy + where)
        const q = query(
          visitsRef,
          where('studentId', 'in', validStudentIds.slice(0, 10)), // Firestore limit
          orderBy('timestamp', 'desc')
        );
        
        const snapshot = await getDocs(q);
        console.log('📊 Clinic visits found:', snapshot.docs.length);
        
        const visitsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📝 Visit data:', {
            id: doc.id,
            studentId: data.studentId,
            studentName: data.studentName,
            symptoms: data.symptoms,
            timestamp: data.timestamp
          });
          return {
            id: doc.id,
            ...data
          } as ClinicVisit;
        });
        setVisits(visitsData);

        // Count visits that need pickup
        const needsPickup = visitsData.filter(v => v.pickupRequired || v.needsPickup).length;
        setPickupNeeded(needsPickup);
        console.log('🚗 Visits needing pickup:', needsPickup);
      } catch (indexError: any) {
        console.error('❌ Error with indexed query:', indexError);
        console.log('💡 Trying fallback query without orderBy...');
        
        // Fallback: Query without orderBy (doesn't need composite index)
        const fallbackQuery = query(
          visitsRef,
          where('studentId', 'in', validStudentIds.slice(0, 10))
        );
        
        const snapshot = await getDocs(fallbackQuery);
        console.log('📊 Fallback query - visits found:', snapshot.docs.length);
        
        const visitsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📝 Visit data:', {
            id: doc.id,
            studentId: data.studentId,
            studentName: data.studentName,
            symptoms: data.symptoms
          });
          return {
            id: doc.id,
            ...data
          } as ClinicVisit;
        }).sort((a, b) => {
          // Sort manually on client side
          const timeA = a.timestamp?.toMillis?.() || 0;
          const timeB = b.timestamp?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        setVisits(visitsData);
        const needsPickup = visitsData.filter(v => v.pickupRequired || v.needsPickup).length;
        setPickupNeeded(needsPickup);
        console.log('✅ Using fallback query successfully');
      }
    } catch (error: any) {
      console.error('❌ Error loading parent portal data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    } finally {
      setLoading(false);
      console.log('✅ ParentPortal: Finished loading data');
    }
  };

  useEffect(() => {
    loadData();
  }, [studentIds]);

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

  // Get visits from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentVisits = visits.filter(v => {
    const visitDate = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
    return visitDate >= thirtyDaysAgo;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Parent Portal</h1>
        <p className="mt-2 text-slate-600">
          Monitor your child's health records and clinic visit history
        </p>
      </div>

      {/* Children Information Cards */}
      {students.length > 0 && (
        <div>
          <h2 className="mb-4 text-slate-900">Your Children</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => (
              <Card 
                key={student.id} 
                className="group border-slate-200 bg-white shadow-sm hover-lift"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200">
                        <User className="h-6 w-6 text-ndkc-green" />
                      </div>
                      <div>
                        <CardTitle className="text-slate-900">{student.name}</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">ID: {student.studentId}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <GraduationCap className="h-4 w-4 text-slate-400" />
                    <span>{student.grade}</span>
                  </div>
                  {student.allergies && student.allergies.length > 0 ? (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <p className="text-xs font-medium text-red-900">Allergies</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {student.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white border-red-200 text-red-700 text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-emerald-600" />
                        <p className="text-xs text-emerald-900">No known allergies</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-slate-200 bg-white shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Visits</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
              <Activity className="h-5 w-5 text-ndkc-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{visits.length}</div>
            <p className="mt-1 text-sm text-slate-500">All time records</p>
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
            <div className="text-3xl font-bold text-slate-900">{recentVisits.length}</div>
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
              {visits.filter(v => v.notifyParent).length}
            </div>
            <p className="mt-1 text-sm text-slate-500">Alerts sent to you</p>
          </CardContent>
        </Card>

        {pickupNeeded > 0 && (
          <Card className="group border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-lg shadow-amber-500/20 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-900">Pickup Needed</CardTitle>
              <div className="rounded-lg bg-amber-200 p-2.5 transition-colors group-hover:bg-amber-300">
                <UserCheck className="h-5 w-5 text-amber-900" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{pickupNeeded}</div>
              <p className="mt-1 text-sm text-amber-700">Requires immediate pickup</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Visits Table */}
      <Card className="border-slate-200 bg-white shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">Clinic Visit History</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Showing visits for {students.map(s => s.name).join(', ')}
              </p>
            </div>
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
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-slate-100 p-4">
                <Activity className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-slate-600">No clinic visits recorded</p>
              <p className="mt-1 text-sm text-slate-500">Your child has not visited the clinic yet</p>
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
                  {visits.map((visit, index) => (
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
                              {visit.timestamp?.toDate ? visit.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {visit.studentName}
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