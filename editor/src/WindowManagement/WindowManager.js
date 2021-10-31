import EditorWindowSplit from "./EditorWindowSplit.js";
import EditorWindowTabs from "./EditorWindowTabs.js";
import {contentWindows} from "./ContentWindows/ContentWindows.js";
import ContentWindow from "./ContentWindows/ContentWindow.js";
import WorkspaceManager from "./WorkspaceManager.js";
import {generateUuid} from "../Util/Util.js";

export default class WindowManager {
	constructor() {
		this.rootWindow = null;
		/** @type {WeakRef<ContentWindow>[]} */
		this.lastFocusedContentWindows = [];

		this.isLoadingWorkspace = false;
		this.workspaceManager = new WorkspaceManager();
		this.workspaceManager.onCurrentWorkspaceIdChange(() => {
			this.reloadCurrentWorkspace();
		});

		/** @type {Map<string, typeof ContentWindow>} */
		this.registeredContentWindows = new Map();

		for (const w of contentWindows) {
			this.registerContentWindow(w);
		}

		this.tabDragEnabled = false;

		this.tabDragFeedbackEl = document.createElement("div");
		this.tabDragFeedbackEl.classList.add("tabDragFeedback");

		window.addEventListener("resize", () => {
			if (this.rootWindow) {
				this.rootWindow.onResized();
			}
		});
	}

	init() {
		this.reloadCurrentWorkspace();
	}

	/**
	 * @param {import("./EditorWindow.js").default} newRootWindow
	 * @param {boolean} [destructOldRoot]
	 */
	replaceRootWindow(newRootWindow, destructOldRoot = true) {
		if (destructOldRoot) this.rootWindow.destructor();
		this.rootWindow = newRootWindow;
		this.markRootWindowAsRoot();
		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
		this.autoSaveWorkspace();
	}

	async reloadCurrentWorkspace() {
		const workspaceData = await this.workspaceManager.getCurrentWorkspace();
		this.loadWorkspace(workspaceData);
	}

	async autoSaveWorkspace() {
		const autoSaveValue = await this.workspaceManager.getAutoSaveValue();
		if (autoSaveValue) {
			await this.saveWorkspace();
		}
	}

	async saveWorkspace() {
		const workspaceData = this.getCurrentWorkspaceData();
		await this.workspaceManager.saveCurrentWorkspace(workspaceData);
	}

	getCurrentWorkspaceData() {
		const rootWindow = this.serializeWorkspaceWindow(this.rootWindow);
		return {rootWindow};
	}

	loadWorkspace(workspace) {
		this.isLoadingWorkspace = true;

		if (this.rootWindow) {
			this.rootWindow.destructor();
		}
		this.lastFocusedContentWindows = [];
		this.rootWindow = this.parseWorkspaceWindow(workspace.rootWindow);
		this.markRootWindowAsRoot();
		this.parseWorkspaceWindowChildren(workspace.rootWindow, this.rootWindow);

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();

		this.isLoadingWorkspace = false;
	}

	markRootWindowAsRoot() {
		this.rootWindow.setRoot();
		this.rootWindow.onWorkspaceChange(() => {
			if (!this.isLoadingWorkspace) {
				this.autoSaveWorkspace();
			}
		});
	}

	/**
	 * @param {import("./WorkspaceManager.js").WorkspaceDataWindow} workspaceWindowData
	 */
	parseWorkspaceWindow(workspaceWindowData) {
		/** @type {import("./EditorWindow.js").default} */
		let newWindow = null;
		if (workspaceWindowData.type == "split") {
			newWindow = new EditorWindowSplit();
			const castWindow = /** @type {EditorWindowSplit} */ (newWindow);
			const castWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */ (workspaceWindowData);
			castWindow.splitHorizontal = castWindowData.splitHorizontal;
			castWindow.splitPercentage = castWindowData.splitPercentage;
		} else if (workspaceWindowData.type == "tabs") {
			newWindow = new EditorWindowTabs();
			const castWindow = /** @type {EditorWindowTabs} */ (newWindow);
			const castWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowTabs} */ (workspaceWindowData);
			for (let i = 0; i < castWindowData.tabTypes.length; i++) {
				let uuid = castWindowData.tabUuids[i];
				if (!uuid) uuid = generateUuid();
				castWindow.setTabType(i, castWindowData.tabTypes[i], uuid);
			}
			castWindow.setActiveTabIndex(castWindowData.activeTabIndex || 0);
			castWindow.onTabChange(() => {
				this.addContentWindowToLastFocused(castWindow.activeTab);
			});
			castWindow.onFocusedChange(hasFocus => {
				if (hasFocus) {
					this.addContentWindowToLastFocused(castWindow.activeTab);
				}
			});
		}
		return newWindow;
	}

	/**
	 * @param {ContentWindow} contentWindow
	 */
	addContentWindowToLastFocused(contentWindow) {
		for (const existingWeakRef of [...this.lastFocusedContentWindows]) {
			const existing = existingWeakRef.deref();
			if (!existing || existing == contentWindow) {
				this.lastFocusedContentWindows.splice(this.lastFocusedContentWindows.indexOf(existingWeakRef), 1);
			}
		}
		this.lastFocusedContentWindows.unshift(new WeakRef(contentWindow));
	}

	/**
	 *
	 * @param {import("./WorkspaceManager.js").WorkspaceDataWindow} workspaceWindowData
	 * @param {import("./EditorWindow.js").default} existingWorkspaceWindow
	 */
	parseWorkspaceWindowChildren(workspaceWindowData, existingWorkspaceWindow) {
		if (workspaceWindowData.type == "split") {
			const castWorkspaceWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */ (workspaceWindowData);
			const windowA = this.parseWorkspaceWindow(castWorkspaceWindowData.windowA);
			const windowB = this.parseWorkspaceWindow(castWorkspaceWindowData.windowB);
			const castExistingWorkspaceWindow = /** @type {import("./EditorWindowSplit.js").default} */ (existingWorkspaceWindow);
			castExistingWorkspaceWindow.setWindows(windowA, windowB);
			this.parseWorkspaceWindowChildren(castWorkspaceWindowData.windowA, castExistingWorkspaceWindow.windowA);
			this.parseWorkspaceWindowChildren(castWorkspaceWindowData.windowB, castExistingWorkspaceWindow.windowB);
		}
	}

	/**
	 * @param {import("./EditorWindow.js").default} workspaceWindow
	 * @returns {import("./WorkspaceManager.js").WorkspaceDataWindow}
	 */
	serializeWorkspaceWindow(workspaceWindow) {
		if (workspaceWindow instanceof EditorWindowSplit) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */
			const data = {
				type: "split",
				splitHorizontal: workspaceWindow.splitHorizontal,
				splitPercentage: workspaceWindow.splitPercentage,
				windowA: this.serializeWorkspaceWindow(workspaceWindow.windowA),
				windowB: this.serializeWorkspaceWindow(workspaceWindow.windowB),
			};
			return data;
		} else if (workspaceWindow instanceof EditorWindowTabs) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowTabs} */
			const data = {
				type: "tabs",
				tabTypes: workspaceWindow.tabTypes,
				activeTabIndex: workspaceWindow.activeTabIndex,
				tabUuids: workspaceWindow.tabs.map(tab => tab.uuid),
			};
			return data;
		}
		return null;
	}

	/**
	 * @param {typeof ContentWindow} constructor
	 */
	registerContentWindow(constructor) {
		if (!(constructor.prototype instanceof ContentWindow)) {
			console.warn("Tried to register content window (" + constructor.name + ") that does not extend ContentWindow class.");
			return;
		}
		if (typeof constructor.contentWindowTypeId != "string") {
			console.warn("Tried to register content window (" + constructor.name + ") with no type id, override the static contentWindowTypeId property in order for this content window to function properly");
			return;
		}

		this.registeredContentWindows.set(constructor.contentWindowTypeId, constructor);

		for (const w of this.allEditorWindows()) {
			w.onContentWindowRegistered(constructor);
		}
	}

	getContentWindowConstructorByType(type) {
		return this.registeredContentWindows.get(type);
	}

	*allEditorWindows() {
		if (!this.rootWindow) return;
		yield this.rootWindow;
		for (const child of this.rootWindow.getChildren()) {
			yield child;
		}
	}

	/**
	 * @returns {Generator<EditorWindowTabs>}
	 */
	*allTabWindows() {
		for (const w of this.allEditorWindows()) {
			if (w instanceof EditorWindowTabs) {
				yield w;
			}
		}
	}

	*allContentWindows() {
		for (const w of this.allTabWindows()) {
			for (const tab of w.tabs) {
				yield tab;
			}
		}
	}

	/**
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @returns {Generator<T>}
	 */
	*getContentWindowsByConstructor(contentWindowConstructor) {
		for (const w of this.allContentWindows()) {
			if (w instanceof contentWindowConstructor) {
				yield w;
			}
		}
	}

	/**
	 * Get the first content window of the given type.
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @param {boolean} create Whether to create a new content window if none exist.
	 * @returns {T}
	 */
	getOrCreateContentWindowByConstructor(contentWindowConstructor, create = true) {
		for (const w of this.getContentWindowsByConstructor(contentWindowConstructor)) {
			return w;
		}
		if (create) {
			for (const w of this.allEditorWindows()) {
				if (w instanceof EditorWindowTabs) {
					const castConstructorAny = /** @type {*} */ (contentWindowConstructor);
					const castConstructor = /** @type {typeof ContentWindow} */ (castConstructorAny);
					const created = w.addTabType(castConstructor.contentWindowTypeId);
					/* eslint-disable jsdoc/no-undefined-types */
					return /** @type {T} */ (created);
					/* eslint-enable jsdoc/no-undefined-types */
				}
			}
		}
		return null;
	}

	/**
	 * Get the last focused content window of the specefied type.
	 * If no content window of the type has ever been focused, returns the first available content window of that type.
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @param {boolean} create Whether to create a new content window if none exist.
	 * @returns {T}
	 */
	getMostSuitableContentWindowByConstructor(contentWindowConstructor, create = true) {
		for (const weakRef of this.lastFocusedContentWindows) {
			const ref = weakRef.deref();
			if (!ref) continue;
			if (ref instanceof contentWindowConstructor) {
				return ref;
			}
		}
		return this.getOrCreateContentWindowByConstructor(contentWindowConstructor, create);
	}

	/**
	 * @param {string} type
	 * @returns {Generator<ContentWindow>}
	 */
	*getContentWindowsByType(type) {
		const contentWindowConstructor = this.getContentWindowConstructorByType(type);
		yield* this.getContentWindowsByConstructor(contentWindowConstructor);
	}

	/**
	 * @param {string} uuid
	 * @returns {ContentWindow?}
	 */
	getContentWindowByUuid(uuid) {
		for (const contentWindow of this.allContentWindows()) {
			if (contentWindow.uuid == uuid) return contentWindow;
		}
		return null;
	}

	/**
	 * Focuses on the most suitable content window of the specified type.
	 * Creates one if it doesn't exist.
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @returns {T}
	 */
	focusOrCreateContentWindow(contentWindowConstructor) {
		const contentWindow = this.getMostSuitableContentWindowByConstructor(contentWindowConstructor);
		contentWindow.parentEditorWindow.focus();
		contentWindow.parentEditorWindow.setActiveContentWindow(contentWindow);
		return contentWindow;
	}

	createNewContentWindow(type) {
		for (const w of this.allEditorWindows()) {
			if (w instanceof EditorWindowTabs) {
				return w.addTabType(type);
			}
		}
		return null;
	}

	get lastFocusedContentWindow() {
		for (const contentWindow of this.lastFocusedContentWindows) {
			const ref = contentWindow.deref();
			if (ref) return ref;
		}
		return null;
	}

	/**
	 * @param {boolean} enabled
	 */
	setTabDragEnabled(enabled) {
		if (enabled == this.tabDragEnabled) return;
		this.tabDragEnabled = enabled;

		for (const w of this.allTabWindows()) {
			w.setTabDragOverlayEnabled(enabled);
		}
		if (enabled) {
			document.body.appendChild(this.tabDragFeedbackEl);
		} else {
			document.body.removeChild(this.tabDragFeedbackEl);
		}
	}

	/**
	 * @param {number} left
	 * @param {number} top
	 * @param {number} width
	 * @param {number} height
	 */
	setTabDragFeedbackRect(left, top, width, height) {
		this.tabDragFeedbackEl.style.transform = `translate(${left}px, ${top}px) scaleX(${width / 100}) scaleY(${height / 100})`;
	}
}
