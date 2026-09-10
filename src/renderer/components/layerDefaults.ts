import type { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId, Rect } from "../../document/layer";
import type { UserState } from "../state/userState";
import { DEFAULT_TOOL } from "./tools";

export interface DrawDefaults {
	label: string;
	fill: string;
	clip: boolean;
	artboard: boolean;
}

export const ARTBOARD_DEFAULTS: DrawDefaults = {
	label: "Artboard",
	fill: "#ffffff",
	clip: true,
	artboard: true,
};

export const RECTANGLE_DEFAULTS: DrawDefaults = {
	label: "Rectangle",
	fill: "#d9d9d9",
	clip: false,
	artboard: false,
};

export function drawnFields(defaults: DrawDefaults, rect: Rect, name: string): LayerFields {
	return {
		...rect,
		fill: defaults.fill,
		name,
		clip: defaults.clip,
		geometry: {
			kind: "rectangle",
			cornerRadius: 0,
			cornerSmoothing: 0,
			artboard: defaults.artboard,
		},
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
