import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Trash2, Eye, Plus, IndianRupee, Calendar, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { Badge } from '@/components/ui/badge';

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
  const [uploading, setUploading] = useState(false);

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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);

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
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment proof?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'investment_proofs', id));
      toast.success('Proof removed successfully');
      loadProofs();
    } catch (error) {
      console.error('Error deleting proof:', error);
      toast.error('Failed to delete proof');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      approved: { variant: 'default' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Upload className="h-5 w-5" />
            Upload Investment Proof
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Submit documents for your tax-saving investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="investmentType" className="text-sm font-medium">
                  Investment Type
                </Label>
                <Select 
                  value={newProof.investmentType} 
                  onValueChange={(value) => setNewProof({ ...newProof, investmentType: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
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
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    value={newProof.amount}
                    onChange={(e) => setNewProof({ ...newProof, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document" className="text-sm font-medium">
                Upload Document
              </Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 text-center hover:border-muted-foreground/50 transition-colors">
                <Input
                  id="document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="document" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {uploading ? 'Uploading...' : 'Click to upload document'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, JPG, PNG (Max 5MB)
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Proofs Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileCheck className="h-5 w-5" />
            Uploaded Proofs
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Your submitted investment documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading your proofs...
            </div>
          ) : proofs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No proofs uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first investment proof above
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="sm:hidden space-y-4">
                {proofs.map((proof) => (
                  <Card key={proof.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{proof.investmentType}</p>
                          <p className="text-lg font-semibold text-primary">
                            ₹{proof.amount.toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(proof.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(proof.uploadDate).toLocaleDateString()}
                      </div>
                      
                      {proof.documentUrl && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-xs"
                            onClick={() => {
                              setSelectedDoc({ url: proof.documentUrl!, name: proof.documentName });
                              setViewerOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            View Document
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(proof.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block">
                <ScrollArea className="h-[400px] rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[180px]">Investment Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proofs.map((proof) => (
                        <TableRow key={proof.id}>
                          <TableCell className="font-medium">{proof.investmentType}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{proof.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {proof.documentUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => {
                                  setSelectedDoc({ url: proof.documentUrl!, name: proof.documentName });
                                  setViewerOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                                <span className="max-w-[120px] truncate">{proof.documentName}</span>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">{proof.documentName}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(proof.uploadDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(proof.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDoc({ url: proof.documentUrl!, name: proof.documentName });
                                  setViewerOpen(true);
                                }}
                                title="View document"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(proof.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete proof"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer */}
      {selectedDoc && (
        <DocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          documentUrl={selectedDoc.url}
          documentName={selectedDoc.name}
        />
      )}
    </div>
  );
}
