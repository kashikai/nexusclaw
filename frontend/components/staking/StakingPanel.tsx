'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { TOKEN_ADDRESS, STAKING_ADDRESS, TOKEN_ABI, STAKING_ABI, APY_PERCENT } from '@/config/contracts'
import { formatToken, formatTokenShort } from '@/lib/utils'

export function StakingPanel() {
  const { address, isConnected } = useAccount()
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')

  // === READ ===
  const { data: tokenBalance } = useReadContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'allowance', args: address ? [address, STAKING_ADDRESS] : undefined })
  const { data: totalStaked } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' })
  const { data: totalStakers } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' })
  const { data: rewardPool } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPool' })
  const { data: launched } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'launched' })
  const { data: userStaked } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stakes', args: address ? [address] : undefined })
  const { data: pendingReward } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'pendingReward', args: address ? [address] : undefined })
  const { data: runway } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPoolRunway' })

  // === WRITE ===
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
  const { writeContract: writeStake, data: stakeHash, isPending: isStakePending } = useWriteContract()
  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash })
  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract()
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash })
  const { writeContract: writeUnstake, data: unstakeHash, isPending: isUnstakePending } = useWriteContract()
  const { isLoading: isUnstakeConfirming, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({ hash: unstakeHash })

  // === HANDLERS ===
  const needsApproval = allowance && stakeAmount ? BigInt(allowance) < parseEther(stakeAmount || '0') : true

  function handleApprove() {
    writeApprove({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'approve', args: [STAKING_ADDRESS, parseEther(stakeAmount || '0')] })
  }
  function handleStake() {
    writeStake({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [parseEther(stakeAmount || '0')] })
  }
  function handleClaim() {
    writeClaim({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'claimRewards' })
  }
  function handleUnstake() {
    writeUnstake({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'unstake', args: [parseEther(unstakeAmount || '0')] })
  }
  function setMaxStake() { if (tokenBalance) setStakeAmount(formatEther(tokenBalance)) }
  function setMaxUnstake() { if (userStaked) setUnstakeAmount(formatEther((userStaked as any)[0])) }

  // === COMPUTED ===
  const userStakedAmount = userStaked ? (userStaked as any)[0] as bigint : 0n
  const userPending = pendingReward as bigint || 0n
  const effectiveAPY = runway && Number(runway) < 365 ? ((APY_PERCENT * Number(runway)) / 365).toFixed(1) : APY_PERCENT
  const runwayDays = runway ? (Number(runway) > 1000 ? '999+' : Number(runway).toFixed(0)) : '—'

  const isBusy = isApprovePending || isApproveConfirming || isStakePending || isStakeConfirming || isClaimPending || isClaimConfirming || isUnstakePending || isUnstakeConfirming

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Metric Cards */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} sub="$NEXUSCLAW" color="blue" icon="token" />
        <MetricCard label="Your Staked" value={userStakedAmount ? formatTokenShort(userStakedAmount) : '0'} sub="$NEXUSCLAW" color="blue" icon="account_balance_wallet" />
        <MetricCard label="Pending Rewards" value={userPending ? formatTokenShort(userPending) : '0'} sub="$NEXUSCLAW" color="purple" icon="redeem" />
        <MetricCard label="APY" value={`${effectiveAPY}%`} sub={`Runway: ${runwayDays}d`} color="cyan" icon="trending_up" />
      </div>

      {/* Staking Interface */}
      <div className="col-span-12 md:col-span-8">
        <div className="bg-nc-surface border border-nc-blue/10 p-8">
          <h3 className="font-headline text-2xl font-bold text-nc-blue mb-6 tracking-tight">Stake $NEXUSCLAW</h3>

          {!isConnected ? (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-4 block">wallet</span>
              <p className="text-lg">Connect your wallet to start staking</p>
              <p className="text-sm mt-2 text-slate-600">Base Mainnet — 20% APY</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center font-mono-nc text-xs text-slate-400 uppercase tracking-widest">
                <span>Balance: {tokenBalance ? formatToken(tokenBalance as bigint) : '0'} $NEXUSCLAW</span>
                <span className={launched ? 'text-nc-cyan' : 'text-nc-error'}>{launched ? '● Active' : '● Offline'}</span>
              </div>

              <div>
                <label className="font-mono-nc text-[10px] uppercase text-slate-500 mb-2 block">Amount to stake</label>
                <div className="relative">
                  <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-nc-surface-hi border-0 py-5 px-6 text-2xl font-bold text-nc-blue focus:ring-2 focus:ring-nc-cyan/30 focus:outline-none transition-all" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <button onClick={setMaxStake} className="font-mono-nc text-[10px] px-2 py-1 bg-nc-bg hover:bg-nc-surface border border-white/5 transition-colors">MAX</button>
                    <span className="font-mono-nc text-sm font-bold text-slate-300">$NEXUS</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {needsApproval ? (
                  <button onClick={handleApprove} disabled={!stakeAmount || isBusy}
                    className="flex-1 py-4 bg-nc-cyan text-nc-bg font-headline font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve'}
                  </button>
                ) : (
                  <button onClick={handleStake} disabled={!stakeAmount || isBusy}
                    className="flex-1 py-4 bg-nc-blue text-nc-bg font-headline font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isStakePending || isStakeConfirming ? 'Staking...' : 'Stake $NEXUS'}
                  </button>
                )}
                <button onClick={handleClaim} disabled={userPending === 0n || isBusy}
                  className="py-4 px-6 bg-nc-purple/20 text-nc-purple border border-nc-purple/30 font-headline font-bold uppercase tracking-widest text-sm hover:bg-nc-purple/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isClaimPending || isClaimConfirming ? 'Claiming...' : `Claim ${userPending > 0n ? formatTokenShort(userPending) : ''}`}
                </button>
              </div>

              {userStakedAmount > 0n && (
                <div className="border-t border-white/5 pt-6">
                  <label className="font-mono-nc text-[10px] uppercase text-slate-500 mb-2 block">Amount to unstake</label>
                  <div className="relative mb-3">
                    <input type="number" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} placeholder="0.00"
                      className="w-full bg-nc-surface-hi border-0 py-4 px-6 text-lg font-bold text-nc-error focus:ring-2 focus:ring-nc-error/30 focus:outline-none transition-all" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <button onClick={setMaxUnstake} className="font-mono-nc text-[10px] px-2 py-1 bg-nc-bg hover:bg-nc-surface border border-white/5 transition-colors">MAX</button>
                    </div>
                  </div>
                  <button onClick={handleUnstake} disabled={!unstakeAmount || isBusy}
                    className="py-3 px-6 bg-nc-error/20 text-nc-error border border-nc-error/30 font-headline font-bold uppercase tracking-widest text-sm hover:bg-nc-error/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUnstakePending || isUnstakeConfirming ? 'Unstaking...' : 'Unstake'}
                  </button>
                </div>
              )}

              {(isApproveSuccess || isStakeSuccess || isClaimSuccess || isUnstakeSuccess) && (
                <div className="bg-nc-cyan/10 border border-nc-cyan/20 p-4 font-mono-nc text-xs text-nc-cyan">
                  ✅ Transaction confirmed!
                  {approveHash && <p>Approve: {approveHash.slice(0, 10)}...</p>}
                  {stakeHash && <p>Stake: {stakeHash.slice(0, 10)}...</p>}
                  {claimHash && <p>Claim: {claimHash.slice(0, 10)}...</p>}
                  {unstakeHash && <p>Unstake: {unstakeHash.slice(0, 10)}...</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Sidebar */}
      <div className="col-span-12 md:col-span-4 space-y-4">
        <div className="bg-nc-surface border border-nc-blue/10 p-6">
          <h4 className="font-mono-nc text-[10px] uppercase text-slate-500 tracking-widest mb-4">Protocol Stats</h4>
          <div className="space-y-4">
            <StatRow label="Total Stakers" value={totalStakers?.toString() || '0'} />
            <StatRow label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} />
            <StatRow label="Reward Pool" value={rewardPool ? formatTokenShort(rewardPool as bigint) : '0'} />
            <StatRow label="APY" value={`${effectiveAPY}%`} />
            <StatRow label="Runway" value={`${runwayDays} days`} />
            <StatRow label="Status" value={launched ? 'Active' : 'Inactive'} />
          </div>
        </div>
        <div className="bg-nc-surface border border-nc-blue/10 p-6">
          <h4 className="font-mono-nc text-[10px] uppercase text-slate-500 tracking-widest mb-4">Your Position</h4>
          <div className="space-y-4">
            <StatRow label="Staked" value={userStakedAmount ? formatTokenShort(userStakedAmount) : '0'} />
            <StatRow label="Pending Rewards" value={userPending ? formatTokenShort(userPending) : '0'} />
            <StatRow label="APY" value={`${effectiveAPY}%`} />
          </div>
        </div>
        <a href={`https://basescan.org/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener noreferrer"
          className="block text-center py-3 bg-nc-surface-hi font-mono-nc text-[10px] uppercase tracking-widest text-nc-blue hover:bg-nc-surface-hi/80 transition-all">
          View on Basescan →
        </a>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: 'blue' | 'cyan' | 'purple'; icon: string }) {
  const colors = { blue: 'border-nc-blue text-nc-blue', cyan: 'border-nc-cyan text-nc-cyan', purple: 'border-nc-purple text-nc-purple' }
  return (
    <div className={`bg-nc-surface-hi p-5 border-l-4 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <span className="font-mono-nc text-[10px] text-slate-400 tracking-widest uppercase">{label}</span>
        <span className="material-symbols-outlined text-lg opacity-60">{icon}</span>
      </div>
      <h3 className={`font-headline text-3xl font-bold tracking-tight ${colors[color]}`}>{value}</h3>
      <p className="font-mono-nc text-xs opacity-60 mt-1">{sub}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono-nc text-[10px] text-slate-500 uppercase">{label}</span>
      <span className="font-headline font-bold text-sm text-nc-blue">{value}</span>
    </div>
  )
}
