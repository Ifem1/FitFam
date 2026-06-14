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

    const body = await req.json()
    const { age, weight, weight_unit, height, height_unit, fitness_level, goal_type } = body

    // Validate inputs
    if (!age || !weight || !height || !fitness_level || !goal_type) {
      throw new Error('Missing required profile fields')
    }
    if (age < 10 || age > 100) throw new Error('Age must be between 10 and 100')
    if (!['kg', 'lbs'].includes(weight_unit)) throw new Error('Invalid weight unit')
    if (!['cm', 'ft'].includes(height_unit)) throw new Error('Invalid height unit')
    if (!['beginner', 'intermediate', 'advanced'].includes(fitness_level)) {
      throw new Error('Invalid fitness level')
    }
    if (!['lose_weight', 'gain_weight', 'build_muscle', 'improve_endurance', 'general_wellness'].includes(goal_type)) {
      throw new Error('Invalid goal type')
    }

    const { data: profile, error } = await supabase
      .from('fitness_profiles')
      .insert({
        user_id: user.id,
        age: parseInt(String(age)),
        weight: parseFloat(String(weight)),
        weight_unit,
        height: parseFloat(String(height)),
        height_unit,
        fitness_level,
        goal_type,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
