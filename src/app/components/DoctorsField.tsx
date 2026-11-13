import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Prescription,
  getPrescriptions,
  addPrescription,
  sendPrescriptionEmailNotification,
  sendPrescriptionSMSNotification,
} from '../lib/firestore-setup';
import { uploadPrescriptionToCloudinary } from '../lib/cloudinary';
import {
  Stethoscope,
  Plus,
  Search,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  User,
  Clock,
  Sparkles,
  Eye,
  X,
  FileCheck,
  AlertCircle,
  Send,
  Loader2,
  Download,
  Filter,
  GraduationCap,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
}

export function DoctorsField() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parentMap, setParentMap] = useState<Record<string, { email: string; name: string; phone: string }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Issue Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Form Fields
  const [doctorName, setDoctorName] = useState('Dr. Maria Santos, MD');
  const [licenseNumber, setLicenseNumber] = useState('PRC #0145892');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [notifySMS, setNotifySMS] = useState(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View Prescription Modal State
  const [previewPrescription, setPreviewPrescription] = useState<Prescription | null>(null);

  // Load Prescriptions, Students & Linked Parents
  const loadData = async () => {
    try {
      setLoading(true);
      const [rxList, studentsSnap, usersSnap] = await Promise.all([
        getPrescriptions(),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'users')),
      ]);

      setPrescriptions(rxList);
      const studentList: Student[] = studentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(studentList);

      const parentsMap: Record<string, { email: string; name: string; phone: string }> = {};
      usersSnap.docs.forEach(d => {
        const u = d.data();
        if (u.role === 'parent' && Array.isArray(u.studentIds)) {
          u.studentIds.forEach((sid: string) => {
            parentsMap[sid] = {
              email: u.email || '',
              name: u.name || 'Parent',
              phone: u.phone || '',
            };
          });
        }
      });
      setParentMap(parentsMap);
    } catch (error) {
      console.error('Error loading doctor field data:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG) or PDF document.');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size cannot exceed 10MB.');
      return;
    }

    setSelectedFile(file);

    // Create thumbnail preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter students for search dropdown
  const filteredStudents = students.filter(s => {
    const query = studentSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      (s.name || '').toLowerCase().includes(query) ||
      (s.studentId || '').toLowerCase().includes(query) ||
      (s.grade || '').toLowerCase().includes(query)
    );
  }).slice(0, 8);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast.error('Please select a student for the prescription.');
      return;
    }
    if (!doctorName.trim()) {
      toast.error('Please enter the Attending Doctor name.');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Please enter the clinical diagnosis / impression.');
      return;
    }
    if (!medications.trim()) {
      toast.error('Please specify the prescribed medications.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedFileUrl = '';
      let uploadedFileName = '';
      let uploadedFileType = '';

      // Step 1: Upload File to Cloudinary if provided
      if (selectedFile) {
        setUploadProgress(true);
        const uploadResult = await uploadPrescriptionToCloudinary(
          selectedFile,
          selectedStudent.studentId || selectedStudent.id
        );
        uploadedFileUrl = uploadResult.secureUrl;
        uploadedFileName = uploadResult.originalFilename;
        uploadedFileType = uploadResult.format;
        setUploadProgress(false);
      }

      // Step 2: Parent notification status (Email & Phone SMS)
      let notificationStatus: 'sent' | 'pending' | 'failed' | 'not_requested' = 'not_requested';
      let smsStatus: 'sent' | 'pending' | 'failed' | 'not_requested' = 'not_requested';
      const targetEmail = parentEmailInput.trim();
      const targetPhone = parentPhoneInput.trim();

      // Email Notification via EmailJS
      if (notifyParent && targetEmail && targetEmail.includes('@')) {
        try {
          await sendPrescriptionEmailNotification({
            parentEmail: targetEmail,
            parentName: selectedStudent.parentName || parentMap[selectedStudent.id]?.name,
            studentName: selectedStudent.name,
            grade: selectedStudent.grade,
            doctorName: doctorName.trim(),
            diagnosis: diagnosis.trim(),
            medications: medications.trim(),
            instructions: instructions.trim(),
            prescriptionUrl: uploadedFileUrl || undefined,
          });
          notificationStatus = 'sent';
        } catch (emailErr: any) {
          console.warn('Could not send parent email notification:', emailErr);
          notificationStatus = 'failed';
        }
      }

      // Phone SMS Notification via PhilSMS
      if (notifySMS && targetPhone) {
        try {
          await sendPrescriptionSMSNotification({
            parentPhone: targetPhone,
            parentName: selectedStudent.parentName || parentMap[selectedStudent.id]?.name,
            studentName: selectedStudent.name,
            grade: selectedStudent.grade,
            doctorName: doctorName.trim(),
            diagnosis: diagnosis.trim(),
            medications: medications.trim(),
          });
          smsStatus = 'sent';
        } catch (smsErr: any) {
          console.warn('Could not send parent SMS notification:', smsErr);
          smsStatus = 'failed';
        }
      }

      // Feedback Toast
      const sentChannels: string[] = [];
      const failedChannels: string[] = [];

      if (notifyParent && targetEmail) {
        if (notificationStatus === 'sent') sentChannels.push(`Email (${targetEmail})`);
        else failedChannels.push('Email');
      }
      if (notifySMS && targetPhone) {
        if (smsStatus === 'sent') sentChannels.push(`SMS (${targetPhone})`);
        else failedChannels.push('SMS');
      }

      if (sentChannels.length > 0) {
        toast.success(`Prescription issued! Sent via ${sentChannels.join(' & ')} 📲`);
      } else {
        toast.success('Doctor prescription issued successfully! 🩺');
      }

      if (failedChannels.length > 0) {
        toast.warning(`Note: Failed to deliver via ${failedChannels.join(', ')}. Please verify contact info.`);
      }

      // Step 3: Save to Firestore
      const currentUser = auth.currentUser?.email || 'Clinic Staff';
      await addPrescription({
        studentId: selectedStudent.studentId || selectedStudent.id,
        studentDocId: selectedStudent.id,
        studentName: selectedStudent.name,
        grade: selectedStudent.grade,
        doctorName: doctorName.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        diagnosis: diagnosis.trim(),
        medications: medications.trim(),
        instructions: instructions.trim() || 'Take medication as prescribed.',
        fileUrl: uploadedFileUrl || undefined,
        fileName: uploadedFileName || undefined,
        fileType: uploadedFileType || undefined,
        fileSize: selectedFile?.size || undefined,
        notifyParent,
        parentEmail: targetEmail || selectedStudent.parentEmail || undefined,
        parentName: selectedStudent.parentName || parentMap[selectedStudent.id]?.name || undefined,
        parentPhone: targetPhone || selectedStudent.parentPhone || parentMap[selectedStudent.id]?.phone || undefined,
        notificationStatus,
        smsStatus,
        issuedAt: new Date(),
        createdBy: currentUser,
      });

      // Reset form & close modal
      setIsModalOpen(false);
      setSelectedStudent(null);
      setParentEmailInput('');
      setParentPhoneInput('');
      setStudentSearch('');
      setDiagnosis('');
      setMedications('');
      setInstructions('');
      handleRemoveFile();

      // Refresh list
      loadData();
    } catch (error: any) {
      console.error('Error issuing prescription:', error);
      toast.error(error.message || 'Failed to issue prescription');
    } finally {
      setSubmitting(false);
      setUploadProgress(false);
    }
  };

  // Filtered prescription list for search
  const filteredPrescriptions = prescriptions.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.studentName || '').toLowerCase().includes(q) ||
      (p.studentId || '').toLowerCase().includes(q) ||
      (p.doctorName || '').toLowerCase().includes(q) ||
      (p.diagnosis || '').toLowerCase().includes(q) ||
      (p.medications || '').toLowerCase().includes(q)
    );
  });

  const todayCount = prescriptions.filter(p => {
    const d = p.issuedAt?.toDate ? p.issuedAt.toDate() : new Date(p.issuedAt || p.createdAt || 0);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const withFilesCount = prescriptions.filter(p => p.fileUrl).length;
  const notifiedCount = prescriptions.filter(p => p.notificationStatus === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Doctor's Field & Prescriptions
              </h1>
              <p className="text-sm text-slate-500">
                Official clinical orders, doctor's prescriptions, and parent notification center
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-11 px-5 bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30"
        >
          <Plus className="mr-2 h-4 w-4" />
          Issue Doctor's Prescription
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Prescriptions</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{prescriptions.length}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Recorded in system</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued Today</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{todayCount}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Active doctor orders</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded Rx Files</p>
              <h3 className="text-2xl font-bold text-teal-600 mt-1">{withFilesCount}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Stored on Cloudinary</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Upload className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parents Notified</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{notifiedCount}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sent via EmailJS</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Send className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Records Table Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Prescription Issuance Log
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              History of all physician prescriptions, diagnostic orders, and attached doctor slips
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by student, doctor, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-slate-200 text-sm focus:ring-ndkc-green"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-ndkc-green mb-2" />
              <p className="text-sm">Loading prescription records...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 text-slate-300 border border-slate-200">
                <FileText className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-700">No prescriptions found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery
                  ? `No results match your search "${searchQuery}".`
                  : 'Start by clicking "Issue Doctor\'s Prescription" above to record a new prescription.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Diagnosis</th>
                    <th className="py-3 px-4">Prescription</th>
                    <th className="py-3 px-4">Uploaded Rx</th>
                    <th className="py-3 px-4">Parent Alert</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPrescriptions.map((rx) => {
                    const dateObj = rx.issuedAt?.toDate
                      ? rx.issuedAt.toDate()
                      : new Date(rx.issuedAt || rx.createdAt || 0);

                    return (
                      <tr key={rx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <p className="text-[11px] text-slate-500 pl-5">
                            {dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{rx.studentName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-600">
                              {rx.grade || 'Student'}
                            </Badge>
                            <span className="text-[11px] text-slate-400">ID: {rx.studentId}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="font-medium text-slate-800">{rx.doctorName}</span>
                          </div>
                          {rx.licenseNumber && (
                            <p className="text-[10px] text-slate-400 pl-5">{rx.licenseNumber}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-800 font-medium truncate">{rx.diagnosis}</p>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-800 truncate">{rx.medications}</p>
                          <p className="text-[11px] text-slate-500 truncate">{rx.instructions}</p>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rx.fileUrl ? (
                            <div className="flex items-center gap-2">
                              {rx.fileType === 'pdf' ? (
                                <a
                                  href={rx.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-200 flex flex-col items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors shrink-0 shadow-2xs"
                                  title="View PDF Document"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span className="text-[8px] font-bold mt-0.5">PDF</span>
                                </a>
                              ) : (
                                <img
                                  src={rx.fileUrl}
                                  alt="Rx Slip"
                                  onClick={() => setPreviewPrescription(rx)}
                                  className="h-10 w-10 rounded-lg object-cover border border-slate-200 hover:border-emerald-500 cursor-pointer transition-all shadow-2xs shrink-0 hover:scale-105"
                                  title="Click to preview Rx"
                                />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewPrescription(rx)}
                                className="h-7 text-xs px-2 bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 font-semibold"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Rx
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No document</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {/* Email badge */}
                            {rx.notificationStatus === 'sent' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] flex items-center gap-1 w-fit font-medium">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Email Sent
                              </Badge>
                            ) : rx.notificationStatus === 'failed' ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] flex items-center gap-1 w-fit font-medium">
                                <XCircle className="h-3 w-3 text-red-500" />
                                Email Failed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[11px] flex items-center gap-1 w-fit">
                                <AlertCircle className="h-3 w-3" />
                                No Email
                              </Badge>
                            )}
                            {/* SMS badge */}
                            {rx.smsStatus === 'sent' ? (
                              <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[11px] flex items-center gap-1 w-fit font-medium">
                                <Phone className="h-3 w-3 text-blue-600" />
                                SMS Sent
                              </Badge>
                            ) : rx.smsStatus === 'failed' ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] flex items-center gap-1 w-fit font-medium">
                                <XCircle className="h-3 w-3 text-red-500" />
                                SMS Failed
                              </Badge>
                            ) : rx.smsStatus === 'not_requested' ? null : null}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewPrescription(rx)}
                            className="h-8 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* ISSUE PRESCRIPTION MODAL */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-ndkc-green flex items-center justify-center text-white shadow-sm">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Issue Doctor's Prescription</h3>
                  <p className="text-xs text-slate-500">Record official prescription & notify parent</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Doctor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Attending Doctor on Duty *</Label>
                  <Input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Maria Santos, MD"
                    className="mt-1 h-9 text-sm bg-white border-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">License / PRC No. (Optional)</Label>
                  <Input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. PRC #0145892"
                    className="mt-1 h-9 text-sm bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Student Selector */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Select Patient / Student *</Label>
                {selectedStudent ? (
                  <div className="mt-1.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{selectedStudent.name}</p>
                        <p className="text-xs text-slate-600">
                          {selectedStudent.grade} • ID: {selectedStudent.studentId}
                        </p>
                        {selectedStudent.parentEmail && (
                          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                            Parent Email: {selectedStudent.parentEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(null);
                        setParentEmailInput('');
                        setParentPhoneInput('');
                        setStudentSearch('');
                      }}
                      className="text-xs text-slate-500 hover:text-red-600"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Type student name or ID to search..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      className="pl-9 h-10 border-slate-200 text-sm"
                    />

                    {/* Student Dropdown Results */}
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {filteredStudents.map(student => (
                          <div
                            key={student.id}
                            onClick={() => {
                              setSelectedStudent(student);
                              const pEmail = student.parentEmail || parentMap[student.id]?.email || parentMap[student.studentId]?.email || '';
                              setParentEmailInput(pEmail);
                              const pPhone = student.parentPhone || parentMap[student.id]?.phone || parentMap[student.studentId]?.phone || '';
                              setParentPhoneInput(pPhone);
                              setShowStudentDropdown(false);
                            }}
                            className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.grade} • ID: {student.studentId}</p>
                            </div>
                            {(student.parentEmail || parentMap[student.id]?.email) && (
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                Parent Linked
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Editable Parent Email Notification Target */}
              {selectedStudent && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Parent Email Address (For Immediate Notification)</span>
                    {parentEmailInput && parentEmailInput.includes('@') ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                        ✓ Ready to Send
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">Type email below to alert parent</span>
                    )}
                  </Label>
                  <Input
                    type="email"
                    value={parentEmailInput}
                    onChange={(e) => setParentEmailInput(e.target.value)}
                    placeholder="e.g. parent@example.com"
                    className="mt-1 h-9 text-xs border-slate-200 bg-white"
                  />
                </div>
              )}

              {/* Parent Phone Number for SMS */}
              {selectedStudent && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Parent Phone Number (For SMS Alert)</span>
                    {parentPhoneInput ? (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-medium">
                        ✓ SMS Ready
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">e.g. 09123456789 or 639XXXXXXXXX</span>
                    )}
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="tel"
                      value={parentPhoneInput}
                      onChange={(e) => setParentPhoneInput(e.target.value)}
                      placeholder="e.g. 09516495356"
                      className="pl-8 h-9 text-xs border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Clinical Diagnosis / Impression *</Label>
                <Input
                  type="text"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Pharyngitis / Upper Respiratory Tract Infection (URTI)"
                  className="mt-1 h-10 text-sm border-slate-200"
                />
              </div>

              {/* Prescribed Medications */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Prescribed Medications & Dosage *</Label>
                <Textarea
                  required
                  rows={2}
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg - 1 capsule 3x a day for 7 days&#10;Paracetamol 500mg - 1 tablet every 4-6 hours PRN for fever"
                  className="mt-1 text-sm border-slate-200 resize-none"
                />
              </div>

              {/* Advice & Instructions */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Doctor's Advice & Intake Instructions</Label>
                <Textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take after meals. Increase fluid intake. Return for follow-up if fever persists after 3 days."
                  className="mt-1 text-sm border-slate-200 resize-none"
                />
              </div>

              {/* Prescription File Upload (Cloudinary) */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Attach Doctor's Prescription Slip (Rx)</span>
                  <span className="text-[11px] text-slate-400 font-normal">JPG, PNG, or PDF (Max 10MB)</span>
                </Label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="mt-1.5 p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Rx Preview"
                          className="h-12 w-12 rounded-lg object-cover border border-teal-300 shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <Upload className="mx-auto h-7 w-7 text-slate-400 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">
                      Click to upload physical doctor Rx slip, photo or PDF
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Uploads directly to secure clinic storage
                    </p>
                  </div>
                )}
              </div>

              {/* Notify Parent Toggle (Email) */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Notify Parent via Email</p>
                  <p className="text-[11px] text-slate-500">
                    {parentEmailInput
                      ? `Send alert to: ${parentEmailInput}`
                      : 'Enter email above to enable email notifications'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="h-4 w-4 rounded text-ndkc-green focus:ring-ndkc-green cursor-pointer"
                />
              </div>

              {/* Notify Parent Toggle (SMS) */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Notify Parent via SMS (PhilSMS)</p>
                    <p className="text-[11px] text-slate-500">
                      {parentPhoneInput
                        ? `Send SMS to: ${parentPhoneInput}`
                        : 'Enter phone number above to enable SMS alerts'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifySMS}
                  onChange={(e) => setNotifySMS(e.target.checked)}
                  disabled={!parentPhoneInput}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="h-10 text-xs text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 text-xs font-semibold bg-gradient-to-r from-ndkc-green to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadProgress ? 'Uploading Rx File...' : 'Issuing Prescription...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Confirm & Issue Prescription
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRESCRIPTION DETAILS & PREVIEW MODAL */}
      {/* ========================================================= */}
      {previewPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Prescription Details</h3>
              </div>
              <button
                onClick={() => setPreviewPrescription(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Doctor & Date Header */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{previewPrescription.doctorName}</h4>
                    <p className="text-xs text-slate-500">{previewPrescription.licenseNumber || 'Clinic Physician'}</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs">Official Rx</Badge>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span>Patient: <strong className="text-slate-900">{previewPrescription.studentName}</strong></span>
                  <span>Grade: {previewPrescription.grade}</span>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <Label className="text-xs text-slate-400 uppercase font-semibold">Diagnosis</Label>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{previewPrescription.diagnosis}</p>
              </div>

              {/* Medication */}
              <div>
                <Label className="text-xs text-slate-400 uppercase font-semibold">Prescription (Rx)</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">
                    {previewPrescription.medications}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              {previewPrescription.instructions && (
                <div>
                  <Label className="text-xs text-slate-400 uppercase font-semibold">Special Instructions</Label>
                  <p className="text-xs text-slate-600 mt-0.5">{previewPrescription.instructions}</p>
                </div>
              )}

              {/* Attached Prescription Slip Visual Display */}
              {previewPrescription.fileUrl && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                      Prescription Slip (Rx Document)
                    </Label>
                    <a
                      href={previewPrescription.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Open Full Size
                    </a>
                  </div>

                  {previewPrescription.fileType === 'pdf' ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1">
                      <iframe
                        src={previewPrescription.fileUrl}
                        title="Prescription PDF Document"
                        className="w-full h-80 rounded-lg border border-slate-200"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 flex justify-center overflow-hidden max-h-96">
                      <img
                        src={previewPrescription.fileUrl}
                        alt="Prescription Slip"
                        className="max-h-96 w-auto rounded-lg object-contain shadow-xs hover:scale-101 transition-transform cursor-pointer"
                        onClick={() => window.open(previewPrescription.fileUrl, '_blank')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewPrescription(null)}
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

