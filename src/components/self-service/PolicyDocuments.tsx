import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PolicyDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  lastUpdated: string;
}

export default function PolicyDocuments() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'hr' || userRole === 'hod';

  const [policies, setPolicies] = useState<PolicyDocument[]>([
    {
      id: '1',
      title: 'Employee Handbook',
      category: 'General',
      description: 'Complete guide to company policies, procedures, and expectations',
      lastUpdated: '2024-01-15',
    },
    {
      id: '2',
      title: 'Leave Policy',
      category: 'Leave Management',
      description: 'Details about leave types, entitlements, and application process',
      lastUpdated: '2024-01-10',
    },
    {
      id: '3',
      title: 'Code of Conduct',
      category: 'Ethics',
      description: 'Professional ethics and behavioral guidelines',
      lastUpdated: '2024-01-05',
    },
    {
      id: '4',
      title: 'Compensation & Benefits',
      category: 'Benefits',
      description: 'Information about salary structure, benefits, and perks',
      lastUpdated: '2024-01-20',
    },
    {
      id: '5',
      title: 'Remote Work Policy',
      category: 'Work Arrangements',
      description: 'Guidelines for remote and hybrid work arrangements',
      lastUpdated: '2024-01-12',
    },
    {
      id: '6',
      title: 'Data Security Policy',
      category: 'Security',
      description: 'Guidelines for handling company and customer data',
      lastUpdated: '2024-01-08',
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
  });

  const handleDownload = (policy: PolicyDocument) => {
    toast.success(`Downloading ${policy.title}`);
  };

  const handleAddNew = () => {
    setEditingPolicy(null);
    setFormData({ title: '', category: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (policy: PolicyDocument) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title,
      category: policy.category,
      description: policy.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (policyId: string) => {
    setPolicies(policies.filter(p => p.id !== policyId));
    toast.success('Policy document deleted');
  };

  const handleSave = () => {
    if (!formData.title || !formData.category || !formData.description) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingPolicy) {
      // Update existing
      setPolicies(policies.map(p => 
        p.id === editingPolicy.id 
          ? { ...p, ...formData, lastUpdated: new Date().toISOString().split('T')[0] }
          : p
      ));
      toast.success('Policy document updated');
    } else {
      // Add new
      const newPolicy: PolicyDocument = {
        id: Date.now().toString(),
        ...formData,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      setPolicies([newPolicy, ...policies]);
      toast.success('Policy document added');
    }

    setIsDialogOpen(false);
    setFormData({ title: '', category: '', description: '' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle>Policy Documents</CardTitle>
              <CardDescription>Access and download company policy documents</CardDescription>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingPolicy ? 'Edit Policy Document' : 'Add New Policy Document'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Employee Handbook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Leave Management">Leave Management</SelectItem>
                        <SelectItem value="Ethics">Ethics</SelectItem>
                        <SelectItem value="Benefits">Benefits</SelectItem>
                        <SelectItem value="Work Arrangements">Work Arrangements</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the policy document"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingPolicy ? 'Update' : 'Add'} Policy
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{policy.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Category: {policy.category}
                      </CardDescription>
                    </div>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{policy.description}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">
                      Updated: {new Date(policy.lastUpdated).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(policy)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(policy.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
