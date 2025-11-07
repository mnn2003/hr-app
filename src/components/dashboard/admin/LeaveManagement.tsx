import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { User, Edit, Plus, AlertCircle } from 'lucide-react';
import { LeaveBalance, LeaveType } from '@/types/leave';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmployeeWithBalance {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  balance: LeaveBalance;
}

const DEFAULT_LEAVE_BALANCE: Omit<LeaveBalance, 'employeeId' | 'lastUpdated'> = {
  PL: 30,
  CL: 2,
  SL: 7,
  WFH: 15,
  MATERNITY: 182,
  PATERNITY: 14,
  ADOPTION: 84,
  SABBATICAL: 0,
  BEREAVEMENT: 10,
  PARENTAL: 10,
  COMP_OFF: 0,
};

const LEAVE_TYPE_NAMES: Record<LeaveType, string> = {
  PL: 'Privilege Leave',
  CL: 'Casual Leave',
  SL: 'Sick Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  ADOPTION: 'Adoption Leave',
  SABBATICAL: 'Sabbatical',
  WFH: 'Work From Home',
  BEREAVEMENT: 'Bereavement Leave',
  PARENTAL: 'Parental Leave',
  COMP_OFF: 'Compensatory Off',
  LWP: 'Leave Without Pay',
  VACATION: 'Vacation',
};

const LeaveManagement = () => {
  const [employees, setEmployees] = useState<EmployeeWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithBalance | null>(null);
  const [editBalance, setEditBalance] = useState<LeaveBalance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastAllocation, setLastAllocation] = useState<string | null>(null);
  const [canAllocate, setCanAllocate] = useState(true);

  useEffect(() => {
    fetchEmployeesWithBalances();
    checkLastAllocation();
  }, []);

  const checkLastAllocation = async () => {
    try {
      const allocationDoc = await getDoc(doc(db, 'system_settings', 'leave_allocation'));
      if (allocationDoc.exists()) {
        const lastDate = allocationDoc.data().lastAllocation;
        setLastAllocation(lastDate);
        
        // Check if allocation was done this month
        const lastAllocationDate = new Date(lastDate);
        const now = new Date();
        const isSameMonth = lastAllocationDate.getMonth() === now.getMonth() && 
                           lastAllocationDate.getFullYear() === now.getFullYear();
        setCanAllocate(!isSameMonth);
      }
    } catch (error) {
      console.error('Error checking last allocation:', error);
    }
  };

  const fetchEmployeesWithBalances = async () => {
    try {
      setLoading(true);
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      
      const employeesData = await Promise.all(
        employeesSnapshot.docs.map(async (employeeDoc) => {
          const empData = employeeDoc.data();
          
          // Fetch leave balance
          const balanceDoc = await getDoc(doc(db, 'leave_balances', employeeDoc.id));
          let balance: LeaveBalance;
          
          if (balanceDoc.exists()) {
            balance = balanceDoc.data() as LeaveBalance;
          } else {
            // Create default balance if doesn't exist
            balance = {
              employeeId: employeeDoc.id,
              ...DEFAULT_LEAVE_BALANCE,
              lastUpdated: new Date().toISOString(),
            };
            await setDoc(doc(db, 'leave_balances', employeeDoc.id), balance);
          }
          
          return {
            id: employeeDoc.id,
            name: empData.name || 'Unknown',
            employeeCode: empData.employeeCode || '',
            department: empData.department || '',
            balance,
          };
        })
      );
      
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBalance = (employee: EmployeeWithBalance) => {
    setSelectedEmployee(employee);
    setEditBalance(employee.balance);
    setIsDialogOpen(true);
  };

  const handleUpdateBalance = async () => {
    if (!selectedEmployee || !editBalance) return;

    try {
      await updateDoc(doc(db, 'leave_balances', selectedEmployee.id), {
        ...editBalance,
        lastUpdated: new Date().toISOString(),
      });
      
      toast.success('Leave balance updated successfully');
      setIsDialogOpen(false);
      fetchEmployeesWithBalances();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update leave balance');
    }
  };

  const handleBalanceChange = (leaveType: keyof Omit<LeaveBalance, 'employeeId' | 'lastUpdated'>, value: string) => {
    if (!editBalance) return;
    setEditBalance({
      ...editBalance,
      [leaveType]: parseFloat(value) || 0,
    });
  };

  const handleAllocateLeaves = async () => {
    if (!canAllocate) {
      toast.error('Monthly leaves have already been allocated this month');
      return;
    }

    if (!confirm('Allocate monthly leaves to all employees? This can only be done once per month.')) {
      return;
    }

    try {
      await Promise.all(
        employees.map(async (emp) => {
          const balanceDoc = await getDoc(doc(db, 'leave_balances', emp.id));
          const currentBalance = balanceDoc.exists() ? balanceDoc.data() as LeaveBalance : null;
          
          const newBalance: LeaveBalance = {
            employeeId: emp.id,
            PL: (currentBalance?.PL || 0) + 2.5, // Monthly accrual
            CL: currentBalance?.CL || DEFAULT_LEAVE_BALANCE.CL,
            SL: currentBalance?.SL || DEFAULT_LEAVE_BALANCE.SL,
            WFH: currentBalance?.WFH || DEFAULT_LEAVE_BALANCE.WFH,
            MATERNITY: currentBalance?.MATERNITY || DEFAULT_LEAVE_BALANCE.MATERNITY,
            PATERNITY: currentBalance?.PATERNITY || DEFAULT_LEAVE_BALANCE.PATERNITY,
            ADOPTION: currentBalance?.ADOPTION || DEFAULT_LEAVE_BALANCE.ADOPTION,
            SABBATICAL: currentBalance?.SABBATICAL || DEFAULT_LEAVE_BALANCE.SABBATICAL,
            BEREAVEMENT: currentBalance?.BEREAVEMENT || DEFAULT_LEAVE_BALANCE.BEREAVEMENT,
            PARENTAL: currentBalance?.PARENTAL || DEFAULT_LEAVE_BALANCE.PARENTAL,
            COMP_OFF: currentBalance?.COMP_OFF || 0,
            lastUpdated: new Date().toISOString(),
          };
          
          await setDoc(doc(db, 'leave_balances', emp.id), newBalance);
        })
      );

      // Update last allocation date
      await setDoc(doc(db, 'system_settings', 'leave_allocation'), {
        lastAllocation: new Date().toISOString()
      });

      toast.success('Monthly leaves allocated to all employees successfully');
      checkLastAllocation();
      fetchEmployeesWithBalances();
    } catch (error) {
      console.error('Error allocating leaves:', error);
      toast.error('Failed to allocate leaves');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Leave Balance Management</h2>
          <Button onClick={handleAllocateLeaves} disabled={!canAllocate}>
            <Plus className="mr-2 h-4 w-4" />
            Allocate Monthly Leaves (All)
          </Button>
        </div>
        
        {!canAllocate && lastAllocation && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Monthly leaves were already allocated on {new Date(lastAllocation).toLocaleDateString()}. 
              You can allocate again next month.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              {employees.map(employee => (
                <div key={employee.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{employee.name}</p>
                        {employee.employeeCode && (
                          <Badge variant="outline" className="text-xs">{employee.employeeCode}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{employee.department}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">PL:</span> 
                          <span className="ml-1 font-medium">{employee.balance.PL}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">CL:</span> 
                          <span className="ml-1 font-medium">{employee.balance.CL}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">SL:</span> 
                          <span className="ml-1 font-medium">{employee.balance.SL}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">WFH:</span> 
                          <span className="ml-1 font-medium">{employee.balance.WFH}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Comp Off:</span> 
                          <span className="ml-1 font-medium">{employee.balance.COMP_OFF}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleEditBalance(employee)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Leave Balance - {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          {editBalance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Privilege Leave (PL)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editBalance.PL}
                    onChange={(e) => handleBalanceChange('PL', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Casual Leave (CL)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editBalance.CL}
                    onChange={(e) => handleBalanceChange('CL', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sick Leave (SL)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editBalance.SL}
                    onChange={(e) => handleBalanceChange('SL', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work From Home (WFH)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editBalance.WFH}
                    onChange={(e) => handleBalanceChange('WFH', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maternity Leave (Days)</Label>
                  <Input
                    type="number"
                    value={editBalance.MATERNITY}
                    onChange={(e) => handleBalanceChange('MATERNITY', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paternity Leave (Days)</Label>
                  <Input
                    type="number"
                    value={editBalance.PATERNITY}
                    onChange={(e) => handleBalanceChange('PATERNITY', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adoption Leave (Days)</Label>
                  <Input
                    type="number"
                    value={editBalance.ADOPTION}
                    onChange={(e) => handleBalanceChange('ADOPTION', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bereavement Leave (Days)</Label>
                  <Input
                    type="number"
                    value={editBalance.BEREAVEMENT}
                    onChange={(e) => handleBalanceChange('BEREAVEMENT', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parental Leave (Days)</Label>
                  <Input
                    type="number"
                    value={editBalance.PARENTAL}
                    onChange={(e) => handleBalanceChange('PARENTAL', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compensatory Off</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editBalance.COMP_OFF}
                    onChange={(e) => handleBalanceChange('COMP_OFF', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sabbatical (Months)</Label>
                  <Input
                    type="number"
                    value={editBalance.SABBATICAL}
                    onChange={(e) => handleBalanceChange('SABBATICAL', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateBalance}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;
