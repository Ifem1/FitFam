import { createServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PlanDetailClient from '@/components/dashboard/PlanDetailClient'

interface Props {
  params: { id: string }
}

export default async function PlanDetailPage({ params }: Props) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!plan) notFound()

  return <PlanDetailClient plan={plan} />
}
