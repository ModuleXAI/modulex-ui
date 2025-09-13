import { getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request, context: any) {
  try {
    const modulexServerUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
    if (!modulexServerUrl) {
      return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 })
    }
    const accessToken = await getCurrentUserToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Unable to retrieve user token' }, { status: 401 })
    }

    const { params } = (context || {}) as { params: { id: string } }
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    if (!organizationId) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 })
    }

    const url = `${modulexServerUrl}/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(params?.id || '')}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    let data: any = null
    try { data = await res.clone().json() } catch {}
    return NextResponse.json(data || {}, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


