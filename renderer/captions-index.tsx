import React from 'react';import {Composition,registerRoot} from 'remotion';import '@fontsource-variable/manrope';import {CaptionBand} from './Explainer';
registerRoot(()=><Composition id="CaptionBand" component={CaptionBand} width={860} height={146} fps={30} durationInFrames={1800} defaultProps={{alignment:[]}}/>);
