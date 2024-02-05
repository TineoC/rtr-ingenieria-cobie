import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://pvufuoehcqbckbggpfzg.supabase.co',
  // @ts-ignore
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
