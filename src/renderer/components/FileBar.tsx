import type { ReactElement } from "react";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { Icon } from "./Icon";

const DOCUMENT_NAME = "Untitled";

export function FileBar({ layersOpen }: { layersOpen: Slot<boolean> }): ReactElement {
	const open = useSlot(layersOpen);

	return (
		<div id="file-bar">
			<strong className="file-name">{DOCUMENT_NAME}</strong>
			<button
				aria-pressed={open}
				className="pill-button"
				onClick={() => {
					layersOpen.set(!open);
				}}
				type="button"
			>
				<Icon name="layers" />
				Layers
			</button>
		</div>
	);
}
