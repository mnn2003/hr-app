import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'react-hot-toast';
import { User, Lock, Upload } from 'lucide-react';

const ProfileTab = () => {
  const { user, changePassword } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    employeeCode: '',
    address: '',
    phone: '',
    profileImageUrl: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const profileDoc = await getDoc(doc(db, 'employees', user.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as any);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      await updateDoc(doc(db, 'employees', user!.uid), profile);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profile-photos/${user!.uid}`);
      await uploadBytes(storageRef, file);
      const profileImageUrl = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'employees', user!.uid), { profileImageUrl });
      setProfile({ ...profile, profileImageUrl });
      toast.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await changePassword(newPassword);
      toast.success('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={profile.profileImageUrl} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {profile.name?.charAt(0) || 'E'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Upload Profile Photo</label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="bg-muted/50"
                  />
                  <Button disabled={uploading} variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Employee Code</label>
              <Input 
                value={profile.employeeCode} 
                disabled 
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <Input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="bg-muted/50"
              />
            </div>
          </div>
          <Button onClick={handleUpdateProfile} size="lg" className="w-full md:w-auto">
            Update Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-gradient-to-r from-destructive/5 to-destructive/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-6 w-6 text-destructive" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-muted/50"
            />
          </div>
          <Button onClick={handleChangePassword} variant="destructive" size="lg" className="w-full md:w-auto">
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTab;
