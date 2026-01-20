# AutoApply AI - Job Application Automation Platform

A comprehensive SaaS platform that automates job discovery, resume tailoring, and job applications using AI and automation.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: NestJS, MongoDB (Mongoose), Redis, Bull Queue
- **Authentication**: Cookie-based JWT with Next.js middleware
- **Storage**: Cloudflare R2 (resume files), Cloudflare Images
- **Automation**: Playwright (Docker containers)
- **AI**: OpenAI GPT-4
- **Deployment**: Docker (local), Railway (production)

## Project Structure

```
JobNeuron/
├── docs/                      # Documentation
├── frontend/                  # Next.js 16 application
├── backend/                   # NestJS application
├── automation/                # Playwright workers
├── docker-compose.yml         # Local development setup
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- MongoDB (via Docker)
- Redis (via Docker)
- Cloudflare R2 account (for file storage)
- OpenAI API key (for AI features)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd JobNeuron
   ```

2. **Start Docker services (MongoDB and Redis)**
   ```bash
   docker-compose up -d
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   # Create .env file with your configuration (see .env.example)
   npm run start:dev
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   # Create .env.local file with your configuration
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Production Deployment

#### Using Docker Compose
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Using Railway
1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy services (frontend, backend, automation workers)
4. Configure MongoDB and Redis services

## Environment Variables

See `.env.example` for required environment variables.

## Development Phases

1. **Phase 1**: Foundation & Authentication
2. **Phase 2**: Resume Management & Dashboard
3. **Phase 3**: Job Discovery & AI Matching
4. **Phase 4**: Automation & Application System
5. **Phase 5**: Scheduling & Orchestration
6. **Phase 6**: Analytics & Notifications
7. **Phase 7**: Testing & Deployment

## Documentation

All documentation is available in the `docs/` folder:
- PRD (Product Requirements Document)
- System Design
- API Design
- UI Wireframes
- Playwright Automation Design
- n8n Workflow Design

## License

Private - All rights reserved
