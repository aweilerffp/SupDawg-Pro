import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function UserBrowserModal({ isOpen, onClose, onUserAdded }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [addingUserId, setAddingUserId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceUsers();
    }
  }, [isOpen]);

  const fetchWorkspaceUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/slack/workspace-users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching workspace users:', err);
      setError(err.response?.data?.error || 'Failed to fetch workspace users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (slackUserId) => {
    try {
      setAddingUserId(slackUserId);
      setError(null);

      await api.post('/users/add-from-slack', { slack_user_id: slackUserId });

      // Update the local state to mark user as added
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.slack_user_id === slackUserId
            ? { ...user, already_added: true }
            : user
        )
      );

      // Notify parent component
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setAddingUserId(null);
    }
  };

  // Filter and search users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by availability
    if (showOnlyAvailable) {
      filtered = filtered.filter(user => !user.already_added);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.real_name?.toLowerCase().includes(query) ||
        user.slack_username?.toLowerCase().includes(query) ||
        user.display_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, searchQuery, showOnlyAvailable]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Users from Slack</h2>
            <p className="text-sm text-gray-600 mt-1">
              {users.length} total users • {users.filter(u => u.already_added).length} already added
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Checkbox */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyAvailable}
              onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show only users not yet added</span>
          </label>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchQuery ? 'No users found matching your search' : 'No users available to add'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.slack_user_id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    user.already_added
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  {/* User Info */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.real_name || user.slack_username}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                          {(user.real_name || user.slack_username)?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {user.real_name || user.slack_username}
                        </h3>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                            Admin
                          </span>
                        )}
                        {user.is_owner && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">@{user.slack_username}</p>
                      {user.email && (
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      )}
                      {user.title && (
                        <p className="text-xs text-gray-400 truncate mt-1">{user.title}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0 ml-4">
                    {user.already_added ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Added</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddUser(user.slack_user_id)}
                        disabled={addingUserId === user.slack_user_id}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingUserId === user.slack_user_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span className="text-sm font-medium">Adding...</span>
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className="w-5 h-5" />
                            <span className="text-sm font-medium">Add</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
