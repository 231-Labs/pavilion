/// Module: pavilion_pool - Platform fee pool management
/// This module manages a shared pool for collecting platform fees from pavilion operations
module pavilion::pavilion_pool {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        balance::{Self, Balance},
        event,
    };
    use pavilion::platform::{AdminCap};

    // == Structs ==

    /// Shared pool for collecting platform fees
    public struct PavilionPool has key {
        id: UID,
        /// Pool balance in SUI
        balance: Balance<SUI>,
        /// Total amount collected since creation
        total_collected: u64,
        /// Total amount withdrawn since creation
        total_withdrawn: u64,
    }

    /// Dynamic field key for pool statistics
    public struct PoolStats has copy, store, drop {}

    // == Events ==

    /// Emitted when fees are deposited into the pool
    public struct FeeDeposited has copy, drop {
        amount: u64,
        depositor: address,
        timestamp: u64,
    }

    /// Emitted when funds are withdrawn from the pool
    public struct FundsWithdrawn has copy, drop {
        amount: u64,
        recipient: address,
        timestamp: u64,
    }

    /// Emitted when pool is created
    public struct PoolCreated has copy, drop {
        pool_id: ID,
        creator: address,
    }

    // == Constants ==

    /// Minimum withdrawal amount (0.1 SUI = 100_000_000 MIST)
    const MIN_WITHDRAWAL_AMOUNT: u64 = 100_000_000;

    // Error codes
    #[error] const E_INSUFFICIENT_BALANCE: u8 = 0;
    #[error] const E_INVALID_AMOUNT: u8 = 1;
    #[error] const E_WITHDRAWAL_TOO_SMALL: u8 = 2;

    // == Public Functions ==

    /// Create a new shared pavilion pool (admin only)
    public fun create_pool(
        _: &AdminCap,
        ctx: &mut TxContext
    ) {
        let pool = PavilionPool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_collected: 0,
            total_withdrawn: 0,
        };

        let pool_id = object::id(&pool);
        
        event::emit(PoolCreated {
            pool_id,
            creator: ctx.sender(),
        });

        transfer::share_object(pool);
    }

    /// Deposit fees into the pool
    /// This can be called by anyone (typically from platform operations)
    public fun deposit_fee(
        pool: &mut PavilionPool,
        payment: Coin<SUI>,
        ctx: &TxContext
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let balance = coin::into_balance(payment);
        balance::join(&mut pool.balance, balance);
        
        pool.total_collected = pool.total_collected + amount;

        event::emit(FeeDeposited {
            amount,
            depositor: ctx.sender(),
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    /// Withdraw funds from the pool (admin only)
    /// Returns a Coin that can be transferred to any address
    public fun withdraw(
        _: &AdminCap,
        pool: &mut PavilionPool,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(amount >= MIN_WITHDRAWAL_AMOUNT, E_WITHDRAWAL_TOO_SMALL);
        assert!(balance::value(&pool.balance) >= amount, E_INSUFFICIENT_BALANCE);

        let withdrawn_balance = balance::split(&mut pool.balance, amount);
        pool.total_withdrawn = pool.total_withdrawn + amount;

        event::emit(FundsWithdrawn {
            amount,
            recipient: ctx.sender(),
            timestamp: ctx.epoch_timestamp_ms(),
        });

        coin::from_balance(withdrawn_balance, ctx)
    }

    /// Withdraw all funds from the pool (admin only)
    public fun withdraw_all(
        admin: &AdminCap,
        pool: &mut PavilionPool,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let amount = balance::value(&pool.balance);
        withdraw(admin, pool, amount, ctx)
    }

    /// Transfer withdrawn funds to a recipient
    /// Convenience function to withdraw and transfer in one call
    public fun withdraw_to(
        admin: &AdminCap,
        pool: &mut PavilionPool,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = withdraw(admin, pool, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    // == Query Functions ==

    /// Get current pool balance
    public fun get_balance(pool: &PavilionPool): u64 {
        balance::value(&pool.balance)
    }

    /// Get total amount collected
    public fun get_total_collected(pool: &PavilionPool): u64 {
        pool.total_collected
    }

    /// Get total amount withdrawn
    public fun get_total_withdrawn(pool: &PavilionPool): u64 {
        pool.total_withdrawn
    }

    /// Get pool statistics as tuple (balance, total_collected, total_withdrawn)
    public fun get_pool_stats(pool: &PavilionPool): (u64, u64, u64) {
        (
            balance::value(&pool.balance),
            pool.total_collected,
            pool.total_withdrawn
        )
    }

    /// Check if withdrawal amount is valid
    public fun is_valid_withdrawal(pool: &PavilionPool, amount: u64): bool {
        amount >= MIN_WITHDRAWAL_AMOUNT && 
        balance::value(&pool.balance) >= amount
    }

    // == Integration Functions ==

    /// Deposit creation fee directly to pool
    /// This is meant to be called from pavilion module during initialization
    public fun deposit_creation_fee(
        pool: &mut PavilionPool,
        payment: Coin<SUI>,
        ctx: &TxContext
    ) {
        deposit_fee(pool, payment, ctx)
    }

    /// Deposit commission to pool
    /// This is meant to be called from platform module during purchase
    public fun deposit_commission(
        pool: &mut PavilionPool,
        payment: Coin<SUI>,
        ctx: &TxContext
    ) {
        deposit_fee(pool, payment, ctx)
    }

    // == Test-Only Functions ==

    #[test_only]
    public fun create_test_pool(ctx: &mut TxContext): PavilionPool {
        PavilionPool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_collected: 0,
            total_withdrawn: 0,
        }
    }

    #[test_only]
    public fun destroy_test_pool(pool: PavilionPool) {
        let PavilionPool { id, balance, total_collected: _, total_withdrawn: _ } = pool;
        balance::destroy_for_testing(balance);
        object::delete(id);
    }
}

