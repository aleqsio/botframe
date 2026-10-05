import { root } from "./example";
import type { Example } from "./example";

const BLOB = [
	{ x: 0.5, y: 0, before: { x: -0.3, y: 0 }, after: { x: 0.3, y: 0 } },
	{ x: 1, y: 0.5, before: { x: 0, y: -0.3 }, after: { x: 0, y: 0.4 } },
	{ x: 0.4, y: 1, before: { x: 0.4, y: 0 }, after: { x: -0.2, y: 0 } },
	{ x: 0, y: 0.4, before: { x: 0, y: 0.3 }, after: { x: 0.1, y: -0.4 } },
];

function rounded(cornerRadius: number, cornerSmoothing: number): Readonly<Record<string, unknown>> {
	return { kind: "rectangle", cornerRadius, cornerSmoothing, frame: false };
}

export const SHAPES: Example = {
	name: "shapes",
	fonts: [],
	steps: [
		root("Shapes", { width: 640, height: 400 }, [
			{
				name: "Curves",
				x: 30,
				y: 30,
				width: 260,
				height: 200,
				fill: "radial-gradient(circle, #38bdf8 0%, #1e3a8a 100%)",
				geometry: { kind: "path", vertices: BLOB },
			},
			{
				name: "Radius",
				x: 330,
				y: 30,
				width: 130,
				height: 130,
				fill: "#0d9488",
				geometry: rounded(32, 0),
			},
			{
				name: "Smooth",
				x: 480,
				y: 30,
				width: 130,
				height: 130,
				fill: "#0d9488",
				geometry: rounded(48, 0.8),
			},
			{
				name: "Ellipse",
				x: 330,
				y: 200,
				width: 280,
				height: 160,
				fill: "linear-gradient(180deg, #fb7185 0%, #be185d 100%)",
				geometry: { kind: "ellipse" },
			},
			{
				name: "Pill",
				x: 30,
				y: 280,
				width: 260,
				height: 70,
				fill: "#475569",
				geometry: rounded(35, 0.6),
			},
		]),
	],
};
