import { CENTER_ORIGIN } from "../../document/layer";
import type { Layer, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { CORNERS, zoneAt } from "./handles";
import type { Corner, Handle, HandleZone } from "./handles";
import {
	chainTurn,
	fromParentPoint,
	normalizeDegrees,
	parentChain,
	placedAround,
	toParentPoint,
	visualCenterOf,
} from "./layerSpace";
import type { Placed, ReadLayer } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { boundsOf } from "./selectionBounds";
import { MIN_LAYER_SIZE, resizedRect } from "./transform";

const QUARTER_TURN = 90;
const TURN_GRACE = 1e-6;

export interface GroupPart {
	start: Layer;
	chain: readonly Layer[];
	center: Point;
	turn: number;
}

export interface GroupGrip {
	box: Rect;
	handle: Handle;
	parts: readonly GroupPart[];
}

function flatBox(box: Rect): Placed {
	return { ...box, rotation: 0, origin: CENTER_ORIGIN };
}

function isCorner(handle: Handle): handle is Corner {
	return CORNERS.some((corner) => corner === handle);
}

function quarterTurnsOf(turn: number): number {
	return normalizeDegrees(turn) / QUARTER_TURN;
}

function isSquare(part: GroupPart): boolean {
	const turns = quarterTurnsOf(part.turn);
	return Math.abs(turns - Math.round(turns)) < TURN_GRACE;
}

function isAcross(part: GroupPart): boolean {
	return Math.round(quarterTurnsOf(part.turn)) % 2 === 1;
}

export function partOf(read: ReadLayer, id: LayerId): GroupPart[] {
	const start = read(id);
	if (start === null) {
		return [];
	}
	const chain = parentChain(read, id);
	const center = fromParentPoint(chain, visualCenterOf(start));
	return [{ start, chain, center, turn: chainTurn(chain) + start.rotation }];
}

function honors(handle: Handle, parts: readonly GroupPart[]): boolean {
	return isCorner(handle) || parts.every((part) => isSquare(part));
}

export interface BoxZone {
	box: Rect;
	zone: HandleZone;
}

export function groupZoneAt(
	read: ReadLayer,
	ids: readonly LayerId[],
	point: Point,
	zoom: number,
): BoxZone | null {
	const box = boundsOf(read, ids);
	const zone = box === null ? null : zoneAt(flatBox(box), point, zoom);
	return box === null || zone === null ? null : { box, zone };
}

export function groupGripOf(
	read: ReadLayer,
	ids: readonly LayerId[],
	point: Point,
	zoom: number,
): GroupGrip | null {
	const aim = groupZoneAt(read, ids, point, zoom);
	if (aim === null || aim.zone.mode === "rotate") {
		return null;
	}
	const { box, zone } = aim;
	const parts = ids.flatMap((id) => partOf(read, id));
	return honors(zone.handle, parts) ? { box, handle: zone.handle, parts } : null;
}

function ratio(next: number, start: number): number {
	return start === 0 ? 1 : next / start;
}

function scaleOf(grip: GroupGrip, next: Rect): Point {
	return { x: ratio(next.width, grip.box.width), y: ratio(next.height, grip.box.height) };
}

function mapped(grip: GroupGrip, next: Rect, scale: Point, point: Point): Point {
	return {
		x: next.x + (point.x - grip.box.x) * scale.x,
		y: next.y + (point.y - grip.box.y) * scale.y,
	};
}

function partRect(part: GroupPart, scale: Point, center: Point): Rect {
	const along = isAcross(part) ? { x: scale.y, y: scale.x } : scale;
	const size = {
		width: Math.max(part.start.width * along.x, MIN_LAYER_SIZE),
		height: Math.max(part.start.height * along.y, MIN_LAYER_SIZE),
	};
	const place = placedAround({ ...part.start, ...size }, toParentPoint(part.chain, center));
	return { ...place, ...size };
}

export interface PartRect {
	start: Layer;
	rect: Rect;
}

export function groupResized(grip: GroupGrip, point: Point, modifiers: Modifiers): PartRect[] {
	const next = resizedRect(flatBox(grip.box), grip.handle, point, {
		...modifiers,
		shift: isCorner(grip.handle) || modifiers.shift,
	});
	const scale = scaleOf(grip, next);
	return grip.parts.map((part) => ({
		start: part.start,
		rect: partRect(part, scale, mapped(grip, next, scale, part.center)),
	}));
}
