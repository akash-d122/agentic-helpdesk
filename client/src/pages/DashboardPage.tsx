import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Ticket,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Calendar,
  Filter,
  RefreshCw,
  Plus
} from 'lucide-react'

import { useAuth } from '@hooks/useAuth'
import { useTicketStatistics } from '@hooks/useTickets'
import { useArticleStatistics } from '@hooks/useArticles'
import { formatRelativeTime } from '@utils/helpers'

import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'
import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { LineChart, BarChart, PieChart } from '@components/ui/Chart'

// Mock data for charts - in real implementation, this would come from APIs
const ticketTrendData = [
  { date: '2024-01-01', tickets: 45, resolved: 38 },
  { date: '2024-01-02', tickets: 52, resolved: 41 },
  { date: '2024-01-03', tickets: 38, resolved: 45 },
  { date: '2024-01-04', tickets: 61, resolved: 52 },
  { date: '2024-01-05', tickets: 55, resolved: 48 },
  { date: '2024-01-06', tickets: 42, resolved: 55 },
  { date: '2024-01-07', tickets: 48, resolved: 42 },
]

const categoryData = [
  { category: 'Technical', count: 145 },
  { category: 'Billing', count: 89 },
  { category: 'General', count: 67 },
  { category: 'Account', count: 45 },
  { category: 'Feature Request', count: 23 },
]

const priorityData = [
  { name: 'Low', value: 45, color: '#6b7280' },
  { name: 'Medium', value: 125, color: '#3b82f6' },
  { name: 'High', value: 78, color: '#f59e0b' },
  { name: 'Urgent', value: 23, color: '#ef4444' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState('7d')
  const [refreshing, setRefreshing] = useState(false)

  // API hooks - using mock data for now
  const { data: ticketStats, isLoading: ticketStatsLoading } = useTicketStatistics()
  const { data: articleStats, isLoading: articleStatsLoading } = useArticleStatistics()

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000)
  }

  const recentTickets = [
    {
      id: '1234',
      subject: 'Login Issues with SSO',
      requester: 'John Doe',
      status: 'open',
      priority: 'high',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '1233',
      subject: 'Password Reset Not Working',
      requester: 'Jane Smith',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '1232',
      subject: 'Feature Request: Dark Mode',
      requester: 'Bob Johnson',
      status: 'resolved',
      priority: 'low',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '1231',
      subject: 'API Rate Limiting Issues',
      requester: 'Alice Brown',
      status: 'triaged',
      priority: 'urgent',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const popularArticles = [
    {
      id: '1',
      title: 'How to Reset Your Password',
      views: 245,
      helpfulRatio: 0.94,
      category: 'Account',
    },
    {
      id: '2',
      title: 'Troubleshooting Login Issues',
      views: 189,
      helpfulRatio: 0.87,
      category: 'Technical',
    },
    {
      id: '3',
      title: 'Setting Up Two-Factor Authentication',
      views: 156,
      helpfulRatio: 0.91,
      category: 'Security',
    },
    {
      id: '4',
      title: 'API Documentation and Examples',
      views: 134,
      helpfulRatio: 0.89,
      category: 'Technical',
    },
  ]

  // Main statistics
  const mainStats = useMemo(() => [
    {
      title: 'Open Tickets',
      value: ticketStats?.openTickets || 24,
      change: { value: 12.5, type: 'increase' as const, period: 'vs yesterday' },
      icon: <Ticket className="h-6 w-6" />,
      color: 'warning' as const,
    },
    {
      title: 'Resolved Today',
      value: 12,
      change: { value: 8.3, type: 'increase' as const, period: 'vs yesterday' },
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'success' as const,
    },
    {
      title: 'Avg Response Time',
      value: '2.4h',
      change: { value: 15.2, type: 'decrease' as const, period: 'vs yesterday' },
      icon: <Clock className="h-6 w-6" />,
      color: 'primary' as const,
    },
    {
      title: 'Customer Satisfaction',
      value: '94%',
      change: { value: 2.1, type: 'increase' as const, period: 'vs last week' },
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'success' as const,
    },
  ], [ticketStats])

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'warning',
      in_progress: 'primary',
      triaged: 'secondary',
      resolved: 'success',
      closed: 'secondary',
    } as const

    const labels = {
      open: 'Open',
      in_progress: 'In Progress',
      triaged: 'Triaged',
      resolved: 'Resolved',
      closed: 'Closed',
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'secondary',
      medium: 'primary',
      high: 'warning',
      urgent: 'error',
    } as const

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'} size="sm">
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Here's what's happening with your helpdesk today.
          </p>
        </div>
        <div className="mt-4 flex items-center space-x-2 md:mt-0 md:ml-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="form-select text-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Statistics */}
      <StatsGrid columns={4}>
        {mainStats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            loading={ticketStatsLoading}
          />
        ))}
      </StatsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Trends */}
        <LineChart
          title="Ticket Trends"
          description="Daily ticket creation and resolution over time"
          data={ticketTrendData}
          xKey="date"
          yKey="tickets"
          height={300}
          showGrid={true}
          showLegend={true}
        />

        {/* Tickets by Category */}
        <BarChart
          title="Tickets by Category"
          description="Distribution of tickets across different categories"
          data={categoryData}
          xKey="category"
          yKey="count"
          height={300}
          showGrid={true}
        />
      </div>

      {/* Priority Distribution and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Distribution */}
        <PieChart
          title="Priority Distribution"
          description="Breakdown of tickets by priority level"
          data={priorityData}
          dataKey="value"
          nameKey="name"
          height={300}
          showLegend={true}
        />

        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <Card.Header className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Recent Tickets</h3>
              <p className="text-sm text-secondary-500">Latest support requests</p>
            </div>
            <Button
              as={Link}
              to="/tickets"
              variant="outline"
              size="sm"
            >
              View All
            </Button>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate"
                      >
                        #{ticket.id} - {ticket.subject}
                      </Link>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-secondary-500">
                      <span>{ticket.requester}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(ticket.createdAt)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Knowledge Base and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Articles */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Popular Articles</h3>
              <p className="text-sm text-secondary-500">Most viewed knowledge base articles</p>
            </div>
            <Button
              as={Link}
              to="/articles"
              variant="outline"
              size="sm"
            >
              View All
            </Button>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {popularArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/articles/${article.id}`}
                      className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate block"
                    >
                      {article.title}
                    </Link>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-secondary-500">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{article.views} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{Math.round(article.helpfulRatio * 100)}% helpful</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {article.category}
                  </Badge>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium text-secondary-900">Quick Actions</h3>
            <p className="text-sm text-secondary-500">Common tasks and shortcuts</p>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 gap-3">
              <Button
                as={Link}
                to="/tickets/new"
                variant="outline"
                className="h-20 flex-col"
                icon={<Ticket className="h-6 w-6 mb-2" />}
              >
                New Ticket
              </Button>
              <Button
                as={Link}
                to="/articles/new"
                variant="outline"
                className="h-20 flex-col"
                icon={<BookOpen className="h-6 w-6 mb-2" />}
              >
                New Article
              </Button>
              <Button
                as={Link}
                to="/admin/users"
                variant="outline"
                className="h-20 flex-col"
                icon={<Users className="h-6 w-6 mb-2" />}
              >
                Manage Users
              </Button>
              <Button
                as={Link}
                to="/reports"
                variant="outline"
                className="h-20 flex-col"
                icon={<TrendingUp className="h-6 w-6 mb-2" />}
              >
                View Reports
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
