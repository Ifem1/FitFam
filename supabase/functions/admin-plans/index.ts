// Admin Plans Edge Function — admin only
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

    const { data: userRecord } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!userRecord?.is_admin) throw new Error('Forbidden: Admins only')

    const { data: plans, error } = await supabase
      .from('plans')
      .select('*, users(email, wallet_address)')
      .order('created_at', { ascending: false })
    if (error) throw error

    const stats = {
      total: plans?.length ?? 0,
      pending: plans?.filter((p) => p.status === 'pending').length ?? 0,
      unlocked: plans?.filter((p) => p.status === 'unlocked').length ?? 0,
      revenue_gen: plans
        ?.filter((p) => p.status === 'unlocked')
        .reduce((acc, p) => acc + Number(p.price_gen), 0) ?? 0,
    }

    return new Response(
      JSON.stringify({ plans: plans ?? [], stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
