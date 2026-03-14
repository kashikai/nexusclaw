// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test, console} from "forge-std/Test.sol";
import {NexusClaw} from "../src/NexusClaw.sol";
import {StakingRewards} from "../src/StakingRewards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingRewardsTest is Test {
    NexusClaw claw;
    StakingRewards staking;
    address treasury = makeAddr("treasury");
    address owner = makeAddr("owner");
    address staker = makeAddr("staker");

    uint256 constant STAKE_AMT = 1_000_000 * 10**18;

    function setUp() public {
        vm.startPrank(owner);
        claw = new NexusClaw(treasury);
        staking = new StakingRewards(IERC20(address(claw)), IERC20(address(claw)));
        // Disable burn fee so stake amounts are exact
        claw.toggleBurnFee(false);
        // Fund staker from treasury
        claw.treasuryTransfer(staker, STAKE_AMT);
        vm.stopPrank();
    }

    function testStakeAndEarn() public {
        uint256 depositAmt = 10_000 * 10**18;
        uint256 rate = 1e18;

        vm.startPrank(owner);
        claw.treasuryMint(address(staking), depositAmt);
        staking.setRewardRate(rate);
        vm.stopPrank();

        vm.startPrank(staker);
        claw.approve(address(staking), STAKE_AMT);
        staking.stake(STAKE_AMT);
        skip(100);
        uint256 earned = staking.earned(staker);
        assertGt(earned, 0);
        staking.getReward();
        assertGt(claw.balanceOf(staker), 0);
        vm.stopPrank();
    }

    function testWithdraw() public {
        vm.startPrank(staker);
        claw.approve(address(staking), STAKE_AMT);
        staking.stake(STAKE_AMT);
        staking.withdraw(STAKE_AMT);
        assertEq(staking.balances(staker), 0);
        vm.stopPrank();
    }

    function testExit() public {
        vm.startPrank(staker);
        claw.approve(address(staking), STAKE_AMT);
        staking.stake(STAKE_AMT);
        staking.exit();
        assertEq(staking.balances(staker), 0);
        vm.stopPrank();
    }
}
