import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, GRADIENT, FONT_FAMILY } from '../theme';

export const LogoIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 200, mass: 0.6 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const exitStart = durationInFrames - 20;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: GRADIENT,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 32,
            background: COLORS.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            padding: 20,
          }}
        >
          <Img src={staticFile('logo.png')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ color: COLORS.white, fontSize: 64, fontWeight: 800, letterSpacing: -1.5 }}>
          Telecom Stock
        </div>
      </div>
    </AbsoluteFill>
  );
};
