// Shared helpers for the guest cinema portal. Showtime values are local (Asia/Kuala_Lumpur) strings: "YYYY-MM-DD HH:MM:SS".

export function formatRM(amount) {
  return `RM ${Number(amount ?? 0).toFixed(2)}`;
}

export function splitDateTime(value) {
  const [date = "", time = ""] = String(value ?? "").split(" ");
  return { date, time };
}

export function dateLabel(date) {
  const [y, m, d] = String(date).split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function timeLabel(value) {
  const { time } = splitDateTime(value);
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

export function ratingLabel(rating) {
  return rating ? Number(rating).toFixed(1) : "No ratings yet";
}

export function initialsOf(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function youtubeEmbed(link) {
  return String(link ?? "").replace("watch?v=", "embed/");
}

export const EXPERIENCE_TONE = { IMAX: "warning", "4D": "info", VIP: "warning", "3D": "info", "2D": "neutral" };
