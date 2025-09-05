import { getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const url = new URL(`${modulexServerUrl}/organizations/invitations/${encodeURIComponent(params.id)}/cancel`)
    if (organizationId) url.searchParams.set('organization_id', organizationId)

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    let body: any = null
    try {
      body = await res.clone().json()
    } catch {}
    return NextResponse.json(body || {}, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


