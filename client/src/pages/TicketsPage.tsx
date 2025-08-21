import React from 'react'
import { Routes, Route } from 'react-router-dom'

import TicketsList from './tickets/TicketsList'
import NewTicket from './tickets/NewTicket'
import TicketDetail from './tickets/TicketDetail'

export default function TicketsPage() {
  return (
    <Routes>
      <Route index element={<TicketsList />} />
      <Route path="new" element={<NewTicket />} />
      <Route path=":id" element={<TicketDetail />} />
    </Routes>
  )
}
