'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Department {
  id: string;
  name: string;
  items: string[];
  functions: string[];
}

const availableItems = [
  { id: 'compliance_checklist', label: 'Compliance Checklist' },
  { id: 'tech_checklists', label: 'Tech Checklists' },
  { id: 'finance_budget', label: 'Finance Budget' },
  { id: 'sales_target', label: 'Sales Target' },
  { id: 'sales_individual_target', label: 'Sales Individual Target' },
  { id: 'tech_intro', label: 'Tech Intro' },
];

const availableFunctions = [
  { id: 'compliance_agent', label: 'Compliance Agent' },
  { id: 'tech_hub', label: 'Tech Hub' },
  { id: 'sales_hub', label: 'Sales Hub' },
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

  const handleCreateDepartment = () => {
    if (newDepartmentName.trim() === '') return;

    const newDepartment: Department = {
      id: Date.now().toString(),
      name: newDepartmentName,
      items: selectedItems,
      functions: selectedFunctions,
    };

    setDepartments(prevDepartments => [...prevDepartments, newDepartment]);
    setIsModalOpen(false);
    setNewDepartmentName('');
    setSelectedItems([]);
    setSelectedFunctions([]);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Departments Management</h1>
            <p className="text-muted-foreground">Create and manage departments for your organization</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>Create Department</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create a New Department</DialogTitle>
                <DialogDescription>
                  Define a new department and assign items and functions to it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dept-name">Department Name</Label>
                  <Input id="dept-name" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Items</Label>
                  <div className="space-y-2 pl-2">
                    {availableItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, item.id]);
                            } else {
                              setSelectedItems(selectedItems.filter((i) => i !== item.id));
                            }
                          }}
                        />
                        <Label htmlFor={item.id} className="font-normal">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Functions</Label>
                  <div className="space-y-2 pl-2">
                    {availableFunctions.map((func) => (
                      <div key={func.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={func.id}
                          checked={selectedFunctions.includes(func.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFunctions([...selectedFunctions, func.id]);
                            } else {
                              setSelectedFunctions(selectedFunctions.filter((f) => f !== func.id));
                            }
                          }}
                        />
                        <Label htmlFor={func.id} className="font-normal">{func.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={handleCreateDepartment}>Create Department</Button>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Existing Departments</CardTitle>
            <CardDescription>A list of departments in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {departments.length > 0 ? (
              <ul className="space-y-4">
                {departments.map((dept) => (
                  <li key={dept.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold">{dept.name}</h3>
                    <div className="mt-2">
                      <h4 className="font-medium text-sm">Items:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {dept.items.map((itemId) => (
                          <li key={itemId}>{availableItems.find((i) => i.id === itemId)?.label}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2">
                      <h4 className="font-medium text-sm">Functions:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {dept.functions.map((funcId) => (
                          <li key={funcId}>{availableFunctions.find((f) => f.id === funcId)?.label}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No departments created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
