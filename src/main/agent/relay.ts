import { agentServer } from "./server";
import { listenAgent } from "./listen";
import { WebPage } from "./webPage";

const page = new WebPage();
listenAgent(agentServer((tool, args) => page.call(tool, args), page));
