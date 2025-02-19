import {Vec3} from "./Vec3.js";
import {Vec4} from "./Vec4.js";

/**
 * @typedef {() => Vec2} vec2SetEmptySignature
 * @typedef {(vec: Vec2) => Vec2} vec2SetVec2Signature
 * @typedef {(vec: Vec3) => Vec2} vec2SetVec3Signature
 * @typedef {(vec: Vec4) => Vec2} vec2SetVec4Signature
 * @typedef {(x: number, y: number) => Vec2} vec2SetNumNumSignature
 * @typedef {(xy: number[]) => Vec2} vec2SetArraySignature
 * @typedef {import("./types.js").MergeParameters<vec2SetEmptySignature | vec2SetVec2Signature | vec2SetVec3Signature | vec2SetVec4Signature | vec2SetNumNumSignature | vec2SetArraySignature>} Vec2Parameters
 */

/**
 * @typedef {import("./types.js").GetFirstParam<Vec2Parameters>} Vec2ParameterSingle
 */

export class Vec2 {
	/**
	 * @param {Vec2Parameters} args
	 */
	constructor(...args) {
		/** @type {Set<import("./Vec3.js").OnVectorChangeCallback>} */
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this.set(...args);
	}

	get x() {
		return this._x;
	}
	set x(value) {
		this._x = value;
		this.fireOnChange(0x10);
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange(0x01);
	}

	/**
	 * @param {Vec2Parameters} args
	 */
	set(...args) {
		const prevX = this._x;
		const prevY = this._y;
		this._x = 0;
		this._y = 0;

		if (args.length == 1) {
			const arg = args[0];
			if (arg instanceof Vec2 || arg instanceof Vec3 || arg instanceof Vec4) {
				this._x = arg.x;
				this._y = arg.y;
			} else if (Array.isArray(arg)) {
				this._x = 0;
				this._y = 0;
				if (arg.length >= 1) this._x = arg[0];
				if (arg.length >= 2) this._y = arg[1];
			}
		} else if (args.length == 2) {
			if (args.length >= 1) this._x = args[0];
			if (args.length >= 2) this._y = args[1];
		}

		let changedComponents = 0x00;
		if (this._x != prevX) changedComponents |= 0x10;
		if (this._y != prevY) changedComponents |= 0x01;
		if (changedComponents != 0x00) this.fireOnChange(changedComponents);
		return this;
	}

	clone() {
		return new Vec2(this);
	}

	/**
	 * Creates a new Vec3 instance with the same components as this vector.
	 */
	toVec3() {
		return new Vec3(this);
	}

	/**
	 * Creates a new Vec4 instance with the same components as this vector and
	 * the w component set to 1.
	 */
	toVec4() {
		return new Vec4(this);
	}

	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		let x = this._x * diff;
		let y = this._y * diff;
		if (isNaN(x)) x = 0;
		if (isNaN(y)) y = 0;
		this.set(x, y);
	}

	normalize() {
		this.magnitude = 1;
		return this;
	}

	/**
	 * @param {Vec2Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec2(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
	 * @param {Parameters<typeof this.multiplyScalar> | Vec2Parameters} args
	 */
	multiply(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.multiplyScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.multiplyVector(new Vec2(...castArgs));
		}
	}

	/**
	 * Multiplies components by a scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	multiplyScalar(scalar) {
		const x = this._x * scalar;
		const y = this._y * scalar;
		return this.set(x, y);
	}

	/**
	 * Multiplies components by the value of their respective components.
	 * @param {Vec2} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		const x = this._x * vector.x;
		const y = this._y * vector.y;
		return this.set(x, y);
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are added to this vector.
	 * @param {Parameters<typeof this.addScalar> | Vec2Parameters} args
	 */
	add(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.addScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.addVector(new Vec2(...castArgs));
		}
	}

	/**
	 * Adds a scalar to each component.
	 * @param {number} scalar
	 */
	addScalar(scalar) {
		const x = this._x + scalar;
		const y = this._y + scalar;
		return this.set(x, y);
	}

	/**
	 * Adds components to their respective components.
	 * @param {Vec2} vector
	 */
	addVector(vector) {
		const x = this._x + vector.x;
		const y = this._y + vector.y;
		return this.set(x, y);
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are subtracted from this vector.
	 * @param {Parameters<typeof this.subScalar> | Vec2Parameters} args
	 */
	sub(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.subScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.subVector(new Vec2(...castArgs));
		}
	}

	/**
	 * Subtracts a scalar from each component.
	 * @param {number} scalar
	 */
	subScalar(scalar) {
		const x = this._x - scalar;
		const y = this._y - scalar;
		return this.set(x, y);
	}

	/**
	 * Subtracts components from their respective components.
	 * @param {Vec2} vector
	 */
	subVector(vector) {
		const x = this._x - vector.x;
		const y = this._y - vector.y;
		return this.set(x, y);
	}

	/**
	 * Computes the dot product between this vector and another vector.
	 *
	 * [Dot product visualisation](https://falstad.com/dotproduct/)
	 *
	 * - When the two vectors point in opposite directions (i.e. the angle is greater than 90º), the dot product is negative.
	 * ```none
	 *    ^
	 *     \
	 *      \ 110º
	 *       o---->
	 * ```
	 * - When the two vectors point in the same direction (i.e. the angle is less than 90º), the dot product is positive.
	 * ```none
	 *      ^
	 *     /
	 *    / 70º
	 *   o---->
	 * ```
	 * - When the two vectors are perpendicular, the dot product is zero.
	 * ```none
	 *   ^
	 *   |
	 *   | 90º
	 *   o---->
	 * ```
	 * - The dot product returns the same value regardless of the order of the vectors.
	 * - If one vector is normalized, the dot product is essentially the length
	 * of the other vector, projected on the normalized one.
	 * ```none
	 *    b ^
	 *     /.
	 *    / .
	 *   o--+---> a
	 *   o-->
	 *      c
	 * ```
	 * In this example `a` is normalised. The dot product of `a` and `b` is the
	 * length of `c`.
	 *
	 * @param  {Vec2Parameters} v
	 */
	dot(...v) {
		const other = new Vec2(...v);
		return this._x * other.x + this._y * other.y;
	}

	/**
	 * Projects this vector (a) on another vector (b) and sets the value
	 * of this vector to the result.
	 * ```none
	 *      a ^
	 *       /.
	 *      / .
	 *     /  .
	 *    /   .
	 *   o----+-----> b
	 *   o---->
	 *        c
	 * ```
	 *
	 * In this example `c` is the projection of `a` on `b`:
	 *
	 * ```js
	 * const a = new Vec2();
	 * const b = new Vec2();
	 * const c = a.clone().projectOnVector(b);
	 * ```
	 *
	 * @param {Vec2Parameters} v
	 */
	projectOnVector(...v) {
		const other = new Vec2(...v);
		other.normalize();
		const dot = this.dot(other);
		other.multiplyScalar(dot);
		return this.set(other);
	}

	toArray() {
		return [this.x, this.y];
	}

	/**
	 * Registers a callback that is called when this vector changes.
	 * The first argument is a bitmask indicating which components of the vector
	 * have changed.
	 * For instance, `0x10` if the first component changed, `0x01` if the
	 * second component changed, and `0x11` if all components changed.
	 *
	 * #### Usage
	 * ```js
	 * const v = new Vec2();
	 * v.onChange(changedComponents => {
	 * 	if (changedComponents & 0x10) {
	 * 		console.log("x changed!");
	 * 	}
	 * });
	 * ```
	 * @param {import("./Vec3.js").OnVectorChangeCallback} cb
	 */
	onChange(cb) {
		this.onChangeCbs.add(cb);
	}

	/**
	 * @param {import("./Vec3.js").OnVectorChangeCallback} cb
	 */
	removeOnChange(cb) {
		this.onChangeCbs.delete(cb);
	}

	/**
	 * @param {number} changedComponents
	 */
	fireOnChange(changedComponents) {
		for (const cb of this.onChangeCbs) {
			cb(changedComponents);
		}
	}
}
