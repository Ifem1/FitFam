// Pay For Plan Edge Function
// Calls FitnessPlanContract.mark_plan_paid on StudioNet, then marks plan unlocked in DB
// Plan content is fetched separately via fetch-plan-content
// Contract: 0xBF5eC6C9e42e8e8956d8C1F4f24235CD9616Ca14
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  decryptPrivateKey,
  sendContractTransaction,
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
      .select('encrypted_private_key, wallet_address')
      .eq('id', user.id)
      .single()
    if (!userRecord?.encrypted_private_key) throw new Error('User wallet not found')

    const privateKey = await decryptPrivateKey(userRecord.encrypted_private_key)

    console.log(`pay-for-plan: planId=${plan_id} contractPlanId=${plan.contract_plan_id} wallet=${userRecord.wallet_address ?? 'n/a'}`)

    // Call mark_plan_paid on-chain
    let txHash: string
    try {
      txHash = await sendContractTransaction(privateKey, 'mark_plan_paid', [
        plan.contract_plan_id,
      ])
      console.log(`pay-for-plan: mark_plan_paid submitted txHash=${txHash}`)
    } catch (txErr) {
      console.error(`pay-for-plan: mark_plan_paid FAILED:`, txErr)
      throw new Error(`Payment transaction failed: ${txErr.message}`)
    }

    // Update plan in DB — mark as unlocked
    // Plan content will be fetched separately via fetch-plan-content
    await supabase
      .from('plans')
      .update({
        status: 'unlocked',
        payment_transaction_hash: txHash,
        paid_at: new Date().toISOString(),
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

    console.log(`pay-for-plan: plan ${plan_id} unlocked successfully`)

    return new Response(
      JSON.stringify({
        payment_transaction_hash: txHash,
        status: 'unlocked',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
