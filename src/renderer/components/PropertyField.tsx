import { useState } from "react";
import type { ReactElement } from "react";
import { formatNumber } from "./layerFields";

export function PropertyField({
	label,
	onCommit,
	value,
}: {
	label: string;
	onCommit: (text: string) => void;
	value: string;
}): ReactElement {
	const [draft, setDraft] = useState<string | null>(null);

	function commit(): void {
		if (draft === null) {
			return;
		}
		setDraft(null);
		if (draft !== value) {
			onCommit(draft);
		}
	}

	return (
		<label className="property-field">
			<span className="property-label">{label}</span>
			<input
				className="property-input"
				onBlur={commit}
				onChange={(event) => {
					setDraft(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.currentTarget.blur();
					}
				}}
				value={draft ?? value}
			/>
		</label>
	);
}

export function NumberField({
	label,
	onCommit,
	value,
}: {
	label: string;
	onCommit: (value: number) => void;
	value: number;
}): ReactElement {
	return (
		<PropertyField
			label={label}
			onCommit={(text) => {
				const next = Number.parseFloat(text);
				if (Number.isFinite(next)) {
					onCommit(next);
				}
			}}
			value={formatNumber(value)}
		/>
	);
}
