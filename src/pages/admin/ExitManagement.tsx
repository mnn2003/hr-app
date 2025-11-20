import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResignationTracking } from '@/components/dashboard/admin/exit/ResignationTracking';
import { ExitInterview } from '@/components/dashboard/admin/exit/ExitInterview';
import { ClearanceProcess } from '@/components/dashboard/admin/exit/ClearanceProcess';
import { FullFinalSettlement } from '@/components/dashboard/admin/exit/FullFinalSettlement';
import { ExperienceCertificate } from '@/components/dashboard/admin/exit/ExperienceCertificate';
import { KnowledgeTransfer } from '@/components/dashboard/admin/exit/KnowledgeTransfer';

const ExitManagement = () => {
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    const normalizedRole = userRole?.toLowerCase();
    if (normalizedRole !== 'hr' && normalizedRole !== 'hod') {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        {userRole && <AppSidebar />}
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="lg:hidden">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h1 className="text-lg font-semibold">Exit Management</h1>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Role: {userRole}</span>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Exit Management System</CardTitle>
                <CardDescription>
                  Manage employee resignations, exit interviews, clearances, settlements, and documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <Tabs defaultValue="resignations" className="w-full">
                  <TabsList className="w-full inline-flex lg:grid lg:grid-cols-6 h-auto flex-wrap gap-1 p-1">
                    <TabsTrigger value="resignations" className="flex-1 min-w-[140px] whitespace-nowrap">Resignations</TabsTrigger>
                    <TabsTrigger value="interviews" className="flex-1 min-w-[140px] whitespace-nowrap">Exit Interviews</TabsTrigger>
                    <TabsTrigger value="clearance" className="flex-1 min-w-[140px] whitespace-nowrap">Clearance</TabsTrigger>
                    <TabsTrigger value="settlement" className="flex-1 min-w-[140px] whitespace-nowrap">Settlement</TabsTrigger>
                    <TabsTrigger value="certificates" className="flex-1 min-w-[140px] whitespace-nowrap">Certificates</TabsTrigger>
                    <TabsTrigger value="knowledge" className="flex-1 min-w-[140px] whitespace-nowrap">Knowledge Transfer</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="resignations">
                    <ResignationTracking />
                  </TabsContent>
                  
                  <TabsContent value="interviews">
                    <ExitInterview />
                  </TabsContent>
                  
                  <TabsContent value="clearance">
                    <ClearanceProcess />
                  </TabsContent>
                  
                  <TabsContent value="settlement">
                    <FullFinalSettlement />
                  </TabsContent>
                  
                  <TabsContent value="certificates">
                    <ExperienceCertificate />
                  </TabsContent>
                  
                  <TabsContent value="knowledge">
                    <KnowledgeTransfer />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ExitManagement;
