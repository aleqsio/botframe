import { root, text } from "./example";
import type { Example } from "./example";

function filled(fit: string, x: number, y: number): Readonly<Record<string, unknown>> {
	return {
		name: fit,
		x,
		y,
		width: 280,
		height: 150,
		fill: "#e2e8f0",
		media: { asset: "$image", fit },
	};
}

export const MEDIA: Example = {
	name: "media",
	fonts: [],
	steps: [
		root("Media", { width: 640, height: 400 }, [
			filled("cover", 20, 20),
			filled("contain", 340, 20),
			filled("stretch", 20, 200),
			filled("tile", 340, 200),
			{
				x: 470,
				y: 330,
				width: 150,
				height: 60,
				media: { asset: "$image", fit: "tile" },
				fill: "#000000",
				geometry: text("Tiled", { fontSize: 44, fontWeight: 900 }),
			},
		]),
	],
};
