#!/bin/bash

# ==============================================================================
# FleetPass Database Restore Script
# ==============================================================================
# Restores PostgreSQL database from a backup file
# Usage: ./scripts/restore-database.sh <backup-file>
# ==============================================================================

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ "$#" -ne 1 ]; then
    log_error "Usage: $0 <backup-file>"
    log_info "Example: $0 backups/fleetpass_20241218_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if Docker Compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Docker Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
else
    log_error ".env file not found"
    exit 1
fi

# Set defaults
POSTGRES_USER="${POSTGRES_USER:-fleetpass_prod}"
POSTGRES_DB="${POSTGRES_DB:-fleetpass_production}"

log_warn "╔════════════════════════════════════════════════════════════╗"
log_warn "║              DATABASE RESTORE WARNING                      ║"
log_warn "╠════════════════════════════════════════════════════════════╣"
log_warn "║ This will REPLACE all data in the database!               ║"
log_warn "║ Database: $POSTGRES_DB"
log_warn "║ Backup file: $BACKUP_FILE"
log_warn "╚════════════════════════════════════════════════════════════╝"

# Confirmation
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

log_info "Starting database restore..."

# Step 1: Stop backend service
log_info "Stopping backend service..."
if docker-compose -f "$COMPOSE_FILE" stop backend; then
    log_info "Backend stopped"
else
    log_warn "Failed to stop backend (it may not be running)"
fi

# Step 2: Drop existing database connections
log_info "Dropping existing database connections..."
docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -c \
    "SELECT pg_terminate_backend(pg_stat_activity.pid)
     FROM pg_stat_activity
     WHERE pg_stat_activity.datname = '$POSTGRES_DB'
     AND pid <> pg_backend_pid();" || true

# Step 3: Drop and recreate database
log_info "Dropping and recreating database..."
docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -c \
    "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -c \
    "CREATE DATABASE $POSTGRES_DB;"

# Step 4: Restore from backup
log_info "Restoring from backup: $(basename "$BACKUP_FILE")"

if gunzip -c "$BACKUP_FILE" | \
   docker-compose -f "$COMPOSE_FILE" exec -T postgres \
   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null; then

    log_info "Database restored successfully!"
else
    log_error "Database restore failed!"
    exit 1
fi

# Step 5: Verify restore
log_info "Verifying restore..."
TABLE_COUNT=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

log_info "Tables found: $(echo $TABLE_COUNT | xargs)"

# Step 6: Restart backend service
log_info "Restarting backend service..."
if docker-compose -f "$COMPOSE_FILE" start backend; then
    log_info "Backend started"
else
    log_error "Failed to start backend"
    exit 1
fi

# Wait for backend to be healthy
log_info "Waiting for backend to be healthy..."
RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $RETRIES ]; do
    if docker-compose -f "$COMPOSE_FILE" exec -T backend curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log_info "Backend is healthy!"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $RETRIES ]; then
    log_warn "Backend health check timed out"
    log_info "Check logs with: docker-compose -f $COMPOSE_FILE logs backend"
fi

log_info "╔════════════════════════════════════════════════════════════╗"
log_info "║            Database Restore Completed!                     ║"
log_info "╚════════════════════════════════════════════════════════════╝"

exit 0
