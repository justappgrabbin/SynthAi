import {
	AutomataMesh,
	Automaton,
} from "../ato-core/automaton.mjs";
import {
	StateSpaceKernel,
} from "../ato-core/state-space-kernel.mjs";
import {
	TraceFiringRegistry,
} from "../ato-core/trace-firing.mjs";
import {
	bootstrapKleinTools,
} from "../ato-core/klein-tools.mjs";
import {
	computationalGrammarCoderAutomaton,
} from "../ato-core/computational-grammar-coder.mjs";
import { semanticRead } from "./semanticMesh.mjs";
import { ProportionOfPerspective } from "./perspectives.mjs";
import { LocalMorphProvider } from "./providers.mjs";
import { OptionalMeshTools } from "./optionalMeshTools.mjs";

export const CHAT_PHASES = Object.freeze([
	"IDLE",
	"RECEIVE",
	"PARSE",
	"ACTIVATE_MESH",
	"RESOLVE_MEANING",
	"FORM_RESPONSE_INTENT",
	"REALIZE_LANGUAGE",
	"EMIT",
	"LEARN",
	"IDLE",
]);

function now() {
	return new Date().toISOString();
}

function freezeMessage(message) {
	return Object.freeze({ ...message });
}

function traceCueFromState(text, semantic, kernel) {
	const candidate = kernel.describe(text).candidates[0]?.state?.address || {
		mode: "macro",
		gate: 1,
		line: 1,
		color: 1,
		tone: 1,
		base: 1,
	};
	const dimension = ["Movement", "Evolution", "Being", "Design", "Space"]
		.indexOf(semantic.dimension);
	return Object.freeze({
		text,
		intent: semantic.intent,
		dimension: Math.max(0, dimension),
		gate: candidate.gate - 1,
		line: candidate.line - 1,
		color: candidate.color - 1,
		tone: candidate.tone - 1,
		base: candidate.base - 1,
	});
}


const FUNCTION_WORDS = new Set([
	"the", "a", "an", "this", "that", "these", "those", "and", "or", "but",
	"if", "in", "on", "at", "of", "to", "for", "with", "from", "by", "about",
	"i", "you", "he", "she", "it", "we", "they", "is", "are", "was", "were",
	"be", "been", "have", "has", "do", "does", "will", "would", "can", "could",
	"shall", "should", "may", "might", "must",
]);

function refineSemantic(base, linguistic, concepts) {
	const nodes = linguistic?.pipeline?.parseTree?.nodes || [];
	const contentNode = nodes.find((node) => {
		const word = String(node?.surface || "").toLowerCase();
		return word && !FUNCTION_WORDS.has(word) && !["DET", "AUX", "PREP", "CONJ", "PRON", "ART"].includes(node?.pos);
	});
	const fallback = (base.tokens || []).find((word) => !FUNCTION_WORDS.has(String(word).toLowerCase()));
	return Object.freeze({
		...base,
		focus: contentNode?.surface || fallback || base.focus,
		linguisticGrounded: Boolean(linguistic?.pipeline),
		diseminerFamiliarity: Number(concepts?.sense?.familiar || 0),
	});
}

function compactContribution(label, value) {
	if (value === null || value === undefined) return null;
	return `${label}: ${String(value)}`;
}

function createMorphChatAutomaton({ perspective, coder, klein, optionalTools, invokeTool }) {
	return new Automaton({
		id: "morph-chat",
		address: { mode: "macro", gate: 49, line: 1, color: 1, tone: 1, base: 1 },
		structure: "hexagram",
		activeLevels: [1, 2, 3, 4, 5],
		functionalLevel: "mind",
		ports: [
			{ id: "cue", direction: "input", type: "morph-chat-cue", schemaVersion: "1" },
			{ id: "intent", direction: "output", type: "morph-response-intent", schemaVersion: "1" },
		],
		metadata: {
			family: "morph-chat",
			independent: true,
			role: "conversation-interface",
			meaningOwnsWording: false,
		},
		implementation: async (cue, { context }) => {
			const baseSemantic = semanticRead(cue.text);
			const history = context?.history || [];
			// AUTOLING and DISEMINER are resolved through the shared tool bridge when
			// available. This prevents Morph Chat from maintaining disconnected copies
			// of the same logical Klein processes. The local ATO copies remain valid
			// fallback hands, but they use explicit operation-shaped inputs.
			const [linguistic, concepts] = await Promise.all([
				invokeTool("autoling", cue.text, { source: "morph-chat", role: "linguistic-analysis" }),
				invokeTool("diseminer", cue.text, { source: "morph-chat", role: "concept-distribution" }),
			]);
			const semantic = refineSemantic(baseSemantic, linguistic, concepts);
			const perspectiveResult = await perspective.read({
				text: cue.text,
				semantic,
				history,
			});
			const codeAnalysis = semantic.intent === "code"
				? await coder.call({ text: cue.text })
				: null;
			const meshTools = await optionalTools.run(cue.text);
			const physiology = context?.sharedContext?.physiology || null;
			const contributions = [
				compactContribution("focus", semantic.focus),
				compactContribution("AUTOLING-rules", linguistic?.pipeline?.phraseStructure?.newRules?.length ?? 0),
				compactContribution("DISEMINER-familiarity", concepts?.sense?.familiar ?? 0),
				compactContribution("runtime", context?.sharedContext?.summary || null),
				compactContribution("physiology-felt", physiology?.felt?.feltState || null),
				compactContribution("physiology-want", physiology?.felt?.dominantWant || null),
				compactContribution("physiology-stage", physiology?.innerLife?.stage || null),
			].filter(Boolean);
			const woven = await invokeTool("conversation", {
				text: cue.text,
				contributions,
			}, { source: "morph-chat", role: "semantic-weave" });
			return Object.freeze({
				semantic,
				perspective: perspectiveResult,
				linguistic,
				concepts,
				woven,
				sharedContext: context?.sharedContext || null,
				codeAnalysis,
				meshTools,
				responseIntent: Object.freeze({
					focus: semantic.focus,
					intent: semantic.intent,
					dimension: semantic.dimension,
					requiresCode: semantic.intent === "code",
				}),
			});
		},
	});
}

/**
 * MorphChatRuntime is the conversational port into the mesh.
 *
 * It coordinates independent automatons, stores session conversation state,
 * and delegates final wording to a replaceable provider.
 */
export class MorphChatRuntime extends EventTarget {
	constructor({
		mesh = new AutomataMesh(),
		kernel = new StateSpaceKernel(),
		provider = new LocalMorphProvider(),
		maxMessages = 120,
		toolMeshes = [],
	} = {}) {
		super();
		this.mesh = mesh;
		this.kernel = kernel;
		this.provider = provider;
		this.maxMessages = maxMessages;
		this.messages = [];
		this.toolInvoker = null;
		this.phase = "IDLE";
		this.turn = 0;
		this.last = null;
		this.optionalTools = new OptionalMeshTools({
			meshes: [mesh, ...toolMeshes],
		});

		this.perspective = new ProportionOfPerspective({ mesh });
		const kleinTools = bootstrapKleinTools(mesh);
		this.klein = new Map(kleinTools.map((tool) => [tool.id, tool]));
		this.coder = computationalGrammarCoderAutomaton();
		if (!mesh.automatons.has(this.coder.id)) mesh.add(this.coder);
		else this.coder = mesh.automatons.get(this.coder.id);

		this.chatAutomaton = createMorphChatAutomaton({
			perspective: this.perspective,
			coder: this.coder,
			klein: this.klein,
			optionalTools: this.optionalTools,
			invokeTool: (id, input, context = {}) => this.invokeTool(id, input, context),
		});
		if (!mesh.automatons.has(this.chatAutomaton.id)) mesh.add(this.chatAutomaton);
		else this.chatAutomaton = mesh.automatons.get(this.chatAutomaton.id);

		this.trace = new TraceFiringRegistry({ mesh });
	}


	setToolInvoker(invoker) {
		if (invoker !== null && typeof invoker !== "function") {
			throw new TypeError("Morph Chat tool invoker must be a function or null.");
		}
		this.toolInvoker = invoker;
		return this;
	}

	async invokeTool(id, input, context = {}) {
		if (this.toolInvoker) return this.toolInvoker(id, input, context);
		const tool = this.klein.get(id);
		if (!tool) return null;
		let shaped = input;
		if (typeof input === "string") {
			if (id === "autoling") shaped = { operation: "recognize", text: input };
			else if (id === "diseminer") shaped = { operation: "ingest", text: input };
		}
		return tool.call(shaped, context);
	}

	attachToolMesh(mesh) {
		this.optionalTools.attach(mesh);
		return this;
	}

	detachToolMesh(mesh) {
		this.optionalTools.detach(mesh);
		return this;
	}

	setProvider(provider) {
		if (!provider || typeof provider.generate !== "function") {
			throw new TypeError("Morph Chat provider must expose generate(context).");
		}
		this.provider = provider;
		return this;
	}

	setPhase(phase) {
		this.phase = phase;
		this.dispatchEvent(new CustomEvent("phase", { detail: phase }));
	}

	push(role, text, meta = {}) {
		const message = freezeMessage({
			id: `morph-${++this.turn}-${role}`,
			role,
			text: String(text),
			at: now(),
			...meta,
		});
		this.messages.push(message);
		if (this.messages.length > this.maxMessages) {
			this.messages.splice(0, this.messages.length - this.maxMessages);
		}
		return message;
	}

	async send(input, { sharedContext = null } = {}) {
		const text = String(input || "").trim();
		if (!text) throw new TypeError("Morph Chat needs a message.");

		this.setPhase("RECEIVE");
		const user = this.push("user", text);
		this.setPhase("PARSE");
		const semantic = semanticRead(text);
		const cue = traceCueFromState(text, semantic, this.kernel);

		this.setPhase("ACTIVATE_MESH");
		const learned = this.trace.learn(cue, this.chatAutomaton.id);
		const fired = await this.trace.fire(cue, {
			context: Object.freeze({
				history: Object.freeze([...this.messages]),
				sharedContext,
			}),
		});
		if (!fired.activated || !fired.circuitResult) {
			throw new Error("Morph Chat trace did not activate its bound automaton.");
		}

		this.setPhase("RESOLVE_MEANING");
		const material = fired.circuitResult;
		this.setPhase("FORM_RESPONSE_INTENT");

		const providerContext = Object.freeze({
			text,
			semantic: material.semantic,
			perspective: material.perspective,
			codeAnalysis: material.codeAnalysis,
			linguistic: material.linguistic,
			concepts: material.concepts,
			woven: material.woven,
			sharedContext: material.sharedContext,
			meshTools: material.meshTools,
			trace: fired,
			history: Object.freeze([...this.messages]),
		});

		this.setPhase("REALIZE_LANGUAGE");
		let response;
		let providerId = this.provider.id || "custom";
		let fallback = false;
		try {
			response = await this.provider.generate(providerContext);
		} catch (error) {
			if (this.provider instanceof LocalMorphProvider) throw error;
			fallback = true;
			providerId = "local-morph";
			response = await new LocalMorphProvider().generate(providerContext);
		}

		this.setPhase("EMIT");
		const assistant = this.push("assistant", response, {
			provider: providerId,
			trace: fired.trace,
			fallback,
		});

		this.setPhase("LEARN");
		this.last = Object.freeze({
			user,
			assistant,
			trace: Object.freeze({
				id: fired.trace,
				bound: learned.automatonId,
				activated: fired.activated,
				completion: fired.completion,
			}),
			semantic: material.semantic,
			perspective: material.perspective,
			codeAnalysis: material.codeAnalysis,
			linguistic: material.linguistic,
			concepts: material.concepts,
			woven: material.woven,
			sharedContext: material.sharedContext,
			meshTools: material.meshTools,
			provider: providerId,
			fallback,
		});
		this.setPhase("IDLE");
		this.dispatchEvent(new CustomEvent("message", { detail: this.last }));
		return this.last;
	}

	clear() {
		this.messages.length = 0;
		this.last = null;
		this.phase = "IDLE";
		this.dispatchEvent(new CustomEvent("clear"));
	}

	snapshot() {
		return Object.freeze({
			phase: this.phase,
			messages: Object.freeze([...this.messages]),
			last: this.last,
			trace: this.trace.snapshot(),
			mesh: this.mesh.snapshot(),
			kleinTools: Object.freeze([...this.klein.keys()].sort()),
			coder: this.coder.id,
			optionalTools: this.optionalTools.snapshot(),
			sharedToolBridge: Boolean(this.toolInvoker),
		});
	}
}

export default new MorphChatRuntime();
