import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NotificationBell from '@/components/notifications/NotificationBell';
import PayslipDownloads from '@/components/self-service/PayslipDownloads';
import TaxDeclaration from '@/components/self-service/TaxDeclaration';
import InvestmentProofs from '@/components/self-service/InvestmentProofs';
import LoanApplications from '@/components/self-service/LoanApplications';
import ITRAssistance from '@/components/self-service/ITRAssistance';
import Reimbursements from '@/components/self-service/Reimbursements';
import PolicyDocuments from '@/components/self-service/PolicyDocuments';

export default function SelfService() {
  const { userRole } = useAuth();
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
            <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Employee Self-Service Portal</CardTitle>
          <CardDescription>Manage your payslips, tax declarations, loans, and more</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Tabs defaultValue="payslips" className="w-full">
            <TabsList className="w-full inline-flex lg:grid lg:grid-cols-7 h-auto flex-wrap gap-1 p-1">
              <TabsTrigger value="payslips" className="flex-1 min-w-[120px] whitespace-nowrap">Payslips</TabsTrigger>
              <TabsTrigger value="tax" className="flex-1 min-w-[120px] whitespace-nowrap">Tax Declaration</TabsTrigger>
              <TabsTrigger value="investment" className="flex-1 min-w-[120px] whitespace-nowrap">Investment Proofs</TabsTrigger>
              <TabsTrigger value="loans" className="flex-1 min-w-[120px] whitespace-nowrap">Loans & Advances</TabsTrigger>
              <TabsTrigger value="itr" className="flex-1 min-w-[120px] whitespace-nowrap">ITR Assistance</TabsTrigger>
              <TabsTrigger value="reimbursements" className="flex-1 min-w-[120px] whitespace-nowrap">Reimbursements</TabsTrigger>
              <TabsTrigger value="policies" className="flex-1 min-w-[120px] whitespace-nowrap">Policy Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="payslips" className="mt-6">
              <PayslipDownloads />
            </TabsContent>

            <TabsContent value="tax" className="mt-6">
              <TaxDeclaration />
            </TabsContent>

            <TabsContent value="investment" className="mt-6">
              <InvestmentProofs />
            </TabsContent>

            <TabsContent value="loans" className="mt-6">
              <LoanApplications />
            </TabsContent>

            <TabsContent value="itr" className="mt-6">
              <ITRAssistance />
            </TabsContent>

            <TabsContent value="reimbursements" className="mt-6">
              <Reimbursements />
            </TabsContent>

            <TabsContent value="policies" className="mt-6">
              <PolicyDocuments />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
