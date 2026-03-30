// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NexusClawStaking
 * @dev Staking contract for $NEXUSCLAW token
 * - 20% APY (bootstrap phase)
 * - No lock period (flexible staking)
 * - Rewards funded by treasury
 * - Emergency withdraw available
 */
contract NexusClawStaking is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    IERC20 public immutable stakingToken;

    uint256 public constant APY_BPS = 2000; // 20% APY in basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 rewardDebt;
    }

    mapping(address => StakeInfo) public stakes;

    uint256 public totalStaked;
    uint256 public rewardPool;

    bool public stakingPaused = false;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event StakingPaused(bool paused);

    constructor(address _stakingToken, address _admin) {
        require(_stakingToken != address(0), "Invalid token");
        require(_admin != address(0), "Invalid admin");

        stakingToken = IERC20(_stakingToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(FUNDER_ROLE, _admin);
    }

    // ── VIEWS ─────────────────────────────────────────────────────

    /**
     * @dev Calculate pending reward for a user
     */
    function pendingReward(address user) public view returns (uint256) {
        StakeInfo memory info = stakes[user];
        if (info.amount == 0) return 0;

        uint256 elapsed = block.timestamp - info.stakedAt;
        uint256 reward = (info.amount * APY_BPS * elapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        return reward - info.rewardDebt;
    }

    /**
     * @dev Get user stake info
     */
    function getUserInfo(address user) external view returns (
        uint256 staked,
        uint256 pending,
        uint256 stakedAt
    ) {
        StakeInfo memory info = stakes[user];
        return (info.amount, pendingReward(user), info.stakedAt);
    }

    // ── STAKING ───────────────────────────────────────────────────

    /**
     * @dev Stake tokens
     */
    function stake(uint256 amount) external nonReentrant {
        require(!stakingPaused, "Staking paused");
        require(amount > 0, "Amount must be > 0");

        StakeInfo storage info = stakes[msg.sender];

        // Claim pending rewards before updating stake
        if (info.amount > 0) {
            uint256 pending = pendingReward(msg.sender);
            if (pending > 0 && pending <= rewardPool) {
                rewardPool -= pending;
                stakingToken.safeTransfer(msg.sender, pending);
            }
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        info.amount += amount;
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens and claim rewards
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount >= amount, "Insufficient stake");
        require(amount > 0, "Amount must be > 0");

        uint256 pending = pendingReward(msg.sender);

        info.amount -= amount;
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;
        totalStaked -= amount;

        // Transfer principal
        stakingToken.safeTransfer(msg.sender, amount);

        // Transfer reward if pool has enough
        if (pending > 0 && pending <= rewardPool) {
            rewardPool -= pending;
            stakingToken.safeTransfer(msg.sender, pending);
        }

        emit Unstaked(msg.sender, amount, pending);
    }

    /**
     * @dev Claim rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        uint256 pending = pendingReward(msg.sender);
        require(pending > 0, "No rewards");
        require(pending <= rewardPool, "Insufficient reward pool");

        StakeInfo storage info = stakes[msg.sender];
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;

        rewardPool -= pending;
        stakingToken.safeTransfer(msg.sender, pending);
    }

    /**
     * @dev Emergency withdraw — no rewards, just principal
     */
    function emergencyWithdraw() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount > 0, "Nothing staked");

        uint256 amount = info.amount;
        totalStaked -= amount;
        info.amount = 0;
        info.rewardDebt = 0;

        stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    // ── ADMIN ─────────────────────────────────────────────────────

    /**
     * @dev Fund the reward pool
     */
    function fundRewardPool(uint256 amount) external onlyRole(FUNDER_ROLE) {
        require(amount > 0, "Amount must be > 0");
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(msg.sender, amount);
    }

    /**
     * @dev Pause/unpause staking
     */
    function setStakingPaused(bool paused) external onlyRole(ADMIN_ROLE) {
        stakingPaused = paused;
        emit StakingPaused(paused);
    }

    /**
     * @dev Withdraw excess rewards from pool (admin only)
     */
    function withdrawExcessRewards(uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(amount <= rewardPool, "Exceeds pool");
        rewardPool -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
    }
}
