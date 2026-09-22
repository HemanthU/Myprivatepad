/**
 * accessLogger.ts
 * Routes access log events through /api/access-log (server-side) so that
 * Firestore rules can safely set `allow write: if false` on the accessLogs
 * collection without breaking this logger.
 *
 * Never logs: passwords, content, hashes, salts, or secrets.
 */

export type AccessLogAction =
  | 'pad_created'
  | 'pad_viewed'
  | 'pad_unlocked'
  | 'unlock_failed'
  | 'pad_shared'
  | 'sharing_changed'
  | 'pad_exported'
  | 'pad_deleted'
  | 'pad_restored'
  | 'version_restored'
  | 'time_lock_configured'
  | 'pad_locked';

function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'server';
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * Log a pad access event via the server-side /api/access-log endpoint.
 * Fire-and-forget - never blocks the user action.
 * The server validates the action and scrubs sensitive fields.
 */
export function logAccessEvent(
  action: AccessLogAction,
  padId: string,
  options: { success?: boolean; details?: Record<string, any> } = {}
): void {
  // Only run in browser context
  if (typeof fetch === 'undefined') return;

  const payload = {
    action,
    padId,
    success: options.success ?? true,
    device: getDeviceInfo(),
    ...(options.details ? { details: options.details } : {}),
  };

  // Fire and forget
  fetch('/api/access-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.warn('Access log failed (non-fatal):', err);
  });
}