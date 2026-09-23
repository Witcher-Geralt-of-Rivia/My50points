/**
 * Public modality names — client-approved neutral wording (no prize / payment
 * implications). Use these wherever a modality card or title is shown.
 */
export const MODALITY_NAMES = {
  paid: { code: 1, es: 'TORNEO', en: 'TOURNAMENT' },
  free: { code: 2, es: 'TORNEO GRATIS', en: 'FREE TOURNAMENT' },
  special: { code: 3, es: 'TORNEO ESPECIAL', en: 'SPECIAL TOURNAMENT' },
  guest: { code: 4, es: 'TORNEO GRATIS (SIN REGISTRO)', en: 'FREE TOURNAMENT (NO SIGN-UP)' },
};

export function modalityName(id, isEn = false) {
  const m = MODALITY_NAMES[id];
  return m ? (isEn ? m.en : m.es) : '';
}
