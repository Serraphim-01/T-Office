'use client';

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockAudits = [
  { id: 'AUD001', title: 'Q3 Financial Audit', type: 'Financial', status: 'In Progress', startDate: '2023-07-15', endDate: '2023-08-15', team: 'Finance Team' },
  { id: 'AUD002', title: 'IT Security Audit', type: 'IT', status: 'Completed', startDate: '2023-06-01', endDate: '2023-06-30', team: 'IT Security' },
  { id: 'AUD003', title: 'Compliance Audit', type: 'Compliance', status: 'Planned', startDate: '2023-09-01', endDate: '2023-09-30', team: 'Legal Team' },
  { id: 'AUD004', title: 'Operational Audit', type: 'Operational', status: 'Planned', startDate: '2023-10-01', endDate: '2023-10-31', team: 'Operations' },
];

export default function AuditPlanningPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Planning and Scheduling</h1>
            <p className="text-muted-foreground">Define audit types, scope, criteria, and timelines for audits.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Schedule New Audit
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Schedule</CardTitle>
            <CardDescription>A list of all planned and ongoing audits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Assigned Team</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.id}</TableCell>
                    <TableCell>{audit.title}</TableCell>
                    <TableCell>{audit.type}</TableCell>
                    <TableCell>
                      <Badge variant={
                        audit.status === 'Completed' ? 'default' :
                        audit.status === 'In Progress' ? 'secondary' : 'outline'
                      }>
                        {audit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{audit.startDate}</TableCell>
                    <TableCell>{audit.endDate}</TableCell>
                    <TableCell>{audit.team}</TableCell>
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
                          <DropdownMenuItem className="text-destructive">Cancel Audit</DropdownMenuItem>
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
