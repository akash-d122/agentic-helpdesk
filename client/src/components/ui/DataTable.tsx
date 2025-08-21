import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react'

import { cn } from '@utils/helpers'
import Button from './Button'
import Input from './Input'
import LoadingSpinner from './LoadingSpinner'
import { useClickOutside } from '@hooks/useClickOutside'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  error?: string | null
  searchable?: boolean
  filterable?: boolean
  selectable?: boolean
  exportable?: boolean
  pagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    total: number
  }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onSortingChange?: (sorting: SortingState) => void
  onFiltersChange?: (filters: ColumnFiltersState) => void
  onSelectionChange?: (selection: RowSelectionState) => void
  onExport?: () => void
  className?: string
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error = null,
  searchable = true,
  filterable = true,
  selectable = false,
  exportable = false,
  pagination,
  onPaginationChange,
  onSortingChange,
  onFiltersChange,
  onSelectionChange,
  onExport,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Add selection column if selectable
  const tableColumns = useMemo(() => {
    if (!selectable) return columns

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="form-checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="form-checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          aria-label={`Select row ${row.index + 1}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }

    return [selectionColumn, ...columns]
  }, [columns, selectable])

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(newSorting)
      onSortingChange?.(newSorting)
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
      setColumnFilters(newFilters)
      onFiltersChange?.(newFilters)
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      onSelectionChange?.(newSelection)
    },
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(pagination && {
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    },
    manualPagination: !!pagination,
    pageCount: pagination?.pageCount ?? -1,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const hasSelection = selectedRows.length > 0

  if (error) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-4">
        <div className="flex items-center">
          <X className="h-5 w-5 text-error-400 mr-2" />
          <p className="text-sm text-error-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Global Search */}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          )}

          {/* Filter Toggle */}
          {filterable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="h-4 w-4" />}
            >
              Filters
            </Button>
          )}

          {/* Selection Info */}
          {hasSelection && (
            <div className="text-sm text-secondary-600">
              {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Button */}
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              icon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          )}

          {/* Column Visibility */}
          <ColumnVisibilityDropdown table={table} />
        </div>
      </div>

      {/* Column Filters */}
      {showFilters && filterable && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-secondary-50 rounded-lg">
          {table.getAllColumns()
            .filter((column) => column.getCanFilter())
            .map((column) => (
              <div key={column.id}>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  {typeof column.columnDef.header === 'string' 
                    ? column.columnDef.header 
                    : column.id}
                </label>
                <Input
                  placeholder={`Filter ${column.id}...`}
                  value={(column.getFilterValue() as string) ?? ''}
                  onChange={(e) => column.setFilterValue(e.target.value)}
                  size="sm"
                />
              </div>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-secondary-200 bg-white">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="table-header-cell">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center space-x-1',
                            header.column.getCanSort() && 'cursor-pointer select-none'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getCanSort() && (
                            <span className="ml-1">
                              {header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="table-body">
              {loading ? (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="table-cell text-center py-8">
                    <LoadingSpinner size="lg" />
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'table-row',
                      row.getIsSelected() && 'bg-primary-50'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="table-cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="table-cell text-center py-8">
                    <div className="text-secondary-500">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No results found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          table={table}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      )}
    </div>
  )
}

// Column Visibility Dropdown Component
function ColumnVisibilityDropdown({ table }: { table: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, () => setIsOpen(false))

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        icon={<MoreHorizontal className="h-4 w-4" />}
      >
        Columns
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1 max-h-64 overflow-y-auto">
            {table.getAllColumns()
              .filter((column: any) => column.getCanHide())
              .map((column: any) => (
                <label
                  key={column.id}
                  className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox mr-2"
                    checked={column.getIsVisible()}
                    onChange={(e) => column.toggleVisibility(e.target.checked)}
                  />
                  {typeof column.columnDef.header === 'string' 
                    ? column.columnDef.header 
                    : column.id}
                </label>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Pagination Component
function DataTablePagination({ table, pagination, onPaginationChange }: any) {
  const pageSizeOptions = [10, 20, 50, 100]

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            className="form-select w-auto"
            value={pagination.pageSize}
            onChange={(e) => {
              onPaginationChange?.({
                pageIndex: 0,
                pageSize: Number(e.target.value),
              })
            }}
          >
            {pageSizeOptions.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pagination.pageIndex + 1} of {pagination.pageCount}
        </div>
        <div className="text-sm text-secondary-700">
          {pagination.total} total items
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginationChange?.({ ...pagination, pageIndex: 0 })}
          disabled={pagination.pageIndex === 0}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginationChange?.({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
          disabled={pagination.pageIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginationChange?.({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
          disabled={pagination.pageIndex >= pagination.pageCount - 1}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginationChange?.({ ...pagination, pageIndex: pagination.pageCount - 1 })}
          disabled={pagination.pageIndex >= pagination.pageCount - 1}
        >
          Last
        </Button>
      </div>
    </div>
  )
}
