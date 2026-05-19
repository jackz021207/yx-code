import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/lib/database.types'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import PlanPage from '@/pages/PlanPage'
import Diary from '@/pages/Diary'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminPlanPage from '@/pages/admin/AdminPlanPage'
import AdminDiary from '@/pages/admin/AdminDiary'

function ProtectedRoute({
  children,
  requireRole,
}: {
  children: React.ReactNode
  requireRole: Role
}) {
  const { user, role, loading, profileLoading } = useAuth()
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  // 角色不匹配时，把用户送回自己应该看到的入口
  if (role && role !== requireRole) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* owner 路由 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireRole="owner">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <ProtectedRoute requireRole="owner">
              <PlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary"
          element={
            <ProtectedRoute requireRole="owner">
              <Diary />
            </ProtectedRoute>
          }
        />

        {/* admin 路由 */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/plan"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminPlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/diary"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDiary />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<RoleHome />} />
      </Routes>
    </BrowserRouter>
  )
}

// 兜底：未登录跳 /login，已登录按 role 跳到对应首页
function RoleHome() {
  const { user, role, loading, profileLoading } = useAuth()
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
}
