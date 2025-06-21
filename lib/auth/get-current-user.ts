import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  return {
    id: 'f888c9ab-92a6-43ab-97ec-c686b969e7ba',
    email: 'test@test.com',
    name: 'Test User',
    image: 'https://via.placeholder.com/150',
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-01T00:00:00Z',
    is_admin: true,
    is_active: true,
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null // Supabase is not configured
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

export async function getCurrentUserId() {
  //"const user = await getCurrentUser()
  //supabase user
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  console.log(data)
  return data.user?.id ?? 'anonymous'
  //return 'f888c9ab-92a6-43ab-97ec-c686b969e7ba'


}

export async function getCurrentUserToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null // Supabase is not configured
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
