// Wallet Info Edge Function
// Returns wallet address, GEN balance from StudioNet, and transaction history
// Contract: 0x45462B9720d90213Eac1D2AD889cD8F1C7f77852
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRpcUrl } from '../_shared/genlayer.ts'

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
      .select('wallet_address')
      .eq('id', user.id)
      .single()

    if (!userRecord?.wallet_address) throw new Error('Wallet not found')

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch GEN balance from StudioNet
    let gen_balance = '0'
    try {
      const rpcUrl = getRpcUrl()
      const balanceRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [userRecord.wallet_address, 'latest'],
          id: 1,
        }),
      })
      const balanceJson = await balanceRes.json()
      if (balanceJson.result) {
        // Convert hex wei to GEN (divide by 10^18)
        const weiHex = balanceJson.result as string
        const wei = BigInt(weiHex)
        const genFloat = Number(wei) / 1e18
        gen_balance = genFloat.toFixed(4)
      }
    } catch {
      // Non-fatal — balance display degrades gracefully
      gen_balance = 'N/A'
    }

    return new Response(
      JSON.stringify({
        wallet_address: userRecord.wallet_address,
        gen_balance,
        transactions: transactions ?? [],
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
