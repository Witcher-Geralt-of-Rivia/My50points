import { staticFile } from "@/frontend/lib/config/paths";

/** Drop generated images into public/Img/ticket-workflow/ — see docs/TICKET_WORKFLOW_ASSET_PROMPTS.md */
const TICKET_WORKFLOW = "/Img/ticket-workflow";

export const TICKET_WORKFLOW_ASSET_KEYS = {
  landingHeroBg: "landing-hero-bg.png",
  workflowBannerIcon: "workflow-banner-icon.png",
  workflowBannerBg: "workflow-banner-bg.png",
  tracksWorkflowBg: "tracks-workflow-bg.png",
  tracksWorkflowSidebarBg: "tracks-workflow-sidebar-bg.png",
  tracksWorkflowMainPanelBg: "tracks-workflow-main-panel-bg.png",
  comenzarStepIllustration: "comenzar-step-illustration.png",
  comenzarStep1Mode: "comenzar-step-1-mode.png",
  comenzarStep2Track: "comenzar-step-2-track.png",
  comenzarStep3Tickets: "comenzar-step-3-tickets.png",
  comenzarStep4Finish: "comenzar-step-4-finish.png",
  overviewBarTicketIcon: "overview-bar-ticket-icon.png",
  overviewTrackTileBg: "overview-track-tile-bg.png",
  overviewSlotUsed: "overview-slot-used.png",
  overviewSlotOpen: "overview-slot-open.png",
  overviewSlotActive: "overview-slot-active.png",
  trackRowThumbDefault: "track-row-thumb-default.png",
  trackLivePill: "track-live-pill.png",
  accordionChevronGlow: "accordion-chevron-glow.png",
  ticketStubLandscapeBase: "ticket-stub-landscape-base.png",
  ticketStubN1Active: "ticket-stub-n1-active.png",
  ticketStubN2Active: "ticket-stub-n2-active.png",
  ticketStubN3Active: "ticket-stub-n3-active.png",
  ticketStubUsed: "ticket-stub-used.png",
  ticketBarcodeStrip: "ticket-barcode-strip.png",
  btnVerTicketPurple: "btn-ver-ticket-purple.png",
  tabTicket1: "tab-ticket-1.png",
  tabTicket2Active: "tab-ticket-2-active.png",
  tabTicket3: "tab-ticket-3.png",
  tabTicketUsedOverlay: "tab-ticket-used-overlay.png",
  racesPanelHeaderBg: "races-panel-header-bg.png",
  raceRowCollapsed: "race-row-collapsed.png",
  raceRowExpanded: "race-row-expanded.png",
  demoBadgeFicticia: "demo-badge-ficticia.png",
  strategyFullPointBtn: "strategy-full-point-btn.png",
  strategyDualPointBtn: "strategy-dual-point-btn.png",
  strategySmartPointBtn: "strategy-smart-point-btn.png",
  modalityCardFree: "modality-card-free.png",
  modalityCardPaid: "modality-card-paid.png",
  modalityCardGuest: "modality-card-guest.png",
  modalityCardSpecial: "modality-card-special.png",
  navTabModalidades: "nav-tab-modalidades.png",
  navTabHipodromos: "nav-tab-hipodromos.png",
  navTabTicketsActive: "nav-tab-tickets-active.png",
  purpleConnectorGlow: "purple-connector-glow.png",
  mobileSafeAreaFade: "mobile-safe-area-fade.png",
  noiseOverlayTile: "noise-overlay-tile.png",
  onboardBenefitTickets: "onboard-benefit-tickets.png",
  onboardBenefitShield: "onboard-benefit-shield.png",
  onboardBenefitStrategyHud: "onboard-benefit-strategy-hud.png",
};

/** @type {Record<string, keyof typeof TICKET_WORKFLOW_ASSET_KEYS>} */
export const MODALITY_CARD_ASSET_KEY = {
  guest: "modalityCardGuest",
  free: "modalityCardFree",
  paid: "modalityCardPaid",
  special: "modalityCardSpecial",
};

/** @param {keyof typeof TICKET_WORKFLOW_ASSET_KEYS} key */
export function ticketWorkflowAsset(key) {
  const file = TICKET_WORKFLOW_ASSET_KEYS[key];
  if (!file) return "";
  return staticFile(`${TICKET_WORKFLOW}/${file}`);
}

/** Landscape ticket stub for ticket number 1–3 (used vs available). */
export function ticketStubAsset(num, used = false) {
  if (used) return ticketWorkflowAsset("ticketStubUsed");
  if (num === 1) return ticketWorkflowAsset("ticketStubN1Active");
  if (num === 2) return ticketWorkflowAsset("ticketStubN2Active");
  if (num === 3) return ticketWorkflowAsset("ticketStubN3Active");
  return ticketWorkflowAsset("ticketStubLandscapeBase");
}

/** Overview dot sprite: used | open | active */
export function overviewSlotAsset(state) {
  if (state === "used") return ticketWorkflowAsset("overviewSlotUsed");
  if (state === "active") return ticketWorkflowAsset("overviewSlotActive");
  return ticketWorkflowAsset("overviewSlotOpen");
}

export const COMENZAR_STEP_VISUAL_KEYS = [
  "comenzarStep1Mode",
  "comenzarStep2Track",
  "onboardBenefitTickets",
  "comenzarStep3Tickets",
  "comenzarStep4Finish",
];

/** Full-bleed journey card background (1–5) for /comenzar and /inicio. */
export function comenzarStepVisualAsset(stepNum) {
  const key = COMENZAR_STEP_VISUAL_KEYS[stepNum - 1];
  return key ? ticketWorkflowAsset(key) : "";
}

export const ONBOARD_BENEFIT_ASSET_KEYS = [
  "onboardBenefitTickets",
  "onboardBenefitShield",
  "onboardBenefitStrategyHud",
];

/** Full-bleed feature card visual (1–3) for /comenzar bento row. */
export function onboardBenefitAsset(index) {
  const key = ONBOARD_BENEFIT_ASSET_KEYS[index];
  return key ? ticketWorkflowAsset(key) : "";
}

export const TICKET_WORKFLOW_ASSET_DIR = TICKET_WORKFLOW;
