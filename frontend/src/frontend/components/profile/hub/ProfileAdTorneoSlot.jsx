"use client";

export default function ProfileAdTorneoSlot({ slotLabel = "a" }) {
  const label = String(slotLabel).toLowerCase();

  return (
    <section
      className={`profile-hub-ad profile-hub-ad--slot-${label}`}
      aria-label={`Bloque ${label}`}
    >
      <div className="profile-hub-ad__placeholder">{label}</div>
    </section>
  );
}
