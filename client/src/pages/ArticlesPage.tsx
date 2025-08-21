import React from 'react'
import { Routes, Route } from 'react-router-dom'

import ArticlesList from './knowledge/ArticlesList'
import NewArticle from './knowledge/NewArticle'
import ArticleDetail from './knowledge/ArticleDetail'
import EditArticle from './knowledge/EditArticle'

export default function ArticlesPage() {
  return (
    <Routes>
      <Route index element={<ArticlesList />} />
      <Route path="new" element={<NewArticle />} />
      <Route path=":id" element={<ArticleDetail />} />
      <Route path=":id/edit" element={<EditArticle />} />
    </Routes>
  )
}
