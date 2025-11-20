import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  UserCheck, 
  Calendar,
  DollarSign,
  GraduationCap,
  PieChart
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface AnalyticsData {
  headcount: number;
  attritionRate: number;
  departmentAnalytics: { name: string; count: number }[];
  genderDiversity: { name: string; value: number }[];
  attendancePatterns: { month: string; present: number; absent: number }[];
  leaveUtilization: number;
  costPerHire: number;
  trainingEffectiveness: number;
  headcountTrend: { month: string; count: number }[];
}

export default function HRAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    headcount: 0,
    attritionRate: 0,
    departmentAnalytics: [],
    genderDiversity: [],
    attendancePatterns: [],
    leaveUtilization: 0,
    costPerHire: 0,
    trainingEffectiveness: 0,
    headcountTrend: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last6months');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const employeesSnap = await getDocs(collection(db, 'employees'));
      const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Headcount
      const headcount = employees.length;
      
      // Department Analytics
      const deptMap: Record<string, number> = {};
      employees.forEach((emp: any) => {
        const dept = emp.department || 'Unassigned';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const departmentAnalytics = Object.entries(deptMap).map(([name, count]) => ({ name, count }));
      
      // Gender Diversity
      const genderMap: Record<string, number> = {};
      employees.forEach((emp: any) => {
        const gender = emp.gender || 'Not Specified';
        genderMap[gender] = (genderMap[gender] || 0) + 1;
      });
      const genderDiversity = Object.entries(genderMap).map(([name, value]) => ({ name, value }));
      
      // Attrition Rate (dummy calculation based on exit dates)
      const currentYear = new Date().getFullYear();
      const exitsThisYear = employees.filter((emp: any) => {
        if (!emp.exitDate) return false;
        const exitYear = new Date(emp.exitDate).getFullYear();
        return exitYear === currentYear;
      }).length;
      const attritionRate = headcount > 0 ? (exitsThisYear / headcount) * 100 : 0;
      
      // Attendance Patterns (last 6 months dummy data)
      const attendancePatterns = [
        { month: 'Jan', present: 85, absent: 15 },
        { month: 'Feb', present: 88, absent: 12 },
        { month: 'Mar', present: 82, absent: 18 },
        { month: 'Apr', present: 90, absent: 10 },
        { month: 'May', present: 87, absent: 13 },
        { month: 'Jun', present: 89, absent: 11 },
      ];
      
      // Leave Utilization
      const leavesSnap = await getDocs(collection(db, 'leaves'));
      const approvedLeaves = leavesSnap.docs.filter(doc => doc.data().status === 'APPROVED').length;
      const leaveUtilization = leavesSnap.size > 0 ? (approvedLeaves / leavesSnap.size) * 100 : 0;
      
      // Cost Per Hire (dummy)
      const costPerHire = 5500;
      
      // Training Effectiveness (dummy)
      const trainingEffectiveness = 78;
      
      // Headcount Trend (last 6 months)
      const headcountTrend = [
        { month: 'Jan', count: Math.floor(headcount * 0.85) },
        { month: 'Feb', count: Math.floor(headcount * 0.88) },
        { month: 'Mar', count: Math.floor(headcount * 0.92) },
        { month: 'Apr', count: Math.floor(headcount * 0.96) },
        { month: 'May', count: Math.floor(headcount * 0.98) },
        { month: 'Jun', count: headcount },
      ];
      
      setAnalytics({
        headcount,
        attritionRate,
        departmentAnalytics,
        genderDiversity,
        attendancePatterns,
        leaveUtilization,
        costPerHire,
        trainingEffectiveness,
        headcountTrend,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex items-center justify-between flex-1">
              <h1 className="text-xl font-semibold">HR Analytics Dashboard</h1>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last6months">Last 6 Months</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>
          
          <main className="flex-1 p-6 space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Headcount</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.headcount}</div>
                  <p className="text-xs text-muted-foreground">Active employees</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attrition Rate</CardTitle>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.attritionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Year to date</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cost Per Hire</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics.costPerHire.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Average recruitment cost</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leave Utilization</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.leaveUtilization.toFixed(0)}%</div>
                  <p className="text-xs text-muted-foreground">Approved leaves</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Headcount Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Headcount Trend</CardTitle>
                  <CardDescription>Employee count over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.headcountTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Department Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                  <CardDescription>Employees by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.departmentAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gender Diversity */}
              <Card>
                <CardHeader>
                  <CardTitle>Gender Diversity</CardTitle>
                  <CardDescription>Gender distribution metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={analytics.genderDiversity}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {analytics.genderDiversity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Attendance Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Patterns</CardTitle>
                  <CardDescription>Monthly attendance trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.attendancePatterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="absent" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Training Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>Training Effectiveness Score</CardTitle>
                <CardDescription>Overall training program effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-4xl font-bold">{analytics.trainingEffectiveness}%</div>
                    <p className="text-sm text-muted-foreground mt-2">Based on post-training assessments and performance improvements</p>
                  </div>
                  <GraduationCap className="h-16 w-16 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
