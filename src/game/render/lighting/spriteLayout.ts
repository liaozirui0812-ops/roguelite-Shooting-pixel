import type { AssetId } from '@/game/assets/manifest';
import { atlasFrame, SPRITE_ATLASES } from '@/game/assets/atlases';
import { MONSTER_CONFIGS } from '@/game/config/monsters';
import type { Monster, Player } from '@/game/model/types';
import type { Rect } from './lightingMath';

export type SpriteImages = Partial<Record<AssetId, HTMLImageElement | null>>;
export interface LitSprite {
  id: string;
  asset: AssetId;
  image: HTMLImageElement;
  source: Rect;
  dest: Rect;
  flip: boolean;
  rotation?: number;
}
const centered = (x: number, y: number, width: number, height = width): Rect =>
  ({ x: x - width / 2, y: y - height / 2, width, height });

/** Existing frame/size/mirror rules, shared by preparation and Canvas drawing. */
export function monsterSprite(monster: Monster, now: number, images: SpriteImages): LitSprite | undefined {
  if (monster.boss) return;
  const config = MONSTER_CONFIGS[monster.monsterType];
  let asset: keyof typeof SPRITE_ATLASES;
  let index: number;
  let size: number;
  if (monster.isBoss) {
    const phase = monster.jumpAttackState || 'idle';
    const attacking = ['jump_start', 'airborne', 'landing'].includes(phase);
    asset = attacking && images.boss2 ? 'boss2' : 'boss';
    const alternate = asset === 'boss2';
    const atlas = SPRITE_ATLASES[asset];
    const elapsed = now - (monster.jumpAttackStartTime || now);
    if (phase === 'jump_start') {
      const count = alternate ? 9 : 2;
      index = Math.min(Math.floor(elapsed / ((config.jumpStartDuration || 900) / count)), count - 1);
    } else if (phase === 'airborne') {
      const count = alternate ? 9 : 4;
      index = (alternate ? 9 : 2) + Math.min(Math.floor(elapsed / ((config.airborneDuration || 1600) / count)), count - 1);
    } else if (phase === 'landing') {
      index = (alternate ? 18 : 6) + Math.min(Math.floor(elapsed / 250), 1);
    } else {
      index = Math.floor(now % ((alternate ? 50 : 100) * atlas.frames.length) / (alternate ? 50 : 100));
    }
    size = config.size * 3.25 * (phase === 'landing' ? 1.2 : 1);
  } else {
    if (monster.monsterType === 5) return;
    asset = monster.monsterType === 2 ? 'enemy_2' : monster.monsterType === 3 ? 'enemy_3' : 'enemy_1';
    if (monster.monsterType === 4) {
      const shooting = monster.isShooting && images.enemy_4_2;
      const elapsed = now - (monster.shootAnimationStartTime || 0);
      asset = shooting && elapsed < 400 ? 'enemy_4_2' : 'enemy_4_1';
      // Preserve the existing missing-image fallback after a completed shooting animation.
      if (!images[asset]) return;
    }
    const count = SPRITE_ATLASES[asset].frames.length;
    index = asset === 'enemy_4_2'
      ? Math.floor((now - (monster.shootAnimationStartTime || 0)) / 100) % count
      : Math.floor(now % (count * 100) / 100);
    size = config.size * 1.5;
  }
  const image = images[asset];
  if (!image) return;
  const source = atlasFrame(SPRITE_ATLASES[asset], index);
  return { id: `monster:${monster.id}`, asset, image,
    source: { ...source, height: monster.isBoss ? source.height : image.height },
    dest: centered(monster.x, monster.y, size),
    flip: !monster.isBoss && (monster.monsterType === 3 ? monster.vx <= 0.01 : monster.vx > 0.01) };
}

export function playerSprite(player: Player, now: number, images: SpriteImages,
  dash: { active: boolean; startTime: number; dirX: number }, mirror: boolean): LitSprite | undefined {
  let asset: 'playerWalk' | 'playerIdle' | 'playerDash' = player.isMoving ? 'playerWalk' : 'playerIdle';
  if (!images[asset]) return;
  let source = atlasFrame(SPRITE_ATLASES[asset], Math.floor((now - player.animationStartTime) / 100) % SPRITE_ATLASES[asset].frames.length);
  if (dash.active && images.playerDash) {
    asset = 'playerDash';
    let index = Math.floor(((now - dash.startTime) % 400) / 50);
    if (index < 0) index = 7 - (-index % 8);
    source = atlasFrame(SPRITE_ATLASES.playerDash, index);
  }
  return { id: 'player', asset, image: images[asset]!, source,
    dest: centered(player.x, player.y, 256 * 0.6, 192 * 0.6),
    flip: dash.active ? dash.dirX < -0.01 : mirror };
}

export function drawOriginalSprite(ctx: CanvasRenderingContext2D, sprite: LitSprite,
  image: CanvasImageSource = sprite.image, source: Rect = sprite.source) {
  const d = sprite.dest;
  ctx.save();
  if (sprite.asset === 'bossBoarParts' || sprite.asset === 'bossMechParts' || sprite.asset === 'bossFx') ctx.imageSmoothingEnabled = false;
  ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
  if (sprite.rotation) ctx.rotate(sprite.rotation);
  if (sprite.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, source.x, source.y, source.width, source.height,
    -d.width / 2, -d.height / 2, d.width, d.height);
  ctx.restore();
}
