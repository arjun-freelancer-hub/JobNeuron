'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Resume {
  _id: string;
  masterResumeUrl?: string;
  originalFileName?: string;
  resumeSource?: 'UPLOAD' | 'FORM';
  formData?: {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    workExperience?: Array<{
      company: string;
      position: string;
      startDate: string;
      endDate?: string;
      description: string;
    }>;
    education?: Array<{
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate?: string;
    }>;
    skills?: string[];
  };
  tailoredResumes: Array<{
    jobId: string;
    resumeUrl: string;
    version: number;
    createdAt: string;
  }>;
  createdAt: string;
}

export default function ResumesPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeSource, setResumeSource] = useState<'UPLOAD' | 'FORM'>('UPLOAD');
  const [showForm, setShowForm] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    summary: '',
    workExperience: [] as Array<{
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      description: string;
    }>,
    education: [] as Array<{
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string;
    }>,
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchResumes();
    fetchResumeConfig();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await api.get('/resumes');
      setResumes(response.data);
      if (response.data.length > 0 && response.data[0].formData) {
        setFormData({
          name: response.data[0].formData.name || '',
          email: response.data[0].formData.email || '',
          phone: response.data[0].formData.phone || '',
          summary: response.data[0].formData.summary || '',
          workExperience: response.data[0].formData.workExperience || [],
          education: response.data[0].formData.education || [],
          skills: response.data[0].formData.skills || [],
        });
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumeConfig = async () => {
    try {
      const response = await api.get('/resumes/config');
      setResumeSource(response.data.resumeSource || 'UPLOAD');
      setShowForm(response.data.resumeSource === 'FORM');
    } catch (error) {
      console.error('Error fetching resume config:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await api.post('/resumes/config', { resumeSource: 'UPLOAD' });
      setResumeSource('UPLOAD');
      setShowForm(false);
      await fetchResumes();
      toast.success('Resume uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      toast.error(error.response?.data?.message || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      await api.post('/resumes/form', formData);
      await api.post('/resumes/config', { resumeSource: 'FORM' });
      setResumeSource('FORM');
      await fetchResumes();
      toast.success('Resume form saved successfully!');
    } catch (error: any) {
      console.error('Error saving form resume:', error);
      toast.error(error.response?.data?.message || 'Failed to save resume form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSourceChange = async (source: 'UPLOAD' | 'FORM') => {
    try {
      await api.post('/resumes/config', { resumeSource: source });
      setResumeSource(source);
      setShowForm(source === 'FORM');
      toast.success(`Resume source set to ${source === 'UPLOAD' ? 'Upload' : 'Form'}`);
    } catch (error: any) {
      console.error('Error updating resume source:', error);
      toast.error('Failed to update resume source. Please try again.');
    }
  };

  const addWorkExperience = () => {
    setFormData({
      ...formData,
      workExperience: [
        ...formData.workExperience,
        { company: '', position: '', startDate: '', endDate: '', description: '' },
      ],
    });
  };

  const removeWorkExperience = (index: number) => {
    setFormData({
      ...formData,
      workExperience: formData.workExperience.filter((_, i) => i !== index),
    });
  };

  const updateWorkExperience = (index: number, field: string, value: string) => {
    const updated = [...formData.workExperience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, workExperience: updated });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [
        ...formData.education,
        { institution: '', degree: '', field: '', startDate: '', endDate: '' },
      ],
    });
  };

  const removeEducation = (index: number) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index),
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, education: updated });
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    });
  };

  const handleViewResume = async (resumeId: string) => {
    const loadingKey = `master-${resumeId}`;
    setLoadingUrls((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const response = await api.get(`/resumes/${resumeId}/download`);
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error fetching resume URL:', error);
      toast.error('Failed to load resume. Please try again.');
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleViewTailoredResume = async (resumeId: string, jobId: string) => {
    const loadingKey = `tailored-${resumeId}-${jobId}`;
    setLoadingUrls((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const response = await api.get(`/resumes/${resumeId}/tailored/${jobId}/download`);
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error fetching tailored resume URL:', error);
      toast.error('Failed to load tailored resume. Please try again.');
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [loadingKey]: false }));
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Resumes</h1>
          </div>

          {/* Resume Source Selection */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resume Source</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose how you want to provide your resume for match score calculation:
            </p>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resumeSource"
                  value="UPLOAD"
                  checked={resumeSource === 'UPLOAD'}
                  onChange={() => handleSourceChange('UPLOAD')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Upload Resume File</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resumeSource"
                  value="FORM"
                  checked={resumeSource === 'FORM'}
                  onChange={() => handleSourceChange('FORM')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Fill Resume Form</span>
              </label>
            </div>
          </div>

          {/* Upload Section */}
          {resumeSource === 'UPLOAD' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Resume</h2>
              <label className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700">
                {uploading ? 'Uploading...' : 'Choose File'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {/* Form Section */}
          {resumeSource === 'FORM' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resume Form</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Work Experience</label>
                    <button
                      type="button"
                      onClick={addWorkExperience}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Experience
                    </button>
                  </div>
                  {formData.workExperience.map((exp, index) => (
                    <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <input
                          type="text"
                          placeholder="Company"
                          value={exp.company}
                          onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Position"
                          value={exp.position}
                          onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Start Date"
                          value={exp.startDate}
                          onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="End Date (or Present)"
                          value={exp.endDate}
                          onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <textarea
                        placeholder="Description"
                        value={exp.description}
                        onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeWorkExperience(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Education</label>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Education
                    </button>
                  </div>
                  {formData.education.map((edu, index) => (
                    <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Institution"
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Degree"
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Field of Study"
                          value={edu.field}
                          onChange={(e) => updateEducation(index, 'field', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Start Date"
                          value={edu.startDate}
                          onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add a skill"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="ml-2 text-indigo-600 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveForm}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Resume Form'}
                </button>
              </div>
            </div>
          )}

          {/* Display Existing Resumes */}
          {resumes.length > 0 && (
            <div className="space-y-6">
              {resumes.map((resume) => (
                <div key={resume._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {resume.resumeSource === 'FORM' ? 'Form-Based Resume' : resume.originalFileName || 'Master Resume'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Source: {resume.resumeSource || 'UPLOAD'} | Created {new Date(resume.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {resume.masterResumeUrl && (
                      <button
                        onClick={() => handleViewResume(resume._id)}
                        disabled={loadingUrls[`master-${resume._id}`]}
                        className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUrls[`master-${resume._id}`] ? 'Loading...' : 'View'}
                      </button>
                    )}
                  </div>

                  {resume.tailoredResumes.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Tailored Versions ({resume.tailoredResumes.length})
                      </h4>
                      <div className="space-y-2">
                        {resume.tailoredResumes.map((tailored, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm text-gray-600">
                              Version {tailored.version} - {new Date(tailored.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleViewTailoredResume(resume._id, tailored.jobId)}
                              disabled={loadingUrls[`tailored-${resume._id}-${tailored.jobId}`]}
                              className="text-indigo-600 hover:text-indigo-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loadingUrls[`tailored-${resume._id}-${tailored.jobId}`] ? 'Loading...' : 'View'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
