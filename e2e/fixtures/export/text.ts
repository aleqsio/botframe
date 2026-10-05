import { root, text } from "./example";
import type { Example } from "./example";

const LINEAR = "linear-gradient(90deg, #ef4444 0%, #3b82f6 100%)";
const RADIAL = "radial-gradient(circle, #f59e0b 0%, #7c3aed 100%)";
const HUG = { width: "hug", height: "hug" };

export const TEXT: Example = {
	name: "text",
	fonts: ["Lobster"],
	steps: [
		root("Text", { width: 640, height: 440 }, [
			{ x: 24, y: 20, fill: "#1d4ed8", layout: HUG, geometry: text("Solid hug", { fontSize: 32 }) },
			{
				x: 24,
				y: 76,
				width: 280,
				height: 90,
				fill: LINEAR,
				geometry: text("A linear gradient in a fixed box that wraps", { fontWeight: 700 }),
			},
			{
				x: 330,
				y: 76,
				width: 290,
				height: 60,
				fill: RADIAL,
				geometry: text("Radial underline", {
					fontSize: 30,
					fontWeight: 800,
					letterSpacing: 4,
					decoration: "underline",
				}),
			},
			{
				x: 24,
				y: 190,
				width: 300,
				height: 80,
				fill: "#000000",
				media: { asset: "$image", fit: "cover" },
				geometry: text("IMAGE", { fontSize: 72, fontWeight: 900 }),
			},
			{
				x: 340,
				y: 170,
				width: 120,
				height: 30,
				fill: "#059669",
				geometry: text("This text overflows its small box by a few lines", { fontSize: 20 }),
			},
			{
				x: 24,
				y: 330,
				fill: "#be123c",
				layout: HUG,
				geometry: text("Lobster from Google", { fontFamily: "Lobster", fontSize: 44 }),
			},
		]),
	],
};
