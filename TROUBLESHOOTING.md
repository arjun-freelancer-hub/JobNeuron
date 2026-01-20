# Troubleshooting Guide

## Middleware Logging

The middleware now includes logging in development mode. You'll see logs like:
```
[Middleware] / - Token: missing
[Middleware] Root route - Redirecting to /login (no token)
[Middleware] /dashboard - Token: exists
[Middleware] Protected route /dashboard - Allowing access (token exists)
```

## Automation Worker Issue

### Problem: `/queue/jobs/next` being called repeatedly (404 errors)

**Cause:**
The automation worker is running somewhere and polling for jobs every 5 seconds. It's calling the frontend (port 3001) instead of the backend, or the endpoint doesn't exist yet.

**Why it keeps calling even on 404:**
- The worker uses `setInterval` which runs continuously
- **FIXED**: Worker now stops after 10 consecutive 404s (50 seconds)
- Worker should NOT be running during frontend development

**Solutions:**

1. **Find and stop the automation worker:**
   ```powershell
   # Run the helper script
   .\scripts\stop-worker.ps1
   
   # Or manually find node processes
   Get-Process node | Where-Object {$_.Path -notlike "*Cursor*"}
   
   # Stop a specific process
   Stop-Process -Id <process-id>
   ```

2. **Check if worker is running in a terminal:**
   - Look for any terminal windows running `npm start` or `node` in the `automation` folder
   - Press `Ctrl+C` to stop it

3. **The worker will auto-stop:**
   - After 10 consecutive 404s (50 seconds)
   - On connection refused errors
   - This prevents infinite polling when endpoint doesn't exist

4. **The worker should only run when:**
   - Backend is running on the correct port (3000)
   - The `/queue/jobs/next` endpoint is implemented in the backend
   - You actually need automation workers running

5. **To run the worker properly (when needed):**
   ```bash
   cd automation
   # Set correct API_URL (should point to backend, not frontend)
   # Backend should be on port 3000
   # Frontend is on port 3001
   API_URL=http://localhost:3000 npm start
   ```

6. **The middleware now skips `/queue/` routes** so they won't be processed by the auth middleware.

## Port Configuration

- **Frontend**: Port 3001 (Next.js)
- **Backend**: Should be on port 3000 (NestJS) - check `backend/.env`
- **Automation Worker**: Should point to backend URL, not frontend

## Checking if Middleware is Working

1. Open browser console
2. Visit `http://localhost:3001/`
3. Check terminal logs - you should see:
   ```
   [Middleware] / - Token: missing
   [Middleware] Root route - Redirecting to /login (no token)
   ```

4. After login, visit `/` again - should see:
   ```
   [Middleware] / - Token: exists
   [Middleware] Root route - Redirecting to /dashboard (token exists)
   ```

## Common Issues

### Middleware not redirecting
- Check if middleware file is in `frontend/app/middleware.ts`
- Restart Next.js dev server
- Clear browser cookies
- Check browser console for errors

### 404 errors for `/queue/jobs/next`
- This is expected if the automation worker is running
- The endpoint doesn't exist yet in the backend
- Either stop the worker or implement the endpoint in the backend
