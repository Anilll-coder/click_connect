import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './utils/theme.jsx'
import { ToastProvider } from './components/Toast.jsx'

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <ToastProvider>
      <App/>
    </ToastProvider>
  </ThemeProvider>
)
