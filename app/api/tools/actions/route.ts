import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/tools/toggle-tool
// Toggle tool active status
export async function PUT(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  try {
    const { action } = params
    const userId = await getCurrentUserId()
    
    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const mcpServerUrl = process.env.MCP_SERVER_URL
    const mcpApiKey = process.env.MCP_SERVER_API_KEY

    if (!mcpServerUrl || !mcpApiKey) {
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

    if (action === 'toggle-tool') {
      const { toolName, isActive } = await request.json()
      
      const response = await fetch(
        `${mcpServerUrl}/auth/tools/${toolName}/status?user_id=${userId}`,
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
    }
    
    else if (action === 'toggle-action') {
      const { toolName, actionName, isActive } = await request.json()
      
      const response = await fetch(
        `${mcpServerUrl}/auth/tools/${toolName}/actions/${actionName}/status?user_id=${userId}`,
        {
          method: 'PUT',
          headers: {
            'X-API-KEY': `${mcpApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_disabled: !isActive // is_active true ise is_disabled false gönderiyoruz
          })
        }
      )

      if (!response.ok) {
        console.error('MCP server error:', response.status, response.statusText)
        return NextResponse.json(
          { error: 'Failed to toggle action status' },
          { status: response.status }
        )
      }

      const result = await response.json()
      return NextResponse.json(result)
    }
    
    else if (action === 'auth-url') {
      const { toolName } = await request.json()
      
      const response = await fetch(
        `${mcpServerUrl}/auth/url/${toolName}?user_id=${userId}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': `${mcpApiKey}`,
          },
        }
      )

      if (!response.ok) {
        console.error('MCP server error:', response.status, response.statusText)
        return NextResponse.json(
          { error: 'Failed to get auth URL' },
          { status: response.status }
        )
      }

      const result = await response.json()
      return NextResponse.json(result)
    }
    
    else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 