/**
 * K6 Load Testing Script for Smart Helpdesk
 * Tests system performance under various load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 50 },   // Ramp up to 50 users over 5 minutes
    { duration: '10m', target: 100 }, // Ramp up to 100 users over 10 minutes
    
    // Sustained load
    { duration: '15m', target: 100 }, // Stay at 100 users for 15 minutes
    { duration: '5m', target: 200 },  // Spike to 200 users for 5 minutes
    { duration: '10m', target: 100 }, // Back to 100 users for 10 minutes
    
    // Ramp down
    { duration: '5m', target: 50 },   // Ramp down to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  
  thresholds: {
    // Performance requirements
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    error_rate: ['rate<0.05'],         // Custom error rate below 5%
    
    // Specific endpoint thresholds
    'http_req_duration{endpoint:auth}': ['p(95)<1000'],
    'http_req_duration{endpoint:tickets}': ['p(95)<1500'],
    'http_req_duration{endpoint:ai}': ['p(95)<5000'],
  }
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test data
const testUsers = [
  { email: 'load-test-1@test.com', password: 'LoadTest123!', role: 'customer' },
  { email: 'load-test-2@test.com', password: 'LoadTest123!', role: 'agent' },
  { email: 'load-test-3@test.com', password: 'LoadTest123!', role: 'admin' }
];

// Authentication tokens cache
let authTokens = {};

export function setup() {
  console.log('Setting up load test environment...');
  
  // Create test users
  testUsers.forEach(user => {
    const response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 201 || response.status === 409) {
      console.log(`User ${user.email} ready for testing`);
    }
  });
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  const userIndex = __VU % testUsers.length;
  const user = testUsers[userIndex];
  
  // Get or create auth token
  if (!authTokens[user.email]) {
    authTokens[user.email] = authenticate(user);
  }
  
  const token = authTokens[user.email];
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  // Simulate user behavior based on role
  switch (user.role) {
    case 'customer':
      customerWorkflow(token);
      break;
    case 'agent':
      agentWorkflow(token);
      break;
    case 'admin':
      adminWorkflow(token);
      break;
  }
  
  // Random think time between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

function authenticate(user) {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth' }
    }
  );
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'login successful': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
    return null;
  }
  
  const body = JSON.parse(response.body);
  return body.data.token;
}

function customerWorkflow(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 70% chance to view tickets
  if (Math.random() < 0.7) {
    viewTickets(headers);
  }
  
  // 20% chance to create a ticket
  if (Math.random() < 0.2) {
    createTicket(headers);
  }
  
  // 10% chance to view knowledge base
  if (Math.random() < 0.1) {
    searchKnowledge(headers);
  }
}

function agentWorkflow(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 50% chance to view assigned tickets
  if (Math.random() < 0.5) {
    viewTickets(headers);
  }
  
  // 30% chance to review AI suggestions
  if (Math.random() < 0.3) {
    reviewAISuggestions(headers);
  }
  
  // 15% chance to update ticket
  if (Math.random() < 0.15) {
    updateTicket(headers);
  }
  
  // 5% chance to search knowledge base
  if (Math.random() < 0.05) {
    searchKnowledge(headers);
  }
}

function adminWorkflow(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 40% chance to view system metrics
  if (Math.random() < 0.4) {
    viewSystemMetrics(headers);
  }
  
  // 30% chance to manage users
  if (Math.random() < 0.3) {
    manageUsers(headers);
  }
  
  // 20% chance to view audit logs
  if (Math.random() < 0.2) {
    viewAuditLogs(headers);
  }
  
  // 10% chance to manage knowledge base
  if (Math.random() < 0.1) {
    manageKnowledge(headers);
  }
}

function viewTickets(headers) {
  const response = http.get(`${BASE_URL}/api/tickets?page=1&limit=20`, {
    headers,
    tags: { endpoint: 'tickets' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'tickets loaded': (r) => r.status === 200,
    'tickets response time < 1.5s': (r) => r.timings.duration < 1500,
  });
  
  if (!success) errorRate.add(1);
}

function createTicket(headers) {
  const ticketData = {
    subject: `Load Test Ticket ${Date.now()}`,
    description: 'This is a ticket created during load testing',
    priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    category: ['technical', 'billing', 'account'][Math.floor(Math.random() * 3)]
  };
  
  const response = http.post(
    `${BASE_URL}/api/tickets`,
    JSON.stringify(ticketData),
    {
      headers,
      tags: { endpoint: 'tickets' }
    }
  );
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'ticket created': (r) => r.status === 201,
    'ticket creation time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!success) errorRate.add(1);
}

function reviewAISuggestions(headers) {
  const response = http.get(`${BASE_URL}/api/ai/suggestions?status=pending_review&limit=10`, {
    headers,
    tags: { endpoint: 'ai' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'AI suggestions loaded': (r) => r.status === 200,
    'AI suggestions response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  if (!success) errorRate.add(1);
}

function updateTicket(headers) {
  // First get a ticket to update
  const ticketsResponse = http.get(`${BASE_URL}/api/tickets?limit=1`, { headers });
  
  if (ticketsResponse.status === 200) {
    const tickets = JSON.parse(ticketsResponse.body).data.tickets;
    
    if (tickets.length > 0) {
      const ticketId = tickets[0]._id;
      const updateData = {
        status: ['open', 'in_progress', 'resolved'][Math.floor(Math.random() * 3)]
      };
      
      const response = http.put(
        `${BASE_URL}/api/tickets/${ticketId}`,
        JSON.stringify(updateData),
        {
          headers,
          tags: { endpoint: 'tickets' }
        }
      );
      
      requestCount.add(1);
      responseTime.add(response.timings.duration);
      
      const success = check(response, {
        'ticket updated': (r) => r.status === 200,
        'ticket update time < 1s': (r) => r.timings.duration < 1000,
      });
      
      if (!success) errorRate.add(1);
    }
  }
}

function searchKnowledge(headers) {
  const searchTerms = ['password', 'login', 'account', 'billing', 'technical'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const response = http.get(`${BASE_URL}/api/knowledge/search?q=${term}`, {
    headers,
    tags: { endpoint: 'knowledge' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'knowledge search completed': (r) => r.status === 200,
    'knowledge search time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!success) errorRate.add(1);
}

function viewSystemMetrics(headers) {
  const response = http.get(`${BASE_URL}/api/admin/metrics`, {
    headers,
    tags: { endpoint: 'admin' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'metrics loaded': (r) => r.status === 200,
    'metrics response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!success) errorRate.add(1);
}

function manageUsers(headers) {
  const response = http.get(`${BASE_URL}/api/admin/users?page=1&limit=20`, {
    headers,
    tags: { endpoint: 'admin' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'users loaded': (r) => r.status === 200,
    'users response time < 1.5s': (r) => r.timings.duration < 1500,
  });
  
  if (!success) errorRate.add(1);
}

function viewAuditLogs(headers) {
  const response = http.get(`${BASE_URL}/api/admin/audit-logs?page=1&limit=50`, {
    headers,
    tags: { endpoint: 'admin' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'audit logs loaded': (r) => r.status === 200,
    'audit logs response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!success) errorRate.add(1);
}

function manageKnowledge(headers) {
  const response = http.get(`${BASE_URL}/api/knowledge?page=1&limit=20`, {
    headers,
    tags: { endpoint: 'knowledge' }
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'knowledge articles loaded': (r) => r.status === 200,
    'knowledge response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!success) errorRate.add(1);
}

export function teardown(data) {
  console.log('Load test completed. Cleaning up...');
  
  // Generate performance report
  console.log('Performance Summary:');
  console.log(`- Total Requests: ${requestCount.count}`);
  console.log(`- Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`- Average Response Time: ${responseTime.avg.toFixed(2)}ms`);
  console.log(`- 95th Percentile: ${responseTime.p(95).toFixed(2)}ms`);
}
