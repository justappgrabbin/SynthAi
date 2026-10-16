/**
 * APPRENTICESHIP BRIDGE
 *
 * External help is temporary evidence, never Synthia's cognitive core.
 * Order:
 *   1. native capability
 *   2. local knowledge / local composition
 *   3. bounded external apprenticeship (when a provider is explicitly attached)
 *   4. capture lesson
 *   5. grow native process
 *   6. verify native process against the learned case
 *   7. retire external dependency for that capability
 *
 * This module contains no vendor/API dependency. Providers are ports.
 */
export class ApprenticeshipBridge {
  constructor({ nativeGenerator = null, localResearchers = [] } = {}) {
    this.nativeGenerator = nativeGenerator;
    this.localResearchers = [...localResearchers];
    this.providers = [];
    this.lessons = new Map();
    this.nativeMastery = new Set();
    this.audit = [];
  }

  addLocalResearcher(researcher) {
    if (typeof researcher !== 'function') throw new TypeError('local researcher must be a function');
    this.localResearchers.push(researcher);
    return this;
  }

  addExternalProvider(provider) {
    if (!provider || typeof provider.learn !== 'function')
      throw new TypeError('external provider requires learn(gap, context)');
    this.providers.push(provider);
    return this;
  }

  key(expression) {
    return [...new Set(expression?.capabilities || [])].map(String).sort().join('+');
  }

  async ensureTool(expression, context) {
    const key = this.key(expression);
    if (!key) return null;

    // Once mastered, external help is forbidden for this capability.
    if (this.nativeMastery.has(key))
      return this.nativeGenerator?.ensureTool(expression, context) || null;

    // Native growth always gets first attempt.
    const native = await this.nativeGenerator?.ensureTool(expression, context);
    if (native) return this.wrapNative(native, key);

    // Search/derive from local knowledge before outsourcing.
    for (const researcher of this.localResearchers) {
      const lesson = await researcher({ capabilityKey: key, expression, context });
      if (!lesson) continue;
      this.recordLesson(key, lesson, 'local');
      const learned = await this.nativeGenerator?.ensureTool(expression, {
        ...context, apprenticeship: { source: 'local', lesson }
      });
      if (learned) return this.wrapNative(learned, key);
    }

    // Temporary outsourcing: obtain a worked example/answer so the immediate
    // human task can continue AND preserve it as training evidence.
    for (const provider of this.providers) {
      const lesson = await provider.learn(
        { capabilityKey: key, expression },
        this.safeContext(context)
      );
      if (!lesson) continue;
      this.recordLesson(key, lesson, provider.id || 'external');

      // Immediately attempt to internalize what was learned.
      const learned = await this.nativeGenerator?.ensureTool(expression, {
        ...context,
        apprenticeship: { source: provider.id || 'external', lesson }
      });
      if (learned) return this.wrapNative(learned, key, lesson);

      // If native growth is not ready yet, use the external result only as a
      // bounded temporary tool. It advertises itself as outsourced so runtime
      // evidence can distinguish apprenticeship from mastery.
      return this.temporaryTool(key, lesson, provider);
    }
    return null;
  }

  wrapNative(tool, key, lesson = null) {
    const execute = tool.execute.bind(tool);
    return {
      ...tool,
      apprenticeship: { mode: 'native-candidate', capabilityKey: key },
      execute: async (ctx) => {
        const result = await execute(ctx);
        if (result?.success) {
          this.nativeMastery.add(key);
          this.audit.push({ type:'MASTERED', capabilityKey:key, toolId:tool.toolId, at:Date.now() });
        }
        return result;
      }
    };
  }

  temporaryTool(key, lesson, provider) {
    const toolId = `apprentice:${provider.id || 'external'}:${key}`;
    return {
      toolId,
      name: `Temporary apprenticeship for ${key}`,
      provides: key.split('+'),
      requires: [],
      temporary: true,
      outsourced: true,
      accepts: candidate => candidate.capabilities.every(c => key.split('+').includes(c)),
      execute: async () => ({
        success: true,
        outputValues: { output: lesson.output ?? lesson, apprenticeship: true, source: provider.id || 'external' },
        expressionNodes: [],
        provenance: [{
          recordId:`prov_${toolId}_${Date.now()}`,
          timestamp:Date.now(),
          sourceType:'APPRENTICESHIP',
          sourceId:provider.id || 'external',
          description:`Temporary external execution while Synthia learns ${key}`,
          resultingNodeIds:[]
        }]
      })
    };
  }

  recordLesson(key, lesson, source) {
    const list = this.lessons.get(key) || [];
    list.push({ source, lesson: structuredClone(lesson), at: Date.now() });
    this.lessons.set(key, list);
    this.audit.push({ type:'LEARNED_CASE', capabilityKey:key, source, at:Date.now() });
  }

  safeContext(context) {
    return {
      sessionId: context?.sessionId,
      expression: structuredClone(context?.expression || {}),
      inputValues: {
        intent: context?.inputValues?.intent,
        parameters: structuredClone(context?.expression?.parameters || {})
      }
    };
  }

  snapshot() {
    return {
      mastered: [...this.nativeMastery],
      lessons: Object.fromEntries([...this.lessons].map(([k,v]) => [k, structuredClone(v)])),
      externalProviders: this.providers.map(p => p.id || 'external'),
      audit: structuredClone(this.audit)
    };
  }
}
export default ApprenticeshipBridge;
