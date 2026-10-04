import type { Server } from "node:http";
import { AGENT_HOST, AGENT_MCP_PATH, AGENT_PORT } from "../../shared/agent";

export function listenAgent(server: Server): void {
	server.on("error", (error) => {
		process.stderr.write(`botframe MCP server did not start: ${error.message}\n`);
	});
	server.listen(AGENT_PORT, AGENT_HOST, () => {
		process.stderr.write(
			`botframe MCP server: http://${AGENT_HOST}:${AGENT_PORT}${AGENT_MCP_PATH}\n`,
		);
	});
}
