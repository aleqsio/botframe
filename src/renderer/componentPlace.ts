import type { RefObject } from "react";
import type { ComponentEntry } from "../document/components";
import type { DesignDocument } from "../document/document";
import type { Layer, LayerFields } from "../document/layer";
import { PLAIN_RECTANGLE } from "../document/subtree";
import { initialSize } from "./componentShadow";
import { layerChain, toParentPoint } from "./input/layerSpace";
import { pasteParent } from "./paste";
import { viewportCenter } from "./state/camera";
import type { UserState } from "./state/userState";

const CLEAR = "#00000000";
const PLACE_MESSAGE = "place component";

export interface Placement {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}

interface Shape {
	fields: Omit<LayerFields, "x" | "y" | "name">;
	layout: Partial<Layer["layout"]>;
}

function htmlShape(doc: DesignDocument, entry: ComponentEntry): Shape {
	return {
		fields: { ...initialSize(doc, entry.id), fill: CLEAR, clip: false, geometry: PLAIN_RECTANGLE },
		layout: { width: "hug", height: "hug", display: "row" },
	};
}

function layerShape(root: Layer): Shape {
	const { width, height, fill, clip, geometry } = root;
	return {
		fields: {
			width,
			height,
			fill,
			clip,
			geometry: geometry.kind === "unsupported" ? PLAIN_RECTANGLE : geometry,
		},
		layout: { width: root.layout.width, height: root.layout.height },
	};
}

function shapeOf(doc: DesignDocument, entry: ComponentEntry): Shape | null {
	if (entry.body.kind === "html") {
		return htmlShape(doc, entry);
	}
	const root = doc.layer(entry.body.root);
	return root === null ? null : layerShape(root);
}

export function placeComponent({ doc, stage, user }: Placement, entry: ComponentEntry): void {
	const box = stage.current?.getBoundingClientRect();
	const shape = shapeOf(doc, entry);
	if (box === undefined || shape === null) {
		return;
	}
	const read = doc.layer.bind(doc);
	const parent = pasteParent(read, user.selection.get(), []);
	const center = toParentPoint(layerChain(read, parent), viewportCenter(user.camera.get(), box));
	const { width, height } = shape.fields;
	const place = { x: center.x - width / 2, y: center.y - height / 2 };
	const id = doc.createLayer({ ...shape.fields, ...place, name: entry.name }, parent);
	doc.update(id, {
		content: { kind: "component", component: entry.id, props: {} },
		layout: shape.layout,
	});
	user.selection.set([id]);
	doc.commit(PLACE_MESSAGE);
}
