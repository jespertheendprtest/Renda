import {assertEquals, assertExists, assertInstanceOf, assertThrows} from "std/testing/asserts.ts";
import {Task} from "../../../../../editor/src/tasks/task/Task.js";
import {TaskManager} from "../../../../../editor/src/tasks/TaskManager.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {createMockProjectAsset} from "../assets/shared/createMockProjectAsset.js";
import {stringArrayEquals} from "../../../../../src/mod.js";

Deno.test({
	name: "init(), registers the default task types",
	fn() {
		const manager = new TaskManager();
		manager.init();

		const result = manager.getTaskType("renda:bundleScripts");

		assertExists(result);
	},
});

Deno.test({
	name: "getTaskType() throws when the task doesn't exist",
	fn() {
		const manager = new TaskManager();
		manager.init();

		assertThrows(() => {
			manager.getTaskType("nonexistent");
		}, Error, `Task type "nonexistent" is not registered.`);
	},
});

Deno.test({
	name: "getTaskTypes()",
	fn() {
		const manager = new TaskManager();
		class Task1 extends Task {
			static type = "namespace:type1";
		}
		class Task2 extends Task {
			static type = "namespace:type2";
		}
		manager.registerTaskType(Task1);
		manager.registerTaskType(Task2);

		const result = Array.from(manager.getTaskTypes()).map(t => t.type);
		assertEquals(result, ["namespace:type1", "namespace:type2"]);
	},
});

Deno.test({
	name: "registering a task with an incorrect constructor type throws",
	fn() {
		const manager = new TaskManager();

		assertThrows(() => {
			manager.registerTaskType(/** @type {any} */ ({}));
		}, Error, "Tried to register task (undefined) that does not extend the Task class.");
	},
});

Deno.test({
	name: "registering a task with a missing 'type' property throws",
	fn() {
		const manager = new TaskManager();

		class ExtendedTask extends Task {}

		assertThrows(() => {
			manager.registerTaskType(ExtendedTask);
		}, Error, "Tried to register task (ExtendedTask) with no type value, override the static type value in order for this task to function properly.");
	},
});

Deno.test({
	name: "registering a task with an incorrect 'type' format throws",
	fn() {
		const manager = new TaskManager();

		const wrongTypes = [
			"missingcolon",
			":nonamespace",
			"notype:",
		];

		for (const typeStr of wrongTypes) {
			class ExtendedTask extends Task {
				static type = typeStr;
			}

			assertThrows(() => {
				manager.registerTaskType(ExtendedTask);
			}, Error, "Tried to register task (ExtendedTask) without a namespace in the type value.");
		}
	},
});

/**
 * @param {Object} options
 * @param {{path: import("../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath, projectAsset: import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny}[]} [options.pathProjectAssets]
 * @param {Map<import("../../../../../src/mod.js").UuidString, import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny>} [options.uuidProjectAssets]
 */
function basicTaskRunningSetup({
	pathProjectAssets = [],
	uuidProjectAssets = new Map(),
} = {}) {
	/**
	 * @typedef RegisteredAssetData
	 * @property {import("std/testing/mock.ts").Spy<import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny, [fileData: unknown], Promise<void>>} writeAssetDataSpy
	 */
	/** @type {RegisteredAssetData[]} */
	const registeredAssets = [];
	injectMockEditorInstance(/** @type {import("../../../../../editor/src/Editor.js").Editor} */ ({
		projectManager: {
			assetManager: {
				async getProjectAssetFromPath(path, options) {
					for (const {path: path2, projectAsset} of pathProjectAssets) {
						if (stringArrayEquals(path, path2)) {
							return projectAsset;
						}
					}
					return null;
				},
				async getProjectAssetFromUuid(uuid, options) {
					if (!uuid) return null;
					return uuidProjectAssets.get(uuid) || null;
				},
				async registerAsset(path, assetType) {
					const {projectAsset} = createMockProjectAsset();
					registeredAssets.push({
						writeAssetDataSpy: spy(projectAsset, "writeAssetData"),
					});
					return projectAsset;
				},
			},
		},
	}));

	return {
		registeredAssets,
		cleanup() {
			injectMockEditorInstance(null);
		},
	};
}

Deno.test({
	name: "running a task",
	async fn() {
		const {registeredAssets, cleanup} = basicTaskRunningSetup();

		try {
			const manager = new TaskManager();

			/** @extends {Task<{}>} */
			class ExtendedTask extends Task {
				static type = "namespace:type";
				static workerUrl = new URL("./shared/basicWorker.js", import.meta.url);

				/** @type {TypedMessenger<import("./shared/basicWorker.js").BasicWorkerResponseHandlers, {}>} */
				#messenger;

				/** @param {ConstructorParameters<typeof Task>} args */
				constructor(...args) {
					super(...args);
					this.#messenger = new TypedMessenger();
					this.#messenger.setSendHandler(data => {
						this.worker.postMessage(data.sendData);
					});
					this.worker.addEventListener("message", event => {
						this.#messenger.handleReceivedMessage(event.data);
					});
				}

				/**
				 * @param {import("../../../../../editor/src/tasks/task/Task.js").RunTaskOptions<{}>} options
				 */
				async runTask(options) {
					const str = await this.#messenger.send("repeatString", "foo");
					/** @type {import("../../../../../editor/src/tasks/task/Task.js").RunTaskReturn} */
					const returnValue = {
						writeAssets: [
							{
								path: ["path", "to", "file.txt"],
								assetType: "namespace:type",
								fileData: str,
							},
						],
					};
					return returnValue;
				}
			}

			const runTaskSpy = spy(ExtendedTask.prototype, "runTask");

			const {projectAsset: taskProjectAsset} = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:type",
					taskConfig: {
						foo: "bar",
					},
				},
			});

			manager.registerTaskType(ExtendedTask);
			await manager.runTask(taskProjectAsset);

			assertSpyCalls(runTaskSpy, 1);
			assertEquals(runTaskSpy.calls[0].args[0].config, {
				foo: "bar",
			});
			assertEquals(runTaskSpy.calls[0].args[0].needsAllGeneratedAssets, false);

			assertEquals(registeredAssets.length, 1);
			const registeredAsset = registeredAssets[0];
			assertSpyCalls(registeredAsset.writeAssetDataSpy, 1);
			assertSpyCall(registeredAsset.writeAssetDataSpy, 0, {
				args: ["foo"],
			});

			const taskInstance = manager.initializeTask("namespace:type");
			assertInstanceOf(taskInstance, ExtendedTask);
			taskInstance.worker.terminate();
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "running a task with a dependency task",
	async fn() {
		const DEPENDENDCY_PATH = ["path", "to", "dependency.txt"];
		const TOUCHED_ASSET_UUID = "TOUCHED_ASSET_UUID";

		const {projectAsset: dependencyProjectAsset1} = createMockProjectAsset();
		const {projectAsset: dependencyProjectAsset2} = createMockProjectAsset();

		/** @type {Map<import("../../../../../src/mod.js").UuidString, import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny>} */
		const uuidProjectAssets = new Map();
		uuidProjectAssets.set(TOUCHED_ASSET_UUID, dependencyProjectAsset2);
		const {cleanup} = basicTaskRunningSetup({
			pathProjectAssets: [
				{
					path: DEPENDENDCY_PATH,
					projectAsset: dependencyProjectAsset1,
				},
			],
			uuidProjectAssets,
		});

		try {
			const manager = new TaskManager();

			let dependencyRunCount = 0;

			/** @extends {Task<{}>} */
			class DependencyTask extends Task {
				static type = "namespace:dependency";

				/**
				 * @param {import("../../../../../editor/src/tasks/task/Task.js").RunTaskOptions<{}>} options
				 */
				async runTask(options) {
					dependencyRunCount++;
					/** @type {import("../../../../../editor/src/tasks/task/Task.js").RunTaskReturn} */
					const returnValue = {
						writeAssets: [
							{
								path: DEPENDENDCY_PATH,
								assetType: "namespace:type",
								fileData: "foo",
							},
						],
						touchedAssets: [TOUCHED_ASSET_UUID],
					};
					return returnValue;
				}
			}
			manager.registerTaskType(DependencyTask);

			/**
			 * @typedef ParentTaskConfig
			 * @property {import("../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} [assetPath]
			 * @property {import("../../../../../src/mod.js").UuidString} [assetUuid]
			 */

			/** @extends {Task<ParentTaskConfig>} */
			class ParentTask extends Task {
				static type = "namespace:parent";

				/**
				 * @param {import("../../../../../editor/src/tasks/task/Task.js").RunTaskOptions<ParentTaskConfig>} options
				 */
				async runTask(options) {
					if (options.config.assetPath) {
						await options.readAssetFromPath(DEPENDENDCY_PATH, {});
					} else if (options.config.assetUuid) {
						await options.readAssetFromUuid(options.config.assetUuid, {});
					}
					return {};
				}
			}
			manager.registerTaskType(ParentTask);

			const {projectAsset: dependencyTaskAsset} = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:dependency",
					taskConfig: {},
				},
			});

			const {projectAsset: parentTaskAsset1} = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:parent",
					/** @type {ParentTaskConfig} */
					taskConfig: {
						assetPath: DEPENDENDCY_PATH,
					},
				},
			});

			const {projectAsset: parentTaskAsset2} = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:parent",
					/** @type {ParentTaskConfig} */
					taskConfig: {
						assetUuid: TOUCHED_ASSET_UUID,
					},
				},
			});

			// First we run the dependency to let the manager know dependency.txt is created by this task.
			await manager.runTask(dependencyTaskAsset);

			assertEquals(dependencyRunCount, 1);

			// Then we run the first parent task, which should run the dependency task again because DEPENDENDCY_PATH was written.
			await manager.runTask(parentTaskAsset1);

			assertEquals(dependencyRunCount, 2);

			// Then we run the second parent task, which should run the dependency task a third time because TOUCHED_ASSET_UUID was touched.
			await manager.runTask(parentTaskAsset2);

			assertEquals(dependencyRunCount, 3);
		} finally {
			cleanup();
		}
	},
});
