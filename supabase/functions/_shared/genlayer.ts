// Shared GenLayer helpers for all Edge Functions
// Uses the official genlayer-js@1.1.8 SDK on StudioNet
// Contract: 0x45462B9720d90213Eac1D2AD889cD8F1C7f77852

import { createClient, createAccount } from 'https://esm.sh/genlayer-js@1.1.8'
import { studionet } from 'https://esm.sh/genlayer-js@1.1.8/chains'

export const CONTRACT_ADDRESS =
  (Deno.env.get('CONTRACT_ADDRESS') ?? '0x45462B9720d90213Eac1D2AD889cD8F1C7f77852') as `0x${string}`

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

// ── Build a GenLayer client bound to a user's private key ────────────────────
function buildClient(privateKey?: string) {
  const account = privateKey
    ? createAccount(privateKey as `0x${string}`)
    : undefined
  return createClient({ chain: studionet, account })
}

// ── Send a write transaction to the GenLayer contract ────────────────────────
export async function sendContractTransaction(
  privateKey: string,
  method: string,
  args: unknown[]
): Promise<string> {
  const account = createAccount(privateKey as `0x${string}`)
  const client = createClient({ chain: studionet, account })

  const txHash = await client.writeContract({
    account,
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    value: BigInt(0),
  })
  return txHash as string
}

// ── Call a read-only (view) method on the contract ───────────────────────────
export async function callContractView(
  method: string,
  args: unknown[]
): Promise<unknown> {
  const client = buildClient()
  console.log(`genlayer: readContract method=${method} args=${JSON.stringify(args)} address=${CONTRACT_ADDRESS}`)
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
  })
  console.log(`genlayer: readContract result=`, JSON.stringify(result)?.slice(0, 500))
  return result
}

// ── Get transaction status / receipt ─────────────────────────────────────────
export async function getTransactionReceipt(txHash: string): Promise<unknown> {
  const client = buildClient()
  try {
    console.log(`genlayer: getTransaction hash=${txHash}`)
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })
    console.log(`genlayer: getTransaction result=`, JSON.stringify(tx))
    return tx
  } catch (err) {
    console.error(`genlayer: getTransaction FAILED hash=${txHash}`, err)
    return null
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}
