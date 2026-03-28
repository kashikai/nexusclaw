#!/bin/bash
# NexusClaw Mainnet Role Transfer — CRITICAL
# Contract: 0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6 (Base Mainnet)
# Multisig: 0x02320eCCB3B67e802C29f9e9F8703D5756535515

export PATH="$HOME/.foundry/bin:$PATH"
RPC="https://mainnet.base.org"
CONTRACT="0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6"
MULTISIG="0x02320eCCB3B67e802C29f9e9F8703D5756535515"
DEPLOYER="0x4cE56CAC22F3b4A5734074ccCa0A8De4CBfc8FEa"
ADMIN_ROLE="0x0000000000000000000000000000000000000000000000000000000000000000"
TREASURY_ROLE="0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9"

# Load key from .env
source ~/.openclaw/workspace/nexusclaw/.env

echo "=== NexusClaw Mainnet Role Transfer ==="
echo "Contract: $CONTRACT"
echo "Multisig: $MULTISIG"
echo "Deployer: $DEPLOYER"
echo ""

# Step 1: Grant DEFAULT_ADMIN_ROLE to multisig
echo "Step 1: Grant DEFAULT_ADMIN_ROLE to multisig..."
cast send $CONTRACT "grantRole(bytes32,address)" $ADMIN_ROLE $MULTISIG \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

# Step 2: Grant TREASURY_ROLE to multisig
echo "Step 2: Grant TREASURY_ROLE to multisig..."
cast send $CONTRACT "grantRole(bytes32,address)" $TREASURY_ROLE $MULTISIG \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

# Step 3: Revoke DEFAULT_ADMIN_ROLE from deployer
echo "Step 3: Revoke DEFAULT_ADMIN_ROLE from deployer..."
cast send $CONTRACT "revokeRole(bytes32,address)" $ADMIN_ROLE $DEPLOYER \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY

# Step 4: Verify deployer has no admin role
echo "Step 4: Verify deployer has no admin role..."
DEPLOYER_HAS_ROLE=$(cast call $CONTRACT "hasRole(bytes32,address)(bool)" $ADMIN_ROLE $DEPLOYER --rpc-url $RPC)
echo "Deployer has DEFAULT_ADMIN_ROLE: $DEPLOYER_HAS_ROLE (expected: false)"

# Step 5: Verify multisig has admin role
echo "Step 5: Verify multisig has admin role..."
MULTISIG_HAS_ROLE=$(cast call $CONTRACT "hasRole(bytes32,address)(bool)" $ADMIN_ROLE $MULTISIG --rpc-url $RPC)
echo "Multisig has DEFAULT_ADMIN_ROLE: $MULTISIG_HAS_ROLE (expected: true)"

echo ""
echo "=== Verification ==="
if [ "$DEPLOYER_HAS_ROLE" = "false" ] && [ "$MULTISIG_HAS_ROLE" = "true" ]; then
  echo "✅ Role transfer SUCCESSFUL"
else
  echo "❌ Role transfer FAILED — check manually"
fi
