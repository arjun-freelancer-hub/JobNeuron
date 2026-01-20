# Environment Variables Setup Guide

This guide explains how to set up environment variables for the AutoApply AI platform.

## Quick Start

1. **Frontend**: Copy `frontend/.env.example` to `frontend/.env.local`
2. **Backend**: Copy `backend/.env.example` to `backend/.env`
3. **Automation**: Copy `automation/.env.example` to `automation/.env`
4. Fill in the required values (marked as REQUIRED in each file)

## Project Structure

```
JobNeuron/
├── frontend/
│   └── .env.local          # Frontend environment variables
├── backend/
│   └── .env                # Backend environment variables
└── automation/
    └── .env                # Automation worker environment variables
```

## Required Variables by Project

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend API URL |
| `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL` | ❌ No | Cloudflare Images URL (optional) |

### Backend (`backend/.env`)

#### Core Configuration
- ✅ `PORT` - Server port (default: 3001)
- ✅ `FRONTEND_URL` - Frontend URL for CORS
- ✅ `NODE_ENV` - Environment (development/production)

#### Database
- ✅ `MONGODB_URI` - MongoDB connection string
- ✅ `REDIS_HOST` - Redis host
- ✅ `REDIS_PORT` - Redis port
- ❌ `REDIS_PASSWORD` - Redis password (if required)

#### Authentication
- ✅ `JWT_SECRET` - JWT signing secret (min 32 chars)
- ✅ `JWT_EXPIRES_IN` - JWT expiration (e.g., "7d")
- ✅ `JWT_REFRESH_SECRET` - Refresh token secret
- ✅ `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration
- ✅ `COOKIE_SECRET` - Cookie signing secret

#### Cloudflare R2
- ✅ `CLOUDFLARE_R2_ACCOUNT_ID` - R2 account ID
- ✅ `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 access key
- ✅ `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 secret key
- ✅ `CLOUDFLARE_R2_BUCKET_NAME` - R2 bucket name

#### AI Services
- ✅ `OPENAI_API_KEY` - OpenAI API key

#### Optional Services
- ❌ `GOOGLE_CLIENT_ID` - Google OAuth (optional)
- ❌ `GOOGLE_CLIENT_SECRET` - Google OAuth (optional)
- ❌ `EMAIL_SERVICE_API_KEY` - Email service (optional)
- ❌ `AUTOMATION_WORKER_URL` - Automation worker URL (optional)
- ❌ `N8N_WEBHOOK_URL` - n8n webhook (optional)

### Automation (`automation/.env`)

- ✅ `API_URL` - Backend API URL
- ❌ `WORKER_POLL_INTERVAL` - Polling interval (optional)
- ❌ `HEADLESS` - Headless mode (optional)
- ❌ `PROXY_URL` - Proxy URL (optional)

## Generating Secrets

### JWT Secrets
```bash
# Generate a secure random string
openssl rand -base64 32
```

### Cookie Secret
```bash
# Generate a secure random string
openssl rand -base64 32
```

## Service Setup

### MongoDB

**Local (Docker):**
```bash
docker-compose up -d mongodb
# MONGODB_URI=mongodb://localhost:27017/jobneuron
```

**Cloud (MongoDB Atlas):**
1. Create cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string
3. Format: `mongodb+srv://username:password@cluster.mongodb.net/jobneuron`

### Redis

**Local (Docker):**
```bash
docker-compose up -d redis
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

**Cloud (Redis Cloud, Upstash, etc.):**
1. Create Redis instance
2. Get connection details
3. Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

### Cloudflare R2

1. Go to Cloudflare Dashboard > R2
2. Create a bucket (e.g., `jobneuron-resumes`)
3. Go to Manage R2 API Tokens
4. Create API token with read/write permissions
5. Copy Account ID, Access Key ID, and Secret Access Key

### OpenAI

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Google OAuth (Optional)

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy Client ID and Client Secret

## Environment-Specific Configuration

### Development
- Use local MongoDB and Redis (Docker)
- Use development API keys
- Set `NODE_ENV=development`

### Production
- Use cloud MongoDB and Redis
- Use production API keys
- Set `NODE_ENV=production`
- Use strong, unique secrets
- Enable HTTPS
- Set proper CORS origins

## Security Best Practices

1. ✅ Never commit `.env` files to version control
2. ✅ Use strong, unique secrets (min 32 characters)
3. ✅ Rotate secrets regularly
4. ✅ Use different secrets for each environment
5. ✅ Limit API key permissions
6. ✅ Use environment variables, not hardcoded values
7. ✅ Review `.gitignore` to ensure `.env` files are excluded

## Troubleshooting

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` matches backend URL
- Verify CORS settings in backend
- Check `FRONTEND_URL` in backend `.env`

### Authentication not working
- Verify `JWT_SECRET` is set and matches
- Check cookie settings (secure, sameSite)
- Ensure `COOKIE_SECRET` is set

### File uploads failing
- Verify Cloudflare R2 credentials
- Check bucket name and permissions
- Ensure bucket CORS is configured

### AI features not working
- Verify `OPENAI_API_KEY` is valid
- Check API key has sufficient credits
- Review OpenAI API usage limits

## Need Help?

- Check the `.env.example` files for detailed comments
- Review service-specific documentation
- Check logs for error messages
- Verify all required variables are set
