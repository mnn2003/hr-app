import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Trash2, IndianRupee, Calendar, TrendingUp, Calculator } from 'lucide-react';
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
  const month = today.getMonth() + 1;

  if (month < 4) {
    return `${year - 1}-${String(year).slice(-2)}`;
  } else {
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
    financialYear: CURRENT_FY,
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

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const getSectionLimit = (section: string) => {
    const limits: { [key: string]: number } = {
      '80C': 150000,
      '80D': 25000,
      '80E': 0, // No limit, but interest paid
      '80G': 0, // Varies based on donation
      'HRA': 0, // Based on salary structure
      'LTA': 0, // Based on actual travel
    };
    return limits[section] || 0;
  };

  // Calculate totals
  const totalDeclared = declarations.reduce((sum, dec) => sum + dec.amount, 0);
  const currentFYTotal = declarations
    .filter(dec => dec.financialYear === CURRENT_FY)
    .reduce((sum, dec) => sum + dec.amount, 0);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="text-xs text-blue-600 font-medium">Total Declarations</div>
          </div>
          <div className="text-lg font-bold text-blue-900 mt-1">{declarations.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-600" />
            <div className="text-xs text-green-600 font-medium">Total Amount</div>
          </div>
          <div className="text-lg font-bold text-green-900 mt-1">
            ₹{totalDeclared.toLocaleString()}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            <div className="text-xs text-orange-600 font-medium">{CURRENT_FY} Total</div>
          </div>
          <div className="text-lg font-bold text-orange-900 mt-1">
            ₹{currentFYTotal.toLocaleString()}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <div className="text-xs text-purple-600 font-medium">Pending</div>
          </div>
          <div className="text-lg font-bold text-purple-900 mt-1">
            {declarations.filter(d => d.status === 'pending').length}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Tax Declaration</CardTitle>
                <CardDescription>Declare your tax-saving investments and expenses</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Add Declaration Form */}
          <Card className="border-dashed bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="section" className="text-sm font-medium">
                        Section
                      </Label>
                      <Select
                        value={newDeclaration.section}
                        onValueChange={(value) => setNewDeclaration({ ...newDeclaration, section: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select tax section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80C">Section 80C (₹1.5L)</SelectItem>
                          <SelectItem value="80D">Section 80D (₹25K)</SelectItem>
                          <SelectItem value="80E">Section 80E (Education Loan)</SelectItem>
                          <SelectItem value="80G">Section 80G (Donations)</SelectItem>
                          <SelectItem value="HRA">HRA Exemption</SelectItem>
                          <SelectItem value="LTA">LTA Exemption</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-sm font-medium">
                        Category
                      </Label>
                      <Select
                        value={newDeclaration.category}
                        onValueChange={(value) => setNewDeclaration({ ...newDeclaration, category: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PPF">PPF</SelectItem>
                          <SelectItem value="ELSS">ELSS Mutual Funds</SelectItem>
                          <SelectItem value="EPF">EPF/VPF</SelectItem>
                          <SelectItem value="NSC">NSC</SelectItem>
                          <SelectItem value="LIC">LIC Premium</SelectItem>
                          <SelectItem value="Home Loan">Home Loan Principal</SelectItem>
                          <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                          <SelectItem value="Education Loan">Education Loan Interest</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium">
                        Amount (₹)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newDeclaration.amount}
                        onChange={(e) => setNewDeclaration({ ...newDeclaration, amount: e.target.value })}
                        placeholder="Enter amount"
                        className="mt-1"
                      />
                      {newDeclaration.section && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Section limit: ₹{getSectionLimit(newDeclaration.section).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="financialYear" className="text-sm font-medium">
                        Financial Year
                      </Label>
                      <Select
                        value={newDeclaration.financialYear}
                        onValueChange={(value) => setNewDeclaration({ ...newDeclaration, financialYear: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CURRENT_FY}>
                            {CURRENT_FY} (Current)
                          </SelectItem>
                          <SelectItem value={PREVIOUS_FY}>{PREVIOUS_FY}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleAddDeclaration} 
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  disabled={!newDeclaration.section || !newDeclaration.category || !newDeclaration.amount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Declaration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Declarations List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-3">Loading declarations...</p>
            </div>
          ) : declarations.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent>
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No declarations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your tax-saving declarations to get started
                </p>
                <Button 
                  onClick={() => document.getElementById('section')?.focus()}
                  variant="outline"
                >
                  Add First Declaration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ScrollArea className="h-[400px] rounded-lg border">
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
                        {declarations.map((declaration) => (
                          <TableRow key={declaration.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-blue-100 rounded">
                                  <FileText className="h-3 w-3 text-blue-600" />
                                </div>
                                {declaration.section}
                              </div>
                            </TableCell>
                            <TableCell>{declaration.category}</TableCell>
                            <TableCell className="font-semibold">
                              ₹{declaration.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {declaration.financialYear}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(declaration.status)}>
                                {declaration.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDelete(declaration.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {declarations.map((declaration) => (
                  <Card key={declaration.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">{declaration.section}</h3>
                            <p className="text-sm text-muted-foreground">{declaration.category}</p>
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(declaration.status)}>
                          {declaration.status}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground font-medium">Amount</div>
                          <div className="text-lg font-bold text-green-600">
                            ₹{declaration.amount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground font-medium">Financial Year</div>
                          <div className="text-sm font-semibold">{declaration.financialYear}</div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(declaration.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <div className="font-medium">Total Declared Amount for {CURRENT_FY}:</div>
                    <div className="text-lg font-bold text-green-600">
                      ₹{currentFYTotal.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
