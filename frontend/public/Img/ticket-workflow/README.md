# Ticket workflow UI assets

Place generated **PNG** images here using the filenames listed in `docs/TICKET_WORKFLOW_ASSET_PROMPTS.md`.

Components load paths via `src/frontend/lib/config/ticketWorkflowAssets.js`. Until images are added, the UI falls back to CSS and Lucide icons.

Verify files after generation:

```bash
npm run verify:ticket-workflow-assets
```
