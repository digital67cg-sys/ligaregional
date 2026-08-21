export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      affiliations: {
        Row: {
          amount: number
          due_date: string | null
          id: string
          receipt_url: string | null
          season_id: string
          status: string
          team_id: string
        }
        Insert: {
          amount?: number
          due_date?: string | null
          id?: string
          receipt_url?: string | null
          season_id: string
          status?: string
          team_id: string
        }
        Update: {
          amount?: number
          due_date?: string | null
          id?: string
          receipt_url?: string | null
          season_id?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      club_ranking_points: {
        Row: {
          achievement: string | null
          id: string
          points: number
          position: number | null
          season_id: string
          team_id: string
        }
        Insert: {
          achievement?: string | null
          id?: string
          points?: number
          position?: number | null
          season_id: string
          team_id: string
        }
        Update: {
          achievement?: string | null
          id?: string
          points?: number
          position?: number | null
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_ranking_points_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_ranking_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      league_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          id: number
          instagram: string | null
          league_name: string
          logo_url: string | null
          ranking_points: Json
          tagline: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          instagram?: string | null
          league_name?: string
          logo_url?: string | null
          ranking_points?: Json
          tagline?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          instagram?: string | null
          league_name?: string
          logo_url?: string | null
          ranking_points?: Json
          tagline?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          created_at: string
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
          team_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
          team_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          address: string | null
          away_confirmed: boolean
          away_score: number | null
          away_team_id: string
          created_at: string
          home_score: number | null
          home_team_id: string
          homologated: boolean
          id: string
          kickoff: string | null
          leg: number
          match_date: string | null
          notes: string | null
          proposal_by: string | null
          round: number
          season_id: string
          status: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          away_confirmed?: boolean
          away_score?: number | null
          away_team_id: string
          created_at?: string
          home_score?: number | null
          home_team_id: string
          homologated?: boolean
          id?: string
          kickoff?: string | null
          leg?: number
          match_date?: string | null
          notes?: string | null
          proposal_by?: string | null
          round?: number
          season_id: string
          status?: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          away_confirmed?: boolean
          away_score?: number | null
          away_team_id?: string
          created_at?: string
          home_score?: number | null
          home_team_id?: string
          homologated?: boolean
          id?: string
          kickoff?: string | null
          leg?: number
          match_date?: string | null
          notes?: string | null
          proposal_by?: string | null
          round?: number
          season_id?: string
          status?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_history: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          player_id: string | null
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          started_at: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          player_id?: string | null
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          started_at?: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          player_id?: string | null
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          started_at?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          player_id: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          player_id?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          player_id?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          category: string
          content: string | null
          id: string
          image_url: string | null
          published_at: string
          subtitle: string | null
          title: string
        }
        Insert: {
          category?: string
          content?: string | null
          id?: string
          image_url?: string | null
          published_at?: string
          subtitle?: string | null
          title: string
        }
        Update: {
          category?: string
          content?: string | null
          id?: string
          image_url?: string | null
          published_at?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_registrations: {
        Row: {
          id: string
          player_id: string
          registered_at: string
          season_id: string
          status: string
          team_id: string
        }
        Insert: {
          id?: string
          player_id: string
          registered_at?: string
          season_id: string
          status?: string
          team_id: string
        }
        Update: {
          id?: string
          player_id?: string
          registered_at?: string
          season_id?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_registrations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string | null
          created_at: string
          current_team_id: string | null
          document: string | null
          full_name: string
          id: string
          nickname: string | null
          photo_url: string | null
          position: string | null
          shirt_number: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          current_team_id?: string | null
          document?: string | null
          full_name: string
          id?: string
          nickname?: string | null
          photo_url?: string | null
          position?: string | null
          shirt_number?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          current_team_id?: string | null
          document?: string | null
          full_name?: string
          id?: string
          nickname?: string | null
          photo_url?: string | null
          position?: string | null
          shirt_number?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      referee_assignments: {
        Row: {
          away_share: number
          confirmed: boolean
          created_at: string
          fee: number
          home_share: number
          id: string
          match_id: string
          payment_status: string
          referee_id: string | null
          requested_by: string | null
        }
        Insert: {
          away_share?: number
          confirmed?: boolean
          created_at?: string
          fee?: number
          home_share?: number
          id?: string
          match_id: string
          payment_status?: string
          referee_id?: string | null
          requested_by?: string | null
        }
        Update: {
          away_share?: number
          confirmed?: boolean
          created_at?: string
          fee?: number
          home_share?: number
          id?: string
          match_id?: string
          payment_status?: string
          referee_id?: string | null
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referee_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_assignments_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "referees"
            referencedColumns: ["id"]
          },
        ]
      }
      referees: {
        Row: {
          availability: string | null
          id: string
          name: string
          phone: string | null
          role: string
          status: string
        }
        Insert: {
          availability?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string
          status?: string
        }
        Update: {
          availability?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          amount: number
          id: string
          paid_at: string | null
          season_id: string
          status: string
          team_id: string
        }
        Insert: {
          amount?: number
          id?: string
          paid_at?: string | null
          season_id: string
          status?: string
          team_id: string
        }
        Update: {
          amount?: number
          id?: string
          paid_at?: string | null
          season_id?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      regulations: {
        Row: {
          content: string | null
          file_url: string | null
          id: string
          season_id: string | null
          updated_at: string
          version: string
        }
        Insert: {
          content?: string | null
          file_url?: string | null
          id?: string
          season_id?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          content?: string | null
          file_url?: string | null
          id?: string
          season_id?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_teams: {
        Row: {
          id: string
          season_id: string
          status: string
          team_id: string
        }
        Insert: {
          id?: string
          season_id: string
          status?: string
          team_id: string
        }
        Update: {
          id?: string
          season_id?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          affiliation_fee: number
          champion_team_id: string | null
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          name: string
          points_draw: number
          points_win: number
          registration_fee: number
          start_date: string | null
          status: string
          tiebreakers: Json
          transfer_window_end: string | null
          transfer_window_start: string | null
          year: number
        }
        Insert: {
          affiliation_fee?: number
          champion_team_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name: string
          points_draw?: number
          points_win?: number
          registration_fee?: number
          start_date?: string | null
          status?: string
          tiebreakers?: Json
          transfer_window_end?: string | null
          transfer_window_start?: string | null
          year: number
        }
        Update: {
          affiliation_fee?: number
          champion_team_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name?: string
          points_draw?: number
          points_win?: number
          registration_fee?: number
          start_date?: string | null
          status?: string
          tiebreakers?: Json
          transfer_window_end?: string | null
          transfer_window_start?: string | null
          year?: number
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          featured: boolean
          id: string
          link: string | null
          logo_url: string | null
          name: string
          tier: string
        }
        Insert: {
          featured?: boolean
          id?: string
          link?: string | null
          logo_url?: string | null
          name: string
          tier?: string
        }
        Update: {
          featured?: boolean
          id?: string
          link?: string | null
          logo_url?: string | null
          name?: string
          tier?: string
        }
        Relationships: []
      }
      team_managers: {
        Row: {
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_managers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          city: string | null
          colors: string | null
          created_at: string
          crest_url: string | null
          district: string | null
          email: string | null
          founded_year: number | null
          id: string
          instagram: string | null
          name: string
          phone: string | null
          responsible_name: string | null
          short_name: string
          status: string
        }
        Insert: {
          city?: string | null
          colors?: string | null
          created_at?: string
          crest_url?: string | null
          district?: string | null
          email?: string | null
          founded_year?: number | null
          id?: string
          instagram?: string | null
          name: string
          phone?: string | null
          responsible_name?: string | null
          short_name: string
          status?: string
        }
        Update: {
          city?: string | null
          colors?: string | null
          created_at?: string
          crest_url?: string | null
          district?: string | null
          email?: string | null
          founded_year?: number | null
          id?: string
          instagram?: string | null
          name?: string
          phone?: string | null
          responsible_name?: string | null
          short_name?: string
          status?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string
          from_team_id: string | null
          id: string
          notes: string | null
          player_id: string
          requested_by: string | null
          season_id: string
          status: string
          to_team_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          from_team_id?: string | null
          id?: string
          notes?: string | null
          player_id: string
          requested_by?: string | null
          season_id: string
          status?: string
          to_team_id?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          from_team_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          requested_by?: string | null
          season_id?: string
          status?: string
          to_team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      standings: {
        Row: {
          draws: number | null
          goal_diff: number | null
          goals_against: number | null
          goals_for: number | null
          losses: number | null
          played: number | null
          points: number | null
          season_id: string | null
          team_id: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "season_teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      top_scorers: {
        Row: {
          goals: number | null
          player_id: string | null
          season_id: string | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_user_membership: {
        Args: {
          _player_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _team_id?: string
          _user_id: string
        }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: boolean }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manages_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      review_membership_request: {
        Args: { _approve: boolean; _notes?: string; _request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "club_manager" | "athlete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "club_manager", "athlete"],
    },
  },
} as const
