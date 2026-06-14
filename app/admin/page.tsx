import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/admin/AdminClient'

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  if (!userProfile?.is_admin) redirect('/dashboard')

  const { data: plans } = await supabase
    .from('plans')
    .select('*, users(email, wallet_address)')
    .order('created_at', { ascending: false })

  const { data: pricing } = await supabase
    .from('pricing_config')
    .select('*')
    .order('duration_months')

  const stats = {
    total: plans?.length ?? 0,
    pending: plans?.filter((p) => p.status === 'pending').length ?? 0,
    unlocked: plans?.filter((p) => p.status === 'unlocked').length ?? 0,
    revenue_gen: plans?.filter((p) => p.status === 'unlocked').reduce((acc, p) => acc + Number(p.price_gen), 0) ?? 0,
  }

  return <AdminClient plans={plans ?? []} pricing={pricing ?? []} stats={stats} />
}
