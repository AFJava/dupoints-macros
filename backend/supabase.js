
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');

// Read the Supabase project credentials from the backend environment.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Create a Supabase client for server-side authentication.
// Realtime is disabled because this backend only needs authentication.
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    realtime: {
        transport: undefined
    }
});

module.exports = supabase;
