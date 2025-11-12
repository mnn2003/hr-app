import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Cake, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EmployeeBirthday {
  id: string;
  name: string;
  dateOfBirth: string;
  department?: string;
  daysUntil: number;
  isToday: boolean;
}

const BirthdayWidget = () => {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState<EmployeeBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishMessage, setWishMessage] = useState('');
  const [sendingWish, setSendingWish] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeBirthday | null>(null);

  const predefinedWishes = [
    "🎉 Happy Birthday! Wishing you a fantastic day filled with joy and happiness!",
    "🎂 Happy Birthday! May this year bring you success and prosperity!",
    "🎈 Wishing you a wonderful birthday and a year full of blessings!",
    "🌟 Happy Birthday! May all your dreams come true this year!",
    "🎁 Happy Birthday! Hope your special day is as amazing as you are!"
  ];

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'employees'));
      const employees = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingBirthdays: EmployeeBirthday[] = [];

      employees.forEach((emp: any) => {
        if (emp.dateOfBirth) {
          try {
            // Handle various date formats (YYYY-MM-DD, MM/DD/YYYY, timestamp)
            let birthDate: Date;
            
            if (typeof emp.dateOfBirth === 'string') {
              // Try parsing as ISO date (YYYY-MM-DD)
              if (emp.dateOfBirth.includes('-')) {
                const [year, month, day] = emp.dateOfBirth.split('-').map(Number);
                birthDate = new Date(year, month - 1, day);
              } else if (emp.dateOfBirth.includes('/')) {
                // Try parsing as MM/DD/YYYY
                birthDate = new Date(emp.dateOfBirth);
              } else {
                birthDate = new Date(emp.dateOfBirth);
              }
            } else {
              birthDate = new Date(emp.dateOfBirth);
            }

            // Validate the date
            if (isNaN(birthDate.getTime())) {
              console.error(`Invalid date for employee ${emp.name}:`, emp.dateOfBirth);
              return;
            }

            const thisYearBirthday = new Date(
              today.getFullYear(),
              birthDate.getMonth(),
              birthDate.getDate()
            );
            thisYearBirthday.setHours(0, 0, 0, 0);

            // If birthday has passed this year, check next year
            if (thisYearBirthday < today) {
              thisYearBirthday.setFullYear(today.getFullYear() + 1);
            }

            const daysUntil = Math.ceil(
              (thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Include today's birthdays and next 4 days
            if (daysUntil >= 0 && daysUntil <= 4) {
              upcomingBirthdays.push({
                id: emp.id,
                name: emp.name,
                dateOfBirth: emp.dateOfBirth,
                department: emp.department,
                daysUntil,
                isToday: daysUntil === 0
              });
            }
          } catch (err) {
            console.error(`Error processing birthday for employee ${emp.name}:`, err);
          }
        }
      });

      // Sort by days until birthday
      upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
      setBirthdays(upcomingBirthdays);
      console.log('Upcoming birthdays:', upcomingBirthdays);
    } catch (error) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBirthdayText = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `In ${daysUntil} days`;
  };

  const sendBirthdayWish = async () => {
    if (!user || !selectedEmployee || !wishMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a birthday wish',
        variant: 'destructive'
      });
      return;
    }

    setSendingWish(true);
    try {
      // Get sender's name
      const senderSnapshot = await getDocs(collection(db, 'employees'));
      const senderDoc = senderSnapshot.docs.find(doc => doc.data().userId === user.uid);
      const senderName = senderDoc?.data()?.name || user.email?.split('@')[0] || 'Someone';

      await addDoc(collection(db, 'notifications'), {
        title: '🎂 Birthday Wish',
        message: `${senderName} says: ${wishMessage.trim()}`,
        type: 'birthday',
        createdAt: new Date().toISOString(),
        readBy: [],
        sentBy: user.uid,
        sentByName: senderName,
        recipientId: selectedEmployee.id
      });

      toast({
        title: 'Success',
        description: `Birthday wish sent to ${selectedEmployee.name}!`
      });

      setWishMessage('');
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error sending birthday wish:', error);
      toast({
        title: 'Error',
        description: 'Failed to send birthday wish',
        variant: 'destructive'
      });
    } finally {
      setSendingWish(false);
    }
  };

  if (loading) {
    return null;
  }

  if (birthdays.length === 0) {
    return (
      <Card className="border-birthday/20 bg-gradient-to-br from-birthday/5 to-birthday/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Cake className="h-6 w-6 text-birthday" />
            Birthdays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Currently there are no Birthday's today
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-birthday/20 bg-gradient-to-br from-birthday/5 to-birthday/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Cake className="h-6 w-6 text-birthday" />
          Upcoming Birthdays
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {birthdays.map((birthday) => (
            <div 
              key={birthday.id} 
              className={`p-3 rounded-lg flex items-center gap-3 transition-all ${
                birthday.isToday 
                  ? 'bg-birthday/20 border-2 border-birthday animate-pulse' 
                  : 'bg-card border border-border hover:border-birthday/30'
              }`}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-birthday text-white text-lg font-semibold">
                  {birthday.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{birthday.name}</p>
                {birthday.department && (
                  <p className="text-xs text-muted-foreground">{birthday.department}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={birthday.isToday ? 'default' : 'outline'}
                  className={birthday.isToday ? 'bg-birthday text-white' : 'border-birthday text-birthday'}
                >
                  {formatBirthdayText(birthday.daysUntil)}
                </Badge>
                {birthday.isToday && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-birthday text-birthday hover:bg-birthday hover:text-white"
                        onClick={() => setSelectedEmployee(birthday)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Birthday Wish to {birthday.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Select a message or write your own</Label>
                          <div className="space-y-2">
                            {predefinedWishes.map((wish, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                className="w-full justify-start text-left h-auto py-2 px-3"
                                onClick={() => setWishMessage(wish)}
                              >
                                {wish}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          placeholder="Or type your own birthday wish..."
                          value={wishMessage}
                          onChange={(e) => setWishMessage(e.target.value)}
                          rows={3}
                        />
                        <Button 
                          onClick={sendBirthdayWish} 
                          disabled={sendingWish}
                          className="w-full"
                        >
                          {sendingWish ? 'Sending...' : 'Send Birthday Wish 🎉'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BirthdayWidget;
