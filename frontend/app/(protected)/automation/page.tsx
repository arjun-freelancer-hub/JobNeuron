'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import api from '@/lib/api';

interface Schedule {
  cronExpression: string;
  maxJobsPerDay: number;
  platforms: string[];
  isActive: boolean;
}

export default function AutomationPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    cronExpression: '0 9 * * *', // Daily at 9 AM
    maxJobsPerDay: 10,
    platforms: ['LINKEDIN', 'INDEED'] as string[],
    isActive: false,
  });

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await api.get('/automation/settings');
      if (response.data) {
        setSchedule(response.data);
        setFormData({
          cronExpression: response.data.cronExpression || '0 9 * * *',
          maxJobsPerDay: response.data.maxJobsPerDay || 10,
          platforms: response.data.platforms || ['LINKEDIN', 'INDEED'],
          isActive: response.data.isActive !== undefined ? response.data.isActive : false,
        });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.post('/automation/schedule', formData);
      setSchedule(response.data);
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Automation Settings</h1>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule (Cron Expression)
                </label>
                <input
                  type="text"
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0 9 * * * (Daily at 9 AM)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Format: minute hour day month weekday
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Jobs Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxJobsPerDay}
                  onChange={(e) => setFormData({ ...formData, maxJobsPerDay: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platforms
                </label>
                <div className="space-y-2">
                  {['LINKEDIN', 'INDEED', 'WELLFOUND', 'COMPANY'].map((platform) => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.platforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              platforms: [...formData.platforms, platform],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              platforms: formData.platforms.filter((p) => p !== platform),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
