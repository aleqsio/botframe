import type { CSSProperties, ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { LayerView } from "./LayerView";
import { useStageInput } from "./input/useStageInput";
import { useToolInput } from "./input/useToolInput";
import { cameraTransform } from "./state/camera";
import type { Camera } from "./state/camera";
import { useSlot } from "./state/useSlot";
import type { UserState } from "./state/userState";
import { useLayerIds } from "./useDocument";

declare module "react" {
	interface CSSProperties {
		"--zoom"?: number | undefined;
	}
}

function viewportStyle(camera: Camera): CSSProperties {
	return { transform: cameraTransform(camera), "--zoom": camera.zoom };
}

export function Stage({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const ids = useLayerIds(doc);
	const camera = useSlot(user.camera);
	const tool = useSlot(user.tool);
	const handlers = useStageInput(user.camera, useToolInput(doc, user));

	return (
		<main data-tool={tool} id="stage" {...handlers}>
			<div id="viewport" style={viewportStyle(camera)}>
				{ids.map((id) => (
					<LayerView doc={doc} id={id} key={id} selection={user.selection} />
				))}
			</div>
		</main>
	);
}
