import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SessionProvider } from './components/shared/SessionProvider'

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
