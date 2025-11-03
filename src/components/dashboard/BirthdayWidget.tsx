import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Cake } from 'lucide-react';

interface EmployeeBirthday {
  id: string;
  name: string;
  dateOfBirth: string;
  department?: string;
  daysUntil: number;
  isToday: boolean;
}

const BirthdayWidget = () => {
  const [birthdays, setBirthdays] = useState<EmployeeBirthday[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || birthdays.length === 0) {
    return null;
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
              <Badge 
                variant={birthday.isToday ? 'default' : 'outline'}
                className={birthday.isToday ? 'bg-birthday text-white' : 'border-birthday text-birthday'}
              >
                {formatBirthdayText(birthday.daysUntil)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BirthdayWidget;
