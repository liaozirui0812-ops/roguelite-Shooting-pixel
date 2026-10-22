/** New content uses px/s, milliseconds and radians; legacy velocities use px/tick. */
export const BOAR = {
    radius: 75, hp: 1900, moveSpeed: 75, intro: 1000, idle: 1400,
    charge: { aim: 700, lock: 450, speed: 1400, distance: 850, duration: 650, impact: 180, recover: 1000, stun: 1600, damage: 12 },
    stomp: { aim: 650, interval: 500, recover: 800, radius: 110, damage: 8, count: 9, spread: 100 * Math.PI / 180, speed: 260, range: 700, bulletDamage: 5, bulletRadius: 10 },
} as const;
export const MECH = {
    radius: 80, hp: 2400, legHp: 160, moveSpeed: 53, intro: 1000, idle: 1500,
    upperLength: 90, lowerLength: 100, legRadius: 13,
    legTransfer: 0.35, exposedMultiplier: 1.25,
    pierce: { aim: 700, lock: 300, extend: 250, hold: 150, retract: 400, distance: 600, radius: 17, damage: 9 },
    volley: { aim: 900, interval: 450, recover: 900, spread: 22 * Math.PI / 180, speed: 220, range: 750, damage: 4, radius: 9 },
    ring: { aim: 1000, recover: 1400, directions: 12, gap: 3, speed: 165, damage: 5, range: 850, radius: 11 },
} as const;
export const LEG_MOUNTS = Array.from({ length: 8 }, (_, index) => {
    const side = index < 4 ? -1 : 1;
    const row = index % 4;
    return {
        id: `${side < 0 ? 'L' : 'R'}${row + 1}`,
        hip: { x: side * 53, y: (row - 1.5) * 32 },
        rest: { x: side * (155 + (row === 1 || row === 2 ? 18 : 0)), y: (row - 1.5) * 68 },
        bend: side * (row < 2 ? -1 : 1),
        group: (row + (side > 0 ? 1 : 0)) % 2,
    };
});
