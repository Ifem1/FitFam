// Poll Consensus Edge Function — triggered by pg_cron every minute
// Checks GenLayer for finalized transactions and updates plan status in DB
// Contract: 0x2CE19654c18Ceb2A24Af43Dc82890673225EA71f
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getTransactionReceipt } from '../_shared/genlayer.ts'

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch all plans still waiting for consensus
    const { data: pendingPlans, error } = await supabase
      .from('plans')
      .select('id, contract_transaction_hash')
      .eq('status', 'pending')
      .not('contract_transaction_hash', 'is', null)

    if (error) throw error
    if (!pendingPlans || pendingPlans.length === 0) {
      return new Response(JSON.stringify({ processed: 0, pending: 0 }), { status: 200 })
    }

    let processed = 0

    for (const plan of pendingPlans) {
      try {
        const receipt = await getTransactionReceipt(plan.contract_transaction_hash) as Record<string, unknown> | null
        if (!receipt) continue

        const status = receipt.status as string | undefined

        // GenLayer terminal statuses: FINALIZED, ACCEPTED, FAILED, REJECTED
        if (status === 'FINALIZED' || status === 'ACCEPTED') {
          // Extract the on-chain plan_id returned by submit_fitness_profile
          // GenLayer returns the return value in receipt.result
          const contractPlanId = receipt.result !== undefined && receipt.result !== null
            ? String(receipt.result)
            : null

          await supabase
            .from('plans')
            .update({
              status: 'locked',
              contract_plan_id: contractPlanId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'confirmed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        } else if (status === 'FAILED' || status === 'REJECTED') {
          const errMsg = (receipt.error as string) ?? (receipt.exception as string) ?? 'GenLayer consensus failed'

          await supabase
            .from('plans')
            .update({
              status: 'failed',
              error_message: errMsg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        }
        // Any other status (PENDING, PROPOSING, etc.) — leave and check again next poll
      } catch {
        // Per-plan errors don't abort the loop
      }
    }

    return new Response(
      JSON.stringify({ processed, pending: pendingPlans.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
