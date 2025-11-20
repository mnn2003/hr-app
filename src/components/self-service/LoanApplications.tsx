import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LoanApplication {
  id: string;
  loanType: string;
  amount: number;
  purpose: string;
  tenure: number;
  applicationDate: string;
  status: string;
}

export default function LoanApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [newApplication, setNewApplication] = useState({
    loanType: '',
    amount: '',
    purpose: '',
    tenure: '',
  });

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  const loadApplications = async () => {
    try {
      const q = query(
        collection(db, 'loan_applications'),
        where('userId', '==', user?.uid),
        orderBy('applicationDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoanApplication[];
      setApplications(data);
    } catch (error) {
      console.error('Error loading loan applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!newApplication.loanType || !newApplication.amount || !newApplication.purpose || !newApplication.tenure) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Fetch employee name
      const employeeDoc = await getDoc(doc(db, 'employees', user?.uid || ''));
      const employeeName = employeeDoc.exists() ? employeeDoc.data().name : 'Unknown';

      await addDoc(collection(db, 'loan_applications'), {
        userId: user?.uid,
        employeeId: user?.uid,
        employeeName: employeeName,
        type: newApplication.loanType,
        loanType: newApplication.loanType,
        amount: parseFloat(newApplication.amount),
        reason: newApplication.purpose,
        purpose: newApplication.purpose,
        tenure: parseInt(newApplication.tenure),
        applicationDate: new Date().toISOString(),
        appliedDate: new Date().toISOString(),
        status: 'pending'
      });

      setNewApplication({ loanType: '', amount: '', purpose: '', tenure: '' });
      toast.success('Loan application submitted successfully');
      loadApplications();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Loan & Advance Applications
            </CardTitle>
            <CardDescription>Apply for loans and advances from the company</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Apply for Loan/Advance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Loan Type</Label>
                    <Select value={newApplication.loanType} onValueChange={(value) => setNewApplication({ ...newApplication, loanType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                        <SelectItem value="Emergency Advance">Emergency Advance</SelectItem>
                        <SelectItem value="Salary Advance">Salary Advance</SelectItem>
                        <SelectItem value="Festival Advance">Festival Advance</SelectItem>
                        <SelectItem value="Vehicle Loan">Vehicle Loan</SelectItem>
                        <SelectItem value="Education Loan">Education Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={newApplication.amount}
                      onChange={(e) => setNewApplication({ ...newApplication, amount: e.target.value })}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label>Repayment Tenure (months)</Label>
                    <Input
                      type="number"
                      value={newApplication.tenure}
                      onChange={(e) => setNewApplication({ ...newApplication, tenure: e.target.value })}
                      placeholder="Enter tenure in months"
                    />
                  </div>
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Textarea
                    value={newApplication.purpose}
                    onChange={(e) => setNewApplication({ ...newApplication, purpose: e.target.value })}
                    placeholder="Explain the purpose of this loan/advance"
                    rows={4}
                  />
                </div>
                <Button onClick={handleSubmitApplication} className="w-full">
                  Submit Application
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No loan applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>{new Date(application.applicationDate).toLocaleDateString()}</TableCell>
                      <TableCell>{application.loanType}</TableCell>
                      <TableCell className="font-semibold">₹{application.amount.toLocaleString()}</TableCell>
                      <TableCell>{application.tenure} months</TableCell>
                      <TableCell className="max-w-xs truncate">{application.purpose}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
