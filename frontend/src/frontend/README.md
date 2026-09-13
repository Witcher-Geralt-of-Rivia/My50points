# Frontend (`src/frontend`)

Client-side UI: React components, React contexts, and shared browser utilities.

## Layout

| Path | Purpose |
|------|---------|
| `components/` | Reusable UI (home, layout, tournament, auth) |
| `contexts/` | Global React state (`AuthContext`) |
| `lib/api/` | `fetchJson` / `fetchAuthJson` and API response mappers |
| `lib/config/` | `basePath`, `api()`, static asset paths |
| `lib/i18n/` | ES/EN translations and `LanguageContext` |
| `lib/data/` | Legacy mock data for pages not yet on the API |

## App pages

Next.js pages and route-specific clients live in `src/app/`. They import from `@/frontend/*`:

```js
import HomeLanding from '@/frontend/components/home/HomeLanding';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { fetchJson } from '@/frontend/lib/api/client';
```
