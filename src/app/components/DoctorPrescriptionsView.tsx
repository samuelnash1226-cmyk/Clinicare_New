import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Prescription, getPrescriptions } from '../lib/firestore-setup';
import {
  Stethoscope,
  Pill,
  FileCheck,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  FileText,
  User,
  GraduationCap,
  Loader2,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface DoctorPrescriptionsViewProps {
  userRole: string;
  userEmail: string;
  studentIds?: string[];
}

export function DoctorPrescriptionsView({
  userRole,
  userEmail,
  studentIds = [],
}: DoctorPrescriptionsViewProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string>('ALL');
  const [childrenList, setChildrenList] = useState<{ id: string; name: string; studentId: string; grade: string }[]>([]);
  const [previewRx, setPreviewRx] = useState<Prescription | null>(null);

  useEffect(() => {
    loadPrescriptions();
  }, [userRole, userEmail, studentIds]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const allRx = await getPrescriptions();
      const normEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();

      if (userRole === 'student' || userRole === 'personnel') {
        // Find matching student by email or user doc
        const studentsSnap = await getDocs(collection(db, 'students'));
        const studentDocs = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        const matchedStudent = studentDocs.find((s: any) => {
          const sEmail = String(s.email || '').trim().toLowerCase();
          return sEmail && sEmail === normEmail;
        });

        const targetIds = new Set<string>();
        if (matchedStudent) {
          if (matchedStudent.id) targetIds.add(matchedStudent.id.toLowerCase());
          if (matchedStudent.studentId) targetIds.add(String(matchedStudent.studentId).toLowerCase());
          if (matchedStudent.name) targetIds.add(String(matchedStudent.name).toLowerCase());
        } else if (normEmail) {
          targetIds.add(normEmail);
          targetIds.add(normEmail.split('@')[0]);
        }

        const filtered = allRx.filter(rx => {
          const rxId = String(rx.studentId || '').trim().toLowerCase();
          const rxDocId = String(rx.studentDocId || '').trim().toLowerCase();
          const rxName = String(rx.studentName || '').trim().toLowerCase();
          return targetIds.has(rxId) || targetIds.has(rxDocId) || targetIds.has(rxName);
        });

        setPrescriptions(filtered);
      } else if (userRole === 'parent') {
        // Gather parent's children
        const studentsSnap = await getDocs(collection(db, 'students'));
        const matchedChildren: { id: string; name: string; studentId: string; grade: string }[] = [];
        const explicitSet = new Set((studentIds || []).map(id => id.trim().toLowerCase()));

        studentsSnap.docs.forEach(docSnap => {
          const sData = docSnap.data();
          const sId = docSnap.id;
          const sSchoolId = String(sData.studentId || '').trim().toLowerCase();
          const pEmail = String(sData.parentEmail || '').trim().toLowerCase();

          const isMatch = explicitSet.has(sId.toLowerCase()) ||
            (sSchoolId && explicitSet.has(sSchoolId)) ||
            (normEmail && pEmail && pEmail === normEmail);

          if (isMatch) {
            matchedChildren.push({
              id: sId,
              name: sData.name || 'Student',
              studentId: sData.studentId || sId,
              grade: sData.grade || '',
            });
          }
        });

        setChildrenList(matchedChildren);

        // Filter prescriptions for these children
        const childIdsSet = new Set<string>();
        matchedChildren.forEach(c => {
          childIdsSet.add(c.id.toLowerCase());
          childIdsSet.add(c.studentId.toLowerCase());
          childIdsSet.add(c.name.toLowerCase());
        });

        const parentRx = allRx.filter(rx => {
          const rxId = String(rx.studentId || '').trim().toLowerCase();
          const rxDocId = String(rx.studentDocId || '').trim().toLowerCase();
          const rxName = String(rx.studentName || '').trim().toLowerCase();
          const pEmail = String(rx.parentEmail || '').trim().toLowerCase();

          return childIdsSet.has(rxId) || childIdsSet.has(rxDocId) || childIdsSet.has(rxName) || (normEmail && pEmail === normEmail);
        });

        setPrescriptions(parentRx);
      } else {
        // Fallback: show all
        setPrescriptions(allRx);
      }
    } catch (error) {
      console.error('Error loading doctor prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter prescriptions by selected child (parent only) and search query
  const displayPrescriptions = prescriptions.filter(p => {
    // Child filter for parent
    if (userRole === 'parent' && selectedChildId !== 'ALL') {
      const child = childrenList.find(c => c.id === selectedChildId);
      if (child) {
        const cSchoolId = child.studentId.toLowerCase();
        const cName = child.name.toLowerCase();
        const rxId = String(p.studentId || '').toLowerCase();
        const rxDocId = String(p.studentDocId || '').toLowerCase();
        const rxName = String(p.studentName || '').toLowerCase();
        if (rxId !== cSchoolId && rxDocId !== child.id.toLowerCase() && rxName !== cName) {
          return false;
        }
      }
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.doctorName || '').toLowerCase().includes(q) ||
      (p.diagnosis || '').toLowerCase().includes(q) ||
      (p.medications || '').toLowerCase().includes(q) ||
      (p.studentName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Doctor's Prescriptions
            </h1>
            <p className="text-sm text-slate-500">
              {userRole === 'parent'
                ? 'Official medical prescriptions issued for your children by the clinic physician'
                : 'Your clinic doctor prescriptions, dosage instructions, and official Rx slips'}
            </p>
          </div>
        </div>
      </div>

      {/* Parent Child Tabs */}
      {userRole === 'parent' && childrenList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedChildId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedChildId === 'ALL'
                ? 'bg-ndkc-green text-white shadow-md shadow-emerald-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Children ({prescriptions.length})
          </button>
          {childrenList.map(child => {
            const count = prescriptions.filter(p => {
              const rxId = String(p.studentId || '').toLowerCase();
              const rxDoc = String(p.studentDocId || '').toLowerCase();
              const rxName = String(p.studentName || '').toLowerCase();
              return rxId === child.studentId.toLowerCase() || rxDoc === child.id.toLowerCase() || rxName === child.name.toLowerCase();
            }).length;

            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedChildId === child.id
                    ? 'bg-ndkc-green text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {child.name.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by doctor, diagnosis, medication..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 border-slate-200 text-sm focus:ring-ndkc-green"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-ndkc-green mb-2" />
          <p className="text-sm">Loading prescriptions...</p>
        </div>
      ) : displayPrescriptions.length === 0 ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 text-emerald-600 border border-emerald-100">
              <FileCheck className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-slate-800">No prescriptions recorded</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery
                ? `No prescriptions match "${searchQuery}".`
                : 'When the attending clinic doctor issues a prescription, it will appear here with instructions and downloadable Rx.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayPrescriptions.map(rx => {
            const dateObj = rx.issuedAt?.toDate
              ? rx.issuedAt.toDate()
              : new Date(rx.issuedAt || rx.createdAt || 0);

            return (
              <Card key={rx.id} className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Card Header Band */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-ndkc-green text-white flex items-center justify-center shadow-sm shrink-0">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{rx.doctorName}</h3>
                        <p className="text-[11px] text-slate-500">{rx.licenseNumber || 'Clinic Attending Physician'}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-4 space-y-3">
                    {/* Patient tag (especially helpful for parents with multiple kids) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{rx.studentName}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-200">
                          {rx.grade}
                        </Badge>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px] px-2">
                        Official Rx
                      </Badge>
                    </div>

                    {/* Diagnosis */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnosis</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">{rx.diagnosis}</p>
                    </div>

                    {/* Prescribed Medication */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Prescribed Medication & Dosage
                      </p>
                      <p className="text-sm font-semibold text-slate-800 whitespace-pre-line mt-1">
                        {rx.medications}
                      </p>
                    </div>

                    {/* Special Instructions */}
                    {rx.instructions && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctor's Advice</p>
                        <p className="text-xs text-slate-600 mt-0.5">{rx.instructions}</p>
                      </div>
                    )}

                    {/* Visual Prescription Slip Preview */}
                    {rx.fileUrl && (
                      <div className="pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Attached Prescription (Rx)
                        </p>
                        {rx.fileType === 'pdf' ? (
                          <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-rose-600" />
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {rx.fileName || 'Prescription_Document.pdf'}
                              </span>
                            </div>
                            <a
                              href={rx.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-2xs"
                            >
                              <ExternalLink className="h-3 w-3" /> Open PDF
                            </a>
                          </div>
                        ) : (
                          <div
                            onClick={() => setPreviewRx(rx)}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center cursor-pointer"
                          >
                            <img
                              src={rx.fileUrl}
                              alt="Doctor Prescription Slip"
                              className="max-h-48 w-full object-cover group-hover:scale-102 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-2xs">
                              <Eye className="h-4 w-4" /> Click to view full Rx
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Footer with Attachment & View Button */}
                <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                  {rx.fileUrl ? (
                    <a
                      href={rx.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      View Official Rx Slip
                      <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No paper slip attached</span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewRx(rx)}
                    className="text-xs text-slate-600 hover:text-slate-900 h-8"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Full Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {previewRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Prescription Details</h3>
              </div>
              <button
                onClick={() => setPreviewRx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900 text-sm">{previewRx.doctorName}</p>
                <p className="text-xs text-slate-500">{previewRx.licenseNumber || 'Clinic Physician'}</p>
                <p className="text-xs text-slate-600 mt-2">
                  Patient: <strong className="text-slate-900">{previewRx.studentName}</strong> ({previewRx.grade})
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Diagnosis</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{previewRx.diagnosis}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Medication & Dosage</p>
                <div className="mt-1 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">
                    {previewRx.medications}
                  </p>
                </div>
              </div>

              {previewRx.instructions && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Doctor's Instructions</p>
                  <p className="text-xs text-slate-600 mt-0.5">{previewRx.instructions}</p>
                </div>
              )}

              {previewRx.fileUrl && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prescription Slip (Rx)</p>
                    <a
                      href={previewRx.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Full Size
                    </a>
                  </div>

                  {previewRx.fileType === 'pdf' ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1">
                      <iframe
                        src={previewRx.fileUrl}
                        title="Prescription PDF Document"
                        className="w-full h-80 rounded-lg border border-slate-200"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 flex justify-center overflow-hidden max-h-96">
                      <img
                        src={previewRx.fileUrl}
                        alt="Prescription Slip"
                        className="max-h-96 w-auto rounded-lg object-contain shadow-xs hover:scale-101 transition-transform cursor-pointer"
                        onClick={() => window.open(previewRx.fileUrl, '_blank')}
                      />
                    </div>
                  )}

                  <a
                    href={previewRx.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-gradient-to-r from-ndkc-green to-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download Official Prescription Slip
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewRx(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

