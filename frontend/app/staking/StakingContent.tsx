'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseEther, formatEther } from 'viem'
import { PageShell } from '@/components/layout/PageShell'
import { TOKEN_ADDRESS, STAKING_ADDRESS, TOKEN_ABI, STAKING_ABI, APY_PERCENT, BASESCAN_URL } from '@/config/contracts'
import { formatToken, formatTokenShort, shortenAddress } from '@/lib/utils'
import { MobileBanner } from '@/components/MobileBanner'

export default function StakingContent() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [approvedAmount, setApprovedAmount] = useState<bigint>(0n)

  // === READ ===
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'allowance', args: address ? [address, STAKING_ADDRESS] : undefined })
  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' })
  const { data: totalStakers, refetch: refetchTotalStakers } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' })
  const { data: rewardPool, refetch: refetchRewardPool } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPool' })
  const { data: launched } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'launched' })
  const { data: userStaked, refetch: refetchStakes } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stakes', args: address ? [address] : undefined })
  const { data: pendingReward, refetch: refetchPending } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'pendingReward', args: address ? [address] : undefined })
  const { data: runway } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPoolRunway' })

  // Auto-refresh pending rewards every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPending()
    }, 15000)
    return () => clearInterval(interval)
  }, [refetchPending])

  // === WRITE ===
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writeStake, data: stakeHash, isPending: isStakePending } = useWriteContract()
  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract()
  const { writeContract: writeUnstake, data: unstakeHash, isPending: isUnstakePending } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash, query: { enabled: !!approveHash } })
  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash, query: { enabled: !!stakeHash } })
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } })
  const { isLoading: isUnstakeConfirming, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({ hash: unstakeHash, query: { enabled: !!unstakeHash } })

  // Refetch allowance after approve confirms
  useEffect(() => { if (isApproveSuccess) {
    const amount = parseEther(stakeAmount || '0')
    setApprovedAmount(prev => prev + amount)
    queryClient.invalidateQueries()
  } }, [isApproveSuccess])

  // Refetch all data after stake/claim/unstake confirms
  useEffect(() => {
    if (isStakeSuccess || isClaimSuccess || isUnstakeSuccess) {
      queryClient.invalidateQueries()
      setStakeAmount('')
      setUnstakeAmount('')
    }
  }, [isStakeSuccess, isClaimSuccess, isUnstakeSuccess, queryClient])

  const needsApproval = stakeAmount
    ? approvedAmount < parseEther(stakeAmount || '0')
    : true
  const userStakedAmount = userStaked ? (userStaked as any)[0] as bigint : 0n
  const userPending = pendingReward as bigint || 0n
  const effectiveAPY = runway && Number(runway) < 365 ? ((APY_PERCENT * Number(runway)) / 365).toFixed(1) : APY_PERCENT
  const runwayDays = runway ? (Number(runway) > 1000 ? '999+' : Number(runway).toFixed(0)) : '—'
  const isBusy = isApprovePending || isApproveConfirming || isStakePending || isStakeConfirming || isClaimPending || isClaimConfirming || isUnstakePending || isUnstakeConfirming

  function handleApprove() { writeApprove({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'approve', args: [STAKING_ADDRESS, parseEther(stakeAmount || '0')] }) }
  function handleStake() { writeStake({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [parseEther(stakeAmount || '0')] }) }
  function handleClaim() { writeClaim({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'claimRewards' }) }
  function handleUnstake() { writeUnstake({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'unstake', args: [parseEther(unstakeAmount || '0')] }) }
  function setMaxStake() { if (tokenBalance) setStakeAmount(formatEther(tokenBalance)) }
  function setMaxUnstake() { if (userStaked) setUnstakeAmount(formatEther((userStaked as any)[0])) }

  return (
    <PageShell variant="app">
      <MobileBanner />

      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 border border-cyan-900 bg-cyan-950/30 px-3 py-1 text-xs text-cyan-400 font-mono mb-4">
            <span className="w-1.5 h-1.5 bg-green-400 animate-pulse" />
            {launched ? 'ACTIVE' : 'OFFLINE'} — BASE MAINNET
          </div>
          <h1 className="text-4xl font-bold mb-1">Staking Terminal</h1>
          <p className="text-gray-400 text-sm font-mono">Secure Node Environment // Base Mainnet</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} sub="$NEXUSCLAW" accentClass="text-cyan-400" />
          <MetricCard label="Your Staked" value={userStakedAmount ? formatTokenShort(userStakedAmount) : '0'} sub="$NEXUSCLAW" accentClass="text-cyan-400" />
          <MetricCard label="Pending Rewards" value={userPending ? formatTokenShort(userPending) : '0'} sub="$NEXUSCLAW" accentClass="text-green-400" />
          <MetricCard label="APY" value={`${effectiveAPY}%`} sub={`Runway: ${runwayDays}d`} accentClass="text-cyan-400" />
        </div>
      </section>

      {/* Staking Interface */}
      <section className="border-t border-[#1f2937] px-6 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Main staking card */}
          <div className="lg:col-span-8">
            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <h3 className="font-bold text-lg mb-6">Stake $NEXUSCLAW</h3>

              {!isConnected ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-xl mb-2">Connect your wallet to start staking</p>
                  <p className="text-sm text-gray-600">Base Mainnet — 20% APY rewards</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center font-mono text-xs text-gray-400 uppercase tracking-widest">
                    <span>Balance: {tokenBalance ? formatTokenShort(tokenBalance as bigint) : '0'} $NEXUSCLAW</span>
                    <span className={launched ? 'text-green-400' : 'text-red-400'}>{launched ? '● Active' : '● Offline'}</span>
                  </div>

                  {/* Stake input */}
                  <div>
                    <label className="font-mono text-[10px] uppercase text-gray-500 mb-2 block">Amount to stake</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0a0a0a] border border-[#1f2937] py-4 px-4 text-2xl font-bold text-cyan-400 focus:outline-none focus:border-cyan-900 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        <button onClick={setMaxStake} className="font-mono text-[10px] px-2 py-1 border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-500 transition-colors">MAX</button>
                        <span className="font-mono text-sm text-gray-400">$NEXUSCLAW</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {needsApproval ? (
                      <button
                        onClick={handleApprove}
                        disabled={!stakeAmount || isBusy}
                        className="flex-1 py-3 bg-cyan-400 text-black font-bold uppercase tracking-widest text-sm hover:bg-cyan-300 transition-all disabled:opacity-50"
                      >
                        {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve'}
                      </button>
                    ) : (
                      <button
                        onClick={handleStake}
                        disabled={!stakeAmount || isBusy}
                        className="flex-1 py-3 bg-cyan-400 text-black font-bold uppercase tracking-widest text-sm hover:bg-cyan-300 transition-all disabled:opacity-50"
                      >
                        {isStakePending || isStakeConfirming ? 'Staking...' : 'Stake $NEXUSCLAW'}
                      </button>
                    )}
                    <button
                      onClick={handleClaim}
                      disabled={userPending === 0n || isBusy}
                      className="py-3 px-6 border border-[#1f2937] text-gray-400 font-mono text-sm hover:border-cyan-900 hover:text-cyan-400 transition-all disabled:opacity-50"
                    >
                      {isClaimPending || isClaimConfirming ? 'Claiming...' : `Claim ${userPending > 0n ? formatTokenShort(userPending) : ''}`}
                    </button>
                  </div>

                  {/* Unstake section */}
                  {userStakedAmount > 0n && (
                    <div className="border-t border-[#1f2937] pt-6">
                      <label className="font-mono text-[10px] uppercase text-gray-500 mb-2 block">Amount to unstake</label>
                      <div className="relative mb-3">
                        <input
                          type="number"
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#0a0a0a] border border-[#1f2937] py-3 px-4 text-lg font-bold text-red-400 focus:outline-none focus:border-red-900 transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <button onClick={setMaxUnstake} className="font-mono text-[10px] px-2 py-1 border border-[#1f2937] text-gray-400 hover:text-white transition-colors">MAX</button>
                        </div>
                      </div>
                      <button
                        onClick={handleUnstake}
                        disabled={!unstakeAmount || isBusy}
                        className="py-2 px-6 border border-red-900 text-red-400 font-mono text-sm hover:bg-red-950/20 transition-all disabled:opacity-50"
                      >
                        {isUnstakePending || isUnstakeConfirming ? 'Unstaking...' : 'Unstake'}
                      </button>
                    </div>
                  )}

                  {/* Success notification */}
                  {(isApproveSuccess || isStakeSuccess || isClaimSuccess || isUnstakeSuccess) && (
                    <div className="border border-green-900 bg-green-950/20 p-4 font-mono text-xs text-green-400">
                      ✓ Transaction confirmed!
                      {stakeHash && <p className="mt-1">Stake: <a href={`https://basescan.org/tx/${stakeHash}`} target="_blank" rel="noopener noreferrer" className="underline">{stakeHash.slice(0, 10)}...</a></p>}
                      {claimHash && <p className="mt-1">Claim: <a href={`https://basescan.org/tx/${claimHash}`} target="_blank" rel="noopener noreferrer" className="underline">{claimHash.slice(0, 10)}...</a></p>}
                      {unstakeHash && <p className="mt-1">Unstake: <a href={`https://basescan.org/tx/${unstakeHash}`} target="_blank" rel="noopener noreferrer" className="underline">{unstakeHash.slice(0, 10)}...</a></p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <h4 className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-4">Protocol Stats</h4>
              <div className="space-y-3">
                <StatRow label="Total Stakers" value={totalStakers?.toString() || '0'} />
                <StatRow label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} />
                <StatRow label="Reward Pool" value={rewardPool ? formatTokenShort(rewardPool as bigint) : '0'} />
                <StatRow label="APY" value={`${effectiveAPY}%`} />
                <StatRow label="Runway" value={`${runwayDays} days`} />
                <StatRow label="Status" value={launched ? 'Active' : 'Inactive'} />
              </div>
            </div>

            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <h4 className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-4">Your Position</h4>
              <div className="space-y-3">
                <StatRow label="Staked" value={userStakedAmount ? formatTokenShort(userStakedAmount) : '0'} />
                <StatRow label="Pending" value={userPending ? formatTokenShort(userPending) : '0'} />
                <StatRow label="APY" value={`${effectiveAPY}%`} />
              </div>
            </div>

            <a
              href={`${BASESCAN_URL}/address/${STAKING_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 border border-[#1f2937] font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:border-cyan-900 hover:text-cyan-400 transition-all"
            >
              View on Basescan →
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

function MetricCard({ label, value, sub, accentClass }: { label: string; value: string; sub: string; accentClass: string }) {
  return (
    <div className="border border-[#1f2937] bg-[#111111] p-4">
      <span className="font-mono text-[10px] text-gray-500 tracking-widest uppercase block mb-3">{label}</span>
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      <p className="font-mono text-xs text-gray-600 mt-1">{sub}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#1f2937]">
      <span className="font-mono text-[10px] text-gray-500 uppercase">{label}</span>
      <span className="font-mono font-bold text-xs text-white">{value}</span>
    </div>
  )
}
