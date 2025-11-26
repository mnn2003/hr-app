import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft, ChevronRight, Download, FileText, Shield, DollarSign, Receipt, Home, Briefcase } from 'lucide-react';
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
  const tabsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSystemSettings();
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, []);

  useEffect(() => {
    checkScrollButtons();
  }, [activeTab]);

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
    if (tabsListRef.current) {
      const { scrollWidth, clientWidth } = tabsListRef.current;
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsListRef.current) {
      const scrollAmount = 200;
      tabsListRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'payslips':
        return <Download className="h-4 w-4" />;
      case 'tax':
        return <Receipt className="h-4 w-4" />;
      case 'investment':
        return <DollarSign className="h-4 w-4" />;
      case 'loans':
        return <Briefcase className="h-4 w-4" />;
      case 'itr':
        return <FileText className="h-4 w-4" />;
      case 'reimbursements':
        return <Home className="h-4 w-4" />;
      case 'policies':
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const tabLabels = {
    payslips: { full: 'Payslips', short: 'Payslips' },
    tax: { full: 'Tax Declaration', short: 'Tax' },
    investment: { full: 'Investment Proofs', short: 'Investments' },
    loans: { full: 'Loan Applications', short: 'Loans' },
    itr: { full: 'ITR Assistance', short: 'ITR' },
    reimbursements: { full: 'Reimbursements', short: 'Claims' },
    policies: { full: 'Policy Documents', short: 'Policies' }
  };

  const mobileTabLabels = {
    payslips: 'Payslip',
    tax: 'Tax',
    investment: 'Invest',
    loans: 'Loan',
    itr: 'ITR',
    reimbursements: 'Claim',
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
              {/* Quick Stats Bar - Mobile Only */}
              {isMobile && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-lg">5</div>
                      <div className="text-muted-foreground">Documents</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg">2</div>
                      <div className="text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg">3</div>
                      <div className="text-muted-foreground">Approved</div>
                    </div>
                  </div>
                </div>
              )}

              <Card className="w-full shadow-sm border-0 sm:border">
                <CardHeader className="pb-3 sm:pb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
                        Self-Service Portal
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base mt-2">
                        Manage your HR documents and requests in one place
                      </CardDescription>
                    </div>
                    {!isMobile && (
                      <Button variant="outline" size="sm" className="hidden sm:flex">
                        <Download className="h-4 w-4 mr-2" />
                        Quick Guide
                      </Button>
                    )}
                  </div>

                  {/* Desktop Quick Actions */}
                  {!isMobile && (
                    <div className="flex gap-2 pt-2">
                      <Badge variant="secondary" className="px-3 py-1">
                        Last Login: Today
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1">
                        3 Pending Actions
                      </Badge>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-0 sm:p-2">
                  <Tabs 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <div className="relative px-2 sm:px-4 md:px-6">
                      {showScrollButtons && !isMobile && (
                        <>
                          <button
                            onClick={() => scrollTabs('left')}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-2 shadow-sm hover:bg-accent transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => scrollTabs('right')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-2 shadow-sm hover:bg-accent transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      <div 
                        ref={tabsListRef}
                        className="tabs-list-container overflow-x-auto scrollbar-hide scroll-smooth"
                        onScroll={checkScrollButtons}
                      >
                        <TabsList className="w-full inline-flex h-auto p-1 gap-1 bg-muted/50 min-w-max">
                          {Object.entries(tabLabels).map(([value, label]) => (
                            <TabsTrigger
                              key={value}
                              value={value}
                              className={`
                                relative flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium
                                whitespace-nowrap transition-all duration-200 ease-in-out
                                hover:bg-background/50
                                ${isMobile ? 'flex-col min-w-[70px] h-16' : 'min-w-[120px] h-11'}
                                data-[state=active]:bg-background data-[state=active]:shadow-sm
                                data-[state=active]:border data-[state=active]:border-border
                              `}
                            >
                              <div className={`${isMobile ? 'text-lg' : ''}`}>
                                {getTabIcon(value)}
                              </div>
                              <span className={`font-medium ${isMobile ? 'text-xs mt-1' : ''}`}>
                                {isMobile 
                                  ? mobileTabLabels[value as keyof typeof mobileTabLabels]
                                  : label.short
                                }
                              </span>
                              
                              {/* Active indicator */}
                              <div 
                                className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 
                                  w-1 h-1 bg-primary rounded-full transition-all duration-200
                                  ${activeTab === value ? 'opacity-100' : 'opacity-0'}
                                  ${isMobile ? 'w-6' : 'w-8'}
                                `}
                              />
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    </div>

                    {/* Tab Content Area */}
                    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 min-h-[500px]">
                      {/* Active Tab Header */}
                      <div className="mb-4 sm:mb-6 pb-3 border-b">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getTabIcon(activeTab)}
                          </div>
                          <div>
                            <h2 className="text-lg sm:text-xl font-semibold">
                              {tabLabels[activeTab as keyof typeof tabLabels].full}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Manage your {tabLabels[activeTab as keyof typeof tabLabels].full.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <TabsContent value="payslips" className="mt-0 animate-in fade-in duration-300">
                        <PayslipDownloads />
                      </TabsContent>

                      <TabsContent value="tax" className="mt-0 animate-in fade-in duration-300">
                        <TaxDeclaration />
                      </TabsContent>

                      <TabsContent value="investment" className="mt-0 animate-in fade-in duration-300">
                        <InvestmentProofs />
                      </TabsContent>

                      <TabsContent value="loans" className="mt-0 animate-in fade-in duration-300">
                        <LoanApplications />
                      </TabsContent>

                      <TabsContent value="itr" className="mt-0 animate-in fade-in duration-300">
                        <ITRAssistance />
                      </TabsContent>

                      <TabsContent value="reimbursements" className="mt-0 animate-in fade-in duration-300">
                        <Reimbursements />
                      </TabsContent>

                      <TabsContent value="policies" className="mt-0 animate-in fade-in duration-300">
                        <PolicyDocuments />
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Mobile Quick Actions */}
              {isMobile && (
                <div className="mt-4 p-4 bg-card border rounded-lg shadow-sm">
                  <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-10">
                      <Download className="h-3 w-3 mr-1" />
                      Download All
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-10">
                      <FileText className="h-3 w-3 mr-1" />
                      View History
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile Navigation Helper */}
              {isMobile && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-card/95 backdrop-blur-sm border rounded-full shadow-lg px-4 py-3 flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-primary/10 rounded">
                        {getTabIcon(activeTab)}
                      </div>
                      <span className="font-medium">
                        {tabLabels[activeTab as keyof typeof tabLabels].full}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <span className="text-muted-foreground">Swipe to navigate</span>
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

// Badge component for quick actions
function Badge({ variant = 'secondary', className = '', children, ...props }) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variants = {
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground'
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
