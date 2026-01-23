'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import api from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

interface DashboardStats {
  appliedToday: number;
  totalApplications: number;
  successRate: number;
  dailyApplications: Array<{ date: string; count: number }>;
  recentApplications: Array<{
    id: string;
    jobTitle: string;
    company: string;
    status: string;
    appliedAt: string;
  }>;
}

interface ApplicationResponse {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
  };
  status: string;
  appliedAt?: string;
  createdAt: string;
}

interface StatsResponse {
  total: number;
  appliedToday: number;
  successRate: number;
  byStatus: Record<string, number>;
}

interface Resume {
  _id: string;
  masterResumeUrl: string;
  originalFileName?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkResumeAndFetchData();
  }, []);

  const checkResumeAndFetchData = async () => {
    try {
      // First, check if user has a resume
      const resumesResponse = await api.get<Resume[]>('/resumes');
      const hasResumeValue = resumesResponse.data.length > 0;
      setHasResume(hasResumeValue);

      if (!hasResumeValue) {
        setLoading(false);
        return;
      }

      // If resume exists, fetch dashboard data
      await fetchDashboardStats();
    } catch (err: any) {
      console.error('Error checking resume:', err);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  const calculateDailyApplications = (applications: ApplicationResponse[]): Array<{ date: string; count: number }> => {
    const dailyCounts: Record<string, number> = {};

    applications.forEach((app) => {
      const date = new Date(app.appliedAt || app.createdAt).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Convert to array and sort by date
    const dailyArray = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // If we have less than 2 days of data, return empty array (will show placeholder)
    if (dailyArray.length < 2) {
      return [];
    }

    return dailyArray;
  };

  const fetchDashboardStats = async () => {
    try {
      setError(null);
      
      // Fetch stats and applications in parallel
      const [statsResponse, applicationsResponse] = await Promise.all([
        api.get<StatsResponse>('/applications/stats'),
        api.get<ApplicationResponse[]>('/applications'),
      ]);

      const statsData = statsResponse.data;
      const applications = applicationsResponse.data;

      // Transform applications to match dashboard format
      const recentApplications = applications
        .slice(0, 10)
        .map((app) => ({
          id: app._id,
          jobTitle: app.jobId?.title || 'Unknown',
          company: app.jobId?.company || 'Unknown',
          status: app.status,
          appliedAt: app.appliedAt || app.createdAt,
        }));

      // Calculate daily applications
      const dailyApplications = calculateDailyApplications(applications);

      setStats({
        appliedToday: statsData.appliedToday,
        totalApplications: statsData.total,
        successRate: statsData.successRate,
        dailyApplications,
        recentApplications,
      });
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || hasResume === null) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show empty state if user hasn't uploaded a resume
  if (!hasResume) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-24 w-24 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Resume to Get Started</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Your dashboard will show application statistics once you upload a resume and start applying to jobs.
                Upload your resume to begin tracking your job applications and see insights about your application activity.
              </p>
              <Link
                href="/resumes"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Upload Resume
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show error state if there was an error fetching data
  if (error && !stats) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchDashboardStats}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show dashboard with real data
  if (!stats) {
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

          {error && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">{error}</p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Applied Today</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.appliedToday}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Applications</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalApplications}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.successRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Applications</h2>
            {stats.dailyApplications.length >= 2 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.dailyApplications}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p>Insufficient data to display chart. Apply to more jobs to see daily trends.</p>
              </div>
            )}
          </div>

          {/* Recent Applications Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
            </div>
            {stats.recentApplications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentApplications.map((app) => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {app.jobTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            app.status === 'SUCCESS' 
                              ? 'bg-green-100 text-green-800' 
                              : app.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500 mb-4">No applications yet.</p>
                <Link
                  href="/jobs"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Browse jobs to get started →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
