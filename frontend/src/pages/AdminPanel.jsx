import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PencilIcon, UserPlusIcon, TagIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedUserForTags, setSelectedUserForTags] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [customDepartmentValue, setCustomDepartmentValue] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, tagsRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/tags'),
        api.get('/tags/departments/list')
      ]);
      setUsers(usersRes.data);
      setTags(tagsRes.data.tags || []);
      setDepartments(deptsRes.data.departments || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await api.put(`/users/${userId}`, updates);
      await fetchData();
      setEditingUser(null);
      setEditingDepartment(null);
      setCustomDepartmentValue('');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDepartmentChange = (userId, value) => {
    if (value === '__custom__') {
      setEditingDepartment(userId);
      setCustomDepartmentValue('');
    } else {
      handleUpdateUser(userId, { department: value || null });
    }
  };

  const handleCustomDepartmentSave = (userId) => {
    if (customDepartmentValue.trim()) {
      handleUpdateUser(userId, { department: customDepartmentValue.trim() });
    } else {
      setEditingDepartment(null);
      setCustomDepartmentValue('');
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await api.post(`/users/${userId}/deactivate`);
      await fetchData();
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Failed to deactivate user');
    }
  };

  const handleOpenTagModal = async (user) => {
    try {
      const response = await api.get(`/tags/user/${user.id}`);
      setSelectedUserForTags({ ...user, tags: response.data.tags || [] });
      setShowTagModal(true);
    } catch (error) {
      console.error('Error fetching user tags:', error);
    }
  };

  const handleAddTagToUser = async (tagId) => {
    if (!selectedUserForTags) return;
    try {
      await api.post(`/tags/user/${selectedUserForTags.id}`, { tagId });
      // Refresh tags for this user
      const response = await api.get(`/tags/user/${selectedUserForTags.id}`);
      setSelectedUserForTags({ ...selectedUserForTags, tags: response.data.tags || [] });
      await fetchData();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTagFromUser = async (tagId) => {
    if (!selectedUserForTags) return;
    try {
      await api.delete(`/tags/user/${selectedUserForTags.id}/${tagId}`);
      // Refresh tags for this user
      const response = await api.get(`/tags/user/${selectedUserForTags.id}`);
      setSelectedUserForTags({ ...selectedUserForTags, tags: response.data.tags || [] });
      await fetchData();
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await api.post('/tags', { name: newTagName, color: newTagColor });
      setNewTagName('');
      setNewTagColor('#3B82F6');
      await fetchData();
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  const availableTagsForUser = tags.filter(
    tag => !selectedUserForTags?.tags?.some(ut => ut.id === tag.id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-gray-600">Manage team members, departments, and tags</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Tag Management Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tag Management</h2>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="text"
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-16 h-10 border border-gray-300 rounded"
          />
          <button
            onClick={handleCreateTag}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-1" />
            Create
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-sm text-gray-500">No tags created yet</span>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={!user.is_active ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => navigate(`/employee/${user.id}`)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.slack_username}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    editingDepartment === user.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={customDepartmentValue}
                          onChange={(e) => setCustomDepartmentValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCustomDepartmentSave(user.id);
                            }
                          }}
                          placeholder="Enter department..."
                          className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
                          autoFocus
                        />
                        <button
                          onClick={() => handleCustomDepartmentSave(user.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingDepartment(null);
                            setCustomDepartmentValue('');
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <select
                        value={user.department || ''}
                        onChange={(e) => handleDepartmentChange(user.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md"
                      >
                        <option value="">No Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        <option value="__custom__">+ Add New...</option>
                      </select>
                    )
                  ) : (
                    <div className="text-sm text-gray-500">
                      {user.department || 'Not Set'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <select
                      value={user.manager_id || ''}
                      onChange={(e) => handleUpdateUser(user.id, { manager_id: e.target.value || null })}
                      className="text-sm border-gray-300 rounded-md"
                    >
                      <option value="">No Manager</option>
                      {users
                        .filter((u) => u.id !== user.id && u.is_active)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.slack_username}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {user.manager_id
                        ? users.find((u) => u.id === user.manager_id)?.slack_username || 'Unknown'
                        : 'No Manager'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleOpenTagModal(user)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <TagIcon className="w-4 h-4 mr-1" />
                    Manage Tags
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_admin
                        ? 'bg-purple-100 text-purple-800'
                        : user.is_manager
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.is_admin ? 'Admin' : user.is_manager ? 'Manager' : 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {editingUser === user.id ? (
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingUser(user.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <PencilIcon className="w-5 h-5 inline" />
                    </button>
                  )}
                  {user.is_active && (
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add New User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Users will be automatically added when they're detected in your Slack workspace.
              To manually add a user, you'll need their Slack User ID.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {showTagModal && selectedUserForTags && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Manage Tags for {selectedUserForTags.slack_username}
              </h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Current Tags */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUserForTags.tags && selectedUserForTags.tags.length > 0 ? (
                  selectedUserForTags.tags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTagFromUser(tag.id)}
                        className="ml-2 hover:opacity-70"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No tags assigned</span>
                )}
              </div>
            </div>

            {/* Available Tags */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Add Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {availableTagsForUser.length > 0 ? (
                  availableTagsForUser.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTagToUser(tag.id)}
                      className="px-3 py-1 rounded-full text-sm font-medium hover:opacity-80"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      + {tag.name}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">All tags assigned</span>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
