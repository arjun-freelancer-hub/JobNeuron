# Automation Testing Guide

This guide explains how to test the automation worker locally and understand the flow through logs.

## Architecture Overview

The automation system works as follows:

1. **User creates application** → Frontend calls `POST /applications/apply`
2. **Backend queues job** → Application is added to Bull queue
3. **Worker polls for jobs** → Worker polls `GET /queue/jobs/next` every 5 seconds
4. **Worker processes job** → Worker applies to job using platform automation (LinkedIn/Indeed)
5. **Worker reports result** → Worker calls `POST /applications/:id/complete` with status

## Prerequisites

1. **Backend running** on `http://localhost:3001`
2. **Redis running** (required for Bull queue)
3. **Automation worker running** (separate process)
4. **MongoDB running** (for data storage)

## Starting Services

### 1. Start Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis installation
redis-server
```

### 2. Start Backend
```bash
cd backend
npm install
npm run start:dev
```

Watch for logs like:
```
[Applications] Creating application: userId=...
[Queue] Adding job to queue: applicationId=...
```

### 3. Start Automation Worker
```bash
cd automation
npm install
npm run dev
```

You should see:
```
[Worker] ========================================
[Worker] Automation worker started
[Worker] API URL: http://localhost:3001
[Worker] Polling interval: 5 seconds
[Worker] ========================================
[Worker] ✓ Connected to backend successfully
[Worker] ✓ Ready to process jobs
```

## Testing the Flow

### Step 1: Update Resume on Dashboard

1. Go to `http://localhost:3000/resumes` (or your frontend URL)
2. Upload or update a resume
3. Check backend logs - you should see resume creation/update logs

### Step 2: Create an Application

You can create an application in several ways:

#### Option A: Through Frontend
1. Go to dashboard
2. Find a job and click "Apply"
3. This will call `POST /applications/apply`

#### Option B: Using API directly
```bash
# First, get your auth token from login
TOKEN="your-jwt-token"

# Create an application
curl -X POST http://localhost:3001/applications/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-id",
    "resumeId": "your-resume-id",
    "jobUrl": "https://linkedin.com/jobs/view/123",
    "platform": "LINKEDIN"
  }'
```

### Step 3: Watch the Logs

#### Backend Logs (Terminal 1)
You should see:
```
[Applications] Creating application: userId=..., jobId=..., platform=LINKEDIN
[Applications] Application created: applicationId=...
[Applications] Adding application to queue...
[Queue] Adding job to queue: applicationId=..., platform=LINKEDIN
[Queue] ✅ Job added to queue: jobId=...
[Applications] ✅ Application ... queued for processing
```

#### Worker Logs (Terminal 2)
You should see:
```
[Worker] 📥 Received job: applicationId=...
[Worker] ========================================
[Worker] 🚀 Processing job application
[Worker]   Application ID: ...
[Worker]   Job ID: ...
[Worker]   Platform: LINKEDIN
[Worker]   Job URL: ...
[Worker]   Resume ID: ...
[Worker] ========================================
[Worker] 🔵 Applying via LinkedIn...
[Worker] ✅ Successfully applied to job in X.XXs
[Worker] 📤 Reporting success to backend...
[Worker] ✅ Success reported to backend
[Worker] ========================================
```

#### Backend Logs (after worker completes)
```
[Applications] POST /.../complete - status=SUCCESS
[Applications] Updating application ... status to SUCCESS
[Applications] ✅ Application ... marked as SUCCESS
```

## Debugging Common Issues

### Issue: Worker stops after 10 consecutive 404s

**Problem**: The endpoint `/queue/jobs/next` doesn't exist or backend isn't running.

**Solution**:
1. Check that backend is running on `http://localhost:3001`
2. Check that `QueueController` is properly registered in `QueueModule`
3. Restart the backend
4. Restart the worker

### Issue: Worker says "No jobs in queue"

**This is normal!** It means:
- The endpoint exists and is working
- There are just no jobs waiting to be processed
- The worker will continue polling every 5 seconds

### Issue: Jobs are queued but worker doesn't pick them up

**Check**:
1. Is Redis running? `redis-cli ping` should return `PONG`
2. Check backend logs for queue errors
3. Check worker logs for connection errors
4. Verify `REDIS_HOST` and `REDIS_PORT` in backend `.env`

### Issue: Application status not updating

**Check**:
1. Worker logs for errors during job processing
2. Backend logs for the `/complete` endpoint call
3. Check if worker can reach backend: `curl http://localhost:3001/queue/jobs/next`

## Monitoring Queue Status

Check queue stats:
```bash
curl http://localhost:3001/queue/stats
```

This returns:
```json
{
  "waiting": 0,
  "active": 0,
  "completed": 5,
  "failed": 0
}
```

## Log Levels

- `[Worker] ✓` - Success/info messages
- `[Worker] 📥` - Job received
- `[Worker] 🚀` - Job processing started
- `[Worker] ✅` - Success
- `[Worker] ❌` - Error
- `[Worker] ⚠️` - Warning

- `[Applications]` - Application service logs
- `[Queue]` - Queue service logs

## Testing with Mock Data

If you want to test without actually applying to jobs, you can modify the platform automation classes to return mock success responses.

## Next Steps

1. Monitor logs in both terminals
2. Create an application through the frontend
3. Watch the worker pick it up and process it
4. Check the application status in the dashboard
