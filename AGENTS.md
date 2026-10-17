# Pear Desktop Connector

The repository is the durable source of truth. Do not depend on earlier chat history.

- At each stage, fetch/pull, check out `dev/pear-port` (never work on `master`), inspect recent commits, and confirm the working tree is clean before edits.
- Read `docs/PROJECT_SPEC.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/DECISIONS.md`, `docs/MANUAL_TESTING.md`, and relevant files in `docs/research/` and `docs/checkpoints/` before implementing changes.
- Preserve the original MIT notices, XeroxDev attribution, and upstream Git history. Push only to the Scarfmeister fork.
- Use one shared Pear client/state model for all actions. Property Inspectors communicate through the plugin; commands do not optimistically confirm player state.
- Keep Pear Desktop changes in the separate Pear repository. Do not copy Pear source into this plugin or invent unsupported API behavior.
- Save useful external research in `docs/research/<topic>.md`, with sources, pinned versions/SHAs, conclusions, assumptions, unresolved questions, and implementation effects. Update `docs/DECISIONS.md` when architecture changes.
- Run applicable tests, type checks, builds, and package/manifest validation before committing. Fix failures introduced by the stage and distinguish automated results from unverified hardware behavior.
- Update `docs/IMPLEMENTATION_STATUS.md`, decisions as needed, and manual acceptance steps before stopping. Create `docs/checkpoints/stage-XX.md` with scope, completed work, changed components, validation/results, unresolved issues, manual tests, research links, tested/final commit references, and the exact next stage.
- Make logical commits, push them, verify the remote `dev/pear-port` head, and stop after the explicitly requested stage. Do not start another stage, publish a release, or create/merge a final PR without its stage authorization.
