import { getCurrentUserToken } from '@/lib/auth/get-current-user'
import { getApiErrorMessage } from '@/lib/utils/api-error'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const modulexServerUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
    if (!modulexServerUrl) {
      return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 })
    }

    const accessToken = await getCurrentUserToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Unable to retrieve user token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || undefined
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'
    const period = searchParams.get('period') || '24h'

    const backendUrl = new URL(`${modulexServerUrl}/dashboard/logs`)
    backendUrl.searchParams.set('limit', limit)
    backendUrl.searchParams.set('offset', offset)
    backendUrl.searchParams.set('period', period)
    if (organizationId) backendUrl.searchParams.set('organization_id', organizationId)

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const message = await getApiErrorMessage(response, 'Failed to load logs')
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


