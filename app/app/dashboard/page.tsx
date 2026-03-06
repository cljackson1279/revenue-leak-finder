'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Welcome back, {user.email}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium">Quick Actions</h2>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              className="h-24 flex-col gap-2"
              variant="outline"
              onClick={() => router.push('/upload')}
            >
              <span className="text-lg font-semibold">Upload Files</span>
              <span className="text-sm text-muted-foreground">
                Upload EOB PDFs or 835 ERAs
              </span>
            </Button>
            <Button
              className="h-24 flex-col gap-2"
              variant="outline"
              onClick={() => router.push('/results')}
            >
              <span className="text-lg font-semibold">View Results</span>
              <span className="text-sm text-muted-foreground">
                See processed leak findings
              </span>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium">Recent Activity</h2>
          <Separator className="my-4" />
          <p className="text-muted-foreground">No recent uploads or processing jobs.</p>
        </Card>
      </div>
    </div>
  )
}
