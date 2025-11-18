import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser, updatePassword } from 'firebase/auth';
import { db, auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { UserPlus, Edit, Trash2, Search, Mail, Phone, MapPin, User, Briefcase, Shield, Lock, Ban, CheckCircle, KeyRound, Upload, FileSpreadsheet, Image as ImageIcon, MoreVertical, X, GraduationCap, Users, FileText, Heart, Eye } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { UserRole } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  profileImageUrl?: string;
  gender?: 'Male' | 'Female';
  // Contact Details
  currentAddress?: string;
  nativeAddress?: string;
  mobile?: string;
  // Personal Details
  akaName?: string;
  placeOfBirth?: string;
  nationality?: string;
  nameAsPerBankPassbook?: string;
  nameAsPerPAN?: string;
  nameAsPerAadhar?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  // Qualification
  qualification?: string;
  // Previous Experience
  previousExperience?: string;
  // Family Details
  familyDetails?: string;
  // Documents
  drivingLicense?: string;
  passport?: string;
  visa?: string;
  // Document URLs
  panCardUrl?: string;
  aadharCardUrl?: string;
  qualificationDocUrl?: string;
}

interface Department {
  id: string;
  name: string;
}

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [panCardFile, setPanCardFile] = useState<File | null>(null);
  const [aadharCardFile, setAadharCardFile] = useState<File | null>(null);
  const [qualificationDocFile, setQualificationDocFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const panCardInputRef = useRef<HTMLInputElement>(null);
  const aadharCardInputRef = useRef<HTMLInputElement>(null);
  const qualificationDocInputRef = useRef<HTMLInputElement>(null);
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
    pan: '',
    gender: '' as 'Male' | 'Female' | '',
    // Contact Details
    currentAddress: '',
    nativeAddress: '',
    mobile: '',
    // Personal Details
    akaName: '',
    placeOfBirth: '',
    nationality: '',
    nameAsPerBankPassbook: '',
    nameAsPerPAN: '',
    nameAsPerAadhar: '',
    bloodGroup: '',
    height: '',
    weight: '',
    // Qualification
    qualification: '',
    // Previous Experience
    previousExperience: '',
    // Family Details
    familyDetails: '',
    // Documents
    drivingLicense: '',
    passport: '',
    visa: ''
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadProfileImage = async (employeeId: string): Promise<string | null> => {
    if (!profileImage) return null;
    
    try {
      const storageRef = ref(storage, `profile_images/${employeeId}`);
      await uploadBytes(storageRef, profileImage);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload profile image');
      return null;
    }
  };

  const uploadDocument = async (file: File, employeeId: string, docType: string): Promise<string | null> => {
    if (!file) return null;
    
    try {
      const storageRef = ref(storage, `employee_documents/${employeeId}/${docType}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      toast.error(`Failed to upload ${docType}`);
      return null;
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
        // Upload files if changed
        let profileImageUrl = undefined;
        let panCardUrl = undefined;
        let aadharCardUrl = undefined;
        let qualificationDocUrl = undefined;
        
        if (profileImage) {
          profileImageUrl = await uploadProfileImage(editingId);
        }
        if (panCardFile) {
          panCardUrl = await uploadDocument(panCardFile, editingId, 'pan_card');
        }
        if (aadharCardFile) {
          aadharCardUrl = await uploadDocument(aadharCardFile, editingId, 'aadhar_card');
        }
        if (qualificationDocFile) {
          qualificationDocUrl = await uploadDocument(qualificationDocFile, editingId, 'qualification');
        }

        // Update employee document
        const updateData: any = {
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
          experience: formData.experience ? Number(formData.experience) : null,
          gender: formData.gender || null,
          // Contact Details
          currentAddress: formData.currentAddress,
          nativeAddress: formData.nativeAddress,
          mobile: formData.mobile,
          // Personal Details
          akaName: formData.akaName,
          placeOfBirth: formData.placeOfBirth,
          nationality: formData.nationality,
          nameAsPerBankPassbook: formData.nameAsPerBankPassbook,
          nameAsPerPAN: formData.nameAsPerPAN,
          nameAsPerAadhar: formData.nameAsPerAadhar,
          bloodGroup: formData.bloodGroup,
          height: formData.height,
          weight: formData.weight,
          // Qualification
          qualification: formData.qualification,
          // Previous Experience
          previousExperience: formData.previousExperience,
          // Family Details
          familyDetails: formData.familyDetails,
          // Documents
          drivingLicense: formData.drivingLicense,
          passport: formData.passport,
          visa: formData.visa
        };

        if (profileImageUrl) {
          updateData.profileImageUrl = profileImageUrl;
        }
        if (panCardUrl) {
          updateData.panCardUrl = panCardUrl;
        }
        if (aadharCardUrl) {
          updateData.aadharCardUrl = aadharCardUrl;
        }
        if (qualificationDocUrl) {
          updateData.qualificationDocUrl = qualificationDocUrl;
        }

        await updateDoc(doc(db, 'employees', editingId), updateData);
        
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
        
        // Upload all files
        const profileImageUrl = await uploadProfileImage(userCredential.user.uid);
        const panCardUrl = panCardFile ? await uploadDocument(panCardFile, userCredential.user.uid, 'pan_card') : null;
        const aadharCardUrl = aadharCardFile ? await uploadDocument(aadharCardFile, userCredential.user.uid, 'aadhar_card') : null;
        const qualificationDocUrl = qualificationDocFile ? await uploadDocument(qualificationDocFile, userCredential.user.uid, 'qualification') : null;

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
          gender: formData.gender || null,
          userId: userCredential.user.uid,
          createdAt: new Date().toISOString(),
          ...(profileImageUrl && { profileImageUrl }),
          ...(panCardUrl && { panCardUrl }),
          ...(aadharCardUrl && { aadharCardUrl }),
          ...(qualificationDocUrl && { qualificationDocUrl }),
          // Contact Details
          currentAddress: formData.currentAddress,
          nativeAddress: formData.nativeAddress,
          mobile: formData.mobile,
          // Personal Details
          akaName: formData.akaName,
          placeOfBirth: formData.placeOfBirth,
          nationality: formData.nationality,
          nameAsPerBankPassbook: formData.nameAsPerBankPassbook,
          nameAsPerPAN: formData.nameAsPerPAN,
          nameAsPerAadhar: formData.nameAsPerAadhar,
          bloodGroup: formData.bloodGroup,
          height: formData.height,
          weight: formData.weight,
          // Qualification
          qualification: formData.qualification,
          // Previous Experience
          previousExperience: formData.previousExperience,
          // Family Details
          familyDetails: formData.familyDetails,
          // Documents
          drivingLicense: formData.drivingLicense,
          passport: formData.passport,
          visa: formData.visa
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
      setProfileImage(null);
      setProfileImagePreview('');
      setPanCardFile(null);
      setAadharCardFile(null);
      setQualificationDocFile(null);
      setFormData({ 
        name: '', employeeCode: '', email: '', phone: '', address: '', role: 'staff', 
        designation: '', dateOfBirth: '', dateOfJoining: '', departmentId: '', salary: '', 
        experience: '', pan: '', gender: '', currentAddress: '', nativeAddress: '', mobile: '', 
        akaName: '', placeOfBirth: '', nationality: '', nameAsPerBankPassbook: '', 
        nameAsPerPAN: '', nameAsPerAadhar: '', bloodGroup: '', height: '', weight: '', 
        qualification: '', previousExperience: '', familyDetails: '', drivingLicense: '', 
        passport: '', visa: '' 
      });
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
      pan: emp.pan || '',
      gender: emp.gender || '',
      // Contact Details
      currentAddress: emp.currentAddress || '',
      nativeAddress: emp.nativeAddress || '',
      mobile: emp.mobile || '',
      // Personal Details
      akaName: emp.akaName || '',
      placeOfBirth: emp.placeOfBirth || '',
      nationality: emp.nationality || '',
      nameAsPerBankPassbook: emp.nameAsPerBankPassbook || '',
      nameAsPerPAN: emp.nameAsPerPAN || '',
      nameAsPerAadhar: emp.nameAsPerAadhar || '',
      bloodGroup: emp.bloodGroup || '',
      height: emp.height || '',
      weight: emp.weight || '',
      // Qualification
      qualification: emp.qualification || '',
      // Previous Experience
      previousExperience: emp.previousExperience || '',
      // Family Details
      familyDetails: emp.familyDetails || '',
      // Documents
      drivingLicense: emp.drivingLicense || '',
      passport: emp.passport || '',
      visa: emp.visa || ''
    });
    setProfileImagePreview(emp.profileImageUrl || '');
    setEditingId(emp.id);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setFormData({ 
      name: '', employeeCode: '', email: '', phone: '', address: '', role: 'staff', 
      designation: '', dateOfBirth: '', dateOfJoining: '', departmentId: '', salary: '', 
      experience: '', pan: '', gender: '', currentAddress: '', nativeAddress: '', mobile: '', 
      akaName: '', placeOfBirth: '', nationality: '', nameAsPerBankPassbook: '', 
      nameAsPerPAN: '', nameAsPerAadhar: '', bloodGroup: '', height: '', weight: '', 
      qualification: '', previousExperience: '', familyDetails: '', drivingLicense: '', 
      passport: '', visa: '' 
    });
    setProfileImage(null);
    setProfileImagePreview('');
    setPanCardFile(null);
    setAadharCardFile(null);
    setQualificationDocFile(null);
    setIsEditMode(false);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleDownloadTemplate = () => {
    try {
      // Create template data with all fields from formData
      const templateHeaders = {
        name: 'Employee Name',
        employeeCode: 'Employee Code',
        email: 'Email',
        phone: 'Phone',
        address: 'Address',
        role: 'Role (staff/hr/hod/intern)',
        designation: 'Designation',
        dateOfBirth: 'Date of Birth (YYYY-MM-DD)',
        dateOfJoining: 'Date of Joining (YYYY-MM-DD)',
        departmentId: 'Department ID',
        salary: 'Salary',
        experience: 'Experience (years)',
        pan: 'PAN Number',
        gender: 'Gender (Male/Female)',
        currentAddress: 'Current Address',
        nativeAddress: 'Native Address',
        mobile: 'Mobile Number',
        akaName: 'Also Known As',
        placeOfBirth: 'Place of Birth',
        nationality: 'Nationality',
        nameAsPerBankPassbook: 'Name as per Bank Passbook',
        nameAsPerPAN: 'Name as per PAN',
        nameAsPerAadhar: 'Name as per Aadhar',
        bloodGroup: 'Blood Group',
        height: 'Height',
        weight: 'Weight',
        qualification: 'Qualification',
        previousExperience: 'Previous Experience',
        familyDetails: 'Family Details',
        drivingLicense: 'Driving License',
        passport: 'Passport',
        visa: 'Visa'
      };

      // Create sample data row with instructions
      const sampleData = {
        name: 'John Doe',
        employeeCode: 'EMP001',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: '123 Main St, City',
        role: 'staff',
        designation: 'Software Engineer',
        dateOfBirth: '1990-01-15',
        dateOfJoining: '2023-01-01',
        departmentId: 'dept-id-here',
        salary: '50000',
        experience: '5',
        pan: 'ABCDE1234F',
        gender: 'Male',
        currentAddress: '123 Main St, City',
        nativeAddress: '456 Home St, Town',
        mobile: '+1234567890',
        akaName: 'Johnny',
        placeOfBirth: 'City Name',
        nationality: 'Country Name',
        nameAsPerBankPassbook: 'John Doe',
        nameAsPerPAN: 'John Doe',
        nameAsPerAadhar: 'John Doe',
        bloodGroup: 'O+',
        height: '175 cm',
        weight: '70 kg',
        qualification: 'Bachelor of Engineering',
        previousExperience: 'Worked at Company XYZ for 3 years',
        familyDetails: 'Father: John Sr., Mother: Jane',
        drivingLicense: 'DL1234567890',
        passport: 'P1234567',
        visa: 'V1234567'
      };

      // Create workbook with headers and sample data
      const worksheet = XLSX.utils.json_to_sheet([sampleData], {
        header: Object.keys(templateHeaders)
      });

      // Replace first row with descriptive headers
      Object.keys(templateHeaders).forEach((key, index) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
        worksheet[cellAddress].v = templateHeaders[key as keyof typeof templateHeaders];
      });

      // Set column widths
      const columnWidths = Object.keys(templateHeaders).map(() => ({ wch: 20 }));
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Template');

      // Generate and download file
      const fileName = `Employee_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to generate template');
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header row
        
        try {
          // Extract and validate employee code (match template headers with spaces)
          const employeeCode = row['Employee Code'] || row.employeeCode || row.EmployeeCode;
          if (!employeeCode || typeof employeeCode !== 'string' || employeeCode.trim() === '') {
            errors.push(`Row ${rowNumber}: Missing or invalid Employee Code`);
            errorCount++;
            continue;
          }

          // Extract and validate PAN (match template headers)
          const pan = row['PAN Number'] || row.pan || row.PAN;
          if (!pan || typeof pan !== 'string') {
            errors.push(`Row ${rowNumber} (${employeeCode}): Missing PAN Number`);
            errorCount++;
            continue;
          }
          
          const panStr = String(pan).trim();
          if (panStr.length !== 10) {
            errors.push(`Row ${rowNumber} (${employeeCode}): PAN must be exactly 10 characters (found: ${panStr.length})`);
            errorCount++;
            continue;
          }

          // Validate name (match template headers)
          const name = row['Employee Name'] || row.name || row.Name;
          if (!name || typeof name !== 'string' || name.trim() === '') {
            errors.push(`Row ${rowNumber} (${employeeCode}): Missing Employee Name`);
            errorCount++;
            continue;
          }
          
          const email = `${employeeCode.trim()}@company.local`;
          const password = panStr.toUpperCase();

          // Try to create Firebase auth user
          let userCredential;
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
              errors.push(`Row ${rowNumber} (${employeeCode}): Employee already exists in system`);
            } else if (authError.code === 'auth/invalid-email') {
              errors.push(`Row ${rowNumber} (${employeeCode}): Invalid email format`);
            } else if (authError.code === 'auth/weak-password') {
              errors.push(`Row ${rowNumber} (${employeeCode}): Password too weak`);
            } else {
              errors.push(`Row ${rowNumber} (${employeeCode}): Authentication error - ${authError.message}`);
            }
            errorCount++;
            continue;
          }
          
          const employeeData = {
            name: String(name).trim(),
            employeeCode: employeeCode.trim(),
            email: row['Email'] || row.email || row.Email || '',
            phone: row['Phone'] || row.phone || row.Phone || '',
            address: row['Address'] || row.address || row.Address || '',
            role: (row['Role (staff/hr/hod/intern)'] || row.role || row.Role || 'staff') as UserRole,
            designation: row['Designation'] || row.designation || row.Designation || '',
            dateOfBirth: row['Date of Birth (YYYY-MM-DD)'] || row.dateOfBirth || row.DateOfBirth || '',
            dateOfJoining: row['Date of Joining (YYYY-MM-DD)'] || row.dateOfJoining || row.DateOfJoining || '',
            departmentId: row['Department ID'] || row.departmentId || row.DepartmentId || null,
            salary: row['Salary'] || row.salary || row.Salary || null,
            experience: row['Experience (years)'] || row.experience || row.Experience || null,
            pan: panStr.toUpperCase(),
            gender: row['Gender (Male/Female)'] || row.gender || row.Gender || null,
            currentAddress: row['Current Address'] || row.currentAddress || row.CurrentAddress || '',
            nativeAddress: row['Native Address'] || row.nativeAddress || row.NativeAddress || '',
            mobile: row['Mobile Number'] || row.mobile || row.Mobile || '',
            akaName: row['Also Known As'] || row.akaName || row.AkaName || '',
            placeOfBirth: row['Place of Birth'] || row.placeOfBirth || row.PlaceOfBirth || '',
            nationality: row['Nationality'] || row.nationality || row.Nationality || '',
            nameAsPerBankPassbook: row['Name as per Bank Passbook'] || row.nameAsPerBankPassbook || row.NameAsPerBankPassbook || '',
            nameAsPerPAN: row['Name as per PAN'] || row.nameAsPerPAN || row.NameAsPerPAN || '',
            nameAsPerAadhar: row['Name as per Aadhar'] || row.nameAsPerAadhar || row.NameAsPerAadhar || '',
            bloodGroup: row['Blood Group'] || row.bloodGroup || row.BloodGroup || '',
            height: row['Height'] || row.height || row.Height || '',
            weight: row['Weight'] || row.weight || row.Weight || '',
            qualification: row['Qualification'] || row.qualification || row.Qualification || '',
            previousExperience: row['Previous Experience'] || row.previousExperience || row.PreviousExperience || '',
            familyDetails: row['Family Details'] || row.familyDetails || row.FamilyDetails || '',
            drivingLicense: row['Driving License'] || row.drivingLicense || row.DrivingLicense || '',
            passport: row['Passport'] || row.passport || row.Passport || '',
            visa: row['Visa'] || row.visa || row.Visa || '',
            userId: userCredential.user.uid,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'employees', userCredential.user.uid), employeeData);
          await setDoc(doc(db, 'user_roles', userCredential.user.uid), {
            userId: userCredential.user.uid,
            role: employeeData.role
          });

          successCount++;
        } catch (error: any) {
          console.error(`Error importing row ${rowNumber}:`, error);
          errors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Import completed: ${successCount} successful, ${errorCount} failed`);
      } else {
        toast.error(`Import failed: ${errorCount} errors`);
      }

      // Log detailed errors
      if (errors.length > 0) {
        console.error('Import errors:', errors);
        toast.error(
          <div className="max-h-60 overflow-y-auto">
            <p className="font-semibold mb-2">Import Errors:</p>
            <ul className="text-xs space-y-1">
              {errors.slice(0, 10).map((err, idx) => (
                <li key={idx}>• {err}</li>
              ))}
              {errors.length > 10 && <li>... and {errors.length - 10} more errors (check console)</li>}
            </ul>
          </div>,
          { duration: 10000 }
        );
      }

      fetchEmployees();
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Failed to read Excel file');
    }
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

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <Card className="w-full">
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4">
          <CardTitle className="text-xl sm:text-2xl">Employee Management</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-2 text-base"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleExcelImport}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                className="flex-1 sm:flex-none text-sm"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => excelInputRef.current?.click()}
                className="flex-1 sm:flex-none text-sm"
                size="sm"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Import Excel</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={handleAddNew}
                    className="flex-1 sm:flex-none text-sm"
                    size="sm"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Employee</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                  <DialogHeader className="pb-4">
                    <DialogTitle className="text-lg sm:text-xl">
                      {isEditMode ? 'Edit Employee' : 'Add New Employee'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Profile Image</Label>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                          <AvatarImage src={profileImagePreview} />
                          <AvatarFallback>
                            <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 w-full sm:w-auto">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full sm:w-auto"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Image
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1 text-center sm:text-left">Max 5MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          placeholder="e.g., W0115"
                          value={formData.employeeCode}
                          onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                          required
                          disabled={isEditMode}
                          minLength={4}
                        />
                        {!isEditMode && (
                          <p className="text-xs text-muted-foreground">Min 4 chars - used as username</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          {isEditMode ? 'PAN (read-only)' : '10 chars - used as password'}
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={formData.gender} onValueChange={(value: 'Male' | 'Female') => setFormData({ ...formData, gender: value })}>
                          <SelectTrigger id="gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    {/* Contact Details Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Contact Details
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="mobile">Mobile Number</Label>
                          <Input
                            id="mobile"
                            placeholder="Mobile number"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentAddress">Current Address</Label>
                          <Textarea
                            id="currentAddress"
                            placeholder="Current residential address"
                            value={formData.currentAddress}
                            onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nativeAddress">Native Address</Label>
                          <Textarea
                            id="nativeAddress"
                            placeholder="Native/Permanent address"
                            value={formData.nativeAddress}
                            onChange={(e) => setFormData({ ...formData, nativeAddress: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Personal Details Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Heart className="h-5 w-5 text-primary" />
                        Personal Details
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="akaName">A.K.A. Name</Label>
                          <Input
                            id="akaName"
                            placeholder="Also Known As"
                            value={formData.akaName}
                            onChange={(e) => setFormData({ ...formData, akaName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="placeOfBirth">Place of Birth</Label>
                          <Input
                            id="placeOfBirth"
                            placeholder="City, State"
                            value={formData.placeOfBirth}
                            onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nationality">Nationality</Label>
                          <Input
                            id="nationality"
                            placeholder="e.g., Indian"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nameAsPerBankPassbook">Name as per Bank Passbook</Label>
                          <Input
                            id="nameAsPerBankPassbook"
                            placeholder="As per bank records"
                            value={formData.nameAsPerBankPassbook}
                            onChange={(e) => setFormData({ ...formData, nameAsPerBankPassbook: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nameAsPerPAN">Name as per PAN Card</Label>
                          <Input
                            id="nameAsPerPAN"
                            placeholder="As per PAN card"
                            value={formData.nameAsPerPAN}
                            onChange={(e) => setFormData({ ...formData, nameAsPerPAN: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nameAsPerAadhar">Name as per Aadhar Card</Label>
                          <Input
                            id="nameAsPerAadhar"
                            placeholder="As per Aadhar card"
                            value={formData.nameAsPerAadhar}
                            onChange={(e) => setFormData({ ...formData, nameAsPerAadhar: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bloodGroup">Blood Group</Label>
                          <Input
                            id="bloodGroup"
                            placeholder="e.g., A+ve"
                            value={formData.bloodGroup}
                            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="height">Height (cm)</Label>
                          <Input
                            id="height"
                            type="number"
                            placeholder="Height in cm"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (kg)</Label>
                          <Input
                            id="weight"
                            type="number"
                            placeholder="Weight in kg"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Qualification Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        Qualification
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="qualification">Educational Qualification</Label>
                        <Textarea
                          id="qualification"
                          placeholder="List educational qualifications..."
                          value={formData.qualification}
                          onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Previous Experience Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Previous Experience
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="previousExperience">Work Experience</Label>
                        <Textarea
                          id="previousExperience"
                          placeholder="List previous work experience..."
                          value={formData.previousExperience}
                          onChange={(e) => setFormData({ ...formData, previousExperience: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Family Details Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Family Details
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="familyDetails">Family Information</Label>
                        <Textarea
                          id="familyDetails"
                          placeholder="Provide family details..."
                          value={formData.familyDetails}
                          onChange={(e) => setFormData({ ...formData, familyDetails: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Documents Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Documents
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="drivingLicense">Driving License Number</Label>
                          <Input
                            id="drivingLicense"
                            placeholder="DL number"
                            value={formData.drivingLicense}
                            onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="passport">Passport Number</Label>
                          <Input
                            id="passport"
                            placeholder="Passport number"
                            value={formData.passport}
                            onChange={(e) => setFormData({ ...formData, passport: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="visa">VISA Number</Label>
                          <Input
                            id="visa"
                            placeholder="VISA number"
                            value={formData.visa}
                            onChange={(e) => setFormData({ ...formData, visa: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      {/* Document Uploads */}
                      <div className="space-y-4 mt-4">
                        <h4 className="text-sm font-semibold">Upload Documents</h4>
                        
                        {/* PAN Card Upload */}
                        <div className="space-y-2">
                          <Label>PAN Card</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={panCardInputRef}
                              onChange={(e) => setPanCardFile(e.target.files?.[0] || null)}
                              accept="image/*,application/pdf"
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => panCardInputRef.current?.click()}
                              className="flex-1"
                              size="sm"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {panCardFile ? panCardFile.name : 'Choose File'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">PDF or Image (Max 10MB)</p>
                        </div>

                        {/* Aadhar Card Upload */}
                        <div className="space-y-2">
                          <Label>Aadhar Card</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={aadharCardInputRef}
                              onChange={(e) => setAadharCardFile(e.target.files?.[0] || null)}
                              accept="image/*,application/pdf"
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => aadharCardInputRef.current?.click()}
                              className="flex-1"
                              size="sm"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {aadharCardFile ? aadharCardFile.name : 'Choose File'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">PDF or Image (Max 10MB)</p>
                        </div>

                        {/* Qualification Document Upload */}
                        <div className="space-y-2">
                          <Label>Qualification Certificate</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={qualificationDocInputRef}
                              onChange={(e) => setQualificationDocFile(e.target.files?.[0] || null)}
                              accept="image/*,application/pdf"
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => qualificationDocInputRef.current?.click()}
                              className="flex-1"
                              size="sm"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {qualificationDocFile ? qualificationDocFile.name : 'Choose File'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">PDF or Image (Max 10MB)</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full text-sm sm:text-base py-2.5">
                      {isEditMode ? 'Update Employee' : 'Add Employee'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="p-3 sm:p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors bg-card">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarImage src={emp.profileImageUrl} />
                      <AvatarFallback className="text-xs sm:text-sm">
                        <User className="h-4 w-4 sm:h-6 sm:w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <p className="font-semibold text-base sm:text-lg truncate">{emp.name}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {emp.employeeCode}
                          </Badge>
                          <Badge 
                            variant={emp.role === 'hr' || emp.role === 'hod' ? 'default' : 'secondary'}
                            className="text-xs px-1.5 py-0 capitalize"
                          >
                            <Shield className="h-2.5 w-2.5 mr-1 hidden sm:inline" />
                            {emp.role}
                          </Badge>
                        </div>
                      </div>
                      
                      {emp.designation && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{emp.designation}</span>
                        </div>
                      )}
                      
                      {emp.departmentName && (
                        <Badge variant="outline" className="text-xs">
                          {emp.departmentName}
                        </Badge>
                      )}
                      
                      <div className="space-y-1 text-xs sm:text-sm">
                        {emp.email && (
                          <p className="flex items-center gap-2 text-muted-foreground truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{emp.email}</span>
                          </p>
                        )}
                        {emp.phone && (
                          <p className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {emp.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Dropdown Menu */}
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate(`/employees/${emp.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(emp)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBlockUnblock(emp)}>
                          {emp.isBlocked ? (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          ) : (
                            <Ban className="h-4 w-4 mr-2" />
                          )}
                          {emp.isBlocked ? 'Unblock' : 'Block'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(emp)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Desktop Button Group */}
                  <div className="hidden sm:flex gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${emp.id}`)} title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(emp)} title="Edit">
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
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteEmployee(emp.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {emp.isBlocked && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
                    <Ban className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-red-600 font-medium">
                      This user is blocked from logging in
                    </span>
                  </div>
                )}
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted mb-3 sm:mb-4">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {searchTerm ? 'No employees found matching your search' : 'No employees added yet'}
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={clearSearch}
                    className="mt-3"
                    size="sm"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeManagement;
