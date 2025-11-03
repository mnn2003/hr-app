import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Calendar from 'react-calendar';
import { Clock, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import 'react-calendar/dist/Calendar.css';

interface AttendanceTabProps {
  onAttendanceUpdate?: () => void;
}

const AttendanceTab = ({ onAttendanceUpdate }: AttendanceTabProps) => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    fetchAttendance();
    fetchHolidays();
  }, [user]);

  const fetchHolidays = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'holidays'));
      const holidayList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHolidays(holidayList);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  // Enhanced accurate location service
  const getAccurateLocation = (): Promise<{ 
    lat: number; 
    lng: number; 
    accuracy: number;
    address?: string;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true, // Most important for accuracy
        timeout: 15000, // 15 seconds
        maximumAge: 0 // Don't use cached position
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log('📍 Location accuracy:', accuracy, 'meters');
          
          // Only accept locations with reasonable accuracy
          if (accuracy > 50) { // 50 meters threshold for good accuracy
            console.warn('Location accuracy may be low:', accuracy, 'meters');
            // We'll still use it but warn the user
          }
          
          try {
            // Get address immediately while we have fresh coordinates
            const address = await reverseGeocode(latitude, longitude);
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              address: address
            });
          } catch (geocodeError) {
            // Still resolve with coordinates if geocoding fails
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy: accuracy
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  // Enhanced reverse geocoding with multiple fallbacks
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Try BigDataCloud first (most reliable free service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return formatAddress(data);
      }
      
      // Fallback to OpenStreetMap
      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      );
      
      if (osmResponse.ok) {
        const data = await osmResponse.json();
        return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
      
      throw new Error('All geocoding services failed');
      
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Return precise coordinates as fallback
      return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const formatAddress = (data: any): string => {
    const parts = [];
    
    // Build address from most specific to general
    if (data.locality) parts.push(data.locality);
    if (data.city && data.city !== data.locality) parts.push(data.city);
    if (data.principalSubdivision) parts.push(data.principalSubdivision);
    if (data.countryName) parts.push(data.countryName);
    
    return parts.length > 0 ? parts.join(', ') : 'Location details unavailable';
  };

  const fetchAttendance = async () => {
    if (!user) return;
    try {
      // Method 1: Try with ordering (requires index)
      try {
        const q = query(
          collection(db, 'attendance'),
          where('employeeId', '==', user.uid),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setAttendanceRecords(records);

        const today = new Date().toISOString().split('T')[0];
        const todayRec = records.find((r: any) => r.date === today);
        setTodayRecord(todayRec);
      } catch (error: any) {
        if (error.code === 'failed-precondition') {
          console.log('Firestore index missing, fetching without order...');
          // Method 2: Fetch without orderBy and sort manually
          const q = query(
            collection(db, 'attendance'),
            where('employeeId', '==', user.uid)
          );
          const snapshot = await getDocs(q);
          const records = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setAttendanceRecords(records);

          const today = new Date().toISOString().split('T')[0];
          const todayRec = records.find((r: any) => r.date === today);
          setTodayRecord(todayRec);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance records');
    }
  };

  const handlePunchIn = async () => {
    try {
      // Check if already punched in today
      const today = new Date().toISOString().split('T')[0];
      if (todayRecord) {
        toast.error('You have already punched in today!');
        return;
      }

      setIsGettingLocation(true);
      const location = await getAccurateLocation();
      
      const attendanceData: any = {
        employeeId: user!.uid,
        date: today,
        punchIn: new Date().toISOString(),
        punchInLocation: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString()
        },
        punchOut: null,
        punchOutLocation: null
      };

      // Add address if available
      if (location.address) {
        attendanceData.punchInAddress = location.address;
      }

      await addDoc(collection(db, 'attendance'), attendanceData);
      
      toast.success(`Punched in successfully! ${location.accuracy <= 50 ? '✓' : '⚠'}`, {
        icon: location.accuracy <= 50 ? '✅' : '📍'
      });
      
      if (location.accuracy > 50) {
        toast('Location accuracy may be low. Ensure GPS is enabled.', { icon: '⚠️' });
      }
      
      fetchAttendance();
      onAttendanceUpdate?.();
    } catch (error: any) {
      console.error('Punch in error:', error);
      toast.error(error.message || 'Failed to punch in');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      if (!todayRecord) {
        toast.error('No punch in record found for today!');
        return;
      }

      if (todayRecord.punchOut) {
        toast.error('You have already punched out today!');
        return;
      }

      setIsGettingLocation(true);
      const location = await getAccurateLocation();
      
      const updateData: any = {
        punchOut: new Date().toISOString(),
        punchOutLocation: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString()
        }
      };

      // Add address if available
      if (location.address) {
        updateData.punchOutAddress = location.address;
      }
      
      await updateDoc(doc(db, 'attendance', todayRecord.id), updateData);
      
      toast.success(`Punched out successfully! ${location.accuracy <= 50 ? '✓' : '⚠'}`, {
        icon: location.accuracy <= 50 ? '✅' : '📍'
      });
      
      fetchAttendance();
      onAttendanceUpdate?.();
    } catch (error: any) {
      console.error('Punch out error:', error);
      toast.error(error.message || 'Failed to punch out. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const tileClassName = ({ date, view }: any) => {
    if (view !== 'month') return '';
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = attendanceRecords.find((r: any) => r.date === dateStr);
    const holiday = holidays.find((h: any) => h.date === dateStr);
    const isSunday = date.getDay() === 0;
    const isFuture = date > new Date();
    
    // Don't style future dates
    if (isFuture) return 'text-muted-foreground/50';
    
    // Priority order: Holiday > Present > Absent > Sunday
    if (holiday) return 'bg-purple-500/20 text-purple-700 font-bold hover:bg-purple-500/30';
    if (record) return 'bg-green-500/20 text-green-700 font-semibold hover:bg-green-500/30';
    if (isSunday) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    
    // Mark as absent only if it's a weekday (Mon-Fri) in the past
    const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
    const isPastWeekday = date < new Date() && isWeekday;
    
    if (isPastWeekday) {
      return 'bg-red-100 text-red-600 font-semibold hover:bg-red-200';
    }
    
    return '';
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find((h: any) => h.date === dateStr);
    const attendance = attendanceRecords.find((r: any) => r.date === dateStr);
    
    if (holiday) {
      setSelectedHoliday(holiday);
      setShowHolidayDialog(true);
    } else if (attendance) {
      setSelectedAttendance(attendance);
      setShowAttendanceDialog(true);
    }
  };

  // Enhanced location display in dialogs
  const renderLocationDetails = (attendance: any, type: 'punchIn' | 'punchOut') => {
    const location = attendance[`${type}Location`];
    const address = attendance[`${type}Address`];
    
    if (!location) return null;

    return (
      <div className="mt-2 p-2 bg-muted rounded text-xs">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="font-medium">{type === 'punchIn' ? 'Punch In' : 'Punch Out'} Location:</span>
        </div>
        {address ? (
          <div className="mt-1">
            <div className="text-green-600">{address}</div>
            {location.accuracy && (
              <div className="text-muted-foreground">
                Accuracy: ~{Math.round(location.accuracy)} meters
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1">
            <div>Coordinates: {location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}</div>
            {location.accuracy && (
              <div className="text-orange-600">
                Accuracy: ~{Math.round(location.accuracy)} meters
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-primary" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {todayRecord ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Punch In</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Date(todayRecord.punchIn).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                  {todayRecord.punchInAddress && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {todayRecord.punchInAddress}
                    </p>
                  )}
                </div>
                {todayRecord.punchOut && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Punch Out</p>
                    <p className="text-2xl font-bold text-red-600">
                      {new Date(todayRecord.punchOut).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                    {todayRecord.punchOutAddress && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {todayRecord.punchOutAddress}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {!todayRecord.punchOut && (
                <Button 
                  onClick={handlePunchOut} 
                  variant="destructive" 
                  size="lg"
                  className="w-full"
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-5 w-5" />
                      Punch Out
                    </>
                  )}
                </Button>
              )}
              {todayRecord.punchOut && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-xl font-bold text-primary">
                    {((new Date(todayRecord.punchOut).getTime() - new Date(todayRecord.punchIn).getTime()) / (1000 * 60 * 60)).toFixed(2)} hrs
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <Clock className="h-16 w-16 mx-auto text-muted-foreground/30" />
              </div>
              <Button 
                onClick={handlePunchIn} 
                size="lg" 
                className="w-full md:w-auto"
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Getting Precise Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-5 w-5" />
                    Punch In
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Ensure location services are enabled for accurate tracking
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rest of your existing calendar and dialog code remains the same */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm">✅ Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-200"></div>
                <span className="text-sm">❌ Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500"></div>
                <span className="text-sm">🎉 Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-200"></div>
                <span className="text-sm">🌟 Sunday</span>
              </div>
            </div>
            <Calendar
              onChange={(value: any) => setSelectedDate(value)}
              onClickDay={handleDateClick}
              value={selectedDate}
              tileClassName={tileClassName}
              className="w-full"
            />
            {attendanceRecords.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-4">
                No attendance records found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Holiday Details</DialogTitle>
          </DialogHeader>
          {selectedHoliday && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-semibold">{format(new Date(selectedHoliday.date), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Holiday Name</p>
                <p className="text-lg font-semibold">{selectedHoliday.name}</p>
              </div>
              {selectedHoliday.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-base">{selectedHoliday.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
          </DialogHeader>
          {selectedAttendance && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-semibold">{format(new Date(selectedAttendance.date), 'MMMM dd, yyyy')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Punch In</p>
                  <p className="text-lg font-semibold text-green-600">
                    {new Date(selectedAttendance.punchIn).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                  {renderLocationDetails(selectedAttendance, 'punchIn')}
                </div>
                {selectedAttendance.punchOut && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Punch Out</p>
                    <p className="text-lg font-semibold text-red-600">
                      {new Date(selectedAttendance.punchOut).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                    {renderLocationDetails(selectedAttendance, 'punchOut')}
                  </div>
                )}
              </div>
              {selectedAttendance.punchOut && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-sm text-muted-foreground">Total Hours Worked</p>
                  <p className="text-2xl font-bold text-primary">
                    {((new Date(selectedAttendance.punchOut).getTime() - new Date(selectedAttendance.punchIn).getTime()) / (1000 * 60 * 60)).toFixed(2)} hours
                  </p>
                </div>
              )}
              {!selectedAttendance.punchOut && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                  <p className="text-sm text-yellow-700">No punch out recorded for this day</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceTab;
