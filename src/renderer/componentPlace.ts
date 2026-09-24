import type { RefObject } from "react";
import { componentMarkup } from "../document/component";
import type { CatalogEntry } from "../document/componentLibrary";
import type { DesignDocument } from "../document/document";
import { PLAIN_RECTANGLE } from "../document/subtree";
import { markupSize } from "./componentShadow";
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

export function placeComponent({ doc, stage, user }: Placement, entry: CatalogEntry): void {
	const box = stage.current?.getBoundingClientRect();
	const component = doc.components.component(entry.id);
	if (box === undefined || component === null) {
		return;
	}
	const read = doc.layer.bind(doc);
	const parent = pasteParent(read, user.selection.get(), []);
	const center = toParentPoint(layerChain(read, parent), viewportCenter(user.camera.get(), box));
	const size = markupSize(componentMarkup(component, {}));
	const place = { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size };
	const id = doc.createLayer(
		{ ...place, fill: CLEAR, name: entry.name, clip: false, geometry: PLAIN_RECTANGLE },
		parent,
	);
	doc.update(id, {
		content: { kind: "component", component: entry.id, props: {} },
		layout: { width: "hug", height: "hug", display: "row" },
	});
	user.selection.set([id]);
	doc.commit(PLACE_MESSAGE);
}
