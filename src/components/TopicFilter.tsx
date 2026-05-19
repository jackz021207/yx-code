import { Button } from '@/components/ui/button'
import type { Topic } from '@/lib/database.types'

// 'all' = 不筛选；null = 未分类的题目；string = 具体 topic id
export type TopicFilterValue = 'all' | null | string

interface TopicFilterProps {
  topics: Topic[]
  value: TopicFilterValue
  onChange: (value: TopicFilterValue) => void
  // 已使用的 topic id 集合；未在其中的 topic 不展示（避免空 chips）
  usedTopicIds?: Set<string>
  hasUnclassified?: boolean
}

export function TopicFilter({
  topics,
  value,
  onChange,
  usedTopicIds,
  hasUnclassified,
}: TopicFilterProps) {
  const visibleTopics = usedTopicIds
    ? topics.filter((t) => usedTopicIds.has(t.id))
    : topics

  if (visibleTopics.length === 0 && !hasUnclassified) return null

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={value === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('all')}
      >
        全部 Topic
      </Button>
      {visibleTopics.map((t) => (
        <Button
          key={t.id}
          variant={value === t.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(t.id)}
        >
          {t.name}
        </Button>
      ))}
      {hasUnclassified && (
        <Button
          variant={value === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(null)}
          className="italic"
        >
          未分类
        </Button>
      )}
    </div>
  )
}
