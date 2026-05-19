import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import type { Difficulty, Plan, PlanStatus, Topic } from '@/lib/database.types'
import {
  Plus,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Trash2,
  Pencil,
  PlayCircle,
  PauseCircle,
  Tags,
  X,
  Check,
  GripVertical,
} from 'lucide-react'
import {
  useOwnerProfile,
  useAllPlans,
  useCreatePlan,
  useUpdatePlan,
  useUpdatePlanStatus,
  useDeletePlan,
  useReorderPlans,
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from '@/lib/queries'
import { TopicFilter, type TopicFilterValue } from '@/components/TopicFilter'
import { TopicProgress } from '@/components/TopicProgress'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

type FormState = {
  lc_number: string
  title: string
  difficulty: Difficulty
  topic_id: string // '' 表示未分类
  tags: string
  target_date: string
  note: string
}

const defaultForm: FormState = {
  lc_number: '',
  title: '',
  difficulty: 'medium',
  topic_id: '',
  tags: '',
  target_date: '',
  note: '',
}

export default function AdminPlanPage() {
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all')
  const [topicFilter, setTopicFilter] = useState<TopicFilterValue>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [topicMgrOpen, setTopicMgrOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  const ownerProfileQ = useOwnerProfile()
  const ownerId = ownerProfileQ.data?.user_id
  const plansQ = useAllPlans(ownerId)
  const topicsQ = useTopics()

  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const updateStatus = useUpdatePlanStatus()
  const deletePlan = useDeletePlan()
  const reorderPlans = useReorderPlans()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
  const ownerName = ownerProfileQ.data?.display_name ?? '她'

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    setForm({
      lc_number: String(plan.lc_number),
      title: plan.title,
      difficulty: plan.difficulty,
      topic_id: plan.topic_id ?? '',
      tags: plan.tags.join(', '),
      target_date: plan.target_date ?? '',
      note: plan.note ?? '',
    })
    setDialogOpen(true)
  }

  async function submitForm() {
    if (!form.lc_number || !form.title) return
    const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const lc = parseInt(form.lc_number)
    const topic_id = form.topic_id || null

    if (editing) {
      await updatePlan.mutateAsync({
        id: editing.id,
        topic_id,
        lc_number: lc,
        title: form.title,
        difficulty: form.difficulty,
        tags,
        target_date: form.target_date || null,
        note: form.note || null,
      })
    } else {
      if (!ownerId) return
      await createPlan.mutateAsync({
        userId: ownerId,
        topic_id,
        lc_number: lc,
        title: form.title,
        difficulty: form.difficulty,
        tags,
        target_date: form.target_date || null,
        note: form.note || null,
      })
    }
    setDialogOpen(false)
    setEditing(null)
    setForm(defaultForm)
  }

  const submitting = createPlan.isPending || updatePlan.isPending
  const loading = plansQ.isPending

  const dragEnabled = statusFilter === 'all' && topicFilter === 'all'

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = plans.findIndex((p) => p.id === active.id)
    const newIdx = plans.findIndex((p) => p.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const newOrder = arrayMove(plans, oldIdx, newIdx).map((p) => p.id)
    reorderPlans.mutate(newOrder)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">为 {ownerName} 排题</h1>
            <p className="text-xs text-muted-foreground">
              你添加的题目会出现在她的计划里
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTopicMgrOpen(true)}>
            <Tags className="h-4 w-4 mr-1" /> 管理分类
          </Button>
          <Button onClick={openCreate} size="sm" disabled={!ownerId}>
            <Plus className="h-4 w-4 mr-1" /> 添加题目
          </Button>
        </div>
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
                      <span>
                        {completed} / {plans.length} 题已完成
                      </span>
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
                {(['all', 'todo', 'in_progress', 'completed'] as const).map((s) => (
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

            {!dragEnabled && (
              <p className="text-xs text-muted-foreground -mt-2">
                提示：切回 "全部" + "全部 Topic" 才能拖拽排序
              </p>
            )}

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
                  这里还没有题目，点右上角给她排一道吧
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filtered.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filtered.map((plan) => (
                      <SortablePlanRow
                        key={plan.id}
                        plan={plan}
                        topic={plan.topic_id ? topicById.get(plan.topic_id) ?? null : null}
                        dragEnabled={dragEnabled}
                        onToggleComplete={() =>
                          updateStatus.mutate({
                            id: plan.id,
                            status: plan.status === 'completed' ? 'todo' : 'completed',
                          })
                        }
                        onStart={() =>
                          updateStatus.mutate({ id: plan.id, status: 'in_progress' })
                        }
                        onPause={() =>
                          updateStatus.mutate({ id: plan.id, status: 'todo' })
                        }
                        onEdit={() => openEdit(plan)}
                        onDelete={() => {
                          if (confirm(`删除题目 #${plan.lc_number} ${plan.title}？`)) {
                            deletePlan.mutate(plan.id)
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑题目' : '添加题目'}</DialogTitle>
            <DialogDescription>
              {editing ? `修改 #${editing.lc_number} 的信息` : `给 ${ownerName} 加一道新题`}
            </DialogDescription>
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
                  还没有分类，点击右上角"管理分类"添加
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
                placeholder="思路、注意事项、想让她重点关注什么..."
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
              onClick={submitForm}
              disabled={submitting || !form.lc_number || !form.title}
            >
              {submitting ? '保存中...' : editing ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TopicManagerDialog
        open={topicMgrOpen}
        onOpenChange={setTopicMgrOpen}
        topics={topics}
        usedTopicIds={usedTopicIds}
      />
    </div>
  )
}

function TopicManagerDialog({
  open,
  onOpenChange,
  topics,
  usedTopicIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topics: Topic[]
  usedTopicIds: Set<string>
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const createTopic = useCreateTopic()
  const updateTopic = useUpdateTopic()
  const deleteTopic = useDeleteTopic()

  async function addTopic() {
    const name = newName.trim()
    if (!name) return
    if (topics.some((t) => t.name === name)) {
      alert('已有同名分类')
      return
    }
    await createTopic.mutateAsync({ name, sort_order: topics.length })
    setNewName('')
  }

  function startEdit(t: Topic) {
    setEditingId(t.id)
    setEditingName(t.name)
  }

  async function saveEdit() {
    if (!editingId) return
    const name = editingName.trim()
    if (!name) return
    if (topics.some((t) => t.id !== editingId && t.name === name)) {
      alert('已有同名分类')
      return
    }
    await updateTopic.mutateAsync({ id: editingId, name })
    setEditingId(null)
    setEditingName('')
  }

  async function removeTopic(t: Topic) {
    const used = usedTopicIds.has(t.id)
    const confirmMsg = used
      ? `「${t.name}」下还有题目，删除后这些题会变成未分类。确认删除？`
      : `确认删除分类「${t.name}」？`
    if (!confirm(confirmMsg)) return
    await deleteTopic.mutateAsync(t.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>管理 Topic 分类</DialogTitle>
          <DialogDescription>
            分类用于把题目按主题归类，例如「动态规划」「双指针」
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="新分类名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTopic()
            }}
          />
          <Button
            onClick={addTopic}
            disabled={!newName.trim() || createTopic.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> 添加
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              还没有分类
            </p>
          ) : (
            topics.map((t) => {
              const isEditing = editingId === t.id
              const used = usedTopicIds.has(t.id)
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2 border rounded-md p-2"
                >
                  {isEditing ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit()
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={saveEdit}
                        disabled={!editingName.trim() || updateTopic.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{t.name}</span>
                      {used && (
                        <span className="text-xs text-muted-foreground">使用中</span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(t)}
                        title="重命名"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTopic(t)}
                        className="text-muted-foreground hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SortablePlanRow({
  plan,
  topic,
  dragEnabled,
  onToggleComplete,
  onStart,
  onPause,
  onEdit,
  onDelete,
}: {
  plan: Plan
  topic: Topic | null
  dragEnabled: boolean
  onToggleComplete: () => void
  onStart: () => void
  onPause: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id, disabled: !dragEnabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              disabled={!dragEnabled}
              className={`flex-shrink-0 text-muted-foreground touch-none ${
                dragEnabled
                  ? 'cursor-grab active:cursor-grabbing hover:text-foreground'
                  : 'cursor-not-allowed opacity-40'
              }`}
              title={dragEnabled ? '拖动调整顺序' : '清除筛选才能拖拽'}
              aria-label="拖拽排序"
            >
              <GripVertical className="h-5 w-5" />
            </button>

            <button
              onClick={onToggleComplete}
              className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
              title={plan.status === 'completed' ? '标为待做' : '标为完成'}
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
                  className={`font-medium ${
                    plan.status === 'completed'
                      ? 'line-through text-muted-foreground'
                      : ''
                  }`}
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
                {plan.status === 'in_progress' && (
                  <Badge variant="secondary">进行中</Badge>
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
                {plan.note && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    · {plan.note}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {plan.status === 'todo' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onStart}
                  className="text-xs"
                  title="标为进行中"
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
              )}
              {plan.status === 'in_progress' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPause}
                  className="text-xs"
                  title="撤回到待做"
                >
                  <PauseCircle className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="text-muted-foreground hover:text-primary"
                title="编辑"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
