import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Upload, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { DocumentViewer } from '@/components/ui/document-viewer';

export default function ITRAssistance() {
  const { user } = useAuth();
  const [uploadedDocuments, setUploadedDocuments] = useState<{ id: string; name: string; url: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const q = query(
        collection(db, 'itr_documents'),
        where('userId', '==', user?.uid),
        orderBy('uploadDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().documentName,
        url: doc.data().documentUrl,
        date: doc.data().uploadDate
      }));
      setUploadedDocuments(data);
    } catch (error) {
      console.error('Error loading ITR documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `itr_documents/${user?.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'itr_documents'), {
        userId: user?.uid,
        documentName: file.name,
        documentUrl: downloadURL,
        uploadDate: new Date().toISOString()
      });

      toast.success('Document uploaded successfully');
      e.target.value = '';
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const downloadSampleDocuments = () => {
    toast.success('Downloading sample ITR documents');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ITR Assistance Documents
        </CardTitle>
        <CardDescription>Upload and manage documents for Income Tax Return filing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label>Upload Documents</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload Form 16, Form 26AS, or any other relevant documents
                  </p>
                </div>
                <Button onClick={downloadSampleDocuments} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample Documents
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-3">Uploaded Documents</h3>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              {uploadedDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents uploaded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded on {new Date(doc.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {doc.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDoc({ url: doc.url, name: doc.name });
                            setViewerOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Card className="bg-muted">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">ITR Filing Guidelines</h3>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Ensure all Form 16 details are accurate</li>
                <li>Upload Form 26AS from income tax portal</li>
                <li>Include bank statements and investment proofs</li>
                <li>Verify all income sources are declared</li>
                <li>Keep all documents ready before filing</li>
              </ul>
            </CardContent>
          </Card>
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
