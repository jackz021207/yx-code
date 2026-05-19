export type Difficulty = 'easy' | 'medium' | 'hard'
export type PlanStatus = 'todo' | 'in_progress' | 'completed'
export type Role = 'owner' | 'admin'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          display_name: string | null
          role: Role
          created_at: string
        }
        Insert: {
          user_id: string
          display_name?: string | null
          role: Role
          created_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string | null
          role?: Role
          created_at?: string
        }
        Relationships: []
      }
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
          topic_id: string | null
          lc_number: number
          title: string
          difficulty: Difficulty
          tags: string[]
          target_date: string | null
          status: PlanStatus
          note: string | null
          sort_order: number
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id?: string | null
          lc_number: number
          title: string
          difficulty: Difficulty
          tags?: string[]
          target_date?: string | null
          status?: PlanStatus
          note?: string | null
          sort_order?: number
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string | null
          lc_number?: number
          title?: string
          difficulty?: Difficulty
          tags?: string[]
          target_date?: string | null
          status?: PlanStatus
          note?: string | null
          sort_order?: number
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      checkin_replies: {
        Row: {
          id: string
          checkin_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          checkin_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          checkin_id?: string
          author_id?: string
          content?: string
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

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type CheckinReply = Database['public']['Tables']['checkin_replies']['Row']
export type Topic = Database['public']['Tables']['topics']['Row']
