// Temporary route to catch automation worker requests
// This will help identify if the worker is calling the frontend

import { NextResponse } from 'next/server';

export async function GET() {
  console.error('[API] /queue/jobs/next called - This endpoint should be in the backend!');
  console.error('[API] Automation worker is calling the frontend instead of backend.');
  console.error('[API] Worker should point to backend API (port 3000), not frontend (port 3001)');
  
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'This endpoint should be called on the backend API, not the frontend.',
      hint: 'Update automation worker API_URL to point to backend (port 3000)'
    },
    { status: 404 }
  );
}
