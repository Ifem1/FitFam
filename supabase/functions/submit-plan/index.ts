// Submit Plan Edge Function
// NEW FLOW: Saves fitness profile to DB only (no blockchain call).
// Status is "awaiting_payment" — blockchain call happens after payment.
// Contract: 0x45462B9720d90213Eac1D2AD889cD8F1C7f77852
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { data: profile, error: profileError } = await supabase
      .from('fitness_profiles')
      .select('*')
      .eq('id', fitness_profile_id)
      .eq('user_id', user.id)
      .single()
    if (profileError || !profile) throw new Error('Fitness profile not found')

    const { data: pricing } = await supabase
      .from('pricing_config')
      .select('price_gen')
      .eq('duration_months', duration_months)
      .single()
    const priceGen = pricing?.price_gen ?? (duration_months === 1 ? 5 : duration_months === 3 ? 12 : 20)

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        fitness_profile_id,
        duration_months,
        status: 'awaiting_payment',
        price_gen: priceGen,
      })
      .select()
      .single()
    if (planError) throw planError

    console.log(`submit-plan: plan ${plan.id} created with status awaiting_payment`)

    return new Response(
      JSON.stringify({
        plan_id: plan.id,
        status: 'awaiting_payment',
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
