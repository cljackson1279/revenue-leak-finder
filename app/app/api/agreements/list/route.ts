import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const serviceClient = getServiceClient()

  // Primary: Bearer token in Authorization header
  const authHeader = req.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (bearerToken) {
    const { data: { user }, error } = await serviceClient.auth.getUser(bearerToken)
    if (user && !error) return user.id
  }

  // Fallback: @supabase/ssr cookie approach
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (user) return user.id
  } catch { /* ignore */ }

  return null
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const serviceClient = getServiceClient()

    // Check admin role
    const { data: accountUser } = await serviceClient
      .from('account_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (!accountUser || accountUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all agreements
    const { data: agreements, error } = await serviceClient
      .from('agreements')
      .select('id, full_name, title, practice_name, agreed_at, ip_address, agreement_version, pdf_sent, client_id, account_id')
      .order('agreed_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agreements: agreements || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
