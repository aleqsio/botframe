import { useRef, useState } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { Literal } from "../../../document/value";
import type { VariableType } from "../../../document/variable";
import { ColorInput } from "../ColorField";
import { DraftInput } from "../PropertyField";
import { ChoiceDropdown } from "./ChoiceDropdown";

export interface LiteralInputProps {
	label: string;
	type: VariableType;
	options: readonly string[];
	value: Literal;
	onChange: (value: Literal) => void;
	onOptions?: ((options: readonly string[]) => void) | undefined;
	anchor?: RefObject<Element | null> | undefined;
}

function numberOf(text: string): number | null {
	const value = Number(text);
	return text.trim() !== "" && Number.isFinite(value) ? value : null;
}

export function SelectBox({
	children,
	label,
	onChange,
	value,
}: {
	children: ReactNode;
	label: string;
	value: string;
	onChange: (value: string) => void;
}): ReactElement {
	return (
		<select
			aria-label={label}
			className="property-input value-select"
			onChange={(event) => {
				onChange(event.target.value);
			}}
			value={value}
		>
			{children}
		</select>
	);
}

function Select({
	options,
	...box
}: {
	label: string;
	options: readonly string[];
	value: string;
	onChange: (value: string) => void;
}): ReactElement {
	return (
		<SelectBox {...box}>
			{options.map((option) => (
				<option key={option} value={option}>
					{option}
				</option>
			))}
		</SelectBox>
	);
}

function ColorLiteral({ label, onChange, value }: LiteralInputProps): ReactElement {
	const [draft, setDraft] = useState<string | null>(null);
	const latest = useRef<string | null>(null);
	return (
		<span className="color-value">
			<ColorInput
				label={label}
				onChange={(text) => {
					latest.current = text;
					setDraft(text);
				}}
				onCommit={() => {
					if (latest.current !== null) {
						onChange(latest.current);
					}
					latest.current = null;
					setDraft(null);
				}}
				value={draft ?? String(value)}
			/>
		</span>
	);
}

function TextInput({ label, onChange, type, value }: LiteralInputProps): ReactElement {
	const numeric = type === "length" || type === "number";
	const input = (
		<DraftInput
			inputMode={numeric ? "numeric" : "text"}
			label={label}
			onCommit={(text) => {
				const next = numeric ? numberOf(text) : text;
				if (next !== null) {
					onChange(next);
				}
			}}
			value={String(value)}
		/>
	);
	return type === "length" ? (
		<span className="color-value">
			{input}
			<span aria-hidden="true" className="value-unit">
				px
			</span>
		</span>
	) : (
		input
	);
}

export function LiteralInput(props: LiteralInputProps): ReactElement {
	const { label, onChange, options, type, value } = props;
	if (type === "boolean") {
		return (
			<input
				aria-label={label}
				checked={value === true}
				className="value-check"
				onChange={(event) => {
					onChange(event.target.checked);
				}}
				type="checkbox"
			/>
		);
	}
	const { anchor } = props;
	if (type === "choice" && props.onOptions !== undefined && anchor !== undefined) {
		return (
			<ChoiceDropdown
				anchor={anchor}
				label={label}
				onChange={onChange}
				onOptions={props.onOptions}
				options={options}
				value={String(value)}
			/>
		);
	}
	if (type === "choice") {
		return <Select label={label} onChange={onChange} options={options} value={String(value)} />;
	}
	return type === "color" ? <ColorLiteral {...props} /> : <TextInput {...props} />;
}
