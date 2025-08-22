#!/usr/bin/env node

/**
 * Database Seed Script
 * Seeds the database with sample users, KB articles, and tickets for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Article = require('../models/Article');
const Ticket = require('../models/Ticket');
const Config = require('../models/Config');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-helpdesk', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Sample data
const sampleUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    firstName: 'Agent',
    lastName: 'Smith',
    email: 'agent@example.com',
    password: 'agent123',
    role: 'agent'
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'user@example.com',
    password: 'user123',
    role: 'user'
  },
  {
    firstName: 'Jane',
    lastName: 'Customer',
    email: 'jane@example.com',
    password: 'user123',
    role: 'user'
  }
];

const sampleArticles = [
  {
    title: 'How to update payment method',
    content: `To update your payment method:

1. Log into your account
2. Navigate to Billing Settings
3. Click "Update Payment Method"
4. Enter your new card details
5. Click "Save Changes"

Your new payment method will be used for future charges. If you have any issues, please contact our billing support team.`,
    summary: 'Step-by-step guide to update payment information in your account',
    category: 'billing',
    tags: ['billing', 'payments', 'credit-card', 'account'],
    status: 'published'
  },
  {
    title: 'Troubleshooting 500 errors',
    content: `If you're experiencing 500 Internal Server Errors:

1. **Check your internet connection** - Ensure you have a stable connection
2. **Clear browser cache** - Clear cookies and cached data
3. **Try a different browser** - Test with Chrome, Firefox, or Safari
4. **Check our status page** - Visit status.example.com for known issues
5. **Wait and retry** - Server issues are often temporary

If the problem persists:
- Note the exact error message
- Record the time it occurred
- Contact technical support with these details

Our technical team monitors server performance 24/7 and will resolve issues quickly.`,
    summary: 'Comprehensive guide to diagnose and resolve 500 server errors',
    category: 'technical',
    tags: ['technical', 'errors', 'troubleshooting', 'server'],
    status: 'published'
  },
  {
    title: 'Tracking your shipment',
    content: `To track your order shipment:

**Online Tracking:**
1. Visit our tracking page
2. Enter your order number or tracking ID
3. View real-time shipment status

**Email Updates:**
- You'll receive automatic email notifications
- Tracking information is sent when items ship
- Delivery confirmation upon arrival

**Delivery Timeframes:**
- Standard shipping: 3-5 business days
- Express shipping: 1-2 business days
- International: 7-14 business days

**Common Issues:**
- Tracking not updating: Allow 24-48 hours after shipment
- Package delayed: Check for weather or holiday delays
- Missing package: Contact us within 48 hours of expected delivery`,
    summary: 'Complete guide to tracking orders and understanding delivery status',
    category: 'shipping',
    tags: ['shipping', 'delivery', 'tracking', 'orders'],
    status: 'published'
  },
  {
    title: 'Password reset instructions',
    content: `To reset your password:

**Self-Service Reset:**
1. Go to the login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your email for reset link
5. Click the link and create new password

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

**Security Tips:**
- Use a unique password for your account
- Consider using a password manager
- Enable two-factor authentication
- Never share your password

If you don't receive the reset email, check your spam folder or contact support.`,
    summary: 'Instructions for resetting forgotten passwords and security best practices',
    category: 'account',
    tags: ['account', 'password', 'security', 'login'],
    status: 'published'
  },
  {
    title: 'Getting started guide',
    content: `Welcome to our platform! Here's how to get started:

**Initial Setup:**
1. Complete your profile information
2. Verify your email address
3. Set up your preferences
4. Explore the dashboard

**Key Features:**
- Dashboard: Overview of your account
- Settings: Customize your experience
- Support: Get help when needed
- Documentation: Detailed guides and tutorials

**Next Steps:**
- Take the product tour
- Join our community forum
- Subscribe to our newsletter
- Follow us on social media

Need help? Our support team is available 24/7 to assist you.`,
    summary: 'Comprehensive onboarding guide for new users',
    category: 'general',
    tags: ['getting-started', 'onboarding', 'tutorial', 'guide'],
    status: 'published'
  }
];

const sampleTickets = [
  {
    subject: 'Refund for double charge',
    description: 'I was charged twice for order #1234. I only made one purchase but see two identical charges on my credit card statement. Please refund the duplicate charge.',
    category: 'billing',
    priority: 'medium'
  },
  {
    subject: 'App shows 500 error on login',
    description: 'When I try to log into the mobile app, I get a 500 internal server error. This started happening yesterday. I can log in fine on the website but not the app.',
    category: 'technical',
    priority: 'high'
  },
  {
    subject: 'Where is my package?',
    description: 'My order was supposed to arrive 5 days ago but I still haven\'t received it. The tracking shows it was shipped but no updates since then. Order number is #5678.',
    category: 'shipping',
    priority: 'medium'
  },
  {
    subject: 'Cannot reset password',
    description: 'I forgot my password and tried to reset it but I\'m not receiving the reset email. I\'ve checked my spam folder and tried multiple times.',
    category: 'account',
    priority: 'medium'
  },
  {
    subject: 'Feature request: Dark mode',
    description: 'Would love to see a dark mode option in the app. Many users have been asking for this feature and it would greatly improve the user experience.',
    category: 'general',
    priority: 'low'
  }
];

// Seed functions
const seedUsers = async () => {
  console.log('Seeding users...');
  
  for (const userData of sampleUsers) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      console.log(`Created user: ${userData.email}`);
    } else {
      console.log(`User already exists: ${userData.email}`);
    }
  }
};

const seedArticles = async () => {
  console.log('Seeding articles...');
  
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.error('Admin user not found. Please seed users first.');
    return;
  }

  for (const articleData of sampleArticles) {
    const existingArticle = await Article.findOne({ title: articleData.title });
    if (!existingArticle) {
      const article = new Article({
        ...articleData,
        author: adminUser._id,
        publishedAt: new Date()
      });
      await article.save();
      console.log(`Created article: ${articleData.title}`);
    } else {
      console.log(`Article already exists: ${articleData.title}`);
    }
  }
};

const seedTickets = async () => {
  console.log('Seeding tickets...');
  
  const users = await User.find({ role: 'user' });
  if (users.length === 0) {
    console.error('No users found. Please seed users first.');
    return;
  }

  for (let i = 0; i < sampleTickets.length; i++) {
    const ticketData = sampleTickets[i];
    const user = users[i % users.length]; // Rotate through users
    
    const existingTicket = await Ticket.findOne({ subject: ticketData.subject });
    if (!existingTicket) {
      const ticket = new Ticket({
        ...ticketData,
        requester: user._id
      });
      await ticket.save();
      console.log(`Created ticket: ${ticketData.subject}`);
    } else {
      console.log(`Ticket already exists: ${ticketData.subject}`);
    }
  }
};

const seedConfig = async () => {
  console.log('Seeding configuration...');
  await Config.initializeDefaults();
  console.log('Configuration initialized');
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');
    
    await connectDB();
    
    await seedUsers();
    await seedArticles();
    await seedTickets();
    await seedConfig();
    
    console.log('Database seeding completed successfully!');
    
    // Display login credentials
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin: admin@example.com / admin123');
    console.log('Agent: agent@example.com / agent123');
    console.log('User: user@example.com / user123');
    console.log('User: jane@example.com / user123');
    console.log('========================\n');
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
