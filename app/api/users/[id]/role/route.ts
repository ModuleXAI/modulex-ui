import { getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, context: any) {
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

    const body = await request.json().catch(() => ({})) as { role?: 'admin' | 'member' }
    const role = body.role
    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
    }

    const url = `${modulexServerUrl}/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(params?.id || '')}/role`
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    })

    let data: any = null
    try { data = await res.clone().json() } catch {}
    return NextResponse.json(data || {}, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


