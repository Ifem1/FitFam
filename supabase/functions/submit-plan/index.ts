// Submit Plan Edge Function
// Saves fitness profile, calls FitnessPlanContract.submit_fitness_profile on StudioNet
// Contract: 0xdA6F589f1e27BdA5518fD27C7F64B8FdD2bC4Bc0
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptPrivateKey, sendContractTransaction } from '../_shared/genlayer.ts'

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

    const { fitness_profile_id, duration_months } = await req.json()
    if (!fitness_profile_id) throw new Error('Missing fitness_profile_id')
    if (![1, 3, 6].includes(duration_months)) throw new Error('duration_months must be 1, 3, or 6')

    // Verify the profile belongs to this user
    const { data: profile, error: profileError } = await supabase
      .from('fitness_profiles')
      .select('*')
      .eq('id', fitness_profile_id)
      .eq('user_id', user.id)
      .single()
    if (profileError || !profile) throw new Error('Fitness profile not found')

    // Get current pricing from DB
    const { data: pricing } = await supabase
      .from('pricing_config')
      .select('price_gen')
      .eq('duration_months', duration_months)
      .single()
    const priceGen = pricing?.price_gen ?? (duration_months === 1 ? 5 : duration_months === 3 ? 12 : 20)

    // Get user wallet and decrypt private key
    const { data: userRecord } = await supabase
      .from('users')
      .select('wallet_address, encrypted_private_key')
      .eq('id', user.id)
      .single()
    if (!userRecord?.encrypted_private_key) throw new Error('User wallet not found')

    const privateKey = await decryptPrivateKey(userRecord.encrypted_private_key)

    // Call FitnessPlanContract.submit_fitness_profile on StudioNet
    // Args must match Python contract signature exactly:
    // (age, weight, weight_unit, height, height_unit, fitness_level, goal_type, duration_months)
    const txHash = await sendContractTransaction(privateKey, 'submit_fitness_profile', [
      profile.age,
      String(profile.weight),   // contract expects str
      profile.weight_unit,
      String(profile.height),   // contract expects str
      profile.height_unit,
      profile.fitness_level,
      profile.goal_type,
      duration_months,
    ])

    // Create plan record in DB (status=pending until consensus)
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        fitness_profile_id,
        duration_months,
        status: 'pending',
        contract_transaction_hash: txHash,
        price_gen: priceGen,
      })
      .select()
      .single()
    if (planError) throw planError

    // Record the submission transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      plan_id: plan.id,
      type: 'plan_submission',
      transaction_hash: txHash,
      status: 'pending',
    })

    return new Response(
      JSON.stringify({
        plan_id: plan.id,
        transaction_hash: txHash,
        status: 'pending',
        price_gen: priceGen,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('submit-plan error:', err)
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
