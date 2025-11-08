import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { format, startOfWeek, subWeeks } from 'date-fns';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchDashboardData();
  }, [currentWeek]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch overview for current week
      const overviewRes = await api.get(`/dashboard/overview?weekStartDate=${currentWeek}`);
      setOverview(overviewRes.data);

      // Fetch trends for last 8 weeks
      const startDate = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
      const endDate = currentWeek;
      const trendsRes = await api.get(`/dashboard/trends?startDate=${startDate}&endDate=${endDate}`);
      setTrends(trendsRes.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const completionRate = overview
    ? Math.round((overview.completedCount / overview.totalCount) * 100)
    : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of team pulse check-ins</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Completion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
            <span className={`text-2xl ${completionRate >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
              {completionRate}%
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {overview?.completedCount || 0} of {overview?.totalCount || 0} completed
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${completionRate >= 80 ? 'bg-green-600' : 'bg-orange-600'}`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
            <span className="text-2xl text-primary-600">
              {overview?.averageRating ? overview.averageRating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div className="text-sm text-gray-600">Out of 5.0</div>
          <div className="mt-4 flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-6 h-6 ${
                  star <= (overview?.averageRating || 0)
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>

        {/* Incomplete */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Incomplete</h3>
            <span className="text-2xl text-red-600">
              {overview?.incompleteUsers?.length || 0}
            </span>
          </div>
          <div className="text-sm text-gray-600">Team members</div>
          {overview?.incompleteUsers && overview.incompleteUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              <ul className="space-y-1">
                {overview.incompleteUsers.slice(0, 3).map((user) => (
                  <li key={user.slack_user_id} className="truncate">
                    • {user.slack_username}
                  </li>
                ))}
                {overview.incompleteUsers.length > 3 && (
                  <li className="text-gray-500">
                    + {overview.incompleteUsers.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="weekStartDate"
              tickFormatter={(date) => format(new Date(date), 'MMM d')}
            />
            <YAxis yAxisId="left" domain={[0, 5]} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip
              labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="averageRating"
              stroke="#0ea5e9"
              name="Avg Rating"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="completionRate"
              stroke="#10b981"
              name="Completion %"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
