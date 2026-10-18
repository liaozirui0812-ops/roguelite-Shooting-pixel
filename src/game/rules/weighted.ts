/**
 * 通用加权抽样工具（R15）。
 *
 * 此前各处用「把对象按权重复制 N 份到数组、再随机取下标」的方式抽样，有三个问题：
 * 1. `weight || 1` 把显式配置的 0 当成缺省值，使明确设为 0 的内容仍可抽到；
 * 2. 小数权重被隐式 floor（只复制 floor(w) 份），实际比例偏离公式给出的值；
 * 3. 数组长度随权重之和与候选数量增长。
 *
 * 这里改成累积权重抽样：每次抽取只消耗一次 random()，不再复制数组。
 * 注意：调用方仍需自己决定「哪些候选进入本次抽样」，本模块不做去重或空池补货。
 */

/** 缺省权重：只有 undefined / null 才使用它，显式的 0 表示"不参与抽取" */
export const DEFAULT_WEIGHT = 1;

/**
 * 把配置里的原始权重解析成有效权重：
 * - undefined / null → 回退到 fallback（调用方给的缺省值）
 * - 非有限数或 <= 0 → 0，表示不参与抽取
 */
export function resolveWeight(
  raw: number | undefined | null,
  fallback: number = DEFAULT_WEIGHT
): number {
  if (raw === undefined || raw === null) return fallback;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

/**
 * 累积权重抽样，返回被选中元素的下标。
 * weights 必须已经过 resolveWeight 处理（不含负数/NaN），传入空池或总权重非正时返回 -1。
 */
export function pickWeightedIndex(
  weights: readonly number[],
  random: () => number = Math.random
): number {
  let total = 0;
  for (const weight of weights) {
    if (Number.isFinite(weight) && weight > 0) total += weight;
  }
  if (total <= 0) return -1;
  let remaining = random() * total;
  let fallback = -1;
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    if (!Number.isFinite(weight) || weight <= 0) continue;
    fallback = i;
    remaining -= weight;
    if (remaining < 0) return i;
  }
  // 浮点误差兜底：返回最后一个有效候选，而不是可能非法的末位下标
  return fallback;
}

/** 累积权重抽样并返回被选中元素，空池返回 undefined */
export function pickWeightedItem<T>(
  items: readonly T[],
  weights: readonly number[],
  random: () => number = Math.random
): T | undefined {
  const index = pickWeightedIndex(weights, random);
  return index < 0 ? undefined : items[index];
}
