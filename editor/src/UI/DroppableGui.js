import editor from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";
import ProjectAsset from "../Assets/ProjectAsset.js";
/** @typedef {import("../Assets/DefaultAssetLink.js").default} DefaultAssetLink */

export default class DroppableGui{
	constructor({
		supportedAssetTypes = [],
		//todo: default value support
		disabled = false,
	} = {}){
		this.disabled = disabled;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = supportedAssetTypes;

		this.currenDragFeedbackEl = null;

		this.boundOnDragStart = this.onDragStart.bind(this);
		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDragLeave = this.onDragLeave.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);
		this.boundOnContextMenu = this.onContextMenu.bind(this);

		this.el.addEventListener("dragstart", this.boundOnDragStart);
		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragLeave);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);
		this.el.addEventListener("contextmenu", this.boundOnContextMenu);

		/**
		 * @type {?string}
		 */
		this.defaultAssetLinkUuid = null;
		/**
		 * @type {?DefaultAssetLink}
		 */
		this.defaultAssetLink = null;
		/**
		 * @type {?ProjectAsset}
		 */
		this.projectAssetValue = null;
		/**
		 * @type {boolean}
		 */
		this.projectAssetValueDeleted = false;
		this.setValue(null);
		this.setDisabled(disabled);
	}

	destructor(){
		this.el.removeEventListener("dragstart", this.boundOnDragStart);
		this.el.removeEventListener("dragenter", this.boundOnDragEnter);
		this.el.removeEventListener("dragover", this.boundOnDragOver);
		this.el.removeEventListener("dragend", this.boundOnDragEnd);
		this.el.removeEventListener("dragleave", this.boundOnDragLeave);
		this.el.removeEventListener("drop", this.boundOnDrop);
		this.el.removeEventListener("keydown", this.boundOnKeyDown);
		this.el.removeEventListener("contextmenu", this.boundOnContextMenu);
		this.boundOnDragStart = null;
		this.boundOnDragEnter = null;
		this.boundOnDragOver = null;
		this.boundOnDragEnd = null;
		this.boundOnDragLeave = null;
		this.boundOnDrop = null;
		this.boundOnKeyDown = null;
		this.boundOnContextMenu = null;
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	setValue(value){
		let projectAsset = null;
		this.setDefaultAssetLinkUuid(null);
		if(value){
			if(typeof value == "string"){
				this.setDefaultAssetLinkUuid(value);
				projectAsset = editor.projectManager.assetManager.getProjectAssetImmediate(value);
			}else if(value instanceof ProjectAsset){
				projectAsset = value;
			}else{
				projectAsset = editor.projectManager.assetManager.getProjectAssetForLiveAsset(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, false);
	}

	set value(value){
		this.setValue(value);
	}

	/**
	 * @param {Object} opts
	 * @param {boolean} [opts.resolveDefaultAssetLinks = false]
	 * @param {boolean} [opts.returnLiveAsset = false]
	 * @param {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} [opts.purpose = "default"]
	 */
	getValue({
		resolveDefaultAssetLinks = false,
		returnLiveAsset = false,
		purpose = "default",
	} = {}){
		if(purpose == "script"){
			returnLiveAsset = true;
		}
		if(returnLiveAsset){
			return this.projectAssetValue?.getLiveAssetImmediate() || null;
		}else{
			if(!resolveDefaultAssetLinks && this.defaultAssetLinkUuid){
				return this.defaultAssetLinkUuid;
			}else{
				return this.projectAssetValue?.uuid;
			}
		}
	}

	get value(){
		return this.getValue();
	}

	/**
	 * @param {ProjectAsset} projectAsset
	 * @param {boolean} clearDefaultAssetLink
	 */
	setValueFromProjectAsset(projectAsset, clearDefaultAssetLink = true){
		if(clearDefaultAssetLink){
			this.defaultAssetLinkUuid = null;
			this.defaultAssetLink = null;
		}
		this.projectAssetValue = projectAsset;

		this.fireValueChange();
		this.updateContent();
		this.updateDeletedState();
	}

	async updateDeletedState(){
		this.projectAssetValueDeleted = false;
		if(this.projectAssetValue){
			this.projectAssetValueDeleted = await this.projectAssetValue.getIsDeleted();
		}
		this.updateContent();
	}

	async setValueFromAssetUuid(uuid, preloadLiveAsset = false){
		if(!uuid){
			this.setValueFromProjectAsset(null);
			this.value = null;
		}else{
			const projectAsset = await editor.projectManager.assetManager.getProjectAsset(uuid);
			await editor.projectManager.assetManager.makeAssetUuidConsistent(projectAsset);
			if(preloadLiveAsset){
				//get the live asset so that it is loaded before this.value is accessed from the onValueChange callbacks
				await projectAsset?.getLiveAsset();
			}
			this.setDefaultAssetLinkUuid(uuid);
			this.setValueFromProjectAsset(projectAsset, false);
		}
	}

	setDefaultAssetLinkUuid(uuid){
		if(uuid){
			this.defaultAssetLink = editor.projectManager.assetManager.getDefaultAssetLink(uuid);
		}else{
			this.defaultAssetLink = null;
		}
		if(this.defaultAssetLink){
			this.defaultAssetLinkUuid = uuid;
		}else{
			this.defaultAssetLink = null;
			this.defaultAssetLinkUuid = null;
		}
	}

	onValueChange(cb){
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value);
		}
	}

	setDisabled(disabled){
		this.disabled = disabled;
		this.el.ariaDisabled = disabled;
		if(disabled){
			this.el.removeAttribute("tabIndex");
		}else{
			this.el.setAttribute("tabindex", "0");
		}
	}

	onDragStart(e){
		let {el, x, y} = editor.dragManager.createDragFeedbackText({
			text: this.visibleAssetName,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);

		e.dataTransfer.effectAllowed = "all";
		let assetTypeUuid = "";
		const assetType = editor.projectAssetTypeManager.getAssetType(this.projectAssetValue.assetType);
		if(assetType){
			assetTypeUuid = assetType.typeUuid;
		}
		const uuid = this.defaultAssetLinkUuid || this.projectAssetValue.uuid;
		e.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetTypeUuid}`, uuid);

	}

	onDragEnter(e){
		const valid = this.handleDrag(e) && !this.disabled;
		if(valid){
			this.setDragHoverValidStyle(true);
		}
	}

	onDragOver(e){
		this.handleDrag(e);
	}

	onDragEnd(e){
		if(this.currenDragFeedbackEl) editor.dragManager.removeFeedbackEl(this.currenDragFeedbackEl);
		this.currenDragFeedbackEl = null;
	}

	onDragLeave(){
		this.setDragHoverValidStyle(false);
	}

	handleDrag(e){
		if(this.disabled) return false;
		if(e.dataTransfer.types.some(mimeType => this.validateMimeType(mimeType))){
			e.dataTransfer.dropEffect = "copy";
			e.preventDefault();
			return true;
		}
	}

	onDrop(e){
		e.preventDefault();
		this.setDragHoverValidStyle(false);
		for(const mimeType of e.dataTransfer.types){
			if(this.validateMimeType(mimeType)){
				const assetUuid = e.dataTransfer.getData(mimeType);
				this.setValueFromAssetUuid(assetUuid, true);
				break;
			}
		}
	}

	validateMimeType(mimeType){
		const parsed = parseMimeType(mimeType);
		if(!parsed) return false;
		const {type, subType, params} = parsed;
		if(type != "text" || subType != "jj") return false;
		if(this.supportedAssetTypes.length <= 0) return true;
		if(params.dragtype == "projectasset"){
			if(this.supportedAssetTypes.includes(ProjectAsset)) return true;
			const assetType = editor.projectAssetTypeManager.getAssetTypeByUuid(params.assettype);
			if(assetType && assetType.expectedLiveAssetConstructor){
				return this.supportedAssetTypes.includes(assetType.expectedLiveAssetConstructor);
			}
		}
		return false;
	}

	setDragHoverValidStyle(valid){
		this.el.classList.toggle("dragHovering", valid);
	}

	onKeyDown(e){
		if(this.disabled) return;
		if(e.code == "Backspace" || e.code == "Delete"){
			this.setValue(null);
		}
	}

	onContextMenu(e){
		e.preventDefault();
		if(!this.projectAssetValue) return;
		/** @type {import("./ContextMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [];
		if(!this.disabled){
			contextMenuStructure.push({
				text: "Unlink",
				onClick: () => {
					this.setValue(null);
				},
			});
		}
		const copyAssetUuidText = "Copy asset UUID";
		if(this.defaultAssetLinkUuid){
			contextMenuStructure.push({
				text: copyAssetUuidText,
				onClick: async () => {
					if(this.projectAssetValue){
						await navigator.clipboard.writeText(this.defaultAssetLinkUuid);
					}
				},
			});
		}
		const resolvedText = this.defaultAssetLinkUuid ? "Copy resolved asset link UUID" : copyAssetUuidText;
		contextMenuStructure.push({
			text: resolvedText,
			onClick: async () => {
				if(this.projectAssetValue){
					await navigator.clipboard.writeText(this.projectAssetValue.uuid);
				}
			},
		});
		contextMenuStructure.push({
			text: "View location",
			onClick: async () => {
				//todo: highlight assetLink
				if(this.defaultAssetLink){
					const assetLinksWindow = editor.windowManager.focusOrCreateContentWindowType("defaultAssetLinks");
				}else if(this.projectAssetValue){
					let assetLinksWindow;
					if(this.projectAssetValue.isBuiltIn){
						assetLinksWindow = editor.windowManager.focusOrCreateContentWindowType("builtInAssets");
					}else{
						assetLinksWindow = editor.windowManager.focusOrCreateContentWindowType("project");
					}
					assetLinksWindow.highlightPath(this.projectAssetValue.path);
				}
			},
			disabled: this.projectAssetValueDeleted,
		});
		const menu = editor.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos(e.pageX, e.pageY);
	}

	get visibleAssetName(){
		return this.defaultAssetLink?.name || this.projectAssetValue?.name || "";
	}

	updateContent(){
		const filled = this.projectAssetValue && !this.projectAssetValueDeleted;
		this.el.classList.toggle("empty", !filled);
		this.el.classList.toggle("filled", filled);
		if(!this.projectAssetValueDeleted){
			this.el.textContent = this.visibleAssetName;
		}else{
			while(this.el.firstChild){
				this.el.removeChild(this.el.firstChild);
			}
			const deletedText = document.createElement("span");
			deletedText.textContent = "Deleted";
			deletedText.classList.add("droppableGuiDeletedText");
			this.el.appendChild(deletedText);
			if(this.visibleAssetName){
				this.el.appendChild(document.createTextNode(" ("+this.visibleAssetName+")"));
			}
		}
		this.el.draggable = (this.projectAssetValue && !this.projectAssetValueDeleted) || this.defaultAssetLink;
	}
}
