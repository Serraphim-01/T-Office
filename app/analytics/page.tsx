'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent, LineChartComponent, PieChartComponent, DoughnutChartComponent, AreaChartComponent } from '@/components/charts';
import { 
  fetchInventoryAnalytics, 
  fetchProfitAnalytics, 
  fetchPredictiveAnalytics, 
  fetchUserActivityAnalytics 
} from '@/lib/api';
import { useEffect, useState } from 'react';
import { PieChart, BarChart3, TrendingUp, DollarSign, Activity, Users, Package } from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          inventory: inventoryData || { total_inventory_value: 0, inventory_by_category: [], low_stock_items: [] },
          profit: profitData || { 
            product_profit_details: [], 
            overall_summary: { total_profit: 0, profit_margin_percent: 0 }, 
            monthly_profit: [] 
          },
          predictive: predictiveData || { demand_predictions: [], revenue_prediction: {} },
          user: userData || { daily_active_users: [], user_engagement_by_department: [] }
        });
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card className="m-6">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <PieChart className="h-12 w-12 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Analytics</h3>
            <p className="text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <Card className="m-6">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <PieChart className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
            <p className="text-gray-500">Analytics data could not be loaded</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Prepare data for charts
  const inventoryByCategory = analyticsData.inventory?.inventory_by_category || [];
  const profitByMonth = analyticsData.profit?.monthly_profit || [];
  const demandPredictions = analyticsData.predictive?.demand_predictions || [];
  const userActivity = analyticsData.user?.daily_active_users || [];

  // Prepare inventory by category data
  const inventoryCategoryData = inventoryByCategory.map((cat: any) => ({
    name: cat.name,
    value: cat.total_value,
    count: cat.count
  }));

  // Prepare monthly profit data
  const monthlyProfitData = profitByMonth.map((month: any) => ({
    name: month.month ? new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'N/A',
    profit: parseFloat(month.monthly_profit || 0),
    units: parseInt(month.total_units_sold || 0)
  }));

  // Prepare demand prediction data (top 10 items)
  const demandPredictionData = demandPredictions.slice(0, 10).map((item: any) => ({
    name: item.name,
    monthsLeft: parseFloat(item.months_of_supply_left || 0),
    predictedDemand: parseFloat(item.predicted_monthly_demand || 0),
    currentStock: parseInt(item.current_stock || 0)
  }));

  // Prepare user activity data
  const userActivityData = userActivity.slice(0, 30).map((day: any) => ({
    name: day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
    users: parseInt(day.active_users || 0)
  })).reverse(); // Reverse to show oldest first

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive analytics for your organization</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6 flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Total Inventory Value</p>
                  <InfoTooltip 
                    title="Total Inventory Value"
                    description="Sum of all stored items' value in inventory. Calculated by multiplying quantity by unit price for each item and adding them together."
                  />
                </div>
                <p className="text-2xl font-bold">₦{(analyticsData.inventory?.total_inventory_value || 0)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <InfoTooltip 
                    title="Total Profit"
                    description="Gross profit from all outbound transactions. Calculated as (outbound price - inbound price) × quantity for each transaction."
                  />
                </div>
                <p className="text-2xl font-bold">₦{Number(analyticsData.profit?.overall_summary?.total_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6 flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <InfoTooltip 
                    title="Profit Margin"
                    description="Percentage of profit relative to cost. Calculated as (Total Profit ÷ Total Cost) × 100. Indicates overall business profitability."
                  />
                </div>
                <p className="text-2xl font-bold">{Number(analyticsData.profit?.overall_summary?.profit_margin_percent || 0).toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6 flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <InfoTooltip 
                    title="Low Stock Items"
                    description="Number of products with inventory quantities below the minimum threshold (typically 10 units). Items that need restocking soon."
                  />
                </div>
                <p className="text-2xl font-bold">{analyticsData.inventory?.low_stock_items?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Inventory Value by Category
                <InfoTooltip 
                  title="Inventory Value by Category"
                  description="Distribution of inventory value across product categories. Shows which categories hold the most financial value in storage."
                  className="ml-2"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryCategoryData.length > 0 ? (
                <DoughnutChartComponent 
                  data={inventoryCategoryData} 
                  dataKey="value" 
                  nameKey="name" 
                  title="Inventory Value by Category" 
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No inventory category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Profit Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Monthly Profit Trends
                <InfoTooltip 
                  title="Monthly Profit Trends"
                  description="Historical profit performance over time. Shows revenue, costs, and profit patterns to identify seasonal trends and business growth."
                  className="ml-2"
                />
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
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No profit data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demand Predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Demand Predictions
                <InfoTooltip 
                  title="Demand Predictions"
                  description="Forecast of future product demand based on historical usage patterns. Helps with inventory planning and supply chain management."
                  className="ml-2"
                />
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
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No demand prediction data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                User Activity
                <InfoTooltip 
                  title="User Activity"
                  description="Daily active user counts showing system engagement over time. Indicates platform usage patterns and user adoption rates."
                  className="ml-2"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userActivityData.length > 0 ? (
                <AreaChartComponent 
                  data={userActivityData} 
                  dataKey="users" 
                  nameKey="name" 
                  title="Daily Active Users" 
                  color="#8b5cf6"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No user activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Product</th>
                      <th className="text-right py-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.inventory?.low_stock_items?.slice(0, 5).map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={2} className="py-2 text-center text-gray-500">No low stock items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Profitable Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Profitable Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Product</th>
                      <th className="text-right py-2">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.profit?.product_profit_details?.slice(0, 5).map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.product_name}</td>
                        <td className="py-2 text-right">₦{parseFloat(item.total_profit || 0).toFixed(2)}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={2} className="py-2 text-center text-gray-500">No profit data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}