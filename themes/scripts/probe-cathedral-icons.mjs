import {
  CdpSession,
  findTargets,
  getAdapter,
} from "@codextheme/runtime";
import {
  buildCathedralIconCountExpression,
  classifyCathedralIconCounts,
  mergeCathedralIconCounts,
} from "./cathedral-icon-contract.mjs";

const context = process.argv[2];
if (!new Set(["home", "session"]).has(context)) {
  console.error("Usage: node themes/scripts/probe-cathedral-icons.mjs <home|session>");
  process.exitCode = 2;
} else {
  const adapter = getAdapter("codex");
  const port = Number(process.env.CODEXTHEME_CDP_PORT ?? adapter.defaultPort);
  const targets = await findTargets(adapter, port, 5000);
  if (!targets.length) throw new Error(`No Codex renderer is available on 127.0.0.1:${port}.`);

  const observedByTarget = [];
  for (const target of targets) {
    const session = await new CdpSession(target, 5000).open();
    try {
      observedByTarget.push(await session.evaluate(buildCathedralIconCountExpression(context)));
    } finally {
      session.close();
    }
  }

  const observed = mergeCathedralIconCounts(observedByTarget);
  const results = classifyCathedralIconCounts(context, observed);
  console.log(JSON.stringify({ context, rendererCount: targets.length, observed, results }, null, 2));
  if (results.some(({ status }) => status === "error")) process.exitCode = 1;
}
