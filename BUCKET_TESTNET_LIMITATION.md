# Bucket Protocol Testnet Limitation

## Issue

Bucket Protocol SDK does not support testnet borrowing functionality. When attempting to use the "Borrow USDB with Profits" feature on testnet, you will encounter:

```
Error: Unsupported collateral type
```

## Root Cause

Checking the available collateral types on different networks:

**Testnet:**
```typescript
bucketClient.getAllCollateralTypes(); // Returns: []
```

**Mainnet:**
```typescript
bucketClient.getAllCollateralTypes(); 
// Returns: ['0x2::sui::SUI', 'SCALLOP_SUI', 'HASUI', ... and 15+ other tokens]
```

The Bucket Protocol team has not deployed lending vaults on testnet, making it impossible to:
- Deposit collateral
- Borrow USDB
- Manage lending positions

## Workarounds

### Option 1: Demo Mode (Recommended for Development)

Implement a mock/demo mode that simulates Bucket functionality without actual on-chain transactions:

1. Detect when `bucketClient.getAllCollateralTypes()` returns empty
2. Show a simulated transaction flow
3. Display mock USDB balance
4. Add a banner: "Demo Mode - Switch to Mainnet for real transactions"

### Option 2: Use Mainnet (Recommended for Production)

Switch to mainnet in `src/hooks/bucket/useBucketClient.ts`:

```typescript
const client = new BucketClient({
  suiClient,
  network: 'mainnet', // Full functionality available
});
```

**Pros:**
- ✅ Full Bucket Protocol functionality
- ✅ Real USDB borrowing
- ✅ Actual lending positions

**Cons:**
- ⚠️ Requires mainnet SUI for gas fees
- ⚠️ Real assets at risk

### Option 3: Custom Mock Implementation

Create a mock Bucket service that mimics the SDK interface:

```typescript
// src/lib/bucket/mockBucketClient.ts
export class MockBucketClient {
  async buildManagePositionTransaction(tx, params) {
    // Simulate transaction building
    console.log('Mock: Would deposit', params.depositCoinOrAmount, 'and borrow', params.borrowAmount);
    // Return mock transaction that does nothing
    return [];
  }
  
  async getUserPositions() {
    // Return mock positions
    return [{
      collateralType: '0x2::sui::SUI',
      collateralAmount: BigInt(0),
      debtAmount: BigInt(0),
      debtor: currentAddress,
    }];
  }
}
```

Then conditionally use the mock:

```typescript
const useBucketClient = () => {
  const [client, setClient] = useState(null);
  
  useEffect(() => {
    const bucketClient = new BucketClient({ network: 'testnet' });
    const collateralTypes = bucketClient.getAllCollateralTypes();
    
    if (collateralTypes.length === 0) {
      // Use mock client on testnet
      setClient(new MockBucketClient());
    } else {
      setClient(bucketClient);
    }
  }, []);
  
  return client;
};
```

## Current Implementation

The current code is configured for **testnet** with a clear warning:

```typescript
// Initialize Bucket Client
// Note: Bucket Protocol currently only supports mainnet with available collateral types
// Testnet has no configured collateral types, so borrowing won't work on testnet
const client = new BucketClient({
  suiClient,
  network: 'testnet', // Using testnet (note: may have limited functionality)
});
```

When the button is clicked and collateral types are unavailable, users will see:
- Button is disabled with tooltip: "Bucket Protocol client not initialized"
- Error message: "Unsupported collateral type"

## Recommendations

For hackathon/demo purposes:

1. **Development/Testing**: Use testnet for Pavilion features (NFT, Kiosk), document that Bucket integration requires mainnet
2. **Demo/Presentation**: Switch to mainnet temporarily or implement mock mode with clear UI indicators
3. **Production**: Deploy with mainnet support and proper error handling

## Alternative Protocols (Testnet Available)

If testnet support is critical, consider these alternatives:

- **Scallop Protocol**: Has testnet deployment
- **Navi Protocol**: Supports testnet lending
- **Cetus**: DEX with testnet liquidity

However, for meeting Bucket-specific hackathon requirements, you may need to use mainnet or request the Bucket team to deploy testnet infrastructure.

## Contact Bucket Team

If testnet support is essential for your use case, consider reaching out to:
- GitHub: https://github.com/Bucket-Protocol/bucket-protocol-sdk
- Email: info@bucketprotocol.io

Request testnet vault deployment or mock contract addresses for development purposes.

