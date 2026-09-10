import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import type { Point } from "../state/camera";
import { normalizeDegrees } from "./layerSpace";
import { ROTATE_STEP_SHIFT, scaledRect } from "./transform";

export const NUDGE_STEP = 1;
export const NUDGE_STEP_SHIFT = 10;
export const TURN_STEP = 1;
export const SCALE_STEP = 0.05;
export const SCALE_STEP_SHIFT = 0.2;

export type LayerCommand =
	| { kind: "move"; by: Point }
	| { kind: "resize"; factor: number }
	| { kind: "rotate"; degrees: number };

export interface KeyStroke {
	key: string;
	shiftKey: boolean;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
}

export const COMMIT_MESSAGES: Readonly<Record<LayerCommand["kind"], string>> = {
	move: "move layer",
	resize: "resize layer",
	rotate: "rotate layer",
};

const NUDGE_KEYS: Readonly<Record<string, Point>> = {
	ArrowLeft: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
	ArrowUp: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 },
};

const TURN_KEYS: Readonly<Record<string, number>> = {
	"[": -1,
	"{": -1,
	"]": 1,
	"}": 1,
};

const SCALE_KEYS: Readonly<Record<string, number>> = {
	"=": 1,
	"+": 1,
	"-": -1,
	_: -1,
};

function isAccelerator(stroke: KeyStroke): boolean {
	return stroke.metaKey || (stroke.ctrlKey && !stroke.altKey);
}

export function commandFor(stroke: KeyStroke): LayerCommand | null {
	if (isAccelerator(stroke)) {
		return null;
	}
	const nudge = NUDGE_KEYS[stroke.key];
	if (nudge !== undefined) {
		const step = stroke.shiftKey ? NUDGE_STEP_SHIFT : NUDGE_STEP;
		return { kind: "move", by: { x: nudge.x * step, y: nudge.y * step } };
	}
	const turn = TURN_KEYS[stroke.key];
	if (turn !== undefined) {
		return { kind: "rotate", degrees: turn * (stroke.shiftKey ? ROTATE_STEP_SHIFT : TURN_STEP) };
	}
	const scale = SCALE_KEYS[stroke.key];
	if (scale === undefined) {
		return null;
	}
	return { kind: "resize", factor: 1 + scale * (stroke.shiftKey ? SCALE_STEP_SHIFT : SCALE_STEP) };
}

export function applyCommand(doc: DesignDocument, layer: Layer, command: LayerCommand): void {
	switch (command.kind) {
		case "move": {
			doc.update(layer.id, { x: layer.x + command.by.x, y: layer.y + command.by.y });
			break;
		}
		case "resize": {
			doc.update(layer.id, scaledRect(layer, command.factor));
			break;
		}
		case "rotate": {
			doc.update(layer.id, { rotation: normalizeDegrees(layer.rotation + command.degrees) });
			break;
		}
	}
}
