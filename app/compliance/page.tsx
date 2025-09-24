'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';

// --- Type Definitions ---
interface Site {
  id: number;
  url: string;
  last_crawled_at: string | null;
  content_hash: string | null;
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface CrawlResult {
  unchanged: boolean;
  message?: string;
  diff?: DiffPart[];
  urgencyScore?: number;
  crawledAt?: string;
}

const API_BASE_URL = 'http://localhost:4000/api/compliance';

export default function CompliancePage() {
  // --- State Variables ---
  const [document, setDocument] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [loading, setLoading] = useState({ doc: false, sites: false, crawl: false });

  // --- Data Fetching ---
  useEffect(() => {
    fetchDocument();
    fetchSites();
  }, []);

  const fetchDocument = async () => {
    setLoading(prev => ({ ...prev, doc: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/document`);
      const data = await res.json();
      if (res.ok) {
        setDocument(data.content || '');
      } else {
        toast({ title: 'Error fetching document', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    }
    setLoading(prev => ({ ...prev, doc: false }));
  };

  const fetchSites = async () => {
    setLoading(prev => ({ ...prev, sites: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/sites`);
      const data = await res.json();
      if (res.ok) {
        setSites(data);
      } else {
        toast({ title: 'Error fetching sites', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    }
    setLoading(prev => ({ ...prev, sites: false }));
  };

  // --- Event Handlers ---
  const handleSaveDocument = async () => {
    setLoading(prev => ({ ...prev, doc: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: document }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Compliance document saved.' });
      } else {
        const data = await res.json();
        toast({ title: 'Error saving document', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
       toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    }
    setLoading(prev => ({ ...prev, doc: false }));
  };

  const handleAddSite = async () => {
    if (!newSiteUrl) {
        toast({ title: 'Error', description: 'Please enter a URL.', variant: 'destructive' });
        return;
    }
    setLoading(prev => ({ ...prev, sites: true }));
    try {
        const res = await fetch(`${API_BASE_URL}/sites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: newSiteUrl }),
        });
        if (res.ok) {
            toast({ title: 'Success', description: 'Site added successfully.'});
            setNewSiteUrl('');
            fetchSites(); // Refresh list
        } else {
            const data = await res.json();
            toast({ title: 'Error adding site', description: data.error, variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    }
    setLoading(prev => ({ ...prev, sites: false }));
  };

  const handleDeleteSite = async (id: number) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/sites/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast({ title: 'Success', description: 'Site deleted.'});
            fetchSites(); // Refresh list
        } else {
            const data = await res.json();
            toast({ title: 'Error deleting site', description: data.error, variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    }
  };

  const handleCrawlSite = async (siteId: number) => {
    setCrawlResult(null);
    setLoading(prev => ({ ...prev, crawl: true }));
    try {
        const res = await fetch(`${API_BASE_URL}/crawl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId }),
        });
        const data = await res.json();
        if (res.ok) {
            setCrawlResult(data);
            fetchSites(); // Refresh last crawled date
        } else {
            toast({ title: 'Error crawling site', description: data.error, variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    }
    setLoading(prev => ({ ...prev, crawl: false }));
  };

  // --- Render Method ---
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Compliance Agent</h1>
            <p className="text-muted-foreground">Monitor websites for compliance against a master document.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Document and Sites */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Master Compliance Document</CardTitle>
                <CardDescription>This is the source of truth for compliance checks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your master compliance text here..."
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  rows={15}
                  disabled={loading.doc}
                />
                <Button onClick={handleSaveDocument} disabled={loading.doc}>
                  {loading.doc ? 'Saving...' : 'Save Document'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitored Websites</CardTitle>
                <CardDescription>Add or remove websites to be monitored.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2 mb-4">
                  <Input
                    placeholder="https://example.com/privacy"
                    value={newSiteUrl}
                    onChange={(e) => setNewSiteUrl(e.target.value)}
                    disabled={loading.sites}
                  />
                  <Button onClick={handleAddSite} disabled={loading.sites}>
                    {loading.sites ? 'Adding...' : 'Add Site'}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Last Crawled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.url}</TableCell>
                        <TableCell>{site.last_crawled_at ? new Date(site.last_crawled_at).toLocaleString() : 'Never'}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button variant="outline" size="sm" onClick={() => handleCrawlSite(site.id)} disabled={loading.crawl}>
                             Crawl
                           </Button>
                           <Button variant="destructive" size="sm" onClick={() => handleDeleteSite(site.id)}>
                             Delete
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Crawl Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Crawl Results</CardTitle>
                <CardDescription>Results from the last crawl will be displayed here.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading.crawl && <p>Crawling in progress...</p>}
                {!loading.crawl && !crawlResult && <p>Select a site and click "Crawl" to see the results.</p>}
                {crawlResult && (
                  <div className="space-y-4">
                    {crawlResult.unchanged ? (
                       <p className="text-green-600">{crawlResult.message}</p>
                    ) : (
                      <>
                        <div>
                          <h3 className="font-bold">Urgency Score: {crawlResult.urgencyScore}</h3>
                          <p className="text-sm text-muted-foreground">Higher scores indicate more critical potential issues.</p>
                        </div>
                        <div>
                          <h3 className="font-bold">Differences Found:</h3>
                           <div className="p-2 border rounded-md bg-muted font-mono text-sm max-h-96 overflow-y-auto">
                            {crawlResult.diff?.map((part, index) => (
                              <span key={index} className={
                                part.added ? 'bg-green-200' : part.removed ? 'bg-red-200' : ''
                              }>
                                {part.value}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 text-sm mt-2">
                              <div className="flex items-center"><span className="w-3 h-3 bg-green-200 mr-2"></span> Added to Website</div>
                              <div className="flex items-center"><span className="w-3 h-3 bg-red-200 mr-2"></span> Missing from Website</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
