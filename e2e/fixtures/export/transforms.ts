import { FRAME, root, text } from "./example";
import type { Example } from "./example";

const ARROW = [
	{ x: 0, y: 0.3 },
	{ x: 0.6, y: 0.3 },
	{ x: 0.6, y: 0 },
	{ x: 1, y: 0.5 },
	{ x: 0.6, y: 1 },
	{ x: 0.6, y: 0.7 },
	{ x: 0, y: 0.7 },
];

export const TRANSFORMS: Example = {
	name: "transforms",
	fonts: [],
	steps: [
		root("Transforms", { width: 640, height: 420 }, [
			{ name: "Turned", x: 40, y: 40, width: 160, height: 100, rotation: 30, fill: "#2563eb" },
			{
				name: "Skewed",
				x: 260,
				y: 40,
				width: 160,
				height: 100,
				skewX: 20,
				skewY: 10,
				fill: "linear-gradient(90deg, #f43f5e 0%, #fde047 100%)",
			},
			{
				name: "Mirrored",
				x: 460,
				y: 40,
				width: 140,
				height: 100,
				mirrored: true,
				fill: "#16a34a",
				geometry: { kind: "path", vertices: ARROW },
			},
			{
				name: "Corner origin",
				x: 60,
				y: 220,
				width: 180,
				height: 80,
				rotation: 15,
				origin: { x: 0, y: 0 },
				fill: "#9333ea",
				geometry: { kind: "rectangle", cornerRadius: 16, cornerSmoothing: 0, frame: false },
			},
			{
				name: "Turned frame",
				x: 330,
				y: 210,
				width: 240,
				height: 160,
				rotation: -12,
				origin: { x: 1, y: 1 },
				clip: true,
				fill: "#fde68a",
				geometry: FRAME,
				children: [
					{
						x: 20,
						y: 20,
						width: 200,
						height: 40,
						fill: "#0f172a",
						mirrored: true,
						geometry: text("Mirrored text", { fontSize: 28, fontWeight: 700 }),
					},
					{
						x: 140,
						y: 90,
						width: 160,
						height: 120,
						rotation: 45,
						fill: "#ea580c",
						geometry: { kind: "ellipse" },
					},
				],
			},
		]),
	],
};
