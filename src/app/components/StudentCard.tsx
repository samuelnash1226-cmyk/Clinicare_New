import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Search, User, GraduationCap, Mail, AlertCircle, Heart, Users, Pencil, Syringe, Plus, X, Activity } from 'lucide-react';
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

export function StudentCard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [parentMap, setParentMap] = useState<Record<string, ParentInfo>>({});

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
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];

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

      setStudents(studentsData);
      setParentMap(parentsMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-slate-900">Student Cards</h1>
        <p className="mt-2 text-slate-600">View complete student information and medical details</p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, student ID, grade, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-2 focus:border-ndkc-green"
            />
          </div>
        </CardContent>
      </Card>

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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(student)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-ndkc-green hover:bg-emerald-50 rounded-lg"
                      title="Edit student"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">

                  {/* BMI — top of card content */}
                  {(bmiValue || student.height || student.weight) && (
                    <div className={`rounded-xl border p-3 ${bmiCat ? bmiCat.bg : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className={`h-4 w-4 ${bmiCat ? bmiCat.color : 'text-slate-500'}`} />
                        <p className="text-xs font-semibold text-slate-700">BMI Information</p>
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
    </div>
  );
}
