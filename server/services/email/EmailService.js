const nodemailer = require('nodemailer');
const logger = require('../../config/logger');

class EmailService {
  constructor(config = {}) {
    this.config = {
      service: config.service || process.env.EMAIL_SERVICE || 'gmail',
      host: config.host || process.env.EMAIL_HOST,
      port: config.port || process.env.EMAIL_PORT || 587,
      secure: config.secure || process.env.EMAIL_SECURE === 'true',
      auth: {
        user: config.user || process.env.EMAIL_USER,
        pass: config.pass || process.env.EMAIL_PASS
      },
      from: config.from || process.env.EMAIL_FROM || 'noreply@smarthelpdesk.com'
    };

    this.transporter = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create transporter
      this.transporter = nodemailer.createTransporter({
        service: this.config.service,
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth
      });

      // Verify connection in non-test environment
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        logger.info('Email service initialized successfully');
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      
      // In test environment, continue without real email service
      if (process.env.NODE_ENV === 'test') {
        this.isInitialized = true;
        return;
      }
      
      throw error;
    }
  }

  async sendEmail(options) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Mock email sending in test environment
    if (process.env.NODE_ENV === 'test') {
      logger.info('Mock email sent:', options);
      return {
        messageId: 'mock-message-id',
        accepted: [options.to],
        rejected: []
      };
    }

    try {
      const mailOptions = {
        from: options.from || this.config.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully:', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendTicketNotification(ticket, type, recipient) {
    const templates = this._getEmailTemplates();
    const template = templates[type];

    if (!template) {
      throw new Error(`Unknown email template: ${type}`);
    }

    const emailData = {
      to: recipient.email,
      subject: template.subject(ticket),
      html: template.html(ticket, recipient),
      text: template.text(ticket, recipient)
    };

    return await this.sendEmail(emailData);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const emailData = {
      to: user.email,
      subject: 'Password Reset Request - Smart Helpdesk',
      html: this._generatePasswordResetHTML(user, resetUrl),
      text: this._generatePasswordResetText(user, resetUrl)
    };

    return await this.sendEmail(emailData);
  }

  async sendWelcomeEmail(user) {
    const emailData = {
      to: user.email,
      subject: 'Welcome to Smart Helpdesk',
      html: this._generateWelcomeHTML(user),
      text: this._generateWelcomeText(user)
    };

    return await this.sendEmail(emailData);
  }

  async sendTicketCreatedEmail(ticket, user) {
    const emailData = {
      to: user.email,
      subject: `Ticket Created: ${ticket.subject}`,
      html: this._generateTicketCreatedHTML(ticket, user),
      text: this._generateTicketCreatedText(ticket, user)
    };

    return await this.sendEmail(emailData);
  }

  async sendTicketUpdatedEmail(ticket, user, update) {
    const emailData = {
      to: user.email,
      subject: `Ticket Updated: ${ticket.subject}`,
      html: this._generateTicketUpdatedHTML(ticket, user, update),
      text: this._generateTicketUpdatedText(ticket, user, update)
    };

    return await this.sendEmail(emailData);
  }

  _getEmailTemplates() {
    return {
      ticket_created: {
        subject: (ticket) => `Ticket Created: ${ticket.subject}`,
        html: (ticket, user) => this._generateTicketCreatedHTML(ticket, user),
        text: (ticket, user) => this._generateTicketCreatedText(ticket, user)
      },
      ticket_updated: {
        subject: (ticket) => `Ticket Updated: ${ticket.subject}`,
        html: (ticket, user) => this._generateTicketUpdatedHTML(ticket, user),
        text: (ticket, user) => this._generateTicketUpdatedText(ticket, user)
      },
      ticket_resolved: {
        subject: (ticket) => `Ticket Resolved: ${ticket.subject}`,
        html: (ticket, user) => this._generateTicketResolvedHTML(ticket, user),
        text: (ticket, user) => this._generateTicketResolvedText(ticket, user)
      }
    };
  }

  _generatePasswordResetHTML(user, resetUrl) {
    return `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.firstName},</p>
      <p>You requested a password reset for your Smart Helpdesk account.</p>
      <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;
  }

  _generatePasswordResetText(user, resetUrl) {
    return `
      Password Reset Request
      
      Hello ${user.firstName},
      
      You requested a password reset for your Smart Helpdesk account.
      
      Reset your password: ${resetUrl}
      
      If you didn't request this, please ignore this email.
      This link will expire in 1 hour.
    `;
  }

  _generateWelcomeHTML(user) {
    return `
      <h2>Welcome to Smart Helpdesk!</h2>
      <p>Hello ${user.firstName},</p>
      <p>Welcome to Smart Helpdesk. Your account has been created successfully.</p>
      <p>You can now log in and start using our support system.</p>
      <p><a href="${process.env.FRONTEND_URL}/login">Login to Smart Helpdesk</a></p>
    `;
  }

  _generateWelcomeText(user) {
    return `
      Welcome to Smart Helpdesk!
      
      Hello ${user.firstName},
      
      Welcome to Smart Helpdesk. Your account has been created successfully.
      You can now log in and start using our support system.
      
      Login: ${process.env.FRONTEND_URL}/login
    `;
  }

  _generateTicketCreatedHTML(ticket, user) {
    return `
      <h2>Ticket Created</h2>
      <p>Hello ${user.firstName},</p>
      <p>Your support ticket has been created successfully.</p>
      <p><strong>Ticket ID:</strong> ${ticket._id}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      <p>We'll get back to you as soon as possible.</p>
    `;
  }

  _generateTicketCreatedText(ticket, user) {
    return `
      Ticket Created
      
      Hello ${user.firstName},
      
      Your support ticket has been created successfully.
      
      Ticket ID: ${ticket._id}
      Subject: ${ticket.subject}
      Priority: ${ticket.priority}
      Status: ${ticket.status}
      
      We'll get back to you as soon as possible.
    `;
  }

  _generateTicketUpdatedHTML(ticket, user, update = {}) {
    return `
      <h2>Ticket Updated</h2>
      <p>Hello ${user.firstName},</p>
      <p>Your support ticket has been updated.</p>
      <p><strong>Ticket ID:</strong> ${ticket._id}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      ${update.comment ? `<p><strong>Latest Update:</strong> ${update.comment}</p>` : ''}
    `;
  }

  _generateTicketUpdatedText(ticket, user, update = {}) {
    return `
      Ticket Updated
      
      Hello ${user.firstName},
      
      Your support ticket has been updated.
      
      Ticket ID: ${ticket._id}
      Subject: ${ticket.subject}
      Status: ${ticket.status}
      ${update.comment ? `Latest Update: ${update.comment}` : ''}
    `;
  }

  _generateTicketResolvedHTML(ticket, user) {
    return `
      <h2>Ticket Resolved</h2>
      <p>Hello ${user.firstName},</p>
      <p>Your support ticket has been resolved.</p>
      <p><strong>Ticket ID:</strong> ${ticket._id}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p>If you need further assistance, please don't hesitate to contact us.</p>
    `;
  }

  _generateTicketResolvedText(ticket, user) {
    return `
      Ticket Resolved
      
      Hello ${user.firstName},
      
      Your support ticket has been resolved.
      
      Ticket ID: ${ticket._id}
      Subject: ${ticket.subject}
      
      If you need further assistance, please don't hesitate to contact us.
    `;
  }
}

module.exports = EmailService;
