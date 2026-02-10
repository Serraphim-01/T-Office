'use client';

import { useRef, useEffect, useState } from 'react';
import { X, PieChart, BarChart3, Users, MessageCircle, User, Package, Clock, FileText, Settings, Building, TrendingUp, DollarSign, Activity, ExternalLink, ShoppingCart, UserCheck2, AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAnalytics } from '@/lib/analytics-context';
import { useRouter } from 'next/navigation';
import { 
  fetchInventoryAnalytics, 
  fetchProfitAnalytics, 
  fetchPredictiveAnalytics, 
  fetchUserActivityAnalytics 
} from '@/lib/api';
import { BarChartComponent, LineChartComponent, PieChartComponent, DoughnutChartComponent, AreaChartComponent } from './charts';

export function GlobalAnalyticsSidebar() {
  const { isAnalyticsSidebarOpen, closeAnalyticsSidebar } = useAnalytics();
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle data fetching
  useEffect(() => {
    if (isAnalyticsSidebarOpen) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Fetch all analytics data in parallel with individual error handling
          const [inventoryData, profitData, predictiveData, userData] = await Promise.all([
            fetchInventoryAnalytics().catch(err => {
              console.error('Error fetching inventory analytics:', err);
              return null;
            }),
            fetchProfitAnalytics().catch(err => {
              console.error('Error fetching profit analytics:', err);
              return null;
            }),
            fetchPredictiveAnalytics().catch(err => {
              console.error('Error fetching predictive analytics:', err);
              return null;
            }),
            fetchUserActivityAnalytics().catch(err => {
              console.error('Error fetching user activity analytics:', err);
              return null;
            })
          ]);
          
          setAnalyticsData({
            inventory: inventoryData || { total_inventory_value: 0, inventory_by_category: [], low_stock_items: [], monthly_inventory: [] },
            profit: profitData || { 
              product_profit_details: [], 
              overall_summary: { total_profit: 0, profit_margin_percent: 0 }, 
              monthly_profit: [] 
            },
            predictive: predictiveData || { demand_predictions: [], revenue_prediction: {} },
            user: userData || { daily_active_users: [], user_engagement_by_department: [], user_login_patterns: [] }
          });
        } catch (err) {
          console.error('Error fetching analytics data:', err);
          setError('Failed to load analytics data');
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [isAnalyticsSidebarOpen]);

  // Handle click outside to close panel
  const handleClickOutside = (event: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      closeAnalyticsSidebar();
    }
  };

  // Close panel when pressing Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeAnalyticsSidebar();
    }
  };

  // Add/remove event listeners when panel opens/closes
  useEffect(() => {
    if (isAnalyticsSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    }
    
    // Clean up on unmount or when component closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAnalyticsSidebarOpen]);

  // Navigate to analytics page
  const goToAnalyticsPage = () => {
    closeAnalyticsSidebar();
    router.push('/analytics');
  };

  // Get global analytics content
  const getGlobalAnalytics = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Analytics</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      );
    }

    if (!analyticsData) {
      return (
        <div className="p-6 text-center">
          <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
          <p className="text-gray-500">Analytics data could not be loaded</p>
        </div>
      );
    }

    // Prepare data for charts
    const inventoryByCategory = analyticsData.inventory?.inventory_by_category || [];
    const profitByMonth = analyticsData.profit?.monthly_profit || [];
    const demandPredictions = analyticsData.predictive?.demand_predictions || [];
    const userActivity = analyticsData.user?.daily_active_users || [];
    const monthlyInventoryData = analyticsData.inventory?.monthly_inventory || [];
    const userLoginPatterns = analyticsData.user?.user_login_patterns || [];

    // Prepare inventory by category data
    const inventoryCategoryData = inventoryByCategory.map((cat: any) => ({
      name: cat.name,
      value: cat.total_value
    }));

    // Prepare monthly profit data
    const monthlyProfitData = profitByMonth.map((month: any) => ({
      name: month.month ? new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'N/A',
      profit: parseFloat(month.monthly_profit || 0),
      units: parseInt(month.total_units_sold || 0)
    }));

    // Prepare demand prediction data (top 5 items)
    const demandPredictionData = demandPredictions.slice(0, 5).map((item: any) => ({
      name: item.name,
      monthsLeft: parseFloat(item.months_of_supply_left || 0),
      predictedDemand: parseFloat(item.predicted_monthly_demand || 0)
    }));

    // Prepare user activity data
    const userActivityData = userActivity.slice(0, 7).map((day: any) => ({
      name: day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
      users: parseInt(day.active_users || 0)
    })).reverse(); // Reverse to show oldest first
    
    // Prepare monthly inventory data for chart
    const monthlyInventoryChartData = monthlyInventoryData.slice(0, 12).map((month: any) => ({
      name: month.month ? new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'N/A',
      value: parseFloat(month.total_inventory_value || 0),
      count: parseInt(month.total_items || 0)
    }));
    
    // Prepare user login patterns data
    const userLoginPatternsData = userLoginPatterns.map((dept: any) => ({
      name: dept.department,
      logins: parseInt(dept.login_count || 0),
      users: parseInt(dept.user_count || 0)
    }));

    return (
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Total Inventory Value</p>
                  <InfoTooltip 
                    title="Total Inventory Value"
                    description="Sum of all stored items' value in inventory. Calculated by multiplying quantity by unit price for each item."
                  />
                </div>
                <p className="text-xl font-bold">₦{Number(analyticsData.inventory?.total_inventory_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <InfoTooltip 
                    title="Total Profit"
                    description="Gross profit from all outbound transactions. Calculated as (outbound price - inbound price) × quantity."
                  />
                </div>
                <p className="text-xl font-bold">₦{Number(analyticsData.profit?.overall_summary?.total_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <InfoTooltip 
                    title="Profit Margin"
                    description="Percentage of profit relative to cost. Calculated as (Total Profit ÷ Total Cost) × 100."
                  />
                </div>
                <p className="text-xl font-bold">{Number(analyticsData.profit?.overall_summary?.profit_margin_percent || 0).toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <InfoTooltip 
                    title="Low Stock Items"
                    description="Number of products with inventory quantities below minimum threshold (typically 10 units)."
                  />
                </div>
                <p className="text-xl font-bold">{analyticsData.inventory?.low_stock_items?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Monthly Inventory Value
                  <InfoTooltip 
                    title="Monthly Inventory Value"
                    description="Historical trend of total inventory value over time."
                    className="ml-2"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyInventoryChartData.length > 0 ? (
                <LineChartComponent 
                  data={monthlyInventoryChartData} 
                  dataKey="value" 
                  nameKey="name" 
                  title="Monthly Inventory Value" 
                  color="#3b82f6"
                  height={200}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No monthly inventory data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Monthly Profit Trends
                  <InfoTooltip 
                    title="Monthly Profit Trends"
                    description="Historical profit performance over time showing revenue and cost patterns."
                    className="ml-2"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyProfitData.length > 0 ? (
                <LineChartComponent 
                  data={monthlyProfitData} 
                  dataKey="profit" 
                  nameKey="name" 
                  title="Monthly Profit" 
                  color="#10b981"
                  height={200}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No profit data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCheck2 className="mr-2 h-4 w-4" />
                  User Engagement by Department
                  <InfoTooltip 
                    title="User Engagement by Department"
                    description="Distribution of user activity across different departments."
                    className="ml-2"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userLoginPatternsData.length > 0 ? (
                <BarChartComponent 
                  data={userLoginPatternsData} 
                  dataKey="logins" 
                  nameKey="name" 
                  title="Logins by Department" 
                  color="#8b5cf6"
                  height={200}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No user engagement data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="mr-2 h-4 w-4" />
                  Demand Predictions
                  <InfoTooltip 
                    title="Demand Predictions"
                    description="Forecast of future product demand based on historical usage patterns."
                    className="ml-2"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {demandPredictionData.length > 0 ? (
                <BarChartComponent 
                  data={demandPredictionData} 
                  dataKey="monthsLeft" 
                  nameKey="name" 
                  title="Months of Supply Left" 
                  color="#f59e0b"
                  height={200}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No demand prediction data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Button 
            onClick={goToAnalyticsPage}
            className="w-full flex items-center justify-center"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Analytics Page
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Slide-out panel */}
      <div className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${isAnalyticsSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Backdrop - only show when panel is open */}
        {isAnalyticsSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={closeAnalyticsSidebar}
          />
        )}
        
        {/* Panel */}
        <div 
          ref={panelRef}
          className="relative h-full w-[50vw] max-w-[600px] min-w-[400px] bg-white shadow-xl border-l border-gray-200 flex flex-col z-50"
        >
          <Card className="flex-1 flex flex-col h-full rounded-none border-0 border-l">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-lg font-semibold">Global Analytics</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={closeAnalyticsSidebar} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                {getGlobalAnalytics()}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}