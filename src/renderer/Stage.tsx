import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { LayerView } from "./LayerView";
import { Viewport } from "./Viewport";
import { useStageInput } from "./input/useStageInput";
import { useToolInput } from "./input/useToolInput";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useLayerIds } from "./useDocument";

export function Stage({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useLayerIds(doc);
	const tool = useSlot(user.tool);
	const handlers = useStageInput(user, useToolInput(doc, user));

	return (
		<main data-tool={tool} id="stage" {...handlers}>
			<Viewport camera={user.camera}>
				{ids.map((id) => (
					<LayerView doc={doc} id={id} key={id} selection={user.selection} />
				))}
			</Viewport>
		</main>
	);
}
