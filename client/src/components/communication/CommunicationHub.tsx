import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Mail, 
  Users, 
  Paperclip, 
  Smile,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
  Flag,
  Archive,
  Forward,
  Reply
} from 'lucide-react'
import toast from 'react-hot-toast'

import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Avatar from '@components/ui/Avatar'
import Tabs from '@components/ui/Tabs'
import RichTextEditor from '@components/ui/RichTextEditor'
import Dropdown from '@components/ui/Dropdown'
import { formatRelativeTime } from '@utils/helpers'
import { websocketService } from '@services/websocketService'

interface Message {
  id: string
  type: 'customer' | 'agent' | 'system' | 'ai'
  content: string
  author: {
    id: string
    name: string
    email?: string
    avatar?: string
    role: string
  }
  timestamp: string
  isInternal: boolean
  status: 'sent' | 'delivered' | 'read' | 'failed'
  attachments?: Array<{
    id: string
    name: string
    size: number
    type: string
    url: string
  }>
  metadata?: {
    channel: 'email' | 'chat' | 'phone' | 'sms'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    sentiment?: 'positive' | 'neutral' | 'negative'
    aiGenerated?: boolean
    templateUsed?: string
  }
  reactions?: Array<{
    emoji: string
    users: string[]
  }>
  threadId?: string
  replyTo?: string
}

interface CommunicationHubProps {
  ticketId: string
  messages: Message[]
  onSendMessage: (content: string, isInternal: boolean, metadata?: any) => Promise<void>
  onUpdateMessage: (messageId: string, updates: Partial<Message>) => Promise<void>
  currentUser: any
  allowInternalNotes?: boolean
  allowCustomerCommunication?: boolean
  showAISuggestions?: boolean
}

export default function CommunicationHub({
  ticketId,
  messages,
  onSendMessage,
  onUpdateMessage,
  currentUser,
  allowInternalNotes = true,
  allowCustomerCommunication = true,
  showAISuggestions = true
}: CommunicationHubProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for typing indicators
  useEffect(() => {
    const handleTyping = (data: any) => {
      if (data.ticketId === ticketId && data.userId !== currentUser.id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId]
          }
          return prev
        })

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== data.userId))
        }, 3000)
      }
    }

    websocketService.on('collaboration:typing', handleTyping)
    return () => websocketService.off('collaboration:typing', handleTyping)
  }, [ticketId, currentUser.id])

  // Send typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    websocketService.sendTyping(ticketId, 'message')

    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
    }, 1000)
  }

  const filteredMessages = messages.filter(message => {
    switch (activeTab) {
      case 'customer':
        return !message.isInternal && message.type !== 'system'
      case 'internal':
        return message.isInternal || message.type === 'system'
      case 'ai':
        return message.metadata?.aiGenerated || message.type === 'ai'
      default:
        return true
    }
  })

  const handleSend = async () => {
    if (!newMessage.trim()) return

    try {
      setSending(true)
      
      await onSendMessage(newMessage, isInternal, {
        channel: 'chat',
        priority: 'medium',
        replyTo: replyingTo?.id
      })
      
      setNewMessage('')
      setReplyingTo(null)
      toast.success(isInternal ? 'Internal note added' : 'Message sent')
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId)
      if (!message) return

      const existingReaction = message.reactions?.find(r => r.emoji === emoji)
      let newReactions = message.reactions || []

      if (existingReaction) {
        if (existingReaction.users.includes(currentUser.id)) {
          // Remove reaction
          existingReaction.users = existingReaction.users.filter(id => id !== currentUser.id)
          if (existingReaction.users.length === 0) {
            newReactions = newReactions.filter(r => r.emoji !== emoji)
          }
        } else {
          // Add reaction
          existingReaction.users.push(currentUser.id)
        }
      } else {
        // New reaction
        newReactions.push({
          emoji,
          users: [currentUser.id]
        })
      }

      await onUpdateMessage(messageId, { reactions: newReactions })
    } catch (error) {
      toast.error('Failed to update reaction')
    }
  }

  const getMessageIcon = (message: Message) => {
    switch (message.type) {
      case 'customer':
        return <MessageSquare className="h-4 w-4 text-primary-500" />
      case 'agent':
        return <Users className="h-4 w-4 text-secondary-500" />
      case 'system':
        return <AlertCircle className="h-4 w-4 text-warning-500" />
      case 'ai':
        return <Star className="h-4 w-4 text-purple-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-secondary-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-secondary-400" />
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-primary-400" />
      case 'read':
        return <Eye className="h-3 w-3 text-success-400" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-error-400" />
      default:
        return null
    }
  }

  const tabs = [
    { id: 'all', label: 'All Messages', count: messages.length },
    { id: 'customer', label: 'Customer', count: messages.filter(m => !m.isInternal && m.type !== 'system').length },
    { id: 'internal', label: 'Internal', count: messages.filter(m => m.isInternal || m.type === 'system').length },
    ...(showAISuggestions ? [{ id: 'ai', label: 'AI', count: messages.filter(m => m.metadata?.aiGenerated || m.type === 'ai').length }] : [])
  ]

  return (
    <div className="bg-white border border-secondary-200 rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-secondary-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-secondary-900">Communication</h3>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Mail className="h-4 w-4" />}
              disabled={!allowCustomerCommunication}
            >
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Phone className="h-4 w-4" />}
            >
              Call
            </Button>
          </div>
        </div>

        <Tabs
          tabs={tabs.map(tab => ({
            id: tab.id,
            label: `${tab.label} (${tab.count})`,
            icon: tab.id === 'ai' ? <Star className="h-4 w-4" /> : undefined
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map(message => (
          <div
            key={message.id}
            className={`flex space-x-3 ${
              message.author.id === currentUser.id ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <Avatar
              name={message.author.name}
              size="sm"
              className="flex-shrink-0"
            />
            
            <div className={`flex-1 max-w-xs lg:max-w-md ${
              message.author.id === currentUser.id ? 'text-right' : ''
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-secondary-900">
                  {message.author.name}
                </span>
                {getMessageIcon(message)}
                {message.isInternal && (
                  <Badge variant="warning" size="sm">Internal</Badge>
                )}
                {message.metadata?.aiGenerated && (
                  <Badge variant="secondary" size="sm">AI</Badge>
                )}
              </div>
              
              <div className={`rounded-lg p-3 ${
                message.author.id === currentUser.id
                  ? 'bg-primary-500 text-white'
                  : message.isInternal
                  ? 'bg-warning-50 border border-warning-200'
                  : 'bg-secondary-100'
              }`}>
                {message.replyTo && (
                  <div className="text-xs opacity-75 mb-2 p-2 bg-black bg-opacity-10 rounded">
                    Replying to previous message
                  </div>
                )}
                
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: message.content }} />
                </div>
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                        <Paperclip className="h-3 w-3" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {attachment.name}
                        </a>
                        <span className="text-xs opacity-75">
                          ({Math.round(attachment.size / 1024)}KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-secondary-500">
                    {formatRelativeTime(message.timestamp)}
                  </span>
                  {getStatusIcon(message.status)}
                  {message.metadata?.channel && (
                    <Badge variant="outline" size="sm">
                      {message.metadata.channel}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex space-x-1">
                      {message.reactions.map(reaction => (
                        <button
                          key={reaction.emoji}
                          onClick={() => handleReaction(message.id, reaction.emoji)}
                          className={`text-xs px-1 py-0.5 rounded ${
                            reaction.users.includes(currentUser.id)
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-secondary-100 hover:bg-secondary-200'
                          }`}
                        >
                          {reaction.emoji} {reaction.users.length}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <Dropdown
                    trigger={
                      <Button variant="ghost" size="sm" icon={<MoreHorizontal className="h-3 w-3" />} />
                    }
                    items={[
                      {
                        label: 'Reply',
                        icon: <Reply className="h-4 w-4" />,
                        onClick: () => setReplyingTo(message)
                      },
                      {
                        label: 'React',
                        icon: <Smile className="h-4 w-4" />,
                        onClick: () => setShowEmojiPicker(true)
                      },
                      {
                        label: 'Forward',
                        icon: <Forward className="h-4 w-4" />,
                        onClick: () => console.log('Forward message')
                      },
                      { type: 'separator' },
                      {
                        label: 'Flag',
                        icon: <Flag className="h-4 w-4" />,
                        onClick: () => console.log('Flag message')
                      }
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-secondary-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>Someone is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Context */}
      {replyingTo && (
        <div className="border-t border-secondary-200 p-3 bg-secondary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="h-4 w-4 text-secondary-500" />
              <span className="text-sm text-secondary-700">
                Replying to {replyingTo.author.name}
              </span>
            </div>
            <Button
              onClick={() => setReplyingTo(null)}
              variant="ghost"
              size="sm"
              icon={<MoreHorizontal className="h-4 w-4" />}
            />
          </div>
          <div className="text-sm text-secondary-600 mt-1 truncate">
            {replyingTo.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-secondary-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="form-checkbox"
              disabled={!allowInternalNotes}
            />
            <span className="text-sm text-secondary-700">Internal note</span>
          </label>
          
          {!allowCustomerCommunication && !isInternal && (
            <Badge variant="warning" size="sm">
              Customer communication disabled
            </Badge>
          )}
        </div>
        
        <div className="flex space-x-2">
          <div className="flex-1">
            <RichTextEditor
              value={newMessage}
              onChange={setNewMessage}
              onKeyDown={handleTyping}
              placeholder={isInternal ? "Add an internal note..." : "Type your message..."}
              height={100}
              toolbar={['bold', 'italic', 'link']}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Paperclip className="h-4 w-4" />}
              title="Attach file"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Smile className="h-4 w-4" />}
              title="Add emoji"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-secondary-500">
            {isInternal ? 'This note will only be visible to agents' : 'This message will be sent to the customer'}
          </div>
          
          <Button
            onClick={handleSend}
            loading={sending}
            disabled={!newMessage.trim() || (!allowCustomerCommunication && !isInternal)}
            icon={<Send className="h-4 w-4" />}
          >
            {isInternal ? 'Add Note' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
