export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          invite_code: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['households']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['households']['Insert']>
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          display_name: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['household_members']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['household_members']['Insert']>
      }
      cost_centers: {
        Row: {
          id: string
          household_id: string
          name: string
          color: string
          savings_pct: number
          current_balance: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cost_centers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cost_centers']['Insert']>
      }
      income_entries: {
        Row: {
          id: string
          cost_center_id: string
          amount: number
          savings_amount: number
          notes: string | null
          entry_date: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['income_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['income_entries']['Insert']>
      }
      budget_categories: {
        Row: {
          id: string
          household_id: string
          name: string
          icon: string | null
          color: string
          monthly_amount: number
          alert_threshold_pct: number
          pool_type: string
          cost_center_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['budget_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['budget_categories']['Insert']>
      }
      recurring_expenses: {
        Row: {
          id: string
          category_id: string
          description: string
          amount: number
          day_of_month: number
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recurring_expenses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['recurring_expenses']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          amount: number
          description: string
          transaction_date: string
          type: string
          category_id: string | null
          cost_center_id: string | null
          is_recurring: boolean
          recurring_expense_id: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      cost_center_transfers: {
        Row: {
          id: string
          household_id: string
          from_cost_center_id: string
          to_cost_center_id: string | null
          amount: number
          notes: string | null
          transfer_date: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cost_center_transfers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cost_center_transfers']['Insert']>
      }
      savings_fund: {
        Row: {
          id: string
          household_id: string
          total_balance: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['savings_fund']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['savings_fund']['Insert']>
      }
      savings_entries: {
        Row: {
          id: string
          household_id: string
          amount: number
          source_type: string
          source_cost_center_id: string | null
          notes: string | null
          entry_date: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['savings_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['savings_entries']['Insert']>
      }
      monthly_periods: {
        Row: {
          id: string
          household_id: string
          year: number
          month: number
          status: string
          surplus_transferred: number | null
          closed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['monthly_periods']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['monthly_periods']['Insert']>
      }
      budget_category_snapshots: {
        Row: {
          id: string
          category_id: string
          household_id: string
          year: number
          month: number
          allocated_amount: number
          spent_amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['budget_category_snapshots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['budget_category_snapshots']['Insert']>
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type CostCenter = Tables<'cost_centers'>
export type BudgetCategory = Tables<'budget_categories'>
export type Transaction = Tables<'transactions'>
export type SavingsEntry = Tables<'savings_entries'>
export type IncomeEntry = Tables<'income_entries'>
export type HouseholdMember = Tables<'household_members'>
export type RecurringExpense = Tables<'recurring_expenses'>
export type BudgetCategorySnapshot = Tables<'budget_category_snapshots'>
