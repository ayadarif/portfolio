// Small display helpers shared by the readout components.
export const pct = (x: number, digits = 2) => `${(x * 100).toFixed(digits)}%`;
// Signed percent, e.g. +1.20%
export const spct = (x: number, digits = 2) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(digits)}%`;
// Signed rate-point difference, e.g. +1.20 pts
export const spts = (x: number, digits = 2) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(digits)} pts`;
export const int = (n: number) => Math.round(n).toLocaleString("en-US");
export const pval = (p: number) => (p < 0.001 ? "< 0.001" : p.toFixed(3));
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => `${months[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const signedInt = (n: number) => `${n >= 0 ? "+" : "−"}${int(Math.abs(n))}`;
