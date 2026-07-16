import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, FONT_FAMILY } from '../theme';

const WORDS = ['Gérez vos stocks', 'avec précision', 'et agilité.'];

export const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const exitStart = durationInFrames - 15;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cloud,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {WORDS.map((word, i) => {
          const delay = i * 10;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.7 } });
          const translateY = interpolate(progress, [0, 1], [40, 0]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);
          const isAccent = i > 0;
          return (
            <div
              key={word}
              style={{
                fontSize: 72,
                fontWeight: 800,
                letterSpacing: -1.5,
                color: isAccent ? COLORS.blue : COLORS.ink,
                transform: `translateY(${translateY}px)`,
                opacity,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
