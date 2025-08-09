export type AuthProvider = 'default' | 'supabase'

export function getAuthProvider(): AuthProvider {
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || '').toLowerCase()
  if (provider === 'default') return 'default'
  return 'supabase'
}

export function isDefaultProvider(): boolean {
  return getAuthProvider() === 'default'
}

export function isSupabaseProvider(): boolean {
  return getAuthProvider() === 'supabase'
}


