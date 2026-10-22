import type { Obstacle, Position } from '@/game/model/types';
export const lerpPoint = (a: Position, b: Position, t: number): Position => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export function segmentCircleT(a: Position, b: Position, center: Position, radius: number): number | null {
    const x = a.x - center.x, y = a.y - center.y;
    const dx = b.x - a.x, dy = b.y - a.y;
    const c = x * x + y * y - radius * radius;
    if (c <= 0)
        return 0;
    const aa = dx * dx + dy * dy;
    if (aa === 0)
        return null;
    const bb = x * dx + y * dy, d = bb * bb - aa * c;
    if (d < 0)
        return null;
    const t = (-bb - Math.sqrt(d)) / aa;
    return t >= 0 && t <= 1 ? t : null;
}
function segmentRectT(a: Position, b: Position, left: number, top: number, right: number, bottom: number): number | null {
    let lo = 0, hi = 1;
    for (const [v, delta, min, max] of [[a.x, b.x - a.x, left, right], [a.y, b.y - a.y, top, bottom]]) {
        if (Math.abs(delta) < 1e-10) {
            if (v < min || v > max)
                return null;
        }
        else {
            const t1 = (min - v) / delta, t2 = (max - v) / delta;
            lo = Math.max(lo, Math.min(t1, t2));
            hi = Math.min(hi, Math.max(t1, t2));
            if (lo > hi)
                return null;
        }
    }
    return lo;
}
export function segmentCapsuleT(a: Position, b: Position, start: Position, end: Position, radius: number): number | null {
    const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy);
    if (!length)
        return segmentCircleT(a, b, start, radius);
    const local = (p: Position) => ({ x: ((p.x - start.x) * dx + (p.y - start.y) * dy) / length, y: (-(p.x - start.x) * dy + (p.y - start.y) * dx) / length });
    const hits = [segmentCircleT(a, b, start, radius), segmentCircleT(a, b, end, radius), segmentRectT(local(a), local(b), 0, -radius, length, radius)].filter((t): t is number => t !== null);
    return hits.length ? Math.min(...hits) : null;
}
export function distanceToSegment(p: Position, a: Position, b: Position): number {
    const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
    const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0;
    const q = lerpPoint(a, b, t);
    return Math.hypot(p.x - q.x, p.y - q.y);
}
/** Exact swept circle against collision rectangles and world boundaries. */
export function traceBossPath(from: Position, to: Position, radius: number, obstacles: readonly Obstacle[], width: number, height: number) {
    let t = 1;
    for (const o of obstacles) {
        const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
        const l = cx - o.collisionWidth / 2, r = cx + o.collisionWidth / 2;
        const top = cy - o.collisionHeight / 2, bottom = cy + o.collisionHeight / 2;
        const candidates = [segmentRectT(from, to, l - radius, top, r + radius, bottom), segmentRectT(from, to, l, top - radius, r, bottom + radius),
            ...[{ x: l, y: top }, { x: r, y: top }, { x: l, y: bottom }, { x: r, y: bottom }].map(p => segmentCircleT(from, to, p, radius))];
        for (const hit of candidates)
            if (hit !== null)
                t = Math.min(t, hit);
    }
    for (const [a, b, max] of [[from.x, to.x, width], [from.y, to.y, height]]) {
        if (b < radius && b !== a)
            t = Math.min(t, (radius - a) / (b - a));
        if (b > max - radius && b !== a)
            t = Math.min(t, (max - radius - a) / (b - a));
    }
    const safeT = Math.max(0, t - (t < 1 ? 0.00001 : 0));
    return { from: { ...from }, to: lerpPoint(from, to, safeT), blocked: t < 1 };
}
