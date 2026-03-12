// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {NexusClaw} from "../src/NexusClaw.sol";

contract NexusClawTest is Test {
    NexusClaw claw;
    address treasury = makeAddr("treasury");
    address owner = makeAddr("owner");
    address user = makeAddr("user");
    address receiver = makeAddr("receiver");

    function setUp() public {
        vm.startPrank(owner);
        claw = new NexusClaw(treasury);
        vm.stopPrank();
    }

    function testInitialSupply() public {
        assertEq(claw.totalSupply(), 50_000_000_000 * 10**18);
        assertEq(claw.balanceOf(treasury), 50_000_000_000 * 10**18);
    }

    function testTreasuryBurn() public {
        uint256 burnAmt = 1_000_000 * 10**18;
        vm.prank(treasury);
        claw.approve(owner, burnAmt);
        vm.prank(owner);
        claw.treasuryBurn(treasury, burnAmt);
        assertEq(claw.balanceOf(treasury), 50_000_000_000 * 10**18 - burnAmt);
    }

    function testTreasuryMint() public {
        vm.prank(owner);
        uint256 mintAmt = 100_000_000 * 10**18;
        claw.treasuryMint(user, mintAmt);
        assertEq(claw.balanceOf(user), mintAmt);
    }

    function testFailMintOverCap() public {
        vm.prank(owner);
        uint256 overCap = 2_000_000_000 * 10**18;
        vm.expectRevert("Exceeds batch cap");
        claw.treasuryMint(user, overCap);
    }

    function testFailMintOverMaxSupply() public {
        vm.prank(owner);
        uint256 overMax = 1 * 10**18; // Tiny, but after initial 50B
        vm.expectRevert("Exceeds max supply");
        claw.treasuryMint(user, overMax);
    }

    function testFeeOnTransferBurn() public {
        uint256 transferAmt = 1_000_000 * 10**18;
        vm.prank(treasury);
        claw.approve(user, transferAmt);
        vm.startPrank(user);
        uint256 preBurned = claw.totalSupply();
        claw.transfer(receiver, transferAmt);
        uint256 fee = (transferAmt * 100) / 10000; // 1%
        assertEq(claw.balanceOf(receiver), transferAmt - fee);
        assertEq(claw.totalSupply(), preBurned - fee);
        vm.stopPrank();
    }

    function testToggleBurnFee() public {
        vm.prank(owner);
        claw.toggleBurnFee(false);
        assertFalse(claw.burnFeeEnabled());

        uint256 transferAmt = 1_000_000 * 10**18;
        vm.prank(treasury);
        claw.approve(user, transferAmt);
        vm.startPrank(user);
        uint256 preSupply = claw.totalSupply();
        claw.transfer(receiver, transferAmt);
        assertEq(claw.totalSupply(), preSupply); // No burn
        assertEq(claw.balanceOf(receiver), transferAmt);
        vm.stopPrank();
    }

    function testTreasuryTransfer() public {
        uint256 transferAmt = 1_000_000 * 10**18;
        vm.prank(owner);
        claw.treasuryTransfer(user, transferAmt);
        assertEq(claw.balanceOf(user), transferAmt);
        assertEq(claw.balanceOf(treasury), 50_000_000_000 * 10**18 - transferAmt);
    }
}
