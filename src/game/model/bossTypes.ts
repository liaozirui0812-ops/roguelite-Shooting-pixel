import type { Position } from './types';
export type BossPhase = 'inactive' | 'intro' | 'idle' | 'aim' | 'lock' | 'attack' | 'pause' | 'recover' | 'transition';
export type BossSkill = 'charge' | 'stomp' | 'pierce' | 'volley' | 'ring';
interface BossCommon {
    phase: BossPhase;
    phaseStartedAt: number;
    activatedAt: number;
    skill: BossSkill;
    sequence: number;
    angle: number;
    path: {
        from: Position;
        to: Position;
        blocked: boolean;
    };
    hitPlayer: boolean;
    emitted: number;
    previousPlayer: Position;
    movementScale: number;
}
export interface BossLeg {
    id: string;
    hp: number;
    maxHp: number;
    foot: Position;
    stepFrom: Position;
    stepTo: Position;
    stepStartedAt: number | null;
    brokenAt: number | null;
}
export type NewBossState = (BossCommon & {
    kind: 'boar';
}) | (BossCommon & {
    kind: 'mech';
    legs: BossLeg[];
    halfTransition: boolean;
    exposed: boolean;
    volleyGroups: string[][];
});
