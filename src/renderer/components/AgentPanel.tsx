import { useState } from "react";
import type { ReactElement } from "react";
import { AGENT_ADD_COMMAND, AGENT_PORT, AGENT_RELAY_COMMAND } from "../../shared/agent";
import type { AgentLink, LinkState } from "../agent/webLink";
import { useSlot } from "../state/useSlot";

const STATUS: Readonly<Record<LinkState, string>> = {
	off: "Not connected.",
	searching: `Waiting for the server on port ${AGENT_PORT}…`,
	linked: "Connected. The agent can edit the open documents.",
};

async function copy(command: string, onCopied: () => void): Promise<void> {
	await navigator.clipboard.writeText(command);
	onCopied();
}

function CommandRow({ command }: { command: string }): ReactElement {
	const [copied, setCopied] = useState(false);

	return (
		<div className="agent-command">
			<code>{command}</code>
			<button
				className="agent-copy"
				onClick={() => {
					void copy(command, () => {
						setCopied(true);
					});
				}}
				type="button"
			>
				{copied ? "Copied" : "Copy"}
			</button>
		</div>
	);
}

function Step({ number, text }: { number: number; text: string }): ReactElement {
	return (
		<p className="agent-step">
			<span className="agent-step-number">{number}</span>
			{text}
		</p>
	);
}

function LinkSteps({ link }: { link: AgentLink }): ReactElement {
	const state = useSlot(link.state);

	return (
		<>
			<Step number={1} text="In the botframe folder, start the server:" />
			<CommandRow command={AGENT_RELAY_COMMAND} />
			<Step number={2} text="Add the server to Claude Code:" />
			<CommandRow command={AGENT_ADD_COMMAND} />
			<Step number={3} text="Connect this page to the server:" />
			<div className="agent-link">
				<span className="agent-status" data-state={state}>
					{STATUS[state]}
				</span>
				<button
					aria-pressed={state !== "off"}
					className="agent-copy"
					onClick={() => {
						link.toggle();
					}}
					type="button"
				>
					{state === "off" ? "Connect" : "Disconnect"}
				</button>
			</div>
		</>
	);
}

function DesktopSteps(): ReactElement {
	return (
		<>
			<p className="agent-note">botframe starts the server when it opens.</p>
			<Step number={1} text="Add the server to Claude Code:" />
			<CommandRow command={AGENT_ADD_COMMAND} />
			<Step number={2} text="Ask the agent to edit the open document." />
			<p className="agent-note">
				{`If a different program uses port ${AGENT_PORT}, the server does not start.`}
			</p>
		</>
	);
}

export function AgentPanel({ link }: { link: AgentLink | null }): ReactElement {
	return (
		<div className="agent-panel">
			<h2 className="agent-heading">Connect an agent</h2>
			{link === null ? <DesktopSteps /> : <LinkSteps link={link} />}
		</div>
	);
}
