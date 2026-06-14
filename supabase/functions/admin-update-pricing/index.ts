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

    // Verify admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!userRecord?.is_admin) throw new Error('Forbidden: Admins only')

    const { duration_months, price_gen } = await req.json()
    if (![1, 3, 6].includes(duration_months)) throw new Error('Invalid duration')
    if (price_gen <= 0) throw new Error('Price must be positive')

    // Update DB
    const { error } = await supabase
      .from('pricing_config')
      .update({ price_gen, updated_at: new Date().toISOString() })
      .eq('duration_months', duration_months)
    if (error) throw error

    // Also update on-chain via contract (if contract address is set)
    const contractAddress = Deno.env.get('CONTRACT_ADDRESS')
    if (contractAddress) {
      // This would call update_pricing on the contract
      // Skipped here as it requires the owner's private key (set separately)
    }

    return new Response(
      JSON.stringify({ success: true, duration_months, price_gen }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
