// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from \"forge-std/Test.sol\";
import {NexusClaw} from \"../contracts/NexusClaw.sol\";

contract NexusClawTest is Test {
    NexusClaw claw;
    address treasury = makeAddr(\"treasury\");
    address owner = makeAddr(\"owner\");
    address user = makeAddr(\"user\");

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
        vm.startPrank(owner);
        uint256 burnAmt = 1_000_000 * 10**18;
        claw.approve(owner, burnAmt);  // Simulate allowance
        claw.treasuryBurn(treasury, burnAmt);
        assertEq(claw.balanceOf(treasury), 50_000_000_000 * 10**18 - burnAmt);
        vm.stopPrank();
    }

    function testTreasuryMint() public {
        vm.startPrank(owner);
        uint256 mintAmt = 100_000_000 * 10**18;
        claw.treasuryMint(user, mintAmt);
        assertEq(claw.balanceOf(user), mintAmt);
        vm.stopPrank();
    }
}
