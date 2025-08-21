/**
 * Response Engine
 * Intelligent response generation with template-based and LLM-powered options
 */

const OpenAI = require('openai');
const compromise = require('compromise');
const logger = require('../../../config/logger');

class ResponseEngine {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.openai = null;
    this.templates = new Map();
    this.responseCache = new Map();
    this.rateLimiter = new Map();
  }

  /**
   * Initialize the response engine
   */
  async initialize(config) {
    try {
      logger.info('Initializing Response Engine...');
      
      this.config = config;
      
      // Initialize OpenAI if enabled
      if (config.openai?.enabled && config.openai?.apiKey) {
        this.openai = new OpenAI({
          apiKey: config.openai.apiKey,
        });
        logger.info('OpenAI client initialized');
      }
      
      // Load response templates
      await this.loadResponseTemplates();
      
      // Initialize rate limiter
      this.initializeRateLimiter();
      
      this.isInitialized = true;
      logger.info('Response Engine initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Response Engine:', error);
      throw error;
    }
  }

  /**
   * Load response templates
   */
  async loadResponseTemplates() {
    // Password reset template
    this.templates.set('password_reset', {
      category: 'account',
      priority: ['low', 'medium'],
      template: `Hello {{customerName}},

Thank you for contacting us about your password reset request.

To reset your password, please follow these steps:
1. Go to our login page
2. Click on "Forgot Password"
3. Enter your email address
4. Check your email for reset instructions
5. Follow the link in the email to create a new password

{{#if knowledgeArticles}}
For more detailed instructions, please refer to:
{{#each knowledgeArticles}}
- {{title}}: {{url}}
{{/each}}
{{/if}}

If you continue to experience issues, please don't hesitate to reach out to us.

Best regards,
{{agentName}}
Support Team`,
      confidence: 0.9
    });

    // Account unlock template
    this.templates.set('account_unlock', {
      category: 'account',
      priority: ['low', 'medium', 'high'],
      template: `Hello {{customerName}},

I understand you're having trouble accessing your account. I'm here to help you resolve this issue.

{{#if accountLocked}}
Your account appears to be temporarily locked for security reasons. This typically happens after multiple unsuccessful login attempts.

To unlock your account:
1. Wait 15 minutes for the automatic unlock
2. Or use the "Unlock Account" option on our login page
3. If neither works, I can manually unlock it for you

{{else}}
Let me help you troubleshoot the login issue:
1. Verify you're using the correct email address
2. Check if Caps Lock is enabled
3. Try resetting your password if needed
{{/if}}

{{#if knowledgeArticles}}
Additional resources:
{{#each knowledgeArticles}}
- {{title}}: {{url}}
{{/each}}
{{/if}}

Please let me know if you need any further assistance.

Best regards,
{{agentName}}
Support Team`,
      confidence: 0.85
    });

    // Technical issue template
    this.templates.set('technical_issue', {
      category: 'technical',
      priority: ['medium', 'high', 'urgent'],
      template: `Hello {{customerName}},

Thank you for reporting this technical issue. I understand how frustrating this can be, and I'm here to help resolve it quickly.

Based on your description, here are some initial troubleshooting steps:

{{#if troubleshootingSteps}}
{{#each troubleshootingSteps}}
{{@index}}. {{this}}
{{/each}}
{{else}}
1. Clear your browser cache and cookies
2. Try using a different browser or incognito mode
3. Check your internet connection
4. Disable browser extensions temporarily
{{/if}}

{{#if knowledgeArticles}}
I've also found these helpful resources:
{{#each knowledgeArticles}}
- {{title}}: {{url}}
{{/each}}
{{/if}}

If these steps don't resolve the issue, I'll escalate this to our technical team for further investigation. Please provide any error messages or screenshots if available.

Best regards,
{{agentName}}
Support Team`,
      confidence: 0.75
    });

    // General inquiry template
    this.templates.set('general_inquiry', {
      category: 'general',
      priority: ['low', 'medium'],
      template: `Hello {{customerName}},

Thank you for reaching out to us. I'm happy to help with your inquiry.

{{#if knowledgeArticles}}
Based on your question, I found these relevant resources that should help:

{{#each knowledgeArticles}}
- {{title}}: {{url}}
  {{summary}}

{{/each}}
{{else}}
I'd be happy to provide more specific assistance. Could you please provide additional details about what you're looking for?
{{/if}}

If you need any clarification or have additional questions, please don't hesitate to ask.

Best regards,
{{agentName}}
Support Team`,
      confidence: 0.7
    });

    logger.info(`Loaded ${this.templates.size} response templates`);
  }

  /**
   * Initialize rate limiter for external API calls
   */
  initializeRateLimiter() {
    this.rateLimiter.set('openai', {
      requests: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      limit: this.config.openai?.rateLimitPerMinute || 60
    });
  }

  /**
   * Generate response for a ticket
   */
  async generate(ticketData, classification, knowledgeMatches) {
    try {
      if (!this.isInitialized) {
        throw new Error('Response Engine not initialized');
      }

      logger.debug(`Generating response for ticket: ${ticketData.id}`);
      
      const response = {
        ticketId: ticketData.id,
        content: '',
        type: 'template', // 'template', 'llm', 'hybrid'
        confidence: 0,
        source: '',
        metadata: {
          template: null,
          knowledgeUsed: knowledgeMatches?.length || 0,
          generationTime: 0
        }
      };

      const startTime = Date.now();
      
      // Determine generation strategy
      const strategy = this.determineGenerationStrategy(classification, knowledgeMatches);
      
      switch (strategy) {
        case 'template':
          await this.generateTemplateResponse(response, ticketData, classification, knowledgeMatches);
          break;
        case 'llm':
          await this.generateLLMResponse(response, ticketData, classification, knowledgeMatches);
          break;
        case 'hybrid':
          await this.generateHybridResponse(response, ticketData, classification, knowledgeMatches);
          break;
        default:
          await this.generateFallbackResponse(response, ticketData, classification, knowledgeMatches);
      }
      
      response.metadata.generationTime = Date.now() - startTime;
      
      // Post-process response
      await this.postProcessResponse(response, ticketData);
      
      logger.debug(`Generated ${response.type} response for ticket ${ticketData.id} in ${response.metadata.generationTime}ms`);
      
      return response;
      
    } catch (error) {
      logger.error(`Failed to generate response for ticket ${ticketData.id}:`, error);
      
      // Return fallback response
      return {
        ticketId: ticketData.id,
        content: this.getFallbackResponse(ticketData),
        type: 'fallback',
        confidence: 0.3,
        source: 'fallback',
        metadata: {
          error: error.message,
          generationTime: 0
        }
      };
    }
  }

  /**
   * Determine the best generation strategy
   */
  determineGenerationStrategy(classification, knowledgeMatches) {
    const engine = this.config.responseGeneration?.engine || 'template';
    
    // Force template for high-confidence classifications with good templates
    if (classification?.confidence > 0.8 && this.hasGoodTemplate(classification)) {
      return 'template';
    }
    
    // Use LLM for complex issues if available
    if (engine === 'llm' && this.openai && knowledgeMatches?.length > 0) {
      return 'llm';
    }
    
    // Use hybrid approach
    if (engine === 'hybrid' && this.openai) {
      return 'hybrid';
    }
    
    return 'template';
  }

  /**
   * Check if we have a good template for the classification
   */
  hasGoodTemplate(classification) {
    const category = classification.category?.category;
    const priority = classification.priority?.priority;
    
    for (const [templateId, template] of this.templates) {
      if (template.category === category && 
          template.priority.includes(priority)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate template-based response
   */
  async generateTemplateResponse(response, ticketData, classification, knowledgeMatches) {
    const category = classification?.category?.category || 'general';
    const priority = classification?.priority?.priority || 'medium';
    
    // Find best matching template
    let bestTemplate = null;
    let bestScore = 0;
    
    for (const [templateId, template] of this.templates) {
      let score = 0;
      
      if (template.category === category) score += 0.5;
      if (template.priority.includes(priority)) score += 0.3;
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = { id: templateId, ...template };
      }
    }
    
    if (!bestTemplate) {
      bestTemplate = this.templates.get('general_inquiry');
    }
    
    // Prepare template variables
    const variables = {
      customerName: this.getCustomerName(ticketData),
      agentName: 'Support Agent', // Could be dynamic
      knowledgeArticles: knowledgeMatches?.slice(0, 3) || [],
      troubleshootingSteps: this.generateTroubleshootingSteps(classification),
      accountLocked: this.detectAccountLocked(ticketData)
    };
    
    // Render template
    response.content = this.renderTemplate(bestTemplate.template, variables);
    response.type = 'template';
    response.confidence = bestTemplate.confidence * bestScore;
    response.source = bestTemplate.id;
    response.metadata.template = bestTemplate.id;
  }

  /**
   * Generate LLM-powered response
   */
  async generateLLMResponse(response, ticketData, classification, knowledgeMatches) {
    if (!this.openai || !this.checkRateLimit('openai')) {
      throw new Error('OpenAI not available or rate limited');
    }
    
    try {
      const prompt = this.buildLLMPrompt(ticketData, classification, knowledgeMatches);
      
      const completion = await this.openai.chat.completions.create({
        model: this.config.openai.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful customer support agent. Provide professional, empathetic, and solution-focused responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.openai.maxTokens || 1000,
        temperature: this.config.openai.temperature || 0.7,
      });
      
      response.content = completion.choices[0].message.content;
      response.type = 'llm';
      response.confidence = 0.8; // Base confidence for LLM responses
      response.source = 'openai';
      
      this.updateRateLimit('openai');
      
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Generate hybrid response (template + LLM enhancement)
   */
  async generateHybridResponse(response, ticketData, classification, knowledgeMatches) {
    // First generate template response
    await this.generateTemplateResponse(response, ticketData, classification, knowledgeMatches);
    
    // Then enhance with LLM if available
    if (this.openai && this.checkRateLimit('openai')) {
      try {
        const enhancementPrompt = `Please enhance this customer support response to make it more personalized and helpful:

Original response:
${response.content}

Customer issue:
${ticketData.subject}
${ticketData.description}

Make it more empathetic and specific to their issue while keeping it professional.`;

        const completion = await this.openai.chat.completions.create({
          model: this.config.openai.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are enhancing customer support responses. Keep them professional, empathetic, and helpful.'
            },
            {
              role: 'user',
              content: enhancementPrompt
            }
          ],
          max_tokens: this.config.openai.maxTokens || 1000,
          temperature: 0.5,
        });
        
        response.content = completion.choices[0].message.content;
        response.type = 'hybrid';
        response.confidence = Math.min(response.confidence + 0.1, 0.95);
        
        this.updateRateLimit('openai');
        
      } catch (error) {
        logger.warn('Failed to enhance response with LLM:', error);
        // Keep the template response
      }
    }
  }

  /**
   * Generate fallback response
   */
  async generateFallbackResponse(response, ticketData, classification, knowledgeMatches) {
    response.content = this.getFallbackResponse(ticketData);
    response.type = 'fallback';
    response.confidence = 0.4;
    response.source = 'fallback';
  }

  /**
   * Build prompt for LLM
   */
  buildLLMPrompt(ticketData, classification, knowledgeMatches) {
    let prompt = `Customer Support Request:

Subject: ${ticketData.subject}
Description: ${ticketData.description}
Customer: ${this.getCustomerName(ticketData)}
Priority: ${classification?.priority?.priority || 'medium'}
Category: ${classification?.category?.category || 'general'}

`;

    if (knowledgeMatches && knowledgeMatches.length > 0) {
      prompt += `Relevant Knowledge Base Articles:
`;
      for (const article of knowledgeMatches.slice(0, 3)) {
        prompt += `- ${article.title}: ${article.summary}
`;
      }
      prompt += `
`;
    }

    prompt += `Please provide a helpful, professional response that addresses the customer's issue. Include specific steps or solutions when possible.`;

    return prompt;
  }

  /**
   * Render template with variables
   */
  renderTemplate(template, variables) {
    let rendered = template;
    
    // Simple template rendering (in production, use a proper template engine)
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }
    
    // Handle conditional blocks and loops (simplified)
    rendered = this.processConditionals(rendered, variables);
    rendered = this.processLoops(rendered, variables);
    
    return rendered.trim();
  }

  /**
   * Process conditional blocks in templates
   */
  processConditionals(template, variables) {
    // Simple {{#if variable}} ... {{/if}} processing
    const ifRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    
    return template.replace(ifRegex, (match, variable, content) => {
      const value = variables[variable];
      return (value && (Array.isArray(value) ? value.length > 0 : true)) ? content : '';
    });
  }

  /**
   * Process loop blocks in templates
   */
  processLoops(template, variables) {
    // Simple {{#each array}} ... {{/each}} processing
    const eachRegex = /{{#each\s+(\w+)}}(.*?){{\/each}}/gs;
    
    return template.replace(eachRegex, (match, variable, content) => {
      const array = variables[variable];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace {{this}} with item value
        itemContent = itemContent.replace(/{{this}}/g, item);
        
        // Replace {{@index}} with index
        itemContent = itemContent.replace(/{{@index}}/g, index + 1);
        
        // Replace object properties
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(regex, value || '');
          }
        }
        
        return itemContent;
      }).join('');
    });
  }

  /**
   * Get customer name from ticket data
   */
  getCustomerName(ticketData) {
    if (ticketData.requester) {
      return `${ticketData.requester.firstName || ''} ${ticketData.requester.lastName || ''}`.trim();
    }
    return 'Valued Customer';
  }

  /**
   * Generate troubleshooting steps based on classification
   */
  generateTroubleshootingSteps(classification) {
    const category = classification?.category?.category;
    
    const stepsByCategory = {
      technical: [
        'Clear your browser cache and cookies',
        'Try using a different browser or incognito mode',
        'Check your internet connection stability',
        'Disable browser extensions temporarily',
        'Try accessing from a different device'
      ],
      account: [
        'Verify you are using the correct email address',
        'Check if Caps Lock is enabled',
        'Try resetting your password',
        'Clear your browser\'s saved passwords',
        'Contact us if the issue persists'
      ],
      billing: [
        'Check your payment method is valid and up to date',
        'Verify your billing address matches your payment method',
        'Check for any bank notifications or blocks',
        'Review your account billing history',
        'Contact your bank if needed'
      ]
    };
    
    return stepsByCategory[category] || stepsByCategory.technical;
  }

  /**
   * Detect if account is locked based on ticket content
   */
  detectAccountLocked(ticketData) {
    const text = `${ticketData.subject} ${ticketData.description}`.toLowerCase();
    const lockKeywords = ['locked', 'lock', 'blocked', 'suspended', 'disabled'];
    
    return lockKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Post-process response
   */
  async postProcessResponse(response, ticketData) {
    // Add personalization
    if (this.config.responseGeneration?.personalizeResponse) {
      response.content = this.personalizeResponse(response.content, ticketData);
    }
    
    // Validate response length
    const maxLength = this.config.responseGeneration?.maxLength || 2000;
    if (response.content.length > maxLength) {
      response.content = response.content.substring(0, maxLength - 3) + '...';
      response.confidence *= 0.9; // Reduce confidence for truncated responses
    }
    
    // Add knowledge base links if configured
    if (this.config.responseGeneration?.includeKnowledgeLinks) {
      // Links are already included in templates
    }
  }

  /**
   * Personalize response based on user data
   */
  personalizeResponse(content, ticketData) {
    // Simple personalization (could be enhanced)
    const userTier = ticketData.requester?.tier;
    
    if (userTier === 'premium' || userTier === 'enterprise') {
      content = content.replace('Support Team', 'Premium Support Team');
    }
    
    return content;
  }

  /**
   * Get fallback response
   */
  getFallbackResponse(ticketData) {
    const customerName = this.getCustomerName(ticketData);
    
    return `Hello ${customerName},

Thank you for contacting us. We have received your request and one of our support agents will review it shortly.

We aim to respond to all inquiries within 24 hours. If your issue is urgent, please don't hesitate to contact us directly.

Best regards,
Support Team`;
  }

  /**
   * Check rate limit for external services
   */
  checkRateLimit(service) {
    const limiter = this.rateLimiter.get(service);
    if (!limiter) return false;
    
    const now = Date.now();
    if (now > limiter.resetTime) {
      limiter.requests = 0;
      limiter.resetTime = now + 60000;
    }
    
    return limiter.requests < limiter.limit;
  }

  /**
   * Update rate limit counter
   */
  updateRateLimit(service) {
    const limiter = this.rateLimiter.get(service);
    if (limiter) {
      limiter.requests += 1;
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    this.config = newConfig;
    
    // Reinitialize OpenAI if needed
    if (newConfig.openai?.enabled && newConfig.openai?.apiKey && !this.openai) {
      this.openai = new OpenAI({
        apiKey: newConfig.openai.apiKey,
      });
    }
    
    logger.info('Response Engine configuration updated');
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      templates: this.templates.size,
      cacheSize: this.responseCache.size,
      openai: {
        enabled: !!this.openai,
        rateLimited: !this.checkRateLimit('openai')
      }
    };
    
    // Test OpenAI connection if enabled
    if (this.openai && this.checkRateLimit('openai')) {
      try {
        // Simple test call
        await this.openai.models.list();
        health.openai.status = 'connected';
      } catch (error) {
        health.openai.status = 'error';
        health.openai.error = error.message;
      }
    }
    
    return health;
  }
}

module.exports = ResponseEngine;
