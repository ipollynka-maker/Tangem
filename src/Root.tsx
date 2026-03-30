import React from 'react';
import { Composition } from 'remotion';
import { CardScroll } from './CardScroll';
import { animationRegistry } from './animations/registry';

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
      {animationRegistry.map(({ id, component, spec }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={Math.round(spec.duration * spec.fps)}
          fps={spec.fps}
          width={1294}
          height={720}
        />
      ))}
    </>
  );
}
