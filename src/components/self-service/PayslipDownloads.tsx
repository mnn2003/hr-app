import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Payslip {
  id: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
}

export default function PayslipDownloads() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPayslips();
    }
  }, [user]);

  const fetchPayslips = async () => {
    try {
      const q = query(
        collection(db, 'salary_slips'),
        where('employeeId', '==', user?.uid),
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payslip[];
      setPayslips(data);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (payslip: Payslip) => {
    toast.success(`Downloading payslip for ${payslip.month} ${payslip.year}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Payslip Downloads
        </CardTitle>
        <CardDescription>Download your monthly payslips</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading payslips...</div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No payslips available</div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">{payslip.month} {payslip.year}</TableCell>
                      <TableCell>₹{(payslip.basicSalary || 0).toLocaleString()}</TableCell>
                      <TableCell>₹{(payslip.allowances || 0).toLocaleString()}</TableCell>
                      <TableCell>₹{(payslip.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">₹{(payslip.netSalary || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs capitalize">
                          {payslip.status || 'pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(payslip)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
