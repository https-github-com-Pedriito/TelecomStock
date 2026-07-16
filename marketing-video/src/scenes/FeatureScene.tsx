import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { LucideIcon } from 'lucide-react';
import { COLORS, FONT_FAMILY } from '../theme';

interface FeatureSceneProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
  mockup: React.ReactNode;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({ icon: Icon, eyebrow, title, subtitle, mockup }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const textX = interpolate(entrance, [0, 1], [-60, 0]);
  const textOpacity = interpolate(entrance, [0, 1], [0, 1]);

  const mockupEntrance = spring({ frame: frame - 6, fps, config: { damping: 200, mass: 0.8 } });
  const mockupX = interpolate(mockupEntrance, [0, 1], [80, 0]);
  const mockupOpacity = interpolate(mockupEntrance, [0, 1], [0, 1]);

  const exitStart = durationInFrames - 15;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.white,
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 110px',
        gap: 80,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          transform: `translateX(${textX}px)`,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            width: 'fit-content',
            padding: '10px 20px',
            borderRadius: 999,
            backgroundColor: '#eff6ff',
            color: COLORS.blue,
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          <Icon size={26} />
          {eyebrow}
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, color: COLORS.ink, lineHeight: 1.1, letterSpacing: -1, whiteSpace: 'pre-line' }}>
          {title}
        </div>
        <div style={{ fontSize: 28, color: COLORS.slate, lineHeight: 1.4, maxWidth: 520 }}>{subtitle}</div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          transform: `translateX(${mockupX}px)`,
          opacity: mockupOpacity,
        }}
      >
        {mockup}
      </div>
    </AbsoluteFill>
  );
};
