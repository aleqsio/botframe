import type { ReactElement } from "react";
import type { AgentLink, LinkState } from "../agent/webLink";
import { useSlot } from "../state/useSlot";
import { Icon } from "./Icon";

const TITLES: Readonly<Record<LinkState, string>> = {
	off: "Connect an agent. Run bun run agent first.",
	searching: "Waiting for the agent server at 127.0.0.1. Run bun run agent.",
	linked: "An agent can edit the open documents.",
};

export function AgentButton({ link }: { link: AgentLink }): ReactElement {
	const state = useSlot(link.state);

	return (
		<button
			aria-label="Agent"
			aria-pressed={state !== "off"}
			className="pill-button"
			onClick={() => {
				link.toggle();
			}}
			title={TITLES[state]}
			type="button"
		>
			<Icon name="agent" />
		</button>
	);
}
