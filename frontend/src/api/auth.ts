import { createClient } from '@supabase/supabase-js';

// Load keys from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

// Create the single instance
export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Auth Functions ---

export const loginUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
};

// FIX: Added 'name' parameter here
export const signUpUser = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name, // Saves the name to the user's profile metadata
            },
        },
    });
    if (error) throw error;
    return data;
};

export const logoutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};