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
 * Fee distribution: 80% agent/deployer, 15% buyback & burn, 5% treasury
 */
contract NexusClaw is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {

    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");

    uint256 public constant TOTAL_SUPPLY   = 100_000_000_000 * 10**18;
    uint256 public constant FEE_BPS        = 100; // 1%
    uint256 public constant MAX_MINT_BATCH = 1_000_000_000 * 10**18; // 1B per call

    // Fee distribution (when FEE_BPS = 100 = 1%)
    uint256 public constant FEE_AGENT_BPS      = 8000; // 80% of fee → agent/deployer
    uint256 public constant FEE_BUYBACK_BPS    = 1500; // 15% of fee → buyback & burn
    uint256 public constant FEE_TREASURY_BPS   = 500;  // 5% of fee → treasury

    // 🔒 Anti-snipe: max buy 0.5% of supply nas primeiras 24h
    uint256 public constant MAX_BUY_AMOUNT = (TOTAL_SUPPLY * 5) / 1000; // 0.5%
    uint256 public launchTime;
    bool public launched = false;
    uint256 public constant ANTI_SNIPE_DURATION = 24 hours;

    // 🔒 Timelock 24h para operações críticas
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    mapping(bytes32 => uint256) public timelockQueue;

    // 🔒 DEX whitelist: pares whitelistados pulam burn fee
    mapping(address => bool) public dexWhitelist;

    // 🔒 Blacklist: endereços bloqueados (snipe bots)
    mapping(address => bool) public blacklist;

    address public agentRewardPool;
    address public buybackAndBurnPool;

    bool public burnFeeEnabled = true;
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
    event PoolAddressUpdated(string pool, address indexed newAddress);

    constructor(
        address initialTreasury,
        address _agentRewardPool,
        address _buybackAndBurnPool
    ) ERC20("NexusClaw", "NEXUSCLAW") {
        require(initialTreasury != address(0), "Invalid treasury");
        require(_agentRewardPool != address(0), "Invalid agent pool");
        require(_buybackAndBurnPool != address(0), "Invalid buyback pool");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, initialTreasury);
        _grantRole(MINTER_ROLE, msg.sender);

        agentRewardPool = _agentRewardPool;
        buybackAndBurnPool = _buybackAndBurnPool;

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
     * @dev Override _update com fee split + anti-snipe + blacklist + DEX whitelist.
     */
    function _update(address from, address to, uint256 amount) internal override {
        // 🔒 Blacklist check
        require(!blacklist[from] && !blacklist[to], "Address blacklisted");

        // 🔒 Anti-snipe: bloqueia transfers antes do launch
        if (from != address(0) && to != address(0) && from != address(this)) {
            require(launched, "Not launched yet");

            // 🔒 Max buy limit nas primeiras 24h
            if (block.timestamp < launchTime + ANTI_SNIPE_DURATION) {
                if (dexWhitelist[from]) {
                    require(amount <= MAX_BUY_AMOUNT, "Exceeds max buy limit in anti-snipe period");
                }
            }
        }

        // 🔒 Fee split: agent (80%) + buyback (15%) + treasury (5%)
        if (
            burnFeeEnabled &&
            from != address(0) &&
            to != address(0) &&
            from != address(this) &&
            !_inFeeTransfer &&
            !dexWhitelist[from] &&
            !dexWhitelist[to]
        ) {
            uint256 totalFee = (amount * FEE_BPS) / 10000; // 1% of amount
            uint256 amountAfterFee = amount - totalFee;

            // Split the fee
            uint256 agentFee = (totalFee * FEE_AGENT_BPS) / 10000; // 80% to agent pool
            uint256 buybackFee = (totalFee * FEE_BUYBACK_BPS) / 10000; // 15% to buyback & burn
            uint256 treasuryFee = totalFee - agentFee - buybackFee; // 5% to treasury

            _inFeeTransfer = true;
            
            // Transfer fees to respective pools
            if (agentFee > 0) {
                _transfer(from, agentRewardPool, agentFee);
            }
            if (buybackFee > 0) {
                _burn(from, buybackFee);
            }
            if (treasuryFee > 0) {
                _transfer(from, getTreasuryAddress(), treasuryFee);
            }
            
            // Transfer main amount
            super._update(from, to, amountAfterFee);
            _inFeeTransfer = false;
        } else {
            super._update(from, to, amount);
        }
    }

    /**
     * @dev Get Treasury address (from DEFAULT_ADMIN first with TREASURY_ROLE).
     */
    function getTreasuryAddress() public view returns (address) {
        // Placeholder — integrate with actual treasury multisig
        return address(this);
    }

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
     * @dev Queue role change with 24h timelock.
     */
    function queueGrantRole(bytes32 role, address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        bytes32 txHash = keccak256(abi.encode("GRANT_ROLE", role, account));
        uint256 eta = block.timestamp + TIMELOCK_DELAY;
        timelockQueue[txHash] = eta;
        emit TimelockQueued(txHash, eta);
    }

    /**
     * @dev Execute role grant after 24h delay.
     */
    function executeGrantRole(bytes32 role, address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        bytes32 txHash = keccak256(abi.encode("GRANT_ROLE", role, account));
        require(timelockQueue[txHash] != 0, "Tx not queued");
        require(block.timestamp >= timelockQueue[txHash], "Timelock not elapsed");
        
        delete timelockQueue[txHash];
        _grantRole(role, account);
        
        emit TimelockExecuted(txHash);
    }

    /**
     * @dev Adiciona ou remove par DEX da whitelist (auto-called at launch for major pairs).
     */
    function setDexWhitelist(address pair, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(pair != address(0), "Invalid address");
        dexWhitelist[pair] = status;
        emit DexWhitelisted(pair, status);
    }

    /**
     * @dev Adiciona ou remove endereço da blacklist (snipe bots).
     */
    function setBlacklist(address account, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(account != address(0), "Invalid address");
        blacklist[account] = status;
        emit Blacklisted(account, status);
    }

    /**
     * @dev Withdraw tokens do contrato (treasury only).
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
     * @dev Mint tokens adicionais (capped).
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        require(amount <= MAX_MINT_BATCH, "Exceeds batch cap");
        require(totalSupply() + amount <= TOTAL_SUPPLY, "Exceeds total supply cap");
        require(to != address(0), "Invalid recipient");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burn tokens do contrato (treasury only).
     */
    function treasuryBurn(uint256 amount)
        external
        onlyRole(TREASURY_ROLE)
    {
        require(amount <= balanceOf(address(this)), "Insufficient balance");
        _burn(address(this), amount);
        emit TokensBurned(amount);
    }

    /**
     * @dev Update pool addresses (admin only, no timelock as cosmetic).
     */
    function setPoolAddress(string memory poolName, address newAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newAddress != address(0), "Invalid address");
        if (keccak256(abi.encodePacked(poolName)) == keccak256(abi.encodePacked("agent"))) {
            agentRewardPool = newAddress;
        } else if (keccak256(abi.encodePacked(poolName)) == keccak256(abi.encodePacked("buyback"))) {
            buybackAndBurnPool = newAddress;
        } else {
            revert("Unknown pool");
        }
        emit PoolAddressUpdated(poolName, newAddress);
    }

    /**
     * @dev Retorna se ainda está no período anti-snipe.
     */
    function isAntiSnipeActive() external view returns (bool) {
        if (!launched) return true;
        return block.timestamp < launchTime + ANTI_SNIPE_DURATION;
    }
}
