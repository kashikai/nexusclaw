// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {NexusClaw} from "../src/NexusClaw.sol";

contract DeployNexusClaw is Script {
    function run(address treasury) external returns (NexusClaw) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
 

       vm.startBroadcast(deployerPrivateKey);
        NexusClaw claw = new NexusClaw(treasury);
        console.log("NexusClaw deployed to:", address(claw));
        console.log("Treasury balance:", claw.balanceOf(treasury));
        console.log("Total supply:", claw.totalSupply());
        console.log("Contract balance:", claw.balanceOf(address(claw)));
        vm.stopBroadcast();
        return claw;
    }
}
