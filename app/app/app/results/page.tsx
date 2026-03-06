import { Button } from '@/components/ui/button'
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

const sampleResults = [
  {
    payer: 'Blue Cross',
    date: '2024-02-15',
    code: '99213',
    allowed: 125.0,
    paid: 95.0,
    delta: 30.0,
    confidence: 'High',
  },
  {
    payer: 'Aetna',
    date: '2024-02-14',
    code: '99214',
    allowed: 175.0,
    paid: 145.0,
    delta: 30.0,
    confidence: 'High',
  },
  {
    payer: 'UnitedHealthcare',
    date: '2024-02-12',
    code: '99215',
    allowed: 225.0,
    paid: 180.0,
    delta: 45.0,
    confidence: 'Medium',
  },
  {
    payer: 'Cigna',
    date: '2024-02-10',
    code: '99213',
    allowed: 125.0,
    paid: 100.0,
    delta: 25.0,
    confidence: 'High',
  },
  {
    payer: 'Humana',
    date: '2024-02-08',
    code: '99214',
    allowed: 175.0,
    paid: 155.0,
    delta: 20.0,
    confidence: 'Medium',
  },
  {
    payer: 'Blue Shield',
    date: '2024-02-05',
    code: '99215',
    allowed: 225.0,
    paid: 190.0,
    delta: 35.0,
    confidence: 'High',
  },
  {
    payer: 'Medicare',
    date: '2024-02-03',
    code: '99213',
    allowed: 110.0,
    paid: 90.0,
    delta: 20.0,
    confidence: 'Low',
  },
  {
    payer: 'Medicaid',
    date: '2024-02-01',
    code: '99214',
    allowed: 150.0,
    paid: 125.0,
    delta: 25.0,
    confidence: 'Medium',
  },
]

export default function ResultsPage() {
  const totalDelta = sampleResults.reduce((sum, r) => sum + r.delta, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Results</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Top revenue leak opportunities identified from your uploads.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Total Potential Recovery</h2>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                ${totalDelta.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {sampleResults.length} identified opportunities
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Download PDF</Button>
              <Button variant="outline">Download CSV</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium">Top Opportunities</h2>
          <Separator className="my-4" />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Allowed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleResults.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{result.payer}</TableCell>
                    <TableCell>{result.date}</TableCell>
                    <TableCell>{result.code}</TableCell>
                    <TableCell className="text-right">${result.allowed.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${result.paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      ${result.delta.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          result.confidence === 'High'
                            ? 'default'
                            : result.confidence === 'Medium'
                            ? 'outline'
                            : 'outline'
                        }
                      >
                        {result.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        Appeal
                      </Button>
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
