import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, User, Loader2, Building, Navigation } from 'lucide-react';

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
  punchInAddress?: string;
  punchOutAddress?: string;
}

const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Enhanced reverse geocoding with multiple free services
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Try multiple geocoding services in parallel
      const geocodingPromises = [
        // Service 1: BigDataCloud (most reliable)
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
          .then(res => res.ok ? res.json() : Promise.reject('BigDataCloud failed'))
          .then(data => formatBigDataCloudAddress(data)),

        // Service 2: OpenStreetMap Nominatim (detailed addresses)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
          .then(res => res.ok ? res.json() : Promise.reject('OSM failed'))
          .then(data => formatOSMAddress(data)),

        // Service 3: LocationIQ (free tier available)
        fetch(`https://us1.locationiq.com/v1/reverse.php?key=pk.5f6e01e63336e442d8d803e702a9a3ce&lat=${lat}&lon=${lng}&format=json`)
          .then(res => res.ok ? res.json() : Promise.reject('LocationIQ failed'))
          .then(data => formatLocationIQAddress(data))
      ];

      // Wait for the first successful response
      const results = await Promise.allSettled(geocodingPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && result.value !== 'Address not available') {
          console.log('Geocoding success:', result.value);
          return result.value;
        }
      }

      // If all services fail, return coordinates
      return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    } catch (error) {
      console.error('All reverse geocoding services failed:', error);
      return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const formatBigDataCloudAddress = (data: any): string => {
    const parts = [];
    
    // Use the most specific location information available
    if (data.locality) parts.push(data.locality); // Building/Area name
    if (data.city && data.city !== data.locality) parts.push(data.city);
    if (data.principalSubdivision) parts.push(data.principalSubdivision);
    
    // If we have very little info, try to get more specific
    if (parts.length === 0) {
      if (data.continent) parts.push(data.continent);
      if (data.countryName) parts.push(data.countryName);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  const formatOSMAddress = (data: any): string => {
    if (!data.address) return 'Address not available';
    
    const address = data.address;
    const parts = [];
    
    // Building and street level details (most specific)
    if (address.building) parts.push(address.building);
    if (address.amenity) parts.push(address.amenity); // e.g., "Starbucks", "Shopping Mall"
    if (address.road) parts.push(address.road);
    if (address.neighbourhood) parts.push(address.neighbourhood);
    if (address.suburb) parts.push(address.suburb);
    if (address.city_district) parts.push(address.city_district);
    
    // City and administrative levels
    if (address.city) parts.push(address.city);
    if (address.town) parts.push(address.town);
    if (address.village) parts.push(address.village);
    
    // Remove duplicates and return
    const uniqueParts = [...new Set(parts)];
    return uniqueParts.length > 0 ? uniqueParts.join(', ') : data.display_name || 'Address not available';
  };

  const formatLocationIQAddress = (data: any): string => {
    const parts = [];
    
    if (data.address) {
      const addr = data.address;
      
      // Get specific building/place information
      if (addr.building) parts.push(addr.building);
      if (addr.amenity) parts.push(addr.amenity);
      if (addr.road) parts.push(addr.road);
      if (addr.neighbourhood) parts.push(addr.neighbourhood);
      if (addr.suburb) parts.push(addr.suburb);
      if (addr.city) parts.push(addr.city);
      if (addr.town) parts.push(addr.town);
      if (addr.county) parts.push(addr.county);
      if (addr.state) parts.push(addr.state);
    }
    
    return parts.length > 0 ? parts.join(', ') : data.display_name || 'Address not available';
  };

  const fetchAddressForRecord = async (record: AttendanceWithEmployee, index: number) => {
    const recordKey = `${record.id}-${index}`;
    
    setLocationLoading(prev => ({ ...prev, [recordKey]: true }));

    let punchInAddress = '';
    let punchOutAddress = '';

    try {
      // Get punch in address with enhanced geocoding
      if (record.punchInLocation && typeof record.punchInLocation === 'object' && 
          record.punchInLocation.lat && record.punchInLocation.lng) {
        console.log('Fetching punch in address for:', record.punchInLocation);
        punchInAddress = await reverseGeocode(
          record.punchInLocation.lat, 
          record.punchInLocation.lng
        );
      }

      // Get punch out address with enhanced geocoding
      if (record.punchOutLocation && typeof record.punchOutLocation === 'object' && 
          record.punchOutLocation.lat && record.punchOutLocation.lng) {
        console.log('Fetching punch out address for:', record.punchOutLocation);
        punchOutAddress = await reverseGeocode(
          record.punchOutLocation.lat, 
          record.punchOutLocation.lng
        );
      }
    } catch (error) {
      console.error('Error fetching addresses for record:', error);
    }

    setLocationLoading(prev => ({ ...prev, [recordKey]: false }));

    return {
      ...record,
      punchInAddress: punchInAddress || 'Location unavailable',
      punchOutAddress: punchOutAddress || 'Location unavailable'
    };
  };

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

      // Fetch enhanced addresses for all records
      const recordsWithAddresses = await Promise.all(
        recordsWithEmployees.map((record, index) => fetchAddressForRecord(record, index))
      );
      
      setAttendanceRecords(recordsWithAddresses);
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
        hour12: true
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

  const renderLocation = (location: any, address: string, isLoading: boolean, recordKey: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Detecting precise location...
        </div>
      );
    }

    if (address && address !== 'Location unavailable') {
      return (
        <div className="text-xs text-muted-foreground mt-1">
          <div className="flex items-start gap-1">
            <Building className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">{address}</div>
              {location && location.accuracy && (
                <div className="text-green-600 mt-1 flex items-center gap-1">
                  <Navigation className="h-2 w-2" />
                  Accuracy: ~{Math.round(location.accuracy)}m
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (location && typeof location === 'object' && location.lat && location.lng) {
      return (
        <div className="text-xs text-muted-foreground mt-1">
          <div className="flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <div>Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</div>
              {location.accuracy && (
                <div className="text-orange-600 mt-1 flex items-center gap-1">
                  <Navigation className="h-2 w-2" />
                  Accuracy: ~{Math.round(location.accuracy)}m
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
        <MapPin className="h-3 w-3" />
        Location data unavailable
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance Records
          <Badge variant="secondary" className="ml-2">
            {attendanceRecords.length} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading attendance records...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attendanceRecords.map((record, index) => {
              const recordKey = `${record.id}-${index}`;
              const isLoading = locationLoading[recordKey];
              
              return (
                <div key={record.id} className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-lg">{record.employeeName}</p>
                        {record.employeeCode && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            ID: {record.employeeCode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {record.date}
                      </p>
                    </div>
                    <Badge variant={record.punchOut ? 'default' : 'secondary'} className="text-xs">
                      {record.punchOut ? '✅ Complete' : '🟡 In Progress'}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-green-600" />
                        Punch In
                      </p>
                      <p className="font-medium text-green-700">{formatTime(record.punchIn)}</p>
                      {renderLocation(record.punchInLocation, record.punchInAddress || '', isLoading, recordKey)}
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" />
                        Punch Out
                      </p>
                      <p className="font-medium text-blue-700">
                        {record.punchOut ? formatTime(record.punchOut) : 'Not punched out'}
                      </p>
                      {record.punchOut && renderLocation(record.punchOutLocation, record.punchOutAddress || '', isLoading, recordKey)}
                    </div>
                  </div>

                  {record.punchOut && calculateHours(record.punchIn, record.punchOut) && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        Total: {calculateHours(record.punchIn, record.punchOut)}
                      </Badge>
                      {record.punchInLocation?.accuracy && (
                        <span className="text-xs text-muted-foreground">
                          Location accuracy: ~{Math.round(record.punchInLocation.accuracy)}m
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
