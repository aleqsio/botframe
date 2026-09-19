import type { ReactElement, ReactNode } from "react";

export interface SegmentOption<V extends string> {
	value: V;
	label: string;
	icon?: ReactNode | undefined;
	title?: string | undefined;
	disabled?: boolean | undefined;
}

export interface SegmentedProps<V extends string> {
	label: string;
	options: readonly SegmentOption<V>[];
	value: V;
	onPick: (value: V) => void;
}

export function Segmented<V extends string>({
	label,
	onPick,
	options,
	value,
}: SegmentedProps<V>): ReactElement {
	return (
		<fieldset aria-label={label} className="layout-seg">
			{options.map((option) => (
				<button
					aria-pressed={option.value === value}
					className="layout-segment"
					disabled={option.disabled}
					key={option.value}
					onClick={() => {
						onPick(option.value);
					}}
					title={option.title}
					type="button"
				>
					{option.icon}
					<span>{option.label}</span>
				</button>
			))}
		</fieldset>
	);
}
