import {click, hover} from "../../shared/util.js";

/**
 * Waits for a context menu to open, then clicks the specified item and waits
 * for the context menu to close.
 *
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {string[]} menuPath
 */
export async function clickContextMenuItem(page, testContext, menuPath) {
	await testContext.step({
		name: `Click context menu "${menuPath.join(" > ")}"`,
		fn: async () => {
			await page.waitForFunction(() => {
				if (!globalThis.editor) throw new Error("Editor instance does not exist");
				return globalThis.editor.contextMenuManager.current;
			});
			for (let i = 0; i < menuPath.length; i++) {
				const itemName = menuPath[i];
				const expectedSubmenuCount = i;
				const jsHandle = await page.evaluateHandle(async (itemName, expectedSubmenuCount, menuPath) => {
					if (!globalThis.editor) throw new Error("Editor instance does not exist");
					if (!globalThis.editor.contextMenuManager.current) throw new Error("Context menu no longer exists");
					// Submenus only get created when hovering over them. Hovering over another item closes the existing
					// submenu and creates a new one. So there's always only one submenu open for each context menu.
					// This means we can just recurse down all the existing menus and then return the element from the
					// last submenu.
					let submenuCount = 0;
					let currentMenu = globalThis.editor.contextMenuManager.current;
					while (true) {
						const submenu = currentMenu.currentSubmenu;
						if (!submenu) break;
						currentMenu = submenu;
						submenuCount++;
					}
					if (submenuCount !== expectedSubmenuCount) {
						const nonSubmenuItemName = menuPath[submenuCount];
						throw new Error(`The submenu "${menuPath.join(" > ")}" does not exist. "${nonSubmenuItemName}" does not have a submenu.`);
					}
					const item = currentMenu.addedItems.find(item => item.textEl.textContent == itemName);
					if (!item) {
						throw new Error(`The submenu "${menuPath.join(" > ")}" does not exist. "${itemName}" at index ${submenuCount} does not exist.`);
					}
					return item.el;
				}, itemName, expectedSubmenuCount, menuPath);
				if (!jsHandle) {
					throw new Error(`The submenu "${menuPath.join(" > ")}" does not exist. Failed to get an item handle for "${itemName}" at index ${i}.`);
				}
				const elementHandle = /** @type {import("puppeteer").ElementHandle} */ (jsHandle);
				const lastItem = i >= menuPath.length - 1;
				if (lastItem) {
					await click(page, elementHandle);
				} else {
					await hover(page, elementHandle);
				}
			}
		},
	});
}
