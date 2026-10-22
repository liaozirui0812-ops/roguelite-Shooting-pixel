import { GAME_CONFIG } from '@/game/config/base';
import { BOAR, MECH, LEG_MOUNTS } from '@/game/config/bosses';
import type { EnemyBullet, Monster, Position } from '@/game/model/types';
import type { BossPhase, NewBossState } from '@/game/model/bossTypes';
import { advanceBossFeet, evaluateBossPose } from '@/game/rules/bossPose';
import { distanceToSegment, lerpPoint, segmentCircleT, traceBossPath } from '@/game/rules/bossGeometry';
import { checkCollisionWithObstacle } from '@/game/rules/geometry';
import type { UpdateWorldContext, TickContext } from './context';
export function bossResistsKnockback(monster: Monster) {
    return monster.boss?.kind === 'boar' && monster.boss.skill === 'charge' && ['lock', 'attack', 'pause'].includes(monster.boss.phase);
}
/** Actual activation, including delayed wave batches, is the origin for skill and gait clocks. */
export function activateBoss(monster: Monster, now: number, obstacles: UpdateWorldContext['world']['obstacles']): Monster {
    const state = monster.boss;
    if (!state || state.phase !== 'inactive')
        return monster;
    const radius = state.kind === 'mech' ? MECH.radius : BOAR.radius;
    const margin = state.kind === 'mech' ? 200 : 160;
    const origin = { x: Math.max(margin, Math.min(GAME_CONFIG.WORLD_WIDTH - margin, monster.x)), y: Math.max(margin, Math.min(GAME_CONFIG.WORLD_HEIGHT - margin, monster.y)) };
    let position = origin;
    const valid = (p: Position) => p.x >= margin && p.y >= margin && p.x <= GAME_CONFIG.WORLD_WIDTH - margin && p.y <= GAME_CONFIG.WORLD_HEIGHT - margin && !obstacles.some(o => checkCollisionWithObstacle(p.x, p.y, radius, o));
    if (!valid(position)) {
        let found = false;
        for (let ring = 1; ring <= 20 && !found; ring++)
            for (let i = 0; i < 24; i++) {
                const angle = i * Math.PI / 12, candidate = { x: origin.x + Math.cos(angle) * ring * 35, y: origin.y + Math.sin(angle) * ring * 35 };
                if (valid(candidate)) {
                    position = candidate;
                    found = true;
                    break;
                }
            }
        if (!found)
            throw new Error(`No legal spawn for Boss ${monster.id}`);
    }
    const boss = { ...state, phase: 'intro' as const, phaseStartedAt: now, activatedAt: now };
    if (boss.kind === 'mech')
        boss.legs = boss.legs.map((leg, i) => {
            const foot = { x: position.x + LEG_MOUNTS[i].rest.x, y: position.y + LEG_MOUNTS[i].rest.y };
            return { ...leg, foot, stepFrom: { ...foot }, stepTo: { ...foot }, stepStartedAt: null };
        });
    return { ...monster, ...position, boss };
}
export function bossSystem(context: UpdateWorldContext, tick: TickContext) {
    const { world, runtime } = context, { now } = tick;
    if (world.gameState !== 'playing' || world.isPaused)
        return;
    const shots: EnemyBullet[] = [];
    const damagePlayer = (amount: number) => {
        if (context.dashRef.current.active || world.gameState !== 'playing')
            return false;
        context.setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - amount), isHit: true, hitTime: now }));
        if (world.player.hp <= 0) {
            context.setGameState('gameover');
            context.stopBGM();
        }
        return true;
    };
    const path = (from: Position, angle: number, distance: number, radius: number) => traceBossPath(from, { x: from.x + Math.cos(angle) * distance, y: from.y + Math.sin(angle) * distance }, radius, world.obstacles, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
    const emit = (owner: Monster, from: Position, angle: number, speed: number, damage: number, range: number, size: number, visual: 'rock' | 'energy' | 'core', group?: string, spent = false) => {
        shots.push({ id: runtime.nextId('boss-shot'), ownerId: owner.id, attackGroup: group, groupSpent: spent, visual, x: from.x, y: from.y, startX: from.x, startY: from.y,
            vx: Math.cos(angle) * speed / 60, vy: Math.sin(angle) * speed / 60, damage, range, size, distanceTraveled: 0, color: visual === 'rock' ? '#bc8652' : '#57f4ed', spawnTime: now });
    };
    context.setMonsters(monsters => monsters.map(input => {
        if (!input.boss || input.isDying || world.gameState !== 'playing')
            return input;
        let m = activateBoss(input, now, world.obstacles);
        let b: NewBossState = { ...m.boss! };
        if (b.kind === 'mech' && b.legs.some(leg => leg.brokenAt !== null && now - leg.brokenAt <= runtime.stepMs))
            context.playSound('mech_break');
        const transition = (phase: BossPhase) => { b = { ...b, phase, phaseStartedAt: now, emitted: 0 }; };
        const angleToPlayer = () => Math.atan2(world.player.y - m.y, world.player.x - m.x);
        const aim = () => {
            b.angle = angleToPlayer();
            const reach = b.kind === 'boar' ? BOAR.charge.distance : MECH.pierce.distance;
            const origin = b.kind === 'mech' && b.skill === 'pierce' ? { x: m.x + (Math.floor(b.sequence / 2) % 2 === 0 ? -38 : 38), y: m.y + 25 } : m;
            b.angle = Math.atan2(world.player.y - origin.y, world.player.x - origin.x);
            b.path = path(origin, b.angle, reach, b.kind === 'boar' ? BOAR.radius : MECH.pierce.radius);
        };
        if (b.kind === 'mech') {
            const exposed = b.legs.every(leg => leg.hp <= 0);
            if ((!b.exposed && exposed) || (!b.halfTransition && m.hp <= m.maxHp / 2)) {
                b = { ...b, exposed, halfTransition: b.halfTransition || m.hp <= m.maxHp / 2 };
                transition('transition');
                context.triggerScreenShake(exposed ? 8 : 4);
            }
        }
        const elapsed = now - b.phaseStartedAt;
        m = { ...m, vx: 0, vy: 0, boss: b };
        if (b.phase === 'intro' || b.phase === 'transition') {
            if (elapsed >= 1000)
                transition('idle');
        }
        else if (b.phase === 'idle') {
            const live = b.kind === 'mech' ? b.legs.filter(leg => leg.hp > 0).length : 4;
            const speed = (b.kind === 'boar' ? BOAR.moveSpeed : MECH.moveSpeed * Math.max(0.25, 1 - (8 - live) * 0.1)) * b.movementScale / 60;
            const dist = Math.hypot(world.player.x - m.x, world.player.y - m.y);
            b.angle = angleToPlayer();
            if (live > 0 && dist > (b.kind === 'boar' ? 240 : 330)) {
                const next = path(m, b.angle, speed, b.kind === 'boar' ? BOAR.radius : MECH.radius).to;
                m = { ...m, x: next.x, y: next.y, vx: next.x - m.x, vy: next.y - m.y };
            }
            if (elapsed >= (b.kind === 'boar' ? BOAR.idle : MECH.idle) * (b.kind === 'mech' && b.exposed ? 1.5 : 1)) {
                b.sequence++;
                b.hitPlayer = false;
                b.skill = b.kind === 'boar' ? (b.sequence % 2 ? 'charge' : 'stomp') : b.kind === 'mech' && b.exposed ? (b.sequence % 2 ? 'pierce' : 'ring') : (b.sequence % 2 ? 'pierce' : 'volley');
                if (b.kind === 'mech' && b.skill === 'volley') {
                    const ids = b.legs.filter(leg => leg.hp > 0).map(leg => leg.id);
                    b.volleyGroups = [ids.slice(0, 4), ids.slice(4)];
                }
                aim();
                transition('aim');
                context.playSound(b.kind === 'boar' ? (b.skill === 'charge' ? 'boar_charge' : 'boar_stomp') : 'mech_pierce');
            }
        }
        else if (b.kind === 'boar' && b.skill === 'charge') {
            const c = BOAR.charge;
            if (b.phase === 'aim') {
                aim();
                if (elapsed >= c.aim)
                    transition('lock');
            }
            else if (b.phase === 'lock' && elapsed >= c.lock) {
                transition('attack');
                context.triggerScreenShake(3);
            }
            else if (b.phase === 'attack') {
                const from = { x: m.x, y: m.y }, length = Math.hypot(b.path.to.x - from.x, b.path.to.y - from.y);
                const step = Math.min(c.speed / 60, length), to = length > 0 ? lerpPoint(from, b.path.to, step / length) : from;
                // Relative segment includes the player's movement during this fixed tick.
                const previousPlayer = b.previousPlayer;
                const relativeFrom = { x: from.x - previousPlayer.x, y: from.y - previousPlayer.y };
                const relativeTo = { x: to.x - world.player.x, y: to.y - world.player.y };
                if (!b.hitPlayer && segmentCircleT(relativeFrom, relativeTo, { x: 0, y: 0 }, BOAR.radius + GAME_CONFIG.PLAYER_SIZE) !== null)
                    b.hitPlayer = damagePlayer(c.damage);
                m = { ...m, ...to, vx: to.x - from.x, vy: to.y - from.y };
                if (length <= step + 0.01 || elapsed >= c.duration) {
                    transition('pause');
                    context.triggerScreenShake(b.path.blocked ? 8 : 3);
                    context.playSound('explosion');
                }
            }
            else if (b.phase === 'pause' && elapsed >= c.impact)
                transition('recover');
            else if (b.phase === 'recover' && elapsed >= (b.path.blocked ? c.stun : c.recover))
                transition('idle');
        }
        else if (b.kind === 'boar' && b.skill === 'stomp') {
            const c = BOAR.stomp;
            const stomp = (index: number) => {
                const hit = Math.hypot(world.player.x - m.x, world.player.y - m.y) <= c.radius + GAME_CONFIG.PLAYER_SIZE && damagePlayer(c.damage);
                for (let i = 0; i < c.count; i++)
                    emit(m, m, b.angle - c.spread / 2 + c.spread * i / (c.count - 1), c.speed, c.bulletDamage, c.range, c.bulletRadius, 'rock', `${m.id}:${b.sequence}:${index}`, !!hit);
                context.triggerScreenShake(7);
                context.playSound('boar_stomp');
            };
            if (b.phase === 'aim') {
                b.angle = angleToPlayer();
                if (elapsed >= c.aim) {
                    stomp(0);
                    transition('pause');
                }
            }
            else if (b.phase === 'pause') {
                if (elapsed < c.interval - 300)
                    b.angle = angleToPlayer();
                if (elapsed >= c.interval) {
                    stomp(1);
                    transition('recover');
                }
            }
            else if (b.phase === 'recover' && elapsed >= c.recover)
                transition('idle');
        }
        else if (b.kind === 'mech' && b.skill === 'pierce') {
            const c = MECH.pierce;
            if (b.phase === 'aim') {
                aim();
                if (elapsed >= c.aim)
                    transition('lock');
            }
            else if (b.phase === 'lock' && elapsed >= c.lock)
                transition('attack');
            else if (b.phase === 'attack') {
                const tip = lerpPoint(b.path.from, b.path.to, Math.min(1, elapsed / c.extend));
                if (!b.hitPlayer && elapsed <= c.extend && distanceToSegment(world.player, b.path.from, tip) <= c.radius + GAME_CONFIG.PLAYER_SIZE)
                    b.hitPlayer = damagePlayer(c.damage);
                if (elapsed >= c.extend + c.hold)
                    transition('recover');
            }
            else if (b.phase === 'recover' && elapsed >= c.retract)
                transition('idle');
        }
        else if (b.kind === 'mech' && b.skill === 'volley') {
            const c = MECH.volley;
            const fire = (group: number) => {
                const pose = evaluateBossPose({ ...m, boss: b }, now);
                const live = b.kind === 'mech' ? b.legs.filter(leg => leg.hp > 0 && b.kind === 'mech' && b.volleyGroups[group].includes(leg.id)) : [];
                for (const leg of live) {
                    const socket = pose.feet.find(foot => foot.id === leg.id)!.position;
                    for (const offset of [-c.spread, 0, c.spread])
                        emit(m, socket, b.angle + offset, c.speed, c.damage, c.range, c.radius, 'energy');
                }
                context.playSound('mech_volley');
            };
            if (b.phase === 'aim') {
                if (elapsed < c.aim - 300)
                    b.angle = angleToPlayer();
                if (elapsed >= c.aim) {
                    fire(0);
                    transition('pause');
                }
            }
            else if (b.phase === 'pause' && elapsed >= c.interval) {
                fire(1);
                transition('recover');
            }
            else if (b.phase === 'recover' && elapsed >= c.recover)
                transition('idle');
        }
        else if (b.kind === 'mech' && b.skill === 'ring') {
            const c = MECH.ring;
            if (b.phase === 'aim' && elapsed >= c.aim) {
                for (let i = c.gap; i < c.directions; i++)
                    emit(m, m, b.angle + i * Math.PI * 2 / c.directions, c.speed, c.damage, c.range, c.radius, 'core');
                transition('recover');
                context.triggerScreenShake(5);
                context.playSound('mech_volley');
            }
            else if (b.phase === 'recover' && elapsed >= c.recover)
                transition('idle');
        }
        b.previousPlayer = { x: world.player.x, y: world.player.y };
        return advanceBossFeet({ ...m, boss: b }, now);
    }));
    if (shots.length && world.gameState === 'playing')
        context.setEnemyBullets(bullets => [...bullets, ...shots]);
}
