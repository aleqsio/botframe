import type { AgentReply } from "../../shared/agent";
import type { Tab } from "../state/tab";
import type { Workspace } from "../state/workspace";
import { welcomeTab } from "../welcome";
import { argsOf, optionalText } from "./args";
import type { Args } from "./args";
import { COMPONENT_TOOLS } from "./componentTools";
import { DATA_TOOLS } from "./dataTools";
import { LAYER_TOOLS } from "./layerTools";
import type { Handler } from "./layerTools";
import { exportLayer, render } from "./exportTools";

const TOOLS: Readonly<Record<string, Handler>> = {
	...LAYER_TOOLS,
	...DATA_TOOLS,
	...COMPONENT_TOOLS,
};

const NO_CALL = -1;
const READS: ReadonlySet<string> = new Set([
	"get_outline",
	"get_layer",
	"list_components",
	"read_data",
]);

function listDocuments(workspace: Workspace): unknown {
	const active = workspace.active.get();
	return workspace.tabs.get().map((tab) => ({
		id: tab.id,
		name: tab.name.get(),
		active: tab === active,
		unsaved: tab.hasChanges(),
	}));
}

async function openWelcome(workspace: Workspace): Promise<unknown> {
	const tab = await welcomeTab();
	workspace.add(tab);
	return { document: tab.id, name: tab.name.get() };
}

const WORKSPACE_TOOLS: Readonly<Record<string, (workspace: Workspace) => unknown>> = {
	list_documents: listDocuments,
	open_welcome: openWelcome,
};

function tabOf(workspace: Workspace, args: Args): Tab {
	const id = optionalText(args, "document");
	if (id === null) {
		return workspace.active.get();
	}
	const tab = workspace.tabs.get().find((held) => held.id === id);
	if (tab === undefined) {
		throw new TypeError(`No open document has the id ${id}.`);
	}
	return tab;
}

async function run(workspace: Workspace, tool: string, args: Args): Promise<unknown> {
	const workspaceTool = WORKSPACE_TOOLS[tool];
	if (workspaceTool !== undefined) {
		return workspaceTool(workspace);
	}
	if (tool === "render") {
		return render(tabOf(workspace, args), args);
	}
	if (tool === "export_layer") {
		return exportLayer(tabOf(workspace, args), args);
	}
	const handler = TOOLS[tool];
	if (handler === undefined) {
		throw new TypeError(`botframe has no tool ${tool}.`);
	}
	const { doc } = tabOf(workspace, args);
	if (READS.has(tool)) {
		return handler(doc, args);
	}
	try {
		const result: unknown = await handler(doc, args);
		return result;
	} finally {
		doc.commit(`agent ${tool}`);
	}
}

export async function runTool(workspace: Workspace, call: unknown): Promise<AgentReply> {
	const { id, tool, args } = argsOf(call);
	if (typeof id !== "number" || typeof tool !== "string") {
		return {
			id: typeof id === "number" ? id : NO_CALL,
			ok: false,
			error: "The call is not valid.",
		};
	}
	try {
		return { id, ok: true, result: (await run(workspace, tool, argsOf(args))) ?? null };
	} catch (error) {
		return { id, ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}
