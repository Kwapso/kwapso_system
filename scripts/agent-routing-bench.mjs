// THE ROUTING BENCH — which door the assistant reaches for FIRST, measured.
//
// A prompt change that tells the model "prefer the knowledge base" is a hope
// until something reads what the model actually did with it. This is that
// something. It asks ONE question per call, with the SHIPPED system prompt and
// the SHIPPED tool catalogue, and records the tool names the model chose. It
// never executes a tool, so nothing is read, written or billed on our side
// beyond the one model turn.
//
// ── WHY IT CAN JUDGE A BRANCH ───────────────────────────────────────────────
//
// `systemFor` and `toolSpecs` are IMPORTED FROM THE WORKING TREE, and the model
// runs on the model the DEPLOYMENT pins (read off wrangler.jsonc, not off
// model.ts's inert constant). So the prompt under test is the file you just
// edited, the catalogue is the one the worker will send, and the model is the
// one that answers the owner. Run it on
// `main`, run it on your branch, read the difference. (The same property
// kb-bench.mjs has, for the retrieval half.)
//
// ── HOW TO RUN IT ───────────────────────────────────────────────────────────
//
//   node --experimental-transform-types scripts/agent-routing-bench.mjs --dry
//   node --experimental-transform-types scripts/agent-routing-bench.mjs --self-test
//   node --experimental-transform-types scripts/agent-routing-bench.mjs --dry --whole-catalogue
//   node --experimental-transform-types scripts/agent-routing-bench.mjs
//   node --experimental-transform-types scripts/agent-routing-bench.mjs --verbose
//
// ── WHAT THIS MEASURED BEFORE 2026-09-06, AND WHY IT WAS WRONG ─────────────
//
// This bench built its tools with `toolSpecs()` — no arguments — which returns
// the WHOLE catalogue. `toolSpecs`'s own comment says it: "`loaded` absent = the
// whole catalogue, exactly as before this existed." That was correct until the
// two-stage catalogue landed on 2026-09-06, after which a step sends the CORE
// tools plus an index of NAMES and fetches the rest with `load_tools`.
//
// So for as long as the split has existed, this bench has been measuring the
// routing accuracy of a catalogue the assistant no longer sends — and it had
// been nominated as the gate before the split shipped. It would have passed or
// failed for reasons unrelated to the change and charged about $0.23 to do it.
// A green here was not evidence about the split; do not read an older run as if
// it were.
//
// It now builds what a step builds (`toolSpecs(undefined, loaded)` and
// `stageOneSystem`, both IMPORTED so they cannot drift), takes the extra step
// when the model asks for a tool, and reports the fetch path separately from the
// score. Three questions are marked `deferred` because their door is outside the
// core seven, so a run that never fetches is a run that says so.
//
// `--self-test` proves that loop against a scripted model over no network, for
// nothing. `--whole-catalogue` restores the old shape ON PURPOSE, to be compared:
// if a normal run and that one produce the same sizes and the same score, this
// bench is not seeing the split, and "the split costs nothing" and "the bench is
// blind" are the same output.
//
// `--dry` spends NOTHING: it builds the prompt, prints its size and the question
// set, and stops. Run it first — it is how you learn what the real run will cost
// before you agree to it.
//
// ── RUN IT TWICE A SIDE. ONE RUN EACH IS NOT A COMPARISON ───────────────────
//
// Measured on 29 Aug 2026, comparing the query-grammar branch against main, on
// the shipped model (glm-5.3-flash), two runs each:
//
//   main      22/22, then 18/22
//   branch    21/22, then 18/22
//
// The run-to-run variance is LARGER than the branch-to-branch difference. One
// run each would have produced "21 against 22" and a written-up regression that
// does not exist — and the second runs, which land in the same place, are the
// only thing that says so. So: run it twice a side, and treat a single-run gap
// of one or two as noise until a second run agrees with it.
//
// The low runs fail the same way on both sides — three knowledge questions
// answered with NO tool call at all. That is glm flakiness, not routing, and it
// is worth knowing separately because it predates any catalogue change and glm
// is now the shipped model.
//
// ── IT ALSO PRICES A STEP ───────────────────────────────────────────────────
//
// Every question is ONE model call carrying the same preamble, so `in` divided
// by the question count is the real tokenizer's answer to "what does a step of
// this catalogue cost", which is the number `agent_usage_log.input_tokens` sums
// over a turn. The same two runs above:
//
//   main      775,265 / 22 = 35,239 input tokens per step
//   branch    727,855 / 22 = 33,084 input tokens per step   (−2,155, −6.1%)
//
// Uncached on purpose. The prompt cache is a separate effect on the same column,
// so measuring a step without it is what keeps the two apart.
//
// ── WHAT IT COSTS ───────────────────────────────────────────────────────────
//
// CORRECTED 2026-09-05. This paragraph described Claude, cache writes and cache
// reads for a run that has not touched Anthropic since 28 August: the assistant
// is a Workers AI model over the `AI` binding, and the prompt cache does not
// apply, because Cloudflare's prefix cache is steered by an `x-session-affinity`
// header that does nothing through the binding (model.ts records the four
// measured runs). The one true sentence in it was "the run prints what it spent,
// and it prints it BEFORE it exits", which is why that stayed.
//
// ONE WORKERS AI CALL PER QUESTION, on the model wrangler pins, at the published
// per-token rate in `shared/workers/pricing.ts`. Twenty-two questions carrying a
// ~35,000-token preamble each. On the pinned engine that is about
// 22 x 35,000 x $0.950/M = $0.73 of input per run, before output — which is why
// `--dry` exists and why you should run it first.
//
import "./lib/shared-alias.mjs"

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { cloudflareCredentials } from "./lib/cf-credentials.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const DRY = process.argv.includes("--dry")
const VERBOSE = process.argv.includes("--verbose")
/** THE CANARY, and it is not optional reading before you trust a number.
 *
 * `--whole-catalogue` sends all 166 tool definitions the way this bench did
 * before 2026-09-06 — no index, no `load_tools`. It exists to be COMPARED with
 * a normal run: if the two produce the same preamble size and the same score,
 * this bench is not seeing the two-stage split, and "the split costs nothing" and
 * "the bench is blind" are the same output. Run `--dry` both ways first; the
 * sizes must differ by about 70%. */
const WHOLE = process.argv.includes("--whole-catalogue")
/** Runs the whole loop against a SCRIPTED model, over no network, for nothing.
 * The fetch path is the thing this rewrite exists to exercise, and a path that is
 * only exercised by a paid run is one nobody checks before paying. */
const SELF_TEST = process.argv.includes("--self-test")

import { importTs } from "./lib/import-ts.mjs"

const { systemFor } = await importTs(join(REPO, "workers", "data-ops", "src", "lib", "agent.ts"))
const { toolSpecs, stageOneSystem, CORE_TOOL_NAMES } = await importTs(join(REPO, "workers", "data-ops", "src", "lib", "tools.ts"))
const { DEFAULT_AGENT_MODEL } = await importTs(join(REPO, "workers", "data-ops", "src", "lib", "model.ts"))
// DYNAMIC, like the three above and for the same reason: the `@shared/*` hook is
// registered when shared-alias.mjs EVALUATES, and a static import in this file
// would have been resolved before that happened.
const { aiCostUsd, aiNeurons, UNPRICED_MODEL, usd } = await importTs(join(REPO, "shared", "workers", "pricing.ts"))

/* ------------------------------ the question set ------------------------- */

// AUTHORED OFF THE MATERIAL the staging base really holds (the same subjects
// kb-bench-questions.mjs was authored against), so the model is choosing between
// doors for a question somebody could really ask here.
//
// `want` is the door the question SHOULD open, and the three classes are three
// different judgements:
//
//   knowledge  What the team KNOWS — said, agreed, decided, written down. The
//              knowledge base holds it and nothing else does.
//   live       What retrieval structurally CANNOT answer: a count, a whole list,
//              a sort, a filter, "all of X". Reaching for the knowledge base
//              here is the failure in the other direction and it is worse,
//              because it answers confidently from a sample.
//   knowledge  (again) for the AMBIGUOUS ones — a question ABOUT a record. These
//              are the owner's complaint: the base mirrors the app's own rows and
//              every citation carries the row's `liveStatus` read at the moment
//              of asking, so one call answers what a rummage takes four to reach.
const QUESTIONS = [
  // ── what the team knows ────────────────────────────────────────────────
  { q: "What did we agree with Assecuranz about their file import?", want: "knowledge" },
  { q: "What was discussed on the HOGO sync?", want: "knowledge" },
  { q: "How do we record a damage case?", want: "knowledge" },
  { q: "What is the process for taking on a new insurance client?", want: "knowledge" },
  { q: "What came out of the Team Assembly?", want: "knowledge" },
  { q: "Remind me what we decided about issuing vouchers to a pharmacy.", want: "knowledge" },
  // ── what only a live read can answer ───────────────────────────────────
  { q: "How many open tickets are there right now?", want: "live", counts: true },
  { q: "List everyone on the team and the role each one holds.", want: "live" },
  { q: "Which tickets have nobody assigned to them?", want: "live" },
  { q: "What roles exist on this team?", want: "live" },
  { q: "How many accounts do we have?", want: "live", counts: true },
  { q: "Show me every ticket raised this week, newest first.", want: "live" },
  // ── about a record: the owner's complaint ──────────────────────────────
  { q: "What's going on with the HOGO account?", want: "knowledge" },
  { q: "Where do things stand with task 3144?", want: "knowledge" },
  { q: "Tell me about FluClinic.", want: "knowledge" },
  { q: "What's the latest on Assecuranz?", want: "knowledge" },
  { q: "Catch me up on the Kwapso CPAA work.", want: "knowledge" },
  { q: "What do we know about handing a vehicle to a new driver?", want: "knowledge" },
  // ── the control: questions the new rule could OVER-steer ──────────────
  // A rule that sends everything to the knowledge base would score full marks
  // above and be wrong. These four are doors the base must not swallow: three
  // writes, and the one read that asks about the base itself.
  { q: "Raise a ticket for Assecuranz about the failed file import.", want: "live" },
  { q: "Invite maria@fluclinic.se to the team as an admin.", want: "live" },
  { q: "Change ticket 3144 to resolved.", want: "live" },
  { q: "Is the knowledge base up to date?", want: "live", deferred: true },
  // ── the two-stage catalogue's own question ────────────────────────────
  // `deferred: true` marks a question whose door is NOT in the core seven, so
  // answering it REQUIRES calling `load_tools` first. Without at least one of
  // these a run exercises only the core tools and measures exactly what the
  // pre-split bench measured — a green that proves nothing about the split.
  //
  // Chosen because the grammar cannot reach them: `query_records` covers the
  // record modules, so a question it can answer would never need a fetch. A rate
  // card and somebody's Google Drive are outside it.
  { q: "What is an hour of each role worth to us?", want: "live", deferred: true },
  { q: "Which files are in our Google Drive?", want: "live", deferred: true },
]

/* ------------------------------ the verdict ------------------------------ */

const ASK = "ask_knowledge"
/** A live read is any catalogue tool that is not the knowledge door — the point
 * of the `live` class is that the model went and looked the records up. */
const judge = (want, tools) => {
  const first = tools[0] ?? null
  if (want === "knowledge") return first === ASK
  return first !== null && first !== ASK
}

/* ------------------------------ the run ---------------------------------- */

const system = systemFor(null)
/** A tool call's arguments, however the model spelled them. Workers AI hands
 * back a JSON STRING; some families hand back an object already. Neither is a
 * reason to throw — an unreadable argument list reads as "said nothing". */
function parseArgs(raw) {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

/* ── WHAT A STEP ACTUALLY SENDS ────────────────────────────────────────────
 *
 * THIS LINE USED TO BE `toolSpecs()`, AND THAT IS WHY THIS REWRITE EXISTS.
 * `toolSpecs()` with no arguments returns the WHOLE catalogue — the function's
 * own comment says so: "`loaded` absent = the whole catalogue, exactly as before
 * this existed." Since the two-stage catalogue landed on 2026-09-06 a step sends
 * the CORE tools plus an index of names and fetches the rest with `load_tools`,
 * so this bench was measuring the routing accuracy of a catalogue the assistant
 * no longer sends. It would have passed or failed for reasons unrelated to the
 * change, and charged for the privilege. It was nominated as the gate before the
 * split shipped; it could not have answered the question.
 *
 * `stageOneSystem` is IMPORTED rather than reproduced, so the preface and the
 * index here are the same bytes `runPlanLoop` sends. A hand-typed copy would
 * drift the first time either was reworded and the run would still produce a
 * number. */
const stageOneTools = toolSpecs(undefined, new Set())
const tools = WHOLE ? toolSpecs() : stageOneTools
const systemSent = WHOLE ? system : stageOneSystem(system)

/** THE MODEL THE DEPLOYMENT ACTUALLY RUNS — read off wrangler.jsonc, never off
 * model.ts's constant. `selectModel` is `env.AGENT_MODEL || DEFAULT_AGENT_MODEL`
 * and both environments pin AGENT_MODEL, so the constant is inert; a bench that
 * reads it measures a model nobody runs. That happened: three runs of a routing
 * question were scored against glm-5.3-flash while every deployed turn was on
 * gpt-oss-120b, and the two disagree completely on this question (6/6 against
 * 1/5). Refuses rather than guesses if the pin is missing or the environments
 * disagree — a bench that quietly falls back is the failure it exists to catch. */
function deployedModel() {
  const src = readFileSync(join(REPO, "workers", "data-ops", "wrangler.jsonc"), "utf8")
  const pinned = [...src.matchAll(/"AGENT_MODEL":\s*"([^"]+)"/g)].map((m) => m[1])
  if (!pinned.length) throw new Error("no AGENT_MODEL pin in wrangler.jsonc — refusing to guess which model ships")
  if (new Set(pinned).size !== 1)
    throw new Error(`environments disagree on AGENT_MODEL (${[...new Set(pinned)].join(" vs ")}) — fix the config before benchmarking`)
  return pinned[0]
}
const ACCOUNT_HINT = process.env.CLOUDFLARE_ACCOUNT_ID || "the kwapso Cloudflare account"
const runModel = process.env.BENCH_CF_MODEL || deployedModel()

if (DRY) {
  console.log(`system prompt   ${systemSent.length.toLocaleString()} chars  (~${Math.round(systemSent.length / 4).toLocaleString()} tokens)${WHOLE ? "" : "  (includes the tool-name index)"}`)
  const toolChars = JSON.stringify(tools).length
  console.log(
    `tool catalogue  ${tools.length} tools, ${toolChars.toLocaleString()} chars  (~${Math.round(toolChars / 4).toLocaleString()} tokens)` +
      (WHOLE
        ? `   [--whole-catalogue: the PRE-SPLIT shape, for comparison only]`
        : `   [stage one: ${CORE_TOOL_NAMES.size} core tools; the other ${toolSpecs().length - tools.length} are named in the index above]`)
  )
  console.log(`questions       ${QUESTIONS.length}  (${QUESTIONS.filter((q) => q.want === "knowledge").length} knowledge, ${QUESTIONS.filter((q) => q.want === "live").length} live)`)
  // WHICH MODEL, AND THEREFORE WHOSE BILL. Said here rather than assumed,
  // because the answer changed and this line did not: `selectModel` reads
  // `env.AGENT_MODEL || DEFAULT_AGENT_MODEL` and wrangler.jsonc pins
  // AGENT_MODEL in both environments, so the shipped assistant runs on a
  // WORKERS AI model and bills Cloudflare NEURONS. There is no Anthropic
  // spend on that path at all.
  //
  // This block used to print an Anthropic dollar estimate — "one cache write,
  // 21 cache reads" — for a run that cannot take that path, and on 30 Aug 2026
  // a lane budgeted against it and reported a spend of $0.43 that was never
  // charged to anybody. A stale number is worse than no number, because
  // somebody plans with it.
  console.log(`model           ${runModel}${runModel === DEFAULT_AGENT_MODEL ? "" : `  (wrangler's pin; model.ts's ${DEFAULT_AGENT_MODEL} is inert)`}`)
  // WHAT THIS RUN WILL COST, FOR THE ENGINE THIS RUN USES.
  //
  // It used to quote a flat "~880 neurons per question, measured 30 Aug 2026 on
  // gpt-oss-120b" whatever engine was pinned — and the pin moved to kimi-k2.6 on
  // 1 Sep, which meters 86,364 neurons per M input tokens against gpt-oss's
  // 31,818. So the estimate a person read before agreeing to spend was 2.7x
  // under, on the one screen whose whole job is to say what a run costs before
  // it runs. Derived from the preamble this run will actually send and the rate
  // card in shared/workers/pricing.ts, so it moves when either does.
  const stepTokens = Math.round((systemSent.length + toolChars) / 3.8223) // query-bench.mjs's calibration
  const runInput = stepTokens * QUESTIONS.length
  const estimate = aiCostUsd(runModel, { input: runInput })
  console.log(
    `spend           Cloudflare NEURONS on ${ACCOUNT_HINT}, not the Anthropic key.` +
      ` ~${stepTokens.toLocaleString()} input tokens per question x ${QUESTIONS.length} =` +
      ` ~${runInput.toLocaleString()} input tokens` +
      (estimate === UNPRICED_MODEL
        ? `, and ${runModel} has no line in shared/workers/pricing.ts, so no figure is offered.`
        : `, about ${usd(estimate)} of input at ${runModel}'s published rate` +
          ` (~${Math.round(aiNeurons(runModel, { input: runInput })).toLocaleString()} neurons), output on top.`) +
      ` Read the real figure off the line the run prints when it finishes.`
  )
  process.exit(0)
}

/* WORKERS AI, for comparing a Cloudflare-hosted model against Claude on the SAME
 * questions, the SAME prompt and the SAME 192-tool catalogue. The newer models
 * (glm, gpt-oss, qwen) answer in the OpenAI chat-completions shape — a `choices`
 * array with `message.tool_calls` — which is NOT the `response`/`tool_calls`
 * shape @cf/meta/llama-* uses, and reading the wrong field makes a working model
 * look like one that never calls a tool. Checked against both before trusting it. */
function workersAiModel(name) {
  const { account, token } = cloudflareCredentials()
  return {
    name,
    async complete(messages, tools) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${name}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          // TOOL CALLS AND TOOL RESULTS TRAVEL, not just prose. The two-stage
          // catalogue makes a turn MULTI-STEP — the model asks for a tool, gets a
          // receipt, then answers — and flattening that into user turns would
          // measure a conversation the assistant never has. This is the same
          // chat-completions shape `workersAiBody` sends in the worker.
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.toolCalls?.length
              ? {
                  tool_calls: m.toolCalls.map((c) => ({
                    id: c.id,
                    type: "function",
                    function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) },
                  })),
                }
              : {}),
            ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
          })),
          tools: tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.schema },
          })),
        }),
        signal: AbortSignal.timeout(180_000),
      })
      const json = await res.json()
      // Workers AI answers 8005 "Internal server error" intermittently on a large
      // request — seen once in a bisect that then passed at every size. A transient
      // 500 is not a routing result, so it is retried rather than scored.
      if (!json.success && JSON.stringify(json.errors).includes("8005")) {
        await new Promise((r) => setTimeout(r, 2000))
        return this.complete(messages, tools)
      }
      if (!json.success) throw new Error(`workers-ai: ${JSON.stringify(json.errors).slice(0, 300)}`)
      const msg = json.result.choices?.[0]?.message ?? {}
      const usage = json.result.usage ?? {}
      return {
        text: msg.content ?? "",
        toolCalls: (msg.tool_calls ?? []).map((c, i) => ({
          id: String(i),
          name: c.function?.name ?? c.name,
          // THE ARGUMENTS, NOT AN EMPTY OBJECT. They were dropped here, which
          // meant the bench could see that a counting question reached a live
          // read and NOT whether it asked for a count — so "how many open
          // tickets" scored a pass for fetching fifty rows and counting them by
          // hand. Parsed defensively: a model that hands back malformed JSON in
          // an argument string is a fact about that model, not a reason to lose
          // the whole run.
          input: parseArgs(c.function?.arguments),
        })),
        // Priced per token, no prompt cache on this path — mapped onto the same
        // shape so the spend line below needs no special case.
        usage: { input: usage.prompt_tokens ?? 0, output: usage.completion_tokens ?? 0, cacheWrite: 0, cacheRead: 0 },
        // NULL, NEVER ZERO. Cloudflare reports `neurons` on some responses and
        // not others, and `?? 0` turned "the provider did not say" into "it cost
        // nothing" — a missing measurement wearing the clothes of a measurement,
        // which is the exact fault this bench's own header warns about twice.
        // Nothing has ever totalled this field, so the zero was inert rather than
        // wrong; it is null now so that the first thing to total it cannot start
        // out wrong. The account's meter is still the ground truth, and the line
        // at the end of a run says so.
        neurons: typeof usage.neurons === "number" ? usage.neurons : null,
      }
    },
  }
}

/** A MODEL THAT NEEDS A DEFERRED TOOL, OVER NO NETWORK, FOR NOTHING.
 *
 * `--self-test` proves the fetch loop before anybody pays to use it. It scripts
 * the one behaviour the rewrite exists to measure — see a name in the index, call
 * `load_tools`, then call the fetched tool — and asserts three things a paid run
 * could not tell you apart:
 *
 *   · stage one really does WITHHOLD the tool (it is not quietly in the core);
 *   · the loop WIDENS after the fetch, so step two is offered it;
 *   · the fetched call is what gets SCORED, and `load_tools` is not.
 *
 * It also refuses to pass on an empty catalogue, which is the shape every wrong
 * measurement in this repo's history has taken. */
function scriptedModel(target) {
  let call = 0
  const offered = []
  return {
    name: "self-test (no network)",
    offered,
    async complete(messages, tools) {
      offered.push(tools.map((t) => t.name))
      call++
      if (call === 1)
        return {
          text: "",
          toolCalls: [{ id: "c1", name: "load_tools", input: { names: [target] } }],
          usage: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
          neurons: null,
        }
      return {
        text: "",
        toolCalls: [{ id: "c2", name: target, input: {} }],
        usage: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
        neurons: null,
      }
    },
  }
}

// One path, because there is only one: every model this can reach is a Workers
// AI model, so the run goes over the REST door with the account token.
const model = SELF_TEST ? scriptedModel("list_role_rates") : workersAiModel(runModel)


const spend = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }
const rows = []

/** THE FETCH PATH, RUN THE WAY THE LOOP RUNS IT.
 *
 * A question the core tools cannot answer costs one extra step: the model calls
 * `load_tools`, the loop widens what it may call, and the NEXT reply carries the
 * real tool. So the bench has to take that step too — otherwise every deferred
 * tool reads as "the model never called it", which is the same output as a model
 * that genuinely could not route, and the two would be indistinguishable.
 *
 * TWO STEPS, not twelve. This bench measures the FIRST door a question opens; it
 * is not a plan runner. One fetch is what a routing decision needs, and a model
 * that wants a second is telling us something worth seeing in the report rather
 * than being carried until it succeeds. */
const MAX_FETCH_STEPS = 2

async function askOne(item) {
  const loaded = new Set()
  const fetched = []
  const convo = [
    { role: "system", content: systemSent },
    { role: "user", content: item.q },
  ]
  let reply
  for (let step = 0; step < MAX_FETCH_STEPS; step++) {
    reply = await model.complete(convo, WHOLE ? tools : toolSpecs(undefined, loaded))
    for (const k of Object.keys(spend)) spend[k] += reply.usage?.[k] ?? 0
    const loads = reply.toolCalls.filter((t) => t.name === "load_tools")
    if (!loads.length) break
    // Mirror `runPlanLoop`: the LOOP reads the call's own input and widens, and
    // the model gets a receipt. A tool result is data, never the thing that
    // grants reach — same rule in the worker.
    for (const c of loads)
      for (const n of Array.isArray(c.input?.names) ? c.input.names : [])
        if (typeof n === "string") { loaded.add(n); fetched.push(n) }
    convo.push({ role: "assistant", content: reply.text ?? "", toolCalls: reply.toolCalls })
    for (const c of loads)
      convo.push({
        role: "tool",
        toolCallId: c.id,
        toolName: "load_tools",
        content: JSON.stringify({ loaded: [...loaded], unknown: [], note: "Their full instructions are available from your next step onward — call them directly." }),
      })
  }
  return { reply, fetched }
}

if (SELF_TEST) {
  const TARGET = "list_role_rates"
  const fail = (why) => {
    console.error(`SELF-TEST FAILED: ${why}`)
    process.exit(1)
  }
  if (!stageOneTools.length) fail("stage one offered NO tools — an empty catalogue measures nothing")
  if (toolSpecs().length <= stageOneTools.length)
    fail(`stage one (${stageOneTools.length}) is not smaller than the whole catalogue (${toolSpecs().length}) — the split is not being applied`)
  if (stageOneTools.some((t) => t.name === TARGET)) fail(`${TARGET} is in stage one, so it cannot exercise the fetch path — pick another target`)
  if (!stageOneSystem(system).includes(TARGET)) fail(`${TARGET} is not named in the index, so the model could never know to ask for it`)

  const { reply, fetched } = await askOne({ q: "What is an hour of each role worth to us?", want: "live", deferred: true })
  const scored = reply.toolCalls.map((t) => t.name).filter((n) => n !== "load_tools")
  if (!fetched.includes(TARGET)) fail(`the loop did not record the fetch (fetched: ${JSON.stringify(fetched)})`)
  if (model.offered.length < 2) fail("only one model call was made — the loop did not take the second step")
  if (model.offered[0].includes(TARGET)) fail("step one was offered the deferred tool — stage one is not withholding it")
  if (!model.offered[1].includes(TARGET)) fail("step two was NOT offered the fetched tool — the loop did not widen")
  if (!scored.includes(TARGET)) fail(`the fetched call was not scored (scored: ${JSON.stringify(scored)})`)
  if (scored.includes("load_tools")) fail("load_tools was scored as a door — it opens none")

  console.log("SELF-TEST PASSED — the fetch path works, and nothing was spent.")
  console.log(`  step 1 offered ${model.offered[0].length} tools, without ${TARGET}`)
  console.log(`  step 2 offered ${model.offered[1].length} tools, with it`)
  console.log(`  scored: ${scored.join(", ")}   (load_tools correctly not scored)`)
  process.exit(0)
}

for (const item of QUESTIONS) {
  const { reply, fetched } = await askOne(item)
  // The judgement is about the door the question OPENS, so `load_tools` — which
  // opens no door and answers nothing — is not one of the names scored. Counted
  // separately below, because whether the fetch happened is its own question.
  const called = reply.toolCalls.map((t) => t.name).filter((n) => n !== "load_tools")
  // DID IT ASK FOR A COUNT, OR FOR A PAGE TO COUNT BY HAND? Reported beside the
  // score and deliberately NOT part of it: this bench's number is compared run
  // to run and model to model, and a judge that changed mid-comparison would
  // make every earlier figure a different measurement wearing the same name. A
  // question marked `counts` wants `countOnly: true` — the reply then carries
  // the number and no rows at all, which on a 1,820-ticket table is the
  // difference between one integer and thousands of tokens read to ignore.
  const countedProperly =
    item.counts === true
      ? reply.toolCalls.some((t) => t.name !== ASK && t.input?.countOnly === true)
      : null
  rows.push({ ...item, called, fetched, countedProperly, pass: judge(item.want, called) })
  if (VERBOSE && reply.text) console.log(`   ${item.q}\n   → ${reply.text.slice(0, 200)}\n`)
}

/* ------------------------------ the report ------------------------------- */

const pad = (s, n) => String(s).padEnd(n)
console.log()
for (const r of rows) {
  console.log(
    `${r.pass ? "  ok  " : "  MISS"} ${pad(r.want, 10)} ${pad(r.called.join(" → ") || "(answered without a tool)", 46)} ${r.q}`
  )
}

const by = (want) => rows.filter((r) => r.want === want)
const score = (list) => `${list.filter((r) => r.pass).length}/${list.length}`
console.log()
console.log(`knowledge questions reaching ${ASK} first   ${score(by("knowledge"))}`)
console.log(`live questions going to a live read first    ${score(by("live"))}`)
console.log(`overall                                      ${score(rows)}`)
console.log(`${ASK} called anywhere in the turn           ${rows.filter((r) => r.called.includes(ASK)).length}/${rows.length}`)
console.log(`tool calls per question                      ${(rows.reduce((n, r) => n + r.called.length, 0) / rows.length).toFixed(2)}`)

// ── THE FETCH PATH, REPORTED SEPARATELY FROM THE SCORE ──────────────────────
//
// The score says which door a question opened. This says whether the two-stage
// catalogue WORKED — and it is reported apart from the score because a run where
// nothing needed a deferred tool would produce a fine score while measuring the
// same thing the pre-split bench measured.
if (!WHOLE) {
  const need = rows.filter((r) => r.deferred)
  const fetchedAny = rows.filter((r) => r.fetched.length)
  console.log()
  console.log(`questions needing a tool outside the core    ${need.length}`)
  console.log(`  …of those that fetched one                 ${need.filter((r) => r.fetched.length).length}/${need.length}`)
  console.log(`load_tools called on any question            ${fetchedAny.length}/${rows.length}`)
  if (fetchedAny.length)
    console.log(`  names fetched                              ${[...new Set(fetchedAny.flatMap((r) => r.fetched))].sort().join(", ")}`)
  // THE LOUD ONE. If nothing fetched, this run says nothing about the split, and
  // the number above it must not be quoted as if it did.
  if (!fetchedAny.length)
    console.log(
      `\n  !! NOT ONE QUESTION FETCHED A TOOL. This run exercised the core tools only,\n` +
        `     which is what the bench measured BEFORE the two-stage catalogue. Its score\n` +
        `     is not evidence about the split. Check that ${need.length} deferred question(s)\n` +
        `     really do need a tool outside CORE_TOOL_NAMES before trusting the figure.`
    )
} else {
  console.log()
  console.log(`  (--whole-catalogue: the PRE-SPLIT shape. Compare with a normal run;`)
  console.log(`   if the two scores and preamble sizes match, this bench is not seeing the split.)`)
}
// BESIDE THE SCORE, NEVER INSIDE IT — see `countedProperly`.
const counting = rows.filter((r) => r.countedProperly !== null)
if (counting.length)
  console.log(
    `counting questions asking for a COUNT           ${counting.filter((r) => r.countedProperly).length}/${counting.length}   (a page counted by hand is a right answer read expensively)`
  )

// THE SPEND LINE SITS HERE, ABOVE ANY EXIT. It was written below one once and
// two paid runs reported no cost at all — a cost print that never runs is the
// same class of fault this whole bench exists to catch.
// The rate depends on WHICH model ran. Printing Claude's rates for a Cloudflare
// run overstated a 12-cent bench as $2.40 — a cost line that is wrong is worse
// than none, because it is quoted.
//
// THE TABLE THAT USED TO BE HERE IS GONE (2026-09-05). It was the repo's second
// price list, it was undated, it named no source, and it did not carry the
// engine the deployment actually pins — so this bench's own "no published rate
// on file for @cf/moonshotai/kimi-k2.6" was a table being out of date rather
// than a price not existing. Prices are DATA now, in `shared/workers/pricing.ts`,
// with the page and the day they were read beside them, and there is one of
// them. A model this bench can reach that has no line there prints "unpriced"
// and says so, which is the honest answer and the one that gets fixed.
// A COST LINE THAT IS WRONG IS WORSE THAN NONE, because it is quoted — this
// file's own header says so about the run that reported a 12-cent bench as
// $2.40. It then did the same thing in the other direction: with no rate on
// file it printed "cost not computed" AND a dollar figure, computed at CLAUDE's
// per-token prices, for a Cloudflare model. Two runs of kimi-k2.6 printed $1.92
// each; the account's own meter says $0.18 for BOTH. So the fallback is gone.
//
// AND THE TOKEN COUNTS STAY, because they are the model's own numbers and they
// are true whatever anything costs. What replaces the guess is the instruction
// to go and read the meter, which is the only ground truth here: Cloudflare
// bills NEURONS, a model's metered neurons can be many times its price sheet
// (24× on deepseek-v4-pro, measured), and no per-token table can predict that.
const priced = aiCostUsd(runModel, { input: spend.input, output: spend.output })
const meteredNeurons = aiNeurons(runModel, { input: spend.input, output: spend.output })
console.log()
console.log(
  `tokens  in ${spend.input.toLocaleString()}  cache w ${spend.cacheWrite.toLocaleString()} r ${spend.cacheRead.toLocaleString()}  out ${spend.output.toLocaleString()}`
)
if (priced !== UNPRICED_MODEL)
  console.log(
    `at the published rate: ${usd(priced)} = about ${Math.round(meteredNeurons).toLocaleString()} neurons — ` +
      `an ESTIMATE, and now one you can CHECK: the neuron figure is the same arithmetic in Cloudflare's own ` +
      `billing unit, so it can be held against the account's analytics for this window without converting anything by hand.`
  )
else
  console.log(
    `${runModel} has no line in shared/workers/pricing.ts — add it (with its source and the day you read it) or read the meter.`
  )
console.log(
  "THE METER, which is the only ground truth: the account's own GraphQL,\n" +
    "  aiInferenceAdaptiveGroups { sum { totalNeurons } dimensions { modelId } }\n" +
    "  filtered to the window this run covers."
)
