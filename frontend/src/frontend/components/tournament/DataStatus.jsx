'use client';

/**
 * Real-data honesty states for provider-synced tournaments.
 *
 *  OriginChip   — labels real-provider, demo and synthetic-fixture tournaments.
 *  DataStatusNote — small "updated hh:mm" line for fresh provider data.
 *  DataStatusBanner — stale cache / provider unavailable / sync paused.
 *
 * The backend sends `dataStatus` = { origin, provider, lastSyncedAt,
 * lastSuccessfulSyncAt, dataFreshness, providerStatus } with no credentials.
 * The browser never talks to the racing provider; it only reads our API.
 */
import { CloudOff, History, FlaskConical, RefreshCw, BadgeCheck } from 'lucide-react';
import { formatTime } from '@/frontend/lib/redesign';

const PROVIDER_DOWN = new Set(['unavailable', 'auth_error', 'rate_limited', 'credentials_unavailable', 'adapter_pending_validation', 'error', 'schema_error', 'partial']);

export function OriginChip({ origin, isEn }) {
  if (origin === 'real') {
    return <span className="ui-chip" data-tone="real"><BadgeCheck size={13} aria-hidden />{isEn ? 'Real data' : 'Datos reales'}</span>;
  }
  if (origin === 'demo') {
    return <span className="ui-chip" data-tone="demo"><FlaskConical size={13} aria-hidden />{isEn ? 'Demo' : 'Demo'}</span>;
  }
  if (origin === 'fixture') {
    return <span className="ui-chip" data-tone="fixture"><FlaskConical size={13} aria-hidden />{isEn ? 'Test data' : 'Datos de prueba'}</span>;
  }
  return null;
}

function isRealish(ds) {
  return ds && (ds.origin === 'real' || ds.origin === 'fixture');
}

export function dataStatusKind(ds) {
  if (!isRealish(ds)) return 'none';
  if (PROVIDER_DOWN.has(ds.providerStatus)) return 'provider_unavailable';
  if (ds.dataFreshness === 'stale') return 'stale';
  if (ds.providerStatus === 'sync_disabled' && ds.dataFreshness !== 'final') return 'sync_paused';
  if (ds.dataFreshness === 'unknown') return 'pending';
  return 'fresh';
}

export function DataStatusNote({ dataStatus, isEn }) {
  const kind = dataStatusKind(dataStatus);
  if (kind !== 'fresh' || !dataStatus.lastSuccessfulSyncAt) return null;
  return (
    <span className="trn-fresh t-meta" role="status">
      <RefreshCw size={13} aria-hidden />
      {isEn ? 'Updated' : 'Actualizado'} {formatTime(dataStatus.lastSuccessfulSyncAt, isEn)}
    </span>
  );
}

export function DataStatusBanner({ dataStatus, isEn }) {
  const kind = dataStatusKind(dataStatus);
  if (kind === 'none' || kind === 'fresh') return null;
  const at = dataStatus.lastSuccessfulSyncAt ? formatTime(dataStatus.lastSuccessfulSyncAt, isEn) : null;
  const copy = {
    provider_unavailable: {
      icon: CloudOff,
      es: `Datos del hipódromo no disponibles temporalmente. Mostramos la última información guardada${at ? ` (${at})` : ''}.`,
      en: `Track data is temporarily unavailable. Showing the last saved information${at ? ` (${at})` : ''}.`,
    },
    stale: {
      icon: History,
      es: `Datos en caché${at ? ` · última actualización ${at}` : ''}. Pueden no reflejar cambios recientes del hipódromo.`,
      en: `Cached data${at ? ` · last updated ${at}` : ''}. Recent track changes may not be reflected yet.`,
    },
    sync_paused: {
      icon: History,
      es: `Actualización en pausa. Mostramos los datos guardados${at ? ` (${at})` : ''}.`,
      en: `Updates are paused. Showing saved data${at ? ` (${at})` : ''}.`,
    },
    pending: {
      icon: History,
      es: 'Datos del hipódromo pendientes de sincronización.',
      en: 'Track data is waiting to be synchronized.',
    },
  }[kind];
  const Icon = copy.icon;
  return (
    <p className="trn-banner trn-banner--data" data-kind={kind} data-accent={kind === 'provider_unavailable' ? 'live' : 'gold'} role="status">
      <Icon size={17} aria-hidden />
      <span>{isEn ? copy.en : copy.es}</span>
    </p>
  );
}
