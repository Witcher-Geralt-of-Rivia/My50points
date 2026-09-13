# Ticket design assets

Recursos para **RESUMEN DE TU ESTRATEGIA** y **recibo de ticket** según el mockup.

## Ubicación

`FRONTEND/public/images/tickets/`

## Inventario

| Archivo | Uso en UI |
|---------|-----------|
| `horse-head-logo.svg` / `.png` | Logo hipódromo (Santa Anita, etc.) |
| `badge-50-my-points.svg` / `.png` | Badge "50 my POINTS" en encabezado TORNEO |
| `strategy-full-50.svg` / `.png` | Estrategia FULL POINT (50 pts, morado) |
| `strategy-dual-25.svg` / `.png` | Estrategia DUAL POINT (2×25, teal) |
| `strategy-smart-30-15-5.svg` / `.png` | Estrategia SMART POINT (30/15/5, dorado) |
| `ticket-tab-used.svg` / `.png` | Pestaña ticket USADO (amarillo) |
| `ticket-tab-available-green.svg` / `.png` | Pestaña ticket DISPONIBLE (verde) |
| `ticket-tab-available-gray.svg` / `.png` | Pestaña ticket inactiva (gris) |
| `receipt-tear-edge.svg` | Borde rasgado superior/inferior del recibo |

## Uso en código

```js
import {
  ticketDesignAssets,
  strategyTicketAsset,
  ticketTabAsset,
} from "@/frontend/lib/config/ticketDesignAssets";

// Estrategia por carrera
<img src={strategyTicketAsset("full")} alt="" />

// Pestaña usada
<img src={ticketTabAsset({ used: true })} alt="" />

// Logo recibo
<img src={ticketDesignAssets.badge50MyPoints.svg} alt="" />
```

## Recomendación

- **Producción:** usar variantes `.svg` (ligeras, nítidas en cualquier tamaño).
- **PNG:** generados desde el mockup; útiles como referencia visual (~1 MB c/u). No commitear si el repo tiene límite de tamaño; los SVG cubren la implementación.

## Colores de referencia

- Full: `#7c3aed` / `#a855f7`
- Dual: `#06b6d4` / `#22d3ee`
- Smart: `#f59e0b` / `#fbbf24`
- Tab usado: `#fbbf24`
- Tab disponible: `#22c55e`
- Tab inactivo: `#374151`
