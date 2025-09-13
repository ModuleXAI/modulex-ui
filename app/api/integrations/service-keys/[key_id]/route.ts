import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { getApiErrorMessage } from '@/lib/utils/api-error'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request, context: any) {
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

    const { params } = (context || {}) as { params: { key_id: string } }
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || undefined

    const backendUrl = new URL(`${modulexServerUrl}/integrations/service-keys/${encodeURIComponent(params?.key_id || '')}`)
    if (organizationId) backendUrl.searchParams.set('organization_id', organizationId)

    const response = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const message = await getApiErrorMessage(response, 'Failed to delete service key')
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


