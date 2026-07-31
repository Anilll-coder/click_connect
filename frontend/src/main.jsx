import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './utils/theme.jsx'

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App/>
  </ThemeProvider>
)
