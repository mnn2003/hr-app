import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Clock, FileText } from 'lucide-react';
import EmployeeManagement from './admin/EmployeeManagement';
import LeaveApprovals from './admin/LeaveApprovals';
import AttendanceManagement from './admin/AttendanceManagement';
import HolidayManagement from './admin/HolidayManagement';
import DepartmentManagement from './admin/DepartmentManagement';
import SalarySlipManagement from './admin/SalarySlipManagement';
import AttendanceTab from './employee/AttendanceTab';
import LeaveTab from './employee/LeaveTab';
import BirthdayWidget from './BirthdayWidget';

const AdminDashboard = () => {
  const { userRole, user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    todayAttendance: 0,
  });
  const [widgetPreferences, setWidgetPreferences] = useState({
    birthdayWidget: true,
    statsCards: true,
    quickActions: true,
    recentActivity: true,
  });

  useEffect(() => {
    fetchStats();
    loadWidgetPreferences();
  }, [user]);

  const loadWidgetPreferences = async () => {
    if (!user) return;
    try {
      const prefsDoc = await getDocs(query(collection(db, 'user_preferences'), where('userId', '==', user.uid)));
      if (!prefsDoc.empty && prefsDoc.docs[0].data().dashboardWidgets) {
        setWidgetPreferences(prefsDoc.docs[0].data().dashboardWidgets);
      }
    } catch (error) {
      console.error('Error loading widget preferences:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Total employees
      const employeesSnap = await getDocs(collection(db, 'employees'));
      const totalEmployees = employeesSnap.size;

      // Pending leaves
      const leavesQuery = query(collection(db, 'leaves'), where('status', '==', 'pending'));
      const leavesSnap = await getDocs(leavesQuery);
      const pendingLeaves = leavesSnap.size;

      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(collection(db, 'attendance'), where('date', '==', today));
      const attendanceSnap = await getDocs(attendanceQuery);
      const todayAttendance = attendanceSnap.size;

      setStats({ totalEmployees, pendingLeaves, todayAttendance });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-4 md:space-y-6">
        {/* Overview Content */}
        {widgetPreferences.statsCards && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Active in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayAttendance}</div>
                <p className="text-xs text-muted-foreground">Employees present</p>
              </CardContent>
            </Card>
          </div>
        )}

        {widgetPreferences.birthdayWidget && <BirthdayWidget />}

        {(widgetPreferences.quickActions || widgetPreferences.recentActivity) && (
          <div className="grid gap-4 md:grid-cols-2">
            {widgetPreferences.quickActions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="font-medium">Manage Employees</div>
                    <div className="text-sm text-muted-foreground">Add, edit, or remove employees</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="font-medium">Review Leave Requests</div>
                    <div className="text-sm text-muted-foreground">Approve or reject pending leaves</div>
                  </button>
                </CardContent>
              </Card>
            )}

            {widgetPreferences.recentActivity && (
              <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {stats.pendingLeaves > 0 && (
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5" />
                      <div>
                        <p className="font-medium">{stats.pendingLeaves} leave request(s) pending</p>
                        <p className="text-muted-foreground">Requires your attention</p>
                      </div>
                    </div>
                  )}
                  {stats.todayAttendance > 0 && (
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                      <div>
                        <p className="font-medium">{stats.todayAttendance} employee(s) checked in today</p>
                        <p className="text-muted-foreground">Attendance recorded</p>
                      </div>
                    </div>
                  )}
                  {stats.pendingLeaves === 0 && stats.todayAttendance === 0 && (
                    <p className="text-muted-foreground">No recent activity</p>
                  )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Tabs for management sections */}
      <div className="mt-6">
        <Tabs defaultValue="my-attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto overflow-x-auto">
            <TabsTrigger value="my-attendance" className="text-xs md:text-sm">My Attendance</TabsTrigger>
            <TabsTrigger value="my-leave" className="text-xs md:text-sm">My Leave</TabsTrigger>
            {userRole === 'hr' && <TabsTrigger value="employees" className="text-xs md:text-sm">Employees</TabsTrigger>}
            {userRole === 'hr' && <TabsTrigger value="departments" className="text-xs md:text-sm">Departments</TabsTrigger>}
            <TabsTrigger value="leave-approvals" className="text-xs md:text-sm">Leave Approvals</TabsTrigger>
            {userRole === 'hr' && <TabsTrigger value="attendance" className="text-xs md:text-sm">Attendance</TabsTrigger>}
            {userRole === 'hr' && <TabsTrigger value="holidays" className="text-xs md:text-sm">Holidays</TabsTrigger>}
            {userRole === 'hr' && <TabsTrigger value="salary-slips" className="text-xs md:text-sm">Salary Slips</TabsTrigger>}
          </TabsList>

          <TabsContent value="my-attendance" className="mt-4">
            <AttendanceTab />
          </TabsContent>

          <TabsContent value="my-leave" className="mt-4">
            <LeaveTab />
          </TabsContent>

          {userRole === 'hr' && (
            <TabsContent value="employees" className="mt-4">
              <EmployeeManagement />
            </TabsContent>
          )}

          {userRole === 'hr' && (
            <TabsContent value="departments" className="mt-4">
              <DepartmentManagement />
            </TabsContent>
          )}

          <TabsContent value="leave-approvals" className="mt-4">
            <LeaveApprovals />
          </TabsContent>

          {userRole === 'hr' && (
            <TabsContent value="attendance" className="mt-4">
              <AttendanceManagement />
            </TabsContent>
          )}

          {userRole === 'hr' && (
            <TabsContent value="holidays" className="mt-4">
              <HolidayManagement />
            </TabsContent>
          )}

          {userRole === 'hr' && (
            <TabsContent value="salary-slips" className="mt-4">
              <SalarySlipManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
