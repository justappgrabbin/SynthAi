// Native-lane compatibility entrypoint.
// The canonical Termux host adapter lives in computer/adapters so ATO/Tool Factory
// own the compile recipe and the host only executes explicit argv steps.
export { TermuxCompilerAdapter, TermuxCompilerAdapter as default } from '../adapters/termux-compiler.mjs';
