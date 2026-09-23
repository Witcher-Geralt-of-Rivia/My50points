'use client';

/** Local initials avatar with the premium accent ring. No network, no image. */
import { initialsFor, safeColor } from '@/frontend/lib/localAvatar';

export default function Avatar({ name, color = null, size = 44, medal = null, className = '' }) {
  return (
    <span
      className={`ui-avatar${medal ? ` ui-avatar--${medal}` : ''}${className ? ` ${className}` : ''}`}
      style={{ '--av-size': `${size}px`, '--av-color': safeColor(color) }}
      aria-hidden
    >
      <span className="ui-avatar__inner">{initialsFor(name)}</span>
    </span>
  );
}
