import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, setDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db, secondaryAuth } from '../lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import {
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  AlertCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface BulkAddUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProcessResult {
  success: boolean;
  type: 'student' | 'parent';
  name: string;
  email: string;
  error?: string;
}

export function BulkAddUsersModal({ open, onOpenChange, onSuccess }: BulkAddUsersModalProps) {
  const [fullNames, setFullNames] = useState('');
  const [emails, setEmails] = useState('');
  const [gradeLevels, setGradeLevels] = useState('');
  const [studentIds, setStudentIds] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [immunizations, setImmunizations] = useState('');
  const [heights, setHeights] = useState('');
  const [weights, setWeights] = useState('');
  const [ages, setAges] = useState('');
  const [sexes, setSexes] = useState('');
  const [parentNames, setParentNames] = useState('');
  const [parentEmails, setParentEmails] = useState('');
  const [parentPhones, setParentPhones] = useState('');

  const [detectedCount, setDetectedCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'results'>('input');
  const [processResults, setProcessResults] = useState<ProcessResult[]>([]);
  const [progress, setProgress] = useState(0);

  const DEFAULT_PASSWORD = 'ndkc123';

  // Detect student count from full names
  useEffect(() => {
    const lines = fullNames.split('\n').filter(line => line.trim());
    setDetectedCount(lines.length);
  }, [fullNames]);

  const downloadExcelTemplate = () => {
    const csvContent = `Full Name,Email,Grade Level,Student ID,Allergies,Medical Conditions,Immunization Records,Height (cm),Weight (kg),Age,Sex,Parent Name,Parent Email,Parent Phone
Samuel Sanchez,samuelnash@gmail.com,1st Year College,2022-345,None,None,BCG,165,60,18,Male,John Sanchez,john@email.com,09123456789
Maria Garcia,maria.garcia@gmail.com,2nd Year College,2023-346,Peanuts,Asthma,"BCG, Hepatitis B",158,52,19,Female,Pedro Garcia,pedro@email.com,09187654321
John Doe,john.doe@gmail.com,1st Year College,2022-347,None,None,None,170,65,18,Male,Jane Doe,jane@email.com,09198765432`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-students-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Excel template downloaded!');
  };

  const VALID_GRADES = [
    'Kindergarten',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
    '1st Year College', '2nd Year College', '3rd Year College', '4th Year College',
  ];

  const validateInputs = () => {
    const fullNameLines = fullNames.split('\n').filter(line => line.trim());
    const emailLines = emails.split('\n').filter(line => line.trim());
    const gradeLines = gradeLevels.split('\n').filter(line => line.trim());
    const idLines = studentIds.split('\n').filter(line => line.trim());
    const allergyLines = allergies.split('\n');
    const parentNameLines = parentNames.split('\n');
    const parentEmailLines = parentEmails.split('\n');

    if (fullNameLines.length === 0) {
      toast.error('Please enter at least one student name');
      return false;
    }

    if (emailLines.length !== fullNameLines.length) {
      toast.error(`Email count (${emailLines.length}) doesn't match student count (${fullNameLines.length})`);
      return false;
    }

    if (gradeLines.length !== fullNameLines.length) {
      toast.error(`Grade level count (${gradeLines.length}) doesn't match student count (${fullNameLines.length})`);
      return false;
    }

    if (idLines.length !== fullNameLines.length) {
      toast.error(`Student ID count (${idLines.length}) doesn't match student count (${fullNameLines.length})`);
      return false;
    }

    // Validate emails
    for (let i = 0; i < emailLines.length; i++) {
      if (!emailLines[i].includes('@')) {
        toast.error(`Invalid email on line ${i + 1}: ${emailLines[i]}`);
        return false;
      }
    }

    // Validate grade levels
    for (let i = 0; i < gradeLines.length; i++) {
      const grade = gradeLines[i].trim();
      if (!VALID_GRADES.includes(grade)) {
        toast.error(`Invalid grade level on line ${i + 1}: "${grade}". Must be exactly one of: ${VALID_GRADES.slice(0, 5).join(', ')}...`);
        return false;
      }
    }

    return true;
  };

  const processBulkImport = async () => {
    if (!validateInputs()) return;

    setProcessing(true);
    setCurrentStep('processing');
    setProgress(0);

    const fullNameLines = fullNames.split('\n').filter(line => line.trim());
    const emailLines = emails.split('\n').filter(line => line.trim());
    const gradeLines = gradeLevels.split('\n').filter(line => line.trim());
    const idLines = studentIds.split('\n').filter(line => line.trim());
    const allergyLines = allergies.split('\n');
    const medicalConditionLines = medicalConditions.split('\n');
    const immunizationLines = immunizations.split('\n');
    const heightLines = heights.split('\n');
    const weightLines = weights.split('\n');
    const ageLines = ages.split('\n');
    const sexLines = sexes.split('\n');
    const parentNameLines = parentNames.split('\n');
    const parentEmailLines = parentEmails.split('\n');
    const parentPhoneLines = parentPhones.split('\n');

    const results: ProcessResult[] = [];
    const totalOperations = fullNameLines.length * 2;
    let completedOperations = 0;

    try {
      for (let i = 0; i < fullNameLines.length; i++) {
        const studentName = fullNameLines[i].trim();
        const studentEmail = emailLines[i].trim();
        const gradeLevel = gradeLines[i].trim();
        const studentId = idLines[i].trim();
        const studentAllergies = allergyLines[i]?.trim() || '';
        const studentMedicalConditions = medicalConditionLines[i]?.trim() || '';
        const studentImmunizations = immunizationLines[i]?.trim() || '';
        const studentHeight = parseFloat(heightLines[i]?.trim() || '') || null;
        const studentWeight = parseFloat(weightLines[i]?.trim() || '') || null;
        const studentAge = parseInt(ageLines[i]?.trim() || '') || null;
        const studentSex = sexLines[i]?.trim() || '';
        const studentBMI = (studentHeight && studentWeight && studentHeight > 0)
          ? Math.round((studentWeight / Math.pow(studentHeight / 100, 2)) * 10) / 10
          : null;
        const parentName = parentNameLines[i]?.trim() || '';
        const parentEmail = parentEmailLines[i]?.trim() || '';
        const parentPhone = parentPhoneLines[i]?.trim() || '';

        // Create student
        try {
          const existingQuery = query(
            collection(db, 'users'),
            where('email', '==', studentEmail)
          );
          const existing = await getDocs(existingQuery);

          if (!existing.empty) {
            results.push({
              success: false,
              type: 'student',
              name: studentName,
              email: studentEmail,
              error: 'Email already exists',
            });
            completedOperations += 2;
            setProgress((completedOperations / totalOperations) * 100);
            continue;
          }

          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            studentEmail,
            DEFAULT_PASSWORD
          );
          const uid = userCredential.user.uid;
          await secondaryAuth.signOut();

          const allergyList = studentAllergies
            ? studentAllergies.split(',').map(a => a.trim()).filter(a => a && a.toLowerCase() !== 'none')
            : [];

          const medicalConditionList = studentMedicalConditions
            ? studentMedicalConditions.split(',').map(c => c.trim()).filter(c => c && c.toLowerCase() !== 'none')
            : [];

          const immunizationList = studentImmunizations
            ? studentImmunizations.split(',').map(v => v.trim()).filter(v => v && v.toLowerCase() !== 'none')
            : [];

          await setDoc(doc(db, 'users', uid), {
            uid,
            email: studentEmail,
            name: studentName,
            role: 'student',
            grade: gradeLevel,
            studentId: studentId,
            createdAt: new Date(),
          });

          const studentRef = await addDoc(collection(db, 'students'), {
            studentId: studentId,
            name: studentName,
            grade: gradeLevel,
            email: studentEmail,
            allergies: allergyList,
            medicalConditions: medicalConditionList,
            immunizations: immunizationList,
            height: studentHeight,
            weight: studentWeight,
            age: studentAge,
            sex: studentSex,
            bmi: studentBMI,
            parentEmail: '',
            createdAt: new Date(),
          });

          results.push({
            success: true,
            type: 'student',
            name: studentName,
            email: studentEmail,
          });

          completedOperations++;
          setProgress((completedOperations / totalOperations) * 100);

          // Create parent if provided
          if (parentName && parentEmail) {
            try {
              const parentQuery = query(
                collection(db, 'users'),
                where('email', '==', parentEmail)
              );
              const existingParent = await getDocs(parentQuery);

              if (existingParent.empty) {
                const parentCredential = await createUserWithEmailAndPassword(
                  secondaryAuth,
                  parentEmail,
                  DEFAULT_PASSWORD
                );
                const parentUid = parentCredential.user.uid;
                await secondaryAuth.signOut();

                await setDoc(doc(db, 'users', parentUid), {
                  uid: parentUid,
                  email: parentEmail,
                  name: parentName,
                  role: 'parent',
                  phone: parentPhone || '',
                  studentIds: [studentRef.id],
                  createdAt: new Date(),
                });

                results.push({
                  success: true,
                  type: 'parent',
                  name: parentName,
                  email: parentEmail,
                });
              } else {
                const parentDoc = existingParent.docs[0];
                const currentStudentIds = parentDoc.data().studentIds || [];
                if (!currentStudentIds.includes(studentRef.id)) {
                  await setDoc(
                    doc(db, 'users', parentDoc.id),
                    { studentIds: [...currentStudentIds, studentRef.id] },
                    { merge: true }
                  );
                }

                results.push({
                  success: true,
                  type: 'parent',
                  name: parentName,
                  email: parentEmail,
                  error: 'Already exists (linked)',
                });
              }
            } catch (parentError: any) {
              results.push({
                success: false,
                type: 'parent',
                name: parentName,
                email: parentEmail,
                error: parentError.message,
              });
            }
          }

          completedOperations++;
          setProgress((completedOperations / totalOperations) * 100);
        } catch (error: any) {
          results.push({
            success: false,
            type: 'student',
            name: studentName,
            email: studentEmail,
            error: error.message,
          });
          completedOperations += 2;
          setProgress((completedOperations / totalOperations) * 100);
        }
      }

      setProcessResults(results);
      setCurrentStep('results');

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        toast.success(`Successfully created ${successCount} accounts!`);
      } else {
        toast.warning(`Created ${successCount} accounts with ${failCount} errors`);
      }

      onSuccess();
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Failed to complete bulk import');
    } finally {
      setProcessing(false);
    }
  };

  const resetModal = () => {
    setFullNames('');
    setEmails('');
    setGradeLevels('');
    setStudentIds('');
    setAllergies('');
    setMedicalConditions('');
    setImmunizations('');
    setHeights('');
    setWeights('');
    setAges('');
    setSexes('');
    setParentNames('');
    setParentEmails('');
    setParentPhones('');
    setCurrentStep('input');
    setProcessResults([]);
    setProgress(0);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Upload className="h-7 w-7 text-ndkc-green" />
                Bulk Add Students
              </DialogTitle>
              <p className="text-sm text-slate-600 mt-1">
                Each new line = one student. All fields must have the same number of lines.
              </p>
            </div>
            <Button
              onClick={downloadExcelTemplate}
              variant="outline"
              size="sm"
              className="text-ndkc-green border-ndkc-green hover:bg-emerald-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel Template
            </Button>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Input Form */}
          {currentStep === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Students Detected Badge */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ndkc-green rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-900">
                      {detectedCount} Student{detectedCount !== 1 ? 's' : ''} Detected
                    </p>
                    <p className="text-sm text-emerald-700">
                      Default Password: <code className="px-2 py-1 bg-white rounded font-mono">{DEFAULT_PASSWORD}</code>
                    </p>
                  </div>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-900">
                  <strong>How it works:</strong> Each line in each field represents one student. Make sure all fields have the same number of lines!
                  <br />
                  Example: Line 1 in "Full Name" + Line 1 in "Email" + Line 1 in "Grade" = Student 1
                  <br />
                  <strong className="text-red-700">⚠️ Grade levels must match EXACTLY</strong> - Click "View valid grade levels" to see accepted values.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Full Name *
                    <Badge variant="outline" className="font-normal">Required</Badge>
                  </Label>
                  <Textarea
                    value={fullNames}
                    onChange={(e) => setFullNames(e.target.value)}
                    placeholder="Samuel Sanchez&#10;Maria Garcia&#10;John Doe"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-ndkc-green"
                  />
                  <p className="text-xs text-slate-500">
                    {fullNames.split('\n').filter(l => l.trim()).length} line{fullNames.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Email *
                    <Badge variant="outline" className="font-normal">Required</Badge>
                  </Label>
                  <Textarea
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="samuelnash@gmail.com&#10;maria.garcia@gmail.com&#10;john.doe@gmail.com"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-ndkc-green"
                  />
                  <p className="text-xs text-slate-500">
                    {emails.split('\n').filter(l => l.trim()).length} line{emails.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Grade Level */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Grade Level *
                    <Badge variant="outline" className="font-normal">Required</Badge>
                  </Label>
                  <Textarea
                    value={gradeLevels}
                    onChange={(e) => setGradeLevels(e.target.value)}
                    placeholder="1st Year College&#10;2nd Year College&#10;1st Year College"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-ndkc-green"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      {gradeLevels.split('\n').filter(l => l.trim()).length} line{gradeLevels.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                        View valid grade levels
                      </summary>
                      <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                        <p className="font-semibold mb-1">Type EXACTLY as shown:</p>
                        <p>Kindergarten, Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, Grade 6, Grade 7, Grade 8, Grade 9, Grade 10, Grade 11, Grade 12, 1st Year College, 2nd Year College, 3rd Year College, 4th Year College</p>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Student ID */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Student ID *
                    <Badge variant="outline" className="font-normal">Required</Badge>
                  </Label>
                  <Textarea
                    value={studentIds}
                    onChange={(e) => setStudentIds(e.target.value)}
                    placeholder="2022-345&#10;2023-346&#10;2022-347"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-ndkc-green"
                  />
                  <p className="text-xs text-slate-500">
                    {studentIds.split('\n').filter(l => l.trim()).length} line{studentIds.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Allergies */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Allergies
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="None&#10;Peanuts, Dairy&#10;None"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Leave "None" or empty for no allergies</p>
                </div>

                {/* Medical Conditions */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Medical Conditions
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="None&#10;Asthma, Diabetes&#10;None"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Leave "None" or empty for no medical conditions</p>
                </div>

                {/* Immunization Records */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Immunization Records
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={immunizations}
                    onChange={(e) => setImmunizations(e.target.value)}
                    placeholder="BCG&#10;BCG, Hepatitis B&#10;None"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-teal-300"
                  />
                  <p className="text-xs text-slate-500">Separate multiple vaccines with commas. Leave "None" or empty if none.</p>
                </div>

                {/* Height */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Height (cm)
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={heights}
                    onChange={(e) => setHeights(e.target.value)}
                    placeholder="165&#10;158&#10;170"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Height in centimeters per student</p>
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Weight (kg)
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={weights}
                    onChange={(e) => setWeights(e.target.value)}
                    placeholder="60&#10;52&#10;65"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Weight in kilograms per student</p>
                </div>

                {/* Age */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Age
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={ages}
                    onChange={(e) => setAges(e.target.value)}
                    placeholder="18&#10;19&#10;18"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Age in years per student</p>
                </div>

                {/* Sex */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Sex
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={sexes}
                    onChange={(e) => setSexes(e.target.value)}
                    placeholder="Male&#10;Female&#10;Male"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Enter "Male" or "Female" per student</p>
                </div>

                {/* Parent Name */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Parent Name
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={parentNames}
                    onChange={(e) => setParentNames(e.target.value)}
                    placeholder="John Sanchez&#10;Pedro Garcia&#10;Jane Doe"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Parent accounts will be created automatically</p>
                </div>

                {/* Parent Email */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Parent Email
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={parentEmails}
                    onChange={(e) => setParentEmails(e.target.value)}
                    placeholder="john@email.com&#10;pedro@email.com&#10;jane@email.com"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">Must match parent names line by line</p>
                </div>

                {/* Parent Phone */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    Parent Phone
                    <Badge variant="outline" className="font-normal bg-slate-100">Optional</Badge>
                  </Label>
                  <Textarea
                    value={parentPhones}
                    onChange={(e) => setParentPhones(e.target.value)}
                    placeholder="09123456789&#10;09187654321&#10;09198765432"
                    rows={8}
                    className="font-mono resize-none border-2 focus:border-blue-300"
                  />
                  <p className="text-xs text-slate-500">For SMS notifications</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 h-14 text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={processBulkImport}
                  disabled={processing || detectedCount === 0}
                  className="flex-1 h-14 text-base bg-gradient-to-r from-ndkc-green to-emerald-600 text-white"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Create {detectedCount} Student{detectedCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Processing */}
          {currentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 py-12"
            >
              <div className="text-center">
                <Loader2 className="h-20 w-20 animate-spin text-ndkc-green mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                  Creating Accounts...
                </h3>
                <p className="text-slate-600">Please wait while we process all students</p>
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-semibold text-ndkc-green text-lg">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-4" />
              </div>
            </motion.div>
          )}

          {/* Results */}
          {currentStep === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="h-12 w-12 text-ndkc-green mx-auto mb-3" />
                    <p className="text-3xl font-bold text-emerald-900">
                      {processResults.filter(r => r.success).length}
                    </p>
                    <p className="text-sm text-emerald-700 mt-1">Successful</p>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-6 text-center">
                    <XCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-red-900">
                      {processResults.filter(r => !r.success).length}
                    </p>
                    <p className="text-sm text-red-700 mt-1">Failed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {processResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-4 rounded-lg border ${
                      result.success
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-6 w-6 text-ndkc-green flex-shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate text-base">{result.name}</p>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Badge
                          className={
                            result.type === 'student'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {result.type}
                        </Badge>
                        <span className="text-slate-600 truncate">{result.email}</span>
                      </div>
                      {result.error && (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleClose} className="w-full h-14 text-base bg-ndkc-green">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
