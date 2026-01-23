# API Design --- JobNeuron

## Auth

POST /auth/login\
POST /auth/register\
POST /auth/refresh

## Users

GET /users\
POST /users\
PATCH /users/{id}

## Resumes

POST /resumes/upload\
GET /resumes\
GET /resumes/{id}

## Jobs

GET /jobs/discover\
GET /jobs/{id}

## Applications

POST /applications/apply\
GET /applications\
GET /applications/{id}

## Automation

POST /automation/schedule\
GET /automation/settings
