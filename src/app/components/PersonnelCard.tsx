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
  Mail,
  AlertCircle,
  Heart,
  Pencil,
  Syringe,
  Plus,
  X,
  Activity,
  Briefcase,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Personnel {
  id: string;
  studentId: string; // employee ID is stored here
  name: string;
  grade: string; // always 'Personnel'
  email: string;
  personnelType?: 'teaching' | 'non-teaching' | string;
  departmentBranch?: 'IBED' | 'SHS' | 'College' | string;
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

interface EditFormData {
  name: string;
  studentId: string;
  personnelType: string;
  departmentBranch: string;
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

interface PersonnelCardProps {
  userRole: string;
  userEmail: string;
}

export function PersonnelCard({ userRole, userEmail }: PersonnelCardProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'teaching' | 'non-teaching'>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | 'IBED' | 'SHS' | 'College'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'allergies' | 'conditions' | 'healthy'>('all');
  const [bmiFilter, setBmiFilter] = useState<'all' | 'underweight' | 'normal' | 'overweight' | 'obese'>('all');
  const [bpFilter, setBpFilter] = useState<'all' | 'recorded' | 'elevated' | 'none'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '', studentId: '',
    personnelType: 'teaching',
    departmentBranch: 'College',
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
      let personnelData: Personnel[] = [];
      
      const [studentsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'students'), where('grade', '==', 'Personnel'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'personnel')))
      ]);

      // Create a map from users collection for personnelType & departmentBranch
      const userMetaMap: Record<string, { personnelType?: string; departmentBranch?: string }> = {};
      usersSnap.docs.forEach(d => {
        const u = d.data();
        const emailKey = (u.email || '').trim().toLowerCase();
        const empIdKey = (u.studentId || '').trim().toLowerCase();
        const meta = {
          personnelType: u.personnelType,
          departmentBranch: u.departmentBranch
        };
        if (emailKey) userMetaMap[emailKey] = meta;
        if (empIdKey) userMetaMap[empIdKey] = meta;
      });

      personnelData = studentsSnap.docs.map(doc => {
        const data = doc.data();
        const emailKey = (data.email || '').trim().toLowerCase();
        const empIdKey = (data.studentId || '').trim().toLowerCase();
        const meta = userMetaMap[emailKey] || userMetaMap[empIdKey] || {};

        return {
          id: doc.id,
          ...data,
          personnelType: data.personnelType || meta.personnelType || undefined,
          departmentBranch: data.departmentBranch || meta.departmentBranch || undefined,
        } as Personnel;
      });

      if (userRole === 'personnel') {
        const normUserEmail = (userEmail || '').trim().toLowerCase();
        personnelData = personnelData.filter(p => (p.email || '').trim().toLowerCase() === normUserEmail);
      }

      setPersonnel(personnelData);
    } catch (error) {
      console.error('Error loading personnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p: Personnel) => {
    setEditingPersonnel(p);
    const allergies = p.allergies || [];
    const medicalConditions = p.medicalConditions || [];
    const immunizations = p.immunizations || [];
    setEditForm({
      name: p.name,
      studentId: p.studentId,
      personnelType: p.personnelType || 'teaching',
      departmentBranch: p.departmentBranch || 'College',
      height: p.height ? String(p.height) : '',
      weight: p.weight ? String(p.weight) : '',
      age: p.age ? String(p.age) : '',
      sex: p.sex || '',
      bloodPressure: p.bloodPressure || '',
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
    if (!editingPersonnel) return;
    if (!editForm.name.trim() || !editForm.studentId.trim()) {
      toast.error('Name and Employee ID are required');
      return;
    }
    setSaving(true);
    try {
      const bmi = computeBMI(editForm.height, editForm.weight);
      await updateDoc(doc(db, 'students', editingPersonnel.id), {
        name: editForm.name.trim(),
        grade: 'Personnel',
        studentId: editForm.studentId.trim(),
        personnelType: editForm.personnelType,
        departmentBranch: editForm.departmentBranch,
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

      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', editingPersonnel.email)));
      usersSnapshot.docs.forEach(async (userDoc) => {
        await updateDoc(doc(db, 'users', userDoc.id), {
          name: editForm.name.trim(),
          grade: 'Personnel',
          studentId: editForm.studentId.trim(),
          personnelType: editForm.personnelType,
          departmentBranch: editForm.departmentBranch,
        });
      });

      toast.success('Personnel record updated successfully');
      setIsEditOpen(false);
      setEditingPersonnel(null);
      loadData();
    } catch (error) {
      console.error('Error saving personnel:', error);
      toast.error('Failed to update personnel record');
    } finally {
      setSaving(false);
    }
  };

  const hasActiveFilters = () => {
    return (
      searchTerm !== '' ||
      typeFilter !== 'all' ||
      branchFilter !== 'all' ||
      healthFilter !== 'all' ||
      bmiFilter !== 'all' ||
      bpFilter !== 'all'
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (branchFilter !== 'all') count++;
    if (healthFilter !== 'all') count++;
    if (bmiFilter !== 'all') count++;
    if (bpFilter !== 'all') count++;
    return count;
  }, [typeFilter, branchFilter, healthFilter, bmiFilter, bpFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setBranchFilter('all');
    setHealthFilter('all');
    setBmiFilter('all');
    setBpFilter('all');
  };

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      // Type filter (Teaching / Non-Teaching)
      if (typeFilter !== 'all') {
        const rawType = (p.personnelType || '').toLowerCase().trim();
        const normalizedType = rawType.includes('non') ? 'non-teaching' : (rawType.includes('teach') ? 'teaching' : 'unassigned');
        
        if (typeFilter === 'non-teaching' && normalizedType !== 'non-teaching') return false;
        if (typeFilter === 'teaching' && normalizedType !== 'teaching') return false;
      }

      // Department Branch filter (IBED / SHS / College)
      if (branchFilter !== 'all') {
        const rawBranch = (p.departmentBranch || '').toUpperCase().trim();
        if (rawBranch !== branchFilter.toUpperCase()) return false;
      }

      // Health profile filter
      if (healthFilter === 'allergies') {
        if (!p.allergies || p.allergies.length === 0) return false;
      } else if (healthFilter === 'conditions') {
        if (!p.medicalConditions || p.medicalConditions.length === 0) return false;
      } else if (healthFilter === 'healthy') {
        const hasAllergies = p.allergies && p.allergies.length > 0;
        const hasConditions = p.medicalConditions && p.medicalConditions.length > 0;
        if (hasAllergies || hasConditions) return false;
      }

      // BMI classification filter
      if (bmiFilter !== 'all') {
        const bmiValue = p.bmi ?? computeBMI(String(p.height || ''), String(p.weight || ''));
        if (!bmiValue) return false;
        const cat = getBMICategory(bmiValue).label.toLowerCase();
        if (cat !== bmiFilter.toLowerCase()) return false;
      }

      // Blood pressure filter
      if (bpFilter === 'recorded') {
        if (!p.bloodPressure || !p.bloodPressure.trim()) return false;
      } else if (bpFilter === 'none') {
        if (p.bloodPressure && p.bloodPressure.trim()) return false;
      } else if (bpFilter === 'elevated') {
        if (!p.bloodPressure) return false;
        const parts = p.bloodPressure.split('/');
        const sys = parseInt(parts[0]);
        const dia = parseInt(parts[1]);
        if (isNaN(sys) || isNaN(dia) || (sys < 130 && dia < 80)) return false;
      }

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesId = (p.studentId || '').toLowerCase().includes(q);
        const matchesEmail = (p.email || '').toLowerCase().includes(q);
        const matchesAllergies = (p.allergies || []).some(a => a.toLowerCase().includes(q));
        const matchesConditions = (p.medicalConditions || []).some(c => c.toLowerCase().includes(q));
        if (!matchesName && !matchesId && !matchesEmail && !matchesAllergies && !matchesConditions) {
          return false;
        }
      }

      return true;
    });
  }, [personnel, typeFilter, branchFilter, healthFilter, bmiFilter, bpFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info & Filter Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-slate-900">Personnel Cards</h1>
          <p className="mt-1 text-slate-600">
            View and manage medical information and health records for school personnel
          </p>
        </div>
        {userRole !== 'personnel' && (
          <Badge variant="outline" className="w-fit bg-rose-50 text-rose-800 border-rose-200 font-semibold px-3 py-1">
            <Briefcase className="h-3.5 w-3.5 mr-1 text-rose-600" />
            Showing {filteredPersonnel.length} of {personnel.length} Personnel
          </Badge>
        )}
      </div>

      {/* Search and Filters Bar */}
      {userRole !== 'personnel' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, employee ID, email, allergies, or conditions..."
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
        {userRole !== 'personnel' && showAdvancedFilters && (
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
                    Advanced Personnel Filters
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
                {/* Category & Branch Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-emerald-100">
                  {/* Teaching vs Non-Teaching Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-rose-600" />
                      Personnel Classification
                    </Label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ndkc-green"
                    >
                      <option value="all">All Classifications (Teaching & Non-Teaching)</option>
                      <option value="teaching">Teaching Personnel (Faculty / Teachers)</option>
                      <option value="non-teaching">Non-Teaching Personnel (Staff / Admin)</option>
                    </select>
                  </div>

                  {/* Branch Department Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      Department / Campus Branch
                    </Label>
                    <select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ndkc-green"
                    >
                      <option value="all">All Departments (IBED, SHS, College)</option>
                      <option value="IBED">IBED (Integrated Basic Education)</option>
                      <option value="SHS">SHS (Senior High School)</option>
                      <option value="College">College / Higher Education</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Health Profile Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Health Profile</Label>
                    <select
                      value={healthFilter}
                      onChange={(e) => setHealthFilter(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ndkc-green"
                    >
                      <option value="all">All Health Profiles</option>
                      <option value="allergies">Has Known Allergies</option>
                      <option value="conditions">Has Medical Conditions</option>
                      <option value="healthy">No Known Conditions / Allergies</option>
                    </select>
                  </div>

                  {/* BMI Status Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">BMI Classification</Label>
                    <select
                      value={bmiFilter}
                      onChange={(e) => setBmiFilter(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ndkc-green"
                    >
                      <option value="all">All BMI Classifications</option>
                      <option value="underweight">Underweight (&lt; 18.5)</option>
                      <option value="normal">Normal Weight (18.5 - 24.9)</option>
                      <option value="overweight">Overweight (25 - 29.9)</option>
                      <option value="obese">Obese (30+)</option>
                    </select>
                  </div>

                  {/* Blood Pressure Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Blood Pressure</Label>
                    <select
                      value={bpFilter}
                      onChange={(e) => setBpFilter(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ndkc-green"
                    >
                      <option value="all">All</option>
                      <option value="recorded">Has Recorded BP</option>
                      <option value="elevated">Elevated (130/80+)</option>
                      <option value="none">No BP Recorded</option>
                    </select>
                  </div>
                </div>

                {/* Active Filter Pills */}
                {hasActiveFilters() && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-100">
                    <span className="text-xs font-medium text-slate-500 mr-1">Active:</span>
                    {typeFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-rose-800 border-rose-300 gap-1 text-xs py-0.5 font-medium">
                        Type: {typeFilter === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                        <button onClick={() => setTypeFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {branchFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 gap-1 text-xs py-0.5 font-medium">
                        Branch: {branchFilter}
                        <button onClick={() => setBranchFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
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
                    {bpFilter !== 'all' && (
                      <Badge variant="outline" className="bg-white text-slate-800 border-slate-300 gap-1 text-xs py-0.5">
                        BP: {bpFilter === 'recorded' ? 'Recorded' : bpFilter === 'elevated' ? 'Elevated BP' : 'No BP'}
                        <button onClick={() => setBpFilter('all')} className="hover:text-red-600"><X className="h-3 w-3" /></button>
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
          {[1,2,3].map(i => (
            <Card key={i} className="border-slate-200 bg-white shadow-sm animate-pulse">
              <CardContent className="p-6"><div className="h-40 bg-slate-100 rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPersonnel.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">{searchTerm ? 'No personnel found matching your search' : 'No personnel registered yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonnel.map((p) => {
            const bmiValue = p.bmi ?? computeBMI(String(p.height || ''), String(p.weight || ''));
            const bmiCat = bmiValue ? getBMICategory(bmiValue) : null;

            return (
              <Card key={p.id} className="border-slate-200 bg-white shadow-sm hover-lift transition-all duration-200">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-rose-50/20 to-emerald-50/10 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/20">
                        <Briefcase className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-slate-900">{p.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-xs text-slate-500 font-mono">EMP: {p.studentId}</span>
                          {p.personnelType ? (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${
                              (p.personnelType || '').toLowerCase().includes('non')
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {(p.personnelType || '').toLowerCase().includes('non') ? 'Non-Teaching' : 'Teaching'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 font-medium">
                              Unclassified
                            </Badge>
                          )}
                          {p.departmentBranch ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                              {p.departmentBranch}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {(userRole === 'admin' || userRole === 'nurse') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(p)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Edit personnel"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">

                  {/* BMI & Vitals — top of card content */}
                  {(bmiValue || p.height || p.weight || p.bloodPressure) && (
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
                          {p.height && <span>Height: <strong>{p.height} cm</strong></span>}
                          {p.weight && <span>Weight: <strong>{p.weight} kg</strong></span>}
                          {p.age   && <span>Age: <strong>{p.age} yrs</strong></span>}
                          {p.sex   && <span>Sex: <strong>{p.sex}</strong></span>}
                          {p.bloodPressure && (
                            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              BP: <strong>{p.bloodPressure}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Employee Email</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{p.email}</p>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-700">Allergies</p>
                    </div>
                    {p.allergies && p.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.allergies.map((a, i) => (
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
                    {p.medicalConditions && p.medicalConditions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.medicalConditions.map((c, i) => (
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
                    {p.immunizations && p.immunizations.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.immunizations.map((v, i) => (
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

      {/* Edit Personnel Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditingPersonnel(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Personnel Record</DialogTitle>
          </DialogHeader>

          {editingPersonnel && (
            <div className="space-y-6 py-4">

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={editingPersonnel.email} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Employee ID</Label>
                  <Input value={editForm.studentId} onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })} placeholder="e.g., EMP-202401" />
                </div>
                <div className="space-y-2">
                  <Label>Classification</Label>
                  <Select value={editForm.personnelType} onValueChange={(val) => setEditForm({ ...editForm, personnelType: val })}>
                    <SelectTrigger className="h-10 bg-white">
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">Teaching Personnel</SelectItem>
                      <SelectItem value="non-teaching">Non-Teaching Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campus Branch</Label>
                  <Select value={editForm.departmentBranch} onValueChange={(val) => setEditForm({ ...editForm, departmentBranch: val })}>
                    <SelectTrigger className="h-10 bg-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IBED">IBED</SelectItem>
                      <SelectItem value="SHS">SHS</SelectItem>
                      <SelectItem value="College">College</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} placeholder="e.g., 35" min="1" />
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
                  <Checkbox id="pc-noAllergies" checked={editForm.hasNoAllergies} onCheckedChange={(c) => setEditForm({ ...editForm, hasNoAllergies: c as boolean, allergies: c ? [] : editForm.allergies })} />
                  <label htmlFor="pc-noAllergies" className="text-sm cursor-pointer text-slate-700">No known allergies</label>
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
                  <Checkbox id="pc-noMedical" checked={editForm.hasNoMedicalConditions} onCheckedChange={(c) => setEditForm({ ...editForm, hasNoMedicalConditions: c as boolean, medicalConditions: c ? [] : editForm.medicalConditions })} />
                  <label htmlFor="pc-noMedical" className="text-sm cursor-pointer text-slate-700">No known medical conditions</label>
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
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button onClick={() => { setIsEditOpen(false); setEditingPersonnel(null); }} variant="outline">Cancel</Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
