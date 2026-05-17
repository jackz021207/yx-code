import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { Checkin, CheckinReply, Profile } from '@/lib/database.types'
import { ArrowLeft, Heart, Trash2, MessageCircle, Send } from 'lucide-react'

interface CheckinWithReplies extends Checkin {
  replies: CheckinReply[]
}

export default function Diary() {
  const { user, role } = useAuth()
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<CheckinWithReplies[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data: owner } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'owner')
      .maybeSingle()
    setOwnerProfile(owner)
    if (!owner) {
      setLoading(false)
      return
    }

    const { data: checkins } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', owner.user_id)
      .order('date', { ascending: false })
      .limit(60)

    if (!checkins || checkins.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const { data: replies } = await supabase
      .from('checkin_replies')
      .select('*')
      .in('checkin_id', checkins.map((c) => c.id))
      .order('created_at', { ascending: true })

    const grouped: CheckinWithReplies[] = checkins.map((c) => ({
      ...c,
      replies: (replies ?? []).filter((r) => r.checkin_id === c.id),
    }))
    setItems(grouped)
    setLoading(false)
  }

  async function sendReply(checkinId: string) {
    if (!user || role !== 'admin') return
    const content = drafts[checkinId]?.trim()
    if (!content) return

    setSending((s) => ({ ...s, [checkinId]: true }))
    const { data } = await supabase
      .from('checkin_replies')
      .insert({ checkin_id: checkinId, author_id: user.id, content })
      .select()
      .single()

    if (data) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === checkinId ? { ...c, replies: [...c.replies, data] } : c
        )
      )
      setDrafts((d) => ({ ...d, [checkinId]: '' }))
    }
    setSending((s) => ({ ...s, [checkinId]: false }))
  }

  async function deleteReply(replyId: string, checkinId: string) {
    await supabase.from('checkin_replies').delete().eq('id', replyId)
    setItems((prev) =>
      prev.map((c) =>
        c.id === checkinId
          ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) }
          : c
      )
    )
  }

  const isAdmin = role === 'admin'
  const ownerName = ownerProfile?.display_name ?? '她'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">打卡日记</h1>
            {isAdmin && (
              <p className="text-xs text-muted-foreground">
                你可以在每条打卡下给 {ownerName} 留言
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-4">
        {loading && (
          <p className="text-center text-muted-foreground py-12">加载中...</p>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {isAdmin ? `${ownerName} 还没有打卡记录` : '你还没有打卡，去 Dashboard 打卡吧'}
          </div>
        )}

        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="pt-6 space-y-4">
              {/* 打卡内容 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{formatDate(item.date)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(item.created_at)}
                  </span>
                </div>
                {item.note ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.note}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">这天没留言</p>
                )}
              </div>

              {/* 回复线程 */}
              {item.replies.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  {item.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-start gap-2 bg-pink-50 rounded-lg p-3 group"
                    >
                      <Heart className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {reply.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelative(reply.created_at)}
                        </p>
                      </div>
                      {isAdmin && reply.author_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => deleteReply(reply.id, item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* admin 的回复输入 */}
              {isAdmin && (
                <div className="border-t pt-3 space-y-2">
                  <Textarea
                    placeholder={`给 ${ownerName} 留点话...`}
                    value={drafts[item.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                    }
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => sendReply(item.id)}
                    disabled={!drafts[item.id]?.trim() || sending[item.id]}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {sending[item.id] ? '发送中...' : '发送'}
                  </Button>
                </div>
              )}

              {/* owner 没收到回复时的提示 */}
              {!isAdmin && item.replies.length === 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    还没有留言
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return `今天 · ${dateStr}`
  if (diff === 1) return `昨天 · ${dateStr}`
  return dateStr
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} 天前`
  return new Date(iso).toLocaleDateString()
}
