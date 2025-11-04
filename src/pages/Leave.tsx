import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import LeaveTab from '@/components/dashboard/employee/LeaveTab';

const Leave = () => {
  const { userRole } = useAuth();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        {userRole && <AppSidebar />}
        
        <div className="flex-1 flex flex-col w-full">
          <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    HR
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-sm font-semibold">Leave</h1>
                    <p className="text-xs text-muted-foreground capitalize">{userRole || 'User'}</p>
                  </div>
                </div>
              </div>
              
              <SidebarTrigger className="hidden lg:flex" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
              <LeaveTab />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Leave;
