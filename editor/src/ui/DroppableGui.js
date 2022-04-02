import {getEditorInstance} from "../editorInstance.js";
import {parseMimeType} from "../util/util.js";
import {ProjectAsset} from "../assets/ProjectAsset.js";
import {ContentWindowDefaultAssetLinks} from "../windowManagement/contentWindows/ContentWindowDefaultAssetLinks.js";
import {ContentWindowBuiltInAssets} from "../windowManagement/contentWindows/ContentWindowBuiltInAssets.js";
import {ContentWindowProject} from "../windowManagement/contentWindows/ContentWindowProject.js";

/**
 * @typedef DroppableGuiDependencies
 * @property {import("../projectSelector/ProjectManager.js").ProjectManager} projectManager
 * @property {import("../misc/DragManager.js").DragManager} dragManager
 * @property {import("../windowManagement/WindowManager.js").WindowManager} windowManager
 * @property {import("./contextMenus/ContextMenuManager.js").ContextMenuManager} contextMenuManager
 * @property {import("../assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} projectAssetTypeManager
 */

/**
 * @template {new (...args: any) => any} T
 * @typedef {Object} DroppableGuiOptionsType
 * @property {DroppableGuiDependencies} [dependencies] If set, will use these dependencies instead of making a call to getEditorInstance()
 * @property {T[]} [supportedAssetTypes]
 * @property {import("../assets/ProjectAsset.js").ProjectAssetAny?} [embeddedParentAsset] If set, allows the creation
 * of embedded assets via a context menu. When omitted, embedded assets are not supported and this option
 * won't be shown in the context menu.
 */
/**
 * @template {new (...args: any) => any} T
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & DroppableGuiOptionsType<T>} DroppableGuiOptions
 */

/**
 * @template {boolean} U
 * @template {import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose} V
 * @typedef {Object} DroppableGuiGetValueOptions
 * @property {boolean} [resolveDefaultAssetLinks = false]
 * @property {U} [returnLiveAsset = false]
 * @property {V} [purpose = "default"]
 */

/**
 * @template U
 * @template V
 * @typedef {Object} DroppableGuiGetValueOptionsNoConstraints
 * @property {boolean} [resolveDefaultAssetLinks]
 * @property {U} [returnLiveAsset]
 * @property {V} [purpose]
 */

/**
 * @template T
 * @template {boolean} [U = false]
 * @template {import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose} [V = "default"]
 * @typedef {V extends "script" ?
 * 		T? :
 * 		U extends true ?
 * 			T? :
 * 			import("../../../src/util/mod.js").UuidString?} DroppableGuiGetValueReturn
 */

/**
 * @template T
 * @typedef {T extends DroppableGuiOptions<any> ?
 * 		T["supportedAssetTypes"] extends (new (...args: any) => infer A)[] ?
 * 			A extends object ?
 * 				A :
 * 				never :
 * 			never :
 * 		never} GuiOptionsToTemplate
 */

/**
 * @template TOpts
 * @typedef {DroppableGui<GuiOptionsToTemplate<TOpts>>} GetGuiReturnTypeForOptions
 */

/**
 * @template TDroppableInstance
 * @template TOpts
 * @typedef {TOpts extends DroppableGuiGetValueOptionsNoConstraints<infer T, infer U> ?
 * 		import("./propertiesTreeView/types.js").ReplaceUnknown<T, false> extends infer TDefaulted ?
 * 			TDefaulted extends boolean ?
 * 				import("./propertiesTreeView/types.js").ReplaceUnknown<U, "default"> extends infer UDefaulted ?
 * 					UDefaulted extends import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose ?
 * 						TDroppableInstance extends DroppableGui<infer TAssetType> ?
 * 							DroppableGuiGetValueReturn<TAssetType, TDefaulted, UDefaulted> :
 * 							never :
 * 						never :
 * 					never :
 * 				never :
 * 			never :
 * 		never} GetDroppableValueTypeForOptions
 */

/**
 * @template {object} T
 */
export class DroppableGui {
	/**
	 * @template {new (...args: any) => any} T
	 * @param {DroppableGuiOptions<T>} [opts]
	 */
	static of(opts) {
		return /** @type {DroppableGui<InstanceType<T>>} */ (new DroppableGui(opts));
	}

	/**
	 * @typedef {(value: import("../../../src/mod.js").UuidString?) => void} OnValueChangeCallback
	 */

	/**
	 * This constructor does not infer the correct generics, use `DroppableGui.of()` instead.
	 * @private
	 * @param {DroppableGuiOptions<new (...args: any) => any>} options
	 */
	constructor({
		dependencies = undefined,
		supportedAssetTypes = [],
		// todo: default value support
		disabled = false,
		embeddedParentAsset = null,
	} = {}) {
		if (!dependencies) {
			dependencies = {
				projectManager: getEditorInstance().projectManager,
				dragManager: getEditorInstance().dragManager,
				windowManager: getEditorInstance().windowManager,
				contextMenuManager: getEditorInstance().contextMenuManager,
				projectAssetTypeManager: getEditorInstance().projectAssetTypeManager,
			};
		}
		this.projectManager = dependencies.projectManager;
		this.dragManager = dependencies.dragManager;
		this.windowManager = dependencies.windowManager;
		this.contextMenuManager = dependencies.contextMenuManager;
		this.projectAssetTypeManager = dependencies.projectAssetTypeManager;

		this.disabled = disabled;
		this.embeddedParentAsset = embeddedParentAsset;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		/** @type {OnValueChangeCallback[]} */
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = /** @type {any[]} */ (supportedAssetTypes);

		this.currenDragFeedbackEl = null;

		this.boundOnDragStart = this.onDragStart.bind(this);
		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDragLeave = this.onDragLeave.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);
		this.boundOnContextMenu = this.onContextMenu.bind(this);
		this.boundOnDbClick = this.onDblClick.bind(this);

		this.el.addEventListener("dragstart", this.boundOnDragStart);
		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragLeave);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);
		this.el.addEventListener("contextmenu", this.boundOnContextMenu);
		this.el.addEventListener("dblclick", this.boundOnDbClick);

		/** @type {import("../../../src/util/mod.js").UuidString?}*/
		this.defaultAssetLinkUuid = null;
		/** @type {import("../assets/DefaultAssetLink.js").DefaultAssetLink?}*/
		this.defaultAssetLink = null;
		/** @type {import("../assets/ProjectAsset.js").ProjectAssetAny?}*/
		this.projectAssetValue = null;
		/** @type {boolean}*/
		this.projectAssetValueDeleted = false;
		this.setValue(null);
		this.setDisabled(disabled);
	}

	destructor() {
		this.el.removeEventListener("dragstart", this.boundOnDragStart);
		this.el.removeEventListener("dragenter", this.boundOnDragEnter);
		this.el.removeEventListener("dragover", this.boundOnDragOver);
		this.el.removeEventListener("dragend", this.boundOnDragEnd);
		this.el.removeEventListener("dragleave", this.boundOnDragLeave);
		this.el.removeEventListener("drop", this.boundOnDrop);
		this.el.removeEventListener("keydown", this.boundOnKeyDown);
		this.el.removeEventListener("contextmenu", this.boundOnContextMenu);
		this.el.removeEventListener("dblclick", this.boundOnDbClick);
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	/**
	 * @param {T | import("../../../src/mod.js").UuidString | import("../assets/ProjectAsset.js").ProjectAssetAny | null} value
	 */
	setValue(value) {
		let projectAsset = null;
		this.setDefaultAssetLinkUuid(null);
		if (value) {
			const assetManager = this.projectManager.assertAssetManagerExists();
			if (typeof value == "string") {
				this.setDefaultAssetLinkUuid(value);
				projectAsset = assetManager.getProjectAssetImmediate(value);
			} else if (value instanceof ProjectAsset) {
				projectAsset = value;
			} else {
				projectAsset = assetManager.getProjectAssetForLiveAsset(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, {clearDefaultAssetLink: false});
	}

	/**
	 * @template {boolean} [U = false]
	 * @template {import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose} [V = "default"]
	 * @param {DroppableGuiGetValueOptions<U, V>} options
	 * @returns {DroppableGuiGetValueReturn<T, U, V>}
	 */
	getValue({
		resolveDefaultAssetLinks = false,
		returnLiveAsset = /** @type {U} */ (false),
		purpose = /** @type {V} */ ("default"),
	} = {}) {
		if (purpose == "script") {
			returnLiveAsset = /** @type {U} */ (true);
		}
		let returnValue = null;
		if (returnLiveAsset) {
			returnValue = this.projectAssetValue?.getLiveAssetImmediate() || null;
		} else if (!resolveDefaultAssetLinks && this.defaultAssetLinkUuid) {
			returnValue = this.defaultAssetLinkUuid;
		} else if (this.projectAssetValue) {
			if (this.projectAssetValue.isEmbedded) {
				returnValue = this.projectAssetValue.readEmbeddedAssetData();
			} else {
				returnValue = this.projectAssetValue?.uuid || null;
			}
		}
		return /** @type {DroppableGuiGetValueReturn<T, U, V>} */ (returnValue);
	}

	/**
	 * @param {T | import("../../../src/mod.js").UuidString | null} value
	 */
	set value(value) {
		this.setValue(value);
	}

	/**
	 * @returns {import("../../../src/mod.js").UuidString?}
	 */
	get value() {
		return this.getValue();
	}

	/**
	 * @private
	 * @param {import("../assets/ProjectAsset.js").ProjectAssetAny?} projectAsset
	 * @param {Object} [options]
	 * @param {boolean} [options.clearDefaultAssetLink]
	 * @param {boolean} [options.preloadLiveAsset] If true, preloads the live asset and waits with firing value change events
	 * until after the live asset is loaded. This is useful if valueChange callbacks immediately try to request live assets
	 * when they fire. If they use `getValue({returnLiveAsset: true})`, it is possible for the returned value to be
	 * `null`. Setting this flag to true makes sure the callbacks are fired after the live asset is loaded.
	 */
	async setValueFromProjectAsset(projectAsset, {
		clearDefaultAssetLink = true,
		preloadLiveAsset = false,
	} = {}) {
		if (clearDefaultAssetLink) {
			this.defaultAssetLinkUuid = null;
			this.defaultAssetLink = null;
		}
		this.projectAssetValue = projectAsset;

		if (preloadLiveAsset) {
			await projectAsset?.getLiveAsset();
		}

		this.fireValueChange();
		this.updateContent();
		this.updateDeletedState();
	}

	/**
	 * @private
	 */
	async updateDeletedState() {
		this.projectAssetValueDeleted = false;
		if (this.projectAssetValue) {
			this.projectAssetValueDeleted = await this.projectAssetValue.getIsDeleted();
		}
		this.updateContent();
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString?} uuid
	 */
	async setValueFromAssetUuid(uuid, preloadLiveAsset = false) {
		if (!uuid) {
			this.setValueFromProjectAsset(null);
			this.value = null;
		} else {
			const assetManager = this.projectManager.assertAssetManagerExists();
			const projectAsset = await assetManager.getProjectAsset(uuid);
			await assetManager.makeAssetUuidConsistent(projectAsset);
			this.setDefaultAssetLinkUuid(uuid);
			this.setValueFromProjectAsset(projectAsset, {clearDefaultAssetLink: false, preloadLiveAsset});
		}
	}

	/**
	 * @private
	 * @param {import("../../../src/util/mod.js").UuidString?} uuid
	 */
	setDefaultAssetLinkUuid(uuid) {
		if (uuid) {
			this.defaultAssetLink = this.projectManager.assertAssetManagerExists().getDefaultAssetLink(uuid);
		} else {
			this.defaultAssetLink = null;
		}
		if (this.defaultAssetLink) {
			this.defaultAssetLinkUuid = uuid;
		} else {
			this.defaultAssetLink = null;
			this.defaultAssetLinkUuid = null;
		}
	}

	/**
	 * @private
	 * @param {typeof import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} projectAssetType
	 */
	createEmbeddedAsset(projectAssetType) {
		const assetManager = this.projectManager.assertAssetManagerExists();
		if (!this.embeddedParentAsset) {
			throw new Error("Tried to create an embedded asset from a DroppableGui that has no embeddedParentAsset set.");
		}
		const projectAsset = assetManager.createEmbeddedAsset(projectAssetType, this.embeddedParentAsset);
		this.setValueFromProjectAsset(projectAsset, {
			preloadLiveAsset: true,
		});
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.setAttribute("aria-disabled", disabled ? "true" : "false");
		if (disabled) {
			this.el.removeAttribute("tabIndex");
		} else {
			this.el.setAttribute("tabindex", "0");
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragStart(e) {
		if (!e.dataTransfer) return;

		let assetUuid = null;
		if (this.defaultAssetLinkUuid) {
			assetUuid = this.defaultAssetLinkUuid;
		} else if (this.projectAssetValue) {
			assetUuid = this.projectAssetValue.uuid;
		}

		if (!assetUuid) return;

		const {el, x, y} = this.dragManager.createDragFeedbackText({
			text: this.visibleAssetName,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);

		e.dataTransfer.effectAllowed = "all";
		let assetType = null;
		if (this.projectAssetValue) {
			assetType = this.projectAssetValue.projectAssetTypeConstructorImmediate;
		}

		/** @type {import("../windowManagement/contentWindows/ContentWindowProject.js").DraggingProjectAssetData} */
		const draggingData = {
			dataPopulated: true,
			assetType,
			assetUuid,
		};
		const draggingDataUuid = this.dragManager.registerDraggingData(draggingData);
		e.dataTransfer.setData(`text/jj; dragtype=projectasset; draggingdata=${draggingDataUuid}`, "");
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragEnter(e) {
		const valid = this.handleDrag(e) && !this.disabled;
		if (valid) {
			this.setDragHoverValidStyle(true);
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragOver(e) {
		this.handleDrag(e);
	}

	onDragEnd() {
		if (this.currenDragFeedbackEl) this.dragManager.removeFeedbackText(this.currenDragFeedbackEl);
		this.currenDragFeedbackEl = null;
	}

	onDragLeave() {
		this.setDragHoverValidStyle(false);
	}

	/**
	 * @param {DragEvent} e
	 * @returns {boolean} True if the dragged element is valid for this gui.
	 */
	handleDrag(e) {
		if (this.disabled) return false;
		if (!e.dataTransfer) return false;

		const hasValidMimeType = e.dataTransfer.types.some(mimeType => {
			const dragData = this.getDraggingProjectAssetData(mimeType);
			return this.validateMimeType(dragData);
		});
		if (hasValidMimeType) {
			e.dataTransfer.dropEffect = "link";
			e.preventDefault();
			return true;
		}
		return false;
	}

	/**
	 * @param {DragEvent} e
	 */
	onDrop(e) {
		e.preventDefault();
		this.setDragHoverValidStyle(false);
		if (!e.dataTransfer) return;

		for (const mimeType of e.dataTransfer.types) {
			const dragData = this.getDraggingProjectAssetData(mimeType);
			if (this.validateMimeType(dragData)) {
				const assetUuid = dragData.draggingProjectAssetData.assetUuid;
				this.setValueFromAssetUuid(assetUuid, true);
				break;
			}
		}
	}

	/**
	 * @param {ParsedDraggingProjectAssetData} dragData
	 * @returns {boolean}
	 */
	validateMimeType(dragData) {
		if (dragData.isEngineType) {
			if (this.supportedAssetTypes.length <= 0) return true;
			if (dragData.isProjectAsset) {
				if (this.supportedAssetTypes.includes(ProjectAsset)) return true;

				if (dragData.draggingProjectAssetData.dataPopulated) {
					const assetType = dragData.draggingProjectAssetData.assetType;
					if (assetType && assetType.expectedLiveAssetConstructor) {
						return this.supportedAssetTypes.includes(assetType.expectedLiveAssetConstructor);
					}
				}
			}
		}
		return false;
	}

	/**
	 * @typedef {Object} ParsedDraggingProjectAssetData
	 * @property {boolean} isEngineType
	 * @property {boolean} isProjectAsset
	 * @property {import("../windowManagement/contentWindows/ContentWindowProject.js").DraggingProjectAssetData} draggingProjectAssetData
	 */

	/**
	 * @param {string} mimeType
	 * @returns {ParsedDraggingProjectAssetData}
	 */
	getDraggingProjectAssetData(mimeType) {
		const parsed = parseMimeType(mimeType);
		let isEngineType = false;
		let isProjectAsset = false;
		let draggingProjectAssetData = null;
		if (parsed) {
			const {type, subType, parameters} = parsed;
			isEngineType = (type == "text" && subType == "jj");
			if (isEngineType) {
				isProjectAsset = (parameters.dragtype == "projectasset");
				if (isProjectAsset) {
					draggingProjectAssetData = this.dragManager.getDraggingData(parameters.draggingdata);
				}
			}
		}
		return {isEngineType, isProjectAsset, draggingProjectAssetData};
	}

	/**
	 * @param {boolean} valid
	 */
	setDragHoverValidStyle(valid) {
		this.el.classList.toggle("dragHovering", valid);
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	onKeyDown(e) {
		if (this.disabled) return;
		// Todo: use shortcutmanager
		if (e.code == "Backspace" || e.code == "Delete") {
			this.setValue(null);
		}
	}

	/**
	 * @private
	 * @param {MouseEvent} e
	 */
	onContextMenu(e) {
		e.preventDefault();
		/** @type {import("./contextMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [];
		if (!this.disabled) {
			/** @type {(typeof import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetType)[]} */
			const availableTypes = [];
			for (const liveAssetConstructor of this.supportedAssetTypes) {
				for (const projectAssetType of this.projectAssetTypeManager.getAssetTypesForLiveAssetConstructor(liveAssetConstructor)) {
					availableTypes.push(projectAssetType);
				}
			}

			if (availableTypes.length > 0) {
				// TODO: hide or disable the embedded asset menu if embedded assets are not explicitly supported.
				/** @type {import("./contextMenus/ContextMenu.js").ContextMenuItemOpts} */
				const createEmbeddedStructure = {
					text: "Create embedded asset",
				};

				if (availableTypes.length == 1) {
					createEmbeddedStructure.onClick = () => {
						this.createEmbeddedAsset(availableTypes[0]);
					};
				} else {
					createEmbeddedStructure.submenu = () => {
						/** @type {import("./contextMenus/ContextMenu.js").ContextMenuStructure} */
						const submenuStructure = [];
						for (const projectAssetType of availableTypes) {
							let text = "<unknown>";
							if (projectAssetType.uiCreateName) {
								text = projectAssetType.uiCreateName;
							} else if (projectAssetType.type) {
								text = `<${projectAssetType.type}>`;
							}
							submenuStructure.push({
								text,
								onClick: () => {
									this.createEmbeddedAsset(projectAssetType);
								},
							});
						}
						return submenuStructure;
					};
				}
				contextMenuStructure.push(createEmbeddedStructure);
			}
		}
		if (this.projectAssetValue) {
			if (!this.disabled) {
				contextMenuStructure.push({
					text: "Unlink",
					onClick: () => {
						this.setValue(null);
					},
				});
			}
			const copyAssetUuidText = "Copy asset UUID";
			const defaultAssetLink = this.defaultAssetLinkUuid;
			if (defaultAssetLink) {
				contextMenuStructure.push({
					text: copyAssetUuidText,
					onClick: async () => {
						if (this.projectAssetValue) {
							await navigator.clipboard.writeText(defaultAssetLink);
						}
					},
				});
			}
			const resolvedText = this.defaultAssetLinkUuid ? "Copy resolved asset link UUID" : copyAssetUuidText;
			contextMenuStructure.push({
				text: resolvedText,
				onClick: async () => {
					if (this.projectAssetValue) {
						await navigator.clipboard.writeText(this.projectAssetValue.uuid);
					}
				},
			});
			contextMenuStructure.push({
				text: "View location",
				onClick: async () => {
					if (this.defaultAssetLink) {
						// todo: highlight assetLink
						// eslint-disable-next-line no-unused-vars
						const assetLinksWindow = this.windowManager.focusOrCreateContentWindow(ContentWindowDefaultAssetLinks);
					} else if (this.projectAssetValue) {
						let assetLinksWindow;
						if (this.projectAssetValue.isBuiltIn) {
							const contentWindow = this.windowManager.focusOrCreateContentWindow(ContentWindowBuiltInAssets);
							assetLinksWindow = /** @type {import("../windowManagement/contentWindows/ContentWindowBuiltInAssets.js").ContentWindowBuiltInAssets} */ (contentWindow);
						} else {
							const contentWindow = this.windowManager.focusOrCreateContentWindow(ContentWindowProject);
							assetLinksWindow = /** @type {import("../windowManagement/contentWindows/ContentWindowProject.js").ContentWindowProject} */ (contentWindow);
						}
						assetLinksWindow.highlightPath(this.projectAssetValue.path);
					}
				},
				disabled: this.projectAssetValueDeleted,
			});
		}
		if (contextMenuStructure.length == 0) return;
		const menu = this.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos({x: e.pageX, y: e.pageY});
	}

	onDblClick() {
		if (this.projectAssetValue) this.projectAssetValue.open(this.windowManager);
	}

	get visibleAssetName() {
		if (this.defaultAssetLink?.name) return this.defaultAssetLink.name;

		if (this.projectAssetValue) {
			if (this.projectAssetValue.isEmbedded) {
				return "Embedded asset";
			} else if (this.projectAssetValue.fileName) {
				return this.projectAssetValue.fileName;
			}
		}

		return "";
	}

	updateContent() {
		const filled = !!this.projectAssetValue && !this.projectAssetValueDeleted;
		this.el.classList.toggle("empty", !filled);
		this.el.classList.toggle("filled", filled);
		if (!this.projectAssetValueDeleted) {
			this.el.textContent = this.visibleAssetName;
		} else {
			while (this.el.firstChild) {
				this.el.removeChild(this.el.firstChild);
			}
			const deletedText = document.createElement("span");
			deletedText.textContent = "Deleted";
			deletedText.classList.add("droppableGuiDeletedText");
			this.el.appendChild(deletedText);
			if (this.visibleAssetName) {
				this.el.appendChild(document.createTextNode(" (" + this.visibleAssetName + ")"));
			}
		}
		this.el.draggable = (this.projectAssetValue && !this.projectAssetValueDeleted) || !!this.defaultAssetLink;
	}
}
