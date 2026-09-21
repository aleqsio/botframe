import type { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId, WritableGeometry } from "../../document/layer";
import type { DrawnRect } from "../input/draw";
import type { UserState } from "../state/userState";
import { DEFAULT_TOOL } from "./tools";

export interface DrawDefaults {
	label: string;
	fill: string;
	clip: boolean;
	level: boolean;
	geometry: WritableGeometry;
}

export const ARTBOARD_DEFAULTS: DrawDefaults = {
	label: "Artboard",
	fill: "#ffffff",
	clip: true,
	level: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
};

export const RECTANGLE_DEFAULTS: DrawDefaults = {
	label: "Rectangle",
	fill: "#d9d9d9",
	clip: false,
	level: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

export const ELLIPSE_DEFAULTS: DrawDefaults = {
	label: "Ellipse",
	fill: "#d9d9d9",
	clip: false,
	level: false,
	geometry: { kind: "ellipse" },
};

export function drawnFields(defaults: DrawDefaults, rect: DrawnRect, name: string): LayerFields {
	return {
		...rect,
		fill: defaults.fill,
		name,
		clip: defaults.clip,
		geometry: defaults.geometry,
	};
}

export function placeLayer(
	doc: DesignDocument,
	user: UserState,
	fields: LayerFields,
	parent: LayerId | null,
): LayerId {
	const id = doc.createLayer(fields, parent);
	user.selection.set([id]);
	return id;
}

export function finishDraw(doc: DesignDocument, user: UserState, defaults: DrawDefaults): void {
	doc.commit(`create ${defaults.label.toLowerCase()}`);
	user.tool.set(DEFAULT_TOOL);
}
