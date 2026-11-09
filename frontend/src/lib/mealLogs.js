import { supabase } from './supabaseClient.js';

export async function createMealLog(mealLogData) {
    const { data: {session}, error } = await supabase.auth.getSession();
    if (error){
        throw new Error(error.message);
    } 
    
    if (!session) {
        throw new Error('You must be logged in to create a meal log.');
    }
    
    const response = await fetch('http://localhost:3001/api/meal-logs', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(mealLogData)
});

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create meal log.');
    }

return await response.json();
}