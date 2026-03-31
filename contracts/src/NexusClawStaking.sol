// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NexusClawStaking
 * @notice Staking contract for $NEXUSCLAW with fixed 20% APY
 * @dev Designed for autonomous agents — simple, predictable, secure
 * 
 * VERSION: v10.1 (April 2026)
 * - Fixed: unstake no longer reverts on empty pool
 * - Fixed: emergencyWithdraw resets rewardDebt
 * - Changed: MAX_STAKE 1M → 10M (0.01% of supply)
 * - Added: totalStakers counter
 */
contract NexusClawStaking is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    // ============ CONSTANTS ============
    uint256 public constant APY_BPS = 2000; // 20%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    /// @notice Maximum stake per user: 10M tokens (0.01% of 100B supply)
    uint256 public constant MAX_STAKE_PER_USER = 10_000_000 * 10**18;
    
    uint256 public constant POOL_LOW_THRESHOLD = 50_000 * 10**18;
    uint256 public constant ALERT_COOLDOWN = 100;

    // ============ STATE ============
    IERC20 public immutable stakingToken;
    
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 rewardDebt;
    }
    
    mapping(address => StakeInfo) public stakes;
    mapping(address => bool) public hasStaked;
    
    uint256 public totalStaked;
    uint256 public totalStakers;
    uint256 public rewardPool;
    bool public stakingPaused;
    uint256 public lastAlertBlock;

    // ============ EVENTS ============
    event Staked(address indexed user, uint256 amount, uint256 rewardClaimed);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event RewardPoolLow(uint256 remaining, uint256 runwayDays);
    event EmergencyUnstake(address indexed user, uint256 principal);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event StakingPaused(bool paused);
    event StakerAdded(address indexed user);
    event StakerRemoved(address indexed user);

    // ============ ERRORS ============
    error InvalidAddress();
    error InvalidAmount();
    error StakingIsPaused();
    error ExceedsMaxStake();
    error InsufficientStake();
    error NoRewardsAvailable();
    error RewardPoolInsufficient();
    error UseRegularUnstake();
    error NothingStaked();

    // ============ CONSTRUCTOR ============
    constructor(address _stakingToken, address _admin) {
        if (_stakingToken == address(0) || _admin == address(0)) {
            revert InvalidAddress();
        }
        
        stakingToken = IERC20(_stakingToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(FUNDER_ROLE, _admin);
    }

    // ============ VIEW FUNCTIONS ============
    
    function pendingReward(address user) public view returns (uint256) {
        StakeInfo memory info = stakes[user];
        if (info.amount == 0) return 0;

        uint256 elapsed = block.timestamp - info.stakedAt;
        uint256 reward = (info.amount * APY_BPS * elapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        
        uint256 available = reward - info.rewardDebt;
        return available > rewardPool ? rewardPool : available;
    }
    
    function rewardPoolRunway() public view returns (uint256 daysLeft) {
        if (totalStaked == 0) return type(uint256).max;
        
        uint256 yearlyOutflow = (totalStaked * APY_BPS) / BPS_DENOMINATOR;
        if (yearlyOutflow == 0) return type(uint256).max;
        
        uint256 dailyOutflow = yearlyOutflow / 365;
        if (dailyOutflow == 0) return type(uint256).max;
        
        return rewardPool / dailyOutflow;
    }
    
    function getUserProjectedYield(address user) external view returns (
        uint256 yearlyReward,
        uint256 dailyReward,
        uint256 effectiveAPY,
        uint256 maxDays
    ) {
        StakeInfo memory info = stakes[user];
        if (info.amount == 0) return (0, 0, 0, 0);
        
        maxDays = rewardPoolRunway();
        uint256 cappedDays = maxDays > 365 ? 365 : maxDays;
        
        yearlyReward = (info.amount * APY_BPS * cappedDays) / (BPS_DENOMINATOR * 365);
        dailyReward = yearlyReward / 365;
        effectiveAPY = maxDays >= 365 ? APY_BPS : (APY_BPS * maxDays) / 365;
    }
    
    function getUserInfo(address user) external view returns (
        uint256 staked,
        uint256 pending,
        uint256 stakedAt,
        uint256 effectiveAPY
    ) {
        StakeInfo memory info = stakes[user];
        (,, effectiveAPY,) = this.getUserProjectedYield(user);
        return (info.amount, pendingReward(user), info.stakedAt, effectiveAPY);
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    function stake(uint256 amount) external nonReentrant {
        if (stakingPaused) revert StakingIsPaused();
        if (amount == 0) revert InvalidAmount();
        
        StakeInfo storage info = stakes[msg.sender];
        
        if (info.amount + amount > MAX_STAKE_PER_USER) {
            revert ExceedsMaxStake();
        }
        
        uint256 claimedReward = 0;
        
        // Auto-claim existing rewards
        if (info.amount > 0) {
            uint256 pending = pendingReward(msg.sender);
            if (pending > 0) {
                claimedReward = pending;
                rewardPool -= pending;
                stakingToken.safeTransfer(msg.sender, pending);
                emit RewardClaimed(msg.sender, pending);
            }
        }
        
        // First-time staker tracking
        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            totalStakers++;
            emit StakerAdded(msg.sender);
        }
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        info.amount += amount;
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;
        totalStaked += amount;
        
        _checkPoolHealth();
        
        emit Staked(msg.sender, amount, claimedReward);
    }
    
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        
        if (info.amount < amount) revert InsufficientStake();
        if (amount == 0) revert InvalidAmount();
        
        // Calculate and cap rewards at available pool
        uint256 pending = pendingReward(msg.sender);
        uint256 rewardPaid = 0;
        
        if (pending > 0) {
            if (pending > rewardPool) {
                pending = rewardPool; // Cap at available
            }
            rewardPool -= pending;
            rewardPaid = pending;
            stakingToken.safeTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, pending);
        }
        
        // Update stake
        info.amount -= amount;
        totalStaked -= amount;
        
        // Full exit: remove from stakers count
        if (info.amount == 0) {
            hasStaked[msg.sender] = false;
            totalStakers--;
            emit StakerRemoved(msg.sender);
            delete stakes[msg.sender];
        } else {
            // Partial: reset timer
            info.stakedAt = block.timestamp;
            info.rewardDebt = 0;
        }
        
        stakingToken.safeTransfer(msg.sender, amount);
        
        _checkPoolHealth();
        
        emit Unstaked(msg.sender, amount, rewardPaid);
    }
    
    function claimRewards() external nonReentrant {
        uint256 pending = pendingReward(msg.sender);
        if (pending == 0) revert NoRewardsAvailable();
        if (pending > rewardPool) revert RewardPoolInsufficient();
        
        StakeInfo storage info = stakes[msg.sender];
        
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;
        
        rewardPool -= pending;
        stakingToken.safeTransfer(msg.sender, pending);
        
        _checkPoolHealth();
        
        emit RewardClaimed(msg.sender, pending);
    }
    
    /**
     * @notice Emergency unstake when reward pool is depleted
     * @dev Only works when rewardPool == 0
     */
    function emergencyUnstake() external nonReentrant {
        if (rewardPool > 0) revert UseRegularUnstake();
        
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert NothingStaked();
        
        uint256 amount = info.amount;
        totalStaked -= amount;
        
        hasStaked[msg.sender] = false;
        totalStakers--;
        emit StakerRemoved(msg.sender);
        
        delete stakes[msg.sender];
        
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyUnstake(msg.sender, amount);
    }
    
    /**
     * @notice Emergency withdraw principal (works in any state)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert NothingStaked();
        if (info.amount < amount) revert InsufficientStake();
        
        totalStaked -= amount;
        
        if (amount == info.amount) {
            // Full exit
            hasStaked[msg.sender] = false;
            totalStakers--;
            emit StakerRemoved(msg.sender);
            delete stakes[msg.sender];
        } else {
            // Partial: reset tracking
            info.amount -= amount;
            info.stakedAt = block.timestamp;
            info.rewardDebt = 0; // ← FIX: Reset debt
        }
        
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, amount);
    }

    // ============ ADMIN FUNCTIONS ============
    
    function fundRewardPool(uint256 amount) external onlyRole(FUNDER_ROLE) {
        if (amount == 0) revert InvalidAmount();
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        
        _checkPoolHealth();
        
        emit RewardPoolFunded(msg.sender, amount);
    }
    
    function setStakingPaused(bool paused) external onlyRole(ADMIN_ROLE) {
        stakingPaused = paused;
        emit StakingPaused(paused);
    }
    
    function recoverToken(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (token == address(stakingToken)) {
            uint256 excess = IERC20(token).balanceOf(address(this)) - totalStaked - rewardPool;
            if (amount > excess) revert InvalidAmount();
        }
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // ============ INTERNAL ============
    
    function _checkPoolHealth() internal {
        if (rewardPool < POOL_LOW_THRESHOLD && 
            rewardPool > 0 && 
            block.number > lastAlertBlock + ALERT_COOLDOWN) {
            
            uint256 runway = rewardPoolRunway();
            lastAlertBlock = block.number;
            
            emit RewardPoolLow(rewardPool, runway);
        }
    }
}
