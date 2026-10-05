import { FRAME, child, root, text, update } from "./example";
import type { Example } from "./example";

const WAVE = [
	{ x: 0, y: 0.3, before: { x: 0, y: 0 }, after: { x: 0.3, y: -0.4 } },
	{ x: 1, y: 0.2, before: { x: -0.2, y: 0.5 }, after: { x: 0, y: 0 } },
	{ x: 0.9, y: 1, before: { x: 0, y: 0 }, after: { x: -0.3, y: -0.3 } },
	{ x: 0.1, y: 0.9, before: { x: 0.2, y: 0.3 }, after: { x: 0, y: 0 } },
];

const OVERFLOW = {
	x: 40,
	y: 40,
	width: 200,
	height: 120,
	fill: "#f97316",
	geometry: { kind: "ellipse" },
};

export const CLIP: Example = {
	name: "clip",
	fonts: [],
	steps: [
		root("Clip", { width: 640, height: 420 }, [
			{
				name: "Clipped frame",
				x: 330,
				y: 20,
				width: 140,
				height: 100,
				clip: true,
				fill: "#e0f2fe",
				geometry: FRAME,
				children: [OVERFLOW],
			},
		]),
		child("oval", {
			name: "Oval",
			x: 20,
			y: 20,
			width: 280,
			height: 180,
			fill: "#00000022",
			geometry: { kind: "ellipse" },
		}),
		child("ovalText", {
			x: 10,
			y: 30,
			width: 300,
			height: 160,
			fill: "radial-gradient(circle, #f59e0b 0%, #7c3aed 100%)",
			geometry: text("Gradient text clipped by an ellipse", { fontSize: 40, fontWeight: 800 }),
		}),
		update("$ovalText", { clipLayer: "$oval" }),
		child("wave", {
			name: "Wave",
			x: 20,
			y: 220,
			width: 280,
			height: 180,
			fill: "#00000011",
			geometry: { kind: "path", vertices: WAVE },
		}),
		child("waveFill", {
			x: 20,
			y: 220,
			width: 280,
			height: 180,
			fill: "linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%)",
		}),
		update("$waveFill", { clipLayer: "$wave" }),
		child("outer", {
			name: "Outer clip",
			x: 330,
			y: 160,
			width: 280,
			height: 220,
			clip: true,
			fill: "#fef9c3",
			geometry: FRAME,
		}),
		child(
			"inner",
			{
				name: "Inner clip",
				x: 40,
				y: 40,
				width: 200,
				height: 140,
				clip: true,
				fill: "#bbf7d0",
				geometry: FRAME,
			},
			"$outer",
		),
		child(
			"innerOval",
			{
				name: "Inner oval",
				x: 20,
				y: 20,
				width: 220,
				height: 160,
				fill: "#00000011",
				geometry: { kind: "ellipse" },
			},
			"$inner",
		),
		child(
			"innerFill",
			{
				x: -30,
				y: -30,
				width: 300,
				height: 220,
				fill: "linear-gradient(45deg, #db2777 0%, #facc15 100%)",
			},
			"$inner",
		),
		update("$innerFill", { clipLayer: "$innerOval" }),
	],
};
