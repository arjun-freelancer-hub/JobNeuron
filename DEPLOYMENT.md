# Deployment Guide

## Railway Deployment

### Prerequisites
- Railway account
- GitHub repository connected to Railway
- Environment variables configured

### Steps

1. **Create Railway Project**
   - Go to Railway dashboard
   - Create new project
   - Connect GitHub repository

2. **Deploy Services**

   **Frontend Service:**
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: 3000

   **Backend Service:**
   - Root directory: `backend`
   - Build command: `npm run build`
   - Start command: `npm run start:prod`
   - Port: 3001

   **Automation Worker:**
   - Root directory: `automation`
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Add Database Services**
   - Add MongoDB service
   - Add Redis service
   - Update connection strings in environment variables

4. **Configure Environment Variables**

   **Frontend:**
   - `NEXT_PUBLIC_API_URL` - Backend API URL
   - `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL` - Cloudflare Images URL

   **Backend:**
   - `MONGODB_URI` - MongoDB connection string
   - `REDIS_URL` - Redis connection string
   - `JWT_SECRET` - JWT secret key
   - `JWT_REFRESH_SECRET` - JWT refresh secret
   - `CLOUDFLARE_R2_*` - Cloudflare R2 credentials
   - `OPENAI_API_KEY` - OpenAI API key
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

5. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Monitor deployment logs in Railway dashboard

## Docker Deployment

### Build Images
```bash
docker build -t jobneuron-frontend ./frontend
docker build -t jobneuron-backend ./backend
docker build -t jobneuron-automation ./automation
```

### Run with Docker Compose
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

See `.env.example` for all required environment variables.

## Monitoring

- Check application logs in Railway dashboard
- Monitor queue status via `/queue/stats` endpoint
- Check MongoDB and Redis connections
