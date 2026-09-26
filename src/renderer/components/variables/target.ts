import type { Literal, VariableValue } from "../../../document/value";
import type { VariableType } from "../../../document/variable";
import type { Reach } from "./reach";

export interface MakeAction {
	label: string;
	name: string;
	run: (name: string) => string;
}

export interface TargetAction {
	label: string;
	run: () => void;
}

export interface EditTarget {
	reach: Reach;
	label: string;
	type: VariableType;
	options: readonly string[];
	value: VariableValue;
	current: Literal;
	make: MakeAction | null;
	onChange: (value: VariableValue) => void;
	extra?: readonly TargetAction[] | undefined;
}
