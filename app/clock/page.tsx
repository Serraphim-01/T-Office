'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, LogIn, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  is_active: boolean;
}

interface AttendanceRecord {
  id: number;
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  location?: string;
}

export default function ClockPage() {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isInGeofence, setIsInGeofence] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [lastClockAction, setLastClockAction] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]>([]);

  useEffect(() => {
    if (user) {
      fetchLocations();
      fetchAttendanceRecords();
      getCurrentLocation();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/locations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/attendance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data);
        // Check if user is currently clocked in
        const lastRecord = data[0];
        if (lastRecord && lastRecord.type === 'clock_in') {
          setIsClockedIn(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        checkGeofenceStatus(latitude, longitude);
        setLocationError(null);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError('Unable to get your location. Please enable location services.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const checkGeofenceStatus = (lat: number, lng: number) => {
    const inGeofence = locations.some(location => {
      if (!location.is_active) return false;
      const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
      return distance <= location.radius_meters;
    });
    setIsInGeofence(inGeofence);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleClockIn = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng,
        }),
      });

      if (response.ok) {
        setIsClockedIn(true);
        setLastClockAction('Clocked In');
        fetchAttendanceRecords();
        alert('Successfully clocked in!');
      } else {
        alert('Failed to clock in. You may need to be within the office geofence.');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Error clocking in');
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng,
        }),
      });

      if (response.ok) {
        setIsClockedIn(false);
        setLastClockAction('Clocked Out');
        fetchAttendanceRecords();
        alert('Successfully clocked out!');
      } else {
        alert('Failed to clock out.');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Error clocking out');
    }
  };



  const MapComponent = ({ center, zoom, locations, currentLocation, onMapLoad }: any) => {
    useEffect(() => {
      const map = new google.maps.Map(document.getElementById('map')!, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      onMapLoad(map);
    }, [center, zoom, onMapLoad]);

    return <div id="map" className="w-full h-96 rounded-lg" />;
  };

  const renderMap = (status: Status) => {
    if (status === Status.LOADING) return <div>Loading map...</div>;
    if (status === Status.FAILURE) return <div>Error loading map</div>;

    return <MapComponent
      center={{ lat: currentLocation?.lat || 0, lng: currentLocation?.lng || 0 }}
      zoom={15}
      locations={locations}
      currentLocation={currentLocation}
      onMapLoad={setMapRef}
    />;
  };

  const setMapRef = (map: google.maps.Map) => {
    googleMapRef.current = map;
    renderMarkers();
  };

  const renderMarkers = () => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if ('setMap' in marker) {
        marker.setMap(null);
      } else {
        marker.map = null;
      }
    });
    markersRef.current = [];

    // Add location markers
    locations.forEach(location => {
      if (!location.is_active) return;

      const lat = parseFloat(location.latitude.toString());
      const lng = parseFloat(location.longitude.toString());

      if (isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates for location:', location.name, location.latitude, location.longitude);
        return;
      }

      // Use AdvancedMarkerElement (preferred) or fallback to regular Marker
      let marker;
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        // Create custom marker element
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #3b82f6;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">
            ${location.name.charAt(0)}
          </div>
        `;

        marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map: googleMapRef.current,
          title: location.name,
          content: markerElement,
        });
      } else {
        // Fallback to regular Marker (deprecated but still works)
        marker = new google.maps.Marker({
          position: { lat, lng },
          map: googleMapRef.current,
          title: location.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${location.name.charAt(0)}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
          },
        });
      }

      markersRef.current.push(marker);

      // Add geofence circle
      const circle = new google.maps.Circle({
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        map: googleMapRef.current,
        center: { lat, lng },
        radius: location.radius_meters,
      });
    });

    // Add current location marker
    if (currentLocation && typeof currentLocation.lat === 'number' && typeof currentLocation.lng === 'number') {
      let currentMarker;
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        // Create custom current location marker element
        const currentMarkerElement = document.createElement('div');
        currentMarkerElement.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #ef4444;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">
            <div style="
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
              position: absolute;
              top: 4px;
            "></div>
          </div>
        `;

        currentMarker = new google.maps.marker.AdvancedMarkerElement({
          position: currentLocation,
          map: googleMapRef.current,
          title: 'Your Location',
          content: currentMarkerElement,
        });
      } else {
        // Fallback to regular Marker (deprecated but still works)
        currentMarker = new google.maps.Marker({
          position: currentLocation,
          map: googleMapRef.current,
          title: 'Your Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="8" r="3" fill="white"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
          },
        });
      }
      markersRef.current.push(currentMarker);

      // Center map on current location
      googleMapRef.current.setCenter(currentLocation);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p>Please log in to access the clock-in system.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Clock In/Out</h1>
          <Button onClick={getCurrentLocation} variant="outline" size="sm">
            <MapPin className="mr-2 h-4 w-4" />
            Refresh Location
          </Button>
        </div>

        {/* Location Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Location Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationError ? (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {locationError}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={isInGeofence ? "default" : "secondary"}>
                    <MapPin className="w-3 h-3 mr-1" />
                    {isInGeofence ? 'In Office Area' : 'Outside Office Area'}
                  </Badge>
                  <Badge variant={isClockedIn ? "default" : "secondary"}>
                    {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                  </Badge>
                </div>
                {currentLocation && (
                  <div className="text-sm text-muted-foreground">
                    Current location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Map View</CardTitle>
            <CardDescription>Configured locations and your current position</CardDescription>
          </CardHeader>
          <CardContent>
            <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCkysrMJLB1w0pPgPqhHHR3oL2_djYzZOc'} libraries={['places']} render={renderMap} />
          </CardContent>
        </Card>

        {/* Clock Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Clock Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={handleClockIn}
                disabled={!isInGeofence || isClockedIn}
                className="flex-1"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Clock In
              </Button>
              <Button
                onClick={handleClockOut}
                disabled={!isInGeofence || !isClockedIn}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Clock Out
              </Button>
            </div>
            {lastClockAction && (
              <div className="mt-4 p-2 bg-green-50 text-green-700 rounded">
                {lastClockAction}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Your latest clock-in/out records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceRecords.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">No attendance records yet</div>
              ) : (
                attendanceRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {record.type === 'clock_in' ? (
                        <LogIn className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium">
                          {record.type === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(record.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.location && (
                        <Badge variant="outline">{record.location}</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
