import { Popover } from "@base-ui-components/react/popover";
import { useState } from "react";
import type { ReactElement } from "react";
import { isCondition, isLiteral } from "../../../document/value";
import { Icon } from "../Icon";
import { ConditionEditor } from "./ConditionEditor";
import { kindOf } from "./reach";
import type { ValueKind } from "./reach";
import type { EditTarget } from "./target";
import { ValueMenu } from "./ValueMenu";

const POPUP_GAP = 8;

const KIND_TITLE: Readonly<Record<ValueKind, string>> = {
	value: "use a variable or a condition",
	variable: "change the variable",
	condition: "edit the condition",
};

function Body({ onPicked, target }: { target: EditTarget; onPicked: () => void }): ReactElement {
	const { value } = target;
	return !isLiteral(value) && isCondition(value) ? (
		<ConditionEditor condition={value} target={target} />
	) : (
		<ValueMenu onPicked={onPicked} target={target} />
	);
}

export function BindButton({ target }: { target: EditTarget }): ReactElement {
	const [open, setOpen] = useState(false);
	const kind = kindOf(target.value);
	const title = `${target.label}: ${KIND_TITLE[kind]}`;

	return (
		<Popover.Root onOpenChange={setOpen} open={open}>
			<Popover.Trigger aria-label={title} className="bind-button" data-kind={kind} title={title}>
				<Icon name={kind === "condition" ? "branch" : "hexagon"} />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start" side="left" sideOffset={POPUP_GAP}>
					<Popover.Popup className="color-popup value-popup">
						<Body
							onPicked={() => {
								setOpen(false);
							}}
							target={target}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
