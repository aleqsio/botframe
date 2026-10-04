import type {
	MouseEvent as ReactMouseEvent,
	PointerEvent as ReactPointerEvent,
	RefObject,
} from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import type { UserState } from "../state/userState";
import { COMMIT_MESSAGES } from "./layerCommand";
import { extendsSelection, modifiersOf } from "./modifiers";
import { scrollStepOf } from "./panelScroll";
import { carriedMove, carriedPlacement, rowMoveOf, rowTargetOf } from "./rowDrop";
import type { RowTarget, RowTree } from "./rowDrop";
import { rowHitAt } from "./rowHit";
import { usePointerDrag } from "./usePointerDrag";
import type { DragRules } from "./usePointerDrag";
import { selectIds, toggleSelected } from "./selection";

type RowPointerEvent = ReactPointerEvent<HTMLElement>;
type RowMouseEvent = ReactMouseEvent<HTMLElement>;

export interface RowHandlers {
	onClick: (event: RowMouseEvent, id: LayerId) => void;
	onContextMenu: (event: RowMouseEvent, id: LayerId) => void;
	onPointerCancel: (event: RowPointerEvent) => void;
	onPointerDown: (event: RowPointerEvent, id: LayerId) => void;
	onPointerMove: (event: RowPointerEvent) => void;
	onPointerUp: (event: RowPointerEvent) => void;
}

interface RowSession {
	doc: DesignDocument;
	user: UserState;
	panel: RefObject<HTMLElement | null>;
	pointer: Point;
}

function treeOf(doc: DesignDocument): RowTree {
	return {
		read: (id) => doc.layer(id),
		childIds: (parent) => doc.siblingIds(parent),
	};
}

function sameTarget(one: RowTarget | null, other: RowTarget | null): boolean {
	if (one === null || other === null) {
		return one === other;
	}
	return one.id === other.id && one.place === other.place;
}

function targetUnder(session: RowSession, dragged: LayerId): RowTarget | null {
	const tree = treeOf(session.doc);
	const hit = rowHitAt(session.pointer);
	if (hit === null) {
		return null;
	}
	const target = rowTargetOf(hit, tree.read);
	return rowMoveOf(dragged, target, tree) === null ? null : target;
}

function scrollPanel(session: RowSession): void {
	const panel = session.panel.current;
	if (panel === null) {
		return;
	}
	const box = panel.getBoundingClientRect();
	panel.scrollTop += scrollStepOf({
		pointer: session.pointer.y - box.top,
		height: panel.clientHeight,
		scrollTop: panel.scrollTop,
		scrollHeight: panel.scrollHeight,
	});
}

function stepDrag(session: RowSession): boolean {
	const drag = session.user.rowDrag.get();
	if (drag === null) {
		return false;
	}
	if (session.doc.layer(drag.id) === null) {
		session.user.rowDrag.set(null);
		return false;
	}
	scrollPanel(session);
	const target = targetUnder(session, drag.id);
	if (!sameTarget(drag.target, target)) {
		session.user.rowDrag.set({ id: drag.id, target });
	}
	return true;
}

function applyDrop(doc: DesignDocument, user: UserState): void {
	const drag = user.rowDrag.get();
	if (drag === null || drag.target === null) {
		return;
	}
	const move = rowMoveOf(drag.id, drag.target, treeOf(doc));
	if (move === null) {
		return;
	}
	const carried = carriedMove((id) => doc.layer(id), drag.id, move.parent);
	if (doc.move(drag.id, move.parent, move.index)) {
		if (carried !== null) {
			doc.update(drag.id, carriedPlacement(carried, doc.layer(drag.id) ?? carried.layer));
		}
		doc.commit(COMMIT_MESSAGES.move);
	}
}

function openRowMenu(user: UserState, event: RowMouseEvent, id: LayerId): void {
	event.preventDefault();
	if (!user.selection.get().includes(id)) {
		selectIds(user.selection, [id]);
	}
	user.menu.set({ client: { x: event.clientX, y: event.clientY }, layerIds: [] });
}

function rowClick(doc: DesignDocument, user: UserState, event: RowMouseEvent, id: LayerId): void {
	if (extendsSelection(modifiersOf(event))) {
		toggleSelected((layerId) => doc.layer(layerId), user.selection, id);
		return;
	}
	selectIds(user.selection, [id]);
}

function rowRules(
	doc: DesignDocument,
	user: UserState,
	panel: RefObject<HTMLElement | null>,
): DragRules<LayerId> {
	return {
		begin: (id) => {
			user.rowDrag.set({ id, target: null });
		},
		step: (_, pointer) => stepDrag({ doc, user, panel, pointer }),
		drop: () => {
			applyDrop(doc, user);
		},
		stop: () => {
			user.rowDrag.set(null);
		},
	};
}

export function useRowDrag(
	doc: DesignDocument,
	user: UserState,
	panel: RefObject<HTMLElement | null>,
): RowHandlers {
	const drag = usePointerDrag(rowRules(doc, user, panel));

	return {
		onClick: (event, id) => {
			if (!drag.dropped()) {
				rowClick(doc, user, event, id);
			}
		},
		onContextMenu: (event, id) => {
			if (drag.active()) {
				event.preventDefault();
				return;
			}
			openRowMenu(user, event, id);
		},
		onPointerCancel: drag.onPointerCancel,
		onPointerDown: drag.onPointerDown,
		onPointerMove: drag.onPointerMove,
		onPointerUp: drag.onPointerUp,
	};
}
