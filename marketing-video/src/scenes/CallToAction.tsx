import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ArrowRight } from 'lucide-react';
import { COLORS, GRADIENT, FONT_FAMILY } from '../theme';

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [30, 0]);

  const pulse = 1 + 0.03 * Math.sin(frame / 6);

  return (
    <AbsoluteFill
      style={{
        background: GRADIENT,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 20,
            backgroundColor: COLORS.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <Img src={staticFile('logo.png')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div style={{ color: COLORS.white, fontSize: 56, fontWeight: 800, letterSpacing: -1.5, textAlign: 'center' }}>
          Commencez dès aujourd&apos;hui
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: COLORS.white,
            color: COLORS.blue,
            padding: '18px 40px',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 28,
            transform: `scale(${pulse})`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}
        >
          Essayer Telecom Stock
          <ArrowRight size={26} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
