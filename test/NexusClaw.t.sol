// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test, console} from "forge-std/Test.sol";
import {NexusClaw} from "../src/NexusClaw.sol";

contract NexusClawTest is Test {
    NexusClaw claw;
    address admin = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address agentPool = makeAddr("agentPool");
    address buybackPool = makeAddr("buybackPool");
    address user = makeAddr("user");

    uint256 constant TOTAL_SUPPLY = 100_000_000_000 * 10**18;
    uint256 constant TREASURY_AMOUNT = (TOTAL_SUPPLY * 10) / 100;

    function setUp() public {
        vm.startPrank(admin);
        claw = new NexusClaw(treasury, agentPool, buybackPool);
        claw.launch();
        vm.stopPrank();
    }

    function testInitialSupply() public view {
        assertEq(claw.totalSupply(), TOTAL_SUPPLY);
    }

    function testTreasuryBalance() public view {
        assertEq(claw.balanceOf(treasury), TREASURY_AMOUNT);
    }

    function testAdminRole() public view {
        assertTrue(claw.hasRole(claw.DEFAULT_ADMIN_ROLE(), admin));
    }

    function testTreasuryRole() public view {
        assertTrue(claw.hasRole(claw.TREASURY_ROLE(), treasury));
    }

    function testMinterRole() public view {
        assertTrue(claw.hasRole(claw.MINTER_ROLE(), admin));
    }

    function testTreasuryWithdraw() public {
        vm.prank(treasury);
        uint256 withdrawAmt = 1_000_000 * 10**18;
        claw.treasuryWithdraw(user, withdrawAmt);
        assertEq(claw.balanceOf(user), withdrawAmt);
    }

    function testMint() public {
        vm.prank(admin);
        uint256 mintAmt = 500_000_000 * 10**18;
        claw.mint(user, mintAmt);
        assertEq(claw.balanceOf(user), mintAmt);
    }

    function testTreasuryBurn() public {
        vm.prank(treasury);
        uint256 burnAmt = 5_000_000_000 * 10**18;
        uint256 preTotalSupply = claw.totalSupply();
        claw.treasuryBurn(burnAmt);
        assertEq(claw.totalSupply(), preTotalSupply - burnAmt);
    }

    function testTimelockToggleBurnFee() public {
        vm.startPrank(admin);
        
        // Queue toggle
        claw.queueToggleBurnFee(false);
        assertTrue(claw.burnFeeEnabled()); // Still enabled
        
        // Warp 24h + execute
        vm.warp(block.timestamp + 24 hours + 1 seconds);
        claw.executeToggleBurnFee(false);
        assertFalse(claw.burnFeeEnabled());
        
        vm.stopPrank();
    }

    function testBlacklistTimelock() public {
        vm.startPrank(admin);
        
        // Queue blacklist
        claw.queueSetBlacklist(user, true);
        
        // Warp 24h + execute
        vm.warp(block.timestamp + 24 hours + 1 seconds);
        claw.executeSetBlacklist(user, true);
        assertTrue(claw.blacklist(user));
        
        vm.stopPrank();
        
        // Try transfer (should fail)
        vm.prank(treasury);
        vm.expectRevert("Address blacklisted");
        claw.transfer(user, 1_000_000 * 10**18);
    }

    function testDexWhitelistTimelock() public {
        address uniswap = makeAddr("uniswap");
        
        vm.startPrank(admin);
        
        // Queue whitelist
        claw.queueSetDexWhitelist(uniswap, true);
        
        // Warp 24h + execute
        vm.warp(block.timestamp + 24 hours + 1 seconds);
        claw.executeSetDexWhitelist(uniswap, true);
        assertTrue(claw.dexWhitelist(uniswap));
        
        vm.stopPrank();
    }

    function testDisableMinting() public {
        vm.prank(admin);
        claw.disableMinting();
        assertTrue(claw.mintingDisabled());
        
        // Try to mint (should fail)
        vm.prank(admin);
        vm.expectRevert("Minting disabled");
        claw.mint(user, 1_000_000 * 10**18);
    }

    function test_RevertWhen_MintUnauthorized() public {
        vm.prank(user);
        vm.expectRevert();
        claw.mint(user, 1_000_000 * 10**18);
    }

    function test_RevertWhen_MintOverCap() public {
        vm.prank(admin);
        vm.expectRevert("Exceeds batch cap");
        claw.mint(user, 2_000_000_000 * 10**18);
    }

    function test_RevertWhen_BurnUnauthorized() public {
        vm.prank(user);
        vm.expectRevert();
        claw.treasuryBurn(1_000_000 * 10**18);
    }
}
