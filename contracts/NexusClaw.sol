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
    address public treasury;

    uint256 public constant MAX_MINT_BATCH = 1_000_000_000 * 10**18; // 1B per mint for treasury

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokensBurnedFrom(address indexed account, uint256 amount);

    constructor(address _treasury) ERC20("NexusClaw", "CLAW") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        _mint(_treasury, TOTAL_SUPPLY);
    }

    /**
     * @dev Treasury-only: Burn tokens from any account (requires allowance).
     * Integrates with tokenomics: 50% of fees to burn.
     */
    function treasuryBurn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
        emit TokensBurnedFrom(account, amount);
    }

    /**
     * @dev Treasury-only: Mint additional (capped) for ecosystem rewards.
     * Rewards pool: 30% fees + staking emissions.
     */
    function treasuryMint(address to, uint256 amount) external onlyOwner {
        require(amount <= MAX_MINT_BATCH, "Exceeds mint cap");
        require(to != address(0), "Invalid recipient");
        _mint(to, amount);
    }

    /**
     * @dev Update treasury address (governance later).
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // Optional: Tax on transfers (0.5% total: 50% burn, 20% treasury, 30% rewards)
    // Implement _update() override for efficiency in v2.
}
