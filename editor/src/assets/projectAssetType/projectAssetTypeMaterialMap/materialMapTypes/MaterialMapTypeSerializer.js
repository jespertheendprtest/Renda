import {BinaryComposer, StorageType} from "../../../../../../src/util/BinaryComposer.js";

/**
 * @typedef {new (...args: any) => MaterialMapTypeSerializer} MaterialMapTypeSerializerConstructor
 */

/**
 * @typedef {Object} MaterialMapTypeMappableValue
 * @property {string} name
 * @property {import("../../../../ui/propertiesTreeView/types.js").GuiTypes} type
 * @property {import("../../../../../../src/rendering/MaterialMap.js").MappableMaterialTypes} [defaultValue]
 */

/**
 * Registered MaterialMapTypes with MaterialMapTypeManager.registerMapType should
 * extend this class. Extended classes are responsible for converting data between
 * what's stored on disk, in memory in live assets, or as binary in assetbundles.
 */
export class MaterialMapTypeSerializer {
	/**
	 * Name that will be shown in the editor ui.
	 * @type {string}
	 */
	static uiName = "";

	/**
	 * This will be used for storing the map type in the MaterialMap asset.
	 * You can generate a uuid in the editor browser console using `Util.generateUuid()`.
	 * @type {import("../../../../../../src/util/mod.js").UuidString}
	 */
	static typeUuid = "";

	/**
	 * If you set this to true you should at least implement {@link mapDataToAssetBundleBinary}
	 * or set a structure in {@link assetBundleBinaryComposerOpts}.
	 */
	static allowExportInAssetBundles = false;

	/**
	 * Set this to a structure to automatically load and save data for this map type.
	 * This is optional if {@link propertiesMaterialMapContentConstructor} is set.
	 * @type {import("../../../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?}
	 */
	static settingsStructure = null;

	/**
	 * If you prefer more control, you can set this to the constructor of an PropertiesMaterialMapContent.
	 * This is optional if {@link settingsStructure} is set.
	 * Replace this with a constructor that extends {@link PropertiesMaterialMapContent}.
	 * This will be used to render the material map settings in the properties window.
	 * @type {typeof import("../../../../propertiesWindowContent/propertiesAssetContent/propertiesAssetContentMaterialMap/propertiesMaterialMapContent/PropertiesMaterialMapContent.js").PropertiesMaterialMapContent?}
	 */
	static propertiesMaterialMapContentConstructor = null;

	/**
	 * This will be used to render the mapping ui in MaterialMaps, as well as
	 * the values ui in Materials. The values of materials will be automatically
	 * loaded, saved and exported in assetbundles.
	 * `customData` will be whatever you last returned from
	 * {@link getCustomAssetDataForSave}.
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData The customData as stored on disk.
	 * @returns {Promise<MaterialMapTypeMappableValue[]>}
	 */
	static async getMappableValues(editorInstance, assetManager, customData) {
		return [];
	}

	/* ==== Material instance related methods ==== */

	/**
	 * Use this to convert customData as stored on disk to data that lives
	 * in Material instances.
	 * For instance, assets are stored on disk as uuid. Use this to load the
	 * assets and store them in the Material.
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData The customData as stored on disk.
	 * @returns {Promise<import("../../../../../../src/rendering/MaterialMapType.js").MaterialMapType?>} The data to be stored in the Material.
	 */
	static async getLiveAssetSettingsInstance(editorInstance, assetManager, customData) {
		return null;
	}

	/**
	 * This should yield ProjectAssets that are linked in the custom data.
	 * This will be used to replace material instances in the editor whenever a
	 * linked live asset changes (a shader for example).
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData The customData as stored on disk.
	 * @returns {AsyncGenerator<import("../../../ProjectAsset.js").ProjectAssetAny?>}
	 */
	static async *getLinkedAssetsInCustomData(editorInstance, assetManager, customData) {}

	/* ==== AssetBundle related methods ==== */

	/**
	 * This gets called when a material needs to get bundled.
	 * By default this turns the result of {@link mapDataToAssetBundleData} into
	 * an ArrayBuffer using {@link BinaryComposer.objectToBinary}. But you can
	 * override this and return your custom ArrayBuffer.
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData The customData as stored on disk.
	 * @returns {ArrayBuffer?} The binary data to be stored in the material asset.
	 */
	static mapDataToAssetBundleBinary(editorInstance, assetManager, customData) {
		const bundleMapData = this.mapDataToAssetBundleData(customData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return null;
		}

		if (!this.assetBundleBinaryComposerOpts) {
			console.warn("Failed to export material map, assetBundleBinaryComposerOpts is not set");
			return null;
		}
		return BinaryComposer.objectToBinary(bundleMapData, {
			...this.assetBundleBinaryComposerOpts,
			editorAssetManager: assetManager,
		});
	}

	/**
	 * This gets called when a material needs to get bundled.
	 * You can use this to make some final modifications to the customData
	 * before it gets passed on to {@link mapDataToAssetBundleBinary}.
	 * Usually it is ok to leave this as is.
	 * @param {Object} customData The customData as stored on disk.
	 * @returns {?Object} The modified customData.
	 */
	static mapDataToAssetBundleData(customData) {
		return customData;
	}

	/**
	 * If you don't override {@link mapDataToAssetBundleBinary} or {@link mapDataToAssetBundleData},
	 * these are the default options for {@link BinaryComposer.objectToBinary}.
	 * If you want support for exporting your custom data in assetbundles, you
	 * should provide a structure here.
	 * @type {import("../../../../../../src/util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions?}
	 */
	static assetBundleBinaryComposerOpts = null;

	/* ==== Misc ==== */

	// todo: I don't know why this is here. It seems awfully similar to
	// getLinkedAssetsInCustomData. I think we can combine them.
	/**
	 * @param {any} mapData
	 */
	static *getReferencedAssetUuids(mapData) {
		const bundleMapData = this.mapDataToAssetBundleData(mapData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return;
		}
		if (bundleMapData instanceof ArrayBuffer) return;

		const binaryComposerOpts = this.assetBundleBinaryComposerOpts;
		if (!binaryComposerOpts) {
			console.warn("Failed to find referenced asset uuids, assetBundleBinaryComposerOpts is not set");
			return;
		}
		/** @type {import("../../../../../../src/mod.js").UuidString[]} */
		const referencedUuids = [];
		BinaryComposer.objectToBinary(bundleMapData, {
			...binaryComposerOpts,
			transformValueHook: args => {
				let {value, type} = args;
				if (binaryComposerOpts.transformValueHook) {
					value = binaryComposerOpts.transformValueHook(args);
				}

				if (type == StorageType.ASSET_UUID) {
					referencedUuids.push(value);
				}
				return value;
			},
		});
		for (const uuid of referencedUuids) {
			yield uuid;
		}
	}

	/**
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 * @param {import("../MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} mappedValuesData
	 */
	static async getMappedValues(editorInstance, assetManager, customData, mappedValuesData) {
		/** @type {MaterialMapTypeMappableValue[]} */
		const mappedValues = [];
		const mappableValues = await this.getMappableValues(editorInstance, assetManager, customData);
		for (const {name, type, defaultValue} of mappableValues) {
			const mappedValueData = mappedValuesData?.[name];
			if (mappedValueData?.visible ?? true) {
				mappedValues.push({
					name: mappedValueData?.mappedName ?? name,
					defaultValue: mappedValueData?.defaultValue ?? defaultValue,
					type,
				});
			}
		}
		return mappedValues;
	}

	/**
	 * @param {string} message
	 */
	static invalidConfigurationWarning(message) {
		console.warn(message + "\nView MaterialMapType.js for more info.");
	}
}
