import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Check, X, User } from 'lucide-react';

interface LeaveWithEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: any;
}

const LeaveApprovals = () => {
  const { userRole } = useAuth();
  const [pendingLeaves, setPendingLeaves] = useState<LeaveWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingLeaves();
  }, [userRole]);

  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const q = query(collection(db, 'leaves'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      
      // Get current user's department if they are HOD
      let hodDepartmentId = null;
      if (userRole === 'hod') {
        const currentEmployeeDoc = await getDoc(doc(db, 'employees', currentUser.uid));
        if (currentEmployeeDoc.exists()) {
          hodDepartmentId = currentEmployeeDoc.data().departmentId;
        }
      }
      
      const leavesWithEmployees = await Promise.all(
        snapshot.docs.map(async (leaveDoc) => {
          const leaveData = leaveDoc.data();
          let employeeName = 'Unknown';
          let employeeCode = '';
          let employeeDepartmentId = null;
          
          try {
            const employeeDoc = await getDoc(doc(db, 'employees', leaveData.employeeId));
            if (employeeDoc.exists()) {
              const empData = employeeDoc.data();
              employeeName = empData.name || 'Unknown';
              employeeCode = empData.employeeCode || '';
              employeeDepartmentId = empData.departmentId;
            }
          } catch (error) {
            console.error('Error fetching employee:', error);
          }
          
          return {
            id: leaveDoc.id,
            ...leaveData,
            employeeName,
            employeeCode,
            employeeDepartmentId,
          } as LeaveWithEmployee & { employeeDepartmentId?: string };
        })
      );
      
      // Filter leaves based on user role
      let filteredLeaves = leavesWithEmployees;
      if (userRole === 'hod' && hodDepartmentId) {
        // HODs can only see leaves from their department
        filteredLeaves = leavesWithEmployees.filter(
          leave => leave.employeeDepartmentId === hodDepartmentId
        );
      }
      
      setPendingLeaves(filteredLeaves);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), { status: 'approved' });
      toast.success('Leave approved!');
      fetchPendingLeaves();
    } catch (error) {
      toast.error('Failed to approve leave');
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), { status: 'rejected' });
      toast.success('Leave rejected!');
      fetchPendingLeaves();
    } catch (error) {
      toast.error('Failed to reject leave');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Leave Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {pendingLeaves.map(leave => (
              <div key={leave.id} className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{leave.employeeName}</p>
                      {leave.employeeCode && (
                        <Badge variant="outline" className="text-xs">{leave.employeeCode}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{leave.leaveType}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {leave.startDate} to {leave.endDate}
                      </span>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded">{leave.reason}</p>
                  </div>
                  <Badge variant="secondary" className="ml-4">Pending</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(leave.id)} className="flex-1">
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(leave.id)} className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
            {pendingLeaves.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Check className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No pending leave requests</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveApprovals;
