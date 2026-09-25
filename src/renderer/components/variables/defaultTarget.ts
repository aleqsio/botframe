import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { defaultNow, editVariable } from "./scopeEdit";
import type { EditTarget } from "./target";

export function defaultTarget(
	doc: DesignDocument,
	view: ComponentsView,
	owner: string,
	variable: Variable,
): EditTarget {
	return {
		reach: {
			view,
			owners: owner === DOCUMENT_SCOPE ? [owner] : [DOCUMENT_SCOPE, owner],
			skip: variable.id,
		},
		label: `${variable.name} default`,
		type: variable.type,
		options: variable.options,
		value: variable.initial,
		current: defaultNow(doc, variable),
		make: null,
		onChange: (next) => {
			editVariable(doc, owner, variable, { initial: next });
		},
	};
}
