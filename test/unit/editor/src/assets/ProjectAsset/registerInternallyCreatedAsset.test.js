import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {InternallyCreatedAsset} from "../../../../../../editor/src/assets/InternallyCreatedAsset.js";
import {basicSetup} from "./shared.js";

Deno.test({
	name: "creating with isEmbedded true",
	fn() {
		const {projectAsset, mocks} = basicSetup();
		const {mockAssetManager} = mocks;

		mockAssetManager.getOrCreateInternallyCreatedAsset = persistenceData => {
			return new InternallyCreatedAsset(mockAssetManager, persistenceData, {forcedAssetUuid: null});
		};
		const getOrCreateInternallyCreatedAssetSpy = spy(mockAssetManager, "getOrCreateInternallyCreatedAsset");

		const liveAsset = {
			label: "live asset",
		};
		projectAsset.registerInternallyCreatedAsset(liveAsset, {foo: "bar"});
		projectAsset.registerInternallyCreatedAsset(liveAsset, {foo: "bar"});

		assertSpyCalls(getOrCreateInternallyCreatedAssetSpy, 1);
	},
});
