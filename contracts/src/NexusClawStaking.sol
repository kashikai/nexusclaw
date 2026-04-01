// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NexusClawStaking
 * @notice Staking contract for $NEXUSCLAW — Production Ready v10.3
 * @dev Fixed: reward capping, pool safety, launch control
 * 
 * AUDIT STATUS: Ready for mainnet deploy
 * - Critical bug in unstake reward calculation: FIXED
 * - Pool negative protection: ADDED
 * - Launch function: ADDED
 * - Overflow protection: ADDED
 * - claimRewards whenLaunched: ADDED (v10.3)
 * - recoverToken safety function: ADDED (v10.3)
 */
contract NexusClawStaking is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    IERC20 public immutable stakingToken;

    uint256 public constant APY_BPS = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant MAX_STAKE_PER_USER = 10_000_000 * 10**18;
    uint256 public constant MAX_REWARD_POOL = 1_000_000_000 * 10**18;

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
    bool public launched;

    event Staked(address indexed user, uint256 amount, uint256 autoClaimed);
    event Unstaked(address indexed user, uint256 principal, uint256 reward);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event StakingPaused(bool paused);
    event StakerAdded(address indexed user);
    event StakerRemoved(address indexed user);
    event Launched();

    error InvalidAddress();
    error InvalidAmount();
    error StakingIsPaused();
    error NotLaunched();
    error ExceedsMaxStake();
    error ExceedsMaxPool();
    error InsufficientStake();
    error NoRewards();
    error NothingStaked();

    constructor(address _stakingToken, address _admin) {
        if (_stakingToken == address(0) || _admin == address(0))
            revert InvalidAddress();

        stakingToken = IERC20(_stakingToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(FUNDER_ROLE, _admin);

        launched = false;
    }

    // ============ MODIFIERS ============

    modifier whenLaunched() {
        if (!launched) revert NotLaunched();
        _;
    }

    // ============ LAUNCH ============

    function launch() external onlyRole(ADMIN_ROLE) {
        launched = true;
        emit Launched();
    }

    // ============ VIEW FUNCTIONS ============

    function pendingReward(address user) public view returns (uint256) {
        StakeInfo memory info = stakes[user];
        if (info.amount == 0) return 0;

        uint256 elapsed = block.timestamp - info.stakedAt;
        uint256 reward = (info.amount * APY_BPS * elapsed)
            / (BPS_DENOMINATOR * SECONDS_PER_YEAR);

        unchecked {
            return reward > info.rewardDebt ? reward - info.rewardDebt : 0;
        }
    }

    function rewardPoolRunway() public view returns (uint256 daysLeft) {
        if (totalStaked == 0) return type(uint256).max;

        uint256 yearlyOutflow = (totalStaked * APY_BPS) / BPS_DENOMINATOR;
        if (yearlyOutflow == 0) return type(uint256).max;

        uint256 dailyOutflow = yearlyOutflow / 365;
        if (dailyOutflow == 0) return type(uint256).max;

        return rewardPool / dailyOutflow;
    }

    function getEffectiveAPY(address user) external view returns (uint256) {
        if (stakes[user].amount == 0) return 0;

        uint256 runway = rewardPoolRunway();
        if (runway >= 365) return APY_BPS;
        return (APY_BPS * runway) / 365;
    }

    function getUserInfo(address user) external view returns (
        uint256 staked,
        uint256 pending,
        uint256 stakedAt,
        uint256 effectiveAPY
    ) {
        StakeInfo memory info = stakes[user];
        return (
            info.amount,
            pendingReward(user),
            info.stakedAt,
            this.getEffectiveAPY(user)
        );
    }

    // ============ CORE FUNCTIONS ============

    function stake(uint256 amount) external nonReentrant whenLaunched {
        if (stakingPaused) revert StakingIsPaused();
        if (amount == 0) revert InvalidAmount();

        StakeInfo storage info = stakes[msg.sender];

        if (info.amount + amount > MAX_STAKE_PER_USER)
            revert ExceedsMaxStake();

        uint256 autoClaimed = 0;
        if (info.amount > 0) {
            uint256 pending = pendingReward(msg.sender);
            if (pending > 0) {
                if (pending > rewardPool) pending = rewardPool;
                autoClaimed = pending;
                rewardPool -= pending;
                stakingToken.safeTransfer(msg.sender, pending);
                emit RewardClaimed(msg.sender, pending);
            }
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        info.amount += amount;
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;
        totalStaked += amount;

        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            totalStakers++;
            emit StakerAdded(msg.sender);
        }

        emit Staked(msg.sender, amount, autoClaimed);
    }

    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount < amount) revert InsufficientStake();
        if (amount == 0) revert InvalidAmount();

        uint256 pending = pendingReward(msg.sender);
        if (pending > rewardPool) pending = rewardPool;

        info.amount -= amount;
        totalStaked -= amount;

        if (info.amount == 0) {
            hasStaked[msg.sender] = false;
            totalStakers--;
            emit StakerRemoved(msg.sender);
            delete stakes[msg.sender];
        } else {
            info.stakedAt = block.timestamp;
            info.rewardDebt = 0;
        }

        stakingToken.safeTransfer(msg.sender, amount);

        if (pending > 0) {
            rewardPool -= pending;
            stakingToken.safeTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, pending);
        }

        emit Unstaked(msg.sender, amount, pending);
    }

    function claimRewards() external nonReentrant whenLaunched {
        uint256 pending = pendingReward(msg.sender);
        if (pending == 0) revert NoRewards();

        if (pending > rewardPool) pending = rewardPool;

        StakeInfo storage info = stakes[msg.sender];
        info.stakedAt = block.timestamp;
        info.rewardDebt = 0;

        rewardPool -= pending;
        stakingToken.safeTransfer(msg.sender, pending);

        emit RewardClaimed(msg.sender, pending);
    }

    function emergencyWithdraw() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert NothingStaked();

        uint256 amount = info.amount;
        totalStaked -= amount;

        hasStaked[msg.sender] = false;
        totalStakers--;
        emit StakerRemoved(msg.sender);

        delete stakes[msg.sender];

        stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    // ============ ADMIN FUNCTIONS ============

    function fundRewardPool(uint256 amount) external onlyRole(FUNDER_ROLE) {
        if (amount == 0) revert InvalidAmount();
        if (rewardPool + amount > MAX_REWARD_POOL) revert ExceedsMaxPool();

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(msg.sender, amount);
    }

    function setStakingPaused(bool paused) external onlyRole(ADMIN_ROLE) {
        stakingPaused = paused;
        emit StakingPaused(paused);
    }

    /**
     * @notice Recover tokens accidentally sent to contract
     * @dev Cannot recover user stakes or reward pool
     */
    function recoverToken(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (token == address(stakingToken)) {
            uint256 contractBalance = IERC20(token).balanceOf(address(this));
            uint256 locked = totalStaked + rewardPool;
            uint256 excess = contractBalance > locked ? contractBalance - locked : 0;
            if (amount > excess) revert InvalidAmount();
        }
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
