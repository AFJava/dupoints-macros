
import { supabase } from './supabaseClient.js';

export async function getMealTotals({ nutrients, start_date, end_date }) {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message);
    }

    if (!session) {
        throw new Error('You must be logged in to retrieve meal totals.');
    }

    const params = new URLSearchParams({
        nutrients: nutrients.join(','),
        start_date,
        end_date
    });

    const response = await fetch(
        `http://localhost:3001/api/meal-totals?${params.toString()}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retrieve meal totals.');
    }

    return await response.json();
}
