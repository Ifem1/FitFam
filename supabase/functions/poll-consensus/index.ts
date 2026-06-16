// Poll Consensus Edge Function
// Checks GenLayer for finalized transactions, extracts recipe from tx receipt,
// runs server-side plan expansion, and saves content to DB.
// Contract: 0x45462B9720d90213Eac1D2AD889cD8F1C7f77852
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getTransactionReceipt } from '../_shared/genlayer.ts'
import { expandPlan, sanitiseRecipe } from '../_shared/plan-expander.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: pendingPlans, error } = await supabase
      .from('plans')
      .select('id, contract_transaction_hash, fitness_profile_id, duration_months')
      .eq('status', 'pending')
      .not('contract_transaction_hash', 'is', null)

    if (error) throw error
    if (!pendingPlans || pendingPlans.length === 0) {
      return new Response(JSON.stringify({ processed: 0, pending: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let processed = 0

    for (const plan of pendingPlans) {
      try {
        const receipt = await getTransactionReceipt(plan.contract_transaction_hash)
        if (!receipt || typeof receipt !== 'object') continue

        const rx = receipt as Record<string, unknown>
        const numericStatus = typeof rx.status === 'number' ? rx.status : null
        const consensusData = rx.consensus_data as Record<string, unknown> | undefined

        let isSuccess = false
        let isFailure = false
        let contractPlanId: string | null = null
        let recipeData: Record<string, unknown> | null = null

        if (consensusData) {
          const leaderReceipt = consensusData.leader_receipt as Array<Record<string, unknown>> | undefined
          if (leaderReceipt && leaderReceipt.length > 0) {
            const leader = leaderReceipt[0]
            const result = leader.result as Record<string, unknown> | undefined
            if (result) {
              const resultStatus = result.status as string | undefined
              if (resultStatus === 'return') {
                isSuccess = true
                const payload = result.payload as Record<string, unknown> | undefined
                const readable = payload?.readable as string | undefined
                if (readable) {
                  // The contract now returns JSON: {"id": plan_id, "recipe": {...}}
                  // readable is wrapped in extra quotes like "\"...\""
                  const cleaned = readable.replace(/^"|"$/g, '')
                  try {
                    const parsed = JSON.parse(cleaned)
                    contractPlanId = String(parsed.id ?? '')
                    recipeData = parsed.recipe ?? null
                  } catch {
                    // Fallback: old format where readable was just the plan_id
                    contractPlanId = cleaned
                  }
                }
              } else if (resultStatus === 'error' || resultStatus === 'exception') {
                isFailure = true
              }
            }
          }

          const votes = consensusData.votes as Record<string, string> | undefined
          if (votes) {
            const voteValues = Object.values(votes)
            const disagreeCount = voteValues.filter(v => v === 'disagree').length
            if (disagreeCount > voteValues.length / 2) {
              isFailure = true
              isSuccess = false
            }
          }
        }

        if (!isSuccess && !isFailure && numericStatus !== null) {
          if (numericStatus === 6) isFailure = true
        }

        console.log(`poll-consensus: plan=${plan.id} numericStatus=${numericStatus} isSuccess=${isSuccess} isFailure=${isFailure} contractPlanId=${contractPlanId} hasRecipe=${!!recipeData}`)

        if (isSuccess) {
          let planContent: Record<string, unknown> | null = null

          if (recipeData && plan.fitness_profile_id) {
            try {
              const { data: profile } = await supabase
                .from('fitness_profiles')
                .select('*')
                .eq('id', plan.fitness_profile_id)
                .single()

              if (profile) {
                const profileForExpander = {
                  age: profile.age,
                  weight: String(profile.weight),
                  weight_unit: profile.weight_unit,
                  height: String(profile.height),
                  height_unit: profile.height_unit,
                  fitness_level: profile.fitness_level,
                  goal_type: profile.goal_type,
                  allergies: profile.allergies ?? '',
                  preferred_proteins: profile.preferred_proteins ?? '',
                  region: profile.region ?? '',
                }

                const recipe = sanitiseRecipe(recipeData, profileForExpander)
                planContent = expandPlan(profileForExpander, plan.duration_months, recipe) as Record<string, unknown>
                console.log(`poll-consensus: plan ${plan.id} expanded successfully (${Object.keys(planContent).length} sections)`)
              }
            } catch (expandErr) {
              console.error(`poll-consensus: plan ${plan.id} expansion failed:`, expandErr)
            }
          }

          await supabase
            .from('plans')
            .update({
              status: 'unlocked',
              contract_plan_id: contractPlanId,
              plan_content: planContent,
              payment_transaction_hash: plan.contract_transaction_hash,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'confirmed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        } else if (isFailure) {
          await supabase
            .from('plans')
            .update({
              status: 'failed',
              error_message: 'GenLayer consensus failed or was undetermined',
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        }
      } catch (perPlanErr) {
        console.error(`poll-consensus: plan=${plan.id} ERROR:`, perPlanErr)
      }
    }

    return new Response(
      JSON.stringify({ processed, pending: pendingPlans.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('poll-consensus top-level error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
