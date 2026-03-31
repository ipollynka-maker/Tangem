import React from 'react';
import { Composition } from 'remotion';
import { CardScroll } from './CardScroll';
import { animationRegistry } from './animations/registry';
import { CharSpringEnter } from './animations/CharSpringEnter';
import { CharScaleReveal } from './animations/CharScaleReveal';
import { CharSlideIn } from './animations/CharSlideIn';
import { CharRotateIn } from './animations/CharRotateIn';
import { CharBounce } from './animations/CharBounce';
import { Gif1PhoneReveal } from './animations/Gif1PhoneReveal';
import { Gif2CardCarousel } from './animations/Gif2CardCarousel';
import { Gif3CardFlip } from './animations/Gif3CardFlip';

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="CardScroll"
        component={CardScroll}
        durationInFrames={240}
        fps={30}
        width={1294}
        height={720}
      />
      <Composition id="CharSpringEnter" component={CharSpringEnter} durationInFrames={60} fps={30} width={1294} height={720} />
      <Composition id="CharScaleReveal" component={CharScaleReveal} durationInFrames={50} fps={30} width={1294} height={720} />
      <Composition id="CharSlideIn"     component={CharSlideIn}     durationInFrames={55} fps={30} width={1294} height={720} />
      <Composition id="CharRotateIn"    component={CharRotateIn}    durationInFrames={60} fps={30} width={1294} height={720} />
      <Composition id="CharBounce"      component={CharBounce}      durationInFrames={70}  fps={30} width={1294} height={720} />
      <Composition id="Gif1PhoneReveal" component={Gif1PhoneReveal} durationInFrames={120} fps={30} width={800}  height={900} />
      <Composition id="Gif2CardCarousel" component={Gif2CardCarousel} durationInFrames={180} fps={30} width={800}  height={700} />
      <Composition id="Gif3CardFlip"    component={Gif3CardFlip}    durationInFrames={220} fps={30} width={900}  height={600} />
      {animationRegistry.map(({ id, component, spec }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={Math.round(spec.duration * spec.fps)}
          fps={spec.fps}
          width={(spec as any).width ?? 1294}
          height={(spec as any).height ?? 720}
        />
      ))}
    </>
  );
}
