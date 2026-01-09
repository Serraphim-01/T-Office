# Service Worker Fix for PWA Auth Issues

## Current Status
- Service Worker intercepts API requests and manifest.json
- API requests fail with 401 because credentials aren't passed
- manifest.json returns 401 even though bypassed in middleware

## Tasks
- [x] Update public/sw.js to skip all /api/* routes
- [x] Ensure manifest.json is not intercepted
- [ ] Deploy and test the fix

## Files to Edit
- public/sw.js

## Testing Steps
- Deploy updated SW
- Clear SW cache and reload PWA
- Verify manifest.json loads without 401
- Verify API calls work properly
