import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { startBootLoader } from './bootLoader.ts'
import App from './App.tsx'

startBootLoader()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
