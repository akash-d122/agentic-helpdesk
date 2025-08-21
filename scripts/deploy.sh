#!/bin/bash

# Smart Helpdesk Production Deployment Script
# This script handles zero-downtime deployment with health checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            log_warning "Initiating automatic rollback..."
            rollback_deployment
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

# Utility functions
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required environment files exist
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        log_error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    # Check if SSL certificates exist (for production)
    if [ "$DEPLOY_ENV" = "production" ]; then
        if [ ! -d "$PROJECT_ROOT/nginx/ssl" ]; then
            log_warning "SSL certificates directory not found. Make sure to run SSL setup first."
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    log_info "Backing up database..."
    docker-compose -f docker-compose.production.yml exec -T mongodb mongodump --out /tmp/backup
    docker cp smart-helpdesk-mongodb:/tmp/backup "$backup_dir/mongodb"
    
    # Backup uploaded files
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        log_info "Backing up uploaded files..."
        cp -r "$PROJECT_ROOT/uploads" "$backup_dir/"
    fi
    
    # Backup configuration
    log_info "Backing up configuration..."
    cp "$PROJECT_ROOT/.env.production" "$backup_dir/"
    
    # Store backup path for potential rollback
    echo "$backup_dir" > "$PROJECT_ROOT/.last_backup"
    
    log_success "Backup created at $backup_dir"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    find "$PROJECT_ROOT/backups" -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    log_success "Old backups cleaned up"
}

# Build new images
build_images() {
    log_info "Building new Docker images..."
    
    # Build with build args for cache busting
    local build_timestamp=$(date +%s)
    
    docker-compose -f docker-compose.production.yml build \
        --build-arg BUILD_TIMESTAMP="$build_timestamp" \
        --no-cache
    
    log_success "Docker images built successfully"
}

# Health check function
health_check() {
    local service_url="$1"
    local timeout="$2"
    local interval=5
    local elapsed=0
    
    log_info "Performing health check on $service_url..."
    
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "$service_url/health" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log_info "Health check attempt $((elapsed / interval))..."
    done
    
    log_error "Health check failed after ${timeout}s"
    return 1
}

# Deploy new version
deploy_new_version() {
    log_info "Deploying new version..."
    
    # Load environment variables
    export $(cat "$PROJECT_ROOT/.env.production" | grep -v '^#' | xargs)
    
    # Start new containers
    docker-compose -f docker-compose.production.yml up -d --remove-orphans
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Perform health checks
    local api_url="https://api.smarthelpdesk.com"
    local frontend_url="https://smarthelpdesk.com"
    
    if [ "$DEPLOY_ENV" = "development" ]; then
        api_url="http://localhost:3001"
        frontend_url="http://localhost:3000"
    fi
    
    # Check API health
    if ! health_check "$api_url" "$HEALTH_CHECK_TIMEOUT"; then
        log_error "API health check failed"
        return 1
    fi
    
    # Check frontend health
    if ! health_check "$frontend_url" "$HEALTH_CHECK_TIMEOUT"; then
        log_error "Frontend health check failed"
        return 1
    fi
    
    log_success "New version deployed successfully"
}

# Database migration
run_migrations() {
    log_info "Running database migrations..."
    
    # Run any pending migrations
    docker-compose -f docker-compose.production.yml exec -T app1 npm run migrate
    
    log_success "Database migrations completed"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    if [ ! -f "$PROJECT_ROOT/.last_backup" ]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    local backup_dir=$(cat "$PROJECT_ROOT/.last_backup")
    
    if [ ! -d "$backup_dir" ]; then
        log_error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    # Stop current containers
    docker-compose -f docker-compose.production.yml down
    
    # Restore database
    log_info "Restoring database..."
    docker-compose -f docker-compose.production.yml up -d mongodb
    sleep 10
    docker cp "$backup_dir/mongodb" smart-helpdesk-mongodb:/tmp/restore
    docker-compose -f docker-compose.production.yml exec -T mongodb mongorestore /tmp/restore
    
    # Restore uploaded files
    if [ -d "$backup_dir/uploads" ]; then
        log_info "Restoring uploaded files..."
        rm -rf "$PROJECT_ROOT/uploads"
        cp -r "$backup_dir/uploads" "$PROJECT_ROOT/"
    fi
    
    # Restore configuration
    cp "$backup_dir/.env.production" "$PROJECT_ROOT/"
    
    # Start previous version
    docker-compose -f docker-compose.production.yml up -d
    
    log_success "Rollback completed"
}

# Update system monitoring
update_monitoring() {
    log_info "Updating monitoring configuration..."
    
    # Restart Prometheus to pick up new targets
    docker-compose -f docker-compose.production.yml restart prometheus
    
    # Update Grafana dashboards
    docker-compose -f docker-compose.production.yml restart grafana
    
    log_success "Monitoring updated"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send notification to Slack/Teams/Email
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Smart Helpdesk Deployment: $status - $message\"}" \
            "$WEBHOOK_URL" || true
    fi
    
    log_info "Notification sent: $status - $message"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log_info "Starting Smart Helpdesk deployment..."
    log_info "Environment: $DEPLOY_ENV"
    log_info "Timestamp: $(date)"
    
    # Pre-deployment checks
    check_prerequisites
    
    # Create backup
    backup_current_deployment
    
    # Build new images
    build_images
    
    # Deploy new version
    if deploy_new_version; then
        # Run migrations
        run_migrations
        
        # Update monitoring
        update_monitoring
        
        # Clean old backups
        cleanup_old_backups
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "Deployment completed successfully in ${duration}s"
        send_notification "SUCCESS" "Deployment completed in ${duration}s"
    else
        log_error "Deployment failed"
        send_notification "FAILED" "Deployment failed, check logs for details"
        exit 1
    fi
}

# Command line options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback_deployment
        ;;
    "health-check")
        health_check "${2:-http://localhost:3001}" "${3:-60}"
        ;;
    "backup")
        backup_current_deployment
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|backup|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy      - Deploy new version (default)"
        echo "  rollback    - Rollback to previous version"
        echo "  health-check - Check service health"
        echo "  backup      - Create backup only"
        echo "  cleanup     - Clean old backups"
        exit 1
        ;;
esac
