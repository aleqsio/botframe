import { AGENT_HOST, AGENT_PAGE_PATH, AGENT_PORT } from "../../shared/agent";
import type { AgentReply } from "../../shared/agent";
import { Slot } from "../state/slot";

export type LinkState = "off" | "searching" | "linked";

const PAGE_URL = `http://${AGENT_HOST}:${AGENT_PORT}${AGENT_PAGE_PATH}`;
const RETRY_MS = 2000;

function pause(signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, RETRY_MS);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});
}

export class AgentLink {
	readonly state = new Slot<LinkState>("off");
	readonly #run: (call: unknown) => Promise<AgentReply>;
	#controller: AbortController | null = null;

	constructor(run: (call: unknown) => Promise<AgentReply>) {
		this.#run = run;
	}

	toggle(): void {
		this.#controller?.abort();
		if (this.#controller !== null) {
			this.#controller = null;
			this.state.set("off");
			return;
		}
		const controller = new AbortController();
		this.#controller = controller;
		this.state.set("searching");
		void this.#serve(controller.signal);
	}

	async #serve(signal: AbortSignal): Promise<void> {
		const linked = await this.#step(signal);
		if (signal.aborted) {
			return;
		}
		if (!linked) {
			this.state.set("searching");
			await pause(signal);
		}
		void this.#serve(signal);
	}

	async #answer(call: unknown, signal: AbortSignal): Promise<void> {
		await fetch(PAGE_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(await this.#run(call)),
			signal,
		});
	}

	async #step(signal: AbortSignal): Promise<boolean> {
		try {
			const response = await fetch(PAGE_URL, { signal });
			if (!response.ok) {
				return false;
			}
			this.state.set("linked");
			const call: unknown = await response.json();
			if (call !== null) {
				await this.#answer(call, signal);
			}
			return true;
		} catch {
			return false;
		}
	}
}
