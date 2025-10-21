module pavilion::staking_pool {
    use std::type_name::{Self, TypeName};
    use sui::{
        coin::{Self, Coin},
        balance::{Self, Balance},
        event,
        clock::{Self, Clock},
    };
    use pavilion::platform::{AdminCap};
    use pavilion::constants;

    // == Structs ==

    /// Patronage certificate representing staked assets
    public struct Patronage<phantom T> has key, store {
        id: UID,
        pool_id: ID, 
        staked_amount: u64,
        stake_time: u64,
        unlock_time: u64,
        accumulated_rewards: u64,
        last_reward_time: u64,
    }

    /// Staking pool for a specific asset type
    public struct StakingPool<phantom T> has key {
        id: UID,
        balance: Balance<T>,
        total_staked: u64,
        total_withdrawn: u64,
        patronage_count: u64,
        lock_duration_ms: u64,
        withdrawal_fee_bps: u64,
        platform_reward_fee_bps: u64,
        annual_reward_rate_bps: u64,
        platform_fee_balance: Balance<T>,
    }

    /// Pool admin capability
    public struct PoolAdminCap has key, store {
        id: UID,
        pool_id: ID,
    }

    // == Events ==

    /// Emitted when a new pool is created
    public struct PoolCreated<phantom T> has copy, drop {
        pool_id: ID,
        creator: address,
    }

    /// Emitted when user stakes
    public struct Staked<phantom T> has copy, drop {
        pool_id: ID,
        patronage_id: ID,
        staker: address,
        amount: u64,
        unlock_time: u64,
        timestamp: u64,
    }

    /// Emitted when user unstakes
    public struct Unstaked<phantom T> has copy, drop {
        pool_id: ID,
        patronage_id: ID,
        unstaker: address,
        amount: u64,
        fee_amount: u64,
        timestamp: u64,
    }

    /// Emitted when rewards are claimed
    public struct RewardsClaimed<phantom T> has copy, drop {
        pool_id: ID,
        patronage_id: ID,
        claimer: address,
        reward_amount: u64,
        platform_fee: u64,
        timestamp: u64,
    }

    /// Emitted when platform collects fees
    public struct PlatformFeesCollected<phantom T> has copy, drop {
        pool_id: ID,
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    // == Constants ==

    // Default Pool Configuration
    const DEFAULT_LOCK_DURATION_MS: u64 = 604_800_000; // 7 days
    const DEFAULT_WITHDRAWAL_FEE_BPS: u64 = 5; // 0.05%
    const DEFAULT_PLATFORM_REWARD_FEE_BPS: u64 = 10; // 0.1%
    const DEFAULT_ANNUAL_REWARD_RATE_BPS: u64 = 500; // 5% APY
    const MIN_DEPOSIT_AMOUNT: u64 = 100_000_000; // 0.1 token

    // == Error Codes ==

    #[error] const E_INSUFFICIENT_AMOUNT: u8 = 0;
    #[error] const E_POOL_LOCKED: u8 = 1;
    #[error] const E_INVALID_POOL: u8 = 2;
    #[error] const E_INVALID_FEE: u8 = 3;
    #[error] const E_INVALID_REWARD_RATE: u8 = 4;
    #[error] const E_INSUFFICIENT_BALANCE: u8 = 5;
    #[error] const E_ADMIN_CAP_POOL_MISMATCH: u8 = 6;

    // Note: No init function for upgrades. Use create_pool to manually create pools.

    // == Public Functions ==

    /// Create a new staking pool for asset type T
    public fun create_pool<T>(
        _: &AdminCap,
        ctx: &mut TxContext
    ): PoolAdminCap {
        let pool_id = object::new(ctx);
        let id_copy = object::uid_to_inner(&pool_id);

        let pool = StakingPool<T> {
            id: pool_id,
            balance: balance::zero<T>(),
            total_staked: 0,
            total_withdrawn: 0,
            patronage_count: 0,
            lock_duration_ms: DEFAULT_LOCK_DURATION_MS,
            withdrawal_fee_bps: DEFAULT_WITHDRAWAL_FEE_BPS,
            platform_reward_fee_bps: DEFAULT_PLATFORM_REWARD_FEE_BPS,
            annual_reward_rate_bps: DEFAULT_ANNUAL_REWARD_RATE_BPS,
            platform_fee_balance: balance::zero<T>(),
        };

        event::emit(PoolCreated<T> {
            pool_id: id_copy,
            creator: ctx.sender(),
        });

        transfer::share_object(pool);

        PoolAdminCap {
            id: object::new(ctx),
            pool_id: id_copy,
        }
    }

    /// Stake assets and receive a Patronage certificate
    public fun stake<T>(
        pool: &mut StakingPool<T>,
        payment: Coin<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ): Patronage<T> {
        let amount = coin::value(&payment);
        assert!(amount >= MIN_DEPOSIT_AMOUNT, E_INSUFFICIENT_AMOUNT);
        assert!(amount > 0, E_INSUFFICIENT_AMOUNT);

        let stake_balance = coin::into_balance(payment);
        balance::join(&mut pool.balance, stake_balance);

        let current_time = clock::timestamp_ms(clock);
        let unlock_time = current_time + pool.lock_duration_ms;

        pool.total_staked = pool.total_staked + amount;
        pool.patronage_count = pool.patronage_count + 1;

        let patronage_id = object::new(ctx);
        let patronage_id_copy = object::uid_to_inner(&patronage_id);
        let pool_id = object::id(pool);

        event::emit(Staked<T> {
            pool_id,
            patronage_id: patronage_id_copy,
            staker: ctx.sender(),
            amount,
            unlock_time,
            timestamp: current_time,
        });

        Patronage<T> {
            id: patronage_id,
            pool_id,
            staked_amount: amount,
            stake_time: current_time,
            unlock_time,
            accumulated_rewards: 0,
            last_reward_time: current_time,
        }
    }

    /// Unstake and burn Patronage certificate
    public fun unstake<T>(
        pool: &mut StakingPool<T>,
        patronage: Patronage<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<T> {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time >= patronage.unlock_time, E_POOL_LOCKED);
        assert!(patronage.pool_id == object::id(pool), E_INVALID_POOL);

        let Patronage {
            id: patronage_id,
            pool_id: _,
            staked_amount,
            stake_time: _,
            unlock_time: _,
            accumulated_rewards: _,
            last_reward_time: _,
        } = patronage;

        let fee_amount = (staked_amount * pool.withdrawal_fee_bps) / constants::basis_points();
        let withdrawal_amount = staked_amount - fee_amount;

        assert!(balance::value(&pool.balance) >= staked_amount, E_INSUFFICIENT_BALANCE);

        let withdrawal_balance = balance::split(&mut pool.balance, withdrawal_amount);
        
        if (fee_amount > 0) {
            let fee_balance = balance::split(&mut pool.balance, fee_amount);
            balance::join(&mut pool.platform_fee_balance, fee_balance);
        };

        pool.total_withdrawn = pool.total_withdrawn + staked_amount;
        pool.patronage_count = pool.patronage_count - 1;

        event::emit(Unstaked<T> {
            pool_id: object::id(pool),
            patronage_id: object::uid_to_inner(&patronage_id),
            unstaker: ctx.sender(),
            amount: withdrawal_amount,
            fee_amount,
            timestamp: current_time,
        });

        object::delete(patronage_id);

        coin::from_balance(withdrawal_balance, ctx)
    }

    /// Calculate pending rewards
    public fun calculate_pending_rewards<T>(
        pool: &StakingPool<T>,
        patronage: &Patronage<T>,
        clock: &Clock,
    ): u64 {
        let current_time = clock::timestamp_ms(clock);
        let time_elapsed = current_time - patronage.last_reward_time;
        
        let rewards = (patronage.staked_amount * pool.annual_reward_rate_bps * time_elapsed) 
            / (constants::basis_points() * constants::ms_per_year());
        
        rewards + patronage.accumulated_rewards
    }

    /// Claim rewards without unstaking
    public fun claim_rewards<T>(
        pool: &mut StakingPool<T>,
        patronage: &mut Patronage<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<T> {
        assert!(patronage.pool_id == object::id(pool), E_INVALID_POOL);

        let current_time = clock::timestamp_ms(clock);
        let pending_rewards = calculate_pending_rewards(pool, patronage, clock);

        let platform_fee = (pending_rewards * pool.platform_reward_fee_bps) / constants::basis_points();
        let user_reward = pending_rewards - platform_fee;

        assert!(balance::value(&pool.balance) >= pending_rewards, E_INSUFFICIENT_BALANCE);

        let reward_balance = balance::split(&mut pool.balance, user_reward);
        
        if (platform_fee > 0) {
            let fee_balance = balance::split(&mut pool.balance, platform_fee);
            balance::join(&mut pool.platform_fee_balance, fee_balance);
        };

        patronage.accumulated_rewards = 0;
        patronage.last_reward_time = current_time;

        event::emit(RewardsClaimed<T> {
            pool_id: object::id(pool),
            patronage_id: object::id(patronage),
            claimer: ctx.sender(),
            reward_amount: user_reward,
            platform_fee,
            timestamp: current_time,
        });

        coin::from_balance(reward_balance, ctx)
    }

    /// Admin: Collect platform fees
    public fun collect_platform_fees<T>(
        pool: &mut StakingPool<T>,
        admin_cap: &PoolAdminCap,
        recipient: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(admin_cap.pool_id == object::id(pool), E_ADMIN_CAP_POOL_MISMATCH);
        
        let fee_amount = balance::value(&pool.platform_fee_balance);
        if (fee_amount > 0) {
            let fee_coin = coin::from_balance(
                balance::withdraw_all(&mut pool.platform_fee_balance),
                ctx
            );

            event::emit(PlatformFeesCollected<T> {
                pool_id: object::id(pool),
                recipient,
                amount: fee_amount,
                timestamp: clock::timestamp_ms(clock),
            });

            transfer::public_transfer(fee_coin, recipient);
        };
    }

    /// Admin: Update lock duration
    public fun update_lock_duration<T>(
        pool: &mut StakingPool<T>,
        admin_cap: &PoolAdminCap,
        new_duration_ms: u64,
    ) {
        assert!(admin_cap.pool_id == object::id(pool), E_ADMIN_CAP_POOL_MISMATCH);
        pool.lock_duration_ms = new_duration_ms;
    }

    /// Admin: Update withdrawal fee (max 10%)
    public fun update_withdrawal_fee<T>(
        pool: &mut StakingPool<T>,
        admin_cap: &PoolAdminCap,
        new_fee_bps: u64,
    ) {
        assert!(admin_cap.pool_id == object::id(pool), E_ADMIN_CAP_POOL_MISMATCH);
        assert!(new_fee_bps <= constants::max_fee_bps(), E_INVALID_FEE);
        pool.withdrawal_fee_bps = new_fee_bps;
    }

    /// Admin: Update platform reward fee (max 10%)
    public fun update_platform_reward_fee<T>(
        pool: &mut StakingPool<T>,
        admin_cap: &PoolAdminCap,
        new_fee_bps: u64,
    ) {
        assert!(admin_cap.pool_id == object::id(pool), E_ADMIN_CAP_POOL_MISMATCH);
        assert!(new_fee_bps <= constants::max_fee_bps(), E_INVALID_FEE);
        pool.platform_reward_fee_bps = new_fee_bps;
    }

    /// Admin: Update annual reward rate (max 100%)
    public fun update_reward_rate<T>(
        pool: &mut StakingPool<T>,
        admin_cap: &PoolAdminCap,
        new_rate_bps: u64,
    ) {
        assert!(admin_cap.pool_id == object::id(pool), E_ADMIN_CAP_POOL_MISMATCH);
        assert!(new_rate_bps <= constants::max_reward_rate_bps(), E_INVALID_REWARD_RATE);
        pool.annual_reward_rate_bps = new_rate_bps;
    }

    // == Query Functions ==

    /// Get pool statistics
    public fun get_pool_stats<T>(pool: &StakingPool<T>): (u64, u64, u64, u64) {
        (
            balance::value(&pool.balance),
            pool.total_staked,
            pool.total_withdrawn,
            pool.patronage_count
        )
    }

    /// Get pool configuration
    public fun get_pool_config<T>(pool: &StakingPool<T>): (u64, u64, u64, u64) {
        (
            pool.lock_duration_ms,
            pool.withdrawal_fee_bps,
            pool.platform_reward_fee_bps,
            pool.annual_reward_rate_bps
        )
    }

    /// Get platform fee balance
    public fun get_platform_fee_balance<T>(pool: &StakingPool<T>): u64 {
        balance::value(&pool.platform_fee_balance)
    }

    /// Get patronage details
    public fun get_patronage_info<T>(patronage: &Patronage<T>): (u64, u64, u64, u64) {
        (
            patronage.staked_amount,
            patronage.stake_time,
            patronage.unlock_time,
            patronage.accumulated_rewards
        )
    }

    /// Check if patronage is unlocked
    public fun is_unlocked<T>(patronage: &Patronage<T>, clock: &Clock): bool {
        clock::timestamp_ms(clock) >= patronage.unlock_time
    }

    /// Get patronage pool ID
    public fun get_patronage_pool_id<T>(patronage: &Patronage<T>): ID {
        patronage.pool_id
    }

    /// Verify patronage matches pool
    public fun verify_patronage_pool_match<T>(
        pool: &StakingPool<T>,
        patronage: &Patronage<T>
    ): bool {
        patronage.pool_id == object::id(pool)
    }

    /// Verify admin cap matches pool
    public fun verify_admin_cap_match<T>(
        pool: &StakingPool<T>,
        admin_cap: &PoolAdminCap
    ): bool {
        admin_cap.pool_id == object::id(pool)
    }

    /// Get pool asset type name for verification
    public fun get_pool_type<T>(): TypeName {
        type_name::with_original_ids<T>()
    }

    /// Get patronage asset type name for verification
    public fun get_patronage_type<T>(_patronage: &Patronage<T>): TypeName {
        type_name::with_original_ids<T>()
    }

    // == Test ==

    #[test_only]
    public fun create_test_pool<T>(ctx: &mut TxContext): (StakingPool<T>, PoolAdminCap) {
        let pool_id = object::new(ctx);
        let id_copy = object::uid_to_inner(&pool_id);

        let pool = StakingPool<T> {
            id: pool_id,
            balance: balance::zero<T>(),
            total_staked: 0,
            total_withdrawn: 0,
            patronage_count: 0,
            lock_duration_ms: DEFAULT_LOCK_DURATION_MS,
            withdrawal_fee_bps: DEFAULT_WITHDRAWAL_FEE_BPS,
            platform_reward_fee_bps: DEFAULT_PLATFORM_REWARD_FEE_BPS,
            annual_reward_rate_bps: DEFAULT_ANNUAL_REWARD_RATE_BPS,
            platform_fee_balance: balance::zero<T>(),
        };

        let admin_cap = PoolAdminCap {
            id: object::new(ctx),
            pool_id: id_copy,
        };

        (pool, admin_cap)
    }

    #[test_only]
    public fun destroy_test_pool<T>(pool: StakingPool<T>) {
        let StakingPool { 
            id, 
            balance, 
            total_staked: _,
            total_withdrawn: _,
            patronage_count: _,
            lock_duration_ms: _,
            withdrawal_fee_bps: _,
            platform_reward_fee_bps: _,
            annual_reward_rate_bps: _,
            platform_fee_balance,
        } = pool;
        balance::destroy_for_testing(balance);
        balance::destroy_for_testing(platform_fee_balance);
        object::delete(id);
    }

    #[test_only]
    public fun destroy_test_patronage<T>(patronage: Patronage<T>) {
        let Patronage { 
            id, 
            pool_id: _,
            staked_amount: _,
            stake_time: _,
            unlock_time: _,
            accumulated_rewards: _,
            last_reward_time: _,
        } = patronage;
        object::delete(id);
    }
}
