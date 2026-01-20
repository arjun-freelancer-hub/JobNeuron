# System Design --- AutoApply AI

## High-Level Architecture

    Next.js Frontend
          ↓
    NestJS Backend (API + Orchestration)
          ↓
    Redis + Bull (Job Queue)
          ↓
    Playwright Automation Workers (Docker)
          ↓
    Job Platforms (LinkedIn/Indeed)
          ↓
    Google Sheets + Email Notifications

## Components

-   Frontend: Next.js, Tailwind, ShadCN
-   Backend: NestJS, PostgreSQL, Redis
-   Automation: Playwright in Docker
-   Orchestration: n8n + Bull queues
