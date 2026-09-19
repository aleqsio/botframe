import type { TreeID } from "loro-crdt";
import type { LayerLayout, LayoutPatch } from "./layout";
import type { LayerLengths } from "./length";

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
	lengths: LayerLengths;
	layout: LayerLayout;
}

export type LayerTraits = Omit<Layer, "id" | "parent">;

export type WritableGeometry = Exclude<Geometry, { kind: "unsupported" }>;

export interface LayerFields extends Rect {
	fill: string;
	name: string;
	clip: boolean;
	geometry: WritableGeometry;
}

export type LayerPatch = Partial<LayerFields> & {
	rotation?: number;
	lengths?: Partial<LayerLengths>;
	layout?: LayoutPatch;
};
