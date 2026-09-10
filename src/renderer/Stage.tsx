import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { LayerView } from "./LayerView";
import { SelectionOverlay } from "./SelectionOverlay";
import { Viewport } from "./Viewport";
import { useCanvasInput } from "./input/useCanvasInput";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useLayerIds } from "./useDocument";

export function Stage({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useLayerIds(doc);
	const tool = useSlot(user.tool);
	const zone = useSlot(user.zone);
	const handlers = useCanvasInput(doc, user);

	return (
		<main data-tool={tool} data-zone={zone ?? undefined} id="stage" {...handlers}>
			<Viewport camera={user.camera}>
				{ids.map((id) => (
					<LayerView doc={doc} id={id} key={id} selection={user.selection} />
				))}
				<SelectionOverlay doc={doc} selection={user.selection} />
			</Viewport>
		</main>
	);
}
