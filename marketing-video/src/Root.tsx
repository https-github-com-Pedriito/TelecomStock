import { Composition } from 'remotion';
import { HeroVideo, HERO_VIDEO_DURATION } from './HeroVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroVideo"
      component={HeroVideo}
      durationInFrames={HERO_VIDEO_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
