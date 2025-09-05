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
    const status = searchParams.get('status') || undefined
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'
    const organizationId = searchParams.get('organization_id') || undefined

    const backendUrl = new URL(`${modulexServerUrl}/dashboard/users`)
    backendUrl.searchParams.set('page', page)
    backendUrl.searchParams.set('limit', limit)
    if (status) backendUrl.searchParams.set('status', status)
    if (organizationId) backendUrl.searchParams.set('organization_id', organizationId)

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      const message = await getApiErrorMessage(response, 'Failed to load users')
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


