// lightweight deterministic mock so the numbers look stable within a session
export function getMockEnergy() {
  const base = 120; // kWh/day baseline
  const variance = 30;
  const seed = Math.floor(Date.now() / (1000 * 60 * 60)); // changes hourly
  const rand = (n) => Math.abs(Math.sin(seed + n));
  const day = Math.round(base + variance * rand(1));
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  // pretend part already claimed; claimable = leftover
  const alreadyClaimed = Math.round(day * 0.35);
  const claimable = Math.max(0, day - alreadyClaimed);

  // very simple conversion (for display only): 1 kWh ~ 0.0006 tCO2 -> 0.6 kgCO2
  const kgPerKwh = 0.6;
  return {
    kwh: { day, week, month, year, claimable },
    co2kg: {
      day: Math.round(day * kgPerKwh),
      week: Math.round(week * kgPerKwh),
      month: Math.round(month * kgPerKwh),
      year: Math.round(year * kgPerKwh),
      claimable: Math.round(claimable * kgPerKwh),
    },
  };
}
