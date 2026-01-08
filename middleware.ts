import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🔥 ABSOLUTE PUBLIC BYPASS
  if (
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  // For all other paths, continue with default behavior
  // (authentication will be handled by the client-side AuthProvider)
  return NextResponse.next();
}

// Apply middleware to all paths
export const config = {
  matcher: '/:path*',
};