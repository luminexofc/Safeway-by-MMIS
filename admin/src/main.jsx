import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from '../../shared/theme.jsx'
import { client } from './lib/appwrite'

// Confirm the Appwrite endpoint + project are reachable, once per load.
client
  .ping()
  .then((r) => console.info('[Appwrite] ping:', r))
  .catch((err) => console.warn('[Appwrite] ping failed:', err?.message || err))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
