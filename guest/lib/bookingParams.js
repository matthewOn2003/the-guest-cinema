// Booking state travels in the URL, so each step can be reloaded or shared.
export function parseIdList(value) {
  return String(value ?? "")
    .split(",")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function parseFoodList(value) {
  return String(value ?? "")
    .split(",")
    .map((pair) => pair.split(":").map(Number))
    .filter(([id, qty]) => Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0)
    .map(([foodId, quantity]) => ({ foodId, quantity }));
}
