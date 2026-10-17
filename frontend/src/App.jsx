// (Written with help from Claude, an LLM.)

import { useState } from 'react'
// Recharts is a library that draws bar charts for us.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
// react-circular-progressbar is a library that draws progress circles for us.
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
// get synthetic data for examples
import { today, foodPointsByWeek, foodPointsLeft, weeklyTrends, monthlyTrends } from './fakeData.js'

// A progress circle for visualizing daily intakes. Used for calories, protein, carbs, fat tracking. 
function ProgressCircle({ eaten, goal, color, size }) {
  const percent = Math.round((eaten / goal) * 100)

  // this part comes from the documentation of react-circular-progressbar
  return (
    <div style={{ width: size, flexShrink: 0 }}>
      <CircularProgressbar
        value={percent}
        text={`${percent}%`}
        styles={buildStyles({ pathColor: color, textColor: color })}
      />
    </div>
  )
}

export default function App() {
  // Which trends to show: 'weekly' or 'monthly'. Starts on weekly.
  const [view, setView] = useState('weekly')
  const trends = view === 'weekly' ? weeklyTrends : monthlyTrends

  // Food points spent this week = the last bar in the chart.
  const spentThisWeek = foodPointsByWeek[foodPointsByWeek.length - 1].spent

  return (
    <div className="page">
      {/* Top bar */}
      <nav className="navbar">
        <a href="#">Home</a>
        <a href="#">Meal History</a>
        <span className="logo">DukeMeals</span>
      </nav>

      {/* Section 1: today's nutrition */}
      <h1>Daily Intake</h1>

      <div className="row">
        <ProgressCircle eaten={today.calories.eaten} goal={today.calories.goal} color="#22a06b" size={110} />
        <div>
          <h2>Calories</h2>
          <p>{today.calories.eaten} out of {today.calories.goal} calories eaten today.</p>
        </div>
      </div>

      <div className="row">
        <div className="row">
          <ProgressCircle eaten={today.protein.eaten} goal={today.protein.goal} color="#eab308" size={70} />
          <div>
            <h3>Protein</h3>
            <p>{today.protein.eaten}g out of {today.protein.goal}g</p>
          </div>
        </div>
        <div className="row">
          <ProgressCircle eaten={today.carbs.eaten} goal={today.carbs.goal} color="#eab308" size={70} />
          <div>
            <h3>Carbs</h3>
            <p>{today.carbs.eaten}g out of {today.carbs.goal}g</p>
          </div>
        </div>
        <div className="row">
          <ProgressCircle eaten={today.fats.eaten} goal={today.fats.goal} color="#eab308" size={70} />
          <div>
            <h3>Fats</h3>
            <p>{today.fats.eaten}g out of {today.fats.goal}g</p>
          </div>
        </div>
      </div>

      <div className="row">
        <div>
          <h3>Added Sugars</h3>
          <p>{today.sugars.eaten}g out of {today.sugars.goal}g</p>
        </div>
        <div>
          <h3>Cholesterol</h3>
          <p>{today.cholesterol.eaten}mg out of {today.cholesterol.goal}mg</p>
        </div>
      </div>

      {/* Section 2: food points */}
      <h1>Food Points</h1>
      <p>You spent {spentThisWeek} food points this week. You have {foodPointsLeft} left.</p>
      {/* isAnimationActive={false} turns off the "grow" animation so bars show right away. */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={foodPointsByWeek}>
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="spent" fill="#012169" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>

      {/* Section 3: trends, with a button to switch weekly / monthly */}
      <h1>Trends</h1>
      <button onClick={() => setView('weekly')} disabled={view === 'weekly'}>Weekly</button>
      <button onClick={() => setView('monthly')} disabled={view === 'monthly'}>Monthly</button>

      <div className="row">
        <div className="chart">
          <h3>Average calories per day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trends}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calories" fill="#22a06b" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart">
          <h3>Average protein per day (g)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trends}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="protein" fill="#eab308" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
