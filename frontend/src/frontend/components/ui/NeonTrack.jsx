/**
 * NeonTrack — MY50's own tournament artwork, drawn entirely in CSS (no image
 * files, no third-party or unverified photos): an empty racetrack oval seen in
 * neon perspective, rails, floodlights and a night sky in the cyan / purple /
 * gold palette. Provenance: CSS-ONLY, created for MY50.
 *
 * variant: 'card' (tournament card), 'hero' (tournament hero / page bands),
 *          'home' (home hero backdrop). `accent` tints the lanes by status.
 */
export default function NeonTrack({ variant = 'card', accent = 'aqua', className = '' }) {
  return (
    <div className={`neon-track neon-track--${variant}${className ? ` ${className}` : ''}`} data-accent={accent} aria-hidden>
      <span className="neon-track__sky" />
      <span className="neon-track__lights">
        <i /><i /><i /><i />
      </span>
      <span className="neon-track__stand" />
      <span className="neon-track__oval">
        <span className="neon-track__lane neon-track__lane--1" />
        <span className="neon-track__lane neon-track__lane--2" />
        <span className="neon-track__lane neon-track__lane--3" />
      </span>
      <span className="neon-track__floor" />
      <span className="neon-track__haze" />
    </div>
  );
}
