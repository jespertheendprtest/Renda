import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {ASSET_SETTINGS_PATH, BASIC_ASSET_PATH, BASIC_ASSET_UUID, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "externalChange doesn't get called when the assetManager is destructed",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();
		const projectAsset = assetManager.projectAssets.get(BASIC_ASSET_UUID);
		assetManager.destructor();
		assertExists(projectAsset);
		let externalChangeCalled = false;
		projectAsset.fileChangedExternally = async () => {
			externalChangeCalled = true;
		};

		mockFileSystem.fireExternalChange({
			path: ["path", "to", "asset.json"],
			kind: "file",
			type: "changed",
		});

		await waitForMicrotasks();

		assertEquals(externalChangeCalled, false);
	},
});

Deno.test({
	name: "registerAsset()",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const path = ["path", "to", "newAsset.json"];
		await mockFileSystem.writeJson(path, {});
		await assetManager.registerAsset(path);

		await waitForMicrotasks();

		assertEquals(assetManager.projectAssets.size, 2);

		let newAsset = null;
		for (const [uuid, asset] of assetManager.projectAssets) {
			if (uuid == BASIC_ASSET_UUID) continue;
			newAsset = asset;
			break;
		}

		assertExists(newAsset);
		assertEquals(newAsset.path, path);

		/** @type {import("../../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const assetSettings = await mockFileSystem.readJson(ASSET_SETTINGS_PATH);
		assertExists(assetSettings);
		assertExists(assetSettings.assets);
		assertEquals(Object.entries(assetSettings.assets).length, 1);
	},
});

Deno.test({
	name: "registerAsset() with forceAssetType = true",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const path = ["path", "to", "newAsset.json"];
		await mockFileSystem.writeJson(path, {});
		await assetManager.registerAsset(path, null, true);

		await waitForMicrotasks();

		assertEquals(assetManager.projectAssets.size, 2);

		let newAsset = null;
		for (const [uuid, asset] of assetManager.projectAssets) {
			if (uuid == BASIC_ASSET_UUID) continue;
			newAsset = asset;
			break;
		}

		assertExists(newAsset);
		assertEquals(newAsset.path, path);

		/** @type {import("../../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const assetSettings = await mockFileSystem.readJson(ASSET_SETTINGS_PATH);
		assertExists(assetSettings);
		assertExists(assetSettings.assets);
		assertEquals(Object.entries(assetSettings.assets).length, 2);
	},
});

Deno.test({
	name: "getAssetUuidFromPath()",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getAssetUuidFromPath(BASIC_ASSET_PATH);

		assertEquals(result, BASIC_ASSET_UUID);
	},
});

Deno.test({
	name: "getAssetUuidFromPath() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getAssetUuidFromPath(["non", "existent", "path.json"]);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getAssetPathFromUuid()",
	async fn() {
		const {assetManager} = await basicSetup();

		const path = await assetManager.getAssetPathFromUuid(BASIC_ASSET_UUID);

		assertEquals(path, BASIC_ASSET_PATH);
	},
});
