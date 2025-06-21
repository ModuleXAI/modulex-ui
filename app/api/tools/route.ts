import { getCurrentUserId, getCurrentUserToken } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
  
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

    const response = await fetch(
      `${mcpServerUrl}/auth/tools?user_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('MCP server error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch tools from MCP server' },
        { status: response.status }
      )
    }

    const toolsData = await response.json()
    return NextResponse.json(toolsData)
    
  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    
    const response = await fetch(
      `${mcpServerUrl}/auth/tools?user_id=${userId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      console.error('MCP server error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to update tools on MCP server' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 