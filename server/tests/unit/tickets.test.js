/**
 * Ticket Management API Unit Tests
 */

const request = require('supertest');
const app = require('../../app');
const Ticket = require('../../models/Ticket');
const User = require('../../models/User');

describe('Ticket Management API', () => {
  beforeEach(async () => {
    // Seed database with test data
    await testUtils.seedDatabase();
  });

  describe('POST /api/tickets', () => {
    it('should create a new ticket successfully', async () => {
      const ticketData = {
        subject: 'New Test Ticket',
        description: 'This is a new test ticket description',
        priority: 'high',
        category: 'billing'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer))
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 201);
      
      expect(body.success).toBe(true);
      expect(body.data.ticket).toMatchObject({
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        status: 'open',
        requester: testUsers.customer._id.toString()
      });

      // Verify ticket was created in database
      const ticket = await Ticket.findById(body.data.ticket._id);
      expect(ticket).toBeTruthy();
      expect(ticket.subject).toBe(ticketData.subject);
    });

    it('should reject ticket creation with missing required fields', async () => {
      const ticketData = {
        description: 'Missing subject'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer))
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('subject');
    });

    it('should auto-assign ticket based on category', async () => {
      const ticketData = {
        subject: 'Technical Issue',
        description: 'Need help with technical problem',
        priority: 'medium',
        category: 'technical'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer))
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 201);
      expect(body.data.ticket.assignee).toBeDefined();
    });

    it('should reject unauthorized ticket creation', async () => {
      const ticketData = {
        subject: 'Unauthorized Ticket',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/tickets')
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/tickets', () => {
    it('should return paginated tickets for agent', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set(testUtils.authHeaders(testUsers.agent))
        .query({ page: 1, limit: 10 });

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      expect(body.data.tickets).toBeInstanceOf(Array);
      expect(body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        pages: expect.any(Number)
      });
    });

    it('should filter tickets by status', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set(testUtils.authHeaders(testUsers.agent))
        .query({ status: 'open' });

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      body.data.tickets.forEach(ticket => {
        expect(ticket.status).toBe('open');
      });
    });

    it('should filter tickets by priority', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set(testUtils.authHeaders(testUsers.agent))
        .query({ priority: 'high' });

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      body.data.tickets.forEach(ticket => {
        expect(ticket.priority).toBe('high');
      });
    });

    it('should return only own tickets for customer', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer));

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      body.data.tickets.forEach(ticket => {
        expect(ticket.requester._id || ticket.requester).toBe(testUsers.customer._id.toString());
      });
    });

    it('should search tickets by subject and description', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set(testUtils.authHeaders(testUsers.agent))
        .query({ search: 'Test Ticket 1' });

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      expect(body.data.tickets.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tickets/:id', () => {
    let testTicket;

    beforeEach(async () => {
      const tickets = await Ticket.find({});
      testTicket = tickets[0];
    });

    it('should return ticket details for authorized user', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.agent));

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      expect(body.data.ticket._id).toBe(testTicket._id.toString());
      expect(body.data.ticket.subject).toBe(testTicket.subject);
    });

    it('should return 404 for non-existent ticket', async () => {
      const fakeId = new require('mongoose').Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/tickets/${fakeId}`)
        .set(testUtils.authHeaders(testUsers.agent));

      const body = testUtils.validateApiResponse(response, 404);
      expect(body.success).toBe(false);
    });

    it('should reject access to other customer tickets', async () => {
      // Create another customer
      const otherCustomer = await User.create({
        email: 'other@test.com',
        password: 'password',
        firstName: 'Other',
        lastName: 'Customer',
        role: 'customer'
      });

      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(otherCustomer));

      const body = testUtils.validateApiResponse(response, 403);
      expect(body.success).toBe(false);
    });
  });

  describe('PUT /api/tickets/:id', () => {
    let testTicket;

    beforeEach(async () => {
      const tickets = await Ticket.find({});
      testTicket = tickets[0];
    });

    it('should update ticket successfully by agent', async () => {
      const updateData = {
        status: 'in_progress',
        priority: 'urgent',
        assignee: testUsers.agent._id
      };

      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(updateData);

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      expect(body.data.ticket.status).toBe(updateData.status);
      expect(body.data.ticket.priority).toBe(updateData.priority);

      // Verify update in database
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.status).toBe(updateData.status);
    });

    it('should create audit log entry for ticket update', async () => {
      const updateData = { status: 'resolved' };

      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(updateData);

      testUtils.validateApiResponse(response, 200);

      // Check audit log was created
      const AuditLog = require('../../models/AuditLog');
      const auditEntry = await AuditLog.findOne({
        resourceType: 'Ticket',
        resourceId: testTicket._id,
        action: 'update'
      });

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.userId).toEqual(testUsers.agent._id);
    });

    it('should reject unauthorized ticket updates', async () => {
      const updateData = { status: 'closed' };

      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.customer))
        .send(updateData);

      const body = testUtils.validateApiResponse(response, 403);
      expect(body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const updateData = { status: 'invalid_status' };

      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(updateData);

      const body = testUtils.validateApiResponse(response, 400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('status');
    });
  });

  describe('POST /api/tickets/:id/comments', () => {
    let testTicket;

    beforeEach(async () => {
      const tickets = await Ticket.find({});
      testTicket = tickets[0];
    });

    it('should add comment to ticket', async () => {
      const commentData = {
        content: 'This is a test comment',
        isInternal: false
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(commentData);

      const body = testUtils.validateApiResponse(response, 201);
      
      expect(body.success).toBe(true);
      expect(body.data.comment.content).toBe(commentData.content);
      expect(body.data.comment.author).toBe(testUsers.agent._id.toString());

      // Verify comment was added to ticket
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.comments).toHaveLength(1);
    });

    it('should reject empty comments', async () => {
      const commentData = { content: '' };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(commentData);

      const body = testUtils.validateApiResponse(response, 400);
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /api/tickets/:id', () => {
    let testTicket;

    beforeEach(async () => {
      const tickets = await Ticket.find({});
      testTicket = tickets[0];
    });

    it('should delete ticket by admin', async () => {
      const response = await request(app)
        .delete(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.admin));

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);

      // Verify ticket was deleted
      const deletedTicket = await Ticket.findById(testTicket._id);
      expect(deletedTicket).toBeNull();
    });

    it('should reject ticket deletion by non-admin', async () => {
      const response = await request(app)
        .delete(`/api/tickets/${testTicket._id}`)
        .set(testUtils.authHeaders(testUsers.agent));

      const body = testUtils.validateApiResponse(response, 403);
      expect(body.success).toBe(false);
    });
  });
});
