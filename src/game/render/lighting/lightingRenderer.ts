import { ASSET_PATHS, type AssetId } from '@/game/assets/manifest';
import { SPRITE_ATLASES, type SpriteFrame } from '@/game/assets/atlases';
import { LIGHTING_LIMITS, LIGHTING_MATERIALS, type LightingConfig } from '@/game/config/lighting';
import { lightAttenuation, lightMultiplier, normalizeLightingConfig, packLightSprites, worldToScreen, type Point, type Rect } from './lightingMath';
import { alphaBounds, createNormalAtlas, NORMAL_PROFILES, planTexturePages } from './normalProfiles';
import { LIGHTING_FRAGMENT, LIGHTING_VERTEX } from './lightingShader';
import { drawOriginalSprite, type LitSprite, type SpriteImages } from './spriteLayout';

interface TextureFrame { texture: WebGLTexture; rect: Rect; width: number; height: number }
interface ImageResource {
  image: HTMLImageElement;
  frames: SpriteFrame[];
  bounds: Rect;
  rawBounds: Rect;
  textures: WebGLTexture[];
  lookup: Map<string, TextureFrame>;
  bytes: number;
  failed: boolean;
}
export interface LightingFrame {
  width: number;
  height: number;
  camera: Point;
  light: Point;
  images: SpriteImages;
  sprites: LitSprite[];
}
const frameKey = (f: Rect) => `${f.x},${f.y},${f.width},${f.height}`;
const rgb = (c: readonly number[]) => `rgb(${c.map(n => Math.round(n * 255)).join(',')})`;

/** Owns presentation resources only. A failed GPU never blocks the authoritative simulation. */
export class LightingRenderer {
  canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private normal: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private resources = new Map<AssetId, ImageResource>();
  private slots = new Map<string, Rect>();
  private field: HTMLCanvasElement | null = null;
  private radial: HTMLCanvasElement | null = null;
  private blob: HTMLCanvasElement | null = null;
  private radialKey = '';
  private config = normalizeLightingConfig();
  private state: 'ready' | 'basic' | 'lost' | 'disposed' = 'basic';
  private limit = 0;
  private frame: LightingFrame | null = null;
  readonly metrics = { mode: 'basic', reason: '', uploads: 0, textures: 0, gpuBytes: 0,
    requested: 0, lit: 0, overflow: 0, drawCalls: 0, scans: 0 };

  constructor(canvasFactory?: () => HTMLCanvasElement) {
    if (!canvasFactory && typeof document === 'undefined') return;
    try {
      this.canvas = canvasFactory ? canvasFactory() : document.createElement('canvas');
      this.canvas.addEventListener('webglcontextlost', this.onLost);
      this.canvas.addEventListener('webglcontextrestored', this.onRestored);
      this.initialize();
    } catch (error) { this.fail(error); }
  }

  setConfig(config: Partial<LightingConfig>) {
    this.config = normalizeLightingConfig(config);
    this.radialKey = '';
  }
  getDiagnostics() {
    const compositeBytes = [this.field, this.radial, this.blob].reduce((sum, c) => sum + (c ? c.width * c.height * 4 : 0), 0);
    const outputBytes = (this.canvas ? this.canvas.width * this.canvas.height * 4 : 0) + compositeBytes;
    return { ...this.metrics, gpuBytes: this.metrics.gpuBytes + compositeBytes, outputBytes,
      lightScreen: this.frame ? worldToScreen(this.frame.light, this.frame.camera) : null,
      radius: this.frame ? this.frame.width * this.config.diameterRatio / 2 : 0,
      state: this.state, maxTextureSize: this.limit };
  }

  private onLost = (event: Event) => {
    event.preventDefault();
    this.state = 'lost'; this.slots.clear();
    this.gl = null; this.program = null; this.buffer = null; this.normal = null;
    for (const resource of this.resources.values()) {
      resource.textures = []; resource.lookup.clear(); resource.bytes = 0; resource.failed = false;
    }
    this.metrics.gpuBytes = 0; this.metrics.textures = 0;
    this.metrics.mode = 'basic'; this.metrics.reason = 'context-lost';
  };
  private onRestored = () => { if (this.state !== 'disposed') this.initialize(); };
  private fail(error: unknown) {
    if (this.gl) { this.gl.useProgram(null); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null); }
    for (const resource of this.resources.values()) {
      this.removeResource(resource); resource.textures = []; resource.lookup.clear(); resource.bytes = 0;
    }
    this.gl?.deleteTexture(this.normal); this.gl?.deleteBuffer(this.buffer); this.gl?.deleteProgram(this.program);
    this.normal = null; this.buffer = null; this.program = null;
    this.metrics.gpuBytes = this.gl && this.canvas ? this.canvas.width * this.canvas.height * 4 : 0;
    this.metrics.textures = 0;
    this.state = 'basic'; this.slots.clear(); this.metrics.mode = 'basic';
    this.metrics.reason = error instanceof Error ? error.message : String(error);
  }

  private initialize() {
    try {
      const gl = this.canvas?.getContext('webgl', { alpha: true, premultipliedAlpha: true,
        antialias: false, depth: false, stencil: false });
      if (!gl || !this.canvas) throw new Error('webgl-unavailable');
      this.gl = gl;
      this.limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.canvas.width = Math.min(LIGHTING_LIMITS.outputWidth, this.limit);
      this.canvas.height = Math.min(LIGHTING_LIMITS.outputHeight, this.limit);
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('shader-allocation');
        gl.shaderSource(shader, source); gl.compileShader(shader);
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, LIGHTING_VERTEX);
      const fragment = compile(gl.FRAGMENT_SHADER, LIGHTING_FRAGMENT);
      const program = gl.createProgram();
      if (!program) throw new Error('program-allocation');
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
      const message = linked ? '' : [gl.getProgramInfoLog(program), gl.getShaderInfoLog(fragment)].join('\n');
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!linked) { gl.deleteProgram(program); throw new Error(message); }
      this.program = program;
      gl.useProgram(program);
      this.buffer = gl.createBuffer();
      if (!this.buffer) throw new Error('buffer-allocation');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,1,0,0,1,1,1]), gl.STATIC_DRAW);
      const quad = gl.getAttribLocation(program, 'aQuad');
      gl.enableVertexAttribArray(quad); gl.vertexAttribPointer(quad, 2, gl.FLOAT, false, 0, 0);
      for (const name of ['Resolution','Slot','Dest','Source','Flip','Angle','Color','Normal','NormalRect','Bounds',
        'Texel','Light','Radii','Aspect','Ambient','Direct','Height','Exponent','Floor','Strength','Rim','Levels']) {
        this.uniforms[name] = gl.getUniformLocation(program, `u${name}`);
      }
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      const atlas = createNormalAtlas();
      this.normal = this.texture(gl);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlas.width, atlas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas.pixels);
      this.metrics.gpuBytes = this.canvas.width * this.canvas.height * 4 + atlas.pixels.byteLength;
      this.metrics.textures = 1; this.metrics.uploads++;
      this.metrics.reason = ''; this.state = 'ready';
    } catch (error) { this.fail(error); }
  }

  private texture(gl: WebGLRenderingContext) {
    const texture = gl.createTexture();
    if (!texture) throw new Error('texture-allocation');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private removeResource(resource: ImageResource) {
    resource.textures.forEach(t => this.gl?.deleteTexture(t));
    this.metrics.gpuBytes -= resource.bytes; this.metrics.textures -= resource.textures.length;
  }

  private syncImages(images: SpriteImages) {
    let changed = false;
    for (const key of Object.keys(LIGHTING_MATERIALS) as AssetId[]) {
      const image = images[key], old = this.resources.get(key);
      if (old?.image === image) continue;
      if (!old && !image) continue;
      changed = true;
      if (old) { this.removeResource(old); this.resources.delete(key); }
      if (!image || !image.width || !image.height) continue;
      const atlas = SPRITE_ATLASES[key as keyof typeof SPRITE_ATLASES];
      const frames = atlas?.frames ?? [{ x: 0, y: 0, width: image.width, height: image.height }];
      let bounds = { x: 0, y: 0, width: 1, height: 1 };
      const scratch = document.createElement('canvas');
      try {
        scratch.width = image.width; scratch.height = image.height;
        const ctx = scratch.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(image, 0, 0);
          bounds = alphaBounds(ctx.getImageData(0, 0, image.width, image.height).data, image.width, frames);
          this.metrics.scans++;
        }
      } catch { /* Bounds are optional presentation data; preserve the original sprite on failure. */ }
      scratch.width = 0; scratch.height = 0;
      this.resources.set(key, { image, frames, bounds, rawBounds: bounds, textures: [], lookup: new Map(), bytes: 0, failed: false });
    }
    // One stable volume for idle/walk/dash, rather than a different normal on every animation change.
    if (!changed) return;
    const player = ['playerIdle','playerWalk','playerDash'].map(key => this.resources.get(key as AssetId)).filter((r): r is ImageResource => !!r);
    if (player.length) {
      const left = Math.min(...player.map(r => r.rawBounds.x)), top = Math.min(...player.map(r => r.rawBounds.y));
      const right = Math.max(...player.map(r => r.rawBounds.x + r.rawBounds.width));
      const bottom = Math.max(...player.map(r => r.rawBounds.y + r.rawBounds.height));
      for (const r of player) r.bounds = { x: left, y: top, width: right - left, height: bottom - top };
    }
  }

  private upload(resource: ImageResource) {
    const gl = this.gl;
    if (!gl || resource.failed || resource.textures.length) return;
    const image = resource.image;
    const plans = image.width <= this.limit && image.height <= this.limit
      ? [{ width: image.width, height: image.height,
        frames: resource.frames.map((rect, index) => ({ index, rect })) }]
      : planTexturePages(resource.frames, Math.min(this.limit, 4096));
    const bytes = plans.reduce((sum, page) => sum + page.width * page.height * 4, 0);
    const radialSize = Math.min(1024, Math.ceil((this.frame?.width ?? 1200) * this.config.diameterRatio));
    const reservedComposite = ((this.frame?.width ?? 1200) * (this.frame?.height ?? 800) + radialSize * radialSize + 64 * 16) * 4;
    if (!plans.length || bytes + this.metrics.gpuBytes + reservedComposite > LIGHTING_LIMITS.gpuBytes) {
      resource.failed = true; this.metrics.reason = 'texture-budget-or-size'; return;
    }
    try {
      for (const page of plans) {
        let source: HTMLImageElement | HTMLCanvasElement = image;
        if (image.width > this.limit || image.height > this.limit) {
          const packed = document.createElement('canvas'); packed.width = page.width; packed.height = page.height;
          const ctx = packed.getContext('2d');
          if (!ctx) throw new Error('packing-canvas-unavailable');
          for (const entry of page.frames) {
            const f = resource.frames[entry.index], d = entry.rect;
            ctx.drawImage(image, f.x, f.y, f.width, f.height, d.x, d.y, d.width, d.height);
          }
          source = packed;
        }
        const texture = this.texture(gl);
        resource.textures.push(texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        if (source !== image) { source.width = 0; source.height = 0; }
        for (const entry of page.frames) resource.lookup.set(frameKey(resource.frames[entry.index]),
          { texture, rect: entry.rect, width: page.width, height: page.height });
        const pageBytes = page.width * page.height * 4;
        resource.bytes += pageBytes; this.metrics.gpuBytes += pageBytes;
        this.metrics.textures++; this.metrics.uploads++;
      }
      if (gl.getError() !== gl.NO_ERROR) throw new Error('texture-upload-failed');
    } catch (error) {
      this.removeResource(resource); resource.textures = []; resource.lookup.clear(); resource.bytes = 0;
      resource.failed = true;
      throw error; // A driver/upload failure degrades the whole pass; size/budget overflow stays per material.
    }
  }

  prepareFrame(frame: LightingFrame) {
    this.frame = frame; this.slots.clear();
    this.metrics.requested = 0; this.metrics.lit = 0; this.metrics.overflow = 0; this.metrics.drawCalls = 0;
    const config = this.config;
    this.metrics.mode = !config.enabled ? 'off' : this.state === 'ready' && config.quality !== 'basic' ? config.quality : 'basic';
    if (this.metrics.mode === 'off' || this.metrics.mode === 'basic' || !this.gl || !this.canvas) return;
    try {
      this.syncImages(frame.images);
      const radius = frame.width * config.diameterRatio / 2;
      const light = worldToScreen(frame.light, frame.camera);
      const sprites = frame.sprites.filter(sprite => {
        if (!LIGHTING_MATERIALS[sprite.asset]) return false;
        const original = sprite.dest, angle = sprite.rotation ?? 0;
        const width = Math.abs(Math.cos(angle)) * original.width + Math.abs(Math.sin(angle)) * original.height;
        const height = Math.abs(Math.sin(angle)) * original.width + Math.abs(Math.cos(angle)) * original.height;
        const d = { x: original.x + (original.width - width) / 2, y: original.y + (original.height - height) / 2, width, height };
        const p = worldToScreen(d, frame.camera);
        if (p.x + d.width < 0 || p.y + d.height < 0 || p.x > frame.width || p.y > frame.height) return false;
        const dx = Math.max(p.x - light.x, 0, light.x - p.x - d.width);
        const dy = Math.max(p.y - light.y, 0, light.y - p.y - d.height);
        return Math.hypot(dx, dy) < radius;
      });
      this.metrics.requested = sprites.length;
      const slots = packLightSprites(sprites.map(s => ({ id: s.id, ...s.dest })), this.canvas.width, this.canvas.height);
      const gl = this.gl, u = this.uniforms;
      gl.useProgram(this.program);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.Resolution, this.canvas.width, this.canvas.height);
      gl.uniform2f(u.Light, light.x, light.y);
      gl.uniform2f(u.Radii, radius * (1 - config.softEdgeRatio), radius);
      gl.uniform3f(u.Ambient, ...config.ambientColor.map(c => c * config.ambientIntensity) as [number,number,number]);
      gl.uniform3f(u.Direct, ...config.lightColor.map(c => c * config.lightIntensity) as [number,number,number]);
      gl.uniform1f(u.Height, config.lightHeight); gl.uniform1f(u.Exponent, config.attenuationExponent);
      gl.uniform1f(u.Floor, config.brightnessFloor); gl.uniform1f(u.Levels, config.lightLevels);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.normal); gl.uniform1i(u.Normal, 1);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.Color, 0);
      for (const sprite of sprites) {
        const slot = slots.get(sprite.id), resource = this.resources.get(sprite.asset);
        if (!slot || !resource) { this.metrics.overflow++; continue; }
        this.upload(resource);
        const source = resource.lookup.get(frameKey(sprite.source));
        if (!source) { this.metrics.overflow++; continue; }
        const material = LIGHTING_MATERIALS[sprite.asset]!;
        const d = sprite.dest, p = worldToScreen(d, frame.camera), b = resource.bounds;
        gl.bindTexture(gl.TEXTURE_2D, source.texture);
        gl.uniform4f(u.Source, source.rect.x/source.width, source.rect.y/source.height,
          source.rect.width/source.width, source.rect.height/source.height);
        gl.uniform2f(u.Texel, 1/source.width, 1/source.height);
        gl.uniform4f(u.Slot, slot.x, slot.y, slot.width, slot.height);
        gl.uniform4f(u.Dest, p.x, p.y, d.width, d.height);
        gl.uniform4f(u.Bounds, b.x, b.y, b.width, b.height);
        const profile = NORMAL_PROFILES.indexOf(material.profile), size = LIGHTING_LIMITS.normalTileSize, stride = size + 2;
        gl.uniform4f(u.NormalRect, (profile*stride+1.5)/(stride*3), 1.5/stride, (size-1)/(stride*3), (size-1)/stride);
        const min = Math.min(d.width*b.width, d.height*b.height);
        gl.uniform2f(u.Aspect, min/(d.width*b.width), min/(d.height*b.height));
        gl.uniform1f(u.Flip, sprite.flip ? 1 : 0);
        gl.uniform1f(u.Angle, sprite.rotation ?? 0);
        gl.uniform1f(u.Strength, config.normalStrength * material.strength);
        gl.uniform1f(u.Rim, config.quality === 'high' && material.rim ? config.rimStrength : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.slots.set(sprite.id, slot); this.metrics.lit++; this.metrics.drawCalls++;
      }
    } catch (error) { this.fail(error); }
  }

  drawSprite(ctx: CanvasRenderingContext2D, sprite: LitSprite) {
    const slot = this.slots.get(sprite.id);
    if (slot && this.canvas) drawOriginalSprite(ctx, sprite, this.canvas, slot);
    else drawOriginalSprite(ctx, sprite);
  }

  drawShadow(ctx: CanvasRenderingContext2D, sprite: LitSprite) {
    if (!this.config.enabled || this.metrics.mode === 'basic' || !LIGHTING_MATERIALS[sprite.asset]?.shadow) return;
    if (!this.blob) {
      this.blob = document.createElement('canvas'); this.blob.width = 64; this.blob.height = 16;
      const c = this.blob.getContext('2d');
      if (!c) return;
      c.scale(1, 0.25);
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    }
    const d = sprite.dest, bounds = this.resources.get(sprite.asset)?.bounds;
    if (!bounds) return;
    const width = d.width * bounds.width * 0.75, height = Math.max(4, width * 0.22);
    ctx.drawImage(this.blob, d.x + d.width/2 - width/2,
      d.y + d.height * (bounds.y + bounds.height) - height/2, width, height);
  }

  applyBase(ctx: CanvasRenderingContext2D) {
    const frame = this.frame, config = this.config;
    if (!frame || !config.enabled) return;
    const radius = frame.width * config.diameterRatio / 2;
    const key = `${frame.width}:${JSON.stringify(config)}`;
    if (this.radialKey !== key || !this.radial) {
      this.radial ??= document.createElement('canvas');
      const size = Math.min(1024, Math.ceil(radius * 2));
      this.radial.width = size; this.radial.height = size;
      const c = this.radial.getContext('2d');
      if (!c) return;
      const gradient = c.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
      if (config.lightLevels > 1) {
        const levels = config.lightLevels - 1;
        gradient.addColorStop(0, rgb(lightMultiplier(1,1,config)));
        for (let k = levels; k > 0; k--) {
          const t = 1 - Math.pow((k-0.5)/levels,1/config.attenuationExponent);
          const stop = 1-config.softEdgeRatio+config.softEdgeRatio*t;
          gradient.addColorStop(stop,rgb(lightMultiplier(k/levels,1,config)));
          gradient.addColorStop(stop,rgb(lightMultiplier((k-1)/levels,1,config)));
        }
        gradient.addColorStop(1,rgb(lightMultiplier(0,1,config)));
      } else for (let i = 0; i <= 256; i++) {
        gradient.addColorStop(i/256, rgb(lightMultiplier(lightAttenuation(radius*i/256,frame.width,config),1,config)));
      }
      c.fillStyle = gradient; c.fillRect(0,0,size,size); this.radialKey = key;
    }
    this.field ??= document.createElement('canvas');
    if (this.field.width !== frame.width || this.field.height !== frame.height) {
      this.field.width = frame.width; this.field.height = frame.height;
    }
    const field = this.field.getContext('2d');
    if (!field) return;
    const light = worldToScreen(frame.light, frame.camera);
    field.fillStyle = rgb(lightMultiplier(0,1,config)); field.fillRect(0,0,frame.width,frame.height);
    field.drawImage(this.radial,light.x-radius,light.y-radius,radius*2,radius*2);
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(this.field,0,0); ctx.restore();
  }

  dispose() {
    if (this.state === 'disposed') return;
    this.canvas?.removeEventListener('webglcontextlost', this.onLost);
    this.canvas?.removeEventListener('webglcontextrestored', this.onRestored);
    for (const resource of this.resources.values()) this.removeResource(resource);
    this.gl?.deleteTexture(this.normal); this.gl?.deleteBuffer(this.buffer); this.gl?.deleteProgram(this.program);
    for (const c of [this.canvas,this.field,this.radial,this.blob]) if (c) { c.width = 0; c.height = 0; }
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.resources.clear(); this.slots.clear(); this.frame = null; this.gl = null;
    this.canvas = null; this.field = null; this.radial = null; this.blob = null;
    this.state = 'disposed'; this.metrics.gpuBytes = 0; this.metrics.textures = 0;
  }
}

export const obstacleAssetId = (path: string): AssetId | undefined =>
  (Object.keys(ASSET_PATHS) as AssetId[]).find(key => key.startsWith('obstacle_') && ASSET_PATHS[key] === path);
