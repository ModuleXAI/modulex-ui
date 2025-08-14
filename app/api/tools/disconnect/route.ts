import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const { toolName } = await request.json()

    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      )
    }

    const modulexServerUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
    if (!modulexServerUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      )
    }

    // Get access token (supabase or default)
    const accessToken = await getCurrentUserToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unable to retrieve user token' },
        { status: 401 }
      )
    }

    // Backend'e disconnect isteği gönder
    const response = await fetch(`${modulexServerUrl}/auth/tools/${toolName}?user_id=${userId}${organizationId ? `&organization_id=${organizationId}` : ''}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Backend disconnect failed:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to disconnect tool from backend' },
        { status: response.status }
      )
    }

    console.log(`Successfully disconnected tool ${toolName} for user ${userId}`)
    
    return NextResponse.json({ 
      success: true,
      message: `Tool ${toolName} disconnected successfully`
    })

  } catch (error) {
    console.error('Disconnect API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 