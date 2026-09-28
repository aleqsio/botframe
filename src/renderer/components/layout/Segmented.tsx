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
	changed?: boolean | undefined;
}

export function Segmented<V extends string>({
	changed = false,
	label,
	onPick,
	options,
	value,
}: SegmentedProps<V>): ReactElement {
	return (
		<fieldset aria-label={label} className="layout-seg" data-changed={changed ? "" : undefined}>
			{options.map((option) => (
				<button
					aria-disabled={option.disabled}
					aria-pressed={option.value === value}
					className="layout-segment"
					key={option.value}
					onClick={() => {
						if (option.disabled !== true) {
							onPick(option.value);
						}
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
