'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchDepartments } from '@/lib/departments';
import { useToast } from '@/hooks/use-toast';

export default function FeaturesPage() {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const deptList = await fetchDepartments();
      setDepartments(deptList);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground mt-1">
            Select a department from the dropdown below
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Selection</CardTitle>
            <CardDescription>
              Choose a department from the available options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedDepartment && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium">Selected Department: {selectedDepartment}</p>
                  <p className="text-muted-foreground mt-2">
                    You have selected the {selectedDepartment} department. This department has various features and resources available.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}