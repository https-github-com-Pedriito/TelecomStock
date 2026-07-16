import { AbsoluteFill, Sequence } from 'remotion';
import { ScanLine, PackageSearch } from 'lucide-react';
import { LogoIntro } from './scenes/LogoIntro';
import { Tagline } from './scenes/Tagline';
import { FeatureScene } from './scenes/FeatureScene';
import { CallToAction } from './scenes/CallToAction';
import { ScannerMockup } from './scenes/ScannerMockup';
import { StockAlertMockup } from './scenes/StockAlertMockup';

// Durations are in frames at 30fps.
const LOGO_INTRO = 90; // 0 -> 3s
const TAGLINE = 150; // 3s -> 8s
const FEATURE_1 = 180; // 8s -> 14s
const FEATURE_2 = 180; // 14s -> 20s
const CTA = 150; // 20s -> 25s

export const HeroVideo: React.FC = () => {
  let cursor = 0;
  const logoStart = cursor;
  cursor += LOGO_INTRO;
  const taglineStart = cursor;
  cursor += TAGLINE;
  const feature1Start = cursor;
  cursor += FEATURE_1;
  const feature2Start = cursor;
  cursor += FEATURE_2;
  const ctaStart = cursor;

  return (
    <AbsoluteFill>
      <Sequence from={logoStart} durationInFrames={LOGO_INTRO}>
        <LogoIntro />
      </Sequence>

      <Sequence from={taglineStart} durationInFrames={TAGLINE}>
        <Tagline />
      </Sequence>

      <Sequence from={feature1Start} durationInFrames={FEATURE_1}>
        <FeatureScene
          icon={ScanLine}
          eyebrow="Mobile-first"
          title={'Scannez.\nSuivez. Optimisez.'}
          subtitle="Le scanner de codes-barres intégré met à jour votre inventaire en un clic, depuis le terrain."
          mockup={<ScannerMockup />}
        />
      </Sequence>

      <Sequence from={feature2Start} durationInFrames={FEATURE_2}>
        <FeatureScene
          icon={PackageSearch}
          eyebrow="Multi-entrepôts"
          title={'Ne soyez plus\njamais pris de court.'}
          subtitle="Alertes automatiques en cas de stock critique ou de rupture, sur tous vos dépôts."
          mockup={<StockAlertMockup />}
        />
      </Sequence>

      <Sequence from={ctaStart} durationInFrames={CTA}>
        <CallToAction />
      </Sequence>
    </AbsoluteFill>
  );
};

export const HERO_VIDEO_DURATION = LOGO_INTRO + TAGLINE + FEATURE_1 + FEATURE_2 + CTA;
