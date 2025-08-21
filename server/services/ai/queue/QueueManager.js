/**
 * AI Queue Manager
 * Manages Redis-based job queues for asynchronous AI processing
 */

const Queue = require('bull');
const Redis = require('redis');
const logger = require('../../../config/logger');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.processors = new Map();
    this.redisClient = null;
    this.isInitialized = false;
    this.defaultJobOptions = {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };
  }

  /**
   * Initialize queue manager with Redis connection
   */
  async initialize(config = {}) {
    try {
      logger.info('Initializing AI Queue Manager...');
      
      const redisConfig = config.queue?.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      };

      // Create Redis client for health checks
      this.redisClient = Redis.createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port
        },
        password: redisConfig.password,
        database: redisConfig.db
      });

      await this.redisClient.connect();
      
      // Initialize queues
      await this.createQueues(redisConfig, config);
      
      this.isInitialized = true;
      logger.info('AI Queue Manager initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize AI Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Create and configure queues
   */
  async createQueues(redisConfig, config) {
    const queueNames = [
      'ticket-processing',
      'knowledge-indexing',
      'response-generation',
      'confidence-calculation',
      'auto-resolution'
    ];

    for (const queueName of queueNames) {
      const queue = new Queue(queueName, {
        redis: redisConfig,
        defaultJobOptions: this.defaultJobOptions,
        settings: {
          stalledInterval: 30 * 1000, // 30 seconds
          maxStalledCount: 1,
        }
      });

      // Set up event listeners
      this.setupQueueEventListeners(queue, queueName);
      
      // Configure concurrency
      const concurrency = config.queue?.concurrency?.[queueName] || 3;
      queue.concurrency = concurrency;
      
      this.queues.set(queueName, queue);
      logger.info(`Created queue: ${queueName} with concurrency: ${concurrency}`);
    }
  }

  /**
   * Set up event listeners for queue monitoring
   */
  setupQueueEventListeners(queue, queueName) {
    queue.on('completed', (job, result) => {
      logger.debug(`Job ${job.id} completed in queue ${queueName}`, {
        jobId: job.id,
        queue: queueName,
        processingTime: Date.now() - job.timestamp,
        result: result
      });
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed in queue ${queueName}:`, {
        jobId: job.id,
        queue: queueName,
        error: err.message,
        attempts: job.attemptsMade,
        data: job.data
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue ${queueName}`, {
        jobId: job.id,
        queue: queueName,
        data: job.data
      });
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress in queue ${queueName}: ${progress}%`, {
        jobId: job.id,
        queue: queueName,
        progress: progress
      });
    });
  }

  /**
   * Add a processor for a specific queue
   */
  addProcessor(queueName, processor, concurrency = null) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    // Store processor for health checks
    this.processors.set(queueName, processor);

    // Set up the processor
    const processorConcurrency = concurrency || queue.concurrency || 3;
    
    queue.process(processorConcurrency, async (job) => {
      const startTime = Date.now();
      
      try {
        logger.debug(`Processing job ${job.id} in queue ${queueName}`, {
          jobId: job.id,
          queue: queueName,
          data: job.data
        });

        // Update job progress
        await job.progress(10);
        
        // Execute the processor
        const result = await processor(job);
        
        // Update job progress
        await job.progress(100);
        
        const processingTime = Date.now() - startTime;
        logger.info(`Job ${job.id} completed successfully in ${processingTime}ms`, {
          jobId: job.id,
          queue: queueName,
          processingTime: processingTime
        });
        
        return result;
        
      } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error(`Job ${job.id} failed after ${processingTime}ms:`, {
          jobId: job.id,
          queue: queueName,
          error: error.message,
          processingTime: processingTime
        });
        
        throw error;
      }
    });

    logger.info(`Added processor for queue ${queueName} with concurrency ${processorConcurrency}`);
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName, data, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const jobOptions = {
      ...this.defaultJobOptions,
      ...options,
      timestamp: Date.now()
    };

    try {
      const job = await queue.add(data, jobOptions);
      
      logger.info(`Added job ${job.id} to queue ${queueName}`, {
        jobId: job.id,
        queue: queueName,
        priority: jobOptions.priority,
        delay: jobOptions.delay
      });
      
      return job;
      
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        queue: queueName,
        data: job.data,
        progress: job.progress(),
        state: await job.getState(),
        createdAt: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue
      };
      
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId} in queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        queue: queueName,
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        },
        concurrency: queue.concurrency
      };
      
    } catch (error) {
      logger.error(`Failed to get stats for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Paused queue: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Resumed queue: ${queueName}`);
  }

  /**
   * Clean completed/failed jobs from a queue
   */
  async cleanQueue(queueName, grace = 24 * 60 * 60 * 1000) { // 24 hours
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const [completedCleaned, failedCleaned] = await Promise.all([
        queue.clean(grace, 'completed'),
        queue.clean(grace, 'failed')
      ]);

      logger.info(`Cleaned queue ${queueName}: ${completedCleaned} completed, ${failedCleaned} failed jobs`);
      
      return {
        queue: queueName,
        cleaned: {
          completed: completedCleaned,
          failed: failedCleaned
        }
      };
      
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get health status of all queues
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      redis: 'disconnected',
      queues: {}
    };

    try {
      // Check Redis connection
      await this.redisClient.ping();
      health.redis = 'connected';
      
      // Check each queue
      for (const [queueName, queue] of this.queues) {
        try {
          const stats = await this.getQueueStats(queueName);
          health.queues[queueName] = {
            status: 'healthy',
            ...stats
          };
        } catch (error) {
          health.queues[queueName] = {
            status: 'unhealthy',
            error: error.message
          };
          health.status = 'degraded';
        }
      }
      
    } catch (error) {
      health.redis = 'error';
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down AI Queue Manager...');
    
    try {
      // Close all queues
      for (const [queueName, queue] of this.queues) {
        await queue.close();
        logger.info(`Closed queue: ${queueName}`);
      }
      
      // Close Redis client
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      this.isInitialized = false;
      logger.info('AI Queue Manager shutdown complete');
      
    } catch (error) {
      logger.error('Error during AI Queue Manager shutdown:', error);
      throw error;
    }
  }
}

module.exports = QueueManager;
