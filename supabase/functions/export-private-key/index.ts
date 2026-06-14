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

    const { password } = await req.json()
    if (!password) throw new Error('Password required')

    // Re-verify password via Supabase Auth
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email!,
      password,
    })
    if (signInError) throw new Error('Incorrect password')

    // Get encrypted key
    const { data: userRecord } = await supabase
      .from('users')
      .select('encrypted_private_key')
      .eq('id', user.id)
      .single()
    if (!userRecord) throw new Error('User not found')

    const privateKey = await decryptPrivateKey(userRecord.encrypted_private_key)

    // Log the export event (audit trail)
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'plan_submission',
      transaction_hash: `export-${Date.now()}`,
      status: 'confirmed',
    })

    return new Response(
      JSON.stringify({ private_key: privateKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function decryptPrivateKey(storedKey: string): Promise<string> {
  const [ivHex, encryptedHex] = storedKey.split(':')
  const iv = hexToBytes(ivHex)
  const encrypted = hexToBytes(encryptedHex)
  const keyBytes = hexToBytes(Deno.env.get('ENCRYPTION_KEY')!)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted)
  return new TextDecoder().decode(decrypted)
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}
