import { useRef } from "react";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	PointerEvent as ReactPointerEvent,
	ReactElement,
	RefObject,
} from "react";
import type { LayerPatch } from "../../../document/layer";
import { modifiersOf } from "../../input/modifiers";
import type { Modifiers } from "../../input/modifiers";
import { stepOf } from "../../input/step";
import { fieldPatch } from "../layerFields";
import type { LayerField } from "../layerFields";
import { draggedValue } from "../numberValue";

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
	field: LayerField;
	value: number;
	onPatch: (patch: LayerPatch) => void;
	onCommit: () => void;
}

interface ChipHandlers {
	onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPointerCancel: () => void;
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
	onPointerUp: () => void;
}

function steppedValue(field: LayerField, start: number, moved: number, held: Modifiers): number {
	return draggedValue({ start, moved, step: stepOf(field.step, held), bound: field.bound });
}

function draggedTo(drag: ChipDrag, field: LayerField): number {
	return steppedValue(field, drag.startValue, drag.x - drag.startX, drag.modifiers);
}

function applyValue(props: ChipGripProps, value: number): void {
	props.onPatch(fieldPatch(props.field, value));
}

function beginDrag(held: DragRef, props: ChipGripProps, event: ReactPointerEvent<HTMLElement>) {
	if (event.button !== PRIMARY_BUTTON) {
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
		applyValue(props, draggedTo(drag, props.field));
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
	applyValue(props, draggedTo(drag, props.field));
	props.onCommit();
}

function stepByKey(props: ChipGripProps, event: ReactKeyboardEvent<HTMLElement>): void {
	const sign = ARROW_SIGN[event.key];
	if (sign === undefined) {
		return;
	}
	event.preventDefault();
	applyValue(props, steppedValue(props.field, props.value, sign, modifiersOf(event)));
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
	const { field, value } = props;
	const handlers = useChipHandlers(props);

	return (
		<label className="chip-handle">
			<span className="chip-name">{field.label}</span>
			<input
				aria-label={field.label}
				aria-valuemax={field.bound.max}
				aria-valuemin={field.bound.min}
				aria-valuenow={value}
				className="chip-grip"
				max={field.bound.max}
				min={field.bound.min}
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
