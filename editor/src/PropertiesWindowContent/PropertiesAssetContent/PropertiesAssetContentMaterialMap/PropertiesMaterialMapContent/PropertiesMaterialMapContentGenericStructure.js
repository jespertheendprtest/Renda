import {PropertiesMaterialMapContent} from "./PropertiesMaterialMapContent.js";

export class PropertiesMaterialMapContentGenericStructure extends PropertiesMaterialMapContent {
	/**
	 * @param {import("../../../../UI/PropertiesTreeView/types.js").PropertiesTreeViewStructure} structure
	 */
	constructor(structure) {
		super();

		this.settingsGuiStructure = structure;

		this.treeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.treeView.onChildValueChange(() => {
			this.signalCustomDataChanged();
		});
	}

	/**
	 * @param {import("../../../../assets/ProjectAssetType/ProjectAssetTypeMaterialMap/MaterialMapTypes/MaterialMapTypeSerializerWebGpuRenderer.js").MaterialMapTypeWebGpuRendererSavedCustomData} customData
	 * @override
	 */
	async customAssetDataFromLoad(customData) {
		this.treeView.fillSerializableStructureValues({
			forwardPipelineConfig: customData.forwardPipelineConfig,
		});
	}

	/**
	 * @override
	 */
	async getCustomAssetDataForSave() {
		const settings = this.getSettingsValues();
		const data = {
			forwardPipelineConfig: settings.forwardPipelineConfig,
		};

		return data;
	}

	getSettingsValues() {
		return this.treeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
