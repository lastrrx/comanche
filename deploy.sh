#!/bin/bash

# Cypher Portfolio Analytics - Deployment Script
# Automated deployment for production environments

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DEPLOY_DIR="/opt/cypher"
BACKUP_DIR="/opt/cypher-backups"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.${ENVIRONMENT}"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df -BG /opt | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        error "Insufficient disk space. At least 5GB required"
    fi
    
    success "Prerequisites check passed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    if [ -d "$DEPLOY_DIR" ]; then
        BACKUP_NAME="cypher-backup-$(date +'%Y%m%d-%H%M%S')"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        log "Backing up database..."
        docker exec cypher-postgres pg_dump -U cypher_user cypher_db > "$BACKUP_DIR/$BACKUP_NAME.sql"
        
        # Backup environment files
        cp "$DEPLOY_DIR/.env*" "$BACKUP_DIR/" 2>/dev/null || true
        
        # Create backup archive
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$DEPLOY_DIR" .
        
        success "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    else
        warning "No existing deployment found to backup"
    fi
}

# Pull latest code
pull_latest() {
    log "Pulling latest code from repository..."
    
    cd "$DEPLOY_DIR" || error "Failed to change to deploy directory"
    
    # Stash any local changes
    git stash
    
    # Pull latest from main branch
    git pull origin main || error "Failed to pull latest code"
    
    success "Latest code pulled successfully"
}

# Build and deploy
deploy() {
    log "Starting deployment for $ENVIRONMENT environment..."
    
    cd "$DEPLOY_DIR" || error "Failed to change to deploy directory"
    
    # Copy environment file
    cp "$ENV_FILE" .env
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose build --no-cache
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose run --rm backend npm run migrate
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    check_health
    
    success "Deployment completed successfully!"
}

# Health check
check_health() {
    log "Performing health checks..."
    
    # Check backend health
    BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health)
    if [ "$BACKEND_HEALTH" != "200" ]; then
        error "Backend health check failed"
    fi
    
    # Check frontend
    FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [ "$FRONTEND_HEALTH" != "200" ]; then
        error "Frontend health check failed"
    fi
    
    # Check database
    docker exec cypher-postgres pg_isready -U cypher_user -d cypher_db || error "Database health check failed"
    
    # Check Redis
    docker exec cypher-redis redis-cli ping || error "Redis health check failed"
    
    success "All health checks passed"
}

# Rollback deployment
rollback() {
    log "Rolling back deployment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found to rollback to"
    fi
    
    warning "Rolling back to: $LATEST_BACKUP"
    
    # Stop current services
    cd "$DEPLOY_DIR" || error "Failed to change to deploy directory"
    docker-compose down
    
    # Extract backup
    tar -xzf "$LATEST_BACKUP" -C "$DEPLOY_DIR"
    
    # Restore database
    BACKUP_SQL="${LATEST_BACKUP%.tar.gz}.sql"
    if [ -f "$BACKUP_SQL" ]; then
        docker-compose up -d postgres
        sleep 10
        docker exec -i cypher-postgres psql -U cypher_user cypher_db < "$BACKUP_SQL"
    fi
    
    # Start services
    docker-compose up -d
    
    success "Rollback completed"
}

# Clean up old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 5 backups
    cd "$BACKUP_DIR" || return
    ls -t *.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
    ls -t *.sql 2>/dev/null | tail -n +6 | xargs -r rm -f
    
    success "Old backups cleaned up"
}

# Show logs
show_logs() {
    log "Showing service logs..."
    docker-compose logs -f --tail=100
}

# Main deployment flow
main() {
    log "=== Cypher Deployment Script ==="
    log "Environment: $ENVIRONMENT"
    
    case "${2:-deploy}" in
        deploy)
            check_prerequisites
            backup_current
            pull_latest
            deploy
            cleanup_backups
            ;;
        rollback)
            rollback
            ;;
        health)
            check_health
            ;;
        logs)
            show_logs
            ;;
        backup)
            backup_current
            ;;
        *)
            echo "Usage: $0 [environment] [deploy|rollback|health|logs|backup]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"