'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseEther, formatEther } from 'viem'
import { TopNav } from '@/components/layout/TopNav'
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
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] relative overflow-hidden">
      <img src="/lobster.png" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.18] pointer-events-none select-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/60 pointer-events-none" />
      <MobileBanner />
      <TopNav active="/staking" />

      <main className="pt-24 pb-16 px-8 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-10 mt-8">
          <h1 className="text-5xl font-['Space_Grotesk'] font-black tracking-tighter text-[#e5e2e1] leading-none mb-2">STAKING TERMINAL</h1>
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.3em] text-[#8b919f]">Secure Node Environment // Base Mainnet</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} sub="$NEXUSCLAW" color="#abc7ff" icon="token" />
          <MetricCard label="Your Staked" value={userStakedAmount ? formatTokenShort(userStakedAmount) : '0'} sub="$NEXUSCLAW" color="#abc7ff" icon="account_balance_wallet" />
          <MetricCard label="Pending Rewards" value={userPending ? formatTokenShort(userPending) : '0'} sub="$NEXUSCLAW" color="#4ddbc9" icon="redeem" />
          <MetricCard label="APY" value={`${effectiveAPY}%`} sub={`Runway: ${runwayDays}d`} color="#3A8BFF" icon="trending_up" />
        </div>

        {/* Staking Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="bg-[#1c1b1b] border border-[#414754]/20 p-8 rounded-lg">
              <h3 className="font-['Space_Grotesk'] text-2xl font-bold text-[#e5e2e1] mb-6 tracking-tight">Stake $NEXUSCLAW</h3>

              {!isConnected ? (
                <div className="text-center py-16 text-[#8b919f]">
                  <span className="material-symbols-outlined text-6xl mb-4 block">wallet</span>
                  <p className="text-xl mb-2">Connect your wallet to start staking</p>
                  <p className="text-sm text-[#414754]">Base Mainnet — 20% APY rewards</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center font-['JetBrains_Mono'] text-xs text-[#8b919f] uppercase tracking-widest">
                    <span>Balance: {tokenBalance ? formatTokenShort(tokenBalance as bigint) : '0'} $NEXUSCLAW</span>
                    <span className={launched ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>{launched ? '● Active' : '● Offline'}</span>
                  </div>

                  <div>
                    <label className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#8b919f] mb-2 block">Amount to stake</label>
                    <div className="relative">
                      <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-[#201f1f] border border-[#414754]/30 rounded-lg py-5 px-6 text-2xl font-bold text-[#abc7ff] focus:ring-2 focus:ring-[#3A8BFF]/30 focus:outline-none transition-all" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        <button onClick={setMaxStake} className="font-['JetBrains_Mono'] text-[10px] px-2 py-1 bg-[#353534] hover:bg-[#414754] rounded transition-colors">MAX</button>
                        <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#c1c6d6]">$NEXUSCLAW</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {needsApproval ? (
                      <button onClick={handleApprove} disabled={!stakeAmount || isBusy}
                        className="flex-1 py-4 bg-[#4ddbc9] text-[#00201c] font-['Space_Grotesk'] font-bold uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve'}
                      </button>
                    ) : (
                      <button onClick={handleStake} disabled={!stakeAmount || isBusy}
                        className="flex-1 py-4 bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] font-['Space_Grotesk'] font-bold uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isStakePending || isStakeConfirming ? 'Staking...' : 'Stake $NEXUSCLAW'}
                      </button>
                    )}
                    <button onClick={handleClaim} disabled={userPending === 0n || isBusy}
                      className="py-4 px-6 bg-[#4ddbc9]/20 text-[#4ddbc9] border border-[#4ddbc9]/30 font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm rounded-lg hover:bg-[#4ddbc9]/30 active:scale-[0.98] transition-all disabled:opacity-50">
                      {isClaimPending || isClaimConfirming ? 'Claiming...' : `Claim ${userPending > 0n ? formatTokenShort(userPending) : ''}`}
                    </button>
                  </div>

                  {userStakedAmount > 0n && (
                    <div className="border-t border-[#414754]/20 pt-6">
                      <label className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#8b919f] mb-2 block">Amount to unstake</label>
                      <div className="relative mb-3">
                        <input type="number" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} placeholder="0.00"
                          className="w-full bg-[#201f1f] border border-[#414754]/30 rounded-lg py-4 px-6 text-lg font-bold text-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab]/30 focus:outline-none transition-all" />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <button onClick={setMaxUnstake} className="font-['JetBrains_Mono'] text-[10px] px-2 py-1 bg-[#353534] hover:bg-[#414754] rounded transition-colors">MAX</button>
                        </div>
                      </div>
                      <button onClick={handleUnstake} disabled={!unstakeAmount || isBusy}
                        className="py-3 px-6 bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/30 font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm rounded-lg hover:bg-[#ffb4ab]/30 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isUnstakePending || isUnstakeConfirming ? 'Unstaking...' : 'Unstake'}
                      </button>
                    </div>
                  )}

                  {(isApproveSuccess || isStakeSuccess || isClaimSuccess || isUnstakeSuccess) && (
                    <div className="bg-[#4ddbc9]/10 border border-[#4ddbc9]/20 p-4 rounded-lg font-['JetBrains_Mono'] text-xs text-[#4ddbc9]">
                      ✅ Transaction confirmed!
                      {stakeHash && <p className="mt-1">Stake: <a href={`https://basescan.org/tx/${stakeHash}`} target="_blank" rel="noopener noreferrer" className="underline">{stakeHash.slice(0, 10)}...</a></p>}
                      {claimHash && <p className="mt-1">Claim: <a href={`https://basescan.org/tx/${claimHash}`} target="_blank" rel="noopener noreferrer" className="underline">{claimHash.slice(0, 10)}...</a></p>}
                      {unstakeHash && <p className="mt-1">Unstake: <a href={`https://basescan.org/tx/${unstakeHash}`} target="_blank" rel="noopener noreferrer" className="underline">{unstakeHash.slice(0, 10)}...</a></p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#1c1b1b] border border-[#414754]/20 p-6 rounded-lg">
              <h4 className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#8b919f] tracking-widest mb-4">Protocol Stats</h4>
              <div className="space-y-4">
                <StatRow label="Total Stakers" value={totalStakers?.toString() || '0'} />
                <StatRow label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} />
                <StatRow label="Reward Pool" value={rewardPool ? formatTokenShort(rewardPool as bigint) : '0'} />
                <StatRow label="APY" value={`${effectiveAPY}%`} />
                <StatRow label="Runway" value={`${runwayDays} days`} />
                <StatRow label="Status" value={launched ? 'Active' : 'Inactive'} />
              </div>
            </div>
            <div className="bg-[#1c1b1b] border border-[#414754]/20 p-6 rounded-lg">
              <h4 className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#8b919f] tracking-widest mb-4">Your Position</h4>
              <div className="space-y-4">
                <StatRow label="Staked" value={userStakedAmount ? formatTokenShort(userStakedAmount) : '0'} />
                <StatRow label="Pending Rewards" value={userPending ? formatTokenShort(userPending) : '0'} />
                <StatRow label="APY" value={`${effectiveAPY}%`} />
              </div>
            </div>
            <a href={`${BASESCAN_URL}/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="block text-center py-3 bg-[#201f1f] border border-[#414754]/20 font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#abc7ff] hover:bg-[#353534] rounded-lg transition-all">
              View on Basescan →
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div className="bg-[#1c1b1b] p-5 rounded-lg border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-start justify-between mb-4">
        <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] tracking-widest uppercase">{label}</span>
        <span className="material-symbols-outlined text-lg opacity-60" style={{ color }}>{icon}</span>
      </div>
      <h3 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight" style={{ color }}>{value}</h3>
      <p className="font-['JetBrains_Mono'] text-xs opacity-60 mt-1 text-[#8b919f]">{sub}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase">{label}</span>
      <span className="font-['Space_Grotesk'] font-bold text-sm text-[#e5e2e1]">{value}</span>
    </div>
  )
}
