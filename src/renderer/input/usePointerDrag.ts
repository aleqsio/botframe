import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point } from "../state/camera";
import { GestureRecognizer, sampleOf } from "./gesture";

type DragPointerEvent = ReactPointerEvent<HTMLElement>;

export interface DragRules<Id> {
	begin: (id: Id) => void;
	step: (id: Id, pointer: Point) => boolean;
	drop: (id: Id, pointer: Point) => void;
	stop: () => void;
}

export interface DragHandlers<Id> {
	onPointerDown: (event: DragPointerEvent, id: Id) => void;
	onPointerMove: (event: DragPointerEvent) => void;
	onPointerUp: (event: DragPointerEvent) => void;
	onPointerCancel: (event: DragPointerEvent) => void;
	dropped: () => boolean;
	active: () => boolean;
}

interface DragInput<Id> {
	recognizer: GestureRecognizer;
	id: Id | null;
	pointer: Point;
	frame: number;
	dropped: boolean;
}

interface DragSession<Id> {
	input: DragInput<Id>;
	rules: DragRules<Id>;
}

const PRIMARY_BUTTON = 0;

function createInput<Id>(): DragInput<Id> {
	return {
		recognizer: new GestureRecognizer(),
		id: null,
		pointer: { x: 0, y: 0 },
		frame: 0,
		dropped: false,
	};
}

function schedule<Id>(session: DragSession<Id>): void {
	const { input, rules } = session;
	if (input.frame !== 0) {
		return;
	}
	input.frame = requestAnimationFrame(() => {
		input.frame = 0;
		if (input.id !== null && rules.step(input.id, input.pointer)) {
			schedule(session);
		}
	});
}

function cancelFrame<Id>(input: DragInput<Id>): void {
	if (input.frame !== 0) {
		cancelAnimationFrame(input.frame);
		input.frame = 0;
	}
}

function tracked<Id>(session: DragSession<Id>, event: DragPointerEvent): boolean {
	if (!session.input.recognizer.tracks(event.pointerId)) {
		return false;
	}
	session.input.pointer = { x: event.clientX, y: event.clientY };
	return true;
}

function pointerDown<Id>(session: DragSession<Id>, event: DragPointerEvent, id: Id): void {
	if (event.button !== PRIMARY_BUTTON) {
		return;
	}
	const { input } = session;
	input.dropped = false;
	input.id = id;
	input.pointer = { x: event.clientX, y: event.clientY };
	input.recognizer.down(sampleOf(event));
}

function pointerMove<Id>(session: DragSession<Id>, event: DragPointerEvent): void {
	const id = session.input.id;
	if (!tracked(session, event) || id === null) {
		return;
	}
	if (session.input.recognizer.move(sampleOf(event))?.kind === "dragStart") {
		event.currentTarget.setPointerCapture(event.pointerId);
		session.rules.begin(id);
		schedule(session);
	}
}

function pointerUp<Id>(session: DragSession<Id>, event: DragPointerEvent): void {
	const { input, rules } = session;
	if (!tracked(session, event) || input.recognizer.up(sampleOf(event))?.kind !== "dragEnd") {
		return;
	}
	cancelFrame(input);
	input.dropped = true;
	if (input.id !== null) {
		rules.drop(input.id, input.pointer);
	}
	rules.stop();
}

function pointerCancel<Id>(session: DragSession<Id>, event: DragPointerEvent): void {
	const { input, rules } = session;
	if (!tracked(session, event) || input.recognizer.cancel(sampleOf(event)) === null) {
		return;
	}
	cancelFrame(input);
	input.dropped = true;
	rules.stop();
}

export function usePointerDrag<Id>(rules: DragRules<Id>): DragHandlers<Id> {
	const input = useRef<DragInput<Id> | null>(null);

	function session(): DragSession<Id> {
		input.current ??= createInput<Id>();
		return { input: input.current, rules };
	}

	return {
		onPointerDown: (event, id) => {
			pointerDown(session(), event, id);
		},
		onPointerMove: (event) => {
			pointerMove(session(), event);
		},
		onPointerUp: (event) => {
			pointerUp(session(), event);
		},
		onPointerCancel: (event) => {
			pointerCancel(session(), event);
		},
		dropped: () => {
			const held = session().input;
			const was = held.dropped;
			held.dropped = false;
			return was;
		},
		active: () => session().input.recognizer.active(),
	};
}
