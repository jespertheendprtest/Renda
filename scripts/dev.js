#!/usr/bin/env -S deno run --allow-env --allow-run --allow-read --allow-write --allow-net --no-check --unstable

/**
 * @fileoverview
 * Downloads files necessary for development and then starts the development server.
 * If your platform supports the /usr/bin/env shebang (generally speaking mac and linux),
 * you can simply run this script with `./scripts/dev.js`.
 * On windows you can run this using `deno task dev`.
 */

import {setCwd} from "chdir-anywhere";
import {DevServer} from "./DevServer.js";
import {createCacheHashFile, generateTypes} from "https://deno.land/x/deno_tsc_helper@v0.0.12/mod.js";
import {downloadNpmPackages} from "https://deno.land/x/npm_devinit@v0.0.2/mod.ts";

/** @type {import("https://deno.land/x/deno_tsc_helper@v0.0.12/mod.js").GenerateTypesOptions} */
const generateTypesOptions = {
	outputDir: "../.denoTypes",
	importMap: "../importmap.json",
	cacheHashFile: "cacheHashfile",
	preCollectedImportsFile: "precollectedImports.json",
	include: [
		".",
		"../test",
		"../editor/devSocket",
		"../editor/scripts",
	],
	extraTypeRoots: {
		// We prefix webgpu with aa to ensure it is placed above deno-types.
		// The Deno types include webgpu types but they are outdated.
		"aa-webgpu": "https://unpkg.com/@webgpu/types@0.1.21/dist/index.d.ts",
		"wicg-file-system-access": "https://unpkg.com/@types/wicg-file-system-access@2020.9.5/index.d.ts",
		"strict-map": "https://deno.land/x/strictly@v0.0.1/src/map.d.ts",
		"strict-set": "https://deno.land/x/strictly@v0.0.1/src/set.d.ts",
	},
};

if (Deno.args.includes("--create-cache-hashfile")) {
	await createCacheHashFile(generateTypesOptions);
	Deno.exit();
}

await generateTypes(generateTypesOptions);

setCwd();
Deno.chdir("..");

await downloadNpmPackages({
	packages: [
		"typescript@4.8.0-dev.20220803",
		"rollup@2.60.0",
	],
});

const buildProcess = Deno.run({
	cmd: ["deno", "task", "build-editor-dev"],
});
await buildProcess.status();

if (!Deno.args.includes("--no-serve")) {
	const server = new DevServer({
		port: 8080,
		serverName: "development server",
	});
	server.start();
}
