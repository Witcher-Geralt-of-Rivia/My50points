# 50points — Documentación técnica

> Plataforma de **juego de pronóstico de carreras de caballos** por torneos y puntos,
> basada en **resultados reales de hipódromos de Estados Unidos**.
>
> Desarrollo: **Ankronic** — https://ankronic.com
>
> Este documento es la fuente de verdad de la mecánica del juego y de las
> decisiones técnicas. Mantenerlo actualizado al introducir cambios.

---

## 1. Stack y despliegue

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Backend | **FastAPI** (Python) + SQLAlchemy | `backend/app`, routers en `app/routers/`, servicios en `app/services/` |
| Base de datos | **Supabase Postgres** | Conexión por *Session pooler* (IPv4) |
| Frontend | **Next.js 14** (App Router) + Tailwind + framer-motion | `frontend/src` |
| Datos de carreras | **The Racing API** (add-on Norteamérica) + scraper HRN de respaldo | Solo hipódromos de **USA** |
| Despliegue | Backend en **Railway** (`railway up` desde `backend/`) · Frontend en **Vercel** (auto-deploy desde `main`) | |

Pendiente de limpieza: `backend/prisma/schema.prisma` (heredado del desarrollo
anterior) y vistas duplicadas en el frontend.

---

## 2. Reglas núcleo del juego (no negociables — las definió el cliente)

1. **Un ticket = un TORNEO completo = 7 carreras**, y son las **7 ÚLTIMAS**
   carreras del hipódromo, no las primeras. No existe el "ticket por carrera".
   Un torneo dura unas 4-5 horas, con una carrera cada ~30 minutos.
2. **Todo depende de datos reales.** No hay simulación de resultados bajo ningún
   concepto. Un ticket solo se liquida cuando el torneo termina y llegan los
   resultados oficiales del hipódromo.
3. **Los dividendos del hipódromo determinan la puntuación.** La cuota que se
   muestra antes de la carrera es orientativa; la única válida es la oficial al
   cerrar.
4. Los mismos dividendos aplican a todos: dos jugadores con la misma estrategia
   en la misma carrera obtienen los mismos puntos.

### Estrategias y puntuación

| Estrategia | Caballos | Bases por ranura |
|---|---|---|
| Full Point | 1 | 50 |
| Dual Point | 2 | 25 + 25 |
| Smart Point | 3 | 30 + 15 + 5 |

`puntos = round(base_de_la_ranura × dividendo_oficial)`

El dividendo se obtiene del pago *Win* oficial, que viene en base $2:
`dividendo = win_payoff / 2`. Solo puntúa la ranura cuyo caballo **gana** la
carrera. Si un caballo seleccionado es retirado, sus puntos se transfieren al
favorito de la carrera.

---

## 3. Modalidades

| Mod | Pago | Persistencia | Notas |
|-----|------|-------------|-------|
| 1 | De pago (~1 €/ticket) | Persistente | Registro maestro |
| 2 | 3 tickets gratis | Persistente | Genera historial y ranking |
| 3 | De pago (~50 €/ticket) | Persistente | |
| 4 | Gratis | **Efímera: 12 h** | Captación. Color: fondo blanco, líneas moradas |

- **Registro maestro:** quien se registra en la 1 queda registrado en 2 y 3.
- Cada modalidad tiene su color propio; el recorrido es el mismo, cambia lo visual.
- **Modalidad 4:** identidad de 12 horas. Lo acumulado desaparece salvo que se
  reclame desde una cuenta registrada.

**Mapeo interno**: `gameMode` 1 = invitado, 2 = registrado gratis, 3 = pago,
4 = especial. La expiración de 12 h no depende de ese mapeo: se aplica a
`User.isGuest == True`.

---

## 4. Alias y reclamación de tickets

- Se pide **alias, país y año de nacimiento** (solo mayores de 18).
- Alias **único**: si "nuglas" existe → `nuglas.1`, `nuglas.2`…
- Al terminar el torneo el jugador puede **descartar** (borrado inmediato) o
  **reclamar** el ticket desde una cuenta registrada.
- Al reclamar, el ticket conserva el rastro de origen:
  `Ticket.originalCreatorAlias`, y en `LeaderboardEntry` los campos
  `originalCreatorAlias`, `isClaimed` y `claimedByUserId`. Es la medida
  anti-trampa: siempre consta quién lo creó.
- El historial es **ilimitado**: reclamar no cuesta sacrificar otro ticket.

---

## 5. Flujo de entrada

1. Aviso de **mayoría de edad** (antes que nada, sin mostrar el logo).
2. Aceptar → carga. Salir → no accede.
3. Animación del **logo**.
4. **Portada** con las modalidades.
5. Ventana de **alias + país + año**.
6. Pantalla de bienvenida de la modalidad.
7. Página principal del torneo.

---

## 6. Sistema visual anidado

Flujo tipo **acordeón**: aceptar encoge el segmento y despliega el siguiente,
sin cambiar de página. Marco de colores por nivel:

- 🔴 **Rojo** — el hipódromo (nivel torneo)
- 🟦 **Turquesa** — el ticket activo (1 → 2 → 3)
- 🟡 **Amarillo** — la carrera actual

Al seleccionar una opción, las demás se opacan. Un único botón:
**"Confirmar estrategia"**.

---

## 7. Historial de tickets

Clasificado por día → hipódromo → modalidad, con badge de cantidad.
Categorías temporales: día · semana · mes · año. Incluye un resumen con los
mejores tickets del jugador.

---

## 8. Centro de actividades — ranking y chat

Ranking en vivo **de tickets, no de jugadores**: cada fila es un ticket, y un
jugador aparece tantas veces como tickets clasificados tenga.

Columnas: posición · jugador con su modalidad · nº de ticket (identifica el
ticket, no la posición) · puntos · historial reciente · cambio de posición ·
diferencia con el ticket siguiente · hora de última actualización.

Historial reciente por colores: morado Full Point, aguamarina Dual Point,
amarillo Smart Point, X roja sin puntuar, y una llama con la racha de carreras
consecutivas puntuando.

Filtros: selector de hipódromo, buscador de jugador y filtro por modalidades.
La posición y la diferencia se calculan sobre la lista completa, de modo que
filtrar nunca altera la posición real de un ticket.

---

## 9. Publicidad

Barras **A, B y C horizontales** para publicidad, noticias y vídeos. Aparecen
también en el perfil del jugador y en el centro de actividades. El contenido se
carga manualmente en una fase posterior.

---

## 10. Origen de los datos de carreras

**Nunca se inventa un resultado.** Orden de fuentes:

### 10.1 The Racing API — add-on Regional Data (Norteamérica)

Fuente **principal** de USA. Lo esencial: **no se sirve por `/racecards` ni
`/results`** (ahí solo hay GB/IRE/FR, y `/racecards/pro` responde 401 sin plan
Pro). Tiene su propia familia de endpoints:

| Endpoint | Devuelve |
|---|---|
| `GET /v1/north-america/meets?start_date=&end_date=` | Jornadas de USA del día, con `meet_id` tipo `PEN_1784851200000` |
| `GET /v1/north-america/meets/{meet_id}/entries` | Cartelera: `race_key.race_number`, `post_time_long` (epoch ms), `purse`, `surface_description`, `distance_value`; por corredor `horse_name`, `post_pos`, `morning_line_odds`, `live_odds`, `scratch_indicator` |
| `GET /v1/north-america/meets/{meet_id}/results` | Orden de llegada (top-3) con **`win_payoff`** = dividendo oficial, más `also_ran` y `scratches` |

Endpoints que **no** existen: `/north-america/racecards`, `/na/meets`,
`/racecards/usa`. Y `/courses?region_code=usa` **ignora el filtro** y devuelve
las 979 pistas del mundo.

### 10.2 Descubrimiento automático de hipódromos

**No hay lista fija de pistas.** Cada día se consulta a la API qué hipódromos
corren y se sincronizan esos, filtrando a Estados Unidos. Las pistas conocidas
conservan sus metadatos (ubicación, zona horaria, arte) y se emparejan por
nombre normalizado; las nuevas obtienen un identificador derivado del nombre.

Se descartan las **apuestas combinadas** que la API lista junto a las pistas
("GP Summer Sweep Pick 5", "Cross Country Pick 5"): no son hipódromos y
crearían torneos fantasma.

### 10.3 Scraper de Horse Racing Nation (respaldo)

Cubre lo que el add-on no sirva. Dos detalles críticos de su HTML:

- La tabla de resultados escribe el speed como `(112*)` **con asterisco**,
  mientras la cartelera usa `(89)`. Sin contemplarlo, ningún nombre casaba y las
  carreras terminaban sin puntuar.
- El pago *Win* **no** está en `cells[1]` (esa celda viene vacía: el encabezado
  declara 4 columnas y el cuerpo trae 5). Hay que tomar el primer importe con
  formato `$NN.NN` tras el nombre.

HRN devuelve **403 a IPs locales**: solo se puede scrapear desde el servidor.

### 10.4 Horarios

La hora que publica una cartelera es **local del hipódromo**. Se convierte a un
instante absoluto en UTC con la zona real de cada pista (`TRACK_TIMEZONES`,
resuelto con `zoneinfo` para que el horario de verano sea exacto). El navegador
lo muestra luego en la zona de quien abre la web.

Un `post_time_long` inválido produce fechas de 1970: se valida el rango. Una
cartelera **sin ningún horario publicado no genera torneo**, porque sin hora no
se puede situar en un día ni cerrarlo.

---

## 11. Sincronización: cómo funciona y qué evitar

- **Ventana de días:** se sincroniza **hoy y mañana** (`SYNC_LOOKAHEAD_DAYS = 1`).
  Buscar 7 días adelante por cada pista hacía que el ciclo no terminara dentro
  de su intervalo.
- ⚠️ **No usar `pg_advisory_lock` con el pooler de Supabase.** Ese candado vive
  en el backend de Postgres y, a través del *session pooler*, sobrevive a la
  muerte del contenedor. Un despliegue a mitad de un ciclo dejaba el candado
  retenido para siempre y todas las sincronizaciones posteriores salían sin
  escribir nada. Se sustituyó por un testigo en memoria que caduca solo
  (`_claim_sync_slot`, `SYNC_MAX_RUNTIME_SECONDS`), más una limpieza de candados
  huérfanos al arrancar.
- **Estado derivado de hechos, nunca de ventanas de tiempo**
  (`reconcile_tournament_statuses`):
  - `completed` — las 7 carreras tienen resultado oficial, **o** su última
    carrera quedó atrás más de `RESULTS_GRACE_DAYS` (los resultados ya no
    llegarán: el sync solo consulta ayer y hoy).
  - `live` — ya corrió alguna carrera y quedan otras.
  - `upcoming` — no ha empezado ninguna.

  Un torneo **no** se cierra solo porque pase su día: los dividendos oficiales
  llegan con retraso y cerrarlo antes lo dejaría sin puntuar para siempre.
- **Estados de carrera:** `upcoming` (admite apuestas) → `running` (ya salió, no
  admite) → `finished` (con resultado oficial). Además de por estado, el envío
  de tickets se cierra **por reloj**, porque el estado lo refresca el ciclo cada
  pocos minutos y en esa ventana se colaban apuestas a carreras ya en marcha.

---

## 12. Modalidad 4 — identidad efímera

- `GUEST_TTL_HOURS = 12`. El JWT caduca en `createdAt + 12 h`, no 12 h desde
  cada inicio de sesión, y la clave de recuperación `50P-XXXXXX` caduca igual.
- La purga borra **todas** las tablas con clave foránea a `User`. Olvidar alguna
  provoca un `IntegrityError` que aborta la limpieza entera y, como esta corre
  al crear invitados, rompe también la creación de nuevos.
- La expiración corre en cada ciclo de sincronización, no solo al crear un
  invitado.
- **Inactividad:** 2 minutos para invitados, 30 para registrados. En el invitado
  la inactividad **pausa** la sesión (la identidad sigue viva en el servidor) y
  le lleva a la ventana de reanudar alias; solo el vencimiento de las 12 h borra.

---

## 13. Base de datos (Supabase)

- Conexión por **Session pooler** (IPv4). La conexión directa
  `db.<ref>.supabase.co` no sirve: es IPv6 en el plan gratuito.
- `DATABASE_URL` vive en `backend/.env`, nunca en el repositorio.
- **RLS activado** en las 14 tablas. El backend usa el rol `postgres`, que lo
  omite.
- El backend normaliza la URL a `postgresql+psycopg://`.

---

## 14. Trabajo pendiente

- **Modalidades 1 y 3 (de pago) bloqueadas:** falta integrar pasarela de cobro.
  Desbloquearlas sin ella permitiría jugar gratis en modalidades de pago.
- **Migración entre modalidades** (1 ↔ 2 ↔ 3 sin nuevo registro): sin interfaz.
- **Sección "Mis tickets"**: pendiente del diseño del cliente.
- **Acordeón de las 4 líneas de colores** y portadas de hipódromo superpuestas.
- **Barras de publicidad A/B/C** en horizontal.
- Las pistas descubiertas automáticamente usan la **imagen de portada por
  defecto**; falta arte propio.
- La tarjeta debería decir **"En juego"** cuando el torneo ya comenzó: el dato
  existe en el backend, falta el texto en la interfaz.
- Versión móvil tipo aplicación: revisar responsive.
- Cuotas planas `2.0` heredadas en carteleras antiguas. Ya no afecta a la
  puntuación (el ganador toma el dividendo oficial), pero la cartelera mostrada
  de torneos viejos conserva el valor.
