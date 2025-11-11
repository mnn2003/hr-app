import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Upload, Image as ImageIcon } from 'lucide-react';
import NotificationManager from '@/components/notifications/NotificationManager';

interface Preferences {
  menuPreferences: {
    overview: boolean;
    profile: boolean;
    attendance: boolean;
    report: boolean;
    leave: boolean;
    salary: boolean;
    employees: boolean;
    departments: boolean;
    leaveApprovals: boolean;
    attendanceManagement: boolean;
    holidays: boolean;
    salarySlips: boolean;
  };
  dashboardWidgets: {
    birthdayWidget: boolean;
    todayAttendance: boolean;
    profileCard: boolean;
    workStats: boolean;
    teamStats: boolean;
    quickActions: boolean;
    statsCards: boolean;
    recentActivity: boolean;
  };
}

const DashboardSettings = () => {
  const { user, userRole } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>({
    menuPreferences: {
      overview: true,
      profile: true,
      attendance: true,
      report: true,
      leave: true,
      salary: true,
      employees: true,
      departments: true,
      leaveApprovals: true,
      attendanceManagement: true,
      holidays: true,
      salarySlips: true,
    },
    dashboardWidgets: {
      birthdayWidget: true,
      todayAttendance: true,
      profileCard: true,
      workStats: true,
      teamStats: true,
      quickActions: true,
      statsCards: true,
      recentActivity: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'HR Management System',
    logoUrl: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isHrOrHod = userRole === 'hr' || userRole === 'hod';
  const isEmployee = userRole === 'staff' || userRole === 'intern';

  useEffect(() => {
    loadPreferences();
    if (userRole === 'hr') {
      loadSystemSettings();
    }
  }, [user, userRole]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));
      if (prefsDoc.exists()) {
        setPreferences(prev => ({
          ...prev,
          ...prefsDoc.data()
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
      if (settingsDoc.exists()) {
        setSystemSettings(settingsDoc.data() as any);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'user_preferences', user.uid), {
        ...preferences,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
      toast.success('Settings saved successfully!');
      window.location.reload(); // Reload to apply changes
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuPreference = (key: keyof typeof preferences.menuPreferences) => {
    setPreferences(prev => ({
      ...prev,
      menuPreferences: {
        ...prev.menuPreferences,
        [key]: !prev.menuPreferences[key]
      }
    }));
  };

  const toggleWidgetPreference = (key: keyof typeof preferences.dashboardWidgets) => {
    setPreferences(prev => ({
      ...prev,
      dashboardWidgets: {
        ...prev.dashboardWidgets,
        [key]: !prev.dashboardWidgets[key]
      }
    }));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      toast.error('Please select a logo file');
      return;
    }
    setUploadingLogo(true);
    try {
      const logoRef = ref(storage, `system/logo-${Date.now()}`);
      await uploadBytes(logoRef, logoFile);
      const logoUrl = await getDownloadURL(logoRef);
      
      await setDoc(doc(db, 'system_settings', 'general'), {
        ...systemSettings,
        logoUrl,
        updatedAt: new Date().toISOString()
      });
      
      setSystemSettings(prev => ({ ...prev, logoUrl }));
      setLogoFile(null);
      toast.success('Logo uploaded successfully!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveSystemSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'system_settings', 'general'), {
        ...systemSettings,
        updatedAt: new Date().toISOString()
      });
      toast.success('System settings saved successfully!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast.error('Failed to save system settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">Dashboard Settings</h2>
        <p className="text-muted-foreground mt-1">Customize your dashboard experience</p>
      </div>

      {userRole === 'hr' && (
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Manage system logo and name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="system-name">System Name</Label>
              <Input
                id="system-name"
                value={systemSettings.systemName}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, systemName: e.target.value }))}
                placeholder="Enter system name"
              />
            </div>

            <div className="space-y-2">
              <Label>System Logo</Label>
              {systemSettings.logoUrl && (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                  <img 
                    src={systemSettings.logoUrl} 
                    alt="System Logo" 
                    className="w-16 h-16 object-contain rounded"
                  />
                  <p className="text-sm text-muted-foreground">Current logo</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button
                  onClick={handleLogoUpload}
                  disabled={!logoFile || uploadingLogo}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingLogo ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Upload a logo image (PNG, JPG, etc.)</p>
            </div>

            <Button onClick={saveSystemSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save System Settings'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Menu Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Items</CardTitle>
            <CardDescription>Select which menu items to display in the sidebar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="menu-overview">Overview</Label>
              <Switch
                id="menu-overview"
                checked={preferences.menuPreferences.overview}
                onCheckedChange={() => toggleMenuPreference('overview')}
              />
            </div>

            {isEmployee && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-profile">Profile</Label>
                  <Switch
                    id="menu-profile"
                    checked={preferences.menuPreferences.profile}
                    onCheckedChange={() => toggleMenuPreference('profile')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-report">Report</Label>
                  <Switch
                    id="menu-report"
                    checked={preferences.menuPreferences.report}
                    onCheckedChange={() => toggleMenuPreference('report')}
                  />
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="menu-attendance">Attendance</Label>
              <Switch
                id="menu-attendance"
                checked={preferences.menuPreferences.attendance}
                onCheckedChange={() => toggleMenuPreference('attendance')}
              />
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="menu-leave">Leave</Label>
              <Switch
                id="menu-leave"
                checked={preferences.menuPreferences.leave}
                onCheckedChange={() => toggleMenuPreference('leave')}
              />
            </div>

            {isEmployee && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-salary">Salary</Label>
                  <Switch
                    id="menu-salary"
                    checked={preferences.menuPreferences.salary}
                    onCheckedChange={() => toggleMenuPreference('salary')}
                  />
                </div>
              </>
            )}

            {userRole === 'hr' && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-employees">Employees</Label>
                  <Switch
                    id="menu-employees"
                    checked={preferences.menuPreferences.employees}
                    onCheckedChange={() => toggleMenuPreference('employees')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-departments">Departments</Label>
                  <Switch
                    id="menu-departments"
                    checked={preferences.menuPreferences.departments}
                    onCheckedChange={() => toggleMenuPreference('departments')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-attendance-mgmt">Attendance Management</Label>
                  <Switch
                    id="menu-attendance-mgmt"
                    checked={preferences.menuPreferences.attendanceManagement}
                    onCheckedChange={() => toggleMenuPreference('attendanceManagement')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-holidays">Holidays</Label>
                  <Switch
                    id="menu-holidays"
                    checked={preferences.menuPreferences.holidays}
                    onCheckedChange={() => toggleMenuPreference('holidays')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-salary-slips">Salary Slips</Label>
                  <Switch
                    id="menu-salary-slips"
                    checked={preferences.menuPreferences.salarySlips}
                    onCheckedChange={() => toggleMenuPreference('salarySlips')}
                  />
                </div>
              </>
            )}

            {isHrOrHod && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="menu-leave-approvals">Leave Approvals</Label>
                  <Switch
                    id="menu-leave-approvals"
                    checked={preferences.menuPreferences.leaveApprovals}
                    onCheckedChange={() => toggleMenuPreference('leaveApprovals')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Widgets */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Widgets</CardTitle>
            <CardDescription>Choose which widgets to display on your overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-birthday">Birthday Widget</Label>
              <Switch
                id="widget-birthday"
                checked={preferences.dashboardWidgets.birthdayWidget}
                onCheckedChange={() => toggleWidgetPreference('birthdayWidget')}
              />
            </div>

            {isEmployee && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-today-attendance">Today's Attendance</Label>
                  <Switch
                    id="widget-today-attendance"
                    checked={preferences.dashboardWidgets.todayAttendance}
                    onCheckedChange={() => toggleWidgetPreference('todayAttendance')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-profile">Profile Card</Label>
                  <Switch
                    id="widget-profile"
                    checked={preferences.dashboardWidgets.profileCard}
                    onCheckedChange={() => toggleWidgetPreference('profileCard')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-work-stats">Work Statistics</Label>
                  <Switch
                    id="widget-work-stats"
                    checked={preferences.dashboardWidgets.workStats}
                    onCheckedChange={() => toggleWidgetPreference('workStats')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-team-stats">Team Statistics</Label>
                  <Switch
                    id="widget-team-stats"
                    checked={preferences.dashboardWidgets.teamStats}
                    onCheckedChange={() => toggleWidgetPreference('teamStats')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-quick-actions">Quick Actions</Label>
                  <Switch
                    id="widget-quick-actions"
                    checked={preferences.dashboardWidgets.quickActions}
                    onCheckedChange={() => toggleWidgetPreference('quickActions')}
                  />
                </div>
              </>
            )}

            {isHrOrHod && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-stats-cards">Statistics Cards</Label>
                  <Switch
                    id="widget-stats-cards"
                    checked={preferences.dashboardWidgets.statsCards}
                    onCheckedChange={() => toggleWidgetPreference('statsCards')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-recent-activity">Recent Activity</Label>
                  <Switch
                    id="widget-recent-activity"
                    checked={preferences.dashboardWidgets.recentActivity}
                    onCheckedChange={() => toggleWidgetPreference('recentActivity')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-quick-actions-admin">Quick Actions</Label>
                  <Switch
                    id="widget-quick-actions-admin"
                    checked={preferences.dashboardWidgets.quickActions}
                    onCheckedChange={() => toggleWidgetPreference('quickActions')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {userRole === 'hr' && (
        <NotificationManager />
      )}

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={loading} size="lg">
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default DashboardSettings;
