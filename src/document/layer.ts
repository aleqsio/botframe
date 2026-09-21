import type { TreeID } from "loro-crdt";
import type { Guide } from "./guides";
import type { LayerLayout, LayoutPatch } from "./layout";
import type { LayerLengths } from "./length";

export type LayerId = TreeID;

// `writeVariant` in ./write.ts stores each property name, so the name `artboard` is
// the key in every `.botframe` file and clipboard envelope that exists. A new name
// makes each frame in a saved file become a plain rectangle. See documentFormat.test.ts.
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

export interface Origin {
	x: number;
	y: number;
}

export const CENTER_ORIGIN: Origin = { x: 0.5, y: 0.5 };

export function isCenterOrigin(origin: Origin): boolean {
	return origin.x === CENTER_ORIGIN.x && origin.y === CENTER_ORIGIN.y;
}

export interface Layer extends Rect {
	id: LayerId;
	rotation: number;
	origin: Origin;
	fill: string;
	geometry: Geometry;
	name: string;
	clip: boolean;
	parent: LayerId | null;
	lengths: LayerLengths;
	layout: LayerLayout;
	guides: readonly Guide[];
}

export type LayerTraits = Omit<Layer, "id" | "parent">;

export type WritableGeometry = Exclude<Geometry, { kind: "unsupported" }>;

export interface LayerFields extends Rect {
	rotation?: number;
	fill: string;
	name: string;
	clip: boolean;
	geometry: WritableGeometry;
}

export type LayerPatch = Partial<LayerFields> & {
	origin?: Partial<Origin>;
	lengths?: Partial<LayerLengths>;
	layout?: LayoutPatch;
	guides?: readonly Guide[];
};
