import { useCurrentFrame, interpolate } from 'remotion';
import { CheckCircle2 } from 'lucide-react';
import { COLORS } from '../theme';

export const ScannerMockup: React.FC = () => {
  const frame = useCurrentFrame();

  const scanLineY = interpolate(frame % 60, [0, 60], [16, 168], { extrapolateRight: 'clamp' });
  const checkOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const checkScale = interpolate(frame, [70, 90], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: 300,
        height: 420,
        borderRadius: 40,
        backgroundColor: COLORS.ink,
        padding: 14,
        boxShadow: '0 30px 70px rgba(15,23,42,0.25)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 28,
          backgroundColor: COLORS.white,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 200,
            height: 180,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i % 3 === 0 ? 6 : 3,
                height: 90,
                backgroundColor: COLORS.ink,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: scanLineY,
              height: 3,
              backgroundColor: '#22c55e',
              boxShadow: '0 0 12px #22c55e',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            padding: '10px 18px',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 18,
            opacity: checkOpacity,
            transform: `scale(${checkScale})`,
          }}
        >
          <CheckCircle2 size={22} />
          Article ajouté
        </div>
      </div>
    </div>
  );
};
