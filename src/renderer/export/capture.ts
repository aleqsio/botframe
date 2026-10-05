import type { DesignDocument } from "../../document/document";
import { fileBytes } from "../../document/file";
import type { LayerId } from "../../document/layer";
import type { ExportFormat, ExportScene } from "../../shared/exportFile";
import { bridge } from "../bridge";
import { toCanvasPoint } from "../state/camera";
import type { UserState } from "../state/userState";

export interface ExportRequest {
	target: LayerId | null;
	format: ExportFormat;
	scale: number;
	longSide: number;
}

function visibleCanvas(user: UserState, request: ExportRequest): ExportScene["area"] {
	if (request.target !== null) {
		return null;
	}
	const stage = document.querySelector<HTMLElement>("#stage");
	if (stage === null) {
		return null;
	}
	const camera = user.camera.get();
	const at = toCanvasPoint(camera, { x: 0, y: 0 });
	return {
		...at,
		width: stage.clientWidth / camera.zoom,
		height: stage.clientHeight / camera.zoom,
	};
}

export function exportFile(
	doc: DesignDocument,
	user: UserState,
	request: ExportRequest,
): Promise<Uint8Array> {
	const area = visibleCanvas(user, request);
	const zoom = area === null ? 1 : user.camera.get().zoom;
	return bridge().renderExport({
		file: fileBytes(doc),
		format: request.format,
		target: request.target,
		area,
		scale: request.scale * zoom,
		longSide: request.longSide,
	});
}
