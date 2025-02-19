import "../../../shared/initializeEditor.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {MemoryEditorFileSystem} from "../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {ContentWindowProject} from "../../../../../../editor/src/windowManagement/contentWindows/ContentWindowProject.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";
import {assertEquals} from "std/testing/asserts.ts";

const BASIC_WINDOW_UUID = "basic window uuid";

/**
 * @param {Object} options
 * @param {Object.<string, import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").AllowedWriteFileTypes>} [options.fileSystemStructure]
 * @param {boolean} [options.assetSettingsLoaded] Whether the mock asset manager should already have loaded asset settings.
 * @param {"none" | "expand"} [options.treeViewAction] If true, the root tree view will be expanded in order to trigger the asset settings load.
 */
async function basicSetup({
	fileSystemStructure = {},
	assetSettingsLoaded = false,
	treeViewAction = "expand",
} = {}) {
	installFakeDocument();

	const mockWindowManager = /** @type {import("../../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const mockSelectionGroup = /** @type {import("../../../../../../editor/src/misc/SelectionGroup.js").SelectionGroup<any>} */ ({});
	const mockSelectionManager = /** @type {import("../../../../../../editor/src/misc/SelectionManager.js").SelectionManager} */ ({
		createSelectionGroup() {
			return mockSelectionGroup;
		},
	});

	const mockFileSystem = new MemoryEditorFileSystem();
	mockFileSystem.setFullStructure(fileSystemStructure);

	/** @type {Set<import("../../../../../../editor/src/assets/AssetManager.js").OnPermissionPromptResultCallback>} */
	const permissionPromptCbs = new Set();

	const mockAssetManager = /** @type {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({
		onPermissionPromptResult(cb) {
			permissionPromptCbs.add(cb);
		},
		removeOnPermissionPromptResult(cb) {
			permissionPromptCbs.delete(cb);
		},
		async loadAssetSettings(fromUserGesture) {},
		assetSettingsLoaded,
	});

	const mockProjectManager = /** @type {import("../../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		currentProjectFileSystem: /** @type {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} */ (mockFileSystem),
		onExternalChange(cb) {},
		assertAssetManagerExists() {
			return mockAssetManager;
		},
		async getAssetManager() {
			return mockAssetManager;
		},
	});

	const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		selectionManager: mockSelectionManager,
		projectManager: mockProjectManager,
	});

	injectMockEditorInstance(mockEditorInstance);

	const contentWindow = new ContentWindowProject(mockEditorInstance, mockWindowManager, BASIC_WINDOW_UUID);

	await contentWindow.waitForInit();

	if (treeViewAction == "expand") {
		contentWindow.treeView.expanded = true;

		await contentWindow.waitForTreeViewUpdate();
	}

	return {
		contentWindow,
		/**
		 * @param {boolean} granted
		 */
		triggerPermissionPromptCbs(granted) {
			permissionPromptCbs.forEach(cb => cb(granted));
		},
		uninstall() {
			uninstallFakeDocument();
			injectMockEditorInstance(null);
		},
	};
}

Deno.test({
	name: "Fills the tree view with the files in the project excluding any subdirectories",
	async fn() {
		const {contentWindow, uninstall} = await basicSetup({
			fileSystemStructure: {
				"fileA.txt": "a",
				"fileB.txt": "b",
				"folder/fileC.txt": "c",
				"folder/fileD.txt": "d",
				"folder/subfolder/fileE.txt": "e",
				"folder/subfolder/fileF.txt": "f",
			},
		});

		assertTreeViewStructureEquals(contentWindow.treeView, {
			name: "",
			children: [
				{
					name: "folder",
					children: [],
				},
				{
					name: "fileA.txt",
					children: [],
				},
				{
					name: "fileB.txt",
					children: [],
				},
			],
		});

		uninstall();
	},
});

Deno.test({
	name: "Files are shown in alphabetical order with folders at the top",
	async fn() {
		const {contentWindow, uninstall} = await basicSetup({
			fileSystemStructure: {
				// The order of these has been picked specifically to cause the
				// test to fail when the items are not inserted in the same
				// order as the sorted array.
				// i.e. in `updateTreeViewRecursive` when iterating over
				// `fileTree.directories` rather than `sortedDirectories` the
				// test should fail, as this would cause an incorrect order.
				"bb.txt": "",
				"aa.txt": "",
				"aaFolder/file.txt": "",
				"bB.txt": "",
				"AA.txt": "",
				"zzFolder/file.txt": "",
			},
		});

		try {
			assertTreeViewStructureEquals(contentWindow.treeView, {
				children: [
					{
						name: "aaFolder",
					},
					{
						name: "zzFolder",
					},
					{
						name: "aa.txt",
					},
					{
						name: "AA.txt",
					},
					{
						name: "bb.txt",
					},
					{
						name: "bB.txt",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Root tree view is expanded when the assetmanager is already loaded",
	async fn() {
		const {contentWindow, uninstall} = await basicSetup({
			assetSettingsLoaded: true,
			treeViewAction: "none",
		});

		try {
			assertEquals(contentWindow.treeView.expanded, true);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Root tree view is collapsed when permission is denied",
	async fn() {
		const {contentWindow, triggerPermissionPromptCbs, uninstall} = await basicSetup({
		});

		try {
			assertEquals(contentWindow.treeView.expanded, true);
			triggerPermissionPromptCbs(false);
			assertEquals(contentWindow.treeView.expanded, false);
		} finally {
			uninstall();
		}
	},
});
