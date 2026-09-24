import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import type { Point } from "../state/camera";
import { parentChain, turnedOnScreen } from "./layerSpace";
import { modifiersOf } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { ANGLE_STEP, FACTOR_STEP, LENGTH_STEP, stepOf } from "./step";
import { scaledRect } from "./transform";

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

export const SKEW_MESSAGE = "skew layer";

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

function withoutLayoutAlt(modifiers: Modifiers): Modifiers {
	return { ...modifiers, alt: false };
}

export function commandFor(stroke: KeyStroke): LayerCommand | null {
	if (isAccelerator(stroke)) {
		return null;
	}
	const modifiers = modifiersOf(stroke);
	const nudge = NUDGE_KEYS[stroke.key];
	if (nudge !== undefined) {
		const step = stepOf(LENGTH_STEP, modifiers);
		return { kind: "move", by: { x: nudge.x * step, y: nudge.y * step } };
	}
	const turn = TURN_KEYS[stroke.key];
	if (turn !== undefined) {
		return { kind: "rotate", degrees: turn * stepOf(ANGLE_STEP, withoutLayoutAlt(modifiers)) };
	}
	const scale = SCALE_KEYS[stroke.key];
	if (scale === undefined) {
		return null;
	}
	return { kind: "resize", factor: 1 + scale * stepOf(FACTOR_STEP, modifiers) };
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
			const parents = parentChain((id) => doc.layer(id), layer.id);
			const rotation = turnedOnScreen(parents, layer.rotation, command.degrees);
			doc.update(layer.id, { rotation });
			break;
		}
	}
}
