'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import { getApplications } from '@/lib/api';

interface Application {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
    location?: string;
    url: string;
    platform: string;
    description: string;
  };
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  appliedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getApplicationStatusBadge = (status: Application['status']) => {
    const statusConfig = {
      PENDING: { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      SUCCESS: { text: 'Applied', className: 'bg-green-100 text-green-800' },
      FAILED: { text: 'Failed', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const filteredApplications = statusFilter
    ? applications.filter((app) => app.status === statusFilter)
    : applications;

  const stats = {
    total: applications.length,
    pending: applications.filter((app) => app.status === 'PENDING').length,
    success: applications.filter((app) => app.status === 'SUCCESS').length,
    failed: applications.filter((app) => app.status === 'FAILED').length,
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Applied Jobs</h1>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Applications</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Success</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.success}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Failed</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-4">
              <label className="block text-sm font-medium text-gray-700">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Applications</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">
                  {statusFilter
                    ? `No ${statusFilter.toLowerCase()} applications found.`
                    : 'No applications found. Start applying to jobs to see them here.'}
                </p>
              </div>
            ) : (
              filteredApplications.map((application) => (
                <div key={application._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {application.jobId.title}
                      </h3>
                      <p className="text-lg text-gray-600">{application.jobId.company}</p>
                      {application.jobId.location && (
                        <p className="text-sm text-gray-500 mt-1">
                          {application.jobId.location}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {getApplicationStatusBadge(application.status)}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {application.jobId.description}
                  </p>

                  {application.status === 'FAILED' && application.errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Error: </span>
                        {application.errorMessage}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {application.jobId.platform}
                      </span>
                      <span className="text-sm text-gray-500">
                        Applied:{' '}
                        {application.appliedAt
                          ? new Date(application.appliedAt).toLocaleDateString()
                          : new Date(application.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={application.jobId.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        View Job →
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
