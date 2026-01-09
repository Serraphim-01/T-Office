# Service Worker Fix for PWA Auth Issues

## Current Status
- Service Worker intercepts API requests and manifest.json
- API requests fail with 401 because credentials aren't passed
- manifest.json returns 401 even though bypassed in middleware

## Tasks
- [x] Update public/sw.js to skip all /api/* routes
- [x] Ensure manifest.json is not intercepted
- [x] Create vercel.json with rewrite to bypass Vercel SSO
- [x] Update PWA provider to use new manifest URL
- [x] Remove manifest from layout metadata
- [ ] Deploy and test the fix

## Testing Results
- [x] Service Worker updated to skip API routes
- [x] vercel.json created with /app-manifest.json rewrite
- [x] PWA provider updated to dynamically add manifest link
- [ ] Deploy and verify /app-manifest.json accessible

## Files to Edit
- public/sw.js

## Testing Steps
- Deploy updated SW
- Clear SW cache and reload PWA
- Verify manifest.json loads without 401
- Verify API calls work properly
