import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Query parameter'dan toolName'i al
    const { searchParams } = new URL(request.url)
    const toolName = searchParams.get('toolName')

    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required as query parameter' },
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

    // MCP server'dan auth URL'ini al
    const response = await fetch(`${mcpServerUrl}/auth/url/${toolName}?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mcpApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('MCP server auth URL failed:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to get auth URL from MCP server' },
        { status: response.status }
      )
    }

    const authData = await response.json()
    
    // Response format:
    // {
    //   "auth_url": "https://github.com/login/oauth/authorize?...",
    //   "state": "dQtUQdMz9UlSVcoVkYDoEkWRmqGLpJ00zBGLoWO7xrs",
    //   "tool_name": "github"
    // }

    console.log(`Auth URL generated for tool ${toolName}:`, authData.auth_url)
    
    return NextResponse.json(authData)

  } catch (error) {
    console.error('Auth URL API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 