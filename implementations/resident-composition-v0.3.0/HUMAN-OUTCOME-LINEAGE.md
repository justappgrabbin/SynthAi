# Human outcome lineage repair

Source rule: preserve the expectation recorded before observation, and retain landed history when later evidence or corrections arrive. Human success is defined by the person; executing a tool does not establish it.

The existing HumanOutcomeLedger and ScienceMode are reused. observeResult now appends a result with parentId and hypothesisId rather than overwriting the original record. Science reports expose linked result identifiers and preserve the original hypothesis status. A result remains an observation, not automatic support for a hypothesis.

Validation: all 13 assembly tests pass, including separate expectations/results/corrections, defensive copying of result evidence, persistent-memory reload, report linkage, and rejecting unknown parents.

Open boundaries: LocalMemory retains at most 500 records per namespace; durable unlimited archival is not established. ScienceMode reports a limited recent window. Existing success-metabolism coefficients and relevance rules are not validated as human-success laws. Purpose, success evidence, and initiative preferences await the user's answers. This patch introduces no replacement metric or new permission.
