# Local tool policy

The trial launcher disables potentially destructive or outward-facing tools through the host's configuration, including command execution, process management, patch application, browser actions and outbound messaging.

This is a **read-oriented first boot**. Workspace memory and permitted file tools remain subject to the gateway's own authorization and sandbox semantics. Do not assume the host workspace is a security sandbox.

If a requested operation needs a disabled tool, describe the blocked dependency; do not claim to have executed it. Add capabilities only after an explicit owner decision and a verified rollback path.
