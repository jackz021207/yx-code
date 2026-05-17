import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Checkin, CheckinReply, Plan, PlanStatus, Profile } from '@/lib/database.types'

// 统一 query key 工厂，避免拼写错误
export const qk = {
  ownerProfile: ['owner-profile'] as const,
  todayCheckin: (date: string) => ['today-checkin', date] as const,
  todayReplies: (checkinId: string | undefined) => ['today-replies', checkinId] as const,
  allCheckins: ['all-checkins'] as const,
  monthCompleted: (month: string) => ['month-completed', month] as const,
  recentPlans: ['recent-plans'] as const,
  allPlans: ['all-plans'] as const,
  diary: ['diary'] as const,
}

// ========== 查询 ==========

export function useOwnerProfile() {
  return useQuery({
    queryKey: qk.ownerProfile,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'owner')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useTodayCheckin(ownerId: string | undefined, date: string) {
  return useQuery({
    queryKey: qk.todayCheckin(date),
    enabled: !!ownerId,
    queryFn: async (): Promise<Checkin | null> => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', ownerId!)
        .eq('date', date)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useTodayReplies(checkinId: string | undefined) {
  return useQuery({
    queryKey: qk.todayReplies(checkinId),
    enabled: !!checkinId,
    queryFn: async (): Promise<CheckinReply[]> => {
      const { data, error } = await supabase
        .from('checkin_replies')
        .select('*')
        .eq('checkin_id', checkinId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAllCheckinDates(ownerId: string | undefined) {
  return useQuery({
    queryKey: qk.allCheckins,
    enabled: !!ownerId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('checkins')
        .select('date')
        .eq('user_id', ownerId!)
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []).map((c) => c.date)
    },
  })
}

export function useMonthCompleted(ownerId: string | undefined, monthStart: string) {
  return useQuery({
    queryKey: qk.monthCompleted(monthStart),
    enabled: !!ownerId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId!)
        .eq('status', 'completed')
        .gte('completed_at', monthStart)
      if (error) throw error
      return count ?? 0
    },
  })
}

export function useRecentPlans(ownerId: string | undefined) {
  return useQuery({
    queryKey: qk.recentPlans,
    enabled: !!ownerId,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', ownerId!)
        .neq('status', 'completed')
        .order('target_date', { ascending: true })
        .limit(5)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAllPlans(ownerId: string | undefined) {
  return useQuery({
    queryKey: qk.allPlans,
    enabled: !!ownerId,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', ownerId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export interface CheckinWithReplies extends Checkin {
  replies: CheckinReply[]
}

export function useDiary(ownerId: string | undefined) {
  return useQuery({
    queryKey: qk.diary,
    enabled: !!ownerId,
    queryFn: async (): Promise<CheckinWithReplies[]> => {
      const { data: checkins, error: e1 } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', ownerId!)
        .order('date', { ascending: false })
        .limit(60)
      if (e1) throw e1
      if (!checkins || checkins.length === 0) return []

      const { data: replies, error: e2 } = await supabase
        .from('checkin_replies')
        .select('*')
        .in('checkin_id', checkins.map((c) => c.id))
        .order('created_at', { ascending: true })
      if (e2) throw e2

      return checkins.map((c) => ({
        ...c,
        replies: (replies ?? []).filter((r) => r.checkin_id === c.id),
      }))
    },
  })
}

// ========== 变更（写操作） ==========

export function useCreateCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; date: string; note: string | null }) => {
      const { data, error } = await supabase
        .from('checkins')
        .insert({ user_id: input.userId, date: input.date, note: input.note })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allCheckins })
      qc.invalidateQueries({ queryKey: ['today-checkin'] })
      qc.invalidateQueries({ queryKey: qk.diary })
    },
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      lc_number: number
      title: string
      difficulty: 'easy' | 'medium' | 'hard'
      tags: string[]
      target_date: string | null
      note: string | null
    }) => {
      const { data, error } = await supabase
        .from('plans')
        .insert({
          user_id: input.userId,
          lc_number: input.lc_number,
          title: input.title,
          difficulty: input.difficulty,
          tags: input.tags,
          target_date: input.target_date,
          status: 'todo',
          note: input.note,
          completed_at: null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allPlans })
      qc.invalidateQueries({ queryKey: qk.recentPlans })
    },
  })
}

export function useUpdatePlanStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: PlanStatus }) => {
      const { data, error } = await supabase
        .from('plans')
        .update({
          status: input.status,
          completed_at: input.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', input.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allPlans })
      qc.invalidateQueries({ queryKey: qk.recentPlans })
      qc.invalidateQueries({ queryKey: ['month-completed'] })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plans').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allPlans })
      qc.invalidateQueries({ queryKey: qk.recentPlans })
    },
  })
}

export function useCreateReply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { checkinId: string; authorId: string; content: string }) => {
      const { data, error } = await supabase
        .from('checkin_replies')
        .insert({
          checkin_id: input.checkinId,
          author_id: input.authorId,
          content: input.content,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.diary })
      qc.invalidateQueries({ queryKey: ['today-replies'] })
    },
  })
}

export function useDeleteReply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checkin_replies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.diary })
      qc.invalidateQueries({ queryKey: ['today-replies'] })
    },
  })
}
