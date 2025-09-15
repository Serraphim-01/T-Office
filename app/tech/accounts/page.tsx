'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockAccounts = [
  { id: 'ACC001', name: 'Innovate Inc.', manager: 'John Doe', status: 'Active' },
  { id: 'ACC002', name: 'Global Corp.', manager: 'Jane Smith', status: 'Active' },
  { id: 'ACC003', name: 'Tech Systems', manager: 'John Doe', status: 'Inactive' },
];

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Card>
          <CardHeader>
            <CardTitle>Customer Accounts</CardTitle>
            <CardDescription>Manage all customer accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.id}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.manager}</TableCell>
                    <TableCell>{account.status}</TableCell>
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
