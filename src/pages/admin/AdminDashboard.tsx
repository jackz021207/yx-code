import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame,
  CheckCircle2,
  CalendarDays,
  Trophy,
  LogOut,
  Heart,
  BookOpen,
  MessageCircle,
  ListChecks,
} from 'lucide-react'
import {
  useOwnerProfile,
  useTodayCheckin,
  useTodayReplies,
  useAllCheckinDates,
  useMonthCompleted,
  useRecentPlans,
  useAllPlans,
  useTopics,
} from '@/lib/queries'
import { TopicProgress } from '@/components/TopicProgress'

export default function AdminDashboard() {
  const { signOut } = useAuth()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const ownerProfileQ = useOwnerProfile()
  const ownerId = ownerProfileQ.data?.user_id

  const todayCheckinQ = useTodayCheckin(ownerId, today)
  const todayRepliesQ = useTodayReplies(todayCheckinQ.data?.id)
  const allDatesQ = useAllCheckinDates(ownerId)
  const monthCompletedQ = useMonthCompleted(ownerId, monthStart)
  const recentPlansQ = useRecentPlans(ownerId)
  const allPlansQ = useAllPlans(ownerId)
  const topicsQ = useTopics()

  const streak = useMemo(() => calcStreak(allDatesQ.data ?? []), [allDatesQ.data])
  const totalCheckins = allDatesQ.data?.length ?? 0
  const ownerName = ownerProfileQ.data?.display_name ?? '她'

  const difficultyVariant: Record<string, 'easy' | 'medium' | 'hard'> = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">陪伴台</h1>
            <p className="text-xs text-muted-foreground">
              正在查看 {ownerName} 的进度
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/diary">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-1" />
              日记 & 留言
            </Button>
          </Link>
          <Link to="/admin/plan">
            <Button variant="outline" size="sm">
              <ListChecks className="h-4 w-4 mr-1" />
              排题
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {!ownerProfileQ.isPending && !ownerProfileQ.data ? (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                还没有 owner 用户。请让她先注册账号，她会自动成为 owner。
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />}
                value={streak}
                label="连续打卡天数"
                color="text-orange-500"
                loading={allDatesQ.isPending}
              />
              <StatCard
                icon={<CalendarDays className="h-8 w-8 text-blue-500 mx-auto mb-2" />}
                value={totalCheckins}
                label="累计打卡"
                color="text-blue-500"
                loading={allDatesQ.isPending}
              />
              <StatCard
                icon={<CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />}
                value={monthCompletedQ.data ?? 0}
                label="本月完成题目"
                color="text-green-500"
                loading={monthCompletedQ.isPending}
              />
              <StatCard
                icon={<Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />}
                value={recentPlansQ.data?.length ?? 0}
                label="待完成计划"
                color="text-purple-500"
                loading={recentPlansQ.isPending}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {ownerName} 的今日打卡
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayCheckinQ.isPending ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : todayCheckinQ.data ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-600">
                          {ownerName} 今天打卡了
                        </p>
                        {todayCheckinQ.data.note && (
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {todayCheckinQ.data.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {todayRepliesQ.data && todayRepliesQ.data.length > 0 && (
                      <div className="border-l-2 border-pink-200 pl-4 ml-3 space-y-2">
                        {todayRepliesQ.data.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <Heart className="h-4 w-4 text-pink-500 mt-1 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <Link to="/admin/diary">
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        去日记给 TA 留言
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-2">
                    {ownerName} 今天还没打卡哦
                  </p>
                )}
              </CardContent>
            </Card>

            <TopicProgress
              topics={topicsQ.data ?? []}
              plans={allPlansQ.data ?? []}
              loading={allPlansQ.isPending || topicsQ.isPending}
              title={`${ownerName} 的 Topic 进度`}
            />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{ownerName} 的待完成计划</CardTitle>
                <Link to="/admin/plan">
                  <Button variant="ghost" size="sm">去排题</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentPlansQ.isPending ? (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-3/4" />
                  </>
                ) : recentPlansQ.data && recentPlansQ.data.length > 0 ? (
                  recentPlansQ.data.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{plan.lc_number}
                        </span>
                        <span className="font-medium truncate">{plan.title}</span>
                        <Badge variant={difficultyVariant[plan.difficulty]}>
                          {plan.difficulty === 'easy'
                            ? '简单'
                            : plan.difficulty === 'medium'
                            ? '中等'
                            : '困难'}
                        </Badge>
                      </div>
                      {plan.target_date && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {plan.target_date}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {ownerName} 暂无待完成题目，去排几道吧
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  color,
  loading,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        {icon}
        {loading ? (
          <Skeleton className="h-9 w-12 mx-auto" />
        ) : (
          <div className={`text-3xl font-bold ${color}`}>{value}</div>
        )}
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...dates].sort((a, b) => b.localeCompare(a))
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)
  for (const dateStr of sorted) {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    const diff = (current.getTime() - d.getTime()) / 86400000
    if (diff <= 1) {
      streak++
      current = d
    } else {
      break
    }
  }
  return streak
}
