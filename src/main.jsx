import './splash.js' // first: it owns the intro screen that covers loading
import './sound.js' // liquid click sounds (one global listener)
import './scrollRestore.js' // refresh keeps your place
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './theme.jsx'
import { initQuality } from './perf.js'

// pick the quality level (and set html[data-perf]) before the first paint
initQuality()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
