// Synthetic data.
// Later, these will come from our Express API instead.
// (Written with help from Claude, an LLM. Checked by us.)

// Daily intake and random goals.
export const today = {
  calories: { eaten: 1450, goal: 2000 },
  protein: { eaten: 20, goal: 40 },
  carbs: { eaten: 180, goal: 250 },
  fats: { eaten: 45, goal: 65 },
  sugars: { eaten: 31, goal: 50 },
  cholesterol: { eaten: 210, goal: 300 },
}

export const foodPointsByWeek = [
  { week: 'Wk 1', spent: 95 },
  { week: 'Wk 2', spent: 120 },
  { week: 'Wk 3', spent: 110 },
  { week: 'Wk 4', spent: 140 },
  { week: 'Wk 5', spent: 105 },
  { week: 'Wk 6', spent: 130 },
  { week: 'Wk 7', spent: 125 },
  { week: 'Wk 8', spent: 115 },
]

export const foodPointsLeft = 1020

// Average calories and protein per day across weeks and months. We intend to replace this 
// with actual average formulas from past weeks later on.
export const weeklyTrends = [
  { label: 'Wk 5', calories: 1850, protein: 70 },
  { label: 'Wk 6', calories: 2100, protein: 85 },
  { label: 'Wk 7', calories: 1950, protein: 60 },
  { label: 'Wk 8', calories: 2200, protein: 90 },
]

export const monthlyTrends = [
  { label: 'Aug', calories: 1900, protein: 65 },
  { label: 'Sep', calories: 2050, protein: 78 },
  { label: 'Oct', calories: 2000, protein: 80 },
]
