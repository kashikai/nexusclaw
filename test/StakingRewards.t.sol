// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test, console} from "forge-std/Test.sol";
import {NexusClaw} from "../src/NexusClaw.sol";
import {StakingRewards} from "../src/StakingRewards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingRewardsTest is Test {
    NexusClaw claw;
    StakingRewards staking;
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address staker = makeAddr("staker");
    address agentPool = makeAddr("agentPool");
    address buybackPool = makeAddr("buybackPool");

    function setUp() public {
        vm.startPrank(owner);
        claw = new NexusClaw(treasury, agentPool, buybackPool);
        claw.launch(); // Launch to allow transfers
        staking = new StakingRewards(IERC20(address(claw)), IERC20(address(claw)));
        vm.stopPrank();
    }

    function testStakeAndEarn() public {
        uint256 stakeAmt = 1_000_000 * 10**18;
        uint256 rate = 1e18; // 1 token/sec in 18 decimals

        // Give staker tokens
        vm.prank(treasury);
        claw.transfer(staker, stakeAmt);

        // Staker approves and stakes
        vm.startPrank(staker);
        claw.approve(address(staking), stakeAmt);
        staking.stake(stakeAmt);

        // Set reward rate
        vm.stopPrank();
        vm.prank(owner);
        staking.setRewardRate(rate);

        // Fast forward
        vm.warp(block.timestamp + 100);

        // Check earned
        uint256 earned = staking.earned(staker);
        assertGt(earned, 0);
    }

    function testWithdraw() public {
        uint256 stakeAmt = 1_000_000 * 10**18;

        vm.prank(treasury);
        claw.transfer(staker, stakeAmt);

        vm.startPrank(staker);
        claw.approve(address(staking), stakeAmt);
        staking.stake(stakeAmt);
        staking.withdraw(stakeAmt);
        
        assertEq(staking.balances(staker), 0);
        vm.stopPrank();
    }

    function testExit() public {
        uint256 stakeAmt = 1_000_000 * 10**18;

        vm.prank(treasury);
        claw.transfer(staker, stakeAmt);

        vm.startPrank(staker);
        claw.approve(address(staking), stakeAmt);
        staking.stake(stakeAmt);
        staking.exit();
        
        assertEq(staking.balances(staker), 0);
        vm.stopPrank();
    }
}
