// Check Plan Status Edge Function
// Returns DB status — frontend polls this while waiting for consensus
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

    const url = new URL(req.url)
    const plan_id = url.searchParams.get('plan_id')
    if (!plan_id) throw new Error('Missing plan_id query param')

    const { data: plan, error } = await supabase
      .from('plans')
      .select('id, status, contract_plan_id, price_gen, duration_months, created_at, error_message')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()

    if (error || !plan) throw new Error('Plan not found')

    return new Response(
      JSON.stringify({
        plan_id: plan.id,
        status: plan.status,
        contract_plan_id: plan.contract_plan_id,
        price_gen: plan.price_gen,
        duration_months: plan.duration_months,
        created_at: plan.created_at,
        error_message: plan.error_message,
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
