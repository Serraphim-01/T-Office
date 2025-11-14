# Location Management Features for Clock Page

## Backend Changes
- [x] Add user_locations table schema to create_migration.sql
- [x] Add user_locations table drop to drop_migration.sql
- [x] Add user location management API endpoints to backend/index.js
  - [x] GET /api/user-locations - Fetch user's locations
  - [x] POST /api/user-locations - Create new user location
  - [x] PUT /api/user-locations/:id - Update user location
  - [x] DELETE /api/user-locations/:id - Delete user location
  - [x] Update geofencing logic to include user locations
- [x] Add indexes and triggers for user_locations table

## Frontend Changes (app/clock/page.tsx)
- [x] Add state for user locations, form inputs, selected location
- [x] Add form above map for location details input (name, lat, lng, radius, address)
- [x] Add save location button with API call
- [x] Add sidebar/list displaying user locations with switch and delete buttons
- [x] Add default location button (coordinates: 6.432849, 3.419528)
- [x] Update map centering logic for selected location
- [x] Handle API responses and errors
- [x] Update location checking to include user locations

## Testing
- [ ] Test location management features (save, switch, delete, default)
- [ ] Test geofencing with user locations
- [ ] Test clock in/out with user locations
