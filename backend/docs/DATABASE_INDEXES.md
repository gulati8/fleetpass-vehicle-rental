# Database Index Strategy

## Overview

FleetPass uses strategic database indexing to ensure queries remain fast as data grows. This document outlines the indexing strategy, explains each critical index, and provides monitoring guidance.

## Indexing Principles

1. **Composite Indexes**: Leftmost column must be in WHERE clause for index to be used
2. **Index Order**: Most selective column first (except for equality + range queries)
3. **Query Patterns**: Indexes match actual query patterns in the application
4. **Covering Indexes**: Where possible, indexes include all columns needed by the query

## Critical Indexes

### 1. Booking Availability Queries

**Index**: `Booking_vehicleId_pickupDatetime_dropoffDatetime_idx`
```sql
CREATE INDEX ON "Booking" (vehicleId, pickupDatetime, dropoffDatetime);
```

**Purpose**: Check if a specific vehicle is available for a date range (most frequent query)

**Usage Example**:
```typescript
// Find overlapping bookings to determine availability
const overlappingBookings = await prisma.booking.findMany({
  where: {
    vehicleId: vehicleId,
    status: { in: ['confirmed', 'active'] },
    OR: [
      {
        AND: [
          { pickupDatetime: { lte: requestedPickup } },
          { dropoffDatetime: { gte: requestedPickup } },
        ],
      },
      {
        AND: [
          { pickupDatetime: { lte: requestedDropoff } },
          { dropoffDatetime: { gte: requestedDropoff } },
        ],
      },
    ],
  },
});
```

**Performance Impact**:
- Without index: 500-5000ms (full table scan on 10,000+ bookings)
- With index: <10ms (index scan + small result set)

---

### 2. Booking Status + Date Filtering

**Index**: `Booking_status_pickupDatetime_idx`
```sql
CREATE INDEX ON "Booking" (status, pickupDatetime);
```

**Purpose**: Filter bookings by status and sort/filter by pickup date

**Usage Example**:
```typescript
// Get upcoming confirmed bookings
const upcomingBookings = await prisma.booking.findMany({
  where: {
    status: 'confirmed',
    pickupDatetime: { gte: new Date() },
  },
  orderBy: { pickupDatetime: 'asc' },
  take: 20,
});
```

**Performance Impact**:
- Without index: 200-2000ms (sequential scan)
- With index: <20ms (index scan with range)

---

### 3. Customer Booking History

**Index**: `Booking_customerId_status_createdAt_idx`
```sql
CREATE INDEX ON "Booking" (customerId, status, createdAt);
```

**Purpose**: Show customer's booking history filtered by status and sorted by date

**Usage Example**:
```typescript
// Get customer's past bookings
const customerBookings = await prisma.booking.findMany({
  where: {
    customerId: customerId,
    status: { in: ['completed', 'cancelled'] },
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
```

**Performance Impact**:
- Without index: 100-1000ms (scan all bookings for customer)
- With index: <15ms (direct index lookup)

---

### 4. Customer Phone Lookup

**Index**: `Customer_phone_idx`
```sql
CREATE INDEX ON "Customer" (phone);
```

**Purpose**: Find customer by phone during support calls or walk-ins

**Usage Example**:
```typescript
// Support agent searching by phone
const customer = await prisma.customer.findFirst({
  where: { phone: phoneNumber },
});
```

**Performance Impact**:
- Without index: 200-2000ms (scan all customers)
- With index: <5ms (direct index lookup)

---

### 5. Lead Dashboard Queries

**Index**: `Lead_status_assignedToId_createdAt_idx`
```sql
CREATE INDEX ON "Lead" (status, assignedToId, createdAt);
```

**Purpose**: Sales agent dashboard showing assigned leads by status

**Usage Example**:
```typescript
// Sales agent viewing their new leads
const myLeads = await prisma.lead.findMany({
  where: {
    status: 'new',
    assignedToId: userId,
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

**Performance Impact**:
- Without index: 300-3000ms (scan all leads)
- With index: <20ms (index scan with limit)

---

### 6. Lead Source Analytics

**Index**: `Lead_source_status_idx`
```sql
CREATE INDEX ON "Lead" (source, status);
```

**Purpose**: Analyze lead conversion rates by source

**Usage Example**:
```typescript
// Marketing analytics: which sources convert best?
const leadsBySource = await prisma.lead.groupBy({
  by: ['source', 'status'],
  _count: true,
});
```

**Performance Impact**:
- Without index: 150-1500ms (full table scan)
- With index: <30ms (index-only scan)

---

### 7. Vehicle Location + Availability Filtering

**Index**: `Vehicle_locationId_isAvailableForRent_make_idx`
```sql
CREATE INDEX ON "Vehicle" (locationId, isAvailableForRent, make);
```

**Purpose**: Browse available vehicles at a specific location, optionally filtered by make

**Usage Example**:
```typescript
// Customer browsing Toyota vehicles at a location
const availableVehicles = await prisma.vehicle.findMany({
  where: {
    locationId: locationId,
    isAvailableForRent: true,
    make: 'Toyota',
  },
});
```

**Performance Impact**:
- Without index: 50-500ms (scan all vehicles)
- With index: <10ms (index scan)

---

### 8. Deal Pipeline Queries

**Index**: `Deal_status_closedAt_idx`
```sql
CREATE INDEX ON "Deal" (status, closedAt);
```

**Purpose**: Sales pipeline reports and closed deal analysis

**Usage Example**:
```typescript
// Monthly closed deals report
const closedDeals = await prisma.deal.findMany({
  where: {
    status: 'closed_won',
    closedAt: {
      gte: startOfMonth,
      lte: endOfMonth,
    },
  },
});
```

**Performance Impact**:
- Without index: 100-1000ms (scan all deals)
- With index: <15ms (index range scan)

---

## Performance Expectations

With these indexes in production:
- **Booking availability check**: <10ms for 10,000+ bookings
- **Customer phone lookup**: <5ms for 100,000+ customers
- **Lead dashboard**: <20ms for 50,000+ leads
- **Vehicle browsing**: <10ms for 1,000+ vehicles
- **Deal reports**: <15ms for 10,000+ deals

Without indexes (sequential scans):
- **Booking availability**: 500-5000ms (100-500x slower)
- **Customer phone**: 200-2000ms (40-400x slower)
- **Lead dashboard**: 300-3000ms (15-150x slower)

## Index Maintenance

### Monitoring Index Usage

Run this query monthly to check index effectiveness:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Interpretation**:
- `idx_scan`: How many times the index was used
- `idx_tup_read`: How many index entries were read
- `idx_tup_fetch`: How many table rows were fetched via index

### Identifying Unused Indexes

After 30 days in production, check for unused indexes:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
```

**Action**: If an index shows 0 scans after 30 days, consider removing it (may indicate unused query pattern).

### Index Size Monitoring

Check index sizes to ensure they're reasonable:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Warning Signs**:
- Index larger than the table itself (may indicate over-indexing)
- Indexes growing faster than table data (check for index bloat)

## Query Optimization Tips

### Using EXPLAIN ANALYZE

Always test query performance before deploying:

```sql
EXPLAIN ANALYZE
SELECT * FROM "Booking"
WHERE "vehicleId" = 'some-uuid'
  AND "pickupDatetime" <= '2024-12-20T10:00:00Z'
  AND "dropoffDatetime" >= '2024-12-18T10:00:00Z';
```

**Look for**:
- "Index Scan" or "Index Only Scan" (good - index is being used)
- "Seq Scan" (bad - full table scan, missing index or wrong query)
- Query time < 50ms for typical queries

### Composite Index Column Order

**Rule**: Equality conditions first, range conditions last

```sql
-- GOOD: Equality (vehicleId) before range (dates)
WHERE vehicleId = ? AND pickupDatetime > ? AND dropoffDatetime < ?

-- BAD: Range condition breaks index usage for subsequent columns
WHERE pickupDatetime > ? AND vehicleId = ?
```

### Index Selectivity

**Most selective column first** (for equality-only composites):

```sql
-- GOOD: vehicleId is more selective than status
CREATE INDEX ON Booking (vehicleId, status);

-- WORSE: status has only ~5 values, less selective
CREATE INDEX ON Booking (status, vehicleId);
```

## Troubleshooting Slow Queries

### Step 1: Check if Index Exists
```sql
\d+ "Booking"
```

### Step 2: Verify Index is Used
```sql
EXPLAIN ANALYZE your_query_here;
```

### Step 3: Check Index Statistics
```sql
SELECT * FROM pg_stat_user_indexes
WHERE indexrelname = 'Booking_vehicleId_pickupDatetime_dropoffDatetime_idx';
```

### Step 4: Consider Query Rewrite
If index exists but not used, rewrite query to match index structure.

## Future Considerations

As the application scales, consider:

1. **Partial Indexes** for frequently filtered subsets:
   ```sql
   CREATE INDEX active_bookings_idx ON "Booking" (vehicleId, pickupDatetime)
   WHERE status IN ('confirmed', 'active');
   ```

2. **Index-Only Scans** by including commonly selected columns:
   ```sql
   CREATE INDEX booking_summary_idx
   ON "Booking" (vehicleId, pickupDatetime, dropoffDatetime)
   INCLUDE (status, totalCents);
   ```

3. **Partitioning** large tables (e.g., bookings by year):
   ```sql
   -- Split Booking table into yearly partitions
   -- Requires PostgreSQL 10+ declarative partitioning
   ```

4. **Query caching** for expensive aggregation queries using Redis

## References

- PostgreSQL Index Documentation: https://www.postgresql.org/docs/current/indexes.html
- Prisma Indexing Guide: https://www.prisma.io/docs/concepts/components/prisma-schema/indexes
- Use The Index, Luke: https://use-the-index-luke.com/

---

**Last Updated**: 2025-12-17
**Database Version**: PostgreSQL 15
**ORM**: Prisma 5.22.0
