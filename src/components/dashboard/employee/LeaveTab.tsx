import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
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
  const [duration, setDuration] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

      const leavesData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LeaveRequest));
      setLeaves(leavesData);
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

  const calculateDuration = (s?: string, e?: string) => {
    const a = s ?? startDate;
    const b = e ?? endDate;
    if (!a || !b) return 0;
    const start = new Date(a + 'T00:00:00');
    const end = new Date(b + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // inclusive days
    const days = diff >= 0 ? diff + 1 : 0;
    setDuration(days || 0);
    return days || 0;
  };

  useEffect(() => {
    calculateDuration();
  }, [startDate, endDate]);

  const validateForm = () => {
    if (!leaveType) {
      toast.error('Select a leave type');
      return false;
    }
    if (!startDate || !endDate) {
      toast.error('Select start and end dates');
      return false;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date cannot be before start date');
      return false;
    }
    if (!reason.trim()) {
      toast.error('Provide a reason');
      return false;
    }
    // balance check for paid leaves
    if (leaveBalance && leaveType !== 'LWP' && leaveType !== 'VACATION') {
      const available = leaveBalance[leaveType as keyof Omit<LeaveBalance, 'employeeId' | 'lastUpdated'>] || 0;
      if (available < duration) {
        toast.error(`Insufficient balance for ${LEAVE_TYPE_NAMES[leaveType]}. Available: ${available}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // get employee profile
      const empQuery = query(collection(db, 'employees'), where('userId', '==', currentUser.uid));
      const empSnapshot = await getDocs(empQuery);
      const empDoc = empSnapshot.docs[0];
      const employeeData = empDoc ? empDoc.data() : null;
      const employeeName = employeeData?.name || currentUser.email || 'Unknown';
      const employeeCode = employeeData?.employeeCode || '';

      // find approvers (HR + HOD)
      const hrQuery = query(collection(db, 'user_roles'), where('role', '==', 'hr'));
      const hodQuery = query(collection(db, 'user_roles'), where('role', '==', 'hod'));
      const [hrSnap, hodSnap] = await Promise.all([getDocs(hrQuery), getDocs(hodQuery)]);
      const approverIds = [
        ...hrSnap.docs.map((d) => (d.data() as any).userId),
        ...hodSnap.docs.map((d) => (d.data() as any).userId),
      ].filter(Boolean);

      if (approverIds.length === 0) {
        toast.error('No approvers found (HR/HOD)');
        setSubmitting(false);
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
        reason: reason.trim(),
        status: 'PENDING',
        appliedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        approverIds,
        isPaid: leaveType !== 'LWP',
      };

      await addDoc(collection(db, 'leaves'), leaveRequest);
      toast.success('Leave application submitted');

      // reset form
      setShowForm(false);
      setLeaveType('PL');
      setStartDate('');
      setEndDate('');
      setDuration(1);
      setReason('');

      // refresh data
      await fetchLeaves();
      await fetchLeaveBalance();
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedLeaves = useMemo(() => leaves, [leaves]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-4">
      {/* Balance overview */}
      {leaveBalance && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {(['PL', 'CL', 'SL', 'WFH', 'COMP_OFF'] as (keyof LeaveBalance)[]).map((k) => (
                <div key={k} className="p-3 bg-muted rounded-lg flex flex-col items-start">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-xl font-bold">{(leaveBalance as any)[k] ?? 0}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">My Leave Requests</h2>
          <p className="text-sm text-muted-foreground">Apply for leave and view your history.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Close' : 'Apply Leave'}
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Leave Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                    <SelectTrigger aria-label="Select leave type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAVE_TYPE_NAMES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center justify-between w-full">
                            <span>{label}</span>
                            {leaveBalance && key !== 'LWP' && key !== 'VACATION' && (
                              <span className="text-xs text-muted-foreground">{(leaveBalance as any)[key] ?? 0} available</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Start Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                    <Calendar className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <Label>End Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                    <Calendar className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    value={duration}
                    step={0.5}
                    onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated from dates. Adjust for half-days if needed.</p>
                </div>
              </div>

              <div>
                <Label>Reason</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {formattedLeaves.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No leave requests found</p>
                </div>
              )}

              {formattedLeaves.map((leave) => (
                <div key={leave.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{LEAVE_TYPE_NAMES[leave.leaveType]}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {leave.startDate} — {leave.endDate} · {leave.duration} day{leave.duration > 1 ? 's' : ''}
                        </div>
                      </div>

                      <p className="mt-2 text-sm bg-muted p-2 rounded">{leave.reason}</p>
                    </div>

                    <div className="flex-shrink-0">
                      <Badge
                        variant={
                          leave.status === 'APPROVED' ? 'default' : leave.status === 'REJECTED' ? 'destructive' : 'secondary'
                        }
                      >
                        {leave.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveTab;
