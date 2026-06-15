'use client'

import { useState, useEffect } from 'react'
import { Copy, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle, Wallet, RefreshCw, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  type: string
  transaction_hash: string
  status: string
  gen_amount: number | null
  created_at: string
}

interface Props {
  walletAddress: string | null
  transactions: Transaction[]
}

export default function WalletClient({ walletAddress, transactions }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [showExport, setShowExport] = useState(false)
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settingUpWallet, setSettingUpWallet] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const fetchBalance = async () => {
    if (!walletAddress) return
    setBalanceLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('wallet-info')
      if (!error && data?.gen_balance) {
        setBalance(data.gen_balance)
      }
    } catch {
      // non-fatal
    } finally {
      setBalanceLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [walletAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalSpent = transactions
    .filter(tx => tx.type === 'plan_payment' && tx.status === 'confirmed' && tx.gen_amount)
    .reduce((sum, tx) => sum + (tx.gen_amount ?? 0), 0)

  const handleSetupWallet = async () => {
    setSettingUpWallet(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { error } = await supabase.functions.invoke('auth-signup', {
        body: { email: user.email },
      })
      if (error) throw new Error(error.message || 'Failed to generate wallet')
      toast.success('Wallet generated! Refreshing...')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Wallet setup failed')
    } finally {
      setSettingUpWallet(false)
    }
  }

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Address copied!')
    }
  }

  const handleExportKey = async () => {
    if (!password) { toast.error('Enter your password'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('export-private-key', {
        body: { password },
      })
      if (error) throw new Error(error.message || 'Failed')
      setPrivateKey(data.private_key)
      setPassword('')
      toast.success('Private key exported. Store it safely!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  const txTypeLabel: Record<string, string> = {
    plan_submission: 'Plan Submission',
    plan_payment: 'Plan Payment',
  }
  const txStatusColor: Record<string, string> = {
    pending:   'text-amber-600 dark:text-amber-400',
    confirmed: 'text-plum dark:text-peach',
    failed:    'text-destructive',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your GEN token wallet</p>
      </div>

      {/* Balance card */}
      {walletAddress && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-border/50 bg-gradient-to-br from-plum/5 to-mauve/5 dark:from-peach/5 dark:to-mauve/5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-plum dark:text-peach" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">GEN Balance</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={fetchBalance}
              disabled={balanceLoading}
              className="glass w-8 h-8 rounded-lg flex items-center justify-center hover:bg-plum/10 dark:hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-plum dark:text-peach">
              {balanceLoading ? '...' : (balance ?? '—')}
            </span>
            <span className="text-sm text-muted-foreground font-medium">GEN</span>
          </div>
          {totalSpent > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Total spent on plans: {totalSpent} GEN
            </p>
          )}
        </motion.div>
      )}

      {/* Wallet address */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-6 border border-border/50"
      >
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Your Wallet Address</p>
        <div className="flex items-center gap-3">
          <code className="text-sm text-plum dark:text-peach font-mono flex-1 break-all">
            {walletAddress ?? 'Not yet generated'}
          </code>
          {walletAddress && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={copyAddress}
              className="shrink-0 glass w-9 h-9 rounded-lg flex items-center justify-center hover:bg-plum/10 dark:hover:bg-white/10 transition-all"
            >
              <Copy className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        {!walletAddress && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSetupWallet}
            disabled={settingUpWallet}
            className="mt-4 flex items-center gap-2 btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {settingUpWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            {settingUpWallet ? 'Generating wallet...' : 'Generate My Wallet'}
          </motion.button>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          This wallet is used for all GenLayer contract interactions on StudioNet.
        </p>
      </motion.div>

      {/* Export private key */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 border border-border/50"
      >
        <h3 className="font-semibold mb-3">Export Private Key</h3>
        <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Never share your private key. Anyone with it has full control of your wallet. Store it in a password manager.
          </p>
        </div>

        {!privateKey ? (
          !showExport ? (
            <button
              onClick={() => setShowExport(true)}
              className="text-sm glass px-4 py-2.5 rounded-xl border border-border/50 hover:border-mauve/40 transition-all"
            >
              Reveal Private Key
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Enter your account password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleExportKey}
                  disabled={loading}
                  className="flex items-center gap-2 btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Export
                </motion.button>
                <button
                  onClick={() => { setShowExport(false); setPassword('') }}
                  className="glass px-4 py-2.5 rounded-xl text-sm border border-border/50 hover:border-mauve/40 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="relative bg-muted/30 border border-border/50 rounded-xl p-4">
              <code className="text-xs text-plum dark:text-peach font-mono break-all">
                {showKey ? privateKey : '•'.repeat(64)}
              </code>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-plum/10 dark:hover:bg-white/10 border border-border/40"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(privateKey); toast.success('Copied!') }}
                  className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-plum/10 dark:hover:bg-white/10 border border-border/40"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={() => { setPrivateKey(null); setShowExport(false) }}
                  className="glass px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 border border-border/40 ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Transaction history */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="font-semibold mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center border border-border/40">
            <p className="text-muted-foreground text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-xl p-4 flex items-center justify-between border border-border/40 hover:border-mauve/30 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{txTypeLabel[tx.type] ?? tx.type}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {tx.transaction_hash.slice(0, 10)}...{tx.transaction_hash.slice(-6)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  {tx.gen_amount && (
                    <div className="text-sm font-semibold text-plum dark:text-peach">
                      {tx.gen_amount} GEN
                    </div>
                  )}
                  <div className={`text-xs font-medium ${txStatusColor[tx.status] ?? 'text-muted-foreground'}`}>
                    {tx.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
