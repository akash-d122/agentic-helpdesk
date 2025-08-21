/**
 * WebSocket Service
 * Handles real-time communication for status updates, notifications, and live collaboration
 */

import { io, Socket } from 'socket.io-client'

export interface WebSocketEvent {
  type: string
  payload: any
  timestamp: string
  userId?: string
  ticketId?: string
}

export interface NotificationData {
  id: string
  type: 'ticket_update' | 'assignment' | 'escalation' | 'ai_suggestion' | 'message' | 'system'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  ticketId?: string
  userId?: string
  actionUrl?: string
  timestamp: string
  read: boolean
  persistent: boolean
}

export interface TicketStatusUpdate {
  ticketId: string
  status: string
  assigneeId?: string
  priority?: string
  updatedBy: {
    id: string
    name: string
  }
  timestamp: string
  changes: Array<{
    field: string
    oldValue: any
    newValue: any
  }>
}

export interface LiveCollaborationData {
  ticketId: string
  users: Array<{
    id: string
    name: string
    avatar?: string
    action: 'viewing' | 'editing' | 'typing'
    lastSeen: string
  }>
  activeEditors: Array<{
    userId: string
    field: string
    position?: number
  }>
}

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventListeners: Map<string, Set<Function>> = new Map()
  private isConnected = false
  private userId: string | null = null
  private authToken: string | null = null

  /**
   * Initialize WebSocket connection
   */
  connect(userId: string, authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId
        this.authToken = authToken

        this.socket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:3001', {
          auth: {
            token: authToken,
            userId: userId
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        })

        this.setupEventHandlers()

        this.socket.on('connect', () => {
          console.log('WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve()
        })

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error)
          this.isConnected = false
          reject(error)
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.eventListeners.clear()
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.isConnected = false
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return
      }
      
      this.handleReconnection()
    })

    this.socket.on('reconnect', () => {
      console.log('WebSocket reconnected')
      this.isConnected = true
      this.reconnectAttempts = 0
    })

    // Ticket events
    this.socket.on('ticket:status_update', (data: TicketStatusUpdate) => {
      this.emit('ticket:status_update', data)
    })

    this.socket.on('ticket:assignment', (data: any) => {
      this.emit('ticket:assignment', data)
    })

    this.socket.on('ticket:escalation', (data: any) => {
      this.emit('ticket:escalation', data)
    })

    this.socket.on('ticket:comment', (data: any) => {
      this.emit('ticket:comment', data)
    })

    // AI events
    this.socket.on('ai:suggestion_ready', (data: any) => {
      this.emit('ai:suggestion_ready', data)
    })

    this.socket.on('ai:processing_update', (data: any) => {
      this.emit('ai:processing_update', data)
    })

    // Notification events
    this.socket.on('notification:new', (data: NotificationData) => {
      this.emit('notification:new', data)
    })

    this.socket.on('notification:update', (data: any) => {
      this.emit('notification:update', data)
    })

    // Collaboration events
    this.socket.on('collaboration:user_joined', (data: any) => {
      this.emit('collaboration:user_joined', data)
    })

    this.socket.on('collaboration:user_left', (data: any) => {
      this.emit('collaboration:user_left', data)
    })

    this.socket.on('collaboration:typing', (data: any) => {
      this.emit('collaboration:typing', data)
    })

    this.socket.on('collaboration:cursor_move', (data: any) => {
      this.emit('collaboration:cursor_move', data)
    })

    // System events
    this.socket.on('system:maintenance', (data: any) => {
      this.emit('system:maintenance', data)
    })

    this.socket.on('system:announcement', (data: any) => {
      this.emit('system:announcement', data)
    })
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('connection:failed', { reason: 'max_attempts_reached' })
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      if (this.userId && this.authToken) {
        this.connect(this.userId, this.authToken).catch(error => {
          console.error('Reconnection failed:', error)
        })
      }
    }, delay)
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback?: Function): void {
    if (!this.eventListeners.has(event)) return

    if (callback) {
      this.eventListeners.get(event)!.delete(callback)
    } else {
      this.eventListeners.delete(event)
    }
  }

  /**
   * Emit events to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Send events to server
   */
  send(event: string, data: any): void {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send event:', event)
      return
    }

    this.socket.emit(event, data)
  }

  /**
   * Join a room (for ticket-specific updates)
   */
  joinRoom(roomId: string): void {
    this.send('room:join', { roomId })
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.send('room:leave', { roomId })
  }

  /**
   * Send typing indicator
   */
  sendTyping(ticketId: string, field: string): void {
    this.send('collaboration:typing', {
      ticketId,
      field,
      userId: this.userId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Send cursor position
   */
  sendCursorPosition(ticketId: string, field: string, position: number): void {
    this.send('collaboration:cursor_move', {
      ticketId,
      field,
      position,
      userId: this.userId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): void {
    this.send('notification:mark_read', { notificationId })
  }

  /**
   * Send presence update
   */
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.send('presence:update', {
      userId: this.userId,
      status,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get connection status
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id
  }

  /**
   * Send heartbeat
   */
  sendHeartbeat(): void {
    this.send('heartbeat', {
      userId: this.userId,
      timestamp: new Date().toISOString()
    })
  }
}

// Create singleton instance
export const websocketService = new WebSocketService()

// Auto-reconnect on page visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !websocketService.isSocketConnected()) {
    // Page became visible and socket is disconnected, attempt reconnection
    const userId = localStorage.getItem('userId')
    const authToken = localStorage.getItem('authToken')
    
    if (userId && authToken) {
      websocketService.connect(userId, authToken).catch(error => {
        console.error('Failed to reconnect on visibility change:', error)
      })
    }
  }
})

// Send heartbeat every 30 seconds
setInterval(() => {
  if (websocketService.isSocketConnected()) {
    websocketService.sendHeartbeat()
  }
}, 30000)

export default websocketService
