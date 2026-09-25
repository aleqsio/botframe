import type { Literal, VariableValue } from "../../../document/value";
import type { VariableType } from "../../../document/variable";
import type { Reach } from "./reach";

export interface MakeAction {
	label: string;
	run: () => string;
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
}
