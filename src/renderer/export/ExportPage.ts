import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { AgentReply } from "../../shared/agent";
import { argsOf } from "../agent/args";
import { bridge } from "../bridge";
import { renderScene } from "./renderScene";

async function reply(root: Root, call: unknown): Promise<AgentReply> {
	const { id, args } = argsOf(call);
	const callId = typeof id === "number" ? id : -1;
	try {
		return { id: callId, ok: true, result: await renderScene(root, args) };
	} catch (error) {
		return { id: callId, ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

export function serveExportPage(container: Element): void {
	document.documentElement.dataset["export"] = "";
	const root = createRoot(container);
	let running: Promise<unknown> = Promise.resolve();
	bridge().serveExport((call) => {
		const next = running.then(() => reply(root, call));
		running = next;
		return next;
	});
}
