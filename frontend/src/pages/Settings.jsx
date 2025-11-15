import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkInDay, setCheckInDay] = useState('thursday');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [reminderTimes, setReminderTimes] = useState(['09:00', '16:00']);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/config');
      setConfig(response.data);
      setCheckInDay(response.data.check_in_day || 'thursday');
      setCheckInTime(response.data.check_in_time || '14:00');
      setReminderTimes(response.data.reminder_times || ['09:00', '16:00']);
    } catch (error) {
      console.error('Error fetching config:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/config', {
        check_in_day: checkInDay,
        check_in_time: checkInTime,
        reminder_times: reminderTimes
      });
      alert('Settings saved successfully! Changes will take effect on the next scheduled run.');
      await fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      alert(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReminderTime = () => {
    setReminderTimes([...reminderTimes, '12:00']);
  };

  const handleRemoveReminderTime = (index) => {
    const newTimes = reminderTimes.filter((_, i) => i !== index);
    setReminderTimes(newTimes);
  };

  const handleReminderTimeChange = (index, value) => {
    const newTimes = [...reminderTimes];
    newTimes[index] = value;
    setReminderTimes(newTimes);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure when check-ins are sent and when reminders go out</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Check-in Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-in Day
          </label>
          <select
            value={checkInDay}
            onChange={(e) => setCheckInDay(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            The day of the week when check-in questions will be sent to users
          </p>
        </div>

        {/* Check-in Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-in Time
          </label>
          <input
            type="time"
            value={checkInTime}
            onChange={(e) => setCheckInTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            The time when check-in questions will be sent (in each user's timezone)
          </p>
        </div>

        {/* Reminder Times */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reminder Times
          </label>
          <div className="space-y-3">
            {reminderTimes.map((time, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleReminderTimeChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => handleRemoveReminderTime(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-700 font-medium"
                  disabled={reminderTimes.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleAddReminderTime}
              className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Reminder Time
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Times when reminder messages will be sent to users who haven't completed their check-in (on the day after check-in day, in each user's timezone)
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check-ins are sent on <strong>{checkInDay}</strong> at <strong>{checkInTime}</strong></li>
            <li>• Reminders are sent the following day at the times specified above</li>
            <li>• All times are adjusted to each user's timezone automatically</li>
            <li>• Question rotation happens on Sunday at midnight</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
