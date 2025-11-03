import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, User } from 'lucide-react';

interface AttendanceWithEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  date: string;
  punchIn: any;
  punchOut?: any;
  punchInLocation?: any;
  punchOutLocation?: any;
  totalHours?: number;
}

const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'attendance'), orderBy('date', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      
      const recordsWithEmployees = await Promise.all(
        snapshot.docs.map(async (attendanceDoc) => {
          const attendanceData = attendanceDoc.data();
          let employeeName = 'Unknown';
          let employeeCode = '';
          
          try {
            const employeeDoc = await getDoc(doc(db, 'employees', attendanceData.employeeId));
            if (employeeDoc.exists()) {
              const empData = employeeDoc.data();
              employeeName = empData.name || 'Unknown';
              employeeCode = empData.employeeCode || '';
            }
          } catch (error) {
            console.error('Error fetching employee:', error);
          }
          
          return {
            id: attendanceDoc.id,
            ...attendanceData,
            employeeName,
            employeeCode,
          } as AttendanceWithEmployee;
        })
      );
      
      setAttendanceRecords(recordsWithEmployees);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid';
    }
  };

  const calculateHours = (punchIn: any, punchOut: any) => {
    if (!punchIn || !punchOut) return null;
    try {
      const diff = new Date(punchOut).getTime() - new Date(punchIn).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Records</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {attendanceRecords.map(record => (
              <div key={record.id} className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{record.employeeName}</p>
                      {record.employeeCode && (
                        <Badge variant="outline" className="text-xs">{record.employeeCode}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {record.date}
                    </p>
                  </div>
                  <Badge variant={record.punchOut ? 'default' : 'secondary'}>
                    {record.punchOut ? 'Complete' : 'In Progress'}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded">
                    <p className="text-xs text-muted-foreground mb-1">Punch In</p>
                    <p className="font-medium">{formatTime(record.punchIn)}</p>
                    {record.punchInLocation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {typeof record.punchInLocation === 'object' && record.punchInLocation.lat && record.punchInLocation.lng
                          ? `${record.punchInLocation.lat.toFixed(4)}, ${record.punchInLocation.lng.toFixed(4)}`
                          : record.punchInLocation}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-muted rounded">
                    <p className="text-xs text-muted-foreground mb-1">Punch Out</p>
                    <p className="font-medium">{formatTime(record.punchOut)}</p>
                    {record.punchOutLocation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {typeof record.punchOutLocation === 'object' && record.punchOutLocation.lat && record.punchOutLocation.lng
                          ? `${record.punchOutLocation.lat.toFixed(4)}, ${record.punchOutLocation.lng.toFixed(4)}`
                          : record.punchOutLocation}
                      </p>
                    )}
                  </div>
                </div>

                {record.punchOut && calculateHours(record.punchIn, record.punchOut) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      Total: {calculateHours(record.punchIn, record.punchOut)}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
            {attendanceRecords.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No attendance records found</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManagement;
