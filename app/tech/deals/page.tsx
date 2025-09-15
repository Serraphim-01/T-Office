'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockDeals = [
  { id: 'TD001', name: 'Innovate Inc. Deal', value: 50000, stage: 'Negotiation' },
  { id: 'TD002', name: 'Global Corp. Deal', value: 75000, stage: 'Closed Won' },
  { id: 'TD003', name: 'Tech Systems Deal', value: 100000, stage: 'Proposal' },
];

export default function DealsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <Card>
          <CardHeader>
            <CardTitle>Tech Team Deals</CardTitle>
            <CardDescription>Manage all tech team deals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>{deal.id}</TableCell>
                    <TableCell>{deal.name}</TableCell>
                    <TableCell>${deal.value.toLocaleString()}</TableCell>
                    <TableCell>{deal.stage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
