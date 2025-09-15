'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockPartners = [
  { id: 'OEM001', name: 'Innovate Hardware', partnershipType: 'Hardware', status: 'Active' },
  { id: 'OEM002', name: 'Global Software', partnershipType: 'Software', status: 'Active' },
  { id: 'OEM003', name: 'Tech Integrators', partnershipType: 'Integration', status: 'Inactive' },
];

export default function OemPartnersPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">OEM Partners</h1>
        <Card>
          <CardHeader>
            <CardTitle>OEM Partner List</CardTitle>
            <CardDescription>Manage all OEM partners.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Partnership Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>{partner.id}</TableCell>
                    <TableCell>{partner.name}</TableCell>
                    <TableCell>{partner.partnershipType}</TableCell>
                    <TableCell>{partner.status}</TableCell>
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
