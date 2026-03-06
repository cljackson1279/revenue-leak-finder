import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const recentUploads = [
  { account: 'Practice A', email: 'admin@practicea.com', files: 12, date: '2024-02-15', status: 'processed' },
  { account: 'Practice B', email: 'billing@practiceb.com', files: 8, date: '2024-02-14', status: 'processing' },
  { account: 'Practice C', email: 'office@practicec.com', files: 5, date: '2024-02-13', status: 'processed' },
  { account: 'Practice D', email: 'admin@practiced.com', files: 15, date: '2024-02-12', status: 'processed' },
  { account: 'Practice E', email: 'info@practicee.com', files: 3, date: '2024-02-11', status: 'failed' },
]

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-base text-muted-foreground">
          System overview and account management.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <h2 className="text-lg font-medium">Active Accounts</h2>
            <Separator className="my-4" />
            <p className="text-3xl font-semibold tracking-tight">24</p>
            <p className="mt-1 text-sm text-muted-foreground">+3 this month</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-medium">Total Uploads</h2>
            <Separator className="my-4" />
            <p className="text-3xl font-semibold tracking-tight">487</p>
            <p className="mt-1 text-sm text-muted-foreground">+43 this week</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-medium">Audit Runs</h2>
            <Separator className="my-4" />
            <p className="text-3xl font-semibold tracking-tight">312</p>
            <p className="mt-1 text-sm text-muted-foreground">+28 today</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-medium">Recent Uploads</h2>
          <Separator className="my-4" />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUploads.map((upload, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{upload.account}</TableCell>
                    <TableCell>{upload.email}</TableCell>
                    <TableCell className="text-right">{upload.files}</TableCell>
                    <TableCell>{upload.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          upload.status === 'processed'
                            ? 'default'
                            : upload.status === 'processing'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {upload.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
