import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    const { toolName, actionName, isActive } = await request.json()
    
    // Backend endpoint: PUT /tools/{tool_name}/actions/{action_name}/status
    // Backend expects is_disabled (inverted from isActive)
    const response = await fetch(
      `${modulexServerUrl}/auth/tools/${toolName}/actions/${actionName}/status?user_id=${userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_disabled: !isActive  // Convert isActive to is_disabled
        })
      }
    )

    if (!response.ok) {
      console.error('Backend error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to toggle action status' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Action toggle API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 