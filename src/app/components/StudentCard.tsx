import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Search,
  User,
  GraduationCap,
  Mail,
  AlertCircle,
  Heart,
  Users,
  Pencil,
  Syringe,
  Plus,
  X,
  Activity,
  Filter,
  Layers,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Stethoscope,
  Pill,
  FileCheck,
  Upload,
  Download,
  ExternalLink,
  Clock,
  Loader2,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Prescription,
  getPrescriptions,
  addPrescription,
  sendPrescriptionEmailNotification,
  sendPrescriptionSMSNotification,
  getBranchFromGrade,
  BedBranch
} from '../lib/firestore-setup';
import { uploadPrescriptionToCloudinary } from '../lib/cloudinary';
import { toast } from 'sonner';

interface Student {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  email: string;
  allergies?: string[];
  medicalConditions?: string[];
  immunizations?: string[];
  height?: number;
  weight?: number;
  age?: number;
  sex?: string;
  bmi?: number;
  bloodPressure?: string;
  createdAt: any;
}

interface ParentInfo {
  name: string;
  email: string;
  phone: string;
}

interface EditFormData {
  name: string;
  grade: string;
  studentId: string;
  height: string;
  weight: string;
  age: string;
  sex: string;
  bloodPressure: string;
  allergies: string[];
  hasNoAllergies: boolean;
  currentAllergy: string;
  medicalConditions: string[];
  hasNoMedicalConditions: boolean;
  currentMedicalCondition: string;
  immunizations: string[];
  currentImmunization: string;
}

const GRADE_OPTIONS = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  '1st Year College', '2nd Year College', '3rd Year College', '4th Year College'
];

const computeBMI = (height: string, weight: string): number | null => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
};

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (bmi < 25)   return { label: 'Normal',      color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (bmi < 30)   return { label: 'Overweight',  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return             { label: 'Obese',        color: 'text-red-600',     bg: 'bg-red-50 border-red-200',      badge: 'bg-red-50 text-red-700 border-red-200' };
};

interface StudentCardProps {
  userRole: string;
  userEmail: string;
  studentIds?: string[];
}

export function StudentCard({ userRole, userEmail, studentIds = [] }: StudentCardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | 'IBED' | 'SHS' | 'College'>('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'allergies' | 'conditions' | 'healthy'>('all');
  const [bmiFilter, setBmiFilter] = useState<'all' | 'underweight' | 'normal' | 'overweight' | 'obese'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parentMap, setParentMap] = useState<Record<string, ParentInfo>>({});

  // Prescription feature states
  const [studentRxMap, setStudentRxMap] = useState<Record<string, Prescription[]>>({});
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [selectedRxStudent, setSelectedRxStudent] = useState<Student | null>(null);
  const [isIssuingRx, setIsIssuingRx] = useState(false);
  const [rxDoctorName, setRxDoctorName] = useState('Dr. Maria Santos, MD');
  const [rxLicenseNumber, setRxLicenseNumber] = useState('PRC #0145892');
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxMedications, setRxMedications] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');
  const [rxNotifyParent, setRxNotifyParent] = useState(true);
  const [rxNotifySMS, setRxNotifySMS] = useState(true);
  const [rxParentEmail, setRxParentEmail] = useState('');
  const [rxParentPhone, setRxParentPhone] = useState('');
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [rxFilePreview, setRxFilePreview] = useState<string | null>(null);
  const [submittingRx, setSubmittingRx] = useState(false);
  const [uploadingRxFile, setUploadingRxFile] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '', grade: '', studentId: '',
    height: '', weight: '', age: '', sex: '',
    allergies: [], hasNoAllergies: false, currentAllergy: '',
    medicalConditions: [], hasNoMedicalConditions: false, currentMedicalCondition: '',
    immunizations: [], currentImmunization: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      let studentsData: Student[] = [];
      if (userRole === 'student') {
        const q = query(collection(db, 'students'), where('email', '==', userEmail));
        const snapshot = await getDocs(q);
        studentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      } else if (userRole === 'parent') {
        const validStudentIds = studentIds.filter(id => id && typeof id === 'string');
        for (const sid of validStudentIds) {
          const studentDoc = await getDoc(doc(db, 'students', sid));
          if (studentDoc.exists()) {
            studentsData.push({ id: studentDoc.id, ...studentDoc.data() } as Student);
          }
        }
      } else {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        studentsData = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      }

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const parents = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.role === 'parent');

      const parentsMap: Record<string, ParentInfo> = {};
      parents.forEach((parent: any) => {
        if (parent.studentIds && Array.isArray(parent.studentIds)) {
          parent.studentIds.forEach((sid: string) => {
            parentsMap[sid] = { name: parent.name || 'Unknown', email: parent.email || 'Not provided', phone: parent.phone || 'Not provided' };
          });
        }
      });

      // Load all doctor prescriptions to map to students
      const allRx = await getPrescriptions();
      const rxMap: Record<string, Prescription[]> = {};
      allRx.forEach(p => {
        const idKey = (p.studentId || '').trim().toLowerCase();
        const docKey = (p.studentDocId || '').trim().toLowerCase();
        const nameKey = (p.studentName || '').trim().toLowerCase();
        if (idKey) {
          rxMap[idKey] = rxMap[idKey] || [];
          rxMap[idKey].push(p);
        }
        if (docKey && docKey !== idKey) {
          rxMap[docKey] = rxMap[docKey] || [];
          rxMap[docKey].push(p);
        }
        if (nameKey && nameKey !== idKey) {
          rxMap[nameKey] = rxMap[nameKey] || [];
          rxMap[nameKey].push(p);
        }
      });

      setStudents(studentsData.filter(s => s.grade !== 'Personnel'));
      setParentMap(parentsMap);
      setStudentRxMap(rxMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStudentPrescriptions = (student: Student) => {
    setSelectedRxStudent(student);
    setIsIssuingRx(false);
    setRxDiagnosis('');
    setRxMedications('');
    setRxInstructions('');
    setRxFile(null);
    setRxFilePreview(null);
    const pInfo = parentMap[student.id];
    setRxParentEmail(student.parentEmail || pInfo?.email || '');
    setRxParentPhone(student.parentPhone || (pInfo?.phone && pInfo.phone !== 'Not provided' ? pInfo.phone : '') || '');
    setIsRxModalOpen(true);
  };

  const handleRxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size cannot exceed 10MB');
      return;
    }
    setRxFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setRxFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setRxFilePreview(null);
    }
  };

  const handleIssueRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRxStudent) return;
    if (!rxDoctorName.trim()) { toast.error('Attending doctor name is required'); return; }
    if (!rxDiagnosis.trim()) { toast.error('Diagnosis is required'); return; }
    if (!rxMedications.trim()) { toast.error('Prescribed medications are required'); return; }

    try {
      setSubmittingRx(true);
      let fileUrl = '';
      let fileName = '';
      let fileType = '';

      if (rxFile) {
        setUploadingRxFile(true);
        const result = await uploadPrescriptionToCloudinary(rxFile, selectedRxStudent.studentId || selectedRxStudent.id);
        fileUrl = result.secureUrl;
        fileName = result.originalFilename;
        fileType = result.format;
        setUploadingRxFile(false);
      }

      let notifStatus: 'sent' | 'pending' | 'failed' | 'not_requested' = 'not_requested';
      let smsStatus: 'sent' | 'pending' | 'failed' | 'not_requested' = 'not_requested';
      const pInfo = parentMap[selectedRxStudent.id];
      const targetEmail = rxParentEmail.trim() || selectedRxStudent.parentEmail || (pInfo?.email && pInfo.email !== 'Not provided' ? pInfo.email : '');
      const targetPhone = rxParentPhone.trim() || selectedRxStudent.parentPhone || (pInfo?.phone && pInfo.phone !== 'Not provided' ? pInfo.phone : '');
      const parentName = selectedRxStudent.parentName || (pInfo?.name && pInfo.name !== 'Unknown' ? pInfo.name : 'Parent');

      if (rxNotifyParent && targetEmail && targetEmail.includes('@')) {
        try {
          await sendPrescriptionEmailNotification({
            parentEmail: targetEmail,
            parentName,
            studentName: selectedRxStudent.name,
            grade: selectedRxStudent.grade,
            doctorName: rxDoctorName.trim(),
            diagnosis: rxDiagnosis.trim(),
            medications: rxMedications.trim(),
            instructions: rxInstructions.trim(),
            prescriptionUrl: fileUrl || undefined,
          });
          notifStatus = 'sent';
        } catch (err) {
          console.warn('Parent email failed:', err);
          notifStatus = 'failed';
        }
      }

      if (rxNotifySMS && targetPhone) {
        try {
          await sendPrescriptionSMSNotification({
            parentPhone: targetPhone,
            parentName,
            studentName: selectedRxStudent.name,
            grade: selectedRxStudent.grade,
            doctorName: rxDoctorName.trim(),
            diagnosis: rxDiagnosis.trim(),
            medications: rxMedications.trim(),
          });
          smsStatus = 'sent';
        } catch (err) {
          console.warn('Parent SMS failed:', err);
          smsStatus = 'failed';
        }
      }

      await addPrescription({
        studentId: selectedRxStudent.studentId || selectedRxStudent.id,
        studentDocId: selectedRxStudent.id,
        studentName: selectedRxStudent.name,
        grade: selectedRxStudent.grade,
        doctorName: rxDoctorName.trim(),
        licenseNumber: rxLicenseNumber.trim() || undefined,
        diagnosis: rxDiagnosis.trim(),
        medications: rxMedications.trim(),
        instructions: rxInstructions.trim() || 'Take medication as prescribed.',
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
        notifyParent: rxNotifyParent,
        parentEmail: targetEmail || undefined,
        parentName: parentName || undefined,
        parentPhone: targetPhone || undefined,
        notificationStatus: notifStatus,
        smsStatus: smsStatus,
        issuedAt: new Date(),
        createdBy: userEmail || 'Clinic Staff',
      });

      const sentSummary = [];
      if (notifStatus === 'sent') sentSummary.push('Email');
      if (smsStatus === 'sent') sentSummary.push('SMS');
      if (sentSummary.length > 0) {
        toast.success(`Prescription issued! Alert sent via ${sentSummary.join(' & ')} 🩺`);
      } else {
        toast.success('Doctor prescription issued successfully! 🩺');
      }
      setIsIssuingRx(false);
      setRxDiagnosis('');
      setRxMedications('');
      setRxInstructions('');
      setRxFile(null);
      setRxFilePreview(null);
      loadData();
    } catch (err: any) {
      console.error('Error issuing prescription:', err);
      toast.error(err.message || 'Failed to issue prescription');
    } finally {
      setSubmittingRx(false);
      setUploadingRxFile(false);
    }
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    const allergies = student.allergies || [];
    const medicalConditions = student.medicalConditions || [];
    const immunizations = student.immunizations || [];
    setEditForm({
      name: student.name,
      grade: student.grade,
      studentId: student.studentId,
      height: student.height ? String(student.height) : '',
      weight: student.weight ? String(student.weight) : '',
      age: student.age ? String(student.age) : '',
      sex: student.sex || '',
      bloodPressure: student.bloodPressure || '',
      allergies,
      hasNoAllergies: allergies.length === 0,
      currentAllergy: '',
      medicalConditions,
      hasNoMedicalConditions: medicalConditions.length === 0,
      currentMedicalCondition: '',
      immunizations,
      currentImmunization: ''
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingStudent) return;
    if (!editForm.name.trim() || !editForm.grade || !editForm.studentId.trim()) {
      toast.error('Name, grade, and student ID are required');
      return;
    }
    setSaving(true);
    try {
      const bmi = computeBMI(editForm.height, editForm.weight);
      await updateDoc(doc(db, 'students', editingStudent.id), {
        name: editForm.name.trim(),
        grade: editForm.grade,
        studentId: editForm.studentId.trim(),
        height: editForm.height ? parseFloat(editForm.height) : null,
        weight: editForm.weight ? parseFloat(editForm.weight) : null,
        age: editForm.age ? parseInt(editForm.age) : null,
        sex: editForm.sex || '',
        bloodPressure: editForm.bloodPressure.trim() || null,
        bmi,
        allergies: editForm.allergies,
        medicalConditions: editForm.medicalConditions,
        immunizations: editForm.immunizations
      });

      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', editingStudent.email)));
      usersSnapshot.docs.forEach(async (userDoc) => {
        await updateDoc(doc(db, 'users', userDoc.id), {
          name: editForm.name.trim(),
          grade: editForm.grade,
          studentId: editForm.studentId.trim()
        });
      });

      toast.success('Student record updated successfully');
      setIsEditOpen(false);
      setEditingStudent(null);
      loadData();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to update student record');
    } finally {
      setSaving(false);
    }
  };

  const branchCounts = useMemo(() => {
    return {
      all: students.length,
      IBED: students.filter(s => getBranchFromGrade(s.grade) === 'IBED').length,
      SHS: students.filter(s => getBranchFromGrade(s.grade) === 'SHS').length,
      College: students.filter(s => getBranchFromGrade(s.grade) === 'College').length,
    };
  }, [students]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.grade && s.grade !== 'Personnel') {
        if (branchFilter === 'all' || getBranchFromGrade(s.grade) === branchFilter) {
          set.add(s.grade);
        }
      }
    });
    return Array.from(set).sort();
  }, [students, branchFilter]);

  const hasActiveFilters = () => {
    return (
      searchTerm !== '' ||
      branchFilter !== 'all' ||
      gradeFilter !== 'all' ||
      healthFilter !== 'all' ||
      bmiFilter !== 'all'
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (branchFilter !== 'all') count++;
    if (gradeFilter !== 'all') count++;
    if (healthFilter !== 'all') count++;
    if (bmiFilter !== 'all') count++;
    return count;
  }, [branchFilter, gradeFilter, healthFilter, bmiFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setBranchFilter('all');
    setGradeFilter('all');
    setHealthFilter('all');
    setBmiFilter('all');
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Branch filter
      if (branchFilter !== 'all') {
        const branch = getBranchFromGrade(s.grade);
        if (branch !== branchFilter) return false;
      }

      // Grade filter
      if (gradeFilter !== 'all') {
        if (s.grade !== gradeFilter) return false;
      }

      // Health profile filter
      if (healthFilter === 'allergies') {
        if (!s.allergies || s.allergies.length === 0) return false;
      } else if (healthFilter === 'conditions') {
        if (!s.medicalConditions || s.medicalConditions.length === 0) return false;
      } else if (healthFilter === 'healthy') {
        const hasAllergies = s.allergies && s.allergies.length > 0;
        const hasConditions = s.medicalConditions && s.medicalConditions.length > 0;
        if (hasAllergies || hasConditions) return false;
      }

      // BMI classification filter
      if (bmiFilter !== 'all') {
        const bmiValue = s.bmi ?? computeBMI(String(s.height || ''), String(s.weight || ''));
        if (!bmiValue) return false;
        const cat = getBMICategory(bmiValue).label.toLowerCase();
        if (cat !== bmiFilter.toLowerCase()) return false;
      }

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesId = (s.studentId || '').toLowerCase().includes(q);
        const matchesGrade = (s.grade || '').toLowerCase().includes(q);
        const matchesEmail = (s.email || '').toLowerCase().includes(q);
        const matchesAllergies = (s.allergies || []).some(a => a.toLowerCase().includes(q));
        const matchesConditions = (s.medicalConditions || []).some(c => c.toLowerCase().includes(q));
        if (!matchesName && !matchesId && !matchesGrade && !matchesEmail && !matchesAllergies && !matchesConditions) {
          return false;
        }
      }

      return true;
    });
  }, [students, branchFilter, gradeFilter, healthFilter, bmiFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-slate-900">
          {userRole === 'student' ? 'My Student Card' : userRole === 'parent' ? "My Children's Health Cards" : 'Student Cards'}
        </h1>
        <p className="mt-2 text-slate-600">
          {userRole === 'student' 
            ? 'View your complete student information and medical details' 
            : userRole === 'parent' 
              ? 'View complete student information and medical details for your children'
              : 'View complete student information and medical details'}
        </p>
      </div>

      {/* Department Branch Tabs (similar to Visit History) */}
      {userRole !== 'student' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm space-y-2">
          <div className="flex items-center justify-between px-3 pt-1">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-ndkc-green" />
              Filter by Department:
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredStudents.length} of {students.length} students
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'all', label: 'All Departments', icon: Layers, color: 'text-slate-700' },
              { id: 'IBED', label: 'IBED', icon: BookOpen, color: 'text-blue-600' },
              { id: 'SHS', label: 'Senior High School (SHS)', icon: GraduationCap, color: 'text-violet-600' },
              { id: 'College', label: 'College', icon: Building2, color: 'text-emerald-600' },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = branchFilter === tab.id;
              const count = branchCounts[tab.id as keyof typeof branchCounts];
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setBranchFilter(tab.id as any);
                    setGradeFilter('all');
                  }}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-ndkc-green to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : tab.color}`} />
                    <span>{tab.label.split(' ')[0]}</span>
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
      )}

      {/* Search and Filters Bar */}
      {userRole !== 'student' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by student name, ID, grade, allergies, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-slate-200 bg-white shadow-sm focus:border-ndkc-green"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant={showAdvancedFilters || activeFilterCount > 0 ? 'default' : 'outline'}
            className={`h-12 px-5 gap-2 ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'bg-ndkc-green hover:bg-ndkc-green/90 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1 bg-white text-ndkc-green hover:bg-white text-xs px-1.5 py-0.2">
                {activeFilterCount}
              </Badge>
            )}
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>

          {hasActiveFilters() && (
            <Button
              onClick={resetFilters}
              variant="outline"
              className="h-12 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              title="Reset all filters"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {userRole !== 'student' && showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                    <Filter className="h-4 w-4 text-ndkc-green" />
                    Advanced Student Filters
                  </CardTitle>
                  {hasActiveFilters() && (
                    <Button
                      onClick={resetFilters}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 h-8 text-xs"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Reset All Filters
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Grade Level Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Grade Level</Label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className="bg-white h-10">
                        <SelectValue placeholder="All Grades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {availableGrades.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Health Conditions / Allergies Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Health Profile</Label>
                    <Select value={healthFilter} onValueChange={(v: any) => setHealthFilter(v)}>
                      <SelectTrigger className="bg-white h-10">
                        <SelectValue placeholder="All Health Profiles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Health Profiles</SelectItem>
                        <SelectItem value="allergies">Has Known Allergies</SelectItem>
                        <SelectItem value="conditions">Has Medical Conditions</SelectItem>
                        <SelectItem value="healthy">No Known Conditions / Allergies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* BMI Status Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">BMI Classification</Label>
                    <Select value={bmiFilter} onValueChange={(v: any) => setBmiFilter(v)}>
                      <SelectTrigger className="bg-white h-10">
                        <SelectValue placeholder="All BMIs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All BMI Classifications</SelectItem>
                        <SelectItem value="underweight">Underweight (&lt; 18.5)</SelectItem>
                        <SelectItem value="normal">Normal Weight (18.5 - 24.9)</SelectItem>
                        <SelectItem value="overweight">Overweight (25 - 29.9)</SelectItem>
                        <SelectItem value="obese">Obese (30+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Filter Pills */}
                {hasActiveFilters() && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-100">
                    <span className="text-xs font-medium text-slate-500 mr-1">Active:</span>
                    {branchFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-slate-800 border-slate-300 gap-1 text-xs py-0.5">
                        Dept: {branchFilter}
                        <button onClick={() => setBranchFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {gradeFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-slate-800 border-slate-300 gap-1 text-xs py-0.5">
                        Grade: {gradeFilter}
                        <button onClick={() => setGradeFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {healthFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-slate-800 border-slate-300 gap-1 text-xs py-0.5">
                        Health: {healthFilter === 'allergies' ? 'Allergies' : healthFilter === 'conditions' ? 'Conditions' : 'No Conditions'}
                        <button onClick={() => setHealthFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {bmiFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-slate-800 border-slate-300 gap-1 text-xs py-0.5">
                        BMI: {bmiFilter}
                        <button onClick={() => setBmiFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge variant="outline" className="bg-white text-slate-800 border-slate-300 gap-1 text-xs py-0.5">
                        Search: "{searchTerm}"
                        <button onClick={() => setSearchTerm('')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="border-slate-200 bg-white shadow-sm animate-pulse">
              <CardContent className="p-6"><div className="h-40 bg-slate-100 rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">{searchTerm ? 'No students found matching your search' : 'No students registered yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const bmiValue = student.bmi ?? computeBMI(String(student.height || ''), String(student.weight || ''));
            const bmiCat = bmiValue ? getBMICategory(bmiValue) : null;

            return (
              <Card key={student.id} className="border-slate-200 bg-white shadow-sm hover-lift transition-all duration-200">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-ndkc-green/5 to-emerald-50/30 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-slate-900">{student.name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">ID: {student.studentId}</p>
                      </div>
                    </div>
                    {(userRole === 'admin' || userRole === 'nurse') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(student)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-ndkc-green hover:bg-emerald-50 rounded-lg"
                        title="Edit student"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">

                  {/* BMI & Vitals — top of card content */}
                  {(bmiValue || student.height || student.weight || student.bloodPressure) && (
                    <div className={`rounded-xl border p-3 ${bmiCat ? bmiCat.bg : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className={`h-4 w-4 ${bmiCat ? bmiCat.color : 'text-slate-500'}`} />
                        <p className="text-xs font-semibold text-slate-700">Health & Physical Information</p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {bmiValue && (
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-2xl font-bold ${bmiCat ? bmiCat.color : 'text-slate-700'}`}>{bmiValue}</span>
                            {bmiCat && <Badge variant="outline" className={`text-xs ${bmiCat.badge}`}>{bmiCat.label}</Badge>}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                          {student.height && <span>Height: <strong>{student.height} cm</strong></span>}
                          {student.weight && <span>Weight: <strong>{student.weight} kg</strong></span>}
                          {student.age   && <span>Age: <strong>{student.age} yrs</strong></span>}
                          {student.sex   && <span>Sex: <strong>{student.sex}</strong></span>}
                          {student.bloodPressure && (
                            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              BP: <strong>{student.bloodPressure}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grade */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Grade / Year Level</p>
                      <p className="text-sm font-medium text-slate-900">{student.grade}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Student Email</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{student.email}</p>
                    </div>
                  </div>

                  {/* Parent/Guardian */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">Parent / Guardian</p>
                      </div>
                    </div>
                    {parentMap[student.id] ? (
                      <div className="ml-12 space-y-2">
                        <div><p className="text-xs text-slate-500">Name</p><p className="text-sm font-medium text-slate-900">{parentMap[student.id].name}</p></div>
                        <div><p className="text-xs text-slate-500">Email</p><p className="text-sm font-medium text-slate-900 truncate">{parentMap[student.id].email}</p></div>
                        <div><p className="text-xs text-slate-500">Contact Number</p><p className="text-sm font-medium text-slate-900">{parentMap[student.id].phone}</p></div>
                      </div>
                    ) : (
                      <div className="ml-12"><p className="text-sm text-slate-400 italic">No parent linked</p></div>
                    )}
                  </div>

                  {/* Allergies */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-700">Allergies</p>
                    </div>
                    {student.allergies && student.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {student.allergies.map((a, i) => (
                          <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">{a}</Badge>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-500 italic">No known allergies</p>}
                  </div>

                  {/* Medical Conditions */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-start gap-2 mb-2">
                      <Heart className="h-4 w-4 text-rose-500 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-700">Medical Conditions</p>
                    </div>
                    {student.medicalConditions && student.medicalConditions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {student.medicalConditions.map((c, i) => (
                          <Badge key={i} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">{c}</Badge>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-500 italic">No known medical conditions</p>}
                  </div>

                  {/* Immunization Records */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-start gap-2 mb-2">
                      <Syringe className="h-4 w-4 text-teal-600 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-700">Immunization Records</p>
                    </div>
                    {student.immunizations && student.immunizations.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {student.immunizations.map((v, i) => (
                          <Badge key={i} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">{v}</Badge>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-500 italic">No immunization records</p>}
                  </div>

                  {/* Doctor's Prescriptions Action Button */}
                  <div className="pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openStudentPrescriptions(student)}
                      className="w-full h-9 text-xs font-semibold text-emerald-800 bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 flex items-center justify-center gap-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                      Doctor's Prescriptions ({studentRxMap[(student.studentId || '').toLowerCase()]?.length || studentRxMap[(student.id || '').toLowerCase()]?.length || 0})
                    </Button>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditingStudent(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Record</DialogTitle>
          </DialogHeader>

          {editingStudent && (
            <div className="space-y-6 py-4">

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={editingStudent.email} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input value={editForm.studentId} onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })} placeholder="e.g., 2024001" />
                </div>
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <select
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">Select grade</option>
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* BMI Section */}
              <div className="space-y-3">
                <Label>BMI Information</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Height (cm)</label>
                    <Input type="number" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} placeholder="e.g., 165" min="1" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Weight (kg)</label>
                    <Input type="number" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} placeholder="e.g., 60" min="1" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Age</label>
                    <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} placeholder="e.g., 17" min="1" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600">Sex</label>
                    <select
                      value={editForm.sex}
                      onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="">Select sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-slate-600 flex items-center gap-1">
                      Blood Pressure <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <Input
                      type="text"
                      value={editForm.bloodPressure}
                      onChange={(e) => setEditForm({ ...editForm, bloodPressure: e.target.value })}
                      placeholder="e.g., 120/80 mmHg"
                    />
                  </div>
                </div>
                {computeBMI(editForm.height, editForm.weight) !== null && (() => {
                  const bmi = computeBMI(editForm.height, editForm.weight)!;
                  const cat = getBMICategory(bmi);
                  return (
                    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2 ${cat.bg}`}>
                      <span className="text-xs text-slate-600">Computed BMI:</span>
                      <span className={`text-lg font-bold ${cat.color}`}>{bmi}</span>
                      <span className={`text-xs font-semibold ${cat.color}`}>— {cat.label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Allergies */}
              <div className="space-y-3">
                <Label>Allergies</Label>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox id="sc-noAllergies" checked={editForm.hasNoAllergies} onCheckedChange={(c) => setEditForm({ ...editForm, hasNoAllergies: c as boolean, allergies: c ? [] : editForm.allergies })} />
                  <label htmlFor="sc-noAllergies" className="text-sm cursor-pointer text-slate-700">No known allergies</label>
                </div>
                {!editForm.hasNoAllergies && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={editForm.currentAllergy} onChange={(e) => setEditForm({ ...editForm, currentAllergy: e.target.value })} placeholder="e.g., Peanuts, Penicillin"
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (editForm.currentAllergy.trim()) setEditForm({ ...editForm, allergies: [...editForm.allergies, editForm.currentAllergy.trim()], currentAllergy: '' }); } }} />
                      <Button type="button" variant="outline" size="sm" onClick={() => { if (editForm.currentAllergy.trim()) setEditForm({ ...editForm, allergies: [...editForm.allergies, editForm.currentAllergy.trim()], currentAllergy: '' }); }} className="whitespace-nowrap">
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    {editForm.allergies.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-sm">{i + 1}. {a}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditForm({ ...editForm, allergies: editForm.allergies.filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medical Conditions */}
              <div className="space-y-3">
                <Label>Medical Conditions</Label>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox id="sc-noMedical" checked={editForm.hasNoMedicalConditions} onCheckedChange={(c) => setEditForm({ ...editForm, hasNoMedicalConditions: c as boolean, medicalConditions: c ? [] : editForm.medicalConditions })} />
                  <label htmlFor="sc-noMedical" className="text-sm cursor-pointer text-slate-700">No known medical conditions</label>
                </div>
                {!editForm.hasNoMedicalConditions && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={editForm.currentMedicalCondition} onChange={(e) => setEditForm({ ...editForm, currentMedicalCondition: e.target.value })} placeholder="e.g., Asthma, Diabetes"
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (editForm.currentMedicalCondition.trim()) setEditForm({ ...editForm, medicalConditions: [...editForm.medicalConditions, editForm.currentMedicalCondition.trim()], currentMedicalCondition: '' }); } }} />
                      <Button type="button" variant="outline" size="sm" onClick={() => { if (editForm.currentMedicalCondition.trim()) setEditForm({ ...editForm, medicalConditions: [...editForm.medicalConditions, editForm.currentMedicalCondition.trim()], currentMedicalCondition: '' }); }} className="whitespace-nowrap">
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    {editForm.medicalConditions.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-sm">{i + 1}. {c}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditForm({ ...editForm, medicalConditions: editForm.medicalConditions.filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Immunization Records */}
              <div className="space-y-3">
                <Label>Immunization Records</Label>
                <div className="flex gap-2">
                  <Input value={editForm.currentImmunization} onChange={(e) => setEditForm({ ...editForm, currentImmunization: e.target.value })} placeholder="e.g., BCG, Hepatitis B, MMR"
                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (editForm.currentImmunization.trim()) setEditForm({ ...editForm, immunizations: [...editForm.immunizations, editForm.currentImmunization.trim()], currentImmunization: '' }); } }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (editForm.currentImmunization.trim()) setEditForm({ ...editForm, immunizations: [...editForm.immunizations, editForm.currentImmunization.trim()], currentImmunization: '' }); }} className="whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {editForm.immunizations.map((v, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm">{i + 1}. {v}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditForm({ ...editForm, immunizations: editForm.immunizations.filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-ndkc-green to-emerald-600">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={() => { setIsEditOpen(false); setEditingStudent(null); }} variant="outline">Cancel</Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Prescriptions Dialog */}
      <Dialog open={isRxModalOpen} onOpenChange={(open) => { if (!open) { setIsRxModalOpen(false); setSelectedRxStudent(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Doctor's Prescriptions for {selectedRxStudent?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedRxStudent && (
            <div className="space-y-4 pt-2">
              {/* Student Context Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Grade: <strong className="text-slate-800">{selectedRxStudent.grade}</strong> • ID: <strong className="text-slate-800">{selectedRxStudent.studentId}</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Parent Email: <span className="text-emerald-700 font-medium">{selectedRxStudent.parentEmail || parentMap[selectedRxStudent.id]?.email || 'Not provided'}</span>
                  </p>
                </div>

                {(userRole === 'admin' || userRole === 'nurse') && (
                  <Button
                    size="sm"
                    onClick={() => setIsIssuingRx(!isIssuingRx)}
                    className="h-8 text-xs bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-sm text-white"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {isIssuingRx ? 'View Prescriptions' : 'Issue New Prescription'}
                  </Button>
                )}
              </div>

              {/* Issue New Prescription Form */}
              {isIssuingRx ? (
                <form onSubmit={handleIssueRxSubmit} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-emerald-600" />
                    Issue New Doctor's Prescription
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Attending Doctor *</Label>
                      <Input
                        required
                        value={rxDoctorName}
                        onChange={(e) => setRxDoctorName(e.target.value)}
                        placeholder="Dr. Maria Santos, MD"
                        className="mt-1 h-9 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">PRC / License No.</Label>
                      <Input
                        value={rxLicenseNumber}
                        onChange={(e) => setRxLicenseNumber(e.target.value)}
                        placeholder="PRC #0145892"
                        className="mt-1 h-9 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Diagnosis / Chief Complaint *</Label>
                    <Input
                      required
                      value={rxDiagnosis}
                      onChange={(e) => setRxDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Pharyngitis"
                      className="mt-1 h-9 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Prescribed Medications & Dosage *</Label>
                    <textarea
                      required
                      rows={2}
                      value={rxMedications}
                      onChange={(e) => setRxMedications(e.target.value)}
                      placeholder="e.g. Amoxicillin 500mg, 1 cap TID x 7 days"
                      className="mt-1 w-full p-2 text-xs rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-ndkc-green"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Doctor's Advice & Intake Instructions</Label>
                    <textarea
                      rows={2}
                      value={rxInstructions}
                      onChange={(e) => setRxInstructions(e.target.value)}
                      placeholder="e.g. Take after meals. Increase fluid intake."
                      className="mt-1 w-full p-2 text-xs rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-ndkc-green"
                    />
                  </div>

                  {/* Cloudinary File Upload */}
                  <div>
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Attach Physical Rx Slip / Scan / PDF</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, or PDF</span>
                    </Label>
                    <Input
                      type="file"
                      onChange={handleRxFileChange}
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="mt-1 h-9 text-xs bg-white cursor-pointer"
                    />
                    {rxFilePreview && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={rxFilePreview} alt="Rx Preview" className="h-12 w-12 rounded-lg object-cover border" />
                        <span className="text-xs text-slate-500">{rxFile?.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Editable Parent Contact Targets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Parent Email</Label>
                      <Input
                        type="email"
                        value={rxParentEmail}
                        onChange={(e) => setRxParentEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Parent Phone (SMS)</Label>
                      <Input
                        type="tel"
                        value={rxParentPhone}
                        onChange={(e) => setRxParentPhone(e.target.value)}
                        placeholder="09123456789"
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Parent Notification Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Email Notification</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                          {rxParentEmail ? rxParentEmail : 'Enter email above'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={rxNotifyParent}
                        onChange={(e) => setRxNotifyParent(e.target.checked)}
                        className="h-4 w-4 rounded text-ndkc-green cursor-pointer"
                      />
                    </div>

                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">SMS Notification</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                          {rxParentPhone ? rxParentPhone : 'Enter phone above'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={rxNotifySMS}
                        onChange={(e) => setRxNotifySMS(e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsIssuingRx(false)}
                      disabled={submittingRx}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingRx}
                      className="text-xs h-8 bg-ndkc-green text-white hover:bg-emerald-700"
                    >
                      {submittingRx ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          {uploadingRxFile ? 'Uploading...' : 'Saving...'}
                        </>
                      ) : (
                        'Save & Issue Rx'
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Prescriptions List */
                <div className="space-y-3">
                  {(() => {
                    const studentPrescriptions = studentRxMap[(selectedRxStudent.studentId || '').toLowerCase()] ||
                      studentRxMap[(selectedRxStudent.id || '').toLowerCase()] ||
                      studentRxMap[(selectedRxStudent.name || '').toLowerCase()] || [];

                    if (studentPrescriptions.length === 0) {
                      return (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                          <Stethoscope className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">No prescriptions recorded yet</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Click "Issue New Prescription" above to record a prescription from the attending doctor.
                          </p>
                        </div>
                      );
                    }

                    return studentPrescriptions.map(rx => {
                      const dObj = rx.issuedAt?.toDate ? rx.issuedAt.toDate() : new Date(rx.issuedAt || rx.createdAt || 0);

                      return (
                        <div key={rx.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-xs transition-all space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{rx.doctorName}</p>
                              <p className="text-[11px] text-slate-500">{rx.licenseNumber || 'Clinic Physician'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-600 font-medium">
                                {dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <p className="text-[10px] text-slate-400">
                                {dObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Diagnosis:</span>
                            <p className="text-xs font-semibold text-slate-800">{rx.diagnosis}</p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Rx Medications:</span>
                            <p className="font-medium whitespace-pre-line">{rx.medications}</p>
                          </div>

                          {rx.instructions && (
                            <p className="text-xs text-slate-600 italic">Advice: {rx.instructions}</p>
                          )}

                          {/* Visual Rx Slip display */}
                          {rx.fileUrl && (
                            <div className="pt-1">
                              {rx.fileType === 'pdf' ? (
                                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                                    <FileCheck className="h-4 w-4" />
                                    <span>{rx.fileName || 'Prescription.pdf'}</span>
                                  </div>
                                  <a
                                    href={rx.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Open PDF
                                  </a>
                                </div>
                              ) : (
                                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-h-52 flex justify-center p-1">
                                  <img
                                    src={rx.fileUrl}
                                    alt="Prescription Slip"
                                    className="max-h-52 w-auto object-contain rounded hover:scale-101 transition-transform cursor-pointer"
                                    onClick={() => window.open(rx.fileUrl, '_blank')}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                            {rx.fileUrl ? (
                              <a
                                href={rx.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                              >
                                <FileCheck className="h-3.5 w-3.5" />
                                Open Full Rx Slip
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No document attached</span>
                            )}

                            {rx.notificationStatus === 'sent' && (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0 border-0">
                                Parent Notified
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
