import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { upload_id } = body

    if (!upload_id) {
      return NextResponse.json({ error: 'upload_id is required' }, { status: 400 })
    }

    // Create Supabase client (server-side)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the upload record
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', upload_id)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // Verify the user has access to this upload via their account
    const { data: accountUser, error: accountError } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('account_id', upload.account_id)
      .single()

    if (accountError || !accountUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('uploads')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', upload_id)

    if (updateError) {
      console.error('Error updating upload status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update upload status' },
        { status: 500 }
      )
    }

    // TODO: Trigger actual analysis job here (835 parsing, etc.)
    // For now, we just update the status to processing
    // In production, you would:
    // 1. Queue a background job
    // 2. Download file from storage
    // 3. Parse 835/PDF
    // 4. Store results
    // 5. Update status to 'complete'

    return NextResponse.json({
      success: true,
      upload_id,
      status: 'processing',
      message: 'Analysis started',
    })
  } catch (error) {
    console.error('Error in analyze endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
