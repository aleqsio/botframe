import { flushSync } from "react-dom";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { gradientText } from "../../../document/paint";
import type { Gradient } from "../../../document/paint";
import { slotsOf } from "../variables/reach";
import { heldRatio } from "../color";
import { stopAdded, stopMoved } from "./stops";
import type { EditedStop } from "./stops";

const PERCENT = 100;
const SMALL_STEP = 0.01;
const LARGE_STEP = 0.1;
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

export interface StopPick {
	gradient: Gradient;
	selected: number;
	onSelect: (index: number) => void;
}

interface BarProps extends StopPick {
	onWrite: (edited: EditedStop) => void;
	onCommit: () => void;
}

function percentText(position: number): string {
	return `${Math.round(position * PERCENT)}%`;
}

function ratioIn(event: ReactPointerEvent<HTMLElement>): number {
	const box = event.currentTarget.getBoundingClientRect();
	return heldRatio((event.clientX - box.left) / box.width);
}

function handleIndex(target: EventTarget): number | null {
	const text = target instanceof HTMLElement ? target.dataset["index"] : undefined;
	return text === undefined ? null : Number(text);
}

function StopHandle({
	gradient,
	index,
	onCommit,
	onWrite,
	selected,
}: BarProps & { index: number }): ReactElement | null {
	const stop = gradient.stops[index];
	if (stop === undefined) {
		return null;
	}
	return (
		<button
			aria-label={`Stop ${index + 1} at ${percentText(stop.position)}`}
			aria-pressed={index === selected}
			className="gradient-handle"
			data-index={index}
			onKeyDown={(event) => {
				const step = KEY_STEPS[event.key];
				if (step === undefined) {
					return;
				}
				event.preventDefault();
				const size = event.shiftKey ? LARGE_STEP : SMALL_STEP;
				const moved = stopMoved(gradient, index, stop.position + step * size);
				const bar = event.currentTarget.parentElement;
				flushSync(() => {
					onWrite(moved);
				});
				onCommit();
				bar?.querySelector<HTMLElement>(`[data-index="${moved.index}"]`)?.focus();
			}}
			style={{ left: percentText(stop.position), background: stop.color }}
			type="button"
		/>
	);
}

export function GradientBar(props: BarProps): ReactElement {
	const { gradient, onCommit, onSelect, onWrite, selected } = props;
	const track = gradientText({ shape: "linear", angle: 90, stops: gradient.stops });

	return (
		<div
			className="gradient-bar"
			onPointerCancel={onCommit}
			onPointerDown={(event) => {
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				const index = handleIndex(event.target);
				if (index === null) {
					onWrite(stopAdded(gradient, ratioIn(event)));
				} else {
					onSelect(index);
				}
			}}
			onPointerMove={(event) => {
				if (event.currentTarget.hasPointerCapture(event.pointerId)) {
					onWrite(stopMoved(gradient, selected, ratioIn(event)));
				}
			}}
			onPointerUp={(event) => {
				event.currentTarget.releasePointerCapture(event.pointerId);
				onCommit();
			}}
			role="presentation"
		>
			<span className="gradient-track" style={{ background: track }} />
			{gradient.stops.map((_, index) => (
				<StopHandle {...props} index={index} key={slotsOf(gradient.stops.length)[index]} />
			))}
		</div>
	);
}
