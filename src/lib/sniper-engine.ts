import { createPublicClient, createWalletClient, custom, http, type Address, type PublicClient, type WalletClient, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import type { Token, FilterConfig, Transaction } from '@/store/sniper';
import { useSniperStore } from '@/store/sniper';

// DEX Router ABIs (simplified)
const UNISWAP_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const UNISWAP_V2_PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses (mainnet)
const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as Address;
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address;

// Known factory addresses for pair detection
const UNISWAP_V2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' as Address;

class SniperEngine {
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private isMonitoring = false;
  private lastBlock = 0;
  private pollingInterval: number | null = null;

  async initialize() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected');
    }

    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum),
    });

    // Get initial gas price
    const gasPrice = await this.publicClient.getGasPrice();
    useSniperStore.getState().setGasPrice(gasPrice);
  }

  async connect() {
    if (!this.walletClient) {
      await this.initialize();
    }

    const [address] = await this.walletClient!.requestAddresses();
    const balance = await this.publicClient!.getBalance({ address });

    useSniperStore.getState().setAddress(address);
    useSniperStore.getState().setBalance(balance);

    return address;
  }

  async disconnect() {
    this.stopMonitoring();
    useSniperStore.getState().setAddress(null);
    useSniperStore.getState().setBalance(0n);
  }

  async analyzeToken(tokenAddress: Address): Promise<Token | null> {
    if (!this.publicClient) return null;

    try {
      // Get basic token info
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'name',
        }).catch(() => 'Unknown'),
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }).catch(() => '???'),
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }).catch(() => 18),
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'totalSupply',
        }).catch(() => 0n),
      ]);

      // Check for TG bot - analyze contract code for common patterns
      const hasTG = await this.checkForTG(tokenAddress);

      // Estimate taxes (simplified - real implementation would use more sophisticated analysis)
      const { buyTax, sellTax } = await this.estimateTaxes(tokenAddress);

      // Check liquidity
      const liquidity = await this.checkLiquidity(tokenAddress);

      // Basic honeypot check
      const isHoneypot = await this.basicHoneypotCheck(tokenAddress);

      const token: Token = {
        address: tokenAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: totalSupply as bigint,
        detectedAt: Date.now(),
        hasTG,
        buyTax,
        sellTax,
        liquidity: liquidity as bigint,
        isHoneypot: isHoneypot as boolean,
        honeypotResult: isHoneypot ? 'failed' : 'passed',
      };

      return token;
    } catch (error) {
      console.error('Error analyzing token:', error);
      return null;
    }
  }

  private async checkForTG(tokenAddress: Address): Promise<boolean> {
    if (!this.publicClient) return false;

    try {
      // Get contract bytecode size
      const code = await this.publicClient.getCode({ address: tokenAddress });
      if (!code || code === '0x') return false;

      // Convert bytecode to string for pattern matching
      const codeStr = code.toLowerCase();

      // Common TG-related patterns in contract code
      const tgPatterns = [
        'telegram',
        't.me',
        'telegram.org',
        '@',
      ];

      // Check if any TG patterns exist in the code
      for (const pattern of tgPatterns) {
        if (codeStr.includes(pattern)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private async estimateTaxes(tokenAddress: Address): Promise<{ buyTax: number; sellTax: number }> {
    // This is a simplified estimation
    // Real implementation would involve more sophisticated contract analysis
    // or use external APIs for tax information
    
    try {
      // Try to read tax-related functions (common in many tokens)
      if (!this.publicClient) return { buyTax: 0, sellTax: 0 };

      // These are common function names, may not exist in all contracts
      const buyTax = await this.publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: 'buyTax',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'buyTax',
      }).catch(() => null);

      const sellTax = await this.publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: 'sellTax',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'sellTax',
      }).catch(() => null);

      return {
        buyTax: buyTax ? Number(buyTax) / 100 : 0,
        sellTax: sellTax ? Number(sellTax) / 100 : 0,
      };
    } catch {
      return { buyTax: 0, sellTax: 0 };
    }
  }

  private async checkLiquidity(tokenAddress: Address): Promise<bigint> {
    // Simplified liquidity check
    // Would need to find the pair contract first
    try {
      if (!this.publicClient) return 0n;

      // This is a placeholder - real implementation would query Uniswap pairs
      // or use The Graph for liquidity data
      return 0n;
    } catch {
      return 0n;
    }
  }

  private async basicHoneypotCheck(tokenAddress: Address): Promise<boolean> {
    // Simplified honeypot check
    // Real implementation would:
    // 1. Simulate a swap on a test fork
    // 2. Check if sell is possible
    // 3. Analyze transfer logic
    
    try {
      if (!this.publicClient) return false;

      // Basic check: see if contract has common honeypot patterns
      const code = await this.publicClient.getCode({ address: tokenAddress });
      if (!code) return false;

      // These are very simplified checks
      // A real honeypot detector is much more sophisticated
      const codeStr = code.toLowerCase();
      
      // Check for common honeypot indicators
      const suspiciousPatterns = ['transferfrom', 'transfer to'];
      
      for (const pattern of suspiciousPatterns) {
        if (codeStr.includes(pattern)) {
          // More sophisticated analysis needed here
          return false; // Not definitive
        }
      }

      return false; // Pass for now, needs real implementation
    } catch {
      return false;
    }
  }

  shouldSnipe(token: Token): boolean {
    const { filters } = useSniperStore.getState();

    if (!filters.enabled) return false;

    // Check TG requirement
    if (filters.requireTG && !token.hasTG) {
      console.log('Skipping: No TG bot found');
      return false;
    }

    // Check buy tax
    if (token.buyTax > filters.maxBuyTax) {
      console.log(`Skipping: Buy tax ${token.buyTax}% > ${filters.maxBuyTax}%`);
      return false;
    }

    // Check sell tax
    if (token.sellTax > filters.maxSellTax) {
      console.log(`Skipping: Sell tax ${token.sellTax}% > ${filters.maxSellTax}%`);
      return false;
    }

    // Check honeypot
    if (filters.checkHoneypot && token.isHoneypot) {
      console.log('Skipping: Honeypot detected');
      return false;
    }

    return true;
  }

  async snipe(token: Token): Promise<Transaction | null> {
    if (!this.publicClient || !this.walletClient) {
      throw new Error('Wallet not connected');
    }

    const { address } = useSniperStore.getState();
    const { config } = useSniperStore.getState();

    if (!address) {
      throw new Error('No wallet connected');
    }

    try {
      // Prepare swap parameters
      const amountIn = BigInt(Math.floor(config.buyAmount * 1e18));
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min deadline
      const path = [WETH, token.address];
      const amountOutMin = 0n; // Slippage handled at execution level

      // Create transaction
      const hash = await this.walletClient.writeContract({
        account: address,
        address: UNISWAP_V2_ROUTER,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [amountOutMin, path, address, deadline],
        value: amountIn,
        gasPrice: config.gasPrice || undefined,
      });

      const tx: Transaction = {
        hash,
        token,
        amountIn,
        amountOut: 0n,
        timestamp: Date.now(),
        status: 'pending',
      };

      useSniperStore.getState().addTransaction(tx);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      const success = receipt.status === 'success';
      
      useSniperStore.getState().updateTransaction(hash, {
        status: success ? 'success' : 'failed',
        gasUsed: receipt.gasUsed,
        error: success ? undefined : 'Transaction reverted',
      });

      return success ? { ...tx, status: 'success' } : null;
    } catch (error) {
      console.error('Sniper error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        hash: '',
        token,
        amountIn: 0n,
        amountOut: 0n,
        timestamp: Date.now(),
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    useSniperStore.getState().setStatus('monitoring');

    // Simulate token detection for demo
    // Real implementation would use WebSocket/Mempool monitoring
    this.pollingInterval = window.setInterval(async () => {
      // This is where you would:
      // 1. Monitor mempool for new token creations
      // 2. Listen to DEX factory events
      // 3. Use The Graph subscriptions
      
      // For demo, we'll simulate random detections
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        await this.simulateTokenDetection();
      }
    }, 5000);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    useSniperStore.getState().setStatus('idle');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async simulateTokenDetection() {
    // Demo function - generates random tokens for testing
    const symbols = ['PEPE', 'WOJAK', 'CHAD', 'SHIBA', 'DOGE', 'FLOKI', 'ELON', 'BABYDOGE'];
    const names = ['Pepe', 'Wojak', 'Chad', 'Shiba Inu', 'Dogecoin', 'FLOKI', 'Elon', 'BabyDoge'];
    
    const index = Math.floor(Math.random() * symbols.length);
    const randomAddress = `0x${Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}` as Address;

    const token: Token = {
      address: randomAddress,
      name: names[index],
      symbol: symbols[index],
      decimals: 18,
      totalSupply: BigInt(Math.floor(Math.random() * 1e27)),
      detectedAt: Date.now(),
      hasTG: Math.random() > 0.5,
      buyTax: Math.random() * 15,
      sellTax: Math.random() * 15,
      liquidity: BigInt(Math.floor(Math.random() * 100e18)),
      isHoneypot: Math.random() > 0.9,
      honeypotResult: Math.random() > 0.9 ? 'failed' : 'passed',
    };

    useSniperStore.getState().addToken(token);

    // Auto snipe if enabled and token passes filters
    if (this.shouldSnipe(token) && useSniperStore.getState().config.autoSnipe) {
      console.log(`Auto-sniping ${token.symbol}...`);
      await this.snipe(token);
    }
  }
}

// Singleton instance
export const sniperEngine = new SniperEngine();
