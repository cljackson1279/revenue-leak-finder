import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const AGREEMENT_VERSION = 'v1.0'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const cookieStore = await cookies()
    const userClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    })

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ signed: false, reason: 'unauthenticated' })
    }

    const serviceClient = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: agreement } = await serviceClient
      .from('agreements')
      .select('id, agreed_at')
      .eq('client_id', user.id)
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
