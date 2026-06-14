// Shared GenLayer RPC helpers for all Edge Functions
// Contract: 0x2CE19654c18Ceb2A24Af43Dc82890673225EA71f (StudioNet)

import { ethers } from 'https://esm.sh/ethers@6'

export const CONTRACT_ADDRESS = '0x2CE19654c18Ceb2A24Af43Dc82890673225EA71f'

export function getRpcUrl(): string {
  return Deno.env.get('GENLAYER_RPC_URL') ?? 'https://studio.genlayer.com/api'
}

// ── Decrypt AES-256-GCM encrypted private key ────────────────────────────────
export async function decryptPrivateKey(storedKey: string): Promise<string> {
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

// ── Send a write transaction to the GenLayer contract ────────────────────────
export async function sendContractTransaction(
  privateKey: string,
  method: string,
  args: unknown[]
): Promise<string> {
  const rpcUrl = getRpcUrl()
  const wallet = new ethers.Wallet(privateKey)

  const txParams = {
    from: wallet.address,
    to: CONTRACT_ADDRESS,
    data: JSON.stringify({ method, args }),
  }

  // Sign the transaction data
  const messageHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(txParams))
  )
  const signature = await wallet.signMessage(ethers.getBytes(messageHash))

  const payload = {
    jsonrpc: '2.0',
    method: 'gen_sendTransaction',
    params: [{ ...txParams, signature }],
    id: Date.now(),
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (result.error) throw new Error(`GenLayer RPC error: ${result.error.message ?? JSON.stringify(result.error)}`)
  if (!result.result) throw new Error('No transaction hash returned from GenLayer')
  return result.result as string
}

// ── Call a read-only (view) method on the contract ───────────────────────────
export async function callContractView(
  method: string,
  args: unknown[]
): Promise<unknown> {
  const rpcUrl = getRpcUrl()

  const payload = {
    jsonrpc: '2.0',
    method: 'gen_call',
    params: [{
      to: CONTRACT_ADDRESS,
      data: JSON.stringify({ method, args }),
    }],
    id: Date.now(),
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (result.error) throw new Error(`GenLayer view error: ${result.error.message ?? JSON.stringify(result.error)}`)
  return result.result
}

// ── Get transaction receipt / status ─────────────────────────────────────────
export async function getTransactionReceipt(txHash: string): Promise<unknown> {
  const rpcUrl = getRpcUrl()

  const payload = {
    jsonrpc: '2.0',
    method: 'gen_getTransactionByHash',
    params: [txHash],
    id: Date.now(),
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (result.error) return null
  return result.result
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}
