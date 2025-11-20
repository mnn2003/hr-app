import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { DocumentViewer } from '@/components/ui/document-viewer';

interface InvestmentProof {
  id: string;
  investmentType: string;
  amount: number;
  documentName: string;
  documentUrl?: string;
  uploadDate: string;
  status: string;
}

export default function InvestmentProofs() {
  const { user } = useAuth();
  const [proofs, setProofs] = useState<InvestmentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProof, setNewProof] = useState({
    investmentType: '',
    amount: '',
  });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadProofs();
    }
  }, [user]);

  const loadProofs = async () => {
    try {
      const q = query(
        collection(db, 'investment_proofs'),
        where('userId', '==', user?.uid),
        orderBy('uploadDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InvestmentProof[];
      setProofs(data);
    } catch (error) {
      console.error('Error loading investment proofs:', error);
      toast.error('Failed to load investment proofs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!newProof.investmentType || !newProof.amount) {
      toast.error('Please select investment type and enter amount');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Fetch employee name
      const employeeDoc = await getDoc(doc(db, 'employees', user?.uid || ''));
      const employeeName = employeeDoc.exists() ? employeeDoc.data().name : 'Unknown';

      // Upload file to Firebase Storage
      const storageRef = ref(storage, `investment_proofs/${user?.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'investment_proofs'), {
        userId: user?.uid,
        employeeId: user?.uid,
        employeeName: employeeName,
        category: newProof.investmentType,
        investmentType: newProof.investmentType,
        amount: parseFloat(newProof.amount),
        documentName: file.name,
        documentUrl: downloadURL,
        uploadDate: new Date().toISOString(),
        uploadedDate: new Date().toISOString(),
        status: 'pending'
      });

      setNewProof({ investmentType: '', amount: '' });
      toast.success('Investment proof uploaded successfully');
      e.target.value = '';
      loadProofs();
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error('Failed to upload investment proof');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'investment_proofs', id));
      toast.success('Proof removed');
      loadProofs();
    } catch (error) {
      console.error('Error deleting proof:', error);
      toast.error('Failed to delete proof');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Investment Proof Upload
        </CardTitle>
        <CardDescription>Upload proofs for your investment declarations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Investment Type</Label>
                  <Select value={newProof.investmentType} onValueChange={(value) => setNewProof({ ...newProof, investmentType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPF">PPF</SelectItem>
                      <SelectItem value="ELSS">ELSS</SelectItem>
                      <SelectItem value="NSC">NSC</SelectItem>
                      <SelectItem value="LIC">LIC Premium</SelectItem>
                      <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                      <SelectItem value="Home Loan">Home Loan</SelectItem>
                      <SelectItem value="Education Loan">Education Loan</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newProof.amount}
                    onChange={(e) => setNewProof({ ...newProof, amount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Upload Document</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted formats: PDF, JPG, PNG (Max 5MB)
                </p>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[400px]">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proofs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No proofs uploaded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    proofs.map((proof) => (
                      <TableRow key={proof.id}>
                        <TableCell>{proof.investmentType}</TableCell>
                        <TableCell>₹{proof.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {proof.documentUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setSelectedDoc({ url: proof.documentUrl!, name: proof.documentName });
                                setViewerOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              {proof.documentName}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">{proof.documentName}</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(proof.uploadDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {proof.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(proof.id)}>
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
