'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PlusCircle } from "lucide-react";

const automationRules = [
  {
    id: 'R001',
    title: 'Send follow-up email after 3 days of no contact',
    description: 'When a lead has not been contacted for 3 days, send a follow-up email.',
    enabled: true,
  },
  {
    id: 'R002',
    title: 'Update contact status to "Lost" after 30 days of inactivity',
    description: 'If a lead has been inactive for 30 days, automatically update their status to "Lost".',
    enabled: false,
  },
  {
    id: 'R003',
    title: 'Create a new task when a new lead is assigned',
    description: 'When a new lead is assigned to a sales rep, create a new task for them to follow up.',
    enabled: true,
  },
];

export default function TaskAutomationPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Automation</h1>
          <p className="text-muted-foreground">Automate repetitive tasks to improve efficiency.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>A list of all automation rules in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationRules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{rule.title}</h3>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  <Switch checked={rule.enabled} />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
