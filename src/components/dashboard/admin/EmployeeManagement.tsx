import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser, updatePassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { UserPlus, Edit, Trash2, Search, Mail, Phone, MapPin, User, Briefcase, Shield, Lock, Ban, CheckCircle, KeyRound } from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone?: string;
  address?: string;
  role: UserRole;
  designation?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  departmentId?: string;
  departmentName?: string;
  salary?: number;
  experience?: number;
  userId: string;
  createdAt: string;
  isBlocked?: boolean;
  pan?: string;
}

interface Department {
  id: string;
  name: string;
}

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    email: '',
    phone: '',
    address: '',
    role: 'staff' as UserRole,
    designation: '',
    dateOfBirth: '',
    dateOfJoining: '',
    departmentId: '',
    salary: '',
    experience: '',
    pan: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'departments'));
      const deptData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Department[];
      setDepartments(deptData);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    const filtered = employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'employees'));
      const employeeData = await Promise.all(
        snapshot.docs.map(async (empDoc) => {
          const data = empDoc.data();
          let departmentName = '';
          
          if (data.departmentId) {
            try {
              const deptSnapshot = await getDocs(collection(db, 'departments'));
              const dept = deptSnapshot.docs.find(doc => doc.id === data.departmentId);
              if (dept) {
                departmentName = dept.data().name || '';
              }
            } catch (error) {
              console.error('Error fetching department name:', error);
            }
          }
          
          return {
            id: empDoc.id,
            ...data,
            departmentName
          } as Employee;
        })
      );
      setEmployees(employeeData);
      setFilteredEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate employee code (minimum 4 digits)
    if (formData.employeeCode.length < 4) {
      toast.error('Employee code must be at least 4 characters');
      return;
    }
    
    // Validate PAN (must be 10 characters)
    if (!isEditMode && formData.pan.length !== 10) {
      toast.error('PAN must be exactly 10 characters');
      return;
    }
    
    try {
      if (isEditMode && editingId) {
        // Update employee document
        await updateDoc(doc(db, 'employees', editingId), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          role: formData.role,
          designation: formData.designation,
          dateOfBirth: formData.dateOfBirth,
          dateOfJoining: formData.dateOfJoining,
          departmentId: formData.departmentId || null,
          salary: formData.salary ? Number(formData.salary) : null,
          experience: formData.experience ? Number(formData.experience) : null
        });
        
        // Get the userId from the employee document
        const employeeDoc = await getDoc(doc(db, 'employees', editingId));
        if (employeeDoc.exists()) {
          const userId = employeeDoc.data().userId;
          // Update role in user_roles collection
          await updateDoc(doc(db, 'user_roles', userId), {
            role: formData.role
          });
        }
        
        toast.success('Employee updated successfully!');
      } else {
        const email = `${formData.employeeCode}@company.local`;
        const password = formData.pan.toUpperCase();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'employees', userCredential.user.uid), {
          name: formData.name,
          employeeCode: formData.employeeCode,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          role: formData.role,
          designation: formData.designation,
          dateOfBirth: formData.dateOfBirth,
          dateOfJoining: formData.dateOfJoining,
          departmentId: formData.departmentId || null,
          salary: formData.salary ? Number(formData.salary) : null,
          experience: formData.experience ? Number(formData.experience) : null,
          pan: formData.pan.toUpperCase(),
          userId: userCredential.user.uid,
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, 'user_roles', userCredential.user.uid), {
          userId: userCredential.user.uid,
          role: formData.role
        });

        toast.success(`Employee added successfully!\nLogin: ${email}\nPassword: ${password}`, { duration: 6000 });
      }
      
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setFormData({ name: '', employeeCode: '', email: '', phone: '', address: '', role: 'staff', designation: '', dateOfBirth: '', dateOfJoining: '', departmentId: '', salary: '', experience: '', pan: '' });
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (emp: Employee) => {
    setFormData({
      name: emp.name,
      employeeCode: emp.employeeCode,
      email: emp.email,
      phone: emp.phone || '',
      address: emp.address || '',
      role: emp.role || 'staff',
      designation: emp.designation || '',
      dateOfBirth: emp.dateOfBirth || '',
      dateOfJoining: emp.dateOfJoining || '',
      departmentId: emp.departmentId || '',
      salary: emp.salary?.toString() || '',
      experience: emp.experience?.toString() || '',
      pan: emp.pan || ''
    });
    setEditingId(emp.id);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setFormData({ name: '', employeeCode: '', email: '', phone: '', address: '', role: 'staff', designation: '', dateOfBirth: '', dateOfJoining: '', departmentId: '', salary: '', experience: '', pan: '' });
    setIsEditMode(false);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        toast.success('Employee deleted successfully!');
        fetchEmployees();
      } catch (error) {
        toast.error('Failed to delete employee');
      }
    }
  };

  const handleBlockUnblock = async (emp: Employee) => {
    try {
      const newBlockedStatus = !emp.isBlocked;
      await updateDoc(doc(db, 'employees', emp.id), {
        isBlocked: newBlockedStatus
      });
      toast.success(`Employee ${newBlockedStatus ? 'blocked' : 'unblocked'} successfully!`);
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to update employee status');
    }
  };

  const handleResetPassword = async (emp: Employee) => {
    if (!confirm(`Reset password for ${emp.name} to their employee code (${emp.employeeCode})?`)) {
      return;
    }

    try {
      // Store reset request in Firestore
      await setDoc(doc(db, 'password_resets', emp.userId), {
        employeeCode: emp.employeeCode,
        requestedAt: new Date().toISOString(),
        userId: emp.userId
      });
      
      toast.success(
        `Password reset initiated. The employee should logout and login again with:\nUsername: ${emp.employeeCode}\nPassword: ${emp.employeeCode}`,
        { duration: 6000 }
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('Failed to reset password. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Employee Management</CardTitle>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">Employee Code</Label>
                    <Input
                      id="employeeCode"
                      placeholder="e.g., W0115 (minimum 4 characters)"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      required
                      disabled={isEditMode}
                      minLength={4}
                    />
                    {!isEditMode && (
                      <p className="text-xs text-muted-foreground">Minimum 4 characters - used as username</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input
                      id="pan"
                      placeholder="e.g., ABCDE1234F"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      required={!isEditMode}
                      maxLength={10}
                      minLength={10}
                      disabled={isEditMode}
                    />
                    <p className="text-xs text-muted-foreground">
                      {isEditMode ? 'PAN number (read-only)' : '10 characters - will be used as password (uppercase)'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="hod">HOD</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      placeholder="e.g., Software Engineer, Manager"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Personal Email</Label>
                    <Input
                      id="email"
                      placeholder="employee@email.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Full Address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfJoining">Date of Joining</Label>
                      <Input
                        id="dateOfJoining"
                        type="date"
                        value={formData.dateOfJoining}
                        onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departmentId">Department</Label>
                      <Select 
                        value={formData.departmentId} 
                        onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                      >
                        <SelectTrigger id="departmentId">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience (years)</Label>
                      <Input
                        id="experience"
                        type="number"
                        placeholder="Years of experience"
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="Monthly salary"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    {isEditMode ? 'Update Employee' : 'Add Employee'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold text-lg">{emp.name}</p>
                      <Badge variant="outline" className="text-xs">{emp.employeeCode}</Badge>
                      <Badge 
                        variant={emp.role === 'hr' || emp.role === 'hod' ? 'default' : 'secondary'}
                        className="text-xs capitalize"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {emp.role}
                      </Badge>
                      {emp.designation && (
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {emp.designation}
                        </Badge>
                      )}
                      {emp.departmentName && (
                        <Badge variant="outline" className="text-xs">
                          {emp.departmentName}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {emp.email && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {emp.email}
                        </p>
                      )}
                      {emp.phone && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {emp.phone}
                        </p>
                      )}
                      {emp.address && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {emp.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(emp)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={emp.isBlocked ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleBlockUnblock(emp)}
                      title={emp.isBlocked ? "Unblock User" : "Block User"}
                    >
                      {emp.isBlocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleResetPassword(emp)}
                      title="Reset Password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteEmployee(emp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {emp.isBlocked && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600 font-medium">This user is blocked from logging in</span>
                  </div>
                )}
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No employees found matching your search' : 'No employees added yet'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeManagement;
