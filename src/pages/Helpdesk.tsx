import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NotificationBell from '@/components/notifications/NotificationBell';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  createdBy: string;
  createdAt: string;
  responses: { respondedBy: string; message: string; timestamp: string }[];
}

export default function Helpdesk() {
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'HR System',
    logoUrl: ''
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: '',
    description: '',
  });
  const [responseMessage, setResponseMessage] = useState('');

  const isAdmin = userRole === 'hr' || userRole === 'hod';

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
      if (settingsDoc.exists()) {
        setSystemSettings(settingsDoc.data() as any);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const handleCreateTicket = () => {
    if (!newTicket.subject || !newTicket.category || !newTicket.priority || !newTicket.description) {
      toast.error('Please fill in all fields');
      return;
    }

    const ticket: Ticket = {
      id: Date.now().toString(),
      ticketNumber: `TKT${Date.now().toString().slice(-6)}`,
      ...newTicket,
      status: 'open',
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      responses: [],
    };

    setTickets([ticket, ...tickets]);
    setNewTicket({ subject: '', category: '', priority: '', description: '' });
    toast.success('Ticket created successfully');
  };

  const handleAddResponse = () => {
    if (!selectedTicket || !responseMessage) return;

    const updatedTicket = {
      ...selectedTicket,
      responses: [
        ...selectedTicket.responses,
        {
          respondedBy: isAdmin ? 'HR Admin' : 'Employee',
          message: responseMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setTickets(tickets.map(t => (t.id === selectedTicket.id ? updatedTicket : t)));
    setSelectedTicket(updatedTicket);
    setResponseMessage('');
    toast.success('Response added');
  };

  const handleUpdateStatus = (ticketId: string, status: string) => {
    setTickets(tickets.map(t => (t.id === ticketId ? { ...t, status } : t)));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status });
    }
    toast.success('Ticket status updated');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        {userRole && <AppSidebar />}
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  {systemSettings.logoUrl ? (
                    <img 
                      src={systemSettings.logoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      HR
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <h1 className="text-sm font-semibold">{systemSettings.systemName}</h1>
                    <p className="text-xs text-muted-foreground capitalize">{userRole || 'User'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <NotificationBell />
                <SidebarTrigger className="hidden lg:flex" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Helpdesk System</CardTitle>
              <CardDescription>Submit and track support tickets</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      placeholder="Brief description of the issue"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payroll">Payroll</SelectItem>
                          <SelectItem value="leave">Leave Management</SelectItem>
                          <SelectItem value="attendance">Attendance</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="benefits">Benefits & Insurance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      placeholder="Detailed description of your issue"
                      rows={5}
                    />
                  </div>
                  <Button onClick={handleCreateTicket} className="w-full">Create Ticket</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No tickets found. Create your first ticket!
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.status)}
                            <span className="capitalize">{ticket.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Ticket Details - {ticket.ticketNumber}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Subject</Label>
                                    <p className="text-sm mt-1">{ticket.subject}</p>
                                  </div>
                                  <div>
                                    <Label>Category</Label>
                                    <p className="text-sm mt-1"><Badge variant="outline">{ticket.category}</Badge></p>
                                  </div>
                                  <div>
                                    <Label>Priority</Label>
                                    <p className="text-sm mt-1"><Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge></p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    {isAdmin ? (
                                      <Select value={ticket.status} onValueChange={(value) => handleUpdateStatus(ticket.id, value)}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="open">Open</SelectItem>
                                          <SelectItem value="in-progress">In Progress</SelectItem>
                                          <SelectItem value="resolved">Resolved</SelectItem>
                                          <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <p className="text-sm mt-1 capitalize">{ticket.status}</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
                                </div>
                                <div>
                                  <Label>Responses ({ticket.responses.length})</Label>
                                  <ScrollArea className="h-48 border rounded-md p-3 mt-2">
                                    {ticket.responses.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No responses yet</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {ticket.responses.map((response, index) => (
                                          <div key={index} className="border-b pb-2 last:border-0">
                                            <div className="flex justify-between items-start mb-1">
                                              <span className="font-medium text-sm">{response.respondedBy}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(response.timestamp).toLocaleString()}
                                              </span>
                                            </div>
                                            <p className="text-sm">{response.message}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </ScrollArea>
                                </div>
                                <div>
                                  <Label>Add Response</Label>
                                  <Textarea
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    placeholder="Type your response here..."
                                    rows={3}
                                    className="mt-2"
                                  />
                                  <Button onClick={handleAddResponse} className="mt-2">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Add Response
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
