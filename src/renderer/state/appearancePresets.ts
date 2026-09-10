import { DEFAULT_APPEARANCE } from "./appearance";
import type { Appearance } from "./appearance";

export const APPEARANCE_PRESETS: readonly { name: string; appearance: Appearance }[] = [
	{ name: "Plain", appearance: DEFAULT_APPEARANCE },
	{
		name: "Paper",
		appearance: {
			canvas: "#faf9f5",
			radius: 10,
			inset: 6,
			border: { width: 1, ink: { color: "#000000", opacity: 0.08 } },
			shadow: { y: 2, blur: 8, spread: 0, ink: { color: "#3a2f1e", opacity: 0.08 } },
			tint: { color: "#e8dcc8", opacity: 0.35 },
		},
	},
	{
		name: "Slate",
		appearance: {
			canvas: "#16161c",
			radius: 14,
			inset: 10,
			border: { width: 0.5, ink: { color: "#ffffff", opacity: 0.12 } },
			shadow: { y: 1, blur: 12, spread: 2, ink: { color: "#000000", opacity: 0.55 } },
			tint: { color: "#0b0b12", opacity: 0.5 },
		},
	},
	{
		name: "Glass",
		appearance: {
			canvas: "#f4f5f7",
			radius: 18,
			inset: 14,
			border: { width: 0.5, ink: { color: "#ffffff", opacity: 0.6 } },
			shadow: { y: 0, blur: 24, spread: -6, ink: { color: "#1e2436", opacity: 0.35 } },
			tint: { color: "#ffffff", opacity: 0.18 },
		},
	},
];
