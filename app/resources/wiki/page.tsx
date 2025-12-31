'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BookOpen, Plus, FolderOpen, Menu, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useUI } from '@/lib/ui-context';
import { hasPageAccess } from '@/lib/page-access'; // Import hasPageAccess function

interface WikiTopic {
  id: number;
  department: string;
  topic: string;
  content: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  completed?: boolean;
}

interface DepartmentTopics {
  [department: string]: WikiTopic[];
}

interface CompletionData {
  [key: string]: boolean; // topic_id -> completed
}

export default function WikiPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentTopics, setDepartmentTopics] = useState<DepartmentTopics>({});
  const [completionData, setCompletionData] = useState<CompletionData>({});
  const [loading, setLoading] = useState(true);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [canCreateTopic, setCanCreateTopic] = useState(false); // State for create topic access

  useEffect(() => {
    fetchWikiData();
    checkFeatureAccess(); // Check feature access when component mounts
  }, []);

  // Check feature access for creating topics
  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to main wiki page first
    const wikiAccess = await hasPageAccess(user?.id, 'resources/wiki');
    
    if (!wikiAccess) {
      // If no access to main wiki page, disable create topic feature
      setCanCreateTopic(false);
      return;
    }
    
    // Check access to create wiki page (which controls create topic buttons)
    const createWikiAccess = await hasPageAccess(user?.id, 'resources/wiki/create');
    const createTopicAccess = await hasPageAccess(user?.id, 'resources/wiki/create-topic');
    
    // User can create topics if they have access to either the create wiki page or the specific create topic feature
    setCanCreateTopic(createWikiAccess || createTopicAccess);
  };

  const fetchCompletionData = async (topicsData: DepartmentTopics): Promise<CompletionData> => {
    try {
      const completionPromises = [];
      const topicIds: number[] = [];

      // Collect all topic IDs
      Object.values(topicsData).forEach(topics => {
        topics.forEach(topic => {
          topicIds.push(topic.id);
        });
      });

      // Fetch completion status for each topic
      for (const topicId of topicIds) {
        // Find the department and topic name for this ID
        let dept = '';
        let topicName = '';
        Object.entries(topicsData).forEach(([department, topics]) => {
          const topic = topics.find(t => t.id === topicId);
          if (topic) {
            dept = department;
            topicName = topic.topic;
          }
        });

        if (dept && topicName) {
          completionPromises.push(
            fetch(`http://localhost:4000/api/wiki/${dept}/${topicName}/completion`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            }).then(res => res.ok ? res.json() : { completed: false })
              .then(data => ({ topicId, completed: data.completed }))
          );
        }
      }

      const completionResults = await Promise.all(completionPromises);
      const completionMap: CompletionData = {};
      completionResults.forEach(result => {
        completionMap[result.topicId] = result.completed;
      });

      return completionMap;
    } catch (error) {
      console.error('Error fetching completion data:', error);
      return {};
    }
  };

  const fetchWikiData = async () => {
    try {
      // Fetch departments
      const deptResponse = await fetch('http://localhost:4000/api/wiki/departments');
      const deptData = await deptResponse.json();
      setDepartments(deptData);

      // Fetch topics for each department
      const topicsData: DepartmentTopics = {};
      for (const dept of deptData) {
        try {
          const topicsResponse = await fetch(`http://localhost:4000/api/wiki/${dept}/topics`);
          if (topicsResponse.ok) {
            const topics = await topicsResponse.json();
            topicsData[dept] = topics;
          } else {
            topicsData[dept] = [];
          }
        } catch (error) {
          console.error(`Error fetching topics for ${dept}:`, error);
          topicsData[dept] = [];
        }
      }
      setDepartmentTopics(topicsData);

      // Fetch completion data for all topics
      const completionMap = await fetchCompletionData(topicsData);
      setCompletionData(completionMap);
    } catch (error) {
      console.error('Error fetching wiki data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (department: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  const getDepartmentDisplayName = (dept: string) => {
    return dept.charAt(0).toUpperCase() + dept.slice(1);
  };

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'admin':
        return '⚙️';
      case 'hr':
        return '👥';
      case 'compliance':
        return '📋';
      default:
        return '📁';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading wiki...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={`bg-card border-r transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-80'}`}>
          <div className="p-4 border-b flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h2 className="font-semibold">Departments</h2>
                <p className="text-sm text-muted-foreground">Knowledge base</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className="p-2">
            {departments.map((department) => (
              <div key={department} className="mb-2">
                <button
                  onClick={() => toggleDepartment(department)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <span className="text-lg">{getDepartmentIcon(department)}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 font-medium text-sm">
                        {getDepartmentDisplayName(department)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {departmentTopics[department]?.filter(topic => completionData[topic.id]).length || 0}/{departmentTopics[department]?.length || 0}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          expandedDepartments.has(department) ? 'rotate-90' : ''
                        }`}
                      />
                    </>
                  )}
                </button>

                {!sidebarCollapsed && expandedDepartments.has(department) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {departmentTopics[department]?.length > 0 ? (
                      departmentTopics[department].map((topic) => (
                        <Link
                          key={`${department}-${topic.topic}`}
                          href={`/resources/wiki/${department}/${topic.topic}`}
                          className="block p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {completionData[topic.id] && (
                              <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">
                                {topic.topic.replace(/-/g, ' ').charAt(0).toUpperCase() +
                                 topic.topic.replace(/-/g, ' ').slice(1)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Updated {new Date(topic.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-4 w-4 inline mr-1" />
                        No topics yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Only show Create Topic button if user has access */}
          {!sidebarCollapsed && canCreateTopic && (
            <div className="p-4 border-t">
              <Button asChild className="w-full">
                <Link href="/resources/wiki/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Topic
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to the Wiki</h1>
              <p className="text-muted-foreground mb-6">
                Select a department from the sidebar to browse available topics, or create new content.
              </p>
              {/* Only show Create Your First Topic button if user has access */}
              {canCreateTopic ? (
                <Button asChild>
                  <Link href="/resources/wiki/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Topic
                  </Link>
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  You don't have permission to create new topics.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}