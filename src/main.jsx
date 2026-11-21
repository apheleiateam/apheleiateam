import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Preview alternate palettes with ?theme=violet
const theme = new URLSearchParams(window.location.search).get('theme')
if (theme) document.documentElement.dataset.theme = theme

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
