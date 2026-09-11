import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cameraTransform, dotGrid } from "./state/camera";
import type { Camera } from "./state/camera";
import type { Slot } from "./state/slot";
import { useSlot } from "./state/useSlot";

declare module "react" {
	interface CSSProperties {
		"--zoom"?: number | undefined;
	}
}

function viewportStyle(camera: Camera): CSSProperties {
	return { transform: cameraTransform(camera), "--zoom": camera.zoom };
}

function dotGridStyle(camera: Camera): CSSProperties {
	const { spacing, offset } = dotGrid(camera);
	return {
		backgroundPosition: `${offset.x}px ${offset.y}px`,
		backgroundSize: `${spacing}px ${spacing}px`,
	};
}

export function Viewport({
	camera,
	children,
}: {
	camera: Slot<Camera>;
	children: ReactNode;
}): ReactElement {
	const view = useSlot(camera);

	return (
		<>
			<div id="dot-grid" style={dotGridStyle(view)} />
			<div id="viewport" style={viewportStyle(view)}>
				{children}
			</div>
		</>
	);
}
