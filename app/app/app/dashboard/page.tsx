import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Welcome back. Here's what's happening with your practice.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium">Quick Actions</h2>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/app/upload">
              <Button className="h-24 w-full flex-col gap-2" variant="outline">
                <span className="text-lg font-semibold">Upload Files</span>
                <span className="text-sm text-muted-foreground">
                  Upload EOB PDFs or 835 ERAs
                </span>
              </Button>
            </Link>
            <Link href="/app/results">
              <Button className="h-24 w-full flex-col gap-2" variant="outline">
                <span className="text-lg font-semibold">View Results</span>
                <span className="text-sm text-muted-foreground">
                  See processed leak findings
                </span>
              </Button>
            </Link>
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
