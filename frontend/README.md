# DukeMeals frontend progress

So far, we used a Vite template in React (comes from npm create vite then choosing react) to help with frontend. 

We made three files: App.jsx, fakeData.js, and index.css. 

App.jsx contains our single page that has three sections: today's nutrition, food points, and weekly/monthly trends.

The data shown is synthetic for now (from fakeData.js).

To make the progress circles, we used [react-circular-progressbar](https://www.npmjs.com/package/react-circular-progressbar).

To make the charts, we used [Recharts](https://recharts.org).

## How to run

```
cd frontend
npm install
npm run dev
```

## What's in here

| File | Purpose |
| --- | --- |
| `src/App.jsx` | The page itself: navbar, Daily Intake (progress circles), Food Points, Trends |
| `src/fakeData.js` | Made-up numbers for the page to display |
| `src/index.css` | Colors, spacing, layout |
| `src/main.jsx` | Default from Vite, used to start React |

## How we used LLMs

After we got the Vite template, we made a wireframe mockup to give Claude as reference on how we aim to layout the page. Claude then generated the 3 new files, also making the suggestion of using recharts. We verified its work by running the page, and then reading each file to see what's redundant (for example, making the progress circles using an existing library) and making sure all of it is clean.
