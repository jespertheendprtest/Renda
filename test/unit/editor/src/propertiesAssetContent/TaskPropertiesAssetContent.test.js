import "../../shared/initializeEditor.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {PropertiesAssetContentTask} from "../../../../../editor/src/propertiesAssetContent/PropertiesAssetContentTask.js";
import {createMockProjectAsset} from "../assets/shared/createMockProjectAsset.js";
import {createTreeViewStructure} from "../../../../../editor/src/ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "../../../../../editor/src/tasks/task/Task.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {PropertiesTreeViewEntry} from "../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {TextGui} from "../../../../../editor/src/ui/TextGui.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";

/**
 * @param {Object} options
 * @param {(typeof Task)[]} [options.extraTaskTypes]
 */
function basicSetup({
	extraTaskTypes = [],
} = {}) {
	const BASIC_TASK_TYPE = "namespace:tasktype";
	class BasicTask extends Task {
		static type = BASIC_TASK_TYPE;
		static configStructure = createTreeViewStructure({
			foo: {
				type: "string",
			},
		});
	}
	/** @type {Map<string, typeof Task>} */
	const taskTypes = new Map();
	taskTypes.set(BASIC_TASK_TYPE, BasicTask);
	for (const task of extraTaskTypes) {
		taskTypes.set(task.type, task);
	}

	const editor = /** @type {import("../../../../../editor/src/Editor.js").Editor} */ ({
		taskManager: {
			getTaskType(type) {
				const task = taskTypes.get(type);
				return task;
			},
		},
	});
	const assetContent = new PropertiesAssetContentTask(editor);

	/** @type {import("../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeTask.js").TaskProjectAssetDiskData} */
	const readAssetDataReturnValue = {
		taskType: "namespace:tasktype",
		taskConfig: {
			foo: "bar",
		},
	};

	const {projectAsset: mockProjectAsset} = createMockProjectAsset({
		readAssetDataReturnValue,
	});

	return {
		assetContent,
		mockProjectAsset,
		BASIC_TASK_TYPE,
	};
}

Deno.test({
	name: "Loads the task config from disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup();

			await assetContent.selectionUpdated([mockProjectAsset]);

			assertEquals(assetContent.taskConfigTree.children.length, 1);
			const fooNode = assetContent.taskConfigTree.children[0];
			assertInstanceOf(fooNode, PropertiesTreeViewEntry);
			assertEquals(fooNode.getValue(), "bar");
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Clears config ui when selecting a task with no config",
	async fn() {
		installFakeDocument();

		try {
			class NoConfigTask extends Task {
				static type = "namespace:noconfigtasktype";
			}
			const {assetContent, mockProjectAsset} = basicSetup({
				extraTaskTypes: [NoConfigTask],
			});

			await assetContent.selectionUpdated([mockProjectAsset]);

			const {projectAsset: mockProjectAsset2} = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: NoConfigTask.type,
				},
			});

			await assetContent.selectionUpdated([mockProjectAsset2]);

			assertEquals(assetContent.taskConfigTree.children.length, 0);
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Config ui changes are saved to disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup();

			await assetContent.selectionUpdated([mockProjectAsset]);
			mockProjectAsset.writeAssetData = async () => {};
			const writeAssetDataSpy = spy(mockProjectAsset, "writeAssetData");

			const fooNode = assetContent.taskConfigTree.children[0];
			assertInstanceOf(fooNode, PropertiesTreeViewEntry);
			const fooGui = fooNode.gui;
			assertInstanceOf(fooGui, TextGui);
			fooNode.setValue("baz");
			fooGui.fireOnChangeCbs();

			assertSpyCalls(writeAssetDataSpy, 1);
			assertEquals(writeAssetDataSpy.calls[0].args[0], {
				taskType: "namespace:tasktype",
				taskConfig: {
					foo: "baz",
				},
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});
