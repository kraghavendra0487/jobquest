import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"

function App() {
  const [backendMessage, setBackendMessage] = useState('Loading...')

  useEffect(() => {
    fetch('http://localhost:5000/')
      .then(res => res.text())
      .then(data => setBackendMessage(data))
      .catch(err => {
        console.error(err)
        setBackendMessage('Error connecting to backend')
      })
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          React + Node.js
        </h1>
        <p className="text-muted-foreground">
          Frontend with Shadcn UI and Tailwind CSS
        </p>
        
        <div className="p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Backend Status:</h2>
          <p className="text-lg font-medium text-accent-foreground">
            {backendMessage}
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.reload()}>
            Refresh Connection
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App
