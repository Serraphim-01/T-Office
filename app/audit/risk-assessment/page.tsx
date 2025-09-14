'use client';

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockRisks = [
  { id: 'RSK001', title: 'Data Breach', category: 'IT Security', score: 9, status: 'Mitigation Plan in Place' },
  { id: 'RSK002', title: 'Financial Misstatement', category: 'Financial', score: 8, status: 'In Progress' },
  { id: 'RSK003', title: 'Regulatory Compliance Failure', category: 'Compliance', score: 7, status: 'Needs Assessment' },
  { id: 'RSK004', title: 'Supply Chain Disruption', category: 'Operational', score: 6, status: 'Mitigated' },
];

export default function RiskAssessmentPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Risk Assessment Tools</h1>
            <p className="text-muted-foreground">Identify, score, and manage risks across the organization.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Risk
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Risk Register</CardTitle>
            <CardDescription>A list of all identified risks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRisks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-medium">{risk.id}</TableCell>
                    <TableCell>{risk.title}</TableCell>
                    <TableCell>{risk.category}</TableCell>
                    <TableCell>
                      <Badge variant={
                        risk.score >= 8 ? 'destructive' :
                        risk.score >= 6 ? 'secondary' : 'default'
                      }>
                        {risk.score}
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.status}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Update Status</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
