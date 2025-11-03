import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { CalendarDays } from 'lucide-react';

const leaveTypes = [
  { value: 'EL', label: 'Earned Leave (EL)', limit: 30 },
  { value: 'SL', label: 'Sick Leave (SL)', limit: 7 },
  { value: 'CL', label: 'Casual Leave (CL)', limit: 10 },
  { value: 'ML', label: 'Maternity Leave (ML)', limit: 182 },
  { value: 'PL', label: 'Paternity Leave (PL)', limit: 15 },
  { value: 'CO', label: 'Compensatory Leave (CO)', limit: 0 }
];

const LeaveTab = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'leaves'),
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leaves'), {
        employeeId: user!.uid,
        leaveType,
        startDate,
        endDate,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Leave application submitted!');
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to apply leave');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-6 w-6 text-primary" />
            Apply for Leave
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleApplyLeave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Leave Type</label>
              <Select value={leaveType} onValueChange={setLeaveType} required>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                required
                className="bg-muted/50 min-h-24"
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Submit Application
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaves.map(leave => (
              <div key={leave.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{leaveTypes.find(t => t.value === leave.leaveType)?.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </p>
                  {leave.reason && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{leave.reason}</p>
                  )}
                </div>
                <Badge 
                  variant={
                    leave.status === 'approved' ? 'default' :
                    leave.status === 'rejected' ? 'destructive' : 'secondary'
                  }
                  className="w-fit"
                >
                  {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                </Badge>
              </div>
            ))}
            {leaves.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No leave applications yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveTab;
