import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Difficulty, PlanStatus, Topic } from '@/lib/database.types'
import { Plus, CheckCircle2, Circle, ArrowLeft, Trash2 } from 'lucide-react'
import {
  useOwnerProfile,
  useAllPlans,
  useCreatePlan,
  useUpdatePlanStatus,
  useDeletePlan,
  useTopics,
} from '@/lib/queries'
import { TopicFilter, type TopicFilterValue } from '@/components/TopicFilter'
import { TopicProgress } from '@/components/TopicProgress'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  todo: '待做',
  completed: '已完成',
}

const defaultForm = {
  lc_number: '',
  title: '',
  difficulty: 'medium' as Difficulty,
  topic_id: '',
  tags: '',
  target_date: '',
  note: '',
}

export default function PlanPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all')
  const [topicFilter, setTopicFilter] = useState<TopicFilterValue>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const ownerProfileQ = useOwnerProfile()
  const ownerId = ownerProfileQ.data?.user_id
  const plansQ = useAllPlans(ownerId)
  const topicsQ = useTopics()

  const createPlan = useCreatePlan()
  const updateStatus = useUpdatePlanStatus()
  const deletePlan = useDeletePlan()

  const plans = plansQ.data ?? []
  const topics = topicsQ.data ?? []
  const topicById = useMemo(() => {
    const m = new Map<string, Topic>()
    topics.forEach((t) => m.set(t.id, t))
    return m
  }, [topics])

  const filtered = plans.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (topicFilter === 'all') return true
    if (topicFilter === null) return p.topic_id === null
    return p.topic_id === topicFilter
  })

  const usedTopicIds = useMemo(
    () => new Set(plans.map((p) => p.topic_id).filter((x): x is string => !!x)),
    [plans],
  )
  const hasUnclassified = plans.some((p) => p.topic_id === null)

  const completed = plans.filter((p) => p.status === 'completed').length
  const progress = plans.length > 0 ? Math.round((completed / plans.length) * 100) : 0

  async function addPlan() {
    if (!user || !form.lc_number || !form.title) return
    await createPlan.mutateAsync({
      userId: user.id,
      topic_id: form.topic_id || null,
      lc_number: parseInt(form.lc_number),
      title: form.title,
      difficulty: form.difficulty,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      target_date: form.target_date || null,
      note: form.note || null,
    })
    setDialogOpen(false)
    setForm(defaultForm)
  }

  function toggleComplete(id: string, currentStatus: PlanStatus) {
    updateStatus.mutate({
      id,
      status: currentStatus === 'completed' ? 'todo' : 'completed',
    })
  }

  const loading = plansQ.isPending

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">我的刷题计划</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> 添加题目
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {!ownerProfileQ.isPending && !ownerProfileQ.data ? (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">还没有 owner 用户。</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">总体进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{completed} / {plans.length} 题已完成</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <TopicProgress
              topics={topics}
              plans={plans}
              loading={loading || topicsQ.isPending}
            />

            <div className="space-y-3">
              <div className="flex gap-2">
                {(['all', 'todo', 'completed'] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'all' ? '全部' : STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>

              <TopicFilter
                topics={topics}
                value={topicFilter}
                onChange={setTopicFilter}
                usedTopicIds={usedTopicIds}
                hasUnclassified={hasUnclassified}
              />
            </div>

            <div className="space-y-2">
              {loading && (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              )}

              {!loading && filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  还没有题目，点击右上角添加吧
                </div>
              )}

              {!loading &&
                filtered.map((plan) => {
                  const topic = plan.topic_id ? topicById.get(plan.topic_id) : null
                  return (
                    <Card key={plan.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleComplete(plan.id, plan.status)}
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
                              {topic && (
                                <Badge variant="outline" className="font-normal">
                                  {topic.name}
                                </Badge>
                              )}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePlan.mutate(plan.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加题目</DialogTitle>
            <DialogDescription>填写题目信息，加入你的刷题计划</DialogDescription>
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
              <Label>Topic（可选）</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.topic_id}
                onChange={(e) => setForm({ ...form, topic_id: e.target.value })}
              >
                <option value="">未分类</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {topics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  还没有分类，让 TA 在 admin 端建一些吧
                </p>
              )}
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={addPlan}
              disabled={createPlan.isPending || !form.lc_number || !form.title}
            >
              {createPlan.isPending ? '保存中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
