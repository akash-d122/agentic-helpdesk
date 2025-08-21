const AuditLog = require('../models/AuditLog');
const winston = require('winston');

/**
 * Enhanced audit logging utility with performance metrics and change tracking
 */
class AuditEnhancer {
  constructor() {
    this.performanceMetrics = new Map();
    this.sessionTracking = new Map();
  }

  /**
   * Create comprehensive audit log entry with enhanced metadata
   * @param {Object} auditData - Audit log data
   * @param {Object} performanceData - Performance metrics
   * @param {Object} changeData - Before/after data for changes
   * @returns {Promise<Object>} - Created audit log entry
   */
  async createEnhancedEntry(auditData, performanceData = {}, changeData = {}) {
    try {
      const enhancedData = {
        ...auditData,
        details: {
          ...auditData.details,
          performance: {
            responseTime: performanceData.responseTime,
            memoryUsage: performanceData.memoryUsage,
            cpuUsage: performanceData.cpuUsage,
            timestamp: new Date()
          },
          changes: changeData.changes || [],
          snapshot: {
            before: changeData.before,
            after: changeData.after
          }
        }
      };

      const auditEntry = await AuditLog.createEntry(enhancedData);
      
      // Update performance metrics
      this.updatePerformanceMetrics(auditData.action, performanceData.responseTime);
      
      return auditEntry;
    } catch (error) {
      winston.error('Failed to create enhanced audit entry', {
        error: error.message,
        traceId: auditData.traceId
      });
      throw error;
    }
  }

  /**
   * Track user session activity
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {string} action - Action performed
   * @param {Object} context - Additional context
   */
  trackSessionActivity(userId, sessionId, action, context = {}) {
    const sessionKey = `${userId}:${sessionId}`;
    
    if (!this.sessionTracking.has(sessionKey)) {
      this.sessionTracking.set(sessionKey, {
        userId,
        sessionId,
        startTime: new Date(),
        actions: [],
        lastActivity: new Date()
      });
    }
    
    const session = this.sessionTracking.get(sessionKey);
    session.actions.push({
      action,
      timestamp: new Date(),
      context
    });
    session.lastActivity = new Date();
    
    // Clean up old sessions (older than 24 hours)
    this.cleanupOldSessions();
  }

  /**
   * Get user session summary
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Object} - Session summary
   */
  getSessionSummary(userId, sessionId) {
    const sessionKey = `${userId}:${sessionId}`;
    const session = this.sessionTracking.get(sessionKey);
    
    if (!session) {
      return null;
    }
    
    return {
      userId: session.userId,
      sessionId: session.sessionId,
      duration: new Date() - session.startTime,
      actionCount: session.actions.length,
      lastActivity: session.lastActivity,
      actions: session.actions
    };
  }

  /**
   * Update performance metrics for actions
   * @param {string} action - Action name
   * @param {number} responseTime - Response time in milliseconds
   */
  updatePerformanceMetrics(action, responseTime) {
    if (!responseTime) return;
    
    if (!this.performanceMetrics.has(action)) {
      this.performanceMetrics.set(action, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0
      });
    }
    
    const metrics = this.performanceMetrics.get(action);
    metrics.count += 1;
    metrics.totalTime += responseTime;
    metrics.minTime = Math.min(metrics.minTime, responseTime);
    metrics.maxTime = Math.max(metrics.maxTime, responseTime);
    metrics.avgTime = metrics.totalTime / metrics.count;
  }

  /**
   * Get performance metrics for an action
   * @param {string} action - Action name
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics(action) {
    return this.performanceMetrics.get(action) || null;
  }

  /**
   * Get all performance metrics
   * @returns {Object} - All performance metrics
   */
  getAllPerformanceMetrics() {
    const metrics = {};
    for (const [action, data] of this.performanceMetrics.entries()) {
      metrics[action] = { ...data };
    }
    return metrics;
  }

  /**
   * Create data change snapshot
   * @param {Object} originalData - Original data before change
   * @param {Object} newData - New data after change
   * @param {string[]} excludeFields - Fields to exclude from snapshot
   * @returns {Object} - Change snapshot
   */
  createChangeSnapshot(originalData, newData, excludeFields = []) {
    const changes = [];
    const before = {};
    const after = {};
    
    // Get all unique field names
    const allFields = new Set([
      ...Object.keys(originalData || {}),
      ...Object.keys(newData || {})
    ]);
    
    for (const field of allFields) {
      if (excludeFields.includes(field)) continue;
      
      const oldValue = originalData?.[field];
      const newValue = newData?.[field];
      
      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      
      changes.push({
        field,
        oldValue,
        newValue,
        type: this.getChangeType(oldValue, newValue)
      });
      
      before[field] = oldValue;
      after[field] = newValue;
    }
    
    return {
      changes,
      before,
      after,
      changeCount: changes.length
    };
  }

  /**
   * Determine the type of change
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   * @returns {string} - Change type
   */
  getChangeType(oldValue, newValue) {
    if (oldValue === undefined && newValue !== undefined) return 'added';
    if (oldValue !== undefined && newValue === undefined) return 'removed';
    if (oldValue !== newValue) return 'modified';
    return 'unchanged';
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [sessionKey, session] of this.sessionTracking.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.sessionTracking.delete(sessionKey);
      }
    }
  }

  /**
   * Generate compliance report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} - Compliance report
   */
  async generateComplianceReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      actions = [],
      userIds = [],
      format = 'json'
    } = options;
    
    try {
      // Build query filter
      const filter = {
        timestamp: { $gte: startDate, $lte: endDate }
      };
      
      if (actions.length > 0) {
        filter.action = { $in: actions };
      }
      
      if (userIds.length > 0) {
        filter['actor.id'] = { $in: userIds };
      }
      
      // Get audit logs
      const auditLogs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .populate('actor.id', 'firstName lastName email role');
      
      // Generate report data
      const report = {
        metadata: {
          generatedAt: new Date(),
          period: { startDate, endDate },
          totalEntries: auditLogs.length,
          filters: { actions, userIds }
        },
        summary: {
          actionCounts: {},
          userActivity: {},
          securityEvents: 0,
          errorEvents: 0
        },
        entries: auditLogs.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          actor: log.actor,
          target: log.target,
          severity: log.severity,
          traceId: log.traceId,
          details: log.details
        }))
      };
      
      // Calculate summary statistics
      auditLogs.forEach(log => {
        // Action counts
        report.summary.actionCounts[log.action] = 
          (report.summary.actionCounts[log.action] || 0) + 1;
        
        // User activity
        if (log.actor.id) {
          const userId = log.actor.id.toString();
          report.summary.userActivity[userId] = 
            (report.summary.userActivity[userId] || 0) + 1;
        }
        
        // Security and error events
        if (log.action.startsWith('security.')) {
          report.summary.securityEvents += 1;
        }
        if (log.severity === 'error' || log.severity === 'critical') {
          report.summary.errorEvents += 1;
        }
      });
      
      return report;
    } catch (error) {
      winston.error('Failed to generate compliance report', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Export audit data for external systems
   * @param {Object} options - Export options
   * @returns {Promise<Object>} - Exported data
   */
  async exportAuditData(options = {}) {
    const {
      format = 'json',
      startDate,
      endDate,
      includeDetails = true
    } = options;
    
    const report = await this.generateComplianceReport({
      startDate,
      endDate,
      format
    });
    
    if (!includeDetails) {
      delete report.entries;
    }
    
    return {
      format,
      data: report,
      exportedAt: new Date()
    };
  }
}

// Create singleton instance
const auditEnhancer = new AuditEnhancer();

module.exports = auditEnhancer;
