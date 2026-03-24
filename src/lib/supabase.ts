import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Message = {
  id: string
  seq_id: number
  username: string
  content: string | null
  file_url: string | null
  file_name: string | null
  is_sticker: boolean
  created_at: string
}
