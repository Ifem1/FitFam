// Pay For Plan Edge Function
// Calls FitnessPlanContract.mark_plan_paid on StudioNet, fetches plan content, unlocks in DB
// Contract: 0x2CE19654c18Ceb2A24Af43Dc82890673225EA71f
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  decryptPrivateKey,
  sendContractTransaction,
  callContractView,
} from '../_shared/genlayer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid token')

    const { plan_id } = await req.json()
    if (!plan_id) throw new Error('Missing plan_id')

    // Fetch plan and verify ownership
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()
    if (planError || !plan) throw new Error('Plan not found')
    if (plan.status === 'unlocked') throw new Error('Plan is already unlocked')
    if (plan.status === 'pending') throw new Error('Consensus not yet reached — please wait')
    if (plan.status === 'failed') throw new Error('Plan generation failed — please create a new plan')
    if (!plan.contract_plan_id) throw new Error('Contract plan ID missing — poll consensus may still be running')

    // Get user wallet
    const { data: userRecord } = await supabase
      .from('users')
      .select('encrypted_private_key')
      .eq('id', user.id)
      .single()
    if (!userRecord?.encrypted_private_key) throw new Error('User wallet not found')

    const privateKey = await decryptPrivateKey(userRecord.encrypted_private_key)

    // Call FitnessPlanContract.mark_plan_paid(plan_id: str) on StudioNet
    const txHash = await sendContractTransaction(privateKey, 'mark_plan_paid', [
      plan.contract_plan_id,
    ])

    // Read unlocked plan content from chain via get_plan view
    const onChainPlan = await callContractView('get_plan', [plan.contract_plan_id]) as Record<string, unknown>

    // plan_content is a JSON string inside the plan record — parse it
    let parsedContent: Record<string, unknown> = {}
    const rawContent = onChainPlan?.plan_content
    if (typeof rawContent === 'string') {
      try {
        parsedContent = JSON.parse(rawContent)
      } catch {
        parsedContent = { raw: rawContent }
      }
    } else if (rawContent && typeof rawContent === 'object') {
      parsedContent = rawContent as Record<string, unknown>
    }

    // Update plan in DB — unlock it and cache the content
    await supabase
      .from('plans')
      .update({
        status: 'unlocked',
        payment_transaction_hash: txHash,
        paid_at: new Date().toISOString(),
        plan_content: parsedContent,
      })
      .eq('id', plan_id)

    // Record payment transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      plan_id,
      type: 'plan_payment',
      transaction_hash: txHash,
      status: 'confirmed',
      gen_amount: plan.price_gen,
    })

    // Update submission transaction as confirmed if still pending
    await supabase
      .from('transactions')
      .update({ status: 'confirmed' })
      .eq('plan_id', plan_id)
      .eq('type', 'plan_submission')
      .eq('status', 'pending')

    return new Response(
      JSON.stringify({ payment_transaction_hash: txHash, status: 'unlocked' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
