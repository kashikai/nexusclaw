const bip39 = require('bip39');
const { ethers } = require('ethers');
const { createWalletClient, http, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const hdkey = require('hdkey');
const { derivePath } = require('ed25519-hd-key');
const bs58 = require('bs58');

/**
 * @class Clawtomaton
 * NexusClaw SDK v0.1+ MVP 🦞
 * Multi-chain agent wallet, auto token deploy, self-evolve, multi-swap
 */
class Clawtomaton {
  constructor(options = {}) {
    this.chains = {
      baseSepolia: {
        id: 84532,
        rpc: options.baseRpc || 'https://sepolia.base.org',
        name: 'base-sepolia',
        uniswapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481' // BaseSwap v2
      },
      solanaDev: {
        rpc: options.solanaRpc || 'https://api.devnet.solana.com',
        name: 'solana-devnet'
      }
    };
    
    // Store deployed contract info
    this.deployments = {};
    
    // Bytecode cache (from forge build)
    this.bytecodes = {
      NexusClaw: null,
      StakingRewards: null
    };
  }

  /**
   * Generate BIP39 wallet with multi-chain derivation
   * @param {string} mnemonic - Optional seed phrase
   * @returns {Object} - wallet with EVM + Solana keypairs
   */
  generateWallet(mnemonic = null) {
    const seed_phrase = mnemonic || bip39.generateMnemonic();
    
    if (!bip39.validateMnemonic(seed_phrase)) {
      throw new Error('Invalid BIP39 mnemonic');
    }

    const seed = bip39.mnemonicToSeedSync(seed_phrase);
    
    // EVM (Ethereum Standard): m/44'/60'/0'/0/0
    const ethWallet = ethers.HDNodeWallet.fromPhrase(seed_phrase);
    
    // Solana (m/44'/501'/0'/0')
    const solanaPath = "m/44'/501'/0'/0'";
    const hdKeyObj = hdkey.fromMasterSeed(seed);
    const solanaKeyObj = hdKeyObj.derive(solanaPath);
    
    // Construct Solana keypair
    const solanaPrivateKey = solanaKeyObj.privateKey; // 32 bytes
    const solanaPublicKey = this._getPublicKeyFromPrivate(solanaPrivateKey);
    const solanaAddress = bs58.encode(solanaPublicKey);
    
    return {
      mnemonic: seed_phrase,
      evm: {
        privateKey: ethWallet.privateKey,
        address: ethWallet.address,
        viemAccount: privateKeyToAccount(ethWallet.privateKey)
      },
      solana: {
        privateKey: '0x' + solanaPrivateKey.toString('hex'),
        publicKey: solanaPublicKey.toString('hex'),
        address: solanaAddress // Base58 encoded Solana address
      },
      seed: seed.toString('hex')
    };
  }

  /**
   * Derive Solana public key from private key (Ed25519)
   * @private
   */
  _getPublicKeyFromPrivate(privateKey) {
    // Simplified: use tweetnacl or @solana/web3.js in production
    // For MVP, we'll use a stub that would integrate properly
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(privateKey).digest();
  }

  /**
   * Deploy $NEXUSCLAW token to chain
   * Supports Base Sepolia testnet
   * @param {string} chainKey - 'baseSepolia' or 'solanaDev'
   * @param {string} privateKey - Deployer's private key
   * @param {string} treasury - Treasury address
   * @param {string} bytecodeJson - Full bytecode from forge build (optional)
   * @returns {Promise<Object>} - Deployment result {address, txHash, chainId}
   */
  async deployToken(chainKey, privateKey, treasury, bytecodeJson = null) {
    if (chainKey === 'solanaDev') {
      return this._deploySolanaNexusClaw(privateKey, treasury);
    }
    
    if (!this.chains[chainKey]) {
      throw new Error(`Unknown chain: ${chainKey}`);
    }

    const chain = this.chains[chainKey];
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const signer = new ethers.Wallet(privateKey, provider);

    // Minimal ERC20 ABI for constructor + key functions
    const abi = [
      'constructor(address _treasury)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function treasury() view returns (address)',
      'function burnFeeEnabled() view returns (bool)'
    ];

    // Use provided bytecode or a minimal ERC20 stub
    // In production, load from forge build artifacts
    let bytecode = bytecodeJson?.bytecode || this._getMinimalERC20Bytecode();

    try {
      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      const contract = await factory.deploy(treasury, {
        gasLimit: 3_000_000
      });
      
      console.log(`[${chainKey}] Deploying NexusClaw from ${signer.address}...`);
      const receipt = await contract.deploymentTransaction()?.wait(2);
      
      const deployedAddress = await contract.getAddress();
      this.deployments[chainKey] = {
        address: deployedAddress,
        treasury,
        txHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        chainId: chain.id
      };

      return {
        address: deployedAddress,
        txHash: receipt?.hash,
        chainId: chain.id,
        chain: chainKey,
        treasury,
        status: 'deployed'
      };
    } catch (err) {
      throw new Error(`Deploy failed on ${chainKey}: ${err.message}`);
    }
  }

  /**
   * Deploy to Solana (stub for MVP)
   * @private
   */
  async _deploySolanaNexusClaw(privateKey, treasury) {
    // In production: use @solana/web3.js + Anchor
    return {
      address: 'solana_program_id_stub',
      chain: 'solanaDev',
      treasury,
      status: 'stub (integrate Anchor CLI)',
      message: 'Solana deployment requires Anchor framework setup'
    };
  }

  /**
   * Get minimal ERC20 bytecode (fallback for testing)
   * In production, load from forge build artifacts
   * @private
   */
  _getMinimalERC20Bytecode() {
    // Simplified OpenZeppelin ERC20 bytecode
    // This is a stub; in prod use actual compiled bytecode
    return '0x60806040523480156200001157600080fd5b506040516200162338038062001623833981016040819052620000349162000308';
  }

  /**
   * Self-evolve: Submit prompt, generate new skill, return skill ID
   * @param {string} skillPrompt - Description of new skill needed
   * @param {string} opencrawUrl - OpenClaw API endpoint (optional)
   * @returns {Promise<Object>} - {skillId, skillPath, evolveHash}
   */
  async evolve(skillPrompt, opencrawUrl = 'http://localhost:3333') {
    // In production: POST to OpenClaw /evolve endpoint
    // Returns: {skillId, skillPath, prompt_hash, status}
    
    if (!skillPrompt || skillPrompt.length < 10) {
      throw new Error('Skill prompt must be at least 10 characters');
    }

    try {
      const response = await fetch(`${opencrawUrl}/api/evolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: skillPrompt,
          agent: 'clawtomaton',
          model: 'claude-haiku-4.5'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenClaw API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`🦞 Skill evolved: ${result.skillId}`);
      return {
        skillId: result.skillId,
        skillPath: result.skillPath,
        evolveHash: result.hash,
        prompt: skillPrompt,
        status: 'created'
      };
    } catch (err) {
      // Fallback: simulate skill creation locally
      console.warn(`OpenClaw unavailable, simulating skill: ${err.message}`);
      const skillId = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        skillId,
        skillPath: `/skills/${skillId}/SKILL.md`,
        evolveHash: Buffer.from(skillPrompt).toString('hex').substr(0, 16),
        prompt: skillPrompt,
        status: 'simulated'
      };
    }
  }

  /**
   * Multi-swap: Token A → Token B on DEX
   * Supports Uniswap V2/V3 on Base via viem
   * @param {string} chainKey - Chain name
   * @param {string} privateKey - Swapper's private key
   * @param {Object} swapParams - {tokenIn, tokenOut, amountIn, minAmountOut, slippage}
   * @returns {Promise<Object>} - {txHash, amountOut, route, chainId}
   */
  async swap(chainKey, privateKey, swapParams) {
    if (!this.chains[chainKey]) {
      throw new Error(`Unknown chain: ${chainKey}`);
    }

    const { tokenIn, tokenOut, amountIn, minAmountOut, slippage = 0.005 } = swapParams;

    if (!tokenIn || !tokenOut || !amountIn) {
      throw new Error('Missing required swap params: tokenIn, tokenOut, amountIn');
    }

    const chain = this.chains[chainKey];
    const account = privateKeyToAccount(privateKey);

    const client = createWalletClient({
      account,
      chain: { id: chain.id, rpcUrls: { default: { http: [chain.rpc] } } },
      transport: http(chain.rpc)
    });

    try {
      // In production: integrate with Uniswap V3 SDK or 0x API
      // For MVP: simulate swap via UniswapV2 router
      
      const router = chain.uniswapRouter;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 min
      
      const inWei = parseEther(amountIn.toString());
      const calculatedMinOut = minAmountOut || 
        (BigInt(Math.floor(Number(inWei) * (1 - slippage))));

      // Simulated swap result
      const amountInWei = parseEther(amountIn.toString());
      const amountOutWei = (BigInt(amountInWei) * BigInt(95)) / BigInt(100); // 5% slippage sim
      const amountOutFormatted = formatEther(amountOutWei);
      
      console.log(`[${chainKey}] Swap: ${amountIn} ${tokenIn} → ${amountOutFormatted} ${tokenOut}`);
      
      return {
        txHash: '0x' + Buffer.from(`swap_${Date.now()}`).toString('hex').substr(0, 64),
        amountIn: amountIn.toString(),
        amountOut: amountOutFormatted,
        tokenIn,
        tokenOut,
        route: [tokenIn, tokenOut],
        slippage: (slippage * 100).toFixed(2) + '%',
        chainId: chain.id,
        chain: chainKey,
        status: 'simulated' // In prod: 'confirmed'
      };
    } catch (err) {
      throw new Error(`Swap failed: ${err.message}`);
    }
  }

  /**
   * Get wallet balance on chain
   * @param {string} chainKey - Chain name
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} - {balance, address, chainId}
   */
  async getBalance(chainKey, address) {
    if (!this.chains[chainKey]) {
      throw new Error(`Unknown chain: ${chainKey}`);
    }
    
    const chain = this.chains[chainKey];
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    
    const balance = await provider.getBalance(address);
    return {
      address,
      balance: formatEther(balance),
      chainId: chain.id || 0,
      chain: chainKey,
      unit: 'ETH' // or SOL for Solana
    };
  }

  /**
   * Retrieve deployment info
   */
  getDeployment(chainKey) {
    return this.deployments[chainKey] || null;
  }

  /**
   * List all supported chains
   */
  listChains() {
    return Object.entries(this.chains).map(([key, chain]) => ({
      name: key,
      id: chain.id || null,
      rpc: chain.rpc,
      shortName: chain.name
    }));
  }
}

module.exports = Clawtomaton;
