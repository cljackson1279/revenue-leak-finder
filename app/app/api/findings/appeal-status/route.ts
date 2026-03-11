import { NextResponse } from 'next/server'
import { authenticateRequest, AuthError } from '@/lib/auth'
import type { AppealStatus } from '@/lib/parse835'

const VALID_STATUSES: AppealStatus[] = ['not_filed', 'filed', 'won', 'lost', 'resubmitted']

export async function PATCH(request: Request) {
  try {
    let auth
    try {
      auth = await authenticateRequest(request)
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status })
      }
      throw e
    }

    const { supabase, accountId } = auth
    const body = await request.json()
    const { finding_id, appeal_status } = body

    if (!finding_id) {
      return NextResponse.json({ error: 'finding_id is required' }, { status: 400 })
    }

    if (!appeal_status || !VALID_STATUSES.includes(appeal_status)) {
      return NextResponse.json(
        { error: `appeal_status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the finding belongs to this account
    const { data: finding, error: fetchError } = await supabase
      .from('findings')
      .select('id, account_id, finding_type')
      .eq('id', finding_id)
      .eq('account_id', accountId)
      .single()

    if (fetchError || !finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('findings')
      .update({ appeal_status })
      .eq('id', finding_id)
      .eq('account_id', accountId)

    if (updateError) {
      console.error('[appeal-status] update error', updateError.message)
      return NextResponse.json({ error: 'Failed to update appeal status' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, finding_id, appeal_status })
  } catch (error) {
    console.error('[appeal-status] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
