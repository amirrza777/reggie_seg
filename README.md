## 1) Clone the repo

```bash
git clone <REPO_URL>
cd <REPO_FOLDER>
```

Replace `<REPO_URL>` with the GitHub/GitLab repo URL and `<REPO_FOLDER>` with the folder name created by clone.

---

## 2) Start MySQL (Database)

Run from the repo root (same folder as `docker-compose.yml`):

```bash
docker compose up -d
docker ps
```

You should see a MySQL container running (name usually `uni_mysql`).

### Reset DB completely (deletes local DB data)

```bash
docker compose down -v
docker compose up -d
```

---

## 3) Backend (API) setup

Go to backend:

```bash
cd apps/api
```

Install dependencies:

```bash
npm install
```

Create local env file:

```bash
cp .env.example .env
```

Run migrations (creates tables):

```bash
npx prisma migrate dev
```

Start backend:

```bash
npm run dev
```

Test backend in browser:

- http://localhost:3000/health

---

## 4) Frontend (Web) setup (Next.js)

More web-specific commands and env notes: see `apps/web/README.md`.

Open a NEW terminal tab/window.

Go to frontend:

```bash
cd apps/web
```

Install dependencies:

```bash
npm install
```

Create local env file:

```bash
cp .env.example .env
```

Start frontend:

```bash
npm run dev
```

Open the URL printed in terminal (usually):

- http://localhost:3001

(Port 3001 is used so it does not conflict with the API on 3000.)

---

## 5) Testing & Coverage

Run tests per package:

- API (Express):  
  ```bash
  cd apps/api
  npm test            # run once  
  npm run test:watch  # watch mode  
  npm run test:coverage
  ```

- Web (Next.js):  
  ```bash
  cd apps/web
  npm test
  npm run test:watch
  npm run test:coverage
  ```

- Shared package:  
  ```bash
  cd packages/shared
  npm test
  npm run test:watch
  npm run test:coverage
  ```

Coverage thresholds are set to 100% lines/functions/branches/statements in each package to keep quality high. If you add new code, add or update tests accordingly.

Run everything at once from repo root:

```bash
./scripts/test-all.sh         # run all packages
./scripts/test-all.sh --runInBand   # pass flags through to Vitest
```

---

## 6) Common Issues

### A) Frontend shows: `Failed to fetch`

1) Check backend works:
- Open http://localhost:3000/health  
- It must return JSON

2) Check frontend API base URL:  
Open `apps/web/.env` and confirm:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

3) Restart frontend after editing `.env`:
- stop with `Ctrl + C`
- run `npm run dev`

---

### B) Prisma error: shadow database permission (P3014 / P1010)

Example message:  
`Prisma Migrate could not create the shadow database... User was denied access...`

Fix (local dev) — grant permissions to the dev MySQL user:

1) Enter MySQL as root:

```bash
docker exec -it uni_mysql mysql -uroot -prootpassword
```

2) Run:

```sql
GRANT ALL PRIVILEGES ON *.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
exit
```

3) Rerun migrations:

```bash
cd apps/api
npx prisma migrate dev
```

---

### C) Docker container not running

From repo root:

```bash
docker compose up -d
docker ps
```

If Docker commands fail, open Docker Desktop and wait until it’s running.

---

### D) Port 3306 already in use

If MySQL cannot start because port 3306 is busy, change `docker-compose.yml` to:

```yml
ports:
  - "3307:3306"
```

Then update `apps/api/.env`:

```env
DATABASE_URL="mysql://appuser:apppass@localhost:3307/appdb"
```

Restart DB:

```bash
docker compose down
docker compose up -d
```

---

## 7) Daily Commands (quick)

From repo root:

Start DB:

```bash
docker compose up -d
```

Run API:

```bash
cd apps/api
npm run dev
```

Run Web:

```bash
cd apps/web
npm run dev
```
