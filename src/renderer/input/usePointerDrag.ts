import { useLayoutEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
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

export type PointerHandlers = Pick<
	DragHandlers<unknown>,
	"onPointerMove" | "onPointerUp" | "onPointerCancel"
>;

interface DragInput<Id> {
	recognizer: GestureRecognizer;
	id: Id | null;
	pointer: Point;
	frame: number;
	dropped: boolean;
}

type Rules<Id> = RefObject<DragRules<Id>>;

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

function schedule<Id>(input: DragInput<Id>, rules: Rules<Id>): void {
	if (input.frame !== 0) {
		return;
	}
	input.frame = requestAnimationFrame(() => {
		input.frame = 0;
		if (input.id !== null && rules.current.step(input.id, input.pointer)) {
			schedule(input, rules);
		}
	});
}

function tracked<Id>(input: DragInput<Id>, event: DragPointerEvent): boolean {
	if (!input.recognizer.tracks(event.pointerId)) {
		return false;
	}
	input.pointer = { x: event.clientX, y: event.clientY };
	return true;
}

function pointerDown<Id>(input: DragInput<Id>, event: DragPointerEvent, id: Id): void {
	if (event.button !== PRIMARY_BUTTON || !input.recognizer.down(sampleOf(event)).taken) {
		return;
	}
	input.dropped = false;
	input.id = id;
	input.pointer = { x: event.clientX, y: event.clientY };
}

function pointerMove<Id>(input: DragInput<Id>, rules: Rules<Id>, event: DragPointerEvent): void {
	const { id } = input;
	if (!tracked(input, event) || id === null) {
		return;
	}
	if (input.recognizer.move(sampleOf(event))?.kind === "dragStart") {
		event.currentTarget.setPointerCapture(event.pointerId);
		rules.current.begin(id);
		schedule(input, rules);
	}
}

function end<Id>(input: DragInput<Id>, rules: Rules<Id>, drop: boolean): void {
	if (input.frame !== 0) {
		cancelAnimationFrame(input.frame);
		input.frame = 0;
	}
	input.dropped = true;
	if (drop && input.id !== null) {
		rules.current.drop(input.id, input.pointer);
	}
	rules.current.stop();
}

export function usePointerDrag<Id>(rules: DragRules<Id>): DragHandlers<Id> {
	const held = useRef<DragInput<Id> | null>(null);
	const latest = useRef(rules);
	useLayoutEffect(() => {
		latest.current = rules;
	});
	const input = (): DragInput<Id> => (held.current ??= createInput<Id>());

	return {
		onPointerDown: (event, id) => {
			pointerDown(input(), event, id);
		},
		onPointerMove: (event) => {
			pointerMove(input(), latest, event);
		},
		onPointerUp: (event) => {
			const now = input();
			if (tracked(now, event) && now.recognizer.up(sampleOf(event))?.kind === "dragEnd") {
				end(now, latest, true);
			}
		},
		onPointerCancel: (event) => {
			const now = input();
			if (tracked(now, event) && now.recognizer.cancel(sampleOf(event)) !== null) {
				end(now, latest, false);
			}
		},
		dropped: () => {
			const now = input();
			const was = now.dropped;
			now.dropped = false;
			return was;
		},
		active: () => input().recognizer.active(),
	};
}
