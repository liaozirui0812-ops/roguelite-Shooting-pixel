import type { Monster, Position } from '@/game/model/types';
import type { NewBossState } from '@/game/model/bossTypes';
import { BOAR, MECH, LEG_MOUNTS } from '@/game/config/bosses';
import { distanceToSegment, lerpPoint, segmentCapsuleT, segmentCircleT } from './bossGeometry';
export interface BossBone {
    id: string;
    from: Position;
    to: Position;
    width: number;
    legId?: string;
    condition: 'intact' | 'damaged' | 'broken';
}
export interface BossPose {
    bones: BossBone[];
    feet: {
        id: string;
        position: Position;
        hp: number;
        maxHp: number;
    }[];
    core: Position;
    radius: number;
    tentacles: Position[][];
}
export function createBossState(kind: 'boar' | 'mech', x: number, y: number): NewBossState {
    const common = { phase: 'inactive' as const, phaseStartedAt: 0, activatedAt: 0, skill: kind === 'boar' ? 'charge' as const : 'pierce' as const,
        sequence: 0, angle: Math.PI / 2, path: { from: { x, y }, to: { x, y }, blocked: false }, hitPlayer: false, emitted: 0, previousPlayer: { x, y }, movementScale: 1 };
    return kind === 'boar' ? { ...common, kind } : { ...common, kind, halfTransition: false, exposed: false, volleyGroups: [[], []],
        legs: LEG_MOUNTS.map(m => { const foot = { x: x + m.rest.x, y: y + m.rest.y }; return { id: m.id, hp: MECH.legHp, maxHp: MECH.legHp, foot, stepFrom: { ...foot }, stepTo: { ...foot }, stepStartedAt: null, brokenAt: null }; }) };
}
export function solveTwoBoneIK(hip: Position, foot: Position, upper: number, lower: number, bend: number): Position {
    const dx = foot.x - hip.x, dy = foot.y - hip.y;
    const d = Math.max(0.001, Math.min(upper + lower - 0.001, Math.hypot(dx, dy)));
    const along = (upper * upper - lower * lower + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, upper * upper - along * along));
    const angle = Math.atan2(dy, dx), c = Math.cos(angle), s = Math.sin(angle);
    return { x: hip.x + c * along - s * h * bend, y: hip.y + s * along + c * h * bend };
}
/** Feet are simulation state. Planted feet stay fixed until the scheduled support group steps. */
export function advanceBossFeet(monster: Monster, now: number): Monster {
    const state = monster.boss;
    if (state?.kind !== 'mech')
        return monster;
    const group = Math.floor((now - state.activatedAt) / 300) % 2;
    const legs = state.legs.map((leg, i) => {
        if (leg.hp <= 0)
            return leg;
        const mount = LEG_MOUNTS[i];
        const target = { x: monster.x + mount.rest.x, y: monster.y + mount.rest.y };
        if (leg.stepStartedAt !== null) {
            const duration = leg.hp <= leg.maxHp / 2 ? 280 : 200;
            const t = Math.min(1, (now - leg.stepStartedAt) / duration);
            return { ...leg, foot: lerpPoint(leg.stepFrom, leg.stepTo, t), stepStartedAt: t === 1 ? null : leg.stepStartedAt };
        }
        if (mount.group === group && Math.hypot(target.x - leg.foot.x, target.y - leg.foot.y) > 28) {
            return { ...leg, stepFrom: { ...leg.foot }, stepTo: target, stepStartedAt: now };
        }
        return leg;
    });
    return { ...monster, boss: { ...state, legs } };
}
/** Pure: same transforms supply the renderer, emitter sockets and hit geometry. */
export function evaluateBossPose(monster: Monster, now: number): BossPose {
    const state = monster.boss;
    if (!state)
        throw new Error('evaluateBossPose requires a new Boss state');
    const bones: BossBone[] = [], feet: BossPose['feet'] = [], tentacles: Position[][] = [];
    if (state.kind === 'mech') {
        state.legs.forEach((leg, i) => {
            const mount = LEG_MOUNTS[i], hip = { x: monster.x + mount.hip.x, y: monster.y + mount.hip.y };
            const condition = leg.hp <= 0 ? 'broken' : leg.hp <= leg.maxHp / 2 ? 'damaged' : 'intact';
            if (condition === 'broken') {
                bones.push({ id: `${leg.id}.stump`, from: hip, to: lerpPoint(hip, leg.foot, 0.22), width: 22, legId: leg.id, condition });
            }
            else {
                const knee = solveTwoBoneIK(hip, leg.foot, MECH.upperLength, MECH.lowerLength, mount.bend);
                bones.push({ id: `${leg.id}.upper`, from: hip, to: knee, width: 23, legId: leg.id, condition }, { id: `${leg.id}.lower`, from: knee, to: leg.foot, width: 18, legId: leg.id, condition });
                feet.push({ id: leg.id, position: { ...leg.foot }, hp: leg.hp, maxHp: leg.maxHp });
            }
        });
        for (let side = 0; side < 2; side++) {
            const root = { x: monster.x + (side === 0 ? -1 : 1) * 38, y: monster.y + 25 };
            const active = state.skill === 'pierce' && Math.floor(state.sequence / 2) % 2 === side;
            const elapsed = now - state.phaseStartedAt;
            const reach = active && state.phase === 'attack' ? Math.min(1, elapsed / MECH.pierce.extend)
                : active && state.phase === 'recover' ? Math.max(0, 1 - elapsed / MECH.pierce.retract) : 0;
            const tip = reach > 0 ? lerpPoint(state.path.from, state.path.to, reach) : { x: root.x + (side ? 65 : -65), y: root.y + 65 };
            tentacles.push(Array.from({ length: 7 }, (_, i) => {
                const t = i / 6, p = lerpPoint(root, tip, t);
                return { x: p.x + Math.sin(t * Math.PI) * (1 - reach) * (side ? 30 : -30), y: p.y - Math.sin(t * Math.PI) * 25 * (1 - reach) };
            }));
        }
    }
    else {
        const c = Math.cos(state.angle), s = Math.sin(state.angle);
        const local = (x: number, y: number): Position => ({ x: monster.x + x * c - y * s, y: monster.y + x * s + y * c * 0.7 });
        for (let i = 0; i < 4; i++) {
            const front = i < 2, side = i % 2 ? 1 : -1;
            const hip = local(front ? 47 : -53, side * 35);
            const moving = Math.hypot(monster.vx, monster.vy) > 0.1;
            const gait = moving ? Math.sin((now - state.activatedAt) / (state.phase === 'attack' ? 40 : 110) + i * Math.PI) * 14 : 0;
            const knee = local((front ? 47 : -53) + gait, side * 57);
            const hoof = local((front ? 47 : -53) - gait, side * 77);
            bones.push({ id: `leg${i}.upper`, from: hip, to: knee, width: 24, condition: 'intact' }, { id: `leg${i}.lower`, from: knee, to: hoof, width: 19, condition: 'intact' });
            feet.push({ id: `leg${i}`, position: hoof, hp: 1, maxHp: 1 });
        }
        bones.push({ id: 'neck', from: local(20, 0), to: local(100, 0), width: 58, condition: 'intact' });
    }
    return { bones, feet, core: { x: monster.x, y: monster.y }, radius: state.kind === 'boar' ? BOAR.radius : MECH.radius, tentacles };
}
export interface BossHit {
    t: number;
    point: Position;
    legId?: string;
}
export function hitBoss(monster: Monster, a: Position, b: Position, radius: number, now: number): BossHit | null {
    const pose = evaluateBossPose(monster, now);
    const hits: BossHit[] = [];
    const coreT = segmentCircleT(a, b, pose.core, pose.radius + radius);
    if (coreT !== null)
        hits.push({ t: coreT, point: lerpPoint(a, b, coreT) });
    for (const bone of pose.bones) {
        if (!bone.legId || bone.condition === 'broken')
            continue;
        const t = segmentCapsuleT(a, b, bone.from, bone.to, radius + MECH.legRadius);
        if (t === null)
            continue;
        const point = lerpPoint(a, b, t);
        // Chassis occludes the inner leg segments; only exposed geometry takes leg damage.
        if (Math.hypot(point.x - monster.x, point.y - monster.y) < pose.radius)
            continue;
        hits.push({ t, point, legId: bone.legId });
    }
    hits.sort((x, y) => x.t - y.t || (x.legId ? -1 : 1));
    return hits[0] ?? null;
}
export function bossExplosionHit(monster: Monster, center: Position, radius: number, now: number) {
    const pose = evaluateBossPose(monster, now);
    const core = Math.hypot(center.x - monster.x, center.y - monster.y) <= radius + pose.radius;
    const legIds = [...new Set(pose.bones.filter(b => b.legId && b.condition !== 'broken' && distanceToSegment(center, b.from, b.to) <= radius + MECH.legRadius).map(b => b.legId!))];
    return { core, legIds };
}
