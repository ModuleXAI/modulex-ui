import { isDefaultProvider } from '@/lib/auth/provider'
import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the protocol from X-Forwarded-Proto header or request protocol
  const protocol =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol

  // Get the host from X-Forwarded-Host header or request host
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || ''

  // Construct the base URL - ensure protocol has :// format
  const baseUrl = `${protocol}${protocol.endsWith(':') ? '//' : '://'}${host}`

  // Create a response
  let response: NextResponse

  // Route based on auth provider
  if (isDefaultProvider()) {
    // Public paths that don't require authentication (root '/' is protected now)
    const publicPaths = ['/auth', '/share', '/api']
    const pathname = request.nextUrl.pathname

    const isPublic = publicPaths.some(path => pathname.startsWith(path))
    const accessToken = request.cookies.get('access-token')?.value
    const hasAuth = Boolean(accessToken)

    if (!hasAuth && !isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    response = NextResponse.next({ request })
  } else {
    // Supabase session handling (existing flow)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      response = await updateSession(request)
    } else {
      response = NextResponse.next({ request })
    }
  }

  // Removed extra diagnostic headers for performance

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
