// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NexusClaw
 * @dev ERC20 token with burnable supply, treasury management, and owner controls.
 * Total supply: 50 Billion $CLAW (50_000_000_000 * 10**18)
 * Initial mint to treasury address in constructor.
 * Treasury role: Can burn from any account (with approval), mint new tokens (capped).
 */
contract NexusClaw is ERC20, ERC20Burnable, Ownable {
    uint256 public constant TOTAL_SUPPLY = 50_000_000_000 * 10**18;
    uint256 public constant MAX_MINT_BATCH = 1_000_000_000 * 10**18;
    uint256 public constant MAX_TOTAL_MINT = 10_000_000_000 * 10**18;

    address public treasury;
    uint256 public totalMinted;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokensBurnedFrom(address indexed account, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);

    constructor(address _treasury) ERC20("NexusClaw", "CLAW") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        _mint(_treasury, TOTAL_SUPPLY);
    }

    /**
     * @dev Owner-only: Burn tokens from any account (requires allowance).
     * Uses burnFrom() to correctly enforce ERC20 allowance.
     */
    function treasuryBurn(address account, uint256 amount) external onlyOwner {
        burnFrom(account, amount); // ✅ verifica allowance
        emit TokensBurnedFrom(account, amount);
    }

    /**
     * @dev Owner-only: Mint additional tokens (capped per batch and cumulatively).
     */
    function treasuryMint(address to, uint256 amount) external onlyOwner {
        require(amount <= MAX_MINT_BATCH, "Exceeds mint cap");
        require(totalMinted + amount <= MAX_TOTAL_MINT, "Exceeds total mint cap");
        require(to != address(0), "Invalid recipient");
        totalMinted += amount;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Update treasury address (governance later).
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }
}
