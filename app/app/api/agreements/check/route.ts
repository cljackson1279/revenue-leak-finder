import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AGREEMENT_VERSION = 'v1.0'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Authenticate via Bearer token (primary) or cookie fallback
    let userId: string | null = null
    const authHeader = req.headers.get('authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    if (bearerToken) {
      const { data: { user }, error } = await serviceClient.auth.getUser(bearerToken)
      if (user && !error) userId = user.id
    }

    if (!userId) {
      // Fallback: try @supabase/ssr cookie approach
      try {
        const { createServerClient } = await import('@supabase/ssr')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const userClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll() {},
          },
        })
        const { data: { user } } = await userClient.auth.getUser()
        if (user) userId = user.id
      } catch { /* ignore */ }
    }

    if (!userId) {
      return NextResponse.json({ signed: false, reason: 'unauthenticated' })
    }

    const { data: agreement } = await serviceClient
      .from('agreements')
      .select('id, agreed_at')
      .eq('client_id', userId)
      .eq('agreement_version', AGREEMENT_VERSION)
      .maybeSingle()

    return NextResponse.json({
      signed: !!agreement,
      agreementId: agreement?.id || null,
      agreedAt: agreement?.agreed_at || null,
      version: AGREEMENT_VERSION,
    })
  } catch (err: any) {
    console.error('[agreements/check]', err)
    return NextResponse.json({ signed: false, reason: 'error' })
  }
}
