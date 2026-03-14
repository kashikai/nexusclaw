// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NexusClaw
 * @dev ERC20 token with burnable supply, treasury management, and owner controls.
 * Total supply: 100 Billion $CLAW
 * Features: 1% burn fee on transfers (toggleable), treasury management.
 */
contract NexusClaw is ERC20, ERC20Burnable, Ownable {
    uint256 public constant TOTAL_SUPPLY = 100_000_000_000 * 10**18;
    uint256 public constant MAX_MINT_BATCH = 1_000_000_000 * 10**18;
    uint256 public constant MAX_TOTAL_MINT = 10_000_000_000 * 10**18;
    uint256 public constant BURN_FEE_BPS = 100; // 1% = 100 basis points

    address public treasury;
    uint256 public totalMinted;
    bool public burnFeeEnabled = true;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokensBurnedFrom(address indexed account, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event BurnFeeToggled(bool enabled);
    event TreasuryTransfer(address indexed to, uint256 amount);

    constructor(address _treasury) ERC20("NexusClaw", "CLAW") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        _mint(_treasury, TOTAL_SUPPLY);
    }

    /**
     * @dev Override _update to apply 1% burn fee on transfers.
     * Fee is skipped on mint/burn and when burnFeeEnabled is false.
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Skip fee on mint (from == 0), burn (to == 0), or when disabled
        if (burnFeeEnabled && from != address(0) && to != address(0)) {
            uint256 fee = (amount * BURN_FEE_BPS) / 10000;
            super._update(from, address(0), fee); // burn the fee
            super._update(from, to, amount - fee); // transfer remainder
        } else {
            super._update(from, to, amount);
        }
    }

    function treasuryBurn(address account, uint256 amount) external onlyOwner {
        burnFrom(account, amount);
        emit TokensBurnedFrom(account, amount);
    }

    function treasuryMint(address to, uint256 amount) external onlyOwner {
        require(amount <= MAX_MINT_BATCH, "Exceeds batch cap");
        require(totalMinted + amount <= MAX_TOTAL_MINT, "Exceeds max supply");
        require(to != address(0), "Invalid recipient");
        totalMinted += amount;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Transfer tokens from treasury to any address (owner only).
     */
    function treasuryTransfer(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        _transfer(treasury, to, amount);
        emit TreasuryTransfer(to, amount);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function toggleBurnFee(bool enabled) external onlyOwner {
        burnFeeEnabled = enabled;
        emit BurnFeeToggled(enabled);
    }
}
