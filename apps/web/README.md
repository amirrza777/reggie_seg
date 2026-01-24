# Web (Next.js)

Frontend for the API, built with Next.js (App Router).

## Scripts

- `npm run dev` — start Next dev server on port 3001
- `npm run build` — production build
- `npm run start` — run the built app (port 3001)
- `npm run lint` — Next lint rules

## Environment

Copy `.env.example` to `.env` and set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

The UI calls `<base>/health` on load to verify the API is reachable.
