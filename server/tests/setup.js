/**
 * Test Setup and Configuration
 * Global test utilities and database setup
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Global test variables
let mongoServer;
global.testDb = null;

// Test user data
global.testUsers = {
  admin: {
    _id: new mongoose.Types.ObjectId(),
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin',
    permissions: ['all']
  },
  agent: {
    _id: new mongoose.Types.ObjectId(),
    email: 'agent@test.com',
    firstName: 'Test',
    lastName: 'Agent',
    role: 'agent',
    permissions: ['tickets:read', 'tickets:write', 'knowledge:read']
  },
  customer: {
    _id: new mongoose.Types.ObjectId(),
    email: 'customer@test.com',
    firstName: 'Test',
    lastName: 'Customer',
    role: 'customer',
    permissions: ['tickets:create', 'tickets:read_own']
  }
};

// Test data factories
global.createTestTicket = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  subject: 'Test Ticket',
  description: 'This is a test ticket description',
  priority: 'medium',
  status: 'open',
  category: 'technical',
  requester: global.testUsers.customer._id,
  assignee: global.testUsers.agent._id,
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

global.createTestKnowledgeArticle = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  title: 'Test Knowledge Article',
  content: 'This is test knowledge content',
  category: 'technical',
  tags: ['test', 'help'],
  isPublished: true,
  author: global.testUsers.admin._id,
  viewCount: 0,
  helpfulCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

global.createTestAISuggestion = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  ticketId: global.createTestTicket()._id,
  type: 'response',
  status: 'completed',
  classification: {
    category: { category: 'technical', confidence: 0.95 },
    priority: { priority: 'medium', confidence: 0.88 }
  },
  suggestedResponse: {
    content: 'This is a test AI response',
    type: 'solution',
    confidence: 0.92
  },
  confidence: {
    overall: 0.91,
    calibrated: 0.89
  },
  knowledgeMatches: [],
  processingTime: 1500,
  createdAt: new Date(),
  ...overrides
});

// JWT token generation for tests
global.generateTestToken = (user = global.testUsers.admin) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role,
      permissions: user.permissions 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Database setup and teardown
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to test database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  global.testDb = mongoose.connection.db;
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.MONGODB_URI = mongoUri;
});

afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Mock external services
jest.mock('../services/ai/providers/OpenAIProvider', () => {
  return jest.fn().mockImplementation(() => ({
    classifyTicket: jest.fn().mockResolvedValue({
      category: 'technical',
      priority: 'medium',
      confidence: 0.95
    }),
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Mock AI response',
      confidence: 0.92
    }),
    searchKnowledge: jest.fn().mockResolvedValue([
      {
        id: 'mock-article-1',
        title: 'Mock Article',
        score: 0.85,
        content: 'Mock content'
      }
    ])
  }));
});

jest.mock('../services/email/EmailService', () => {
  return jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
    sendTicketNotification: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
  }));
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create authenticated request headers
  authHeaders: (user = global.testUsers.admin) => ({
    'Authorization': `Bearer ${global.generateTestToken(user)}`,
    'Content-Type': 'application/json'
  }),
  
  // Validate response structure
  validateApiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.headers['content-type']).toMatch(/json/);
    return response.body;
  },
  
  // Create test data in database
  seedDatabase: async () => {
    const User = require('../models/User');
    const Ticket = require('../models/Ticket');
    const KnowledgeArticle = require('../models/KnowledgeArticle');
    
    // Create test users
    await User.create([
      global.testUsers.admin,
      global.testUsers.agent,
      global.testUsers.customer
    ]);
    
    // Create test tickets
    const testTickets = [
      global.createTestTicket({ subject: 'Test Ticket 1' }),
      global.createTestTicket({ subject: 'Test Ticket 2', priority: 'high' }),
      global.createTestTicket({ subject: 'Test Ticket 3', status: 'closed' })
    ];
    await Ticket.create(testTickets);
    
    // Create test knowledge articles
    const testArticles = [
      global.createTestKnowledgeArticle({ title: 'How to Reset Password' }),
      global.createTestKnowledgeArticle({ title: 'Troubleshooting Login Issues' }),
      global.createTestKnowledgeArticle({ title: 'Account Setup Guide' })
    ];
    await KnowledgeArticle.create(testArticles);
    
    return {
      users: await User.find({}),
      tickets: await Ticket.find({}),
      articles: await KnowledgeArticle.find({})
    };
  }
};

// Console override for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep errors visible
};
