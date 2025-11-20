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
import { Receipt, Plus, FileText, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { DocumentViewer } from '@/components/ui/document-viewer';

interface Reimbursement {
  id: string;
  category: string;
  amount: number;
  description: string;
  dateIncurred: string;
  submittedDate: string;
  status: string;
  documentName?: string;
  documentUrl?: string;
}

export default function Reimbursements() {
  const { user } = useAuth();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReimbursement, setNewReimbursement] = useState({
    category: '',
    amount: '',
    description: '',
    dateIncurred: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadReimbursements();
    }
  }, [user]);

  const loadReimbursements = async () => {
    try {
      const q = query(
        collection(db, 'reimbursements'),
        where('userId', '==', user?.uid),
        orderBy('submittedDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reimbursement[];
      setReimbursements(data);
    } catch (error) {
      console.error('Error loading reimbursements:', error);
      toast.error('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!newReimbursement.category || !newReimbursement.amount || !newReimbursement.description || !newReimbursement.dateIncurred) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Fetch employee name
      const employeeDoc = await getDoc(doc(db, 'employees', user?.uid || ''));
      const employeeName = employeeDoc.exists() ? employeeDoc.data().name : 'Unknown';

      let documentUrl = '';
      let documentName = '';

      // Upload file if selected
      if (selectedFile) {
        const storageRef = ref(storage, `reimbursements/${user?.uid}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        documentUrl = await getDownloadURL(storageRef);
        documentName = selectedFile.name;
      }

      await addDoc(collection(db, 'reimbursements'), {
        userId: user?.uid,
        employeeId: user?.uid,
        employeeName: employeeName,
        category: newReimbursement.category,
        amount: parseFloat(newReimbursement.amount),
        description: newReimbursement.description,
        dateIncurred: newReimbursement.dateIncurred,
        submittedDate: new Date().toISOString(),
        status: 'pending',
        ...(documentUrl && { documentUrl, documentName })
      });

      setNewReimbursement({ category: '', amount: '', description: '', dateIncurred: '' });
      setSelectedFile(null);
      toast.success('Reimbursement claim submitted successfully');
      loadReimbursements();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit reimbursement claim');
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
              <Receipt className="h-5 w-5" />
              Reimbursement Claims
            </CardTitle>
            <CardDescription>Submit and track expense reimbursement claims</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Reimbursement Claim</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={newReimbursement.category} onValueChange={(value) => setNewReimbursement({ ...newReimbursement, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Travel">Travel Expenses</SelectItem>
                        <SelectItem value="Medical">Medical Expenses</SelectItem>
                        <SelectItem value="Phone">Phone/Internet</SelectItem>
                        <SelectItem value="Food">Food & Entertainment</SelectItem>
                        <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={newReimbursement.amount}
                      onChange={(e) => setNewReimbursement({ ...newReimbursement, amount: e.target.value })}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label>Date of Expense</Label>
                    <Input
                      type="date"
                      value={newReimbursement.dateIncurred}
                      onChange={(e) => setNewReimbursement({ ...newReimbursement, dateIncurred: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Upload Receipt</Label>
                    <Input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newReimbursement.description}
                    onChange={(e) => setNewReimbursement({ ...newReimbursement, description: e.target.value })}
                    placeholder="Provide details about the expense"
                    rows={4}
                  />
                </div>
                <Button onClick={handleSubmitClaim} className="w-full">
                  Submit Claim
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Incurred</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimbursements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No reimbursement claims found
                    </TableCell>
                  </TableRow>
                ) : (
                  reimbursements.map((reimbursement) => (
                    <TableRow key={reimbursement.id}>
                      <TableCell>{new Date(reimbursement.submittedDate).toLocaleDateString()}</TableCell>
                      <TableCell>{reimbursement.category}</TableCell>
                      <TableCell className="font-semibold">₹{reimbursement.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(reimbursement.dateIncurred).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{reimbursement.description}</TableCell>
                      <TableCell>
                        {reimbursement.documentUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setSelectedDoc({ url: reimbursement.documentUrl!, name: reimbursement.documentName! });
                              setViewerOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            {reimbursement.documentName}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">No document</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(reimbursement.status)}>
                          {reimbursement.status}
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

      {selectedDoc && (
        <DocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          documentUrl={selectedDoc.url}
          documentName={selectedDoc.name}
        />
      )}
    </Card>
  );
}
