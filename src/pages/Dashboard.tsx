import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Menu } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NotificationBell from '@/components/notifications/NotificationBell';
import LoginNotificationModal from '@/components/notifications/LoginNotificationModal';

const Dashboard = () => {
  const { userRole, user } = useAuth();
  const isMobile = useIsMobile();
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'HR System',
    logoUrl: ''
  });

  useEffect(() => {
    loadSystemSettings();
  }, []);

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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <LoginNotificationModal />
      <div className="flex min-h-screen w-full bg-background">
        {userRole && <AppSidebar />}
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  {systemSettings.logoUrl ? (
                    <img 
                      src={systemSettings.logoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      HR
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <h1 className="text-sm font-semibold">{systemSettings.systemName}</h1>
                    <p className="text-xs text-muted-foreground capitalize">{userRole || 'User'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <NotificationBell />
                <SidebarTrigger className="hidden lg:flex" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
              {!userRole ? (
                <Card className="max-w-md mx-auto mt-8">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                      <AlertCircle className="h-12 w-12 text-destructive" />
                      <div>
                        <h3 className="font-semibold text-lg">Role Not Assigned</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Your account doesn't have a role assigned. Please contact your administrator.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          User ID: {user?.uid}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {(userRole === 'staff' || userRole === 'intern') && <EmployeeDashboard />}
                  {(userRole === 'hr' || userRole === 'hod') && <AdminDashboard />}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
