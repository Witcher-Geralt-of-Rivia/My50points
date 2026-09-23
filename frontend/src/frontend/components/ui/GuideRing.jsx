'use client';

/**
 * GuideRing — MY50 "guided light": an elegant neon light that orbits the
 * perimeter of the ONE control the player should press next (the old menu's
 * moving-light language, reused as guidance).
 *
 * Contract:
 *  - render it as the LAST child of the element to highlight; that element
 *    must be positioned (materials, buttons and `.ui-guided` hosts are) and
 *    gives its border-radius to the ring;
 *  - absolutely positioned: no layout shift when it appears or disappears;
 *  - `pointer-events: none` + aria-hidden: never obstructs clicks or readers;
 *  - one slow orbit (≈3.6 s) over a steady glow — no flashing, one animation
 *    per light (cheap on mobile);
 *  - prefers-reduced-motion: static gradient border, no animation;
 *  - `outset` draws it 6px outside the host (for hosts that do not clip).
 * Show it only on the current step's target — guidance is contextual.
 */
export default function GuideRing({ tone = 'my50', outset = false }) {
  return (
    <span className={`ui-guide${outset ? ' ui-guide--outset' : ''}`} data-tone={tone} data-guide-ring="" aria-hidden>
      <span className="ui-guide__ring" />
    </span>
  );
}
