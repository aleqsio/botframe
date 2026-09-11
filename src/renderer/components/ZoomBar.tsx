import type { ReactElement, RefObject } from "react";
import { steppedZoom, zoomCameraAt, zoomPercent } from "../state/camera";
import type { Camera, ZoomDirection } from "../state/camera";
import type { Slot } from "../state/slot";
import { usePicked } from "../state/useSlot";
import { Icon } from "./Icon";

function stepZoom(
	camera: Slot<Camera>,
	stage: RefObject<HTMLElement | null>,
	direction: ZoomDirection,
): void {
	const box = stage.current?.getBoundingClientRect();
	if (box === undefined) {
		return;
	}
	const view = camera.get();
	const next = steppedZoom(view.zoom, direction);
	camera.set(zoomCameraAt(view, { x: box.width / 2, y: box.height / 2 }, next / view.zoom));
}

export function ZoomBar({
	camera,
	stage,
}: {
	camera: Slot<Camera>;
	stage: RefObject<HTMLElement | null>;
}): ReactElement {
	const zoom = usePicked(camera, (view) => view.zoom);

	return (
		<fieldset aria-label="Zoom" id="zoom">
			<button
				aria-label="Zoom out"
				className="pill-button"
				onClick={() => {
					stepZoom(camera, stage, "out");
				}}
				type="button"
			>
				<Icon name="minus" />
			</button>
			<output className="zoom-value">{zoomPercent(zoom)}</output>
			<button
				aria-label="Zoom in"
				className="pill-button"
				onClick={() => {
					stepZoom(camera, stage, "in");
				}}
				type="button"
			>
				<Icon name="plus" />
			</button>
		</fieldset>
	);
}
