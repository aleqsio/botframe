import type { TreeID } from "loro-crdt";

export type LayerId = TreeID;

export type Geometry =
	| { kind: "rectangle"; cornerRadius: number; cornerSmoothing: number }
	| { kind: "ellipse" }
	| { kind: "path"; d: string }
	| { kind: "unsupported" };

export interface Layer {
	id: LayerId;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
	geometry: Geometry;
}
