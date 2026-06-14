// Get Plan Content Edge Function
// Returns cached plan content from DB (only if unlocked)
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
    if (!plan_id) throw new Error('Missing plan_id')

    const { data: plan, error } = await supabase
      .from('plans')
      .select('id, status, plan_content')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()

    if (error || !plan) throw new Error('Plan not found')
    if (plan.status !== 'unlocked') throw new Error('Plan is not unlocked yet')
    if (!plan.plan_content) throw new Error('Plan content not available')

    return new Response(
      JSON.stringify({ plan_content: plan.plan_content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
