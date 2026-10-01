import { useState } from "react";
import type { ReactElement } from "react";

export function DraftInput({
	disabled = false,
	inputMode,
	label,
	onCommit,
	placeholder,
	value,
}: {
	disabled?: boolean | undefined;
	inputMode: "numeric" | "text";
	label: string;
	onCommit: (text: string) => void;
	placeholder?: string | undefined;
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
		<input
			aria-label={label}
			className="property-input"
			disabled={disabled}
			inputMode={inputMode}
			onBlur={commit}
			onChange={(event) => {
				setDraft(event.target.value);
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.currentTarget.blur();
				}
			}}
			placeholder={placeholder}
			value={draft ?? value}
		/>
	);
}

export function PropertyField({
	label,
	onCommit,
	value,
}: {
	label: string;
	onCommit: (text: string) => void;
	value: string;
}): ReactElement {
	return (
		<label className="property-field">
			<span className="property-label">{label}</span>
			<DraftInput inputMode="text" label={label} onCommit={onCommit} value={value} />
		</label>
	);
}
