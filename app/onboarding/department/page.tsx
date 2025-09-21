'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User } from '@supabase/supabase-js';

const departments = [
  'Admin',
  'HR',
  'Sales',
  'Tech',
  'Audit',
  'Procurement',
  'Compliance',
];

export default function DepartmentSelectionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    getUser();
  }, [router]);

  const handleDepartmentUpdate = async () => {
    if (!selectedDepartment || !user) {
      setError('Please select a department.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from('profiles')
      .update({ department: selectedDepartment, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  if (loading && !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <p className="text-lg">Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Your Department</CardTitle>
          <CardDescription>
            To complete your profile, please select your department from the list below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select onValueChange={setSelectedDepartment} value={selectedDepartment}>
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleDepartmentUpdate} disabled={loading || !selectedDepartment} className="w-full">
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
