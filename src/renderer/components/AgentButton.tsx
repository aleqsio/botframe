import { Popover } from "@base-ui-components/react/popover";
import type { ReactElement } from "react";
import type { AgentLink } from "../agent/webLink";
import { AgentPanel } from "./AgentPanel";
import { AgentMark } from "./AgentMark";

const LABEL = "Agent";
const POPUP_GAP = 6;

export function AgentButton({ link }: { link: AgentLink | null }): ReactElement {
	return (
		<Popover.Root>
			<Popover.Trigger aria-label={LABEL} className="pill-button" title={LABEL}>
				<AgentMark link={link} />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" side="bottom" sideOffset={POPUP_GAP}>
					<Popover.Popup className="agent-popup">
						<AgentPanel link={link} />
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
