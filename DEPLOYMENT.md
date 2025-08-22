# Smart Helpdesk Deployment Guide

This guide covers deployment options for the Smart Helpdesk application.

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+ (optional)

### Local Development Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd smart-helpdesk

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

2. **Environment Configuration**
```bash
cd server
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Start MongoDB service
# Then seed the database
npm run seed
```

4. **Start Development Servers**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

5. **Verify Installation**
```bash
cd server
npm run test:integration
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: helpdesk-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: helpdesk-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.production
    container_name: helpdesk-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password123@mongodb:27017/smart-helpdesk?authSource=admin
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-production-jwt-secret
      STUB_MODE: true
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
      - redis

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.production
    container_name: helpdesk-frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:5000/api
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

2. **Deploy**
```bash
docker-compose up -d
```

3. **Initialize Database**
```bash
docker exec helpdesk-backend npm run seed
```

## ☁️ Cloud Deployment

### Render.com Deployment

1. **Backend Deployment**
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables from `.env.example`

2. **Frontend Deployment**
   - Create new static site
   - Set build command: `npm run build`
   - Set publish directory: `dist`

3. **Database**
   - Use MongoDB Atlas for managed database
   - Update `MONGODB_URI` in environment variables

### Heroku Deployment

1. **Prepare for Heroku**
```bash
# Create Procfile in server directory
echo "web: npm start" > server/Procfile

# Create package.json in root
cat > package.json << EOF
{
  "name": "smart-helpdesk",
  "scripts": {
    "build": "cd client && npm install && npm run build",
    "start": "cd server && npm start",
    "heroku-postbuild": "npm run build"
  }
}
EOF
```

2. **Deploy**
```bash
heroku create your-app-name
heroku addons:create mongolab:sandbox
heroku config:set NODE_ENV=production
heroku config:set STUB_MODE=true
git push heroku main
```

## 🔧 Production Configuration

### Environment Variables
```bash
# Production settings
NODE_ENV=production
STUB_MODE=false  # Set to true for demo mode

# Database
MONGODB_URI=mongodb://username:password@host:port/database

# Security
JWT_SECRET=your-very-secure-jwt-secret
JWT_REFRESH_SECRET=your-very-secure-refresh-secret

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
AI_CONFIDENCE_THRESHOLD=0.85

# Monitoring
LOG_LEVEL=warn
ENABLE_METRICS=true
```

### Security Checklist
- [ ] Change default JWT secrets
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Regular security updates

### Performance Optimization
- [ ] Enable Redis caching
- [ ] Configure database indexes
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression
- [ ] Monitor memory usage
- [ ] Set up health checks

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Database connectivity
curl http://localhost:5000/readyz

# Metrics endpoint
curl http://localhost:5000/metrics
```

### Log Management
```bash
# View application logs
tail -f server/logs/app.log

# View error logs
tail -f server/logs/error.log

# Docker logs
docker logs helpdesk-backend
```

### Database Maintenance
```bash
# Backup database
mongodump --uri="mongodb://localhost:27017/smart-helpdesk" --out=backup/

# Restore database
mongorestore --uri="mongodb://localhost:27017/smart-helpdesk" backup/smart-helpdesk/

# Clean up old audit logs (optional)
node server/scripts/cleanup-audit-logs.js
```

## 🔄 Updates & Migrations

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd server && npm install
cd ../client && npm install

# Run migrations (if any)
npm run migrate

# Restart services
docker-compose restart
```

### Database Migrations
```bash
# Run any pending migrations
cd server
npm run migrate

# Seed new data if needed
npm run seed:production
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MongoDB service status
   - Verify connection string
   - Check network connectivity

2. **AI Processing Not Working**
   - Verify `STUB_MODE` setting
   - Check API keys if using external AI
   - Review AI service logs

3. **Frontend Not Loading**
   - Check API URL configuration
   - Verify CORS settings
   - Check browser console for errors

4. **Performance Issues**
   - Monitor database query performance
   - Check memory usage
   - Review application logs

### Debug Commands
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend

# Access container shell
docker exec -it helpdesk-backend bash

# Test API endpoints
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Test with integration script: `npm run test:integration`

---

**Happy Deploying! 🚀**
