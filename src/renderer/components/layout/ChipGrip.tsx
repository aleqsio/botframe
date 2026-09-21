import { useRef } from "react";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	PointerEvent as ReactPointerEvent,
	ReactElement,
	RefObject,
} from "react";
import { modifiersOf } from "../../input/modifiers";
import type { Modifiers } from "../../input/modifiers";
import { stepOf } from "../../input/step";
import type { StepRule } from "../../input/step";
import { fieldEdit } from "../layerFields";
import type { LayerField } from "../layerFields";
import type { LayerEdit } from "../targets";
import { draggedValue } from "../numberValue";
import type { Bound } from "../numberValue";

const PRIMARY_BUTTON = 0;

const ARROW_SIGN: Readonly<Record<string, number>> = {
	ArrowRight: 1,
	ArrowUp: 1,
	ArrowLeft: -1,
	ArrowDown: -1,
};

interface ChipDrag {
	startValue: number;
	startX: number;
	x: number;
	modifiers: Modifiers;
	frame: number;
}

type DragRef = RefObject<ChipDrag | null>;

export interface ChipGripProps {
	label: string;
	name?: string | undefined;
	value: number;
	bound: Bound;
	step: StepRule;
	disabled?: boolean | undefined;
	onValue: (value: number) => void;
	onCommit: () => void;
}

interface ChipHandlers {
	onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPointerCancel: () => void;
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
	onPointerUp: () => void;
}

export function fieldGrip(
	field: LayerField,
	value: number,
	onPatch: (edit: LayerEdit) => void,
	onCommit: () => void,
): ChipGripProps {
	return {
		label: field.label,
		value,
		bound: field.bound,
		step: field.step,
		onValue: (next) => {
			onPatch(fieldEdit(field, next));
		},
		onCommit,
	};
}

function steppedValue(props: ChipGripProps, start: number, moved: number, held: Modifiers): number {
	return draggedValue({ start, moved, step: stepOf(props.step, held), bound: props.bound });
}

function draggedTo(drag: ChipDrag, props: ChipGripProps): number {
	return steppedValue(props, drag.startValue, drag.x - drag.startX, drag.modifiers);
}

function beginDrag(held: DragRef, props: ChipGripProps, event: ReactPointerEvent<HTMLElement>) {
	if (event.button !== PRIMARY_BUTTON || props.disabled === true) {
		return;
	}
	event.preventDefault();
	event.currentTarget.setPointerCapture(event.pointerId);
	held.current = {
		startValue: props.value,
		startX: event.clientX,
		x: event.clientX,
		modifiers: modifiersOf(event),
		frame: 0,
	};
}

function trackDrag(held: DragRef, props: ChipGripProps, event: ReactPointerEvent<HTMLElement>) {
	const drag = held.current;
	if (drag === null) {
		return;
	}
	drag.x = event.clientX;
	drag.modifiers = modifiersOf(event);
	if (drag.frame !== 0) {
		return;
	}
	drag.frame = requestAnimationFrame(() => {
		drag.frame = 0;
		props.onValue(draggedTo(drag, props));
	});
}

function endDrag(held: DragRef, props: ChipGripProps): void {
	const drag = held.current;
	if (drag === null) {
		return;
	}
	held.current = null;
	if (drag.frame !== 0) {
		cancelAnimationFrame(drag.frame);
	}
	if (drag.x === drag.startX) {
		return;
	}
	props.onValue(draggedTo(drag, props));
	props.onCommit();
}

export function steppedByKey(props: ChipGripProps, key: string, held: Modifiers): number | null {
	const sign = ARROW_SIGN[key];
	if (sign === undefined || props.disabled === true) {
		return null;
	}
	return steppedValue(props, props.value, sign, held);
}

function stepByKey(props: ChipGripProps, event: ReactKeyboardEvent<HTMLElement>): void {
	const next = steppedByKey(props, event.key, modifiersOf(event));
	if (next === null) {
		return;
	}
	event.preventDefault();
	props.onValue(next);
	props.onCommit();
}

function useChipHandlers(props: ChipGripProps): ChipHandlers {
	const held = useRef<ChipDrag | null>(null);

	return {
		onKeyDown: (event) => {
			stepByKey(props, event);
		},
		onPointerCancel: () => {
			endDrag(held, props);
		},
		onPointerDown: (event) => {
			beginDrag(held, props, event);
		},
		onPointerMove: (event) => {
			trackDrag(held, props, event);
		},
		onPointerUp: () => {
			endDrag(held, props);
		},
	};
}

export function ChipGrip(props: ChipGripProps): ReactElement {
	const { bound, disabled = false, label, name = label, value } = props;
	const handlers = useChipHandlers(props);

	return (
		<label className="chip-handle">
			<span className="chip-name">{label}</span>
			<input
				aria-label={name}
				aria-valuemax={bound.max}
				aria-valuemin={bound.min}
				aria-valuenow={value}
				className="chip-grip"
				disabled={disabled}
				max={bound.max}
				min={bound.min}
				onKeyDown={handlers.onKeyDown}
				onPointerCancel={handlers.onPointerCancel}
				onPointerDown={handlers.onPointerDown}
				onPointerMove={handlers.onPointerMove}
				onPointerUp={handlers.onPointerUp}
				readOnly
				step="any"
				tabIndex={0}
				type="range"
				value={value}
			/>
		</label>
	);
}
