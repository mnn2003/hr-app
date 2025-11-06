import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Calendar, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeaveType, LeaveRequest, LeaveBalance } from '@/types/leave';

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

const LeaveTab = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('PL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [reason, setReason] = useState('');
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  useEffect(() => {
    fetchLeaves();
    fetchLeaveBalance();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const q = query(
        collection(db, 'leaves'), 
        where('employeeId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const leavesData = snapshot.docs;
      
      setLeaves(leavesData.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LeaveRequest)));
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to fetch leaves');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const balanceDoc = await getDoc(doc(db, 'leave_balances', currentUser.uid));
      if (balanceDoc.exists()) {
        setLeaveBalance(balanceDoc.data() as LeaveBalance);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }
  };

  const calculateDuration = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setDuration(diffDays);
    return diffDays;
  };

  useEffect(() => {
    calculateDuration();
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leaveType || !startDate || !endDate || !reason) {
      toast.error('Please fill all fields');
      return;
    }

    // Check leave balance
    if (leaveBalance && leaveType !== 'LWP' && leaveType !== 'VACATION') {
      const availableBalance = leaveBalance[leaveType as keyof Omit<LeaveBalance, 'employeeId' | 'lastUpdated'>];
      if (availableBalance < duration) {
        toast.error(`Insufficient ${LEAVE_TYPE_NAMES[leaveType]} balance. Available: ${availableBalance} days`);
        return;
      }
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get employee details
      const empQuery = query(collection(db, 'employees'), where('userId', '==', currentUser.uid));
      const empSnapshot = await getDocs(empQuery);
      const employeeData = empSnapshot.empty ? null : empSnapshot.docs[0].data();
      const employeeName = employeeData?.name || currentUser.email || 'Unknown';
      const employeeCode = employeeData?.employeeCode || '';

      // Get HR and HOD user IDs for approval routing
      const hrQuery = query(collection(db, 'user_roles'), where('role', '==', 'hr'));
      const hodQuery = query(collection(db, 'user_roles'), where('role', '==', 'hod'));
      
      const [hrSnapshot, hodSnapshot] = await Promise.all([
        getDocs(hrQuery),
        getDocs(hodQuery)
      ]);

      const hrAndHodIds = [
        ...hrSnapshot.docs.map(doc => doc.data().userId),
        ...hodSnapshot.docs.map(doc => doc.data().userId)
      ];

      if (hrAndHodIds.length === 0) {
        toast.error('No HR or HOD found to approve leave');
        return;
      }

      const leaveRequest: Omit<LeaveRequest, 'id'> = {
        employeeId: currentUser.uid,
        employeeName,
        employeeCode,
        leaveType,
        startDate,
        endDate,
        duration,
        reason,
        status: 'PENDING',
        appliedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        approverIds: hrAndHodIds,
        isPaid: leaveType !== 'LWP',
      };

      await addDoc(collection(db, 'leaves'), leaveRequest);
      toast.success('Leave application submitted successfully');
      setShowForm(false);
      setLeaveType('PL');
      setStartDate('');
      setEndDate('');
      setDuration(1);
      setReason('');
      fetchLeaves();
      fetchLeaveBalance();
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Failed to submit leave application');
    }
  };

  return (
    <div className="space-y-4">
      {leaveBalance && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">PL</p>
                <p className="text-xl font-bold">{leaveBalance.PL}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">CL</p>
                <p className="text-xl font-bold">{leaveBalance.CL}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">SL</p>
                <p className="text-xl font-bold">{leaveBalance.SL}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">WFH</p>
                <p className="text-xl font-bold">{leaveBalance.WFH}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Comp Off</p>
                <p className="text-xl font-bold">{leaveBalance.COMP_OFF}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Leave Requests</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Apply Leave
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Leave Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPE_NAMES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                        {leaveBalance && key !== 'LWP' && key !== 'VACATION' && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({leaveBalance[key as keyof Omit<LeaveBalance, 'employeeId' | 'lastUpdated'>]} available)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">Auto-calculated from dates. You can adjust for half-days (0.5)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Submit Application</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {leaves.map(leave => (
                <div key={leave.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{LEAVE_TYPE_NAMES[leave.leaveType]}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {leave.startDate} to {leave.endDate} ({leave.duration} days)
                        </span>
                      </div>
                      <p className="text-sm bg-muted p-2 rounded">{leave.reason}</p>
                    </div>
                    <Badge 
                      variant={
                        leave.status === 'APPROVED' ? 'default' :
                        leave.status === 'REJECTED' ? 'destructive' : 'secondary'
                      }
                      className="ml-4"
                    >
                      {leave.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {leaves.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No leave requests found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveTab;
