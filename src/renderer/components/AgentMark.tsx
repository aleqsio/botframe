import type { ReactElement } from "react";
import type { AgentLink } from "../agent/webLink";
import { useSlot } from "../state/useSlot";
import { Icon } from "./Icon";

function LinkDot({ link }: { link: AgentLink }): ReactElement | null {
	const state = useSlot(link.state);
	return state === "off" ? null : <span className="agent-dot" data-state={state} />;
}

export function AgentMark({ link }: { link: AgentLink | null }): ReactElement {
	return (
		<span className="agent-mark">
			<Icon name="agent" />
			{link === null ? null : <LinkDot link={link} />}
		</span>
	);
}
