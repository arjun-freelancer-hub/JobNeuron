# JobNeuron - AI-Powered Job Application Automation Platform

[![License](https://img.shields.io/badge/license-Open%20Source-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)

JobNeuron is an open-source platform that automates job discovery, resume tailoring, and job applications using AI and automation. Save time in your job search by letting AI handle the heavy lifting.

## ✨ Features

- **🤖 AI-Powered Job Discovery**: Automatically discover relevant jobs from LinkedIn, Indeed, and other platforms
- **📄 Smart Resume Tailoring**: AI customizes your resume for each job application to maximize match scores
- **🎯 Match Score Analysis**: Get AI-powered match scores (0-10) to identify the best opportunities
- **⚡ Automated Applications**: Set up scheduled automation to automatically apply to high-scoring jobs
- **📝 Flexible Resume Input**: Upload your resume file or fill out a form-based resume
- **📊 Application Tracking**: Track all your applications with status updates and analytics
- **🔒 Secure & Private**: Your data is encrypted and stored securely with full control over automation

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, React Hot Toast
- **Backend**: NestJS, MongoDB (Mongoose), Redis, Bull Queue
- **Authentication**: Cookie-based JWT with Next.js middleware
- **Storage**: Cloudflare R2 (resume files)
- **Automation**: Playwright (Docker containers)
- **AI**: OpenAI GPT-4
- **Deployment**: Docker (local), Railway (production)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/get-started))
- **MongoDB** (via Docker - included in setup)
- **Redis** (via Docker - included in setup)
- **Cloudflare R2** account (for file storage) - [Sign up](https://www.cloudflare.com/products/r2/)
- **OpenAI API key** (for AI features) - [Get API key](https://platform.openai.com/api-keys)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd JobNeuron
```

### 2. Start Docker Services

Start MongoDB and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- MongoDB on `localhost:27017`
- Redis on `localhost:6379`

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration. See [Environment Variables](#environment-variables) section for details.

Start the backend server:

```bash
npm run start:dev
```

The backend will run on `http://localhost:3001`

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 5. Automation Worker (Optional)

If you want to run the automation worker locally:

```bash
cd automation
npm install
```

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and configure the automation worker URL.

Start the worker:

```bash
npm run dev
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: Available at http://localhost:3001 (if enabled)

## 📁 Project Structure

```
JobNeuron/
├── docs/                      # Documentation
│   ├── autoapply_prd.md      # Product Requirements Document
│   ├── autoapply_system_design.md
│   ├── autoapply_api_design.md
│   └── ...
├── frontend/                  # Next.js 16 application
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities and API client
│   └── package.json
├── backend/                  # NestJS application
│   ├── src/
│   │   ├── auth/             # Authentication module
│   │   ├── jobs/             # Job discovery and management
│   │   ├── resumes/          # Resume management
│   │   ├── applications/    # Application tracking
│   │   ├── automation/      # Automation scheduling
│   │   ├── ai/              # AI services
│   │   └── ...
│   └── package.json
├── automation/               # Playwright automation workers
│   ├── src/
│   │   ├── platforms/       # Platform-specific automation
│   │   └── workers/         # Worker implementation
│   └── package.json
├── docker-compose.yml        # Local development setup
├── docker-compose.prod.yml   # Production setup
└── README.md
```

## 🔧 Environment Variables

### Backend Environment Variables

See `backend/.env.example` for all available options. Key variables:

**Required:**
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - JWT secret key (min 32 characters)
- `CLOUDFLARE_R2_*` - Cloudflare R2 storage credentials
- `OPENAI_API_KEY` - OpenAI API key

**Optional:**
- `PORT` - Backend port (default: 3001)
- `AUTOMATION_WORKER_URL` - Automation worker URL

### Frontend Environment Variables

See `frontend/.env.example` for all available options.

**Required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Automation Worker Environment Variables

See `automation/.env.example` for all available options.

For detailed environment variable setup, see [ENV_SETUP.md](./ENV_SETUP.md).

## 🏗️ Development

### Running in Development Mode

1. **Start Docker services**:
   ```bash
   docker-compose up -d
   ```

2. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

4. **Start Automation Worker** (Terminal 3, Optional):
   ```bash
   cd automation
   npm run dev
   ```

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend
npm run build
npm run start
```

### Using Docker Compose for Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📖 Usage Guide

### 1. Create an Account

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Register"
3. Fill in your details and create an account

### 2. Add Your Resume

You have two options:

**Option A: Upload Resume File**
1. Go to the "Resumes" page
2. Select "Upload Resume File"
3. Upload your PDF or DOCX resume

**Option B: Fill Resume Form**
1. Go to the "Resumes" page
2. Select "Fill Resume Form"
3. Fill in your details, work experience, education, and skills
4. Click "Save Resume Form"

### 3. Discover Jobs

1. Go to the "Jobs" page
2. Select a platform (LinkedIn, Indeed, etc.)
3. Enter job title and location (optional)
4. Click "Discover Jobs"
5. Jobs will be automatically saved to your account

### 4. Calculate Match Scores

1. On the Jobs page, click "Calculate Match" for any job
2. AI will analyze the job against your resume
3. You'll see a match score from 0-10
4. Higher scores indicate better matches

### 5. Set Up Automation (Optional)

1. Go to the "Automation" page
2. Configure your schedule (cron expression)
3. Set max jobs per day
4. Select platforms
5. **Important**: Automation is OFF by default. Toggle "Active" to enable.
6. Click "Save Schedule"

When automation is enabled:
- Jobs are discovered daily at 8 AM
- Applications are sent at 9 AM (or your configured time)
- Only jobs with match score >= 7 are auto-applied
- Daily limits are respected

### 6. Apply to Jobs

**Manual Application:**
1. Browse jobs on the Jobs page
2. Click "Apply" on any job
3. Select a resume if you have multiple
4. Application is queued for processing

**Automatic Application:**
- Enable automation in Automation settings
- Jobs with match score >= 7 will be automatically applied
- Check the Dashboard for application status

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run test
npm run test:e2e
```

### Frontend Tests

```bash
cd frontend
npm run test
```

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error:**
- Ensure Docker is running
- Check `docker-compose up -d` started MongoDB
- Verify `MONGODB_URI` in backend `.env`

**Redis Connection Error:**
- Ensure Docker is running
- Check Redis container is up: `docker ps`
- Verify `REDIS_HOST` and `REDIS_PORT` in backend `.env`

**File Upload Fails:**
- Verify Cloudflare R2 credentials in backend `.env`
- Check R2 bucket exists and is accessible
- Ensure file size is under 10MB

**AI Features Not Working:**
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Review backend logs for API errors

**Automation Not Running:**
- Check automation is enabled in settings (default is OFF)
- Verify cron expression is correct
- Check backend logs for scheduler errors
- Ensure automation worker is running (if using separate worker)

For more troubleshooting help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## 📚 Documentation

- [Environment Setup Guide](./ENV_SETUP.md) - Detailed environment variable configuration
- [Job Discovery Guide](./JOB_DISCOVERY_GUIDE.md) - How job discovery works
- [Automation Testing](./AUTOMATION_TESTING.md) - Testing automation features
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

Additional documentation is available in the `docs/` folder.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass before submitting

## 📝 License

This project is open source and available for use, modification, and distribution. See the LICENSE file in the repository root for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [NestJS](https://nestjs.com/)
- AI capabilities via [OpenAI](https://openai.com/)
- Storage via [Cloudflare R2](https://www.cloudflare.com/products/r2/)

## 📧 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting guide

## 🗺️ Roadmap

- [ ] Additional job platforms (Wellfound, company websites)
- [ ] Enhanced AI matching algorithms
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Resume templates
- [ ] Multi-language support

---

**Made with ❤️ for job seekers everywhere**
