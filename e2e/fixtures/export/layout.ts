import { FRAME, px, root, sides, text } from "./example";
import type { Example, Fields } from "./example";

function gap(value: number): Fields {
	return { column: px(value), row: px(value) };
}

function box(fill: string, layout: Fields = {}): Fields {
	return { width: 80, height: 60, fill, layout };
}

function cell(column: number, row: number, span = 1): Fields {
	return {
		mode: "place",
		column: { start: column, end: column + span },
		row: { start: row, end: row + 1 },
	};
}

const ROW = {
	name: "Row",
	width: 560,
	height: 80,
	fill: "#dbeafe",
	geometry: FRAME,
	layout: { display: "row", gap: gap(12), padding: sides(10), height: "hug" },
	children: [
		box("#1d4ed8"),
		box("#2563eb", { width: "fill" }),
		{
			fill: "#0f172a",
			layout: { width: "hug", height: "hug" },
			geometry: text("Hug", { fontSize: 28 }),
		},
		box("#60a5fa", { width: "fill" }),
	],
};

const COLUMN = {
	name: "Column",
	width: 200,
	height: 240,
	fill: "#dcfce7",
	geometry: FRAME,
	layout: { display: "column", gap: gap(8), padding: sides(12), width: "fixed" },
	children: [box("#15803d", { width: "fill" }), box("#16a34a", { height: "fill" }), box("#4ade80")],
};

const GRID = {
	name: "Grid",
	width: 330,
	height: 240,
	fill: "#fae8ff",
	geometry: FRAME,
	layout: {
		display: "grid",
		gap: gap(10),
		padding: sides(14),
		tracks: {
			columns: [
				{ value: 1, unit: "fr" },
				{ value: 2, unit: "fr" },
				{ value: 1, unit: "fr" },
			],
			rows: [
				{ value: 1, unit: "fr" },
				{ value: 1, unit: "fr" },
			],
		},
	},
	children: [
		box("#a21caf", { width: "fill", height: "fill", cell: cell(1, 1, 2) }),
		box("#c026d3", { width: "fill", height: "fill", cell: cell(3, 1) }),
		box("#e879f9", { width: "fill", height: "fill", cell: cell(1, 2) }),
		box("#86198f", { width: "fill", height: "fill", cell: cell(2, 2, 2) }),
	],
};

export const LAYOUT: Example = {
	name: "layout",
	fonts: [],
	steps: [
		root(
			"Layout",
			{
				width: 600,
				height: 420,
				layout: { display: "column", gap: gap(16), padding: sides(20), height: "hug" },
			},
			[
				ROW,
				{
					name: "Lower",
					fill: "#ffffff",
					geometry: FRAME,
					layout: { display: "row", gap: gap(16), width: "hug", height: "hug" },
					children: [COLUMN, GRID],
				},
			],
		),
	],
};
