import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PolicyProvider from './components/legal/PolicyProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PolicyProvider><App /></PolicyProvider>
  </StrictMode>,
)
