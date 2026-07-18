const ITEM_TABLES = {
  leader: [
    ['bubble', 0.06],
    ['pearl', 0.54],
    ['shellshot', 0.10],
    ['shell', 0.30],
  ],
  pack: [
    ['bubble', 0.16],
    ['pearl', 0.48],
    ['shellshot', 0.08],
    ['shell', 0.28],
  ],
  back: [
    ['bubble', 0.36],
    ['pearl', 0.27],
    ['shellshot', 0.10],
    ['shell', 0.33],
  ],
};

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(number)));
}

function resolveRandom(source) {
  if (source == null) return Math.random();

  let value;
  try {
    value = typeof source === 'function' ? source() : source;
  } catch {
    value = 0.5;
  }
  let number;
  try {
    number = Number(value);
  } catch {
    return 0.5;
  }
  if (!Number.isFinite(number)) return 0.5;
  return Math.min(0.999999, Math.max(0, number));
}

function normalizeContext(value) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return {};
  try {
    return {
      position: value.position,
      total: value.total,
      random: value.random,
    };
  } catch {
    return {};
  }
}

export class RaceDirector {
  /**
   * `random` accepts either a number in [0, 1) or a zero-argument function
   * returning one. A supplied number/function makes the item choice repeatable.
   */
  chooseItem(context) {
    const { position, total, random } = normalizeContext(context);
    const safeTotal = boundedInteger(total, 1, 1, 99);
    const safePosition = boundedInteger(position, 1, 1, safeTotal);
    const relativePosition = safeTotal === 1 ? 0 : (safePosition - 1) / (safeTotal - 1);
    const table = relativePosition <= 0.25
      ? ITEM_TABLES.leader
      : relativePosition >= 0.75
        ? ITEM_TABLES.back
        : ITEM_TABLES.pack;
    const roll = resolveRandom(random);
    let threshold = 0;
    for (const [item, weight] of table) {
      threshold += weight;
      if (roll < threshold) return item;
    }
    return table.at(-1)[0];
  }
}
