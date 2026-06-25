import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logClinicVisit, dispenseMedicine, InventoryItem, MedicineDispensed } from '../lib/firestore-setup';
import { saveOfflineVisit, getOfflineVisitsCount } from '../lib/offline-storage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
  X,
  Save,
  Loader2,
  CheckCircle2,
  User,
  Search,
  Pill,
  AlertTriangle,
  Plus,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { MedicalCertificateModal } from './MedicalCertificateModal';
import { motion, AnimatePresence } from 'motion/react';

interface AddVisitFormProps {
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
}

interface SelectedMedicine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  availableStock: number;
}

export function AddVisitForm({ onClose, onSuccess, userEmail }: AddVisitFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [visitId, setVisitId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [nurseName, setNurseName] = useState('Nurse');
  const [medicines, setMedicines] = useState<InventoryItem[]>([]);
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(-1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const medicineSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    grade: '',
    symptoms: '',
    treatment: '',
    notes: '',
    notifyParent: true,
    needsPickup: false,
  });

  const [selectedStudentAllergies, setSelectedStudentAllergies] = useState<string[]>([]);
  const [selectedStudentMedicalConditions, setSelectedStudentMedicalConditions] = useState<string[]>([]);
  const [selectedStudentImmunizations, setSelectedStudentImmunizations] = useState<string[]>([]);

  useEffect(() => {
    loadStudents();
    loadNurseName();
    loadMedicines();

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentSearchRef.current &&
        !studentSearchRef.current.contains(event.target as Node)
      ) {
        setShowStudentSuggestions(false);
      }
      if (
        medicineSearchRef.current &&
        !medicineSearchRef.current.contains(event.target as Node)
      ) {
        setShowMedicineSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStudents = async () => {
    try {
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      const studentsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadNurseName = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const nurseUser = usersSnapshot.docs.find((doc) => doc.data().email === userEmail);

      if (nurseUser) {
        const nurseName = nurseUser.data().name || 'Nurse';
        setNurseName(nurseName);
      }
    } catch (error) {
      console.error('Error loading nurse name:', error);
    }
  };

  const loadMedicines = async () => {
    try {
      const inventoryRef = collection(db, 'inventory');
      const snapshot = await getDocs(inventoryRef);
      const medicineData = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => item.category === 'medicine' && item.stockQuantity > 0) as InventoryItem[];
      setMedicines(medicineData);
    } catch (error) {
      console.error('Error loading medicines:', error);
    }
  };

  const getFilteredStudents = () => {
    if (!studentSearch) return [];
    const query = studentSearch.toLowerCase();
    return students
      .filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          (student.studentId && student.studentId.toLowerCase().includes(query))
      )
      .slice(0, 5);
  };

  const getFilteredMedicines = () => {
    if (!medicineSearch) return [];
    const query = medicineSearch.toLowerCase();
    return medicines
      .filter((medicine) => medicine.name.toLowerCase().includes(query))
      .slice(0, 5);
  };

  const handleStudentSelect = (student: any) => {
    setFormData({
      ...formData,
      studentId: student.id,
      studentName: student.name,
      grade: student.grade || '',
    });
    setStudentSearch(student.name);
    setShowStudentSuggestions(false);

    // Set allergies, medical conditions, and immunizations
    setSelectedStudentAllergies(student.allergies || []);
    setSelectedStudentMedicalConditions(student.medicalConditions || []);
    setSelectedStudentImmunizations(student.immunizations || []);
  };

  const handleMedicineSelect = (medicine: InventoryItem) => {
    if (!selectedMedicines.find((m) => m.id === medicine.id)) {
      setSelectedMedicines([
        ...selectedMedicines,
        {
          id: medicine.id!,
          name: medicine.name,
          quantity: 1,
          unit: medicine.unit,
          availableStock: medicine.stockQuantity,
        },
      ]);
    }
    setMedicineSearch('');
    setShowMedicineSuggestions(false);
  };

  const updateMedicineQuantity = (medicineId: string, quantity: number) => {
    setSelectedMedicines(
      selectedMedicines.map((m) =>
        m.id === medicineId ? { ...m, quantity: Math.max(1, quantity) } : m
      )
    );
  };

  const removeMedicine = (medicineId: string) => {
    setSelectedMedicines(selectedMedicines.filter((m) => m.id !== medicineId));
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'student' | 'medicine') => {
    if (type === 'student') {
      const filtered = getFilteredStudents();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedStudentIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedStudentIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedStudentIndex >= 0) {
        e.preventDefault();
        handleStudentSelect(filtered[selectedStudentIndex]);
        setSelectedStudentIndex(-1);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate medicine quantities
      for (const medicine of selectedMedicines) {
        if (medicine.quantity > medicine.availableStock) {
          throw new Error(`Insufficient stock for ${medicine.name}`);
        }
      }

      // Find parent
      let parentEmail = '';
      let parentName = '';
      let parentPhone = '';

      if (formData.notifyParent && isOnline) {
        try {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const parentUser = usersSnapshot.docs.find((doc) => {
            const userData = doc.data();
            return (
              userData.role === 'parent' &&
              userData.studentIds &&
              Array.isArray(userData.studentIds) &&
              userData.studentIds.includes(formData.studentId)
            );
          });

          if (parentUser) {
            const parentData = parentUser.data();
            parentEmail = parentData.email;
            parentName = parentData.name;
            parentPhone = parentData.phone || '';
          }
        } catch (err) {
          console.warn('Could not fetch parent data (offline mode)');
        }
      }

      // If offline, save to local storage
      if (!isOnline) {
        const offlineId = saveOfflineVisit({
          studentId: formData.studentId,
          studentName: formData.studentName,
          grade: formData.grade,
          symptoms: formData.symptoms,
          treatment: formData.treatment,
          notes: formData.notes,
          notifyParent: formData.notifyParent,
          needsPickup: formData.needsPickup,
          loggedBy: userEmail,
          parentEmail: parentEmail || undefined,
          parentName: parentName || undefined,
          parentPhone: parentPhone || undefined,
          pickupRequired: formData.needsPickup,
          nurseEmail: userEmail,
          nurseName: nurseName,
          timestamp: Timestamp.now(),
        });

        setVisitId(offlineId);
        setSuccess(true);
        toast.success('📴 Saved offline! Will sync when connection restored.', {
          duration: 5000,
        });

        // Close form after short delay
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 2000);
        return;
      }

      // Online mode - normal flow
      const generatedVisitId = await logClinicVisit({
        studentId: formData.studentId,
        studentName: formData.studentName,
        grade: formData.grade,
        symptoms: formData.symptoms,
        treatment: formData.treatment,
        notes: formData.notes,
        notifyParent: formData.notifyParent,
        needsPickup: formData.needsPickup,
        loggedBy: userEmail,
        parentEmail: parentEmail || undefined,
        parentName: parentName || undefined,
        parentPhone: parentPhone || undefined,
        pickupRequired: formData.needsPickup,
        nurseEmail: userEmail,
        nurseName: nurseName,
      });

      // Dispense medicines
      for (const medicine of selectedMedicines) {
        await dispenseMedicine(medicine.id, medicine.quantity, userEmail);
      }

      setVisitId(generatedVisitId);
      setSuccess(true);
      toast.success('Clinic visit logged successfully!');

      // Show certificate after short delay
      setTimeout(() => {
        setShowCertificate(true);
      }, 1500);
    } catch (error: any) {
      console.error('Error logging visit:', error);
      toast.error(error.message || 'Failed to log visit');
      setLoading(false);
    }
  };

  // Show medical certificate modal
  if (showCertificate) {
    return (
      <MedicalCertificateModal
        visitData={{
          visitId: visitId,
          studentName: formData.studentName,
          grade: formData.grade,
          symptoms: formData.symptoms,
          treatment: formData.treatment,
          notes: formData.notes,
          nurseName: nurseName,
          timestamp: new Date(),
        }}
        onClose={() => {
          setShowCertificate(false);
          onSuccess();
          onClose();
        }}
      />
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-2xl animate-scaleIn">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 p-5">
              <CheckCircle2 className="h-14 w-14 text-ndkc-green" />
            </div>
          </div>
          <h2 className="mb-3 text-slate-900">Visit Logged Successfully!</h2>
          <p className="text-slate-600">
            {formData.notifyParent && 'Parent notification sent via email and SMS.'}
            {formData.needsPickup && ' Parent needs to pick up student.'}
          </p>
          <p className="text-sm text-slate-500 mt-4">Generating medical certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-lg p-6">
          <div>
            <h2 className="text-slate-900">Log Clinic Visit</h2>
            <p className="mt-1 text-sm text-slate-600">Record a new student health visit</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Smart Student Search */}
          <div className="space-y-2" ref={studentSearchRef}>
            <Label htmlFor="studentSearch" className="text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-ndkc-green" />
              Search Student by Name or ID
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="studentSearch"
                placeholder="Type student name or ID..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowStudentSuggestions(true);
                  setSelectedStudentIndex(-1);
                }}
                onFocus={() => setShowStudentSuggestions(true)}
                onKeyDown={(e) => handleKeyDown(e, 'student')}
                className="h-12 pl-10 border-slate-200 bg-white shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
              />

              {/* Student Suggestions Dropdown */}
              <AnimatePresence>
                {showStudentSuggestions && getFilteredStudents().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                  >
                    {getFilteredStudents().map((student, index) => (
                      <div
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          index === selectedStudentIndex
                            ? 'bg-emerald-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <User className="h-4 w-4 text-ndkc-green" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{student.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {student.studentId && (
                                <span className="text-xs text-slate-500">
                                  ID: {student.studentId}
                                </span>
                              )}
                              {student.grade && (
                                <Badge variant="outline" className="text-xs">
                                  {student.grade}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected Student Card */}
            {formData.studentId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-ndkc-green rounded-xl">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{formData.studentName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-ndkc-green text-white">{formData.grade}</Badge>
                      <span className="text-xs text-slate-600">ID: {formData.studentId}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, studentId: '', studentName: '', grade: '' });
                      setStudentSearch('');
                      setSelectedStudentAllergies([]);
                      setSelectedStudentMedicalConditions([]);
                      setSelectedStudentImmunizations([]);
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Allergies, Medical Conditions, and Immunizations */}
                {(selectedStudentAllergies.length > 0 || selectedStudentMedicalConditions.length > 0 || selectedStudentImmunizations.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-emerald-200 space-y-3">
                    {/* Allergies */}
                    {selectedStudentAllergies.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <p className="text-sm font-semibold text-red-700">Allergies</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedStudentAllergies.map((allergy, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-300 text-xs"
                            >
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medical Conditions */}
                    {selectedStudentMedicalConditions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                          <p className="text-sm font-semibold text-rose-700">Medical Conditions</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedStudentMedicalConditions.map((condition, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-300 text-xs"
                            >
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Immunization Records */}
                    {selectedStudentImmunizations.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-teal-600" />
                          <p className="text-sm font-semibold text-teal-700">Immunization Records</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedStudentImmunizations.map((vaccine, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-teal-50 text-teal-700 border-teal-300 text-xs"
                            >
                              {vaccine}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Symptoms */}
          <div className="space-y-2">
            <Label htmlFor="symptoms" className="text-slate-700">
              Symptoms *
            </Label>
            <Input
              id="symptoms"
              placeholder="e.g., Headache, Fever, Stomachache"
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              required
              className="h-12 border-slate-200 bg-white shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
            />
          </div>

          {/* Treatment */}
          <div className="space-y-2">
            <Label htmlFor="treatment" className="text-slate-700">
              Treatment Provided *
            </Label>
            <Input
              id="treatment"
              placeholder="e.g., Rest, Pain reliever, Ice pack"
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              required
              className="h-12 border-slate-200 bg-white shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
            />
          </div>

          {/* Medicine Dispensing */}
          <div className="space-y-3" ref={medicineSearchRef}>
            <Label className="text-slate-700 flex items-center gap-2">
              <Pill className="h-4 w-4 text-blue-600" />
              Medicines Dispensed (Optional)
            </Label>

            {/* Medicine Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Type medicine name to add..."
                value={medicineSearch}
                onChange={(e) => {
                  setMedicineSearch(e.target.value);
                  setShowMedicineSuggestions(true);
                }}
                onFocus={() => setShowMedicineSuggestions(true)}
                className="h-12 pl-10 border-slate-200 bg-white shadow-sm"
              />

              {/* Medicine Suggestions */}
              <AnimatePresence>
                {showMedicineSuggestions && getFilteredMedicines().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                  >
                    {getFilteredMedicines().map((medicine) => (
                      <div
                        key={medicine.id}
                        onClick={() => handleMedicineSelect(medicine)}
                        className="px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Pill className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{medicine.name}</p>
                              <p className="text-xs text-slate-500">{medicine.unit}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={
                                medicine.stockQuantity <= medicine.minStockLevel
                                  ? 'bg-amber-500'
                                  : 'bg-ndkc-green'
                              }
                            >
                              {medicine.stockQuantity} in stock
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected Medicines List */}
            <AnimatePresence>
              {selectedMedicines.map((medicine) => (
                <motion.div
                  key={medicine.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Pill className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{medicine.name}</p>
                    <p className="text-xs text-slate-500">
                      Available: {medicine.availableStock} {medicine.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={medicine.availableStock}
                      value={medicine.quantity}
                      onChange={(e) =>
                        updateMedicineQuantity(medicine.id, parseInt(e.target.value) || 1)
                      }
                      className="w-20 h-10 text-center"
                    />
                    <span className="text-sm text-slate-600">{medicine.unit}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedicine(medicine.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {medicine.quantity > medicine.availableStock && (
                    <Badge className="bg-red-500 text-white">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Insufficient Stock
                    </Badge>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-700">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional observations or recommendations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="border-slate-200 bg-white shadow-sm focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
            />
          </div>

          {/* Notify Parent Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/30 p-5">
            <div>
              <Label htmlFor="notify" className="text-slate-900">
                Notify Parent Immediately
              </Label>
              <p className="mt-1 text-sm text-slate-600">Send email and SMS notification to parent</p>
            </div>
            <Switch
              id="notify"
              checked={formData.notifyParent}
              onCheckedChange={(checked) => setFormData({ ...formData, notifyParent: checked })}
              className="data-[state=checked]:bg-ndkc-green"
            />
          </div>

          {/* Needs Pickup Checkbox */}
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-50/30 p-5">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="needsPickup"
                checked={formData.needsPickup}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, needsPickup: checked as boolean })
                }
                className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <div>
                <Label htmlFor="needsPickup" className="text-slate-900 cursor-pointer">
                  Student Needs to be Picked Up
                </Label>
                <p className="mt-1 text-sm text-slate-600">
                  Parent must fetch student from school
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 flex-1 border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.studentId ||
                !formData.symptoms ||
                !formData.treatment ||
                selectedMedicines.some((m) => m.quantity > m.availableStock)
              }
              className="h-12 flex-1 bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Log Visit
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
