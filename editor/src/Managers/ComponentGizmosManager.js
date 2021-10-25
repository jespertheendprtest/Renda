import autoRegisterComponentGizmos from "../ComponentGizmos/AutoRegisterComponentGizmos.js";
import ComponentGizmos from "../ComponentGizmos/ComponentGizmos.js";

export default class ComponentGizmosManager {
	/** @typedef {typeof import("../../../src/Components/Component.js").default} ComponentType */

	constructor() {
		/** @type {Map<ComponentType, typeof ComponentGizmos>} */
		this.componentGizmos = new Map();
	}

	init() {
		for (const componentGizmos of autoRegisterComponentGizmos) {
			this.registerComponentGizmos(componentGizmos);
		}
	}

	registerComponentGizmos(constructor) {
		if (!(constructor.prototype instanceof ComponentGizmos)) {
			console.warn("Tried to register ComponentGizmos (" + constructor.name + ") that does not extend ComponentGizmos class.");
			return;
		}

		if (constructor.componentType == null) {
			constructor.invalidConfigurationWarning("Failed to register ComponentGizmos (" + constructor.name + ") componentType value not set.");
			return;
		}

		this.componentGizmos.set(constructor.componentType, constructor);
	}

	/**
	 * @param {ComponentType} componentType
	 */
	getComponentGizmosConstructor(componentType) {
		return this.componentGizmos.get(componentType);
	}

	/**
	 * @param {ComponentType} componentType
	 * @param {import("../../../src/Components/Component.js").default} component
	 * @param {import("../../../src/Gizmos/GizmoManager.js").default} gizmoManager
	 */
	createComponentGizmosInstance(componentType, component, gizmoManager) {
		const ComponentGizmosConstructor = this.getComponentGizmosConstructor(componentType);
		if (!ComponentGizmosConstructor) return null;
		return new ComponentGizmosConstructor(component, gizmoManager);
	}
}
