import { NextResponse, type NextRequest } from 'next/server';

// Define public paths that should bypass authentication
const publicPaths = [
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',
  '/api/public/', // Public API endpoints
];

// Define static asset paths that should bypass authentication
const staticAssetPrefixes = [
  '/_next/',
  '/static/',
  '/images/',
  '/icons/',
  '/fonts/',
  '/css/',
  '/js/',
  '/assets/',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is a public path that should bypass authentication
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  // Check if the path is a static asset that should bypass authentication
  const isStaticAsset = staticAssetPrefixes.some(prefix => 
    pathname.startsWith(prefix)
  );

  // If it's a public path or static asset, skip authentication
  if (isPublicPath || isStaticAsset) {
    return NextResponse.next();
  }

  // For all other paths, continue with default behavior
  // (authentication will be handled by the client-side AuthProvider)
  return NextResponse.next();
}

// Apply middleware to all paths except the ones we want to bypass
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.ico$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$).*)',
  ],
};