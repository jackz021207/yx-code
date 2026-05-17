export type Difficulty = 'easy' | 'medium' | 'hard'
export type PlanStatus = 'todo' | 'in_progress' | 'completed'

export interface Database {
  public: {
    Tables: {
      checkins: {
        Row: {
          id: string
          user_id: string
          date: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          user_id: string
          lc_number: number
          title: string
          difficulty: Difficulty
          tags: string[]
          target_date: string | null
          status: PlanStatus
          note: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lc_number: number
          title: string
          difficulty: Difficulty
          tags?: string[]
          target_date?: string | null
          status?: PlanStatus
          note?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lc_number?: number
          title?: string
          difficulty?: Difficulty
          tags?: string[]
          target_date?: string | null
          status?: PlanStatus
          note?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
