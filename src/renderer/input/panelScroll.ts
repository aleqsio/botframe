export interface ScrollView {
	pointer: number;
	height: number;
	scrollTop: number;
	scrollHeight: number;
}

const EDGE = 36;
const MAX_STEP = 14;

function edgeSpeed(distance: number): number {
	if (distance >= EDGE) {
		return 0;
	}
	return MAX_STEP * Math.min((EDGE - distance) / EDGE, 1);
}

export function scrollStepOf(view: ScrollView): number {
	const room = view.scrollHeight - view.height;
	if (room <= 0) {
		return 0;
	}
	const up = Math.min(edgeSpeed(view.pointer), Math.max(view.scrollTop, 0));
	if (up > 0) {
		return -up;
	}
	const down = Math.min(edgeSpeed(view.height - view.pointer), room - view.scrollTop);
	return Math.max(down, 0);
}
