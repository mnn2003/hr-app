import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TaxDeclaration {
  id: string;
  section: string;
  category: string;
  amount: number;
  financialYear: string;
  status: string;
}

// Get current Indian Financial Year: Example → "2024-25"
const getCurrentFY = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1–12

  if (month < 4) {
    // Jan–Mar → financial year is previousYear-currentYear
    return `${year - 1}-${String(year).slice(-2)}`;
  } else {
    // Apr–Dec → financial year is currentYear-nextYear
    return `${year}-${String(year + 1).slice(-2)}`;
  }
};

export default function TaxDeclaration() {
  const { user } = useAuth();

  const CURRENT_FY = getCurrentFY();
  const PREVIOUS_FY = (() => {
    const first = Number(CURRENT_FY.split('-')[0]) - 1;
    const second = Number(CURRENT_FY.split('-')[1]) - 1;
    return `${first}-${second.toString().padStart(2, '0')}`;
  })();

  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

  const [newDeclaration, setNewDeclaration] = useState({
    section: '',
    category: '',
    amount: '',
    financialYear: CURRENT_FY, // Auto default
  });

  useEffect(() => {
    if (user) loadDeclarations();
  }, [user]);

  const loadDeclarations = async () => {
    try {
      const q = query(
        collection(db, 'tax_declarations'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaxDeclaration[];

      setDeclarations(data);
    } catch (error) {
      console.error('Error loading tax declarations:', error);
      toast.error('Failed to load declarations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeclaration = async () => {
    if (!newDeclaration.section || !newDeclaration.category || !newDeclaration.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const employeeDoc = await getDoc(doc(db, 'employees', user?.uid || ''));
      const employeeName = employeeDoc.exists() ? (employeeDoc.data() as any).name : 'Unknown';

      await addDoc(collection(db, 'tax_declarations'), {
        userId: user?.uid,
        employeeId: user?.uid,
        employeeName,
        section: newDeclaration.section,
        category: newDeclaration.category,
        amount: parseFloat(newDeclaration.amount),
        financialYear: newDeclaration.financialYear,
        status: 'pending',
        submittedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      setNewDeclaration({
        section: '',
        category: '',
        amount: '',
        financialYear: CURRENT_FY,
      });

      toast.success('Tax declaration added successfully');
      loadDeclarations();
    } catch (error) {
      console.error('Error adding declaration:', error);
      toast.error('Failed to add declaration');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tax_declarations', id));
      toast.success('Declaration removed');
      loadDeclarations();
    } catch (error) {
      console.error('Error deleting declaration:', error);
      toast.error('Failed to delete declaration');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tax Declaration Submission
        </CardTitle>
        <CardDescription>Declare your tax-saving investments and expenses</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* FORM */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Section</Label>
                  <Select
                    value={newDeclaration.section}
                    onValueChange={(value) => setNewDeclaration({ ...newDeclaration, section: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80C">Section 80C</SelectItem>
                      <SelectItem value="80D">Section 80D</SelectItem>
                      <SelectItem value="80E">Section 80E</SelectItem>
                      <SelectItem value="80G">Section 80G</SelectItem>
                      <SelectItem value="HRA">HRA Exemption</SelectItem>
                      <SelectItem value="LTA">LTA Exemption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={newDeclaration.category}
                    onValueChange={(value) => setNewDeclaration({ ...newDeclaration, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPF">PPF</SelectItem>
                      <SelectItem value="ELSS">ELSS</SelectItem>
                      <SelectItem value="EPF">EPF/VPF</SelectItem>
                      <SelectItem value="NSC">NSC</SelectItem>
                      <SelectItem value="LIC">LIC Premium</SelectItem>
                      <SelectItem value="Home Loan">Home Loan Principal</SelectItem>
                      <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newDeclaration.amount}
                    onChange={(e) => setNewDeclaration({ ...newDeclaration, amount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <Label>Financial Year</Label>
                  <Select
                    value={newDeclaration.financialYear}
                    onValueChange={(value) => setNewDeclaration({ ...newDeclaration, financialYear: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CURRENT_FY}>{CURRENT_FY}</SelectItem>
                      <SelectItem value={PREVIOUS_FY}>{PREVIOUS_FY}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddDeclaration} className="mt-4 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Declaration
              </Button>
            </CardContent>
          </Card>

          {/* LIST */}
          <ScrollArea className="h-[400px]">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Financial Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No declarations added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    declarations.map((declaration) => (
                      <TableRow key={declaration.id}>
                        <TableCell>{declaration.section}</TableCell>
                        <TableCell>{declaration.category}</TableCell>
                        <TableCell>₹{declaration.amount.toLocaleString()}</TableCell>
                        <TableCell>{declaration.financialYear}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs capitalize">
                            {declaration.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(declaration.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
