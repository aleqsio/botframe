import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { defaultNow, editVariable, testMaker } from "./scopeEdit";
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
			source: doc.tree.resolver(),
			chain: [],
			skip: variable.id,
		},
		label: `${variable.name} default`,
		type: variable.type,
		options: variable.options,
		value: variable.initial,
		current: defaultNow(doc, variable),
		make: null,
		addTest: testMaker(doc, owner === DOCUMENT_SCOPE ? [owner] : [DOCUMENT_SCOPE, owner]),
		onChange: (next) => {
			editVariable(doc, owner, variable, { initial: next });
		},
		onOptions:
			variable.type === "choice"
				? (options) => {
						editVariable(doc, owner, variable, { options });
					}
				: undefined,
	};
}
