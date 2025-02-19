/**
 * @fileoverview This is the entry point for the editorDiscovery page.
 * The page is expected to be loaded in an iframe.
 */

/**
 * @typedef {{
 * 	postWorkerMessage: import("./InternalDiscoveryWorker.js").InternalDiscoveryWorkerMessage,
 * 	destructor: null,
 * }} InternalDiscoveryWindowMessages
 */

/** @typedef {keyof InternalDiscoveryWindowMessages} InternalDiscoveryWindowMessageOp */
/**
 * @template {InternalDiscoveryWindowMessageOp} T
 * @typedef {T extends InternalDiscoveryWindowMessageOp ? {
 * 	op: T,
 * 	data: InternalDiscoveryWindowMessages[T],
 * } : never} InternalDiscoveryWindowMessageHelper
 */
/** @typedef {InternalDiscoveryWindowMessageHelper<InternalDiscoveryWindowMessageOp>} InternalDiscoveryWindowMessage */

// todo: fix this with deno
// Create the worker
// @rollup-plugin-resolve-url-objects
const url = new URL("./InternalDiscoveryWorker.js", import.meta.url);
const worker = new SharedWorker(url.href, {type: "module"});

// Handle messages from the worker.
worker.port.addEventListener("message", e => {
	if (!e.data) return;

	/** @type {Transferable[]} */
	let transferables = [];
	if (e.data.op == "connectionCreated") {
		transferables = [e.data.port];
	}
	window.parent.postMessage({
		op: "workerMessageReceived",
		data: e.data,
	}, "*", transferables);
});
worker.port.start();

// Clean up when the page is unloaded or a destructor message is received.
let destructed = false;
function destructor() {
	if (destructed) return;
	destructed = true;
	worker.port.postMessage({op: "unregisterClient"});
	worker.port.close();
}
window.addEventListener("unload", () => {
	destructor();
});

// Handle messages from the parent window
window.addEventListener("message", e => {
	if (!e.data) return;

	/** @type {InternalDiscoveryWindowMessage} */
	const message = e.data;

	const {op, data} = message;

	if (op == "postWorkerMessage") {
		worker.port.postMessage(data);
	} else if (op == "destructor") {
		destructor();
	}
});

// Notify the parent window that the page is ready.
if (window.parent !== window) {
	window.parent.postMessage({op: "inspectorDiscoveryLoaded"}, "*");
}
