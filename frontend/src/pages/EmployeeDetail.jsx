import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmployeeStats();
  }, [id]);

  const fetchEmployeeStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/users/${id}/stats`);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching employee stats:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view this employee\'s data');
      } else {
        setError('Failed to load employee data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { user, summary, trends, recent_checkins } = data;

  // Prepare chart data
  const chartData = trends.map(t => ({
    date: t.week_start_date,
    rating: t.rating,
    completed: t.completed ? 1 : 0
  })).reverse(); // Show oldest to newest

  // Get rating color
  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-600">
        <Link to="/dashboard" className="hover:text-blue-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link to="/org-chart" className="hover:text-blue-600">Org Chart</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{user.slack_username}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
            {user.slack_username?.charAt(0).toUpperCase() || '?'}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.slack_username}</h1>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center space-x-3 mt-2">
              {user.department && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {user.department}
                </span>
              )}
              {user.manager_name && (
                <span className="text-sm text-gray-600">
                  Reports to: <span className="font-semibold">{user.manager_name}</span>
                </span>
              )}
            </div>
            {user.tags && user.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {user.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 text-xs rounded"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Total Check-ins</div>
          <div className="text-3xl font-bold text-gray-900">{summary.total_checkins}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-600">{summary.completed_checkins}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Completion Rate</div>
          <div className="text-3xl font-bold text-gray-900">{summary.completion_rate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Average Rating</div>
          <div className={`text-3xl font-bold ${getRatingColor(parseFloat(summary.avg_rating))}`}>
            {summary.avg_rating ? `${summary.avg_rating}/5` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Rating Trend (Last 12 Weeks)</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Rating (1-5)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-12">
            No trend data available
          </div>
        )}
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Check-ins</h2>
        {recent_checkins && recent_checkins.length > 0 ? (
          <div className="space-y-4">
            {recent_checkins.map((checkin, idx) => (
              <div
                key={checkin.id || idx}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">
                    Week of {checkin.week_start_date}
                  </div>
                  <div className={`text-2xl font-bold ${getRatingColor(checkin.rating)}`}>
                    {checkin.rating}/5
                  </div>
                </div>

                <div className="space-y-3">
                  {/* What Went Well */}
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                    <div className="text-xs font-semibold text-green-800 mb-1">What went well</div>
                    <div className="text-sm text-gray-700">{checkin.what_went_well || 'N/A'}</div>
                  </div>

                  {/* What Didn't Go Well */}
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <div className="text-xs font-semibold text-red-800 mb-1">What didn't go well</div>
                    <div className="text-sm text-gray-700">{checkin.what_didnt_go_well || 'N/A'}</div>
                  </div>

                  {/* Rotating Questions */}
                  {checkin.rotating_responses && checkin.rotating_responses.length > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      {checkin.rotating_responses.map((resp, ridx) => (
                        <div key={ridx} className="mb-2 last:mb-0">
                          <div className="text-xs font-semibold text-blue-800 mb-1">
                            {resp.question_text}
                          </div>
                          <div className="text-sm text-gray-700">{resp.response_text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-500 text-right">
                  Completed: {new Date(checkin.completed_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            No check-ins available
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
