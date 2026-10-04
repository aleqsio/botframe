import type { ServerResponse } from "node:http";
import type { AgentCall } from "../../shared/agent";
import { Pending } from "./pending";

const HOLD_MS = 20_000;
const SEEN_MS = HOLD_MS + 10_000;

const NO_PAGE =
	"No botframe page is connected. Open botframe in the browser and press the Agent button in the file bar.";

function sendCall(response: ServerResponse, call: AgentCall | null): void {
	response.end(JSON.stringify(call));
}

export class WebPage {
	readonly #queue: AgentCall[] = [];
	readonly #pending = new Pending((call) => {
		this.#deliver(call);
	});
	#waiting: ServerResponse | null = null;
	#seenAt = Number.NEGATIVE_INFINITY;

	call(tool: string, args: unknown): Promise<unknown> {
		if (this.#waiting === null && Date.now() - this.#seenAt > SEEN_MS) {
			return Promise.reject(new Error(NO_PAGE));
		}
		return this.#pending.call(tool, args);
	}

	poll(response: ServerResponse): void {
		this.#seenAt = Date.now();
		response.writeHead(200, { "Content-Type": "application/json" }).flushHeaders();
		const next = this.#nextCall();
		if (next !== undefined) {
			sendCall(response, next);
			return;
		}
		this.#release();
		this.#waiting = response;
		const timer = setTimeout(() => {
			if (this.#waiting === response) {
				this.#release();
			}
		}, HOLD_MS);
		response.on("close", () => {
			clearTimeout(timer);
			if (this.#waiting === response) {
				this.#waiting = null;
			}
		});
	}

	reply(value: unknown): void {
		this.#seenAt = Date.now();
		this.#pending.settle(value);
	}

	#nextCall(): AgentCall | undefined {
		let next = this.#queue.shift();
		while (next !== undefined && !this.#pending.waits(next.id)) {
			next = this.#queue.shift();
		}
		return next;
	}

	#release(): void {
		const waiting = this.#waiting;
		this.#waiting = null;
		if (waiting !== null) {
			sendCall(waiting, null);
		}
	}

	#deliver(call: AgentCall): void {
		const waiting = this.#waiting;
		if (waiting === null) {
			this.#queue.push(call);
			return;
		}
		this.#waiting = null;
		sendCall(waiting, call);
	}
}
