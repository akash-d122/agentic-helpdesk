import React from 'react'
import { Routes, Route } from 'react-router-dom'

import UsersList from './UsersList'
import NewUser from './NewUser'
import UserDetail from './UserDetail'
import EditUser from './EditUser'

export default function UsersPage() {
  return (
    <Routes>
      <Route index element={<UsersList />} />
      <Route path="new" element={<NewUser />} />
      <Route path=":id" element={<UserDetail />} />
      <Route path=":id/edit" element={<EditUser />} />
    </Routes>
  )
}
