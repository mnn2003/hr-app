import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('payslips');
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    loadSystemSettings();
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
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

  const checkScrollButtons = () => {
    const tabsList = document.querySelector('.tabs-list-container');
    if (tabsList) {
      setShowScrollButtons(tabsList.scrollWidth > tabsList.clientWidth);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    const tabsList = document.querySelector('.tabs-list-container');
    if (tabsList) {
      const scrollAmount = 200;
      tabsList.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const tabLabels = {
    payslips: 'Payslips',
    tax: 'Tax',
    investment: 'Investments',
    loans: 'Loans',
    itr: 'ITR',
    reimbursements: 'Reimbursements',
    policies: 'Policies'
  };

  const mobileTabLabels = {
    payslips: 'Payslips',
    tax: 'Tax',
    investment: 'Invest',
    loans: 'Loans',
    itr: 'ITR',
    reimbursements: 'Claims',
    policies: 'Docs'
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        {userRole && <AppSidebar />}
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-20 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
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
            <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
              <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl">
                    Employee Self-Service Portal
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Manage your payslips, tax declarations, loans, and more
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-2">
                  <Tabs 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <div className="relative px-2 sm:px-4">
                      {showScrollButtons && (
                        <>
                          <button
                            onClick={() => scrollTabs('left')}
                            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-1 shadow-sm hidden sm:flex"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => scrollTabs('right')}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-1 shadow-sm hidden sm:flex"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <div className="tabs-list-container overflow-x-auto scrollbar-hide">
                        <TabsList className="w-full inline-flex h-auto p-1 gap-1 min-w-max">
                          {Object.entries(tabLabels).map(([value, label]) => (
                            <TabsTrigger
                              key={value}
                              value={value}
                              className={`
                                flex-1 min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm
                                whitespace-nowrap transition-all duration-200
                                ${isMobile ? 'min-w-[70px]' : 'min-w-[100px]'}
                              `}
                            >
                              <span className="hidden sm:inline">
                                {label}
                              </span>
                              <span className="sm:hidden text-xs font-medium">
                                {mobileTabLabels[value as keyof typeof mobileTabLabels]}
                              </span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    </div>

                    <div className="px-3 sm:px-4 py-4 sm:py-6">
                      <TabsContent value="payslips" className="mt-0">
                        <PayslipDownloads />
                      </TabsContent>

                      <TabsContent value="tax" className="mt-0">
                        <TaxDeclaration />
                      </TabsContent>

                      <TabsContent value="investment" className="mt-0">
                        <InvestmentProofs />
                      </TabsContent>

                      <TabsContent value="loans" className="mt-0">
                        <LoanApplications />
                      </TabsContent>

                      <TabsContent value="itr" className="mt-0">
                        <ITRAssistance />
                      </TabsContent>

                      <TabsContent value="reimbursements" className="mt-0">
                        <Reimbursements />
                      </TabsContent>

                      <TabsContent value="policies" className="mt-0">
                        <PolicyDocuments />
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Mobile Navigation Helper */}
              {isMobile && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-card border rounded-full shadow-lg px-4 py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-medium">{tabLabels[activeTab as keyof typeof tabLabels]}</span>
                    <span>•</span>
                    <span>Swipe to navigate</span>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </SidebarProvider>
  );
}
