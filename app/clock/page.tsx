/// <reference types="google.maps" />

'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MapPin, Clock, LogIn, LogOut, Navigation, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { useState, useEffect, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import io from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AccessDenied } from '@/components/access-denied';

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  is_active: boolean;
}

interface UserLocation extends Location {
  user_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

interface AttendanceRecord {
  id: number;
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  location?: string;
}

export default function ClockPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isInGeofence, setIsInGeofence] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [lastClockAction, setLastClockAction] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '100',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManageLocations, setCanManageLocations] = useState(false);
  const [canDeleteLocations, setCanDeleteLocations] = useState(false);
  const [canUseClock, setCanUseClock] = useState(true); // Track if user can use clock feature
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]>([]);
  const socketRef = useRef<any>(null);

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (user) {
      // Initialize socket connection
      socketRef.current = io('http://localhost:4000');
      
      // Listen for location added events
      socketRef.current.on('location_added', (newLocation: UserLocation) => {
        setUserLocations(prev => {
          // Check if location already exists to prevent duplicates
          const exists = prev.some(loc => loc.id === newLocation.id);
          if (!exists) {
            return [...prev, newLocation];
          }
          return prev;
        });
        renderMarkers(); // Update map markers
      });
      
      // Listen for location deleted events
      socketRef.current.on('location_deleted', (deletedLocation: { id: number }) => {
        setUserLocations(prev => prev.filter(location => location.id !== deletedLocation.id));
        renderMarkers(); // Update map markers
      });
    }
    
    // Clean up socket connection
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to main clock page first
    const clockAccess = await hasPageAccess(user.id.toString(), 'clock');
    setCanUseClock(clockAccess); // Set the main clock access state
    
    if (!clockAccess) {
      // If no access to main clock page, disable all clock features
      setCanManageLocations(false);
      setCanDeleteLocations(false);
      return;
    }
    
    // Check access to specific clock features
    const manageLocationsAccess = await hasPageAccess(user.id.toString(), 'clock/manage-locations');
    const deleteLocationsAccess = await hasPageAccess(user.id.toString(), 'clock/delete-locations');
    
    setCanManageLocations(manageLocationsAccess);
    setCanDeleteLocations(deleteLocationsAccess);
  };

  useEffect(() => {
    if (user) {
      fetchLocations();
      fetchUserLocations();
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

  const fetchUserLocations = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/user-locations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserLocations(data);
      }
    } catch (error) {
      console.error('Failed to fetch user locations:', error);
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
        // Map backend fields to frontend expected fields
        const mappedData = data.map((record: any) => ({
          id: record.id,
          type: record.event_type, // Map event_type to type
          timestamp: record.timestamp,
          location: record.location_name, // Map location_name to location
        }));
        setAttendanceRecords(mappedData);
        // Check if user is currently clocked in
        const lastRecord = mappedData[0];
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
    // Check global locations (system locations)
    const inGlobalGeofence = locations.some(location => {
      if (!location.is_active) return false;
      const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
      return distance <= location.radius_meters;
    });

    // Check user locations (all user-created locations)
    const inUserGeofence = userLocations.some(location => {
      if (!location.is_active) return false;
      const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
      return distance <= location.radius_meters;
    });

    setIsInGeofence(inGlobalGeofence || inUserGeofence);
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

  const handleSaveLocation = async () => {
    if (!locationForm.name || !locationForm.latitude || !locationForm.longitude) {
      setError('Name, latitude, and longitude are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4000/api/user-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: locationForm.name,
          latitude: parseFloat(locationForm.latitude),
          longitude: parseFloat(locationForm.longitude),
          radius_meters: parseInt(locationForm.radius_meters) || 100,
          address: locationForm.address || null,
        }),
      });

      if (response.ok) {
        const newLocation = await response.json();
        // The real-time update will come through the WebSocket
        // We don't need to manually update the state here anymore
        setLocationForm({
          name: '',
          latitude: '',
          longitude: '',
          radius_meters: '100',
          address: ''
        });
        // Toast notification will be shown globally by the notification context
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save location');
        toast({
          title: "Error",
          description: errorData.error || 'Failed to save location',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving location:', error);
      setError('Error saving location');
      toast({
        title: "Error",
        description: 'Failed to save location',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultLocation = () => {
    setLocationForm({
      name: 'Default Location',
      latitude: '6.432849',
      longitude: '3.419528',
      radius_meters: '100',
      address: ''
    });
  };

  const handleToggleLocation = async (locationId: number, checked: boolean) => {
    try {
      const response = await fetch(`http://localhost:4000/api/user-locations/${locationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ is_active: checked }),
      });

      if (response.ok) {
        setUserLocations(prev =>
          prev.map(location =>
            location.id === locationId ? { ...location, is_active: checked } : location
          )
        );
        renderMarkers(); // Update map markers
      } else {
        alert('Failed to update location status');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location');
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/user-locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        // The real-time update will come through the WebSocket
        // We don't need to manually update the state here anymore
        // Toast notification will be shown globally by the notification context
      } else {
        toast({
          title: "Error",
          description: 'Failed to delete location',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: 'Failed to delete location',
        variant: "destructive",
      });
    }
  };



  const MapComponent = ({ center, zoom, locations, userLocations, currentLocation, selectedLocation, onMapLoad }: any) => {
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
      userLocations={userLocations}
      currentLocation={currentLocation}
      selectedLocation={selectedLocation}
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

    // Add global location markers (blue)
    locations.forEach((location: Location) => {
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

    // Add user location markers (green)
    userLocations.forEach((location: UserLocation) => {
      if (!location.is_active) return;

      const lat = parseFloat(location.latitude.toString());
      const lng = parseFloat(location.longitude.toString());

      if (isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates for user location:', location.name, location.latitude, location.longitude);
        return;
      }

      let marker;
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        // Create custom marker element for user locations
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #10b981;
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
        // Fallback to regular Marker
        marker = new google.maps.Marker({
          position: { lat, lng },
          map: googleMapRef.current,
          title: location.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${location.name.charAt(0)}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
          },
        });
      }

      markersRef.current.push(marker);

      // Add geofence circle for user locations
      const circle = new google.maps.Circle({
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#10b981',
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

  // If user doesn't have access to clock page, show access denied message
  if (!canUseClock) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border bg-background">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <Clock className="mr-3 h-6 w-6 text-primary" />
                  Clock In/Out
                </h1>
                <p className="text-muted-foreground mt-1">
                  Time tracking and location management system
                </p>
              </div>
            </div>
          </div>
          <AccessDenied 
            featureName="clock" 
            returnUrl="/dashboard"
            returnLabel="Return to Dashboard"
          />
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
                    Current location: {Number(currentLocation.lat).toFixed(6)}, {Number(currentLocation.lng).toFixed(6)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Management - Only show if user has manage locations access */}
        {canManageLocations && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Manage Your Locations
              </CardTitle>
              <CardDescription>Add, edit, and manage your personal clock-in locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Name</label>
                  <input
                    type="text"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Home Office"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address (Optional)</label>
                  <input
                    type="text"
                    value={locationForm.address}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., 123 Main St, City"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.latitude}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="e.g., 40.7128"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.longitude}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="e.g., -74.0060"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Radius (meters)</label>
                  <input
                    type="number"
                    value={locationForm.radius_meters}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, radius_meters: e.target.value }))}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <Button
                    onClick={handleSaveLocation}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Saving...' : 'Save Location'}
                  </Button>
                  <Button
                    onClick={handleSetDefaultLocation}
                    variant="outline"
                    disabled={isLoading}
                  >
                    Default Location
                  </Button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Locations List - Only show if user has manage locations access */}
        {canManageLocations && (
          <Card>
            <CardHeader>
              <CardTitle>Your Locations</CardTitle>
              <CardDescription>Manage your saved locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userLocations.length === 0 ? (
                  <div className="text-muted-foreground text-center py-4">No locations saved yet</div>
                ) : (
                  userLocations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}
                            {location.address && ` • ${location.address}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Only show delete button if user has delete locations access */}
                        {canDeleteLocations && (
                          <Button
                            onClick={() => handleDeleteLocation(location.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Map View</CardTitle>
            <CardDescription>Global locations (blue) and your locations (green) with current position</CardDescription>
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
