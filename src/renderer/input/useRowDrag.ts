import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import type { UserState } from "../state/userState";
import { GestureRecognizer, sampleOf } from "./gesture";
import { COMMIT_MESSAGES } from "./layerCommand";
import { scrollStepOf } from "./panelScroll";
import { carriedPosition, rowMoveOf } from "./rowDrop";
import type { RowTarget, RowTree } from "./rowDrop";
import { rowTargetAt } from "./rowHit";

type RowPointerEvent = ReactPointerEvent<HTMLElement>;

export interface RowHandlers {
	onClick: (id: LayerId) => void;
	onPointerCancel: (event: RowPointerEvent) => void;
	onPointerDown: (event: RowPointerEvent, id: LayerId) => void;
	onPointerMove: (event: RowPointerEvent) => void;
	onPointerUp: (event: RowPointerEvent) => void;
}

interface RowInput {
	recognizer: GestureRecognizer;
	row: LayerId | null;
	pointer: Point;
	frame: number;
	dropped: boolean;
}

interface RowSession {
	input: RowInput;
	doc: DesignDocument;
	user: UserState;
	panel: RefObject<HTMLElement | null>;
}

function createRowInput(): RowInput {
	return {
		recognizer: new GestureRecognizer(),
		row: null,
		pointer: { x: 0, y: 0 },
		frame: 0,
		dropped: false,
	};
}

const PRIMARY_BUTTON = 0;

function treeOf(doc: DesignDocument): RowTree {
	return {
		read: (id) => doc.layer(id),
		childIds: (parent) => (parent === null ? doc.rootIds() : doc.childIds(parent)),
	};
}

function sameTarget(one: RowTarget | null, other: RowTarget | null): boolean {
	if (one === null || other === null) {
		return one === other;
	}
	return one.id === other.id && one.place === other.place;
}

function targetUnder(session: RowSession, dragged: LayerId): RowTarget | null {
	const target = rowTargetAt(session.input.pointer);
	if (target === null || rowMoveOf(dragged, target, treeOf(session.doc)) === null) {
		return null;
	}
	return target;
}

function scrollPanel(session: RowSession): void {
	const panel = session.panel.current;
	if (panel === null) {
		return;
	}
	const box = panel.getBoundingClientRect();
	panel.scrollTop += scrollStepOf({
		pointer: session.input.pointer.y - box.top,
		height: panel.clientHeight,
		scrollTop: panel.scrollTop,
		scrollHeight: panel.scrollHeight,
	});
}

function scheduleDrag(session: RowSession): void {
	if (session.input.frame !== 0) {
		return;
	}
	session.input.frame = requestAnimationFrame(() => {
		stepDrag(session);
	});
}

function stepDrag(session: RowSession): void {
	session.input.frame = 0;
	const drag = session.user.rowDrag.get();
	if (drag === null) {
		return;
	}
	if (session.doc.layer(drag.id) === null) {
		session.user.rowDrag.set(null);
		return;
	}
	scrollPanel(session);
	const target = targetUnder(session, drag.id);
	if (!sameTarget(drag.target, target)) {
		session.user.rowDrag.set({ id: drag.id, target });
	}
	scheduleDrag(session);
}

function stopDrag(session: RowSession): void {
	if (session.input.frame !== 0) {
		cancelAnimationFrame(session.input.frame);
		session.input.frame = 0;
	}
	session.user.rowDrag.set(null);
}

function applyDrop(session: RowSession): void {
	const drag = session.user.rowDrag.get();
	stopDrag(session);
	if (drag === null || drag.target === null) {
		return;
	}
	const move = rowMoveOf(drag.id, drag.target, treeOf(session.doc));
	if (move === null) {
		return;
	}
	const carried = carriedPosition((id) => session.doc.layer(id), drag.id, move.parent);
	if (session.doc.move(drag.id, move.parent, move.index)) {
		if (carried !== null) {
			session.doc.update(drag.id, carried);
		}
		session.doc.commit(COMMIT_MESSAGES.move);
	}
}

function trackPointer(session: RowSession, event: RowPointerEvent): boolean {
	if (!session.input.recognizer.tracks(event.pointerId)) {
		return false;
	}
	session.input.pointer = { x: event.clientX, y: event.clientY };
	return true;
}

function beginDrag(session: RowSession): void {
	const id = session.input.row;
	if (id === null) {
		return;
	}
	session.user.rowDrag.set({ id, target: null });
	scheduleDrag(session);
}

function pointerDown(session: RowSession, event: RowPointerEvent, id: LayerId): void {
	if (event.button !== PRIMARY_BUTTON) {
		return;
	}
	session.input.dropped = false;
	session.input.row = id;
	session.input.pointer = { x: event.clientX, y: event.clientY };
	if (session.input.recognizer.down(sampleOf(event)).taken) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
}

function pointerMove(session: RowSession, event: RowPointerEvent): void {
	if (!trackPointer(session, event)) {
		return;
	}
	if (session.input.recognizer.move(sampleOf(event))?.kind === "dragStart") {
		beginDrag(session);
	}
}

function pointerUp(session: RowSession, event: RowPointerEvent): void {
	if (!trackPointer(session, event)) {
		return;
	}
	if (session.input.recognizer.up(sampleOf(event))?.kind === "dragEnd") {
		session.input.dropped = true;
		applyDrop(session);
	}
}

function pointerCancel(session: RowSession, event: RowPointerEvent): void {
	if (!trackPointer(session, event)) {
		return;
	}
	if (session.input.recognizer.cancel(sampleOf(event)) !== null) {
		session.input.dropped = true;
		stopDrag(session);
	}
}

function rowClick(session: RowSession, id: LayerId): void {
	if (session.input.dropped) {
		session.input.dropped = false;
		return;
	}
	session.user.selection.set([id]);
}

export function useRowDrag(
	doc: DesignDocument,
	user: UserState,
	panel: RefObject<HTMLElement | null>,
): RowHandlers {
	const input = useRef<RowInput | null>(null);

	function session(): RowSession {
		return { input: (input.current ??= createRowInput()), doc, user, panel };
	}

	return {
		onClick: (id) => {
			rowClick(session(), id);
		},
		onPointerCancel: (event) => {
			pointerCancel(session(), event);
		},
		onPointerDown: (event, id) => {
			pointerDown(session(), event, id);
		},
		onPointerMove: (event) => {
			pointerMove(session(), event);
		},
		onPointerUp: (event) => {
			pointerUp(session(), event);
		},
	};
}
