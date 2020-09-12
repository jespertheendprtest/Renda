import editor from "../editorInstance.js";
import SingleInstancePromise from "../Util/SingleInstancePromise.js";

export default class ProjectAsset{
	constructor({
		uuid = null,
		path = [],
		assetSettings = {},
		assetType = null,
		forceAssetType = false,
	} = {}){
		this.uuid = uuid;
		this.path = path;
		this.assetSettings = assetSettings;
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;
		this.needsConsistentUuid = false;

		this._projectAssetType = null;
		this.liveAsset = null;

		this.initInstance = new SingleInstancePromise(async _=> this.init());
		this.initInstance.run();
	}

	async init(){
		if(!this.assetType){
			this.assetType = await ProjectAsset.guessAssetTypeFromFile(this.path);
		}

		const AssetTypeConstructor = editor.projectAssetTypeManager.getAssetType(this.assetType);
		if(AssetTypeConstructor){
			this._projectAssetType = new AssetTypeConstructor(this);
		}
	}

	async waitForInit(){
		await this.initInstance.run();
	}

	async getProjectAssetType(){
		await this.waitForInit();
		return this._projectAssetType;
	}

	static async fromJsonData(uuid, assetData){
		if(!assetData.assetType){
			assetData.assetType = this.guessAssetTypeFromPath(assetData.path);
			assetData.forceAssetType = false;
		};
		const projectAsset = new ProjectAsset({uuid,...assetData});
		return projectAsset;
	}

	static guessAssetTypeFromPath(path = []){
		if(!path || path.length <= 0) return null;
		const fileName = path[path.length - 1];
		if(fileName.endsWith(".jjmesh")) return "mesh";
		if(fileName.endsWith(".js")) return "javascript";
		return null;
	}

	static async guessAssetTypeFromFile(path = []){
		const assetType = this.guessAssetTypeFromPath(path);
		if(assetType) return assetType;

		const json = await editor.projectManager.currentProjectFileSystem.readJson(path);
		return json?.assetType || null;
	}

	get name(){
		return this.path[this.path.length - 1];
	}

	//call AssetManager.makeAssetUuidConsistent() to also save
	//the uuid to asset settings file immediately
	makeUuidConsistent(){
		this.needsConsistentUuid = true;
	}

	get needsAssetSettingsSave(){
		if(this.forceAssetType) return true;
		if(this.needsConsistentUuid) return true;

		return false;
	}

	assetMoved(newPath){
		this.path = newPath;
	}

	toJson(){
		const assetData = {
			path: this.path,
		}
		if(this.forceAssetType){
			assetData.assetType = this.assetType;
		}
		if(Object.keys(this.assetSettings).length > 0){
			assetData.assetSettings = this.assetSettings;
		}
		return assetData;
	}

	async open(){
		await this.waitForInit();
		await this._projectAssetType.open();
	}

	//todo: make sure this promise has only one instance running at a time
	async getLiveAsset(){
		if(this.liveAsset) return this.liveAsset;

		await this.waitForInit();
		const fileData = await this.readAssetData();

		this.liveAsset = await this._projectAssetType.getLiveAsset(fileData);
		return this.liveAsset;
	}

	async getPropertiesAssetContentConstructor(){
		await this.waitForInit();
		if(!this._projectAssetType) return null;
		return this._projectAssetType.constructor.propertiesAssetContentConstructor;
	}

	async getPropertiesAssetSettingsStructure(){
		await this.waitForInit();
		if(!this._projectAssetType) return null;
		return this._projectAssetType.constructor.assetSettingsStructure;
	}

	async readAssetData(){
		await this.waitForInit();

		let fileData = null;
		if(this._projectAssetType.constructor.storeInProjectAsJson){
			const json = await editor.projectManager.currentProjectFileSystem.readJson(this.path);
			if(this._projectAssetType.constructor.wrapProjectJsonWithEditorMetaData){
				fileData = json.asset;
			}else{
				fileData = json;
			}
		}else{
			fileData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
		}
		return fileData;
	}

	async writeAssetData(fileData){
		await this.waitForInit();
		if(this._projectAssetType.constructor.storeInProjectAsJson){
			let json = null;
			if(this._projectAssetType.constructor.wrapProjectJsonWithEditorMetaData){
				json = {
					assetType: this._projectAssetType.constructor.type,
					asset: fileData,
				}
			}else{
				json = fileData;
			}
			await editor.projectManager.currentProjectFileSystem.writeJson(this.path, json);
		}else{
			//todo
		}
	}

	async getBundledAssetData(assetSettingOverrides = {}){
		await this.waitForInit();
		let binaryData = await this._projectAssetType.createBundledAssetData(assetSettingOverrides);
		if(!binaryData){
			binaryData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
		}
		return binaryData;
	}
}
