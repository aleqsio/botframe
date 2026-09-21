import type { CSSProperties } from "react";
import { roundNumber } from "../document/length";
import { normalizeDegrees, outOfLayer } from "./input/layerSpace";
import type { Placed } from "./input/layerSpace";

const QUARTER_TURN = 90;
const HALF_TURN = 180;
const THREE_QUARTER_TURN = 270;
const GAP = "var(--layout-space-2)";
const ABOVE_THE_EDGE = `translateY(calc(-100% - ${GAP}))`;
const BELOW_THE_EDGE = `translate(-100%, ${GAP})`;

function readsUpsideDown(turn: number): boolean {
	return turn > QUARTER_TURN && turn < THREE_QUARTER_TURN;
}

export function canvasLabelStyle(layer: Placed): CSSProperties {
	const corner = outOfLayer(layer, { x: 0, y: 0 });
	const turn = normalizeDegrees(layer.rotation);
	const flipped = readsUpsideDown(turn);
	return {
		translate: `${roundNumber(corner.x)}px ${roundNumber(corner.y)}px`,
		rotate: `${flipped ? normalizeDegrees(turn + HALF_TURN) : turn}deg`,
		transform: flipped ? BELOW_THE_EDGE : ABOVE_THE_EDGE,
		maxWidth: `calc(${layer.width}px * var(--zoom))`,
	};
}
