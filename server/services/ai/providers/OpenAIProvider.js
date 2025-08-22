class OpenAIProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-3.5-turbo';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  async classifyTicket(ticketData) {
    // Mock implementation for testing
    if (process.env.NODE_ENV === 'test' || process.env.STUB_MODE === 'true') {
      return this._stubClassifyTicket(ticketData);
    }

    // Real OpenAI implementation would go here
    try {
      const prompt = this._buildClassificationPrompt(ticketData);
      
      // Mock response for now
      return {
        category: 'technical',
        priority: 'medium',
        confidence: 0.95
      };
    } catch (error) {
      throw new Error(`Classification failed: ${error.message}`);
    }
  }

  async generateResponse(ticketData, knowledgeArticles = []) {
    // Mock implementation for testing
    if (process.env.NODE_ENV === 'test' || process.env.STUB_MODE === 'true') {
      return this._stubGenerateResponse(ticketData, knowledgeArticles);
    }

    // Real OpenAI implementation would go here
    try {
      const prompt = this._buildResponsePrompt(ticketData, knowledgeArticles);
      
      // Mock response for now
      return {
        content: 'Mock AI response',
        confidence: 0.92
      };
    } catch (error) {
      throw new Error(`Response generation failed: ${error.message}`);
    }
  }

  async searchKnowledge(query) {
    // Mock implementation for testing
    if (process.env.NODE_ENV === 'test' || process.env.STUB_MODE === 'true') {
      return this._stubSearchKnowledge(query);
    }

    // Real implementation would use embeddings
    return [
      {
        id: 'mock-article-1',
        title: 'Mock Article',
        score: 0.85,
        content: 'Mock content'
      }
    ];
  }

  _stubClassifyTicket(ticketData) {
    const { subject = '', description = '' } = ticketData;
    const text = `${subject} ${description}`.toLowerCase();
    
    let category = 'other';
    let confidence = 0.5;

    // Simple keyword-based classification
    if (text.includes('refund') || text.includes('invoice') || text.includes('payment') || text.includes('billing')) {
      category = 'billing';
      confidence = 0.9;
    } else if (text.includes('error') || text.includes('bug') || text.includes('stack') || text.includes('technical')) {
      category = 'technical';
      confidence = 0.85;
    } else if (text.includes('delivery') || text.includes('shipment') || text.includes('shipping')) {
      category = 'shipping';
      confidence = 0.8;
    }

    // Determine priority based on keywords
    let priority = 'medium';
    if (text.includes('urgent') || text.includes('critical') || text.includes('emergency')) {
      priority = 'urgent';
    } else if (text.includes('high') || text.includes('important')) {
      priority = 'high';
    } else if (text.includes('low') || text.includes('minor')) {
      priority = 'low';
    }

    return {
      category,
      priority,
      confidence
    };
  }

  _stubGenerateResponse(ticketData, knowledgeArticles = []) {
    const { subject, description } = ticketData;
    
    let response = `Thank you for contacting us regarding "${subject}". `;
    
    if (knowledgeArticles.length > 0) {
      response += `Based on our knowledge base, here are some helpful resources:\n\n`;
      knowledgeArticles.forEach((article, index) => {
        response += `${index + 1}. ${article.title}\n`;
      });
      response += `\nPlease review these articles and let us know if you need further assistance.`;
    } else {
      response += `We've received your request and our team will review it shortly. We'll get back to you within 24 hours.`;
    }

    return {
      content: response,
      confidence: knowledgeArticles.length > 0 ? 0.85 : 0.6
    };
  }

  _stubSearchKnowledge(query) {
    // Mock knowledge search results
    const mockArticles = [
      {
        id: 'article-1',
        title: 'How to Reset Your Password',
        score: 0.9,
        content: 'To reset your password, follow these steps...'
      },
      {
        id: 'article-2',
        title: 'Troubleshooting Login Issues',
        score: 0.8,
        content: 'If you are having trouble logging in...'
      },
      {
        id: 'article-3',
        title: 'Billing FAQ',
        score: 0.7,
        content: 'Common billing questions and answers...'
      }
    ];

    // Filter based on query relevance
    return mockArticles.filter(article => 
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  _buildClassificationPrompt(ticketData) {
    return `
      Classify the following support ticket:
      
      Subject: ${ticketData.subject}
      Description: ${ticketData.description}
      
      Please classify into one of these categories: billing, technical, shipping, other
      Also determine priority: low, medium, high, urgent
      
      Respond with JSON format:
      {
        "category": "category_name",
        "priority": "priority_level",
        "confidence": 0.0-1.0
      }
    `;
  }

  _buildResponsePrompt(ticketData, knowledgeArticles) {
    let prompt = `
      Generate a helpful response for this support ticket:
      
      Subject: ${ticketData.subject}
      Description: ${ticketData.description}
    `;

    if (knowledgeArticles.length > 0) {
      prompt += `\n\nRelevant knowledge base articles:\n`;
      knowledgeArticles.forEach((article, index) => {
        prompt += `${index + 1}. ${article.title}: ${article.content.substring(0, 200)}...\n`;
      });
    }

    prompt += `\n\nPlease provide a helpful, professional response that addresses the customer's issue.`;
    
    return prompt;
  }
}

module.exports = OpenAIProvider;
