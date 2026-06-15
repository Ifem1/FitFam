// Get Plan Content Edge Function
// Returns plan content from DB cache, or tries to fetch from chain if not cached yet
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callContractView } from '../_shared/genlayer.ts'

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
    const plan_id = url.searchParams.get('plan_id') ?? (await req.json().catch(() => ({}))).plan_id
    if (!plan_id) throw new Error('Missing plan_id')

    const { data: plan, error } = await supabase
      .from('plans')
      .select('id, status, plan_content, contract_plan_id')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()

    if (error || !plan) throw new Error('Plan not found')
    if (plan.status !== 'unlocked') throw new Error('Plan is not unlocked yet')

    // If we already have cached content, return it
    if (plan.plan_content && Object.keys(plan.plan_content).length > 0) {
      return new Response(
        JSON.stringify({ plan_content: plan.plan_content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try to fetch from chain
    if (plan.contract_plan_id) {
      console.log(`get-plan-content: fetching from chain, contractPlanId=${plan.contract_plan_id}`)
      try {
        const onChainPlan = await callContractView('get_plan', [plan.contract_plan_id]) as Record<string, unknown>
        const rawContent = onChainPlan?.plan_content
        if (rawContent) {
          let parsedContent: Record<string, unknown> = {}
          if (typeof rawContent === 'string') {
            try { parsedContent = JSON.parse(rawContent) } catch { parsedContent = { raw: rawContent } }
          } else if (typeof rawContent === 'object') {
            parsedContent = rawContent as Record<string, unknown>
          }

          // Cache in DB
          await supabase
            .from('plans')
            .update({ plan_content: parsedContent })
            .eq('id', plan_id)

          console.log(`get-plan-content: fetched and cached plan content`)
          return new Response(
            JSON.stringify({ plan_content: parsedContent }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.log(`get-plan-content: plan_content is null on-chain (payment may not be finalized)`)
      } catch (chainErr) {
        console.error(`get-plan-content: chain read failed:`, chainErr)
      }
    }

    return new Response(
      JSON.stringify({ error: 'Plan content not available yet — please try again in a moment', retry: true }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
