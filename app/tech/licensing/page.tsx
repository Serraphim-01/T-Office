'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockLicenses = [
  { id: 'LIC001', software: 'Task Office Pro', type: 'Subscription', status: 'Active', expiryDate: '2024-12-31' },
  { id: 'LIC002', software: 'Design Studio', type: 'Perpetual', status: 'Active', expiryDate: 'N/A' },
  { id: 'LIC003', software: 'Data Analytics Suite', type: 'Subscription', status: 'Expired', expiryDate: '2023-06-30' },
];

export default function LicensingPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">Licensing</h1>
        <Card>
          <CardHeader>
            <CardTitle>Software Licensing</CardTitle>
            <CardDescription>Manage all software licenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License ID</TableHead>
                  <TableHead>Software</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLicenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell>{license.id}</TableCell>
                    <TableCell>{license.software}</TableCell>
                    <TableCell>{license.type}</TableCell>
                    <TableCell>{license.status}</TableCell>
                    <TableCell>{license.expiryDate}</TableCell>
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
