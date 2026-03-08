import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ERA_835_GATING_ERROR =
  'Automated analysis requires an 835 ERA file (.edi/.x12). PDF accepted for intake.'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { upload_id } = body

    if (!upload_id) {
      return NextResponse.json({ error: 'upload_id is required' }, { status: 400 })
    }

    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Validate token — getUser(token) calls Supabase Auth server to verify
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch the upload record
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', upload_id)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // Verify user belongs to the account that owns this upload
    const { data: accountUser, error: accountError } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('account_id', upload.account_id)
      .single()

    if (accountError || !accountUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // File-type gate: only 835 ERA files can be analyzed
    if (upload.source_type !== 'era_835') {
      await supabase
        .from('uploads')
        .update({
          status: 'error',
          error_message: ERA_835_GATING_ERROR,
          updated_at: new Date().toISOString(),
        })
        .eq('id', upload_id)

      return NextResponse.json({ error: ERA_835_GATING_ERROR }, { status: 400 })
    }

    // Mark as processing
    const { error: updateError } = await supabase
      .from('uploads')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', upload_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update upload status' }, { status: 500 })
    }

    // TODO: enqueue background 835 parsing job

    return NextResponse.json({
      success: true,
      upload_id,
      status: 'processing',
      message: 'Analysis started',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
