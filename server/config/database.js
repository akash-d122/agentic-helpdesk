const mongoose = require('mongoose');
const winston = require('winston');

// Configure mongoose settings
mongoose.set('strictQuery', false);

// Connection options
const connectionOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6

};

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect(uri = null) {
    try {
      const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-helpdesk';
      
      winston.info('Connecting to MongoDB...', { uri: mongoUri.replace(/\/\/.*@/, '//***:***@') });
      
      this.connection = await mongoose.connect(mongoUri, connectionOptions);
      this.isConnected = true;
      
      winston.info('MongoDB connected successfully', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });
      
      // Set up event listeners
      this.setupEventListeners();
      
      return this.connection;
    } catch (error) {
      winston.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  setupEventListeners() {
    const db = mongoose.connection;
    
    db.on('error', (error) => {
      winston.error('MongoDB connection error:', error);
      this.isConnected = false;
    });
    
    db.on('disconnected', () => {
      winston.warn('MongoDB disconnected');
      this.isConnected = false;
    });
    
    db.on('reconnected', () => {
      winston.info('MongoDB reconnected');
      this.isConnected = true;
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        winston.info('MongoDB connection closed');
        this.isConnected = false;
      }
    } catch (error) {
      winston.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  async dropDatabase() {
    try {
      if (this.isConnected) {
        await mongoose.connection.dropDatabase();
        winston.info('Database dropped successfully');
      }
    } catch (error) {
      winston.error('Error dropping database:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      winston.info('Creating database indexes...');
      
      // Get all models and create their indexes
      const models = mongoose.models;
      const indexPromises = Object.keys(models).map(async (modelName) => {
        const model = models[modelName];
        try {
          await model.createIndexes();
          winston.info(`Indexes created for ${modelName}`);
        } catch (error) {
          winston.error(`Failed to create indexes for ${modelName}:`, error);
        }
      });
      
      await Promise.all(indexPromises);
      winston.info('All database indexes created successfully');
    } catch (error) {
      winston.error('Error creating database indexes:', error);
      throw error;
    }
  }

  async seedDatabase() {
    try {
      winston.info('Seeding database with initial data...');
      
      // Import models
      const User = require('../models/User');
      const Config = require('../models/Config');
      const Article = require('../models/Article');
      
      // Initialize default configurations
      await Config.initializeDefaults();
      winston.info('Default configurations initialized');
      
      // Create default admin user if none exists
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const defaultAdmin = new User({
          email: 'admin@smarthelpdesk.com',
          password: 'admin123',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          emailVerified: true
        });
        await defaultAdmin.save();
        winston.info('Default admin user created');
      }
      
      // Create sample knowledge base articles if none exist
      const articleCount = await Article.countDocuments();
      if (articleCount === 0) {
        const admin = await User.findOne({ role: 'admin' });
        const sampleArticles = [
          {
            title: 'How to Reset Your Password',
            content: 'To reset your password, follow these steps:\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email address\n4. Check your email for reset instructions\n5. Follow the link in the email to create a new password',
            summary: 'Step-by-step guide for password reset',
            category: 'account',
            tags: ['password', 'reset', 'login', 'account'],
            status: 'published',
            author: admin._id,
            publishedAt: new Date()
          },
          {
            title: 'Understanding Your Bill',
            content: 'Your monthly bill includes:\n- Base subscription fee\n- Usage charges\n- Taxes and fees\n- Previous balance\n- Payments received\n\nFor detailed explanations of each charge, please refer to the billing section of your account.',
            summary: 'Explanation of billing components and charges',
            category: 'billing',
            tags: ['billing', 'charges', 'subscription', 'fees'],
            status: 'published',
            author: admin._id,
            publishedAt: new Date()
          },
          {
            title: 'Tracking Your Order',
            content: 'To track your order:\n1. Log into your account\n2. Go to "Order History"\n3. Find your order and click "Track"\n4. View real-time shipping updates\n\nYou will also receive email notifications at key shipping milestones.',
            summary: 'How to track order status and shipping updates',
            category: 'shipping',
            tags: ['shipping', 'tracking', 'orders', 'delivery'],
            status: 'published',
            author: admin._id,
            publishedAt: new Date()
          }
        ];
        
        await Article.insertMany(sampleArticles);
        winston.info('Sample knowledge base articles created');
      }
      
      winston.info('Database seeding completed successfully');
    } catch (error) {
      winston.error('Error seeding database:', error);
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }
      
      // Perform a simple query to test connection
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        connection: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
        connection: this.getConnectionStatus()
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
