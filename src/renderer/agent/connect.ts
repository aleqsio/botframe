import type { AgentReply } from "../../shared/agent";
import { bridge, inBrowser } from "../bridge";
import type { Workspace } from "../state/workspace";
import { runTool } from "./tools";
import { AgentLink } from "./webLink";

export function connectAgent(workspace: Workspace): AgentLink | null {
	const run = (call: unknown): Promise<AgentReply> => runTool(workspace, call);
	bridge().serveAgent(run);
	return inBrowser() ? new AgentLink(run) : null;
}
