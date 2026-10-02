import { Composition, Still } from 'remotion';
import { ComebackPost, SplitCover, SplitDays, SplitXp } from './posts/Posts';
import { BossFight, bossFrames } from './reels/BossFight';
import { Comeback, comebackFrames } from './reels/Comeback';

export const Root = () => (
  <>
    <Composition id="Comeback" component={Comeback} width={1080} height={1920} fps={30} durationInFrames={comebackFrames} />
    <Composition id="BossFight" component={BossFight} width={1080} height={1920} fps={30} durationInFrames={bossFrames} />
    <Composition id="BossFightOverlay" component={BossFight} defaultProps={{ overlay: true }} width={1080} height={1920} fps={30} durationInFrames={bossFrames} />
    <Still id="SplitCover" component={SplitCover} width={1080} height={1350} />
    <Still id="SplitDays" component={SplitDays} width={1080} height={1350} />
    <Still id="SplitXp" component={SplitXp} width={1080} height={1350} />
    <Still id="ComebackPost" component={ComebackPost} width={1080} height={1350} />
  </>
);
