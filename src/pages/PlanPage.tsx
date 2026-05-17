import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Plan, Difficulty, PlanStatus } from '@/lib/database.types'
import { Plus, CheckCircle2, Circle, ArrowLeft, Trash2 } from 'lucide-react'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  todo: '待做',
  in_progress: '进行中',
  completed: '已完成',
}

const defaultForm = {
  lc_number: '',
  title: '',
  difficulty: 'medium' as Difficulty,
  tags: '',
  target_date: '',
  note: '',
}

export default function PlanPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [filter, setFilter] = useState<PlanStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) loadPlans()
  }, [user])

  async function loadPlans() {
    if (!user) return
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPlans(data ?? [])
  }

  async function addPlan() {
    if (!user || !form.lc_number || !form.title) return
    setSaving(true)
    await supabase.from('plans').insert({
      user_id: user.id,
      lc_number: parseInt(form.lc_number),
      title: form.title,
      difficulty: form.difficulty,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
      target_date: form.target_date || null,
      status: 'todo',
      note: form.note || null,
      completed_at: null,
    })
    setSaving(false)
    setDialogOpen(false)
    setForm(defaultForm)
    loadPlans()
  }

  async function updateStatus(id: string, status: PlanStatus) {
    await supabase
      .from('plans')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', id)
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  async function deletePlan(id: string) {
    await supabase.from('plans').delete().eq('id', id)
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = filter === 'all' ? plans : plans.filter((p) => p.status === filter)
  const completed = plans.filter((p) => p.status === 'completed').length
  const progress = plans.length > 0 ? Math.round((completed / plans.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">刷题计划</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> 添加题目
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* 进度概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">总体进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completed} / {plans.length} 题已完成</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* 筛选 */}
        <div className="flex gap-2">
          {(['all', 'todo', 'in_progress', 'completed'] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? '全部' : STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        {/* 题目列表 */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              还没有题目，点击右上角添加吧
            </div>
          )}
          {filtered.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateStatus(
                        plan.id,
                        plan.status === 'completed' ? 'todo' : 'completed'
                      )
                    }
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                  >
                    {plan.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{plan.lc_number}
                      </span>
                      <span
                        className={`font-medium ${plan.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {plan.title}
                      </span>
                      <Badge variant={plan.difficulty as 'easy' | 'medium' | 'hard'}>
                        {DIFFICULTY_LABELS[plan.difficulty]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {plan.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {plan.target_date && (
                        <span className="text-xs text-muted-foreground">
                          目标：{plan.target_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {plan.status !== 'completed' && plan.status !== 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(plan.id, 'in_progress')}
                        className="text-xs"
                      >
                        开始
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePlan(plan.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* 添加对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加题目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>题号</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={form.lc_number}
                  onChange={(e) => setForm({ ...form, lc_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>难度</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm({ ...form, difficulty: e.target.value as Difficulty })
                  }
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>题目名称</Label>
              <Input
                placeholder="Two Sum"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>标签（逗号分隔）</Label>
              <Input
                placeholder="数组, 哈希表"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>目标日期（可选）</Label>
              <Input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="思路、注意事项..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={addPlan} disabled={saving || !form.lc_number || !form.title}>
              {saving ? '保存中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
