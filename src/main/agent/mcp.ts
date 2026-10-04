import { bagOf } from "../../document/bag";
import { AGENT_TOOLS } from "../../shared/agent";
import type { CallPage } from "./pending";

type Fields = Readonly<Record<string, unknown>>;

type JsonRpcId = string | number;

const LATEST_PROTOCOL = "2025-11-25";
const PROTOCOLS: ReadonlySet<unknown> = new Set([LATEST_PROTOCOL, "2025-06-18", "2025-03-26"]);
const TOOL_NAMES: ReadonlySet<unknown> = new Set(AGENT_TOOLS.map((tool) => tool.name));

const INVALID_REQUEST = -32_600;
const NO_METHOD = -32_601;
const INVALID_PARAMS = -32_602;

const INSTRUCTIONS =
	"botframe is a design tool. These tools edit the documents that are open in botframe, and the editor shows each change at once. Start with list_documents and get_outline. Use get_layer to read a layer and update_layer to change it. Use read_data and write_data for each part of the document that the other tools do not give. Each call is one undo step.";

class RpcError extends Error {
	readonly code: number;

	constructor(code: number, message: string) {
		super(message);
		this.code = code;
	}
}

function fieldsOf(value: unknown): Fields {
	return Array.isArray(value) ? {} : bagOf(value);
}

function isRpcId(value: unknown): value is JsonRpcId {
	return typeof value === "string" || typeof value === "number";
}

function initialize(params: Fields): unknown {
	const asked = params["protocolVersion"];
	return {
		protocolVersion: PROTOCOLS.has(asked) ? asked : LATEST_PROTOCOL,
		capabilities: { tools: {} },
		serverInfo: { name: "botframe", version: "0.0.0" },
		instructions: INSTRUCTIONS,
	};
}

function textResult(text: string, isError: boolean): unknown {
	return { content: [{ type: "text", text }], isError };
}

async function callTool(params: Fields, call: CallPage): Promise<unknown> {
	const name = params["name"];
	if (typeof name !== "string" || !TOOL_NAMES.has(name)) {
		throw new RpcError(INVALID_PARAMS, `Unknown tool: ${String(name)}`);
	}
	try {
		const result = await call(name, fieldsOf(params["arguments"]));
		return textResult(JSON.stringify(result ?? null), false);
	} catch (error) {
		return textResult(error instanceof Error ? error.message : String(error), true);
	}
}

function resultOf(method: string, params: Fields, call: CallPage): unknown {
	switch (method) {
		case "initialize": {
			return initialize(params);
		}
		case "ping": {
			return {};
		}
		case "tools/list": {
			return { tools: AGENT_TOOLS };
		}
		case "tools/call": {
			return callTool(params, call);
		}
		default: {
			throw new RpcError(NO_METHOD, `Method not found: ${method}`);
		}
	}
}

export async function answerMcp(message: unknown, call: CallPage): Promise<unknown> {
	const { id, method, params } = fieldsOf(message);
	if (!isRpcId(id)) {
		return null;
	}
	try {
		if (typeof method !== "string") {
			throw new RpcError(INVALID_REQUEST, "The request has no method.");
		}
		return { jsonrpc: "2.0", id, result: await resultOf(method, fieldsOf(params), call) };
	} catch (error) {
		const code = error instanceof RpcError ? error.code : INVALID_REQUEST;
		const text = error instanceof Error ? error.message : String(error);
		return { jsonrpc: "2.0", id, error: { code, message: text } };
	}
}
