# Modality welcome modal — PNG icon sources

Generated AI icons for the four modality cards in the welcome modal (`ModalityWelcomeModal`).

| File | Modality | Usage |
|------|----------|--------|
| `card-paid.png` | 1 — Pago | Trophy + prize |
| `card-free.png` | 2 — Gratis | User + free tickets |
| `card-special.png` | 3 — Especial | Diamond + premium |
| `card-guest.png` | 4 — Sin registro | Anonymous + tickets |

Config: `src/frontend/lib/config/modalityWelcomeAssets.js`

After replacing PNGs, run from `FRONTEND/`:

```bash
python scripts/remove-mw-black-bg.py
```

This removes the black matte background for transparent UI compositing.
