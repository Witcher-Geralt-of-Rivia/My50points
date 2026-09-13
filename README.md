# 50points — Juego de pronóstico de carreras de caballos

> Desarrollado por **Ankronic** — https://ankronic.com

Plataforma de torneos por puntos basada en **resultados reales de hipódromos de
Estados Unidos**. Un ticket = un torneo = las 7 últimas carreras del hipódromo.

- **Producción:** https://my50points.vercel.app
- **API:** https://backend-production-7512.up.railway.app/api

---

## 1. Estructura

```
backend/    API en FastAPI (Python) + SQLAlchemy → Postgres (Supabase)
frontend/   Next.js 14 (App Router) + Tailwind
DOCUMENTACION-TECNICA.md   Reglas del juego, arquitectura y decisiones técnicas
```

`DOCUMENTACION-TECNICA.md` es la referencia principal: describe la mecánica,
las fuentes de datos y el porqué de cada decisión técnica.
**Léelo antes de tocar código.**

---

## 2. Credenciales (IMPORTANTE)

**El repositorio no contiene ninguna credencial.** Hay que crear dos archivos a
partir de las plantillas:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

`backend/.env` necesita:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres de Supabase (usar el **Session pooler**, IPv4) |
| `RACING_API_USERNAME` / `RACING_API_PASSWORD` | The Racing API con el add-on *Regional Data – North America* |
| `JWT_SECRET` | Firma de sesiones. Poner un valor largo y aleatorio |
| `ADMIN_SECRET` | Protege los endpoints de administración |

Los mismos valores deben estar en las variables de entorno de **Railway**
(backend) y `API_BACKEND_URL` en **Vercel** (frontend).

---

## 3. Arrancar en local

**Backend**

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

## 4. Despliegue

- **Backend → Railway:** `cd backend && railway up`
- **Frontend → Vercel:** automático al hacer push a `main`

---

## 5. De dónde salen los datos de las carreras

Todo viene de fuentes reales; **el sistema nunca inventa un resultado**.

1. **The Racing API — add-on North America** (fuente principal de USA).
   No se sirve por `/racecards` ni `/results`: usa su propia familia de
   endpoints `/v1/north-america/meets[/{meet_id}/entries|results]`.
2. **Scraper de Horse Racing Nation** como respaldo.

Los hipódromos **no** están en una lista fija: cada día se consulta a la API qué
pistas corren y se sincronizan esas, así que las pistas nuevas aparecen solas.

La puntuación usa el **dividendo oficial** del hipódromo (`win_payoff`, base $2):
`puntos = round(base_de_la_ranura × dividendo)`, con las bases Full Point (50),
Dual Point (25+25) y Smart Point (30/15/5).

---

## 6. Estado y trabajo pendiente

El apartado §14 de `DOCUMENTACION-TECNICA.md` lleva la lista de trabajo
pendiente. Los frentes abiertos más relevantes:

- Modalidades 1 y 3 (de pago) están bloqueadas: **falta integrar la pasarela de cobro**.
- Sección "Mis Tickets" pendiente de diseño del cliente.
- Las pistas descubiertas automáticamente usan la imagen de portada por defecto.
- Etiqueta de la tarjeta: mostrar "EN JUEGO" cuando el torneo ya comenzó
  (el dato ya existe en el backend, falta el texto en la interfaz).
