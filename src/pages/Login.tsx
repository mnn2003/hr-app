import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';

const Login = () => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const email = `${employeeCode}@company.local`;
      
      // Login first
      await login(email, password);
      
      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('Login failed');
        return;
      }
      
      // Check if user is blocked
      const employeeDoc = await getDoc(doc(db, 'employees', currentUser.uid));
      if (employeeDoc.exists() && employeeDoc.data().isBlocked) {
        toast.error('Your account has been blocked. Please contact HR.');
        await logout();
        return;
      }
      
      // Check if password reset is pending
      const resetDoc = await getDoc(doc(db, 'password_resets', currentUser.uid));
      if (resetDoc.exists()) {
        // Reset password to employee code
        await updatePassword(currentUser, employeeCode);
        await deleteDoc(doc(db, 'password_resets', currentUser.uid));
        toast.success('Password has been reset to your employee code');
      }
      
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">HR Management System</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employee Code</label>
              <Input
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g., W0115"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
