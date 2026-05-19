import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { Plan, Topic } from '@/lib/database.types'

interface TopicProgressProps {
  topics: Topic[]
  plans: Plan[]
  loading: boolean
  title?: string
}

interface TopicRow {
  id: string | null
  name: string
  total: number
  done: number
}

export function TopicProgress({
  topics,
  plans,
  loading,
  title = '按 Topic 看进度',
}: TopicProgressProps) {
  const rows = useMemo<TopicRow[]>(() => {
    const byTopic = new Map<string | null, { total: number; done: number }>()
    for (const p of plans) {
      const key = p.topic_id ?? null
      const slot = byTopic.get(key) ?? { total: 0, done: 0 }
      slot.total += 1
      if (p.status === 'completed') slot.done += 1
      byTopic.set(key, slot)
    }

    const named: TopicRow[] = topics
      .map((t) => {
        const stat = byTopic.get(t.id) ?? { total: 0, done: 0 }
        return { id: t.id, name: t.name, total: stat.total, done: stat.done }
      })
      .filter((r) => r.total > 0)

    const unclassified = byTopic.get(null)
    if (unclassified && unclassified.total > 0) {
      named.push({
        id: null,
        name: '未分类',
        total: unclassified.total,
        done: unclassified.done,
      })
    }

    return named
  }, [topics, plans])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            还没有题目
          </p>
        ) : (
          rows.map((row) => {
            const pct = row.total === 0 ? 0 : Math.round((row.done / row.total) * 100)
            return (
              <div key={row.id ?? 'none'} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={row.id === null ? 'text-muted-foreground italic' : ''}>
                    {row.name}
                  </span>
                  <span className="text-muted-foreground">
                    {row.done} / {row.total} · {pct}%
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
