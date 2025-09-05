import { getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'id param is required' }, { status: 400 })
    }

    const modulexServerUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
    if (!modulexServerUrl) {
      return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 })
    }

    const accessToken = await getCurrentUserToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${modulexServerUrl}/organizations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const text = await response.text().catch(() => '')
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok) {
      try {
        const json = text ? JSON.parse(text) : { error: 'Request failed' }
        return NextResponse.json(json, { status: response.status })
      } catch {
        return NextResponse.json({ error: text || 'Request failed' }, { status: response.status })
      }
    }

    if (contentType.includes('application/json')) {
      try {
        const json = text ? JSON.parse(text) : {}
        return NextResponse.json(json)
      } catch {
        // fallthrough to text
      }
    }

    return new NextResponse(text, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'id param is required' }, { status: 400 })
    }

    const modulexServerUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
    if (!modulexServerUrl) {
      return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 })
    }

    const accessToken = await getCurrentUserToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${modulexServerUrl}/organizations/${encodeURIComponent(id)}/rename`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const text = await response.text().catch(() => '')
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok) {
      try {
        const json = text ? JSON.parse(text) : { error: 'Request failed' }
        return NextResponse.json(json, { status: response.status })
      } catch {
        return NextResponse.json({ error: text || 'Request failed' }, { status: response.status })
      }
    }

    if (contentType.includes('application/json')) {
      try {
        const json = text ? JSON.parse(text) : {}
        return NextResponse.json(json)
      } catch {
        // fallthrough to text
      }
    }

    return new NextResponse(text, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


