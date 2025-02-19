import {EDITOR_ENV} from "../../editorDefines.js";
import {ContentWindowPersistentData} from "../ContentWindowPersistentData.js";

export class ContentWindow {
	/**
	 * Should be overridden by inherited class.
	 * This name will be used for saving the users workspace.
	 * @type {string}
	 */
	static contentWindowTypeId = "";

	/**
	 * Should be overridden by inherited class.
	 * This name will be visible in the UI.
	 * @type {string}
	 */
	static contentWindowUiName = "";

	/**
	 * The icon that is visible in the tab selector.
	 * @type {string}
	 */
	static contentWindowUiIcon = "icons/generic.svg";

	/**
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {import("../WindowManager.js").WindowManager} windowManager
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 */
	constructor(editorInstance, windowManager, uuid) {
		this.editorInstance = editorInstance;
		this.windowManager = windowManager;

		/** @type {import("../EditorWindowTabs.js").EditorWindowTabs?} */
		this.parentEditorWindow = null;
		/**
		 * The instance uuid of the ContentWindow.
		 * This is used for dragging tabs and associating the ContentWindow with the persistent data.
		 */
		this.uuid = uuid;

		this.persistentData = new ContentWindowPersistentData();

		this.destructed = false;

		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");

		if (EDITOR_ENV == "dev") {
			const castConstructor = /** @type {typeof ContentWindow} */ (this.constructor);
			this.el.dataset.contentWindowTypeId = castConstructor.contentWindowTypeId;
		}

		this.topButtonBar = document.createElement("div");
		this.topButtonBar.classList.add("editorContentWindowTopButtonBar");
		this.el.appendChild(this.topButtonBar);

		this.tabSelectorSpacer = document.createElement("div");
		this.tabSelectorSpacer.classList.add("editorContentWindowTopButtonBarSpacer");
		this.topButtonBar.appendChild(this.tabSelectorSpacer);

		this.contentEl = document.createElement("div");
		this.contentEl.classList.add("editorContentWindowContent");
		this.el.appendChild(this.contentEl);

		if (this.loop != ContentWindow.prototype.loop) {
			window.requestAnimationFrame(this._loop.bind(this));
		}
	}

	/**
	 * Gets called after the content window is attached to the dom,
	 * {@link onWindowResize} will be called once after this.
	 */
	init() {}

	destructor() {
		this.destructed = true;
	}

	/**
	 * @param {import("../EditorWindowTabs.js").EditorWindowTabs} parentEditorWindow
	 */
	attachParentEditorWindow(parentEditorWindow) {
		this.parentEditorWindow = parentEditorWindow;
	}

	detachParentEditorWindow() {
		if (!this.parentEditorWindow) return;
		this.parentEditorWindow.contentWindowDetached(this);
		this.parentEditorWindow = null;
	}

	/**
	 * @param {boolean} visible
	 */
	setVisible(visible) {
		this.el.classList.toggle("hidden", !visible);
	}

	/**
	 * @param {number} w
	 * @param {number} h
	 */
	updateTabSelectorSpacer(w, h) {
		this.tabSelectorSpacer.style.width = w + "px";
		this.tabSelectorSpacer.style.height = h + "px";
	}

	/**
	 * Changes the behaviour of where the content window is rendered.
	 * If true the buttons of the top bar will be rendered on top of the
	 * content and the content will be extended to the top edge of the window.
	 * @param {boolean} value
	 */
	setContentBehindTopBar(value) {
		this.contentEl.classList.toggle("behindTopButtonBar", value);
	}

	get contentWidth() {
		return this.contentEl.clientWidth;
	}
	get contentHeight() {
		return this.contentEl.clientHeight;
	}

	fireOnWindowResize() {
		this.onWindowResize(this.contentWidth, this.contentHeight);
	}

	/**
	 * This will be called once when the content window is attached to the dom,
	 * and subsequently when the window is resized.
	 * @param {number} w
	 * @param {number} h
	 */
	onWindowResize(w, h) {}

	isMostSuitableContentWindow() {
		const castConstructor = /** @type {typeof ContentWindow} */ (this.constructor);
		const mostSuitable = this.windowManager.getMostSuitableContentWindowByConstructor(castConstructor, false);
		return mostSuitable == this;
	}

	/**
	 * @param {HTMLElement} element
	 */
	addTopBarEl(element) {
		this.topButtonBar.appendChild(element);
	}

	_loop() {
		if (this.destructed) return;
		this.loop();
		window.requestAnimationFrame(this._loop.bind(this));
	}

	loop() {}
}
