import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import { cn } from '@utils/helpers'
import Card from './Card'

interface BaseChartProps {
  data: any[]
  title?: string
  description?: string
  height?: number
  className?: string
  loading?: boolean
  error?: string
}

interface LineChartProps extends BaseChartProps {
  xKey: string
  yKey: string
  lineColor?: string
  showGrid?: boolean
  showLegend?: boolean
}

interface AreaChartProps extends BaseChartProps {
  xKey: string
  yKey: string
  areaColor?: string
  showGrid?: boolean
  showLegend?: boolean
}

interface BarChartProps extends BaseChartProps {
  xKey: string
  yKey: string
  barColor?: string
  showGrid?: boolean
  showLegend?: boolean
}

interface PieChartProps extends BaseChartProps {
  dataKey: string
  nameKey: string
  colors?: string[]
  showLegend?: boolean
}

// Default colors for charts
const DEFAULT_COLORS = [
  '#3b82f6', // primary-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
]

// Chart wrapper component
function ChartWrapper({ 
  title, 
  description, 
  children, 
  className, 
  loading, 
  error 
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  loading?: boolean
  error?: string
}) {
  if (error) {
    return (
      <Card className={className}>
        <Card.Body className="text-center py-8">
          <div className="text-error-500 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-error-600">{error}</p>
        </Card.Body>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <Card.Body className="text-center py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-secondary-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-32 bg-secondary-200 rounded"></div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <Card.Header>
          {title && <h3 className="text-lg font-medium text-secondary-900">{title}</h3>}
          {description && <p className="text-sm text-secondary-500 mt-1">{description}</p>}
        </Card.Header>
      )}
      <Card.Body>
        {children}
      </Card.Body>
    </Card>
  )
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-secondary-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Line Chart Component
export function LineChartComponent({
  data,
  xKey,
  yKey,
  lineColor = DEFAULT_COLORS[0],
  showGrid = true,
  showLegend = false,
  height = 300,
  title,
  description,
  className,
  loading,
  error,
}: LineChartProps) {
  return (
    <ChartWrapper 
      title={title} 
      description={description} 
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Line 
            type="monotone" 
            dataKey={yKey} 
            stroke={lineColor} 
            strokeWidth={2}
            dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Area Chart Component
export function AreaChartComponent({
  data,
  xKey,
  yKey,
  areaColor = DEFAULT_COLORS[0],
  showGrid = true,
  showLegend = false,
  height = 300,
  title,
  description,
  className,
  loading,
  error,
}: AreaChartProps) {
  return (
    <ChartWrapper 
      title={title} 
      description={description} 
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Area 
            type="monotone" 
            dataKey={yKey} 
            stroke={areaColor} 
            fill={areaColor}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Bar Chart Component
export function BarChartComponent({
  data,
  xKey,
  yKey,
  barColor = DEFAULT_COLORS[0],
  showGrid = true,
  showLegend = false,
  height = 300,
  title,
  description,
  className,
  loading,
  error,
}: BarChartProps) {
  return (
    <ChartWrapper 
      title={title} 
      description={description} 
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Bar 
            dataKey={yKey} 
            fill={barColor}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Pie Chart Component
export function PieChartComponent({
  data,
  dataKey,
  nameKey,
  colors = DEFAULT_COLORS,
  showLegend = true,
  height = 300,
  title,
  description,
  className,
  loading,
  error,
}: PieChartProps) {
  return (
    <ChartWrapper 
      title={title} 
      description={description} 
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Export all chart components
export {
  LineChartComponent as LineChart,
  AreaChartComponent as AreaChart,
  BarChartComponent as BarChart,
  PieChartComponent as PieChart,
}
