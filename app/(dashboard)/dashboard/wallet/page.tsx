import { createServerClient } from '@/lib/supabase/server'
import WalletClient from '@/components/dashboard/WalletClient'

export default async function WalletPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: userProfile } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('id', session!.user.id)
    .single()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <WalletClient
      walletAddress={userProfile?.wallet_address ?? null}
      transactions={transactions ?? []}
    />
  )
}
