import type { Layer, LayerId } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Point, StagePoint } from "../state/camera";
import { rectMap, turnAbout } from "./affine";
import { framePlaced, groupOf, placeGroup } from "./group";
import type { Group } from "./group";
import { zoneAt } from "./handles";
import type { Handle, Zone } from "./handles";
import { COMMIT_MESSAGES } from "./layerCommand";
import { centerOf } from "./layerSpace";
import type { Placed } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { parentPointOf, selectedLayer } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizePatch, resizedRect, rotatedDegrees } from "./transform";

type Subject = { kind: "layer"; start: Layer } | { kind: "group"; group: Group };

type Resize = { kind: "resize"; subject: Subject; handle: Handle };
type Turn = { kind: "rotate"; subject: Subject; origin: Point };
type Grip = Resize | Turn;

interface Aim {
	subject: Subject;
	point: Point;
	zone: Zone | null;
}

function subjectOf(target: PointerTarget): Subject | null {
	const group = groupOf(target);
	if (group !== null) {
		return { kind: "group", group };
	}
	const start = selectedLayer(target);
	return start === null ? null : { kind: "layer", start };
}

function placedOf(subject: Subject): Placed {
	return subject.kind === "layer" ? subject.start : framePlaced(subject.group.frame);
}

function pointOf(target: PointerTarget, subject: Subject, canvas: Point): Point {
	return subject.kind === "layer" ? parentPointOf(target, subject.start.id, canvas) : canvas;
}

function aimAt(target: PointerTarget, canvas: Point): Aim | null {
	const subject = subjectOf(target);
	if (subject === null) {
		return null;
	}
	const point = pointOf(target, subject, canvas);
	const zone = zoneAt(placedOf(subject), point, target.user.camera.get().zoom);
	return { subject, point, zone };
}

function zoneUnder(target: PointerTarget, canvas: Point): Zone | null {
	return aimAt(target, canvas)?.zone ?? null;
}

function heldLayerId(target: PointerTarget, point: StagePoint): LayerId | null {
	if (target.user.selection.get().length > 1) {
		return null;
	}
	const aim = aimAt(target, point.canvas);
	if (aim === null || aim.zone === null || aim.subject.kind === "group") {
		return null;
	}
	return aim.subject.start.id;
}

function gripFor(aim: Aim | null): Grip | null {
	if (aim === null || aim.zone === null) {
		return null;
	}
	const { subject, point, zone } = aim;
	if (zone.mode === "rotate") {
		return { kind: "rotate", subject, origin: point };
	}
	return { kind: "resize", subject, handle: zone.handle };
}

function parentDisplayOf(target: PointerTarget, start: Layer): DisplayMode {
	const parent = start.parent === null ? null : target.doc.layer(start.parent);
	return parent?.layout.display ?? "block";
}

function applyResize(target: PointerTarget, grip: Resize, to: Point, modifiers: Modifiers): void {
	const { subject } = grip;
	const rect = resizedRect(placedOf(subject), grip.handle, to, modifiers);
	if (subject.kind === "layer") {
		const { start } = subject;
		target.doc.update(start.id, resizePatch(start, parentDisplayOf(target, start), rect));
		return;
	}
	placeGroup(target, subject.group, rectMap(subject.group.frame, rect), "resize");
}

function applyTurn(target: PointerTarget, grip: Turn, to: Point, modifiers: Modifiers): void {
	const { subject } = grip;
	const placed = placedOf(subject);
	const rotation = rotatedDegrees(placed, grip.origin, to, modifiers);
	if (subject.kind === "layer") {
		target.doc.update(subject.start.id, { rotation });
		return;
	}
	placeGroup(target, subject.group, turnAbout(centerOf(placed), rotation), "rotate");
}

function applyGrip(target: PointerTarget, grip: Grip, canvas: Point, modifiers: Modifiers): void {
	const to = pointOf(target, grip.subject, canvas);
	if (grip.kind === "resize") {
		applyResize(target, grip, to, modifiers);
		return;
	}
	applyTurn(target, grip, to, modifiers);
}

export function createHandleBehavior(): ToolBehavior {
	let held: Grip | null = null;

	function apply(target: PointerTarget, canvas: Point, modifiers: Modifiers): void {
		if (held !== null) {
			applyGrip(target, held, canvas, modifiers);
		}
	}

	return {
		hover(target, point) {
			return zoneUnder(target, point.canvas);
		},
		highlight: heldLayerId,
		tap(target, point) {
			return zoneUnder(target, point.canvas) !== null;
		},
		dragStart(target, origin, point, modifiers) {
			held = gripFor(aimAt(target, origin.canvas));
			apply(target, point.canvas, modifiers);
			return held !== null;
		},
		drag(target, point, modifiers) {
			apply(target, point.canvas, modifiers);
		},
		dragEnd(target, point, modifiers) {
			const grip = held;
			if (grip === null) {
				return;
			}
			apply(target, point.canvas, modifiers);
			held = null;
			target.doc.commit(COMMIT_MESSAGES[grip.kind]);
		},
	};
}
