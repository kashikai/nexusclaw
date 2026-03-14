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
        assertEq(claw.totalSupply(), 100_000_000_000 * 10**18);
        assertEq(claw.balanceOf(treasury), 100_000_000_000 * 10**18);
    }

    function testTreasuryBurn() public {
        uint256 burnAmt = 1_000_000 * 10**18;
        vm.prank(treasury);
        claw.approve(owner, burnAmt);
        vm.prank(owner);
        claw.treasuryBurn(treasury, burnAmt);
        assertEq(claw.balanceOf(treasury), 100_000_000_000 * 10**18 - burnAmt);
    }

    function testTreasuryMint() public {
        vm.prank(owner);
        uint256 mintAmt = 100_000_000 * 10**18;
        claw.treasuryMint(user, mintAmt);
        assertEq(claw.balanceOf(user), mintAmt);
    }

    function test_RevertWhen_MintOverCap() public {
        vm.prank(owner);
        uint256 overCap = 2_000_000_000 * 10**18;
        vm.expectRevert("Exceeds batch cap");
        claw.treasuryMint(user, overCap);
    }

    function test_RevertWhen_MintOverMaxSupply() public {
        // Mint up to the cap first (10 x 1B = 10B)
        vm.startPrank(owner);
        for (uint i = 0; i < 10; i++) {
            claw.treasuryMint(user, 1_000_000_000 * 10**18);
        }
        vm.expectRevert("Exceeds max supply");
        claw.treasuryMint(user, 1 * 10**18);
        vm.stopPrank();
    }

    function testFeeOnTransferBurn() public {
        uint256 transferAmt = 1_000_000 * 10**18;
        vm.prank(treasury);
        claw.transfer(user, transferAmt);
        vm.startPrank(user);
        uint256 preBurned = claw.totalSupply();
        // Fee was already taken on treasury->user transfer, give user exact amount
        uint256 userBal = claw.balanceOf(user);
        claw.transfer(receiver, userBal);
        uint256 fee = (userBal * 100) / 10000;
        assertEq(claw.balanceOf(receiver), userBal - fee);
        assertLt(claw.totalSupply(), preBurned);
        vm.stopPrank();
    }

    function testToggleBurnFee() public {
        vm.prank(owner);
        claw.toggleBurnFee(false);
        assertFalse(claw.burnFeeEnabled());
        uint256 transferAmt = 1_000_000 * 10**18;
        vm.prank(treasury);
        claw.transfer(user, transferAmt);
        uint256 preSupply = claw.totalSupply();
        vm.prank(user);
        claw.transfer(receiver, transferAmt);
        assertEq(claw.totalSupply(), preSupply);
        assertEq(claw.balanceOf(receiver), transferAmt);
    }

    function testTreasuryTransfer() public {
        uint256 transferAmt = 1_000_000 * 10**18;
        // Disable fee so math is clean
        vm.startPrank(owner);
        claw.toggleBurnFee(false);
        claw.treasuryTransfer(user, transferAmt);
        vm.stopPrank();
        assertEq(claw.balanceOf(user), transferAmt);
        assertEq(claw.balanceOf(treasury), 100_000_000_000 * 10**18 - transferAmt);
    }
}
