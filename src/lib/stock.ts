export function isQuantityAvailable(available: number, requested: number) {
  return Number.isInteger(requested) && requested > 0 && requested <= available;
}
