import type { Bindings, BindingsPatch } from "./bindings";
import type { Guide } from "./guides";
import type { LayerLayout, LayoutPatch } from "./layout";
import type { LayerLengths } from "./length";
import type { MediaFill } from "./media";
import type { InstanceState } from "./instanceState";
import type { LayerId } from "./path";
import type { Literal, VariableValue } from "./value";
import type { Assignments } from "./variable";

export type { LayerId } from "./path";

export type Geometry =
	| { kind: "rectangle"; cornerRadius: number; cornerSmoothing: number; frame: boolean }
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

export const SKEW_LIMIT = 80;

export function heldSkew(degrees: number): number {
	return Number.isFinite(degrees) ? Math.min(Math.max(degrees, -SKEW_LIMIT), SKEW_LIMIT) : 0;
}

export interface Pose {
	rotation: number;
	skewX: number;
	skewY: number;
	mirrored: boolean;
}

export interface ComponentLink {
	kind: "component";
	component: string;
	props: Assignments;
	instance?: InstanceState | undefined;
}

export const PLAIN_INSTANCE: InstanceState = { sync: "all", overrides: {} };

export type ResolvedValues = Readonly<Record<string, Literal>>;

export type LayerContent =
	| { kind: "none" }
	| (ComponentLink & { values: ResolvedValues; instance: InstanceState });

export const NO_CONTENT: { kind: "none" } = { kind: "none" };

export interface Layer extends Rect, Pose {
	id: LayerId;
	origin: Origin;
	fill: string;
	media: MediaFill | null;
	geometry: Geometry;
	name: string;
	clip: boolean;
	parent: LayerId | null;
	lengths: LayerLengths;
	layout: LayerLayout;
	guides: readonly Guide[];
	content: LayerContent;
	bindings: Bindings;
	changed: readonly string[];
}

export type LayerTraits = Omit<Layer, "id" | "parent">;

export type WritableGeometry = Exclude<Geometry, { kind: "unsupported" }>;

export interface LayerFields extends Rect {
	rotation?: number;
	skewX?: number;
	skewY?: number;
	mirrored?: boolean;
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
	media?: MediaFill | null;
	content?: ComponentLink | null;
	props?: Readonly<Record<string, VariableValue | null>>;
	bindings?: BindingsPatch;
};
