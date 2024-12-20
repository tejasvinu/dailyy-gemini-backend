import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const response = NextResponse.next()
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
    const origin = request.headers.get('origin')
    const validOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

    response.headers.set('Access-Control-Allow-Origin', validOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: response.headers
        })
    }

    return response
}

export const config = {
    matcher: '/api/:path*',
}
