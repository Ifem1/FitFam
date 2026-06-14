'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

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
  const [showExport, setShowExport] = useState(false)
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)

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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-private-key`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password }),
        }
      )
      if (!res.ok) throw new Error((await res.json()).message || 'Failed')
      const { private_key } = await res.json()
      setPrivateKey(private_key)
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
    pending: 'text-yellow-400',
    confirmed: 'text-[#00FF88]',
    failed: 'text-red-400',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your GEN token wallet</p>
      </div>

      {/* Wallet address card */}
      <div className="glass rounded-2xl p-6">
        <p className="text-xs text-muted-foreground mb-2">Your Wallet Address</p>
        <div className="flex items-center gap-3">
          <code className="text-sm text-[#00FF88] font-mono flex-1 break-all">
            {walletAddress ?? 'Not yet generated'}
          </code>
          {walletAddress && (
            <button
              onClick={copyAddress}
              className="shrink-0 glass w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          This wallet is used for all GenLayer contract interactions on StudioNet.
        </p>
      </div>

      {/* Export private key */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold mb-2">Export Private Key</h3>
        <div className="flex items-start gap-3 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-400">
            Never share your private key. Anyone with it has full control of your wallet. Store it in a password manager.
          </p>
        </div>

        {!privateKey ? (
          <div>
            {!showExport ? (
              <button
                onClick={() => setShowExport(true)}
                className="text-sm glass px-4 py-2.5 rounded-lg hover:bg-white/10 transition-all"
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00FF88]/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleExportKey}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-[#00E87A] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Export
                  </button>
                  <button
                    onClick={() => { setShowExport(false); setPassword('') }}
                    className="glass px-4 py-2.5 rounded-lg text-sm hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative bg-white/5 border border-white/10 rounded-lg p-4">
              <code className="text-xs text-[#00FF88] font-mono break-all">
                {showKey ? privateKey : '•'.repeat(64)}
              </code>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowKey(!showKey)} className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-white/10">
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(privateKey); toast.success('Copied!') }}
                  className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-white/10"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={() => { setPrivateKey(null); setShowExport(false) }}
                  className="glass px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-white/10 ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="font-semibold mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="glass rounded-xl p-4 flex items-center justify-between">
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
                    <div className="text-sm font-semibold text-[#00FF88]">
                      {tx.gen_amount} GEN
                    </div>
                  )}
                  <div className={`text-xs font-medium ${txStatusColor[tx.status] ?? 'text-muted-foreground'}`}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
