// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NexusClaw
 * @dev ERC20 token with AccessControl, 1% fee split, anti-snipe, DEX whitelist, 24h timelock.
 * Total supply: 100 Billion $NEXUSCLAW
 * Fee distribution: 50% burn, 30% treasury, 20% staking rewards pool
 */
contract NexusClaw is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {

    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");

    uint256 public constant TOTAL_SUPPLY   = 100_000_000_000 * 10**18;
    uint256 public constant FEE_BPS        = 100; // 1%
    uint256 public constant MAX_MINT_BATCH = 1_000_000_000 * 10**18; // 1B per call

    // Fee distribution (of 1% total fee)
    uint256 public constant FEE_BURN_BPS        = 5000; // 50% burn
    uint256 public constant FEE_TREASURY_BPS    = 3000; // 30% treasury
    uint256 public constant FEE_STAKING_BPS     = 2000; // 20% staking rewards

    // Anti-snipe: max buy 0.5% of supply in first 24h
    uint256 public constant MAX_BUY_AMOUNT = (TOTAL_SUPPLY * 5) / 1000; // 0.5%
    uint256 public launchTime;
    bool public launched = false;
    uint256 public constant ANTI_SNIPE_DURATION = 24 hours;

    // Timelock 24h for critical operations
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    mapping(bytes32 => uint256) public timelockQueue;

    // DEX whitelist: exempted from anti-snipe max buy only (still pays fees)
    mapping(address => bool) public dexWhitelist;

    // Blacklist: blocked addresses
    mapping(address => bool) public blacklist;

    // Fee recipients (can be updated via setter + timelock)
    address public treasuryAddress;
    address public stakingPool;

    // Minting disable
    bool public mintingDisabled = false;

    bool private _inFeeTransfer;

    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event TokensBurned(uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event BurnFeeToggled(bool enabled);
    event Launched(uint256 timestamp);
    event DexWhitelisted(address indexed pair, bool status);
    event Blacklisted(address indexed account, bool status);
    event TimelockQueued(bytes32 indexed txHash, uint256 eta);
    event TimelockExecuted(bytes32 indexed txHash);
    event TreasuryAddressUpdated(address indexed newAddress);
    event StakingPoolUpdated(address indexed newAddress);
    event MintingDisabled();

    bool public burnFeeEnabled = true;

    constructor(
        address initialTreasury,
        address _treasuryAddress,
        address _stakingPool
    ) ERC20("NexusClaw", "NEXUSCLAW") {
        require(initialTreasury != address(0), "Invalid treasury");
        require(_treasuryAddress != address(0), "Invalid treasury address");
        require(_stakingPool != address(0), "Invalid staking pool");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, initialTreasury);
        _grantRole(MINTER_ROLE, msg.sender);

        treasuryAddress = _treasuryAddress;
        stakingPool = _stakingPool;

        _mint(address(this), TOTAL_SUPPLY);

        uint256 treasuryAmount = (TOTAL_SUPPLY * 10) / 100;
        _inFeeTransfer = true;
        _transfer(address(this), initialTreasury, treasuryAmount);
        _inFeeTransfer = false;

        emit TreasuryWithdrawn(initialTreasury, treasuryAmount);
    }

    /**
     * @dev Ativa o token para trading — inicia anti-snipe timer.
     */
    function launch() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!launched, "Already launched");
        launched = true;
        launchTime = block.timestamp;
        emit Launched(block.timestamp);
    }

    /**
     * @dev Override _update com fee split (50% burn / 30% treasury / 20% staking).
     * DEX whitelist only exempts from anti-snipe, NOT from fees.
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Blacklist check
        require(!blacklist[from] && !blacklist[to], "Address blacklisted");

        // Anti-snipe: blocks transfers before launch
        if (from != address(0) && to != address(0) && from != address(this)) {
            require(launched, "Not launched yet");

            // Anti-snipe max buy limit in first 24h (DEX whitelist exempts this check)
            if (
                block.timestamp < launchTime + ANTI_SNIPE_DURATION &&
                !dexWhitelist[from]
            ) {
                require(amount <= MAX_BUY_AMOUNT, "Exceeds max buy limit in anti-snipe period");
            }
        }

        // Fee split: 50% burn / 30% treasury / 20% staking (applies to ALL transfers, including DEX)
        if (
            burnFeeEnabled &&
            from != address(0) &&
            to != address(0) &&
            from != address(this) &&
            !_inFeeTransfer
        ) {
            uint256 totalFee = (amount * FEE_BPS) / 10000; // 1% of amount
            uint256 amountAfterFee = amount - totalFee;

            // Split the fee
            uint256 burnAmount = (totalFee * FEE_BURN_BPS) / 10000;      // 50% burn
            uint256 treasuryAmount = (totalFee * FEE_TREASURY_BPS) / 10000; // 30% treasury
            uint256 stakingAmount = totalFee - burnAmount - treasuryAmount;  // 20% staking

            _inFeeTransfer = true;

            // Distribute fees
            if (burnAmount > 0) {
                _burn(from, burnAmount);
            }
            if (treasuryAmount > 0) {
                _transfer(from, treasuryAddress, treasuryAmount);
            }
            if (stakingAmount > 0) {
                _transfer(from, stakingPool, stakingAmount);
            }

            // Transfer main amount
            super._update(from, to, amountAfterFee);
            _inFeeTransfer = false;
        } else {
            super._update(from, to, amount);
        }
    }

    // ========== TIMELOCK FUNCTIONS ==========

    /**
     * @dev Queue burn fee toggle with 24h timelock.
     */
    function queueToggleBurnFee(bool _enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 txHash = keccak256(abi.encode("TOGGLE_BURN_FEE", _enabled));
        uint256 eta = block.timestamp + TIMELOCK_DELAY;
        timelockQueue[txHash] = eta;
        emit TimelockQueued(txHash, eta);
    }

    /**
     * @dev Execute burn fee toggle after 24h delay.
     */
    function executeToggleBurnFee(bool _enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 txHash = keccak256(abi.encode("TOGGLE_BURN_FEE", _enabled));
        require(timelockQueue[txHash] != 0, "Tx not queued");
        require(block.timestamp >= timelockQueue[txHash], "Timelock not elapsed");

        delete timelockQueue[txHash];
        burnFeeEnabled = _enabled;
        emit BurnFeeToggled(_enabled);
        emit TimelockExecuted(txHash);
    }

    /**
     * @dev Queue blacklist with 24h timelock.
     */
    function queueSetBlacklist(address account, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 txHash = keccak256(abi.encode("SET_BLACKLIST", account, status));
        uint256 eta = block.timestamp + TIMELOCK_DELAY;
        timelockQueue[txHash] = eta;
        emit TimelockQueued(txHash, eta);
    }

    /**
     * @dev Execute blacklist after 24h delay.
     */
    function executeSetBlacklist(address account, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 txHash = keccak256(abi.encode("SET_BLACKLIST", account, status));
        require(timelockQueue[txHash] != 0, "Tx not queued");
        require(block.timestamp >= timelockQueue[txHash], "Timelock not elapsed");

        delete timelockQueue[txHash];
        blacklist[account] = status;
        emit Blacklisted(account, status);
        emit TimelockExecuted(txHash);
    }

    /**
     * @dev Queue DEX whitelist with 24h timelock.
     */
    function queueSetDexWhitelist(address pair, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 txHash = keccak256(abi.encode("SET_DEX_WHITELIST", pair, status));
        uint256 eta = block.timestamp + TIMELOCK_DELAY;
        timelockQueue[txHash] = eta;
        emit TimelockQueued(txHash, eta);
    }

    /**
     * @dev Execute DEX whitelist after 24h delay.
     */
    function executeSetDexWhitelist(address pair, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes32 txHash = keccak256(abi.encode("SET_DEX_WHITELIST", pair, status));
        require(timelockQueue[txHash] != 0, "Tx not queued");
        require(block.timestamp >= timelockQueue[txHash], "Timelock not elapsed");

        delete timelockQueue[txHash];
        dexWhitelist[pair] = status;
        emit DexWhitelisted(pair, status);
        emit TimelockExecuted(txHash);
    }

    // ========== ADMIN SETTERS ==========

    /**
     * @dev Update treasury address (immediate, cosmetic).
     */
    function setTreasuryAddress(address newAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAddress != address(0), "Invalid address");
        treasuryAddress = newAddress;
        emit TreasuryAddressUpdated(newAddress);
    }

    /**
     * @dev Update staking pool address (immediate, cosmetic).
     */
    function setStakingPool(address newAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAddress != address(0), "Invalid address");
        stakingPool = newAddress;
        emit StakingPoolUpdated(newAddress);
    }

    /**
     * @dev Disable minting permanently (one-way, no recovery).
     */
    function disableMinting() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!mintingDisabled, "Minting already disabled");
        mintingDisabled = true;
        _revokeRole(MINTER_ROLE, msg.sender);
        emit MintingDisabled();
    }

    // ========== USER FUNCTIONS ==========

    /**
     * @dev Withdraw tokens from contract (treasury role only).
     */
    function treasuryWithdraw(address to, uint256 amount)
        external
        onlyRole(TREASURY_ROLE)
        nonReentrant
    {
        require(to != address(0), "Invalid recipient");
        require(amount <= balanceOf(address(this)), "Insufficient balance");
        _transfer(address(this), to, amount);
        emit TreasuryWithdrawn(to, amount);
    }

    /**
     * @dev Mint tokens (capped, can be disabled).
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        require(!mintingDisabled, "Minting disabled");
        require(amount <= MAX_MINT_BATCH, "Exceeds batch cap");
        require(totalSupply() + amount <= TOTAL_SUPPLY, "Exceeds total supply cap");
        require(to != address(0), "Invalid recipient");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burn tokens from contract.
     */
    function treasuryBurn(uint256 amount) external onlyRole(TREASURY_ROLE) {
        require(amount <= balanceOf(address(this)), "Insufficient balance");
        _burn(address(this), amount);
        emit TokensBurned(amount);
    }

    /**
     * @dev Check if anti-snipe is currently active.
     */
    function isAntiSnipeActive() external view returns (bool) {
        if (!launched) return true;
        return block.timestamp < launchTime + ANTI_SNIPE_DURATION;
    }
}
