/**
 * Database Performance Benchmark
 * Tests MongoDB query performance and identifies bottlenecks
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

// Import models
const User = require('../../server/models/User');
const Ticket = require('../../server/models/Ticket');
const KnowledgeArticle = require('../../server/models/KnowledgeArticle');
const AISuggestion = require('../../server/models/AISuggestion');

class DatabaseBenchmark {
  constructor() {
    this.results = {
      queries: [],
      aggregations: [],
      indexes: [],
      summary: {}
    };
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-helpdesk-benchmark';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for benchmarking');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  async setupTestData() {
    console.log('Setting up test data...');
    
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Ticket.deleteMany({}),
      KnowledgeArticle.deleteMany({}),
      AISuggestion.deleteMany({})
    ]);

    // Create test users
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push({
        email: `user${i}@benchmark.test`,
        password: 'hashedpassword',
        firstName: `User${i}`,
        lastName: 'Test',
        role: i < 50 ? 'agent' : i < 100 ? 'admin' : 'customer',
        isActive: Math.random() > 0.1, // 90% active
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }
    await User.insertMany(users);

    // Create test tickets
    const tickets = [];
    const userIds = await User.find({}).select('_id');
    const agentIds = userIds.filter((_, i) => i < 50).map(u => u._id);
    const customerIds = userIds.filter((_, i) => i >= 100).map(u => u._id);

    for (let i = 0; i < 10000; i++) {
      const createdAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      tickets.push({
        subject: `Benchmark Ticket ${i}`,
        description: `This is a benchmark ticket description for ticket ${i}. It contains some sample text to simulate real ticket content.`,
        priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
        status: ['open', 'in_progress', 'resolved', 'closed'][Math.floor(Math.random() * 4)],
        category: ['technical', 'billing', 'account', 'general'][Math.floor(Math.random() * 4)],
        requester: customerIds[Math.floor(Math.random() * customerIds.length)],
        assignee: Math.random() > 0.3 ? agentIds[Math.floor(Math.random() * agentIds.length)] : null,
        tags: [`tag${Math.floor(Math.random() * 20)}`, `category${Math.floor(Math.random() * 10)}`],
        createdAt,
        updatedAt: new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }
    await Ticket.insertMany(tickets);

    // Create knowledge articles
    const articles = [];
    const adminIds = userIds.filter((_, i) => i >= 50 && i < 100).map(u => u._id);

    for (let i = 0; i < 500; i++) {
      articles.push({
        title: `Knowledge Article ${i}`,
        content: `This is the content for knowledge article ${i}. It contains detailed information about various topics including troubleshooting, account management, and technical support procedures.`,
        category: ['technical', 'billing', 'account', 'general'][Math.floor(Math.random() * 4)],
        tags: [`help${Math.floor(Math.random() * 10)}`, `guide${Math.floor(Math.random() * 5)}`],
        isPublished: Math.random() > 0.2, // 80% published
        author: adminIds[Math.floor(Math.random() * adminIds.length)],
        viewCount: Math.floor(Math.random() * 1000),
        helpfulCount: Math.floor(Math.random() * 100),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }
    await KnowledgeArticle.insertMany(articles);

    // Create AI suggestions
    const suggestions = [];
    const ticketIds = await Ticket.find({}).select('_id').limit(5000);

    for (let i = 0; i < 5000; i++) {
      suggestions.push({
        ticketId: ticketIds[i]._id,
        type: ['classification', 'response', 'routing'][Math.floor(Math.random() * 3)],
        status: ['pending_review', 'approved', 'rejected', 'modified'][Math.floor(Math.random() * 4)],
        classification: {
          category: { category: 'technical', confidence: Math.random() },
          priority: { priority: 'medium', confidence: Math.random() }
        },
        confidence: {
          overall: Math.random(),
          calibrated: Math.random()
        },
        processingTime: Math.floor(Math.random() * 5000) + 500,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    await AISuggestion.insertMany(suggestions);

    console.log('Test data setup completed');
  }

  async benchmarkQuery(name, queryFn, iterations = 100) {
    console.log(`Benchmarking: ${name}`);
    
    const times = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        await queryFn();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        errors++;
        console.error(`Error in ${name}:`, error.message);
      }
    }

    const result = {
      name,
      iterations,
      errors,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      p95Time: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      p99Time: times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)]
    };

    this.results.queries.push(result);
    console.log(`  Average: ${result.avgTime.toFixed(2)}ms, P95: ${result.p95Time.toFixed(2)}ms, Errors: ${errors}`);
    
    return result;
  }

  async runQueryBenchmarks() {
    console.log('\n=== Query Benchmarks ===');

    // User queries
    await this.benchmarkQuery('Find user by email', async () => {
      await User.findOne({ email: 'user500@benchmark.test' });
    });

    await this.benchmarkQuery('Find active users', async () => {
      await User.find({ isActive: true }).limit(20);
    });

    // Ticket queries
    await this.benchmarkQuery('Find tickets by status', async () => {
      await Ticket.find({ status: 'open' }).limit(20);
    });

    await this.benchmarkQuery('Find tickets by assignee', async () => {
      const user = await User.findOne({ role: 'agent' });
      await Ticket.find({ assignee: user._id }).limit(20);
    });

    await this.benchmarkQuery('Find tickets with pagination', async () => {
      await Ticket.find({})
        .populate('requester', 'firstName lastName email')
        .populate('assignee', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20)
        .skip(100);
    });

    await this.benchmarkQuery('Search tickets by text', async () => {
      await Ticket.find({
        $or: [
          { subject: { $regex: 'benchmark', $options: 'i' } },
          { description: { $regex: 'benchmark', $options: 'i' } }
        ]
      }).limit(20);
    });

    // Knowledge base queries
    await this.benchmarkQuery('Search knowledge articles', async () => {
      await KnowledgeArticle.find({
        $and: [
          { isPublished: true },
          {
            $or: [
              { title: { $regex: 'article', $options: 'i' } },
              { content: { $regex: 'article', $options: 'i' } }
            ]
          }
        ]
      }).limit(10);
    });

    await this.benchmarkQuery('Find articles by category', async () => {
      await KnowledgeArticle.find({ 
        category: 'technical', 
        isPublished: true 
      }).sort({ viewCount: -1 }).limit(10);
    });

    // AI suggestion queries
    await this.benchmarkQuery('Find pending AI suggestions', async () => {
      await AISuggestion.find({ status: 'pending_review' })
        .populate('ticketId', 'subject priority')
        .sort({ createdAt: -1 })
        .limit(20);
    });
  }

  async runAggregationBenchmarks() {
    console.log('\n=== Aggregation Benchmarks ===');

    await this.benchmarkQuery('Ticket statistics by status', async () => {
      await Ticket.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgProcessingTime: { $avg: '$processingTime' }
          }
        }
      ]);
    }, 50);

    await this.benchmarkQuery('Monthly ticket trends', async () => {
      await Ticket.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]);
    }, 50);

    await this.benchmarkQuery('Agent performance metrics', async () => {
      await Ticket.aggregate([
        { $match: { assignee: { $ne: null } } },
        {
          $group: {
            _id: '$assignee',
            totalTickets: { $sum: 1 },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            avgResolutionTime: {
              $avg: {
                $subtract: ['$updatedAt', '$createdAt']
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent'
          }
        }
      ]);
    }, 30);

    await this.benchmarkQuery('AI suggestion accuracy', async () => {
      await AISuggestion.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence.overall' },
            avgProcessingTime: { $avg: '$processingTime' }
          }
        }
      ]);
    }, 50);
  }

  async checkIndexes() {
    console.log('\n=== Index Analysis ===');

    const collections = ['users', 'tickets', 'knowledgearticles', 'aisuggestions'];
    
    for (const collectionName of collections) {
      const collection = mongoose.connection.db.collection(collectionName);
      const indexes = await collection.indexes();
      
      console.log(`\n${collectionName} indexes:`);
      indexes.forEach(index => {
        console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
      });

      this.results.indexes.push({
        collection: collectionName,
        indexes: indexes.length,
        indexDetails: indexes
      });
    }
  }

  async analyzeSlowQueries() {
    console.log('\n=== Slow Query Analysis ===');
    
    // Enable profiling for slow queries (>100ms)
    await mongoose.connection.db.admin().command({
      profile: 2,
      slowms: 100
    });

    // Run some complex queries to generate profile data
    await this.benchmarkQuery('Complex ticket search', async () => {
      await Ticket.find({
        $and: [
          { status: { $in: ['open', 'in_progress'] } },
          { priority: { $in: ['high', 'urgent'] } },
          { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      })
      .populate('requester')
      .populate('assignee')
      .sort({ priority: -1, createdAt: -1 })
      .limit(50);
    }, 10);

    // Get profiling data
    const profileData = await mongoose.connection.db.collection('system.profile')
      .find({})
      .sort({ ts: -1 })
      .limit(10)
      .toArray();

    console.log('Recent slow queries:');
    profileData.forEach((query, index) => {
      console.log(`  ${index + 1}. Duration: ${query.millis}ms - ${query.command?.find || 'Unknown'}`);
    });

    // Disable profiling
    await mongoose.connection.db.admin().command({ profile: 0 });
  }

  generateReport() {
    console.log('\n=== Performance Report ===');
    
    const queryResults = this.results.queries;
    const slowQueries = queryResults.filter(q => q.avgTime > 100);
    const fastQueries = queryResults.filter(q => q.avgTime <= 100);

    console.log(`\nQuery Performance Summary:`);
    console.log(`- Total queries tested: ${queryResults.length}`);
    console.log(`- Fast queries (<100ms): ${fastQueries.length}`);
    console.log(`- Slow queries (>100ms): ${slowQueries.length}`);
    
    if (slowQueries.length > 0) {
      console.log('\nSlow Queries (need optimization):');
      slowQueries.forEach(query => {
        console.log(`  - ${query.name}: ${query.avgTime.toFixed(2)}ms avg, ${query.p95Time.toFixed(2)}ms P95`);
      });
    }

    console.log('\nRecommendations:');
    
    // Generate recommendations based on results
    const recommendations = [];
    
    if (slowQueries.some(q => q.name.includes('text') || q.name.includes('search'))) {
      recommendations.push('Consider adding text indexes for search queries');
    }
    
    if (slowQueries.some(q => q.name.includes('pagination'))) {
      recommendations.push('Optimize pagination queries with proper indexing');
    }
    
    if (slowQueries.some(q => q.name.includes('populate'))) {
      recommendations.push('Consider denormalizing frequently populated fields');
    }

    if (recommendations.length === 0) {
      recommendations.push('Database performance is within acceptable limits');
    }

    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    // Save detailed results
    this.results.summary = {
      totalQueries: queryResults.length,
      fastQueries: fastQueries.length,
      slowQueries: slowQueries.length,
      averageQueryTime: queryResults.reduce((sum, q) => sum + q.avgTime, 0) / queryResults.length,
      recommendations
    };

    return this.results;
  }

  async run() {
    try {
      await this.connect();
      await this.setupTestData();
      await this.checkIndexes();
      await this.runQueryBenchmarks();
      await this.runAggregationBenchmarks();
      await this.analyzeSlowQueries();
      
      const report = this.generateReport();
      
      // Save report to file
      const fs = require('fs');
      fs.writeFileSync(
        'database-benchmark-results.json',
        JSON.stringify(report, null, 2)
      );
      
      console.log('\nBenchmark completed. Results saved to database-benchmark-results.json');
      
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new DatabaseBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = DatabaseBenchmark;
