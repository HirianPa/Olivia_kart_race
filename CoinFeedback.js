/**
 * Keeps every coin event available for world effects while exposing only the
 * local player's events to HUD and local audio consumers.
 */
export function routeCoinEvents(events, player) {
  const worldEvents = events ?? [];
  const playerEvents = worldEvents.filter((event) => event?.kart === player);
  return { worldEvents, playerEvents };
}
