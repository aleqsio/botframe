import { root, text } from "./example";
import type { Example, Fields } from "./example";

const WIDTH = 3200;
const STRIPES = 16;

function stripe(index: number): Fields {
	const hue = (index * 360) / STRIPES;
	return {
		name: `Stripe ${index}`,
		x: index * (WIDTH / STRIPES) + 20,
		y: 60 + (index % 4) * 40,
		width: WIDTH / STRIPES - 40,
		height: 400,
		fill: `hsl(${hue}deg 70% 50%)`,
		geometry: { kind: "rectangle", cornerRadius: 24, cornerSmoothing: 0, frame: false },
	};
}

export const TILES: Example = {
	name: "tiles",
	fonts: [],
	steps: [
		root(
			"Tiles",
			{ width: WIDTH, height: 720, fill: "linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)" },
			[
				...Array.from({ length: STRIPES }, (_, index) => stripe(index)),
				{
					x: 40,
					y: 560,
					width: WIDTH - 80,
					height: 120,
					fill: "#0f172a",
					geometry: text("A layer wider than one capture tile, so the tiles join", {
						fontSize: 96,
						fontWeight: 800,
					}),
				},
			],
		),
	],
};
