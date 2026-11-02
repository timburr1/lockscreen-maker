import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './app.css';
import { imageDecodeUrl } from './browser/image-decode';
import { type LockscreenRenderer, lockscreenRendererCreate } from './browser/lockscreen-renderer';
import { ErrorRender } from './errors';
import { logError } from './log';
import { deviceScreenSize } from './logic/device-screen';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Missing #root element in index.html');
}

let renderer: LockscreenRenderer | undefined;
try {
  renderer = lockscreenRendererCreate(document);
} catch (error) {
  if (!(error instanceof ErrorRender)) {
    throw error;
  }
  logError('Creating the renderer failed', error);
}

const touch = window.matchMedia('(pointer: coarse)').matches;
const screen = deviceScreenSize({ width: window.screen.width, height: window.screen.height }, window.devicePixelRatio, touch);

createRoot(root).render(
  <StrictMode>
    {renderer === undefined ? (
      <p role="alert">This browser cannot create images.</p>
    ) : (
      <App renderer={renderer} imageDecode={imageDecodeUrl} screen={screen} screenPreferred={touch} touch={touch} />
    )}
  </StrictMode>,
);
