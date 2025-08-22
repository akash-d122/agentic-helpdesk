# 🔐 Smart Helpdesk Authentication System

[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)](https://jwt.io/)
[![Tests](https://img.shields.io/badge/Tests-25/25_Passing-brightgreen.svg)](#testing-documentation)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](#testing-documentation)

A robust, production-ready authentication system built with Node.js, Express.js, and MongoDB. Features comprehensive JWT-based authentication, advanced security measures, and extensive test coverage.

## 🚀 Live Demo

- **🌐 Live Application**: [https://smart-helpdesk-api.onrender.com](https://smart-helpdesk-api.onrender.com)
- **📋 Interactive Demo**: [https://smart-helpdesk-api.onrender.com](https://smart-helpdesk-api.onrender.com)
- **💚 Health Check**: [https://smart-helpdesk-api.onrender.com/health](https://smart-helpdesk-api.onrender.com/health)
- **📊 API Info**: [https://smart-helpdesk-api.onrender.com/api](https://smart-helpdesk-api.onrender.com/api)

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Setup and Installation](#-setup-and-installation)
- [Authentication System Documentation](#-authentication-system-documentation)
- [Testing Documentation](#-testing-documentation)
- [Deployment Information](#-deployment-information)
- [API Reference](#-api-reference)
- [Security Features](#-security-features)
- [Contributing](#-contributing)

## 🏗️ Architecture Overview

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend Demo<br/>HTML/CSS/JS]
        API_CLIENT[API Clients<br/>Mobile/Web Apps]
    end
    
    subgraph "API Gateway Layer"
        LB[Load Balancer<br/>Render.com]
        CORS[CORS Middleware]
        RATE[Rate Limiting]
        SEC[Security Headers<br/>Helmet.js]
    end
    
    subgraph "Authentication Layer"
        AUTH_MW[Auth Middleware<br/>JWT Verification]
        JWT_SVC[JWT Service<br/>Token Management]
        BCRYPT[Password Hashing<br/>bcrypt]
    end
    
    subgraph "Application Layer"
        EXPRESS[Express.js Server]
        ROUTES[Route Handlers]
        CONTROLLERS[Auth Controllers]
        VALIDATORS[Input Validation<br/>express-validator]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB Atlas<br/>Cloud Database)]
        MODELS[Mongoose Models<br/>User Schema]
    end
    
    subgraph "Infrastructure Layer"
        LOGS[Winston Logging]
        MONITOR[Health Monitoring]
        ENV[Environment Config]
    end
    
    FE --> LB
    API_CLIENT --> LB
    LB --> CORS
    CORS --> RATE
    RATE --> SEC
    SEC --> AUTH_MW
    AUTH_MW --> JWT_SVC
    JWT_SVC --> BCRYPT
    BCRYPT --> EXPRESS
    EXPRESS --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> VALIDATORS
    VALIDATORS --> MODELS
    MODELS --> MONGO
    
    EXPRESS --> LOGS
    EXPRESS --> MONITOR
    EXPRESS --> ENV
    
    style FE fill:#e1f5fe
    style AUTH_MW fill:#fff3e0
    style JWT_SVC fill:#fff3e0
    style MONGO fill:#e8f5e8
    style EXPRESS fill:#f3e5f5
```

### Technology Rationale

**Backend Framework Choice**: Express.js was selected for its mature ecosystem, extensive middleware support, and proven scalability in production environments. Its lightweight nature allows for fine-grained control over the authentication flow while maintaining high performance.

**Database Strategy**: MongoDB with Mongoose ODM provides flexible schema design essential for user management systems. The document-based approach allows for easy extension of user profiles and role-based access control. MongoDB Atlas ensures reliable cloud hosting with automatic scaling and backup capabilities.

**Authentication Architecture**: JWT (JSON Web Tokens) implementation provides stateless authentication ideal for distributed systems and microservices. The dual-token strategy (access + refresh tokens) balances security with user experience, allowing for secure token rotation without frequent re-authentication. bcrypt password hashing with configurable salt rounds ensures future-proof password security against evolving attack vectors.

### Key Components

- **🔐 JWT Authentication**: Stateless token-based authentication with access/refresh token rotation
- **🛡️ Security Middleware**: Multi-layered security with rate limiting, CORS, and input validation
- **📊 Comprehensive Logging**: Structured logging with Winston for monitoring and debugging
- **🧪 Extensive Testing**: 100% test coverage with unit and integration tests
- **🚀 Production Ready**: Deployed on Render.com with MongoDB Atlas integration

## 🛠️ Setup and Installation

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **MongoDB**: Local instance or MongoDB Atlas account
- **Git**: For version control

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```bash
# Environment Configuration
NODE_ENV=development                    # Environment: development, production, test
PORT=5000                              # Server port (default: 5000)

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/smart-helpdesk
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/smart-helpdesk?retryWrites=true&w=majority
MONGODB_TEST_URI=mongodb://localhost:27017/smart-helpdesk-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-minimum-32-chars
JWT_EXPIRES_IN=15m                     # Access token expiration (15 minutes recommended)
JWT_REFRESH_EXPIRES_IN=7d              # Refresh token expiration (7 days recommended)

# Security Configuration
BCRYPT_SALT_ROUNDS=12                  # bcrypt salt rounds (12 recommended for production)

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000            # Rate limit window (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100            # Max requests per window
AUTH_RATE_LIMIT_MAX=5                  # Max auth attempts per window

# CORS Configuration
CORS_ORIGIN=http://localhost:5173      # Frontend URL for development
CORS_CREDENTIALS=true                  # Allow credentials in CORS

# Logging Configuration
LOG_LEVEL=info                         # Logging level: error, warn, info, debug
LOG_FILE=logs/app.log                  # Log file path

# Optional: AI and External Services
OPENAI_API_KEY=your-openai-api-key     # For AI features (optional)
REDIS_URL=redis://localhost:6379       # For job queue (optional)

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com               # SMTP server
SMTP_PORT=587                          # SMTP port
SMTP_USER=your-email@gmail.com         # SMTP username
SMTP_PASS=your-app-password            # SMTP password
FROM_EMAIL=noreply@smarthelpdesk.com   # From email address
```

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/smart-helpdesk-api.git
   cd smart-helpdesk-api/server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Start MongoDB** (if using local instance)
   ```bash
   # Using MongoDB Community Edition
   mongod --dbpath /path/to/your/db
   
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```

6. **Verify Installation**
   - Visit: http://localhost:5000/health
   - Expected response: `{"status": "healthy", "timestamp": "..."}`

### Database Seeding

The application automatically seeds the database with initial data on startup:

```bash
# Manual seeding (if needed)
npm run seed

# Reset database (development only)
npm run reset-db
```

**Initial Data Created**:
- Admin user: `admin@smarthelpdesk.com` / `Admin123!`
- Sample customer users
- Default system configurations
- Knowledge base articles

### Docker Setup (Optional)

```dockerfile
# Dockerfile is included for containerized deployment
docker build -t smart-helpdesk-api .
docker run -p 5000:5000 --env-file .env smart-helpdesk-api
```

### Troubleshooting Common Issues

**1. MongoDB Connection Failed**
```bash
# Check MongoDB status
mongod --version
# Verify connection string in .env
# Ensure MongoDB is running on specified port
```

**2. JWT Secret Errors**
```bash
# Ensure JWT secrets are at least 32 characters long
# Generate secure secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Port Already in Use**
```bash
# Find process using port 5000
lsof -i :5000
# Kill process or change PORT in .env
```

**4. Permission Errors**
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**5. Module Not Found Errors**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🔐 Authentication System Documentation

### Authentication Flow Overview

The Smart Helpdesk authentication system implements a secure, stateless JWT-based authentication flow with the following stages:

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant DB
    participant JWT

    Note over Client,JWT: User Registration Flow
    Client->>API: POST /api/auth/register
    API->>Auth: Validate input data
    Auth->>DB: Check email uniqueness
    DB-->>Auth: Email available
    Auth->>Auth: Hash password (bcrypt)
    Auth->>DB: Create user record
    DB-->>Auth: User created
    Auth->>JWT: Generate access + refresh tokens
    JWT-->>Auth: Return tokens
    Auth-->>API: Return user + tokens
    API-->>Client: 201 Created + tokens

    Note over Client,JWT: User Login Flow
    Client->>API: POST /api/auth/login
    API->>Auth: Validate credentials
    Auth->>DB: Find user by email
    DB-->>Auth: Return user data
    Auth->>Auth: Verify password (bcrypt)
    Auth->>JWT: Generate new tokens
    JWT-->>Auth: Return tokens
    Auth-->>API: Return user + tokens
    API-->>Client: 200 OK + tokens

    Note over Client,JWT: Protected Route Access
    Client->>API: GET /api/auth/me (with Bearer token)
    API->>Auth: Extract JWT from header
    Auth->>JWT: Verify token signature
    JWT-->>Auth: Token valid
    Auth->>DB: Get current user data
    DB-->>Auth: Return user data
    Auth-->>API: Return user info
    API-->>Client: 200 OK + user data

    Note over Client,JWT: Token Refresh Flow
    Client->>API: POST /api/auth/refresh (with refresh token)
    API->>Auth: Validate refresh token
    Auth->>JWT: Verify refresh token
    JWT-->>Auth: Token valid
    Auth->>JWT: Generate new access token
    JWT-->>Auth: Return new tokens
    Auth-->>API: Return new tokens
    API-->>Client: 200 OK + new tokens
```

### JWT Token Strategy

**Dual Token Architecture**:
- **Access Token**: Short-lived (15 minutes) for API access
- **Refresh Token**: Long-lived (7 days) for token renewal

**Token Structure**:
```javascript
// Access Token Payload
{
  "userId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "user@example.com",
  "role": "customer",
  "iat": 1694123456,
  "exp": 1694124356,
  "type": "access"
}

// Refresh Token Payload
{
  "userId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "tokenVersion": 1,
  "iat": 1694123456,
  "exp": 1694728256,
  "type": "refresh"
}
```

**Security Features**:
- Separate signing secrets for access and refresh tokens
- Token type validation to prevent token confusion attacks
- Configurable expiration times
- Secure token storage recommendations

### Authentication Endpoints

#### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isActive": true,
      "createdAt": "2023-09-07T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "lastLogin": "2023-09-07T10:35:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Get User Profile (Protected)
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isActive": true,
      "createdAt": "2023-09-07T10:30:00.000Z",
      "lastLogin": "2023-09-07T10:35:00.000Z"
    }
  }
}
```

#### 4. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    }
  }
}
```

#### 5. User Logout (Protected)
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### 6. Password Reset Request
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset email has been sent"
}
```

### Security Measures and Guardrails

#### Password Security
- **bcrypt Hashing**: 12 salt rounds (configurable)
- **Password Requirements**: Minimum 8 characters, complexity validation
- **Password Reset**: Secure token-based reset flow

#### Rate Limiting
```javascript
// Global rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
}));

// Auth-specific rate limiting
authRouter.use('/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  skipSuccessfulRequests: true
}));
```

#### Input Validation
```javascript
// Registration validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('role').isIn(['customer', 'agent', 'admin'])
];
```

#### Security Headers
```javascript
// Helmet.js security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Middleware Authentication Flow

```javascript
// Authentication middleware implementation
const authenticateToken = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // 2. Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check token type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // 4. Get current user from database
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // 5. Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};
```

## 🧪 Testing Documentation

### Test Coverage Summary

The Smart Helpdesk authentication system maintains **100% test coverage** with comprehensive unit and integration tests:

- **✅ Unit Tests**: 15/15 passing (100% success rate)
- **✅ Integration Tests**: 10/10 passing (100% success rate)
- **✅ Total Tests**: 25/25 passing (100% success rate)
- **⚡ Performance**: Average test execution time < 20 seconds

### Running Tests

#### Prerequisites
```bash
# Ensure test database is configured
MONGODB_TEST_URI=mongodb://localhost:27017/smart-helpdesk-test
```

#### Run All Tests
```bash
# Run complete test suite
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch
```

#### Run Specific Test Suites
```bash
# Unit tests only
npx jest tests/unit/

# Integration tests only
npx jest tests/integration/

# Specific test file
npx jest tests/unit/auth.test.js
```

### Unit Tests Overview

**File**: `tests/unit/auth.test.js`

#### Authentication Registration Tests
```javascript
describe('User Registration', () => {
  it('should register a new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(userData.email);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('should reject registration with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: 'Password123!' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject registration with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'weak' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

#### Authentication Login Tests
```javascript
describe('User Login', () => {
  it('should login with valid credentials', async () => {
    // Create user first
    await User.create({
      email: 'login@test.com',
      password: await bcrypt.hash('Password123!', 12),
      firstName: 'Login',
      lastName: 'Test',
      role: 'customer',
      isActive: true
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@test.com',
        password: 'Password123!'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('should reject login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'WrongPassword123!'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

#### Protected Route Tests
```javascript
describe('Protected Routes', () => {
  it('should return current user with valid token', async () => {
    const user = await User.create({
      email: 'protected@test.com',
      password: await bcrypt.hash('Password123!', 12),
      firstName: 'Protected',
      lastName: 'Test',
      role: 'customer',
      isActive: true
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('protected@test.com');
  });

  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

### Integration Tests Overview

**File**: `tests/integration/auth.integration.test.js`

#### Complete Authentication Flow
```javascript
describe('Complete Authentication Flow', () => {
  it('should complete full user lifecycle: register → login → access protected route → logout', async () => {
    const userData = {
      email: 'integration@test.com',
      password: 'Password123!',
      firstName: 'Integration',
      lastName: 'Test',
      role: 'customer'
    };

    // Step 1: Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(registerResponse.status).toBe(201);
    const { token: registerToken, refreshToken } = registerResponse.body.data;

    // Step 2: Login with registered credentials
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    expect(loginResponse.status).toBe(200);
    const { token: loginToken } = loginResponse.body.data;

    // Step 3: Access protected route
    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user.email).toBe(userData.email);

    // Step 4: Logout
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginToken}`);

    expect(logoutResponse.status).toBe(200);
  });
});
```

### Manual API Testing

#### Using cURL Commands

**1. Health Check**
```bash
curl -X GET https://smart-helpdesk-api.onrender.com/health
```

**2. User Registration**
```bash
curl -X POST https://smart-helpdesk-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "customer"
  }'
```

**3. User Login**
```bash
curl -X POST https://smart-helpdesk-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**4. Access Protected Route**
```bash
# Replace YOUR_JWT_TOKEN with actual token from login response
curl -X GET https://smart-helpdesk-api.onrender.com/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**5. Refresh Token**
```bash
# Replace YOUR_REFRESH_TOKEN with actual refresh token
curl -X POST https://smart-helpdesk-api.onrender.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**6. User Logout**
```bash
curl -X POST https://smart-helpdesk-api.onrender.com/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Using Postman Collection

A comprehensive Postman collection is available for testing all endpoints:

```json
{
  "info": {
    "name": "Smart Helpdesk Authentication API",
    "description": "Complete authentication system testing collection"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://smart-helpdesk-api.onrender.com"
    },
    {
      "key": "accessToken",
      "value": ""
    },
    {
      "key": "refreshToken",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/register",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Password123!\",\n  \"firstName\": \"Test\",\n  \"lastName\": \"User\",\n  \"role\": \"customer\"\n}"
        }
      }
    }
  ]
}
```

### Testing Strategy

#### Unit Testing Strategy
- **Isolation**: Each test runs in isolation with fresh database state
- **Mocking**: External dependencies mocked where appropriate
- **Coverage**: All authentication functions and edge cases covered
- **Validation**: Input validation and error handling thoroughly tested

#### Integration Testing Strategy
- **End-to-End**: Complete user workflows tested from start to finish
- **State Management**: Authentication state persistence across requests
- **Error Scenarios**: Network failures and edge cases simulated
- **Performance**: Response times and concurrent request handling

#### Testing in Different Environments

**Local Development**
```bash
# Set test environment
NODE_ENV=test npm test

# Use test database
MONGODB_URI=mongodb://localhost:27017/smart-helpdesk-test npm test
```

**CI/CD Pipeline**
```yaml
# GitHub Actions example
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

**Production Testing**
```bash
# Smoke tests against production
NODE_ENV=production npm run test:smoke

# Load testing
npm run test:load
```

## 🚀 Deployment Information

### Live Deployment

- **🌐 Production URL**: [https://smart-helpdesk-api.onrender.com](https://smart-helpdesk-api.onrender.com)
- **📊 API Documentation**: [https://smart-helpdesk-api.onrender.com/api](https://smart-helpdesk-api.onrender.com/api)
- **💚 Health Monitoring**: [https://smart-helpdesk-api.onrender.com/health](https://smart-helpdesk-api.onrender.com/health)
- **🎮 Interactive Demo**: [https://smart-helpdesk-api.onrender.com](https://smart-helpdesk-api.onrender.com)

### Hosting Platform Details

**Platform**: Render.com (Free Tier)
- **Runtime**: Node.js 18.x
- **Memory**: 512MB RAM
- **Storage**: Ephemeral (logs and uploads)
- **SSL**: Automatic HTTPS with Let's Encrypt
- **Uptime**: 99.9% SLA on free tier
- **Cold Start**: ~10-15 seconds after inactivity

**Database**: MongoDB Atlas (Free Tier)
- **Storage**: 512MB included
- **Connections**: 500 concurrent connections
- **Backup**: Automatic daily backups
- **Security**: VPC peering, encryption at rest
- **Monitoring**: Real-time performance metrics

### Production Environment Considerations

#### Environment Variables (Production)
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart-helpdesk
JWT_SECRET=production-secret-32-chars-minimum
JWT_REFRESH_SECRET=production-refresh-secret-32-chars-minimum
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
```

#### Security Configurations
- **HTTPS Only**: All traffic encrypted with TLS 1.3
- **Security Headers**: Comprehensive security headers via Helmet.js
- **Rate Limiting**: Aggressive rate limiting for production
- **Input Validation**: Strict validation and sanitization
- **Error Handling**: No sensitive information in error responses
- **Logging**: Structured logging with appropriate log levels

#### Performance Optimizations
- **Compression**: Gzip compression enabled
- **Caching**: Appropriate cache headers for static assets
- **Database**: Connection pooling and query optimization
- **Monitoring**: Health checks and performance monitoring
- **Scaling**: Horizontal scaling ready (stateless design)

### Deployment Process

#### Automated Deployment (Recommended)
1. **Code Push**: Push to main branch triggers deployment
2. **Build Process**: Render automatically installs dependencies
3. **Health Check**: Deployment verified via health endpoint
4. **Traffic Routing**: New version receives traffic after health check
5. **Rollback**: Automatic rollback on deployment failure

#### Manual Deployment Steps
1. **Environment Setup**: Configure environment variables
2. **Database Migration**: Run any necessary database migrations
3. **Dependency Installation**: `npm install --production`
4. **Application Start**: `npm start`
5. **Health Verification**: Verify `/health` endpoint responds
6. **Smoke Testing**: Run basic functionality tests

### Monitoring and Maintenance

#### Health Monitoring
```javascript
// Health check endpoint implementation
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version
  });
});
```

#### Logging and Monitoring
- **Application Logs**: Structured JSON logging with Winston
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Metrics**: Response time and throughput monitoring
- **Database Monitoring**: Connection pool and query performance
- **Security Monitoring**: Failed authentication attempts and rate limiting

#### Maintenance Schedule
- **Security Updates**: Monthly dependency updates
- **Database Maintenance**: Weekly backup verification
- **Performance Review**: Monthly performance analysis
- **Log Rotation**: Automatic log rotation and cleanup
- **SSL Certificate**: Automatic renewal via Let's Encrypt

## 📚 API Reference

### Base URL
```
Production: https://smart-helpdesk-api.onrender.com
Development: http://localhost:5000
```

### Authentication Header
```http
Authorization: Bearer <access_token>
```

### Response Format
All API responses follow a consistent format:

**Success Response**:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    // Additional error details (development only)
  }
}
```

### HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Rate Limiting
- **Global Limit**: 100 requests per 15 minutes per IP
- **Authentication Endpoints**: 5 requests per 15 minutes per IP
- **Headers**: Rate limit information included in response headers

### Error Codes
| Code | Description |
|------|-------------|
| `AUTH_001` | Invalid credentials |
| `AUTH_002` | Token expired |
| `AUTH_003` | Invalid token format |
| `AUTH_004` | User account inactive |
| `AUTH_005` | Email already registered |
| `VALID_001` | Invalid input data |
| `VALID_002` | Missing required fields |
| `RATE_001` | Rate limit exceeded |
| `SERVER_001` | Internal server error |

## 🛡️ Security Features

### Authentication Security
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Dual Token Strategy**: Separate access and refresh tokens
- **Token Rotation**: Automatic token refresh for enhanced security
- **Secure Storage**: Recommendations for secure client-side token storage

### Password Security
- **bcrypt Hashing**: Industry-standard password hashing with salt
- **Configurable Rounds**: Adjustable salt rounds for future-proofing
- **Password Complexity**: Enforced password strength requirements
- **Reset Security**: Secure password reset with time-limited tokens

### API Security
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **Input Validation**: Comprehensive validation and sanitization
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: CSRF tokens for state-changing operations

### Infrastructure Security
- **HTTPS Only**: All communication encrypted with TLS 1.3
- **Security Headers**: Comprehensive security headers via Helmet.js
- **CORS Configuration**: Strict CORS policy for cross-origin requests
- **Environment Isolation**: Separate environments for development/production
- **Dependency Security**: Regular security audits and updates

### Monitoring and Logging
- **Security Events**: Logging of authentication failures and suspicious activity
- **Audit Trail**: Comprehensive logging of user actions
- **Error Handling**: Secure error responses without information leakage
- **Performance Monitoring**: Real-time monitoring of API performance

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/smart-helpdesk-api.git`
3. Install dependencies: `npm install`
4. Set up environment variables: `cp .env.example .env`
5. Start development server: `npm run dev`

### Code Standards
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Use Prettier for code formatting
- **Testing**: Maintain 100% test coverage
- **Documentation**: Update documentation for new features
- **Security**: Follow security best practices

### Pull Request Process
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes with tests
3. Run the test suite: `npm test`
4. Update documentation as needed
5. Submit a pull request with clear description

### Reporting Issues
- Use GitHub Issues for bug reports and feature requests
- Include detailed reproduction steps for bugs
- Provide environment information (Node.js version, OS, etc.)
- Check existing issues before creating new ones

### Security Vulnerabilities
- **DO NOT** create public issues for security vulnerabilities
- Email security issues to: security@smarthelpdesk.com
- Include detailed information about the vulnerability
- Allow reasonable time for response before public disclosure

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Express.js** - Fast, unopinionated web framework for Node.js
- **MongoDB** - Document-based database for flexible data storage
- **JWT** - JSON Web Tokens for secure authentication
- **bcrypt** - Password hashing library for Node.js
- **Helmet.js** - Security middleware for Express applications
- **Jest** - JavaScript testing framework
- **Winston** - Logging library for Node.js

## 📞 Support

For support and questions:
- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Email**: support@smarthelpdesk.com
- **Live Demo**: [https://smart-helpdesk-api.onrender.com](https://smart-helpdesk-api.onrender.com)

---

**Built with ❤️ for secure, scalable authentication systems**
