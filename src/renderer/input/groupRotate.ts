import type { Layer } from "../../document/layer";
import type { Point } from "../state/camera";
import type { GroupPart } from "./groupResize";
import {
	angleFrom,
	normalizeDegrees,
	placedAround,
	rotatePoint,
	toParentPoint,
} from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { ANGLE_SNAP, stepOf } from "./step";

export interface GroupTurn {
	pivot: Point;
	from: Point;
	parts: readonly GroupPart[];
}

export interface TurnedPart {
	start: Layer;
	place: Point;
	rotation: number;
}

function turnOf(turn: GroupTurn, point: Point, modifiers: Modifiers): number {
	const turned = angleFrom(turn.pivot, point) - angleFrom(turn.pivot, turn.from);
	const step = stepOf(ANGLE_SNAP, modifiers);
	return step === 0 ? turned : Math.round(turned / step) * step;
}

function turnedAbout(pivot: Point, point: Point, degrees: number): Point {
	const turned = rotatePoint({ x: point.x - pivot.x, y: point.y - pivot.y }, degrees);
	return { x: pivot.x + turned.x, y: pivot.y + turned.y };
}

export function groupTurned(turn: GroupTurn, point: Point, modifiers: Modifiers): TurnedPart[] {
	const degrees = turnOf(turn, point, modifiers);
	return turn.parts.map(({ start, chain, center }) => {
		const rotation = normalizeDegrees(start.rotation + degrees);
		const moved = toParentPoint(chain, turnedAbout(turn.pivot, center, degrees));
		return { start, rotation, place: placedAround({ ...start, rotation }, moved) };
	});
}
