// src/services/supabaseClient.js
    import { createClient } from '@supabase/supabase-js';

    // Access environment variables using import.meta.env for Vite
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase URL or Key is missing. Please check your .env files.");
        // You might want to throw an error or display a message to the user
    }

    export const supabase = createClient(supabaseUrl, supabaseKey);
