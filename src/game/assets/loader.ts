import { validateAtlas } from './atlases';
export interface AssetSpec {
  key: string;
  src: string;
  required?: boolean;
  type?: string;
  setter?: (image: HTMLImageElement) => void;
}

export type AssetResult =
  | { key: string; status: 'loaded'; image: HTMLImageElement }
  | { key: string; status: 'failed' | 'aborted'; reason: string };

export function loadImageAsset(
  asset: AssetSpec,
  signal: AbortSignal,
  version: number,
  makeImage: () => HTMLImageElement = () => new Image(),
  timeoutMs = 15000
): Promise<AssetResult> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve({ key: asset.key, status: 'aborted', reason: 'cancelled' });
      return;
    }
    const image = makeImage();
    let finished = false;
    const finish = (result: AssetResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const abort = () => finish({ key: asset.key, status: 'aborted', reason: 'cancelled' });
    const timer = setTimeout(
      () => finish({ key: asset.key, status: 'failed', reason: 'timeout' }),
      timeoutMs
    );
    // Handlers precede src, including cache hits or synchronous test images.
    image.onload = () => {
      const reason = validateAtlas(asset.key, image.width, image.height);
      finish(
        reason
          ? { key: asset.key, status: 'failed', reason }
          : { key: asset.key, status: 'loaded', image }
      );
    };
    image.onerror = () => finish({ key: asset.key, status: 'failed', reason: 'load failed' });
    signal.addEventListener('abort', abort, { once: true });
    image.src = `${asset.src}${asset.src.includes('?') ? '&' : '?'}v=${version}`;
  });
}
