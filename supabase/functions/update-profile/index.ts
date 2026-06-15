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
    const { age, weight, weight_unit, height, height_unit, fitness_level, goal_type,
            allergies, preferred_proteins, region } = body

    // Validate required fields
    if (!age || !weight || !height || !fitness_level || !goal_type) {
      throw new Error('Missing required profile fields')
    }
    if (age < 10 || age > 100) throw new Error('Age must be between 10 and 100')
    if (!['kg', 'lbs'].includes(weight_unit)) throw new Error('Invalid weight unit')
    if (!['cm', 'ft'].includes(height_unit)) throw new Error('Invalid height unit')
    if (!['beginner', 'intermediate', 'advanced'].includes(fitness_level)) {
      throw new Error('Invalid fitness level')
    }

    // Goals: accept array or comma-separated string, 1-3 goals
    const validGoals = ['lose_weight', 'gain_weight', 'build_muscle', 'improve_endurance', 'general_wellness']
    const goals = Array.isArray(goal_type) ? goal_type : String(goal_type).split(',')
    if (goals.length < 1 || goals.length > 3) throw new Error('Choose 1 to 3 goal tracks')
    if (new Set(goals).size !== goals.length) throw new Error('Duplicate goals not allowed')
    for (const g of goals) {
      if (!validGoals.includes(g.trim())) throw new Error(`Invalid goal type: ${g}`)
    }
    const goalTypeStr = goals.map((g: string) => g.trim()).join(',')

    // Sanitise optional dietary preference fields (all stored as comma-separated strings)
    const allergiesStr = typeof allergies === 'string' ? allergies.trim().slice(0, 200) : ''
    const proteinsStr = typeof preferred_proteins === 'string' ? preferred_proteins.trim().slice(0, 200) : ''

    const validRegions = ['', 'north_america', 'europe', 'west_africa', 'east_africa',
                          'south_asia', 'east_asia', 'latin_america', 'middle_east', 'caribbean']
    const regionStr = validRegions.includes(region ?? '') ? (region ?? '') : ''

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
        goal_type: goalTypeStr,
        allergies: allergiesStr,
        preferred_proteins: proteinsStr,
        region: regionStr,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('update-profile error:', err)
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
