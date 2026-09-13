'use client';

export default function GlobalLoading() {
  const brandColors = ['#7c3aed', '#00c4dc', '#fbbf24', '#f0eef5'];

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#030305',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        overflow: 'hidden',
        fontFamily: 'var(--font-inter), sans-serif'
      }}
    >
      <style>{`
        @keyframes rotate-orbit-0 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotate-orbit-1 {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.6; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Background radial glow */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Emblem & Spinner wrapper */}
      <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '2rem' }}>
        {/* Outer pulsing ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '50%',
            animation: 'pulse-ring 2s infinite ease-in-out'
          }}
        />

        {/* 4 Colored rotating orbits */}
        {brandColors.map((color, index) => (
          <div
            key={color}
            style={{
              position: 'absolute',
              inset: `${index * 8}px`,
              border: `2px solid transparent`,
              borderTop: `2px solid ${color}`,
              borderRight: `2px solid ${color}10`,
              borderRadius: '50%',
              animation: `rotate-orbit-${index % 2} ${2.5 + index * 0.5}s infinite linear`
            }}
          />
        ))}

        {/* Inner Horse emblem */}
        <div 
          style={{
            position: 'absolute',
            inset: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}
        >
          🏇
        </div>
      </div>

      {/* Brand logo & tagline */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <h2 
          style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(to right, #00c4dc, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          MY 50 POINTS
        </h2>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.35)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            margin: 0,
            animation: 'pulse-text 1.5s infinite ease-in-out'
          }}
        >
          Preparando hipódromos...
        </p>
      </div>
    </div>
  );
}
