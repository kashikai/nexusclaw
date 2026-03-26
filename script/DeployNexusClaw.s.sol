// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {NexusClaw} from "../src/NexusClaw.sol";

/**
 * @dev Deploy script for NexusClaw token
 * Usage: forge script script/DeployNexusClaw.s.sol:DeployNexusClaw \
 *   --rpc-url https://sepolia.base.org \
 *   --private-key YOUR_KEY \
 *   -- TREASURY_ADDR TREASURY_FEE_ADDR STAKING_POOL_ADDR \
 *   --broadcast --verify -vvvv
 */
contract DeployNexusClaw is Script {
    function run(
        address treasury,
        address treasuryAddress,
        address stakingPool
    ) external returns (NexusClaw) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        NexusClaw claw = new NexusClaw(treasury, treasuryAddress, stakingPool);

        console.log("=====================================");
        console.log("NexusClaw Deployment Summary");
        console.log("=====================================");
        console.log("Contract Address:", address(claw));
        console.log("Total Supply:", claw.totalSupply() / 10**18, "tokens");
        console.log("Initial Treasury Balance:", claw.balanceOf(treasury) / 10**18, "tokens");
        console.log("Treasury Fee Address:", treasuryAddress);
        console.log("Staking Pool Address:", stakingPool);
        console.log("Fee Distribution:");
        console.log("  - 50% burn");
        console.log("  - 30% treasury");
        console.log("  - 20% staking rewards");
        console.log("Launch Status:", claw.launched() ? "LIVE" : "PENDING");
        console.log("=====================================");

        vm.stopBroadcast();

        return claw;
    }
}
