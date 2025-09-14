'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Upload, MoreHorizontal, FileText, FileImage, FileArchive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockDocuments = [
  { id: 'DOC001', name: 'Sales Presentation Q3.pptx', type: 'Presentation', size: '5.2 MB', lastModified: '2023-08-15' },
  { id: 'DOC002', name: 'Contract - Innovate Inc.pdf', type: 'PDF', size: '1.1 MB', lastModified: '2023-08-12' },
  { id: 'DOC003', name: 'Product Brochure.pdf', type: 'PDF', size: '2.5 MB', lastModified: '2023-08-10' },
  { id: 'DOC004', name: 'Sales Report - July.xlsx', type: 'Spreadsheet', size: '300 KB', lastModified: '2023-08-05' },
  { id: 'DOC005', name: 'Marketing Assets.zip', type: 'Archive', size: '25.6 MB', lastModified: '2023-08-01' },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'PDF':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'Presentation':
      return <FileImage className="h-5 w-5 text-orange-500" />;
    case 'Spreadsheet':
      return <FileText className="h-5 w-5 text-green-500" />;
    case 'Archive':
      return <FileArchive className="h-5 w-5 text-yellow-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

export default function DocumentManagementPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Document Management</h1>
            <p className="text-muted-foreground">Store and manage sales-related documents and presentations.</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
            <CardDescription>A list of all sales-related documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center">
                      {getFileIcon(doc.type)}
                      <span className="ml-2">{doc.name}</span>
                    </TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{doc.size}</TableCell>
                    <TableCell>{doc.lastModified}</TableCell>
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
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Share</DropdownMenuItem>
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
