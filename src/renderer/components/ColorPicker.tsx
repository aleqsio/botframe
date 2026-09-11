import { useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { formatColor, heldRatio, hueText, parseColor, steppedHsva, toHsva, toRgba } from "./color";
import type { Hsva, Rgba } from "./color";

const FULL_TURN = 360;
const PERCENT = 100;
const SMALL_STEP = 0.01;
const LARGE_STEP = 0.1;

const SWATCHES: readonly string[] = [
	"#000000",
	"#ffffff",
	"#d9d9d9",
	"#ff3b30",
	"#ff9500",
	"#ffcc00",
	"#34c759",
	"#0d99ff",
	"#af52de",
];

export interface ColorPickerProps {
	color: Rgba;
	onChange: (color: Rgba) => void;
	onCommit: () => void;
}

interface AreaProps {
	color: Hsva;
	onMove: (color: Hsva) => void;
	onCommit: () => void;
}

interface SliderProps {
	label: string;
	className: string;
	max: number;
	value: number;
	onInput: (value: number) => void;
	onCommit: () => void;
}

interface Ratio {
	across: number;
	down: number;
}

function ratioIn(element: HTMLElement, event: ReactPointerEvent<HTMLElement>): Ratio {
	const box = element.getBoundingClientRect();
	return {
		across: heldRatio((event.clientX - box.left) / box.width),
		down: heldRatio((event.clientY - box.top) / box.height),
	};
}

function percentOf(ratio: number): string {
	return `${Math.round(ratio * PERCENT)}%`;
}

function SaturationArea({ color, onCommit, onMove }: AreaProps): ReactElement {
	function moveTo(event: ReactPointerEvent<HTMLElement>): void {
		const ratio = ratioIn(event.currentTarget, event);
		onMove({ ...color, s: ratio.across, v: 1 - ratio.down });
	}

	return (
		<button
			aria-label={`Saturation and brightness, ${percentOf(color.s)} and ${percentOf(color.v)}`}
			className="color-area"
			onKeyDown={(event) => {
				const next = steppedHsva(color, event.key, event.shiftKey ? LARGE_STEP : SMALL_STEP);
				if (next === null) {
					return;
				}
				event.preventDefault();
				onMove(next);
				onCommit();
			}}
			onPointerDown={(event) => {
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				moveTo(event);
			}}
			onPointerMove={(event) => {
				if (event.currentTarget.hasPointerCapture(event.pointerId)) {
					moveTo(event);
				}
			}}
			onPointerUp={(event) => {
				event.currentTarget.releasePointerCapture(event.pointerId);
				onCommit();
			}}
			style={{ backgroundColor: hueText(color.h) }}
			type="button"
		>
			<span
				className="color-thumb"
				style={{
					left: percentOf(color.s),
					top: percentOf(1 - color.v),
					background: formatColor(toRgba(color)),
				}}
			/>
		</button>
	);
}

function ChannelSlider({
	className,
	label,
	max,
	onCommit,
	onInput,
	value,
}: SliderProps): ReactElement {
	return (
		<input
			aria-label={label}
			className={`color-slider ${className}`}
			max={max}
			min={0}
			onChange={(event) => {
				onInput(Number(event.target.value));
			}}
			onKeyUp={onCommit}
			onPointerUp={onCommit}
			step={1}
			type="range"
			value={value}
		/>
	);
}

function SwatchRow({ onPick }: { onPick: (text: string) => void }): ReactElement {
	return (
		<div className="color-swatches">
			{SWATCHES.map((text) => (
				<button
					aria-label={text}
					className="color-preset"
					key={text}
					onClick={() => {
						onPick(text);
					}}
					style={{ background: text }}
					type="button"
				/>
			))}
		</div>
	);
}

function heldHsva(draft: Hsva | null, color: Rgba): Hsva {
	if (draft !== null && formatColor(toRgba(draft)) === formatColor(color)) {
		return draft;
	}
	return toHsva(color);
}

export function ColorPicker({ color, onChange, onCommit }: ColorPickerProps): ReactElement {
	const [draft, setDraft] = useState<Hsva | null>(null);
	const hsva = heldHsva(draft, color);

	function write(next: Hsva): void {
		setDraft(next);
		onChange(toRgba(next));
	}

	return (
		<div className="color-picker">
			<SaturationArea color={hsva} onCommit={onCommit} onMove={write} />
			<ChannelSlider
				className="hue-slider"
				label="Hue"
				max={FULL_TURN}
				onCommit={onCommit}
				onInput={(hue) => {
					write({ ...hsva, h: hue });
				}}
				value={Math.round(hsva.h)}
			/>
			<div className="alpha-track" style={{ color: formatColor({ ...color, a: 1 }) }}>
				<ChannelSlider
					className="alpha-slider"
					label="Opacity"
					max={PERCENT}
					onCommit={onCommit}
					onInput={(alpha) => {
						write({ ...hsva, a: alpha / PERCENT });
					}}
					value={Math.round(color.a * PERCENT)}
				/>
			</div>
			<SwatchRow
				onPick={(text) => {
					const picked = parseColor(text);
					if (picked === null) {
						return;
					}
					onChange({ ...picked, a: color.a });
					onCommit();
				}}
			/>
		</div>
	);
}
