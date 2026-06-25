import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, secondaryAuth } from '../lib/firebase';
import { logActivity, ActivityActions } from '../lib/activity-log';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { UserPlus, Trash2, Edit, Users, GraduationCap, User, Stethoscope, Search, Link as LinkIcon, Plus, X, Upload, Syringe } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { BulkAddUsersModal } from './BulkAddUsersModal';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'nurse' | 'parent' | 'student';
  studentIds?: string[];
  grade?: string;
  studentId?: string;
  phone?: string;
  createdAt: any;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  parentEmail: string;
  allergies?: string[];
  medicalConditions?: string[];
  immunizations?: string[];
  height?: number;
  weight?: number;
  age?: number;
  sex?: string;
  bmi?: number;
}

const computeBMI = (height: string, weight: string): number | null => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
};

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  if (bmi < 25)   return { label: 'Normal',      color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  if (bmi < 30)   return { label: 'Overweight',  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return             { label: 'Obese',        color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
};

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'nurse' | 'parent' | 'student'>('student');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    grade: '',
    studentId: '',
    phone: '',
    selectedStudents: [] as string[],
    allergies: [] as string[],
    hasNoAllergies: false,
    currentAllergy: '',
    medicalConditions: [] as string[],
    hasNoMedicalConditions: false,
    currentMedicalCondition: '',
    immunizations: [] as string[],
    currentImmunization: '',
    height: '',
    weight: '',
    age: '',
    sex: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(usersData);

      // Load all students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!formData.email || !formData.password || !formData.name) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Use SECONDARY auth instance so admin doesn't get logged out!
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );

      const newUserUid = userCredential.user.uid;

      // Sign out the newly created user from secondary auth
      await secondaryAuth.signOut();

      // Prepare user data
      const userData: any = {
        uid: newUserUid,
        email: formData.email,
        name: formData.name,
        role: selectedRole,
        createdAt: new Date()
      };

      // Add role-specific data
      if (selectedRole === 'student') {
        if (!formData.grade || !formData.studentId) {
          toast.error('Please fill in grade and student ID');
          return;
        }
        userData.grade = formData.grade;
        userData.studentId = formData.studentId;

        // Also create student record
        await addDoc(collection(db, 'students'), {
          studentId: formData.studentId,
          name: formData.name,
          grade: formData.grade,
          email: formData.email,
          parentEmail: '',
          createdAt: new Date(),
          allergies: formData.allergies,
          medicalConditions: formData.medicalConditions,
          immunizations: formData.immunizations,
          height: formData.height ? parseFloat(formData.height) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          age: formData.age ? parseInt(formData.age) : null,
          sex: formData.sex || '',
          bmi: computeBMI(formData.height, formData.weight)
        });
      } else if (selectedRole === 'parent') {
        userData.studentIds = formData.selectedStudents;
        userData.phone = formData.phone || '';
      }

      // Create user document using setDoc with the user's UID as document ID
      await setDoc(doc(db, 'users', newUserUid), userData);

      toast.success(`${selectedRole} account created successfully`);
      setIsAddDialogOpen(false);
      resetForm();
      loadData();

      // Log activity
      await logActivity(
        ActivityActions.USER_CREATED,
        `Created ${selectedRole} account for ${formData.name} (${formData.email})`,
        {
          userId: newUserUid,
          email: formData.email,
          name: formData.name,
          role: selectedRole
        }
      );
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    
    if (!confirm(`Are you sure you want to delete ${userToDelete?.name || 'this user'}? This will permanently delete all associated records including clinic visits, notifications, and activity logs.`)) return;

    try {
      console.log(`🗑️ Starting cascade deletion for user: ${userToDelete?.name} (${userId})`);
      
      // 1. If student, delete student record
      if (userToDelete?.role === 'student') {
        const studentsSnapshot = await getDocs(
          query(collection(db, 'students'), where('email', '==', userToDelete.email))
        );
        console.log(`📚 Found ${studentsSnapshot.docs.length} student record(s) to delete`);
        for (const studentDoc of studentsSnapshot.docs) {
          const studentId = studentDoc.id;
          
          // Delete clinic visits for this student
          const visitsSnapshot = await getDocs(
            query(collection(db, 'clinicVisits'), where('studentId', '==', studentId))
          );
          console.log(`🏥 Found ${visitsSnapshot.docs.length} clinic visit(s) to delete`);
          for (const visitDoc of visitsSnapshot.docs) {
            await deleteDoc(doc(db, 'clinicVisits', visitDoc.id));
          }
          
          // Delete notifications for this student
          const notificationsSnapshot = await getDocs(
            query(collection(db, 'notifications'), where('studentId', '==', studentId))
          );
          console.log(`🔔 Found ${notificationsSnapshot.docs.length} notification(s) to delete`);
          for (const notifDoc of notificationsSnapshot.docs) {
            await deleteDoc(doc(db, 'notifications', notifDoc.id));
          }
          
          // Delete the student record
          await deleteDoc(doc(db, 'students', studentId));
          console.log(`✅ Deleted student record: ${studentId}`);
        }
      }
      
      // 2. If parent, remove student associations
      if (userToDelete?.role === 'parent' && userToDelete?.studentIds?.length) {
        console.log(`👨‍👩‍👧 Removing parent associations for ${userToDelete.studentIds.length} student(s)`);
        // Note: We don't delete the students, just the parent's association
      }
      
      // 3. Delete activity logs related to this user
      const activityLogsSnapshot = await getDocs(
        query(collection(db, 'activityLogs'), where('userEmail', '==', userToDelete?.email))
      );
      console.log(`📝 Found ${activityLogsSnapshot.docs.length} activity log(s) to delete`);
      for (const logDoc of activityLogsSnapshot.docs) {
        await deleteDoc(doc(db, 'activityLogs', logDoc.id));
      }
      
      // 4. Delete notifications sent to this user (if parent)
      if (userToDelete?.role === 'parent') {
        const parentNotificationsSnapshot = await getDocs(
          query(collection(db, 'notifications'), where('parentEmail', '==', userToDelete.email))
        );
        console.log(`📧 Found ${parentNotificationsSnapshot.docs.length} parent notification(s) to delete`);
        for (const notifDoc of parentNotificationsSnapshot.docs) {
          await deleteDoc(doc(db, 'notifications', notifDoc.id));
        }
      }
      
      // 5. Delete clinic visits created by this user (if nurse/staff)
      if (userToDelete?.role === 'nurse' || userToDelete?.role === 'admin') {
        const nurseVisitsSnapshot = await getDocs(
          query(collection(db, 'clinicVisits'), where('nurseEmail', '==', userToDelete.email))
        );
        console.log(`💉 Found ${nurseVisitsSnapshot.docs.length} clinic visit(s) created by this nurse/staff`);
        // Note: In production, you might want to keep these records but anonymize them
        // For now, we'll delete them for complete cleanup
        for (const visitDoc of nurseVisitsSnapshot.docs) {
          await deleteDoc(doc(db, 'clinicVisits', visitDoc.id));
        }
      }
      
      // 6. Finally, delete the user account from Firestore
      await deleteDoc(doc(db, 'users', userId));
      console.log(`✅ Deleted user account from Firestore: ${userId}`);

      // Note: Firebase client SDK cannot delete other users from Authentication
      // The user's Firestore data has been deleted, but their auth account remains
      // To fully remove the user, one of these additional steps is needed:
      // 1. Use Firebase Console to manually delete the auth user
      // 2. Implement a Cloud Function with Admin SDK to delete auth users
      // 3. Set up a backend API with Firebase Admin SDK

      console.warn(`⚠️ Note: User ${userToDelete?.email} still exists in Firebase Authentication`);
      console.warn(`   To fully remove: Go to Firebase Console → Authentication → Users → Delete ${userToDelete?.email}`);

      toast.success(`User deleted from system. Note: Auth account remains - manually delete from Firebase Console if needed.`);
      loadData();

      // Log activity (this will be the last activity log for this user)
      await logActivity(
        ActivityActions.USER_DELETED,
        `Deleted user account and all associated records: ${userToDelete?.name || 'Unknown'} (${userToDelete?.email || 'Unknown'})`,
        { userId, deletedUser: userToDelete }
      );
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      toast.error('Failed to delete user. Please try again.');
    }
  };

  const handleEditUser = async (updatedData: {
    name: string;
    grade?: string;
    studentId?: string;
    selectedStudents?: string[];
    phone?: string;
    allergies?: string[];
    medicalConditions?: string[];
    immunizations?: string[];
    height?: string;
    weight?: string;
    age?: string;
    sex?: string;
  }) => {
    if (!editingUser) return;

    try {
      const updatePayload: any = {
        name: updatedData.name,
      };

      if (editingUser.role === 'student') {
        updatePayload.grade = updatedData.grade;
        updatePayload.studentId = updatedData.studentId;
      } else if (editingUser.role === 'parent') {
        updatePayload.studentIds = updatedData.selectedStudents || [];
        updatePayload.phone = updatedData.phone || '';
      }

      await updateDoc(doc(db, 'users', editingUser.id), updatePayload);

      // If student, also update student record
      if (editingUser.role === 'student') {
        const studentsSnapshot = await getDocs(
          query(collection(db, 'students'), where('email', '==', editingUser.email))
        );
        studentsSnapshot.docs.forEach(async (studentDoc) => {
          await updateDoc(doc(db, 'students', studentDoc.id), {
            name: updatedData.name,
            grade: updatedData.grade,
            studentId: updatedData.studentId,
            allergies: updatedData.allergies || [],
            medicalConditions: updatedData.medicalConditions || [],
            immunizations: updatedData.immunizations || [],
            height: updatedData.height ? parseFloat(updatedData.height) : null,
            weight: updatedData.weight ? parseFloat(updatedData.weight) : null,
            age: updatedData.age ? parseInt(updatedData.age) : null,
            sex: updatedData.sex || '',
            bmi: computeBMI(updatedData.height || '', updatedData.weight || '')
          });
        });
      }

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      loadData();

      // Log activity
      await logActivity(
        ActivityActions.USER_UPDATED,
        `Updated user account: ${updatedData.name} (${editingUser.email})`,
        { userId: editingUser.id, updates: updatePayload }
      );
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const openEditDialog = async (user: UserData) => {
    setEditingUser(user);

    // If student, load their health profile from student record
    let studentAllergies: string[] = [];
    let studentMedicalConditions: string[] = [];
    let studentImmunizations: string[] = [];
    let studentHeight = '';
    let studentWeight = '';
    let studentAge = '';
    let studentSex = '';

    if (user.role === 'student') {
      const studentsSnapshot = await getDocs(
        query(collection(db, 'students'), where('email', '==', user.email))
      );
      if (!studentsSnapshot.empty) {
        const studentData = studentsSnapshot.docs[0].data();
        studentAllergies = studentData.allergies || [];
        studentMedicalConditions = studentData.medicalConditions || [];
        studentImmunizations = studentData.immunizations || [];
        studentHeight = studentData.height ? String(studentData.height) : '';
        studentWeight = studentData.weight ? String(studentData.weight) : '';
        studentAge = studentData.age ? String(studentData.age) : '';
        studentSex = studentData.sex || '';
      }
    }

    // Reset all form fields and set only the values from the user being edited
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      grade: user.grade || '',
      studentId: user.studentId || '',
      phone: user.phone || '',
      selectedStudents: user.studentIds || [],
      allergies: studentAllergies,
      hasNoAllergies: studentAllergies.length === 0,
      currentAllergy: '',
      medicalConditions: studentMedicalConditions,
      hasNoMedicalConditions: studentMedicalConditions.length === 0,
      currentMedicalCondition: '',
      immunizations: studentImmunizations,
      currentImmunization: '',
      height: studentHeight,
      weight: studentWeight,
      age: studentAge,
      sex: studentSex
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      grade: '',
      studentId: '',
      phone: '',
      selectedStudents: [],
      allergies: [],
      hasNoAllergies: false,
      currentAllergy: '',
      medicalConditions: [],
      hasNoMedicalConditions: false,
      currentMedicalCondition: '',
      immunizations: [],
      currentImmunization: '',
      height: '',
      weight: '',
      age: '',
      sex: ''
    });
    setStudentSearchTerm('');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'nurse':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'parent':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'student':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <User className="h-4 w-4" />;
      case 'nurse':
        return <Stethoscope className="h-4 w-4" />;
      case 'parent':
        return <Users className="h-4 w-4" />;
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const usersByRole = {
    all: filteredUsers,
    student: filteredUsers.filter(u => u.role === 'student'),
    parent: filteredUsers.filter(u => u.role === 'parent'),
    nurse: filteredUsers.filter(u => u.role === 'nurse'),
    admin: filteredUsers.filter(u => u.role === 'admin')
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">User Management</h1>
          <p className="mt-2 text-slate-600">
            Manage system users and permissions
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setIsBulkAddOpen(true)}
            variant="outline"
            className="h-12 border-2 border-ndkc-green text-ndkc-green hover:bg-emerald-50 px-6 shadow-md hover:shadow-lg"
          >
            <Upload className="mr-2 h-5 w-5" />
            Bulk Add Users
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 bg-gradient-to-r from-ndkc-green to-emerald-600 px-6 shadow-lg hover:shadow-xl">
                <UserPlus className="mr-2 h-5 w-5" />
                Add New User
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New User Account</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>User Role</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedRole('student')}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      selectedRole === 'student'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <GraduationCap className="mx-auto h-8 w-8 text-emerald-600" />
                    <p className="mt-2 font-medium text-slate-900">Student</p>
                  </button>
                  
                  <button
                    onClick={() => setSelectedRole('parent')}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      selectedRole === 'parent'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <Users className="mx-auto h-8 w-8 text-amber-600" />
                    <p className="mt-2 font-medium text-slate-900">Parent</p>
                  </button>
                  
                  <button
                    onClick={() => setSelectedRole('nurse')}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      selectedRole === 'nurse'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <Stethoscope className="mx-auto h-8 w-8 text-blue-600" />
                    <p className="mt-2 font-medium text-slate-900">Nurse/Staff</p>
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>

              {/* Student-specific fields */}
              {selectedRole === 'student' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        placeholder="e.g., 2024001"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade Level</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'Kindergarten', 
                            'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
                            'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
                            '1st Year College', '2nd Year College', '3rd Year College', '4th Year College'
                          ].map(grade => (
                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
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
                        <Input
                          type="number"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          placeholder="e.g., 165"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600">Weight (kg)</label>
                        <Input
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          placeholder="e.g., 60"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600">Age</label>
                        <Input
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          placeholder="e.g., 17"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-600">Sex</label>
                        <select
                          value={formData.sex}
                          onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        >
                          <option value="">Select sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                    {computeBMI(formData.height, formData.weight) !== null && (() => {
                      const bmi = computeBMI(formData.height, formData.weight)!;
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

                  {/* Allergies Section */}
                  <div className="space-y-3">
                    <Label>Allergies</Label>
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="noAllergies"
                        checked={formData.hasNoAllergies}
                        onCheckedChange={(checked) => {
                          setFormData({ 
                            ...formData, 
                            hasNoAllergies: checked as boolean,
                            allergies: checked ? [] : formData.allergies
                          });
                        }}
                      />
                      <label
                        htmlFor="noAllergies"
                        className="text-sm cursor-pointer text-slate-700"
                      >
                        No known allergies
                      </label>
                    </div>

                    {!formData.hasNoAllergies && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={formData.currentAllergy}
                            onChange={(e) => setFormData({ ...formData, currentAllergy: e.target.value })}
                            placeholder="e.g., Peanuts, Penicillin"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (formData.currentAllergy.trim()) {
                                  setFormData({
                                    ...formData,
                                    allergies: [...formData.allergies, formData.currentAllergy.trim()],
                                    currentAllergy: ''
                                  });
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (formData.currentAllergy.trim()) {
                                setFormData({
                                  ...formData,
                                  allergies: [...formData.allergies, formData.currentAllergy.trim()],
                                  currentAllergy: ''
                                });
                              }
                            }}
                            className="whitespace-nowrap"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {formData.allergies.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">Allergies:</p>
                            <div className="space-y-2">
                              {formData.allergies.map((allergy, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                  <span className="text-sm">
                                    {index + 1}. {allergy}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        allergies: formData.allergies.filter((_, i) => i !== index)
                                      });
                                    }}
                                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Medical Conditions */}
                  <div className="space-y-3">
                    <Label>Medical Conditions</Label>
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="noMedicalConditions"
                        checked={formData.hasNoMedicalConditions}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            hasNoMedicalConditions: checked as boolean,
                            medicalConditions: checked ? [] : formData.medicalConditions
                          });
                        }}
                      />
                      <label
                        htmlFor="noMedicalConditions"
                        className="text-sm cursor-pointer text-slate-700"
                      >
                        No known medical conditions
                      </label>
                    </div>

                    {!formData.hasNoMedicalConditions && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={formData.currentMedicalCondition}
                            onChange={(e) => setFormData({ ...formData, currentMedicalCondition: e.target.value })}
                            placeholder="e.g., Asthma, Diabetes"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (formData.currentMedicalCondition.trim()) {
                                  setFormData({
                                    ...formData,
                                    medicalConditions: [...formData.medicalConditions, formData.currentMedicalCondition.trim()],
                                    currentMedicalCondition: ''
                                  });
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (formData.currentMedicalCondition.trim()) {
                                setFormData({
                                  ...formData,
                                  medicalConditions: [...formData.medicalConditions, formData.currentMedicalCondition.trim()],
                                  currentMedicalCondition: ''
                                });
                              }
                            }}
                            className="whitespace-nowrap"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {formData.medicalConditions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">Medical Conditions:</p>
                            <div className="space-y-2">
                              {formData.medicalConditions.map((condition, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                  <span className="text-sm">
                                    {index + 1}. {condition}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        medicalConditions: formData.medicalConditions.filter((_, i) => i !== index)
                                      });
                                    }}
                                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Immunization Records */}
                  <div className="space-y-3">
                    <Label>Immunization Records</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.currentImmunization}
                        onChange={(e) => setFormData({ ...formData, currentImmunization: e.target.value })}
                        placeholder="e.g., BCG, Hepatitis B, MMR"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (formData.currentImmunization.trim()) {
                              setFormData({
                                ...formData,
                                immunizations: [...formData.immunizations, formData.currentImmunization.trim()],
                                currentImmunization: ''
                              });
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (formData.currentImmunization.trim()) {
                            setFormData({
                              ...formData,
                              immunizations: [...formData.immunizations, formData.currentImmunization.trim()],
                              currentImmunization: ''
                            });
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>

                    {formData.immunizations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Immunization Records:</p>
                        <div className="space-y-2">
                          {formData.immunizations.map((vaccine, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <span className="text-sm">{index + 1}. {vaccine}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData({ ...formData, immunizations: formData.immunizations.filter((_, i) => i !== index) })}
                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Parent-specific fields */}
              {selectedRole === 'parent' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., 09123456789"
                    />
                    <p className="text-xs text-slate-500">For SMS notifications</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Link to Students</Label>
                    <Card className="border-slate-200">
                      <CardContent className="p-4">
                        {students.length === 0 ? (
                          <p className="text-sm text-slate-500">No students available to link</p>
                        ) : (
                          <>
                            <div className="mb-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                  placeholder="Search students by name, ID, or grade..."
                                  value={studentSearchTerm}
                                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {students
                                .filter(student => {
                                  const searchLower = studentSearchTerm.toLowerCase();
                                  return (
                                    student.name.toLowerCase().includes(searchLower) ||
                                    student.studentId.toLowerCase().includes(searchLower) ||
                                    student.grade.toLowerCase().includes(searchLower)
                                  );
                                })
                                .map(student => (
                                  <div key={student.id} className="flex items-center space-x-3 rounded-lg border border-slate-200 p-3">
                                    <Checkbox
                                      id={student.id}
                                      checked={formData.selectedStudents.includes(student.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData({
                                            ...formData,
                                            selectedStudents: [...formData.selectedStudents, student.id]
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selectedStudents: formData.selectedStudents.filter(id => id !== student.id)
                                          });
                                        }
                                      }}
                                    />
                                    <label htmlFor={student.id} className="flex-1 cursor-pointer">
                                      <p className="font-medium text-slate-900">{student.name}</p>
                                      <p className="text-sm text-slate-500">{student.grade} - ID: {student.studentId}</p>
                                    </label>
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateUser}
                  className="flex-1 bg-gradient-to-r from-ndkc-green to-emerald-600"
                >
                  Create Account
                </Button>
                <Button
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User Account</DialogTitle>
            </DialogHeader>
            
            {editingUser && (
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>
                </div>

                {/* Student-specific fields */}
                {editingUser.role === 'student' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-studentId">Student ID</Label>
                        <Input
                          id="edit-studentId"
                          value={formData.studentId}
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                          placeholder="e.g., 2024001"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-grade">Grade Level</Label>
                        <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              'Kindergarten',
                              'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
                              'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
                              '1st Year College', '2nd Year College', '3rd Year College', '4th Year College'
                            ].map(grade => (
                              <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                            ))}
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
                          <Input
                            type="number"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                            placeholder="e.g., 165"
                            min="1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">Weight (kg)</label>
                          <Input
                            type="number"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                            placeholder="e.g., 60"
                            min="1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">Age</label>
                          <Input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            placeholder="e.g., 17"
                            min="1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">Sex</label>
                          <select
                            value={formData.sex}
                            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                          >
                            <option value="">Select sex</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                      </div>
                      {computeBMI(formData.height, formData.weight) !== null && (() => {
                        const bmi = computeBMI(formData.height, formData.weight)!;
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

                    {/* Allergies Section */}
                    <div className="space-y-3">
                      <Label>Allergies</Label>
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="edit-noAllergies"
                          checked={formData.hasNoAllergies}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              hasNoAllergies: checked as boolean,
                              allergies: checked ? [] : formData.allergies
                            });
                          }}
                        />
                        <label
                          htmlFor="edit-noAllergies"
                          className="text-sm cursor-pointer text-slate-700"
                        >
                          No known allergies
                        </label>
                      </div>

                      {!formData.hasNoAllergies && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={formData.currentAllergy}
                              onChange={(e) => setFormData({ ...formData, currentAllergy: e.target.value })}
                              placeholder="e.g., Peanuts, Penicillin"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (formData.currentAllergy.trim()) {
                                    setFormData({
                                      ...formData,
                                      allergies: [...formData.allergies, formData.currentAllergy.trim()],
                                      currentAllergy: ''
                                    });
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (formData.currentAllergy.trim()) {
                                  setFormData({
                                    ...formData,
                                    allergies: [...formData.allergies, formData.currentAllergy.trim()],
                                    currentAllergy: ''
                                  });
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>

                          {formData.allergies.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-600">Allergies:</p>
                              <div className="space-y-2">
                                {formData.allergies.map((allergy, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                  >
                                    <span className="text-sm">
                                      {index + 1}. {allergy}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          allergies: formData.allergies.filter((_, i) => i !== index)
                                        });
                                      }}
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Medical Conditions */}
                    <div className="space-y-3">
                      <Label>Medical Conditions</Label>
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="edit-noMedicalConditions"
                          checked={formData.hasNoMedicalConditions}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              hasNoMedicalConditions: checked as boolean,
                              medicalConditions: checked ? [] : formData.medicalConditions
                            });
                          }}
                        />
                        <label
                          htmlFor="edit-noMedicalConditions"
                          className="text-sm cursor-pointer text-slate-700"
                        >
                          No known medical conditions
                        </label>
                      </div>

                      {!formData.hasNoMedicalConditions && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={formData.currentMedicalCondition}
                              onChange={(e) => setFormData({ ...formData, currentMedicalCondition: e.target.value })}
                              placeholder="e.g., Asthma, Diabetes"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (formData.currentMedicalCondition.trim()) {
                                    setFormData({
                                      ...formData,
                                      medicalConditions: [...formData.medicalConditions, formData.currentMedicalCondition.trim()],
                                      currentMedicalCondition: ''
                                    });
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (formData.currentMedicalCondition.trim()) {
                                  setFormData({
                                    ...formData,
                                    medicalConditions: [...formData.medicalConditions, formData.currentMedicalCondition.trim()],
                                    currentMedicalCondition: ''
                                  });
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>

                          {formData.medicalConditions.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-600">Medical Conditions:</p>
                              <div className="space-y-2">
                                {formData.medicalConditions.map((condition, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                  >
                                    <span className="text-sm">
                                      {index + 1}. {condition}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          medicalConditions: formData.medicalConditions.filter((_, i) => i !== index)
                                        });
                                      }}
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Immunization Records */}
                    <div className="space-y-3">
                      <Label>Immunization Records</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.currentImmunization}
                          onChange={(e) => setFormData({ ...formData, currentImmunization: e.target.value })}
                          placeholder="e.g., BCG, Hepatitis B, MMR"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (formData.currentImmunization.trim()) {
                                setFormData({
                                  ...formData,
                                  immunizations: [...formData.immunizations, formData.currentImmunization.trim()],
                                  currentImmunization: ''
                                });
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (formData.currentImmunization.trim()) {
                              setFormData({
                                ...formData,
                                immunizations: [...formData.immunizations, formData.currentImmunization.trim()],
                                currentImmunization: ''
                              });
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      {formData.immunizations.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600">Immunization Records:</p>
                          <div className="space-y-2">
                            {formData.immunizations.map((vaccine, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <span className="text-sm">{index + 1}. {vaccine}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFormData({ ...formData, immunizations: formData.immunizations.filter((_, i) => i !== index) })}
                                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Parent-specific fields */}
                {editingUser.role === 'parent' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Contact Number</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., 09123456789"
                      />
                      <p className="text-xs text-slate-500">For SMS notifications</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Linked Students</Label>
                      <Card className="border-slate-200">
                        <CardContent className="p-4">
                          {students.length === 0 ? (
                            <p className="text-sm text-slate-500">No students available to link</p>
                          ) : (
                            <>
                              <div className="mb-3">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    placeholder="Search students by name, ID, or grade..."
                                    value={studentSearchTerm}
                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                    className="pl-10"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {students
                                  .filter(student => {
                                    const searchLower = studentSearchTerm.toLowerCase();
                                    return (
                                      student.name.toLowerCase().includes(searchLower) ||
                                      student.studentId.toLowerCase().includes(searchLower) ||
                                      student.grade.toLowerCase().includes(searchLower)
                                    );
                                  })
                                  .map(student => (
                                    <div key={student.id} className="flex items-center space-x-3 rounded-lg border border-slate-200 p-3">
                                      <Checkbox
                                        id={student.id}
                                        checked={formData.selectedStudents.includes(student.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setFormData({
                                              ...formData,
                                              selectedStudents: [...formData.selectedStudents, student.id]
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              selectedStudents: formData.selectedStudents.filter(id => id !== student.id)
                                            });
                                          }
                                        }}
                                      />
                                      <label htmlFor={student.id} className="flex-1 cursor-pointer">
                                        <p className="font-medium text-slate-900">{student.name}</p>
                                        <p className="text-sm text-slate-500">{student.grade} - ID: {student.studentId}</p>
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleEditUser({
                      name: formData.name,
                      grade: formData.grade,
                      studentId: formData.studentId,
                      selectedStudents: formData.selectedStudents,
                      phone: formData.phone,
                      allergies: formData.allergies,
                      medicalConditions: formData.medicalConditions,
                      immunizations: formData.immunizations,
                      height: formData.height,
                      weight: formData.weight,
                      age: formData.age,
                      sex: formData.sex
                    })}
                    className="flex-1 bg-gradient-to-r from-ndkc-green to-emerald-600"
                  >
                    Update Account
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-3xl font-bold text-slate-900">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700">Students</p>
                <p className="text-3xl font-bold text-emerald-900">{usersByRole.student.length}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Parents</p>
                <p className="text-3xl font-bold text-amber-900">{usersByRole.parent.length}</p>
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Staff</p>
                <p className="text-3xl font-bold text-blue-900">{usersByRole.nurse.length + usersByRole.admin.length}</p>
              </div>
              <Stethoscope className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 bg-white shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>System Users</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="border-b border-slate-100 px-6">
              <TabsList className="bg-transparent">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="student">Students</TabsTrigger>
                <TabsTrigger value="parent">Parents</TabsTrigger>
                <TabsTrigger value="nurse">Staff</TabsTrigger>
              </TabsList>
            </div>

            {(['all', 'student', 'parent', 'nurse'] as const).map(tab => (
              <TabsContent key={tab} value={tab} className="m-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <p className="text-slate-500">Loading users...</p>
                          </TableCell>
                        </TableRow>
                      ) : usersByRole[tab].length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <p className="text-slate-500">No users found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersByRole[tab].map(user => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                                  {getRoleIcon(user.role)}
                                </div>
                                <span className="font-medium text-slate-900">{user.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">{user.email}</TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {user.role === 'student' && user.grade && (
                                <span>{user.grade} - ID: {user.studentId}</span>
                              )}
                              {user.role === 'parent' && user.studentIds && (
                                <div className="flex items-center gap-1">
                                  <LinkIcon className="h-3 w-3" />
                                  <span>{user.studentIds.length} student(s)</span>
                                </div>
                              )}
                              {user.role === 'nurse' && <span>Clinic Staff</span>}
                              {user.role === 'admin' && <span>Full Access</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(user)}
                                  className="text-ndkc-green hover:bg-emerald-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.role !== 'admin' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Bulk Add Users Modal */}
      <BulkAddUsersModal
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        onSuccess={loadData}
      />
    </div>
  );
}