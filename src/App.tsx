import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import PlanPage from '@/pages/PlanPage'
import Diary from '@/pages/Diary'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading } = useAuth()
  // 等 session 确定 + profile 加载完，避免页面用 role=null 短暂渲染
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <ProtectedRoute>
              <PlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary"
          element={
            <ProtectedRoute>
              <Diary />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
