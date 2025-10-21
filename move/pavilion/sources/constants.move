module pavilion::constants {
    // Math Constants
    const BASIS_POINTS: u64 = 10000;
    const MS_PER_YEAR: u64 = 31_536_000_000;
    const MAX_FEE_BPS: u64 = 1000;
    const MAX_REWARD_RATE_BPS: u64 = 10000;

    // Public accessors
    public fun basis_points(): u64 { BASIS_POINTS }
    public fun ms_per_year(): u64 { MS_PER_YEAR }
    public fun max_fee_bps(): u64 { MAX_FEE_BPS }
    public fun max_reward_rate_bps(): u64 { MAX_REWARD_RATE_BPS }
}

