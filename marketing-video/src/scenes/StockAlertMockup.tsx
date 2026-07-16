import { useCurrentFrame, interpolate } from 'remotion';
import { AlertTriangle, Building2, Package } from 'lucide-react';
import { COLORS } from '../theme';

const ITEMS = [
  { nom: 'Câble RJ45 — Cat6', pct: 82, tone: 'ok' as const },
  { nom: 'Routeur 4G Pro', pct: 24, tone: 'critique' as const },
  { nom: 'Boîtier de dérivation', pct: 55, tone: 'ok' as const },
];

const TONE_COLOR: Record<string, string> = {
  ok: COLORS.blue,
  critique: '#dc2626',
};

export const StockAlertMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 0.85 + 0.15 * Math.abs(Math.sin(frame / 8));

  return (
    <div
      style={{
        width: 460,
        borderRadius: 28,
        backgroundColor: COLORS.white,
        boxShadow: '0 30px 70px rgba(15,23,42,0.15)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 26px',
          backgroundColor: COLORS.blue,
          color: COLORS.white,
          fontWeight: 700,
          fontSize: 20,
        }}
      >
        <Building2 size={22} />
        Entrepôt principal
      </div>

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {ITEMS.map((item, i) => {
          const reveal = interpolate(frame - i * 8, [0, 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={item.nom}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                opacity: reveal,
                transform: `translateY(${(1 - reveal) * 12}px)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 600, color: COLORS.ink }}>
                  <Package size={16} color={COLORS.slate} />
                  {item.nom}
                </div>
                {item.tone === 'critique' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#dc2626',
                      fontWeight: 700,
                      fontSize: 14,
                      opacity: pulse,
                    }}
                  >
                    <AlertTriangle size={16} />
                    Critique
                  </div>
                )}
              </div>
              <div style={{ height: 10, borderRadius: 999, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${item.pct}%`,
                    borderRadius: 999,
                    backgroundColor: TONE_COLOR[item.tone],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
