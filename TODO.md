# Clock-In System Fixes

## Pending Tasks
- [x] Fix frontend data mapping in fetchAttendanceRecords function (event_type -> type, location_name -> location)
- [x] Modify backend POST /api/user-locations to save to global locations table with created_by = userId
- [x] Update backend GET /api/user-locations to fetch from global locations table where created_by = userId
- [x] Update PUT/DELETE endpoints for user locations to work with global locations table
- [x] Update migration files to reflect schema changes
- [x] Test the changes to ensure locations are visible to all users and attendance displays correctly
- [x] Fix checkUserInGeofence function to query 'locations' table instead of 'user_locations' for user-created locations
