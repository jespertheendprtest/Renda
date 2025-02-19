import {assertEquals} from "std/testing/asserts.ts";
import {ColorizerFilter} from "../../../../../../editor/src/util/colorizerFilters/ColorizerFilter.js";
import {forceCleanup, installMockWeakRef, uninstallMockWeakRef} from "../../../../shared/mockWeakRef.js";
import {initializeDom} from "../../../shared/initializeDom.js";

initializeDom();

Deno.test({
	name: "Construction",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const container = document.createElement("div");
		new ColorizerFilter("blue", container);

		assertEquals(container.childNodes.length, 1);
	},
});

Deno.test({
	name: "Destruction",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const container = document.createElement("div");
		const filter = new ColorizerFilter("blue", container);

		filter.destructor();

		assertEquals(container.childNodes.length, 0);
	},
});

Deno.test({
	name: "setFilterId getFilterId",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const container = document.createElement("div");
		const filter = new ColorizerFilter("blue", container);
		const filterId = "filterId";

		filter.setFilterId(filterId);

		assertEquals(filter.getFilterId(), filterId);

		const filterEl = /** @type {HTMLElement?} */ (container.firstChild?.firstChild);
		assertEquals(filterEl?.id, filterId);
	},
});

Deno.test({
	name: "getUsageReference",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const container = document.createElement("div");
		const filter = new ColorizerFilter("blue", container);
		let allReferencesDestructedCallCount = 0;

		const usageRef = filter.getUsageReference();
		filter.onAllReferencesDestructed(() => {
			allReferencesDestructedCallCount++;
		});
		filter.notifyReferenceDestructed(usageRef);

		assertEquals(allReferencesDestructedCallCount, 1);
	},
});

Deno.test({
	name: "garbage collection",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		installMockWeakRef();
		const container = document.createElement("div");
		const filter = new ColorizerFilter("blue", container);
		let allReferencesDestructedCallCount = 0;

		const usageRef = filter.getUsageReference();
		filter.onAllReferencesDestructed(() => {
			allReferencesDestructedCallCount++;
		});
		forceCleanup(usageRef);

		assertEquals(allReferencesDestructedCallCount, 1);

		uninstallMockWeakRef();
	},
});
