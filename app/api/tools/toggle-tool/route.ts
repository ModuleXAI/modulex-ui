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
    const mcpApiKey = process.env.MCP_SERVER_API_KEY

    if (!modulexServerUrl || !mcpApiKey) {
      return NextResponse.json(
        { error: 'MCP server configuration missing' },
        { status: 500 }
      )
    }

    // Get Supabase access token
    const supabaseToken = await getCurrentUserToken()
    if (!supabaseToken) {
      return NextResponse.json(
        { error: 'Unable to retrieve user token' },
        { status: 401 }
      )
    }

    const { toolName, isActive } = await request.json()
    
    // Backend endpoint: PUT /tools/{tool_name}/status
    const response = await fetch(
      `${modulexServerUrl}/auth/tools/${toolName}/status?user_id=${userId}`,
      {
        method: 'PUT',
        headers: {
          'X-API-KEY': `${mcpApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: isActive
        })
      }
    )

    if (!response.ok) {
      console.error('MCP server error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to toggle tool status' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Tools toggle API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 