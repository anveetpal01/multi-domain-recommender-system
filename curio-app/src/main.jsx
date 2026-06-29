import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './shared/ThemeContext.jsx'
import { AuthProvider } from './shared/AuthContext.jsx'
import { CatalogProvider } from './shared/CatalogContext.jsx'
import { LibraryProvider } from './shared/LibraryContext.jsx'
import './styles/tokens.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <CatalogProvider>
            <LibraryProvider>
              <App />
            </LibraryProvider>
          </CatalogProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
