import React, { useState, useEffect, useMemo } from 'react'
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Filter, 
  Settings, 
  Trash2,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  MessageSquare,
  User,
  Zap,
  Flag
} from 'lucide-react'
import toast from 'react-hot-toast'

import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Avatar from '@components/ui/Avatar'
import Modal from '@components/ui/Modal'
import Dropdown from '@components/ui/Dropdown'
import { formatRelativeTime } from '@utils/helpers'
import { websocketService, NotificationData } from '@services/websocketService'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onNotificationClick?: (notification: NotificationData) => void
}

export default function NotificationCenter({
  isOpen,
  onClose,
  onNotificationClick
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'tickets' | 'ai' | 'system'>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load notifications on mount
  useEffect(() => {
    loadNotifications()
  }, [])

  // Listen for real-time notifications
  useEffect(() => {
    const handleNewNotification = (notification: NotificationData) => {
      setNotifications(prev => [notification, ...prev])
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        })
      }
      
      // Show toast for high priority notifications
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        toast.error(notification.title, {
          duration: 5000,
          position: 'top-right'
        })
      }
    }

    const handleNotificationUpdate = (data: any) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === data.id ? { ...notif, ...data } : notif
        )
      )
    }

    websocketService.on('notification:new', handleNewNotification)
    websocketService.on('notification:update', handleNotificationUpdate)

    return () => {
      websocketService.off('notification:new', handleNewNotification)
      websocketService.off('notification:update', handleNotificationUpdate)
    }
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would fetch from API
      const mockNotifications: NotificationData[] = [
        {
          id: '1',
          type: 'ai_suggestion',
          title: 'AI Suggestion Ready',
          message: 'New AI suggestion available for ticket #12345',
          priority: 'medium',
          ticketId: '12345',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          read: false,
          persistent: false
        },
        {
          id: '2',
          type: 'assignment',
          title: 'Ticket Assigned',
          message: 'You have been assigned ticket #12346',
          priority: 'high',
          ticketId: '12346',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          read: false,
          persistent: true
        },
        {
          id: '3',
          type: 'escalation',
          title: 'Ticket Escalated',
          message: 'Ticket #12347 has been escalated to you',
          priority: 'urgent',
          ticketId: '12347',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          read: true,
          persistent: true
        }
      ]
      
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      switch (filter) {
        case 'unread':
          return !notification.read
        case 'tickets':
          return ['ticket_update', 'assignment', 'escalation'].includes(notification.type)
        case 'ai':
          return notification.type === 'ai_suggestion'
        case 'system':
          return notification.type === 'system'
        default:
          return true
      }
    })
  }, [notifications, filter])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
      
      websocketService.markNotificationRead(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      )
      
      // Send bulk mark as read request
      websocketService.send('notification:mark_all_read', {})
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId)
      )
      
      websocketService.send('notification:delete', { notificationId })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const clearAll = async () => {
    try {
      setNotifications([])
      websocketService.send('notification:clear_all', {})
      toast.success('All notifications cleared')
    } catch (error) {
      console.error('Failed to clear notifications:', error)
      toast.error('Failed to clear notifications')
    }
  }

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
    
    // Navigate to relevant page
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank')
    } else if (notification.ticketId) {
      window.open(`/tickets/${notification.ticketId}`, '_blank')
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'urgent' ? 'text-error-500' :
                     priority === 'high' ? 'text-warning-500' :
                     priority === 'medium' ? 'text-primary-500' : 'text-secondary-500'

    switch (type) {
      case 'ai_suggestion':
        return <Zap className={`h-4 w-4 ${iconClass}`} />
      case 'assignment':
        return <User className={`h-4 w-4 ${iconClass}`} />
      case 'escalation':
        return <Flag className={`h-4 w-4 ${iconClass}`} />
      case 'ticket_update':
        return <CheckCircle className={`h-4 w-4 ${iconClass}`} />
      case 'message':
        return <MessageSquare className={`h-4 w-4 ${iconClass}`} />
      case 'system':
        return <Info className={`h-4 w-4 ${iconClass}`} />
      default:
        return <Bell className={`h-4 w-4 ${iconClass}`} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'primary'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-secondary-700" />
            <h3 className="text-lg font-medium text-secondary-900">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="error" size="sm">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm" icon={<Settings className="h-4 w-4" />} />
              }
              items={[
                {
                  label: 'Mark all as read',
                  icon: <CheckCheck className="h-4 w-4" />,
                  onClick: markAllAsRead,
                  disabled: unreadCount === 0
                },
                {
                  label: 'Clear all',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: clearAll,
                  disabled: notifications.length === 0
                },
                { type: 'separator' },
                {
                  label: 'Notification settings',
                  icon: <Settings className="h-4 w-4" />,
                  onClick: () => setShowSettings(true)
                }
              ]}
            />
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              icon={<X className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-secondary-200">
          <div className="flex space-x-2 overflow-x-auto">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'tickets', label: 'Tickets' },
              { key: 'ai', label: 'AI' },
              { key: 'system', label: 'System' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                {label}
                {key === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 bg-error-500 text-white text-xs rounded-full px-1">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-200">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-secondary-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-secondary-900' : 'text-secondary-700'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-secondary-600 mt-1">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-secondary-500">
                              {formatRelativeTime(notification.timestamp)}
                            </span>
                            
                            <Badge 
                              variant={getPriorityColor(notification.priority) as any} 
                              size="sm"
                            >
                              {notification.priority}
                            </Badge>
                            
                            {notification.persistent && (
                              <Badge variant="outline" size="sm">
                                Persistent
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="p-1 text-secondary-400 hover:text-secondary-600"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 text-secondary-400 hover:text-error-600"
                            title="Delete"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="p-4 border-t border-secondary-200">
            <div className="flex items-center justify-between text-sm text-secondary-500">
              <span>{filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => window.open('/notifications', '_blank')}
                className="text-primary-600 hover:text-primary-700"
              >
                View all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <NotificationSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// Notification Settings Modal
interface NotificationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState({
    email: {
      ticketUpdates: true,
      assignments: true,
      escalations: true,
      aiSuggestions: false,
      systemAlerts: true
    },
    browser: {
      ticketUpdates: true,
      assignments: true,
      escalations: true,
      aiSuggestions: true,
      systemAlerts: false
    },
    mobile: {
      ticketUpdates: false,
      assignments: true,
      escalations: true,
      aiSuggestions: false,
      systemAlerts: false
    }
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      // Save settings to backend
      await new Promise(resolve => setTimeout(resolve, 1000)) // Mock API call
      toast.success('Notification settings saved')
      onClose()
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        toast.success('Browser notifications enabled')
      } else {
        toast.error('Browser notifications denied')
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Settings"
      size="md"
    >
      <div className="space-y-6">
        {/* Browser Permission */}
        {Notification.permission !== 'granted' && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-800">
                  Browser notifications disabled
                </p>
                <p className="text-sm text-warning-700 mt-1">
                  Enable browser notifications to receive real-time alerts
                </p>
              </div>
              <Button
                onClick={requestBrowserPermission}
                variant="outline"
                size="sm"
              >
                Enable
              </Button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="space-y-4">
          {Object.entries(settings).map(([channel, channelSettings]) => (
            <div key={channel}>
              <h4 className="font-medium text-secondary-900 mb-3 capitalize">
                {channel} Notifications
              </h4>
              
              <div className="space-y-2">
                {Object.entries(channelSettings).map(([setting, enabled]) => (
                  <label key={setting} className="flex items-center justify-between">
                    <span className="text-sm text-secondary-700 capitalize">
                      {setting.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        [channel]: {
                          ...prev[channel as keyof typeof prev],
                          [setting]: e.target.checked
                        }
                      }))}
                      className="form-checkbox"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            icon={<Check className="h-4 w-4" />}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  )
}
