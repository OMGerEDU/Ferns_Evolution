import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Automations from './pages/Automations'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Documentation from './pages/Documentation'
import InstanceDetails from './pages/InstanceDetails'

const queryClient = new QueryClient()

function RequireAuth({ children }) {
  const customKey = localStorage.getItem('evolution_api_key');
  if (!customKey) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }>
            <Route index element={<Dashboard />} />
            <Route path="instances/:instanceName" element={<InstanceDetails />} />
            <Route path="automations" element={<Automations />} />
            <Route path="documentation" element={<Documentation />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
