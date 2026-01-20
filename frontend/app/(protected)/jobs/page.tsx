'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import api from '@/lib/api';

interface Job {
  _id: string;
  title: string;
  company: string;
  platform: string;
  url: string;
  description: string;
  location?: string;
  salary?: string;
  matchScore?: number;
  createdAt: string;
}

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: '',
    minScore: '',
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const params: any = {};
      if (filters.platform) params.platform = filters.platform;
      if (filters.minScore) params.minScore = parseFloat(filters.minScore);

      const response = await api.get('/jobs/matched', { params });
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchScore = async (jobId: string) => {
    try {
      const response = await api.get(`/jobs/${jobId}/match-score`);
      // Refresh jobs list
      fetchJobs();
    } catch (error) {
      console.error('Error calculating match score:', error);
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Job Discovery</h1>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={filters.platform}
                  onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Platforms</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="INDEED">Indeed</option>
                  <option value="WELLFOUND">Wellfound</option>
                  <option value="COMPANY">Company Website</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Match Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.minScore}
                  onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0-10"
                />
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No jobs found. Try adjusting your filters.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                      <p className="text-lg text-gray-600">{job.company}</p>
                      {job.location && (
                        <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {job.matchScore !== undefined ? (
                        <div>
                          <span className="text-2xl font-bold text-indigo-600">
                            {job.matchScore.toFixed(1)}
                          </span>
                          <p className="text-xs text-gray-500">Match Score</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => calculateMatchScore(job._id)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                        >
                          Calculate Match
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                      {job.platform}
                    </span>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      View Job →
                    </a>
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
