#!/bin/bash

# ==============================================================================
# FleetPass Database Backup Script
# ==============================================================================
# Creates compressed backups of the PostgreSQL database
# Usage: ./scripts/backup-database.sh [backup-directory]
# ==============================================================================

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
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

# Check if Docker Compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Docker Compose file not found: $COMPOSE_FILE"
    log_info "Usage: $0 [backup-directory]"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
else
    log_warn ".env file not found, using defaults"
fi

# Set default values if not in .env
POSTGRES_USER="${POSTGRES_USER:-fleetpass_prod}"
POSTGRES_DB="${POSTGRES_DB:-fleetpass_production}"

log_info "Starting database backup..."
log_info "Database: $POSTGRES_DB"
log_info "Backup directory: $BACKUP_DIR"

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/fleetpass_${DATE}.sql.gz"

# Perform backup
log_info "Creating backup: $(basename "$BACKUP_FILE")"

if docker-compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"; then

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup completed successfully!"
    log_info "Size: $BACKUP_SIZE"
    log_info "Location: $BACKUP_FILE"
else
    log_error "Backup failed!"
    exit 1
fi

# Clean up old backups
log_info "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "fleetpass_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    log_info "Deleted $DELETED_COUNT old backup(s)"
else
    log_info "No old backups to delete"
fi

# List recent backups
log_info "Recent backups:"
find "$BACKUP_DIR" -name "fleetpass_*.sql.gz" -mtime -7 -exec ls -lh {} \; | awk '{print $9, "("$5")"}'

log_info "Backup process completed!"

# Optional: Verify backup integrity
if command -v gunzip &> /dev/null; then
    log_info "Verifying backup integrity..."
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_info "Backup integrity verified ✓"
    else
        log_error "Backup integrity check failed ✗"
        exit 1
    fi
fi

exit 0
