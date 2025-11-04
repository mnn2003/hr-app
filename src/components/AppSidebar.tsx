import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Settings,
  Building2,
  UserCog,
  CalendarCheck,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MenuPreferences {
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
}

export function AppSidebar() {
  const { userRole, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const [menuPreferences, setMenuPreferences] = useState<MenuPreferences>({
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
  });

  useEffect(() => {
    loadMenuPreferences();
  }, [user]);

  const loadMenuPreferences = async () => {
    if (!user) return;
    try {
      const prefsDoc = await getDoc(doc(db, 'user_preferences', user.uid));
      if (prefsDoc.exists() && prefsDoc.data().menuPreferences) {
        setMenuPreferences(prefsDoc.data().menuPreferences);
      }
    } catch (error) {
      console.error('Error loading menu preferences:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
  };

  const isHrOrHod = userRole === 'hr' || userRole === 'hod';
  const isEmployee = userRole === 'staff' || userRole === 'intern';

  const employeeMenuItems = [
    { id: '/dashboard', label: 'Overview', icon: LayoutDashboard, visible: menuPreferences.overview },
    { id: '/profile', label: 'Profile', icon: UserCog, visible: menuPreferences.profile },
    { id: '/attendance', label: 'Attendance', icon: Clock, visible: menuPreferences.attendance },
    { id: '/report', label: 'Report', icon: FileText, visible: menuPreferences.report },
    { id: '/leave', label: 'Leave', icon: Calendar, visible: menuPreferences.leave },
    { id: '/salary', label: 'Salary', icon: DollarSign, visible: menuPreferences.salary },
  ];

  const adminMenuItems = [
    { id: '/dashboard', label: 'Overview', icon: LayoutDashboard, visible: menuPreferences.overview },
    { id: '/attendance', label: 'My Attendance', icon: Clock, visible: menuPreferences.attendance },
    { id: '/leave', label: 'My Leave', icon: Calendar, visible: menuPreferences.leave },
    { id: '/employees', label: 'Employees', icon: Users, visible: menuPreferences.employees && userRole === 'hr' },
    { id: '/departments', label: 'Departments', icon: Building2, visible: menuPreferences.departments && userRole === 'hr' },
    { id: '/leave-approvals', label: 'Leave Approvals', icon: CalendarCheck, visible: menuPreferences.leaveApprovals },
    { id: '/attendance-management', label: 'Attendance Mgmt', icon: Clock, visible: menuPreferences.attendanceManagement && userRole === 'hr' },
    { id: '/holidays', label: 'Holidays', icon: Calendar, visible: menuPreferences.holidays && userRole === 'hr' },
    { id: '/salary-slips', label: 'Salary Slips', icon: DollarSign, visible: menuPreferences.salarySlips && userRole === 'hr' },
  ];

  const menuItems = isEmployee ? employeeMenuItems : adminMenuItems;
  const visibleMenuItems = menuItems.filter(item => item.visible);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                HR
              </div>
              {state !== 'collapsed' && (
                <div>
                  <h2 className="font-semibold text-sm">HR System</h2>
                  <p className="text-xs text-muted-foreground capitalize">{userRole || 'User'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <SidebarGroup>
          {state !== 'collapsed' && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.id)}
                    isActive={location.pathname === item.id}
                    tooltip={state === 'collapsed' ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {state !== 'collapsed' && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          {state !== 'collapsed' && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigation('/settings')}
                  isActive={location.pathname === '/settings'}
                  tooltip={state === 'collapsed' ? 'Settings' : undefined}
                >
                  <Settings className="h-4 w-4" />
                  {state !== 'collapsed' && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          onClick={handleLogout}
          variant="outline"
          size={state === 'collapsed' ? 'icon' : 'default'}
          className="w-full"
        >
          <LogOut className="h-4 w-4" />
          {state !== 'collapsed' && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
