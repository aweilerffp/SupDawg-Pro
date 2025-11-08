import { useState, useEffect } from 'react';
import api from '../services/api';
import { PlusIcon, PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;

    try {
      const maxPosition = Math.max(
        ...questions.filter(q => !q.is_core).map(q => q.queue_position || 0),
        0
      );

      await api.post('/questions', {
        question_text: newQuestion,
        is_core: false,
        queue_position: maxPosition + 1
      });

      await fetchQuestions();
      setNewQuestion('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question');
    }
  };

  const handleUpdateQuestion = async (id) => {
    try {
      await api.put(`/questions/${id}`, { question_text: editText });
      await fetchQuestions();
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (id, isCore) => {
    if (isCore) {
      alert('Core questions cannot be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await api.delete(`/questions/${id}`);
      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/questions/${id}`, { is_active: !currentStatus });
      await fetchQuestions();
    } catch (error) {
      console.error('Error toggling question status:', error);
      alert('Failed to update question status');
    }
  };

  const handleReorder = async (id, direction) => {
    const rotatingQuestions = questions.filter(q => !q.is_core).sort((a, b) => a.queue_position - b.queue_position);
    const index = rotatingQuestions.findIndex(q => q.id === id);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === rotatingQuestions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [rotatingQuestions[index], rotatingQuestions[newIndex]] =
      [rotatingQuestions[newIndex], rotatingQuestions[index]];

    const questionIds = rotatingQuestions.map(q => q.id);

    try {
      await api.post('/questions/reorder', { questionIds });
      await fetchQuestions();
    } catch (error) {
      console.error('Error reordering questions:', error);
      alert('Failed to reorder questions');
    }
  };

  const coreQuestions = questions.filter(q => q.is_core);
  const rotatingQuestions = questions.filter(q => !q.is_core).sort((a, b) => a.queue_position - b.queue_position);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading questions...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Question Management</h1>
        <p className="mt-2 text-gray-600">Manage your check-in questions and rotation</p>
      </div>

      {/* Core Questions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Core Questions (Always Asked)</h2>
        <div className="bg-white rounded-lg shadow">
          {coreQuestions.map((question, index) => (
            <div
              key={question.id}
              className={`p-4 ${index !== coreQuestions.length - 1 ? 'border-b' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {editingId === question.id ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-900">{question.question_text}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {editingId === question.id ? (
                    <>
                      <button
                        onClick={() => handleUpdateQuestion(question.id)}
                        className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(question.id);
                        setEditText(question.question_text);
                      }}
                      className="p-2 text-gray-600 hover:text-primary-600"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rotating Questions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Rotating Questions</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Question
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter new question..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestion('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {rotatingQuestions.map((question, index) => (
            <div
              key={question.id}
              className={`p-4 ${index !== rotatingQuestions.length - 1 ? 'border-b' : ''} ${
                !question.is_active ? 'bg-gray-50 opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="flex flex-col mr-4">
                    <button
                      onClick={() => handleReorder(question.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-600 hover:text-primary-600 disabled:opacity-30"
                    >
                      <ChevronUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(question.id, 'down')}
                      disabled={index === rotatingQuestions.length - 1}
                      className="p-1 text-gray-600 hover:text-primary-600 disabled:opacity-30"
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    {editingId === question.id ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-900">
                        <span className="text-gray-500 mr-2">#{question.queue_position}</span>
                        {question.question_text}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(question.id, question.is_active)}
                    className={`px-3 py-1 text-sm rounded ${
                      question.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {question.is_active ? 'Active' : 'Inactive'}
                  </button>
                  {editingId === question.id ? (
                    <>
                      <button
                        onClick={() => handleUpdateQuestion(question.id)}
                        className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(question.id);
                          setEditText(question.question_text);
                        }}
                        className="p-2 text-gray-600 hover:text-primary-600"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id, question.is_core)}
                        className="p-2 text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
