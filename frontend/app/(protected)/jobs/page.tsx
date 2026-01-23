'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import api, { discoverJobs, applyToJob } from '@/lib/api';
import toast from 'react-hot-toast';

interface Job {
  _id: string;
  title: string;
  company: string;
  platform: string;
  url: string;
  description: string;
  location?: string;
  salary?: string;
  matchScore?: number | null;
  createdAt: string;
  application?: {
    _id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    appliedAt?: string;
    errorMessage?: string;
  } | null;
}

interface Resume {
  _id: string;
  masterResumeUrl: string;
  originalFileName?: string;
  createdAt: string;
}

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [discoveryResult, setDiscoveryResult] = useState<{
    count: number;
    message: string;
  } | null>(null);
  const [filters, setFilters] = useState({
    platform: '',
    minScore: '',
  });
  const [discoveryFilters, setDiscoveryFilters] = useState({
    platform: 'LINKEDIN',
    title: '',
    location: '',
    limit: 20,
  });

  useEffect(() => {
    fetchJobs();
    fetchResumes();
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

  const fetchResumes = async () => {
    try {
      const response = await api.get('/resumes');
      setResumes(response.data);
      if (response.data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  const calculateMatchScore = async (jobId: string) => {
    try {
      const response = await api.get(`/jobs/${jobId}/match-score`);
      // Refresh jobs list
      fetchJobs();
      toast.success('Match score calculated successfully!');
    } catch (error: any) {
      console.error('Error calculating match score:', error);
      const errorMessage = error.response?.data?.message || 'Failed to calculate match score. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleDiscoverJobs = async () => {
    if (!discoveryFilters.platform) {
      alert('Please select a platform');
      return;
    }

    setDiscovering(true);
    setDiscoveryResult(null);

    try {
      const result = await discoverJobs({
        platform: discoveryFilters.platform,
        title: discoveryFilters.title || undefined,
        location: discoveryFilters.location || undefined,
        limit: discoveryFilters.limit,
      });
      setDiscoveryResult(result);
      // Refresh jobs list after discovery
      await fetchJobs();
    } catch (error: any) {
      console.error('Error discovering jobs:', error);
      setDiscoveryResult({
        count: 0,
        message: error.response?.data?.message || 'Error discovering jobs',
      });
    } finally {
      setDiscovering(false);
    }
  };

  const handleApply = async (job: Job) => {
    if (resumes.length === 0) {
      alert('Please upload a resume first before applying to jobs.');
      return;
    }

    if (resumes.length === 1) {
      // Auto-select the only resume
      setSelectedResumeId(resumes[0]._id);
      await submitApplication(job, resumes[0]._id);
    } else {
      // Show modal to select resume
      setShowResumeModal(job._id);
    }
  };

  const submitApplication = async (job: Job, resumeId: string) => {
    setApplying(job._id);
    try {
      await applyToJob({
        jobId: job._id,
        resumeId: resumeId,
        jobUrl: job.url,
        platform: job.platform,
      });
      // Refresh jobs to show application status
      await fetchJobs();
      setShowResumeModal(null);
      alert('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error applying to job:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to apply to job. Please try again.';
      alert(errorMessage);
    } finally {
      setApplying(null);
    }
  };

  const handleResumeSelect = (jobId: string) => {
    if (selectedResumeId) {
      const job = jobs.find((j) => j._id === jobId);
      if (job) {
        submitApplication(job, selectedResumeId);
      }
    }
  };

  const getApplicationStatusBadge = (application: Job['application']) => {
    if (!application) return null;

    const statusConfig = {
      PENDING: { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      SUCCESS: { text: 'Applied', className: 'bg-green-100 text-green-800' },
      FAILED: { text: 'Failed', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[application.status] || statusConfig.PENDING;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${config.className}`}>
        {config.text}
      </span>
    );
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

          {/* Job Discovery Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Discover New Jobs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform *
                </label>
                <select
                  value={discoveryFilters.platform}
                  onChange={(e) =>
                    setDiscoveryFilters({ ...discoveryFilters, platform: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={discovering}
                >
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="INDEED">Indeed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={discoveryFilters.title}
                  onChange={(e) =>
                    setDiscoveryFilters({ ...discoveryFilters, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Software Engineer"
                  disabled={discovering}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={discoveryFilters.location}
                  onChange={(e) =>
                    setDiscoveryFilters({ ...discoveryFilters, location: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Remote, San Francisco"
                  disabled={discovering}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discoveryFilters.limit}
                  onChange={(e) =>
                    setDiscoveryFilters({
                      ...discoveryFilters,
                      limit: parseInt(e.target.value) || 20,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={discovering}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDiscoverJobs}
                disabled={discovering || !discoveryFilters.platform}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {discovering ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Discovering...
                  </>
                ) : (
                  'Discover Jobs'
                )}
              </button>
              {discoveryResult && (
                <div
                  className={`px-4 py-2 rounded-lg ${
                    discoveryResult.count > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {discoveryResult.message}
                </div>
              )}
            </div>
          </div>

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
                      {job.matchScore !== null && job.matchScore !== undefined ? (
                        <div>
                          <span className="text-2xl font-bold text-indigo-600">
                            {job.matchScore.toFixed(1)}
                          </span>
                          <p className="text-xs text-gray-500">Match Score</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => calculateMatchScore(job._id)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Generate Score
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                        {job.platform}
                      </span>
                      {job.application && getApplicationStatusBadge(job.application)}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        View Job →
                      </a>
                      {!job.application ? (
                        <button
                          onClick={() => handleApply(job)}
                          disabled={applying === job._id || resumes.length === 0}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {applying === job._id ? 'Applying...' : 'Apply'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed"
                        >
                          Applied
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resume Selection Modal */}
      {showResumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Resume to Apply
            </h3>
            <div className="space-y-2 mb-4">
              {resumes.map((resume) => (
                <label
                  key={resume._id}
                  className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="resume"
                    value={resume._id}
                    checked={selectedResumeId === resume._id}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-900">
                    {resume.originalFileName || 'Master Resume'}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowResumeModal(null);
                  setSelectedResumeId(resumes[0]?._id || '');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResumeSelect(showResumeModal)}
                disabled={!selectedResumeId || applying === showResumeModal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {applying === showResumeModal ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
