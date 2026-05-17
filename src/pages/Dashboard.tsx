import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { Checkin, CheckinReply, Plan, Profile } from '@/lib/database.types'
import {
  Flame,
  CheckCircle2,
  CalendarDays,
  Trophy,
  LogOut,
  Heart,
  BookOpen,
  MessageCircle,
} from 'lucide-react'

export default function Dashboard() {
  const { user, profile, role, signOut } = useAuth()
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null)
  const [todayCheckin, setTodayCheckin] = useState<Checkin | null>(null)
  const [todayReplies, setTodayReplies] = useState<CheckinReply[]>([])
  const [streak, setStreak] = useState(0)
  const [totalCheckins, setTotalCheckins] = useState(0)
  const [recentPlans, setRecentPlans] = useState<Plan[]>([])
  const [monthCompleted, setMonthCompleted] = useState(0)
  const [note, setNote] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user || !role) return
    loadDashboardData()
  }, [user, role])

  async function loadDashboardData() {
    // 找到 owner 的 user_id（owner 自己就是 user.id；admin 需要查 owner profile）
    const { data: owner } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'owner')
      .maybeSingle()
    setOwnerProfile(owner)
    if (!owner) return

    const ownerId = owner.user_id

    // 今天的打卡
    const { data: todayData } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', ownerId)
      .eq('date', today)
      .maybeSingle()
    setTodayCheckin(todayData)

    if (todayData) {
      const { data: replies } = await supabase
        .from('checkin_replies')
        .select('*')
        .eq('checkin_id', todayData.id)
        .order('created_at', { ascending: true })
      setTodayReplies(replies ?? [])
    }

    // 所有打卡记录
    const { data: allCheckins } = await supabase
      .from('checkins')
      .select('date')
      .eq('user_id', ownerId)
      .order('date', { ascending: false })

    if (allCheckins) {
      setTotalCheckins(allCheckins.length)
      setStreak(calcStreak(allCheckins.map((c) => c.date)))
    }

    // 本月完成的题目
    const firstOfMonth = today.slice(0, 7) + '-01'
    const { count } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ownerId)
      .eq('status', 'completed')
      .gte('completed_at', firstOfMonth)
    setMonthCompleted(count ?? 0)

    // 近期计划
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', ownerId)
      .neq('status', 'completed')
      .order('target_date', { ascending: true })
      .limit(5)
    setRecentPlans(plans ?? [])
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

  async function handleCheckin() {
    if (!user || todayCheckin || checkingIn || role !== 'owner') return
    setCheckingIn(true)
    const { data } = await supabase
      .from('checkins')
      .insert({ user_id: user.id, date: today, note: note || null })
      .select()
      .single()
    if (data) {
      setTodayCheckin(data)
      setStreak((s) => s + 1)
      setTotalCheckins((t) => t + 1)
    }
    setCheckingIn(false)
  }

  const difficultyVariant: Record<string, 'easy' | 'medium' | 'hard'> = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
  }

  const isAdmin = role === 'admin'
  const ownerName = ownerProfile?.display_name ?? '她'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">LeetCode Tracker</h1>
            {isAdmin && (
              <p className="text-xs text-muted-foreground">
                正在查看 {ownerName} 的记录
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/diary">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-1" />
              打卡日记
            </Button>
          </Link>
          <Link to="/plan">
            <Button variant="outline" size="sm">
              {isAdmin ? '她的计划' : '我的计划'}
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-500">{streak}</div>
              <div className="text-sm text-muted-foreground">连续打卡天数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarDays className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-500">{totalCheckins}</div>
              <div className="text-sm text-muted-foreground">累计打卡</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-500">{monthCompleted}</div>
              <div className="text-sm text-muted-foreground">本月完成题目</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-500">{recentPlans.length}</div>
              <div className="text-sm text-muted-foreground">待完成计划</div>
            </CardContent>
          </Card>
        </div>

        {/* 今日打卡区 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {isAdmin ? `${ownerName} 的今日打卡` : '今日打卡'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayCheckin ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600">
                      {isAdmin ? `${ownerName} 今天打卡了` : '今天已打卡！'}
                    </p>
                    {todayCheckin.note && (
                      <p className="text-sm mt-1 whitespace-pre-wrap">{todayCheckin.note}</p>
                    )}
                  </div>
                </div>

                {/* 今日的回复 */}
                {todayReplies.length > 0 && (
                  <div className="border-l-2 border-pink-200 pl-4 ml-3 space-y-2">
                    {todayReplies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2">
                        <Heart className="h-4 w-4 text-pink-500 mt-1 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 提示去日记页回复 */}
                {isAdmin && (
                  <Link to="/diary">
                    <Button variant="outline" size="sm" className="w-full">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      去日记给 TA 留言
                    </Button>
                  </Link>
                )}
              </div>
            ) : isAdmin ? (
              <p className="text-muted-foreground text-sm py-2">
                {ownerName} 今天还没打卡哦
              </p>
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="今天刷了哪些题？有什么收获？（可选）"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleCheckin} disabled={checkingIn} className="w-full">
                  {checkingIn ? '打卡中...' : '立即打卡'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 近期计划预览 */}
        {recentPlans.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAdmin ? `${ownerName} 的待完成计划` : '待完成计划'}</CardTitle>
              <Link to="/plan">
                <Button variant="ghost" size="sm">查看全部</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPlans.map((plan) => (
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
              ))}
            </CardContent>
          </Card>
        )}

        {/* profile 未配置提示 */}
        {profile && !ownerProfile && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                还没有 owner 用户。请让女朋友先注册账号，她会自动成为 owner。
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
