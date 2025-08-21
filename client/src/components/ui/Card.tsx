import React, { ReactNode } from 'react'
import { cn } from '@utils/helpers'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn('card', !padding && 'p-0', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('card-header', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('card-body', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('card-footer', className)}>
      {children}
    </div>
  )
}

// Compound component
Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

export default Card
