import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function OrgChartNode({ node, level = 0 }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;

  // Color code based on completion rate
  const getCompletionColor = (rate) => {
    const rateNum = parseFloat(rate);
    if (rateNum >= 80) return 'bg-green-100 border-green-300';
    if (rateNum >= 50) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  // Color code based on rating
  const getRatingColor = (rating) => {
    if (!rating) return 'text-gray-400';
    const ratingNum = parseFloat(rating);
    if (ratingNum >= 4) return 'text-green-600';
    if (ratingNum >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleNodeClick = () => {
    navigate(`/employee/${node.id}`);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-2">
      <div
        className={`flex items-center p-3 rounded-lg border-2 ${getCompletionColor(node.completion_rate)} hover:shadow-md transition-shadow cursor-pointer`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="mr-2 p-1 hover:bg-white hover:bg-opacity-50 rounded"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}

        {/* Node Content */}
        <div className="flex-1 flex items-center justify-between" onClick={handleNodeClick}>
          <div className="flex items-center space-x-3">
            {/* Avatar/Icon */}
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {node.slack_username?.charAt(0).toUpperCase() || '?'}
            </div>

            {/* User Info */}
            <div>
              <div className="font-semibold text-gray-900">
                {node.slack_username}
                {node.is_admin && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">Admin</span>
                )}
                {node.is_manager && !node.is_admin && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Manager</span>
                )}
              </div>
              <div className="text-sm text-gray-600">{node.email}</div>
              {node.department && (
                <div className="text-xs text-gray-500 mt-0.5">{node.department}</div>
              )}
            </div>
          </div>

          {/* Stats */}
          {node.team_size > 0 && (
            <div className="flex items-center space-x-4 text-sm">
              {/* Team Size */}
              <div className="text-center">
                <div className="text-xs text-gray-500">Team</div>
                <div className="font-semibold text-gray-900">{node.team_size}</div>
              </div>

              {/* Completion Rate */}
              <div className="text-center">
                <div className="text-xs text-gray-500">Completion</div>
                <div className="font-semibold text-gray-900">
                  {node.completed_count}/{node.total_count}
                  <span className="text-xs ml-1">({node.completion_rate}%)</span>
                </div>
              </div>

              {/* Average Rating */}
              <div className="text-center">
                <div className="text-xs text-gray-500">Avg Rating</div>
                <div className={`font-semibold ${getRatingColor(node.avg_rating)}`}>
                  {node.avg_rating ? `${node.avg_rating}/5` : 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-2">
          {node.children.map((child) => (
            <OrgChartNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const { isAdmin, isManager } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekStartDate, setWeekStartDate] = useState('');

  useEffect(() => {
    fetchOrgHierarchy();
  }, []);

  const fetchOrgHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/org/hierarchy');
      setTree(response.data.tree);
      setWeekStartDate(response.data.weekStartDate);
    } catch (err) {
      console.error('Error fetching org hierarchy:', err);
      setError('Failed to load organization chart');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchOrgHierarchy();
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
            <p className="text-gray-600 mt-1">
              Hierarchical view with team stats for week starting {weekStartDate}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Legend:</h3>
        <div className="flex space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span>≥80% completion</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
            <span>50-79% completion</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span>&lt;50% completion</span>
          </div>
        </div>
      </div>

      {/* Organization Tree */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {tree.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No organization data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tree.map((node) => (
              <OrgChartNode key={node.id} node={node} level={0} />
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Click on any person to view their detailed stats and individual trend line.
          Click the arrow icons to expand/collapse team hierarchies.
        </p>
      </div>
    </div>
  );
}
