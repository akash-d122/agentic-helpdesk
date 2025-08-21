import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  UserCheck, 
  Trash2,
  MoreHorizontal,
  Ticket,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'

import { useTickets, useBulkTicketOperation, useDeleteTicket, useAssignTicket, useUpdateTicketStatus } from '@hooks/useTickets'
import { useUsers } from '@hooks/useUsers'
import { usePermissions } from '@hooks/usePermissions'
import { useAuth } from '@hooks/useAuth'
import { formatDate, formatRelativeTime } from '@utils/helpers'
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@utils/constants'
import type { Ticket } from '@types/index'

import DataTable from '@components/ui/DataTable'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import SearchBar from '@components/ui/SearchBar'
import { ConfirmModal } from '@components/ui/Modal'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'

export default function TicketsList() {
  const { user } = useAuth()
  const permissions = usePermissions()
  const [filters, setFilters] = useState({
    page: 0,
    pageSize: 10,
    search: '',
    status: '',
    priority: '',
    category: '',
    assignee: '',
    requester: permissions.canViewAllTickets ? '' : user?.id,
  })
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null)

  // API hooks
  const { data: ticketsData, isLoading, error } = useTickets(filters)
  const { data: usersData } = useUsers({ role: 'agent' })
  const deleteTicketMutation = useDeleteTicket()
  const assignTicketMutation = useAssignTicket()
  const updateStatusMutation = useUpdateTicketStatus()
  const bulkOperationMutation = useBulkTicketOperation()

  const tickets = ticketsData?.tickets || []
  const pagination = ticketsData?.pagination
  const agents = usersData?.users || []

  // Search filters configuration
  const searchFilters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select' as const,
      options: Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select' as const,
      options: Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    ...(permissions.canViewAllTickets ? [{
      key: 'assignee',
      label: 'Assignee',
      type: 'select' as const,
      options: [
        { value: 'unassigned', label: 'Unassigned' },
        ...agents.map(agent => ({
          value: agent.id,
          label: `${agent.firstName} ${agent.lastName}`,
        })),
      ],
    }] : []),
  ]

  // Table columns
  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => {
        const ticket = row.original
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Ticket className="h-4 w-4 text-primary-500" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/tickets/${ticket.id}`}
                className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate block"
              >
                #{ticket.ticketNumber} - {ticket.subject}
              </Link>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-secondary-500">
                  by {ticket.requester.firstName} {ticket.requester.lastName}
                </span>
                <span className="text-xs text-secondary-400">•</span>
                <span className="text-xs text-secondary-500">
                  {formatRelativeTime(ticket.createdAt)}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variants = {
          open: 'secondary',
          in_progress: 'primary',
          triaged: 'warning',
          resolved: 'success',
          closed: 'secondary',
        } as const
        
        return (
          <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
            {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS] || status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string
        const variants = {
          low: 'secondary',
          medium: 'primary',
          high: 'warning',
          urgent: 'error',
        } as const
        
        return (
          <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
            {TICKET_PRIORITY_LABELS[priority as keyof typeof TICKET_PRIORITY_LABELS] || priority}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('category') as string
        return (
          <span className="text-sm text-secondary-700">
            {TICKET_CATEGORY_LABELS[category as keyof typeof TICKET_CATEGORY_LABELS] || category}
          </span>
        )
      },
    },
    ...(permissions.canViewAllTickets ? [{
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }: any) => {
        const assignee = row.original.assignee
        if (!assignee) {
          return (
            <span className="text-sm text-secondary-500 italic">Unassigned</span>
          )
        }
        return (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-secondary-400" />
            <span className="text-sm text-secondary-900">
              {assignee.firstName} {assignee.lastName}
            </span>
          </div>
        )
      },
    }] : []),
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }) => {
        const updatedAt = row.getValue('updatedAt') as string
        return (
          <div className="text-sm text-secondary-500">
            {formatRelativeTime(updatedAt)}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const ticket = row.original
        return (
          <TicketActions
            ticket={ticket}
            agents={agents}
            onDelete={() => handleDeleteClick(ticket.id)}
            onAssign={(assigneeId) => assignTicketMutation.mutate({ id: ticket.id, assigneeId })}
            onStatusChange={(status) => updateStatusMutation.mutate({ id: ticket.id, status })}
          />
        )
      },
    },
  ], [permissions.canViewAllTickets, agents, assignTicketMutation, updateStatusMutation])

  // Event handlers
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 0 }))
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }))
  }

  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.pageIndex,
      pageSize: newPagination.pageSize,
    }))
  }

  const handleSelectionChange = (selection: Record<string, boolean>) => {
    const selectedIds = Object.keys(selection).filter(id => selection[id])
    setSelectedTickets(selectedIds)
  }

  const handleDeleteClick = (ticketId: string) => {
    setTicketToDelete(ticketId)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    if (ticketToDelete) {
      deleteTicketMutation.mutate(ticketToDelete)
      setTicketToDelete(null)
    }
  }

  const handleBulkOperation = (operation: 'assign' | 'status' | 'delete', data: any) => {
    if (selectedTickets.length > 0) {
      bulkOperationMutation.mutate({
        ticketIds: selectedTickets,
        operation,
        data,
      })
      setSelectedTickets([])
    }
  }

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Export tickets with filters:', filters)
  }

  // Statistics
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length
    const inProgress = tickets.filter(t => t.status === 'in_progress').length
    const resolved = tickets.filter(t => t.status === 'resolved').length
    const urgent = tickets.filter(t => t.priority === 'urgent').length

    return [
      {
        title: 'Total Tickets',
        value: tickets.length,
        icon: <Ticket className="h-6 w-6" />,
        color: 'primary' as const,
      },
      {
        title: 'Open',
        value: open,
        icon: <AlertCircle className="h-6 w-6" />,
        color: 'warning' as const,
      },
      {
        title: 'In Progress',
        value: inProgress,
        icon: <Clock className="h-6 w-6" />,
        color: 'primary' as const,
      },
      {
        title: 'Resolved',
        value: resolved,
        icon: <CheckCircle className="h-6 w-6" />,
        color: 'success' as const,
      },
    ]
  }, [tickets])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            {permissions.canViewAllTickets ? 'All Tickets' : 'My Tickets'}
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            {permissions.canViewAllTickets 
              ? 'Manage and track all support tickets in the system.'
              : 'View and track your submitted support tickets.'
            }
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            as={Link}
            to="/tickets/new"
            icon={<Plus className="h-4 w-4" />}
          >
            New Ticket
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <StatsGrid columns={4}>
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </StatsGrid>

      {/* Search and Filters */}
      <SearchBar
        placeholder="Search tickets..."
        onSearch={handleSearch}
        showFilters={true}
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      {selectedTickets.length > 0 && permissions.canEditTickets && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-700">
              {selectedTickets.length} ticket(s) selected
            </p>
            <div className="flex space-x-2">
              <select
                className="form-select text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkOperation('assign', { assigneeId: e.target.value })
                    e.target.value = ''
                  }
                }}
              >
                <option value="">Assign to...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
              <select
                className="form-select text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkOperation('status', { status: e.target.value })
                    e.target.value = ''
                  }
                }}
              >
                <option value="">Change status...</option>
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {permissions.canDeleteTickets && (
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleBulkOperation('delete', {})}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <DataTable
        columns={columns}
        data={tickets}
        loading={isLoading}
        error={error}
        selectable={permissions.canEditTickets}
        exportable={true}
        pagination={pagination ? {
          pageIndex: filters.page,
          pageSize: filters.pageSize,
          pageCount: pagination.totalPages,
          total: pagination.totalItems,
        } : undefined}
        onPaginationChange={handlePaginationChange}
        onSelectionChange={handleSelectionChange}
        onExport={handleExport}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmText="Delete"
        variant="error"
      />
    </div>
  )
}

// Ticket Actions Component
interface TicketActionsProps {
  ticket: Ticket
  agents: any[]
  onDelete: () => void
  onAssign: (assigneeId: string) => void
  onStatusChange: (status: string) => void
}

function TicketActions({ ticket, agents, onDelete, onAssign, onStatusChange }: TicketActionsProps) {
  const permissions = usePermissions()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        icon={<MoreHorizontal className="h-4 w-4" />}
      />

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <Link
              to={`/tickets/${ticket.id}`}
              className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              onClick={() => setShowMenu(false)}
            >
              <Eye className="mr-3 h-4 w-4" />
              View
            </Link>
            
            {permissions.canEditTickets && (
              <>
                {!ticket.assignee && (
                  <div className="px-4 py-2">
                    <select
                      className="form-select text-xs w-full"
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssign(e.target.value)
                          setShowMenu(false)
                        }
                      }}
                    >
                      <option value="">Assign to...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="px-4 py-2">
                  <select
                    className="form-select text-xs w-full"
                    onChange={(e) => {
                      if (e.target.value) {
                        onStatusChange(e.target.value)
                        setShowMenu(false)
                      }
                    }}
                  >
                    <option value="">Change status...</option>
                    {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value} disabled={value === ticket.status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {permissions.canDeleteTickets && (
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-error-700 hover:bg-error-50"
              >
                <Trash2 className="mr-3 h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
