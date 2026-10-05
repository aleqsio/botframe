import { AGENT_MCP_URL } from "../../src/shared/agent";

import type { Fields } from "../fixtures/export/example";

interface Content {
	text: string | null;
	data: string | null;
	blob: string | null;
}

let nextId = 0;

export function fieldsOf(value: unknown): Fields {
	return typeof value === "object" && value !== null ? { ...value } : {};
}

function textOf(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function contentOf(value: unknown): Content {
	const { text, data, resource } = fieldsOf(value);
	const held = fieldsOf(resource);
	return {
		text: textOf(text) ?? textOf(held["text"]),
		data: textOf(data),
		blob: textOf(held["blob"]),
	};
}

async function callTool(name: string, args: Fields): Promise<Content[]> {
	nextId += 1;
	const response = await fetch(AGENT_MCP_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: nextId,
			method: "tools/call",
			params: { name, arguments: args },
		}),
	});
	const { result, error } = fieldsOf(await response.json());
	const { content, isError } = fieldsOf(result);
	const items = Array.isArray(content) ? content.map((item) => contentOf(item)) : [];
	if (error !== undefined || isError === true) {
		throw new Error(`${name}: ${JSON.stringify(error ?? items)}`);
	}
	return items;
}

export async function toolJson(name: string, args: Fields): Promise<unknown> {
	const [first] = await callTool(name, args);
	return JSON.parse(first?.text ?? "null") as unknown;
}

export async function toolBytes(name: string, args: Fields): Promise<Buffer> {
	const [first] = await callTool(name, args);
	const base64 = first?.data ?? first?.blob ?? null;
	return base64 === null ? Buffer.from(first?.text ?? "", "utf8") : Buffer.from(base64, "base64");
}
