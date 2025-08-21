/**
 * AI Processing Performance Tests
 * Benchmarks AI service performance under various loads
 */

const { performance } = require('perf_hooks');
const AIService = require('../../server/services/ai/AIService');
const QueueManager = require('../../server/services/ai/queue/QueueManager');

class AIPerformanceBenchmark {
  constructor() {
    this.results = {
      classification: [],
      responseGeneration: [],
      knowledgeSearch: [],
      batchProcessing: [],
      queuePerformance: [],
      summary: {}
    };
    
    this.aiService = new AIService();
  }

  async setup() {
    console.log('Setting up AI performance benchmark...');
    
    // Initialize AI service
    await this.aiService.initialize();
    
    // Create test tickets for processing
    this.testTickets = this.generateTestTickets(1000);
    
    console.log('AI performance benchmark setup completed');
  }

  generateTestTickets(count) {
    const subjects = [
      'Cannot login to my account',
      'Password reset not working',
      'Billing question about charges',
      'Technical issue with application',
      'Account locked after multiple attempts',
      'Need help with feature configuration',
      'Error message when uploading files',
      'Performance issues with dashboard',
      'Integration not working properly',
      'Data export functionality broken'
    ];

    const descriptions = [
      'I am having trouble accessing my account. When I try to login, it says my credentials are invalid.',
      'I requested a password reset but never received the email. Can you help me reset my password?',
      'I see some charges on my account that I do not recognize. Can you explain what these are for?',
      'The application keeps crashing when I try to perform certain actions. This is very frustrating.',
      'My account got locked after I entered the wrong password a few times. How can I unlock it?',
      'I need assistance configuring the advanced features. The documentation is not clear enough.',
      'Every time I try to upload a file, I get an error message. The file size is within limits.',
      'The dashboard is loading very slowly and sometimes times out completely.',
      'The API integration is not working as expected. I am getting authentication errors.',
      'When I try to export my data, the process fails and I get a generic error message.'
    ];

    const tickets = [];
    for (let i = 0; i < count; i++) {
      tickets.push({
        _id: `test-ticket-${i}`,
        subject: subjects[i % subjects.length],
        description: descriptions[i % descriptions.length],
        priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
        category: ['technical', 'billing', 'account', 'general'][Math.floor(Math.random() * 4)],
        requester: `user-${i}`,
        createdAt: new Date()
      });
    }

    return tickets;
  }

  async benchmarkClassification(iterations = 100) {
    console.log('\n=== AI Classification Benchmark ===');
    
    const times = [];
    const accuracyScores = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const ticket = this.testTickets[i % this.testTickets.length];
      
      try {
        const start = performance.now();
        const result = await this.aiService.classifyTicket(ticket);
        const end = performance.now();
        
        times.push(end - start);
        accuracyScores.push(result.confidence || 0);
        
        if (i % 10 === 0) {
          process.stdout.write(`\rClassification progress: ${i + 1}/${iterations}`);
        }
      } catch (error) {
        errors++;
        console.error(`Classification error for ticket ${i}:`, error.message);
      }
    }

    const result = {
      name: 'AI Classification',
      iterations,
      errors,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      p95Time: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      avgAccuracy: accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length,
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000) // requests per second
    };

    this.results.classification.push(result);
    console.log(`\nClassification Results:`);
    console.log(`  Average Time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  P95 Time: ${result.p95Time.toFixed(2)}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
    console.log(`  Average Accuracy: ${(result.avgAccuracy * 100).toFixed(2)}%`);
    console.log(`  Errors: ${errors}`);

    return result;
  }

  async benchmarkResponseGeneration(iterations = 50) {
    console.log('\n=== AI Response Generation Benchmark ===');
    
    const times = [];
    const qualityScores = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const ticket = this.testTickets[i % this.testTickets.length];
      
      try {
        const start = performance.now();
        const result = await this.aiService.generateResponse(ticket);
        const end = performance.now();
        
        times.push(end - start);
        qualityScores.push(result.confidence || 0);
        
        if (i % 5 === 0) {
          process.stdout.write(`\rResponse generation progress: ${i + 1}/${iterations}`);
        }
      } catch (error) {
        errors++;
        console.error(`Response generation error for ticket ${i}:`, error.message);
      }
    }

    const result = {
      name: 'AI Response Generation',
      iterations,
      errors,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      p95Time: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      avgQuality: qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length,
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000)
    };

    this.results.responseGeneration.push(result);
    console.log(`\nResponse Generation Results:`);
    console.log(`  Average Time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  P95 Time: ${result.p95Time.toFixed(2)}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
    console.log(`  Average Quality: ${(result.avgQuality * 100).toFixed(2)}%`);
    console.log(`  Errors: ${errors}`);

    return result;
  }

  async benchmarkKnowledgeSearch(iterations = 100) {
    console.log('\n=== Knowledge Search Benchmark ===');
    
    const searchQueries = [
      'password reset',
      'login issues',
      'billing questions',
      'account locked',
      'technical problems',
      'file upload errors',
      'performance issues',
      'integration problems',
      'data export',
      'configuration help'
    ];

    const times = [];
    const relevanceScores = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const query = searchQueries[i % searchQueries.length];
      
      try {
        const start = performance.now();
        const results = await this.aiService.searchKnowledge(query);
        const end = performance.now();
        
        times.push(end - start);
        
        // Calculate average relevance score
        const avgRelevance = results.length > 0 
          ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
          : 0;
        relevanceScores.push(avgRelevance);
        
        if (i % 10 === 0) {
          process.stdout.write(`\rKnowledge search progress: ${i + 1}/${iterations}`);
        }
      } catch (error) {
        errors++;
        console.error(`Knowledge search error for query ${i}:`, error.message);
      }
    }

    const result = {
      name: 'Knowledge Search',
      iterations,
      errors,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      p95Time: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      avgRelevance: relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length,
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000)
    };

    this.results.knowledgeSearch.push(result);
    console.log(`\nKnowledge Search Results:`);
    console.log(`  Average Time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  P95 Time: ${result.p95Time.toFixed(2)}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
    console.log(`  Average Relevance: ${(result.avgRelevance * 100).toFixed(2)}%`);
    console.log(`  Errors: ${errors}`);

    return result;
  }

  async benchmarkBatchProcessing() {
    console.log('\n=== Batch Processing Benchmark ===');
    
    const batchSizes = [10, 25, 50, 100];
    
    for (const batchSize of batchSizes) {
      console.log(`\nTesting batch size: ${batchSize}`);
      
      const batch = this.testTickets.slice(0, batchSize);
      let errors = 0;
      
      const start = performance.now();
      
      try {
        const promises = batch.map(ticket => 
          this.aiService.processTicket(ticket._id).catch(err => {
            errors++;
            return null;
          })
        );
        
        const results = await Promise.all(promises);
        const end = performance.now();
        
        const totalTime = end - start;
        const successfulResults = results.filter(r => r !== null);
        
        const result = {
          batchSize,
          totalTime,
          avgTimePerTicket: totalTime / batchSize,
          throughput: batchSize / (totalTime / 1000),
          successRate: (successfulResults.length / batchSize) * 100,
          errors
        };
        
        this.results.batchProcessing.push(result);
        
        console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
        console.log(`  Avg Time per Ticket: ${result.avgTimePerTicket.toFixed(2)}ms`);
        console.log(`  Throughput: ${result.throughput.toFixed(2)} tickets/s`);
        console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
        console.log(`  Errors: ${errors}`);
        
      } catch (error) {
        console.error(`Batch processing failed for size ${batchSize}:`, error.message);
      }
    }
  }

  async benchmarkQueuePerformance() {
    console.log('\n=== Queue Performance Benchmark ===');
    
    const queueManager = new QueueManager();
    await queueManager.initialize();
    
    // Test queue throughput
    const jobCount = 100;
    const jobs = [];
    
    console.log(`Adding ${jobCount} jobs to queue...`);
    const start = performance.now();
    
    for (let i = 0; i < jobCount; i++) {
      const ticket = this.testTickets[i % this.testTickets.length];
      jobs.push(queueManager.addJob('ai-processing', {
        ticketId: ticket._id,
        type: 'classification'
      }));
    }
    
    await Promise.all(jobs);
    const addTime = performance.now() - start;
    
    console.log(`Jobs added in ${addTime.toFixed(2)}ms`);
    
    // Monitor queue processing
    const processingStart = performance.now();
    let processedJobs = 0;
    
    const checkInterval = setInterval(async () => {
      const stats = await queueManager.getQueueStats('ai-processing');
      const newProcessedJobs = stats.completed + stats.failed;
      
      if (newProcessedJobs > processedJobs) {
        processedJobs = newProcessedJobs;
        console.log(`Processed: ${processedJobs}/${jobCount} jobs`);
      }
      
      if (processedJobs >= jobCount) {
        clearInterval(checkInterval);
        const processingTime = performance.now() - processingStart;
        
        const result = {
          jobCount,
          addTime,
          processingTime,
          throughput: jobCount / (processingTime / 1000),
          avgProcessingTime: processingTime / jobCount
        };
        
        this.results.queuePerformance.push(result);
        
        console.log(`\nQueue Performance Results:`);
        console.log(`  Job Addition Time: ${addTime.toFixed(2)}ms`);
        console.log(`  Total Processing Time: ${processingTime.toFixed(2)}ms`);
        console.log(`  Throughput: ${result.throughput.toFixed(2)} jobs/s`);
        console.log(`  Avg Processing Time: ${result.avgProcessingTime.toFixed(2)}ms`);
      }
    }, 1000);
  }

  generateReport() {
    console.log('\n=== AI Performance Report ===');
    
    const summary = {
      classification: this.results.classification[0],
      responseGeneration: this.results.responseGeneration[0],
      knowledgeSearch: this.results.knowledgeSearch[0],
      batchProcessing: this.results.batchProcessing,
      queuePerformance: this.results.queuePerformance[0]
    };

    // Performance thresholds (SLA requirements)
    const thresholds = {
      classification: { maxTime: 2000, minThroughput: 10 },
      responseGeneration: { maxTime: 5000, minThroughput: 5 },
      knowledgeSearch: { maxTime: 1000, minThroughput: 20 }
    };

    console.log('\nPerformance Summary:');
    
    Object.entries(summary).forEach(([key, result]) => {
      if (result && key !== 'batchProcessing') {
        const threshold = thresholds[key];
        const timeStatus = threshold && result.avgTime <= threshold.maxTime ? '✓' : '✗';
        const throughputStatus = threshold && result.throughput >= threshold.minThroughput ? '✓' : '✗';
        
        console.log(`\n${key}:`);
        console.log(`  Average Time: ${result.avgTime?.toFixed(2)}ms ${timeStatus}`);
        console.log(`  Throughput: ${result.throughput?.toFixed(2)} req/s ${throughputStatus}`);
      }
    });

    // Generate recommendations
    const recommendations = [];
    
    if (summary.classification?.avgTime > 2000) {
      recommendations.push('Classification performance is below SLA - consider model optimization');
    }
    
    if (summary.responseGeneration?.avgTime > 5000) {
      recommendations.push('Response generation is slow - consider caching or model tuning');
    }
    
    if (summary.knowledgeSearch?.avgTime > 1000) {
      recommendations.push('Knowledge search needs optimization - check indexing and query efficiency');
    }

    if (recommendations.length === 0) {
      recommendations.push('AI performance is within acceptable limits');
    }

    console.log('\nRecommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    this.results.summary = {
      ...summary,
      recommendations,
      timestamp: new Date().toISOString()
    };

    return this.results;
  }

  async run() {
    try {
      await this.setup();
      
      await this.benchmarkClassification();
      await this.benchmarkResponseGeneration();
      await this.benchmarkKnowledgeSearch();
      await this.benchmarkBatchProcessing();
      await this.benchmarkQueuePerformance();
      
      const report = this.generateReport();
      
      // Save report
      const fs = require('fs');
      fs.writeFileSync(
        'ai-performance-results.json',
        JSON.stringify(report, null, 2)
      );
      
      console.log('\nAI performance benchmark completed. Results saved to ai-performance-results.json');
      
    } catch (error) {
      console.error('AI performance benchmark failed:', error);
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new AIPerformanceBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = AIPerformanceBenchmark;
