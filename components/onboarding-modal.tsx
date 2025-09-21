'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';

const departments = [
  'Admin',
  'HR',
  'Sales',
  'Tech',
  'Audit',
  'Procurement',
  'Compliance',
];

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate: () => void;
}

export function OnboardingModal({ open, onOpenChange, onProfileUpdate }: OnboardingModalProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileUpdate = async () => {
    if (!fullName || !selectedDepartment || !user) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        department: selectedDepartment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onProfileUpdate();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide your full name and select your department to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name (Surname first)</Label>
            <Input
              id="full-name"
              placeholder="e.g., Smith John"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
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
          <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save and Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
