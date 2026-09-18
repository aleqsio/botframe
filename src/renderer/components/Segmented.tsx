import type { CSSProperties, ReactElement } from "react";

declare module "react" {
	interface CSSProperties {
		"--count"?: number | undefined;
		"--active"?: number | undefined;
	}
}

export interface SegmentOption<T extends string> {
	value: T;
	label: string;
}

export function Segmented<T extends string>({
	label,
	onPick,
	options,
	value,
}: {
	label: string;
	onPick: (value: T) => void;
	options: readonly SegmentOption<T>[];
	value: T;
}): ReactElement {
	const active = Math.max(
		0,
		options.findIndex((option) => option.value === value),
	);
	const style: CSSProperties = { "--count": options.length, "--active": active };

	return (
		<fieldset aria-label={label} className="segmented" style={style}>
			<span aria-hidden="true" className="segment-pill" />
			{options.map((option) => (
				<button
					aria-pressed={option.value === value}
					className="segment"
					key={option.value}
					onClick={() => {
						onPick(option.value);
					}}
					type="button"
				>
					{option.label}
				</button>
			))}
		</fieldset>
	);
}
