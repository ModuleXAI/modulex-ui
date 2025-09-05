import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId || userId === 'anonymous') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const modulexServerUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
    if (!modulexServerUrl) {
      return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 })
    }

    const accessToken = await getCurrentUserToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Unable to retrieve user token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    if (!organizationId) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 })
    }

    const backendUrl = new URL(`${modulexServerUrl}/subscriptions/organization-plans`)
    backendUrl.searchParams.set('organization_id', organizationId)

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const text = await response.text().catch(() => '')
    if (!response.ok) {
      try {
        const json = text ? JSON.parse(text) : { error: 'Request failed' }
        return NextResponse.json(json, { status: response.status })
      } catch {
        return NextResponse.json({ error: text || 'Request failed' }, { status: response.status })
      }
    }

    try {
      const json = text ? JSON.parse(text) : {}
      return NextResponse.json(json)
    } catch {
      return new NextResponse(text, { status: 200 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


