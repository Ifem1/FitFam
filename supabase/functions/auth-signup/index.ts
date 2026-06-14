// Auth Signup Edge Function
// Creates a Supabase account and auto-generates an encrypted ethers.js wallet
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the JWT from Supabase Auth
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid token')

    // Idempotent — return existing wallet if already created
    const { data: existing } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', user.id)
      .single()

    if (existing?.wallet_address) {
      return new Response(
        JSON.stringify({ wallet_address: existing.wallet_address }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate wallet
    const wallet = ethers.Wallet.createRandom()

    // Encrypt private key with AES-256-GCM
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!
    const keyBytes = hexToBytes(encryptionKey)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']
    )
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(wallet.privateKey)
    )

    const storedKey = `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(encrypted))}`

    // Store in users table
    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        wallet_address: wallet.address,
        encrypted_private_key: storedKey,
      })
    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ wallet_address: wallet.address }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  return bytes
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
