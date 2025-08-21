# Smart Helpdesk Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Application Deployment](#application-deployment)
6. [SSL and Security](#ssl-and-security)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup and Recovery](#backup-and-recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 100GB SSD
- Network: 1Gbps connection

**Recommended for Production:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 500GB+ SSD
- Network: 10Gbps connection

### Software Dependencies

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 18+ (for development)
- **Git**: Latest version

### External Services

- **MongoDB Atlas** (recommended) or self-hosted MongoDB 6.0+
- **Redis Cloud** (recommended) or self-hosted Redis 7+
- **Email Service**: SendGrid, AWS SES, or SMTP server
- **SSL Certificate**: Let's Encrypt or commercial certificate
- **Domain Name**: Configured with DNS provider

## Infrastructure Requirements

### Architecture Overview

```
[Load Balancer] → [Nginx] → [App Instances] → [Database]
                     ↓
                [Static Files]
                     ↓
                [Monitoring]
```

### Server Configuration

#### Single Server Setup (Small Scale)
- 1 server running all components
- Suitable for up to 100 concurrent users
- 1,000-5,000 tickets per month

#### Multi-Server Setup (Large Scale)
- Load balancer (HAProxy/AWS ALB)
- 2+ application servers
- Dedicated database server
- Redis cluster
- Monitoring server

### Cloud Provider Options

#### AWS Deployment
- **EC2**: t3.large or larger instances
- **RDS**: MongoDB-compatible DocumentDB
- **ElastiCache**: Redis cluster
- **ALB**: Application Load Balancer
- **S3**: File storage
- **CloudWatch**: Monitoring

#### Google Cloud Platform
- **Compute Engine**: n1-standard-4 or larger
- **Cloud Firestore**: Document database
- **Memorystore**: Redis instance
- **Cloud Load Balancing**: HTTP(S) load balancer
- **Cloud Storage**: File storage
- **Cloud Monitoring**: System monitoring

#### Azure Deployment
- **Virtual Machines**: Standard_D4s_v3 or larger
- **Cosmos DB**: MongoDB API
- **Azure Cache**: Redis instance
- **Application Gateway**: Load balancer
- **Blob Storage**: File storage
- **Azure Monitor**: System monitoring

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/smart-helpdesk.git
cd smart-helpdesk
```

### 2. Environment Configuration

Create production environment file:

```bash
cp .env.example .env.production
```

Configure the following variables:

```env
# Application
NODE_ENV=production
PORT=3001
DOMAIN_NAME=yourdomain.com

# Database
MONGODB_URI=mongodb://username:password@host:port/database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure_password

# Redis
REDIS_URL=redis://username:password@host:port

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here

# AI Services
OPENAI_API_KEY=your_openai_api_key
AI_PROVIDER=openai

# Email
EMAIL_SERVICE=sendgrid
EMAIL_SERVICE_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com

# File Storage
UPLOAD_STORAGE=local
UPLOAD_MAX_SIZE=50MB

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000

# SSL
SSL_EMAIL=admin@yourdomain.com

# Backup
BACKUP_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Monitoring
GRAFANA_ADMIN_PASSWORD=secure_grafana_password
```

### 3. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Create SSL certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

#### Using Commercial Certificate

1. Purchase SSL certificate from provider
2. Generate CSR and private key
3. Download certificate files
4. Place files in `nginx/ssl/` directory

## Database Configuration

### MongoDB Setup

#### Option 1: MongoDB Atlas (Recommended)

1. Create MongoDB Atlas account
2. Create new cluster
3. Configure network access (whitelist your server IPs)
4. Create database user
5. Get connection string and update `MONGODB_URI`

#### Option 2: Self-Hosted MongoDB

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongo
> use admin
> db.createUser({user: "admin", pwd: "secure_password", roles: ["root"]})
```

### Redis Setup

#### Option 1: Redis Cloud (Recommended)

1. Create Redis Cloud account
2. Create new database
3. Get connection details and update `REDIS_URL`

#### Option 2: Self-Hosted Redis

```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_secure_password

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Application Deployment

### 1. Build and Deploy

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### 2. Manual Deployment Steps

If you prefer manual deployment:

```bash
# Build Docker images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Database Migration

```bash
# Run database migrations
docker-compose -f docker-compose.production.yml exec app1 npm run migrate

# Seed initial data (optional)
docker-compose -f docker-compose.production.yml exec app1 npm run seed
```

### 4. Create Admin User

```bash
# Create initial admin user
docker-compose -f docker-compose.production.yml exec app1 npm run create-admin
```

## SSL and Security

### Nginx Configuration

The included Nginx configuration provides:
- SSL termination
- HTTP to HTTPS redirect
- Security headers
- Rate limiting
- Gzip compression

### Security Headers

Verify security headers are working:

```bash
curl -I https://yourdomain.com
```

Should include:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3001/tcp   # Block direct app access
```

## Monitoring Setup

### Health Checks

Verify services are running:

```bash
# Application health
curl https://yourdomain.com/health

# API health
curl https://api.yourdomain.com/health

# Metrics endpoint (from server)
curl http://localhost:9090/metrics
```

### Grafana Dashboard

1. Access Grafana at `http://your-server:3000`
2. Login with admin credentials
3. Import pre-configured dashboards
4. Configure alert notifications

### Log Monitoring

View application logs:

```bash
# Application logs
docker-compose logs -f app1 app2

# Nginx logs
docker-compose logs -f nginx

# Database logs
docker-compose logs -f mongodb
```

## Backup and Recovery

### Automated Backups

The system includes automated backup:
- Daily database backups
- File storage backups
- Configuration backups
- Retention policy (7 days default)

### Manual Backup

```bash
# Database backup
docker-compose exec mongodb mongodump --out /backup/$(date +%Y%m%d)

# File backup
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Configuration backup
cp .env.production config-backup-$(date +%Y%m%d).env
```

### Recovery Process

```bash
# Restore database
docker-compose exec mongodb mongorestore /backup/20240101

# Restore files
tar -xzf uploads-backup-20240101.tar.gz

# Restart services
docker-compose restart
```

## Performance Optimization

### Database Optimization

```javascript
// Create indexes for better performance
db.tickets.createIndex({ "status": 1, "createdAt": -1 })
db.tickets.createIndex({ "assignee": 1, "status": 1 })
db.tickets.createIndex({ "requester": 1, "createdAt": -1 })
db.users.createIndex({ "email": 1 }, { unique: true })
db.knowledgearticles.createIndex({ "title": "text", "content": "text" })
```

### Application Optimization

1. **Enable Caching**: Redis caching is configured by default
2. **CDN Setup**: Configure CloudFlare or AWS CloudFront
3. **Image Optimization**: Compress and optimize images
4. **Database Connection Pooling**: Configured in application

### Load Testing

Run performance tests:

```bash
# Install k6
sudo apt-get install k6

# Run load test
k6 run tests/performance/load-test.js
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose logs app1

# Common causes:
# - Database connection issues
# - Missing environment variables
# - Port conflicts
```

#### 2. Database Connection Errors

```bash
# Test MongoDB connection
docker-compose exec app1 npm run test-db

# Check MongoDB logs
docker-compose logs mongodb
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew
```

#### 4. Performance Issues

```bash
# Check system resources
htop
df -h
free -m

# Check application metrics
curl http://localhost:9090/metrics
```

### Log Analysis

Important log locations:
- Application: `logs/combined.log`
- Errors: `logs/error.log`
- Nginx: `nginx/logs/`
- Database: Docker logs

### Getting Help

1. **Check Documentation**: Review this guide and API docs
2. **Community Support**: Post in community forums
3. **Professional Support**: Contact support team
4. **Emergency Support**: Use emergency contact for critical issues

### Maintenance Tasks

Regular maintenance:
- **Weekly**: Review logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and update backup procedures
- **Annually**: Security audit and penetration testing
