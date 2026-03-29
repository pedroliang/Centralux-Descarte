import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from './components/theme-provider'
import Layout from './components/layout'
import { RegistrationPage } from './pages/RegistrationPage'
import { DashboardPage } from './pages/DashboardPage'
import { PublicViewPage } from './pages/PublicViewPage'
import { EditPage } from './pages/EditPage'
import { Toaster } from 'sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="centralux-theme">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<RegistrationPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="public" element={<PublicViewPage />} />
            <Route path="edit/:id" element={<EditPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  </StrictMode>,
)
