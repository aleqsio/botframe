import type { TreeID } from "loro-crdt";

export type LayerId = TreeID;

export type Geometry =
	| { kind: "rectangle"; cornerRadius: number; cornerSmoothing: number; artboard: boolean }
	| { kind: "ellipse" }
	| { kind: "path"; d: string }
	| { kind: "unsupported" };

export type RectangleGeometry = Extract<Geometry, { kind: "rectangle" }>;

export type Rect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export interface Layer extends Rect {
	id: LayerId;
	rotation: number;
	fill: string;
	geometry: Geometry;
	name: string;
	clip: boolean;
	parent: LayerId | null;
}

export interface LayerFields extends Rect {
	fill: string;
	name: string;
	clip: boolean;
	geometry: Exclude<Geometry, { kind: "unsupported" }>;
}
