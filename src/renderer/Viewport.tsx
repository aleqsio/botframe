import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cameraTransform } from "./state/camera";
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

export function Viewport({
	camera,
	children,
}: {
	camera: Slot<Camera>;
	children: ReactNode;
}): ReactElement {
	const view = useSlot(camera);

	return (
		<div id="viewport" style={viewportStyle(view)}>
			{children}
		</div>
	);
}
