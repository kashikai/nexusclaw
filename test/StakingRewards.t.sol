// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {NexusClaw} from "../src/NexusClaw.sol";
import {StakingRewards} from "../src/StakingRewards.sol";

contract StakingRewardsTest is Test {
    NexusClaw claw;
    StakingRewards staking;
    address treasury = makeAddr("treasury");
    address owner = makeAddr("owner");
    address staker = makeAddr("staker");

    function setUp() public {
        vm.startPrank(owner);
        claw = new NexusClaw(treasury);
        staking = new StakingRewards(IERC20(address(claw)), IERC20(address(claw)));
        vm.stopPrank();
    }

    function testStakeAndEarn() public {
        uint256 stakeAmt = 1_000_000 * 10**18;
        uint256 depositAmt = 10_000 * 10**18;
        uint256 rate = 1; // 1 token/sec

        // Owner deposits rewards
        vm.startPrank(owner);
        claw.treasuryMint(address(staking), depositAmt);
        staking.setRewardRate(rate);
        vm.stopPrank();

        // Staker approves and stakes
        vm.startPrank(staker);
        claw.approve(address(staking), stakeAmt);
        staking.stake(stakeAmt);

        // Fast forward time
        skip(100);
        uint256 earned = staking.earned(staker);
        assertGt(earned, 0);

        staking.getReward();
        assertGt(claw.balanceOf(staker), stakeAmt);
        vm.stopPrank();
    }

    function testWithdraw() public {
        uint256 stakeAmt = 1_000_000 * 10**18;
        vm.startPrank(staker);
        claw.approve(address(staking), stakeAmt);
        staking.stake(stakeAmt);
        staking.withdraw(stakeAmt);
        assertEq(staking.balances(staker), 0);
        vm.stopPrank();
    }

    function testExit() public {
        uint256 stakeAmt = 1_000_000 * 10**18;
        vm.startPrank(staker);
        claw.approve(address(staking), stakeAmt);
        staking.stake(stakeAmt);
        staking.exit();
        assertEq(staking.balances(staker), 0);
        vm.stopPrank();
    }
}
