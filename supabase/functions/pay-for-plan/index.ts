// Pay For Plan Edge Function
// NEW FLOW: Records payment, then calls submit_fitness_profile on GenLayer
// to trigger LLM consensus. Plan moves to "pending" (consensus in progress).
// Contract: 0x45462B9720d90213Eac1D2AD889cD8F1C7f77852
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

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()
    if (planError || !plan) throw new Error('Plan not found')
    if (plan.status === 'unlocked') throw new Error('Plan is already unlocked')
    if (plan.status === 'pending') throw new Error('Plan is already being generated — please wait for consensus')
    if (plan.status === 'failed') throw new Error('Plan generation failed — please create a new plan')
    if (plan.status !== 'awaiting_payment') throw new Error(`Plan is in unexpected status: ${plan.status}`)

    const { data: profile, error: profileError } = await supabase
      .from('fitness_profiles')
      .select('*')
      .eq('id', plan.fitness_profile_id)
      .single()
    if (profileError || !profile) throw new Error('Fitness profile not found')

    const { data: userRecord } = await supabase
      .from('users')
      .select('encrypted_private_key, wallet_address')
      .eq('id', user.id)
      .single()
    if (!userRecord?.encrypted_private_key) throw new Error('User wallet not found')

    const privateKey = await decryptPrivateKey(userRecord.encrypted_private_key)

    console.log(`pay-for-plan: planId=${plan_id} wallet=${userRecord.wallet_address ?? 'n/a'} submitting to GenLayer`)

    let txHash: string
    try {
      txHash = await sendContractTransaction(privateKey, 'submit_fitness_profile', [
        profile.age,
        String(profile.weight),
        profile.weight_unit,
        String(profile.height),
        profile.height_unit,
        profile.fitness_level,
        profile.goal_type,
        plan.duration_months,
        profile.allergies ?? '',
        profile.preferred_proteins ?? '',
        profile.region ?? '',
      ])
      console.log(`pay-for-plan: submit_fitness_profile submitted txHash=${txHash}`)
    } catch (txErr) {
      console.error(`pay-for-plan: submit_fitness_profile FAILED:`, txErr)
      throw new Error(`Blockchain transaction failed: ${txErr.message}`)
    }

    await supabase
      .from('plans')
      .update({
        status: 'pending',
        contract_transaction_hash: txHash,
        paid_at: new Date().toISOString(),
      })
      .eq('id', plan_id)

    await supabase.from('transactions').insert({
      user_id: user.id,
      plan_id,
      type: 'plan_payment',
      transaction_hash: txHash,
      status: 'pending',
      gen_amount: plan.price_gen,
    })

    console.log(`pay-for-plan: plan ${plan_id} moved to pending (consensus in progress)`)

    return new Response(
      JSON.stringify({
        transaction_hash: txHash,
        status: 'pending',
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
