import { atlasFrame, SPRITE_ATLASES } from '@/game/assets/atlases';
import type { Monster, EnemyBullet, Position } from '@/game/model/types';
import { evaluateBossPose } from '@/game/rules/bossPose';
import { BOAR, MECH } from '@/game/config/bosses';
import type { LitSprite, SpriteImages } from './lighting/spriteLayout';
/** Static atlas pages are reused by every bone; no dynamic texture uploads. */
export function bossSprites(monster: Monster, now: number, images: SpriteImages): LitSprite[] {
    const b = monster.boss;
    if (!b)
        return [];
    const asset = b.kind === 'boar' ? 'bossBoarParts' : 'bossMechParts', image = images[asset];
    if (!image)
        return [];
    const pose = evaluateBossPose(monster, now), sprites: LitSprite[] = [];
    const add = (id: string, index: number, position: Position, width: number, height: number, rotation = 0, flip = false) => {
        sprites.push({ id: `${monster.id}:${id}`, asset, image, source: atlasFrame(SPRITE_ATLASES[asset], index), dest: { x: position.x - width / 2, y: position.y - height / 2, width, height }, rotation, flip });
    };
    const fx = (id: string, index: number, position: Position, size: number) => {
        const texture = images.bossFx;
        if (!texture)
            return;
        sprites.push({ id: `${monster.id}:fx.${id}`, asset: 'bossFx', image: texture, source: atlasFrame(SPRITE_ATLASES.bossFx, index), dest: { x: position.x - size / 2, y: position.y - size / 2, width: size, height: size }, flip: false });
    };
    const bone = (id: string, from: Position, to: Position, width: number, index: number) => {
        add(id, index, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, Math.hypot(to.x - from.x, to.y - from.y) * 1.45, width * 2.3, Math.atan2(to.y - from.y, to.x - from.x));
    };
    for (const item of pose.bones.filter(bone => bone.id !== 'neck')) {
        if (b.kind === 'boar')
            bone(item.id, item.from, item.to, item.width, item.id.endsWith('upper') ? 10 : 11);
        else {
            const upper = item.id.endsWith('upper');
            const index = item.condition === 'broken' ? 6 : upper ? (item.condition === 'damaged' ? 5 : 4) : (item.condition === 'damaged' ? 8 : 7);
            bone(item.id, item.from, item.to, item.width, index);
        }
    }
    for (const foot of pose.feet)
        add(`foot.${foot.id}`, b.kind === 'boar' ? 12 : foot.hp <= foot.maxHp / 2 ? 11 : 10, foot.position, b.kind === 'boar' ? 45 : 55, b.kind === 'boar' ? 42 : 55);
    if (b.kind === 'mech') {
        const left = b.legs.slice(0, 4).filter(l => l.hp <= 0).length, right = b.legs.slice(4).filter(l => l.hp <= 0).length;
        add('chassis', monster.isDying ? 2 : monster.hp <= monster.maxHp / 2 ? 1 : 0, { x: monster.x, y: monster.y + (b.exposed ? 15 : 0) }, 230, 205, (left - right) * 0.035);
        if (b.exposed || b.legs.filter(l => l.hp > 0).length < 4)
            add('core', 3, { x: monster.x, y: monster.y + 10 }, 80 + Math.sin(now / 100) * 6, 80 + Math.sin(now / 100) * 6);
        pose.tentacles.forEach((chain, i) => {
            for (let j = 0; j < chain.length - 1; j++)
                bone(`tentacle.${i}.${j}`, chain[j], chain[j + 1], 12, j === chain.length - 2 ? 14 : 13);
            add(`socket.${i}`, 12, chain[0], 40, 40);
        });
        for (const leg of b.legs)
            if (leg.brokenAt !== null && now - leg.brokenAt < 400)
                fx(`break.${leg.id}`, 12 + Math.min(3, Math.floor((now - leg.brokenAt) / 100)), leg.foot, 100);
    }
    else {
        const angle = (b.angle + Math.PI * 2) % (Math.PI * 2), left = angle > Math.PI / 2 && angle < Math.PI * 1.5;
        const vertical = Math.abs(Math.sin(angle)), up = Math.sin(angle) < 0;
        const direction = vertical > 0.92 ? (up ? 2 : 4) : vertical > 0.35 ? (up ? 1 : 3) : 0;
        const breathe = Math.sin((now - b.activatedAt) / 170) * 2;
        const rear = { x: monster.x - Math.cos(angle) * 95, y: monster.y - Math.sin(angle) * 55 };
        add('tail', 13, rear, 70, 65, left ? -0.4 : 0.4, left);
        const death = monster.isDying ? Math.min(1, (now - monster.deathTime) / 500) * 0.9 : 0;
        add('body', direction, { x: monster.x, y: monster.y - 10 + breathe }, 245, 205, death, left !== (direction === 3));
        const head = { x: monster.x + Math.cos(angle) * 80, y: monster.y + Math.sin(angle) * (direction === 4 ? 20 : 55) - 5 };
        add('head', 5 + direction, head, 155, b.phase === 'aim' ? 145 : 135, death, left !== (direction === 3));
        if (b.phase === 'aim' || b.phase === 'lock')
            fx('steam', 8 + Math.floor(now / 90) % 4, { x: head.x + Math.cos(angle) * 60, y: head.y + Math.sin(angle) * 40 }, 90);
        if (b.phase === 'pause' && now - b.phaseStartedAt < 400)
            fx('impact', 12 + Math.min(3, Math.floor((now - b.phaseStartedAt) / 100)), monster, 150);
        if (b.phase === 'pause' || (b.phase === 'attack' && b.skill === 'charge'))
            add('dust', 15, { x: monster.x - Math.cos(angle) * 95, y: monster.y - Math.sin(angle) * 65 + 30 }, 120, 100, 0, left);
    }
    return sprites;
}
export function drawBossShadow(ctx: CanvasRenderingContext2D, m: Monster) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + 28, m.boss?.kind === 'mech' ? 110 : 105, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
export function drawBossWarnings(ctx: CanvasRenderingContext2D, m: Monster, now: number, debug = false) {
    const b = m.boss;
    if (!b || m.isDying)
        return;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff7258';
    ctx.fillStyle = 'rgba(255,62,42,.14)';
    const warning = ['aim', 'lock'].includes(b.phase);
    if (warning && (b.skill === 'charge' || b.skill === 'pierce')) {
        const radius = b.skill === 'charge' ? BOAR.radius : MECH.pierce.radius, angle = Math.atan2(b.path.to.y - b.path.from.y, b.path.to.x - b.path.from.x), length = Math.hypot(b.path.to.x - b.path.from.x, b.path.to.y - b.path.from.y);
        ctx.save();
        ctx.translate(b.path.from.x, b.path.from.y);
        ctx.rotate(angle);
        ctx.fillRect(0, -radius, length, radius * 2);
        ctx.strokeRect(0, -radius, length, radius * 2);
        for (let x = 30; x < length; x += 45) {
            ctx.beginPath();
            ctx.moveTo(x - 12, -12);
            ctx.lineTo(x, 0);
            ctx.lineTo(x - 12, 12);
            ctx.stroke();
        }
        ctx.restore();
    }
    if ((b.phase === 'aim' || b.phase === 'pause') && b.skill === 'stomp') {
        ctx.beginPath();
        ctx.arc(m.x, m.y, BOAR.stomp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (const a of [-BOAR.stomp.spread / 2, BOAR.stomp.spread / 2]) {
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x + Math.cos(b.angle + a) * 350, m.y + Math.sin(b.angle + a) * 350);
            ctx.stroke();
        }
    }
    if (warning && b.skill === 'ring') {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 160, b.angle + Math.PI / 2.0, b.angle + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([8, 7]);
        ctx.strokeStyle = '#e4ffb0';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + Math.cos(b.angle + Math.PI / 6) * 250, m.y + Math.sin(b.angle + Math.PI / 6) * 250);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    const pose = evaluateBossPose(m, now);
    if (b.kind === 'mech') {
        for (const foot of pose.feet) {
            if ((b.skill === 'volley' && ['aim', 'pause'].includes(b.phase)) || debug) {
                ctx.strokeStyle = '#ffe8ad';
                ctx.beginPath();
                ctx.arc(foot.position.x, foot.position.y, 18, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (foot.hp < foot.maxHp || debug) {
                ctx.fillStyle = '#18232a';
                ctx.fillRect(foot.position.x - 20, foot.position.y + 24, 40, 5);
                ctx.fillStyle = foot.hp <= foot.maxHp / 2 ? '#ffb45e' : '#5bf3d3';
                ctx.fillRect(foot.position.x - 20, foot.position.y + 24, 40 * foot.hp / foot.maxHp, 5);
            }
            if (debug) {
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.fillText(foot.id, foot.position.x - 8, foot.position.y - 22);
            }
        }
        for (const leg of b.legs)
            if (leg.brokenAt !== null && now - leg.brokenAt < 700) {
                const t = (now - leg.brokenAt) / 700;
                ctx.strokeStyle = `rgba(140,255,240,${1 - t})`;
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(leg.foot.x + Math.cos(a) * t * 15, leg.foot.y + Math.sin(a) * t * 15);
                    ctx.lineTo(leg.foot.x + Math.cos(a) * t * 65, leg.foot.y + Math.sin(a) * t * 65);
                    ctx.stroke();
                }
            }
    }
    if (debug) {
        ctx.strokeStyle = '#b9ff69';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(m.x, m.y, pose.radius, 0, Math.PI * 2);
        ctx.stroke();
        for (const bone of pose.bones) {
            ctx.beginPath();
            ctx.moveTo(bone.from.x, bone.from.y);
            ctx.lineTo(bone.to.x, bone.to.y);
            ctx.stroke();
        }
    }
    ctx.restore();
}
export function drawBossBullet(ctx: CanvasRenderingContext2D, bullet: EnemyBullet, now: number, images: SpriteImages) {
    if (!bullet.visual)
        return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const fx = images.bossFx;
    if (fx) {
        const index = (bullet.visual === 'rock' ? 0 : 4) + Math.floor((now - (bullet.spawnTime ?? now)) / 90) % 4;
        const source = atlasFrame(SPRITE_ATLASES.bossFx, index), size = bullet.size * 3;
        ctx.drawImage(fx, source.x, source.y, source.width, source.height, bullet.x - size / 2, bullet.y - size / 2, size, size);
    }
    else {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(now / 120);
        ctx.fillStyle = bullet.visual === 'rock' ? '#d6ad6a' : '#76fff2';
        ctx.strokeStyle = bullet.visual === 'rock' ? '#4d3027' : '#166c73';
        ctx.lineWidth = 2;
        ctx.fillRect(-bullet.size, -bullet.size, bullet.size * 2, bullet.size * 2);
        ctx.strokeRect(-bullet.size, -bullet.size, bullet.size * 2, bullet.size * 2);
        ctx.restore();
    }
    ctx.restore();
    return true;
}
