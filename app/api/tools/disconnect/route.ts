import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
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

    const mcpServerUrl = process.env.MCP_SERVER_URL
    const mcpApiKey = process.env.MCP_SERVER_API_KEY

    if (!mcpServerUrl || !mcpApiKey) {
      return NextResponse.json(
        { error: 'MCP server not configured' },
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

    // MCP server'a disconnect isteği gönder
    const response = await fetch(`${mcpServerUrl}/auth/tools/${toolName}?user_id=${userId}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': `${mcpApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('MCP server disconnect failed:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to disconnect tool from MCP server' },
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