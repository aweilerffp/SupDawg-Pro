import { useState, useEffect } from 'react';
import api from '../services/api';
import { format, startOfWeek } from 'date-fns';
import { EyeIcon, EyeSlashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function Responses() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );

  useEffect(() => {
    fetchResponses();
  }, [selectedWeek, anonymous]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/dashboard/responses?weekStartDate=${selectedWeek}&anonymous=${anonymous}`
      );
      setResponses(response.data);
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/dashboard/export', {
        responseType: 'blob',
        params: { weekStartDate: selectedWeek }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supdawg-responses-${selectedWeek}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading responses...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Responses</h1>
          <p className="mt-2 text-gray-600">View and analyze check-in responses</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAnonymous(!anonymous)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {anonymous ? (
              <>
                <EyeSlashIcon className="w-5 h-5 mr-2" />
                Anonymous
              </>
            ) : (
              <>
                <EyeIcon className="w-5 h-5 mr-2" />
                Show Names
              </>
            )}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Week Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Week
        </label>
        <input
          type="date"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Responses List */}
      {responses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No responses found for this week</p>
        </div>
      ) : (
        <div className="space-y-6">
          {responses.map((checkIn, index) => (
            <div key={checkIn.id} className="bg-white rounded-lg shadow p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {anonymous ? checkIn.anonymousId : checkIn.user?.username || 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Week of {format(new Date(checkIn.weekStartDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Rating:</span>
                  <span className={`text-2xl font-bold ${getRatingColor(checkIn.rating)}`}>
                    {checkIn.rating}/5
                  </span>
                </div>
              </div>

              {/* Core Questions */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    What went well this week?
                  </h4>
                  <p className="text-gray-900 bg-green-50 p-3 rounded-lg">
                    {checkIn.whatWentWell || 'No response'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    What didn't go well this week?
                  </h4>
                  <p className="text-gray-900 bg-red-50 p-3 rounded-lg">
                    {checkIn.whatDidntGoWell || 'No response'}
                  </p>
                </div>

                {/* Rotating Question Responses */}
                {checkIn.responses && checkIn.responses.length > 0 && (
                  <div>
                    {checkIn.responses.map((response) => (
                      <div key={response.questionId}>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          {response.questionText}
                        </h4>
                        <p className="text-gray-900 bg-blue-50 p-3 rounded-lg">
                          {response.responseText || 'No response'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Completed at {format(new Date(checkIn.completedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
