# Automation Worker

## ⚠️ Important

**Do NOT run this worker during frontend development!**

The automation worker is designed to run as a separate service and will:
- Poll the backend API every 5 seconds
- Make requests to `/queue/jobs/next` endpoint
- Stop automatically after 10 consecutive 404s (endpoint doesn't exist yet)

## Running the Worker

The worker should only be run when:
1. Backend is running and accessible
2. The `/queue/jobs/next` endpoint is implemented
3. You need automation workers to process job applications

## To Stop the Worker

If the worker is running and causing issues:

1. **Find the process:**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -eq "node"} | Where-Object {$_.Path -like "*automation*"}
   ```

2. **Stop it:**
   - If running in terminal: Press `Ctrl+C`
   - If running as process: `Stop-Process -Id <process-id>`

3. **Or check all node processes:**
   ```powershell
   Get-Process node | Format-Table Id, ProcessName, Path -AutoSize
   ```

## Configuration

Set `API_URL` environment variable to point to your backend:
```bash
# Should point to backend (usually port 3000), NOT frontend (port 3001)
API_URL=http://localhost:3000
```

## Auto-Stop Feature

The worker will automatically stop polling after 10 consecutive 404 responses (50 seconds) to prevent unnecessary requests when the endpoint doesn't exist.
