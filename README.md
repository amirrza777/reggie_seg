## Recommended Setup (Nix)
This project is designed to be run using **Nix**. The Nix workflow provides a fully reproducible development environment and automatically sets up dependencies, the database, and required services.

> The Nix commands below are the **recommended and supported way** to run and assess the project.

### Quick Start

```bash
nix run .#init
nix run .#run
nix run .#tests
```
A full developers manual is included with this submission, covering system architecture, setup, testing, and troubleshooting.

📄 [Developers Manual](./developers-manual.pdf)

Please refer to the **Developers Manual (PDF)** for detailed instructions and additional context.

# Team Feedback 2.0

Team Feedback 2.0 is a web-based platform for managing and monitoring team-based coursework. It supports project creation, questionnaires, meetings, deadlines and extensions, team allocation workflows, peer assessment, and optional GitHub and Trello integrations.

## Authors

- Ali Mohammed
- Crinan Potter
- Maksym Byelko
- Amir Guliyev
- Ayan Mamun
- Ali Demir
- Andres Zacchi
- Tunjay Seyidali
- Matthew Kelsey

## Repository Structure

- `apps/api` - Express API, Prisma schema, seed scripts, backend tests
- `apps/web` - Next.js frontend
- `packages/shared` - shared package code

## Deployment

- Frontend URL: `https://reggie-seg.vercel.app`
- API URL: `https://reggieseg-production.up.railway.app`

## Marker Login Credentials

The repository provides seeded assessment/demo accounts.The default seeded accounts are:

### Student

- Email: `student.assessment@example.com`
- Password: `password123`

### Staff

- Email: `staff.assessment@example.com`
- Password: `password123`

### Enterprise Admin

- Email: `entp_admin.assessment@example.com`
- Password: `password123`

### Admin

- Email: `global_admin.assessment@example.com`
- Password: `password123`

### Additional GitHub Demo Accounts

- Staff: `github.staff@example.com` / `password123`
- Student: `github.student@example.com` / `password123`

If the deployed database was seeded with different values, update this section to match the deployed environment.

## Running The Project

The repository includes a `flake.nix` file for the Nix-based environment expected by the project brief. If running the project manually without Nix, the local development flow is below.

### 1. Clone the repository

```bash
git clone https://github.com/amirrza777/reggie_seg.git
cd reggie_seg
```

### 2. Start MySQL

From the repo root:

```bash
docker compose up -d
docker ps
```

You should see a MySQL container running for the `mysql` service.

### Reset DB completely (deletes local DB data)

```bash
docker compose down -v
docker compose up -d
```

### 3. Backend setup

```bash
cd apps/api
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Health check:

- `http://localhost:3000/health`

### 4. Frontend setup

In a separate terminal:

```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```

Default local frontend URL:

- `http://localhost:3001`

Additional frontend notes are in [apps/web/README.md](./apps/web/README.md).

## Environment Notes

### API

- Copy `apps/api/.env.example` to `apps/api/.env`
- Set `DATABASE_URL` to the correct MySQL instance
- In production, `RATE_LIMIT_REDIS_URL` should be configured so rate limiting is shared across instances
- `RATE_LIMIT_ALLOW_IN_MEMORY=true` should only be used as an emergency fallback

### Web

Typical local frontend environment value:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Secret-dependent integrations

Some integrations require private deployment secrets or third-party credentials that are not committed to the repository, such as GitHub OAuth/App configuration, Google OAuth configuration, Trello credentials, and production email delivery settings.

For that reason:

- the core application, tests, and seeded workflows are expected to run locally and through the repository setup without private production secrets
- secret-dependent integrations are intended to be evaluated primarily on the deployed system where those credentials are configured
- local setup should still install, run, test, and seed without requiring the team's private deployment secrets

## Database Seeding

From `apps/api`:

```bash
npm run db:seed
```

Optional unseed:

```bash
npm run db:unseed
```

If markers are expected to use the deployed site directly, the deployed database should also be seeded with the documented accounts/data, or equivalent working accounts should be provided.

## Testing

### API

```bash
cd apps/api
npm test
npm run test:watch
npm run test:coverage
npm run test:modulejoin
npm run test:seed
```

### Web

```bash
cd apps/web
npm test
npm run test:watch
npm run test:coverage
```

### Shared Package

```bash
cd packages/shared
npm test
npm run test:watch
npm run test:coverage
```

### Run all tests from repo root

```bash
./scripts/test-all.sh
./scripts/test-all.sh --runInBand
```

## Common Issues

### Frontend shows `Failed to fetch`

1. Check the API health route at `http://localhost:3000/health`
2. Confirm `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env`
3. Restart the frontend after changing `.env`

### Prisma shadow database permission error (`P3014` / `P1010`)

Enter MySQL as root:

```bash
docker compose exec mysql mysql -uroot -prootpassword
```

Then run:

```sql
GRANT ALL PRIVILEGES ON *.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
exit
```

Rerun migrations:

```bash
cd apps/api
npx prisma migrate dev
```

### Docker container not running

```bash
docker compose up -d
docker ps
```

### MySQL port conflict

If port `3306` is already in use, update `docker-compose.yml` and `apps/api/.env` to use a different local port.

## Reused Code, External Sources, and AI Use

### Libraries and Frameworks

The project relies on third-party libraries declared in the package manifests and lockfiles, including Next.js, React, Express, Prisma, Vitest, Testing Library, and Supertest.

### Directly Reused External Source Code

At the time of writing, no substantial external source files are being declared here beyond the standard third-party libraries and frameworks listed above. If any direct source reuse needs to be acknowledged before submission, add it here together with its original location.

### AI Use

AI tools were used as development support during the project, including help with debugging, syntax checking, and some deployment/setup troubleshooting. The largest use of AI was in the tedious and repetitive task of getting test coverage up - which enabled faster development whilst maintaining a comprehensive test suite.
Additionally, AI assisted with documentation/report wording and structure, generating and debugging the Nix flake, and for the screencast voiceover. 
All AI-assisted output was reviewed, edited, and validated by team members before being committed or included in the final submission.

Codex + Claude 

Voiceover: 
OpenAI gpt-4o-mini-tts
Shimmer - global admin
Alloy - entp admin
Echo - staff module lead
Nova - student
Fable - second student

