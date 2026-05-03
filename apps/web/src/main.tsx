import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// Restore session from stored refresh token on load
import('./lib/store/auth').then(({ useAuthStore }) => {
  const rt = localStorage.getItem('rt')
  if (rt && !useAuthStore.getState().accessToken) {
    import('./lib/api/auth').then(({ authApi }) => {
      authApi.refresh(rt)
        .then((data) => {
          import('./lib/store/auth').then(({ useAuthStore: s }) => {
            s.getState().setToken(data.accessToken)
            localStorage.setItem('rt', data.refreshToken)
          })
        })
        .catch(() => {
          localStorage.removeItem('rt')
        })
    })
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  </React.StrictMode>,
)
