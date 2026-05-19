import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Heart, Trash2, Send } from 'lucide-react'
import {
  useOwnerProfile,
  useDiary,
  useCreateReply,
  useDeleteReply,
} from '@/lib/queries'

export default function AdminDiary() {
  const { user } = useAuth()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const ownerProfileQ = useOwnerProfile()
  const ownerId = ownerProfileQ.data?.user_id
  const diaryQ = useDiary(ownerId)

  const createReply = useCreateReply()
  const deleteReply = useDeleteReply()

  const ownerName = ownerProfileQ.data?.display_name ?? '她'
  const items = diaryQ.data ?? []
  const loading = diaryQ.isPending

  async function sendReply(checkinId: string) {
    if (!user) return
    const content = drafts[checkinId]?.trim()
    if (!content) return
    await createReply.mutateAsync({
      checkinId,
      authorId: user.id,
      content,
    })
    setDrafts((d) => ({ ...d, [checkinId]: '' }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">打卡日记</h1>
            <p className="text-xs text-muted-foreground">
              你可以在每条打卡下给 {ownerName} 留言
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-4">
        {!ownerProfileQ.isPending && !ownerProfileQ.data ? (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">还没有 owner 用户。</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {loading && (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            )}

            {!loading && items.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {ownerName} 还没有打卡记录
              </div>
            )}

            {!loading &&
              items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          {formatDate(item.date)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(item.created_at)}
                        </span>
                      </div>
                      {item.note ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {item.note}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">这天没留言</p>
                      )}
                    </div>

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
                            {reply.author_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => deleteReply.mutate(reply.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

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
                        disabled={!drafts[item.id]?.trim() || createReply.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {createReply.isPending ? '发送中...' : '发送'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </>
        )}
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
