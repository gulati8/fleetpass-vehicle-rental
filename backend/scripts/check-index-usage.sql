-- FleetPass Index Usage Monitoring
-- Run monthly to verify indexes are being used effectively
-- Usage: docker exec fleetpass-postgres psql -U fleetpass_user -d fleetpass -f /path/to/check-index-usage.sql

-- Active Indexes (sorted by usage)
\echo '=== Active Indexes (Most Used First) ==='
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Unused Indexes (potential candidates for removal)
\echo ''
\echo '=== Unused Indexes (0 scans) ==='
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as wasted_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
  AND indexname NOT LIKE '%_key';

-- Index Hit Ratio (should be >99% for good performance)
\echo ''
\echo '=== Index Cache Hit Ratio (Target: >99%) ==='
SELECT
  'Index Hit Rate' AS metric,
  ROUND(
    (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100,
    2
  ) AS percentage
FROM pg_statio_user_indexes;

-- Table sizes vs Index sizes
\echo ''
\echo '=== Table vs Index Sizes ==='
SELECT
    t.tablename,
    pg_size_pretty(pg_total_relation_size('"' || t.tablename || '"')) as total_size,
    pg_size_pretty(pg_relation_size('"' || t.tablename || '"')) as table_size,
    pg_size_pretty(pg_total_relation_size('"' || t.tablename || '"') - pg_relation_size('"' || t.tablename || '"')) as indexes_size,
    ROUND(
        (pg_total_relation_size('"' || t.tablename || '"') - pg_relation_size('"' || t.tablename || '"'))::numeric /
        NULLIF(pg_relation_size('"' || t.tablename || '"'), 0) * 100,
        2
    ) as index_ratio
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('"' || t.tablename || '"') DESC;

-- Index bloat check (simplified)
\echo ''
\echo '=== Potential Index Bloat ==='
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND pg_relation_size(indexrelid) > 1024 * 1024  -- > 1MB
ORDER BY pg_relation_size(indexrelid) DESC;

-- Missing indexes warning (sequential scans on large tables)
\echo ''
\echo '=== Tables with High Sequential Scan Activity ==='
SELECT
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as rows_scanned,
    idx_scan as index_scans,
    CASE
        WHEN seq_scan > 0 THEN ROUND((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
        ELSE 100.0
    END as index_usage_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- Critical Performance Indexes Status
\echo ''
\echo '=== Critical Performance Indexes Status ==='
SELECT
    indexname,
    idx_scan as times_used,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED - INVESTIGATE'
        WHEN idx_scan < 10 THEN 'LOW USAGE - MONITOR'
        ELSE 'ACTIVE'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
      'Booking_vehicleId_pickupDatetime_dropoffDatetime_idx',
      'Booking_status_pickupDatetime_idx',
      'Booking_customerId_status_createdAt_idx',
      'Customer_phone_idx',
      'Lead_status_assignedToId_createdAt_idx',
      'Lead_source_status_idx',
      'Vehicle_locationId_isAvailableForRent_make_idx',
      'Deal_status_closedAt_idx'
  )
ORDER BY idx_scan DESC;
