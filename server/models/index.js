// Central export file for all models
const User = require('./User');
const Article = require('./Article');
const Ticket = require('./Ticket');
const AgentSuggestion = require('./AgentSuggestion');
const AuditLog = require('./AuditLog');
const Config = require('./Config');

module.exports = {
  User,
  Article,
  Ticket,
  AgentSuggestion,
  AuditLog,
  Config
};
