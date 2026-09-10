import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { useSlot } from "../state/useSlot";
import type { UserState } from "../state/userState";
import { useLayer } from "../useDocument";
import { LayerProperties } from "./LayerProperties";
import { PresetList } from "./PresetList";
import { layerEntry } from "./layerEntry";
import { TOOLS } from "./tools";
import type { ToolId } from "./tools";

const ARTBOARD_TOOL: ToolId = "artboard";

function panelTitle(layer: Layer | null, tool: ToolId): string {
	if (layer !== null) {
		return layerEntry(layer).label;
	}
	return TOOLS.find((entry) => entry.id === tool)?.label ?? "";
}

export function Properties({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement {
	const selection = useSlot(user.selection);
	const tool = useSlot(user.tool);
	const layer = useLayer(doc, selection[0] ?? null);

	return (
		<aside className="panel" id="properties">
			<h2 className="panel-title">{panelTitle(layer, tool)}</h2>
			{layer === null ? null : <LayerProperties doc={doc} layer={layer} />}
			{layer === null && tool === ARTBOARD_TOOL ? (
				<PresetList doc={doc} stage={stage} user={user} />
			) : null}
		</aside>
	);
}
