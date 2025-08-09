import { setCookie } from '@/lib/utils/cookies'

export interface UserInfo {
  id: string
  email: string
  name?: string | null
  role?: string | null
  createdAt?: string | null
  [key: string]: unknown
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: UserInfo
  expires_in?: number
}

export async function loginWithDefaultProvider(params: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_MODULEX_HOST
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_MODULEX_HOST is not configured')
  }

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: params.email, password: params.password })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Login failed with status ${response.status}`)
  }

  const authResponse = (await response.json()) as AuthResponse

  // Save cookies expected by middleware and the app
  setCookie('access-token', authResponse.access_token)
  setCookie('refresh-token', authResponse.refresh_token)
  setCookie('host-address', baseUrl)

  return authResponse
}


