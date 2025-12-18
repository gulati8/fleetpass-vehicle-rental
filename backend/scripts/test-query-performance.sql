-- FleetPass Database Index Performance Tests
-- Run with: docker exec fleetpass-postgres psql -U fleetpass_user -d fleetpass -f /path/to/test-query-performance.sql

-- Test 1: Booking Availability Query (CRITICAL)
-- Should use: Booking_vehicleId_pickupDatetime_dropoffDatetime_idx
\echo ''
\echo '=== Test 1: Booking Availability Check (Most Frequent Query) ==='
EXPLAIN ANALYZE
SELECT * FROM "Booking"
WHERE "vehicleId" = (SELECT id FROM "Vehicle" LIMIT 1)
  AND "pickupDatetime" <= '2024-12-20T10:00:00Z'
  AND "dropoffDatetime" >= '2024-12-18T10:00:00Z'
  AND "status" IN ('confirmed', 'active');

-- Expected output:
--   -> Index Scan using Booking_vehicleId_pickupDatetime_dropoffDatetime_idx
--   -> Execution time: <10ms (with data)

-- Test 2: Customer Phone Lookup
-- Should use: Customer_phone_idx
\echo ''
\echo '=== Test 2: Customer Phone Lookup ==='
EXPLAIN ANALYZE
SELECT * FROM "Customer"
WHERE "phone" = '+12345678900';

-- Expected output:
--   -> Index Scan using Customer_phone_idx
--   -> Execution time: <5ms

-- Test 3: Lead Dashboard Query (Sales Agent View)
-- Should use: Lead_status_assignedToId_createdAt_idx
\echo ''
\echo '=== Test 3: Lead Dashboard Query ==='
EXPLAIN ANALYZE
SELECT * FROM "Lead"
WHERE "status" = 'new'
  AND "assignedToId" = (SELECT id FROM "User" LIMIT 1)
ORDER BY "createdAt" DESC
LIMIT 20;

-- Expected output:
--   -> Index Scan using Lead_status_assignedToId_createdAt_idx
--   -> Execution time: <20ms

-- Test 4: Vehicle Location + Availability Filter
-- Should use: Vehicle_locationId_isAvailableForRent_make_idx
\echo ''
\echo '=== Test 4: Vehicle Location + Availability Filtering ==='
EXPLAIN ANALYZE
SELECT * FROM "Vehicle"
WHERE "locationId" = (SELECT id FROM "Location" LIMIT 1)
  AND "isAvailableForRent" = true
  AND "make" = 'Toyota';

-- Expected output:
--   -> Index Scan using Vehicle_locationId_isAvailableForRent_make_idx
--   -> Execution time: <10ms

-- Test 5: Booking Status + Date Range
-- Should use: Booking_status_pickupDatetime_idx
\echo ''
\echo '=== Test 5: Booking Status + Date Range ==='
EXPLAIN ANALYZE
SELECT * FROM "Booking"
WHERE "status" = 'confirmed'
  AND "pickupDatetime" >= NOW()
ORDER BY "pickupDatetime" ASC
LIMIT 20;

-- Expected output:
--   -> Index Scan using Booking_status_pickupDatetime_idx
--   -> Execution time: <20ms

-- Test 6: Customer Booking History
-- Should use: Booking_customerId_status_createdAt_idx
\echo ''
\echo '=== Test 6: Customer Booking History ==='
EXPLAIN ANALYZE
SELECT * FROM "Booking"
WHERE "customerId" = (SELECT id FROM "Customer" LIMIT 1)
  AND "status" IN ('completed', 'cancelled')
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected output:
--   -> Index Scan using Booking_customerId_status_createdAt_idx
--   -> Execution time: <15ms

-- Test 7: Lead Source Analytics
-- Should use: Lead_source_status_idx
\echo ''
\echo '=== Test 7: Lead Source Analytics ==='
EXPLAIN ANALYZE
SELECT "source", "status", COUNT(*) as count
FROM "Lead"
WHERE "source" IS NOT NULL
GROUP BY "source", "status";

-- Expected output:
--   -> Index Scan or Index Only Scan using Lead_source_status_idx
--   -> Execution time: <30ms

-- Test 8: Deal Pipeline Report
-- Should use: Deal_status_closedAt_idx
\echo ''
\echo '=== Test 8: Deal Pipeline Report ==='
EXPLAIN ANALYZE
SELECT * FROM "Deal"
WHERE "status" = 'closed_won'
  AND "closedAt" >= NOW() - INTERVAL '30 days'
  AND "closedAt" <= NOW();

-- Expected output:
--   -> Index Scan using Deal_status_closedAt_idx
--   -> Execution time: <15ms

-- Summary: Show all index usage statistics
\echo ''
\echo '=== Index Usage Statistics ==='
SELECT
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_idx'
ORDER BY idx_scan DESC;

-- Index size report
\echo ''
\echo '=== Index Size Report ==='
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_idx'
ORDER BY pg_relation_size(indexrelid) DESC;
