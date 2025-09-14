'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Deal {
  id: string;
  title: string;
  value: number;
  contact: string;
  status?: 'Won' | 'Lost';
}

const pipelineData: { [key: string]: Deal[] } = {
  'New Lead': [
    { id: 'D001', title: 'Deal with Innovate Inc.', value: 5000, contact: 'John Doe' },
    { id: 'D002', title: 'Deal with Tech Systems', value: 10000, contact: 'Mary Garcia' },
  ],
  'Contacted': [
    { id: 'D003', title: 'Follow-up with Global Corp.', value: 7500, contact: 'Jane Smith' },
  ],
  'Proposal': [
    { id: 'D004', title: 'Proposal for Business Solutions', value: 15000, contact: 'Peter Jones' },
  ],
  'Negotiation': [],
  'Closed': [
    { id: 'D005', title: 'Closed deal with Enterprise LLC', value: 25000, contact: 'David Rodriguez', status: 'Won' },
  ],
};

const pipelineStages = ['New Lead', 'Contacted', 'Proposal', 'Negotiation', 'Closed'];

export default function PipelineManagementPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">Track leads and opportunities at each stage of the sales process.</p>
        </div>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-4">
        {pipelineStages.map(stage => (
          <div key={stage} className="flex-shrink-0 w-72">
            <Card className="bg-secondary">
              <CardHeader>
                <CardTitle className="text-lg">{stage}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pipelineData[stage as keyof typeof pipelineData].map(deal => (
                  <Card key={deal.id}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{deal.title}</h3>
                      <p className="text-sm text-muted-foreground">${deal.value.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{deal.contact}</p>
                      {deal.status && (
                        <Badge className="mt-2" variant={deal.status === 'Won' ? 'default' : 'destructive'}>
                          {deal.status}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {pipelineData[stage as keyof typeof pipelineData].length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No deals in this stage</p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
