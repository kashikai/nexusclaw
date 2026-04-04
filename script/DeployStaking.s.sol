// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {NexusClawStaking} from "../contracts/src/NexusClawStaking.sol";

contract DeployStaking is Script {
    function run() external returns (NexusClawStaking) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        NexusClawStaking staking = new NexusClawStaking(
            0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6,
            0x02320eCCB3B67e802C29f9e9F8703D5756535515
        );
        
        vm.stopBroadcast();
        return staking;
    }
}
