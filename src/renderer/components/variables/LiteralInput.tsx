import type { ReactElement, ReactNode, RefObject } from "react";
import type { Literal } from "../../../document/value";
import type { VariableType } from "../../../document/variable";
import { DraftInput } from "../PropertyField";
import { ChoiceDropdown } from "./ChoiceDropdown";
import { isColor } from "./reach";

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

function TextInput({ label, onChange, type, value }: LiteralInputProps): ReactElement {
	const numeric = type === "length" || type === "number";
	return (
		<>
			{isColor(value) && type === "color" ? (
				<span aria-hidden="true" className="value-swatch" style={{ background: value }} />
			) : null}
			<DraftInput
				inputMode={numeric ? "numeric" : "text"}
				label={label}
				onCommit={(text) => {
					const next = numeric ? numberOf(text) : text;
					if (next !== null && (type !== "color" || CSS.supports("color", text))) {
						onChange(next);
					}
				}}
				value={String(value)}
			/>
		</>
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
	return <TextInput {...props} />;
}
