#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region node_modules/js-yaml/dist/js-yaml.mjs
/*! js-yaml 5.4.1 https://github.com/nodeca/js-yaml @license MIT */
/**
* Returned by a scalar resolver when the source does not match its tag.
*
* @category Tags
*/
var NOT_RESOLVED = Symbol("NOT_RESOLVED");
/**
* Create a normalized scalar tag definition.
*
* @category Tags
*/
function defineScalarTag(tagName, options) {
	return {
		tagName,
		nodeKind: "scalar",
		implicit: options.implicit ?? false,
		matchByTagPrefix: options.matchByTagPrefix ?? false,
		implicitFirstChars: options.implicitFirstChars ?? null,
		resolve: options.resolve,
		identify: options.identify,
		represent: options.represent ?? ((data) => String(data)),
		representTagName: options.representTagName ?? (() => tagName)
	};
}
/**
* Create a normalized sequence tag definition.
*
* @category Tags
*/
function defineSequenceTag(tagName, options) {
	const carrierIsResult = options.finalize === void 0;
	return {
		tagName,
		nodeKind: "sequence",
		implicit: false,
		matchByTagPrefix: options.matchByTagPrefix ?? false,
		create: options.create,
		addItem: options.addItem,
		finalize: options.finalize ?? ((carrier) => carrier),
		carrierIsResult,
		identify: options.identify,
		represent: options.represent ?? ((data) => data),
		representTagName: options.representTagName ?? (() => tagName)
	};
}
/**
* Create a normalized mapping tag definition.
*
* @category Tags
*/
function defineMappingTag(tagName, options) {
	const carrierIsResult = options.finalize === void 0;
	return {
		tagName,
		nodeKind: "mapping",
		implicit: false,
		matchByTagPrefix: options.matchByTagPrefix ?? false,
		create: options.create,
		addPair: options.addPair,
		has: options.has,
		keys: options.keys,
		get: options.get,
		finalize: options.finalize ?? ((carrier) => carrier),
		carrierIsResult,
		identify: options.identify,
		represent: options.represent ?? ((data) => data),
		representTagName: options.representTagName ?? (() => tagName)
	};
}
/** @category Tags */
var strTag = defineScalarTag("tag:yaml.org,2002:str", {
	resolve: (source) => source,
	identify: (data) => typeof data === "string"
});
var NULL_VALUES$1 = [
	"",
	"~",
	"null",
	"Null",
	"NULL"
];
/** @category Tags */
var nullCoreTag = defineScalarTag("tag:yaml.org,2002:null", {
	implicit: true,
	implicitFirstChars: [
		"",
		"~",
		"n",
		"N"
	],
	resolve: (source) => {
		if (NULL_VALUES$1.indexOf(source) !== -1) return null;
		return NOT_RESOLVED;
	},
	identify: (object) => object === null,
	represent: () => "null"
});
/** @category Tags */
var nullJsonTag = defineScalarTag("tag:yaml.org,2002:null", {
	implicit: true,
	implicitFirstChars: ["n"],
	resolve: (source, isExplicit) => {
		if (source === "null" || isExplicit && source === "") return null;
		return NOT_RESOLVED;
	},
	identify: (object) => object === null,
	represent: () => "null"
});
var NULL_VALUES = [
	"",
	"~",
	"null",
	"Null",
	"NULL"
];
/** @category Tags */
var nullYaml11Tag = defineScalarTag("tag:yaml.org,2002:null", {
	implicit: true,
	implicitFirstChars: [
		"",
		"~",
		"n",
		"N"
	],
	resolve: (source) => {
		if (NULL_VALUES.indexOf(source) !== -1) return null;
		return NOT_RESOLVED;
	},
	identify: (object) => object === null,
	represent: () => "null"
});
var TRUE_VALUES$2 = [
	"true",
	"True",
	"TRUE"
];
var FALSE_VALUES$2 = [
	"false",
	"False",
	"FALSE"
];
/** @category Tags */
var boolCoreTag = defineScalarTag("tag:yaml.org,2002:bool", {
	implicit: true,
	implicitFirstChars: [
		"t",
		"T",
		"f",
		"F"
	],
	resolve: (source) => {
		if (TRUE_VALUES$2.indexOf(source) !== -1) return true;
		if (FALSE_VALUES$2.indexOf(source) !== -1) return false;
		return NOT_RESOLVED;
	},
	identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
	represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES$1 = ["true"];
var FALSE_VALUES$1 = ["false"];
/** @category Tags */
var boolJsonTag = defineScalarTag("tag:yaml.org,2002:bool", {
	implicit: true,
	implicitFirstChars: ["t", "f"],
	resolve: (source) => {
		if (TRUE_VALUES$1.indexOf(source) !== -1) return true;
		if (FALSE_VALUES$1.indexOf(source) !== -1) return false;
		return NOT_RESOLVED;
	},
	identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
	represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES = [
	"true",
	"True",
	"TRUE",
	"y",
	"Y",
	"yes",
	"Yes",
	"YES",
	"on",
	"On",
	"ON"
];
var FALSE_VALUES = [
	"false",
	"False",
	"FALSE",
	"n",
	"N",
	"no",
	"No",
	"NO",
	"off",
	"Off",
	"OFF"
];
/** @category Tags */
var boolYaml11Tag = defineScalarTag("tag:yaml.org,2002:bool", {
	implicit: true,
	implicitFirstChars: [
		"y",
		"Y",
		"n",
		"N",
		"t",
		"T",
		"f",
		"F",
		"o",
		"O"
	],
	resolve: (source) => {
		if (TRUE_VALUES.indexOf(source) !== -1) return true;
		if (FALSE_VALUES.indexOf(source) !== -1) return false;
		return NOT_RESOLVED;
	},
	identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
	represent: (object) => object ? "true" : "false"
});
var YAML_INTEGER_IMPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
var YAML_INTEGER_EXPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$2(source) {
	let value = source;
	let sign = 1;
	if (value[0] === "-" || value[0] === "+") {
		if (value[0] === "-") sign = -1;
		value = value.slice(1);
	}
	if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
	if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
	if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
	return sign * parseInt(value, 10);
}
function resolveYamlInteger$2(source, isExplicit) {
	if (isExplicit) {
		if (!YAML_INTEGER_EXPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
	} else if (!YAML_INTEGER_IMPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
	const result = parseYamlInteger$2(source);
	return Number.isFinite(result) ? result : NOT_RESOLVED;
}
/** @category Tags */
var intCoreTag = defineScalarTag("tag:yaml.org,2002:int", {
	implicit: true,
	implicitFirstChars: [
		"-",
		"+",
		..."0123456789"
	],
	resolve: resolveYamlInteger$2,
	identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
	represent: (object) => object.toString(10)
});
var YAML_INTEGER_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)$");
var YAML_INTEGER_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$1(source) {
	let value = source;
	let sign = 1;
	if (value[0] === "-" || value[0] === "+") {
		if (value[0] === "-") sign = -1;
		value = value.slice(1);
	}
	if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
	if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
	if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
	return sign * parseInt(value, 10);
}
function resolveYamlInteger$1(source, isExplicit) {
	if (isExplicit) {
		if (!YAML_INTEGER_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
	} else if (!YAML_INTEGER_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
	const result = parseYamlInteger$1(source);
	return Number.isFinite(result) ? result : NOT_RESOLVED;
}
/** @category Tags */
var intJsonTag = defineScalarTag("tag:yaml.org,2002:int", {
	implicit: true,
	implicitFirstChars: ["-", ..."0123456789"],
	resolve: resolveYamlInteger$1,
	identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
	represent: (object) => object.toString(10)
});
var YAML_INTEGER_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$");
function parseYamlInteger(source) {
	let value = source.replace(/_/g, "");
	let sign = 1;
	if (value[0] === "-" || value[0] === "+") {
		if (value[0] === "-") sign = -1;
		value = value.slice(1);
	}
	if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
	if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
	if (value.includes(":")) {
		let result = 0;
		for (const part of value.split(":")) result = result * 60 + Number(part);
		return sign * result;
	}
	if (value !== "0" && value[0] === "0") return sign * parseInt(value, 8);
	return sign * parseInt(value, 10);
}
function resolveYamlInteger(source) {
	if (!YAML_INTEGER_PATTERN.test(source)) return NOT_RESOLVED;
	const result = parseYamlInteger(source);
	return Number.isFinite(result) ? result : NOT_RESOLVED;
}
/** @category Tags */
var intYaml11Tag = defineScalarTag("tag:yaml.org,2002:int", {
	implicit: true,
	implicitFirstChars: [
		"-",
		"+",
		..."0123456789"
	],
	resolve: resolveYamlInteger,
	identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
	represent: (object) => object.toString(10)
});
var YAML_FLOAT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$2(source) {
	if (!YAML_FLOAT_PATTERN$1.test(source)) return NOT_RESOLVED;
	let value = source.toLowerCase();
	const sign = value[0] === "-" ? -1 : 1;
	if ("+-".includes(value[0])) value = value.slice(1);
	if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
	if (value === ".nan") return NaN;
	const result = sign * parseFloat(value);
	if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN$1.test(source)) return result;
	return NOT_RESOLVED;
}
function representYamlFloat$2(object) {
	if (isNaN(object)) return ".nan";
	if (object === Number.POSITIVE_INFINITY) return ".inf";
	if (object === Number.NEGATIVE_INFINITY) return "-.inf";
	if (Object.is(object, -0)) return "-0.0";
	const result = object.toString(10);
	return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
/** @category Tags */
var floatCoreTag = defineScalarTag("tag:yaml.org,2002:float", {
	implicit: true,
	implicitFirstChars: [
		"-",
		"+",
		".",
		..."0123456789"
	],
	resolve: resolveYamlFloat$2,
	identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
	represent: representYamlFloat$2
});
var YAML_FLOAT_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$");
var YAML_FLOAT_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$1(source, isExplicit) {
	if (isExplicit) {
		if (!YAML_FLOAT_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
		let value = source.toLowerCase();
		const sign = value[0] === "-" ? -1 : 1;
		if ("+-".includes(value[0])) value = value.slice(1);
		if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		if (value === ".nan") return NaN;
		const result = sign * parseFloat(value);
		return Number.isFinite(result) ? result : NOT_RESOLVED;
	}
	if (!YAML_FLOAT_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
	const result = Number(source);
	if (Number.isFinite(result)) return result;
	return NOT_RESOLVED;
}
function representYamlFloat$1(object) {
	if (isNaN(object)) return ".nan";
	if (object === Number.POSITIVE_INFINITY) return ".inf";
	if (object === Number.NEGATIVE_INFINITY) return "-.inf";
	if (Object.is(object, -0)) return "-0.0";
	const result = object.toString(10);
	return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
/** @category Tags */
var floatJsonTag = defineScalarTag("tag:yaml.org,2002:float", {
	implicit: true,
	implicitFirstChars: ["-", ..."0123456789"],
	resolve: resolveYamlFloat$1,
	identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
	represent: representYamlFloat$1
});
var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:(?:[0-9][0-9_]*)?\\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(source) {
	if (!YAML_FLOAT_PATTERN.test(source)) return NOT_RESOLVED;
	let value = source.toLowerCase().replace(/_/g, "");
	const sign = value[0] === "-" ? -1 : 1;
	if ("+-".includes(value[0])) value = value.slice(1);
	if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
	if (value === ".nan") return NaN;
	let result = 0;
	if (value.includes(":")) {
		for (const part of value.split(":")) result = result * 60 + Number(part);
		result *= sign;
	} else result = sign * parseFloat(value);
	if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN.test(source)) return result;
	return NOT_RESOLVED;
}
function representYamlFloat(object) {
	if (isNaN(object)) return ".nan";
	if (object === Number.POSITIVE_INFINITY) return ".inf";
	if (object === Number.NEGATIVE_INFINITY) return "-.inf";
	if (Object.is(object, -0)) return "-0.0";
	const result = object.toString(10);
	return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
/** @category Tags */
var floatYaml11Tag = defineScalarTag("tag:yaml.org,2002:float", {
	implicit: true,
	implicitFirstChars: [
		"-",
		"+",
		".",
		..."0123456789"
	],
	resolve: resolveYamlFloat,
	identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
	represent: representYamlFloat
});
/**
* Enables merge keys in {@link CORE_SCHEMA} when added with
* {@link Schema.withTags}.
*
* @category Tags
*/
var mergeTag = defineScalarTag("tag:yaml.org,2002:merge", {
	implicit: true,
	implicitFirstChars: ["<"],
	resolve: (source, isExplicit) => {
		if (source === "<<" || isExplicit && source === "") return "<<";
		return NOT_RESOLVED;
	},
	identify: () => false
});
var BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
function resolveYamlBinary(source) {
	const input = source.replace(/\s/g, "");
	if (input.length % 4 !== 0 || !BASE64_PATTERN.test(input)) return NOT_RESOLVED;
	const binary = atob(input);
	const result = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index);
	return result;
}
function representYamlBinary(object) {
	let binary = "";
	for (let index = 0; index < object.length; index++) binary += String.fromCharCode(object[index]);
	return btoa(binary);
}
/**
* The `!!binary` tag, represented as a `Uint8Array`.
*
* @category Tags
*/
var binaryTag = defineScalarTag("tag:yaml.org,2002:binary", {
	resolve: resolveYamlBinary,
	identify: (object) => Object.prototype.toString.call(object) === "[object Uint8Array]",
	represent: representYamlBinary
});
var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function makeUtcDate(year, month, day, hour = 0, minute = 0, second = 0, fraction = 0) {
	const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
	date.setUTCFullYear(year, month, day);
	return date;
}
function resolveYamlTimestamp(source) {
	let match = YAML_DATE_REGEXP.exec(source);
	if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(source);
	if (match === null) return NOT_RESOLVED;
	const year = +match[1];
	const month = +match[2] - 1;
	const day = +match[3];
	if (!match[4]) {
		const date = makeUtcDate(year, month, day);
		if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return NOT_RESOLVED;
		return date;
	}
	const hour = +match[4];
	const minute = +match[5];
	const second = +match[6];
	let fraction = 0;
	if (hour > 23 || minute > 59 || second > 59) return NOT_RESOLVED;
	if (match[7]) {
		let value = match[7].slice(0, 3);
		while (value.length < 3) value += "0";
		fraction = +value;
	}
	const date = makeUtcDate(year, month, day, hour, minute, second, fraction);
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return NOT_RESOLVED;
	if (match[9]) {
		const offsetHour = +match[10];
		const offsetMinute = +(match[11] || 0);
		if (offsetHour > 23 || offsetMinute > 59) return NOT_RESOLVED;
		const offset = (offsetHour * 60 + offsetMinute) * 6e4;
		date.setTime(date.getTime() - (match[9] === "-" ? -offset : offset));
	}
	return date;
}
/**
* The YAML 1.1 `!!timestamp` tag, represented as a JavaScript `Date`.
*
* @category Tags
*/
var timestampTag = defineScalarTag("tag:yaml.org,2002:timestamp", {
	implicit: true,
	implicitFirstChars: [..."0123456789"],
	resolve: resolveYamlTimestamp,
	identify: (object) => object instanceof Date,
	represent: (object) => object.toISOString()
});
/** @category Tags */
var seqTag = defineSequenceTag("tag:yaml.org,2002:seq", {
	create: () => [],
	addItem: (container, item) => {
		container.push(item);
	},
	identify: Array.isArray
});
function isPlainObject(data) {
	if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
	const prototype = Object.getPrototypeOf(data);
	return prototype === null || prototype === Object.prototype;
}
function pick(object, keys) {
	const result = {};
	for (const key of keys) if (object[key] !== void 0) result[key] = object[key];
	return result;
}
/**
* Provided only for YAML 1.1 compatibility and supported by the loader only.
* JavaScript has no dedicated class to represent this type, so it cannot be
* identified and dumped.
*
* ```yaml
* !!omap
*   - one: 1
*   - two: 2
* ```
*
* is loaded as
*
* ```javascript
* [
*   { one: 1 },
*   { two: 2 }
* ]
* ```
*
* @category Tags
*/
var omapTag = defineSequenceTag("tag:yaml.org,2002:omap", {
	create: () => ({
		list: [],
		seen: /* @__PURE__ */ new Set()
	}),
	addItem: (carrier, item) => {
		let key;
		if (item instanceof Map) {
			if (item.size !== 1) return "cannot resolve an ordered map item";
			key = item.keys().next().value;
		} else if (isPlainObject(item)) {
			const itemKeys = Object.keys(item);
			if (itemKeys.length !== 1) return "cannot resolve an ordered map item";
			key = itemKeys[0];
		} else return "cannot resolve an ordered map item";
		if (carrier.seen.has(key)) return "duplicate key in ordered map";
		carrier.seen.add(key);
		carrier.list.push(item);
		return "";
	},
	finalize: (carrier) => carrier.list,
	identify: () => false
});
/**
* Provided only for YAML 1.1 compatibility and supported by the loader only.
* JavaScript has no dedicated class to represent this type, so it cannot be
* identified and dumped.
*
* ```yaml
* !!pairs
*   - one: 1
*   - two: 2
* ```
*
* is loaded as
*
* ```javascript
* [
*   ['one', 1],
*   ['two', 2]
* ]
* ```
*
* @category Tags
*/
var pairsTag = defineSequenceTag("tag:yaml.org,2002:pairs", {
	create: () => [],
	addItem: (container, item) => {
		if (item instanceof Map) {
			if (item.size !== 1) return "cannot resolve a pairs item";
			container.push(item.entries().next().value);
			return "";
		}
		if (Object.prototype.toString.call(item) !== "[object Object]") return "cannot resolve a pairs item";
		const object = item;
		const keys = Object.keys(object);
		if (keys.length !== 1) return "cannot resolve a pairs item";
		container.push([keys[0], object[keys[0]]]);
		return "";
	},
	identify: () => false
});
/**
* This is the default mapping implementation. It uses `{}` objects and has only
* partial functionality due to language limitations. This choice was made
* because users expect to get JavaScript objects, and it was left unchanged to
* avoid too many breaking changes in the v5 release.
*
* Side effects:
*
* - `Object.hasOwn()` checks or `for...of` loops are required for safe use (to
*   avoid falling through to prototypes).
* - Only scalar string keys are supported properly.
* - Other scalar keys, such as `null` and numbers, are converted to strings.
*   This is historical behaviour, and it can cause side effects such as
*   problems with `!!merge`.
*
* Note that non-string scalar keys may be deprecated in future versions.
*
* Ideally, use {@link realMapTag} instead.
*
* @category Tags
*/
var mapTag = defineMappingTag("tag:yaml.org,2002:map", {
	create: () => ({}),
	identify: isPlainObject,
	represent: (o) => {
		const map = /* @__PURE__ */ new Map();
		for (const key of Object.keys(o)) map.set(key, o[key]);
		return map;
	},
	addPair: (container, key, value) => {
		if (key !== null && typeof key === "object") return "object-based map does not support complex keys";
		const normalizedKey = String(key);
		if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
			value,
			enumerable: true,
			configurable: true,
			writable: true
		});
		else container[normalizedKey] = value;
		return "";
	},
	has: (container, key) => {
		if (key !== null && typeof key === "object") return false;
		return Object.prototype.hasOwnProperty.call(container, String(key));
	},
	keys: (container) => Object.keys(container),
	get: (container, key) => {
		const normalizedKey = String(key);
		if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
		return container[normalizedKey];
	}
});
/**
* The YAML 1.1 `!!set` tag, represented as a JavaScript `Set`.
*
* @category Tags
*/
var setTag = defineMappingTag("tag:yaml.org,2002:set", {
	create: () => /* @__PURE__ */ new Set(),
	identify: (data) => data instanceof Set,
	represent: (data) => {
		const map = /* @__PURE__ */ new Map();
		for (const key of data) map.set(key, null);
		return map;
	},
	addPair: (container, key, value) => {
		if (value !== null) return "cannot resolve a set item";
		container.add(key);
		return "";
	},
	has: (container, key) => container.has(key),
	keys: (container) => container.keys(),
	get: () => null
});
function createTagDefinitionMap() {
	return {
		scalar: Object.create(null),
		sequence: Object.create(null),
		mapping: Object.create(null)
	};
}
function createTagDefinitionListMap() {
	return {
		scalar: [],
		sequence: [],
		mapping: []
	};
}
function compileTags(tags) {
	const result = [];
	for (const tag of tags) {
		let index = result.length;
		for (let previousIndex = 0; previousIndex < result.length; previousIndex++) {
			const previous = result[previousIndex];
			if (previous.nodeKind === tag.nodeKind && previous.tagName === tag.tagName && previous.matchByTagPrefix === tag.matchByTagPrefix) {
				index = previousIndex;
				break;
			}
		}
		result[index] = tag;
	}
	return result;
}
/**
* Controls tag resolution when loading and type selection when dumping.
*
* @category Schemas
*/
var Schema = class Schema {
	tags;
	/** @internal */
	implicitScalarTags;
	/**
	* Dispatch implicit scalar resolvers by `source.charAt(0)`. Each bucket holds
	* the resolvers that may match that key, in schema order; a key absent from
	* the map uses
	* {@link Schema.implicitScalarAnyFirstChar}
	* (resolvers that declared no first-char constraint, so they apply to any
	* first character).
	*/
	implicitScalarByFirstChar;
	implicitScalarAnyFirstChar;
	/**
	* The default scalar tag (`!!str`), resolved once so the composer's fallback
	* for unresolved plain scalars avoids a keyed lookup per scalar.
	*
	* @internal
	*/
	defaultScalarTag;
	/**
	* The default container tags (`!!seq` / `!!map`), used by the dumper: when a
	* value is identified by its default tag, the tag is implicit and not
	* printed. Undefined if the schema does not define them (then such values
	* can't be dumped).
	*
	* @internal
	*/
	defaultSequenceTag;
	/** @internal */
	defaultMappingTag;
	exact;
	prefix;
	constructor(tags) {
		const compiledTags = compileTags(tags);
		const implicitScalarTags = [];
		const exact = createTagDefinitionMap();
		const prefix = createTagDefinitionListMap();
		for (const tag of compiledTags) {
			if (tag.nodeKind === "scalar" && tag.implicit) {
				if (tag.matchByTagPrefix) throw new Error("Implicit scalar tags cannot match by tag prefix");
				implicitScalarTags.push(tag);
			}
			switch (tag.nodeKind) {
				case "scalar":
					if (tag.matchByTagPrefix) prefix.scalar.push(tag);
					else exact.scalar[tag.tagName] = tag;
					break;
				case "sequence":
					if (tag.matchByTagPrefix) prefix.sequence.push(tag);
					else exact.sequence[tag.tagName] = tag;
					break;
				case "mapping": if (tag.matchByTagPrefix) prefix.mapping.push(tag);
				else exact.mapping[tag.tagName] = tag;
			}
		}
		const implicitScalarAnyFirstChar = implicitScalarTags.filter((tag) => tag.implicitFirstChars === null);
		const keys = /* @__PURE__ */ new Set();
		for (const tag of implicitScalarTags) if (tag.implicitFirstChars !== null) for (const key of tag.implicitFirstChars) keys.add(key);
		const implicitScalarByFirstChar = /* @__PURE__ */ new Map();
		for (const key of keys) implicitScalarByFirstChar.set(key, implicitScalarTags.filter((tag) => tag.implicitFirstChars === null || tag.implicitFirstChars.indexOf(key) !== -1));
		const defaultScalarTag = exact.scalar["tag:yaml.org,2002:str"];
		if (!defaultScalarTag) throw new Error("schema does not define the default scalar tag (tag:yaml.org,2002:str)");
		this.tags = compiledTags;
		this.implicitScalarTags = implicitScalarTags;
		this.implicitScalarByFirstChar = implicitScalarByFirstChar;
		this.implicitScalarAnyFirstChar = implicitScalarAnyFirstChar;
		this.defaultScalarTag = defaultScalarTag;
		this.defaultSequenceTag = exact.sequence["tag:yaml.org,2002:seq"];
		this.defaultMappingTag = exact.mapping["tag:yaml.org,2002:map"];
		this.exact = exact;
		this.prefix = prefix;
	}
	/** @internal */
	lookupScalarTag(tagName) {
		const exactTag = this.exact.scalar[tagName];
		if (exactTag) return exactTag;
		for (const tag of this.prefix.scalar) if (tagName.startsWith(tag.tagName)) return tag;
	}
	/** @internal */
	lookupSequenceTag(tagName) {
		const exactTag = this.exact.sequence[tagName];
		if (exactTag) return exactTag;
		for (const tag of this.prefix.sequence) if (tagName.startsWith(tag.tagName)) return tag;
	}
	/** @internal */
	lookupMappingTag(tagName) {
		const exactTag = this.exact.mapping[tagName];
		if (exactTag) return exactTag;
		for (const tag of this.prefix.mapping) if (tagName.startsWith(tag.tagName)) return tag;
	}
	/** @internal */
	resolveImplicitScalarTag(source) {
		const candidates = this.implicitScalarByFirstChar.get(source.charAt(0)) ?? this.implicitScalarAnyFirstChar;
		for (const tag of candidates) {
			const value = tag.resolve(source, false, tag.tagName);
			if (value !== NOT_RESOLVED) return {
				value,
				tag
			};
		}
		const tag = this.defaultScalarTag;
		return {
			value: tag.resolve(source, false, tag.tagName),
			tag
		};
	}
	/**
	* Creates a new schema with the specified tags added. If a tag already
	* exists, it is replaced by the specified tag.
	*
	* @example
	*
	* ```javascript
	* import { CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
	*
	* const schema = CORE_SCHEMA.withTags(mergeTag, realMapTag)
	* ```
	*/
	withTags(...tags) {
		let flatTags = [];
		for (const tag of tags) flatTags = flatTags.concat(tag);
		return new Schema([...this.tags, ...flatTags]);
	}
};
/**
* The YAML 1.2 Failsafe Schema: strings, sequences, and mappings.
*
* @category Schemas
*/
var FAILSAFE_SCHEMA = new Schema([
	strTag,
	seqTag,
	mapTag
]);
new Schema([
	...FAILSAFE_SCHEMA.tags,
	nullJsonTag,
	boolJsonTag,
	intJsonTag,
	floatJsonTag
]);
/**
* The default schema for the loaders. Note, {@link CORE_SCHEMA} comes
* without the `!!merge` tag. You can easily enable it if needed.
*
* @example
* Enable {@link mergeTag}:
*
* ```javascript
* import { load, CORE_SCHEMA, mergeTag } from 'js-yaml'
*
* try {
*   load(data, { schema: CORE_SCHEMA.withTags(mergeTag) })
* } catch (e) {
*   console.error(e)
* }
* ```
*
* @category Schemas
*/
var CORE_SCHEMA = new Schema([
	...FAILSAFE_SCHEMA.tags,
	nullCoreTag,
	boolCoreTag,
	intCoreTag,
	floatCoreTag
]);
new Schema([
	...FAILSAFE_SCHEMA.tags,
	nullYaml11Tag,
	boolYaml11Tag,
	intYaml11Tag,
	floatYaml11Tag,
	timestampTag,
	mergeTag,
	binaryTag,
	omapTag,
	pairsTag,
	setTag
]).withTags({
	...intYaml11Tag,
	resolve: (source, isExplicit, tagName) => {
		const result = intYaml11Tag.resolve(source, isExplicit, tagName);
		return result === NOT_RESOLVED ? intCoreTag.resolve(source, isExplicit, tagName) : result;
	}
}, {
	...floatYaml11Tag,
	resolve: (source, isExplicit, tagName) => {
		const result = floatYaml11Tag.resolve(source, isExplicit, tagName);
		return result === NOT_RESOLVED ? floatCoreTag.resolve(source, isExplicit, tagName) : result;
	}
});
defineMappingTag("tag:yaml.org,2002:map", {
	create: () => /* @__PURE__ */ new Map(),
	addPair: (container, key, value) => {
		container.set(key, value);
		return "";
	},
	has: (container, key) => container.has(key),
	keys: (container) => container.keys(),
	get: (container, key) => container.get(key),
	identify: (data) => data instanceof Map || isPlainObject(data),
	represent: (data) => {
		if (data instanceof Map) return data;
		const map = /* @__PURE__ */ new Map();
		const obj = data;
		for (const key of Object.keys(obj)) map.set(key, obj[key]);
		return map;
	}
});
function normalizeKey(key) {
	if (Array.isArray(key)) {
		const array = Array.prototype.slice.call(key);
		for (let index = 0; index < array.length; index++) {
			if (Array.isArray(array[index])) return null;
			if (typeof array[index] === "object" && Object.prototype.toString.call(array[index]) === "[object Object]") array[index] = "[object Object]";
		}
		return String(array);
	}
	if (typeof key === "object" && Object.prototype.toString.call(key) === "[object Object]") return "[object Object]";
	return String(key);
}
defineMappingTag("tag:yaml.org,2002:map", {
	create: () => ({}),
	identify: isPlainObject,
	represent: (o) => {
		const map = /* @__PURE__ */ new Map();
		for (const key of Object.keys(o)) map.set(key, o[key]);
		return map;
	},
	addPair: (container, key, value) => {
		const normalizedKey = normalizeKey(key);
		if (normalizedKey === null) return "nested arrays are not supported inside keys";
		if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
			value,
			enumerable: true,
			configurable: true,
			writable: true
		});
		else container[normalizedKey] = value;
		return "";
	},
	has: (container, key) => {
		const normalizedKey = normalizeKey(key);
		return normalizedKey !== null && Object.prototype.hasOwnProperty.call(container, normalizedKey);
	},
	keys: (container) => Object.keys(container),
	get: (container, key) => {
		const normalizedKey = String(key);
		if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
		return container[normalizedKey];
	}
});
var DEFAULT_SNIPPET_OPTIONS = {
	maxLength: 79,
	indent: 1,
	linesBefore: 3,
	linesAfter: 2
};
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
	let head = "";
	let tail = "";
	const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
	if (position - lineStart > maxHalfLength) {
		head = " ... ";
		lineStart = position - maxHalfLength + head.length;
	}
	if (lineEnd - position > maxHalfLength) {
		tail = " ...";
		lineEnd = position + maxHalfLength - tail.length;
	}
	return {
		str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
		pos: position - lineStart + head.length
	};
}
function padStart(string, max) {
	return " ".repeat(Math.max(max - string.length, 0)) + string;
}
function makeSnippet(mark, options) {
	if (!mark.buffer) return null;
	const opts = {
		...DEFAULT_SNIPPET_OPTIONS,
		...options
	};
	const re = /\r?\n|\r|\0/g;
	const lineStarts = [0];
	const lineEnds = [];
	let match;
	let foundLineNo = -1;
	while (match = re.exec(mark.buffer)) {
		lineEnds.push(match.index);
		lineStarts.push(match.index + match[0].length);
		if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
	}
	if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
	let result = "";
	const lineNoLength = Math.min(mark.line + opts.linesAfter, lineEnds.length).toString().length;
	const maxLineLength = opts.maxLength - (opts.indent + lineNoLength + 3);
	for (let i = 1; i <= opts.linesBefore; i++) {
		if (foundLineNo - i < 0) break;
		const line = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
		result = `${" ".repeat(opts.indent)}${padStart((mark.line - i + 1).toString(), lineNoLength)} | ${line.str}\n${result}`;
	}
	const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
	result += `${" ".repeat(opts.indent)}${padStart((mark.line + 1).toString(), lineNoLength)} | ${line.str}\n`;
	result += `${"-".repeat(opts.indent + lineNoLength + 3 + line.pos)}^\n`;
	for (let i = 1; i <= opts.linesAfter; i++) {
		if (foundLineNo + i >= lineEnds.length) break;
		const line = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
		result += `${" ".repeat(opts.indent)}${padStart((mark.line + i + 1).toString(), lineNoLength)} | ${line.str}\n`;
	}
	return result.replace(/\n$/, "");
}
function formatError(exception, compact) {
	let where = "";
	if (!exception.mark) return exception.reason;
	if (exception.mark.name) where += `in "${exception.mark.name}" `;
	where += `(${exception.mark.line + 1}:${exception.mark.column + 1})`;
	if (!compact && exception.mark.snippet) where += `\n\n${exception.mark.snippet}`;
	return `${exception.reason} ${where}`;
}
/**
* A YAML error. Unlike an ordinary `Error`, it adds a source snippet showing
* the location of the problem to the error message, when available.
*
* @category Main
*/
var YAMLException = class YAMLException extends Error {
	reason;
	mark;
	/**
	* Optional `mark` contains source snippet data. Usually, use
	* {@link YAMLException.throwAt} instead of passing it directly.
	*/
	constructor(reason, mark) {
		super();
		this.name = "YAMLException";
		this.reason = reason;
		this.mark = mark;
		this.message = formatError(this, false);
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
	}
	/**
	* Returns the formatted error, omitting the source snippet in compact mode.
	*/
	toString(compact) {
		return `${this.name}: ${formatError(this, compact)}`;
	}
	/**
	* Builds a YAMLException with a source snippet and throws it. `source` is
	* the raw input text; `position` is an offset into it.
	*/
	static throwAt(source, position, message, filename = "") {
		let line = 0;
		let lineStart = 0;
		for (let index = 0; index < position; index++) {
			const ch = source.charCodeAt(index);
			if (ch === 10) {
				line++;
				lineStart = index + 1;
			} else if (ch === 13) {
				line++;
				if (source.charCodeAt(index + 1) === 10) index++;
				lineStart = index + 1;
			}
		}
		const mark = {
			name: filename,
			buffer: source,
			position,
			line,
			column: position - lineStart
		};
		mark.snippet = makeSnippet(mark);
		throw new YAMLException(message, mark);
	}
};
/** @category Events */
var EVENT_ID = {
	DOCUMENT: 1,
	SEQUENCE: 2,
	MAPPING: 3,
	SCALAR: 4,
	ALIAS: 5,
	POP: 6
};
/** @category Nodes */
var SCALAR_STYLE = {
	PLAIN: 1,
	SINGLE_QUOTED: 2,
	DOUBLE_QUOTED: 3,
	LITERAL_BLOCK: 4,
	FOLDED_BLOCK: 5
};
/** @category Nodes */
var COLLECTION_STYLE = {
	BLOCK: 1,
	FLOW: 2
};
/** @category Nodes */
var CHOMPING_MODE = {
	CLIP: 1,
	STRIP: 2,
	KEEP: 3
};
var NO_RANGE$3 = -1;
function simpleEscapeSequence(c) {
	switch (c) {
		case 48: return "\0";
		case 97: return "\x07";
		case 98: return "\b";
		case 116: return "	";
		case 9: return "	";
		case 110: return "\n";
		case 118: return "\v";
		case 102: return "\f";
		case 114: return "\r";
		case 101: return "\x1B";
		case 32: return " ";
		case 34: return "\"";
		case 47: return "/";
		case 92: return "\\";
		case 78: return "";
		case 95: return "\xA0";
		case 76: return "\u2028";
		case 80: return "\u2029";
		default: return "";
	}
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (let i = 0; i < 256; i++) {
	simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
	simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function charFromCodepoint(c) {
	if (c <= 65535) return String.fromCharCode(c);
	return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
function fromHexCode$1(c) {
	if (c >= 48 && c <= 57) return c - 48;
	return (c | 32) - 97 + 10;
}
function escapedHexLen$1(c) {
	if (c === 120) return 2;
	if (c === 117) return 4;
	return 8;
}
function skipFoldedBreaks(input, position, end) {
	let breaks = 0;
	while (position < end) {
		const ch = input.charCodeAt(position);
		if (ch === 10) {
			breaks++;
			position++;
		} else if (ch === 13) {
			breaks++;
			position++;
			if (input.charCodeAt(position) === 10) position++;
		} else if (ch === 32 || ch === 9) position++;
		else break;
	}
	return {
		position,
		breaks
	};
}
function foldedBreaks(count) {
	if (count === 1) return " ";
	return "\n".repeat(count - 1);
}
function getPlainValue(input, start, end) {
	let result = "";
	let position = start;
	let captureStart = start;
	let captureEnd = start;
	while (position < end) {
		const ch = input.charCodeAt(position);
		if (ch === 10 || ch === 13) {
			result += input.slice(captureStart, captureEnd);
			const fold = skipFoldedBreaks(input, position, end);
			result += foldedBreaks(fold.breaks);
			position = captureStart = captureEnd = fold.position;
		} else {
			position++;
			if (ch !== 32 && ch !== 9) captureEnd = position;
		}
	}
	return result + input.slice(captureStart, captureEnd);
}
function getSingleQuotedValue(input, start, end) {
	let result = "";
	let position = start;
	let captureStart = start;
	let captureEnd = start;
	while (position < end) {
		const ch = input.charCodeAt(position);
		if (ch === 39) {
			result += input.slice(captureStart, position) + "'";
			position += 2;
			captureStart = captureEnd = position;
		} else if (ch === 10 || ch === 13) {
			result += input.slice(captureStart, captureEnd);
			const fold = skipFoldedBreaks(input, position, end);
			result += foldedBreaks(fold.breaks);
			position = captureStart = captureEnd = fold.position;
		} else {
			position++;
			if (ch !== 32 && ch !== 9) captureEnd = position;
		}
	}
	return result + input.slice(captureStart, end);
}
function getDoubleQuotedValue(input, start, end) {
	let result = "";
	let position = start;
	let captureStart = start;
	let captureEnd = start;
	while (position < end) {
		const ch = input.charCodeAt(position);
		if (ch === 92) {
			result += input.slice(captureStart, position);
			position++;
			const escaped = input.charCodeAt(position);
			if (escaped === 10 || escaped === 13) position = skipFoldedBreaks(input, position, end).position;
			else if (escaped < 256 && simpleEscapeCheck[escaped]) {
				result += simpleEscapeMap[escaped];
				position++;
			} else {
				let hexLength = escapedHexLen$1(escaped);
				let hexResult = 0;
				for (; hexLength > 0; hexLength--) {
					position++;
					const digit = fromHexCode$1(input.charCodeAt(position));
					hexResult = (hexResult << 4) + digit;
				}
				result += charFromCodepoint(hexResult);
				position++;
			}
			captureStart = captureEnd = position;
		} else if (ch === 10 || ch === 13) {
			result += input.slice(captureStart, captureEnd);
			const fold = skipFoldedBreaks(input, position, end);
			result += foldedBreaks(fold.breaks);
			position = captureStart = captureEnd = fold.position;
		} else {
			position++;
			if (ch !== 32 && ch !== 9) captureEnd = position;
		}
	}
	return result + input.slice(captureStart, end);
}
function getBlockValue(input, start, end, indent, chomping, folded) {
	const textIndent = indent < 0 ? 0 : indent;
	const region = input.slice(start, end).replace(/\r\n?/g, "\n");
	const lines = region === "" ? [] : (region.endsWith("\n") ? region.slice(0, -1) : region).split("\n");
	let result = "";
	let didReadContent = false;
	let emptyLines = 0;
	let atMoreIndented = false;
	for (const line of lines) {
		let column = 0;
		while (column < textIndent && line.charCodeAt(column) === 32) column++;
		if (indent < 0 || column >= line.length) {
			emptyLines++;
			continue;
		}
		const content = line.slice(textIndent);
		const first = content.charCodeAt(0);
		if (folded) if (first === 32 || first === 9) {
			atMoreIndented = true;
			result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
		} else if (atMoreIndented) {
			atMoreIndented = false;
			result += "\n".repeat(emptyLines + 1);
		} else if (emptyLines === 0) {
			if (didReadContent) result += " ";
		} else result += "\n".repeat(emptyLines);
		else result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
		result += content;
		didReadContent = true;
		emptyLines = 0;
	}
	if (chomping === CHOMPING_MODE.KEEP) result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
	else if (chomping !== CHOMPING_MODE.STRIP) {
		if (didReadContent) result += "\n";
	}
	return result;
}
/**
* Decodes the scalar referenced by event offsets in `input`.
*
* @category Events
*/
function getScalarValue(input, scalar) {
	if (scalar.valueStart === NO_RANGE$3) return "";
	const { valueStart, valueEnd } = scalar;
	if (scalar.fast) return input.slice(valueStart, valueEnd);
	switch (scalar.style) {
		case SCALAR_STYLE.SINGLE_QUOTED: return getSingleQuotedValue(input, valueStart, valueEnd);
		case SCALAR_STYLE.DOUBLE_QUOTED: return getDoubleQuotedValue(input, valueStart, valueEnd);
		case SCALAR_STYLE.LITERAL_BLOCK: return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, false);
		case SCALAR_STYLE.FOLDED_BLOCK: return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, true);
		default: return getPlainValue(input, valueStart, valueEnd);
	}
}
var DEFAULT_TAG_HANDLERS = Object.assign(Object.create(null), {
	"!": "!",
	"!!": "tag:yaml.org,2002:"
});
function tagNameFull(rawTag, tagHandlers) {
	if (rawTag.startsWith("!<") && rawTag.endsWith(">")) return decodeURIComponent(rawTag.slice(2, -1));
	const handleEnd = rawTag.indexOf("!", 1);
	const handle = handleEnd === -1 ? "!" : rawTag.slice(0, handleEnd + 1);
	const prefix = tagHandlers?.[handle] ?? DEFAULT_TAG_HANDLERS[handle] ?? handle;
	return decodeURIComponent(prefix) + decodeURIComponent(rawTag.slice(handle.length));
}
var NO_RANGE$2 = -1;
var MERGE_TAG_NAME = "tag:yaml.org,2002:merge";
var DEFAULT_CONSTRUCTOR_OPTIONS = {
	filename: "",
	schema: CORE_SCHEMA,
	json: false,
	maxTotalMergeKeys: 1e4,
	maxAliases: -1
};
function eventPosition$1(event) {
	if ("tagStart" in event && event.tagStart !== NO_RANGE$2) return event.tagStart;
	if ("anchorStart" in event && event.anchorStart !== NO_RANGE$2) return event.anchorStart;
	if ("valueStart" in event && event.valueStart !== NO_RANGE$2) return event.valueStart;
	if ("start" in event) return event.start;
	return 0;
}
function throwError$1(state, message) {
	YAMLException.throwAt(state.source, state.position, message, state.filename);
}
function finalizeCollection(state, position, tag, carrier) {
	try {
		return tag.finalize(carrier);
	} catch (error) {
		if (error instanceof YAMLException) throw error;
		YAMLException.throwAt(state.source, position, error instanceof Error ? error.message : String(error), state.filename);
	}
}
function constructScalar(state, event) {
	const source = getScalarValue(state.source, event);
	const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
	const strTag = state.schema.defaultScalarTag;
	if (rawTag !== "") {
		if (rawTag === "!") return {
			value: source,
			tag: strTag
		};
		const tagName = tagNameFull(rawTag, state.tagHandlers);
		const scalarTag = state.schema.lookupScalarTag(tagName);
		if (scalarTag) {
			const result = scalarTag.resolve(source, true, tagName);
			if (result === NOT_RESOLVED) throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
			return {
				value: result,
				tag: scalarTag
			};
		}
		const collectionTagDef = state.schema.lookupMappingTag(tagName) ?? state.schema.lookupSequenceTag(tagName);
		if (collectionTagDef) {
			if (source !== "") throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
			const carrier = collectionTagDef.create(tagName);
			return {
				value: collectionTagDef.carrierIsResult ? carrier : finalizeCollection(state, state.position, collectionTagDef, carrier),
				tag: collectionTagDef
			};
		}
		throwError$1(state, `unknown scalar tag !<${tagName}>`);
	}
	if (event.style === SCALAR_STYLE.PLAIN) return state.schema.resolveImplicitScalarTag(source);
	return {
		value: strTag.resolve(source, false, strTag.tagName),
		tag: strTag
	};
}
function collectionTagName(state, event, defaultTagName) {
	const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
	return rawTag === "" || rawTag === "!" ? defaultTagName : tagNameFull(rawTag, state.tagHandlers);
}
function isMappingTag(tag) {
	return tag.nodeKind === "mapping";
}
function chargeMergeWork(state) {
	state.totalMergeKeys++;
	if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) throwError$1(state, `merge keys exceeded maxTotalMergeKeys (${state.maxTotalMergeKeys})`);
}
function mergeKeys(state, frame, source, sourceTag) {
	chargeMergeWork(state);
	for (const sourceKey of sourceTag.keys(source)) {
		chargeMergeWork(state);
		if (frame.tag.has(frame.value, sourceKey)) continue;
		const err = frame.tag.addPair(frame.value, sourceKey, sourceTag.get(source, sourceKey));
		if (err) throwError$1(state, err);
		frame.overridable ??= /* @__PURE__ */ new Set();
		frame.overridable.add(sourceKey);
	}
}
function mergeSource(state, frame, source, sourceTag) {
	state.position = frame.keyPosition;
	if (isMappingTag(sourceTag)) mergeKeys(state, frame, source, sourceTag);
	else if (sourceTag.nodeKind === "sequence" && Array.isArray(source)) {
		if (source.length > 100) throwError$1(state, "abnormal merge sequence size");
		for (const element of source) {
			const elementTag = state.nodeTags.get(element);
			if (!elementTag) throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
			mergeKeys(state, frame, element, elementTag);
		}
	} else throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
}
function addMappingValue(state, frame, key, value, tag) {
	state.position = frame.keyPosition;
	if (frame.keyIsMerge) {
		mergeSource(state, frame, value, tag);
		return;
	}
	if (!state.json && frame.tag.has(frame.value, key) && !frame.overridable?.has(key)) throwError$1(state, "duplicated mapping key");
	const err = frame.tag.addPair(frame.value, key, value);
	if (err) throwError$1(state, err);
	frame.overridable?.delete(key);
}
function addValue(state, value, tag) {
	const frame = state.frames[state.frames.length - 1];
	if (frame.kind === "document") {
		frame.value = value;
		frame.hasValue = true;
	} else if (frame.kind === "sequence") {
		if (isMappingTag(tag)) state.nodeTags.set(value, tag);
		const err = frame.tag.addItem(frame.value, value, frame.index++);
		if (err) throwError$1(state, err);
	} else if (frame.hasKey) {
		const key = frame.key;
		frame.key = void 0;
		frame.hasKey = false;
		addMappingValue(state, frame, key, value, tag);
	} else {
		frame.key = value;
		frame.keyPosition = state.position;
		frame.hasKey = true;
		frame.keyIsMerge = tag.tagName === MERGE_TAG_NAME;
	}
}
function storeAnchor(state, event, value, tag, isValueFinal) {
	if (event.anchorStart !== NO_RANGE$2) {
		const anchor = {
			value,
			tag,
			isValueFinal
		};
		state.anchors.set(state.source.slice(event.anchorStart, event.anchorEnd), anchor);
		return anchor;
	}
	return null;
}
/**
* Constructs JavaScript documents directly from parser events, without an
* intermediate AST.
*
* @category Events
*/
function constructFromEvents(events, options) {
	const state = {
		...DEFAULT_CONSTRUCTOR_OPTIONS,
		...options,
		events,
		documents: [],
		eventIndex: 0,
		position: 0,
		frames: [],
		anchors: /* @__PURE__ */ new Map(),
		nodeTags: /* @__PURE__ */ new Map(),
		tagHandlers: Object.create(null),
		totalMergeKeys: 0,
		aliasCount: 0
	};
	while (state.eventIndex < state.events.length) {
		const event = state.events[state.eventIndex++];
		state.position = eventPosition$1(event);
		switch (event.type) {
			case EVENT_ID.DOCUMENT:
				state.anchors = /* @__PURE__ */ new Map();
				state.nodeTags = /* @__PURE__ */ new Map();
				state.aliasCount = 0;
				state.tagHandlers = Object.create(null);
				for (const directive of event.directives) if (directive.kind === "tag") state.tagHandlers[directive.handle] = directive.prefix;
				state.frames.push({
					kind: "document",
					position: state.position,
					value: void 0,
					hasValue: false
				});
				break;
			case EVENT_ID.SCALAR: {
				const { value, tag } = constructScalar(state, event);
				storeAnchor(state, event, value, tag, true);
				addValue(state, value, tag);
				break;
			}
			case EVENT_ID.SEQUENCE: {
				const tagName = collectionTagName(state, event, "tag:yaml.org,2002:seq");
				const tag = state.schema.lookupSequenceTag(tagName);
				if (!tag) throwError$1(state, `unknown sequence tag !<${tagName}>`);
				const value = tag.create(tagName);
				const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
				state.frames.push({
					kind: "sequence",
					position: state.position,
					value,
					tag,
					anchor,
					index: 0
				});
				break;
			}
			case EVENT_ID.MAPPING: {
				const tagName = collectionTagName(state, event, "tag:yaml.org,2002:map");
				const tag = state.schema.lookupMappingTag(tagName);
				if (!tag) throwError$1(state, `unknown mapping tag !<${tagName}>`);
				const value = tag.create(tagName);
				const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
				state.frames.push({
					kind: "mapping",
					position: state.position,
					value,
					tag,
					anchor,
					key: void 0,
					keyPosition: state.position,
					hasKey: false,
					keyIsMerge: false,
					overridable: null
				});
				break;
			}
			case EVENT_ID.ALIAS: {
				if (state.maxAliases !== -1 && ++state.aliasCount > state.maxAliases) throwError$1(state, `aliases exceeded maxAliases (${state.maxAliases})`);
				const name = state.source.slice(event.anchorStart, event.anchorEnd);
				const anchor = state.anchors.get(name);
				if (!anchor) throwError$1(state, `unidentified alias "${name}"`);
				if (!anchor.isValueFinal) throwError$1(state, `recursive alias "${name}" is not supported for tag ${anchor.tag.tagName} because it uses finalize()`);
				addValue(state, anchor.value, anchor.tag);
				break;
			}
			case EVENT_ID.POP: {
				const frame = state.frames.pop();
				if (frame.kind === "mapping" && frame.hasKey) {
					state.position = frame.keyPosition;
					throwError$1(state, "incomplete mapping pair in event stream");
				}
				if (frame.kind === "document") state.documents.push(frame.value);
				else {
					const value = frame.tag.carrierIsResult ? frame.value : finalizeCollection(state, frame.position, frame.tag, frame.value);
					if (frame.anchor) {
						frame.anchor.value = value;
						frame.anchor.isValueFinal = true;
					}
					addValue(state, value, frame.tag);
				}
				break;
			}
		}
	}
	return state.documents;
}
var NO_RANGE$1 = -1;
var HAS_OWN = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
var NS_URI_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$,_.!~*'()\[\]])`;
var NS_TAG_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$.~*'()_])`;
var PATTERN_TAG_URI = new RegExp(`^(?:${NS_URI_CHAR})*$`);
var PATTERN_TAG_SUFFIX = new RegExp(`^(?:${NS_TAG_CHAR})+$`);
var PATTERN_TAG_PREFIX = new RegExp(`^(?:!(?:${NS_URI_CHAR})*|${NS_TAG_CHAR}(?:${NS_URI_CHAR})*)$`);
var DEFAULT_PARSER_OPTIONS = {
	filename: "",
	maxDepth: 100
};
function addDocumentEvent(state, explicitStart, explicitEnd) {
	state.events.push({
		type: EVENT_ID.DOCUMENT,
		explicitStart,
		explicitEnd,
		directives: state.directives
	});
}
function addSequenceEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
	state.events.push({
		type: EVENT_ID.SEQUENCE,
		start,
		anchorStart,
		anchorEnd,
		tagStart,
		tagEnd,
		style
	});
}
function addMappingEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
	state.events.push({
		type: EVENT_ID.MAPPING,
		start,
		anchorStart,
		anchorEnd,
		tagStart,
		tagEnd,
		style
	});
}
function insertFlowPairMappingEvent(state, snapshot) {
	state.events.splice(snapshot.eventsLength, 0, {
		type: EVENT_ID.MAPPING,
		start: snapshot.position,
		anchorStart: NO_RANGE$1,
		anchorEnd: NO_RANGE$1,
		tagStart: NO_RANGE$1,
		tagEnd: NO_RANGE$1,
		style: COLLECTION_STYLE.FLOW
	});
}
function addScalarEvent(state, valueStart, valueEnd, anchorStart, anchorEnd, tagStart, tagEnd, style, chomping = CHOMPING_MODE.CLIP, indent = -1, fast = false) {
	state.events.push({
		type: EVENT_ID.SCALAR,
		valueStart,
		valueEnd,
		anchorStart,
		anchorEnd,
		tagStart,
		tagEnd,
		style,
		chomping,
		indent,
		fast
	});
}
function addAliasEvent(state, anchorStart, anchorEnd) {
	state.events.push({
		type: EVENT_ID.ALIAS,
		anchorStart,
		anchorEnd
	});
}
function addPopEvent(state) {
	state.events.push({ type: EVENT_ID.POP });
}
function addEmptyScalarEvent(state) {
	addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, SCALAR_STYLE.PLAIN);
}
function emptyProperties() {
	return {
		anchorStart: NO_RANGE$1,
		anchorEnd: NO_RANGE$1,
		tagStart: NO_RANGE$1,
		tagEnd: NO_RANGE$1
	};
}
function snapshotState(state) {
	return {
		position: state.position,
		line: state.line,
		lineStart: state.lineStart,
		lineIndent: state.lineIndent,
		firstTabInLine: state.firstTabInLine,
		eventsLength: state.events.length
	};
}
function restoreState(state, snapshot) {
	state.position = snapshot.position;
	state.line = snapshot.line;
	state.lineStart = snapshot.lineStart;
	state.lineIndent = snapshot.lineIndent;
	state.firstTabInLine = snapshot.firstTabInLine;
	state.events.length = snapshot.eventsLength;
}
function throwError(state, message) {
	YAMLException.throwAt(state.input.slice(0, state.length), state.position, message, state.filename);
}
function isEol(c) {
	return c === 10 || c === 13;
}
function isWhiteSpace(c) {
	return c === 9 || c === 32;
}
function isWsOrEol(c) {
	return isWhiteSpace(c) || isEol(c);
}
function isWsOrEolOrEnd(c) {
	return c === 0 || isWsOrEol(c);
}
function isFlowIndicator(c) {
	return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromDecimalCode(c) {
	return c >= 48 && c <= 57 ? c - 48 : -1;
}
function fromHexCode(c) {
	if (c >= 48 && c <= 57) return c - 48;
	const lc = c | 32;
	if (lc >= 97 && lc <= 102) return lc - 97 + 10;
	return -1;
}
function escapedHexLen(c) {
	if (c === 120) return 2;
	if (c === 117) return 4;
	if (c === 85) return 8;
	return 0;
}
function isSimpleEscape(c) {
	return c === 48 || c === 97 || c === 98 || c === 116 || c === 9 || c === 110 || c === 118 || c === 102 || c === 114 || c === 101 || c === 32 || c === 34 || c === 47 || c === 92 || c === 78 || c === 95 || c === 76 || c === 80;
}
function consumeLineBreak(state) {
	if (state.input.charCodeAt(state.position) === 10) state.position++;
	else {
		state.position++;
		if (state.input.charCodeAt(state.position) === 10) state.position++;
	}
	state.line++;
	state.lineStart = state.position;
	state.lineIndent = 0;
	state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments) {
	let lineBreaks = 0;
	let ch = state.input.charCodeAt(state.position);
	let hasSeparation = state.position === state.lineStart || isWsOrEol(state.input.charCodeAt(state.position - 1));
	while (ch !== 0) {
		while (isWhiteSpace(ch)) {
			hasSeparation = true;
			if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
			ch = state.input.charCodeAt(++state.position);
		}
		if (allowComments && hasSeparation && ch === 35) do
			ch = state.input.charCodeAt(++state.position);
		while (!isEol(ch) && ch !== 0);
		if (!isEol(ch)) break;
		consumeLineBreak(state);
		lineBreaks++;
		hasSeparation = true;
		ch = state.input.charCodeAt(state.position);
		while (ch === 32) {
			state.lineIndent++;
			ch = state.input.charCodeAt(++state.position);
		}
	}
	return lineBreaks;
}
function testDocumentSeparator(state, position = state.position) {
	const ch = state.input.charCodeAt(position);
	if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(position + 1) && ch === state.input.charCodeAt(position + 2)) {
		const following = state.input.charCodeAt(position + 3);
		return following === 0 || isWsOrEol(following);
	}
	return false;
}
function skipByteOrderMark(state) {
	if (state.position === state.lineStart && state.input.charCodeAt(state.position) === 65279) {
		state.position++;
		state.lineStart = state.position;
	}
}
function testDocumentBoundary(state) {
	if (state.position !== state.lineStart) return false;
	if (testDocumentSeparator(state)) return true;
	if (state.input.charCodeAt(state.position) !== 65279) return false;
	const snapshot = snapshotState(state);
	skipByteOrderMark(state);
	skipSeparationSpace(state, true);
	const ch = state.input.charCodeAt(state.position);
	const result = state.position === state.lineStart && (ch === 37 || ch === 45 && testDocumentSeparator(state));
	restoreState(state, snapshot);
	return result;
}
function skipUntilLineEnd(state) {
	let ch = state.input.charCodeAt(state.position);
	while (ch !== 0 && !isEol(ch)) ch = state.input.charCodeAt(++state.position);
}
function checkPrintable(state, start, end) {
	if (PATTERN_NON_PRINTABLE.test(state.input.slice(start, end))) throwError(state, "the stream contains non-printable characters");
}
function readTagProperty(state, props, inFlow) {
	if (state.input.charCodeAt(state.position) !== 33) return false;
	if (props.tagStart !== NO_RANGE$1) throwError(state, "duplication of a tag property");
	const start = state.position;
	let isVerbatim = false;
	let isNamed = false;
	let tagHandle = "!";
	let ch = state.input.charCodeAt(++state.position);
	if (ch === 60) {
		isVerbatim = true;
		ch = state.input.charCodeAt(++state.position);
	} else if (ch === 33) {
		isNamed = true;
		tagHandle = "!!";
		ch = state.input.charCodeAt(++state.position);
	}
	let suffixStart = state.position;
	let tagName;
	if (isVerbatim) {
		while (ch !== 0 && ch !== 62) ch = state.input.charCodeAt(++state.position);
		if (ch !== 62) throwError(state, "unexpected end of the stream within a verbatim tag");
		tagName = state.input.slice(suffixStart, state.position);
		state.position++;
	} else {
		while (ch !== 0 && !isWsOrEol(ch) && !(inFlow && isFlowIndicator(ch))) {
			if (ch === 33) if (!isNamed) {
				tagHandle = state.input.slice(suffixStart - 1, state.position + 1);
				if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
				isNamed = true;
				suffixStart = state.position + 1;
			} else throwError(state, "tag suffix cannot contain exclamation marks");
			ch = state.input.charCodeAt(++state.position);
		}
		tagName = state.input.slice(suffixStart, state.position);
		if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
	}
	if (tagName && !(isVerbatim ? PATTERN_TAG_URI.test(tagName) : PATTERN_TAG_SUFFIX.test(tagName))) throwError(state, `tag name cannot contain such characters: ${tagName}`);
	if (!isVerbatim && tagHandle !== "!" && tagHandle !== "!!" && !HAS_OWN.call(state.tagHandlers, tagHandle)) throwError(state, `undeclared tag handle "${tagHandle}"`);
	props.tagStart = start;
	props.tagEnd = state.position;
	return true;
}
function readAnchorProperty(state, props) {
	if (state.input.charCodeAt(state.position) !== 38) return false;
	if (props.anchorStart !== NO_RANGE$1) throwError(state, "duplication of an anchor property");
	state.position++;
	const start = state.position;
	while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
	if (state.position === start) throwError(state, "name of an anchor node must contain at least one character");
	props.anchorStart = start;
	props.anchorEnd = state.position;
	return true;
}
function readAlias(state, props) {
	if (state.input.charCodeAt(state.position) !== 42) return false;
	if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) throwError(state, "alias node should not have any properties");
	state.position++;
	const start = state.position;
	while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
	if (state.position === start) throwError(state, "name of an alias node must contain at least one character");
	addAliasEvent(state, start, state.position);
	return true;
}
function readFlowScalarBreak(state, nodeIndent) {
	skipSeparationSpace(state, false);
	if (state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readSingleQuotedScalar(state, nodeIndent, props) {
	if (state.input.charCodeAt(state.position) !== 39) return false;
	state.position++;
	const start = state.position;
	let simple = true;
	while (state.input.charCodeAt(state.position) !== 0) {
		const ch = state.input.charCodeAt(state.position);
		if (ch === 39) {
			if (state.input.charCodeAt(state.position + 1) === 39) {
				simple = false;
				state.position += 2;
				continue;
			}
			const end = state.position;
			state.position++;
			addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.SINGLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
			return true;
		}
		if (isEol(ch)) {
			simple = false;
			readFlowScalarBreak(state, nodeIndent);
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
		else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
		else state.position++;
	}
	throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent, props) {
	if (state.input.charCodeAt(state.position) !== 34) return false;
	state.position++;
	const start = state.position;
	let simple = true;
	while (state.input.charCodeAt(state.position) !== 0) {
		const ch = state.input.charCodeAt(state.position);
		if (ch === 34) {
			const end = state.position;
			state.position++;
			addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.DOUBLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
			return true;
		}
		if (ch === 92) {
			simple = false;
			const escaped = state.input.charCodeAt(++state.position);
			if (isEol(escaped)) readFlowScalarBreak(state, nodeIndent);
			else if (isSimpleEscape(escaped)) state.position++;
			else {
				let hexLength = escapedHexLen(escaped);
				if (hexLength === 0) throwError(state, "unknown escape sequence");
				while (hexLength-- > 0) {
					state.position++;
					if (fromHexCode(state.input.charCodeAt(state.position)) < 0) throwError(state, "expected hexadecimal character");
				}
				state.position++;
			}
		} else if (isEol(ch)) {
			simple = false;
			readFlowScalarBreak(state, nodeIndent);
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
		else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
		else state.position++;
	}
	throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readBlockScalar(state, parentIndent, props) {
	const ch = state.input.charCodeAt(state.position);
	let chomping = CHOMPING_MODE.CLIP;
	let indent = -1;
	let detectedIndent = false;
	if (ch !== 124 && ch !== 62) return false;
	const style = ch === 124 ? SCALAR_STYLE.LITERAL_BLOCK : SCALAR_STYLE.FOLDED_BLOCK;
	state.position++;
	while (state.input.charCodeAt(state.position) !== 0) {
		const current = state.input.charCodeAt(state.position);
		const digit = fromDecimalCode(current);
		if (current === 43 || current === 45) {
			if (chomping !== CHOMPING_MODE.CLIP) throwError(state, "repeat of a chomping mode identifier");
			chomping = current === 43 ? CHOMPING_MODE.KEEP : CHOMPING_MODE.STRIP;
			state.position++;
		} else if (digit >= 0) {
			if (digit === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
			if (detectedIndent) throwError(state, "repeat of an indentation width identifier");
			indent = parentIndent + digit - 1;
			detectedIndent = true;
			state.position++;
		} else break;
	}
	let hadWhitespace = false;
	while (isWhiteSpace(state.input.charCodeAt(state.position))) {
		hadWhitespace = true;
		state.position++;
	}
	if (hadWhitespace && state.input.charCodeAt(state.position) === 35) skipUntilLineEnd(state);
	if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
	else if (state.input.charCodeAt(state.position) !== 0) throwError(state, "a line break is expected");
	let contentIndent = detectedIndent ? indent : -1;
	let maxLeadingIndent = 0;
	const valueStart = state.position;
	let valueEnd = state.position;
	while (state.input.charCodeAt(state.position) !== 0) {
		const linePosition = state.position;
		let column = 0;
		while (state.input.charCodeAt(linePosition + column) === 32) column++;
		const first = state.input.charCodeAt(linePosition + column);
		if (first === 0) {
			if (contentIndent >= 0) {
				if (column > contentIndent) valueEnd = linePosition + column;
			} else if (column > 0) valueEnd = linePosition + column;
			break;
		}
		if (testDocumentBoundary(state)) break;
		if (!detectedIndent && contentIndent === -1 && isEol(first)) maxLeadingIndent = Math.max(maxLeadingIndent, column);
		if (!detectedIndent && contentIndent === -1 && !isEol(first)) {
			if (first === 9 && column < parentIndent) {
				state.position = linePosition + column;
				throwError(state, "tab characters must not be used in indentation");
			}
			if (column < maxLeadingIndent) {
				state.position = linePosition + column;
				throwError(state, "bad indentation of a mapping entry");
			}
		}
		if (contentIndent === -1 && first !== 0 && !isEol(first) && column < parentIndent) {
			state.lineIndent = column;
			state.position = linePosition + column;
			break;
		}
		if (!detectedIndent && first !== 0 && !isEol(first) && contentIndent === -1) contentIndent = column;
		const requiredIndent = contentIndent === -1 ? parentIndent + 1 : contentIndent;
		if (first !== 0 && !isEol(first) && column < requiredIndent) {
			state.lineIndent = column;
			state.position = linePosition + column;
			break;
		}
		skipUntilLineEnd(state);
		valueEnd = state.position;
		if (isEol(state.input.charCodeAt(state.position))) {
			consumeLineBreak(state);
			valueEnd = state.position;
		}
	}
	checkPrintable(state, valueStart, valueEnd);
	addScalarEvent(state, valueStart, valueEnd, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, style, chomping, contentIndent);
	return true;
}
function canStartPlainScalar(state, nodeContext) {
	const ch = state.input.charCodeAt(state.position);
	const inFlow = nodeContext === CONTEXT_FLOW_IN;
	if (ch === 0 || isWsOrEol(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96 || inFlow && isFlowIndicator(ch)) return false;
	if (ch === 63 || ch === 45) {
		const following = state.input.charCodeAt(state.position + 1);
		if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) return false;
	}
	return true;
}
function readPlainScalar(state, nodeIndent, nodeContext, props) {
	if (!canStartPlainScalar(state, nodeContext)) return false;
	const start = state.position;
	let end = state.position;
	let ch = state.input.charCodeAt(state.position);
	const inFlow = nodeContext === CONTEXT_FLOW_IN;
	let multiline = false;
	while (ch !== 0) {
		if (testDocumentBoundary(state)) break;
		if (ch === 58) {
			const following = state.input.charCodeAt(state.position + 1);
			if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) break;
		} else if (ch === 35) {
			if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
		} else if (inFlow && isFlowIndicator(ch)) break;
		else if (isEol(ch)) {
			const savedPosition = state.position;
			const savedLine = state.line;
			const savedLineStart = state.lineStart;
			const savedLineIndent = state.lineIndent;
			skipSeparationSpace(state, false);
			if (state.lineIndent >= nodeIndent) {
				multiline = true;
				ch = state.input.charCodeAt(state.position);
				continue;
			}
			state.position = savedPosition;
			state.line = savedLine;
			state.lineStart = savedLineStart;
			state.lineIndent = savedLineIndent;
			break;
		}
		if (!isWhiteSpace(ch)) end = state.position + 1;
		ch = state.input.charCodeAt(++state.position);
	}
	if (end === start) return false;
	checkPrintable(state, start, end);
	addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN, CHOMPING_MODE.CLIP, -1, !multiline);
	return true;
}
function skipFlowSeparationSpace(state, nodeIndent) {
	const startLine = state.line;
	skipSeparationSpace(state, true);
	if (state.line > startLine && state.lineIndent < nodeIndent || state.firstTabInLine !== -1 && state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readFlowCollection(state, nodeIndent, props) {
	const ch = state.input.charCodeAt(state.position);
	const isMapping = ch === 123;
	const start = state.position;
	let readNext = true;
	if (ch !== 91 && ch !== 123) return false;
	const terminator = isMapping ? 125 : 93;
	if (isMapping) addMappingEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
	else addSequenceEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
	state.position++;
	while (state.input.charCodeAt(state.position) !== 0) {
		skipFlowSeparationSpace(state, nodeIndent);
		let ch = state.input.charCodeAt(state.position);
		if (ch === terminator) {
			state.position++;
			addPopEvent(state);
			return true;
		} else if (!readNext) throwError(state, "missed comma between flow collection entries");
		else if (ch === 44) throwError(state, "expected the node content, but found ','");
		let isPair = false;
		let isExplicitPair = false;
		if (ch === 63 && isWsOrEol(state.input.charCodeAt(state.position + 1))) {
			isPair = isExplicitPair = true;
			state.position += 1;
			skipFlowSeparationSpace(state, nodeIndent);
		}
		const entryLine = state.line;
		const entryStart = snapshotState(state);
		const keyWasRead = parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
		skipFlowSeparationSpace(state, nodeIndent);
		ch = state.input.charCodeAt(state.position);
		if ((isMapping || isExplicitPair || state.line === entryLine) && ch === 58) {
			isPair = true;
			state.position++;
			skipFlowSeparationSpace(state, nodeIndent);
			if (!isMapping) {
				insertFlowPairMappingEvent(state, entryStart);
				if (!keyWasRead) addEmptyScalarEvent(state);
			} else if (!keyWasRead) addEmptyScalarEvent(state);
			if (!parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true)) addEmptyScalarEvent(state);
			skipFlowSeparationSpace(state, nodeIndent);
			if (!isMapping) addPopEvent(state);
		} else if (isMapping && isPair) {
			if (!keyWasRead) addEmptyScalarEvent(state);
			addEmptyScalarEvent(state);
		} else if (isMapping) addEmptyScalarEvent(state);
		else if (isPair) {
			insertFlowPairMappingEvent(state, entryStart);
			if (!keyWasRead) addEmptyScalarEvent(state);
			addEmptyScalarEvent(state);
			addPopEvent(state);
		}
		ch = state.input.charCodeAt(state.position);
		if (ch === 44) {
			readNext = true;
			state.position++;
		} else readNext = false;
	}
	throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockSequence(state, nodeIndent, props) {
	if (state.firstTabInLine !== -1 || state.input.charCodeAt(state.position) !== 45 || !isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) return false;
	addSequenceEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
	while (state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) {
		if (state.firstTabInLine !== -1) {
			state.position = state.firstTabInLine;
			throwError(state, "tab characters must not be used in indentation");
		}
		const entryLine = state.line;
		state.position++;
		const hadBreak = skipSeparationSpace(state, true) > 0;
		if (state.firstTabInLine !== -1 && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
		if (hadBreak && state.lineIndent <= nodeIndent) addEmptyScalarEvent(state);
		else parseNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
		skipSeparationSpace(state, true);
		if (state.lineIndent < nodeIndent || state.position >= state.length) break;
		if (state.lineIndent > nodeIndent) throwError(state, "bad indentation of a sequence entry");
		if (state.line === entryLine && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
	}
	addPopEvent(state);
	return true;
}
function readBlockMapping(state, nodeIndent, flowIndent, props) {
	let atExplicitKey = false;
	let detected = false;
	let mappingOpened = false;
	let pendingExplicitKey = false;
	if (state.firstTabInLine !== -1) return false;
	let ch = state.input.charCodeAt(state.position);
	while (ch !== 0) {
		if (!atExplicitKey && state.firstTabInLine !== -1) {
			state.position = state.firstTabInLine;
			throwError(state, "tab characters must not be used in indentation");
		}
		const following = state.input.charCodeAt(state.position + 1);
		const entryLine = state.line;
		if ((ch === 63 || ch === 58) && isWsOrEolOrEnd(following)) {
			if (!mappingOpened) {
				addMappingEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
				mappingOpened = true;
			}
			if (ch === 63) {
				if (atExplicitKey) addEmptyScalarEvent(state);
				detected = true;
				atExplicitKey = true;
			} else if (atExplicitKey) atExplicitKey = false;
			else {
				addEmptyScalarEvent(state);
				detected = true;
				atExplicitKey = false;
			}
			state.position += 1;
			pendingExplicitKey = true;
		} else {
			if (atExplicitKey) {
				addEmptyScalarEvent(state);
				atExplicitKey = false;
			}
			const beforeKey = snapshotState(state);
			if (!parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
			if (state.line === entryLine) {
				ch = state.input.charCodeAt(state.position);
				while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 58) {
					ch = state.input.charCodeAt(++state.position);
					if (!isWsOrEolOrEnd(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
					if (!mappingOpened) {
						restoreState(state, beforeKey);
						addMappingEvent(state, beforeKey.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
						mappingOpened = true;
						parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true);
						ch = state.input.charCodeAt(state.position);
						while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
						state.position++;
					}
					detected = true;
					atExplicitKey = false;
					pendingExplicitKey = false;
				} else if (detected) throwError(state, "expected ':' after a mapping key");
				else {
					if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
						restoreState(state, beforeKey);
						return false;
					}
					return true;
				}
			} else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
			else {
				if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
					restoreState(state, beforeKey);
					return false;
				}
				return true;
			}
		}
		if (parseNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, pendingExplicitKey)) pendingExplicitKey = false;
		if (!atExplicitKey) {
			if (pendingExplicitKey) {
				addEmptyScalarEvent(state);
				pendingExplicitKey = false;
			}
		}
		skipSeparationSpace(state, true);
		ch = state.input.charCodeAt(state.position);
		if ((state.line === entryLine || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
		else if (state.lineIndent < nodeIndent) break;
	}
	if (!detected) return false;
	if (atExplicitKey) addEmptyScalarEvent(state);
	if (mappingOpened) addPopEvent(state);
	return true;
}
function parseNode(state, parentIndent, nodeContext, allowToSeek, allowCompact, allowPropertyMapping = true) {
	if (state.depth >= state.maxDepth) throwError(state, `nesting exceeded maxDepth (${state.maxDepth})`);
	state.depth++;
	let indentStatus = 1;
	let atNewLine = false;
	let hasContent = false;
	let propertyStart = null;
	const props = emptyProperties();
	let allowBlockScalars = nodeContext === CONTEXT_BLOCK_OUT || nodeContext === CONTEXT_BLOCK_IN;
	let allowBlockCollections = allowBlockScalars;
	const allowBlockStyles = allowBlockScalars;
	if (allowToSeek && skipSeparationSpace(state, true)) {
		atNewLine = true;
		if (state.lineIndent > parentIndent) indentStatus = 1;
		else if (state.lineIndent === parentIndent) indentStatus = 0;
		else indentStatus = -1;
	}
	if (indentStatus === 1) while (true) {
		const ch = state.input.charCodeAt(state.position);
		const propertyState = snapshotState(state);
		if (atNewLine && indentStatus !== 1 && (ch === 33 || ch === 38)) break;
		if (atNewLine && allowBlockStyles && (props.tagStart !== NO_RANGE$1 || props.anchorStart !== NO_RANGE$1) && (ch === 33 || ch === 38)) {
			const fallbackState = snapshotState(state);
			const flowIndent = parentIndent + 1;
			if (readBlockMapping(state, state.position - state.lineStart, flowIndent, props) && state.events[fallbackState.eventsLength]?.type === EVENT_ID.MAPPING) {
				state.depth--;
				return true;
			}
			restoreState(state, fallbackState);
		}
		if (atNewLine && (ch === 33 && props.tagStart !== NO_RANGE$1 || ch === 38 && props.anchorStart !== NO_RANGE$1)) break;
		if (!readTagProperty(state, props, nodeContext === CONTEXT_FLOW_IN) && !readAnchorProperty(state, props)) break;
		if (propertyStart === null) propertyStart = propertyState;
		if (skipSeparationSpace(state, true)) {
			atNewLine = true;
			allowBlockCollections = allowBlockStyles;
			if (state.lineIndent > parentIndent) indentStatus = 1;
			else if (state.lineIndent === parentIndent) indentStatus = 0;
			else indentStatus = -1;
		} else allowBlockCollections = false;
	}
	if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
	if (indentStatus === 1 || nodeContext === CONTEXT_BLOCK_OUT) {
		const flowIndent = nodeContext === CONTEXT_FLOW_IN || nodeContext === CONTEXT_FLOW_OUT ? parentIndent : parentIndent + 1;
		const blockIndent = state.position - state.lineStart;
		if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent, props) || readBlockMapping(state, blockIndent, flowIndent, props)) || readFlowCollection(state, flowIndent, props)) hasContent = true;
		else {
			const ch = state.input.charCodeAt(state.position);
			if (propertyStart !== null && allowPropertyMapping && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62) {
				const fallbackState = snapshotState(state);
				const propertyIndent = propertyStart.position - propertyStart.lineStart;
				restoreState(state, propertyStart);
				if (readBlockMapping(state, propertyIndent, flowIndent, emptyProperties()) && state.events[fallbackState.eventsLength]?.type === EVENT_ID.MAPPING) hasContent = true;
				else restoreState(state, fallbackState);
			}
			if (!hasContent && (allowBlockScalars && readBlockScalar(state, flowIndent, props) || readSingleQuotedScalar(state, flowIndent, props) || readDoubleQuotedScalar(state, flowIndent, props) || readAlias(state, props) || readPlainScalar(state, flowIndent, nodeContext, props))) hasContent = true;
		}
		else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent, props);
	}
	allowBlockScalars = allowBlockScalars && !hasContent;
	if (!hasContent && (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1 || allowBlockScalars)) {
		addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN);
		hasContent = true;
	}
	state.depth--;
	return hasContent || props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1;
}
function readDirective(state) {
	if (state.lineIndent > 0 || state.input.charCodeAt(state.position) !== 37) return false;
	state.position++;
	const nameStart = state.position;
	while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
	const name = state.input.slice(nameStart, state.position);
	const args = [];
	if (name.length === 0) throwError(state, "directive name must not be less than one character in length");
	while (state.input.charCodeAt(state.position) !== 0 && !isEol(state.input.charCodeAt(state.position))) {
		while (isWhiteSpace(state.input.charCodeAt(state.position))) state.position++;
		if (state.input.charCodeAt(state.position) === 35 || isEol(state.input.charCodeAt(state.position)) || state.input.charCodeAt(state.position) === 0) break;
		const start = state.position;
		while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
		args.push(state.input.slice(start, state.position));
	}
	if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
	if (name === "YAML") {
		if (state.directives.some((directive) => directive.kind === "yaml")) throwError(state, "duplication of %YAML directive");
		if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
		const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
		if (match === null) throwError(state, "ill-formed argument of the YAML directive");
		if (parseInt(match[1], 10) !== 1) throwError(state, "unacceptable YAML version of the document");
		state.directives.push({
			kind: "yaml",
			version: args[0]
		});
	} else if (name === "TAG") {
		if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
		const [handle, prefix] = args;
		if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
		if (HAS_OWN.call(state.tagHandlers, handle)) throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
		if (!PATTERN_TAG_PREFIX.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
		state.tagHandlers[handle] = prefix;
		state.directives.push({
			kind: "tag",
			handle,
			prefix
		});
	}
	return true;
}
function readDocument(state) {
	state.directives = [];
	state.tagHandlers = Object.create(null);
	let hasDirectives = false;
	skipSeparationSpace(state, true);
	while (readDirective(state)) {
		hasDirectives = true;
		skipSeparationSpace(state, true);
	}
	let explicitStart = false;
	let explicitEnd = false;
	let allowCompact = true;
	if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 3))) {
		explicitStart = true;
		const markerLine = state.line;
		state.position += 3;
		skipSeparationSpace(state, true);
		allowCompact = state.line > markerLine;
	} else if (hasDirectives) throwError(state, "directives end mark is expected");
	const documentEventIndex = state.events.length;
	if (!explicitStart && state.position === state.lineStart && state.input.charCodeAt(state.position) === 46 && testDocumentSeparator(state)) {
		state.position += 3;
		skipSeparationSpace(state, true);
		return;
	}
	addDocumentEvent(state, explicitStart, false);
	if (!parseNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, allowCompact, allowCompact)) addEmptyScalarEvent(state);
	skipSeparationSpace(state, true);
	if (state.position === state.lineStart && testDocumentSeparator(state)) {
		explicitEnd = state.input.charCodeAt(state.position) === 46;
		if (explicitEnd) {
			const markerLine = state.line;
			state.position += 3;
			skipSeparationSpace(state, true);
			if (state.line === markerLine && state.position < state.length) throwError(state, "end of the stream or a document separator is expected");
		}
	}
	const documentEvent = state.events[documentEventIndex];
	if (documentEvent?.type === EVENT_ID.DOCUMENT) documentEvent.explicitEnd = explicitEnd;
	addPopEvent(state);
	if (!explicitEnd && state.position < state.length && !testDocumentBoundary(state)) throwError(state, "end of the stream or a document separator is expected");
}
/**
* Parses YAML into a flat event stream referencing source text by offsets.
*
* @category Events
*/
function parseEvents(input, options) {
	const length = input.length;
	const state = {
		...DEFAULT_PARSER_OPTIONS,
		...options,
		input: `${input}\0`,
		length,
		position: 0,
		line: 0,
		lineStart: 0,
		lineIndent: 0,
		firstTabInLine: -1,
		depth: 0,
		directives: [],
		tagHandlers: Object.create(null),
		events: []
	};
	const nullpos = input.indexOf("\0");
	if (nullpos !== -1) YAMLException.throwAt(input, nullpos, "null byte is not allowed in input", state.filename);
	while (state.position < state.length) {
		skipByteOrderMark(state);
		skipSeparationSpace(state, true);
		if (state.position >= state.length) break;
		const documentStart = state.position;
		readDocument(state);
		if (state.position === documentStart)
 /* c8 ignore next */
		throwError(state, "can not read a document");
	}
	return state.events;
}
var DEFAULT_LOAD_OPTIONS = {
	...DEFAULT_PARSER_OPTIONS,
	...DEFAULT_CONSTRUCTOR_OPTIONS
};
function loadDocuments(input, options = {}) {
	const opts = {
		...DEFAULT_LOAD_OPTIONS,
		...options
	};
	const source = String(input);
	const PARSER_OPT_KEYS = Object.keys(DEFAULT_PARSER_OPTIONS);
	const CONSTRUCTOR_OPT_KEYS = Object.keys(DEFAULT_CONSTRUCTOR_OPTIONS);
	return constructFromEvents(parseEvents(source, pick(opts, PARSER_OPT_KEYS)), {
		...pick(opts, CONSTRUCTOR_OPT_KEYS),
		source
	});
}
/**
* Parses `string` as a single YAML document. Throws {@link YAMLException} on
* error. This function does not understand multi-document or empty sources; it
* throws an exception on those.
*
* > [!NOTE]
* > 1. When processing untrusted input, see the
* >    [security considerations](../docs/safety.md).
* > 2. All exceptions MUST be caught, not just {@link YAMLException}.
* > 3. The default {@link CORE_SCHEMA} comes without the `!!merge` tag. You can
* >    easily enable it if needed.
* > 4. The default {@link mapTag} is `{}`-object based, with known limitations
* >    (see description). For full compatibility use {@link realMapTag}
* >    instead (it uses native JS `Map`).
*
* @example
* Enable {@link mergeTag} and {@link realMapTag}:
*
* ```javascript
* import { load, CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
*
* try {
*   load(data, { schema: CORE_SCHEMA.withTags(mergeTag, realMapTag) })
* } catch (e) {
*   console.error(e)
* }
* ```
*
* @category Main
*/
function load(input, options) {
	const documents = loadDocuments(input, options);
	if (documents.length === 0) throw new YAMLException("expected a document, but the input is empty");
	if (documents.length === 1) return documents[0];
	throw new YAMLException("expected a single document in the stream, but found more");
}
function hasBit(mask, bit) {
	return (mask & 1 << bit) !== 0;
}
/**
* Default scalar styling rules in application order.
* See [Scalar styling](../../docs/scalar_styling.md) for usage details.
*
* @category AST
*/
var DEFAULT_SCALAR_STYLE_RULES = {
	applyQuoteFlowKeysOption,
	doubleQuoteForInvisibles,
	doubleQuoteWhitespaceOnly,
	applyForceQuotesOption,
	tryLongOrMultilineAsBlock,
	quoteInvalidPlain,
	fallbackToDoubleQuoted
};
function _preferredQuotedStyle(layout) {
	if (layout.presenterOptions.quoteStyle === "single" && hasBit(layout.allowedStylesMask, SCALAR_STYLE.SINGLE_QUOTED)) return SCALAR_STYLE.SINGLE_QUOTED;
	return SCALAR_STYLE.DOUBLE_QUOTED;
}
function applyQuoteFlowKeysOption(layout) {
	if (!layout.presenterOptions.quoteFlowKeys) return;
	if (!layout.isKey || !layout.flowOnly || layout.style !== SCALAR_STYLE.PLAIN) return;
	layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
function doubleQuoteForInvisibles(layout) {
	if (layout.style === SCALAR_STYLE.PLAIN && /[\t\x7F-\xA0\u2028\u2029\uFEFF\uFFFE\uFFFF]/.test(layout.node.value)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
function doubleQuoteWhitespaceOnly(layout) {
	if (layout.style === SCALAR_STYLE.PLAIN && /^\s+$/.test(layout.node.value)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
function applyForceQuotesOption(layout) {
	if (!layout.presenterOptions.forceQuotes) return;
	if (layout.isKey || layout.style !== SCALAR_STYLE.PLAIN) return;
	layout.style = layout.node.value.includes("\n") ? SCALAR_STYLE.DOUBLE_QUOTED : _preferredQuotedStyle(layout);
}
function tryLongOrMultilineAsBlock(layout) {
	if (layout.style !== SCALAR_STYLE.PLAIN || layout.isKey) return;
	const value = layout.node.value;
	const multiline = value.indexOf("\n") !== -1;
	if (!hasBit(layout.allowedStylesMask, SCALAR_STYLE.LITERAL_BLOCK)) {
		if (multiline) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
		return;
	}
	const w = layout.presenterOptions.lineWidth;
	if (w === -1) {
		if (multiline) layout.style = SCALAR_STYLE.LITERAL_BLOCK;
		return;
	}
	const availableWidth = Math.max(Math.min(w, 40), w - layout.shiftOfContent);
	let position = 0;
	let shouldFold = false;
	while (position <= value.length) {
		let lineEnd = value.length;
		const nextLineBreak = value.indexOf("\n", position);
		if (nextLineBreak !== -1) lineEnd = nextLineBreak;
		const line = value.slice(position, lineEnd);
		if (line.length > availableWidth && line[0] !== " " && / [^ \t]/.test(line)) shouldFold = true;
		if (nextLineBreak === -1) break;
		position = nextLineBreak + 1;
	}
	if (shouldFold) layout.style = SCALAR_STYLE.FOLDED_BLOCK;
	else if (multiline) layout.style = SCALAR_STYLE.LITERAL_BLOCK;
}
function quoteInvalidPlain(layout) {
	if (layout.style === SCALAR_STYLE.PLAIN && !hasBit(layout.allowedStylesMask, SCALAR_STYLE.PLAIN)) layout.style = _preferredQuotedStyle(layout);
}
function fallbackToDoubleQuoted(layout) {
	if (!hasBit(layout.allowedStylesMask, layout.style)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
}
var SRC_C_PRINTABLE = "[\\x09\\x0A\\x0D\\x20-\\x7E\\x85\\xA0-\\uD7FF\\uE000-\\uFFFD\\u{10000}-\\u{10FFFF}]";
var SRC_B_CHAR = "[\\n\\r]";
var SRC_C_BYTE_ORDER_MARK = "\\uFEFF";
var SRC_S_WHITE = "[ \\t]";
var SRC_NB_CHAR = `(?:(?!(?:${SRC_B_CHAR}|${SRC_C_BYTE_ORDER_MARK}))${SRC_C_PRINTABLE})`;
var SRC_NS_CHAR = `(?:(?!${SRC_S_WHITE})${SRC_NB_CHAR})`;
var SRC_NB_JSON = "[\\x09\\x20-\\uD7FF\\uE000-\\uFFFF\\u{10000}-\\u{10FFFF}]";
var SRC_C_INDICATOR = "[-?:,\\[\\]{}#&*!|>'\"%@`]";
var SRC_C_FLOW_INDICATOR = "[,\\[\\]{}]";
var SRC_NS_PLAIN_SAFE_FLOW_OUT = SRC_NS_CHAR;
var SRC_NS_PLAIN_SAFE_FLOW_IN = `(?:(?!${SRC_C_FLOW_INDICATOR})${SRC_NS_CHAR})`;
var SRC_NS_PLAIN_FIRST_FLOW_OUT = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_PLAIN_SAFE_FLOW_OUT}))`;
var SRC_NS_PLAIN_FIRST_FLOW_IN = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_PLAIN_SAFE_FLOW_IN}))`;
var SRC_NS_PLAIN_CHAR_FLOW_OUT = `(?:(?:(?![:#])${SRC_NS_PLAIN_SAFE_FLOW_OUT})|:(?=${SRC_NS_PLAIN_SAFE_FLOW_OUT}))#*`;
var SRC_NS_PLAIN_CHAR_FLOW_IN = `(?:(?:(?![:#])${SRC_NS_PLAIN_SAFE_FLOW_IN})|:(?=${SRC_NS_PLAIN_SAFE_FLOW_IN}))#*`;
var SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR_FLOW_OUT})*`;
var SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR_FLOW_IN})*`;
var SRC_NS_PLAIN_ONE_LINE_FLOW_OUT = `${SRC_NS_PLAIN_FIRST_FLOW_OUT}#*${SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT}`;
var SRC_NS_PLAIN_ONE_LINE_FLOW_IN = `${SRC_NS_PLAIN_FIRST_FLOW_IN}#*${SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN}`;
var SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY = SRC_NS_PLAIN_ONE_LINE_FLOW_OUT;
var SRC_NS_PLAIN_ONE_LINE_FLOW_KEY = SRC_NS_PLAIN_ONE_LINE_FLOW_IN;
var SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT = `\\n+${SRC_NS_PLAIN_CHAR_FLOW_OUT}${SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT}`;
var SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN = `\\n+${SRC_NS_PLAIN_CHAR_FLOW_IN}${SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN}`;
var SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT = `${SRC_NS_PLAIN_ONE_LINE_FLOW_OUT}(?:${SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT})*`;
var SRC_NS_PLAIN_MULTI_LINE_FLOW_IN = `${SRC_NS_PLAIN_ONE_LINE_FLOW_IN}(?:${SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN})*`;
new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT})$`, "u");
new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_IN})$`, "u");
new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY})$`, "u");
new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_FLOW_KEY})$`, "u");
new RegExp(`^(?:${SRC_NB_JSON})*$`, "u");
new RegExp(`^(?:${SRC_NB_JSON}|\\n)*$`, "u");
new RegExp(`^(?:${SRC_NB_CHAR}|\\n)*$`, "u");
Object.keys(DEFAULT_SCALAR_STYLE_RULES).map((name) => Reflect.get(DEFAULT_SCALAR_STYLE_RULES, name));
EVENT_ID.DOCUMENT;
EVENT_ID.SEQUENCE;
EVENT_ID.MAPPING;
EVENT_ID.SCALAR;
EVENT_ID.ALIAS;
EVENT_ID.POP;
SCALAR_STYLE.PLAIN;
SCALAR_STYLE.SINGLE_QUOTED;
SCALAR_STYLE.DOUBLE_QUOTED;
SCALAR_STYLE.LITERAL_BLOCK;
SCALAR_STYLE.FOLDED_BLOCK;
COLLECTION_STYLE.BLOCK;
COLLECTION_STYLE.FLOW;
CHOMPING_MODE.CLIP;
CHOMPING_MODE.STRIP;
CHOMPING_MODE.KEEP;
//#endregion
//#region tools/lib/load.mjs
const DATA_EXT = /* @__PURE__ */ new Set([
	".yaml",
	".yml",
	".json"
]);
function parseFile(path) {
	const raw = readFileSync(path, "utf8");
	if (extname(path) === ".json") return JSON.parse(raw);
	return load(raw);
}
/** first file in `dir` whose basename (sans extension) is `name` */
function findFile(dir, name) {
	if (!existsSync(dir)) return null;
	for (const f of readdirSync(dir)) {
		if (!DATA_EXT.has(extname(f))) continue;
		if (basename(f, extname(f)) === name) return join(dir, f);
	}
	return null;
}
function dataFiles(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((f) => DATA_EXT.has(extname(f)) && !f.startsWith("_")).sort();
}
function readCalibration(path) {
	if (!existsSync(path)) return null;
	const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));
	if (!m) return null;
	const front = load(m[1]) || {};
	const exam = front.exam;
	return {
		exam: exam && {
			format: exam.format || [],
			dates: (exam.dates || []).map((d) => d instanceof Date ? d.toISOString().slice(0, 10) : String(d))
		},
		reviewBasis: String((front.review || {}).basis || "").trim()
	};
}
/** leading integer of a filename, e.g. "03-boolean" → 3 */
function prefixNum(name, fallback) {
	const m = /^(\d+)/.exec(name);
	return m ? parseInt(m[1], 10) : fallback;
}
function loadCourse(dir) {
	const errors = [];
	const metaPath = findFile(dir, "course");
	if (!metaPath) throw new Error(`no course.yaml (or .json) in ${dir}`);
	const meta = parseFile(metaPath) || {};
	const C = Object.assign({
		code: "",
		title: "",
		tagline: "",
		meta: "",
		concepts: {},
		drills: {},
		sections: []
	}, meta);
	C.concepts = Object.assign({}, meta.concepts || {});
	C.drills = {};
	C.cats = Object.assign({}, meta.cats || {});
	const catdir = join(dir, "categories");
	for (const f of dataFiles(catdir)) {
		const key = basename(f, extname(f));
		const body = parseFile(join(catdir, f));
		if (!body || typeof body !== "object") {
			errors.push(`categories/${f}: not a mapping`);
			continue;
		}
		C.cats[body.key || key] = body;
	}
	const cdir = join(dir, "concepts");
	for (const f of dataFiles(cdir)) {
		const key = basename(f, extname(f));
		const body = parseFile(join(cdir, f));
		if (!body || typeof body !== "object") {
			errors.push(`concepts/${f}: not a mapping`);
			continue;
		}
		C.concepts[body.key || key] = body;
	}
	const ddir = join(dir, "drills");
	for (const f of dataFiles(ddir)) {
		const key = basename(f, extname(f));
		const body = parseFile(join(ddir, f));
		if (!body || typeof body !== "object") {
			errors.push(`drills/${f}: not a mapping`);
			continue;
		}
		C.drills[body.concept || key] = {
			concept: body.concept || key,
			items: body.items || []
		};
	}
	const cal = readCalibration(join(dir, "materials", "expectations.md")) || {};
	C.reviewBasis = cal.reviewBasis || "";
	if (cal.exam) {
		C.exam = cal.exam;
		C.retention = Object.assign({ deadlines: cal.exam.dates }, C.retention || {});
	}
	const sdir = join(dir, "sections");
	if (existsSync(sdir)) readdirSync(sdir).filter((f) => statSync(join(sdir, f)).isDirectory() && !f.startsWith("_")).sort().forEach((folder, si) => {
		const full = join(sdir, folder);
		const metaFile = findFile(full, "_section");
		const smeta = metaFile ? parseFile(metaFile) || {} : {};
		const num = smeta.num != null ? smeta.num : prefixNum(folder, si + 1);
		const id = smeta.id || `s${num}`;
		const subs = dataFiles(full).map((f, k) => {
			const sub = parseFile(join(full, f));
			if (!sub || typeof sub !== "object") {
				errors.push(`${folder}/${f}: not a mapping`);
				return null;
			}
			return Object.assign({}, sub, {
				id: sub.id || `${id}-${prefixNum(f, k + 1)}`,
				title: sub.title || basename(f, extname(f)),
				blocks: sub.blocks || [],
				quiz: sub.quiz || []
			});
		}).filter(Boolean);
		if (!subs.length) errors.push(`${folder}: no subsection files`);
		C.sections.push({
			id,
			num,
			title: smeta.title || folder,
			blurb: smeta.blurb || "",
			primer: smeta.primer || [],
			subs
		});
	});
	C.sections.sort((a, b) => a.num - b.num);
	if (!C.sections.length) errors.push("no sections found");
	return {
		course: C,
		errors
	};
}
//#endregion
//#region node_modules/katex/dist/katex.mjs
/**
* This is the ParseError class, which is the main error thrown by KaTeX
* functions when something has gone wrong. This is used to distinguish internal
* errors from errors in the expression that the user provided.
*
* If possible, a caller should provide a Token or ParseNode with information
* about where in the source string the problem occurred.
*/
var ParseError = class ParseError extends Error {
	constructor(message, token) {
		var error = "KaTeX parse error: " + message;
		var start;
		var end;
		var loc = token && token.loc;
		if (loc && loc.start <= loc.end) {
			var input = loc.lexer.input;
			start = loc.start;
			end = loc.end;
			if (start === input.length) error += " at end of input: ";
			else error += " at position " + (start + 1) + ": ";
			var underlined = input.slice(start, end).replace(/[^]/g, "$&̲");
			var left;
			if (start > 15) left = "…" + input.slice(start - 15, start);
			else left = input.slice(0, start);
			var right;
			if (end + 15 < input.length) right = input.slice(end, end + 15) + "…";
			else right = input.slice(end);
			error += left + underlined + right;
		}
		super(error);
		this.name = "ParseError";
		this.position = void 0;
		this.length = void 0;
		this.rawMessage = void 0;
		Object.setPrototypeOf(this, ParseError.prototype);
		this.position = start;
		if (start != null && end != null) this.length = end - start;
		this.rawMessage = message;
	}
};
/**
* This file contains a list of utility functions which are useful in other
* files.
*/
var uppercase = /([A-Z])/g;
var hyphenate = (str) => str.replace(uppercase, "-$1").toLowerCase();
var ESCAPE_LOOKUP = {
	"&": "&amp;",
	">": "&gt;",
	"<": "&lt;",
	"\"": "&quot;",
	"'": "&#x27;"
};
var ESCAPE_REGEX = /[&><"']/g;
/**
* Escapes text to prevent scripting attacks.
*/
var escape = (text) => String(text).replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
/**
* Sometimes we want to pull out the innermost element of a group. In most
* cases, this will just be the group itself, but when ordgroups and colors have
* a single element, we want to pull that out.
*/
var getBaseElem = (group) => {
	if (group.type === "ordgroup") {
		if (group.body.length === 1) return getBaseElem(group.body[0]);
		else return group;
	} else if (group.type === "color") {
		if (group.body.length === 1) return getBaseElem(group.body[0]);
		else return group;
	} else if (group.type === "font") return getBaseElem(group.body);
	else return group;
};
var characterNodesTypes = /* @__PURE__ */ new Set([
	"mathord",
	"textord",
	"atom"
]);
/**
* TeXbook algorithms often reference "character boxes", which are simply groups
* with a single character in them. To decide if something is a character box,
* we find its innermost group, and see if it is a single character.
*/
var isCharacterBox = (group) => characterNodesTypes.has(getBaseElem(group).type);
/**
* Return the protocol of a URL, or "_relative" if the URL does not specify a
* protocol (and thus is relative), or `null` if URL has invalid protocol
* (so should be outright rejected).
*/
var protocolFromUrl = (url) => {
	var protocol = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(url);
	if (!protocol) return "_relative";
	if (protocol[2] !== ":") return null;
	if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(protocol[1])) return null;
	return protocol[1].toLowerCase();
};
var SETTINGS_SCHEMA = {
	displayMode: {
		type: "boolean",
		description: "Render math in display mode, which puts the math in display style (so \\int and \\sum are large, for example), and centers the math on the page on its own line.",
		cli: "-d, --display-mode"
	},
	output: {
		type: { enum: [
			"htmlAndMathml",
			"html",
			"mathml"
		] },
		description: "Determines the markup language of the output.",
		cli: "-F, --format <type>"
	},
	leqno: {
		type: "boolean",
		description: "Render display math in leqno style (left-justified tags)."
	},
	fleqn: {
		type: "boolean",
		description: "Render display math flush left."
	},
	throwOnError: {
		type: "boolean",
		default: true,
		cli: "-t, --no-throw-on-error",
		cliDescription: "Render errors (in the color given by --error-color) instead of throwing a ParseError exception when encountering an error."
	},
	errorColor: {
		type: "string",
		default: "#cc0000",
		cli: "-c, --error-color <color>",
		cliDescription: "A color string given in the format 'rgb' or 'rrggbb' (no #). This option determines the color of errors rendered by the -t option.",
		cliProcessor: (color) => "#" + color
	},
	macros: {
		type: "object",
		cli: "-m, --macro <def>",
		cliDescription: "Define custom macro of the form '\\foo:expansion' (use multiple -m arguments for multiple macros).",
		cliDefault: [],
		cliProcessor: (def, defs) => {
			defs.push(def);
			return defs;
		}
	},
	minRuleThickness: {
		type: "number",
		description: "Specifies a minimum thickness, in ems, for fraction lines, `\\sqrt` top lines, `{array}` vertical lines, `\\hline`, `\\hdashline`, `\\underline`, `\\overline`, and the borders of `\\fbox`, `\\boxed`, and `\\fcolorbox`.",
		processor: (t) => Math.max(0, t),
		cli: "--min-rule-thickness <size>",
		cliProcessor: parseFloat
	},
	colorIsTextColor: {
		type: "boolean",
		description: "Makes \\color behave like LaTeX's 2-argument \\textcolor, instead of LaTeX's one-argument \\color mode change.",
		cli: "-b, --color-is-text-color"
	},
	strict: {
		type: [
			{ enum: [
				"warn",
				"ignore",
				"error"
			] },
			"boolean",
			"function"
		],
		description: "Turn on strict / LaTeX faithfulness mode, which throws an error if the input uses features that are not supported by LaTeX.",
		cli: "-S, --strict",
		cliDefault: false
	},
	trust: {
		type: ["boolean", "function"],
		description: "Trust the input, enabling all HTML features such as \\url.",
		cli: "-T, --trust"
	},
	maxSize: {
		type: "number",
		default: Infinity,
		description: "If non-zero, all user-specified sizes, e.g. in \\rule{500em}{500em}, will be capped to maxSize ems. Otherwise, elements and spaces can be arbitrarily large",
		processor: (s) => Math.max(0, s),
		cli: "-s, --max-size <n>",
		cliProcessor: parseInt
	},
	maxExpand: {
		type: "number",
		default: 1e3,
		description: "Limit the number of macro expansions to the specified number, to prevent e.g. infinite macro loops. If set to Infinity, the macro expander will try to fully expand as in LaTeX.",
		processor: (n) => Math.max(0, n),
		cli: "-e, --max-expand <n>",
		cliProcessor: (n) => n === "Infinity" ? Infinity : parseInt(n)
	},
	globalGroup: {
		type: "boolean",
		cli: false
	}
};
function getImplicitDefault(type) {
	if (typeof type !== "string") return type.enum[0];
	switch (type) {
		case "boolean": return false;
		case "string": return "";
		case "number": return 0;
		case "object": return {};
		default: throw new Error("Unexpected schema type; settings must declare an explicit default.");
	}
}
function getDefaultValue(schema) {
	if (Object.prototype.hasOwnProperty.call(schema, "default") && schema.default !== void 0) return schema.default;
	return getImplicitDefault(Array.isArray(schema.type) ? schema.type[0] : schema.type);
}
function applySetting(target, prop, options, schema) {
	var optionValue = Object.prototype.hasOwnProperty.call(options, prop) ? options[prop] : void 0;
	var processor = Object.prototype.hasOwnProperty.call(schema, "processor") ? schema.processor : void 0;
	target[prop] = optionValue !== void 0 ? processor ? processor(optionValue) : optionValue : getDefaultValue(schema);
}
/**
* The main Settings object
*
* The current options stored are:
*  - displayMode: Whether the expression should be typeset as inline math
*                 (false, the default), meaning that the math starts in
*                 \textstyle and is placed in an inline-block); or as display
*                 math (true), meaning that the math starts in \displaystyle
*                 and is placed in a block with vertical margin.
*/
var Settings = class {
	constructor(options) {
		if (options === void 0) options = {};
		this.displayMode = void 0;
		this.output = void 0;
		this.leqno = void 0;
		this.fleqn = void 0;
		this.throwOnError = void 0;
		this.errorColor = void 0;
		this.macros = void 0;
		this.minRuleThickness = void 0;
		this.colorIsTextColor = void 0;
		this.strict = void 0;
		this.trust = void 0;
		this.maxSize = void 0;
		this.maxExpand = void 0;
		this.globalGroup = void 0;
		options = options || {};
		for (var prop of Object.keys(SETTINGS_SCHEMA)) {
			var schema = SETTINGS_SCHEMA[prop];
			if (schema) applySetting(this, prop, options, schema);
		}
	}
	/**
	* Report nonstrict (non-LaTeX-compatible) input.
	* Can safely not be called if `this.strict` is false in JavaScript.
	*/
	reportNonstrict(errorCode, errorMsg, token) {
		var strict = this.strict;
		if (typeof strict === "function") strict = strict(errorCode, errorMsg, token);
		if (!strict || strict === "ignore") return;
		else if (strict === true || strict === "error") throw new ParseError("LaTeX-incompatible input and strict mode is set to 'error': " + (errorMsg + " [" + errorCode + "]"), token);
		else if (strict === "warn") typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
		else typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + strict + "': " + errorMsg + " [" + errorCode + "]"));
	}
	/**
	* Check whether to apply strict (LaTeX-adhering) behavior for unusual
	* input (like `\\`).  Unlike `nonstrict`, will not throw an error;
	* instead, "error" translates to a return value of `true`, while "ignore"
	* translates to a return value of `false`.  May still print a warning:
	* "warn" prints a warning and returns `false`.
	* This is for the second category of `errorCode`s listed in the README.
	*/
	useStrictBehavior(errorCode, errorMsg, token) {
		var strict = this.strict;
		if (typeof strict === "function") try {
			strict = strict(errorCode, errorMsg, token);
		} catch (error) {
			strict = "error";
		}
		if (!strict || strict === "ignore") return false;
		else if (strict === true || strict === "error") return true;
		else if (strict === "warn") {
			typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
			return false;
		} else {
			typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + strict + "': " + errorMsg + " [" + errorCode + "]"));
			return false;
		}
	}
	/**
	* Check whether to test potentially dangerous input, and return
	* `true` (trusted) or `false` (untrusted).  The sole argument `context`
	* should be an object with `command` field specifying the relevant LaTeX
	* command (as a string starting with `\`), and any other arguments, etc.
	* If `context` has a `url` field, a `protocol` field will automatically
	* get added by this function (changing the specified object).
	*/
	isTrusted(context) {
		if ("url" in context && context.url && !context.protocol) {
			var protocol = protocolFromUrl(context.url);
			if (protocol == null) return false;
			context.protocol = protocol;
		}
		var trust = typeof this.trust === "function" ? this.trust(context) : this.trust;
		return Boolean(trust);
	}
};
/**
* This file contains information and classes for the various kinds of styles
* used in TeX. It provides a generic `Style` class, which holds information
* about a specific style. It then provides instances of all the different kinds
* of styles possible, and provides functions to move between them and get
* information about them.
*/
/**
* The main style class. Contains a unique id for the style, a size (which is
* the same for cramped and uncramped version of a style), and a cramped flag.
*/
var Style = class {
	constructor(id, size, cramped) {
		this.id = void 0;
		this.size = void 0;
		this.cramped = void 0;
		this.id = id;
		this.size = size;
		this.cramped = cramped;
	}
	/**
	* Get the style of a superscript given a base in the current style.
	*/
	sup() {
		return styles[sup[this.id]];
	}
	/**
	* Get the style of a subscript given a base in the current style.
	*/
	sub() {
		return styles[sub[this.id]];
	}
	/**
	* Get the style of a fraction numerator given the fraction in the current
	* style.
	*/
	fracNum() {
		return styles[fracNum[this.id]];
	}
	/**
	* Get the style of a fraction denominator given the fraction in the current
	* style.
	*/
	fracDen() {
		return styles[fracDen[this.id]];
	}
	/**
	* Get the cramped version of a style (in particular, cramping a cramped style
	* doesn't change the style).
	*/
	cramp() {
		return styles[cramp[this.id]];
	}
	/**
	* Get a text or display version of this style.
	*/
	text() {
		return styles[text$1[this.id]];
	}
	/**
	* Return true if this style is tightly spaced (scriptstyle/scriptscriptstyle)
	*/
	isTight() {
		return this.size >= 2;
	}
};
var D = 0;
var Dc = 1;
var T = 2;
var Tc = 3;
var S = 4;
var Sc = 5;
var SS = 6;
var SSc = 7;
var styles = [
	new Style(D, 0, false),
	new Style(Dc, 0, true),
	new Style(T, 1, false),
	new Style(Tc, 1, true),
	new Style(S, 2, false),
	new Style(Sc, 2, true),
	new Style(SS, 3, false),
	new Style(SSc, 3, true)
];
var sup = [
	S,
	Sc,
	S,
	Sc,
	SS,
	SSc,
	SS,
	SSc
];
var sub = [
	Sc,
	Sc,
	Sc,
	Sc,
	SSc,
	SSc,
	SSc,
	SSc
];
var fracNum = [
	T,
	Tc,
	S,
	Sc,
	SS,
	SSc,
	SS,
	SSc
];
var fracDen = [
	Tc,
	Tc,
	Sc,
	Sc,
	SSc,
	SSc,
	SSc,
	SSc
];
var cramp = [
	Dc,
	Dc,
	Tc,
	Tc,
	Sc,
	Sc,
	SSc,
	SSc
];
var text$1 = [
	D,
	Dc,
	T,
	Tc,
	T,
	Tc,
	T,
	Tc
];
var Style$1 = {
	DISPLAY: styles[D],
	TEXT: styles[T],
	SCRIPT: styles[S],
	SCRIPTSCRIPT: styles[SS]
};
/**
* Unicode block data for the families of scripts we support in \text{}.
* Scripts only need to appear here if they do not have font metrics.
*/
var scriptData = [
	{
		name: "latin",
		blocks: [[256, 591], [768, 879]]
	},
	{
		name: "cyrillic",
		blocks: [[1024, 1279]]
	},
	{
		name: "armenian",
		blocks: [[1328, 1423]]
	},
	{
		name: "brahmic",
		blocks: [[2304, 4255]]
	},
	{
		name: "georgian",
		blocks: [[4256, 4351]]
	},
	{
		name: "cjk",
		blocks: [
			[12288, 12543],
			[19968, 40879],
			[65280, 65376]
		]
	},
	{
		name: "hangul",
		blocks: [[44032, 55215]]
	}
];
/**
* Given a codepoint, return the name of the script or script family
* it is from, or null if it is not part of a known block
*/
function scriptFromCodepoint(codepoint) {
	for (var i = 0; i < scriptData.length; i++) {
		var script = scriptData[i];
		for (var _i = 0; _i < script.blocks.length; _i++) {
			var block = script.blocks[_i];
			if (codepoint >= block[0] && codepoint <= block[1]) return script.name;
		}
	}
	return null;
}
/**
* A flattened version of all the supported blocks in a single array.
* This is an optimization to make supportedCodepoint() fast.
*/
var allBlocks = [];
scriptData.forEach((s) => s.blocks.forEach((b) => allBlocks.push(...b)));
/**
* Given a codepoint, return true if it falls within one of the
* scripts or script families defined above and false otherwise.
*
* Micro benchmarks shows that this is faster than
* /[\u3000-\u30FF\u4E00-\u9FAF\uFF00-\uFF60\uAC00-\uD7AF\u0900-\u109F]/.test()
* in Firefox, Chrome and Node.
*/
function supportedCodepoint(codepoint) {
	for (var i = 0; i < allBlocks.length; i += 2) if (codepoint >= allBlocks[i] && codepoint <= allBlocks[i + 1]) return true;
	return false;
}
/**
* This file provides support to domTree.js and delimiter.js.
* It's a storehouse of path geometry for SVG images.
*/
var doubleBrushStroke = (svgPath) => svgPath + " " + svgPath;
var hLinePad = 80;
var sqrtMain = function sqrtMain(extraVinculum, hLinePad) {
	return "M95," + (622 + extraVinculum + hLinePad) + "\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl" + extraVinculum / 2.075 + " -" + extraVinculum + "\nc5.3,-9.3,12,-14,20,-14\nH400000v" + (40 + extraVinculum) + "H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM" + (834 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize1 = function sqrtSize1(extraVinculum, hLinePad) {
	return "M263," + (601 + extraVinculum + hLinePad) + "c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl" + extraVinculum / 2.084 + " -" + extraVinculum + "\nc4.7,-7.3,11,-11,19,-11\nH40000v" + (40 + extraVinculum) + "H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM" + (1001 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize2 = function sqrtSize2(extraVinculum, hLinePad) {
	return "M983 " + (10 + extraVinculum + hLinePad) + "\nl" + extraVinculum / 3.13 + " -" + extraVinculum + "\nc4,-6.7,10,-10,18,-10 H400000v" + (40 + extraVinculum) + "\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM" + (1001 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize3 = function sqrtSize3(extraVinculum, hLinePad) {
	return "M424," + (2398 + extraVinculum + hLinePad) + "\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl" + extraVinculum / 4.223 + " -" + extraVinculum + "c4,-6.7,10,-10,18,-10 H400000\nv" + (40 + extraVinculum) + "H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M" + (1001 + extraVinculum) + " " + hLinePad + "\nh400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize4 = function sqrtSize4(extraVinculum, hLinePad) {
	return "M473," + (2713 + extraVinculum + hLinePad) + "\nc339.3,-1799.3,509.3,-2700,510,-2702 l" + extraVinculum / 5.298 + " -" + extraVinculum + "\nc3.3,-7.3,9.3,-11,18,-11 H400000v" + (40 + extraVinculum) + "H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM" + (1001 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "H1017.7z";
};
var phasePath = function phasePath(y) {
	var x = y / 2;
	return "M400000 " + y + " H0 L" + x + " 0 l65 45 L145 " + (y - 80) + " H400000z";
};
var sqrtTall = function sqrtTall(extraVinculum, hLinePad, viewBoxHeight) {
	var vertSegment = viewBoxHeight - 54 - hLinePad - extraVinculum;
	return "M702 " + (extraVinculum + hLinePad) + "H400000" + (40 + extraVinculum) + "\nH742v" + vertSegment + "l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 " + hLinePad + "H400000v" + (40 + extraVinculum) + "H742z";
};
var sqrtPath = function sqrtPath(size, extraVinculum, viewBoxHeight) {
	extraVinculum = 1e3 * extraVinculum;
	var path = "";
	switch (size) {
		case "sqrtMain":
			path = sqrtMain(extraVinculum, hLinePad);
			break;
		case "sqrtSize1":
			path = sqrtSize1(extraVinculum, hLinePad);
			break;
		case "sqrtSize2":
			path = sqrtSize2(extraVinculum, hLinePad);
			break;
		case "sqrtSize3":
			path = sqrtSize3(extraVinculum, hLinePad);
			break;
		case "sqrtSize4":
			path = sqrtSize4(extraVinculum, hLinePad);
			break;
		case "sqrtTall": path = sqrtTall(extraVinculum, hLinePad, viewBoxHeight);
	}
	return path;
};
var innerPath = function innerPath(name, height) {
	switch (name) {
		case "⎜": return doubleBrushStroke("M291 0 H417 V" + height + " H291z");
		case "∣": return doubleBrushStroke("M145 0 H188 V" + height + " H145z");
		case "∥": return doubleBrushStroke("M145 0 H188 V" + height + " H145z") + doubleBrushStroke("M367 0 H410 V" + height + " H367z");
		case "⎟": return doubleBrushStroke("M457 0 H583 V" + height + " H457z");
		case "⎢": return doubleBrushStroke("M319 0 H403 V" + height + " H319z");
		case "⎥": return doubleBrushStroke("M263 0 H347 V" + height + " H263z");
		case "⎪": return doubleBrushStroke("M384 0 H504 V" + height + " H384z");
		case "⏐": return doubleBrushStroke("M312 0 H355 V" + height + " H312z");
		case "‖": return doubleBrushStroke("M257 0 H300 V" + height + " H257z") + doubleBrushStroke("M478 0 H521 V" + height + " H478z");
		default: return "";
	}
};
var path = {
	doubleleftarrow: "M262 157\nl10-10c34-36 62.7-77 86-123 3.3-8 5-13.3 5-16 0-5.3-6.7-8-20-8-7.3\n 0-12.2.5-14.5 1.5-2.3 1-4.8 4.5-7.5 10.5-49.3 97.3-121.7 169.3-217 216-28\n 14-57.3 25-88 33-6.7 2-11 3.8-13 5.5-2 1.7-3 4.2-3 7.5s1 5.8 3 7.5\nc2 1.7 6.3 3.5 13 5.5 68 17.3 128.2 47.8 180.5 91.5 52.3 43.7 93.8 96.2 124.5\n 157.5 9.3 8 15.3 12.3 18 13h6c12-.7 18-4 18-10 0-2-1.7-7-5-15-23.3-46-52-87\n-86-123l-10-10h399738v-40H218c328 0 0 0 0 0l-10-8c-26.7-20-65.7-43-117-69 2.7\n-2 6-3.7 10-5 36.7-16 72.3-37.3 107-64l10-8h399782v-40z\nm8 0v40h399730v-40zm0 194v40h399730v-40z",
	doublerightarrow: "M399738 392l\n-10 10c-34 36-62.7 77-86 123-3.3 8-5 13.3-5 16 0 5.3 6.7 8 20 8 7.3 0 12.2-.5\n 14.5-1.5 2.3-1 4.8-4.5 7.5-10.5 49.3-97.3 121.7-169.3 217-216 28-14 57.3-25 88\n-33 6.7-2 11-3.8 13-5.5 2-1.7 3-4.2 3-7.5s-1-5.8-3-7.5c-2-1.7-6.3-3.5-13-5.5-68\n-17.3-128.2-47.8-180.5-91.5-52.3-43.7-93.8-96.2-124.5-157.5-9.3-8-15.3-12.3-18\n-13h-6c-12 .7-18 4-18 10 0 2 1.7 7 5 15 23.3 46 52 87 86 123l10 10H0v40h399782\nc-328 0 0 0 0 0l10 8c26.7 20 65.7 43 117 69-2.7 2-6 3.7-10 5-36.7 16-72.3 37.3\n-107 64l-10 8H0v40zM0 157v40h399730v-40zm0 194v40h399730v-40z",
	leftarrow: "M400000 241H110l3-3c68.7-52.7 113.7-120\n 135-202 4-14.7 6-23 6-25 0-7.3-7-11-21-11-8 0-13.2.8-15.5 2.5-2.3 1.7-4.2 5.8\n-5.5 12.5-1.3 4.7-2.7 10.3-4 17-12 48.7-34.8 92-68.5 130S65.3 228.3 18 247\nc-10 4-16 7.7-18 11 0 8.7 6 14.3 18 17 47.3 18.7 87.8 47 121.5 85S196 441.3 208\n 490c.7 2 1.3 5 2 9s1.2 6.7 1.5 8c.3 1.3 1 3.3 2 6s2.2 4.5 3.5 5.5c1.3 1 3.3\n 1.8 6 2.5s6 1 10 1c14 0 21-3.7 21-11 0-2-2-10.3-6-25-20-79.3-65-146.7-135-202\n l-3-3h399890zM100 241v40h399900v-40z",
	leftbrace: "M6 548l-6-6v-35l6-11c56-104 135.3-181.3 238-232 57.3-28.7 117\n-45 179-50h399577v120H403c-43.3 7-81 15-113 26-100.7 33-179.7 91-237 174-2.7\n 5-6 9-10 13-.7 1-7.3 1-20 1H6z",
	leftbraceunder: "M0 6l6-6h17c12.688 0 19.313.3 20 1 4 4 7.313 8.3 10 13\n 35.313 51.3 80.813 93.8 136.5 127.5 55.688 33.7 117.188 55.8 184.5 66.5.688\n 0 2 .3 4 1 18.688 2.7 76 4.3 172 5h399450v120H429l-6-1c-124.688-8-235-61.7\n-331-161C60.687 138.7 32.312 99.3 7 54L0 41V6z",
	leftgroup: "M400000 80\nH435C64 80 168.3 229.4 21 260c-5.9 1.2-18 0-18 0-2 0-3-1-3-3v-38C76 61 257 0\n 435 0h399565z",
	leftgroupunder: "M400000 262\nH435C64 262 168.3 112.6 21 82c-5.9-1.2-18 0-18 0-2 0-3 1-3 3v38c76 158 257 219\n 435 219h399565z",
	leftharpoon: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3\n-3.3 10.2-9.5 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5\n-18.3 3-21-1.3-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7\n-196 228-6.7 4.7-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40z",
	leftharpoonplus: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3-3.3 10.2-9.5\n 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5-18.3 3-21-1.3\n-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7-196 228-6.7 4.7\n-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40zM0 435v40h400000v-40z\nm0 0v40h400000v-40z",
	leftharpoondown: "M7 241c-4 4-6.333 8.667-7 14 0 5.333.667 9 2 11s5.333\n 5.333 12 10c90.667 54 156 130 196 228 3.333 10.667 6.333 16.333 9 17 2 .667 5\n 1 9 1h5c10.667 0 16.667-2 18-6 2-2.667 1-9.667-3-21-32-87.333-82.667-157.667\n-152-211l-3-3h399907v-40zM93 281 H400000 v-40L7 241z",
	leftharpoondownplus: "M7 435c-4 4-6.3 8.7-7 14 0 5.3.7 9 2 11s5.3 5.3 12\n 10c90.7 54 156 130 196 228 3.3 10.7 6.3 16.3 9 17 2 .7 5 1 9 1h5c10.7 0 16.7\n-2 18-6 2-2.7 1-9.7-3-21-32-87.3-82.7-157.7-152-211l-3-3h399907v-40H7zm93 0\nv40h399900v-40zM0 241v40h399900v-40zm0 0v40h399900v-40z",
	lefthook: "M400000 281 H103s-33-11.2-61-33.5S0 197.3 0 164s14.2-61.2 42.5\n-83.5C70.8 58.2 104 47 142 47 c16.7 0 25 6.7 25 20 0 12-8.7 18.7-26 20-40 3.3\n-68.7 15.7-86 37-10 12-15 25.3-15 40 0 22.7 9.8 40.7 29.5 54 19.7 13.3 43.5 21\n 71.5 23h399859zM103 281v-40h399897v40z",
	leftlinesegment: doubleBrushStroke("M40 281 V428 H0 V94 H40 V241 H400000 v40z"),
	leftbracketunder: doubleBrushStroke("M0 0 h120 V290 H399995 v120 H0z"),
	leftbracketover: doubleBrushStroke("M0 440 h120 V150 H399995 v-120 H0z"),
	leftmapsto: doubleBrushStroke("M40 281 V448H0V74H40V241H400000v40z"),
	leftToFrom: "M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",
	longequal: doubleBrushStroke("M0 50 h400000 v40H0z m0 194h40000v40H0z"),
	midbrace: "M200428 334\nc-100.7-8.3-195.3-44-280-108-55.3-42-101.7-93-139-153l-9-14c-2.7 4-5.7 8.7-9 14\n-53.3 86.7-123.7 153-211 199-66.7 36-137.3 56.3-212 62H0V214h199568c178.3-11.7\n 311.7-78.3 403-201 6-8 9.7-12 11-12 .7-.7 6.7-1 18-1s17.3.3 18 1c1.3 0 5 4 11\n 12 44.7 59.3 101.3 106.3 170 141s145.3 54.3 229 60h199572v120z",
	midbraceunder: "M199572 214\nc100.7 8.3 195.3 44 280 108 55.3 42 101.7 93 139 153l9 14c2.7-4 5.7-8.7 9-14\n 53.3-86.7 123.7-153 211-199 66.7-36 137.3-56.3 212-62h199568v120H200432c-178.3\n 11.7-311.7 78.3-403 201-6 8-9.7 12-11 12-.7.7-6.7 1-18 1s-17.3-.3-18-1c-1.3 0\n-5-4-11-12-44.7-59.3-101.3-106.3-170-141s-145.3-54.3-229-60H0V214z",
	oiintSize1: "M512.6 71.6c272.6 0 320.3 106.8 320.3 178.2 0 70.8-47.7 177.6\n-320.3 177.6S193.1 320.6 193.1 249.8c0-71.4 46.9-178.2 319.5-178.2z\nm368.1 178.2c0-86.4-60.9-215.4-368.1-215.4-306.4 0-367.3 129-367.3 215.4 0 85.8\n60.9 214.8 367.3 214.8 307.2 0 368.1-129 368.1-214.8z",
	oiintSize2: "M757.8 100.1c384.7 0 451.1 137.6 451.1 230 0 91.3-66.4 228.8\n-451.1 228.8-386.3 0-452.7-137.5-452.7-228.8 0-92.4 66.4-230 452.7-230z\nm502.4 230c0-111.2-82.4-277.2-502.4-277.2s-504 166-504 277.2\nc0 110 84 276 504 276s502.4-166 502.4-276z",
	oiiintSize1: "M681.4 71.6c408.9 0 480.5 106.8 480.5 178.2 0 70.8-71.6 177.6\n-480.5 177.6S202.1 320.6 202.1 249.8c0-71.4 70.5-178.2 479.3-178.2z\nm525.8 178.2c0-86.4-86.8-215.4-525.7-215.4-437.9 0-524.7 129-524.7 215.4 0\n85.8 86.8 214.8 524.7 214.8 438.9 0 525.7-129 525.7-214.8z",
	oiiintSize2: "M1021.2 53c603.6 0 707.8 165.8 707.8 277.2 0 110-104.2 275.8\n-707.8 275.8-606 0-710.2-165.8-710.2-275.8C311 218.8 415.2 53 1021.2 53z\nm770.4 277.1c0-131.2-126.4-327.6-770.5-327.6S248.4 198.9 248.4 330.1\nc0 130 128.8 326.4 772.7 326.4s770.5-196.4 770.5-326.4z",
	rightarrow: "M0 241v40h399891c-47.3 35.3-84 78-110 128\n-16.7 32-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20\n 11 8 0 13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7\n 39-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85\n-40.5-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n 151.7 139 205zm0 0v40h399900v-40z",
	rightbrace: "M400000 542l\n-6 6h-17c-12.7 0-19.3-.3-20-1-4-4-7.3-8.3-10-13-35.3-51.3-80.8-93.8-136.5-127.5\ns-117.2-55.8-184.5-66.5c-.7 0-2-.3-4-1-18.7-2.7-76-4.3-172-5H0V214h399571l6 1\nc124.7 8 235 61.7 331 161 31.3 33.3 59.7 72.7 85 118l7 13v35z",
	rightbraceunder: "M399994 0l6 6v35l-6 11c-56 104-135.3 181.3-238 232-57.3\n 28.7-117 45-179 50H-300V214h399897c43.3-7 81-15 113-26 100.7-33 179.7-91 237\n-174 2.7-5 6-9 10-13 .7-1 7.3-1 20-1h17z",
	rightgroup: "M0 80h399565c371 0 266.7 149.4 414 180 5.9 1.2 18 0 18 0 2 0\n 3-1 3-3v-38c-76-158-257-219-435-219H0z",
	rightgroupunder: "M0 262h399565c371 0 266.7-149.4 414-180 5.9-1.2 18 0 18\n 0 2 0 3 1 3 3v38c-76 158-257 219-435 219H0z",
	rightharpoon: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3\n-3.7-15.3-11-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2\n-10.7 0-16.7 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58\n 69.2 92 94.5zm0 0v40h399900v-40z",
	rightharpoonplus: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3-3.7-15.3-11\n-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2-10.7 0-16.7\n 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58 69.2 92 94.5z\nm0 0v40h399900v-40z m100 194v40h399900v-40zm0 0v40h399900v-40z",
	rightharpoondown: "M399747 511c0 7.3 6.7 11 20 11 8 0 13-.8 15-2.5s4.7-6.8\n 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3 8.5-5.8 9.5\n-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3-64.7 57-92 95\n-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 241v40h399900v-40z",
	rightharpoondownplus: "M399747 705c0 7.3 6.7 11 20 11 8 0 13-.8\n 15-2.5s4.7-6.8 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3\n 8.5-5.8 9.5-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3\n-64.7 57-92 95-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 435v40h399900v-40z\nm0-194v40h400000v-40zm0 0v40h400000v-40z",
	righthook: "M399859 241c-764 0 0 0 0 0 40-3.3 68.7-15.7 86-37 10-12 15-25.3\n 15-40 0-22.7-9.8-40.7-29.5-54-19.7-13.3-43.5-21-71.5-23-17.3-1.3-26-8-26-20 0\n-13.3 8.7-20 26-20 38 0 71 11.2 99 33.5 0 0 7 5.6 21 16.7 14 11.2 21 33.5 21\n 66.8s-14 61.2-42 83.5c-28 22.3-61 33.5-99 33.5L0 241z M0 281v-40h399859v40z",
	rightlinesegment: doubleBrushStroke("M399960 241 V94 h40 V428 h-40 V281 H0 v-40z"),
	rightbracketunder: doubleBrushStroke("M399995 0 h-120 V290 H0 v120 H400000z"),
	rightbracketover: doubleBrushStroke("M399995 440 h-120 V150 H0 v-120 H399995z"),
	rightToFrom: "M400000 167c-70.7-42-118-97.7-142-167h-23c-15.3 0-23 .3-23\n 1 0 1.3 5.3 13.7 16 37 18 35.3 41.3 69 70 101l7 8H0v40h399905l-7 8c-28.7 32\n-52 65.7-70 101-10.7 23.3-16 35.7-16 37 0 .7 7.7 1 23 1h23c24-69.3 71.3-125 142\n-167z M100 147v40h399900v-40zM0 341v40h399900v-40z",
	twoheadleftarrow: "M0 167c68 40\n 115.7 95.7 143 167h22c15.3 0 23-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69\n-70-101l-7-8h125l9 7c50.7 39.3 85 86 103 140h46c0-4.7-6.3-18.7-19-42-18-35.3\n-40-67.3-66-96l-9-9h399716v-40H284l9-9c26-28.7 48-60.7 66-96 12.7-23.333 19\n-37.333 19-42h-46c-18 54-52.3 100.7-103 140l-9 7H95l7-8c28.7-32 52-65.7 70-101\n 10.7-23.333 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 71.3 68 127 0 167z",
	twoheadrightarrow: "M400000 167\nc-68-40-115.7-95.7-143-167h-22c-15.3 0-23 .3-23 1 0 1.3 5.3 13.7 16 37 18 35.3\n 41.3 69 70 101l7 8h-125l-9-7c-50.7-39.3-85-86-103-140h-46c0 4.7 6.3 18.7 19 42\n 18 35.3 40 67.3 66 96l9 9H0v40h399716l-9 9c-26 28.7-48 60.7-66 96-12.7 23.333\n-19 37.333-19 42h46c18-54 52.3-100.7 103-140l9-7h125l-7 8c-28.7 32-52 65.7-70\n 101-10.7 23.333-16 35.7-16 37 0 .7 7.7 1 23 1h22c27.3-71.3 75-127 143-167z",
	tilde1: "M200 55.538c-77 0-168 73.953-177 73.953-3 0-7\n-2.175-9-5.437L2 97c-1-2-2-4-2-6 0-4 2-7 5-9l20-12C116 12 171 0 207 0c86 0\n 114 68 191 68 78 0 168-68 177-68 4 0 7 2 9 5l12 19c1 2.175 2 4.35 2 6.525 0\n 4.35-2 7.613-5 9.788l-19 13.05c-92 63.077-116.937 75.308-183 76.128\n-68.267.847-113-73.952-191-73.952z",
	tilde2: "M344 55.266c-142 0-300.638 81.316-311.5 86.418\n-8.01 3.762-22.5 10.91-23.5 5.562L1 120c-1-2-1-3-1-4 0-5 3-9 8-10l18.4-9C160.9\n 31.9 283 0 358 0c148 0 188 122 331 122s314-97 326-97c4 0 8 2 10 7l7 21.114\nc1 2.14 1 3.21 1 4.28 0 5.347-3 9.626-7 10.696l-22.3 12.622C852.6 158.372 751\n 181.476 676 181.476c-149 0-189-126.21-332-126.21z",
	tilde3: "M786 59C457 59 32 175.242 13 175.242c-6 0-10-3.457\n-11-10.37L.15 138c-1-7 3-12 10-13l19.2-6.4C378.4 40.7 634.3 0 804.3 0c337 0\n 411.8 157 746.8 157 328 0 754-112 773-112 5 0 10 3 11 9l1 14.075c1 8.066-.697\n 16.595-6.697 17.492l-21.052 7.31c-367.9 98.146-609.15 122.696-778.15 122.696\n -338 0-409-156.573-744-156.573z",
	tilde4: "M786 58C457 58 32 177.487 13 177.487c-6 0-10-3.345\n-11-10.035L.15 143c-1-7 3-12 10-13l22-6.7C381.2 35 637.15 0 807.15 0c337 0 409\n 177 744 177 328 0 754-127 773-127 5 0 10 3 11 9l1 14.794c1 7.805-3 13.38-9\n 14.495l-20.7 5.574c-366.85 99.79-607.3 139.372-776.3 139.372-338 0-409\n -175.236-744-175.236z",
	vec: "M377 20c0-5.333 1.833-10 5.5-14S391 0 397 0c4.667 0 8.667 1.667 12 5\n3.333 2.667 6.667 9 10 19 6.667 24.667 20.333 43.667 41 57 7.333 4.667 11\n10.667 11 18 0 6-1 10-3 12s-6.667 5-14 9c-28.667 14.667-53.667 35.667-75 63\n-1.333 1.333-3.167 3.5-5.5 6.5s-4 4.833-5 5.5c-1 .667-2.5 1.333-4.5 2s-4.333 1\n-7 1c-4.667 0-9.167-1.833-13.5-5.5S337 184 337 178c0-12.667 15.667-32.333 47-59\nH213l-171-1c-8.667-6-13-12.333-13-19 0-4.667 4.333-11.333 13-20h359\nc-16-25.333-24-45-24-59z",
	widehat1: "M529 0h5l519 115c5 1 9 5 9 10 0 1-1 2-1 3l-4 22\nc-1 5-5 9-11 9h-2L532 67 19 159h-2c-5 0-9-4-11-9l-5-22c-1-6 2-12 8-13z",
	widehat2: "M1181 0h2l1171 176c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 220h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
	widehat3: "M1181 0h2l1171 236c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 280h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
	widehat4: "M1181 0h2l1171 296c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 340h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
	widecheck1: "M529,159h5l519,-115c5,-1,9,-5,9,-10c0,-1,-1,-2,-1,-3l-4,-22c-1,\n-5,-5,-9,-11,-9h-2l-512,92l-513,-92h-2c-5,0,-9,4,-11,9l-5,22c-1,6,2,12,8,13z",
	widecheck2: "M1181,220h2l1171,-176c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,153l-1167,-153h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
	widecheck3: "M1181,280h2l1171,-236c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,213l-1167,-213h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
	widecheck4: "M1181,340h2l1171,-296c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,273l-1167,-273h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
	baraboveleftarrow: "M400000 620h-399890l3 -3c68.7 -52.7 113.7 -120 135 -202\nc4 -14.7 6 -23 6 -25c0 -7.3 -7 -11 -21 -11c-8 0 -13.2 0.8 -15.5 2.5\nc-2.3 1.7 -4.2 5.8 -5.5 12.5c-1.3 4.7 -2.7 10.3 -4 17c-12 48.7 -34.8 92 -68.5 130\ns-74.2 66.3 -121.5 85c-10 4 -16 7.7 -18 11c0 8.7 6 14.3 18 17c47.3 18.7 87.8 47\n121.5 85s56.5 81.3 68.5 130c0.7 2 1.3 5 2 9s1.2 6.7 1.5 8c0.3 1.3 1 3.3 2 6\ns2.2 4.5 3.5 5.5c1.3 1 3.3 1.8 6 2.5s6 1 10 1c14 0 21 -3.7 21 -11\nc0 -2 -2 -10.3 -6 -25c-20 -79.3 -65 -146.7 -135 -202l-3 -3h399890z\nM100 620v40h399900v-40z M0 241v40h399900v-40zM0 241v40h399900v-40z",
	rightarrowabovebar: "M0 241v40h399891c-47.3 35.3-84 78-110 128-16.7 32\n-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20 11 8 0\n13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7 39\n-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85-40.5\n-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n151.7 139 205zm96 379h399894v40H0zm0 0h399904v40H0z",
	baraboveshortleftharpoon: "M507,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17\nc2,0.7,5,1,9,1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21\nc-32,-87.3,-82.7,-157.7,-152,-211c0,0,-3,-3,-3,-3l399351,0l0,-40\nc-398570,0,-399437,0,-399437,0z M593 435 v40 H399500 v-40z\nM0 281 v-40 H399908 v40z M0 281 v-40 H399908 v40z",
	rightharpoonaboveshortbar: "M0,241 l0,40c399126,0,399993,0,399993,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM0 241 v40 H399908 v-40z M0 475 v-40 H399500 v40z M0 475 v-40 H399500 v40z",
	shortbaraboveleftharpoon: "M7,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17c2,0.7,5,1,9,\n1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21c-32,-87.3,-82.7,-157.7,\n-152,-211c0,0,-3,-3,-3,-3l399907,0l0,-40c-399126,0,-399993,0,-399993,0z\nM93 435 v40 H400000 v-40z M500 241 v40 H400000 v-40z M500 241 v40 H400000 v-40z",
	shortrightharpoonabovebar: "M53,241l0,40c398570,0,399437,0,399437,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM500 241 v40 H399408 v-40z M500 435 v40 H400000 v-40z"
};
var tallDelim = function tallDelim(label, midHeight) {
	switch (label) {
		case "lbrack": return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v1759 v84 h347 v-84\nH403z M403 1759 V0 H319 V1759 v" + midHeight + " v1759 v84 h84z";
		case "rbrack": return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v1759 H0 v84 H347z\nM347 1759 V0 H263 V1759 v" + midHeight + " v1759 h84z";
		case "vert": return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z";
		case "doublevert": return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z\nM367 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M410 15 H367 v585 v" + midHeight + " v585 h43z";
		case "lfloor": return "M319 602 V0 H403 V602 v" + midHeight + " v1715 h263 v84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";
		case "rfloor": return "M319 602 V0 H403 V602 v" + midHeight + " v1799 H0 v-84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";
		case "lceil": return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v602 h84z\nM403 1759 V0 H319 V1759 v" + midHeight + " v602 h84z";
		case "rceil": return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v602 h84z\nM347 1759 V0 h-84 V1759 v" + midHeight + " v602 h84z";
		case "lparen": return "M863,9c0,-2,-2,-5,-6,-9c0,0,-17,0,-17,0c-12.7,0,-19.3,0.3,-20,1\nc-5.3,5.3,-10.3,11,-15,17c-242.7,294.7,-395.3,682,-458,1162c-21.3,163.3,-33.3,349,\n-36,557 l0," + (midHeight + 84) + "c0.2,6,0,26,0,60c2,159.3,10,310.7,24,454c53.3,528,210,\n949.7,470,1265c4.7,6,9.7,11.7,15,17c0.7,0.7,7,1,19,1c0,0,18,0,18,0c4,-4,6,-7,6,-9\nc0,-2.7,-3.3,-8.7,-10,-18c-135.3,-192.7,-235.5,-414.3,-300.5,-665c-65,-250.7,-102.5,\n-544.7,-112.5,-882c-2,-104,-3,-167,-3,-189\nl0,-" + (midHeight + 92) + "c0,-162.7,5.7,-314,17,-454c20.7,-272,63.7,-513,129,-723c65.3,\n-210,155.3,-396.3,270,-559c6.7,-9.3,10,-15.3,10,-18z";
		case "rparen": return "M76,0c-16.7,0,-25,3,-25,9c0,2,2,6.3,6,13c21.3,28.7,42.3,60.3,\n63,95c96.7,156.7,172.8,332.5,228.5,527.5c55.7,195,92.8,416.5,111.5,664.5\nc11.3,139.3,17,290.7,17,454c0,28,1.7,43,3.3,45l0," + (midHeight + 9) + "\nc-3,4,-3.3,16.7,-3.3,38c0,162,-5.7,313.7,-17,455c-18.7,248,-55.8,469.3,-111.5,664\nc-55.7,194.7,-131.8,370.3,-228.5,527c-20.7,34.7,-41.7,66.3,-63,95c-2,3.3,-4,7,-6,11\nc0,7.3,5.7,11,17,11c0,0,11,0,11,0c9.3,0,14.3,-0.3,15,-1c5.3,-5.3,10.3,-11,15,-17\nc242.7,-294.7,395.3,-681.7,458,-1161c21.3,-164.7,33.3,-350.7,36,-558\nl0,-" + (midHeight + 144) + "c-2,-159.3,-10,-310.7,-24,-454c-53.3,-528,-210,-949.7,\n-470,-1265c-4.7,-6,-9.7,-11.7,-15,-17c-0.7,-0.7,-6.7,-1,-18,-1z";
		default: throw new Error("Unknown stretchy delimiter.");
	}
};
function isMathDomNode(node) {
	return "toText" in node;
}
/**
* This node represents a document fragment, which contains elements, but when
* placed into the DOM doesn't have any representation itself. It only contains
* children and doesn't have any DOM node properties.
*/
var DocumentFragment = class {
	constructor(children) {
		this.children = void 0;
		this.classes = void 0;
		this.height = void 0;
		this.depth = void 0;
		this.maxFontSize = void 0;
		this.style = void 0;
		this.children = children;
		this.classes = [];
		this.height = 0;
		this.depth = 0;
		this.maxFontSize = 0;
		this.style = {};
	}
	hasClass(className) {
		return this.classes.includes(className);
	}
	/** Convert the fragment into a node. */
	toNode() {
		var frag = document.createDocumentFragment();
		for (var i = 0; i < this.children.length; i++) frag.appendChild(this.children[i].toNode());
		return frag;
	}
	/** Convert the fragment into HTML markup. */
	toMarkup() {
		var markup = "";
		for (var i = 0; i < this.children.length; i++) markup += this.children[i].toMarkup();
		return markup;
	}
	/**
	* Converts the math node into a string, similar to innerText. Applies to
	* MathDomNode's only.
	*/
	toText() {
		return this.children.map((child) => {
			if (isMathDomNode(child)) return child.toText();
			throw new Error("Expected MathDomNode with toText, got " + child.constructor.name);
		}).join("");
	}
};
/**
* This file does conversion between units.  In particular, it provides
* calculateSize to convert other units into ems.
*/
var ptPerUnit = {
	"pt": 1,
	"mm": 7227 / 2540,
	"cm": 7227 / 254,
	"in": 72.27,
	"bp": 803 / 800,
	"pc": 12,
	"dd": 1238 / 1157,
	"cc": 14856 / 1157,
	"nd": 685 / 642,
	"nc": 1370 / 107,
	"sp": 1 / 65536,
	"px": 803 / 800
};
var relativeUnit = {
	"ex": true,
	"em": true,
	"mu": true
};
/**
* Determine whether the specified unit (either a string defining the unit
* or a "size" parse node containing a unit field) is valid.
*/
var validUnit = function validUnit(unit) {
	if (typeof unit !== "string") unit = unit.unit;
	return unit in ptPerUnit || unit in relativeUnit || unit === "ex";
};
var calculateSize = function calculateSize(sizeValue, options) {
	var scale;
	if (sizeValue.unit in ptPerUnit) scale = ptPerUnit[sizeValue.unit] / options.fontMetrics().ptPerEm / options.sizeMultiplier;
	else if (sizeValue.unit === "mu") scale = options.fontMetrics().cssEmPerMu;
	else {
		var unitOptions;
		if (options.style.isTight()) unitOptions = options.havingStyle(options.style.text());
		else unitOptions = options;
		if (sizeValue.unit === "ex") scale = unitOptions.fontMetrics().xHeight;
		else if (sizeValue.unit === "em") scale = unitOptions.fontMetrics().quad;
		else throw new ParseError("Invalid unit: '" + sizeValue.unit + "'");
		if (unitOptions !== options) scale *= unitOptions.sizeMultiplier / options.sizeMultiplier;
	}
	return Math.min(sizeValue.number * scale, options.maxSize);
};
/**
* Round `n` to 4 decimal places, or to the nearest 1/10,000th em. See
* https://github.com/KaTeX/KaTeX/pull/2460.
*/
var makeEm = function makeEm(n) {
	return +n.toFixed(4) + "em";
};
/**
* These objects store the data about the DOM nodes we create, as well as some
* extra data. They can then be transformed into real DOM nodes with the
* `toNode` function or HTML markup using `toMarkup`. They are useful for both
* storing extra properties on the nodes, as well as providing a way to easily
* work with the DOM.
*
* Similar functions for working with MathML nodes exist in mathMLTree.js.
*
* TODO: refactor `span` and `anchor` into common superclass when
* target environments support class inheritance
*/
/**
* Create an HTML className based on a list of classes. In addition to joining
* with spaces, we also remove empty classes.
*/
var createClass = function createClass(classes) {
	return classes.filter((cls) => cls).join(" ");
};
/**
* Serialize a CssStyle object into a semicolon-delimited inline-style string
* (hyphenating camelCase property names). Returns "" when no property is set.
*/
var cssStyleToString = function cssStyleToString(style) {
	var styles = "";
	for (var key of Object.keys(style)) {
		var value = style[key];
		if (value !== void 0) styles += hyphenate(key) + ":" + value + ";";
	}
	return styles;
};
var initNode = function initNode(classes, options, style) {
	this.classes = classes || [];
	this.attributes = {};
	this.height = 0;
	this.depth = 0;
	this.maxFontSize = 0;
	this.style = style || {};
	if (options) {
		if (options.style.isTight()) this.classes.push("mtight");
		var color = options.getColor();
		if (color) this.style.color = color;
	}
};
/**
* Convert into an HTML node
*/
var toNode = function toNode(tagName) {
	var node = document.createElement(tagName);
	node.className = createClass(this.classes);
	Object.assign(node.style, this.style);
	for (var attr of Object.keys(this.attributes)) node.setAttribute(attr, this.attributes[attr]);
	for (var i = 0; i < this.children.length; i++) node.appendChild(this.children[i].toNode());
	return node;
};
/**
* https://w3c.github.io/html-reference/syntax.html#syntax-attributes
*
* > Attribute Names must consist of one or more characters
* other than the space characters, U+0000 NULL,
* '"', "'", ">", "/", "=", the control characters,
* and any characters that are not defined by Unicode.
*/
var invalidAttributeNameRegex = /[\s"'>/=\x00-\x1f]/;
/**
* Convert into an HTML markup string
*/
var toMarkup = function toMarkup(tagName) {
	var markup = "<" + tagName;
	if (this.classes.length) markup += " class=\"" + escape(createClass(this.classes)) + "\"";
	var styles = cssStyleToString(this.style);
	if (styles) markup += " style=\"" + escape(styles) + "\"";
	for (var attr of Object.keys(this.attributes)) {
		if (invalidAttributeNameRegex.test(attr)) throw new ParseError("Invalid attribute name '" + attr + "'");
		markup += " " + attr + "=\"" + escape(this.attributes[attr]) + "\"";
	}
	markup += ">";
	for (var i = 0; i < this.children.length; i++) markup += this.children[i].toMarkup();
	markup += "</" + tagName + ">";
	return markup;
};
/**
* This node represents a span node, with a className, a list of children, and
* an inline style. It also contains information about its height, depth, and
* maxFontSize.
*
* Represents two types with different uses: SvgSpan to wrap an SVG and DomSpan
* otherwise. This typesafety is important when HTML builders access a span's
* children.
*/
var Span = class {
	constructor(classes, children, options, style) {
		this.children = void 0;
		this.attributes = void 0;
		this.classes = void 0;
		this.height = void 0;
		this.depth = void 0;
		this.width = void 0;
		this.maxFontSize = void 0;
		this.style = void 0;
		/**
		* Italic correction carried over from a SymbolNode when the symbol is
		* wrapped in a vlist (e.g. \oiint / \oiiint).  Read by supsub to adjust
		* subscript positioning.  Only set when nonzero; use `?? 0` at read sites.
		*/
		this.italic = void 0;
		initNode.call(this, classes, options, style);
		this.children = children || [];
	}
	/**
	* Sets an arbitrary attribute on the span. Warning: use this wisely. Not
	* all browsers support attributes the same, and having too many custom
	* attributes is probably bad.
	*/
	setAttribute(attribute, value) {
		this.attributes[attribute] = value;
	}
	hasClass(className) {
		return this.classes.includes(className);
	}
	toNode() {
		return toNode.call(this, "span");
	}
	toMarkup() {
		return toMarkup.call(this, "span");
	}
};
/**
* This node represents an anchor (<a>) element with a hyperlink.  See `span`
* for further details.
*/
var Anchor = class {
	constructor(href, classes, children, options) {
		this.children = void 0;
		this.attributes = void 0;
		this.classes = void 0;
		this.height = void 0;
		this.depth = void 0;
		this.maxFontSize = void 0;
		this.style = void 0;
		initNode.call(this, classes, options);
		this.children = children || [];
		this.setAttribute("href", href);
	}
	setAttribute(attribute, value) {
		this.attributes[attribute] = value;
	}
	hasClass(className) {
		return this.classes.includes(className);
	}
	toNode() {
		return toNode.call(this, "a");
	}
	toMarkup() {
		return toMarkup.call(this, "a");
	}
};
/**
* This node represents an image embed (<img>) element.
*/
var Img = class {
	constructor(src, alt, style) {
		this.src = void 0;
		this.alt = void 0;
		this.classes = void 0;
		this.height = void 0;
		this.depth = void 0;
		this.maxFontSize = void 0;
		this.style = void 0;
		this.alt = alt;
		this.src = src;
		this.classes = ["mord"];
		this.height = 0;
		this.depth = 0;
		this.maxFontSize = 0;
		this.style = style;
	}
	hasClass(className) {
		return this.classes.includes(className);
	}
	toNode() {
		var node = document.createElement("img");
		node.src = this.src;
		node.alt = this.alt;
		node.className = "mord";
		Object.assign(node.style, this.style);
		return node;
	}
	toMarkup() {
		var markup = "<img src=\"" + escape(this.src) + "\"" + (" alt=\"" + escape(this.alt) + "\"");
		var styles = cssStyleToString(this.style);
		if (styles) markup += " style=\"" + escape(styles) + "\"";
		markup += "'/>";
		return markup;
	}
};
var iCombinations = {
	"î": "ı̂",
	"ï": "ı̈",
	"í": "ı́",
	"ì": "ı̀"
};
/**
* A symbol node contains information about a single symbol. It either renders
* to a single text node, or a span with a single text node in it, depending on
* whether it has CSS classes, styles, or needs italic correction.
*/
var SymbolNode = class {
	constructor(text, height, depth, italic, skew, width, classes, style) {
		this.text = void 0;
		this.height = void 0;
		this.depth = void 0;
		this.italic = void 0;
		this.skew = void 0;
		this.width = void 0;
		this.maxFontSize = void 0;
		this.classes = void 0;
		this.style = void 0;
		this.text = text;
		this.height = height || 0;
		this.depth = depth || 0;
		this.italic = italic || 0;
		this.skew = skew || 0;
		this.width = width || 0;
		this.classes = classes || [];
		this.style = style || {};
		this.maxFontSize = 0;
		var script = scriptFromCodepoint(this.text.charCodeAt(0));
		if (script) this.classes.push(script + "_fallback");
		if (/[îïíì]/.test(this.text)) this.text = iCombinations[this.text];
	}
	hasClass(className) {
		return this.classes.includes(className);
	}
	/**
	* Creates a text node or span from a symbol node. Note that a span is only
	* created if it is needed.
	*/
	toNode() {
		var node = document.createTextNode(this.text);
		var span = null;
		if (this.italic > 0) {
			span = document.createElement("span");
			span.style.marginRight = makeEm(this.italic);
		}
		if (this.classes.length > 0) {
			span = span || document.createElement("span");
			span.className = createClass(this.classes);
		}
		if (Object.keys(this.style).length > 0) {
			span = span || document.createElement("span");
			Object.assign(span.style, this.style);
		}
		if (span) {
			span.appendChild(node);
			return span;
		} else return node;
	}
	/**
	* Creates markup for a symbol node.
	*/
	toMarkup() {
		var needsSpan = false;
		var markup = "<span";
		if (this.classes.length) {
			needsSpan = true;
			markup += " class=\"";
			markup += escape(createClass(this.classes));
			markup += "\"";
		}
		var styles = "";
		if (this.italic > 0) styles += "margin-right:" + makeEm(this.italic) + ";";
		styles += cssStyleToString(this.style);
		if (styles) {
			needsSpan = true;
			markup += " style=\"" + escape(styles) + "\"";
		}
		var escaped = escape(this.text);
		if (needsSpan) {
			markup += ">";
			markup += escaped;
			markup += "</span>";
			return markup;
		} else return escaped;
	}
};
/**
* SVG nodes are used to render stretchy wide elements.
*/
var SvgNode = class {
	constructor(children, attributes) {
		this.children = void 0;
		this.attributes = void 0;
		this.children = children || [];
		this.attributes = attributes || {};
	}
	toNode() {
		var node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		for (var attr of Object.keys(this.attributes)) node.setAttribute(attr, this.attributes[attr]);
		for (var i = 0; i < this.children.length; i++) node.appendChild(this.children[i].toNode());
		return node;
	}
	toMarkup() {
		var markup = "<svg xmlns=\"http://www.w3.org/2000/svg\"";
		for (var attr of Object.keys(this.attributes)) markup += " " + attr + "=\"" + escape(this.attributes[attr]) + "\"";
		markup += ">";
		for (var i = 0; i < this.children.length; i++) markup += this.children[i].toMarkup();
		markup += "</svg>";
		return markup;
	}
};
var PathNode = class {
	constructor(pathName, alternate) {
		this.pathName = void 0;
		this.alternate = void 0;
		this.pathName = pathName;
		this.alternate = alternate;
	}
	toNode() {
		var node = document.createElementNS("http://www.w3.org/2000/svg", "path");
		if (this.alternate) node.setAttribute("d", this.alternate);
		else node.setAttribute("d", path[this.pathName]);
		return node;
	}
	toMarkup() {
		if (this.alternate) return "<path d=\"" + escape(this.alternate) + "\"/>";
		else return "<path d=\"" + escape(path[this.pathName]) + "\"/>";
	}
};
var LineNode = class {
	constructor(attributes) {
		this.attributes = void 0;
		this.attributes = attributes || {};
	}
	toNode() {
		var node = document.createElementNS("http://www.w3.org/2000/svg", "line");
		for (var attr of Object.keys(this.attributes)) node.setAttribute(attr, this.attributes[attr]);
		return node;
	}
	toMarkup() {
		var markup = "<line";
		for (var attr of Object.keys(this.attributes)) markup += " " + attr + "=\"" + escape(this.attributes[attr]) + "\"";
		markup += "/>";
		return markup;
	}
};
function assertSymbolDomNode(group) {
	if (group instanceof SymbolNode) return group;
	else throw new Error("Expected symbolNode but got " + String(group) + ".");
}
function assertSpan(group) {
	if (group instanceof Span) return group;
	else throw new Error("Expected span<HtmlDomNode> but got " + String(group) + ".");
}
/**
* Whether an HtmlDomNode has HtmlDomNode children.
* HtmlDomNode is a base type representing a union of
* SymbolNode, SvgSpan, DomSpan, Anchor, and documentFragment.
* In the last three cases, the children are HtmlDomNode[].
*/
var hasHtmlDomChildren = (node) => node instanceof Span || node instanceof Anchor || node instanceof DocumentFragment;
var fontMetricsData = {
	"AMS-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"65": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"66": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"67": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"68": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"69": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"70": [
			0,
			.68889,
			0,
			0,
			.61111
		],
		"71": [
			0,
			.68889,
			0,
			0,
			.77778
		],
		"72": [
			0,
			.68889,
			0,
			0,
			.77778
		],
		"73": [
			0,
			.68889,
			0,
			0,
			.38889
		],
		"74": [
			.16667,
			.68889,
			0,
			0,
			.5
		],
		"75": [
			0,
			.68889,
			0,
			0,
			.77778
		],
		"76": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"77": [
			0,
			.68889,
			0,
			0,
			.94445
		],
		"78": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"79": [
			.16667,
			.68889,
			0,
			0,
			.77778
		],
		"80": [
			0,
			.68889,
			0,
			0,
			.61111
		],
		"81": [
			.16667,
			.68889,
			0,
			0,
			.77778
		],
		"82": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"83": [
			0,
			.68889,
			0,
			0,
			.55556
		],
		"84": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"85": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"86": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"87": [
			0,
			.68889,
			0,
			0,
			1
		],
		"88": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"89": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"90": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"107": [
			0,
			.68889,
			0,
			0,
			.55556
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"165": [
			0,
			.675,
			.025,
			0,
			.75
		],
		"174": [
			.15559,
			.69224,
			0,
			0,
			.94666
		],
		"240": [
			0,
			.68889,
			0,
			0,
			.55556
		],
		"295": [
			0,
			.68889,
			0,
			0,
			.54028
		],
		"710": [
			0,
			.825,
			0,
			0,
			2.33334
		],
		"732": [
			0,
			.9,
			0,
			0,
			2.33334
		],
		"770": [
			0,
			.825,
			0,
			0,
			2.33334
		],
		"771": [
			0,
			.9,
			0,
			0,
			2.33334
		],
		"989": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"1008": [
			0,
			.43056,
			.04028,
			0,
			.66667
		],
		"8245": [
			0,
			.54986,
			0,
			0,
			.275
		],
		"8463": [
			0,
			.68889,
			0,
			0,
			.54028
		],
		"8487": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"8498": [
			0,
			.68889,
			0,
			0,
			.55556
		],
		"8502": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"8503": [
			0,
			.68889,
			0,
			0,
			.44445
		],
		"8504": [
			0,
			.68889,
			0,
			0,
			.66667
		],
		"8513": [
			0,
			.68889,
			0,
			0,
			.63889
		],
		"8592": [
			-.03598,
			.46402,
			0,
			0,
			.5
		],
		"8594": [
			-.03598,
			.46402,
			0,
			0,
			.5
		],
		"8602": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8603": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8606": [
			.01354,
			.52239,
			0,
			0,
			1
		],
		"8608": [
			.01354,
			.52239,
			0,
			0,
			1
		],
		"8610": [
			.01354,
			.52239,
			0,
			0,
			1.11111
		],
		"8611": [
			.01354,
			.52239,
			0,
			0,
			1.11111
		],
		"8619": [
			0,
			.54986,
			0,
			0,
			1
		],
		"8620": [
			0,
			.54986,
			0,
			0,
			1
		],
		"8621": [
			-.13313,
			.37788,
			0,
			0,
			1.38889
		],
		"8622": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8624": [
			0,
			.69224,
			0,
			0,
			.5
		],
		"8625": [
			0,
			.69224,
			0,
			0,
			.5
		],
		"8630": [
			0,
			.43056,
			0,
			0,
			1
		],
		"8631": [
			0,
			.43056,
			0,
			0,
			1
		],
		"8634": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8635": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8638": [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		"8639": [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		"8642": [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		"8643": [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		"8644": [
			.1808,
			.675,
			0,
			0,
			1
		],
		"8646": [
			.1808,
			.675,
			0,
			0,
			1
		],
		"8647": [
			.1808,
			.675,
			0,
			0,
			1
		],
		"8648": [
			.19444,
			.69224,
			0,
			0,
			.83334
		],
		"8649": [
			.1808,
			.675,
			0,
			0,
			1
		],
		"8650": [
			.19444,
			.69224,
			0,
			0,
			.83334
		],
		"8651": [
			.01354,
			.52239,
			0,
			0,
			1
		],
		"8652": [
			.01354,
			.52239,
			0,
			0,
			1
		],
		"8653": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8654": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8655": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8666": [
			.13667,
			.63667,
			0,
			0,
			1
		],
		"8667": [
			.13667,
			.63667,
			0,
			0,
			1
		],
		"8669": [
			-.13313,
			.37788,
			0,
			0,
			1
		],
		"8672": [
			-.064,
			.437,
			0,
			0,
			1.334
		],
		"8674": [
			-.064,
			.437,
			0,
			0,
			1.334
		],
		"8705": [
			0,
			.825,
			0,
			0,
			.5
		],
		"8708": [
			0,
			.68889,
			0,
			0,
			.55556
		],
		"8709": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"8717": [
			0,
			.43056,
			0,
			0,
			.42917
		],
		"8722": [
			-.03598,
			.46402,
			0,
			0,
			.5
		],
		"8724": [
			.08198,
			.69224,
			0,
			0,
			.77778
		],
		"8726": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"8733": [
			0,
			.69224,
			0,
			0,
			.77778
		],
		"8736": [
			0,
			.69224,
			0,
			0,
			.72222
		],
		"8737": [
			0,
			.69224,
			0,
			0,
			.72222
		],
		"8738": [
			.03517,
			.52239,
			0,
			0,
			.72222
		],
		"8739": [
			.08167,
			.58167,
			0,
			0,
			.22222
		],
		"8740": [
			.25142,
			.74111,
			0,
			0,
			.27778
		],
		"8741": [
			.08167,
			.58167,
			0,
			0,
			.38889
		],
		"8742": [
			.25142,
			.74111,
			0,
			0,
			.5
		],
		"8756": [
			0,
			.69224,
			0,
			0,
			.66667
		],
		"8757": [
			0,
			.69224,
			0,
			0,
			.66667
		],
		"8764": [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		"8765": [
			-.13313,
			.37788,
			0,
			0,
			.77778
		],
		"8769": [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		"8770": [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		"8774": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8776": [
			-.01688,
			.48312,
			0,
			0,
			.77778
		],
		"8778": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"8782": [
			.06062,
			.54986,
			0,
			0,
			.77778
		],
		"8783": [
			.06062,
			.54986,
			0,
			0,
			.77778
		],
		"8785": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8786": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8787": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8790": [
			0,
			.69224,
			0,
			0,
			.77778
		],
		"8791": [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		"8796": [
			.08198,
			.91667,
			0,
			0,
			.77778
		],
		"8806": [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		"8807": [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		"8808": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"8809": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"8812": [
			.25583,
			.75583,
			0,
			0,
			.5
		],
		"8814": [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		"8815": [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		"8816": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8817": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8818": [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		"8819": [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		"8822": [
			.1808,
			.675,
			0,
			0,
			.77778
		],
		"8823": [
			.1808,
			.675,
			0,
			0,
			.77778
		],
		"8828": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"8829": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"8830": [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		"8831": [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		"8832": [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		"8833": [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		"8840": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8841": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8842": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8843": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8847": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"8848": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"8858": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8859": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8861": [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		"8862": [
			0,
			.675,
			0,
			0,
			.77778
		],
		"8863": [
			0,
			.675,
			0,
			0,
			.77778
		],
		"8864": [
			0,
			.675,
			0,
			0,
			.77778
		],
		"8865": [
			0,
			.675,
			0,
			0,
			.77778
		],
		"8872": [
			0,
			.69224,
			0,
			0,
			.61111
		],
		"8873": [
			0,
			.69224,
			0,
			0,
			.72222
		],
		"8874": [
			0,
			.69224,
			0,
			0,
			.88889
		],
		"8876": [
			0,
			.68889,
			0,
			0,
			.61111
		],
		"8877": [
			0,
			.68889,
			0,
			0,
			.61111
		],
		"8878": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"8879": [
			0,
			.68889,
			0,
			0,
			.72222
		],
		"8882": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"8883": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"8884": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"8885": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"8888": [
			0,
			.54986,
			0,
			0,
			1.11111
		],
		"8890": [
			.19444,
			.43056,
			0,
			0,
			.55556
		],
		"8891": [
			.19444,
			.69224,
			0,
			0,
			.61111
		],
		"8892": [
			.19444,
			.69224,
			0,
			0,
			.61111
		],
		"8901": [
			0,
			.54986,
			0,
			0,
			.27778
		],
		"8903": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"8905": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"8906": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"8907": [
			0,
			.69224,
			0,
			0,
			.77778
		],
		"8908": [
			0,
			.69224,
			0,
			0,
			.77778
		],
		"8909": [
			-.03598,
			.46402,
			0,
			0,
			.77778
		],
		"8910": [
			0,
			.54986,
			0,
			0,
			.76042
		],
		"8911": [
			0,
			.54986,
			0,
			0,
			.76042
		],
		"8912": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"8913": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"8914": [
			0,
			.54986,
			0,
			0,
			.66667
		],
		"8915": [
			0,
			.54986,
			0,
			0,
			.66667
		],
		"8916": [
			0,
			.69224,
			0,
			0,
			.66667
		],
		"8918": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"8919": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"8920": [
			.03517,
			.54986,
			0,
			0,
			1.33334
		],
		"8921": [
			.03517,
			.54986,
			0,
			0,
			1.33334
		],
		"8922": [
			.38569,
			.88569,
			0,
			0,
			.77778
		],
		"8923": [
			.38569,
			.88569,
			0,
			0,
			.77778
		],
		"8926": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"8927": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"8928": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8929": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8934": [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		"8935": [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		"8936": [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		"8937": [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		"8938": [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		"8939": [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		"8940": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8941": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"8994": [
			.19444,
			.69224,
			0,
			0,
			.77778
		],
		"8995": [
			.19444,
			.69224,
			0,
			0,
			.77778
		],
		"9416": [
			.15559,
			.69224,
			0,
			0,
			.90222
		],
		"9484": [
			0,
			.69224,
			0,
			0,
			.5
		],
		"9488": [
			0,
			.69224,
			0,
			0,
			.5
		],
		"9492": [
			0,
			.37788,
			0,
			0,
			.5
		],
		"9496": [
			0,
			.37788,
			0,
			0,
			.5
		],
		"9585": [
			.19444,
			.68889,
			0,
			0,
			.88889
		],
		"9586": [
			.19444,
			.74111,
			0,
			0,
			.88889
		],
		"9632": [
			0,
			.675,
			0,
			0,
			.77778
		],
		"9633": [
			0,
			.675,
			0,
			0,
			.77778
		],
		"9650": [
			0,
			.54986,
			0,
			0,
			.72222
		],
		"9651": [
			0,
			.54986,
			0,
			0,
			.72222
		],
		"9654": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"9660": [
			0,
			.54986,
			0,
			0,
			.72222
		],
		"9661": [
			0,
			.54986,
			0,
			0,
			.72222
		],
		"9664": [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		"9674": [
			.11111,
			.69224,
			0,
			0,
			.66667
		],
		"9733": [
			.19444,
			.69224,
			0,
			0,
			.94445
		],
		"10003": [
			0,
			.69224,
			0,
			0,
			.83334
		],
		"10016": [
			0,
			.69224,
			0,
			0,
			.83334
		],
		"10731": [
			.11111,
			.69224,
			0,
			0,
			.66667
		],
		"10846": [
			.19444,
			.75583,
			0,
			0,
			.61111
		],
		"10877": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"10878": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"10885": [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		"10886": [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		"10887": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"10888": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"10889": [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		"10890": [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		"10891": [
			.48256,
			.98256,
			0,
			0,
			.77778
		],
		"10892": [
			.48256,
			.98256,
			0,
			0,
			.77778
		],
		"10901": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"10902": [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		"10933": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"10934": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"10935": [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		"10936": [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		"10937": [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		"10938": [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		"10949": [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		"10950": [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		"10955": [
			.28481,
			.79383,
			0,
			0,
			.77778
		],
		"10956": [
			.28481,
			.79383,
			0,
			0,
			.77778
		],
		"57350": [
			.08167,
			.58167,
			0,
			0,
			.22222
		],
		"57351": [
			.08167,
			.58167,
			0,
			0,
			.38889
		],
		"57352": [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		"57353": [
			0,
			.43056,
			.04028,
			0,
			.66667
		],
		"57356": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"57357": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"57358": [
			.41951,
			.91951,
			0,
			0,
			.77778
		],
		"57359": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"57360": [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		"57361": [
			.41951,
			.91951,
			0,
			0,
			.77778
		],
		"57366": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"57367": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"57368": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"57369": [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		"57370": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"57371": [
			.13597,
			.63597,
			0,
			0,
			.77778
		]
	},
	"Caligraphic-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"65": [
			0,
			.68333,
			0,
			.19445,
			.79847
		],
		"66": [
			0,
			.68333,
			.03041,
			.13889,
			.65681
		],
		"67": [
			0,
			.68333,
			.05834,
			.13889,
			.52653
		],
		"68": [
			0,
			.68333,
			.02778,
			.08334,
			.77139
		],
		"69": [
			0,
			.68333,
			.08944,
			.11111,
			.52778
		],
		"70": [
			0,
			.68333,
			.09931,
			.11111,
			.71875
		],
		"71": [
			.09722,
			.68333,
			.0593,
			.11111,
			.59487
		],
		"72": [
			0,
			.68333,
			.00965,
			.11111,
			.84452
		],
		"73": [
			0,
			.68333,
			.07382,
			0,
			.54452
		],
		"74": [
			.09722,
			.68333,
			.18472,
			.16667,
			.67778
		],
		"75": [
			0,
			.68333,
			.01445,
			.05556,
			.76195
		],
		"76": [
			0,
			.68333,
			0,
			.13889,
			.68972
		],
		"77": [
			0,
			.68333,
			0,
			.13889,
			1.2009
		],
		"78": [
			0,
			.68333,
			.14736,
			.08334,
			.82049
		],
		"79": [
			0,
			.68333,
			.02778,
			.11111,
			.79611
		],
		"80": [
			0,
			.68333,
			.08222,
			.08334,
			.69556
		],
		"81": [
			.09722,
			.68333,
			0,
			.11111,
			.81667
		],
		"82": [
			0,
			.68333,
			0,
			.08334,
			.8475
		],
		"83": [
			0,
			.68333,
			.075,
			.13889,
			.60556
		],
		"84": [
			0,
			.68333,
			.25417,
			0,
			.54464
		],
		"85": [
			0,
			.68333,
			.09931,
			.08334,
			.62583
		],
		"86": [
			0,
			.68333,
			.08222,
			0,
			.61278
		],
		"87": [
			0,
			.68333,
			.08222,
			.08334,
			.98778
		],
		"88": [
			0,
			.68333,
			.14643,
			.13889,
			.7133
		],
		"89": [
			.09722,
			.68333,
			.08222,
			.08334,
			.66834
		],
		"90": [
			0,
			.68333,
			.07944,
			.13889,
			.72473
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		]
	},
	"Fraktur-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69141,
			0,
			0,
			.29574
		],
		"34": [
			0,
			.69141,
			0,
			0,
			.21471
		],
		"38": [
			0,
			.69141,
			0,
			0,
			.73786
		],
		"39": [
			0,
			.69141,
			0,
			0,
			.21201
		],
		"40": [
			.24982,
			.74947,
			0,
			0,
			.38865
		],
		"41": [
			.24982,
			.74947,
			0,
			0,
			.38865
		],
		"42": [
			0,
			.62119,
			0,
			0,
			.27764
		],
		"43": [
			.08319,
			.58283,
			0,
			0,
			.75623
		],
		"44": [
			0,
			.10803,
			0,
			0,
			.27764
		],
		"45": [
			.08319,
			.58283,
			0,
			0,
			.75623
		],
		"46": [
			0,
			.10803,
			0,
			0,
			.27764
		],
		"47": [
			.24982,
			.74947,
			0,
			0,
			.50181
		],
		"48": [
			0,
			.47534,
			0,
			0,
			.50181
		],
		"49": [
			0,
			.47534,
			0,
			0,
			.50181
		],
		"50": [
			0,
			.47534,
			0,
			0,
			.50181
		],
		"51": [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		"52": [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		"53": [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		"54": [
			0,
			.69141,
			0,
			0,
			.50181
		],
		"55": [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		"56": [
			0,
			.69141,
			0,
			0,
			.50181
		],
		"57": [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		"58": [
			0,
			.47534,
			0,
			0,
			.21606
		],
		"59": [
			.12604,
			.47534,
			0,
			0,
			.21606
		],
		"61": [
			-.13099,
			.36866,
			0,
			0,
			.75623
		],
		"63": [
			0,
			.69141,
			0,
			0,
			.36245
		],
		"65": [
			0,
			.69141,
			0,
			0,
			.7176
		],
		"66": [
			0,
			.69141,
			0,
			0,
			.88397
		],
		"67": [
			0,
			.69141,
			0,
			0,
			.61254
		],
		"68": [
			0,
			.69141,
			0,
			0,
			.83158
		],
		"69": [
			0,
			.69141,
			0,
			0,
			.66278
		],
		"70": [
			.12604,
			.69141,
			0,
			0,
			.61119
		],
		"71": [
			0,
			.69141,
			0,
			0,
			.78539
		],
		"72": [
			.06302,
			.69141,
			0,
			0,
			.7203
		],
		"73": [
			0,
			.69141,
			0,
			0,
			.55448
		],
		"74": [
			.12604,
			.69141,
			0,
			0,
			.55231
		],
		"75": [
			0,
			.69141,
			0,
			0,
			.66845
		],
		"76": [
			0,
			.69141,
			0,
			0,
			.66602
		],
		"77": [
			0,
			.69141,
			0,
			0,
			1.04953
		],
		"78": [
			0,
			.69141,
			0,
			0,
			.83212
		],
		"79": [
			0,
			.69141,
			0,
			0,
			.82699
		],
		"80": [
			.18906,
			.69141,
			0,
			0,
			.82753
		],
		"81": [
			.03781,
			.69141,
			0,
			0,
			.82699
		],
		"82": [
			0,
			.69141,
			0,
			0,
			.82807
		],
		"83": [
			0,
			.69141,
			0,
			0,
			.82861
		],
		"84": [
			0,
			.69141,
			0,
			0,
			.66899
		],
		"85": [
			0,
			.69141,
			0,
			0,
			.64576
		],
		"86": [
			0,
			.69141,
			0,
			0,
			.83131
		],
		"87": [
			0,
			.69141,
			0,
			0,
			1.04602
		],
		"88": [
			0,
			.69141,
			0,
			0,
			.71922
		],
		"89": [
			.18906,
			.69141,
			0,
			0,
			.83293
		],
		"90": [
			.12604,
			.69141,
			0,
			0,
			.60201
		],
		"91": [
			.24982,
			.74947,
			0,
			0,
			.27764
		],
		"93": [
			.24982,
			.74947,
			0,
			0,
			.27764
		],
		"94": [
			0,
			.69141,
			0,
			0,
			.49965
		],
		"97": [
			0,
			.47534,
			0,
			0,
			.50046
		],
		"98": [
			0,
			.69141,
			0,
			0,
			.51315
		],
		"99": [
			0,
			.47534,
			0,
			0,
			.38946
		],
		"100": [
			0,
			.62119,
			0,
			0,
			.49857
		],
		"101": [
			0,
			.47534,
			0,
			0,
			.40053
		],
		"102": [
			.18906,
			.69141,
			0,
			0,
			.32626
		],
		"103": [
			.18906,
			.47534,
			0,
			0,
			.5037
		],
		"104": [
			.18906,
			.69141,
			0,
			0,
			.52126
		],
		"105": [
			0,
			.69141,
			0,
			0,
			.27899
		],
		"106": [
			0,
			.69141,
			0,
			0,
			.28088
		],
		"107": [
			0,
			.69141,
			0,
			0,
			.38946
		],
		"108": [
			0,
			.69141,
			0,
			0,
			.27953
		],
		"109": [
			0,
			.47534,
			0,
			0,
			.76676
		],
		"110": [
			0,
			.47534,
			0,
			0,
			.52666
		],
		"111": [
			0,
			.47534,
			0,
			0,
			.48885
		],
		"112": [
			.18906,
			.52396,
			0,
			0,
			.50046
		],
		"113": [
			.18906,
			.47534,
			0,
			0,
			.48912
		],
		"114": [
			0,
			.47534,
			0,
			0,
			.38919
		],
		"115": [
			0,
			.47534,
			0,
			0,
			.44266
		],
		"116": [
			0,
			.62119,
			0,
			0,
			.33301
		],
		"117": [
			0,
			.47534,
			0,
			0,
			.5172
		],
		"118": [
			0,
			.52396,
			0,
			0,
			.5118
		],
		"119": [
			0,
			.52396,
			0,
			0,
			.77351
		],
		"120": [
			.18906,
			.47534,
			0,
			0,
			.38865
		],
		"121": [
			.18906,
			.47534,
			0,
			0,
			.49884
		],
		"122": [
			.18906,
			.47534,
			0,
			0,
			.39054
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"8216": [
			0,
			.69141,
			0,
			0,
			.21471
		],
		"8217": [
			0,
			.69141,
			0,
			0,
			.21471
		],
		"58112": [
			0,
			.62119,
			0,
			0,
			.49749
		],
		"58113": [
			0,
			.62119,
			0,
			0,
			.4983
		],
		"58114": [
			.18906,
			.69141,
			0,
			0,
			.33328
		],
		"58115": [
			.18906,
			.69141,
			0,
			0,
			.32923
		],
		"58116": [
			.18906,
			.47534,
			0,
			0,
			.50343
		],
		"58117": [
			0,
			.69141,
			0,
			0,
			.33301
		],
		"58118": [
			0,
			.62119,
			0,
			0,
			.33409
		],
		"58119": [
			0,
			.47534,
			0,
			0,
			.50073
		]
	},
	"Main-Bold": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			0,
			0,
			.35
		],
		"34": [
			0,
			.69444,
			0,
			0,
			.60278
		],
		"35": [
			.19444,
			.69444,
			0,
			0,
			.95833
		],
		"36": [
			.05556,
			.75,
			0,
			0,
			.575
		],
		"37": [
			.05556,
			.75,
			0,
			0,
			.95833
		],
		"38": [
			0,
			.69444,
			0,
			0,
			.89444
		],
		"39": [
			0,
			.69444,
			0,
			0,
			.31944
		],
		"40": [
			.25,
			.75,
			0,
			0,
			.44722
		],
		"41": [
			.25,
			.75,
			0,
			0,
			.44722
		],
		"42": [
			0,
			.75,
			0,
			0,
			.575
		],
		"43": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"44": [
			.19444,
			.15556,
			0,
			0,
			.31944
		],
		"45": [
			0,
			.44444,
			0,
			0,
			.38333
		],
		"46": [
			0,
			.15556,
			0,
			0,
			.31944
		],
		"47": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"48": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"49": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"50": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"51": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"52": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"53": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"54": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"55": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"56": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"57": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"58": [
			0,
			.44444,
			0,
			0,
			.31944
		],
		"59": [
			.19444,
			.44444,
			0,
			0,
			.31944
		],
		"60": [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		"61": [
			-.10889,
			.39111,
			0,
			0,
			.89444
		],
		"62": [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		"63": [
			0,
			.69444,
			0,
			0,
			.54305
		],
		"64": [
			0,
			.69444,
			0,
			0,
			.89444
		],
		"65": [
			0,
			.68611,
			0,
			0,
			.86944
		],
		"66": [
			0,
			.68611,
			0,
			0,
			.81805
		],
		"67": [
			0,
			.68611,
			0,
			0,
			.83055
		],
		"68": [
			0,
			.68611,
			0,
			0,
			.88194
		],
		"69": [
			0,
			.68611,
			0,
			0,
			.75555
		],
		"70": [
			0,
			.68611,
			0,
			0,
			.72361
		],
		"71": [
			0,
			.68611,
			0,
			0,
			.90416
		],
		"72": [
			0,
			.68611,
			0,
			0,
			.9
		],
		"73": [
			0,
			.68611,
			0,
			0,
			.43611
		],
		"74": [
			0,
			.68611,
			0,
			0,
			.59444
		],
		"75": [
			0,
			.68611,
			0,
			0,
			.90138
		],
		"76": [
			0,
			.68611,
			0,
			0,
			.69166
		],
		"77": [
			0,
			.68611,
			0,
			0,
			1.09166
		],
		"78": [
			0,
			.68611,
			0,
			0,
			.9
		],
		"79": [
			0,
			.68611,
			0,
			0,
			.86388
		],
		"80": [
			0,
			.68611,
			0,
			0,
			.78611
		],
		"81": [
			.19444,
			.68611,
			0,
			0,
			.86388
		],
		"82": [
			0,
			.68611,
			0,
			0,
			.8625
		],
		"83": [
			0,
			.68611,
			0,
			0,
			.63889
		],
		"84": [
			0,
			.68611,
			0,
			0,
			.8
		],
		"85": [
			0,
			.68611,
			0,
			0,
			.88472
		],
		"86": [
			0,
			.68611,
			.01597,
			0,
			.86944
		],
		"87": [
			0,
			.68611,
			.01597,
			0,
			1.18888
		],
		"88": [
			0,
			.68611,
			0,
			0,
			.86944
		],
		"89": [
			0,
			.68611,
			.02875,
			0,
			.86944
		],
		"90": [
			0,
			.68611,
			0,
			0,
			.70277
		],
		"91": [
			.25,
			.75,
			0,
			0,
			.31944
		],
		"92": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"93": [
			.25,
			.75,
			0,
			0,
			.31944
		],
		"94": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"95": [
			.31,
			.13444,
			.03194,
			0,
			.575
		],
		"97": [
			0,
			.44444,
			0,
			0,
			.55902
		],
		"98": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"99": [
			0,
			.44444,
			0,
			0,
			.51111
		],
		"100": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"101": [
			0,
			.44444,
			0,
			0,
			.52708
		],
		"102": [
			0,
			.69444,
			.10903,
			0,
			.35139
		],
		"103": [
			.19444,
			.44444,
			.01597,
			0,
			.575
		],
		"104": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"105": [
			0,
			.69444,
			0,
			0,
			.31944
		],
		"106": [
			.19444,
			.69444,
			0,
			0,
			.35139
		],
		"107": [
			0,
			.69444,
			0,
			0,
			.60694
		],
		"108": [
			0,
			.69444,
			0,
			0,
			.31944
		],
		"109": [
			0,
			.44444,
			0,
			0,
			.95833
		],
		"110": [
			0,
			.44444,
			0,
			0,
			.63889
		],
		"111": [
			0,
			.44444,
			0,
			0,
			.575
		],
		"112": [
			.19444,
			.44444,
			0,
			0,
			.63889
		],
		"113": [
			.19444,
			.44444,
			0,
			0,
			.60694
		],
		"114": [
			0,
			.44444,
			0,
			0,
			.47361
		],
		"115": [
			0,
			.44444,
			0,
			0,
			.45361
		],
		"116": [
			0,
			.63492,
			0,
			0,
			.44722
		],
		"117": [
			0,
			.44444,
			0,
			0,
			.63889
		],
		"118": [
			0,
			.44444,
			.01597,
			0,
			.60694
		],
		"119": [
			0,
			.44444,
			.01597,
			0,
			.83055
		],
		"120": [
			0,
			.44444,
			0,
			0,
			.60694
		],
		"121": [
			.19444,
			.44444,
			.01597,
			0,
			.60694
		],
		"122": [
			0,
			.44444,
			0,
			0,
			.51111
		],
		"123": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"124": [
			.25,
			.75,
			0,
			0,
			.31944
		],
		"125": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"126": [
			.35,
			.34444,
			0,
			0,
			.575
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"163": [
			0,
			.69444,
			0,
			0,
			.86853
		],
		"168": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"172": [
			0,
			.44444,
			0,
			0,
			.76666
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.86944
		],
		"177": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.51111
		],
		"198": [
			0,
			.68611,
			0,
			0,
			1.04166
		],
		"215": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"216": [
			.04861,
			.73472,
			0,
			0,
			.89444
		],
		"223": [
			0,
			.69444,
			0,
			0,
			.59722
		],
		"230": [
			0,
			.44444,
			0,
			0,
			.83055
		],
		"247": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"248": [
			.09722,
			.54167,
			0,
			0,
			.575
		],
		"305": [
			0,
			.44444,
			0,
			0,
			.31944
		],
		"338": [
			0,
			.68611,
			0,
			0,
			1.16944
		],
		"339": [
			0,
			.44444,
			0,
			0,
			.89444
		],
		"567": [
			.19444,
			.44444,
			0,
			0,
			.35139
		],
		"710": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"711": [
			0,
			.63194,
			0,
			0,
			.575
		],
		"713": [
			0,
			.59611,
			0,
			0,
			.575
		],
		"714": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"715": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"728": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"729": [
			0,
			.69444,
			0,
			0,
			.31944
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.86944
		],
		"732": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"733": [
			0,
			.69444,
			0,
			0,
			.575
		],
		"915": [
			0,
			.68611,
			0,
			0,
			.69166
		],
		"916": [
			0,
			.68611,
			0,
			0,
			.95833
		],
		"920": [
			0,
			.68611,
			0,
			0,
			.89444
		],
		"923": [
			0,
			.68611,
			0,
			0,
			.80555
		],
		"926": [
			0,
			.68611,
			0,
			0,
			.76666
		],
		"928": [
			0,
			.68611,
			0,
			0,
			.9
		],
		"931": [
			0,
			.68611,
			0,
			0,
			.83055
		],
		"933": [
			0,
			.68611,
			0,
			0,
			.89444
		],
		"934": [
			0,
			.68611,
			0,
			0,
			.83055
		],
		"936": [
			0,
			.68611,
			0,
			0,
			.89444
		],
		"937": [
			0,
			.68611,
			0,
			0,
			.83055
		],
		"8211": [
			0,
			.44444,
			.03194,
			0,
			.575
		],
		"8212": [
			0,
			.44444,
			.03194,
			0,
			1.14999
		],
		"8216": [
			0,
			.69444,
			0,
			0,
			.31944
		],
		"8217": [
			0,
			.69444,
			0,
			0,
			.31944
		],
		"8220": [
			0,
			.69444,
			0,
			0,
			.60278
		],
		"8221": [
			0,
			.69444,
			0,
			0,
			.60278
		],
		"8224": [
			.19444,
			.69444,
			0,
			0,
			.51111
		],
		"8225": [
			.19444,
			.69444,
			0,
			0,
			.51111
		],
		"8242": [
			0,
			.55556,
			0,
			0,
			.34444
		],
		"8407": [
			0,
			.72444,
			.15486,
			0,
			.575
		],
		"8463": [
			0,
			.69444,
			0,
			0,
			.66759
		],
		"8465": [
			0,
			.69444,
			0,
			0,
			.83055
		],
		"8467": [
			0,
			.69444,
			0,
			0,
			.47361
		],
		"8472": [
			.19444,
			.44444,
			0,
			0,
			.74027
		],
		"8476": [
			0,
			.69444,
			0,
			0,
			.83055
		],
		"8501": [
			0,
			.69444,
			0,
			0,
			.70277
		],
		"8592": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8593": [
			.19444,
			.69444,
			0,
			0,
			.575
		],
		"8594": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8595": [
			.19444,
			.69444,
			0,
			0,
			.575
		],
		"8596": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8597": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"8598": [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		"8599": [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		"8600": [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		"8601": [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		"8636": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8637": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8640": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8641": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8656": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8657": [
			.19444,
			.69444,
			0,
			0,
			.70277
		],
		"8658": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8659": [
			.19444,
			.69444,
			0,
			0,
			.70277
		],
		"8660": [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		"8661": [
			.25,
			.75,
			0,
			0,
			.70277
		],
		"8704": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"8706": [
			0,
			.69444,
			.06389,
			0,
			.62847
		],
		"8707": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"8709": [
			.05556,
			.75,
			0,
			0,
			.575
		],
		"8711": [
			0,
			.68611,
			0,
			0,
			.95833
		],
		"8712": [
			.08556,
			.58556,
			0,
			0,
			.76666
		],
		"8715": [
			.08556,
			.58556,
			0,
			0,
			.76666
		],
		"8722": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8723": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8725": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"8726": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"8727": [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		"8728": [
			-.02639,
			.47361,
			0,
			0,
			.575
		],
		"8729": [
			-.02639,
			.47361,
			0,
			0,
			.575
		],
		"8730": [
			.18,
			.82,
			0,
			0,
			.95833
		],
		"8733": [
			0,
			.44444,
			0,
			0,
			.89444
		],
		"8734": [
			0,
			.44444,
			0,
			0,
			1.14999
		],
		"8736": [
			0,
			.69224,
			0,
			0,
			.72222
		],
		"8739": [
			.25,
			.75,
			0,
			0,
			.31944
		],
		"8741": [
			.25,
			.75,
			0,
			0,
			.575
		],
		"8743": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8744": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8745": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8746": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8747": [
			.19444,
			.69444,
			.12778,
			0,
			.56875
		],
		"8764": [
			-.10889,
			.39111,
			0,
			0,
			.89444
		],
		"8768": [
			.19444,
			.69444,
			0,
			0,
			.31944
		],
		"8771": [
			.00222,
			.50222,
			0,
			0,
			.89444
		],
		"8773": [
			.027,
			.638,
			0,
			0,
			.894
		],
		"8776": [
			.02444,
			.52444,
			0,
			0,
			.89444
		],
		"8781": [
			.00222,
			.50222,
			0,
			0,
			.89444
		],
		"8801": [
			.00222,
			.50222,
			0,
			0,
			.89444
		],
		"8804": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"8805": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"8810": [
			.08556,
			.58556,
			0,
			0,
			1.14999
		],
		"8811": [
			.08556,
			.58556,
			0,
			0,
			1.14999
		],
		"8826": [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		"8827": [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		"8834": [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		"8835": [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		"8838": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"8839": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"8846": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8849": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"8850": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"8851": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8852": [
			0,
			.55556,
			0,
			0,
			.76666
		],
		"8853": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8854": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8855": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8856": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8857": [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		"8866": [
			0,
			.69444,
			0,
			0,
			.70277
		],
		"8867": [
			0,
			.69444,
			0,
			0,
			.70277
		],
		"8868": [
			0,
			.69444,
			0,
			0,
			.89444
		],
		"8869": [
			0,
			.69444,
			0,
			0,
			.89444
		],
		"8900": [
			-.02639,
			.47361,
			0,
			0,
			.575
		],
		"8901": [
			-.02639,
			.47361,
			0,
			0,
			.31944
		],
		"8902": [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		"8968": [
			.25,
			.75,
			0,
			0,
			.51111
		],
		"8969": [
			.25,
			.75,
			0,
			0,
			.51111
		],
		"8970": [
			.25,
			.75,
			0,
			0,
			.51111
		],
		"8971": [
			.25,
			.75,
			0,
			0,
			.51111
		],
		"8994": [
			-.13889,
			.36111,
			0,
			0,
			1.14999
		],
		"8995": [
			-.13889,
			.36111,
			0,
			0,
			1.14999
		],
		"9651": [
			.19444,
			.69444,
			0,
			0,
			1.02222
		],
		"9657": [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		"9661": [
			.19444,
			.69444,
			0,
			0,
			1.02222
		],
		"9667": [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		"9711": [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		"9824": [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		"9825": [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		"9826": [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		"9827": [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		"9837": [
			0,
			.75,
			0,
			0,
			.44722
		],
		"9838": [
			.19444,
			.69444,
			0,
			0,
			.44722
		],
		"9839": [
			.19444,
			.69444,
			0,
			0,
			.44722
		],
		"10216": [
			.25,
			.75,
			0,
			0,
			.44722
		],
		"10217": [
			.25,
			.75,
			0,
			0,
			.44722
		],
		"10815": [
			0,
			.68611,
			0,
			0,
			.9
		],
		"10927": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"10928": [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		"57376": [
			.19444,
			.69444,
			0,
			0,
			0
		]
	},
	"Main-BoldItalic": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			.11417,
			0,
			.38611
		],
		"34": [
			0,
			.69444,
			.07939,
			0,
			.62055
		],
		"35": [
			.19444,
			.69444,
			.06833,
			0,
			.94444
		],
		"37": [
			.05556,
			.75,
			.12861,
			0,
			.94444
		],
		"38": [
			0,
			.69444,
			.08528,
			0,
			.88555
		],
		"39": [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		"40": [
			.25,
			.75,
			.15806,
			0,
			.47333
		],
		"41": [
			.25,
			.75,
			.03306,
			0,
			.47333
		],
		"42": [
			0,
			.75,
			.14333,
			0,
			.59111
		],
		"43": [
			.10333,
			.60333,
			.03306,
			0,
			.88555
		],
		"44": [
			.19444,
			.14722,
			0,
			0,
			.35555
		],
		"45": [
			0,
			.44444,
			.02611,
			0,
			.41444
		],
		"46": [
			0,
			.14722,
			0,
			0,
			.35555
		],
		"47": [
			.25,
			.75,
			.15806,
			0,
			.59111
		],
		"48": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"49": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"50": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"51": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"52": [
			.19444,
			.64444,
			.13167,
			0,
			.59111
		],
		"53": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"54": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"55": [
			.19444,
			.64444,
			.13167,
			0,
			.59111
		],
		"56": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"57": [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		"58": [
			0,
			.44444,
			.06695,
			0,
			.35555
		],
		"59": [
			.19444,
			.44444,
			.06695,
			0,
			.35555
		],
		"61": [
			-.10889,
			.39111,
			.06833,
			0,
			.88555
		],
		"63": [
			0,
			.69444,
			.11472,
			0,
			.59111
		],
		"64": [
			0,
			.69444,
			.09208,
			0,
			.88555
		],
		"65": [
			0,
			.68611,
			0,
			0,
			.86555
		],
		"66": [
			0,
			.68611,
			.0992,
			0,
			.81666
		],
		"67": [
			0,
			.68611,
			.14208,
			0,
			.82666
		],
		"68": [
			0,
			.68611,
			.09062,
			0,
			.87555
		],
		"69": [
			0,
			.68611,
			.11431,
			0,
			.75666
		],
		"70": [
			0,
			.68611,
			.12903,
			0,
			.72722
		],
		"71": [
			0,
			.68611,
			.07347,
			0,
			.89527
		],
		"72": [
			0,
			.68611,
			.17208,
			0,
			.8961
		],
		"73": [
			0,
			.68611,
			.15681,
			0,
			.47166
		],
		"74": [
			0,
			.68611,
			.145,
			0,
			.61055
		],
		"75": [
			0,
			.68611,
			.14208,
			0,
			.89499
		],
		"76": [
			0,
			.68611,
			0,
			0,
			.69777
		],
		"77": [
			0,
			.68611,
			.17208,
			0,
			1.07277
		],
		"78": [
			0,
			.68611,
			.17208,
			0,
			.8961
		],
		"79": [
			0,
			.68611,
			.09062,
			0,
			.85499
		],
		"80": [
			0,
			.68611,
			.0992,
			0,
			.78721
		],
		"81": [
			.19444,
			.68611,
			.09062,
			0,
			.85499
		],
		"82": [
			0,
			.68611,
			.02559,
			0,
			.85944
		],
		"83": [
			0,
			.68611,
			.11264,
			0,
			.64999
		],
		"84": [
			0,
			.68611,
			.12903,
			0,
			.7961
		],
		"85": [
			0,
			.68611,
			.17208,
			0,
			.88083
		],
		"86": [
			0,
			.68611,
			.18625,
			0,
			.86555
		],
		"87": [
			0,
			.68611,
			.18625,
			0,
			1.15999
		],
		"88": [
			0,
			.68611,
			.15681,
			0,
			.86555
		],
		"89": [
			0,
			.68611,
			.19803,
			0,
			.86555
		],
		"90": [
			0,
			.68611,
			.14208,
			0,
			.70888
		],
		"91": [
			.25,
			.75,
			.1875,
			0,
			.35611
		],
		"93": [
			.25,
			.75,
			.09972,
			0,
			.35611
		],
		"94": [
			0,
			.69444,
			.06709,
			0,
			.59111
		],
		"95": [
			.31,
			.13444,
			.09811,
			0,
			.59111
		],
		"97": [
			0,
			.44444,
			.09426,
			0,
			.59111
		],
		"98": [
			0,
			.69444,
			.07861,
			0,
			.53222
		],
		"99": [
			0,
			.44444,
			.05222,
			0,
			.53222
		],
		"100": [
			0,
			.69444,
			.10861,
			0,
			.59111
		],
		"101": [
			0,
			.44444,
			.085,
			0,
			.53222
		],
		"102": [
			.19444,
			.69444,
			.21778,
			0,
			.4
		],
		"103": [
			.19444,
			.44444,
			.105,
			0,
			.53222
		],
		"104": [
			0,
			.69444,
			.09426,
			0,
			.59111
		],
		"105": [
			0,
			.69326,
			.11387,
			0,
			.35555
		],
		"106": [
			.19444,
			.69326,
			.1672,
			0,
			.35555
		],
		"107": [
			0,
			.69444,
			.11111,
			0,
			.53222
		],
		"108": [
			0,
			.69444,
			.10861,
			0,
			.29666
		],
		"109": [
			0,
			.44444,
			.09426,
			0,
			.94444
		],
		"110": [
			0,
			.44444,
			.09426,
			0,
			.64999
		],
		"111": [
			0,
			.44444,
			.07861,
			0,
			.59111
		],
		"112": [
			.19444,
			.44444,
			.07861,
			0,
			.59111
		],
		"113": [
			.19444,
			.44444,
			.105,
			0,
			.53222
		],
		"114": [
			0,
			.44444,
			.11111,
			0,
			.50167
		],
		"115": [
			0,
			.44444,
			.08167,
			0,
			.48694
		],
		"116": [
			0,
			.63492,
			.09639,
			0,
			.385
		],
		"117": [
			0,
			.44444,
			.09426,
			0,
			.62055
		],
		"118": [
			0,
			.44444,
			.11111,
			0,
			.53222
		],
		"119": [
			0,
			.44444,
			.11111,
			0,
			.76777
		],
		"120": [
			0,
			.44444,
			.12583,
			0,
			.56055
		],
		"121": [
			.19444,
			.44444,
			.105,
			0,
			.56166
		],
		"122": [
			0,
			.44444,
			.13889,
			0,
			.49055
		],
		"126": [
			.35,
			.34444,
			.11472,
			0,
			.59111
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"168": [
			0,
			.69444,
			.11473,
			0,
			.59111
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.94888
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.53222
		],
		"198": [
			0,
			.68611,
			.11431,
			0,
			1.02277
		],
		"216": [
			.04861,
			.73472,
			.09062,
			0,
			.88555
		],
		"223": [
			.19444,
			.69444,
			.09736,
			0,
			.665
		],
		"230": [
			0,
			.44444,
			.085,
			0,
			.82666
		],
		"248": [
			.09722,
			.54167,
			.09458,
			0,
			.59111
		],
		"305": [
			0,
			.44444,
			.09426,
			0,
			.35555
		],
		"338": [
			0,
			.68611,
			.11431,
			0,
			1.14054
		],
		"339": [
			0,
			.44444,
			.085,
			0,
			.82666
		],
		"567": [
			.19444,
			.44444,
			.04611,
			0,
			.385
		],
		"710": [
			0,
			.69444,
			.06709,
			0,
			.59111
		],
		"711": [
			0,
			.63194,
			.08271,
			0,
			.59111
		],
		"713": [
			0,
			.59444,
			.10444,
			0,
			.59111
		],
		"714": [
			0,
			.69444,
			.08528,
			0,
			.59111
		],
		"715": [
			0,
			.69444,
			0,
			0,
			.59111
		],
		"728": [
			0,
			.69444,
			.10333,
			0,
			.59111
		],
		"729": [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.94888
		],
		"732": [
			0,
			.69444,
			.11472,
			0,
			.59111
		],
		"733": [
			0,
			.69444,
			.11472,
			0,
			.59111
		],
		"915": [
			0,
			.68611,
			.12903,
			0,
			.69777
		],
		"916": [
			0,
			.68611,
			0,
			0,
			.94444
		],
		"920": [
			0,
			.68611,
			.09062,
			0,
			.88555
		],
		"923": [
			0,
			.68611,
			0,
			0,
			.80666
		],
		"926": [
			0,
			.68611,
			.15092,
			0,
			.76777
		],
		"928": [
			0,
			.68611,
			.17208,
			0,
			.8961
		],
		"931": [
			0,
			.68611,
			.11431,
			0,
			.82666
		],
		"933": [
			0,
			.68611,
			.10778,
			0,
			.88555
		],
		"934": [
			0,
			.68611,
			.05632,
			0,
			.82666
		],
		"936": [
			0,
			.68611,
			.10778,
			0,
			.88555
		],
		"937": [
			0,
			.68611,
			.0992,
			0,
			.82666
		],
		"8211": [
			0,
			.44444,
			.09811,
			0,
			.59111
		],
		"8212": [
			0,
			.44444,
			.09811,
			0,
			1.18221
		],
		"8216": [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		"8217": [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		"8220": [
			0,
			.69444,
			.16772,
			0,
			.62055
		],
		"8221": [
			0,
			.69444,
			.07939,
			0,
			.62055
		]
	},
	"Main-Italic": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		"34": [
			0,
			.69444,
			.06961,
			0,
			.51444
		],
		"35": [
			.19444,
			.69444,
			.06616,
			0,
			.81777
		],
		"37": [
			.05556,
			.75,
			.13639,
			0,
			.81777
		],
		"38": [
			0,
			.69444,
			.09694,
			0,
			.76666
		],
		"39": [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		"40": [
			.25,
			.75,
			.16194,
			0,
			.40889
		],
		"41": [
			.25,
			.75,
			.03694,
			0,
			.40889
		],
		"42": [
			0,
			.75,
			.14917,
			0,
			.51111
		],
		"43": [
			.05667,
			.56167,
			.03694,
			0,
			.76666
		],
		"44": [
			.19444,
			.10556,
			0,
			0,
			.30667
		],
		"45": [
			0,
			.43056,
			.02826,
			0,
			.35778
		],
		"46": [
			0,
			.10556,
			0,
			0,
			.30667
		],
		"47": [
			.25,
			.75,
			.16194,
			0,
			.51111
		],
		"48": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"49": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"50": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"51": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"52": [
			.19444,
			.64444,
			.13556,
			0,
			.51111
		],
		"53": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"54": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"55": [
			.19444,
			.64444,
			.13556,
			0,
			.51111
		],
		"56": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"57": [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		"58": [
			0,
			.43056,
			.0582,
			0,
			.30667
		],
		"59": [
			.19444,
			.43056,
			.0582,
			0,
			.30667
		],
		"61": [
			-.13313,
			.36687,
			.06616,
			0,
			.76666
		],
		"63": [
			0,
			.69444,
			.1225,
			0,
			.51111
		],
		"64": [
			0,
			.69444,
			.09597,
			0,
			.76666
		],
		"65": [
			0,
			.68333,
			0,
			0,
			.74333
		],
		"66": [
			0,
			.68333,
			.10257,
			0,
			.70389
		],
		"67": [
			0,
			.68333,
			.14528,
			0,
			.71555
		],
		"68": [
			0,
			.68333,
			.09403,
			0,
			.755
		],
		"69": [
			0,
			.68333,
			.12028,
			0,
			.67833
		],
		"70": [
			0,
			.68333,
			.13305,
			0,
			.65277
		],
		"71": [
			0,
			.68333,
			.08722,
			0,
			.77361
		],
		"72": [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		"73": [
			0,
			.68333,
			.15806,
			0,
			.38555
		],
		"74": [
			0,
			.68333,
			.14028,
			0,
			.525
		],
		"75": [
			0,
			.68333,
			.14528,
			0,
			.76888
		],
		"76": [
			0,
			.68333,
			0,
			0,
			.62722
		],
		"77": [
			0,
			.68333,
			.16389,
			0,
			.89666
		],
		"78": [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		"79": [
			0,
			.68333,
			.09403,
			0,
			.76666
		],
		"80": [
			0,
			.68333,
			.10257,
			0,
			.67833
		],
		"81": [
			.19444,
			.68333,
			.09403,
			0,
			.76666
		],
		"82": [
			0,
			.68333,
			.03868,
			0,
			.72944
		],
		"83": [
			0,
			.68333,
			.11972,
			0,
			.56222
		],
		"84": [
			0,
			.68333,
			.13305,
			0,
			.71555
		],
		"85": [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		"86": [
			0,
			.68333,
			.18361,
			0,
			.74333
		],
		"87": [
			0,
			.68333,
			.18361,
			0,
			.99888
		],
		"88": [
			0,
			.68333,
			.15806,
			0,
			.74333
		],
		"89": [
			0,
			.68333,
			.19383,
			0,
			.74333
		],
		"90": [
			0,
			.68333,
			.14528,
			0,
			.61333
		],
		"91": [
			.25,
			.75,
			.1875,
			0,
			.30667
		],
		"93": [
			.25,
			.75,
			.10528,
			0,
			.30667
		],
		"94": [
			0,
			.69444,
			.06646,
			0,
			.51111
		],
		"95": [
			.31,
			.12056,
			.09208,
			0,
			.51111
		],
		"97": [
			0,
			.43056,
			.07671,
			0,
			.51111
		],
		"98": [
			0,
			.69444,
			.06312,
			0,
			.46
		],
		"99": [
			0,
			.43056,
			.05653,
			0,
			.46
		],
		"100": [
			0,
			.69444,
			.10333,
			0,
			.51111
		],
		"101": [
			0,
			.43056,
			.07514,
			0,
			.46
		],
		"102": [
			.19444,
			.69444,
			.21194,
			0,
			.30667
		],
		"103": [
			.19444,
			.43056,
			.08847,
			0,
			.46
		],
		"104": [
			0,
			.69444,
			.07671,
			0,
			.51111
		],
		"105": [
			0,
			.65536,
			.1019,
			0,
			.30667
		],
		"106": [
			.19444,
			.65536,
			.14467,
			0,
			.30667
		],
		"107": [
			0,
			.69444,
			.10764,
			0,
			.46
		],
		"108": [
			0,
			.69444,
			.10333,
			0,
			.25555
		],
		"109": [
			0,
			.43056,
			.07671,
			0,
			.81777
		],
		"110": [
			0,
			.43056,
			.07671,
			0,
			.56222
		],
		"111": [
			0,
			.43056,
			.06312,
			0,
			.51111
		],
		"112": [
			.19444,
			.43056,
			.06312,
			0,
			.51111
		],
		"113": [
			.19444,
			.43056,
			.08847,
			0,
			.46
		],
		"114": [
			0,
			.43056,
			.10764,
			0,
			.42166
		],
		"115": [
			0,
			.43056,
			.08208,
			0,
			.40889
		],
		"116": [
			0,
			.61508,
			.09486,
			0,
			.33222
		],
		"117": [
			0,
			.43056,
			.07671,
			0,
			.53666
		],
		"118": [
			0,
			.43056,
			.10764,
			0,
			.46
		],
		"119": [
			0,
			.43056,
			.10764,
			0,
			.66444
		],
		"120": [
			0,
			.43056,
			.12042,
			0,
			.46389
		],
		"121": [
			.19444,
			.43056,
			.08847,
			0,
			.48555
		],
		"122": [
			0,
			.43056,
			.12292,
			0,
			.40889
		],
		"126": [
			.35,
			.31786,
			.11585,
			0,
			.51111
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"168": [
			0,
			.66786,
			.10474,
			0,
			.51111
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.83129
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.46
		],
		"198": [
			0,
			.68333,
			.12028,
			0,
			.88277
		],
		"216": [
			.04861,
			.73194,
			.09403,
			0,
			.76666
		],
		"223": [
			.19444,
			.69444,
			.10514,
			0,
			.53666
		],
		"230": [
			0,
			.43056,
			.07514,
			0,
			.71555
		],
		"248": [
			.09722,
			.52778,
			.09194,
			0,
			.51111
		],
		"338": [
			0,
			.68333,
			.12028,
			0,
			.98499
		],
		"339": [
			0,
			.43056,
			.07514,
			0,
			.71555
		],
		"710": [
			0,
			.69444,
			.06646,
			0,
			.51111
		],
		"711": [
			0,
			.62847,
			.08295,
			0,
			.51111
		],
		"713": [
			0,
			.56167,
			.10333,
			0,
			.51111
		],
		"714": [
			0,
			.69444,
			.09694,
			0,
			.51111
		],
		"715": [
			0,
			.69444,
			0,
			0,
			.51111
		],
		"728": [
			0,
			.69444,
			.10806,
			0,
			.51111
		],
		"729": [
			0,
			.66786,
			.11752,
			0,
			.30667
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.83129
		],
		"732": [
			0,
			.66786,
			.11585,
			0,
			.51111
		],
		"733": [
			0,
			.69444,
			.1225,
			0,
			.51111
		],
		"915": [
			0,
			.68333,
			.13305,
			0,
			.62722
		],
		"916": [
			0,
			.68333,
			0,
			0,
			.81777
		],
		"920": [
			0,
			.68333,
			.09403,
			0,
			.76666
		],
		"923": [
			0,
			.68333,
			0,
			0,
			.69222
		],
		"926": [
			0,
			.68333,
			.15294,
			0,
			.66444
		],
		"928": [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		"931": [
			0,
			.68333,
			.12028,
			0,
			.71555
		],
		"933": [
			0,
			.68333,
			.11111,
			0,
			.76666
		],
		"934": [
			0,
			.68333,
			.05986,
			0,
			.71555
		],
		"936": [
			0,
			.68333,
			.11111,
			0,
			.76666
		],
		"937": [
			0,
			.68333,
			.10257,
			0,
			.71555
		],
		"8211": [
			0,
			.43056,
			.09208,
			0,
			.51111
		],
		"8212": [
			0,
			.43056,
			.09208,
			0,
			1.02222
		],
		"8216": [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		"8217": [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		"8220": [
			0,
			.69444,
			.1685,
			0,
			.51444
		],
		"8221": [
			0,
			.69444,
			.06961,
			0,
			.51444
		],
		"8463": [
			0,
			.68889,
			0,
			0,
			.54028
		]
	},
	"Main-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"34": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"35": [
			.19444,
			.69444,
			0,
			0,
			.83334
		],
		"36": [
			.05556,
			.75,
			0,
			0,
			.5
		],
		"37": [
			.05556,
			.75,
			0,
			0,
			.83334
		],
		"38": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"39": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"40": [
			.25,
			.75,
			0,
			0,
			.38889
		],
		"41": [
			.25,
			.75,
			0,
			0,
			.38889
		],
		"42": [
			0,
			.75,
			0,
			0,
			.5
		],
		"43": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"44": [
			.19444,
			.10556,
			0,
			0,
			.27778
		],
		"45": [
			0,
			.43056,
			0,
			0,
			.33333
		],
		"46": [
			0,
			.10556,
			0,
			0,
			.27778
		],
		"47": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"48": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"49": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"50": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"51": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"52": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"53": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"54": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"55": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"56": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"57": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"58": [
			0,
			.43056,
			0,
			0,
			.27778
		],
		"59": [
			.19444,
			.43056,
			0,
			0,
			.27778
		],
		"60": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"61": [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		"62": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"63": [
			0,
			.69444,
			0,
			0,
			.47222
		],
		"64": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"65": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"66": [
			0,
			.68333,
			0,
			0,
			.70834
		],
		"67": [
			0,
			.68333,
			0,
			0,
			.72222
		],
		"68": [
			0,
			.68333,
			0,
			0,
			.76389
		],
		"69": [
			0,
			.68333,
			0,
			0,
			.68056
		],
		"70": [
			0,
			.68333,
			0,
			0,
			.65278
		],
		"71": [
			0,
			.68333,
			0,
			0,
			.78472
		],
		"72": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"73": [
			0,
			.68333,
			0,
			0,
			.36111
		],
		"74": [
			0,
			.68333,
			0,
			0,
			.51389
		],
		"75": [
			0,
			.68333,
			0,
			0,
			.77778
		],
		"76": [
			0,
			.68333,
			0,
			0,
			.625
		],
		"77": [
			0,
			.68333,
			0,
			0,
			.91667
		],
		"78": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"79": [
			0,
			.68333,
			0,
			0,
			.77778
		],
		"80": [
			0,
			.68333,
			0,
			0,
			.68056
		],
		"81": [
			.19444,
			.68333,
			0,
			0,
			.77778
		],
		"82": [
			0,
			.68333,
			0,
			0,
			.73611
		],
		"83": [
			0,
			.68333,
			0,
			0,
			.55556
		],
		"84": [
			0,
			.68333,
			0,
			0,
			.72222
		],
		"85": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"86": [
			0,
			.68333,
			.01389,
			0,
			.75
		],
		"87": [
			0,
			.68333,
			.01389,
			0,
			1.02778
		],
		"88": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"89": [
			0,
			.68333,
			.025,
			0,
			.75
		],
		"90": [
			0,
			.68333,
			0,
			0,
			.61111
		],
		"91": [
			.25,
			.75,
			0,
			0,
			.27778
		],
		"92": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"93": [
			.25,
			.75,
			0,
			0,
			.27778
		],
		"94": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"95": [
			.31,
			.12056,
			.02778,
			0,
			.5
		],
		"97": [
			0,
			.43056,
			0,
			0,
			.5
		],
		"98": [
			0,
			.69444,
			0,
			0,
			.55556
		],
		"99": [
			0,
			.43056,
			0,
			0,
			.44445
		],
		"100": [
			0,
			.69444,
			0,
			0,
			.55556
		],
		"101": [
			0,
			.43056,
			0,
			0,
			.44445
		],
		"102": [
			0,
			.69444,
			.07778,
			0,
			.30556
		],
		"103": [
			.19444,
			.43056,
			.01389,
			0,
			.5
		],
		"104": [
			0,
			.69444,
			0,
			0,
			.55556
		],
		"105": [
			0,
			.66786,
			0,
			0,
			.27778
		],
		"106": [
			.19444,
			.66786,
			0,
			0,
			.30556
		],
		"107": [
			0,
			.69444,
			0,
			0,
			.52778
		],
		"108": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"109": [
			0,
			.43056,
			0,
			0,
			.83334
		],
		"110": [
			0,
			.43056,
			0,
			0,
			.55556
		],
		"111": [
			0,
			.43056,
			0,
			0,
			.5
		],
		"112": [
			.19444,
			.43056,
			0,
			0,
			.55556
		],
		"113": [
			.19444,
			.43056,
			0,
			0,
			.52778
		],
		"114": [
			0,
			.43056,
			0,
			0,
			.39167
		],
		"115": [
			0,
			.43056,
			0,
			0,
			.39445
		],
		"116": [
			0,
			.61508,
			0,
			0,
			.38889
		],
		"117": [
			0,
			.43056,
			0,
			0,
			.55556
		],
		"118": [
			0,
			.43056,
			.01389,
			0,
			.52778
		],
		"119": [
			0,
			.43056,
			.01389,
			0,
			.72222
		],
		"120": [
			0,
			.43056,
			0,
			0,
			.52778
		],
		"121": [
			.19444,
			.43056,
			.01389,
			0,
			.52778
		],
		"122": [
			0,
			.43056,
			0,
			0,
			.44445
		],
		"123": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"124": [
			.25,
			.75,
			0,
			0,
			.27778
		],
		"125": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"126": [
			.35,
			.31786,
			0,
			0,
			.5
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"163": [
			0,
			.69444,
			0,
			0,
			.76909
		],
		"167": [
			.19444,
			.69444,
			0,
			0,
			.44445
		],
		"168": [
			0,
			.66786,
			0,
			0,
			.5
		],
		"172": [
			0,
			.43056,
			0,
			0,
			.66667
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.75
		],
		"177": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"182": [
			.19444,
			.69444,
			0,
			0,
			.61111
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.44445
		],
		"198": [
			0,
			.68333,
			0,
			0,
			.90278
		],
		"215": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"216": [
			.04861,
			.73194,
			0,
			0,
			.77778
		],
		"223": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"230": [
			0,
			.43056,
			0,
			0,
			.72222
		],
		"247": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"248": [
			.09722,
			.52778,
			0,
			0,
			.5
		],
		"305": [
			0,
			.43056,
			0,
			0,
			.27778
		],
		"338": [
			0,
			.68333,
			0,
			0,
			1.01389
		],
		"339": [
			0,
			.43056,
			0,
			0,
			.77778
		],
		"567": [
			.19444,
			.43056,
			0,
			0,
			.30556
		],
		"710": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"711": [
			0,
			.62847,
			0,
			0,
			.5
		],
		"713": [
			0,
			.56778,
			0,
			0,
			.5
		],
		"714": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"715": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"728": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"729": [
			0,
			.66786,
			0,
			0,
			.27778
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.75
		],
		"732": [
			0,
			.66786,
			0,
			0,
			.5
		],
		"733": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"915": [
			0,
			.68333,
			0,
			0,
			.625
		],
		"916": [
			0,
			.68333,
			0,
			0,
			.83334
		],
		"920": [
			0,
			.68333,
			0,
			0,
			.77778
		],
		"923": [
			0,
			.68333,
			0,
			0,
			.69445
		],
		"926": [
			0,
			.68333,
			0,
			0,
			.66667
		],
		"928": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"931": [
			0,
			.68333,
			0,
			0,
			.72222
		],
		"933": [
			0,
			.68333,
			0,
			0,
			.77778
		],
		"934": [
			0,
			.68333,
			0,
			0,
			.72222
		],
		"936": [
			0,
			.68333,
			0,
			0,
			.77778
		],
		"937": [
			0,
			.68333,
			0,
			0,
			.72222
		],
		"8211": [
			0,
			.43056,
			.02778,
			0,
			.5
		],
		"8212": [
			0,
			.43056,
			.02778,
			0,
			1
		],
		"8216": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"8217": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"8220": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"8221": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"8224": [
			.19444,
			.69444,
			0,
			0,
			.44445
		],
		"8225": [
			.19444,
			.69444,
			0,
			0,
			.44445
		],
		"8230": [
			0,
			.123,
			0,
			0,
			1.172
		],
		"8242": [
			0,
			.55556,
			0,
			0,
			.275
		],
		"8407": [
			0,
			.71444,
			.15382,
			0,
			.5
		],
		"8463": [
			0,
			.68889,
			0,
			0,
			.54028
		],
		"8465": [
			0,
			.69444,
			0,
			0,
			.72222
		],
		"8467": [
			0,
			.69444,
			0,
			.11111,
			.41667
		],
		"8472": [
			.19444,
			.43056,
			0,
			.11111,
			.63646
		],
		"8476": [
			0,
			.69444,
			0,
			0,
			.72222
		],
		"8501": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"8592": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8593": [
			.19444,
			.69444,
			0,
			0,
			.5
		],
		"8594": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8595": [
			.19444,
			.69444,
			0,
			0,
			.5
		],
		"8596": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8597": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"8598": [
			.19444,
			.69444,
			0,
			0,
			1
		],
		"8599": [
			.19444,
			.69444,
			0,
			0,
			1
		],
		"8600": [
			.19444,
			.69444,
			0,
			0,
			1
		],
		"8601": [
			.19444,
			.69444,
			0,
			0,
			1
		],
		"8614": [
			.011,
			.511,
			0,
			0,
			1
		],
		"8617": [
			.011,
			.511,
			0,
			0,
			1.126
		],
		"8618": [
			.011,
			.511,
			0,
			0,
			1.126
		],
		"8636": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8637": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8640": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8641": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8652": [
			.011,
			.671,
			0,
			0,
			1
		],
		"8656": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8657": [
			.19444,
			.69444,
			0,
			0,
			.61111
		],
		"8658": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8659": [
			.19444,
			.69444,
			0,
			0,
			.61111
		],
		"8660": [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		"8661": [
			.25,
			.75,
			0,
			0,
			.61111
		],
		"8704": [
			0,
			.69444,
			0,
			0,
			.55556
		],
		"8706": [
			0,
			.69444,
			.05556,
			.08334,
			.5309
		],
		"8707": [
			0,
			.69444,
			0,
			0,
			.55556
		],
		"8709": [
			.05556,
			.75,
			0,
			0,
			.5
		],
		"8711": [
			0,
			.68333,
			0,
			0,
			.83334
		],
		"8712": [
			.0391,
			.5391,
			0,
			0,
			.66667
		],
		"8715": [
			.0391,
			.5391,
			0,
			0,
			.66667
		],
		"8722": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8723": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8725": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"8726": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"8727": [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		"8728": [
			-.05555,
			.44445,
			0,
			0,
			.5
		],
		"8729": [
			-.05555,
			.44445,
			0,
			0,
			.5
		],
		"8730": [
			.2,
			.8,
			0,
			0,
			.83334
		],
		"8733": [
			0,
			.43056,
			0,
			0,
			.77778
		],
		"8734": [
			0,
			.43056,
			0,
			0,
			1
		],
		"8736": [
			0,
			.69224,
			0,
			0,
			.72222
		],
		"8739": [
			.25,
			.75,
			0,
			0,
			.27778
		],
		"8741": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"8743": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8744": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8745": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8746": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8747": [
			.19444,
			.69444,
			.11111,
			0,
			.41667
		],
		"8764": [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		"8768": [
			.19444,
			.69444,
			0,
			0,
			.27778
		],
		"8771": [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		"8773": [
			-.022,
			.589,
			0,
			0,
			.778
		],
		"8776": [
			-.01688,
			.48312,
			0,
			0,
			.77778
		],
		"8781": [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		"8784": [
			-.133,
			.673,
			0,
			0,
			.778
		],
		"8801": [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		"8804": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8805": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8810": [
			.0391,
			.5391,
			0,
			0,
			1
		],
		"8811": [
			.0391,
			.5391,
			0,
			0,
			1
		],
		"8826": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"8827": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"8834": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"8835": [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		"8838": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8839": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8846": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8849": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8850": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"8851": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8852": [
			0,
			.55556,
			0,
			0,
			.66667
		],
		"8853": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8854": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8855": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8856": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8857": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"8866": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"8867": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"8868": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"8869": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"8872": [
			.249,
			.75,
			0,
			0,
			.867
		],
		"8900": [
			-.05555,
			.44445,
			0,
			0,
			.5
		],
		"8901": [
			-.05555,
			.44445,
			0,
			0,
			.27778
		],
		"8902": [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		"8904": [
			.005,
			.505,
			0,
			0,
			.9
		],
		"8942": [
			.03,
			.903,
			0,
			0,
			.278
		],
		"8943": [
			-.19,
			.313,
			0,
			0,
			1.172
		],
		"8945": [
			-.1,
			.823,
			0,
			0,
			1.282
		],
		"8968": [
			.25,
			.75,
			0,
			0,
			.44445
		],
		"8969": [
			.25,
			.75,
			0,
			0,
			.44445
		],
		"8970": [
			.25,
			.75,
			0,
			0,
			.44445
		],
		"8971": [
			.25,
			.75,
			0,
			0,
			.44445
		],
		"8994": [
			-.14236,
			.35764,
			0,
			0,
			1
		],
		"8995": [
			-.14236,
			.35764,
			0,
			0,
			1
		],
		"9136": [
			.244,
			.744,
			0,
			0,
			.412
		],
		"9137": [
			.244,
			.745,
			0,
			0,
			.412
		],
		"9651": [
			.19444,
			.69444,
			0,
			0,
			.88889
		],
		"9657": [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		"9661": [
			.19444,
			.69444,
			0,
			0,
			.88889
		],
		"9667": [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		"9711": [
			.19444,
			.69444,
			0,
			0,
			1
		],
		"9824": [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		"9825": [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		"9826": [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		"9827": [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		"9837": [
			0,
			.75,
			0,
			0,
			.38889
		],
		"9838": [
			.19444,
			.69444,
			0,
			0,
			.38889
		],
		"9839": [
			.19444,
			.69444,
			0,
			0,
			.38889
		],
		"10216": [
			.25,
			.75,
			0,
			0,
			.38889
		],
		"10217": [
			.25,
			.75,
			0,
			0,
			.38889
		],
		"10222": [
			.244,
			.744,
			0,
			0,
			.412
		],
		"10223": [
			.244,
			.745,
			0,
			0,
			.412
		],
		"10229": [
			.011,
			.511,
			0,
			0,
			1.609
		],
		"10230": [
			.011,
			.511,
			0,
			0,
			1.638
		],
		"10231": [
			.011,
			.511,
			0,
			0,
			1.859
		],
		"10232": [
			.024,
			.525,
			0,
			0,
			1.609
		],
		"10233": [
			.024,
			.525,
			0,
			0,
			1.638
		],
		"10234": [
			.024,
			.525,
			0,
			0,
			1.858
		],
		"10236": [
			.011,
			.511,
			0,
			0,
			1.638
		],
		"10815": [
			0,
			.68333,
			0,
			0,
			.75
		],
		"10927": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"10928": [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		"57376": [
			.19444,
			.69444,
			0,
			0,
			0
		]
	},
	"Math-BoldItalic": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"48": [
			0,
			.44444,
			0,
			0,
			.575
		],
		"49": [
			0,
			.44444,
			0,
			0,
			.575
		],
		"50": [
			0,
			.44444,
			0,
			0,
			.575
		],
		"51": [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		"52": [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		"53": [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		"54": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"55": [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		"56": [
			0,
			.64444,
			0,
			0,
			.575
		],
		"57": [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		"65": [
			0,
			.68611,
			0,
			0,
			.86944
		],
		"66": [
			0,
			.68611,
			.04835,
			0,
			.8664
		],
		"67": [
			0,
			.68611,
			.06979,
			0,
			.81694
		],
		"68": [
			0,
			.68611,
			.03194,
			0,
			.93812
		],
		"69": [
			0,
			.68611,
			.05451,
			0,
			.81007
		],
		"70": [
			0,
			.68611,
			.15972,
			0,
			.68889
		],
		"71": [
			0,
			.68611,
			0,
			0,
			.88673
		],
		"72": [
			0,
			.68611,
			.08229,
			0,
			.98229
		],
		"73": [
			0,
			.68611,
			.07778,
			0,
			.51111
		],
		"74": [
			0,
			.68611,
			.10069,
			0,
			.63125
		],
		"75": [
			0,
			.68611,
			.06979,
			0,
			.97118
		],
		"76": [
			0,
			.68611,
			0,
			0,
			.75555
		],
		"77": [
			0,
			.68611,
			.11424,
			0,
			1.14201
		],
		"78": [
			0,
			.68611,
			.11424,
			0,
			.95034
		],
		"79": [
			0,
			.68611,
			.03194,
			0,
			.83666
		],
		"80": [
			0,
			.68611,
			.15972,
			0,
			.72309
		],
		"81": [
			.19444,
			.68611,
			0,
			0,
			.86861
		],
		"82": [
			0,
			.68611,
			.00421,
			0,
			.87235
		],
		"83": [
			0,
			.68611,
			.05382,
			0,
			.69271
		],
		"84": [
			0,
			.68611,
			.15972,
			0,
			.63663
		],
		"85": [
			0,
			.68611,
			.11424,
			0,
			.80027
		],
		"86": [
			0,
			.68611,
			.25555,
			0,
			.67778
		],
		"87": [
			0,
			.68611,
			.15972,
			0,
			1.09305
		],
		"88": [
			0,
			.68611,
			.07778,
			0,
			.94722
		],
		"89": [
			0,
			.68611,
			.25555,
			0,
			.67458
		],
		"90": [
			0,
			.68611,
			.06979,
			0,
			.77257
		],
		"97": [
			0,
			.44444,
			0,
			0,
			.63287
		],
		"98": [
			0,
			.69444,
			0,
			0,
			.52083
		],
		"99": [
			0,
			.44444,
			0,
			0,
			.51342
		],
		"100": [
			0,
			.69444,
			0,
			0,
			.60972
		],
		"101": [
			0,
			.44444,
			0,
			0,
			.55361
		],
		"102": [
			.19444,
			.69444,
			.11042,
			0,
			.56806
		],
		"103": [
			.19444,
			.44444,
			.03704,
			0,
			.5449
		],
		"104": [
			0,
			.69444,
			0,
			0,
			.66759
		],
		"105": [
			0,
			.69326,
			0,
			0,
			.4048
		],
		"106": [
			.19444,
			.69326,
			.0622,
			0,
			.47083
		],
		"107": [
			0,
			.69444,
			.01852,
			0,
			.6037
		],
		"108": [
			0,
			.69444,
			.0088,
			0,
			.34815
		],
		"109": [
			0,
			.44444,
			0,
			0,
			1.0324
		],
		"110": [
			0,
			.44444,
			0,
			0,
			.71296
		],
		"111": [
			0,
			.44444,
			0,
			0,
			.58472
		],
		"112": [
			.19444,
			.44444,
			0,
			0,
			.60092
		],
		"113": [
			.19444,
			.44444,
			.03704,
			0,
			.54213
		],
		"114": [
			0,
			.44444,
			.03194,
			0,
			.5287
		],
		"115": [
			0,
			.44444,
			0,
			0,
			.53125
		],
		"116": [
			0,
			.63492,
			0,
			0,
			.41528
		],
		"117": [
			0,
			.44444,
			0,
			0,
			.68102
		],
		"118": [
			0,
			.44444,
			.03704,
			0,
			.56666
		],
		"119": [
			0,
			.44444,
			.02778,
			0,
			.83148
		],
		"120": [
			0,
			.44444,
			0,
			0,
			.65903
		],
		"121": [
			.19444,
			.44444,
			.03704,
			0,
			.59028
		],
		"122": [
			0,
			.44444,
			.04213,
			0,
			.55509
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"915": [
			0,
			.68611,
			.15972,
			0,
			.65694
		],
		"916": [
			0,
			.68611,
			0,
			0,
			.95833
		],
		"920": [
			0,
			.68611,
			.03194,
			0,
			.86722
		],
		"923": [
			0,
			.68611,
			0,
			0,
			.80555
		],
		"926": [
			0,
			.68611,
			.07458,
			0,
			.84125
		],
		"928": [
			0,
			.68611,
			.08229,
			0,
			.98229
		],
		"931": [
			0,
			.68611,
			.05451,
			0,
			.88507
		],
		"933": [
			0,
			.68611,
			.15972,
			0,
			.67083
		],
		"934": [
			0,
			.68611,
			0,
			0,
			.76666
		],
		"936": [
			0,
			.68611,
			.11653,
			0,
			.71402
		],
		"937": [
			0,
			.68611,
			.04835,
			0,
			.8789
		],
		"945": [
			0,
			.44444,
			0,
			0,
			.76064
		],
		"946": [
			.19444,
			.69444,
			.03403,
			0,
			.65972
		],
		"947": [
			.19444,
			.44444,
			.06389,
			0,
			.59003
		],
		"948": [
			0,
			.69444,
			.03819,
			0,
			.52222
		],
		"949": [
			0,
			.44444,
			0,
			0,
			.52882
		],
		"950": [
			.19444,
			.69444,
			.06215,
			0,
			.50833
		],
		"951": [
			.19444,
			.44444,
			.03704,
			0,
			.6
		],
		"952": [
			0,
			.69444,
			.03194,
			0,
			.5618
		],
		"953": [
			0,
			.44444,
			0,
			0,
			.41204
		],
		"954": [
			0,
			.44444,
			0,
			0,
			.66759
		],
		"955": [
			0,
			.69444,
			0,
			0,
			.67083
		],
		"956": [
			.19444,
			.44444,
			0,
			0,
			.70787
		],
		"957": [
			0,
			.44444,
			.06898,
			0,
			.57685
		],
		"958": [
			.19444,
			.69444,
			.03021,
			0,
			.50833
		],
		"959": [
			0,
			.44444,
			0,
			0,
			.58472
		],
		"960": [
			0,
			.44444,
			.03704,
			0,
			.68241
		],
		"961": [
			.19444,
			.44444,
			0,
			0,
			.6118
		],
		"962": [
			.09722,
			.44444,
			.07917,
			0,
			.42361
		],
		"963": [
			0,
			.44444,
			.03704,
			0,
			.68588
		],
		"964": [
			0,
			.44444,
			.13472,
			0,
			.52083
		],
		"965": [
			0,
			.44444,
			.03704,
			0,
			.63055
		],
		"966": [
			.19444,
			.44444,
			0,
			0,
			.74722
		],
		"967": [
			.19444,
			.44444,
			0,
			0,
			.71805
		],
		"968": [
			.19444,
			.69444,
			.03704,
			0,
			.75833
		],
		"969": [
			0,
			.44444,
			.03704,
			0,
			.71782
		],
		"977": [
			0,
			.69444,
			0,
			0,
			.69155
		],
		"981": [
			.19444,
			.69444,
			0,
			0,
			.7125
		],
		"982": [
			0,
			.44444,
			.03194,
			0,
			.975
		],
		"1009": [
			.19444,
			.44444,
			0,
			0,
			.6118
		],
		"1013": [
			0,
			.44444,
			0,
			0,
			.48333
		],
		"57649": [
			0,
			.44444,
			0,
			0,
			.39352
		],
		"57911": [
			.19444,
			.44444,
			0,
			0,
			.43889
		]
	},
	"Math-Italic": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"48": [
			0,
			.43056,
			0,
			0,
			.5
		],
		"49": [
			0,
			.43056,
			0,
			0,
			.5
		],
		"50": [
			0,
			.43056,
			0,
			0,
			.5
		],
		"51": [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		"52": [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		"53": [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		"54": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"55": [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		"56": [
			0,
			.64444,
			0,
			0,
			.5
		],
		"57": [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		"65": [
			0,
			.68333,
			0,
			.13889,
			.75
		],
		"66": [
			0,
			.68333,
			.05017,
			.08334,
			.75851
		],
		"67": [
			0,
			.68333,
			.07153,
			.08334,
			.71472
		],
		"68": [
			0,
			.68333,
			.02778,
			.05556,
			.82792
		],
		"69": [
			0,
			.68333,
			.05764,
			.08334,
			.7382
		],
		"70": [
			0,
			.68333,
			.13889,
			.08334,
			.64306
		],
		"71": [
			0,
			.68333,
			0,
			.08334,
			.78625
		],
		"72": [
			0,
			.68333,
			.08125,
			.05556,
			.83125
		],
		"73": [
			0,
			.68333,
			.07847,
			.11111,
			.43958
		],
		"74": [
			0,
			.68333,
			.09618,
			.16667,
			.55451
		],
		"75": [
			0,
			.68333,
			.07153,
			.05556,
			.84931
		],
		"76": [
			0,
			.68333,
			0,
			.02778,
			.68056
		],
		"77": [
			0,
			.68333,
			.10903,
			.08334,
			.97014
		],
		"78": [
			0,
			.68333,
			.10903,
			.08334,
			.80347
		],
		"79": [
			0,
			.68333,
			.02778,
			.08334,
			.76278
		],
		"80": [
			0,
			.68333,
			.13889,
			.08334,
			.64201
		],
		"81": [
			.19444,
			.68333,
			0,
			.08334,
			.79056
		],
		"82": [
			0,
			.68333,
			.00773,
			.08334,
			.75929
		],
		"83": [
			0,
			.68333,
			.05764,
			.08334,
			.6132
		],
		"84": [
			0,
			.68333,
			.13889,
			.08334,
			.58438
		],
		"85": [
			0,
			.68333,
			.10903,
			.02778,
			.68278
		],
		"86": [
			0,
			.68333,
			.22222,
			0,
			.58333
		],
		"87": [
			0,
			.68333,
			.13889,
			0,
			.94445
		],
		"88": [
			0,
			.68333,
			.07847,
			.08334,
			.82847
		],
		"89": [
			0,
			.68333,
			.22222,
			0,
			.58056
		],
		"90": [
			0,
			.68333,
			.07153,
			.08334,
			.68264
		],
		"97": [
			0,
			.43056,
			0,
			0,
			.52859
		],
		"98": [
			0,
			.69444,
			0,
			0,
			.42917
		],
		"99": [
			0,
			.43056,
			0,
			.05556,
			.43276
		],
		"100": [
			0,
			.69444,
			0,
			.16667,
			.52049
		],
		"101": [
			0,
			.43056,
			0,
			.05556,
			.46563
		],
		"102": [
			.19444,
			.69444,
			.10764,
			.16667,
			.48959
		],
		"103": [
			.19444,
			.43056,
			.03588,
			.02778,
			.47697
		],
		"104": [
			0,
			.69444,
			0,
			0,
			.57616
		],
		"105": [
			0,
			.65952,
			0,
			0,
			.34451
		],
		"106": [
			.19444,
			.65952,
			.05724,
			0,
			.41181
		],
		"107": [
			0,
			.69444,
			.03148,
			0,
			.5206
		],
		"108": [
			0,
			.69444,
			.01968,
			.08334,
			.29838
		],
		"109": [
			0,
			.43056,
			0,
			0,
			.87801
		],
		"110": [
			0,
			.43056,
			0,
			0,
			.60023
		],
		"111": [
			0,
			.43056,
			0,
			.05556,
			.48472
		],
		"112": [
			.19444,
			.43056,
			0,
			.08334,
			.50313
		],
		"113": [
			.19444,
			.43056,
			.03588,
			.08334,
			.44641
		],
		"114": [
			0,
			.43056,
			.02778,
			.05556,
			.45116
		],
		"115": [
			0,
			.43056,
			0,
			.05556,
			.46875
		],
		"116": [
			0,
			.61508,
			0,
			.08334,
			.36111
		],
		"117": [
			0,
			.43056,
			0,
			.02778,
			.57246
		],
		"118": [
			0,
			.43056,
			.03588,
			.02778,
			.48472
		],
		"119": [
			0,
			.43056,
			.02691,
			.08334,
			.71592
		],
		"120": [
			0,
			.43056,
			0,
			.02778,
			.57153
		],
		"121": [
			.19444,
			.43056,
			.03588,
			.05556,
			.49028
		],
		"122": [
			0,
			.43056,
			.04398,
			.05556,
			.46505
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"915": [
			0,
			.68333,
			.13889,
			.08334,
			.61528
		],
		"916": [
			0,
			.68333,
			0,
			.16667,
			.83334
		],
		"920": [
			0,
			.68333,
			.02778,
			.08334,
			.76278
		],
		"923": [
			0,
			.68333,
			0,
			.16667,
			.69445
		],
		"926": [
			0,
			.68333,
			.07569,
			.08334,
			.74236
		],
		"928": [
			0,
			.68333,
			.08125,
			.05556,
			.83125
		],
		"931": [
			0,
			.68333,
			.05764,
			.08334,
			.77986
		],
		"933": [
			0,
			.68333,
			.13889,
			.05556,
			.58333
		],
		"934": [
			0,
			.68333,
			0,
			.08334,
			.66667
		],
		"936": [
			0,
			.68333,
			.11,
			.05556,
			.61222
		],
		"937": [
			0,
			.68333,
			.05017,
			.08334,
			.7724
		],
		"945": [
			0,
			.43056,
			.0037,
			.02778,
			.6397
		],
		"946": [
			.19444,
			.69444,
			.05278,
			.08334,
			.56563
		],
		"947": [
			.19444,
			.43056,
			.05556,
			0,
			.51773
		],
		"948": [
			0,
			.69444,
			.03785,
			.05556,
			.44444
		],
		"949": [
			0,
			.43056,
			0,
			.08334,
			.46632
		],
		"950": [
			.19444,
			.69444,
			.07378,
			.08334,
			.4375
		],
		"951": [
			.19444,
			.43056,
			.03588,
			.05556,
			.49653
		],
		"952": [
			0,
			.69444,
			.02778,
			.08334,
			.46944
		],
		"953": [
			0,
			.43056,
			0,
			.05556,
			.35394
		],
		"954": [
			0,
			.43056,
			0,
			0,
			.57616
		],
		"955": [
			0,
			.69444,
			0,
			0,
			.58334
		],
		"956": [
			.19444,
			.43056,
			0,
			.02778,
			.60255
		],
		"957": [
			0,
			.43056,
			.06366,
			.02778,
			.49398
		],
		"958": [
			.19444,
			.69444,
			.04601,
			.11111,
			.4375
		],
		"959": [
			0,
			.43056,
			0,
			.05556,
			.48472
		],
		"960": [
			0,
			.43056,
			.03588,
			0,
			.57003
		],
		"961": [
			.19444,
			.43056,
			0,
			.08334,
			.51702
		],
		"962": [
			.09722,
			.43056,
			.07986,
			.08334,
			.36285
		],
		"963": [
			0,
			.43056,
			.03588,
			0,
			.57141
		],
		"964": [
			0,
			.43056,
			.1132,
			.02778,
			.43715
		],
		"965": [
			0,
			.43056,
			.03588,
			.02778,
			.54028
		],
		"966": [
			.19444,
			.43056,
			0,
			.08334,
			.65417
		],
		"967": [
			.19444,
			.43056,
			0,
			.05556,
			.62569
		],
		"968": [
			.19444,
			.69444,
			.03588,
			.11111,
			.65139
		],
		"969": [
			0,
			.43056,
			.03588,
			0,
			.62245
		],
		"977": [
			0,
			.69444,
			0,
			.08334,
			.59144
		],
		"981": [
			.19444,
			.69444,
			0,
			.08334,
			.59583
		],
		"982": [
			0,
			.43056,
			.02778,
			0,
			.82813
		],
		"1009": [
			.19444,
			.43056,
			0,
			.08334,
			.51702
		],
		"1013": [
			0,
			.43056,
			0,
			.05556,
			.4059
		],
		"57649": [
			0,
			.43056,
			0,
			.02778,
			.32246
		],
		"57911": [
			.19444,
			.43056,
			0,
			.08334,
			.38403
		]
	},
	"SansSerif-Bold": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			0,
			0,
			.36667
		],
		"34": [
			0,
			.69444,
			0,
			0,
			.55834
		],
		"35": [
			.19444,
			.69444,
			0,
			0,
			.91667
		],
		"36": [
			.05556,
			.75,
			0,
			0,
			.55
		],
		"37": [
			.05556,
			.75,
			0,
			0,
			1.02912
		],
		"38": [
			0,
			.69444,
			0,
			0,
			.83056
		],
		"39": [
			0,
			.69444,
			0,
			0,
			.30556
		],
		"40": [
			.25,
			.75,
			0,
			0,
			.42778
		],
		"41": [
			.25,
			.75,
			0,
			0,
			.42778
		],
		"42": [
			0,
			.75,
			0,
			0,
			.55
		],
		"43": [
			.11667,
			.61667,
			0,
			0,
			.85556
		],
		"44": [
			.10556,
			.13056,
			0,
			0,
			.30556
		],
		"45": [
			0,
			.45833,
			0,
			0,
			.36667
		],
		"46": [
			0,
			.13056,
			0,
			0,
			.30556
		],
		"47": [
			.25,
			.75,
			0,
			0,
			.55
		],
		"48": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"49": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"50": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"51": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"52": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"53": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"54": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"55": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"56": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"57": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"58": [
			0,
			.45833,
			0,
			0,
			.30556
		],
		"59": [
			.10556,
			.45833,
			0,
			0,
			.30556
		],
		"61": [
			-.09375,
			.40625,
			0,
			0,
			.85556
		],
		"63": [
			0,
			.69444,
			0,
			0,
			.51945
		],
		"64": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"65": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"66": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"67": [
			0,
			.69444,
			0,
			0,
			.70278
		],
		"68": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"69": [
			0,
			.69444,
			0,
			0,
			.64167
		],
		"70": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"71": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"72": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"73": [
			0,
			.69444,
			0,
			0,
			.33056
		],
		"74": [
			0,
			.69444,
			0,
			0,
			.51945
		],
		"75": [
			0,
			.69444,
			0,
			0,
			.76389
		],
		"76": [
			0,
			.69444,
			0,
			0,
			.58056
		],
		"77": [
			0,
			.69444,
			0,
			0,
			.97778
		],
		"78": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"79": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"80": [
			0,
			.69444,
			0,
			0,
			.70278
		],
		"81": [
			.10556,
			.69444,
			0,
			0,
			.79445
		],
		"82": [
			0,
			.69444,
			0,
			0,
			.70278
		],
		"83": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"84": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"85": [
			0,
			.69444,
			0,
			0,
			.76389
		],
		"86": [
			0,
			.69444,
			.01528,
			0,
			.73334
		],
		"87": [
			0,
			.69444,
			.01528,
			0,
			1.03889
		],
		"88": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"89": [
			0,
			.69444,
			.0275,
			0,
			.73334
		],
		"90": [
			0,
			.69444,
			0,
			0,
			.67223
		],
		"91": [
			.25,
			.75,
			0,
			0,
			.34306
		],
		"93": [
			.25,
			.75,
			0,
			0,
			.34306
		],
		"94": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"95": [
			.35,
			.10833,
			.03056,
			0,
			.55
		],
		"97": [
			0,
			.45833,
			0,
			0,
			.525
		],
		"98": [
			0,
			.69444,
			0,
			0,
			.56111
		],
		"99": [
			0,
			.45833,
			0,
			0,
			.48889
		],
		"100": [
			0,
			.69444,
			0,
			0,
			.56111
		],
		"101": [
			0,
			.45833,
			0,
			0,
			.51111
		],
		"102": [
			0,
			.69444,
			.07639,
			0,
			.33611
		],
		"103": [
			.19444,
			.45833,
			.01528,
			0,
			.55
		],
		"104": [
			0,
			.69444,
			0,
			0,
			.56111
		],
		"105": [
			0,
			.69444,
			0,
			0,
			.25556
		],
		"106": [
			.19444,
			.69444,
			0,
			0,
			.28611
		],
		"107": [
			0,
			.69444,
			0,
			0,
			.53056
		],
		"108": [
			0,
			.69444,
			0,
			0,
			.25556
		],
		"109": [
			0,
			.45833,
			0,
			0,
			.86667
		],
		"110": [
			0,
			.45833,
			0,
			0,
			.56111
		],
		"111": [
			0,
			.45833,
			0,
			0,
			.55
		],
		"112": [
			.19444,
			.45833,
			0,
			0,
			.56111
		],
		"113": [
			.19444,
			.45833,
			0,
			0,
			.56111
		],
		"114": [
			0,
			.45833,
			.01528,
			0,
			.37222
		],
		"115": [
			0,
			.45833,
			0,
			0,
			.42167
		],
		"116": [
			0,
			.58929,
			0,
			0,
			.40417
		],
		"117": [
			0,
			.45833,
			0,
			0,
			.56111
		],
		"118": [
			0,
			.45833,
			.01528,
			0,
			.5
		],
		"119": [
			0,
			.45833,
			.01528,
			0,
			.74445
		],
		"120": [
			0,
			.45833,
			0,
			0,
			.5
		],
		"121": [
			.19444,
			.45833,
			.01528,
			0,
			.5
		],
		"122": [
			0,
			.45833,
			0,
			0,
			.47639
		],
		"126": [
			.35,
			.34444,
			0,
			0,
			.55
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"168": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"180": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.48889
		],
		"305": [
			0,
			.45833,
			0,
			0,
			.25556
		],
		"567": [
			.19444,
			.45833,
			0,
			0,
			.28611
		],
		"710": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"711": [
			0,
			.63542,
			0,
			0,
			.55
		],
		"713": [
			0,
			.63778,
			0,
			0,
			.55
		],
		"728": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"729": [
			0,
			.69444,
			0,
			0,
			.30556
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"732": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"733": [
			0,
			.69444,
			0,
			0,
			.55
		],
		"915": [
			0,
			.69444,
			0,
			0,
			.58056
		],
		"916": [
			0,
			.69444,
			0,
			0,
			.91667
		],
		"920": [
			0,
			.69444,
			0,
			0,
			.85556
		],
		"923": [
			0,
			.69444,
			0,
			0,
			.67223
		],
		"926": [
			0,
			.69444,
			0,
			0,
			.73334
		],
		"928": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"931": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"933": [
			0,
			.69444,
			0,
			0,
			.85556
		],
		"934": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"936": [
			0,
			.69444,
			0,
			0,
			.85556
		],
		"937": [
			0,
			.69444,
			0,
			0,
			.79445
		],
		"8211": [
			0,
			.45833,
			.03056,
			0,
			.55
		],
		"8212": [
			0,
			.45833,
			.03056,
			0,
			1.10001
		],
		"8216": [
			0,
			.69444,
			0,
			0,
			.30556
		],
		"8217": [
			0,
			.69444,
			0,
			0,
			.30556
		],
		"8220": [
			0,
			.69444,
			0,
			0,
			.55834
		],
		"8221": [
			0,
			.69444,
			0,
			0,
			.55834
		]
	},
	"SansSerif-Italic": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			.05733,
			0,
			.31945
		],
		"34": [
			0,
			.69444,
			.00316,
			0,
			.5
		],
		"35": [
			.19444,
			.69444,
			.05087,
			0,
			.83334
		],
		"36": [
			.05556,
			.75,
			.11156,
			0,
			.5
		],
		"37": [
			.05556,
			.75,
			.03126,
			0,
			.83334
		],
		"38": [
			0,
			.69444,
			.03058,
			0,
			.75834
		],
		"39": [
			0,
			.69444,
			.07816,
			0,
			.27778
		],
		"40": [
			.25,
			.75,
			.13164,
			0,
			.38889
		],
		"41": [
			.25,
			.75,
			.02536,
			0,
			.38889
		],
		"42": [
			0,
			.75,
			.11775,
			0,
			.5
		],
		"43": [
			.08333,
			.58333,
			.02536,
			0,
			.77778
		],
		"44": [
			.125,
			.08333,
			0,
			0,
			.27778
		],
		"45": [
			0,
			.44444,
			.01946,
			0,
			.33333
		],
		"46": [
			0,
			.08333,
			0,
			0,
			.27778
		],
		"47": [
			.25,
			.75,
			.13164,
			0,
			.5
		],
		"48": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"49": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"50": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"51": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"52": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"53": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"54": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"55": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"56": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"57": [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		"58": [
			0,
			.44444,
			.02502,
			0,
			.27778
		],
		"59": [
			.125,
			.44444,
			.02502,
			0,
			.27778
		],
		"61": [
			-.13,
			.37,
			.05087,
			0,
			.77778
		],
		"63": [
			0,
			.69444,
			.11809,
			0,
			.47222
		],
		"64": [
			0,
			.69444,
			.07555,
			0,
			.66667
		],
		"65": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"66": [
			0,
			.69444,
			.08293,
			0,
			.66667
		],
		"67": [
			0,
			.69444,
			.11983,
			0,
			.63889
		],
		"68": [
			0,
			.69444,
			.07555,
			0,
			.72223
		],
		"69": [
			0,
			.69444,
			.11983,
			0,
			.59722
		],
		"70": [
			0,
			.69444,
			.13372,
			0,
			.56945
		],
		"71": [
			0,
			.69444,
			.11983,
			0,
			.66667
		],
		"72": [
			0,
			.69444,
			.08094,
			0,
			.70834
		],
		"73": [
			0,
			.69444,
			.13372,
			0,
			.27778
		],
		"74": [
			0,
			.69444,
			.08094,
			0,
			.47222
		],
		"75": [
			0,
			.69444,
			.11983,
			0,
			.69445
		],
		"76": [
			0,
			.69444,
			0,
			0,
			.54167
		],
		"77": [
			0,
			.69444,
			.08094,
			0,
			.875
		],
		"78": [
			0,
			.69444,
			.08094,
			0,
			.70834
		],
		"79": [
			0,
			.69444,
			.07555,
			0,
			.73611
		],
		"80": [
			0,
			.69444,
			.08293,
			0,
			.63889
		],
		"81": [
			.125,
			.69444,
			.07555,
			0,
			.73611
		],
		"82": [
			0,
			.69444,
			.08293,
			0,
			.64584
		],
		"83": [
			0,
			.69444,
			.09205,
			0,
			.55556
		],
		"84": [
			0,
			.69444,
			.13372,
			0,
			.68056
		],
		"85": [
			0,
			.69444,
			.08094,
			0,
			.6875
		],
		"86": [
			0,
			.69444,
			.1615,
			0,
			.66667
		],
		"87": [
			0,
			.69444,
			.1615,
			0,
			.94445
		],
		"88": [
			0,
			.69444,
			.13372,
			0,
			.66667
		],
		"89": [
			0,
			.69444,
			.17261,
			0,
			.66667
		],
		"90": [
			0,
			.69444,
			.11983,
			0,
			.61111
		],
		"91": [
			.25,
			.75,
			.15942,
			0,
			.28889
		],
		"93": [
			.25,
			.75,
			.08719,
			0,
			.28889
		],
		"94": [
			0,
			.69444,
			.0799,
			0,
			.5
		],
		"95": [
			.35,
			.09444,
			.08616,
			0,
			.5
		],
		"97": [
			0,
			.44444,
			.00981,
			0,
			.48056
		],
		"98": [
			0,
			.69444,
			.03057,
			0,
			.51667
		],
		"99": [
			0,
			.44444,
			.08336,
			0,
			.44445
		],
		"100": [
			0,
			.69444,
			.09483,
			0,
			.51667
		],
		"101": [
			0,
			.44444,
			.06778,
			0,
			.44445
		],
		"102": [
			0,
			.69444,
			.21705,
			0,
			.30556
		],
		"103": [
			.19444,
			.44444,
			.10836,
			0,
			.5
		],
		"104": [
			0,
			.69444,
			.01778,
			0,
			.51667
		],
		"105": [
			0,
			.67937,
			.09718,
			0,
			.23889
		],
		"106": [
			.19444,
			.67937,
			.09162,
			0,
			.26667
		],
		"107": [
			0,
			.69444,
			.08336,
			0,
			.48889
		],
		"108": [
			0,
			.69444,
			.09483,
			0,
			.23889
		],
		"109": [
			0,
			.44444,
			.01778,
			0,
			.79445
		],
		"110": [
			0,
			.44444,
			.01778,
			0,
			.51667
		],
		"111": [
			0,
			.44444,
			.06613,
			0,
			.5
		],
		"112": [
			.19444,
			.44444,
			.0389,
			0,
			.51667
		],
		"113": [
			.19444,
			.44444,
			.04169,
			0,
			.51667
		],
		"114": [
			0,
			.44444,
			.10836,
			0,
			.34167
		],
		"115": [
			0,
			.44444,
			.0778,
			0,
			.38333
		],
		"116": [
			0,
			.57143,
			.07225,
			0,
			.36111
		],
		"117": [
			0,
			.44444,
			.04169,
			0,
			.51667
		],
		"118": [
			0,
			.44444,
			.10836,
			0,
			.46111
		],
		"119": [
			0,
			.44444,
			.10836,
			0,
			.68334
		],
		"120": [
			0,
			.44444,
			.09169,
			0,
			.46111
		],
		"121": [
			.19444,
			.44444,
			.10836,
			0,
			.46111
		],
		"122": [
			0,
			.44444,
			.08752,
			0,
			.43472
		],
		"126": [
			.35,
			.32659,
			.08826,
			0,
			.5
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"168": [
			0,
			.67937,
			.06385,
			0,
			.5
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.73752
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.44445
		],
		"305": [
			0,
			.44444,
			.04169,
			0,
			.23889
		],
		"567": [
			.19444,
			.44444,
			.04169,
			0,
			.26667
		],
		"710": [
			0,
			.69444,
			.0799,
			0,
			.5
		],
		"711": [
			0,
			.63194,
			.08432,
			0,
			.5
		],
		"713": [
			0,
			.60889,
			.08776,
			0,
			.5
		],
		"714": [
			0,
			.69444,
			.09205,
			0,
			.5
		],
		"715": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"728": [
			0,
			.69444,
			.09483,
			0,
			.5
		],
		"729": [
			0,
			.67937,
			.07774,
			0,
			.27778
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.73752
		],
		"732": [
			0,
			.67659,
			.08826,
			0,
			.5
		],
		"733": [
			0,
			.69444,
			.09205,
			0,
			.5
		],
		"915": [
			0,
			.69444,
			.13372,
			0,
			.54167
		],
		"916": [
			0,
			.69444,
			0,
			0,
			.83334
		],
		"920": [
			0,
			.69444,
			.07555,
			0,
			.77778
		],
		"923": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"926": [
			0,
			.69444,
			.12816,
			0,
			.66667
		],
		"928": [
			0,
			.69444,
			.08094,
			0,
			.70834
		],
		"931": [
			0,
			.69444,
			.11983,
			0,
			.72222
		],
		"933": [
			0,
			.69444,
			.09031,
			0,
			.77778
		],
		"934": [
			0,
			.69444,
			.04603,
			0,
			.72222
		],
		"936": [
			0,
			.69444,
			.09031,
			0,
			.77778
		],
		"937": [
			0,
			.69444,
			.08293,
			0,
			.72222
		],
		"8211": [
			0,
			.44444,
			.08616,
			0,
			.5
		],
		"8212": [
			0,
			.44444,
			.08616,
			0,
			1
		],
		"8216": [
			0,
			.69444,
			.07816,
			0,
			.27778
		],
		"8217": [
			0,
			.69444,
			.07816,
			0,
			.27778
		],
		"8220": [
			0,
			.69444,
			.14205,
			0,
			.5
		],
		"8221": [
			0,
			.69444,
			.00316,
			0,
			.5
		]
	},
	"SansSerif-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"33": [
			0,
			.69444,
			0,
			0,
			.31945
		],
		"34": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"35": [
			.19444,
			.69444,
			0,
			0,
			.83334
		],
		"36": [
			.05556,
			.75,
			0,
			0,
			.5
		],
		"37": [
			.05556,
			.75,
			0,
			0,
			.83334
		],
		"38": [
			0,
			.69444,
			0,
			0,
			.75834
		],
		"39": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"40": [
			.25,
			.75,
			0,
			0,
			.38889
		],
		"41": [
			.25,
			.75,
			0,
			0,
			.38889
		],
		"42": [
			0,
			.75,
			0,
			0,
			.5
		],
		"43": [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		"44": [
			.125,
			.08333,
			0,
			0,
			.27778
		],
		"45": [
			0,
			.44444,
			0,
			0,
			.33333
		],
		"46": [
			0,
			.08333,
			0,
			0,
			.27778
		],
		"47": [
			.25,
			.75,
			0,
			0,
			.5
		],
		"48": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"49": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"50": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"51": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"52": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"53": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"54": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"55": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"56": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"57": [
			0,
			.65556,
			0,
			0,
			.5
		],
		"58": [
			0,
			.44444,
			0,
			0,
			.27778
		],
		"59": [
			.125,
			.44444,
			0,
			0,
			.27778
		],
		"61": [
			-.13,
			.37,
			0,
			0,
			.77778
		],
		"63": [
			0,
			.69444,
			0,
			0,
			.47222
		],
		"64": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"65": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"66": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"67": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"68": [
			0,
			.69444,
			0,
			0,
			.72223
		],
		"69": [
			0,
			.69444,
			0,
			0,
			.59722
		],
		"70": [
			0,
			.69444,
			0,
			0,
			.56945
		],
		"71": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"72": [
			0,
			.69444,
			0,
			0,
			.70834
		],
		"73": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"74": [
			0,
			.69444,
			0,
			0,
			.47222
		],
		"75": [
			0,
			.69444,
			0,
			0,
			.69445
		],
		"76": [
			0,
			.69444,
			0,
			0,
			.54167
		],
		"77": [
			0,
			.69444,
			0,
			0,
			.875
		],
		"78": [
			0,
			.69444,
			0,
			0,
			.70834
		],
		"79": [
			0,
			.69444,
			0,
			0,
			.73611
		],
		"80": [
			0,
			.69444,
			0,
			0,
			.63889
		],
		"81": [
			.125,
			.69444,
			0,
			0,
			.73611
		],
		"82": [
			0,
			.69444,
			0,
			0,
			.64584
		],
		"83": [
			0,
			.69444,
			0,
			0,
			.55556
		],
		"84": [
			0,
			.69444,
			0,
			0,
			.68056
		],
		"85": [
			0,
			.69444,
			0,
			0,
			.6875
		],
		"86": [
			0,
			.69444,
			.01389,
			0,
			.66667
		],
		"87": [
			0,
			.69444,
			.01389,
			0,
			.94445
		],
		"88": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"89": [
			0,
			.69444,
			.025,
			0,
			.66667
		],
		"90": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"91": [
			.25,
			.75,
			0,
			0,
			.28889
		],
		"93": [
			.25,
			.75,
			0,
			0,
			.28889
		],
		"94": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"95": [
			.35,
			.09444,
			.02778,
			0,
			.5
		],
		"97": [
			0,
			.44444,
			0,
			0,
			.48056
		],
		"98": [
			0,
			.69444,
			0,
			0,
			.51667
		],
		"99": [
			0,
			.44444,
			0,
			0,
			.44445
		],
		"100": [
			0,
			.69444,
			0,
			0,
			.51667
		],
		"101": [
			0,
			.44444,
			0,
			0,
			.44445
		],
		"102": [
			0,
			.69444,
			.06944,
			0,
			.30556
		],
		"103": [
			.19444,
			.44444,
			.01389,
			0,
			.5
		],
		"104": [
			0,
			.69444,
			0,
			0,
			.51667
		],
		"105": [
			0,
			.67937,
			0,
			0,
			.23889
		],
		"106": [
			.19444,
			.67937,
			0,
			0,
			.26667
		],
		"107": [
			0,
			.69444,
			0,
			0,
			.48889
		],
		"108": [
			0,
			.69444,
			0,
			0,
			.23889
		],
		"109": [
			0,
			.44444,
			0,
			0,
			.79445
		],
		"110": [
			0,
			.44444,
			0,
			0,
			.51667
		],
		"111": [
			0,
			.44444,
			0,
			0,
			.5
		],
		"112": [
			.19444,
			.44444,
			0,
			0,
			.51667
		],
		"113": [
			.19444,
			.44444,
			0,
			0,
			.51667
		],
		"114": [
			0,
			.44444,
			.01389,
			0,
			.34167
		],
		"115": [
			0,
			.44444,
			0,
			0,
			.38333
		],
		"116": [
			0,
			.57143,
			0,
			0,
			.36111
		],
		"117": [
			0,
			.44444,
			0,
			0,
			.51667
		],
		"118": [
			0,
			.44444,
			.01389,
			0,
			.46111
		],
		"119": [
			0,
			.44444,
			.01389,
			0,
			.68334
		],
		"120": [
			0,
			.44444,
			0,
			0,
			.46111
		],
		"121": [
			.19444,
			.44444,
			.01389,
			0,
			.46111
		],
		"122": [
			0,
			.44444,
			0,
			0,
			.43472
		],
		"126": [
			.35,
			.32659,
			0,
			0,
			.5
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"168": [
			0,
			.67937,
			0,
			0,
			.5
		],
		"176": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"184": [
			.17014,
			0,
			0,
			0,
			.44445
		],
		"305": [
			0,
			.44444,
			0,
			0,
			.23889
		],
		"567": [
			.19444,
			.44444,
			0,
			0,
			.26667
		],
		"710": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"711": [
			0,
			.63194,
			0,
			0,
			.5
		],
		"713": [
			0,
			.60889,
			0,
			0,
			.5
		],
		"714": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"715": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"728": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"729": [
			0,
			.67937,
			0,
			0,
			.27778
		],
		"730": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"732": [
			0,
			.67659,
			0,
			0,
			.5
		],
		"733": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"915": [
			0,
			.69444,
			0,
			0,
			.54167
		],
		"916": [
			0,
			.69444,
			0,
			0,
			.83334
		],
		"920": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"923": [
			0,
			.69444,
			0,
			0,
			.61111
		],
		"926": [
			0,
			.69444,
			0,
			0,
			.66667
		],
		"928": [
			0,
			.69444,
			0,
			0,
			.70834
		],
		"931": [
			0,
			.69444,
			0,
			0,
			.72222
		],
		"933": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"934": [
			0,
			.69444,
			0,
			0,
			.72222
		],
		"936": [
			0,
			.69444,
			0,
			0,
			.77778
		],
		"937": [
			0,
			.69444,
			0,
			0,
			.72222
		],
		"8211": [
			0,
			.44444,
			.02778,
			0,
			.5
		],
		"8212": [
			0,
			.44444,
			.02778,
			0,
			1
		],
		"8216": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"8217": [
			0,
			.69444,
			0,
			0,
			.27778
		],
		"8220": [
			0,
			.69444,
			0,
			0,
			.5
		],
		"8221": [
			0,
			.69444,
			0,
			0,
			.5
		]
	},
	"Script-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"65": [
			0,
			.7,
			.22925,
			0,
			.80253
		],
		"66": [
			0,
			.7,
			.04087,
			0,
			.90757
		],
		"67": [
			0,
			.7,
			.1689,
			0,
			.66619
		],
		"68": [
			0,
			.7,
			.09371,
			0,
			.77443
		],
		"69": [
			0,
			.7,
			.18583,
			0,
			.56162
		],
		"70": [
			0,
			.7,
			.13634,
			0,
			.89544
		],
		"71": [
			0,
			.7,
			.17322,
			0,
			.60961
		],
		"72": [
			0,
			.7,
			.29694,
			0,
			.96919
		],
		"73": [
			0,
			.7,
			.19189,
			0,
			.80907
		],
		"74": [
			.27778,
			.7,
			.19189,
			0,
			1.05159
		],
		"75": [
			0,
			.7,
			.31259,
			0,
			.91364
		],
		"76": [
			0,
			.7,
			.19189,
			0,
			.87373
		],
		"77": [
			0,
			.7,
			.15981,
			0,
			1.08031
		],
		"78": [
			0,
			.7,
			.3525,
			0,
			.9015
		],
		"79": [
			0,
			.7,
			.08078,
			0,
			.73787
		],
		"80": [
			0,
			.7,
			.08078,
			0,
			1.01262
		],
		"81": [
			0,
			.7,
			.03305,
			0,
			.88282
		],
		"82": [
			0,
			.7,
			.06259,
			0,
			.85
		],
		"83": [
			0,
			.7,
			.19189,
			0,
			.86767
		],
		"84": [
			0,
			.7,
			.29087,
			0,
			.74697
		],
		"85": [
			0,
			.7,
			.25815,
			0,
			.79996
		],
		"86": [
			0,
			.7,
			.27523,
			0,
			.62204
		],
		"87": [
			0,
			.7,
			.27523,
			0,
			.80532
		],
		"88": [
			0,
			.7,
			.26006,
			0,
			.94445
		],
		"89": [
			0,
			.7,
			.2939,
			0,
			.70961
		],
		"90": [
			0,
			.7,
			.24037,
			0,
			.8212
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		]
	},
	"Size1-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"40": [
			.35001,
			.85,
			0,
			0,
			.45834
		],
		"41": [
			.35001,
			.85,
			0,
			0,
			.45834
		],
		"47": [
			.35001,
			.85,
			0,
			0,
			.57778
		],
		"91": [
			.35001,
			.85,
			0,
			0,
			.41667
		],
		"92": [
			.35001,
			.85,
			0,
			0,
			.57778
		],
		"93": [
			.35001,
			.85,
			0,
			0,
			.41667
		],
		"123": [
			.35001,
			.85,
			0,
			0,
			.58334
		],
		"125": [
			.35001,
			.85,
			0,
			0,
			.58334
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"710": [
			0,
			.72222,
			0,
			0,
			.55556
		],
		"732": [
			0,
			.72222,
			0,
			0,
			.55556
		],
		"770": [
			0,
			.72222,
			0,
			0,
			.55556
		],
		"771": [
			0,
			.72222,
			0,
			0,
			.55556
		],
		"8214": [
			-99e-5,
			.601,
			0,
			0,
			.77778
		],
		"8593": [
			1e-5,
			.6,
			0,
			0,
			.66667
		],
		"8595": [
			1e-5,
			.6,
			0,
			0,
			.66667
		],
		"8657": [
			1e-5,
			.6,
			0,
			0,
			.77778
		],
		"8659": [
			1e-5,
			.6,
			0,
			0,
			.77778
		],
		"8719": [
			.25001,
			.75,
			0,
			0,
			.94445
		],
		"8720": [
			.25001,
			.75,
			0,
			0,
			.94445
		],
		"8721": [
			.25001,
			.75,
			0,
			0,
			1.05556
		],
		"8730": [
			.35001,
			.85,
			0,
			0,
			1
		],
		"8739": [
			-.00599,
			.606,
			0,
			0,
			.33333
		],
		"8741": [
			-.00599,
			.606,
			0,
			0,
			.55556
		],
		"8747": [
			.30612,
			.805,
			.19445,
			0,
			.47222
		],
		"8748": [
			.306,
			.805,
			.19445,
			0,
			.47222
		],
		"8749": [
			.306,
			.805,
			.19445,
			0,
			.47222
		],
		"8750": [
			.30612,
			.805,
			.19445,
			0,
			.47222
		],
		"8896": [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		"8897": [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		"8898": [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		"8899": [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		"8968": [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		"8969": [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		"8970": [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		"8971": [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		"9168": [
			-99e-5,
			.601,
			0,
			0,
			.66667
		],
		"10216": [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		"10217": [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		"10752": [
			.25001,
			.75,
			0,
			0,
			1.11111
		],
		"10753": [
			.25001,
			.75,
			0,
			0,
			1.11111
		],
		"10754": [
			.25001,
			.75,
			0,
			0,
			1.11111
		],
		"10756": [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		"10758": [
			.25001,
			.75,
			0,
			0,
			.83334
		]
	},
	"Size2-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"40": [
			.65002,
			1.15,
			0,
			0,
			.59722
		],
		"41": [
			.65002,
			1.15,
			0,
			0,
			.59722
		],
		"47": [
			.65002,
			1.15,
			0,
			0,
			.81111
		],
		"91": [
			.65002,
			1.15,
			0,
			0,
			.47222
		],
		"92": [
			.65002,
			1.15,
			0,
			0,
			.81111
		],
		"93": [
			.65002,
			1.15,
			0,
			0,
			.47222
		],
		"123": [
			.65002,
			1.15,
			0,
			0,
			.66667
		],
		"125": [
			.65002,
			1.15,
			0,
			0,
			.66667
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"710": [
			0,
			.75,
			0,
			0,
			1
		],
		"732": [
			0,
			.75,
			0,
			0,
			1
		],
		"770": [
			0,
			.75,
			0,
			0,
			1
		],
		"771": [
			0,
			.75,
			0,
			0,
			1
		],
		"8719": [
			.55001,
			1.05,
			0,
			0,
			1.27778
		],
		"8720": [
			.55001,
			1.05,
			0,
			0,
			1.27778
		],
		"8721": [
			.55001,
			1.05,
			0,
			0,
			1.44445
		],
		"8730": [
			.65002,
			1.15,
			0,
			0,
			1
		],
		"8747": [
			.86225,
			1.36,
			.44445,
			0,
			.55556
		],
		"8748": [
			.862,
			1.36,
			.44445,
			0,
			.55556
		],
		"8749": [
			.862,
			1.36,
			.44445,
			0,
			.55556
		],
		"8750": [
			.86225,
			1.36,
			.44445,
			0,
			.55556
		],
		"8896": [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		"8897": [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		"8898": [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		"8899": [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		"8968": [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		"8969": [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		"8970": [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		"8971": [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		"10216": [
			.65002,
			1.15,
			0,
			0,
			.61111
		],
		"10217": [
			.65002,
			1.15,
			0,
			0,
			.61111
		],
		"10752": [
			.55001,
			1.05,
			0,
			0,
			1.51112
		],
		"10753": [
			.55001,
			1.05,
			0,
			0,
			1.51112
		],
		"10754": [
			.55001,
			1.05,
			0,
			0,
			1.51112
		],
		"10756": [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		"10758": [
			.55001,
			1.05,
			0,
			0,
			1.11111
		]
	},
	"Size3-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"40": [
			.95003,
			1.45,
			0,
			0,
			.73611
		],
		"41": [
			.95003,
			1.45,
			0,
			0,
			.73611
		],
		"47": [
			.95003,
			1.45,
			0,
			0,
			1.04445
		],
		"91": [
			.95003,
			1.45,
			0,
			0,
			.52778
		],
		"92": [
			.95003,
			1.45,
			0,
			0,
			1.04445
		],
		"93": [
			.95003,
			1.45,
			0,
			0,
			.52778
		],
		"123": [
			.95003,
			1.45,
			0,
			0,
			.75
		],
		"125": [
			.95003,
			1.45,
			0,
			0,
			.75
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"710": [
			0,
			.75,
			0,
			0,
			1.44445
		],
		"732": [
			0,
			.75,
			0,
			0,
			1.44445
		],
		"770": [
			0,
			.75,
			0,
			0,
			1.44445
		],
		"771": [
			0,
			.75,
			0,
			0,
			1.44445
		],
		"8730": [
			.95003,
			1.45,
			0,
			0,
			1
		],
		"8968": [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		"8969": [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		"8970": [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		"8971": [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		"10216": [
			.95003,
			1.45,
			0,
			0,
			.75
		],
		"10217": [
			.95003,
			1.45,
			0,
			0,
			.75
		]
	},
	"Size4-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.25
		],
		"40": [
			1.25003,
			1.75,
			0,
			0,
			.79167
		],
		"41": [
			1.25003,
			1.75,
			0,
			0,
			.79167
		],
		"47": [
			1.25003,
			1.75,
			0,
			0,
			1.27778
		],
		"91": [
			1.25003,
			1.75,
			0,
			0,
			.58334
		],
		"92": [
			1.25003,
			1.75,
			0,
			0,
			1.27778
		],
		"93": [
			1.25003,
			1.75,
			0,
			0,
			.58334
		],
		"123": [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		"125": [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		"160": [
			0,
			0,
			0,
			0,
			.25
		],
		"710": [
			0,
			.825,
			0,
			0,
			1.8889
		],
		"732": [
			0,
			.825,
			0,
			0,
			1.8889
		],
		"770": [
			0,
			.825,
			0,
			0,
			1.8889
		],
		"771": [
			0,
			.825,
			0,
			0,
			1.8889
		],
		"8730": [
			1.25003,
			1.75,
			0,
			0,
			1
		],
		"8968": [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		"8969": [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		"8970": [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		"8971": [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		"9115": [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		"9116": [
			1e-5,
			.6,
			0,
			0,
			.875
		],
		"9117": [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		"9118": [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		"9119": [
			1e-5,
			.6,
			0,
			0,
			.875
		],
		"9120": [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		"9121": [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		"9122": [
			-99e-5,
			.601,
			0,
			0,
			.66667
		],
		"9123": [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		"9124": [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		"9125": [
			-99e-5,
			.601,
			0,
			0,
			.66667
		],
		"9126": [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		"9127": [
			1e-5,
			.9,
			0,
			0,
			.88889
		],
		"9128": [
			.65002,
			1.15,
			0,
			0,
			.88889
		],
		"9129": [
			.90001,
			0,
			0,
			0,
			.88889
		],
		"9130": [
			0,
			.3,
			0,
			0,
			.88889
		],
		"9131": [
			1e-5,
			.9,
			0,
			0,
			.88889
		],
		"9132": [
			.65002,
			1.15,
			0,
			0,
			.88889
		],
		"9133": [
			.90001,
			0,
			0,
			0,
			.88889
		],
		"9143": [
			.88502,
			.915,
			0,
			0,
			1.05556
		],
		"10216": [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		"10217": [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		"57344": [
			-.00499,
			.605,
			0,
			0,
			1.05556
		],
		"57345": [
			-.00499,
			.605,
			0,
			0,
			1.05556
		],
		"57680": [
			0,
			.12,
			0,
			0,
			.45
		],
		"57681": [
			0,
			.12,
			0,
			0,
			.45
		],
		"57682": [
			0,
			.12,
			0,
			0,
			.45
		],
		"57683": [
			0,
			.12,
			0,
			0,
			.45
		]
	},
	"Typewriter-Regular": {
		"32": [
			0,
			0,
			0,
			0,
			.525
		],
		"33": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"34": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"35": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"36": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"37": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"38": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"39": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"40": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"41": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"42": [
			0,
			.52083,
			0,
			0,
			.525
		],
		"43": [
			-.08056,
			.53055,
			0,
			0,
			.525
		],
		"44": [
			.13889,
			.125,
			0,
			0,
			.525
		],
		"45": [
			-.08056,
			.53055,
			0,
			0,
			.525
		],
		"46": [
			0,
			.125,
			0,
			0,
			.525
		],
		"47": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"48": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"49": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"50": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"51": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"52": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"53": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"54": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"55": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"56": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"57": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"58": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"59": [
			.13889,
			.43056,
			0,
			0,
			.525
		],
		"60": [
			-.05556,
			.55556,
			0,
			0,
			.525
		],
		"61": [
			-.19549,
			.41562,
			0,
			0,
			.525
		],
		"62": [
			-.05556,
			.55556,
			0,
			0,
			.525
		],
		"63": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"64": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"65": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"66": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"67": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"68": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"69": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"70": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"71": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"72": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"73": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"74": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"75": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"76": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"77": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"78": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"79": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"80": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"81": [
			.13889,
			.61111,
			0,
			0,
			.525
		],
		"82": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"83": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"84": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"85": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"86": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"87": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"88": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"89": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"90": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"91": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"92": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"93": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"94": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"95": [
			.09514,
			0,
			0,
			0,
			.525
		],
		"96": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"97": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"98": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"99": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"100": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"101": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"102": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"103": [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		"104": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"105": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"106": [
			.22222,
			.61111,
			0,
			0,
			.525
		],
		"107": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"108": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"109": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"110": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"111": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"112": [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		"113": [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		"114": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"115": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"116": [
			0,
			.55358,
			0,
			0,
			.525
		],
		"117": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"118": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"119": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"120": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"121": [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		"122": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"123": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"124": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"125": [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		"126": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"127": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"160": [
			0,
			0,
			0,
			0,
			.525
		],
		"176": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"184": [
			.19445,
			0,
			0,
			0,
			.525
		],
		"305": [
			0,
			.43056,
			0,
			0,
			.525
		],
		"567": [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		"711": [
			0,
			.56597,
			0,
			0,
			.525
		],
		"713": [
			0,
			.56555,
			0,
			0,
			.525
		],
		"714": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"715": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"728": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"730": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"770": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"771": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"776": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"915": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"916": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"920": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"923": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"926": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"928": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"931": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"933": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"934": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"936": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"937": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"8216": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"8217": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"8242": [
			0,
			.61111,
			0,
			0,
			.525
		],
		"9251": [
			.11111,
			.21944,
			0,
			0,
			.525
		]
	}
};
/**
* This file contains metrics regarding fonts and individual symbols. The sigma
* and xi variables, as well as the metricMap map contain data extracted from
* TeX, TeX font metrics, and the TTF files. These data are then exposed via the
* `metrics` variable and the getCharacterMetrics function.
*/
var sigmasAndXis = {
	slant: [
		.25,
		.25,
		.25
	],
	space: [
		0,
		0,
		0
	],
	stretch: [
		0,
		0,
		0
	],
	shrink: [
		0,
		0,
		0
	],
	xHeight: [
		.431,
		.431,
		.431
	],
	quad: [
		1,
		1.171,
		1.472
	],
	extraSpace: [
		0,
		0,
		0
	],
	num1: [
		.677,
		.732,
		.925
	],
	num2: [
		.394,
		.384,
		.387
	],
	num3: [
		.444,
		.471,
		.504
	],
	denom1: [
		.686,
		.752,
		1.025
	],
	denom2: [
		.345,
		.344,
		.532
	],
	sup1: [
		.413,
		.503,
		.504
	],
	sup2: [
		.363,
		.431,
		.404
	],
	sup3: [
		.289,
		.286,
		.294
	],
	sub1: [
		.15,
		.143,
		.2
	],
	sub2: [
		.247,
		.286,
		.4
	],
	supDrop: [
		.386,
		.353,
		.494
	],
	subDrop: [
		.05,
		.071,
		.1
	],
	delim1: [
		2.39,
		1.7,
		1.98
	],
	delim2: [
		1.01,
		1.157,
		1.42
	],
	axisHeight: [
		.25,
		.25,
		.25
	],
	defaultRuleThickness: [
		.04,
		.049,
		.049
	],
	bigOpSpacing1: [
		.111,
		.111,
		.111
	],
	bigOpSpacing2: [
		.166,
		.166,
		.166
	],
	bigOpSpacing3: [
		.2,
		.2,
		.2
	],
	bigOpSpacing4: [
		.6,
		.611,
		.611
	],
	bigOpSpacing5: [
		.1,
		.143,
		.143
	],
	sqrtRuleThickness: [
		.04,
		.04,
		.04
	],
	ptPerEm: [
		10,
		10,
		10
	],
	doubleRuleSep: [
		.2,
		.2,
		.2
	],
	arrayRuleWidth: [
		.04,
		.04,
		.04
	],
	fboxsep: [
		.3,
		.3,
		.3
	],
	fboxrule: [
		.04,
		.04,
		.04
	]
};
var extraCharacterMap = {
	"Å": "A",
	"Ð": "D",
	"Þ": "o",
	"å": "a",
	"ð": "d",
	"þ": "o",
	"А": "A",
	"Б": "B",
	"В": "B",
	"Г": "F",
	"Д": "A",
	"Е": "E",
	"Ж": "K",
	"З": "3",
	"И": "N",
	"Й": "N",
	"К": "K",
	"Л": "N",
	"М": "M",
	"Н": "H",
	"О": "O",
	"П": "N",
	"Р": "P",
	"С": "C",
	"Т": "T",
	"У": "y",
	"Ф": "O",
	"Х": "X",
	"Ц": "U",
	"Ч": "h",
	"Ш": "W",
	"Щ": "W",
	"Ъ": "B",
	"Ы": "X",
	"Ь": "B",
	"Э": "3",
	"Ю": "X",
	"Я": "R",
	"а": "a",
	"б": "b",
	"в": "a",
	"г": "r",
	"д": "y",
	"е": "e",
	"ж": "m",
	"з": "e",
	"и": "n",
	"й": "n",
	"к": "n",
	"л": "n",
	"м": "m",
	"н": "n",
	"о": "o",
	"п": "n",
	"р": "p",
	"с": "c",
	"т": "o",
	"у": "y",
	"ф": "b",
	"х": "x",
	"ц": "n",
	"ч": "n",
	"ш": "w",
	"щ": "w",
	"ъ": "a",
	"ы": "m",
	"ь": "a",
	"э": "e",
	"ю": "m",
	"я": "r"
};
/**
* This function adds new font metrics to default metricMap
* It can also override existing metrics
*/
function setFontMetrics(fontName, metrics) {
	fontMetricsData[fontName] = metrics;
}
/**
* This function is a convenience function for looking up information in the
* metricMap table. It takes a character as a string, and a font.
*
* Note: the `width` property may be undefined if fontMetricsData.js wasn't
* built using `Make extended_metrics`.
*/
function getCharacterMetrics(character, font, mode) {
	if (!fontMetricsData[font]) throw new Error("Font metrics not found for font: " + font + ".");
	var ch = character.charCodeAt(0);
	var metrics = fontMetricsData[font][ch];
	if (!metrics && character[0] in extraCharacterMap) {
		ch = extraCharacterMap[character[0]].charCodeAt(0);
		metrics = fontMetricsData[font][ch];
	}
	if (!metrics && mode === "text") {
		if (supportedCodepoint(ch)) metrics = fontMetricsData[font][77];
	}
	if (metrics) return {
		depth: metrics[0],
		height: metrics[1],
		italic: metrics[2],
		skew: metrics[3],
		width: metrics[4]
	};
}
var fontMetricsBySizeIndex = {};
/**
* Get the font metrics for a given size.
*/
function getGlobalMetrics(size) {
	var sizeIndex;
	if (size >= 5) sizeIndex = 0;
	else if (size >= 3) sizeIndex = 1;
	else sizeIndex = 2;
	if (!fontMetricsBySizeIndex[sizeIndex]) {
		var metrics = fontMetricsBySizeIndex[sizeIndex] = { cssEmPerMu: sigmasAndXis.quad[sizeIndex] / 18 };
		for (var key of Object.keys(sigmasAndXis)) metrics[key] = sigmasAndXis[key][sizeIndex];
	}
	return fontMetricsBySizeIndex[sizeIndex];
}
/**
* This file holds a list of all no-argument functions and single-character
* symbols (like 'a' or ';').
*
* For each of the symbols, there are three properties they can have:
* - font (required): the font to be used for this symbol. Either "main" (the
normal font), or "ams" (the ams fonts).
* - group (required): the ParseNode group type the symbol should have (i.e.
"textord", "mathord", etc).
See https://github.com/KaTeX/KaTeX/wiki/Examining-TeX#group-types
* - replace: the character that this symbol or function should be
*   replaced with (i.e. "\phi" has a replace value of "\u03d5", the phi
*   character in the main font).
*
* The outermost map in the table indicates what mode the symbols should be
* accepted in (e.g. "math" or "text").
*/
var symbols = {
	"math": {},
	"text": {}
};
/** `acceptUnicodeChar = true` is only applicable if `replace` is set. */
function defineSymbol(mode, font, group, replace, name, acceptUnicodeChar) {
	symbols[mode][name] = {
		font,
		group,
		replace
	};
	if (acceptUnicodeChar && replace) symbols[mode][replace] = symbols[mode][name];
}
var math = "math";
var text = "text";
var main = "main";
var ams = "ams";
var accent = "accent-token";
var bin = "bin";
var close = "close";
var inner = "inner";
var mathord = "mathord";
var op = "op-token";
var open = "open";
var punct = "punct";
var rel = "rel";
var spacing = "spacing";
var textord = "textord";
defineSymbol(math, main, rel, "≡", "\\equiv", true);
defineSymbol(math, main, rel, "≺", "\\prec", true);
defineSymbol(math, main, rel, "≻", "\\succ", true);
defineSymbol(math, main, rel, "∼", "\\sim", true);
defineSymbol(math, main, rel, "⊥", "\\perp");
defineSymbol(math, main, rel, "⪯", "\\preceq", true);
defineSymbol(math, main, rel, "⪰", "\\succeq", true);
defineSymbol(math, main, rel, "≃", "\\simeq", true);
defineSymbol(math, main, rel, "∣", "\\mid", true);
defineSymbol(math, main, rel, "≪", "\\ll", true);
defineSymbol(math, main, rel, "≫", "\\gg", true);
defineSymbol(math, main, rel, "≍", "\\asymp", true);
defineSymbol(math, main, rel, "∥", "\\parallel");
defineSymbol(math, main, rel, "⋈", "\\bowtie", true);
defineSymbol(math, main, rel, "⌣", "\\smile", true);
defineSymbol(math, main, rel, "⊑", "\\sqsubseteq", true);
defineSymbol(math, main, rel, "⊒", "\\sqsupseteq", true);
defineSymbol(math, main, rel, "≐", "\\doteq", true);
defineSymbol(math, main, rel, "⌢", "\\frown", true);
defineSymbol(math, main, rel, "∋", "\\ni", true);
defineSymbol(math, main, rel, "∝", "\\propto", true);
defineSymbol(math, main, rel, "⊢", "\\vdash", true);
defineSymbol(math, main, rel, "⊣", "\\dashv", true);
defineSymbol(math, main, rel, "∋", "\\owns");
defineSymbol(math, main, punct, ".", "\\ldotp");
defineSymbol(math, main, punct, "⋅", "\\cdotp");
defineSymbol(math, main, punct, "⋅", "·");
defineSymbol(text, main, textord, "⋅", "·");
defineSymbol(math, main, textord, "#", "\\#");
defineSymbol(text, main, textord, "#", "\\#");
defineSymbol(math, main, textord, "&", "\\&");
defineSymbol(text, main, textord, "&", "\\&");
defineSymbol(math, main, textord, "ℵ", "\\aleph", true);
defineSymbol(math, main, textord, "∀", "\\forall", true);
defineSymbol(math, main, textord, "ℏ", "\\hbar", true);
defineSymbol(math, main, textord, "∃", "\\exists", true);
defineSymbol(math, main, textord, "∇", "\\nabla", true);
defineSymbol(math, main, textord, "♭", "\\flat", true);
defineSymbol(math, main, textord, "ℓ", "\\ell", true);
defineSymbol(math, main, textord, "♮", "\\natural", true);
defineSymbol(math, main, textord, "♣", "\\clubsuit", true);
defineSymbol(math, main, textord, "℘", "\\wp", true);
defineSymbol(math, main, textord, "♯", "\\sharp", true);
defineSymbol(math, main, textord, "♢", "\\diamondsuit", true);
defineSymbol(math, main, textord, "ℜ", "\\Re", true);
defineSymbol(math, main, textord, "♡", "\\heartsuit", true);
defineSymbol(math, main, textord, "ℑ", "\\Im", true);
defineSymbol(math, main, textord, "♠", "\\spadesuit", true);
defineSymbol(math, main, textord, "§", "\\S", true);
defineSymbol(text, main, textord, "§", "\\S");
defineSymbol(math, main, textord, "¶", "\\P", true);
defineSymbol(text, main, textord, "¶", "\\P");
defineSymbol(math, main, textord, "†", "\\dag");
defineSymbol(text, main, textord, "†", "\\dag");
defineSymbol(text, main, textord, "†", "\\textdagger");
defineSymbol(math, main, textord, "‡", "\\ddag");
defineSymbol(text, main, textord, "‡", "\\ddag");
defineSymbol(text, main, textord, "‡", "\\textdaggerdbl");
defineSymbol(math, main, close, "⎱", "\\rmoustache", true);
defineSymbol(math, main, open, "⎰", "\\lmoustache", true);
defineSymbol(math, main, close, "⟯", "\\rgroup", true);
defineSymbol(math, main, open, "⟮", "\\lgroup", true);
defineSymbol(math, main, bin, "∓", "\\mp", true);
defineSymbol(math, main, bin, "⊖", "\\ominus", true);
defineSymbol(math, main, bin, "⊎", "\\uplus", true);
defineSymbol(math, main, bin, "⊓", "\\sqcap", true);
defineSymbol(math, main, bin, "∗", "\\ast");
defineSymbol(math, main, bin, "⊔", "\\sqcup", true);
defineSymbol(math, main, bin, "◯", "\\bigcirc", true);
defineSymbol(math, main, bin, "∙", "\\bullet", true);
defineSymbol(math, main, bin, "‡", "\\ddagger");
defineSymbol(math, main, bin, "≀", "\\wr", true);
defineSymbol(math, main, bin, "⨿", "\\amalg");
defineSymbol(math, main, bin, "&", "\\And");
defineSymbol(math, main, rel, "⟵", "\\longleftarrow", true);
defineSymbol(math, main, rel, "⇐", "\\Leftarrow", true);
defineSymbol(math, main, rel, "⟸", "\\Longleftarrow", true);
defineSymbol(math, main, rel, "⟶", "\\longrightarrow", true);
defineSymbol(math, main, rel, "⇒", "\\Rightarrow", true);
defineSymbol(math, main, rel, "⟹", "\\Longrightarrow", true);
defineSymbol(math, main, rel, "↔", "\\leftrightarrow", true);
defineSymbol(math, main, rel, "⟷", "\\longleftrightarrow", true);
defineSymbol(math, main, rel, "⇔", "\\Leftrightarrow", true);
defineSymbol(math, main, rel, "⟺", "\\Longleftrightarrow", true);
defineSymbol(math, main, rel, "↦", "\\mapsto", true);
defineSymbol(math, main, rel, "⟼", "\\longmapsto", true);
defineSymbol(math, main, rel, "↗", "\\nearrow", true);
defineSymbol(math, main, rel, "↩", "\\hookleftarrow", true);
defineSymbol(math, main, rel, "↪", "\\hookrightarrow", true);
defineSymbol(math, main, rel, "↘", "\\searrow", true);
defineSymbol(math, main, rel, "↼", "\\leftharpoonup", true);
defineSymbol(math, main, rel, "⇀", "\\rightharpoonup", true);
defineSymbol(math, main, rel, "↙", "\\swarrow", true);
defineSymbol(math, main, rel, "↽", "\\leftharpoondown", true);
defineSymbol(math, main, rel, "⇁", "\\rightharpoondown", true);
defineSymbol(math, main, rel, "↖", "\\nwarrow", true);
defineSymbol(math, main, rel, "⇌", "\\rightleftharpoons", true);
defineSymbol(math, ams, rel, "≮", "\\nless", true);
defineSymbol(math, ams, rel, "", "\\@nleqslant");
defineSymbol(math, ams, rel, "", "\\@nleqq");
defineSymbol(math, ams, rel, "⪇", "\\lneq", true);
defineSymbol(math, ams, rel, "≨", "\\lneqq", true);
defineSymbol(math, ams, rel, "", "\\@lvertneqq");
defineSymbol(math, ams, rel, "⋦", "\\lnsim", true);
defineSymbol(math, ams, rel, "⪉", "\\lnapprox", true);
defineSymbol(math, ams, rel, "⊀", "\\nprec", true);
defineSymbol(math, ams, rel, "⋠", "\\npreceq", true);
defineSymbol(math, ams, rel, "⋨", "\\precnsim", true);
defineSymbol(math, ams, rel, "⪹", "\\precnapprox", true);
defineSymbol(math, ams, rel, "≁", "\\nsim", true);
defineSymbol(math, ams, rel, "", "\\@nshortmid");
defineSymbol(math, ams, rel, "∤", "\\nmid", true);
defineSymbol(math, ams, rel, "⊬", "\\nvdash", true);
defineSymbol(math, ams, rel, "⊭", "\\nvDash", true);
defineSymbol(math, ams, rel, "⋪", "\\ntriangleleft");
defineSymbol(math, ams, rel, "⋬", "\\ntrianglelefteq", true);
defineSymbol(math, ams, rel, "⊊", "\\subsetneq", true);
defineSymbol(math, ams, rel, "", "\\@varsubsetneq");
defineSymbol(math, ams, rel, "⫋", "\\subsetneqq", true);
defineSymbol(math, ams, rel, "", "\\@varsubsetneqq");
defineSymbol(math, ams, rel, "≯", "\\ngtr", true);
defineSymbol(math, ams, rel, "", "\\@ngeqslant");
defineSymbol(math, ams, rel, "", "\\@ngeqq");
defineSymbol(math, ams, rel, "⪈", "\\gneq", true);
defineSymbol(math, ams, rel, "≩", "\\gneqq", true);
defineSymbol(math, ams, rel, "", "\\@gvertneqq");
defineSymbol(math, ams, rel, "⋧", "\\gnsim", true);
defineSymbol(math, ams, rel, "⪊", "\\gnapprox", true);
defineSymbol(math, ams, rel, "⊁", "\\nsucc", true);
defineSymbol(math, ams, rel, "⋡", "\\nsucceq", true);
defineSymbol(math, ams, rel, "⋩", "\\succnsim", true);
defineSymbol(math, ams, rel, "⪺", "\\succnapprox", true);
defineSymbol(math, ams, rel, "≆", "\\ncong", true);
defineSymbol(math, ams, rel, "", "\\@nshortparallel");
defineSymbol(math, ams, rel, "∦", "\\nparallel", true);
defineSymbol(math, ams, rel, "⊯", "\\nVDash", true);
defineSymbol(math, ams, rel, "⋫", "\\ntriangleright");
defineSymbol(math, ams, rel, "⋭", "\\ntrianglerighteq", true);
defineSymbol(math, ams, rel, "", "\\@nsupseteqq");
defineSymbol(math, ams, rel, "⊋", "\\supsetneq", true);
defineSymbol(math, ams, rel, "", "\\@varsupsetneq");
defineSymbol(math, ams, rel, "⫌", "\\supsetneqq", true);
defineSymbol(math, ams, rel, "", "\\@varsupsetneqq");
defineSymbol(math, ams, rel, "⊮", "\\nVdash", true);
defineSymbol(math, ams, rel, "⪵", "\\precneqq", true);
defineSymbol(math, ams, rel, "⪶", "\\succneqq", true);
defineSymbol(math, ams, rel, "", "\\@nsubseteqq");
defineSymbol(math, ams, bin, "⊴", "\\unlhd");
defineSymbol(math, ams, bin, "⊵", "\\unrhd");
defineSymbol(math, ams, rel, "↚", "\\nleftarrow", true);
defineSymbol(math, ams, rel, "↛", "\\nrightarrow", true);
defineSymbol(math, ams, rel, "⇍", "\\nLeftarrow", true);
defineSymbol(math, ams, rel, "⇏", "\\nRightarrow", true);
defineSymbol(math, ams, rel, "↮", "\\nleftrightarrow", true);
defineSymbol(math, ams, rel, "⇎", "\\nLeftrightarrow", true);
defineSymbol(math, ams, rel, "△", "\\vartriangle");
defineSymbol(math, ams, textord, "ℏ", "\\hslash");
defineSymbol(math, ams, textord, "▽", "\\triangledown");
defineSymbol(math, ams, textord, "◊", "\\lozenge");
defineSymbol(math, ams, textord, "Ⓢ", "\\circledS");
defineSymbol(math, ams, textord, "®", "\\circledR");
defineSymbol(text, ams, textord, "®", "\\circledR");
defineSymbol(math, ams, textord, "∡", "\\measuredangle", true);
defineSymbol(math, ams, textord, "∄", "\\nexists");
defineSymbol(math, ams, textord, "℧", "\\mho");
defineSymbol(math, ams, textord, "Ⅎ", "\\Finv", true);
defineSymbol(math, ams, textord, "⅁", "\\Game", true);
defineSymbol(math, ams, textord, "‵", "\\backprime");
defineSymbol(math, ams, textord, "▲", "\\blacktriangle");
defineSymbol(math, ams, textord, "▼", "\\blacktriangledown");
defineSymbol(math, ams, textord, "■", "\\blacksquare");
defineSymbol(math, ams, textord, "⧫", "\\blacklozenge");
defineSymbol(math, ams, textord, "★", "\\bigstar");
defineSymbol(math, ams, textord, "∢", "\\sphericalangle", true);
defineSymbol(math, ams, textord, "∁", "\\complement", true);
defineSymbol(math, ams, textord, "ð", "\\eth", true);
defineSymbol(text, main, textord, "ð", "ð");
defineSymbol(math, ams, textord, "╱", "\\diagup");
defineSymbol(math, ams, textord, "╲", "\\diagdown");
defineSymbol(math, ams, textord, "□", "\\square");
defineSymbol(math, ams, textord, "□", "\\Box");
defineSymbol(math, ams, textord, "◊", "\\Diamond");
defineSymbol(math, ams, textord, "¥", "\\yen", true);
defineSymbol(text, ams, textord, "¥", "\\yen", true);
defineSymbol(math, ams, textord, "✓", "\\checkmark", true);
defineSymbol(text, ams, textord, "✓", "\\checkmark");
defineSymbol(math, ams, textord, "ℶ", "\\beth", true);
defineSymbol(math, ams, textord, "ℸ", "\\daleth", true);
defineSymbol(math, ams, textord, "ℷ", "\\gimel", true);
defineSymbol(math, ams, textord, "ϝ", "\\digamma", true);
defineSymbol(math, ams, textord, "ϰ", "\\varkappa");
defineSymbol(math, ams, open, "┌", "\\@ulcorner", true);
defineSymbol(math, ams, close, "┐", "\\@urcorner", true);
defineSymbol(math, ams, open, "└", "\\@llcorner", true);
defineSymbol(math, ams, close, "┘", "\\@lrcorner", true);
defineSymbol(math, ams, rel, "≦", "\\leqq", true);
defineSymbol(math, ams, rel, "⩽", "\\leqslant", true);
defineSymbol(math, ams, rel, "⪕", "\\eqslantless", true);
defineSymbol(math, ams, rel, "≲", "\\lesssim", true);
defineSymbol(math, ams, rel, "⪅", "\\lessapprox", true);
defineSymbol(math, ams, rel, "≊", "\\approxeq", true);
defineSymbol(math, ams, bin, "⋖", "\\lessdot");
defineSymbol(math, ams, rel, "⋘", "\\lll", true);
defineSymbol(math, ams, rel, "≶", "\\lessgtr", true);
defineSymbol(math, ams, rel, "⋚", "\\lesseqgtr", true);
defineSymbol(math, ams, rel, "⪋", "\\lesseqqgtr", true);
defineSymbol(math, ams, rel, "≑", "\\doteqdot");
defineSymbol(math, ams, rel, "≓", "\\risingdotseq", true);
defineSymbol(math, ams, rel, "≒", "\\fallingdotseq", true);
defineSymbol(math, ams, rel, "∽", "\\backsim", true);
defineSymbol(math, ams, rel, "⋍", "\\backsimeq", true);
defineSymbol(math, ams, rel, "⫅", "\\subseteqq", true);
defineSymbol(math, ams, rel, "⋐", "\\Subset", true);
defineSymbol(math, ams, rel, "⊏", "\\sqsubset", true);
defineSymbol(math, ams, rel, "≼", "\\preccurlyeq", true);
defineSymbol(math, ams, rel, "⋞", "\\curlyeqprec", true);
defineSymbol(math, ams, rel, "≾", "\\precsim", true);
defineSymbol(math, ams, rel, "⪷", "\\precapprox", true);
defineSymbol(math, ams, rel, "⊲", "\\vartriangleleft");
defineSymbol(math, ams, rel, "⊴", "\\trianglelefteq");
defineSymbol(math, ams, rel, "⊨", "\\vDash", true);
defineSymbol(math, ams, rel, "⊪", "\\Vvdash", true);
defineSymbol(math, ams, rel, "⌣", "\\smallsmile");
defineSymbol(math, ams, rel, "⌢", "\\smallfrown");
defineSymbol(math, ams, rel, "≏", "\\bumpeq", true);
defineSymbol(math, ams, rel, "≎", "\\Bumpeq", true);
defineSymbol(math, ams, rel, "≧", "\\geqq", true);
defineSymbol(math, ams, rel, "⩾", "\\geqslant", true);
defineSymbol(math, ams, rel, "⪖", "\\eqslantgtr", true);
defineSymbol(math, ams, rel, "≳", "\\gtrsim", true);
defineSymbol(math, ams, rel, "⪆", "\\gtrapprox", true);
defineSymbol(math, ams, bin, "⋗", "\\gtrdot");
defineSymbol(math, ams, rel, "⋙", "\\ggg", true);
defineSymbol(math, ams, rel, "≷", "\\gtrless", true);
defineSymbol(math, ams, rel, "⋛", "\\gtreqless", true);
defineSymbol(math, ams, rel, "⪌", "\\gtreqqless", true);
defineSymbol(math, ams, rel, "≖", "\\eqcirc", true);
defineSymbol(math, ams, rel, "≗", "\\circeq", true);
defineSymbol(math, ams, rel, "≜", "\\triangleq", true);
defineSymbol(math, ams, rel, "∼", "\\thicksim");
defineSymbol(math, ams, rel, "≈", "\\thickapprox");
defineSymbol(math, ams, rel, "⫆", "\\supseteqq", true);
defineSymbol(math, ams, rel, "⋑", "\\Supset", true);
defineSymbol(math, ams, rel, "⊐", "\\sqsupset", true);
defineSymbol(math, ams, rel, "≽", "\\succcurlyeq", true);
defineSymbol(math, ams, rel, "⋟", "\\curlyeqsucc", true);
defineSymbol(math, ams, rel, "≿", "\\succsim", true);
defineSymbol(math, ams, rel, "⪸", "\\succapprox", true);
defineSymbol(math, ams, rel, "⊳", "\\vartriangleright");
defineSymbol(math, ams, rel, "⊵", "\\trianglerighteq");
defineSymbol(math, ams, rel, "⊩", "\\Vdash", true);
defineSymbol(math, ams, rel, "∣", "\\shortmid");
defineSymbol(math, ams, rel, "∥", "\\shortparallel");
defineSymbol(math, ams, rel, "≬", "\\between", true);
defineSymbol(math, ams, rel, "⋔", "\\pitchfork", true);
defineSymbol(math, ams, rel, "∝", "\\varpropto");
defineSymbol(math, ams, rel, "◀", "\\blacktriangleleft");
defineSymbol(math, ams, rel, "∴", "\\therefore", true);
defineSymbol(math, ams, rel, "∍", "\\backepsilon");
defineSymbol(math, ams, rel, "▶", "\\blacktriangleright");
defineSymbol(math, ams, rel, "∵", "\\because", true);
defineSymbol(math, ams, rel, "⋘", "\\llless");
defineSymbol(math, ams, rel, "⋙", "\\gggtr");
defineSymbol(math, ams, bin, "⊲", "\\lhd");
defineSymbol(math, ams, bin, "⊳", "\\rhd");
defineSymbol(math, ams, rel, "≂", "\\eqsim", true);
defineSymbol(math, main, rel, "⋈", "\\Join");
defineSymbol(math, ams, rel, "≑", "\\Doteq", true);
defineSymbol(math, ams, bin, "∔", "\\dotplus", true);
defineSymbol(math, ams, bin, "∖", "\\smallsetminus");
defineSymbol(math, ams, bin, "⋒", "\\Cap", true);
defineSymbol(math, ams, bin, "⋓", "\\Cup", true);
defineSymbol(math, ams, bin, "⩞", "\\doublebarwedge", true);
defineSymbol(math, ams, bin, "⊟", "\\boxminus", true);
defineSymbol(math, ams, bin, "⊞", "\\boxplus", true);
defineSymbol(math, ams, bin, "⋇", "\\divideontimes", true);
defineSymbol(math, ams, bin, "⋉", "\\ltimes", true);
defineSymbol(math, ams, bin, "⋊", "\\rtimes", true);
defineSymbol(math, ams, bin, "⋋", "\\leftthreetimes", true);
defineSymbol(math, ams, bin, "⋌", "\\rightthreetimes", true);
defineSymbol(math, ams, bin, "⋏", "\\curlywedge", true);
defineSymbol(math, ams, bin, "⋎", "\\curlyvee", true);
defineSymbol(math, ams, bin, "⊝", "\\circleddash", true);
defineSymbol(math, ams, bin, "⊛", "\\circledast", true);
defineSymbol(math, ams, bin, "⋅", "\\centerdot");
defineSymbol(math, ams, bin, "⊺", "\\intercal", true);
defineSymbol(math, ams, bin, "⋒", "\\doublecap");
defineSymbol(math, ams, bin, "⋓", "\\doublecup");
defineSymbol(math, ams, bin, "⊠", "\\boxtimes", true);
defineSymbol(math, ams, rel, "⇢", "\\dashrightarrow", true);
defineSymbol(math, ams, rel, "⇠", "\\dashleftarrow", true);
defineSymbol(math, ams, rel, "⇇", "\\leftleftarrows", true);
defineSymbol(math, ams, rel, "⇆", "\\leftrightarrows", true);
defineSymbol(math, ams, rel, "⇚", "\\Lleftarrow", true);
defineSymbol(math, ams, rel, "↞", "\\twoheadleftarrow", true);
defineSymbol(math, ams, rel, "↢", "\\leftarrowtail", true);
defineSymbol(math, ams, rel, "↫", "\\looparrowleft", true);
defineSymbol(math, ams, rel, "⇋", "\\leftrightharpoons", true);
defineSymbol(math, ams, rel, "↶", "\\curvearrowleft", true);
defineSymbol(math, ams, rel, "↺", "\\circlearrowleft", true);
defineSymbol(math, ams, rel, "↰", "\\Lsh", true);
defineSymbol(math, ams, rel, "⇈", "\\upuparrows", true);
defineSymbol(math, ams, rel, "↿", "\\upharpoonleft", true);
defineSymbol(math, ams, rel, "⇃", "\\downharpoonleft", true);
defineSymbol(math, main, rel, "⊶", "\\origof", true);
defineSymbol(math, main, rel, "⊷", "\\imageof", true);
defineSymbol(math, ams, rel, "⊸", "\\multimap", true);
defineSymbol(math, ams, rel, "↭", "\\leftrightsquigarrow", true);
defineSymbol(math, ams, rel, "⇉", "\\rightrightarrows", true);
defineSymbol(math, ams, rel, "⇄", "\\rightleftarrows", true);
defineSymbol(math, ams, rel, "↠", "\\twoheadrightarrow", true);
defineSymbol(math, ams, rel, "↣", "\\rightarrowtail", true);
defineSymbol(math, ams, rel, "↬", "\\looparrowright", true);
defineSymbol(math, ams, rel, "↷", "\\curvearrowright", true);
defineSymbol(math, ams, rel, "↻", "\\circlearrowright", true);
defineSymbol(math, ams, rel, "↱", "\\Rsh", true);
defineSymbol(math, ams, rel, "⇊", "\\downdownarrows", true);
defineSymbol(math, ams, rel, "↾", "\\upharpoonright", true);
defineSymbol(math, ams, rel, "⇂", "\\downharpoonright", true);
defineSymbol(math, ams, rel, "⇝", "\\rightsquigarrow", true);
defineSymbol(math, ams, rel, "⇝", "\\leadsto");
defineSymbol(math, ams, rel, "⇛", "\\Rrightarrow", true);
defineSymbol(math, ams, rel, "↾", "\\restriction");
defineSymbol(math, main, textord, "‘", "`");
defineSymbol(math, main, textord, "$", "\\$");
defineSymbol(text, main, textord, "$", "\\$");
defineSymbol(text, main, textord, "$", "\\textdollar");
defineSymbol(math, main, textord, "%", "\\%");
defineSymbol(text, main, textord, "%", "\\%");
defineSymbol(math, main, textord, "_", "\\_");
defineSymbol(text, main, textord, "_", "\\_");
defineSymbol(text, main, textord, "_", "\\textunderscore");
defineSymbol(math, main, textord, "∠", "\\angle", true);
defineSymbol(math, main, textord, "∞", "\\infty", true);
defineSymbol(math, main, textord, "′", "\\prime");
defineSymbol(math, main, textord, "△", "\\triangle");
defineSymbol(math, main, textord, "Γ", "\\Gamma", true);
defineSymbol(math, main, textord, "Δ", "\\Delta", true);
defineSymbol(math, main, textord, "Θ", "\\Theta", true);
defineSymbol(math, main, textord, "Λ", "\\Lambda", true);
defineSymbol(math, main, textord, "Ξ", "\\Xi", true);
defineSymbol(math, main, textord, "Π", "\\Pi", true);
defineSymbol(math, main, textord, "Σ", "\\Sigma", true);
defineSymbol(math, main, textord, "Υ", "\\Upsilon", true);
defineSymbol(math, main, textord, "Φ", "\\Phi", true);
defineSymbol(math, main, textord, "Ψ", "\\Psi", true);
defineSymbol(math, main, textord, "Ω", "\\Omega", true);
defineSymbol(math, main, textord, "A", "Α");
defineSymbol(math, main, textord, "B", "Β");
defineSymbol(math, main, textord, "E", "Ε");
defineSymbol(math, main, textord, "Z", "Ζ");
defineSymbol(math, main, textord, "H", "Η");
defineSymbol(math, main, textord, "I", "Ι");
defineSymbol(math, main, textord, "K", "Κ");
defineSymbol(math, main, textord, "M", "Μ");
defineSymbol(math, main, textord, "N", "Ν");
defineSymbol(math, main, textord, "O", "Ο");
defineSymbol(math, main, textord, "P", "Ρ");
defineSymbol(math, main, textord, "T", "Τ");
defineSymbol(math, main, textord, "X", "Χ");
defineSymbol(math, main, textord, "¬", "\\neg", true);
defineSymbol(math, main, textord, "¬", "\\lnot");
defineSymbol(math, main, textord, "⊤", "\\top");
defineSymbol(math, main, textord, "⊥", "\\bot");
defineSymbol(math, main, textord, "∅", "\\emptyset");
defineSymbol(math, ams, textord, "∅", "\\varnothing");
defineSymbol(math, main, mathord, "α", "\\alpha", true);
defineSymbol(math, main, mathord, "β", "\\beta", true);
defineSymbol(math, main, mathord, "γ", "\\gamma", true);
defineSymbol(math, main, mathord, "δ", "\\delta", true);
defineSymbol(math, main, mathord, "ϵ", "\\epsilon", true);
defineSymbol(math, main, mathord, "ζ", "\\zeta", true);
defineSymbol(math, main, mathord, "η", "\\eta", true);
defineSymbol(math, main, mathord, "θ", "\\theta", true);
defineSymbol(math, main, mathord, "ι", "\\iota", true);
defineSymbol(math, main, mathord, "κ", "\\kappa", true);
defineSymbol(math, main, mathord, "λ", "\\lambda", true);
defineSymbol(math, main, mathord, "μ", "\\mu", true);
defineSymbol(math, main, mathord, "ν", "\\nu", true);
defineSymbol(math, main, mathord, "ξ", "\\xi", true);
defineSymbol(math, main, mathord, "ο", "\\omicron", true);
defineSymbol(math, main, mathord, "π", "\\pi", true);
defineSymbol(math, main, mathord, "ρ", "\\rho", true);
defineSymbol(math, main, mathord, "σ", "\\sigma", true);
defineSymbol(math, main, mathord, "τ", "\\tau", true);
defineSymbol(math, main, mathord, "υ", "\\upsilon", true);
defineSymbol(math, main, mathord, "ϕ", "\\phi", true);
defineSymbol(math, main, mathord, "χ", "\\chi", true);
defineSymbol(math, main, mathord, "ψ", "\\psi", true);
defineSymbol(math, main, mathord, "ω", "\\omega", true);
defineSymbol(math, main, mathord, "ε", "\\varepsilon", true);
defineSymbol(math, main, mathord, "ϑ", "\\vartheta", true);
defineSymbol(math, main, mathord, "ϖ", "\\varpi", true);
defineSymbol(math, main, mathord, "ϱ", "\\varrho", true);
defineSymbol(math, main, mathord, "ς", "\\varsigma", true);
defineSymbol(math, main, mathord, "φ", "\\varphi", true);
defineSymbol(math, main, bin, "∗", "*", true);
defineSymbol(math, main, bin, "+", "+");
defineSymbol(math, main, bin, "−", "-", true);
defineSymbol(math, main, bin, "⋅", "\\cdot", true);
defineSymbol(math, main, bin, "∘", "\\circ", true);
defineSymbol(math, main, bin, "÷", "\\div", true);
defineSymbol(math, main, bin, "±", "\\pm", true);
defineSymbol(math, main, bin, "×", "\\times", true);
defineSymbol(math, main, bin, "∩", "\\cap", true);
defineSymbol(math, main, bin, "∪", "\\cup", true);
defineSymbol(math, main, bin, "∖", "\\setminus", true);
defineSymbol(math, main, bin, "∧", "\\land");
defineSymbol(math, main, bin, "∨", "\\lor");
defineSymbol(math, main, bin, "∧", "\\wedge", true);
defineSymbol(math, main, bin, "∨", "\\vee", true);
defineSymbol(math, main, textord, "√", "\\surd");
defineSymbol(math, main, open, "⟨", "\\langle", true);
defineSymbol(math, main, open, "∣", "\\lvert");
defineSymbol(math, main, open, "∥", "\\lVert");
defineSymbol(math, main, close, "?", "?");
defineSymbol(math, main, close, "!", "!");
defineSymbol(math, main, close, "⟩", "\\rangle", true);
defineSymbol(math, main, close, "∣", "\\rvert");
defineSymbol(math, main, close, "∥", "\\rVert");
defineSymbol(math, main, rel, "=", "=");
defineSymbol(math, main, rel, ":", ":");
defineSymbol(math, main, rel, "≈", "\\approx", true);
defineSymbol(math, main, rel, "≅", "\\cong", true);
defineSymbol(math, main, rel, "≥", "\\ge");
defineSymbol(math, main, rel, "≥", "\\geq", true);
defineSymbol(math, main, rel, "←", "\\gets");
defineSymbol(math, main, rel, ">", "\\gt", true);
defineSymbol(math, main, rel, "∈", "\\in", true);
defineSymbol(math, main, rel, "", "\\@not");
defineSymbol(math, main, rel, "⊂", "\\subset", true);
defineSymbol(math, main, rel, "⊃", "\\supset", true);
defineSymbol(math, main, rel, "⊆", "\\subseteq", true);
defineSymbol(math, main, rel, "⊇", "\\supseteq", true);
defineSymbol(math, ams, rel, "⊈", "\\nsubseteq", true);
defineSymbol(math, ams, rel, "⊉", "\\nsupseteq", true);
defineSymbol(math, main, rel, "⊨", "\\models");
defineSymbol(math, main, rel, "←", "\\leftarrow", true);
defineSymbol(math, main, rel, "≤", "\\le");
defineSymbol(math, main, rel, "≤", "\\leq", true);
defineSymbol(math, main, rel, "<", "\\lt", true);
defineSymbol(math, main, rel, "→", "\\rightarrow", true);
defineSymbol(math, main, rel, "→", "\\to");
defineSymbol(math, ams, rel, "≱", "\\ngeq", true);
defineSymbol(math, ams, rel, "≰", "\\nleq", true);
defineSymbol(math, main, spacing, "\xA0", "\\ ");
defineSymbol(math, main, spacing, "\xA0", "\\space");
defineSymbol(math, main, spacing, "\xA0", "\\nobreakspace");
defineSymbol(text, main, spacing, "\xA0", "\\ ");
defineSymbol(text, main, spacing, "\xA0", " ");
defineSymbol(text, main, spacing, "\xA0", "\\space");
defineSymbol(text, main, spacing, "\xA0", "\\nobreakspace");
defineSymbol(math, main, spacing, "", "\\nobreak");
defineSymbol(math, main, spacing, "", "\\allowbreak");
defineSymbol(math, main, punct, ",", ",");
defineSymbol(math, main, punct, ";", ";");
defineSymbol(math, ams, bin, "⊼", "\\barwedge", true);
defineSymbol(math, ams, bin, "⊻", "\\veebar", true);
defineSymbol(math, main, bin, "⊙", "\\odot", true);
defineSymbol(math, main, bin, "⊕", "\\oplus", true);
defineSymbol(math, main, bin, "⊗", "\\otimes", true);
defineSymbol(math, main, textord, "∂", "\\partial", true);
defineSymbol(math, main, bin, "⊘", "\\oslash", true);
defineSymbol(math, ams, bin, "⊚", "\\circledcirc", true);
defineSymbol(math, ams, bin, "⊡", "\\boxdot", true);
defineSymbol(math, main, bin, "△", "\\bigtriangleup");
defineSymbol(math, main, bin, "▽", "\\bigtriangledown");
defineSymbol(math, main, bin, "†", "\\dagger");
defineSymbol(math, main, bin, "⋄", "\\diamond");
defineSymbol(math, main, bin, "⋆", "\\star");
defineSymbol(math, main, bin, "◃", "\\triangleleft");
defineSymbol(math, main, bin, "▹", "\\triangleright");
defineSymbol(math, main, open, "{", "\\{");
defineSymbol(text, main, textord, "{", "\\{");
defineSymbol(text, main, textord, "{", "\\textbraceleft");
defineSymbol(math, main, close, "}", "\\}");
defineSymbol(text, main, textord, "}", "\\}");
defineSymbol(text, main, textord, "}", "\\textbraceright");
defineSymbol(math, main, open, "{", "\\lbrace");
defineSymbol(math, main, close, "}", "\\rbrace");
defineSymbol(math, main, open, "[", "\\lbrack", true);
defineSymbol(text, main, textord, "[", "\\lbrack", true);
defineSymbol(math, main, close, "]", "\\rbrack", true);
defineSymbol(text, main, textord, "]", "\\rbrack", true);
defineSymbol(math, main, open, "(", "\\lparen", true);
defineSymbol(math, main, close, ")", "\\rparen", true);
defineSymbol(text, main, textord, "<", "\\textless", true);
defineSymbol(text, main, textord, ">", "\\textgreater", true);
defineSymbol(math, main, open, "⌊", "\\lfloor", true);
defineSymbol(math, main, close, "⌋", "\\rfloor", true);
defineSymbol(math, main, open, "⌈", "\\lceil", true);
defineSymbol(math, main, close, "⌉", "\\rceil", true);
defineSymbol(math, main, textord, "\\", "\\backslash");
defineSymbol(math, main, textord, "∣", "|");
defineSymbol(math, main, textord, "∣", "\\vert");
defineSymbol(text, main, textord, "|", "\\textbar", true);
defineSymbol(math, main, textord, "∥", "\\|");
defineSymbol(math, main, textord, "∥", "\\Vert");
defineSymbol(text, main, textord, "∥", "\\textbardbl");
defineSymbol(text, main, textord, "~", "\\textasciitilde");
defineSymbol(text, main, textord, "\\", "\\textbackslash");
defineSymbol(text, main, textord, "^", "\\textasciicircum");
defineSymbol(math, main, rel, "↑", "\\uparrow", true);
defineSymbol(math, main, rel, "⇑", "\\Uparrow", true);
defineSymbol(math, main, rel, "↓", "\\downarrow", true);
defineSymbol(math, main, rel, "⇓", "\\Downarrow", true);
defineSymbol(math, main, rel, "↕", "\\updownarrow", true);
defineSymbol(math, main, rel, "⇕", "\\Updownarrow", true);
defineSymbol(math, main, op, "∐", "\\coprod");
defineSymbol(math, main, op, "⋁", "\\bigvee");
defineSymbol(math, main, op, "⋀", "\\bigwedge");
defineSymbol(math, main, op, "⨄", "\\biguplus");
defineSymbol(math, main, op, "⋂", "\\bigcap");
defineSymbol(math, main, op, "⋃", "\\bigcup");
defineSymbol(math, main, op, "∫", "\\int");
defineSymbol(math, main, op, "∫", "\\intop");
defineSymbol(math, main, op, "∬", "\\iint");
defineSymbol(math, main, op, "∭", "\\iiint");
defineSymbol(math, main, op, "∏", "\\prod");
defineSymbol(math, main, op, "∑", "\\sum");
defineSymbol(math, main, op, "⨂", "\\bigotimes");
defineSymbol(math, main, op, "⨁", "\\bigoplus");
defineSymbol(math, main, op, "⨀", "\\bigodot");
defineSymbol(math, main, op, "∮", "\\oint");
defineSymbol(math, main, op, "∯", "\\oiint");
defineSymbol(math, main, op, "∰", "\\oiiint");
defineSymbol(math, main, op, "⨆", "\\bigsqcup");
defineSymbol(math, main, op, "∫", "\\smallint");
defineSymbol(text, main, inner, "…", "\\textellipsis");
defineSymbol(math, main, inner, "…", "\\mathellipsis");
defineSymbol(text, main, inner, "…", "\\ldots", true);
defineSymbol(math, main, inner, "…", "\\ldots", true);
defineSymbol(math, main, inner, "⋯", "\\@cdots", true);
defineSymbol(math, main, inner, "⋱", "\\ddots", true);
defineSymbol(math, main, textord, "⋮", "\\varvdots");
defineSymbol(text, main, textord, "⋮", "\\varvdots");
defineSymbol(math, main, accent, "ˊ", "\\acute");
defineSymbol(math, main, accent, "ˋ", "\\grave");
defineSymbol(math, main, accent, "¨", "\\ddot");
defineSymbol(math, main, accent, "~", "\\tilde");
defineSymbol(math, main, accent, "ˉ", "\\bar");
defineSymbol(math, main, accent, "˘", "\\breve");
defineSymbol(math, main, accent, "ˇ", "\\check");
defineSymbol(math, main, accent, "^", "\\hat");
defineSymbol(math, main, accent, "⃗", "\\vec");
defineSymbol(math, main, accent, "˙", "\\dot");
defineSymbol(math, main, accent, "˚", "\\mathring");
defineSymbol(math, main, mathord, "", "\\@imath");
defineSymbol(math, main, mathord, "", "\\@jmath");
defineSymbol(math, main, textord, "ı", "ı");
defineSymbol(math, main, textord, "ȷ", "ȷ");
defineSymbol(text, main, textord, "ı", "\\i", true);
defineSymbol(text, main, textord, "ȷ", "\\j", true);
defineSymbol(text, main, textord, "ß", "\\ss", true);
defineSymbol(text, main, textord, "æ", "\\ae", true);
defineSymbol(text, main, textord, "œ", "\\oe", true);
defineSymbol(text, main, textord, "ø", "\\o", true);
defineSymbol(text, main, textord, "Æ", "\\AE", true);
defineSymbol(text, main, textord, "Œ", "\\OE", true);
defineSymbol(text, main, textord, "Ø", "\\O", true);
defineSymbol(text, main, accent, "ˊ", "\\'");
defineSymbol(text, main, accent, "ˋ", "\\`");
defineSymbol(text, main, accent, "ˆ", "\\^");
defineSymbol(text, main, accent, "˜", "\\~");
defineSymbol(text, main, accent, "ˉ", "\\=");
defineSymbol(text, main, accent, "˘", "\\u");
defineSymbol(text, main, accent, "˙", "\\.");
defineSymbol(text, main, accent, "¸", "\\c");
defineSymbol(text, main, accent, "˚", "\\r");
defineSymbol(text, main, accent, "ˇ", "\\v");
defineSymbol(text, main, accent, "¨", "\\\"");
defineSymbol(text, main, accent, "˝", "\\H");
defineSymbol(text, main, accent, "◯", "\\textcircled");
var ligatures = {
	"--": true,
	"---": true,
	"``": true,
	"''": true
};
defineSymbol(text, main, textord, "–", "--", true);
defineSymbol(text, main, textord, "–", "\\textendash");
defineSymbol(text, main, textord, "—", "---", true);
defineSymbol(text, main, textord, "—", "\\textemdash");
defineSymbol(text, main, textord, "‘", "`", true);
defineSymbol(text, main, textord, "‘", "\\textquoteleft");
defineSymbol(text, main, textord, "’", "'", true);
defineSymbol(text, main, textord, "’", "\\textquoteright");
defineSymbol(text, main, textord, "“", "``", true);
defineSymbol(text, main, textord, "“", "\\textquotedblleft");
defineSymbol(text, main, textord, "”", "''", true);
defineSymbol(text, main, textord, "”", "\\textquotedblright");
defineSymbol(math, main, textord, "°", "\\degree", true);
defineSymbol(text, main, textord, "°", "\\degree");
defineSymbol(text, main, textord, "°", "\\textdegree", true);
defineSymbol(math, main, textord, "£", "\\pounds");
defineSymbol(math, main, textord, "£", "\\mathsterling", true);
defineSymbol(text, main, textord, "£", "\\pounds");
defineSymbol(text, main, textord, "£", "\\textsterling", true);
defineSymbol(math, ams, textord, "✠", "\\maltese");
defineSymbol(text, ams, textord, "✠", "\\maltese");
var mathTextSymbols = "0123456789/@.\"";
for (var i = 0; i < mathTextSymbols.length; i++) {
	var ch = mathTextSymbols.charAt(i);
	defineSymbol(math, main, textord, ch, ch);
}
var textSymbols = "0123456789!@*()-=+\";:?/.,";
for (var _i = 0; _i < textSymbols.length; _i++) {
	var _ch = textSymbols.charAt(_i);
	defineSymbol(text, main, textord, _ch, _ch);
}
var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (var _i2 = 0; _i2 < letters.length; _i2++) {
	var _ch2 = letters.charAt(_i2);
	defineSymbol(math, main, mathord, _ch2, _ch2);
	defineSymbol(text, main, textord, _ch2, _ch2);
}
defineSymbol(math, ams, textord, "C", "ℂ");
defineSymbol(text, ams, textord, "C", "ℂ");
defineSymbol(math, ams, textord, "H", "ℍ");
defineSymbol(text, ams, textord, "H", "ℍ");
defineSymbol(math, ams, textord, "N", "ℕ");
defineSymbol(text, ams, textord, "N", "ℕ");
defineSymbol(math, ams, textord, "P", "ℙ");
defineSymbol(text, ams, textord, "P", "ℙ");
defineSymbol(math, ams, textord, "Q", "ℚ");
defineSymbol(text, ams, textord, "Q", "ℚ");
defineSymbol(math, ams, textord, "R", "ℝ");
defineSymbol(text, ams, textord, "R", "ℝ");
defineSymbol(math, ams, textord, "Z", "ℤ");
defineSymbol(text, ams, textord, "Z", "ℤ");
defineSymbol(math, main, mathord, "h", "ℎ");
defineSymbol(text, main, mathord, "h", "ℎ");
var wideChar;
for (var _i3 = 0; _i3 < letters.length; _i3++) {
	var _ch3 = letters.charAt(_i3);
	wideChar = String.fromCharCode(55349, 56320 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56372 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56424 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56580 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56684 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56736 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56788 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56840 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	wideChar = String.fromCharCode(55349, 56944 + _i3);
	defineSymbol(math, main, mathord, _ch3, wideChar);
	defineSymbol(text, main, textord, _ch3, wideChar);
	if (_i3 < 26) {
		wideChar = String.fromCharCode(55349, 56632 + _i3);
		defineSymbol(math, main, mathord, _ch3, wideChar);
		defineSymbol(text, main, textord, _ch3, wideChar);
		wideChar = String.fromCharCode(55349, 56476 + _i3);
		defineSymbol(math, main, mathord, _ch3, wideChar);
		defineSymbol(text, main, textord, _ch3, wideChar);
	}
}
wideChar = String.fromCharCode(55349, 56668);
defineSymbol(math, main, mathord, "k", wideChar);
defineSymbol(text, main, textord, "k", wideChar);
for (var _i4 = 0; _i4 < 10; _i4++) {
	var _ch4 = _i4.toString();
	wideChar = String.fromCharCode(55349, 57294 + _i4);
	defineSymbol(math, main, mathord, _ch4, wideChar);
	defineSymbol(text, main, textord, _ch4, wideChar);
	wideChar = String.fromCharCode(55349, 57314 + _i4);
	defineSymbol(math, main, mathord, _ch4, wideChar);
	defineSymbol(text, main, textord, _ch4, wideChar);
	wideChar = String.fromCharCode(55349, 57324 + _i4);
	defineSymbol(math, main, mathord, _ch4, wideChar);
	defineSymbol(text, main, textord, _ch4, wideChar);
	wideChar = String.fromCharCode(55349, 57334 + _i4);
	defineSymbol(math, main, mathord, _ch4, wideChar);
	defineSymbol(text, main, textord, _ch4, wideChar);
}
var extraLatin = "ÐÞþ";
for (var _i5 = 0; _i5 < extraLatin.length; _i5++) {
	var _ch5 = extraLatin.charAt(_i5);
	defineSymbol(math, main, mathord, _ch5, _ch5);
	defineSymbol(text, main, textord, _ch5, _ch5);
}
/**
* This file provides support for Unicode range U+1D400 to U+1D7FF,
* Mathematical Alphanumeric Symbols.
*
* Function wideCharacterFont takes a wide character as input and returns
* the font information necessary to render it properly.
*/
var boldUpright = {
	mathClass: "mathbf",
	textClass: "textbf",
	font: "Main-Bold"
};
var italic = {
	mathClass: "mathnormal",
	textClass: "textit",
	font: "Math-Italic"
};
var boldItalic = {
	mathClass: "boldsymbol",
	textClass: "boldsymbol",
	font: "Main-BoldItalic"
};
var script = {
	mathClass: "mathscr",
	textClass: "textscr",
	font: "Script-Regular"
};
var noFont = {
	mathClass: "",
	textClass: "",
	font: ""
};
var fraktur = {
	mathClass: "mathfrak",
	textClass: "textfrak",
	font: "Fraktur-Regular"
};
var doubleStruck = {
	mathClass: "mathbb",
	textClass: "textbb",
	font: "AMS-Regular"
};
var boldFraktur = {
	mathClass: "mathboldfrak",
	textClass: "textboldfrak",
	font: "Fraktur-Regular"
};
var sansSerif = {
	mathClass: "mathsf",
	textClass: "textsf",
	font: "SansSerif-Regular"
};
var boldSansSerif = {
	mathClass: "mathboldsf",
	textClass: "textboldsf",
	font: "SansSerif-Bold"
};
var italicSansSerif = {
	mathClass: "mathitsf",
	textClass: "textitsf",
	font: "SansSerif-Italic"
};
var monospace = {
	mathClass: "mathtt",
	textClass: "texttt",
	font: "Typewriter-Regular"
};
/**
* Data below is from https://www.unicode.org/charts/PDF/U1D400.pdf
* That document sorts characters into groups by font type, say bold or italic.
*
* In the arrays below, each object consists of three properties:
*      * The CSS class of that group when in math mode.
*      * The CSS class of that group when in text mode.
*      * The font name, so that KaTeX can get font metrics.
*/
var wideLatinLetterData = [
	boldUpright,
	boldUpright,
	italic,
	italic,
	boldItalic,
	boldItalic,
	script,
	noFont,
	noFont,
	noFont,
	fraktur,
	fraktur,
	doubleStruck,
	doubleStruck,
	boldFraktur,
	boldFraktur,
	sansSerif,
	sansSerif,
	boldSansSerif,
	boldSansSerif,
	italicSansSerif,
	italicSansSerif,
	noFont,
	noFont,
	monospace,
	monospace
];
var wideNumeralData = [
	boldUpright,
	noFont,
	sansSerif,
	boldSansSerif,
	monospace
];
var wideCharacterFont = (wideChar) => {
	var H = wideChar.charCodeAt(0);
	var L = wideChar.charCodeAt(1);
	var codePoint = (H - 55296) * 1024 + (L - 56320) + 65536;
	if (119808 <= codePoint && codePoint < 120484) return wideLatinLetterData[Math.floor((codePoint - 119808) / 26)];
	else if (120782 <= codePoint && codePoint <= 120831) return wideNumeralData[Math.floor((codePoint - 120782) / 10)];
	else if (codePoint === 120485 || codePoint === 120486) return wideLatinLetterData[0];
	else if (120486 < codePoint && codePoint < 120782) return noFont;
	else throw new ParseError("Unsupported character: " + wideChar);
};
/**
* Looks up the given symbol in fontMetrics, after applying any symbol
* replacements defined in symbol.js
*/
var lookupSymbol = function lookupSymbol(value, fontName, mode) {
	if (symbols[mode][value]) {
		var replacement = symbols[mode][value].replace;
		if (replacement) value = replacement;
	}
	return {
		value,
		metrics: getCharacterMetrics(value, fontName, mode)
	};
};
/**
* Makes a symbolNode after translation via the list of symbols in symbols.js.
* Correctly pulls out metrics for the character, and optionally takes a list of
* classes to be attached to the node.
*
* TODO: make argument order closer to makeSpan
* TODO: add a separate argument for math class (e.g. `mop`, `mbin`), which
* should if present come first in `classes`.
* TODO(#953): Make `options` mandatory and always pass it in.
*/
var makeSymbol = function makeSymbol(value, fontName, mode, options, classes) {
	var lookup = lookupSymbol(value, fontName, mode);
	var metrics = lookup.metrics;
	value = lookup.value;
	var symbolNode;
	if (metrics) {
		var italic = metrics.italic;
		if (mode === "text" || options && options.font === "mathit") italic = 0;
		symbolNode = new SymbolNode(value, metrics.height, metrics.depth, italic, metrics.skew, metrics.width, classes);
	} else {
		typeof console !== "undefined" && console.warn("No character metrics " + ("for '" + value + "' in style '" + fontName + "' and mode '" + mode + "'"));
		symbolNode = new SymbolNode(value, 0, 0, 0, 0, 0, classes);
	}
	if (options) {
		symbolNode.maxFontSize = options.sizeMultiplier;
		if (options.style.isTight()) symbolNode.classes.push("mtight");
		var color = options.getColor();
		if (color) symbolNode.style.color = color;
	}
	return symbolNode;
};
/**
* Makes a symbol in Main-Regular or AMS-Regular.
* Used for rel, bin, open, close, inner, and punct.
*/
var mathsym = function mathsym(value, mode, options, classes) {
	if (classes === void 0) classes = [];
	if (options.font === "boldsymbol" && lookupSymbol(value, "Main-Bold", mode).metrics) return makeSymbol(value, "Main-Bold", mode, options, classes.concat(["mathbf"]));
	else if (value === "\\" || symbols[mode][value].font === "main") return makeSymbol(value, "Main-Regular", mode, options, classes);
	else return makeSymbol(value, "AMS-Regular", mode, options, classes.concat(["amsrm"]));
};
/**
* Determines which of the two font names (Main-Bold and Math-BoldItalic) and
* corresponding style tags (mathbf or boldsymbol) to use for font "boldsymbol",
* depending on the symbol.  Use this function instead of fontMap for font
* "boldsymbol".
*/
var boldSymbol = function boldSymbol(value, mode, type) {
	if (type !== "textord" && lookupSymbol(value, "Math-BoldItalic", mode).metrics) return {
		fontName: "Math-BoldItalic",
		fontClass: "boldsymbol"
	};
	else return {
		fontName: "Main-Bold",
		fontClass: "mathbf"
	};
};
/**
* Makes either a mathord or textord in the correct font and color.
*/
var makeOrd = function makeOrd(group, options) {
	var type = group.type === "mathord" ? "mathord" : "textord";
	var mode = group.mode;
	var text = group.text;
	var classes = ["mord"];
	var font = options.font, fontFamily = options.fontFamily, fontWeight = options.fontWeight, fontShape = options.fontShape;
	var useFont = mode === "math" || mode === "text" && !!font;
	var fontOrFamily = useFont ? font : fontFamily;
	var wideFontName = "";
	var wideFontClass = "";
	if (text.charCodeAt(0) === 55349) {
		var wideCharData = wideCharacterFont(text);
		wideFontName = wideCharData.font;
		wideFontClass = wideCharData[mode + "Class"];
	}
	if (wideFontName) return makeSymbol(text, wideFontName, mode, options, classes.concat(wideFontClass));
	else if (fontOrFamily) {
		var fontName;
		var fontClasses;
		if (fontOrFamily === "boldsymbol") {
			var fontData = boldSymbol(text, mode, type);
			fontName = fontData.fontName;
			fontClasses = [fontData.fontClass];
		} else if (useFont) {
			fontName = fontMap[font].fontName;
			fontClasses = [font];
		} else {
			fontName = retrieveTextFontName(fontFamily, fontWeight, fontShape);
			fontClasses = [
				fontFamily,
				fontWeight,
				fontShape
			];
		}
		if (lookupSymbol(text, fontName, mode).metrics) return makeSymbol(text, fontName, mode, options, classes.concat(fontClasses));
		else if (Object.prototype.hasOwnProperty.call(ligatures, text) && fontName.slice(0, 10) === "Typewriter") {
			var parts = [];
			for (var i = 0; i < text.length; i++) parts.push(makeSymbol(text[i], fontName, mode, options, classes.concat(fontClasses)));
			return makeFragment(parts);
		}
	}
	if (type === "mathord") return makeSymbol(text, "Math-Italic", mode, options, classes.concat(["mathnormal"]));
	else if (type === "textord") {
		var _font = symbols[mode][text] && symbols[mode][text].font;
		if (_font === "ams") return makeSymbol(text, retrieveTextFontName("amsrm", fontWeight, fontShape), mode, options, classes.concat("amsrm", fontWeight, fontShape));
		else if (_font === "main" || !_font) return makeSymbol(text, retrieveTextFontName("textrm", fontWeight, fontShape), mode, options, classes.concat(fontWeight, fontShape));
		else {
			var _fontName3 = retrieveTextFontName(_font, fontWeight, fontShape);
			return makeSymbol(text, _fontName3, mode, options, classes.concat(_fontName3, fontWeight, fontShape));
		}
	} else throw new Error("unexpected type: " + type + " in makeOrd");
};
/**
* Returns true if subsequent symbolNodes have the same classes, skew, maxFont,
* and styles. For mathnormal text, the left node must also have zero italic
* correction so we don't lose spacing between combined glyphs.
*/
var canCombine = (prev, next) => {
	if (createClass(prev.classes) !== createClass(next.classes) || prev.skew !== next.skew || prev.maxFontSize !== next.maxFontSize || prev.italic !== 0 && prev.hasClass("mathnormal")) return false;
	if (prev.classes.length === 1) {
		var cls = prev.classes[0];
		if (cls === "mbin" || cls === "mord") return false;
	}
	for (var key of Object.keys(prev.style)) if (prev.style[key] !== next.style[key]) return false;
	for (var _key of Object.keys(next.style)) if (prev.style[_key] !== next.style[_key]) return false;
	return true;
};
/**
* Combine consecutive domTree.symbolNodes into a single symbolNode.
* Note: this function mutates the argument.
*/
var tryCombineChars = (chars) => {
	for (var i = 0; i < chars.length - 1; i++) {
		var prev = chars[i];
		var next = chars[i + 1];
		if (prev instanceof SymbolNode && next instanceof SymbolNode && canCombine(prev, next)) {
			prev.text += next.text;
			prev.height = Math.max(prev.height, next.height);
			prev.depth = Math.max(prev.depth, next.depth);
			prev.italic = next.italic;
			chars.splice(i + 1, 1);
			i--;
		}
	}
	return chars;
};
/**
* Calculate the height, depth, and maxFontSize of an element based on its
* children.
*/
var sizeElementFromChildren = function sizeElementFromChildren(elem) {
	var height = 0;
	var depth = 0;
	var maxFontSize = 0;
	for (var i = 0; i < elem.children.length; i++) {
		var child = elem.children[i];
		if (child.height > height) height = child.height;
		if (child.depth > depth) depth = child.depth;
		if (child.maxFontSize > maxFontSize) maxFontSize = child.maxFontSize;
	}
	elem.height = height;
	elem.depth = depth;
	elem.maxFontSize = maxFontSize;
};
/**
* Makes a span with the given list of classes, list of children, and options.
*
* TODO(#953): Ensure that `options` is always provided (currently some call
* sites don't pass it) and make the type below mandatory.
* TODO: add a separate argument for math class (e.g. `mop`, `mbin`), which
* should if present come first in `classes`.
*/
var makeSpan = function makeSpan(classes, children, options, style) {
	var span = new Span(classes, children, options, style);
	sizeElementFromChildren(span);
	return span;
};
var makeSvgSpan = (classes, children, options, style) => new Span(classes, children, options, style);
var makeLineSpan = function makeLineSpan(className, options, thickness) {
	var line = makeSpan([className], [], options);
	line.height = Math.max(thickness || options.fontMetrics().defaultRuleThickness, options.minRuleThickness);
	line.style.borderBottomWidth = makeEm(line.height);
	line.maxFontSize = 1;
	return line;
};
/**
* Makes an anchor with the given href, list of classes, list of children,
* and options.
*/
var makeAnchor = function makeAnchor(href, classes, children, options) {
	var anchor = new Anchor(href, classes, children, options);
	sizeElementFromChildren(anchor);
	return anchor;
};
/**
* Makes a document fragment with the given list of children.
*/
var makeFragment = function makeFragment(children) {
	var fragment = new DocumentFragment(children);
	sizeElementFromChildren(fragment);
	return fragment;
};
/**
* Wraps group in a span if it's a document fragment, allowing to apply classes
* and styles
*/
var wrapFragment = function wrapFragment(group, options) {
	if (group instanceof DocumentFragment) return makeSpan([], [group], options);
	return group;
};
var getVListChildrenAndDepth = function getVListChildrenAndDepth(params) {
	if (params.positionType === "individualShift") {
		var oldChildren = params.children;
		var children = [oldChildren[0]];
		var _depth = -oldChildren[0].shift - oldChildren[0].elem.depth;
		var currPos = _depth;
		for (var i = 1; i < oldChildren.length; i++) {
			var diff = -oldChildren[i].shift - currPos - oldChildren[i].elem.depth;
			var size = diff - (oldChildren[i - 1].elem.height + oldChildren[i - 1].elem.depth);
			currPos = currPos + diff;
			children.push({
				type: "kern",
				size
			});
			children.push(oldChildren[i]);
		}
		return {
			children,
			depth: _depth
		};
	}
	var depth;
	if (params.positionType === "top") {
		var bottom = params.positionData;
		for (var _i = 0; _i < params.children.length; _i++) {
			var child = params.children[_i];
			bottom -= child.type === "kern" ? child.size : child.elem.height + child.elem.depth;
		}
		depth = bottom;
	} else if (params.positionType === "bottom") depth = -params.positionData;
	else {
		var firstChild = params.children[0];
		if (firstChild.type !== "elem") throw new Error("First child must have type \"elem\".");
		if (params.positionType === "shift") depth = -firstChild.elem.depth - params.positionData;
		else if (params.positionType === "firstBaseline") depth = -firstChild.elem.depth;
		else throw new Error("Invalid positionType " + params.positionType + ".");
	}
	return {
		children: params.children,
		depth
	};
};
/**
* Makes a vertical list by stacking elements and kerns on top of each other.
* Allows for many different ways of specifying the positioning method.
*
* See VListParam documentation above.
*/
var makeVList = function makeVList(params, options) {
	var _getVListChildrenAndD = getVListChildrenAndDepth(params), children = _getVListChildrenAndD.children, depth = _getVListChildrenAndD.depth;
	var pstrutSize = 0;
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		if (child.type === "elem") {
			var elem = child.elem;
			pstrutSize = Math.max(pstrutSize, elem.maxFontSize, elem.height);
		}
	}
	pstrutSize += 2;
	var pstrut = makeSpan(["pstrut"], []);
	pstrut.style.height = makeEm(pstrutSize);
	var realChildren = [];
	var minPos = depth;
	var maxPos = depth;
	var currPos = depth;
	for (var _i2 = 0; _i2 < children.length; _i2++) {
		var _child = children[_i2];
		if (_child.type === "kern") currPos += _child.size;
		else {
			var _elem = _child.elem;
			var classes = _child.wrapperClasses || [];
			var style = _child.wrapperStyle || {};
			var childWrap = makeSpan(classes, [pstrut, _elem], void 0, style);
			childWrap.style.top = makeEm(-pstrutSize - currPos - _elem.depth);
			if (_child.marginLeft) childWrap.style.marginLeft = _child.marginLeft;
			if (_child.marginRight) childWrap.style.marginRight = _child.marginRight;
			realChildren.push(childWrap);
			currPos += _elem.height + _elem.depth;
		}
		minPos = Math.min(minPos, currPos);
		maxPos = Math.max(maxPos, currPos);
	}
	var vlist = makeSpan(["vlist"], realChildren);
	vlist.style.height = makeEm(maxPos);
	var rows;
	if (minPos < 0) {
		var depthStrut = makeSpan(["vlist"], [makeSpan([], [])]);
		depthStrut.style.height = makeEm(-minPos);
		rows = [makeSpan(["vlist-r"], [vlist, makeSpan(["vlist-s"], [new SymbolNode("​")])]), makeSpan(["vlist-r"], [depthStrut])];
	} else rows = [makeSpan(["vlist-r"], [vlist])];
	var vtable = makeSpan(["vlist-t"], rows);
	if (rows.length === 2) vtable.classes.push("vlist-t2");
	vtable.height = maxPos;
	vtable.depth = -minPos;
	return vtable;
};
var makeGlue = (measurement, options) => {
	var rule = makeSpan(["mspace"], [], options);
	var size = calculateSize(measurement, options);
	rule.style.marginRight = makeEm(size);
	return rule;
};
var retrieveTextFontName = (fontFamily, fontWeight, fontShape) => {
	var baseFontName;
	var fontStylesName;
	switch (fontFamily) {
		case "amsrm":
			baseFontName = "AMS";
			break;
		case "textrm":
			baseFontName = "Main";
			break;
		case "textsf":
			baseFontName = "SansSerif";
			break;
		case "texttt":
			baseFontName = "Typewriter";
			break;
		default: baseFontName = fontFamily;
	}
	if (fontWeight === "textbf" && fontShape === "textit") fontStylesName = "BoldItalic";
	else if (fontWeight === "textbf") fontStylesName = "Bold";
	else if (fontShape === "textit") fontStylesName = "Italic";
	else fontStylesName = "Regular";
	return baseFontName + "-" + fontStylesName;
};
/**
* Maps TeX font commands to objects containing:
* - variant: string used for "mathvariant" attribute in buildMathML.js
* - fontName: the "style" parameter to fontMetrics.getCharacterMetrics
*/
var fontMap = {
	"mathbf": {
		variant: "bold",
		fontName: "Main-Bold"
	},
	"mathrm": {
		variant: "normal",
		fontName: "Main-Regular"
	},
	"textit": {
		variant: "italic",
		fontName: "Main-Italic"
	},
	"mathit": {
		variant: "italic",
		fontName: "Main-Italic"
	},
	"mathnormal": {
		variant: "italic",
		fontName: "Math-Italic"
	},
	"mathsfit": {
		variant: "sans-serif-italic",
		fontName: "SansSerif-Italic"
	},
	"mathbb": {
		variant: "double-struck",
		fontName: "AMS-Regular"
	},
	"mathcal": {
		variant: "script",
		fontName: "Caligraphic-Regular"
	},
	"mathfrak": {
		variant: "fraktur",
		fontName: "Fraktur-Regular"
	},
	"mathscr": {
		variant: "script",
		fontName: "Script-Regular"
	},
	"mathsf": {
		variant: "sans-serif",
		fontName: "SansSerif-Regular"
	},
	"mathtt": {
		variant: "monospace",
		fontName: "Typewriter-Regular"
	}
};
var svgData = {
	vec: [
		"vec",
		.471,
		.714
	],
	oiintSize1: [
		"oiintSize1",
		.957,
		.499
	],
	oiintSize2: [
		"oiintSize2",
		1.472,
		.659
	],
	oiiintSize1: [
		"oiiintSize1",
		1.304,
		.499
	],
	oiiintSize2: [
		"oiiintSize2",
		1.98,
		.659
	]
};
var staticSvg = function staticSvg(value, options) {
	var _svgData$value = svgData[value], pathName = _svgData$value[0], width = _svgData$value[1], height = _svgData$value[2];
	var span = makeSvgSpan(["katex-overlay"], [new SvgNode([new PathNode(pathName)], {
		"width": makeEm(width),
		"height": makeEm(height),
		"style": "width:" + makeEm(width),
		"viewBox": "0 0 " + 1e3 * width + " " + 1e3 * height,
		"preserveAspectRatio": "xMinYMin"
	})], options);
	span.height = height;
	span.style.height = makeEm(height);
	span.style.width = makeEm(width);
	return span;
};
/**
* Describes spaces between different classes of atoms.
*/
var thinspace = {
	number: 3,
	unit: "mu"
};
var mediumspace = {
	number: 4,
	unit: "mu"
};
var thickspace = {
	number: 5,
	unit: "mu"
};
var spacings = {
	mord: {
		mop: thinspace,
		mbin: mediumspace,
		mrel: thickspace,
		minner: thinspace
	},
	mop: {
		mord: thinspace,
		mop: thinspace,
		mrel: thickspace,
		minner: thinspace
	},
	mbin: {
		mord: mediumspace,
		mop: mediumspace,
		mopen: mediumspace,
		minner: mediumspace
	},
	mrel: {
		mord: thickspace,
		mop: thickspace,
		mopen: thickspace,
		minner: thickspace
	},
	mopen: {},
	mclose: {
		mop: thinspace,
		mbin: mediumspace,
		mrel: thickspace,
		minner: thinspace
	},
	mpunct: {
		mord: thinspace,
		mop: thinspace,
		mrel: thickspace,
		mopen: thinspace,
		mclose: thinspace,
		mpunct: thinspace,
		minner: thinspace
	},
	minner: {
		mord: thinspace,
		mop: thinspace,
		mbin: mediumspace,
		mrel: thickspace,
		mopen: thinspace,
		mpunct: thinspace,
		minner: thinspace
	}
};
var tightSpacings = {
	mord: { mop: thinspace },
	mop: {
		mord: thinspace,
		mop: thinspace
	},
	mbin: {},
	mrel: {},
	mopen: {},
	mclose: { mop: thinspace },
	mpunct: {},
	minner: { mop: thinspace }
};
/**
* All registered functions.
* `functions.js` just exports this same dictionary again and makes it public.
* `Parser.js` requires this dictionary.
*/
var _functions = {};
/**
* All HTML builders. Should be only used in the `define*` and the `build*ML`
* functions.
*
* Builders for different node types are stored side by side, but
* `HtmlBuilder<T>` is contravariant in `T`, so there is no single type
* argument that makes storing/retrieving them typecheck.  `any` is used
* as an existential-quantifier escape hatch.
*/
var _htmlGroupBuilders = {};
/**
* All MathML builders. Should be only used in the `define*` and the `build*ML`
* functions.  See `_htmlGroupBuilders` above for the rationale behind `any`.
*/
var _mathmlGroupBuilders = {};
function defineFunction(data) {
	var type = data.type, names = data.names, htmlBuilder = data.htmlBuilder, mathmlBuilder = data.mathmlBuilder;
	for (var i = 0; i < names.length; ++i) _functions[names[i]] = data;
	if (type) {
		if (htmlBuilder) _htmlGroupBuilders[type] = htmlBuilder;
		if (mathmlBuilder) _mathmlGroupBuilders[type] = mathmlBuilder;
	}
}
/**
* Use this to register only the HTML and MathML builders for a function (e.g.
* if the function's ParseNode is generated in Parser.js rather than via a
* stand-alone handler provided to `defineFunction`).
*/
function defineFunctionBuilders(_ref) {
	var type = _ref.type, htmlBuilder = _ref.htmlBuilder, mathmlBuilder = _ref.mathmlBuilder;
	if (htmlBuilder) _htmlGroupBuilders[type] = htmlBuilder;
	if (mathmlBuilder) _mathmlGroupBuilders[type] = mathmlBuilder;
}
var normalizeArgument = function normalizeArgument(arg) {
	return arg.type === "ordgroup" && arg.body.length === 1 ? arg.body[0] : arg;
};
var ordargument = function ordargument(arg) {
	return arg.type === "ordgroup" ? arg.body : [arg];
};
/**
* This file does the main work of building a domTree structure from a parse
* tree. The entry point is the `buildHTML` function, which takes a parse tree.
* Then, the buildExpression, buildGroup, and various groupBuilders functions
* are called, to produce a final HTML tree.
*/
var binLeftCanceller = /* @__PURE__ */ new Set([
	"leftmost",
	"mbin",
	"mopen",
	"mrel",
	"mop",
	"mpunct"
]);
var binRightCanceller = /* @__PURE__ */ new Set([
	"rightmost",
	"mrel",
	"mclose",
	"mpunct"
]);
var styleMap$1 = {
	"display": Style$1.DISPLAY,
	"text": Style$1.TEXT,
	"script": Style$1.SCRIPT,
	"scriptscript": Style$1.SCRIPTSCRIPT
};
var DomEnum = {
	mord: "mord",
	mop: "mop",
	mbin: "mbin",
	mrel: "mrel",
	mopen: "mopen",
	mclose: "mclose",
	mpunct: "mpunct",
	minner: "minner"
};
/**
* Take a list of nodes, build them in order, and return a list of the built
* nodes. documentFragments are flattened into their contents, so the
* returned list contains no fragments. `isRealGroup` is true if `expression`
* is a real group (no atoms will be added on either side), as opposed to
* a partial group (e.g. one created by \color). `surrounding` is an array
* consisting type of nodes that will be added to the left and right.
*/
var buildExpression$1 = function buildExpression(expression, options, isRealGroup, surrounding) {
	if (surrounding === void 0) surrounding = [null, null];
	var groups = [];
	for (var i = 0; i < expression.length; i++) {
		var output = buildGroup$1(expression[i], options);
		if (output instanceof DocumentFragment) {
			var children = output.children;
			groups.push(...children);
		} else groups.push(output);
	}
	tryCombineChars(groups);
	if (!isRealGroup) return groups;
	var glueOptions = options;
	if (expression.length === 1) {
		var node = expression[0];
		if (node.type === "sizing") glueOptions = options.havingSize(node.size);
		else if (node.type === "styling") glueOptions = options.havingStyle(styleMap$1[node.style]);
	}
	var dummyPrev = makeSpan([surrounding[0] || "leftmost"], [], options);
	var dummyNext = makeSpan([surrounding[1] || "rightmost"], [], options);
	var isRoot = isRealGroup === "root";
	_traverseNonSpaceNodes(groups, (node, prev) => {
		var prevType = prev.classes[0];
		var type = node.classes[0];
		if (prevType === "mbin" && binRightCanceller.has(type)) prev.classes[0] = "mord";
		else if (type === "mbin" && binLeftCanceller.has(prevType)) node.classes[0] = "mord";
	}, { node: dummyPrev }, dummyNext, isRoot);
	_traverseNonSpaceNodes(groups, (node, prev) => {
		var _tightSpacings$prevTy, _spacings$prevType;
		var prevType = getTypeOfDomTree(prev);
		var type = getTypeOfDomTree(node);
		var space = prevType && type ? node.hasClass("mtight") ? (_tightSpacings$prevTy = tightSpacings[prevType]) == null ? void 0 : _tightSpacings$prevTy[type] : (_spacings$prevType = spacings[prevType]) == null ? void 0 : _spacings$prevType[type] : null;
		if (space) return makeGlue(space, glueOptions);
	}, { node: dummyPrev }, dummyNext, isRoot);
	return groups;
};
var _traverseNonSpaceNodes = function traverseNonSpaceNodes(nodes, callback, prev, next, isRoot) {
	if (next) nodes.push(next);
	var i = 0;
	for (; i < nodes.length; i++) {
		var node = nodes[i];
		var partialGroup = checkPartialGroup(node);
		if (partialGroup) {
			_traverseNonSpaceNodes(partialGroup.children, callback, prev, null, isRoot);
			continue;
		}
		var nonspace = !node.hasClass("mspace");
		if (nonspace) {
			var result = callback(node, prev.node);
			if (result) {
				if (prev.insertAfter) prev.insertAfter(result);
				else {
					nodes.unshift(result);
					i++;
				}
			}
		}
		if (nonspace) prev.node = node;
		else if (isRoot && node.hasClass("katex-newline")) prev.node = makeSpan(["leftmost"]);
		prev.insertAfter = ((index) => (n) => {
			nodes.splice(index + 1, 0, n);
			i++;
		})(i);
	}
	if (next) nodes.pop();
};
var checkPartialGroup = function checkPartialGroup(node) {
	if (node instanceof DocumentFragment || node instanceof Anchor || node instanceof Span && node.hasClass("enclosing")) return node;
	return null;
};
var _getOutermostNode = function getOutermostNode(node, side) {
	var partialGroup = checkPartialGroup(node);
	if (partialGroup) {
		var children = partialGroup.children;
		if (children.length) {
			if (side === "right") return _getOutermostNode(children[children.length - 1], "right");
			else if (side === "left") return _getOutermostNode(children[0], "left");
		}
	}
	return node;
};
var getTypeOfDomTree = function getTypeOfDomTree(node, side) {
	if (!node) return null;
	if (side) node = _getOutermostNode(node, side);
	return DomEnum[node.classes[0]] || null;
};
var makeNullDelimiter = function makeNullDelimiter(options, classes) {
	var moreClasses = ["nulldelimiter"].concat(options.baseSizingClasses());
	return makeSpan(classes.concat(moreClasses));
};
/**
* buildGroup is the function that takes a group and calls the correct groupType
* function for it. It also handles the interaction of size and style changes
* between parents and children.
*/
var buildGroup$1 = function buildGroup(group, options, baseOptions) {
	if (!group) return makeSpan();
	if (_htmlGroupBuilders[group.type]) {
		var groupNode = _htmlGroupBuilders[group.type](group, options);
		if (baseOptions && options.size !== baseOptions.size) {
			groupNode = makeSpan(options.sizingClasses(baseOptions), [groupNode], options);
			var multiplier = options.sizeMultiplier / baseOptions.sizeMultiplier;
			groupNode.height *= multiplier;
			groupNode.depth *= multiplier;
		}
		return groupNode;
	} else throw new ParseError("Got group of unknown type: '" + group.type + "'");
};
/**
* Combine an array of HTML DOM nodes (e.g., the output of `buildExpression`)
* into an unbreakable HTML node of class .katex-base, with proper struts to
* guarantee correct vertical extent.  `buildHTML` calls this repeatedly to
* make up the entire expression as a sequence of unbreakable units.
*/
function buildHTMLUnbreakable(children, options) {
	var body = makeSpan(["katex-base"], children, options);
	var strut = makeSpan(["katex-strut"]);
	strut.style.height = makeEm(body.height + body.depth);
	if (body.depth) strut.style.verticalAlign = makeEm(-body.depth);
	body.children.unshift(strut);
	return body;
}
/**
* Take an entire parse tree, and build it into an appropriate set of HTML
* nodes.
*/
function buildHTML(tree, options) {
	var tag = null;
	if (tree.length === 1 && tree[0].type === "tag") {
		tag = tree[0].tag;
		tree = tree[0].body;
	}
	var expression = buildExpression$1(tree, options, "root");
	var eqnNum;
	if (expression.length === 2 && expression[1].hasClass("katex-tag")) eqnNum = expression.pop();
	var children = [];
	var parts = [];
	for (var i = 0; i < expression.length; i++) {
		parts.push(expression[i]);
		if (expression[i].hasClass("mbin") || expression[i].hasClass("mrel") || expression[i].hasClass("allowbreak")) {
			var nobreak = false;
			while (i < expression.length - 1 && expression[i + 1].hasClass("mspace") && !expression[i + 1].hasClass("katex-newline")) {
				i++;
				parts.push(expression[i]);
				if (expression[i].hasClass("nobreak")) nobreak = true;
			}
			if (!nobreak) {
				children.push(buildHTMLUnbreakable(parts, options));
				parts = [];
			}
		} else if (expression[i].hasClass("katex-newline")) {
			parts.pop();
			if (parts.length > 0) {
				children.push(buildHTMLUnbreakable(parts, options));
				parts = [];
			}
			children.push(expression[i]);
		}
	}
	if (parts.length > 0) children.push(buildHTMLUnbreakable(parts, options));
	var tagChild;
	if (tag) {
		tagChild = buildHTMLUnbreakable(buildExpression$1(tag, options, true), options);
		tagChild.classes = ["katex-tag"];
		children.push(tagChild);
	} else if (eqnNum) children.push(eqnNum);
	var htmlNode = makeSpan(["katex-html"], children);
	htmlNode.setAttribute("aria-hidden", "true");
	if (tagChild) {
		var strut = tagChild.children[0];
		strut.style.height = makeEm(htmlNode.height + htmlNode.depth);
		if (htmlNode.depth) strut.style.verticalAlign = makeEm(-htmlNode.depth);
	}
	return htmlNode;
}
/**
* These objects store data about MathML nodes. This is the MathML equivalent
* of the types in domTree.js. Since MathML handles its own rendering, and
* since we're mainly using MathML to improve accessibility, we don't manage
* any of the styling state that the plain DOM nodes do.
*
* The `toNode` and `toMarkup` functions work similarly to how they do in
* domTree.js, creating namespaced DOM nodes and HTML text markup respectively.
*/
function newDocumentFragment(children) {
	return new DocumentFragment(children);
}
/**
* This node represents a general purpose MathML node of any type. The
* constructor requires the type of node to create (for example, `"mo"` or
* `"mspace"`, corresponding to `<mo>` and `<mspace>` tags).
*/
var MathNode = class {
	constructor(type, children, classes) {
		this.type = void 0;
		this.attributes = void 0;
		this.children = void 0;
		this.classes = void 0;
		this.type = type;
		this.attributes = {};
		this.children = children || [];
		this.classes = classes || [];
	}
	/**
	* Sets an attribute on a MathML node. MathML depends on attributes to convey a
	* semantic content, so this is used heavily.
	*/
	setAttribute(name, value) {
		this.attributes[name] = value;
	}
	/**
	* Gets an attribute on a MathML node.
	*/
	getAttribute(name) {
		return this.attributes[name];
	}
	/**
	* Converts the math node into a MathML-namespaced DOM element.
	*/
	toNode() {
		var node = document.createElementNS("http://www.w3.org/1998/Math/MathML", this.type);
		for (var _ref2 of Object.entries(this.attributes)) {
			var attr = _ref2[0];
			var value = _ref2[1];
			node.setAttribute(attr, value);
		}
		if (this.classes.length > 0) node.className = createClass(this.classes);
		for (var i = 0; i < this.children.length; i++) if (this.children[i] instanceof TextNode && this.children[i + 1] instanceof TextNode) {
			var text = this.children[i].toText() + this.children[++i].toText();
			while (this.children[i + 1] instanceof TextNode) text += this.children[++i].toText();
			node.appendChild(new TextNode(text).toNode());
		} else node.appendChild(this.children[i].toNode());
		return node;
	}
	/**
	* Converts the math node into an HTML markup string.
	*/
	toMarkup() {
		var markup = "<" + this.type;
		for (var _ref4 of Object.entries(this.attributes)) {
			var attr = _ref4[0];
			var value = _ref4[1];
			markup += " " + attr + "=\"";
			markup += escape(value);
			markup += "\"";
		}
		if (this.classes.length > 0) markup += " class =\"" + escape(createClass(this.classes)) + "\"";
		markup += ">";
		for (var i = 0; i < this.children.length; i++) markup += this.children[i].toMarkup();
		markup += "</" + this.type + ">";
		return markup;
	}
	/**
	* Converts the math node into a string, similar to innerText, but escaped.
	*/
	toText() {
		return this.children.map((child) => child.toText()).join("");
	}
};
/**
* This node represents a piece of text.
*/
var TextNode = class {
	constructor(text) {
		this.text = void 0;
		this.text = text;
	}
	/**
	* Converts the text node into a DOM text node.
	*/
	toNode() {
		return document.createTextNode(this.text);
	}
	/**
	* Converts the text node into escaped HTML markup
	* (representing the text itself).
	*/
	toMarkup() {
		return escape(this.toText());
	}
	/**
	* Converts the text node into a string
	* (representing the text itself).
	*/
	toText() {
		return this.text;
	}
};
/**
* This node represents a space, but may render as <mspace.../> or as text,
* depending on the width.
*/
var SpaceNode = class {
	/**
	* Create a Space node with width given in CSS ems.
	*/
	constructor(width) {
		this.width = void 0;
		this.character = void 0;
		this.width = width;
		if (width >= .05555 && width <= .05556) this.character = " ";
		else if (width >= .1666 && width <= .1667) this.character = " ";
		else if (width >= .2222 && width <= .2223) this.character = " ";
		else if (width >= .2777 && width <= .2778) this.character = "  ";
		else if (width >= -.05556 && width <= -.05555) this.character = " ⁣";
		else if (width >= -.1667 && width <= -.1666) this.character = " ⁣";
		else if (width >= -.2223 && width <= -.2222) this.character = " ⁣";
		else if (width >= -.2778 && width <= -.2777) this.character = " ⁣";
		else this.character = null;
	}
	/**
	* Converts the math node into a MathML-namespaced DOM element.
	*/
	toNode() {
		if (this.character) return document.createTextNode(this.character);
		else {
			var node = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mspace");
			node.setAttribute("width", makeEm(this.width));
			return node;
		}
	}
	/**
	* Converts the math node into an HTML markup string.
	*/
	toMarkup() {
		if (this.character) return "<mtext>" + this.character + "</mtext>";
		else return "<mspace width=\"" + makeEm(this.width) + "\"/>";
	}
	/**
	* Converts the math node into a string, similar to innerText.
	*/
	toText() {
		if (this.character) return this.character;
		else return " ";
	}
};
/**
* This file converts a parse tree into a corresponding MathML tree. The main
* entry point is the `buildMathML` function, which takes a parse tree from the
* parser.
*/
var noVariantSymbols = /* @__PURE__ */ new Set(["\\imath", "\\jmath"]);
var rowLikeTypes = /* @__PURE__ */ new Set(["mrow", "mtable"]);
/**
* Takes a symbol and converts it into a MathML text node after performing
* optional replacement from symbols.js.
*/
var makeText = function makeText(text, mode, options) {
	var _options$fontFamily, _options$font;
	if (symbols[mode][text] && symbols[mode][text].replace && text.charCodeAt(0) !== 55349 && !(Object.prototype.hasOwnProperty.call(ligatures, text) && ((options == null || (_options$fontFamily = options.fontFamily) == null ? void 0 : _options$fontFamily.slice(4, 6)) === "tt" || (options == null || (_options$font = options.font) == null ? void 0 : _options$font.slice(4, 6)) === "tt"))) text = symbols[mode][text].replace;
	return new TextNode(text);
};
/**
* Wrap the given array of nodes in an <mrow> node if needed, i.e.,
* unless the array has length 1.  Always returns a single node.
*/
var makeRow = function makeRow(body) {
	if (body.length === 1) return body[0];
	else return new MathNode("mrow", body);
};
var mathFontVariants = {
	mathit: "italic",
	boldsymbol: (group) => group.type === "textord" ? "bold" : "bold-italic",
	mathbf: "bold",
	mathbb: "double-struck",
	mathsfit: "sans-serif-italic",
	mathfrak: "fraktur",
	mathscr: "script",
	mathcal: "script",
	mathsf: "sans-serif",
	mathtt: "monospace"
};
/**
* Returns the math variant as a string or null if none is required.
*/
var getVariant = (group, options) => {
	if (group.mode === "text") {
		if (options.fontFamily === "texttt") return "monospace";
		else if (options.fontFamily === "textsf") {
			if (options.fontShape === "textit" && options.fontWeight === "textbf") return "sans-serif-bold-italic";
			else if (options.fontShape === "textit") return "sans-serif-italic";
			else if (options.fontWeight === "textbf") return "bold-sans-serif";
			else return "sans-serif";
		} else if (options.fontShape === "textit" && options.fontWeight === "textbf") return "bold-italic";
		else if (options.fontShape === "textit") return "italic";
		else if (options.fontWeight === "textbf") return "bold";
	}
	var font = options.font;
	if (!font || font === "mathnormal") return null;
	var mode = group.mode;
	var mathVariant = mathFontVariants[font];
	if (mathVariant) return typeof mathVariant === "function" ? mathVariant(group) : mathVariant;
	var text = group.text;
	if (noVariantSymbols.has(text)) return null;
	if (symbols[mode][text]) {
		var replacement = symbols[mode][text].replace;
		if (replacement) text = replacement;
	}
	var fontName = fontMap[font].fontName;
	if (getCharacterMetrics(text, fontName, mode)) return fontMap[font].variant;
	return null;
};
/**
* Check for <mi>.</mi> which is how a dot renders in MathML,
* or <mo separator="true" lspace="0em" rspace="0em">,</mo>
* which is how a braced comma {,} renders in MathML
*/
function isNumberPunctuation(group) {
	if (!group) return false;
	if (group.type === "mi" && group.children.length === 1) {
		var child = group.children[0];
		return child instanceof TextNode && child.text === ".";
	} else if (group.type === "mo" && group.children.length === 1 && group.getAttribute("separator") === "true" && group.getAttribute("lspace") === "0em" && group.getAttribute("rspace") === "0em") {
		var _child = group.children[0];
		return _child instanceof TextNode && _child.text === ",";
	} else return false;
}
/**
* Takes a list of nodes, builds them, and returns a list of the generated
* MathML nodes.  Also combine consecutive <mtext> outputs into a single
* <mtext> tag.
*/
var buildExpression = function buildExpression(expression, options, isOrdgroup) {
	if (expression.length === 1) {
		var group = buildGroup(expression[0], options);
		if (isOrdgroup && group instanceof MathNode && group.type === "mo") {
			group.setAttribute("lspace", "0em");
			group.setAttribute("rspace", "0em");
		}
		return [group];
	}
	var groups = [];
	var lastGroup;
	for (var i = 0; i < expression.length; i++) {
		var _group = buildGroup(expression[i], options);
		if (_group instanceof MathNode && lastGroup instanceof MathNode) {
			if (_group.type === "mtext" && lastGroup.type === "mtext" && _group.getAttribute("mathvariant") === lastGroup.getAttribute("mathvariant")) {
				lastGroup.children.push(..._group.children);
				continue;
			} else if (_group.type === "mn" && lastGroup.type === "mn") {
				lastGroup.children.push(..._group.children);
				continue;
			} else if (isNumberPunctuation(_group) && lastGroup.type === "mn") {
				lastGroup.children.push(..._group.children);
				continue;
			} else if (_group.type === "mn" && isNumberPunctuation(lastGroup)) {
				_group.children = [...lastGroup.children, ..._group.children];
				groups.pop();
			} else if ((_group.type === "msup" || _group.type === "msub") && _group.children.length >= 1 && (lastGroup.type === "mn" || isNumberPunctuation(lastGroup))) {
				var base = _group.children[0];
				if (base instanceof MathNode && base.type === "mn") {
					base.children = [...lastGroup.children, ...base.children];
					groups.pop();
				}
			} else if (lastGroup.type === "mi" && lastGroup.children.length === 1) {
				var lastChild = lastGroup.children[0];
				if (lastChild instanceof TextNode && lastChild.text === "̸" && (_group.type === "mo" || _group.type === "mi" || _group.type === "mn")) {
					var child = _group.children[0];
					if (child instanceof TextNode && child.text.length > 0) {
						child.text = child.text.slice(0, 1) + "̸" + child.text.slice(1);
						groups.pop();
					}
				}
			}
		}
		groups.push(_group);
		lastGroup = _group;
	}
	return groups;
};
/**
* Equivalent to buildExpression, but wraps the elements in an <mrow>
* if there's more than one.  Returns a single node instead of an array.
*/
var buildExpressionRow = function buildExpressionRow(expression, options, isOrdgroup) {
	return makeRow(buildExpression(expression, options, isOrdgroup));
};
/**
* Takes a group from the parser and calls the appropriate groupBuilders function
* on it to produce a MathML node.
*/
var buildGroup = function buildGroup(group, options) {
	if (!group) return new MathNode("mrow");
	if (_mathmlGroupBuilders[group.type]) return _mathmlGroupBuilders[group.type](group, options);
	else throw new ParseError("Got group of unknown type: '" + group.type + "'");
};
/**
* Takes a full parse tree and settings and builds a MathML representation of
* it. In particular, we put the elements from building the parse tree into a
* <semantics> tag so we can also include that TeX source as an annotation.
*
* Note that we actually return a domTree element with a `<math>` inside it so
* we can do appropriate styling.
*/
function buildMathML(tree, texExpression, options, isDisplayMode, forMathmlOnly) {
	var expression = buildExpression(tree, options);
	var wrapper;
	if (expression.length === 1 && expression[0] instanceof MathNode && rowLikeTypes.has(expression[0].type)) wrapper = expression[0];
	else wrapper = new MathNode("mrow", expression);
	var annotation = new MathNode("annotation", [new TextNode(texExpression)]);
	annotation.setAttribute("encoding", "application/x-tex");
	var math = new MathNode("math", [new MathNode("semantics", [wrapper, annotation])]);
	math.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
	if (isDisplayMode) math.setAttribute("display", "block");
	return makeSpan([forMathmlOnly ? "katex" : "katex-mathml"], [math]);
}
/**
* This file contains information about the options that the Parser carries
* around with it while parsing. Data is held in an `Options` object, and when
* recursing, a new `Options` object can be created with the `.with*` and
* `.reset` functions.
*/
var sizeStyleMap = [
	[
		1,
		1,
		1
	],
	[
		2,
		1,
		1
	],
	[
		3,
		1,
		1
	],
	[
		4,
		2,
		1
	],
	[
		5,
		2,
		1
	],
	[
		6,
		3,
		1
	],
	[
		7,
		4,
		2
	],
	[
		8,
		6,
		3
	],
	[
		9,
		7,
		6
	],
	[
		10,
		8,
		7
	],
	[
		11,
		10,
		9
	]
];
var sizeMultipliers = [
	.5,
	.6,
	.7,
	.8,
	.9,
	1,
	1.2,
	1.44,
	1.728,
	2.074,
	2.488
];
var sizeAtStyle = function sizeAtStyle(size, style) {
	return style.size < 2 ? size : sizeStyleMap[size - 1][style.size - 1];
};
/**
* This is the main options class. It contains the current style, size, color,
* and font.
*
* Options objects should not be modified. To create a new Options with
* different properties, call a `.having*` method.
*/
var Options = class Options {
	constructor(data) {
		this.style = void 0;
		this.color = void 0;
		this.size = void 0;
		this.textSize = void 0;
		this.phantom = void 0;
		this.font = void 0;
		this.fontFamily = void 0;
		this.fontWeight = void 0;
		this.fontShape = void 0;
		this.sizeMultiplier = void 0;
		this.maxSize = void 0;
		this.minRuleThickness = void 0;
		this._fontMetrics = void 0;
		this.style = data.style;
		this.color = data.color;
		this.size = data.size || Options.BASESIZE;
		this.textSize = data.textSize || this.size;
		this.phantom = !!data.phantom;
		this.font = data.font || "";
		this.fontFamily = data.fontFamily || "";
		this.fontWeight = data.fontWeight || "";
		this.fontShape = data.fontShape || "";
		this.sizeMultiplier = sizeMultipliers[this.size - 1];
		this.maxSize = data.maxSize;
		this.minRuleThickness = data.minRuleThickness;
		this._fontMetrics = void 0;
	}
	/**
	* Returns a new options object with the same properties as "this".  Properties
	* from "extension" will be copied to the new options object.
	*/
	extend(extension) {
		var data = {
			style: this.style,
			size: this.size,
			textSize: this.textSize,
			color: this.color,
			phantom: this.phantom,
			font: this.font,
			fontFamily: this.fontFamily,
			fontWeight: this.fontWeight,
			fontShape: this.fontShape,
			maxSize: this.maxSize,
			minRuleThickness: this.minRuleThickness
		};
		Object.assign(data, extension);
		return new Options(data);
	}
	/**
	* Return an options object with the given style. If `this.style === style`,
	* returns `this`.
	*/
	havingStyle(style) {
		if (this.style === style) return this;
		else return this.extend({
			style,
			size: sizeAtStyle(this.textSize, style)
		});
	}
	/**
	* Return an options object with a cramped version of the current style. If
	* the current style is cramped, returns `this`.
	*/
	havingCrampedStyle() {
		return this.havingStyle(this.style.cramp());
	}
	/**
	* Return an options object with the given size and in at least `\textstyle`.
	* Returns `this` if appropriate.
	*/
	havingSize(size) {
		if (this.size === size && this.textSize === size) return this;
		else return this.extend({
			style: this.style.text(),
			size,
			textSize: size,
			sizeMultiplier: sizeMultipliers[size - 1]
		});
	}
	/**
	* Like `this.havingSize(BASESIZE).havingStyle(style)`. If `style` is omitted,
	* changes to at least `\textstyle`.
	*/
	havingBaseStyle(style) {
		style = style || this.style.text();
		var wantSize = sizeAtStyle(Options.BASESIZE, style);
		if (this.size === wantSize && this.textSize === Options.BASESIZE && this.style === style) return this;
		else return this.extend({
			style,
			size: wantSize
		});
	}
	/**
	* Remove the effect of sizing changes such as \Huge.
	* Keep the effect of the current style, such as \scriptstyle.
	*/
	havingBaseSizing() {
		var size;
		switch (this.style.id) {
			case 4:
			case 5:
				size = 3;
				break;
			case 6:
			case 7:
				size = 1;
				break;
			default: size = 6;
		}
		return this.extend({
			style: this.style.text(),
			size
		});
	}
	/**
	* Create a new options object with the given color.
	*/
	withColor(color) {
		return this.extend({ color });
	}
	/**
	* Create a new options object with "phantom" set to true.
	*/
	withPhantom() {
		return this.extend({ phantom: true });
	}
	/**
	* Creates a new options object with the given math font or old text font.
	* @type {[type]}
	*/
	withFont(font) {
		return this.extend({ font });
	}
	/**
	* Create a new options objects with the given fontFamily.
	*/
	withTextFontFamily(fontFamily) {
		return this.extend({
			fontFamily,
			font: ""
		});
	}
	/**
	* Creates a new options object with the given font weight
	*/
	withTextFontWeight(fontWeight) {
		return this.extend({
			fontWeight,
			font: ""
		});
	}
	/**
	* Creates a new options object with the given font weight
	*/
	withTextFontShape(fontShape) {
		return this.extend({
			fontShape,
			font: ""
		});
	}
	/**
	* Return the CSS sizing classes required to switch from enclosing options
	* `oldOptions` to `this`. Returns an array of classes.
	*/
	sizingClasses(oldOptions) {
		if (oldOptions.size !== this.size) return [
			"katex-sizing",
			"reset-size" + oldOptions.size,
			"size" + this.size
		];
		else return [];
	}
	/**
	* Return the CSS sizing classes required to switch to the base size. Like
	* `this.havingSize(BASESIZE).sizingClasses(this)`.
	*/
	baseSizingClasses() {
		if (this.size !== Options.BASESIZE) return [
			"katex-sizing",
			"reset-size" + this.size,
			"size" + Options.BASESIZE
		];
		else return [];
	}
	/**
	* Return the font metrics for this size.
	*/
	fontMetrics() {
		if (!this._fontMetrics) this._fontMetrics = getGlobalMetrics(this.size);
		return this._fontMetrics;
	}
	/**
	* Gets the CSS color of the current options object
	*/
	getColor() {
		if (this.phantom) return "transparent";
		else return this.color;
	}
};
/**
* The base size index.
*/
Options.BASESIZE = 6;
var optionsFromSettings = function optionsFromSettings(settings) {
	return new Options({
		style: settings.displayMode ? Style$1.DISPLAY : Style$1.TEXT,
		maxSize: settings.maxSize,
		minRuleThickness: settings.minRuleThickness
	});
};
var displayWrap = function displayWrap(node, settings) {
	if (settings.displayMode) {
		var classes = ["katex-display"];
		if (settings.leqno) classes.push("leqno");
		if (settings.fleqn) classes.push("fleqn");
		node = makeSpan(classes, [node]);
	}
	return node;
};
var buildTree = function buildTree(tree, expression, settings) {
	var options = optionsFromSettings(settings);
	var katexNode;
	if (settings.output === "mathml") return buildMathML(tree, expression, options, settings.displayMode, true);
	else if (settings.output === "html") katexNode = makeSpan(["katex"], [buildHTML(tree, options)]);
	else katexNode = makeSpan(["katex"], [buildMathML(tree, expression, options, settings.displayMode, false), buildHTML(tree, options)]);
	return displayWrap(katexNode, settings);
};
var buildHTMLTree = function buildHTMLTree(tree, expression, settings) {
	return displayWrap(makeSpan(["katex"], [buildHTML(tree, optionsFromSettings(settings))]), settings);
};
/**
* This file provides support to buildMathML.js and buildHTML.js
* for stretchy wide elements rendered from SVG files
* and other CSS trickery.
*/
var stretchyCodePoint = {
	widehat: "^",
	widecheck: "ˇ",
	widetilde: "~",
	utilde: "~",
	overleftarrow: "←",
	underleftarrow: "←",
	xleftarrow: "←",
	overrightarrow: "→",
	underrightarrow: "→",
	xrightarrow: "→",
	underbrace: "⏟",
	overbrace: "⏞",
	underbracket: "⎵",
	overbracket: "⎴",
	overgroup: "⏠",
	undergroup: "⏡",
	overleftrightarrow: "↔",
	underleftrightarrow: "↔",
	xleftrightarrow: "↔",
	Overrightarrow: "⇒",
	xRightarrow: "⇒",
	overleftharpoon: "↼",
	xleftharpoonup: "↼",
	overrightharpoon: "⇀",
	xrightharpoonup: "⇀",
	xLeftarrow: "⇐",
	xLeftrightarrow: "⇔",
	xhookleftarrow: "↩",
	xhookrightarrow: "↪",
	xmapsto: "↦",
	xrightharpoondown: "⇁",
	xleftharpoondown: "↽",
	xrightleftharpoons: "⇌",
	xleftrightharpoons: "⇋",
	xtwoheadleftarrow: "↞",
	xtwoheadrightarrow: "↠",
	xlongequal: "=",
	xtofrom: "⇄",
	xrightleftarrows: "⇄",
	xrightequilibrium: "⇌",
	xleftequilibrium: "⇋",
	"\\cdrightarrow": "→",
	"\\cdleftarrow": "←",
	"\\cdlongequal": "="
};
var stretchyMathML = function stretchyMathML(label) {
	var node = new MathNode("mo", [new TextNode(stretchyCodePoint[label.replace(/^\\/, "")])]);
	node.setAttribute("stretchy", "true");
	return node;
};
var katexImagesData = {
	overrightarrow: [
		["rightarrow"],
		.888,
		522,
		"xMaxYMin"
	],
	overleftarrow: [
		["leftarrow"],
		.888,
		522,
		"xMinYMin"
	],
	underrightarrow: [
		["rightarrow"],
		.888,
		522,
		"xMaxYMin"
	],
	underleftarrow: [
		["leftarrow"],
		.888,
		522,
		"xMinYMin"
	],
	xrightarrow: [
		["rightarrow"],
		1.469,
		522,
		"xMaxYMin"
	],
	"\\cdrightarrow": [
		["rightarrow"],
		3,
		522,
		"xMaxYMin"
	],
	xleftarrow: [
		["leftarrow"],
		1.469,
		522,
		"xMinYMin"
	],
	"\\cdleftarrow": [
		["leftarrow"],
		3,
		522,
		"xMinYMin"
	],
	Overrightarrow: [
		["doublerightarrow"],
		.888,
		560,
		"xMaxYMin"
	],
	xRightarrow: [
		["doublerightarrow"],
		1.526,
		560,
		"xMaxYMin"
	],
	xLeftarrow: [
		["doubleleftarrow"],
		1.526,
		560,
		"xMinYMin"
	],
	overleftharpoon: [
		["leftharpoon"],
		.888,
		522,
		"xMinYMin"
	],
	xleftharpoonup: [
		["leftharpoon"],
		.888,
		522,
		"xMinYMin"
	],
	xleftharpoondown: [
		["leftharpoondown"],
		.888,
		522,
		"xMinYMin"
	],
	overrightharpoon: [
		["rightharpoon"],
		.888,
		522,
		"xMaxYMin"
	],
	xrightharpoonup: [
		["rightharpoon"],
		.888,
		522,
		"xMaxYMin"
	],
	xrightharpoondown: [
		["rightharpoondown"],
		.888,
		522,
		"xMaxYMin"
	],
	xlongequal: [
		["longequal"],
		.888,
		334,
		"xMinYMin"
	],
	"\\cdlongequal": [
		["longequal"],
		3,
		334,
		"xMinYMin"
	],
	xtwoheadleftarrow: [
		["twoheadleftarrow"],
		.888,
		334,
		"xMinYMin"
	],
	xtwoheadrightarrow: [
		["twoheadrightarrow"],
		.888,
		334,
		"xMaxYMin"
	],
	overleftrightarrow: [
		["leftarrow", "rightarrow"],
		.888,
		522
	],
	overbrace: [
		[
			"leftbrace",
			"midbrace",
			"rightbrace"
		],
		1.6,
		548
	],
	underbrace: [
		[
			"leftbraceunder",
			"midbraceunder",
			"rightbraceunder"
		],
		1.6,
		548
	],
	underleftrightarrow: [
		["leftarrow", "rightarrow"],
		.888,
		522
	],
	xleftrightarrow: [
		["leftarrow", "rightarrow"],
		1.75,
		522
	],
	xLeftrightarrow: [
		["doubleleftarrow", "doublerightarrow"],
		1.75,
		560
	],
	xrightleftharpoons: [
		["leftharpoondownplus", "rightharpoonplus"],
		1.75,
		716
	],
	xleftrightharpoons: [
		["leftharpoonplus", "rightharpoondownplus"],
		1.75,
		716
	],
	xhookleftarrow: [
		["leftarrow", "righthook"],
		1.08,
		522
	],
	xhookrightarrow: [
		["lefthook", "rightarrow"],
		1.08,
		522
	],
	overlinesegment: [
		["leftlinesegment", "rightlinesegment"],
		.888,
		522
	],
	underlinesegment: [
		["leftlinesegment", "rightlinesegment"],
		.888,
		522
	],
	overbracket: [
		["leftbracketover", "rightbracketover"],
		1.6,
		440
	],
	underbracket: [
		["leftbracketunder", "rightbracketunder"],
		1.6,
		410
	],
	overgroup: [
		["leftgroup", "rightgroup"],
		.888,
		342
	],
	undergroup: [
		["leftgroupunder", "rightgroupunder"],
		.888,
		342
	],
	xmapsto: [
		["leftmapsto", "rightarrow"],
		1.5,
		522
	],
	xtofrom: [
		["leftToFrom", "rightToFrom"],
		1.75,
		528
	],
	xrightleftarrows: [
		["baraboveleftarrow", "rightarrowabovebar"],
		1.75,
		901
	],
	xrightequilibrium: [
		["baraboveshortleftharpoon", "rightharpoonaboveshortbar"],
		1.75,
		716
	],
	xleftequilibrium: [
		["shortbaraboveleftharpoon", "shortrightharpoonabovebar"],
		1.75,
		716
	]
};
var wideAccentLabels = /* @__PURE__ */ new Set([
	"widehat",
	"widecheck",
	"widetilde",
	"utilde"
]);
var stretchySvg = function stretchySvg(group, options) {
	function buildSvgSpan_() {
		var viewBoxWidth = 4e5;
		var label = group.label.slice(1);
		if (wideAccentLabels.has(label) && "base" in group) {
			var numChars = group.base.type === "ordgroup" ? group.base.body.length : 1;
			var viewBoxHeight;
			var pathName;
			var _height;
			if (numChars > 5) {
				if (label === "widehat" || label === "widecheck") {
					viewBoxHeight = 420;
					viewBoxWidth = 2364;
					_height = .42;
					pathName = label + "4";
				} else {
					viewBoxHeight = 312;
					viewBoxWidth = 2340;
					_height = .34;
					pathName = "tilde4";
				}
			} else {
				var imgIndex = [
					1,
					1,
					2,
					2,
					3,
					3
				][numChars];
				if (label === "widehat" || label === "widecheck") {
					viewBoxWidth = [
						0,
						1062,
						2364,
						2364,
						2364
					][imgIndex];
					viewBoxHeight = [
						0,
						239,
						300,
						360,
						420
					][imgIndex];
					_height = [
						0,
						.24,
						.3,
						.3,
						.36,
						.42
					][imgIndex];
					pathName = label + imgIndex;
				} else {
					viewBoxWidth = [
						0,
						600,
						1033,
						2339,
						2340
					][imgIndex];
					viewBoxHeight = [
						0,
						260,
						286,
						306,
						312
					][imgIndex];
					_height = [
						0,
						.26,
						.286,
						.3,
						.306,
						.34
					][imgIndex];
					pathName = "tilde" + imgIndex;
				}
			}
			return {
				span: makeSvgSpan([], [new SvgNode([new PathNode(pathName)], {
					"width": "100%",
					"height": makeEm(_height),
					"viewBox": "0 0 " + viewBoxWidth + " " + viewBoxHeight,
					"preserveAspectRatio": "none"
				})], options),
				minWidth: 0,
				height: _height
			};
		} else {
			var spans = [];
			var data = katexImagesData[label];
			if (!data) throw new Error("No SVG data for \"" + label + "\".");
			var paths = data[0], _minWidth = data[1], _viewBoxHeight = data[2];
			var _height2 = _viewBoxHeight / 1e3;
			var numSvgChildren = paths.length;
			var widthClasses;
			var aligns;
			if (numSvgChildren === 1) {
				if (data.length !== 4) throw new Error("Expected 4-tuple for single-path SVG data \"" + label + "\".");
				widthClasses = ["hide-tail"];
				aligns = [data[3]];
			} else if (numSvgChildren === 2) {
				widthClasses = ["halfarrow-left", "halfarrow-right"];
				aligns = ["xMinYMin", "xMaxYMin"];
			} else if (numSvgChildren === 3) {
				widthClasses = [
					"brace-left",
					"brace-center",
					"brace-right"
				];
				aligns = [
					"xMinYMin",
					"xMidYMin",
					"xMaxYMin"
				];
			} else throw new Error("Correct katexImagesData or update code here to support\n                    " + numSvgChildren + " children.");
			for (var i = 0; i < numSvgChildren; i++) {
				var _svgNode = new SvgNode([new PathNode(paths[i])], {
					"width": "400em",
					"height": makeEm(_height2),
					"viewBox": "0 0 " + viewBoxWidth + " " + _viewBoxHeight,
					"preserveAspectRatio": aligns[i] + " slice"
				});
				var _span = makeSvgSpan([widthClasses[i]], [_svgNode], options);
				if (numSvgChildren === 1) return {
					span: _span,
					minWidth: _minWidth,
					height: _height2
				};
				else {
					_span.style.height = makeEm(_height2);
					spans.push(_span);
				}
			}
			return {
				span: makeSpan(["katex-stretchy"], spans, options),
				minWidth: _minWidth,
				height: _height2
			};
		}
	}
	var _buildSvgSpan_ = buildSvgSpan_(), span = _buildSvgSpan_.span, minWidth = _buildSvgSpan_.minWidth, height = _buildSvgSpan_.height;
	span.height = height;
	span.style.height = makeEm(height);
	if (minWidth > 0) span.style.minWidth = makeEm(minWidth);
	return span;
};
var stretchyEnclose = function stretchyEnclose(inner, label, topPad, bottomPad, options) {
	var img;
	var totalHeight = inner.height + inner.depth + topPad + bottomPad;
	if (/fbox|color|angl/.test(label)) {
		img = makeSpan(["katex-stretchy", label], [], options);
		if (label === "fbox") {
			var color = options.color && options.getColor();
			if (color) img.style.borderColor = color;
		}
	} else {
		var lines = [];
		if (/^[bx]cancel$/.test(label)) lines.push(new LineNode({
			"x1": "0",
			"y1": "0",
			"x2": "100%",
			"y2": "100%",
			"stroke-width": "0.046em"
		}));
		if (/^x?cancel$/.test(label)) lines.push(new LineNode({
			"x1": "0",
			"y1": "100%",
			"x2": "100%",
			"y2": "0",
			"stroke-width": "0.046em"
		}));
		img = makeSvgSpan([], [new SvgNode(lines, {
			"width": "100%",
			"height": makeEm(totalHeight)
		})], options);
	}
	img.height = totalHeight;
	img.style.height = makeEm(totalHeight);
	return img;
};
/**
* Small module for atom-group constants and type guard.  Kept separate from
* `symbols.ts` so that consumers (notably `contrib/render-a11y-string`) can
* pull in `isAtom` without dragging in the ~870-line symbol tables.
*/
var atomList = [
	"bin",
	"close",
	"inner",
	"open",
	"punct",
	"rel"
];
var nonAtomList = [
	"accent-token",
	"mathord",
	"op-token",
	"spacing",
	"textord"
];
var Atoms = new Set(atomList);
var NonAtoms = new Set(nonAtomList);
function isAtom(value) {
	return Atoms.has(value);
}
/**
* Asserts that the node is of the given type and returns it with stricter
* typing. Throws if the node's type does not match.
*/
function assertNodeType(node, type) {
	if (!node || node.type !== type) throw new Error("Expected node of type " + type + ", but got " + (node ? "node of type " + node.type : String(node)));
	return node;
}
/**
* Returns the node more strictly typed iff it is of the given type. Otherwise,
* returns null.
*/
function assertSymbolNodeType(node) {
	var typedNode = checkSymbolNodeType(node);
	if (!typedNode) throw new Error("Expected node of symbol group type, but got " + (node ? "node of type " + node.type : String(node)));
	return typedNode;
}
/**
* Returns the node more strictly typed if it is of the given type. Otherwise,
* returns null.
*/
function checkSymbolNodeType(node) {
	if (node.type === "atom" || NonAtoms.has(node.type)) return node;
	return null;
}
/**
* Returns the string spelled out by a group of plain characters, throwing the
* given ParseError if the group holds anything else. With allowSpaces, a
* literal space counts as a character; `~` and `\ ` do not.
*/
function assertCharacterGroup(group, errorMessage, allowSpaces) {
	var text = "";
	for (var node of group.body) if (node.type === "textord") text += node.text;
	else if (allowSpaces && node.type === "spacing" && node.text === " ") text += " ";
	else throw new ParseError(errorMessage, group);
	return text;
}
var getBaseSymbol = (group) => {
	if (group instanceof SymbolNode) return group;
	if (hasHtmlDomChildren(group) && group.children.length === 1) return getBaseSymbol(group.children[0]);
};
var htmlBuilder$a = (grp, options) => {
	var base;
	var group;
	var supSubGroup;
	if (grp && grp.type === "supsub") {
		group = assertNodeType(grp.base, "accent");
		base = group.base;
		grp.base = base;
		supSubGroup = assertSpan(buildGroup$1(grp, options));
		grp.base = group;
	} else {
		group = assertNodeType(grp, "accent");
		base = group.base;
	}
	var body = buildGroup$1(base, options.havingCrampedStyle());
	var mustShift = group.isShifty && isCharacterBox(base);
	var skew = 0;
	if (mustShift) {
		var _getBaseSymbol$skew, _getBaseSymbol;
		skew = (_getBaseSymbol$skew = (_getBaseSymbol = getBaseSymbol(body)) == null ? void 0 : _getBaseSymbol.skew) != null ? _getBaseSymbol$skew : 0;
	}
	var accentBelow = group.label === "\\c";
	var clearance = accentBelow ? body.height + body.depth : Math.min(body.height, options.fontMetrics().xHeight);
	var accentBody;
	if (!group.isStretchy) {
		var accent;
		var width;
		if (group.label === "\\vec") {
			accent = staticSvg("vec", options);
			width = svgData.vec[1];
		} else {
			accent = makeOrd({
				type: "textord",
				mode: group.mode,
				text: group.label
			}, options);
			accent = assertSymbolDomNode(accent);
			accent.italic = 0;
			width = accent.width;
			if (accentBelow) clearance += accent.depth;
		}
		accentBody = makeSpan(["accent-body"], [accent]);
		var accentFull = group.label === "\\textcircled";
		if (accentFull) {
			accentBody.classes.push("accent-full");
			clearance = body.height;
		}
		var left = skew;
		if (!accentFull) left -= width / 2;
		accentBody.style.left = makeEm(left);
		if (group.label === "\\textcircled") accentBody.style.top = ".2em";
		accentBody = makeVList({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: body
				},
				{
					type: "kern",
					size: -clearance
				},
				{
					type: "elem",
					elem: accentBody
				}
			]
		});
	} else {
		accentBody = stretchySvg(group, options);
		accentBody = makeVList({
			positionType: "firstBaseline",
			children: [{
				type: "elem",
				elem: body
			}, {
				type: "elem",
				elem: accentBody,
				wrapperClasses: ["svg-align"],
				wrapperStyle: skew > 0 ? {
					width: "calc(100% - " + makeEm(2 * skew) + ")",
					marginLeft: makeEm(2 * skew)
				} : void 0
			}]
		});
	}
	var accentWrap = makeSpan(["mord", "katex-accent"], [accentBody], options);
	if (supSubGroup) {
		supSubGroup.children[0] = accentWrap;
		supSubGroup.height = Math.max(accentWrap.height, supSubGroup.height);
		supSubGroup.classes[0] = "mord";
		return supSubGroup;
	} else return accentWrap;
};
var mathmlBuilder$9 = (group, options) => {
	var accentNode = group.isStretchy ? stretchyMathML(group.label) : new MathNode("mo", [makeText(group.label, group.mode)]);
	var node = new MathNode("mover", [buildGroup(group.base, options), accentNode]);
	node.setAttribute("accent", "true");
	return node;
};
var NON_STRETCHY_ACCENT_REGEX = new RegExp([
	"\\acute",
	"\\grave",
	"\\ddot",
	"\\tilde",
	"\\bar",
	"\\breve",
	"\\check",
	"\\hat",
	"\\vec",
	"\\dot",
	"\\mathring"
].map((accent) => "\\" + accent).join("|"));
defineFunction({
	type: "accent",
	names: [
		"\\acute",
		"\\grave",
		"\\ddot",
		"\\tilde",
		"\\bar",
		"\\breve",
		"\\check",
		"\\hat",
		"\\vec",
		"\\dot",
		"\\mathring",
		"\\widecheck",
		"\\widehat",
		"\\widetilde",
		"\\overrightarrow",
		"\\overleftarrow",
		"\\Overrightarrow",
		"\\overleftrightarrow",
		"\\overgroup",
		"\\overlinesegment",
		"\\overleftharpoon",
		"\\overrightharpoon"
	],
	numArgs: 1,
	handler: (context, args) => {
		var base = normalizeArgument(args[0]);
		var isStretchy = !NON_STRETCHY_ACCENT_REGEX.test(context.funcName);
		var isShifty = !isStretchy || context.funcName === "\\widehat" || context.funcName === "\\widetilde" || context.funcName === "\\widecheck";
		return {
			type: "accent",
			mode: context.parser.mode,
			label: context.funcName,
			isStretchy,
			isShifty,
			base
		};
	},
	htmlBuilder: htmlBuilder$a,
	mathmlBuilder: mathmlBuilder$9
});
defineFunction({
	type: "accent",
	names: [
		"\\'",
		"\\`",
		"\\^",
		"\\~",
		"\\=",
		"\\u",
		"\\.",
		"\\\"",
		"\\c",
		"\\r",
		"\\H",
		"\\v",
		"\\textcircled"
	],
	numArgs: 1,
	allowedInText: true,
	allowedInMath: true,
	argTypes: ["primitive"],
	handler: (context, args) => {
		var base = args[0];
		var mode = context.parser.mode;
		if (mode === "math") {
			context.parser.settings.reportNonstrict("mathVsTextAccents", "LaTeX's accent " + context.funcName + " works only in text mode");
			mode = "text";
		}
		return {
			type: "accent",
			mode,
			label: context.funcName,
			isStretchy: false,
			isShifty: true,
			base
		};
	}
});
defineFunction({
	type: "accentUnder",
	names: [
		"\\underleftarrow",
		"\\underrightarrow",
		"\\underleftrightarrow",
		"\\undergroup",
		"\\underlinesegment",
		"\\utilde"
	],
	numArgs: 1,
	handler: (_ref, args) => {
		var parser = _ref.parser, funcName = _ref.funcName;
		var base = args[0];
		return {
			type: "accentUnder",
			mode: parser.mode,
			label: funcName,
			base
		};
	},
	htmlBuilder: (group, options) => {
		var innerGroup = buildGroup$1(group.base, options);
		var accentBody = stretchySvg(group, options);
		var kern = group.label === "\\utilde" ? .12 : 0;
		return makeSpan(["mord", "accentunder"], [makeVList({
			positionType: "top",
			positionData: innerGroup.height,
			children: [
				{
					type: "elem",
					elem: accentBody,
					wrapperClasses: ["svg-align"]
				},
				{
					type: "kern",
					size: kern
				},
				{
					type: "elem",
					elem: innerGroup
				}
			]
		})], options);
	},
	mathmlBuilder: (group, options) => {
		var accentNode = stretchyMathML(group.label);
		var node = new MathNode("munder", [buildGroup(group.base, options), accentNode]);
		node.setAttribute("accentunder", "true");
		return node;
	}
});
var paddedNode = (group) => {
	var node = new MathNode("mpadded", group ? [group] : []);
	node.setAttribute("width", "+0.6em");
	node.setAttribute("lspace", "0.3em");
	return node;
};
defineFunction({
	type: "xArrow",
	names: [
		"\\xleftarrow",
		"\\xrightarrow",
		"\\xLeftarrow",
		"\\xRightarrow",
		"\\xleftrightarrow",
		"\\xLeftrightarrow",
		"\\xhookleftarrow",
		"\\xhookrightarrow",
		"\\xmapsto",
		"\\xrightharpoondown",
		"\\xrightharpoonup",
		"\\xleftharpoondown",
		"\\xleftharpoonup",
		"\\xrightleftharpoons",
		"\\xleftrightharpoons",
		"\\xlongequal",
		"\\xtwoheadrightarrow",
		"\\xtwoheadleftarrow",
		"\\xtofrom",
		"\\xrightleftarrows",
		"\\xrightequilibrium",
		"\\xleftequilibrium",
		"\\\\cdrightarrow",
		"\\\\cdleftarrow",
		"\\\\cdlongequal"
	],
	numArgs: 1,
	numOptionalArgs: 1,
	handler(_ref, args, optArgs) {
		var parser = _ref.parser, funcName = _ref.funcName;
		return {
			type: "xArrow",
			mode: parser.mode,
			label: funcName,
			body: args[0],
			below: optArgs[0]
		};
	},
	htmlBuilder(group, options) {
		var style = options.style;
		var newOptions = options.havingStyle(style.sup());
		var upperGroup = wrapFragment(buildGroup$1(group.body, newOptions, options), options);
		var arrowPrefix = group.label.slice(0, 2) === "\\x" ? "x" : "cd";
		upperGroup.classes.push(arrowPrefix + "-arrow-pad");
		var lowerGroup;
		if (group.below) {
			newOptions = options.havingStyle(style.sub());
			lowerGroup = wrapFragment(buildGroup$1(group.below, newOptions, options), options);
			lowerGroup.classes.push(arrowPrefix + "-arrow-pad");
		}
		var arrowBody = stretchySvg(group, options);
		var arrowShift = -options.fontMetrics().axisHeight + .5 * arrowBody.height;
		var upperShift = -options.fontMetrics().axisHeight - .5 * arrowBody.height - .111;
		if (upperGroup.depth > .25 || group.label === "\\xleftequilibrium") upperShift -= upperGroup.depth;
		var vlist;
		if (lowerGroup) {
			var lowerShift = -options.fontMetrics().axisHeight + lowerGroup.height + .5 * arrowBody.height + .111;
			vlist = makeVList({
				positionType: "individualShift",
				children: [
					{
						type: "elem",
						elem: upperGroup,
						shift: upperShift
					},
					{
						type: "elem",
						elem: arrowBody,
						shift: arrowShift,
						wrapperClasses: ["svg-align"]
					},
					{
						type: "elem",
						elem: lowerGroup,
						shift: lowerShift
					}
				]
			});
		} else vlist = makeVList({
			positionType: "individualShift",
			children: [{
				type: "elem",
				elem: upperGroup,
				shift: upperShift
			}, {
				type: "elem",
				elem: arrowBody,
				shift: arrowShift,
				wrapperClasses: ["svg-align"]
			}]
		});
		return makeSpan(["mrel", "x-arrow"], [vlist], options);
	},
	mathmlBuilder(group, options) {
		var arrowNode = stretchyMathML(group.label);
		arrowNode.setAttribute("minsize", group.label.charAt(0) === "x" ? "1.75em" : "3.0em");
		var node;
		if (group.body) {
			var upperNode = paddedNode(buildGroup(group.body, options));
			if (group.below) node = new MathNode("munderover", [
				arrowNode,
				paddedNode(buildGroup(group.below, options)),
				upperNode
			]);
			else node = new MathNode("mover", [arrowNode, upperNode]);
		} else if (group.below) node = new MathNode("munder", [arrowNode, paddedNode(buildGroup(group.below, options))]);
		else {
			node = paddedNode();
			node = new MathNode("mover", [arrowNode, node]);
		}
		return node;
	}
});
function htmlBuilder$9(group, options) {
	var elements = buildExpression$1(group.body, options, true);
	return makeSpan([group.mclass], elements, options);
}
function mathmlBuilder$8(group, options) {
	var node;
	var inner = buildExpression(group.body, options);
	if (group.mclass === "minner") node = new MathNode("mpadded", inner);
	else if (group.mclass === "mord") {
		if (group.isCharacterBox) {
			node = inner[0];
			node.type = "mi";
		} else node = new MathNode("mi", inner);
	} else {
		if (group.isCharacterBox) {
			node = inner[0];
			node.type = "mo";
		} else node = new MathNode("mo", inner);
		if (group.mclass === "mbin") {
			node.attributes.lspace = "0.22em";
			node.attributes.rspace = "0.22em";
		} else if (group.mclass === "mpunct") {
			node.attributes.lspace = "0em";
			node.attributes.rspace = "0.17em";
		} else if (group.mclass === "mopen" || group.mclass === "mclose") {
			node.attributes.lspace = "0em";
			node.attributes.rspace = "0em";
		}
	}
	return node;
}
defineFunction({
	type: "mclass",
	names: [
		"\\mathord",
		"\\mathbin",
		"\\mathrel",
		"\\mathopen",
		"\\mathclose",
		"\\mathpunct",
		"\\mathinner"
	],
	numArgs: 1,
	primitive: true,
	handler(_ref, args) {
		var parser = _ref.parser, funcName = _ref.funcName;
		var body = args[0];
		return {
			type: "mclass",
			mode: parser.mode,
			mclass: "m" + funcName.slice(5),
			body: ordargument(body),
			isCharacterBox: isCharacterBox(body)
		};
	},
	htmlBuilder: htmlBuilder$9,
	mathmlBuilder: mathmlBuilder$8
});
var binrelClass = (arg) => {
	var atom = arg.type === "ordgroup" && arg.body.length ? arg.body[0] : arg;
	if (atom.type === "atom" && (atom.family === "bin" || atom.family === "rel")) return "m" + atom.family;
	else return "mord";
};
defineFunction({
	type: "mclass",
	names: ["\\@binrel"],
	numArgs: 2,
	handler(_ref2, args) {
		return {
			type: "mclass",
			mode: _ref2.parser.mode,
			mclass: binrelClass(args[0]),
			body: ordargument(args[1]),
			isCharacterBox: isCharacterBox(args[1])
		};
	}
});
defineFunction({
	type: "mclass",
	names: [
		"\\stackrel",
		"\\overset",
		"\\underset"
	],
	numArgs: 2,
	handler(_ref3, args) {
		var parser = _ref3.parser, funcName = _ref3.funcName;
		var baseArg = args[1];
		var shiftedArg = args[0];
		var mclass;
		if (funcName !== "\\stackrel") mclass = binrelClass(baseArg);
		else mclass = "mrel";
		var baseOp = {
			type: "op",
			mode: baseArg.mode,
			limits: true,
			alwaysHandleSupSub: true,
			parentIsSupSub: false,
			symbol: false,
			suppressBaseShift: funcName !== "\\stackrel",
			body: ordargument(baseArg)
		};
		var supsub = funcName === "\\underset" ? {
			type: "supsub",
			mode: shiftedArg.mode,
			base: baseOp,
			sub: shiftedArg
		} : {
			type: "supsub",
			mode: shiftedArg.mode,
			base: baseOp,
			sup: shiftedArg
		};
		return {
			type: "mclass",
			mode: parser.mode,
			mclass,
			body: [supsub],
			isCharacterBox: isCharacterBox(supsub)
		};
	}
});
defineFunction({
	type: "pmb",
	names: ["\\pmb"],
	numArgs: 1,
	allowedInText: true,
	handler(_ref, args) {
		return {
			type: "pmb",
			mode: _ref.parser.mode,
			mclass: binrelClass(args[0]),
			body: ordargument(args[0])
		};
	},
	htmlBuilder(group, options) {
		var elements = buildExpression$1(group.body, options, true);
		var node = makeSpan([group.mclass], elements, options);
		node.style.textShadow = "0.02em 0.01em 0.04px";
		return node;
	},
	mathmlBuilder(group, style) {
		var node = new MathNode("mstyle", buildExpression(group.body, style));
		node.setAttribute("style", "text-shadow: 0.02em 0.01em 0.04px");
		return node;
	}
});
var cdArrowFunctionName = {
	">": "\\\\cdrightarrow",
	"<": "\\\\cdleftarrow",
	"=": "\\\\cdlongequal",
	"A": "\\uparrow",
	"V": "\\downarrow",
	"|": "\\Vert",
	".": "no arrow"
};
var newCell = () => {
	return {
		type: "styling",
		body: [],
		mode: "math",
		style: "display",
		resetFont: true
	};
};
var isStartOfArrow = (node) => {
	return node.type === "textord" && node.text === "@";
};
var isLabelEnd = (node, endChar) => {
	return (node.type === "mathord" || node.type === "atom") && node.text === endChar;
};
function cdArrow(arrowChar, labels, parser) {
	var funcName = cdArrowFunctionName[arrowChar];
	switch (funcName) {
		case "\\\\cdrightarrow":
		case "\\\\cdleftarrow": return parser.callFunction(funcName, [labels[0]], [labels[1]]);
		case "\\uparrow":
		case "\\downarrow":
			var leftLabel = parser.callFunction("\\\\cdleft", [labels[0]], []);
			var bareArrow = {
				type: "atom",
				text: funcName,
				mode: "math",
				family: "rel"
			};
			var arrowGroup = {
				type: "ordgroup",
				mode: "math",
				body: [
					leftLabel,
					parser.callFunction("\\Big", [bareArrow], []),
					parser.callFunction("\\\\cdright", [labels[1]], [])
				]
			};
			return parser.callFunction("\\\\cdparent", [arrowGroup], []);
		case "\\\\cdlongequal": return parser.callFunction("\\\\cdlongequal", [], []);
		case "\\Vert": return parser.callFunction("\\Big", [{
			type: "textord",
			text: "\\Vert",
			mode: "math"
		}], []);
		default: return {
			type: "textord",
			text: " ",
			mode: "math"
		};
	}
}
function parseCD(parser) {
	var parsedRows = [];
	parser.gullet.beginGroup();
	parser.gullet.macros.set("\\cr", "\\\\\\relax");
	parser.gullet.beginGroup();
	while (true) {
		parsedRows.push(parser.parseExpression(false, "\\\\"));
		parser.gullet.endGroup();
		parser.gullet.beginGroup();
		var next = parser.fetch().text;
		if (next === "&" || next === "\\\\") parser.consume();
		else if (next === "\\end") {
			if (parsedRows[parsedRows.length - 1].length === 0) parsedRows.pop();
			break;
		} else throw new ParseError("Expected \\\\ or \\cr or \\end", parser.nextToken);
	}
	var row = [];
	var body = [row];
	for (var i = 0; i < parsedRows.length; i++) {
		var rowNodes = parsedRows[i];
		var cell = newCell();
		for (var j = 0; j < rowNodes.length; j++) if (!isStartOfArrow(rowNodes[j])) cell.body.push(rowNodes[j]);
		else {
			row.push(cell);
			j += 1;
			var arrowChar = assertSymbolNodeType(rowNodes[j]).text;
			var labels = new Array(2);
			labels[0] = {
				type: "ordgroup",
				mode: "math",
				body: []
			};
			labels[1] = {
				type: "ordgroup",
				mode: "math",
				body: []
			};
			if ("=|.".includes(arrowChar));
			else if ("<>AV".includes(arrowChar)) for (var labelNum = 0; labelNum < 2; labelNum++) {
				var inLabel = true;
				for (var k = j + 1; k < rowNodes.length; k++) {
					if (isLabelEnd(rowNodes[k], arrowChar)) {
						inLabel = false;
						j = k;
						break;
					}
					if (isStartOfArrow(rowNodes[k])) throw new ParseError("Missing a " + arrowChar + " character to complete a CD arrow.", rowNodes[k]);
					labels[labelNum].body.push(rowNodes[k]);
				}
				if (inLabel) throw new ParseError("Missing a " + arrowChar + " character to complete a CD arrow.", rowNodes[j]);
			}
			else throw new ParseError("Expected one of \"<>AV=|.\" after @", rowNodes[j]);
			var wrappedArrow = {
				type: "styling",
				body: [cdArrow(arrowChar, labels, parser)],
				mode: "math",
				style: "display",
				resetFont: true
			};
			row.push(wrappedArrow);
			cell = newCell();
		}
		if (i % 2 === 0) row.push(cell);
		else row.shift();
		row = [];
		body.push(row);
	}
	parser.gullet.endGroup();
	parser.gullet.endGroup();
	return {
		type: "array",
		mode: "math",
		body,
		arraystretch: 1,
		addJot: true,
		rowGaps: [null],
		cols: new Array(body[0].length).fill({
			type: "align",
			align: "c",
			pregap: .25,
			postgap: .25
		}),
		colSeparationType: "CD",
		hLinesBeforeRow: new Array(body.length + 1).fill([])
	};
}
defineFunction({
	type: "cdlabel",
	names: ["\\\\cdleft", "\\\\cdright"],
	numArgs: 1,
	handler(_ref, args) {
		var parser = _ref.parser, funcName = _ref.funcName;
		return {
			type: "cdlabel",
			mode: parser.mode,
			side: funcName.slice(4),
			label: args[0]
		};
	},
	htmlBuilder(group, options) {
		var newOptions = options.havingStyle(options.style.sup());
		var label = wrapFragment(buildGroup$1(group.label, newOptions, options), options);
		label.classes.push("cd-label-" + group.side);
		label.style.bottom = makeEm(.8 - label.depth);
		label.height = 0;
		label.depth = 0;
		return label;
	},
	mathmlBuilder(group, options) {
		var label = new MathNode("mrow", [buildGroup(group.label, options)]);
		label = new MathNode("mpadded", [label]);
		label.setAttribute("width", "0");
		if (group.side === "left") label.setAttribute("lspace", "-1width");
		label.setAttribute("voffset", "0.7em");
		label = new MathNode("mstyle", [label]);
		label.setAttribute("displaystyle", "false");
		label.setAttribute("scriptlevel", "1");
		return label;
	}
});
defineFunction({
	type: "cdlabelparent",
	names: ["\\\\cdparent"],
	numArgs: 1,
	handler(_ref2, args) {
		return {
			type: "cdlabelparent",
			mode: _ref2.parser.mode,
			fragment: args[0]
		};
	},
	htmlBuilder(group, options) {
		var parent = wrapFragment(buildGroup$1(group.fragment, options), options);
		parent.classes.push("cd-vert-arrow");
		return parent;
	},
	mathmlBuilder(group, options) {
		return new MathNode("mrow", [buildGroup(group.fragment, options)]);
	}
});
defineFunction({
	type: "textord",
	names: ["\\@char"],
	numArgs: 1,
	allowedInText: true,
	handler(_ref, args) {
		var parser = _ref.parser;
		var number = assertCharacterGroup(assertNodeType(args[0], "ordgroup"), "\\@char has non-numeric argument");
		var code = parseInt(number);
		var text;
		if (isNaN(code)) throw new ParseError("\\@char has non-numeric argument " + number);
		else if (code < 0 || code > 1114111) throw new ParseError("\\@char with invalid code point " + number);
		else if (code <= 65535) text = String.fromCharCode(code);
		else {
			code -= 65536;
			text = String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
		}
		return {
			type: "textord",
			mode: parser.mode,
			text
		};
	}
});
var htmlBuilder$8 = (group, options) => {
	return makeFragment(buildExpression$1(group.body, options.withColor(group.color), false));
};
var mathmlBuilder$7 = (group, options) => {
	var node = new MathNode("mstyle", buildExpression(group.body, options.withColor(group.color)));
	node.setAttribute("mathcolor", group.color);
	return node;
};
defineFunction({
	type: "color",
	names: ["\\textcolor"],
	numArgs: 2,
	allowedInText: true,
	argTypes: ["color", "original"],
	handler(_ref, args) {
		var parser = _ref.parser;
		var color = assertNodeType(args[0], "color-token").color;
		var body = args[1];
		return {
			type: "color",
			mode: parser.mode,
			color,
			body: ordargument(body)
		};
	},
	htmlBuilder: htmlBuilder$8,
	mathmlBuilder: mathmlBuilder$7
});
defineFunction({
	type: "color",
	names: ["\\color"],
	numArgs: 1,
	allowedInText: true,
	argTypes: ["color"],
	handler(_ref2, args) {
		var parser = _ref2.parser, breakOnTokenText = _ref2.breakOnTokenText;
		var color = assertNodeType(args[0], "color-token").color;
		parser.gullet.macros.set("\\current@color", color);
		var body = parser.parseExpression(true, breakOnTokenText);
		return {
			type: "color",
			mode: parser.mode,
			color,
			body
		};
	}
});
defineFunction({
	type: "cr",
	names: ["\\\\"],
	numArgs: 0,
	numOptionalArgs: 0,
	allowedInText: true,
	handler(_ref, args, optArgs) {
		var parser = _ref.parser;
		var size = parser.gullet.future().text === "[" ? parser.parseSizeGroup(true) : null;
		var newLine = !parser.settings.displayMode || !parser.settings.useStrictBehavior("newLineInDisplayMode", "In LaTeX, \\\\ or \\newline does nothing in display mode");
		return {
			type: "cr",
			mode: parser.mode,
			newLine,
			size: size && assertNodeType(size, "size").value
		};
	},
	htmlBuilder(group, options) {
		var span = makeSpan(["mspace"], [], options);
		if (group.newLine) {
			span.classes.push("katex-newline");
			if (group.size) span.style.marginTop = makeEm(calculateSize(group.size, options));
		}
		return span;
	},
	mathmlBuilder(group, options) {
		var node = new MathNode("mspace");
		if (group.newLine) {
			node.setAttribute("linebreak", "newline");
			if (group.size) node.setAttribute("height", makeEm(calculateSize(group.size, options)));
		}
		return node;
	}
});
var globalMap = {
	"\\global": "\\global",
	"\\long": "\\\\globallong",
	"\\\\globallong": "\\\\globallong",
	"\\def": "\\gdef",
	"\\gdef": "\\gdef",
	"\\edef": "\\xdef",
	"\\xdef": "\\xdef",
	"\\let": "\\\\globallet",
	"\\futurelet": "\\\\globalfuture"
};
var checkControlSequence = (tok) => {
	var name = tok.text;
	if (/^(?:[\\{}$&#^_]|EOF)$/.test(name)) throw new ParseError("Expected a control sequence", tok);
	return name;
};
var getRHS = (parser) => {
	var tok = parser.gullet.popToken();
	if (tok.text === "=") {
		tok = parser.gullet.popToken();
		if (tok.text === " ") tok = parser.gullet.popToken();
	}
	return tok;
};
var letCommand = (parser, name, tok, global) => {
	var macro = parser.gullet.macros.get(tok.text);
	if (macro == null) {
		tok.noexpand = true;
		macro = {
			tokens: [tok],
			numArgs: 0,
			unexpandable: !parser.gullet.isExpandable(tok.text)
		};
	}
	parser.gullet.macros.set(name, macro, global);
};
defineFunction({
	type: "internal",
	names: [
		"\\global",
		"\\long",
		"\\\\globallong"
	],
	numArgs: 0,
	allowedInText: true,
	handler(_ref) {
		var parser = _ref.parser, funcName = _ref.funcName;
		parser.consumeSpaces();
		var token = parser.fetch();
		if (globalMap[token.text]) {
			if (funcName === "\\global" || funcName === "\\\\globallong") token.text = globalMap[token.text];
			return assertNodeType(parser.parseFunction(), "internal");
		}
		throw new ParseError("Invalid token after macro prefix", token);
	}
});
defineFunction({
	type: "internal",
	names: [
		"\\def",
		"\\gdef",
		"\\edef",
		"\\xdef"
	],
	numArgs: 0,
	allowedInText: true,
	primitive: true,
	handler(_ref2) {
		var parser = _ref2.parser, funcName = _ref2.funcName;
		var tok = parser.gullet.popToken();
		var name = tok.text;
		if (/^(?:[\\{}$&#^_]|EOF)$/.test(name)) throw new ParseError("Expected a control sequence", tok);
		var numArgs = 0;
		var insert;
		var delimiters = [[]];
		while (parser.gullet.future().text !== "{") {
			tok = parser.gullet.popToken();
			if (tok.text === "#") {
				if (parser.gullet.future().text === "{") {
					insert = parser.gullet.future();
					delimiters[numArgs].push("{");
					break;
				}
				tok = parser.gullet.popToken();
				if (!/^[1-9]$/.test(tok.text)) throw new ParseError("Invalid argument number \"" + tok.text + "\"");
				if (parseInt(tok.text) !== numArgs + 1) throw new ParseError("Argument number \"" + tok.text + "\" out of order");
				numArgs++;
				delimiters.push([]);
			} else if (tok.text === "EOF") throw new ParseError("Expected a macro definition");
			else delimiters[numArgs].push(tok.text);
		}
		var tokens = parser.gullet.consumeArg().tokens;
		if (insert) tokens.unshift(insert);
		if (funcName === "\\edef" || funcName === "\\xdef") {
			tokens = parser.gullet.expandTokens(tokens);
			tokens.reverse();
		}
		parser.gullet.macros.set(name, {
			tokens,
			numArgs,
			delimiters
		}, funcName === globalMap[funcName]);
		return {
			type: "internal",
			mode: parser.mode
		};
	}
});
defineFunction({
	type: "internal",
	names: ["\\let", "\\\\globallet"],
	numArgs: 0,
	allowedInText: true,
	primitive: true,
	handler(_ref3) {
		var parser = _ref3.parser, funcName = _ref3.funcName;
		var name = checkControlSequence(parser.gullet.popToken());
		parser.gullet.consumeSpaces();
		letCommand(parser, name, getRHS(parser), funcName === "\\\\globallet");
		return {
			type: "internal",
			mode: parser.mode
		};
	}
});
defineFunction({
	type: "internal",
	names: ["\\futurelet", "\\\\globalfuture"],
	numArgs: 0,
	allowedInText: true,
	primitive: true,
	handler(_ref4) {
		var parser = _ref4.parser, funcName = _ref4.funcName;
		var name = checkControlSequence(parser.gullet.popToken());
		var middle = parser.gullet.popToken();
		var tok = parser.gullet.popToken();
		letCommand(parser, name, tok, funcName === "\\\\globalfuture");
		parser.gullet.pushToken(tok);
		parser.gullet.pushToken(middle);
		return {
			type: "internal",
			mode: parser.mode
		};
	}
});
/**
* This file deals with creating delimiters of various sizes. The TeXbook
* discusses these routines on page 441-442, in the "Another subroutine sets box
* x to a specified variable delimiter" paragraph.
*
* There are three main routines here. `makeSmallDelim` makes a delimiter in the
* normal font, but in either text, script, or scriptscript style.
* `makeLargeDelim` makes a delimiter in textstyle, but in one of the Size1,
* Size2, Size3, or Size4 fonts. `makeStackedDelim` makes a delimiter out of
* smaller pieces that are stacked on top of one another.
*
* The functions take a parameter `center`, which determines if the delimiter
* should be centered around the axis.
*
* Then, there are three exposed functions. `sizedDelim` makes a delimiter in
* one of the given sizes. This is used for things like `\bigl`.
* `customSizedDelim` makes a delimiter with a given total height+depth. It is
* called in places like `\sqrt`. `leftRightDelim` makes an appropriate
* delimiter which surrounds an expression of a given height an depth. It is
* used in `\left` and `\right`.
*/
/**
* Get the metrics for a given symbol and font, after transformation (i.e.
* after following replacement from symbols.js)
*/
var getMetrics = function getMetrics(symbol, font, mode) {
	var metrics = getCharacterMetrics(symbols.math[symbol] && symbols.math[symbol].replace || symbol, font, mode);
	if (!metrics) throw new Error("Unsupported symbol " + symbol + " and font size " + font + ".");
	return metrics;
};
/**
* Puts a delimiter span in a given style, and adds appropriate height, depth,
* and maxFontSizes.
*/
var styleWrap = function styleWrap(delim, toStyle, options, classes) {
	var newOptions = options.havingBaseStyle(toStyle);
	var span = makeSpan(classes.concat(newOptions.sizingClasses(options)), [delim], options);
	var delimSizeMultiplier = newOptions.sizeMultiplier / options.sizeMultiplier;
	span.height *= delimSizeMultiplier;
	span.depth *= delimSizeMultiplier;
	span.maxFontSize = newOptions.sizeMultiplier;
	return span;
};
var centerSpan = function centerSpan(span, options, style) {
	var newOptions = options.havingBaseStyle(style);
	var shift = (1 - options.sizeMultiplier / newOptions.sizeMultiplier) * options.fontMetrics().axisHeight;
	span.classes.push("delimcenter");
	span.style.top = makeEm(shift);
	span.height -= shift;
	span.depth += shift;
};
/**
* Makes a small delimiter. This is a delimiter that comes in the Main-Regular
* font, but is restyled to either be in textstyle, scriptstyle, or
* scriptscriptstyle.
*/
var makeSmallDelim = function makeSmallDelim(delim, style, center, options, mode, classes) {
	var span = styleWrap(makeSymbol(delim, "Main-Regular", mode, options), style, options, classes);
	if (center) centerSpan(span, options, style);
	return span;
};
/**
* Builds a symbol in the given font size (note size is an integer)
*/
var mathrmSize = function mathrmSize(value, size, mode, options) {
	return makeSymbol(value, "Size" + size + "-Regular", mode, options);
};
/**
* Makes a large delimiter. This is a delimiter that comes in the Size1, Size2,
* Size3, or Size4 fonts. It is always rendered in textstyle.
*/
var makeLargeDelim = function makeLargeDelim(delim, size, center, options, mode, classes) {
	var inner = mathrmSize(delim, size, mode, options);
	var span = styleWrap(makeSpan(["delimsizing", "size" + size], [inner], options), Style$1.TEXT, options, classes);
	if (center) centerSpan(span, options, Style$1.TEXT);
	return span;
};
/**
* Make a span from a font glyph with the given offset and in the given font.
* This is used in makeStackedDelim to make the stacking pieces for the delimiter.
*/
var makeGlyphSpan = function makeGlyphSpan(symbol, font, mode) {
	var sizeClass;
	if (font === "Size1-Regular") sizeClass = "delim-size1";
	else sizeClass = "delim-size4";
	return {
		type: "elem",
		elem: makeSpan(["delimsizinginner", sizeClass], [makeSpan([], [makeSymbol(symbol, font, mode)])])
	};
};
var makeInner = function makeInner(ch, height, options) {
	var width = fontMetricsData["Size4-Regular"][ch.charCodeAt(0)] ? fontMetricsData["Size4-Regular"][ch.charCodeAt(0)][4] : fontMetricsData["Size1-Regular"][ch.charCodeAt(0)][4];
	var span = makeSvgSpan([], [new SvgNode([new PathNode("inner", innerPath(ch, Math.round(1e3 * height)))], {
		"width": makeEm(width),
		"height": makeEm(height),
		"style": "width:" + makeEm(width),
		"viewBox": "0 0 " + 1e3 * width + " " + Math.round(1e3 * height),
		"preserveAspectRatio": "xMinYMin"
	})], options);
	span.height = height;
	span.style.height = makeEm(height);
	span.style.width = makeEm(width);
	return {
		type: "elem",
		elem: span
	};
};
var lapInEms = .008;
var lap = {
	type: "kern",
	size: -1 * lapInEms
};
var verts = /* @__PURE__ */ new Set([
	"|",
	"\\lvert",
	"\\rvert",
	"\\vert"
]);
var doubleVerts = /* @__PURE__ */ new Set([
	"\\|",
	"\\lVert",
	"\\rVert",
	"\\Vert"
]);
/**
* Make a stacked delimiter out of a given delimiter, with the total height at
* least `heightTotal`. This routine is mentioned on page 442 of the TeXbook.
*/
var makeStackedDelim = function makeStackedDelim(delim, heightTotal, center, options, mode, classes) {
	var top;
	var middle;
	var repeat;
	var bottom;
	var svgLabel = "";
	var viewBoxWidth = 0;
	top = repeat = bottom = delim;
	middle = null;
	var font = "Size1-Regular";
	if (delim === "\\uparrow") repeat = bottom = "⏐";
	else if (delim === "\\Uparrow") repeat = bottom = "‖";
	else if (delim === "\\downarrow") top = repeat = "⏐";
	else if (delim === "\\Downarrow") top = repeat = "‖";
	else if (delim === "\\updownarrow") {
		top = "\\uparrow";
		repeat = "⏐";
		bottom = "\\downarrow";
	} else if (delim === "\\Updownarrow") {
		top = "\\Uparrow";
		repeat = "‖";
		bottom = "\\Downarrow";
	} else if (verts.has(delim)) {
		repeat = "∣";
		svgLabel = "vert";
		viewBoxWidth = 333;
	} else if (doubleVerts.has(delim)) {
		repeat = "∥";
		svgLabel = "doublevert";
		viewBoxWidth = 556;
	} else if (delim === "[" || delim === "\\lbrack") {
		top = "⎡";
		repeat = "⎢";
		bottom = "⎣";
		font = "Size4-Regular";
		svgLabel = "lbrack";
		viewBoxWidth = 667;
	} else if (delim === "]" || delim === "\\rbrack") {
		top = "⎤";
		repeat = "⎥";
		bottom = "⎦";
		font = "Size4-Regular";
		svgLabel = "rbrack";
		viewBoxWidth = 667;
	} else if (delim === "\\lfloor" || delim === "⌊") {
		repeat = top = "⎢";
		bottom = "⎣";
		font = "Size4-Regular";
		svgLabel = "lfloor";
		viewBoxWidth = 667;
	} else if (delim === "\\lceil" || delim === "⌈") {
		top = "⎡";
		repeat = bottom = "⎢";
		font = "Size4-Regular";
		svgLabel = "lceil";
		viewBoxWidth = 667;
	} else if (delim === "\\rfloor" || delim === "⌋") {
		repeat = top = "⎥";
		bottom = "⎦";
		font = "Size4-Regular";
		svgLabel = "rfloor";
		viewBoxWidth = 667;
	} else if (delim === "\\rceil" || delim === "⌉") {
		top = "⎤";
		repeat = bottom = "⎥";
		font = "Size4-Regular";
		svgLabel = "rceil";
		viewBoxWidth = 667;
	} else if (delim === "(" || delim === "\\lparen") {
		top = "⎛";
		repeat = "⎜";
		bottom = "⎝";
		font = "Size4-Regular";
		svgLabel = "lparen";
		viewBoxWidth = 875;
	} else if (delim === ")" || delim === "\\rparen") {
		top = "⎞";
		repeat = "⎟";
		bottom = "⎠";
		font = "Size4-Regular";
		svgLabel = "rparen";
		viewBoxWidth = 875;
	} else if (delim === "\\{" || delim === "\\lbrace") {
		top = "⎧";
		middle = "⎨";
		bottom = "⎩";
		repeat = "⎪";
		font = "Size4-Regular";
	} else if (delim === "\\}" || delim === "\\rbrace") {
		top = "⎫";
		middle = "⎬";
		bottom = "⎭";
		repeat = "⎪";
		font = "Size4-Regular";
	} else if (delim === "\\lgroup" || delim === "⟮") {
		top = "⎧";
		bottom = "⎩";
		repeat = "⎪";
		font = "Size4-Regular";
	} else if (delim === "\\rgroup" || delim === "⟯") {
		top = "⎫";
		bottom = "⎭";
		repeat = "⎪";
		font = "Size4-Regular";
	} else if (delim === "\\lmoustache" || delim === "⎰") {
		top = "⎧";
		bottom = "⎭";
		repeat = "⎪";
		font = "Size4-Regular";
	} else if (delim === "\\rmoustache" || delim === "⎱") {
		top = "⎫";
		bottom = "⎩";
		repeat = "⎪";
		font = "Size4-Regular";
	}
	var topMetrics = getMetrics(top, font, mode);
	var topHeightTotal = topMetrics.height + topMetrics.depth;
	var repeatMetrics = getMetrics(repeat, font, mode);
	var repeatHeightTotal = repeatMetrics.height + repeatMetrics.depth;
	var bottomMetrics = getMetrics(bottom, font, mode);
	var bottomHeightTotal = bottomMetrics.height + bottomMetrics.depth;
	var middleHeightTotal = 0;
	var middleFactor = 1;
	if (middle !== null) {
		var middleMetrics = getMetrics(middle, font, mode);
		middleHeightTotal = middleMetrics.height + middleMetrics.depth;
		middleFactor = 2;
	}
	var minHeight = topHeightTotal + bottomHeightTotal + middleHeightTotal;
	var realHeightTotal = minHeight + Math.max(0, Math.ceil((heightTotal - minHeight) / (middleFactor * repeatHeightTotal))) * middleFactor * repeatHeightTotal;
	var axisHeight = options.fontMetrics().axisHeight;
	if (center) axisHeight *= options.sizeMultiplier;
	var depth = realHeightTotal / 2 - axisHeight;
	var stack = [];
	if (svgLabel.length > 0) {
		var midHeight = realHeightTotal - topHeightTotal - bottomHeightTotal;
		var viewBoxHeight = Math.round(realHeightTotal * 1e3);
		var pathStr = tallDelim(svgLabel, Math.round(midHeight * 1e3));
		var path = new PathNode(svgLabel, pathStr);
		var width = makeEm(viewBoxWidth / 1e3);
		var height = makeEm(viewBoxHeight / 1e3);
		var wrapper = makeSvgSpan([], [new SvgNode([path], {
			"width": width,
			"height": height,
			"viewBox": "0 0 " + viewBoxWidth + " " + viewBoxHeight
		})], options);
		wrapper.height = viewBoxHeight / 1e3;
		wrapper.style.width = width;
		wrapper.style.height = height;
		stack.push({
			type: "elem",
			elem: wrapper
		});
	} else {
		stack.push(makeGlyphSpan(bottom, font, mode));
		stack.push(lap);
		if (middle === null) {
			var innerHeight = realHeightTotal - topHeightTotal - bottomHeightTotal + 2 * lapInEms;
			stack.push(makeInner(repeat, innerHeight, options));
		} else {
			var _innerHeight = (realHeightTotal - topHeightTotal - bottomHeightTotal - middleHeightTotal) / 2 + 2 * lapInEms;
			stack.push(makeInner(repeat, _innerHeight, options));
			stack.push(lap);
			stack.push(makeGlyphSpan(middle, font, mode));
			stack.push(lap);
			stack.push(makeInner(repeat, _innerHeight, options));
		}
		stack.push(lap);
		stack.push(makeGlyphSpan(top, font, mode));
	}
	var newOptions = options.havingBaseStyle(Style$1.TEXT);
	return styleWrap(makeSpan(["delimsizing", "mult"], [makeVList({
		positionType: "bottom",
		positionData: depth,
		children: stack
	})], newOptions), Style$1.TEXT, options, classes);
};
var vbPad = 80;
var emPad = .08;
var sqrtSvg = function sqrtSvg(sqrtName, height, viewBoxHeight, extraVinculum, options) {
	return makeSvgSpan(["hide-tail"], [new SvgNode([new PathNode(sqrtName, sqrtPath(sqrtName, extraVinculum, viewBoxHeight))], {
		"width": "400em",
		"height": makeEm(height),
		"viewBox": "0 0 400000 " + viewBoxHeight,
		"preserveAspectRatio": "xMinYMin slice"
	})], options);
};
/**
* Make a sqrt image of the given height,
*/
var makeSqrtImage = function makeSqrtImage(height, options) {
	var newOptions = options.havingBaseSizing();
	var delim = traverseSequence("\\surd", height * newOptions.sizeMultiplier, stackLargeDelimiterSequence, newOptions);
	var sizeMultiplier = newOptions.sizeMultiplier;
	var extraVinculum = Math.max(0, options.minRuleThickness - options.fontMetrics().sqrtRuleThickness);
	var span;
	var spanHeight;
	var texHeight;
	var viewBoxHeight;
	var advanceWidth;
	if (delim.type === "small") {
		viewBoxHeight = 1e3 + 1e3 * extraVinculum + vbPad;
		if (height < 1) sizeMultiplier = 1;
		else if (height < 1.4) sizeMultiplier = .7;
		spanHeight = (1 + extraVinculum + emPad) / sizeMultiplier;
		texHeight = (1 + extraVinculum) / sizeMultiplier;
		span = sqrtSvg("sqrtMain", spanHeight, viewBoxHeight, extraVinculum, options);
		span.style.minWidth = "0.853em";
		advanceWidth = .833 / sizeMultiplier;
	} else if (delim.type === "large") {
		viewBoxHeight = (1e3 + vbPad) * sizeToMaxHeight[delim.size];
		texHeight = (sizeToMaxHeight[delim.size] + extraVinculum) / sizeMultiplier;
		spanHeight = (sizeToMaxHeight[delim.size] + extraVinculum + emPad) / sizeMultiplier;
		span = sqrtSvg("sqrtSize" + delim.size, spanHeight, viewBoxHeight, extraVinculum, options);
		span.style.minWidth = "1.02em";
		advanceWidth = 1 / sizeMultiplier;
	} else {
		spanHeight = height + extraVinculum + emPad;
		texHeight = height + extraVinculum;
		viewBoxHeight = Math.floor(1e3 * height + extraVinculum) + vbPad;
		span = sqrtSvg("sqrtTall", spanHeight, viewBoxHeight, extraVinculum, options);
		span.style.minWidth = "0.742em";
		advanceWidth = 1.056;
	}
	span.height = texHeight;
	span.style.height = makeEm(spanHeight);
	return {
		span,
		advanceWidth,
		ruleWidth: (options.fontMetrics().sqrtRuleThickness + extraVinculum) * sizeMultiplier
	};
};
var stackLargeDelimiters = /* @__PURE__ */ new Set([
	"(",
	"\\lparen",
	")",
	"\\rparen",
	"[",
	"\\lbrack",
	"]",
	"\\rbrack",
	"\\{",
	"\\lbrace",
	"\\}",
	"\\rbrace",
	"\\lfloor",
	"\\rfloor",
	"⌊",
	"⌋",
	"\\lceil",
	"\\rceil",
	"⌈",
	"⌉",
	"\\surd"
]);
var stackAlwaysDelimiters = /* @__PURE__ */ new Set([
	"\\uparrow",
	"\\downarrow",
	"\\updownarrow",
	"\\Uparrow",
	"\\Downarrow",
	"\\Updownarrow",
	"|",
	"\\|",
	"\\vert",
	"\\Vert",
	"\\lvert",
	"\\rvert",
	"\\lVert",
	"\\rVert",
	"\\lgroup",
	"\\rgroup",
	"⟮",
	"⟯",
	"\\lmoustache",
	"\\rmoustache",
	"⎰",
	"⎱"
]);
var stackNeverDelimiters = /* @__PURE__ */ new Set([
	"<",
	">",
	"\\langle",
	"\\rangle",
	"/",
	"\\backslash",
	"\\lt",
	"\\gt"
]);
var sizeToMaxHeight = [
	0,
	1.2,
	1.8,
	2.4,
	3
];
/**
* Used to create a delimiter of a specific size, where `size` is 1, 2, 3, or 4.
*/
var makeSizedDelim = function makeSizedDelim(delim, size, options, mode, classes) {
	if (delim === "<" || delim === "\\lt" || delim === "⟨") delim = "\\langle";
	else if (delim === ">" || delim === "\\gt" || delim === "⟩") delim = "\\rangle";
	if (stackLargeDelimiters.has(delim) || stackNeverDelimiters.has(delim)) return makeLargeDelim(delim, size, false, options, mode, classes);
	else if (stackAlwaysDelimiters.has(delim)) return makeStackedDelim(delim, sizeToMaxHeight[size], false, options, mode, classes);
	else throw new ParseError("Illegal delimiter: '" + delim + "'");
};
var stackNeverDelimiterSequence = [
	{
		type: "small",
		style: Style$1.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: Style$1.SCRIPT
	},
	{
		type: "small",
		style: Style$1.TEXT
	},
	{
		type: "large",
		size: 1
	},
	{
		type: "large",
		size: 2
	},
	{
		type: "large",
		size: 3
	},
	{
		type: "large",
		size: 4
	}
];
var stackAlwaysDelimiterSequence = [
	{
		type: "small",
		style: Style$1.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: Style$1.SCRIPT
	},
	{
		type: "small",
		style: Style$1.TEXT
	},
	{ type: "stack" }
];
var stackLargeDelimiterSequence = [
	{
		type: "small",
		style: Style$1.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: Style$1.SCRIPT
	},
	{
		type: "small",
		style: Style$1.TEXT
	},
	{
		type: "large",
		size: 1
	},
	{
		type: "large",
		size: 2
	},
	{
		type: "large",
		size: 3
	},
	{
		type: "large",
		size: 4
	},
	{ type: "stack" }
];
/**
* Get the font used in a delimiter based on what kind of delimiter it is.
* TODO(#963) Use more specific font family return type once that is introduced.
*/
var delimTypeToFont = function delimTypeToFont(type) {
	if (type.type === "small") return "Main-Regular";
	else if (type.type === "large") return "Size" + type.size + "-Regular";
	else if (type.type === "stack") return "Size4-Regular";
	else {
		var delimKind = type.type;
		throw new Error("Add support for delim type '" + delimKind + "' here.");
	}
};
/**
* Traverse a sequence of types of delimiters to decide what kind of delimiter
* should be used to create a delimiter of the given height+depth.
*/
var traverseSequence = function traverseSequence(delim, height, sequence, options) {
	for (var i = Math.min(2, 3 - options.style.size); i < sequence.length; i++) {
		var delimType = sequence[i];
		if (delimType.type === "stack") break;
		var metrics = getMetrics(delim, delimTypeToFont(delimType), "math");
		var heightDepth = metrics.height + metrics.depth;
		if (delimType.type === "small") {
			var newOptions = options.havingBaseStyle(delimType.style);
			heightDepth *= newOptions.sizeMultiplier;
		}
		if (heightDepth > height) return delimType;
	}
	return sequence[sequence.length - 1];
};
/**
* Make a delimiter of a given height+depth, with optional centering. Here, we
* traverse the sequences, and create a delimiter that the sequence tells us to.
*/
var makeCustomSizedDelim = function makeCustomSizedDelim(delim, height, center, options, mode, classes) {
	if (delim === "<" || delim === "\\lt" || delim === "⟨") delim = "\\langle";
	else if (delim === ">" || delim === "\\gt" || delim === "⟩") delim = "\\rangle";
	var sequence;
	if (stackNeverDelimiters.has(delim)) sequence = stackNeverDelimiterSequence;
	else if (stackLargeDelimiters.has(delim)) sequence = stackLargeDelimiterSequence;
	else sequence = stackAlwaysDelimiterSequence;
	var delimType = traverseSequence(delim, height, sequence, options);
	if (delimType.type === "small") return makeSmallDelim(delim, delimType.style, center, options, mode, classes);
	else if (delimType.type === "large") return makeLargeDelim(delim, delimType.size, center, options, mode, classes);
	else return makeStackedDelim(delim, height, center, options, mode, classes);
};
/**
* Make a delimiter for use with `\left` and `\right`, given a height and depth
* of an expression that the delimiters surround.
*/
var makeLeftRightDelim = function makeLeftRightDelim(delim, height, depth, options, mode, classes) {
	var axisHeight = options.fontMetrics().axisHeight * options.sizeMultiplier;
	var delimiterFactor = 901;
	var delimiterExtend = 5 / options.fontMetrics().ptPerEm;
	var maxDistFromAxis = Math.max(height - axisHeight, depth + axisHeight);
	return makeCustomSizedDelim(delim, Math.max(maxDistFromAxis / 500 * delimiterFactor, 2 * maxDistFromAxis - delimiterExtend), true, options, mode, classes);
};
var delimiterSizes = {
	"\\bigl": {
		mclass: "mopen",
		size: 1
	},
	"\\Bigl": {
		mclass: "mopen",
		size: 2
	},
	"\\biggl": {
		mclass: "mopen",
		size: 3
	},
	"\\Biggl": {
		mclass: "mopen",
		size: 4
	},
	"\\bigr": {
		mclass: "mclose",
		size: 1
	},
	"\\Bigr": {
		mclass: "mclose",
		size: 2
	},
	"\\biggr": {
		mclass: "mclose",
		size: 3
	},
	"\\Biggr": {
		mclass: "mclose",
		size: 4
	},
	"\\bigm": {
		mclass: "mrel",
		size: 1
	},
	"\\Bigm": {
		mclass: "mrel",
		size: 2
	},
	"\\biggm": {
		mclass: "mrel",
		size: 3
	},
	"\\Biggm": {
		mclass: "mrel",
		size: 4
	},
	"\\big": {
		mclass: "mord",
		size: 1
	},
	"\\Big": {
		mclass: "mord",
		size: 2
	},
	"\\bigg": {
		mclass: "mord",
		size: 3
	},
	"\\Bigg": {
		mclass: "mord",
		size: 4
	}
};
var delimiters = /* @__PURE__ */ new Set([
	"(",
	"\\lparen",
	")",
	"\\rparen",
	"[",
	"\\lbrack",
	"]",
	"\\rbrack",
	"\\{",
	"\\lbrace",
	"\\}",
	"\\rbrace",
	"\\lfloor",
	"\\rfloor",
	"⌊",
	"⌋",
	"\\lceil",
	"\\rceil",
	"⌈",
	"⌉",
	"<",
	">",
	"\\langle",
	"⟨",
	"\\rangle",
	"⟩",
	"\\lt",
	"\\gt",
	"\\lvert",
	"\\rvert",
	"\\lVert",
	"\\rVert",
	"\\lgroup",
	"\\rgroup",
	"⟮",
	"⟯",
	"\\lmoustache",
	"\\rmoustache",
	"⎰",
	"⎱",
	"/",
	"\\backslash",
	"|",
	"\\vert",
	"\\|",
	"\\Vert",
	"\\uparrow",
	"\\Uparrow",
	"\\downarrow",
	"\\Downarrow",
	"\\updownarrow",
	"\\Updownarrow",
	"."
]);
function isMiddleDelimNode(node) {
	return "isMiddle" in node;
}
function checkDelimiter(delim, context) {
	var symDelim = checkSymbolNodeType(delim);
	if (symDelim && delimiters.has(symDelim.text)) return symDelim;
	else if (symDelim) throw new ParseError("Invalid delimiter '" + symDelim.text + "' after '" + context.funcName + "'", delim);
	else throw new ParseError("Invalid delimiter type '" + delim.type + "'", delim);
}
defineFunction({
	type: "delimsizing",
	names: [
		"\\bigl",
		"\\Bigl",
		"\\biggl",
		"\\Biggl",
		"\\bigr",
		"\\Bigr",
		"\\biggr",
		"\\Biggr",
		"\\bigm",
		"\\Bigm",
		"\\biggm",
		"\\Biggm",
		"\\big",
		"\\Big",
		"\\bigg",
		"\\Bigg"
	],
	numArgs: 1,
	argTypes: ["primitive"],
	handler: (context, args) => {
		var delim = checkDelimiter(normalizeArgument(args[0]), context);
		return {
			type: "delimsizing",
			mode: context.parser.mode,
			size: delimiterSizes[context.funcName].size,
			mclass: delimiterSizes[context.funcName].mclass,
			delim: delim.text
		};
	},
	htmlBuilder: (group, options) => {
		if (group.delim === ".") return makeSpan([group.mclass]);
		return makeSizedDelim(group.delim, group.size, options, group.mode, [group.mclass]);
	},
	mathmlBuilder: (group) => {
		var children = [];
		if (group.delim !== ".") children.push(makeText(group.delim, group.mode));
		var node = new MathNode("mo", children);
		if (group.mclass === "mopen" || group.mclass === "mclose") node.setAttribute("fence", "true");
		else node.setAttribute("fence", "false");
		node.setAttribute("stretchy", "true");
		var size = makeEm(sizeToMaxHeight[group.size]);
		node.setAttribute("minsize", size);
		node.setAttribute("maxsize", size);
		return node;
	}
});
function assertParsed(group) {
	if (!group.body) throw new Error("Bug: The leftright ParseNode wasn't fully parsed.");
}
defineFunction({
	type: "leftright-right",
	names: ["\\right"],
	numArgs: 1,
	primitive: true,
	handler: (context, args) => {
		var color = context.parser.gullet.macros.get("\\current@color");
		if (color && typeof color !== "string") throw new ParseError("\\current@color set to non-string in \\right");
		return {
			type: "leftright-right",
			mode: context.parser.mode,
			delim: checkDelimiter(args[0], context).text,
			color
		};
	}
});
defineFunction({
	type: "leftright",
	names: ["\\left"],
	numArgs: 1,
	primitive: true,
	handler: (context, args) => {
		var delim = checkDelimiter(args[0], context);
		var parser = context.parser;
		++parser.leftrightDepth;
		var body = parser.parseExpression(false);
		--parser.leftrightDepth;
		parser.expect("\\right", false);
		var right = assertNodeType(parser.parseFunction(), "leftright-right");
		return {
			type: "leftright",
			mode: parser.mode,
			body,
			left: delim.text,
			right: right.delim,
			rightColor: right.color
		};
	},
	htmlBuilder: (group, options) => {
		assertParsed(group);
		var inner = buildExpression$1(group.body, options, true, ["mopen", "mclose"]);
		var innerHeight = 0;
		var innerDepth = 0;
		var hadMiddle = false;
		for (var i = 0; i < inner.length; i++) {
			var node = inner[i];
			if (isMiddleDelimNode(node)) hadMiddle = true;
			else {
				innerHeight = Math.max(inner[i].height, innerHeight);
				innerDepth = Math.max(inner[i].depth, innerDepth);
			}
		}
		innerHeight *= options.sizeMultiplier;
		innerDepth *= options.sizeMultiplier;
		var leftDelim;
		if (group.left === ".") leftDelim = makeNullDelimiter(options, ["mopen"]);
		else leftDelim = makeLeftRightDelim(group.left, innerHeight, innerDepth, options, group.mode, ["mopen"]);
		inner.unshift(leftDelim);
		if (hadMiddle) for (var _i = 1; _i < inner.length; _i++) {
			var middleDelim = inner[_i];
			if (isMiddleDelimNode(middleDelim)) {
				var isMiddle = middleDelim.isMiddle;
				inner[_i] = makeLeftRightDelim(isMiddle.delim, innerHeight, innerDepth, isMiddle.options, group.mode, []);
			}
		}
		var rightDelim;
		if (group.right === ".") rightDelim = makeNullDelimiter(options, ["mclose"]);
		else {
			var colorOptions = group.rightColor ? options.withColor(group.rightColor) : options;
			rightDelim = makeLeftRightDelim(group.right, innerHeight, innerDepth, colorOptions, group.mode, ["mclose"]);
		}
		inner.push(rightDelim);
		return makeSpan(["minner"], inner, options);
	},
	mathmlBuilder: (group, options) => {
		assertParsed(group);
		var inner = buildExpression(group.body, options);
		if (group.left !== ".") {
			var leftNode = new MathNode("mo", [makeText(group.left, group.mode)]);
			leftNode.setAttribute("fence", "true");
			inner.unshift(leftNode);
		}
		if (group.right !== ".") {
			var rightNode = new MathNode("mo", [makeText(group.right, group.mode)]);
			rightNode.setAttribute("fence", "true");
			if (group.rightColor) rightNode.setAttribute("mathcolor", group.rightColor);
			inner.push(rightNode);
		}
		return makeRow(inner);
	}
});
defineFunction({
	type: "middle",
	names: ["\\middle"],
	numArgs: 1,
	primitive: true,
	handler: (context, args) => {
		var delim = checkDelimiter(args[0], context);
		if (!context.parser.leftrightDepth) throw new ParseError("\\middle without preceding \\left", delim);
		return {
			type: "middle",
			mode: context.parser.mode,
			delim: delim.text
		};
	},
	htmlBuilder: (group, options) => {
		var middleDelim;
		if (group.delim === ".") middleDelim = makeNullDelimiter(options, []);
		else {
			middleDelim = makeSizedDelim(group.delim, 1, options, group.mode, []);
			middleDelim.isMiddle = {
				delim: group.delim,
				options
			};
		}
		return middleDelim;
	},
	mathmlBuilder: (group, options) => {
		var middleNode = new MathNode("mo", [group.delim === "\\vert" || group.delim === "|" ? makeText("|", "text") : makeText(group.delim, group.mode)]);
		middleNode.setAttribute("fence", "true");
		middleNode.setAttribute("lspace", "0.05em");
		middleNode.setAttribute("rspace", "0.05em");
		return middleNode;
	}
});
var htmlBuilder$7 = (group, options) => {
	var inner = wrapFragment(buildGroup$1(group.body, options), options);
	var label = group.label.slice(1);
	var scale = options.sizeMultiplier;
	var img;
	var imgShift;
	var isSingleChar = isCharacterBox(group.body);
	if (label === "sout") {
		img = makeSpan(["katex-stretchy", "katex-sout"]);
		img.height = options.fontMetrics().defaultRuleThickness / scale;
		imgShift = -.5 * options.fontMetrics().xHeight;
	} else if (label === "phase") {
		var lineWeight = calculateSize({
			number: .6,
			unit: "pt"
		}, options);
		var clearance = calculateSize({
			number: .35,
			unit: "ex"
		}, options);
		var newOptions = options.havingBaseSizing();
		scale = scale / newOptions.sizeMultiplier;
		var angleHeight = inner.height + inner.depth + lineWeight + clearance;
		inner.style.paddingLeft = makeEm(angleHeight / 2 + lineWeight);
		var viewBoxHeight = Math.floor(1e3 * angleHeight * scale);
		img = makeSvgSpan(["hide-tail"], [new SvgNode([new PathNode("phase", phasePath(viewBoxHeight))], {
			"width": "400em",
			"height": makeEm(viewBoxHeight / 1e3),
			"viewBox": "0 0 400000 " + viewBoxHeight,
			"preserveAspectRatio": "xMinYMin slice"
		})], options);
		img.style.height = makeEm(angleHeight);
		imgShift = inner.depth + lineWeight + clearance;
	} else {
		if (/cancel/.test(label)) {
			if (!isSingleChar) inner.classes.push("cancel-pad");
		} else if (label === "angl") inner.classes.push("anglpad");
		else inner.classes.push("boxpad");
		var topPad;
		var bottomPad;
		var ruleThickness = 0;
		if (/box/.test(label)) {
			ruleThickness = Math.max(options.fontMetrics().fboxrule, options.minRuleThickness);
			topPad = options.fontMetrics().fboxsep + (label === "colorbox" ? 0 : ruleThickness);
			bottomPad = topPad;
		} else if (label === "angl") {
			ruleThickness = Math.max(options.fontMetrics().defaultRuleThickness, options.minRuleThickness);
			topPad = 4 * ruleThickness;
			bottomPad = Math.max(0, .25 - inner.depth);
		} else {
			topPad = isSingleChar ? .2 : 0;
			bottomPad = topPad;
		}
		img = stretchyEnclose(inner, label, topPad, bottomPad, options);
		if (/fbox|boxed|fcolorbox/.test(label)) {
			img.style.borderStyle = "solid";
			img.style.borderWidth = makeEm(ruleThickness);
		} else if (label === "angl" && ruleThickness !== .049) {
			img.style.borderTopWidth = makeEm(ruleThickness);
			img.style.borderRightWidth = makeEm(ruleThickness);
		}
		imgShift = inner.depth + bottomPad;
		if (group.backgroundColor) {
			img.style.backgroundColor = group.backgroundColor;
			if (group.borderColor) img.style.borderColor = group.borderColor;
		}
	}
	var vlist;
	if (group.backgroundColor) vlist = makeVList({
		positionType: "individualShift",
		children: [{
			type: "elem",
			elem: img,
			shift: imgShift
		}, {
			type: "elem",
			elem: inner,
			shift: 0
		}]
	});
	else {
		var classes = /cancel|phase/.test(label) ? ["svg-align"] : [];
		vlist = makeVList({
			positionType: "individualShift",
			children: [{
				type: "elem",
				elem: inner,
				shift: 0
			}, {
				type: "elem",
				elem: img,
				shift: imgShift,
				wrapperClasses: classes
			}]
		});
	}
	if (/cancel/.test(label)) {
		vlist.height = inner.height;
		vlist.depth = inner.depth;
	}
	if (/cancel/.test(label) && !isSingleChar) return makeSpan(["mord", "cancel-lap"], [vlist], options);
	else return makeSpan(["mord"], [vlist], options);
};
var mathmlBuilder$6 = (group, options) => {
	var fboxsep;
	var node = new MathNode(group.label.includes("colorbox") ? "mpadded" : "menclose", [buildGroup(group.body, options)]);
	switch (group.label) {
		case "\\cancel":
			node.setAttribute("notation", "updiagonalstrike");
			break;
		case "\\bcancel":
			node.setAttribute("notation", "downdiagonalstrike");
			break;
		case "\\phase":
			node.setAttribute("notation", "phasorangle");
			break;
		case "\\sout":
			node.setAttribute("notation", "horizontalstrike");
			break;
		case "\\fbox":
			node.setAttribute("notation", "box");
			break;
		case "\\angl":
			node.setAttribute("notation", "actuarial");
			break;
		case "\\fcolorbox":
		case "\\colorbox":
			fboxsep = options.fontMetrics().fboxsep * options.fontMetrics().ptPerEm;
			node.setAttribute("width", "+" + 2 * fboxsep + "pt");
			node.setAttribute("height", "+" + 2 * fboxsep + "pt");
			node.setAttribute("lspace", fboxsep + "pt");
			node.setAttribute("voffset", fboxsep + "pt");
			if (group.label === "\\fcolorbox") {
				var thk = Math.max(options.fontMetrics().fboxrule, options.minRuleThickness);
				node.setAttribute("style", "border: " + makeEm(thk) + " solid " + group.borderColor);
			}
			break;
		case "\\xcancel": node.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
	}
	if (group.backgroundColor) node.setAttribute("mathbackground", group.backgroundColor);
	return node;
};
defineFunction({
	type: "enclose",
	names: ["\\colorbox"],
	numArgs: 2,
	allowedInText: true,
	argTypes: ["color", "hbox"],
	handler(_ref, args, optArgs) {
		var parser = _ref.parser, funcName = _ref.funcName;
		var color = assertNodeType(args[0], "color-token").color;
		var body = args[1];
		return {
			type: "enclose",
			mode: parser.mode,
			label: funcName,
			backgroundColor: color,
			body
		};
	},
	htmlBuilder: htmlBuilder$7,
	mathmlBuilder: mathmlBuilder$6
});
defineFunction({
	type: "enclose",
	names: ["\\fcolorbox"],
	numArgs: 3,
	allowedInText: true,
	argTypes: [
		"color",
		"color",
		"hbox"
	],
	handler(_ref2, args, optArgs) {
		var parser = _ref2.parser, funcName = _ref2.funcName;
		var borderColor = assertNodeType(args[0], "color-token").color;
		var backgroundColor = assertNodeType(args[1], "color-token").color;
		var body = args[2];
		return {
			type: "enclose",
			mode: parser.mode,
			label: funcName,
			backgroundColor,
			borderColor,
			body
		};
	}
});
defineFunction({
	type: "enclose",
	names: ["\\fbox"],
	numArgs: 1,
	argTypes: ["hbox"],
	allowedInText: true,
	handler(_ref3, args) {
		return {
			type: "enclose",
			mode: _ref3.parser.mode,
			label: "\\fbox",
			body: args[0]
		};
	}
});
defineFunction({
	type: "enclose",
	names: [
		"\\cancel",
		"\\bcancel",
		"\\xcancel",
		"\\phase"
	],
	numArgs: 1,
	handler(_ref4, args) {
		var parser = _ref4.parser, funcName = _ref4.funcName;
		var body = args[0];
		return {
			type: "enclose",
			mode: parser.mode,
			label: funcName,
			body
		};
	}
});
defineFunction({
	type: "enclose",
	names: ["\\sout"],
	numArgs: 1,
	allowedInText: true,
	handler(_ref5, args) {
		var parser = _ref5.parser, funcName = _ref5.funcName;
		if (parser.mode === "math") parser.settings.reportNonstrict("mathVsSout", "LaTeX's \\sout works only in text mode");
		var body = args[0];
		return {
			type: "enclose",
			mode: parser.mode,
			label: funcName,
			body
		};
	}
});
defineFunction({
	type: "enclose",
	names: ["\\angl"],
	numArgs: 1,
	argTypes: ["hbox"],
	allowedInText: false,
	handler(_ref6, args) {
		return {
			type: "enclose",
			mode: _ref6.parser.mode,
			label: "\\angl",
			body: args[0]
		};
	}
});
/**
* All registered environments.
* `environments.js` exports this same dictionary again and makes it public.
* `Parser.js` requires this dictionary via `environments.js`.
*/
var _environments = {};
function defineEnvironment(_ref) {
	var type = _ref.type, names = _ref.names, props = _ref.props, handler = _ref.handler, htmlBuilder = _ref.htmlBuilder, mathmlBuilder = _ref.mathmlBuilder;
	var data = {
		type,
		numArgs: props.numArgs || 0,
		allowedInText: false,
		numOptionalArgs: 0,
		handler
	};
	for (var i = 0; i < names.length; ++i) _environments[names[i]] = data;
	if (htmlBuilder) _htmlGroupBuilders[type] = htmlBuilder;
	if (mathmlBuilder) _mathmlGroupBuilders[type] = mathmlBuilder;
}
/**
* All registered global/built-in macros.
* `macros.js` exports this same dictionary again and makes it public.
* `Parser.js` requires this dictionary via `macros.js`.
*/
var _macros = {};
function defineMacro(name, body) {
	_macros[name] = body;
}
/**
* Lexing or parsing positional information for error reporting.
* This object is immutable.
*/
var SourceLocation = class SourceLocation {
	constructor(lexer, start, end) {
		this.lexer = void 0;
		this.start = void 0;
		this.end = void 0;
		this.lexer = lexer;
		this.start = start;
		this.end = end;
	}
	/**
	* Merges two `SourceLocation`s from location providers, given they are
	* provided in order of appearance.
	* - Returns the first one's location if only the first is provided.
	* - Returns a merged range of the first and the last if both are provided
	*   and their lexers match.
	* - Otherwise, returns null.
	*/
	static range(first, second) {
		if (!second) return first && first.loc;
		else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) return null;
		else return new SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
	}
};
/**
* The resulting token returned from `lex`.
*
* It consists of the token text plus some position information.
* The position information is essentially a range in an input string,
* but instead of referencing the bare input string, we refer to the lexer.
* That way it is possible to attach extra metadata to the input string,
* like for example a file name or similar.
*
* The position information is optional, so it is OK to construct synthetic
* tokens if appropriate. Not providing available position information may
* lead to degraded error reporting, though.
*/
var Token = class Token {
	constructor(text, loc) {
		this.text = void 0;
		this.loc = void 0;
		this.noexpand = void 0;
		this.treatAsRelax = void 0;
		this.text = text;
		this.loc = loc;
	}
	/**
	* Given a pair of tokens (this and endToken), compute a `Token` encompassing
	* the whole input range enclosed by these two.
	*/
	range(endToken, text) {
		return new Token(text, SourceLocation.range(this, endToken));
	}
};
function getHLines(parser) {
	var hlineInfo = [];
	parser.consumeSpaces();
	var nxt = parser.fetch().text;
	if (nxt === "\\relax") {
		parser.consume();
		parser.consumeSpaces();
		nxt = parser.fetch().text;
	}
	while (nxt === "\\hline" || nxt === "\\hdashline") {
		parser.consume();
		hlineInfo.push(nxt === "\\hdashline");
		parser.consumeSpaces();
		nxt = parser.fetch().text;
	}
	return hlineInfo;
}
var validateAmsEnvironmentContext = (context) => {
	if (!context.parser.settings.displayMode) throw new ParseError("{" + context.envName + "} can be used only in display mode.");
};
var gatherEnvironments = /* @__PURE__ */ new Set(["gather", "gather*"]);
function getAutoTag(name) {
	if (!name.includes("ed")) return !name.includes("*");
}
/**
* Parse the body of the environment, with rows delimited by \\ and
* columns delimited by &, and create a nested list in row-major order
* with one group per cell.  If given an optional argument style
* ("text", "display", etc.), then each cell is cast into that style.
*/
function parseArray(parser, _ref, style) {
	var hskipBeforeAndAfter = _ref.hskipBeforeAndAfter, addJot = _ref.addJot, cols = _ref.cols, arraystretch = _ref.arraystretch, colSeparationType = _ref.colSeparationType, autoTag = _ref.autoTag, singleRow = _ref.singleRow, emptySingleRow = _ref.emptySingleRow, maxNumCols = _ref.maxNumCols, leqno = _ref.leqno;
	parser.gullet.beginGroup();
	if (!singleRow) parser.gullet.macros.set("\\cr", "\\\\\\relax");
	if (!arraystretch) {
		var stretch = parser.gullet.expandMacroAsText("\\arraystretch");
		if (stretch == null) arraystretch = 1;
		else {
			arraystretch = parseFloat(stretch);
			if (!arraystretch || arraystretch < 0) throw new ParseError("Invalid \\arraystretch: " + stretch);
		}
	}
	parser.gullet.beginGroup();
	var row = [];
	var body = [row];
	var rowGaps = [];
	var hLinesBeforeRow = [];
	var tags = autoTag != null ? [] : void 0;
	function beginRow() {
		if (autoTag) parser.gullet.macros.set("\\@eqnsw", "1", true);
	}
	function endRow() {
		if (tags) {
			if (parser.gullet.macros.get("\\df@tag")) {
				tags.push(parser.subparse([new Token("\\df@tag")]));
				parser.gullet.macros.set("\\df@tag", void 0, true);
			} else tags.push(Boolean(autoTag) && parser.gullet.macros.get("\\@eqnsw") === "1");
		}
	}
	beginRow();
	hLinesBeforeRow.push(getHLines(parser));
	while (true) {
		var cellBody = parser.parseExpression(false, singleRow ? "\\end" : "\\\\");
		parser.gullet.endGroup();
		parser.gullet.beginGroup();
		var cell = {
			type: "ordgroup",
			mode: parser.mode,
			body: cellBody
		};
		if (style) cell = {
			type: "styling",
			mode: parser.mode,
			style,
			resetFont: true,
			body: [cell]
		};
		row.push(cell);
		var next = parser.fetch().text;
		if (next === "&") {
			if (maxNumCols && row.length === maxNumCols) {
				if (singleRow || colSeparationType) throw new ParseError("Too many tab characters: &", parser.nextToken);
				else parser.settings.reportNonstrict("textEnv", "Too few columns specified in the {array} column argument.");
			}
			parser.consume();
		} else if (next === "\\end") {
			endRow();
			if (row.length === 1 && cell.type === "styling" && cell.body.length === 1 && cell.body[0].type === "ordgroup" && cell.body[0].body.length === 0 && (body.length > 1 || !emptySingleRow)) body.pop();
			if (hLinesBeforeRow.length < body.length + 1) hLinesBeforeRow.push([]);
			break;
		} else if (next === "\\\\") {
			parser.consume();
			var size = void 0;
			if (parser.gullet.future().text !== " ") size = parser.parseSizeGroup(true);
			rowGaps.push(size ? size.value : null);
			endRow();
			hLinesBeforeRow.push(getHLines(parser));
			row = [];
			body.push(row);
			beginRow();
		} else throw new ParseError("Expected & or \\\\ or \\cr or \\end", parser.nextToken);
	}
	parser.gullet.endGroup();
	parser.gullet.endGroup();
	return {
		type: "array",
		mode: parser.mode,
		addJot,
		arraystretch,
		body,
		cols,
		rowGaps,
		hskipBeforeAndAfter,
		hLinesBeforeRow,
		colSeparationType,
		tags,
		leqno
	};
}
function dCellStyle(envName) {
	if (envName.slice(0, 1) === "d") return "display";
	else return "text";
}
var htmlBuilder$6 = function htmlBuilder(group, options) {
	var r;
	var c;
	var nr = group.body.length;
	var hLinesBeforeRow = group.hLinesBeforeRow;
	var nc = 0;
	var body = new Array(nr);
	var hlines = [];
	var ruleThickness = Math.max(options.fontMetrics().arrayRuleWidth, options.minRuleThickness);
	var pt = 1 / options.fontMetrics().ptPerEm;
	var arraycolsep = 5 * pt;
	if (group.colSeparationType && group.colSeparationType === "small") arraycolsep = .2778 * (options.havingStyle(Style$1.SCRIPT).sizeMultiplier / options.sizeMultiplier);
	var baselineskip = group.colSeparationType === "CD" ? calculateSize({
		number: 3,
		unit: "ex"
	}, options) : 12 * pt;
	var jot = 3 * pt;
	var arrayskip = group.arraystretch * baselineskip;
	var arstrutHeight = .7 * arrayskip;
	var arstrutDepth = .3 * arrayskip;
	var totalHeight = 0;
	function setHLinePos(hlinesInGap) {
		for (var i = 0; i < hlinesInGap.length; ++i) {
			if (i > 0) totalHeight += .25;
			hlines.push({
				pos: totalHeight,
				isDashed: hlinesInGap[i]
			});
		}
	}
	setHLinePos(hLinesBeforeRow[0]);
	for (r = 0; r < group.body.length; ++r) {
		var inrow = group.body[r];
		var height = arstrutHeight;
		var depth = arstrutDepth;
		if (nc < inrow.length) nc = inrow.length;
		var outrow = {
			cells: new Array(inrow.length),
			height: 0,
			depth: 0,
			pos: 0
		};
		for (c = 0; c < inrow.length; ++c) {
			var elt = buildGroup$1(inrow[c], options);
			if (depth < elt.depth) depth = elt.depth;
			if (height < elt.height) height = elt.height;
			outrow.cells[c] = elt;
		}
		var rowGap = group.rowGaps[r];
		var gap = 0;
		if (rowGap) {
			gap = calculateSize(rowGap, options);
			if (gap > 0) {
				gap += arstrutDepth;
				if (depth < gap) depth = gap;
				gap = 0;
			}
		}
		if (group.addJot && r < group.body.length - 1) depth += jot;
		outrow.height = height;
		outrow.depth = depth;
		totalHeight += height;
		outrow.pos = totalHeight;
		totalHeight += depth + gap;
		body[r] = outrow;
		setHLinePos(hLinesBeforeRow[r + 1]);
	}
	var offset = totalHeight / 2 + options.fontMetrics().axisHeight;
	var colDescriptions = group.cols || [];
	var cols = [];
	var colSep;
	var colDescrNum;
	var tagSpans = [];
	if (group.tags && group.tags.some((tag) => tag)) for (r = 0; r < nr; ++r) {
		var rw = body[r];
		var shift = rw.pos - offset;
		var tag = group.tags[r];
		var tagSpan = void 0;
		if (tag === true) tagSpan = makeSpan(["eqn-num"], [], options);
		else if (tag === false) tagSpan = makeSpan([], [], options);
		else tagSpan = makeSpan([], buildExpression$1(tag, options, true), options);
		tagSpan.depth = rw.depth;
		tagSpan.height = rw.height;
		tagSpans.push({
			type: "elem",
			elem: tagSpan,
			shift
		});
	}
	for (c = 0, colDescrNum = 0; c < nc || colDescrNum < colDescriptions.length; ++c, ++colDescrNum) {
		var _colDescr3;
		var colDescr = colDescriptions[colDescrNum];
		var firstSeparator = true;
		while (((_colDescr = colDescr) == null ? void 0 : _colDescr.type) === "separator") {
			var _colDescr;
			if (!firstSeparator) {
				colSep = makeSpan(["arraycolsep"], []);
				colSep.style.width = makeEm(options.fontMetrics().doubleRuleSep);
				cols.push(colSep);
			}
			if (colDescr.separator === "|" || colDescr.separator === ":") {
				var lineType = colDescr.separator === "|" ? "solid" : "dashed";
				var separator = makeSpan(["vertical-separator"], [], options);
				separator.style.height = makeEm(totalHeight);
				separator.style.borderRightWidth = makeEm(ruleThickness);
				separator.style.borderRightStyle = lineType;
				separator.style.margin = "0 " + makeEm(-ruleThickness / 2);
				var _shift = totalHeight - offset;
				if (_shift) separator.style.verticalAlign = makeEm(-_shift);
				cols.push(separator);
			} else throw new ParseError("Invalid separator type: " + colDescr.separator);
			colDescrNum++;
			colDescr = colDescriptions[colDescrNum];
			firstSeparator = false;
		}
		if (c >= nc) continue;
		var sepwidth = void 0;
		if (c > 0 || group.hskipBeforeAndAfter) {
			var _colDescr$pregap, _colDescr2;
			sepwidth = (_colDescr$pregap = (_colDescr2 = colDescr) == null ? void 0 : _colDescr2.pregap) != null ? _colDescr$pregap : arraycolsep;
			if (sepwidth !== 0) {
				colSep = makeSpan(["arraycolsep"], []);
				colSep.style.width = makeEm(sepwidth);
				cols.push(colSep);
			}
		}
		var colElems = [];
		for (r = 0; r < nr; ++r) {
			var row = body[r];
			var elem = row.cells[c];
			if (!elem) continue;
			var _shift2 = row.pos - offset;
			elem.depth = row.depth;
			elem.height = row.height;
			colElems.push({
				type: "elem",
				elem,
				shift: _shift2
			});
		}
		var colVList = makeVList({
			positionType: "individualShift",
			children: colElems
		});
		var colSpan = makeSpan(["col-align-" + (((_colDescr3 = colDescr) == null ? void 0 : _colDescr3.align) || "c")], [colVList]);
		cols.push(colSpan);
		if (c < nc - 1 || group.hskipBeforeAndAfter) {
			var _colDescr$postgap, _colDescr4;
			sepwidth = (_colDescr$postgap = (_colDescr4 = colDescr) == null ? void 0 : _colDescr4.postgap) != null ? _colDescr$postgap : arraycolsep;
			if (sepwidth !== 0) {
				colSep = makeSpan(["arraycolsep"], []);
				colSep.style.width = makeEm(sepwidth);
				cols.push(colSep);
			}
		}
	}
	var tableBody = makeSpan(["mtable"], cols);
	if (hlines.length > 0) {
		var line = makeLineSpan("katex-hline", options, ruleThickness);
		var dashes = makeLineSpan("katex-hdashline", options, ruleThickness);
		var vListElems = [{
			type: "elem",
			elem: tableBody,
			shift: 0
		}];
		while (hlines.length > 0) {
			var hline = hlines.pop();
			var lineShift = hline.pos - offset;
			if (hline.isDashed) vListElems.push({
				type: "elem",
				elem: dashes,
				shift: lineShift
			});
			else vListElems.push({
				type: "elem",
				elem: line,
				shift: lineShift
			});
		}
		tableBody = makeVList({
			positionType: "individualShift",
			children: vListElems
		});
	}
	if (tagSpans.length === 0) return makeSpan(["mord"], [tableBody], options);
	else {
		var tagCol = makeSpan(["katex-tag"], [makeVList({
			positionType: "individualShift",
			children: tagSpans
		})], options);
		return makeFragment([tableBody, tagCol]);
	}
};
var alignMap = {
	c: "center ",
	l: "left ",
	r: "right "
};
var mathmlBuilder$5 = function mathmlBuilder(group, options) {
	var tbl = [];
	var glue = new MathNode("mtd", [], ["mtr-glue"]);
	var tag = new MathNode("mtd", [], ["mml-eqn-num"]);
	for (var i = 0; i < group.body.length; i++) {
		var rw = group.body[i];
		var row = [];
		for (var j = 0; j < rw.length; j++) row.push(new MathNode("mtd", [buildGroup(rw[j], options)]));
		if (group.tags && group.tags[i]) {
			row.unshift(glue);
			row.push(glue);
			if (group.leqno) row.unshift(tag);
			else row.push(tag);
		}
		tbl.push(new MathNode("mtr", row));
	}
	var table = new MathNode("mtable", tbl);
	var gap = group.arraystretch === .5 ? .1 : .16 + group.arraystretch - 1 + (group.addJot ? .09 : 0);
	table.setAttribute("rowspacing", makeEm(gap));
	var menclose = "";
	var align = "";
	if (group.cols && group.cols.length > 0) {
		var cols = group.cols;
		var columnLines = "";
		var prevTypeWasAlign = false;
		var iStart = 0;
		var iEnd = cols.length;
		if (cols[0].type === "separator") {
			menclose += "top ";
			iStart = 1;
		}
		if (cols[cols.length - 1].type === "separator") {
			menclose += "bottom ";
			iEnd -= 1;
		}
		for (var _i = iStart; _i < iEnd; _i++) {
			var col = cols[_i];
			if (col.type === "align") {
				align += alignMap[col.align];
				if (prevTypeWasAlign) columnLines += "none ";
				prevTypeWasAlign = true;
			} else if (col.type === "separator") {
				if (prevTypeWasAlign) {
					columnLines += col.separator === "|" ? "solid " : "dashed ";
					prevTypeWasAlign = false;
				}
			}
		}
		table.setAttribute("columnalign", align.trim());
		if (/[sd]/.test(columnLines)) table.setAttribute("columnlines", columnLines.trim());
	}
	if (group.colSeparationType === "align") {
		var _cols = group.cols || [];
		var spacing = "";
		for (var _i2 = 1; _i2 < _cols.length; _i2++) spacing += _i2 % 2 ? "0em " : "1em ";
		table.setAttribute("columnspacing", spacing.trim());
	} else if (group.colSeparationType === "alignat" || group.colSeparationType === "gather") table.setAttribute("columnspacing", "0em");
	else if (group.colSeparationType === "small") table.setAttribute("columnspacing", "0.2778em");
	else if (group.colSeparationType === "CD") table.setAttribute("columnspacing", "0.5em");
	else table.setAttribute("columnspacing", "1em");
	var rowLines = "";
	var hlines = group.hLinesBeforeRow;
	menclose += hlines[0].length > 0 ? "left " : "";
	menclose += hlines[hlines.length - 1].length > 0 ? "right " : "";
	for (var _i3 = 1; _i3 < hlines.length - 1; _i3++) rowLines += hlines[_i3].length === 0 ? "none " : hlines[_i3][0] ? "dashed " : "solid ";
	if (/[sd]/.test(rowLines)) table.setAttribute("rowlines", rowLines.trim());
	if (menclose !== "") {
		table = new MathNode("menclose", [table]);
		table.setAttribute("notation", menclose.trim());
	}
	if (group.arraystretch && group.arraystretch < 1) {
		table = new MathNode("mstyle", [table]);
		table.setAttribute("scriptlevel", "1");
	}
	return table;
};
var alignedHandler = function alignedHandler(context, args) {
	if (!context.envName.includes("ed")) validateAmsEnvironmentContext(context);
	var cols = [];
	var isSplit = context.envName === "split";
	var res = parseArray(context.parser, {
		cols,
		addJot: true,
		autoTag: isSplit ? void 0 : getAutoTag(context.envName),
		emptySingleRow: true,
		colSeparationType: context.envName.includes("at") ? "alignat" : "align",
		maxNumCols: isSplit ? 2 : void 0,
		leqno: context.parser.settings.leqno
	}, "display");
	var numMaths = 0;
	var numCols = 0;
	var emptyGroup = {
		type: "ordgroup",
		mode: context.mode,
		body: []
	};
	if (args[0] && args[0].type === "ordgroup") {
		var message = "Number of columns should be a positive integer";
		var numColumns = assertCharacterGroup(args[0], message);
		if (!/^[0-9]+$/.test(numColumns) || Number(numColumns) < 1) throw new ParseError(message, args[0]);
		numMaths = Number(numColumns);
		numCols = numMaths * 2;
	}
	var isAligned = !numCols;
	res.body.forEach(function(row) {
		for (var i = 1; i < row.length; i += 2) assertNodeType(assertNodeType(row[i], "styling").body[0], "ordgroup").body.unshift(emptyGroup);
		if (!isAligned) {
			var curMaths = row.length / 2;
			if (numMaths < curMaths) throw new ParseError("Too many math in a row: " + ("expected " + numMaths + ", but got " + curMaths), row[0]);
		} else if (numCols < row.length) numCols = row.length;
	});
	for (var i = 0; i < numCols; ++i) {
		var align = "r";
		var pregap = 0;
		if (i % 2 === 1) align = "l";
		else if (i > 0 && isAligned) pregap = 1;
		cols[i] = {
			type: "align",
			align,
			pregap,
			postgap: 0
		};
	}
	res.colSeparationType = isAligned ? "align" : "alignat";
	return res;
};
defineEnvironment({
	type: "array",
	names: ["array", "darray"],
	props: { numArgs: 1 },
	handler(context, args) {
		var cols = (checkSymbolNodeType(args[0]) ? [args[0]] : assertNodeType(args[0], "ordgroup").body).map(function(nde) {
			var ca = assertSymbolNodeType(nde).text;
			if ("lcr".includes(ca)) return {
				type: "align",
				align: ca
			};
			else if (ca === "|") return {
				type: "separator",
				separator: "|"
			};
			else if (ca === ":") return {
				type: "separator",
				separator: ":"
			};
			throw new ParseError("Unknown column alignment: " + ca, nde);
		});
		var res = {
			cols,
			hskipBeforeAndAfter: true,
			maxNumCols: cols.length
		};
		return parseArray(context.parser, res, dCellStyle(context.envName));
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: [
		"matrix",
		"pmatrix",
		"bmatrix",
		"Bmatrix",
		"vmatrix",
		"Vmatrix",
		"matrix*",
		"pmatrix*",
		"bmatrix*",
		"Bmatrix*",
		"vmatrix*",
		"Vmatrix*"
	],
	props: { numArgs: 0 },
	handler(context) {
		var delimiters = {
			"matrix": null,
			"pmatrix": ["(", ")"],
			"bmatrix": ["[", "]"],
			"Bmatrix": ["\\{", "\\}"],
			"vmatrix": ["|", "|"],
			"Vmatrix": ["\\Vert", "\\Vert"]
		}[context.envName.replace("*", "")];
		var colAlign = "c";
		var payload = {
			hskipBeforeAndAfter: false,
			cols: [{
				type: "align",
				align: colAlign
			}]
		};
		if (context.envName.charAt(context.envName.length - 1) === "*") {
			var parser = context.parser;
			parser.consumeSpaces();
			if (parser.fetch().text === "[") {
				parser.consume();
				parser.consumeSpaces();
				colAlign = parser.fetch().text;
				if (!"lcr".includes(colAlign)) throw new ParseError("Expected l or c or r", parser.nextToken);
				parser.consume();
				parser.consumeSpaces();
				parser.expect("]");
				parser.consume();
				payload.cols = [{
					type: "align",
					align: colAlign
				}];
			}
		}
		var res = parseArray(context.parser, payload, dCellStyle(context.envName));
		var numCols = Math.max(0, ...res.body.map((row) => row.length));
		res.cols = new Array(numCols).fill({
			type: "align",
			align: colAlign
		});
		return delimiters ? {
			type: "leftright",
			mode: context.mode,
			body: [res],
			left: delimiters[0],
			right: delimiters[1],
			rightColor: void 0
		} : res;
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: ["smallmatrix"],
	props: { numArgs: 0 },
	handler(context) {
		var res = parseArray(context.parser, { arraystretch: .5 }, "script");
		res.colSeparationType = "small";
		return res;
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: ["subarray"],
	props: { numArgs: 1 },
	handler(context, args) {
		var cols = (checkSymbolNodeType(args[0]) ? [args[0]] : assertNodeType(args[0], "ordgroup").body).map(function(nde) {
			var ca = assertSymbolNodeType(nde).text;
			if ("lc".includes(ca)) return {
				type: "align",
				align: ca
			};
			throw new ParseError("Unknown column alignment: " + ca, nde);
		});
		if (cols.length > 1) throw new ParseError("{subarray} can contain only one column");
		var payload = {
			cols,
			hskipBeforeAndAfter: false,
			arraystretch: .5
		};
		var res = parseArray(context.parser, payload, "script");
		if (res.body.length > 0 && res.body[0].length > 1) throw new ParseError("{subarray} can contain only one column");
		return res;
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: [
		"cases",
		"dcases",
		"rcases",
		"drcases"
	],
	props: { numArgs: 0 },
	handler(context) {
		var res = parseArray(context.parser, {
			arraystretch: 1.2,
			cols: [{
				type: "align",
				align: "l",
				pregap: 0,
				postgap: 1
			}, {
				type: "align",
				align: "l",
				pregap: 0,
				postgap: 0
			}]
		}, dCellStyle(context.envName));
		return {
			type: "leftright",
			mode: context.mode,
			body: [res],
			left: context.envName.includes("r") ? "." : "\\{",
			right: context.envName.includes("r") ? "\\}" : ".",
			rightColor: void 0
		};
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: [
		"align",
		"align*",
		"aligned",
		"split"
	],
	props: { numArgs: 0 },
	handler: alignedHandler,
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: [
		"gathered",
		"gather",
		"gather*"
	],
	props: { numArgs: 0 },
	handler(context) {
		if (gatherEnvironments.has(context.envName)) validateAmsEnvironmentContext(context);
		var res = {
			cols: [{
				type: "align",
				align: "c"
			}],
			addJot: true,
			colSeparationType: "gather",
			autoTag: getAutoTag(context.envName),
			emptySingleRow: true,
			leqno: context.parser.settings.leqno
		};
		return parseArray(context.parser, res, "display");
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: [
		"alignat",
		"alignat*",
		"alignedat"
	],
	props: { numArgs: 1 },
	handler: alignedHandler,
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: ["equation", "equation*"],
	props: { numArgs: 0 },
	handler(context) {
		validateAmsEnvironmentContext(context);
		var res = {
			autoTag: getAutoTag(context.envName),
			emptySingleRow: true,
			singleRow: true,
			maxNumCols: 1,
			leqno: context.parser.settings.leqno
		};
		return parseArray(context.parser, res, "display");
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
	type: "array",
	names: ["CD"],
	props: { numArgs: 0 },
	handler(context) {
		validateAmsEnvironmentContext(context);
		return parseCD(context.parser);
	},
	htmlBuilder: htmlBuilder$6,
	mathmlBuilder: mathmlBuilder$5
});
defineMacro("\\nonumber", "\\gdef\\@eqnsw{0}");
defineMacro("\\notag", "\\nonumber");
defineFunction({
	type: "text",
	names: ["\\hline", "\\hdashline"],
	numArgs: 0,
	allowedInText: true,
	allowedInMath: true,
	handler(context, args) {
		throw new ParseError(context.funcName + " valid only within array environment");
	}
});
var environments = _environments;
defineFunction({
	type: "environment",
	names: ["\\begin", "\\end"],
	numArgs: 1,
	argTypes: ["text"],
	handler(_ref, args) {
		var parser = _ref.parser, funcName = _ref.funcName;
		var nameGroup = args[0];
		if (nameGroup.type !== "ordgroup") throw new ParseError("Invalid environment name", nameGroup);
		var envName = assertCharacterGroup(nameGroup, "Environment name should contain only text characters and spaces", true);
		if (funcName === "\\begin") {
			if (!Object.prototype.hasOwnProperty.call(environments, envName)) throw new ParseError("No such environment: " + envName, nameGroup);
			var env = environments[envName];
			var _parser$parseArgument = parser.parseArguments("\\begin{" + envName + "}", env), _args = _parser$parseArgument.args, optArgs = _parser$parseArgument.optArgs;
			var context = {
				mode: parser.mode,
				envName,
				parser
			};
			var result = env.handler(context, _args, optArgs);
			parser.expect("\\end", false);
			var endNameToken = parser.nextToken;
			var end = assertNodeType(parser.parseFunction(), "environment");
			if (end.name !== envName) throw new ParseError("Mismatch: \\begin{" + envName + "} matched by \\end{" + end.name + "}", endNameToken);
			return result;
		}
		return {
			type: "environment",
			mode: parser.mode,
			name: envName,
			nameGroup
		};
	}
});
var htmlBuilder$5 = (group, options) => {
	var font = group.font;
	var newOptions = options.withFont(font);
	return buildGroup$1(group.body, newOptions);
};
var mathmlBuilder$4 = (group, options) => {
	var font = group.font;
	var newOptions = options.withFont(font);
	return buildGroup(group.body, newOptions);
};
var fontAliases = {
	"\\Bbb": "\\mathbb",
	"\\bold": "\\mathbf",
	"\\frak": "\\mathfrak"
};
defineFunction({
	type: "font",
	names: [
		"\\mathrm",
		"\\mathit",
		"\\mathbf",
		"\\mathnormal",
		"\\mathsfit",
		"\\mathbb",
		"\\mathcal",
		"\\mathfrak",
		"\\mathscr",
		"\\mathsf",
		"\\mathtt",
		"\\Bbb",
		"\\bold",
		"\\frak"
	],
	numArgs: 1,
	allowedInArgument: true,
	handler: (_ref, args) => {
		var parser = _ref.parser, funcName = _ref.funcName;
		var body = normalizeArgument(args[0]);
		var func = funcName in fontAliases ? fontAliases[funcName] : funcName;
		return {
			type: "font",
			mode: parser.mode,
			font: func.slice(1),
			body
		};
	},
	htmlBuilder: htmlBuilder$5,
	mathmlBuilder: mathmlBuilder$4
});
defineFunction({
	type: "mclass",
	names: ["\\boldsymbol", "\\bm"],
	numArgs: 1,
	handler: (_ref2, args) => {
		var parser = _ref2.parser;
		var body = args[0];
		return {
			type: "mclass",
			mode: parser.mode,
			mclass: binrelClass(body),
			body: [{
				type: "font",
				mode: parser.mode,
				font: "boldsymbol",
				body
			}],
			isCharacterBox: isCharacterBox(body)
		};
	}
});
defineFunction({
	type: "font",
	names: [
		"\\rm",
		"\\sf",
		"\\tt",
		"\\bf",
		"\\it",
		"\\cal"
	],
	numArgs: 0,
	allowedInText: true,
	handler: (_ref3, args) => {
		var parser = _ref3.parser, funcName = _ref3.funcName, breakOnTokenText = _ref3.breakOnTokenText;
		var mode = parser.mode;
		var body = parser.parseExpression(true, breakOnTokenText);
		return {
			type: "font",
			mode,
			font: "math" + funcName.slice(1),
			body: {
				type: "ordgroup",
				mode: parser.mode,
				body
			}
		};
	}
});
var htmlBuilder$4 = (group, options) => {
	var style = options.style;
	var nstyle = style.fracNum();
	var dstyle = style.fracDen();
	var newOptions = options.havingStyle(nstyle);
	var numerm = buildGroup$1(group.numer, newOptions, options);
	if (group.continued) {
		var hStrut = 8.5 / options.fontMetrics().ptPerEm;
		var dStrut = 3.5 / options.fontMetrics().ptPerEm;
		numerm.height = numerm.height < hStrut ? hStrut : numerm.height;
		numerm.depth = numerm.depth < dStrut ? dStrut : numerm.depth;
	}
	newOptions = options.havingStyle(dstyle);
	var denomm = buildGroup$1(group.denom, newOptions, options);
	var rule;
	var ruleWidth;
	var ruleSpacing;
	if (group.hasBarLine) {
		if (group.barSize) {
			ruleWidth = calculateSize(group.barSize, options);
			rule = makeLineSpan("frac-line", options, ruleWidth);
		} else rule = makeLineSpan("frac-line", options);
		ruleWidth = rule.height;
		ruleSpacing = rule.height;
	} else {
		rule = null;
		ruleWidth = 0;
		ruleSpacing = options.fontMetrics().defaultRuleThickness;
	}
	var numShift;
	var clearance;
	var denomShift;
	if (style.size === Style$1.DISPLAY.size) {
		numShift = options.fontMetrics().num1;
		if (ruleWidth > 0) clearance = 3 * ruleSpacing;
		else clearance = 7 * ruleSpacing;
		denomShift = options.fontMetrics().denom1;
	} else {
		if (ruleWidth > 0) {
			numShift = options.fontMetrics().num2;
			clearance = ruleSpacing;
		} else {
			numShift = options.fontMetrics().num3;
			clearance = 3 * ruleSpacing;
		}
		denomShift = options.fontMetrics().denom2;
	}
	var frac;
	if (!rule) {
		var candidateClearance = numShift - numerm.depth - (denomm.height - denomShift);
		if (candidateClearance < clearance) {
			numShift += .5 * (clearance - candidateClearance);
			denomShift += .5 * (clearance - candidateClearance);
		}
		frac = makeVList({
			positionType: "individualShift",
			children: [{
				type: "elem",
				elem: denomm,
				shift: denomShift
			}, {
				type: "elem",
				elem: numerm,
				shift: -numShift
			}]
		});
	} else {
		var axisHeight = options.fontMetrics().axisHeight;
		if (numShift - numerm.depth - (axisHeight + .5 * ruleWidth) < clearance) numShift += clearance - (numShift - numerm.depth - (axisHeight + .5 * ruleWidth));
		if (axisHeight - .5 * ruleWidth - (denomm.height - denomShift) < clearance) denomShift += clearance - (axisHeight - .5 * ruleWidth - (denomm.height - denomShift));
		var midShift = -(axisHeight - .5 * ruleWidth);
		frac = makeVList({
			positionType: "individualShift",
			children: [
				{
					type: "elem",
					elem: denomm,
					shift: denomShift
				},
				{
					type: "elem",
					elem: rule,
					shift: midShift
				},
				{
					type: "elem",
					elem: numerm,
					shift: -numShift
				}
			]
		});
	}
	newOptions = options.havingStyle(style);
	frac.height *= newOptions.sizeMultiplier / options.sizeMultiplier;
	frac.depth *= newOptions.sizeMultiplier / options.sizeMultiplier;
	var delimSize;
	if (style.size === Style$1.DISPLAY.size) delimSize = options.fontMetrics().delim1;
	else if (style.size === Style$1.SCRIPTSCRIPT.size) delimSize = options.havingStyle(Style$1.SCRIPT).fontMetrics().delim2;
	else delimSize = options.fontMetrics().delim2;
	var leftDelim;
	var rightDelim;
	if (group.leftDelim == null) leftDelim = makeNullDelimiter(options, ["mopen"]);
	else leftDelim = makeCustomSizedDelim(group.leftDelim, delimSize, true, options.havingStyle(style), group.mode, ["mopen"]);
	if (group.continued) rightDelim = makeSpan([]);
	else if (group.rightDelim == null) rightDelim = makeNullDelimiter(options, ["mclose"]);
	else rightDelim = makeCustomSizedDelim(group.rightDelim, delimSize, true, options.havingStyle(style), group.mode, ["mclose"]);
	return makeSpan(["mord"].concat(newOptions.sizingClasses(options)), [
		leftDelim,
		makeSpan(["mfrac"], [frac]),
		rightDelim
	], options);
};
var mathmlBuilder$3 = (group, options) => {
	var node = new MathNode("mfrac", [buildGroup(group.numer, options), buildGroup(group.denom, options)]);
	if (!group.hasBarLine) node.setAttribute("linethickness", "0px");
	else if (group.barSize) {
		var ruleWidth = calculateSize(group.barSize, options);
		node.setAttribute("linethickness", makeEm(ruleWidth));
	}
	if (group.leftDelim != null || group.rightDelim != null) {
		var withDelims = [];
		if (group.leftDelim != null) {
			var leftOp = new MathNode("mo", [new TextNode(group.leftDelim.replace("\\", ""))]);
			leftOp.setAttribute("fence", "true");
			withDelims.push(leftOp);
		}
		withDelims.push(node);
		if (group.rightDelim != null) {
			var rightOp = new MathNode("mo", [new TextNode(group.rightDelim.replace("\\", ""))]);
			rightOp.setAttribute("fence", "true");
			withDelims.push(rightOp);
		}
		return makeRow(withDelims);
	}
	return node;
};
var wrapWithStyle = (frac, style) => {
	if (!style) return frac;
	return {
		type: "styling",
		mode: frac.mode,
		style,
		body: [frac]
	};
};
defineFunction({
	type: "genfrac",
	names: [
		"\\cfrac",
		"\\dfrac",
		"\\frac",
		"\\tfrac",
		"\\dbinom",
		"\\binom",
		"\\tbinom",
		"\\\\atopfrac",
		"\\\\bracefrac",
		"\\\\brackfrac"
	],
	numArgs: 2,
	allowedInArgument: true,
	handler: (_ref, args) => {
		var parser = _ref.parser, funcName = _ref.funcName;
		var numer = args[0];
		var denom = args[1];
		var hasBarLine;
		var leftDelim = null;
		var rightDelim = null;
		switch (funcName) {
			case "\\cfrac":
			case "\\dfrac":
			case "\\frac":
			case "\\tfrac":
				hasBarLine = true;
				break;
			case "\\\\atopfrac":
				hasBarLine = false;
				break;
			case "\\dbinom":
			case "\\binom":
			case "\\tbinom":
				hasBarLine = false;
				leftDelim = "(";
				rightDelim = ")";
				break;
			case "\\\\bracefrac":
				hasBarLine = false;
				leftDelim = "\\{";
				rightDelim = "\\}";
				break;
			case "\\\\brackfrac":
				hasBarLine = false;
				leftDelim = "[";
				rightDelim = "]";
				break;
			default: throw new Error("Unrecognized genfrac command");
		}
		var continued = funcName === "\\cfrac";
		var style = null;
		if (continued || funcName.startsWith("\\d")) style = "display";
		else if (funcName.startsWith("\\t")) style = "text";
		return wrapWithStyle({
			type: "genfrac",
			mode: parser.mode,
			numer,
			denom,
			continued,
			hasBarLine,
			leftDelim,
			rightDelim,
			barSize: null
		}, style);
	},
	htmlBuilder: htmlBuilder$4,
	mathmlBuilder: mathmlBuilder$3
});
defineFunction({
	type: "infix",
	names: [
		"\\over",
		"\\choose",
		"\\atop",
		"\\brace",
		"\\brack"
	],
	numArgs: 0,
	infix: true,
	handler(_ref2) {
		var parser = _ref2.parser, funcName = _ref2.funcName, token = _ref2.token;
		var replaceWith;
		switch (funcName) {
			case "\\over":
				replaceWith = "\\frac";
				break;
			case "\\choose":
				replaceWith = "\\binom";
				break;
			case "\\atop":
				replaceWith = "\\\\atopfrac";
				break;
			case "\\brace":
				replaceWith = "\\\\bracefrac";
				break;
			case "\\brack":
				replaceWith = "\\\\brackfrac";
				break;
			default: throw new Error("Unrecognized infix genfrac command");
		}
		return {
			type: "infix",
			mode: parser.mode,
			replaceWith,
			token
		};
	}
});
var stylArray = [
	"display",
	"text",
	"script",
	"scriptscript"
];
var delimFromValue = function delimFromValue(delimString) {
	var delim = null;
	if (delimString.length > 0) {
		delim = delimString;
		delim = delim === "." ? null : delim;
	}
	return delim;
};
defineFunction({
	type: "genfrac",
	names: ["\\genfrac"],
	numArgs: 6,
	allowedInArgument: true,
	argTypes: [
		"math",
		"math",
		"size",
		"text",
		"math",
		"math"
	],
	handler(_ref3, args) {
		var parser = _ref3.parser;
		var numer = args[4];
		var denom = args[5];
		var leftNode = normalizeArgument(args[0]);
		var leftDelim = leftNode.type === "atom" && leftNode.family === "open" ? delimFromValue(leftNode.text) : null;
		var rightNode = normalizeArgument(args[1]);
		var rightDelim = rightNode.type === "atom" && rightNode.family === "close" ? delimFromValue(rightNode.text) : null;
		var barNode = assertNodeType(args[2], "size");
		var hasBarLine;
		var barSize = null;
		if (barNode.isBlank) hasBarLine = true;
		else {
			barSize = barNode.value;
			hasBarLine = barSize.number > 0;
		}
		var size = null;
		var styl = args[3];
		if (styl.type === "ordgroup") {
			if (styl.body.length > 0) {
				var textOrd = assertNodeType(styl.body[0], "textord");
				size = stylArray[Number(textOrd.text)];
			}
		} else {
			styl = assertNodeType(styl, "textord");
			size = stylArray[Number(styl.text)];
		}
		return wrapWithStyle({
			type: "genfrac",
			mode: parser.mode,
			numer,
			denom,
			continued: false,
			hasBarLine,
			barSize,
			leftDelim,
			rightDelim
		}, size);
	}
});
defineFunction({
	type: "infix",
	names: ["\\above"],
	numArgs: 1,
	argTypes: ["size"],
	infix: true,
	handler(_ref4, args) {
		var parser = _ref4.parser;
		_ref4.funcName;
		var token = _ref4.token;
		return {
			type: "infix",
			mode: parser.mode,
			replaceWith: "\\\\abovefrac",
			size: assertNodeType(args[0], "size").value,
			token
		};
	}
});
defineFunction({
	type: "genfrac",
	names: ["\\\\abovefrac"],
	numArgs: 3,
	argTypes: [
		"math",
		"size",
		"math"
	],
	handler: (_ref5, args) => {
		var parser = _ref5.parser;
		_ref5.funcName;
		var numer = args[0];
		var barSize = assertNodeType(args[1], "infix").size;
		if (!barSize) throw new Error("\\\\abovefrac expected size, but got " + String(barSize));
		var denom = args[2];
		var hasBarLine = barSize.number > 0;
		return {
			type: "genfrac",
			mode: parser.mode,
			numer,
			denom,
			continued: false,
			hasBarLine,
			barSize,
			leftDelim: null,
			rightDelim: null
		};
	}
});
var htmlBuilder$3 = (grp, options) => {
	var style = options.style;
	var supSubGroup;
	var group;
	if (grp.type === "supsub") {
		supSubGroup = grp.sup ? buildGroup$1(grp.sup, options.havingStyle(style.sup()), options) : buildGroup$1(grp.sub, options.havingStyle(style.sub()), options);
		group = assertNodeType(grp.base, "horizBrace");
	} else group = assertNodeType(grp, "horizBrace");
	var body = buildGroup$1(group.base, options.havingBaseStyle(Style$1.DISPLAY));
	var braceBody = stretchySvg(group, options);
	var vlist;
	if (group.isOver) vlist = makeVList({
		positionType: "firstBaseline",
		children: [
			{
				type: "elem",
				elem: body
			},
			{
				type: "kern",
				size: .1
			},
			{
				type: "elem",
				elem: braceBody,
				wrapperClasses: ["svg-align"]
			}
		]
	});
	else vlist = makeVList({
		positionType: "bottom",
		positionData: body.depth + .1 + braceBody.height,
		children: [
			{
				type: "elem",
				elem: braceBody,
				wrapperClasses: ["svg-align"]
			},
			{
				type: "kern",
				size: .1
			},
			{
				type: "elem",
				elem: body
			}
		]
	});
	if (supSubGroup) {
		var vSpan = makeSpan(["minner", group.isOver ? "mover" : "munder"], [vlist], options);
		if (group.isOver) vlist = makeVList({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: vSpan
				},
				{
					type: "kern",
					size: .2
				},
				{
					type: "elem",
					elem: supSubGroup
				}
			]
		});
		else vlist = makeVList({
			positionType: "bottom",
			positionData: vSpan.depth + .2 + supSubGroup.height + supSubGroup.depth,
			children: [
				{
					type: "elem",
					elem: supSubGroup
				},
				{
					type: "kern",
					size: .2
				},
				{
					type: "elem",
					elem: vSpan
				}
			]
		});
	}
	return makeSpan(["minner", group.isOver ? "mover" : "munder"], [vlist], options);
};
var mathmlBuilder$2 = (group, options) => {
	var accentNode = stretchyMathML(group.label);
	return new MathNode(group.isOver ? "mover" : "munder", [buildGroup(group.base, options), accentNode]);
};
defineFunction({
	type: "horizBrace",
	names: [
		"\\overbrace",
		"\\underbrace",
		"\\overbracket",
		"\\underbracket"
	],
	numArgs: 1,
	handler(_ref, args) {
		var parser = _ref.parser, funcName = _ref.funcName;
		return {
			type: "horizBrace",
			mode: parser.mode,
			label: funcName,
			isOver: funcName.includes("\\over"),
			base: args[0]
		};
	},
	htmlBuilder: htmlBuilder$3,
	mathmlBuilder: mathmlBuilder$2
});
defineFunction({
	type: "href",
	names: ["\\href"],
	numArgs: 2,
	argTypes: ["url", "original"],
	allowedInText: true,
	handler: (_ref, args) => {
		var parser = _ref.parser;
		var body = args[1];
		var href = assertNodeType(args[0], "url").url;
		if (!parser.settings.isTrusted({
			command: "\\href",
			url: href
		})) return parser.formatUnsupportedCmd("\\href");
		return {
			type: "href",
			mode: parser.mode,
			href,
			body: ordargument(body)
		};
	},
	htmlBuilder: (group, options) => {
		var elements = buildExpression$1(group.body, options, false);
		return makeAnchor(group.href, [], elements, options);
	},
	mathmlBuilder: (group, options) => {
		var math = buildExpressionRow(group.body, options);
		if (!(math instanceof MathNode)) math = new MathNode("mrow", [math]);
		math.setAttribute("href", group.href);
		return math;
	}
});
defineFunction({
	type: "href",
	names: ["\\url"],
	numArgs: 1,
	argTypes: ["url"],
	allowedInText: true,
	handler: (_ref2, args) => {
		var parser = _ref2.parser;
		var href = assertNodeType(args[0], "url").url;
		if (!parser.settings.isTrusted({
			command: "\\url",
			url: href
		})) return parser.formatUnsupportedCmd("\\url");
		var chars = [];
		for (var i = 0; i < href.length; i++) {
			var c = href[i];
			if (c === "~") c = "\\textasciitilde";
			chars.push({
				type: "textord",
				mode: "text",
				text: c
			});
		}
		var body = {
			type: "text",
			mode: parser.mode,
			font: "\\texttt",
			body: chars
		};
		return {
			type: "href",
			mode: parser.mode,
			href,
			body: ordargument(body)
		};
	}
});
defineFunction({
	type: "hbox",
	names: ["\\hbox"],
	numArgs: 1,
	argTypes: ["text"],
	allowedInText: true,
	primitive: true,
	handler(_ref, args) {
		return {
			type: "hbox",
			mode: _ref.parser.mode,
			body: ordargument(args[0])
		};
	},
	htmlBuilder(group, options) {
		return makeFragment(buildExpression$1(group.body, options.withFont(""), false));
	},
	mathmlBuilder(group, options) {
		return new MathNode("mrow", buildExpression(group.body, options.withFont("")));
	}
});
defineFunction({
	type: "html",
	names: [
		"\\htmlClass",
		"\\htmlId",
		"\\htmlStyle",
		"\\htmlData"
	],
	numArgs: 2,
	argTypes: ["raw", "original"],
	allowedInText: true,
	handler: (_ref, args) => {
		var parser = _ref.parser, funcName = _ref.funcName;
		_ref.token;
		var value = assertNodeType(args[0], "raw").string;
		var body = args[1];
		if (parser.settings.strict) parser.settings.reportNonstrict("htmlExtension", "HTML extension is disabled on strict mode");
		var trustContext;
		var attributes = {};
		switch (funcName) {
			case "\\htmlClass":
				attributes.class = value;
				trustContext = {
					command: "\\htmlClass",
					class: value
				};
				break;
			case "\\htmlId":
				attributes.id = value;
				trustContext = {
					command: "\\htmlId",
					id: value
				};
				break;
			case "\\htmlStyle":
				attributes.style = value;
				trustContext = {
					command: "\\htmlStyle",
					style: value
				};
				break;
			case "\\htmlData":
				var ESCAPED_COMMA = "{,}";
				var data = [];
				var current = "";
				for (var i = 0; i < value.length; i++) if (value.startsWith(ESCAPED_COMMA, i)) {
					current += ",";
					i += ESCAPED_COMMA.length - 1;
				} else if (value[i] === ",") {
					data.push(current);
					current = "";
				} else current += value[i];
				data.push(current);
				for (var _i = 0; _i < data.length; _i++) {
					var item = data[_i];
					var firstEquals = item.indexOf("=");
					if (firstEquals < 0) throw new ParseError("\\htmlData key/value '" + item + "' missing equals sign");
					var key = item.slice(0, firstEquals);
					var _value = item.slice(firstEquals + 1);
					attributes["data-" + key.trim()] = _value;
				}
				trustContext = {
					command: "\\htmlData",
					attributes
				};
				break;
			default: throw new Error("Unrecognized html command");
		}
		if (!parser.settings.isTrusted(trustContext)) return parser.formatUnsupportedCmd(funcName);
		return {
			type: "html",
			mode: parser.mode,
			attributes,
			body: ordargument(body)
		};
	},
	htmlBuilder: (group, options) => {
		var elements = buildExpression$1(group.body, options, false);
		var classes = ["enclosing"];
		if (group.attributes.class) classes.push(...group.attributes.class.trim().split(/\s+/));
		var span = makeSpan(classes, elements, options);
		for (var _ref3 of Object.entries(group.attributes)) {
			var attr = _ref3[0];
			var value = _ref3[1];
			if (attr !== "class") span.setAttribute(attr, value);
		}
		return span;
	},
	mathmlBuilder: (group, options) => {
		return buildExpressionRow(group.body, options);
	}
});
defineFunction({
	type: "htmlmathml",
	names: ["\\html@mathml"],
	numArgs: 2,
	allowedInArgument: true,
	allowedInText: true,
	handler: (_ref, args) => {
		return {
			type: "htmlmathml",
			mode: _ref.parser.mode,
			html: ordargument(args[0]),
			mathml: ordargument(args[1])
		};
	},
	htmlBuilder: (group, options) => {
		return makeFragment(buildExpression$1(group.html, options, false));
	},
	mathmlBuilder: (group, options) => {
		return buildExpressionRow(group.mathml, options);
	}
});
var sizeData = function sizeData(str) {
	if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(str)) return {
		number: +str,
		unit: "bp"
	};
	else {
		var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(str);
		if (!match) throw new ParseError("Invalid size: '" + str + "' in \\includegraphics");
		var data = {
			number: +(match[1] + match[2]),
			unit: match[3]
		};
		if (!validUnit(data)) throw new ParseError("Invalid unit: '" + data.unit + "' in \\includegraphics.");
		return data;
	}
};
defineFunction({
	type: "includegraphics",
	names: ["\\includegraphics"],
	numArgs: 1,
	numOptionalArgs: 1,
	argTypes: ["raw", "url"],
	allowedInText: false,
	handler: (_ref, args, optArgs) => {
		var parser = _ref.parser;
		var width = {
			number: 0,
			unit: "em"
		};
		var height = {
			number: .9,
			unit: "em"
		};
		var totalheight = {
			number: 0,
			unit: "em"
		};
		var alt = "";
		if (optArgs[0]) {
			var attributes = assertNodeType(optArgs[0], "raw").string.split(",");
			for (var i = 0; i < attributes.length; i++) {
				var keyVal = attributes[i].split("=");
				if (keyVal.length === 2) {
					var str = keyVal[1].trim();
					switch (keyVal[0].trim()) {
						case "alt":
							alt = str;
							break;
						case "width":
							width = sizeData(str);
							break;
						case "height":
							height = sizeData(str);
							break;
						case "totalheight":
							totalheight = sizeData(str);
							break;
						default: throw new ParseError("Invalid key: '" + keyVal[0] + "' in \\includegraphics.");
					}
				}
			}
		}
		var src = assertNodeType(args[0], "url").url;
		if (alt === "") {
			alt = src;
			alt = alt.replace(/^.*[\\/]/, "");
			alt = alt.substring(0, alt.lastIndexOf("."));
		}
		if (!parser.settings.isTrusted({
			command: "\\includegraphics",
			url: src
		})) return parser.formatUnsupportedCmd("\\includegraphics");
		return {
			type: "includegraphics",
			mode: parser.mode,
			alt,
			width,
			height,
			totalheight,
			src
		};
	},
	htmlBuilder: (group, options) => {
		var height = calculateSize(group.height, options);
		var depth = 0;
		if (group.totalheight.number > 0) depth = calculateSize(group.totalheight, options) - height;
		var width = 0;
		if (group.width.number > 0) width = calculateSize(group.width, options);
		var style = { height: makeEm(height + depth) };
		if (width > 0) style.width = makeEm(width);
		if (depth > 0) style.verticalAlign = makeEm(-depth);
		var node = new Img(group.src, group.alt, style);
		node.height = height;
		node.depth = depth;
		return node;
	},
	mathmlBuilder: (group, options) => {
		var node = new MathNode("mglyph", []);
		node.setAttribute("alt", group.alt);
		var height = calculateSize(group.height, options);
		var depth = 0;
		if (group.totalheight.number > 0) {
			depth = calculateSize(group.totalheight, options) - height;
			node.setAttribute("valign", makeEm(-depth));
		}
		node.setAttribute("height", makeEm(height + depth));
		if (group.width.number > 0) {
			var width = calculateSize(group.width, options);
			node.setAttribute("width", makeEm(width));
		}
		node.setAttribute("src", group.src);
		return node;
	}
});
defineFunction({
	type: "kern",
	names: [
		"\\kern",
		"\\mkern",
		"\\hskip",
		"\\mskip"
	],
	numArgs: 1,
	argTypes: ["size"],
	primitive: true,
	allowedInText: true,
	handler(_ref, args) {
		var parser = _ref.parser, funcName = _ref.funcName;
		var size = assertNodeType(args[0], "size");
		if (parser.settings.strict) {
			var mathFunction = funcName[1] === "m";
			var muUnit = size.value.unit === "mu";
			if (mathFunction) {
				if (!muUnit) parser.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + funcName + " supports only mu units, " + ("not " + size.value.unit + " units"));
				if (parser.mode !== "math") parser.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + funcName + " works only in math mode");
			} else if (muUnit) parser.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + funcName + " doesn't support mu units");
		}
		return {
			type: "kern",
			mode: parser.mode,
			dimension: size.value
		};
	},
	htmlBuilder(group, options) {
		return makeGlue(group.dimension, options);
	},
	mathmlBuilder(group, options) {
		return new SpaceNode(calculateSize(group.dimension, options));
	}
});
defineFunction({
	type: "lap",
	names: [
		"\\mathllap",
		"\\mathrlap",
		"\\mathclap"
	],
	numArgs: 1,
	allowedInText: true,
	handler: (_ref, args) => {
		var parser = _ref.parser, funcName = _ref.funcName;
		var body = args[0];
		return {
			type: "lap",
			mode: parser.mode,
			alignment: funcName.slice(5),
			body
		};
	},
	htmlBuilder: (group, options) => {
		var inner;
		if (group.alignment === "clap") {
			inner = makeSpan([], [buildGroup$1(group.body, options)]);
			inner = makeSpan(["katex-inner"], [inner], options);
		} else inner = makeSpan(["katex-inner"], [buildGroup$1(group.body, options)]);
		var fix = makeSpan(["katex-fix"], []);
		var node = makeSpan([group.alignment], [inner, fix], options);
		var strut = makeSpan(["katex-strut"]);
		strut.style.height = makeEm(node.height + node.depth);
		if (node.depth) strut.style.verticalAlign = makeEm(-node.depth);
		node.children.unshift(strut);
		node = makeSpan(["katex-thinbox"], [node], options);
		return makeSpan(["mord", "katex-vbox"], [node], options);
	},
	mathmlBuilder: (group, options) => {
		var node = new MathNode("mpadded", [buildGroup(group.body, options)]);
		if (group.alignment !== "rlap") {
			var offset = group.alignment === "llap" ? "-1" : "-0.5";
			node.setAttribute("lspace", offset + "width");
		}
		node.setAttribute("width", "0px");
		return node;
	}
});
defineFunction({
	type: "styling",
	names: ["\\(", "$"],
	numArgs: 0,
	allowedInText: true,
	allowedInMath: false,
	handler(_ref, args) {
		var funcName = _ref.funcName, parser = _ref.parser;
		var outerMode = parser.mode;
		parser.switchMode("math");
		var close = funcName === "\\(" ? "\\)" : "$";
		var body = parser.parseExpression(false, close);
		parser.expect(close);
		parser.switchMode(outerMode);
		return {
			type: "styling",
			mode: parser.mode,
			style: "text",
			resetFont: true,
			body
		};
	}
});
defineFunction({
	type: "text",
	names: ["\\)", "\\]"],
	numArgs: 0,
	allowedInText: true,
	allowedInMath: false,
	handler(context, args) {
		throw new ParseError("Mismatched " + context.funcName);
	}
});
var chooseMathStyle = (group, options) => {
	switch (options.style.size) {
		case Style$1.DISPLAY.size: return group.display;
		case Style$1.TEXT.size: return group.text;
		case Style$1.SCRIPT.size: return group.script;
		case Style$1.SCRIPTSCRIPT.size: return group.scriptscript;
		default: return group.text;
	}
};
defineFunction({
	type: "mathchoice",
	names: ["\\mathchoice"],
	numArgs: 4,
	primitive: true,
	handler: (_ref, args) => {
		return {
			type: "mathchoice",
			mode: _ref.parser.mode,
			display: ordargument(args[0]),
			text: ordargument(args[1]),
			script: ordargument(args[2]),
			scriptscript: ordargument(args[3])
		};
	},
	htmlBuilder: (group, options) => {
		return makeFragment(buildExpression$1(chooseMathStyle(group, options), options, false));
	},
	mathmlBuilder: (group, options) => {
		return buildExpressionRow(chooseMathStyle(group, options), options);
	}
});
var assembleSupSub = (base, supGroup, subGroup, options, style, slant, baseShift) => {
	base = makeSpan([], [base]);
	var subIsSingleCharacter = subGroup && isCharacterBox(subGroup);
	var sub;
	var sup;
	if (supGroup) {
		var elem = buildGroup$1(supGroup, options.havingStyle(style.sup()), options);
		sup = {
			elem,
			kern: Math.max(options.fontMetrics().bigOpSpacing1, options.fontMetrics().bigOpSpacing3 - elem.depth)
		};
	}
	if (subGroup) {
		var _elem = buildGroup$1(subGroup, options.havingStyle(style.sub()), options);
		sub = {
			elem: _elem,
			kern: Math.max(options.fontMetrics().bigOpSpacing2, options.fontMetrics().bigOpSpacing4 - _elem.height)
		};
	}
	var finalGroup;
	if (sup && sub) finalGroup = makeVList({
		positionType: "bottom",
		positionData: options.fontMetrics().bigOpSpacing5 + sub.elem.height + sub.elem.depth + sub.kern + base.depth + baseShift,
		children: [
			{
				type: "kern",
				size: options.fontMetrics().bigOpSpacing5
			},
			{
				type: "elem",
				elem: sub.elem,
				marginLeft: makeEm(-slant)
			},
			{
				type: "kern",
				size: sub.kern
			},
			{
				type: "elem",
				elem: base
			},
			{
				type: "kern",
				size: sup.kern
			},
			{
				type: "elem",
				elem: sup.elem,
				marginLeft: makeEm(slant)
			},
			{
				type: "kern",
				size: options.fontMetrics().bigOpSpacing5
			}
		]
	});
	else if (sub) finalGroup = makeVList({
		positionType: "top",
		positionData: base.height - baseShift,
		children: [
			{
				type: "kern",
				size: options.fontMetrics().bigOpSpacing5
			},
			{
				type: "elem",
				elem: sub.elem,
				marginLeft: makeEm(-slant)
			},
			{
				type: "kern",
				size: sub.kern
			},
			{
				type: "elem",
				elem: base
			}
		]
	});
	else if (sup) finalGroup = makeVList({
		positionType: "bottom",
		positionData: base.depth + baseShift,
		children: [
			{
				type: "elem",
				elem: base
			},
			{
				type: "kern",
				size: sup.kern
			},
			{
				type: "elem",
				elem: sup.elem,
				marginLeft: makeEm(slant)
			},
			{
				type: "kern",
				size: options.fontMetrics().bigOpSpacing5
			}
		]
	});
	else return base;
	var parts = [finalGroup];
	if (sub && slant !== 0 && !subIsSingleCharacter) {
		var spacer = makeSpan(["mspace"], [], options);
		spacer.style.marginRight = makeEm(slant);
		parts.unshift(spacer);
	}
	return makeSpan(["mop", "op-limits"], parts, options);
};
var noSuccessor = /* @__PURE__ */ new Set(["\\smallint"]);
var htmlBuilder$2 = (grp, options) => {
	var supGroup;
	var subGroup;
	var hasLimits = false;
	var group;
	if (grp.type === "supsub") {
		supGroup = grp.sup;
		subGroup = grp.sub;
		group = assertNodeType(grp.base, "op");
		hasLimits = true;
	} else group = assertNodeType(grp, "op");
	var style = options.style;
	var large = false;
	if (style.size === Style$1.DISPLAY.size && group.symbol && !noSuccessor.has(group.name)) large = true;
	var base;
	var symbolItalic;
	if (group.symbol) {
		var fontName = large ? "Size2-Regular" : "Size1-Regular";
		var stash = "";
		if (group.name === "\\oiint" || group.name === "\\oiiint") {
			stash = group.name.slice(1);
			group.name = stash === "oiint" ? "\\iint" : "\\iiint";
		}
		base = makeSymbol(group.name, fontName, "math", options, [
			"mop",
			"op-symbol",
			large ? "large-op" : "small-op"
		]);
		symbolItalic = base.italic;
		if (stash.length > 0) {
			var oval = staticSvg(stash + "Size" + (large ? "2" : "1"), options);
			base = makeVList({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: base,
					shift: 0
				}, {
					type: "elem",
					elem: oval,
					shift: large ? .08 : 0
				}]
			});
			group.name = "\\" + stash;
			base.classes.unshift("mop");
			base.italic = symbolItalic;
		}
	} else if (group.body) {
		var inner = buildExpression$1(group.body, options, true);
		if (inner.length === 1 && inner[0] instanceof SymbolNode) {
			base = inner[0];
			base.classes[0] = "mop";
		} else base = makeSpan(["mop"], inner, options);
	} else {
		var output = [];
		for (var i = 1; i < group.name.length; i++) output.push(mathsym(group.name[i], group.mode, options));
		base = makeSpan(["mop"], output, options);
	}
	var baseShift = 0;
	var slant = 0;
	if ((base instanceof SymbolNode || group.name === "\\oiint" || group.name === "\\oiiint") && !group.suppressBaseShift) {
		var _base$italic;
		baseShift = (base.height - base.depth) / 2 - options.fontMetrics().axisHeight;
		slant = (_base$italic = base.italic) != null ? _base$italic : 0;
	}
	if (hasLimits) return assembleSupSub(base, supGroup, subGroup, options, style, slant, baseShift);
	else {
		if (baseShift) {
			base.style.position = "relative";
			base.style.top = makeEm(baseShift);
		}
		return base;
	}
};
var mathmlBuilder$1 = (group, options) => {
	var node;
	if (group.symbol) {
		node = new MathNode("mo", [makeText(group.name, group.mode)]);
		if (noSuccessor.has(group.name)) node.setAttribute("largeop", "false");
	} else if (group.body) node = new MathNode("mo", buildExpression(group.body, options));
	else {
		node = new MathNode("mi", [new TextNode(group.name.slice(1))]);
		var operator = new MathNode("mo", [makeText("⁡", "text")]);
		if (group.parentIsSupSub) node = new MathNode("mrow", [node, operator]);
		else node = newDocumentFragment([node, operator]);
	}
	return node;
};
var singleCharBigOps = {
	"∏": "\\prod",
	"∐": "\\coprod",
	"∑": "\\sum",
	"⋀": "\\bigwedge",
	"⋁": "\\bigvee",
	"⋂": "\\bigcap",
	"⋃": "\\bigcup",
	"⨀": "\\bigodot",
	"⨁": "\\bigoplus",
	"⨂": "\\bigotimes",
	"⨄": "\\biguplus",
	"⨆": "\\bigsqcup"
};
defineFunction({
	type: "op",
	names: [
		"\\coprod",
		"\\bigvee",
		"\\bigwedge",
		"\\biguplus",
		"\\bigcap",
		"\\bigcup",
		"\\intop",
		"\\prod",
		"\\sum",
		"\\bigotimes",
		"\\bigoplus",
		"\\bigodot",
		"\\bigsqcup",
		"\\smallint",
		"∏",
		"∐",
		"∑",
		"⋀",
		"⋁",
		"⋂",
		"⋃",
		"⨀",
		"⨁",
		"⨂",
		"⨄",
		"⨆"
	],
	numArgs: 0,
	handler: (_ref, args) => {
		var parser = _ref.parser;
		var fName = _ref.funcName;
		if (fName.length === 1) fName = singleCharBigOps[fName];
		return {
			type: "op",
			mode: parser.mode,
			limits: true,
			parentIsSupSub: false,
			symbol: true,
			name: fName
		};
	},
	htmlBuilder: htmlBuilder$2,
	mathmlBuilder: mathmlBuilder$1
});
defineFunction({
	type: "op",
	names: ["\\mathop"],
	numArgs: 1,
	primitive: true,
	handler: (_ref2, args) => {
		var parser = _ref2.parser;
		var body = args[0];
		return {
			type: "op",
			mode: parser.mode,
			limits: false,
			parentIsSupSub: false,
			symbol: false,
			body: ordargument(body)
		};
	}
});
var singleCharIntegrals = {
	"∫": "\\int",
	"∬": "\\iint",
	"∭": "\\iiint",
	"∮": "\\oint",
	"∯": "\\oiint",
	"∰": "\\oiiint"
};
defineFunction({
	type: "op",
	names: [
		"\\arcsin",
		"\\arccos",
		"\\arctan",
		"\\arctg",
		"\\arcctg",
		"\\arg",
		"\\ch",
		"\\cos",
		"\\cosec",
		"\\cosh",
		"\\cot",
		"\\cotg",
		"\\coth",
		"\\csc",
		"\\ctg",
		"\\cth",
		"\\deg",
		"\\dim",
		"\\exp",
		"\\hom",
		"\\ker",
		"\\lg",
		"\\ln",
		"\\log",
		"\\sec",
		"\\sin",
		"\\sinh",
		"\\sh",
		"\\tan",
		"\\tanh",
		"\\tg",
		"\\th"
	],
	numArgs: 0,
	handler(_ref3) {
		var parser = _ref3.parser, funcName = _ref3.funcName;
		return {
			type: "op",
			mode: parser.mode,
			limits: false,
			parentIsSupSub: false,
			symbol: false,
			name: funcName
		};
	}
});
defineFunction({
	type: "op",
	names: [
		"\\det",
		"\\gcd",
		"\\inf",
		"\\lim",
		"\\max",
		"\\min",
		"\\Pr",
		"\\sup"
	],
	numArgs: 0,
	handler(_ref4) {
		var parser = _ref4.parser, funcName = _ref4.funcName;
		return {
			type: "op",
			mode: parser.mode,
			limits: true,
			parentIsSupSub: false,
			symbol: false,
			name: funcName
		};
	}
});
defineFunction({
	type: "op",
	names: [
		"\\int",
		"\\iint",
		"\\iiint",
		"\\oint",
		"\\oiint",
		"\\oiiint",
		"∫",
		"∬",
		"∭",
		"∮",
		"∯",
		"∰"
	],
	numArgs: 0,
	allowedInArgument: true,
	handler(_ref5) {
		var parser = _ref5.parser;
		var fName = _ref5.funcName;
		if (fName.length === 1) fName = singleCharIntegrals[fName];
		return {
			type: "op",
			mode: parser.mode,
			limits: false,
			parentIsSupSub: false,
			symbol: true,
			name: fName
		};
	}
});
var htmlBuilder$1 = (grp, options) => {
	var supGroup;
	var subGroup;
	var hasLimits = false;
	var group;
	if (grp.type === "supsub") {
		supGroup = grp.sup;
		subGroup = grp.sub;
		group = assertNodeType(grp.base, "operatorname");
		hasLimits = true;
	} else group = assertNodeType(grp, "operatorname");
	var base;
	if (group.body.length > 0) {
		var expression = buildExpression$1(group.body.map((child) => {
			var childText = "text" in child ? child.text : void 0;
			if (typeof childText === "string") return {
				type: "textord",
				mode: child.mode,
				text: childText
			};
			else return child;
		}), options.withFont("mathrm"), true);
		for (var i = 0; i < expression.length; i++) {
			var child = expression[i];
			if (child instanceof SymbolNode) child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
		}
		base = makeSpan(["mop"], expression, options);
	} else base = makeSpan(["mop"], [], options);
	if (hasLimits) return assembleSupSub(base, supGroup, subGroup, options, options.style, 0, 0);
	else return base;
};
var mathmlBuilder = (group, options) => {
	var expression = buildExpression(group.body, options.withFont("mathrm"));
	var isAllString = true;
	for (var i = 0; i < expression.length; i++) {
		var node = expression[i];
		if (node instanceof SpaceNode);
		else if (node instanceof MathNode) switch (node.type) {
			case "mi":
			case "mn":
			case "mspace":
			case "mtext": break;
			case "mo":
				var child = node.children[0];
				if (node.children.length === 1 && child instanceof TextNode) child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
				else isAllString = false;
				break;
			default: isAllString = false;
		}
		else isAllString = false;
	}
	if (isAllString) expression = [new TextNode(expression.map((node) => node.toText()).join(""))];
	var identifier = new MathNode("mi", expression);
	identifier.setAttribute("mathvariant", "normal");
	var operator = new MathNode("mo", [makeText("⁡", "text")]);
	if (group.parentIsSupSub) return new MathNode("mrow", [identifier, operator]);
	else return newDocumentFragment([identifier, operator]);
};
defineFunction({
	type: "operatorname",
	names: ["\\operatorname@", "\\operatornamewithlimits"],
	numArgs: 1,
	handler: (_ref, args) => {
		var parser = _ref.parser, funcName = _ref.funcName;
		var body = args[0];
		return {
			type: "operatorname",
			mode: parser.mode,
			body: ordargument(body),
			alwaysHandleSupSub: funcName === "\\operatornamewithlimits",
			limits: false,
			parentIsSupSub: false
		};
	},
	htmlBuilder: htmlBuilder$1,
	mathmlBuilder
});
defineMacro("\\operatorname", "\\@ifstar\\operatornamewithlimits\\operatorname@");
defineFunctionBuilders({
	type: "ordgroup",
	htmlBuilder(group, options) {
		if (group.semisimple) return makeFragment(buildExpression$1(group.body, options, false));
		return makeSpan(["mord"], buildExpression$1(group.body, options, true), options);
	},
	mathmlBuilder(group, options) {
		return buildExpressionRow(group.body, options, true);
	}
});
defineFunction({
	type: "overline",
	names: ["\\overline"],
	numArgs: 1,
	handler(_ref, args) {
		var parser = _ref.parser;
		var body = args[0];
		return {
			type: "overline",
			mode: parser.mode,
			body
		};
	},
	htmlBuilder(group, options) {
		var innerGroup = buildGroup$1(group.body, options.havingCrampedStyle());
		var line = makeLineSpan("overline-line", options);
		var defaultRuleThickness = options.fontMetrics().defaultRuleThickness;
		return makeSpan(["mord", "katex-overline"], [makeVList({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: innerGroup
				},
				{
					type: "kern",
					size: 3 * defaultRuleThickness
				},
				{
					type: "elem",
					elem: line
				},
				{
					type: "kern",
					size: defaultRuleThickness
				}
			]
		})], options);
	},
	mathmlBuilder(group, options) {
		var operator = new MathNode("mo", [new TextNode("‾")]);
		operator.setAttribute("stretchy", "true");
		var node = new MathNode("mover", [buildGroup(group.body, options), operator]);
		node.setAttribute("accent", "true");
		return node;
	}
});
defineFunction({
	type: "phantom",
	names: ["\\phantom"],
	numArgs: 1,
	allowedInText: true,
	handler: (_ref, args) => {
		var parser = _ref.parser;
		var body = args[0];
		return {
			type: "phantom",
			mode: parser.mode,
			body: ordargument(body)
		};
	},
	htmlBuilder: (group, options) => {
		return makeFragment(buildExpression$1(group.body, options.withPhantom(), false));
	},
	mathmlBuilder: (group, options) => {
		return new MathNode("mphantom", buildExpression(group.body, options));
	}
});
defineMacro("\\hphantom", "\\smash{\\phantom{#1}}");
defineFunction({
	type: "vphantom",
	names: ["\\vphantom"],
	numArgs: 1,
	allowedInText: true,
	handler: (_ref2, args) => {
		var parser = _ref2.parser;
		var body = args[0];
		return {
			type: "vphantom",
			mode: parser.mode,
			body
		};
	},
	htmlBuilder: (group, options) => {
		return makeSpan(["mord", "rlap"], [makeSpan(["katex-inner"], [buildGroup$1(group.body, options.withPhantom())]), makeSpan(["katex-fix"], [])], options);
	},
	mathmlBuilder: (group, options) => {
		var node = new MathNode("mpadded", [new MathNode("mphantom", buildExpression(ordargument(group.body), options))]);
		node.setAttribute("width", "0px");
		return node;
	}
});
defineFunction({
	type: "raisebox",
	names: ["\\raisebox"],
	numArgs: 2,
	argTypes: ["size", "hbox"],
	allowedInText: true,
	handler(_ref, args) {
		var parser = _ref.parser;
		var amount = assertNodeType(args[0], "size").value;
		var body = args[1];
		return {
			type: "raisebox",
			mode: parser.mode,
			dy: amount,
			body
		};
	},
	htmlBuilder(group, options) {
		var body = buildGroup$1(group.body, options);
		return makeVList({
			positionType: "shift",
			positionData: -calculateSize(group.dy, options),
			children: [{
				type: "elem",
				elem: body
			}]
		});
	},
	mathmlBuilder(group, options) {
		var node = new MathNode("mpadded", [buildGroup(group.body, options)]);
		var dy = group.dy.number + group.dy.unit;
		node.setAttribute("voffset", dy);
		return node;
	}
});
defineFunction({
	type: "internal",
	names: ["\\relax"],
	numArgs: 0,
	allowedInText: true,
	allowedInArgument: true,
	handler(_ref) {
		return {
			type: "internal",
			mode: _ref.parser.mode
		};
	}
});
defineFunction({
	type: "rule",
	names: ["\\rule"],
	numArgs: 2,
	numOptionalArgs: 1,
	allowedInText: true,
	allowedInMath: true,
	argTypes: [
		"size",
		"size",
		"size"
	],
	handler(_ref, args, optArgs) {
		var parser = _ref.parser;
		var shift = optArgs[0];
		var width = assertNodeType(args[0], "size");
		var height = assertNodeType(args[1], "size");
		return {
			type: "rule",
			mode: parser.mode,
			shift: shift && assertNodeType(shift, "size").value,
			width: width.value,
			height: height.value
		};
	},
	htmlBuilder(group, options) {
		var rule = makeSpan(["mord", "katex-rule"], [], options);
		var width = calculateSize(group.width, options);
		var height = calculateSize(group.height, options);
		var shift = group.shift ? calculateSize(group.shift, options) : 0;
		rule.style.borderRightWidth = makeEm(width);
		rule.style.borderTopWidth = makeEm(height);
		rule.style.bottom = makeEm(shift);
		rule.width = width;
		rule.height = height + shift;
		rule.depth = -shift;
		rule.maxFontSize = height * 1.125 * options.sizeMultiplier;
		return rule;
	},
	mathmlBuilder(group, options) {
		var width = calculateSize(group.width, options);
		var height = calculateSize(group.height, options);
		var shift = group.shift ? calculateSize(group.shift, options) : 0;
		var color = options.color && options.getColor() || "black";
		var rule = new MathNode("mspace");
		rule.setAttribute("mathbackground", color);
		rule.setAttribute("width", makeEm(width));
		rule.setAttribute("height", makeEm(height));
		var wrapper = new MathNode("mpadded", [rule]);
		if (shift >= 0) wrapper.setAttribute("height", makeEm(shift));
		else {
			wrapper.setAttribute("height", makeEm(shift));
			wrapper.setAttribute("depth", makeEm(-shift));
		}
		wrapper.setAttribute("voffset", makeEm(shift));
		return wrapper;
	}
});
function sizingGroup(value, options, baseOptions) {
	var inner = buildExpression$1(value, options, false);
	var multiplier = options.sizeMultiplier / baseOptions.sizeMultiplier;
	for (var i = 0; i < inner.length; i++) {
		var pos = inner[i].classes.indexOf("katex-sizing");
		if (pos < 0) Array.prototype.push.apply(inner[i].classes, options.sizingClasses(baseOptions));
		else if (inner[i].classes[pos + 1] === "reset-size" + options.size) inner[i].classes[pos + 1] = "reset-size" + baseOptions.size;
		inner[i].height *= multiplier;
		inner[i].depth *= multiplier;
	}
	return makeFragment(inner);
}
var sizeFuncs = [
	"\\tiny",
	"\\sixptsize",
	"\\scriptsize",
	"\\footnotesize",
	"\\small",
	"\\normalsize",
	"\\large",
	"\\Large",
	"\\LARGE",
	"\\huge",
	"\\Huge"
];
var htmlBuilder = (group, options) => {
	var newOptions = options.havingSize(group.size);
	return sizingGroup(group.body, newOptions, options);
};
defineFunction({
	type: "sizing",
	names: sizeFuncs,
	numArgs: 0,
	allowedInText: true,
	handler: (_ref, args) => {
		var breakOnTokenText = _ref.breakOnTokenText, funcName = _ref.funcName, parser = _ref.parser;
		var body = parser.parseExpression(false, breakOnTokenText);
		return {
			type: "sizing",
			mode: parser.mode,
			size: sizeFuncs.indexOf(funcName) + 1,
			body
		};
	},
	htmlBuilder,
	mathmlBuilder: (group, options) => {
		var newOptions = options.havingSize(group.size);
		var node = new MathNode("mstyle", buildExpression(group.body, newOptions));
		node.setAttribute("mathsize", makeEm(newOptions.sizeMultiplier));
		return node;
	}
});
defineFunction({
	type: "smash",
	names: ["\\smash"],
	numArgs: 1,
	numOptionalArgs: 1,
	allowedInText: true,
	handler: (_ref, args, optArgs) => {
		var parser = _ref.parser;
		var smashHeight = false;
		var smashDepth = false;
		var tbArg = optArgs[0] && assertNodeType(optArgs[0], "ordgroup");
		if (tbArg) {
			var letter;
			for (var i = 0; i < tbArg.body.length; ++i) {
				var node = tbArg.body[i];
				letter = assertSymbolNodeType(node).text;
				if (letter === "t") smashHeight = true;
				else if (letter === "b") smashDepth = true;
				else {
					smashHeight = false;
					smashDepth = false;
					break;
				}
			}
		} else {
			smashHeight = true;
			smashDepth = true;
		}
		var body = args[0];
		return {
			type: "smash",
			mode: parser.mode,
			body,
			smashHeight,
			smashDepth
		};
	},
	htmlBuilder: (group, options) => {
		var node = makeSpan([], [buildGroup$1(group.body, options)]);
		if (!group.smashHeight && !group.smashDepth) return node;
		if (group.smashHeight) node.height = 0;
		if (group.smashDepth) node.depth = 0;
		if (group.smashHeight && group.smashDepth) return makeSpan(["mord", "katex-smash"], [node], options);
		if (node.children) for (var i = 0; i < node.children.length; i++) {
			if (group.smashHeight) node.children[i].height = 0;
			if (group.smashDepth) node.children[i].depth = 0;
		}
		return makeSpan(["mord"], [makeVList({
			positionType: "firstBaseline",
			children: [{
				type: "elem",
				elem: node
			}]
		})], options);
	},
	mathmlBuilder: (group, options) => {
		var node = new MathNode("mpadded", [buildGroup(group.body, options)]);
		if (group.smashHeight) node.setAttribute("height", "0px");
		if (group.smashDepth) node.setAttribute("depth", "0px");
		return node;
	}
});
defineFunction({
	type: "sqrt",
	names: ["\\sqrt"],
	numArgs: 1,
	numOptionalArgs: 1,
	handler(_ref, args, optArgs) {
		var parser = _ref.parser;
		var index = optArgs[0];
		var body = args[0];
		return {
			type: "sqrt",
			mode: parser.mode,
			body,
			index
		};
	},
	htmlBuilder(group, options) {
		var inner = buildGroup$1(group.body, options.havingCrampedStyle());
		if (inner.height === 0) inner.height = options.fontMetrics().xHeight;
		inner = wrapFragment(inner, options);
		var theta = options.fontMetrics().defaultRuleThickness;
		var phi = theta;
		if (options.style.id < Style$1.TEXT.id) phi = options.fontMetrics().xHeight;
		var lineClearance = theta + phi / 4;
		var _makeSqrtImage = makeSqrtImage(inner.height + inner.depth + lineClearance + theta, options), img = _makeSqrtImage.span, ruleWidth = _makeSqrtImage.ruleWidth, advanceWidth = _makeSqrtImage.advanceWidth;
		var delimDepth = img.height - ruleWidth;
		if (delimDepth > inner.height + inner.depth + lineClearance) lineClearance = (lineClearance + delimDepth - inner.height - inner.depth) / 2;
		var imgShift = img.height - inner.height - lineClearance - ruleWidth;
		inner.style.paddingLeft = makeEm(advanceWidth);
		var body = makeVList({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: inner,
					wrapperClasses: ["svg-align"]
				},
				{
					type: "kern",
					size: -(inner.height + imgShift)
				},
				{
					type: "elem",
					elem: img
				},
				{
					type: "kern",
					size: ruleWidth
				}
			]
		});
		if (!group.index) return makeSpan(["mord", "sqrt"], [body], options);
		else {
			var newOptions = options.havingStyle(Style$1.SCRIPTSCRIPT);
			var rootm = buildGroup$1(group.index, newOptions, options);
			return makeSpan(["mord", "sqrt"], [makeSpan(["katex-root"], [makeVList({
				positionType: "shift",
				positionData: -(.6 * (body.height - body.depth)),
				children: [{
					type: "elem",
					elem: rootm
				}]
			})]), body], options);
		}
	},
	mathmlBuilder(group, options) {
		var body = group.body, index = group.index;
		return index ? new MathNode("mroot", [buildGroup(body, options), buildGroup(index, options)]) : new MathNode("msqrt", [buildGroup(body, options)]);
	}
});
var styleMap = {
	"display": Style$1.DISPLAY,
	"text": Style$1.TEXT,
	"script": Style$1.SCRIPT,
	"scriptscript": Style$1.SCRIPTSCRIPT
};
function isStyleStr(s) {
	return s in styleMap;
}
defineFunction({
	type: "styling",
	names: [
		"\\displaystyle",
		"\\textstyle",
		"\\scriptstyle",
		"\\scriptscriptstyle"
	],
	numArgs: 0,
	allowedInText: true,
	primitive: true,
	handler(_ref, args) {
		var breakOnTokenText = _ref.breakOnTokenText, funcName = _ref.funcName, parser = _ref.parser;
		var body = parser.parseExpression(true, breakOnTokenText);
		var style = funcName.slice(1, funcName.length - 5);
		if (!isStyleStr(style)) throw new Error("Unknown style: " + style);
		return {
			type: "styling",
			mode: parser.mode,
			style,
			body
		};
	},
	htmlBuilder(group, options) {
		var newStyle = styleMap[group.style];
		var newOptions = options.havingStyle(newStyle);
		if (group.resetFont) newOptions = newOptions.withFont("");
		return sizingGroup(group.body, newOptions, options);
	},
	mathmlBuilder(group, options) {
		var newStyle = styleMap[group.style];
		var newOptions = options.havingStyle(newStyle);
		if (group.resetFont) newOptions = newOptions.withFont("");
		var node = new MathNode("mstyle", buildExpression(group.body, newOptions));
		var attr = {
			"display": ["0", "true"],
			"text": ["0", "false"],
			"script": ["1", "false"],
			"scriptscript": ["2", "false"]
		}[group.style];
		node.setAttribute("scriptlevel", attr[0]);
		node.setAttribute("displaystyle", attr[1]);
		return node;
	}
});
/**
* Sometimes, groups perform special rules when they have superscripts or
* subscripts attached to them. This function lets the `supsub` group know that
* Sometimes, groups perform special rules when they have superscripts or
* its inner element should handle the superscripts and subscripts instead of
* handling them itself.
*/
var htmlBuilderDelegate = function htmlBuilderDelegate(group, options) {
	var base = group.base;
	if (!base) return null;
	else if (base.type === "op") return base.limits && (options.style.size === Style$1.DISPLAY.size || base.alwaysHandleSupSub) ? htmlBuilder$2 : null;
	else if (base.type === "operatorname") return base.alwaysHandleSupSub && (options.style.size === Style$1.DISPLAY.size || base.limits) ? htmlBuilder$1 : null;
	else if (base.type === "accent") return isCharacterBox(base.base) ? htmlBuilder$a : null;
	else if (base.type === "horizBrace") return !group.sub === base.isOver ? htmlBuilder$3 : null;
	else return null;
};
defineFunctionBuilders({
	type: "supsub",
	htmlBuilder(group, options) {
		var builderDelegate = htmlBuilderDelegate(group, options);
		if (builderDelegate) return builderDelegate(group, options);
		var valueBase = group.base, valueSup = group.sup, valueSub = group.sub;
		var base = buildGroup$1(valueBase, options);
		var supm;
		var subm;
		var metrics = options.fontMetrics();
		var supShift = 0;
		var subShift = 0;
		var isCharBox = valueBase && isCharacterBox(valueBase);
		if (valueSup) {
			var newOptions = options.havingStyle(options.style.sup());
			supm = buildGroup$1(valueSup, newOptions, options);
			if (!isCharBox) supShift = base.height - newOptions.fontMetrics().supDrop * newOptions.sizeMultiplier / options.sizeMultiplier;
		}
		if (valueSub) {
			var _newOptions = options.havingStyle(options.style.sub());
			subm = buildGroup$1(valueSub, _newOptions, options);
			if (!isCharBox) subShift = base.depth + _newOptions.fontMetrics().subDrop * _newOptions.sizeMultiplier / options.sizeMultiplier;
		}
		var minSupShift;
		if (options.style === Style$1.DISPLAY) minSupShift = metrics.sup1;
		else if (options.style.cramped) minSupShift = metrics.sup3;
		else minSupShift = metrics.sup2;
		var multiplier = options.sizeMultiplier;
		var marginRight = makeEm(.5 / metrics.ptPerEm / multiplier);
		var marginLeft = null;
		if (subm) {
			var isOiint = group.base && group.base.type === "op" && group.base.name && (group.base.name === "\\oiint" || group.base.name === "\\oiiint");
			if (base instanceof SymbolNode || isOiint) {
				var _base$italic;
				marginLeft = makeEm(-((_base$italic = base.italic) != null ? _base$italic : 0));
			}
		}
		var supsub;
		if (supm && subm) {
			supShift = Math.max(supShift, minSupShift, supm.depth + .25 * metrics.xHeight);
			subShift = Math.max(subShift, metrics.sub2);
			var maxWidth = 4 * metrics.defaultRuleThickness;
			if (supShift - supm.depth - (subm.height - subShift) < maxWidth) {
				subShift = maxWidth - (supShift - supm.depth) + subm.height;
				var psi = .8 * metrics.xHeight - (supShift - supm.depth);
				if (psi > 0) {
					supShift += psi;
					subShift -= psi;
				}
			}
			supsub = makeVList({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: subm,
					shift: subShift,
					marginRight,
					marginLeft
				}, {
					type: "elem",
					elem: supm,
					shift: -supShift,
					marginRight
				}]
			});
		} else if (subm) {
			subShift = Math.max(subShift, metrics.sub1, subm.height - .8 * metrics.xHeight);
			supsub = makeVList({
				positionType: "shift",
				positionData: subShift,
				children: [{
					type: "elem",
					elem: subm,
					marginLeft,
					marginRight
				}]
			});
		} else if (supm) {
			supShift = Math.max(supShift, minSupShift, supm.depth + .25 * metrics.xHeight);
			supsub = makeVList({
				positionType: "shift",
				positionData: -supShift,
				children: [{
					type: "elem",
					elem: supm,
					marginRight
				}]
			});
		} else throw new Error("supsub must have either sup or sub.");
		return makeSpan([getTypeOfDomTree(base, "right") || "mord"], [base, makeSpan(["msupsub"], [supsub])], options);
	},
	mathmlBuilder(group, options) {
		var isBrace = false;
		var isOver;
		var isSup;
		if (group.base && group.base.type === "horizBrace") {
			isSup = !!group.sup;
			if (isSup === group.base.isOver) {
				isBrace = true;
				isOver = group.base.isOver;
			}
		}
		if (group.base && (group.base.type === "op" || group.base.type === "operatorname")) group.base.parentIsSupSub = true;
		var children = [buildGroup(group.base, options)];
		if (group.sub) children.push(buildGroup(group.sub, options));
		if (group.sup) children.push(buildGroup(group.sup, options));
		var nodeType;
		if (isBrace) nodeType = isOver ? "mover" : "munder";
		else if (!group.sub) {
			var base = group.base;
			if (base && base.type === "op" && base.limits && (options.style === Style$1.DISPLAY || base.alwaysHandleSupSub)) nodeType = "mover";
			else if (base && base.type === "operatorname" && base.alwaysHandleSupSub && (base.limits || options.style === Style$1.DISPLAY)) nodeType = "mover";
			else nodeType = "msup";
		} else if (!group.sup) {
			var _base = group.base;
			if (_base && _base.type === "op" && _base.limits && (options.style === Style$1.DISPLAY || _base.alwaysHandleSupSub)) nodeType = "munder";
			else if (_base && _base.type === "operatorname" && _base.alwaysHandleSupSub && (_base.limits || options.style === Style$1.DISPLAY)) nodeType = "munder";
			else nodeType = "msub";
		} else {
			var _base2 = group.base;
			if (_base2 && _base2.type === "op" && _base2.limits && options.style === Style$1.DISPLAY) nodeType = "munderover";
			else if (_base2 && _base2.type === "operatorname" && _base2.alwaysHandleSupSub && (options.style === Style$1.DISPLAY || _base2.limits)) nodeType = "munderover";
			else nodeType = "msubsup";
		}
		return new MathNode(nodeType, children);
	}
});
defineFunctionBuilders({
	type: "atom",
	htmlBuilder(group, options) {
		return mathsym(group.text, group.mode, options, ["m" + group.family]);
	},
	mathmlBuilder(group, options) {
		var node = new MathNode("mo", [makeText(group.text, group.mode)]);
		if (group.family === "bin") {
			var variant = getVariant(group, options);
			if (variant === "bold-italic") node.setAttribute("mathvariant", variant);
		} else if (group.family === "punct") node.setAttribute("separator", "true");
		else if (group.family === "open" || group.family === "close") node.setAttribute("stretchy", "false");
		return node;
	}
});
var defaultVariant = {
	"mi": "italic",
	"mn": "normal",
	"mtext": "normal"
};
defineFunctionBuilders({
	type: "mathord",
	htmlBuilder(group, options) {
		return makeOrd(group, options);
	},
	mathmlBuilder(group, options) {
		var node = new MathNode("mi", [makeText(group.text, group.mode, options)]);
		var variant = getVariant(group, options) || "italic";
		if (variant !== defaultVariant[node.type]) node.setAttribute("mathvariant", variant);
		return node;
	}
});
defineFunctionBuilders({
	type: "textord",
	htmlBuilder(group, options) {
		return makeOrd(group, options);
	},
	mathmlBuilder(group, options) {
		var text = makeText(group.text, group.mode, options);
		var variant = getVariant(group, options) || "normal";
		var node;
		if (group.mode === "text") node = new MathNode("mtext", [text]);
		else if (/[0-9]/.test(group.text)) node = new MathNode("mn", [text]);
		else if (group.text === "\\prime") node = new MathNode("mo", [text]);
		else node = new MathNode("mi", [text]);
		if (variant !== defaultVariant[node.type]) node.setAttribute("mathvariant", variant);
		return node;
	}
});
var cssSpace = /* @__PURE__ */ new Map([["\\nobreak", "nobreak"], ["\\allowbreak", "allowbreak"]]);
var regularSpace = /* @__PURE__ */ new Map([
	[" ", {}],
	["\\ ", {}],
	["~", { className: "nobreak" }],
	["\\space", {}],
	["\\nobreakspace", { className: "nobreak" }]
]);
defineFunctionBuilders({
	type: "spacing",
	htmlBuilder(group, options) {
		var regularSpaceItem = regularSpace.get(group.text);
		var cssSpaceClass = cssSpace.get(group.text);
		if (regularSpaceItem) {
			var className = regularSpaceItem.className || "";
			if (group.mode === "text") {
				var ord = makeOrd(group, options);
				ord.classes.push(className);
				return ord;
			} else return makeSpan(["mspace", className], [mathsym(group.text, group.mode, options)], options);
		} else if (cssSpaceClass) return makeSpan(["mspace", cssSpaceClass], [], options);
		else throw new ParseError("Unknown type of space \"" + group.text + "\"");
	},
	mathmlBuilder(group, options) {
		var node;
		if (regularSpace.has(group.text)) node = new MathNode("mtext", [new TextNode("\xA0")]);
		else if (cssSpace.has(group.text)) return new MathNode("mspace");
		else throw new ParseError("Unknown type of space \"" + group.text + "\"");
		return node;
	}
});
var pad = () => {
	var padNode = new MathNode("mtd", []);
	padNode.setAttribute("width", "50%");
	return padNode;
};
defineFunctionBuilders({
	type: "tag",
	mathmlBuilder(group, options) {
		var table = new MathNode("mtable", [new MathNode("mtr", [
			pad(),
			new MathNode("mtd", [buildExpressionRow(group.body, options)]),
			pad(),
			new MathNode("mtd", [buildExpressionRow(group.tag, options)])
		])]);
		table.setAttribute("width", "100%");
		return table;
	}
});
var textFontFamilies = {
	"\\text": void 0,
	"\\textrm": "textrm",
	"\\textsf": "textsf",
	"\\texttt": "texttt",
	"\\textnormal": "textrm"
};
var textFontWeights = {
	"\\textbf": "textbf",
	"\\textmd": "textmd"
};
var textFontShapes = {
	"\\textit": "textit",
	"\\textup": "textup"
};
var optionsWithFont = (group, options) => {
	var font = group.font;
	if (!font) return options;
	else if (textFontFamilies[font]) return options.withTextFontFamily(textFontFamilies[font]);
	else if (textFontWeights[font]) return options.withTextFontWeight(textFontWeights[font]);
	else if (font === "\\emph") return options.fontShape === "textit" ? options.withTextFontShape("textup") : options.withTextFontShape("textit");
	return options.withTextFontShape(textFontShapes[font]);
};
defineFunction({
	type: "text",
	names: [
		"\\text",
		"\\textrm",
		"\\textsf",
		"\\texttt",
		"\\textnormal",
		"\\textbf",
		"\\textmd",
		"\\textit",
		"\\textup",
		"\\emph"
	],
	numArgs: 1,
	argTypes: ["text"],
	allowedInArgument: true,
	allowedInText: true,
	handler(_ref, args) {
		var parser = _ref.parser, funcName = _ref.funcName;
		var body = args[0];
		return {
			type: "text",
			mode: parser.mode,
			body: ordargument(body),
			font: funcName
		};
	},
	htmlBuilder(group, options) {
		var newOptions = optionsWithFont(group, options);
		return makeSpan(["mord", "text"], buildExpression$1(group.body, newOptions, true), newOptions);
	},
	mathmlBuilder(group, options) {
		var newOptions = optionsWithFont(group, options);
		return buildExpressionRow(group.body, newOptions);
	}
});
defineFunction({
	type: "underline",
	names: ["\\underline"],
	numArgs: 1,
	allowedInText: true,
	handler(_ref, args) {
		return {
			type: "underline",
			mode: _ref.parser.mode,
			body: args[0]
		};
	},
	htmlBuilder(group, options) {
		var innerGroup = buildGroup$1(group.body, options);
		var line = makeLineSpan("underline-line", options);
		var defaultRuleThickness = options.fontMetrics().defaultRuleThickness;
		return makeSpan(["mord", "katex-underline"], [makeVList({
			positionType: "top",
			positionData: innerGroup.height,
			children: [
				{
					type: "kern",
					size: defaultRuleThickness
				},
				{
					type: "elem",
					elem: line
				},
				{
					type: "kern",
					size: 3 * defaultRuleThickness
				},
				{
					type: "elem",
					elem: innerGroup
				}
			]
		})], options);
	},
	mathmlBuilder(group, options) {
		var operator = new MathNode("mo", [new TextNode("‾")]);
		operator.setAttribute("stretchy", "true");
		var node = new MathNode("munder", [buildGroup(group.body, options), operator]);
		node.setAttribute("accentunder", "true");
		return node;
	}
});
defineFunction({
	type: "vcenter",
	names: ["\\vcenter"],
	numArgs: 1,
	argTypes: ["original"],
	allowedInText: false,
	handler(_ref, args) {
		return {
			type: "vcenter",
			mode: _ref.parser.mode,
			body: args[0]
		};
	},
	htmlBuilder(group, options) {
		var body = buildGroup$1(group.body, options);
		var axisHeight = options.fontMetrics().axisHeight;
		return makeVList({
			positionType: "shift",
			positionData: .5 * (body.height - axisHeight - (body.depth + axisHeight)),
			children: [{
				type: "elem",
				elem: body
			}]
		});
	},
	mathmlBuilder(group, options) {
		return new MathNode("mrow", [new MathNode("mpadded", [buildGroup(group.body, options)], ["vcenter"])]);
	}
});
defineFunction({
	type: "verb",
	names: ["\\verb"],
	numArgs: 0,
	allowedInText: true,
	handler(context, args, optArgs) {
		throw new ParseError("\\verb ended by end of line instead of matching delimiter");
	},
	htmlBuilder(group, options) {
		var text = makeVerb(group);
		var body = [];
		var newOptions = options.havingStyle(options.style.text());
		for (var i = 0; i < text.length; i++) {
			var c = text[i];
			if (c === "~") c = "\\textasciitilde";
			body.push(makeSymbol(c, "Typewriter-Regular", group.mode, newOptions, ["mord", "texttt"]));
		}
		return makeSpan(["mord", "text"].concat(newOptions.sizingClasses(options)), tryCombineChars(body), newOptions);
	},
	mathmlBuilder(group, options) {
		var node = new MathNode("mtext", [new TextNode(makeVerb(group))]);
		node.setAttribute("mathvariant", "monospace");
		return node;
	}
});
/**
* Converts verb group into body string.
*
* \verb* replaces each space with an open box \u2423
* \verb replaces each space with a no-break space \xA0
*/
var makeVerb = (group) => group.body.replace(/ /g, group.star ? "␣" : "\xA0");
/** Include this to ensure that all functions are defined. */
var functions = _functions;
/**
* The Lexer class handles tokenizing the input in various ways. Since our
* parser expects us to be able to backtrack, the lexer allows lexing from any
* given starting point.
*
* Its main exposed function is the `lex` function, which takes a position to
* lex from and a type of token to lex. It defers to the appropriate `_innerLex`
* function.
*
* The various `_innerLex` functions perform the actual lexing of different
* kinds.
*/
var spaceRegexString = "[ \r\n	]";
var controlWordRegexString = "\\\\[a-zA-Z@]+";
var controlSymbolRegexString = "\\\\[^\ud800-\udfff]";
var controlWordWhitespaceRegexString = "(" + controlWordRegexString + ")" + spaceRegexString + "*";
var controlSpaceRegexString = "\\\\(\n|[ \r	]+\n?)[ \r	]*";
var combiningDiacriticalMarkString = "[̀-ͯ]";
var combiningDiacriticalMarksEndRegex = new RegExp(combiningDiacriticalMarkString + "+$");
var tokenRegexString = "(" + spaceRegexString + "+)|" + (controlSpaceRegexString + "|") + "([!-\\[\\]-‧‪-퟿豈-￿]" + (combiningDiacriticalMarkString + "*") + "|[\ud800-\udbff][\udc00-\udfff]" + (combiningDiacriticalMarkString + "*") + "|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5" + ("|" + controlWordWhitespaceRegexString) + ("|" + controlSymbolRegexString + ")");
/** Main Lexer class */
var Lexer = class {
	constructor(input, settings) {
		this.input = void 0;
		this.settings = void 0;
		this.tokenRegex = void 0;
		this.catcodes = void 0;
		this.input = input;
		this.settings = settings;
		this.tokenRegex = new RegExp(tokenRegexString, "g");
		this.catcodes = {
			"%": 14,
			"~": 13
		};
	}
	setCatcode(char, code) {
		this.catcodes[char] = code;
	}
	/**
	* This function lexes a single token.
	*/
	lex() {
		var input = this.input;
		var pos = this.tokenRegex.lastIndex;
		if (pos === input.length) return new Token("EOF", new SourceLocation(this, pos, pos));
		var match = this.tokenRegex.exec(input);
		if (match === null || match.index !== pos) throw new ParseError("Unexpected character: '" + input[pos] + "'", new Token(input[pos], new SourceLocation(this, pos, pos + 1)));
		var text = match[6] || match[3] || (match[2] ? "\\ " : " ");
		if (this.catcodes[text] === 14) {
			var nlIndex = input.indexOf("\n", this.tokenRegex.lastIndex);
			if (nlIndex === -1) {
				this.tokenRegex.lastIndex = input.length;
				this.settings.reportNonstrict("commentAtEnd", "% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $)");
			} else this.tokenRegex.lastIndex = nlIndex + 1;
			return this.lex();
		}
		return new Token(text, new SourceLocation(this, pos, this.tokenRegex.lastIndex));
	}
};
/**
* A `Namespace` refers to a space of nameable things like macros or lengths,
* which can be `set` either globally or local to a nested group, using an
* undo stack similar to how TeX implements this functionality.
* Performance-wise, `get` and local `set` take constant time, while global
* `set` takes time proportional to the depth of group nesting.
*/
var Namespace = class {
	/**
	* Both arguments are optional.  The first argument is an object of
	* built-in mappings which never change.  The second argument is an object
	* of initial (global-level) mappings, which will constantly change
	* according to any global/top-level `set`s done.
	*/
	constructor(builtins, globalMacros) {
		if (builtins === void 0) builtins = {};
		if (globalMacros === void 0) globalMacros = {};
		this.current = void 0;
		this.builtins = void 0;
		this.undefStack = void 0;
		this.current = globalMacros;
		this.builtins = builtins;
		this.undefStack = [];
	}
	/**
	* Start a new nested group, affecting future local `set`s.
	*/
	beginGroup() {
		this.undefStack.push({});
	}
	/**
	* End current nested group, restoring values before the group began.
	*/
	endGroup() {
		if (this.undefStack.length === 0) throw new ParseError("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");
		var undefs = this.undefStack.pop();
		for (var key of Object.keys(undefs)) if (undefs[key] === void 0) delete this.current[key];
		else this.current[key] = undefs[key];
	}
	/**
	* Ends all currently nested groups (if any), restoring values before the
	* groups began.  Useful in case of an error in the middle of parsing.
	*/
	endGroups() {
		while (this.undefStack.length > 0) this.endGroup();
	}
	/**
	* Detect whether `name` has a definition.  Equivalent to
	* `get(name) != null`.
	*/
	has(name) {
		return Object.prototype.hasOwnProperty.call(this.current, name) || Object.prototype.hasOwnProperty.call(this.builtins, name);
	}
	/**
	* Get the current value of a name, or `undefined` if there is no value.
	*
	* Note: Do not use `if (namespace.get(...))` to detect whether a macro
	* is defined, as the definition may be the empty string which evaluates
	* to `false` in JavaScript.  Use `if (namespace.get(...) != null)` or
	* `if (namespace.has(...))`.
	*/
	get(name) {
		if (Object.prototype.hasOwnProperty.call(this.current, name)) return this.current[name];
		else if (Object.prototype.hasOwnProperty.call(this.builtins, name)) return this.builtins[name];
		else return;
	}
	/**
	* Set the current value of a name, and optionally set it globally too.
	* Local set() sets the current value and (when appropriate) adds an undo
	* operation to the undo stack.  Global set() may change the undo
	* operation at every level, so takes time linear in their number.
	* A value of undefined means to delete existing definitions.
	*/
	set(name, value, global) {
		if (global === void 0) global = false;
		if (global) {
			for (var i = 0; i < this.undefStack.length; i++) delete this.undefStack[i][name];
			if (this.undefStack.length > 0) this.undefStack[this.undefStack.length - 1][name] = value;
		} else {
			var top = this.undefStack[this.undefStack.length - 1];
			if (top && !Object.prototype.hasOwnProperty.call(top, name)) top[name] = Object.prototype.hasOwnProperty.call(this.current, name) ? this.current[name] : void 0;
		}
		if (value == null) delete this.current[name];
		else this.current[name] = value;
	}
};
/**
* Predefined macros for KaTeX.
* This can be used to define some commands in terms of others.
*/
var macros = _macros;
defineMacro("\\noexpand", function(context) {
	var t = context.popToken();
	if (context.isExpandable(t.text)) {
		t.noexpand = true;
		t.treatAsRelax = true;
	}
	return {
		tokens: [t],
		numArgs: 0
	};
});
defineMacro("\\expandafter", function(context) {
	var t = context.popToken();
	context.expandOnce(true);
	return {
		tokens: [t],
		numArgs: 0
	};
});
defineMacro("\\@firstoftwo", function(context) {
	return {
		tokens: context.consumeArgs(2)[0],
		numArgs: 0
	};
});
defineMacro("\\@secondoftwo", function(context) {
	return {
		tokens: context.consumeArgs(2)[1],
		numArgs: 0
	};
});
defineMacro("\\@ifnextchar", function(context) {
	var args = context.consumeArgs(3);
	context.consumeSpaces();
	var nextToken = context.future();
	if (args[0].length === 1 && args[0][0].text === nextToken.text) return {
		tokens: args[1],
		numArgs: 0
	};
	else return {
		tokens: args[2],
		numArgs: 0
	};
});
defineMacro("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}");
defineMacro("\\TextOrMath", function(context) {
	var args = context.consumeArgs(2);
	if (context.mode === "text") return {
		tokens: args[0],
		numArgs: 0
	};
	else return {
		tokens: args[1],
		numArgs: 0
	};
});
var digitToNumber = {
	"0": 0,
	"1": 1,
	"2": 2,
	"3": 3,
	"4": 4,
	"5": 5,
	"6": 6,
	"7": 7,
	"8": 8,
	"9": 9,
	"a": 10,
	"A": 10,
	"b": 11,
	"B": 11,
	"c": 12,
	"C": 12,
	"d": 13,
	"D": 13,
	"e": 14,
	"E": 14,
	"f": 15,
	"F": 15
};
defineMacro("\\char", function(context) {
	var token = context.popToken();
	var base;
	var number = 0;
	if (token.text === "'") {
		base = 8;
		token = context.popToken();
	} else if (token.text === "\"") {
		base = 16;
		token = context.popToken();
	} else if (token.text === "`") {
		token = context.popToken();
		if (token.text[0] === "\\") number = token.text.charCodeAt(1);
		else if (token.text === "EOF") throw new ParseError("\\char` missing argument");
		else number = token.text.charCodeAt(0);
	} else base = 10;
	if (base) {
		number = digitToNumber[token.text];
		if (number == null || number >= base) throw new ParseError("Invalid base-" + base + " digit " + token.text);
		var digit;
		while ((digit = digitToNumber[context.future().text]) != null && digit < base) {
			number *= base;
			number += digit;
			context.popToken();
		}
	}
	return "\\@char{" + number + "}";
});
var newcommand = (context, existsOK, nonexistsOK, skipIfExists) => {
	var arg = context.consumeArg().tokens;
	if (arg.length !== 1) throw new ParseError("\\newcommand's first argument must be a macro name");
	var name = arg[0].text;
	var exists = context.isDefined(name);
	if (exists && !existsOK) throw new ParseError("\\newcommand{" + name + "} attempting to redefine " + (name + "; use \\renewcommand"));
	if (!exists && !nonexistsOK) throw new ParseError("\\renewcommand{" + name + "} when command " + name + " does not yet exist; use \\newcommand");
	var numArgs = 0;
	arg = context.consumeArg().tokens;
	if (arg.length === 1 && arg[0].text === "[") {
		var argText = "";
		var token = context.expandNextToken();
		while (token.text !== "]" && token.text !== "EOF") {
			argText += token.text;
			token = context.expandNextToken();
		}
		if (!argText.match(/^\s*[0-9]+\s*$/)) throw new ParseError("Invalid number of arguments: " + argText);
		numArgs = parseInt(argText);
		arg = context.consumeArg().tokens;
	}
	if (!(exists && skipIfExists)) context.macros.set(name, {
		tokens: arg,
		numArgs
	});
	return "";
};
defineMacro("\\newcommand", (context) => newcommand(context, false, true, false));
defineMacro("\\renewcommand", (context) => newcommand(context, true, false, false));
defineMacro("\\providecommand", (context) => newcommand(context, true, true, true));
defineMacro("\\message", (context) => {
	var arg = context.consumeArgs(1)[0];
	console.log(arg.reverse().map((token) => token.text).join(""));
	return "";
});
defineMacro("\\errmessage", (context) => {
	var arg = context.consumeArgs(1)[0];
	console.error(arg.reverse().map((token) => token.text).join(""));
	return "";
});
defineMacro("\\show", (context) => {
	var tok = context.popToken();
	var name = tok.text;
	console.log(tok, context.macros.get(name), functions[name], symbols.math[name], symbols.text[name]);
	return "";
});
defineMacro("\\bgroup", "{");
defineMacro("\\egroup", "}");
defineMacro("~", "\\nobreakspace");
defineMacro("\\lq", "`");
defineMacro("\\rq", "'");
defineMacro("\\aa", "\\r a");
defineMacro("\\AA", "\\r A");
defineMacro("\\textcopyright", "\\html@mathml{\\textcircled{c}}{\\char`©}");
defineMacro("\\copyright", "\\TextOrMath{\\textcopyright}{\\text{\\textcopyright}}");
defineMacro("\\textregistered", "\\html@mathml{\\textcircled{\\scriptsize R}}{\\char`®}");
defineMacro("ℬ", "\\mathscr{B}");
defineMacro("ℰ", "\\mathscr{E}");
defineMacro("ℱ", "\\mathscr{F}");
defineMacro("ℋ", "\\mathscr{H}");
defineMacro("ℐ", "\\mathscr{I}");
defineMacro("ℒ", "\\mathscr{L}");
defineMacro("ℳ", "\\mathscr{M}");
defineMacro("ℛ", "\\mathscr{R}");
defineMacro("ℭ", "\\mathfrak{C}");
defineMacro("ℌ", "\\mathfrak{H}");
defineMacro("ℨ", "\\mathfrak{Z}");
defineMacro("\\Bbbk", "\\Bbb{k}");
defineMacro("\\llap", "\\mathllap{\\textrm{#1}}");
defineMacro("\\rlap", "\\mathrlap{\\textrm{#1}}");
defineMacro("\\clap", "\\mathclap{\\textrm{#1}}");
defineMacro("\\mathstrut", "\\vphantom{(}");
defineMacro("\\underbar", "\\underline{\\text{#1}}");
defineMacro("\\not", "\\html@mathml{\\mathrel{\\mathrlap\\@not}\\nobreak}{\\char\"338}");
defineMacro("\\neq", "\\html@mathml{\\mathrel{\\not=}}{\\mathrel{\\char`≠}}");
defineMacro("\\ne", "\\neq");
defineMacro("≠", "\\neq");
defineMacro("\\notin", "\\html@mathml{\\mathrel{{\\in}\\mathllap{/\\mskip1mu}}}{\\mathrel{\\char`∉}}");
defineMacro("∉", "\\notin");
defineMacro("≘", "\\html@mathml{\\mathrel{=\\kern{-1em}\\raisebox{0.4em}{$\\scriptsize\\frown$}}}{\\mathrel{\\char`≘}}");
defineMacro("≙", "\\html@mathml{\\stackrel{\\tiny\\wedge}{=}}{\\mathrel{\\char`≘}}");
defineMacro("≚", "\\html@mathml{\\stackrel{\\tiny\\vee}{=}}{\\mathrel{\\char`≚}}");
defineMacro("≛", "\\html@mathml{\\stackrel{\\scriptsize\\star}{=}}{\\mathrel{\\char`≛}}");
defineMacro("≝", "\\html@mathml{\\stackrel{\\tiny\\mathrm{def}}{=}}{\\mathrel{\\char`≝}}");
defineMacro("≞", "\\html@mathml{\\stackrel{\\tiny\\mathrm{m}}{=}}{\\mathrel{\\char`≞}}");
defineMacro("≟", "\\html@mathml{\\stackrel{\\tiny?}{=}}{\\mathrel{\\char`≟}}");
defineMacro("⟂", "\\perp");
defineMacro("‼", "\\mathclose{!\\mkern-0.8mu!}");
defineMacro("∌", "\\notni");
defineMacro("⌜", "\\ulcorner");
defineMacro("⌝", "\\urcorner");
defineMacro("⌞", "\\llcorner");
defineMacro("⌟", "\\lrcorner");
defineMacro("©", "\\copyright");
defineMacro("®", "\\textregistered");
defineMacro("\\ulcorner", "\\html@mathml{\\@ulcorner}{\\mathop{\\char\"231c}}");
defineMacro("\\urcorner", "\\html@mathml{\\@urcorner}{\\mathop{\\char\"231d}}");
defineMacro("\\llcorner", "\\html@mathml{\\@llcorner}{\\mathop{\\char\"231e}}");
defineMacro("\\lrcorner", "\\html@mathml{\\@lrcorner}{\\mathop{\\char\"231f}}");
defineMacro("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}");
defineMacro("⋮", "\\vdots");
defineMacro("\\varGamma", "\\mathit{\\Gamma}");
defineMacro("\\varDelta", "\\mathit{\\Delta}");
defineMacro("\\varTheta", "\\mathit{\\Theta}");
defineMacro("\\varLambda", "\\mathit{\\Lambda}");
defineMacro("\\varXi", "\\mathit{\\Xi}");
defineMacro("\\varPi", "\\mathit{\\Pi}");
defineMacro("\\varSigma", "\\mathit{\\Sigma}");
defineMacro("\\varUpsilon", "\\mathit{\\Upsilon}");
defineMacro("\\varPhi", "\\mathit{\\Phi}");
defineMacro("\\varPsi", "\\mathit{\\Psi}");
defineMacro("\\varOmega", "\\mathit{\\Omega}");
defineMacro("\\substack", "\\begin{subarray}{c}#1\\end{subarray}");
defineMacro("\\colon", "\\nobreak\\mskip2mu\\mathpunct{}\\mathchoice{\\mkern-3mu}{\\mkern-3mu}{}{}{:}\\mskip6mu\\relax");
defineMacro("\\boxed", "\\fbox{$\\displaystyle{#1}$}");
defineMacro("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;");
defineMacro("\\implies", "\\DOTSB\\;\\Longrightarrow\\;");
defineMacro("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;");
defineMacro("\\dddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ...}}{#1}}");
defineMacro("\\ddddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ....}}{#1}}");
var dotsByToken = {
	",": "\\dotsc",
	"\\not": "\\dotsb",
	"+": "\\dotsb",
	"=": "\\dotsb",
	"<": "\\dotsb",
	">": "\\dotsb",
	"-": "\\dotsb",
	"*": "\\dotsb",
	":": "\\dotsb",
	"\\DOTSB": "\\dotsb",
	"\\coprod": "\\dotsb",
	"\\bigvee": "\\dotsb",
	"\\bigwedge": "\\dotsb",
	"\\biguplus": "\\dotsb",
	"\\bigcap": "\\dotsb",
	"\\bigcup": "\\dotsb",
	"\\prod": "\\dotsb",
	"\\sum": "\\dotsb",
	"\\bigotimes": "\\dotsb",
	"\\bigoplus": "\\dotsb",
	"\\bigodot": "\\dotsb",
	"\\bigsqcup": "\\dotsb",
	"\\And": "\\dotsb",
	"\\longrightarrow": "\\dotsb",
	"\\Longrightarrow": "\\dotsb",
	"\\longleftarrow": "\\dotsb",
	"\\Longleftarrow": "\\dotsb",
	"\\longleftrightarrow": "\\dotsb",
	"\\Longleftrightarrow": "\\dotsb",
	"\\mapsto": "\\dotsb",
	"\\longmapsto": "\\dotsb",
	"\\hookrightarrow": "\\dotsb",
	"\\doteq": "\\dotsb",
	"\\mathbin": "\\dotsb",
	"\\mathrel": "\\dotsb",
	"\\relbar": "\\dotsb",
	"\\Relbar": "\\dotsb",
	"\\xrightarrow": "\\dotsb",
	"\\xleftarrow": "\\dotsb",
	"\\DOTSI": "\\dotsi",
	"\\int": "\\dotsi",
	"\\oint": "\\dotsi",
	"\\iint": "\\dotsi",
	"\\iiint": "\\dotsi",
	"\\iiiint": "\\dotsi",
	"\\idotsint": "\\dotsi",
	"\\DOTSX": "\\dotsx"
};
var dotsbGroups = /* @__PURE__ */ new Set(["bin", "rel"]);
defineMacro("\\dots", function(context) {
	var thedots = "\\dotso";
	var next = context.expandAfterFuture().text;
	if (next in dotsByToken) thedots = dotsByToken[next];
	else if (next.slice(0, 4) === "\\not") thedots = "\\dotsb";
	else if (next in symbols.math) {
		if (dotsbGroups.has(symbols.math[next].group)) thedots = "\\dotsb";
	}
	return thedots;
});
var spaceAfterDots = {
	")": true,
	"]": true,
	"\\rbrack": true,
	"\\}": true,
	"\\rbrace": true,
	"\\rangle": true,
	"\\rceil": true,
	"\\rfloor": true,
	"\\rgroup": true,
	"\\rmoustache": true,
	"\\right": true,
	"\\bigr": true,
	"\\biggr": true,
	"\\Bigr": true,
	"\\Biggr": true,
	"$": true,
	";": true,
	".": true,
	",": true
};
defineMacro("\\dotso", function(context) {
	if (context.future().text in spaceAfterDots) return "\\ldots\\,";
	else return "\\ldots";
});
defineMacro("\\dotsc", function(context) {
	var next = context.future().text;
	if (next in spaceAfterDots && next !== ",") return "\\ldots\\,";
	else return "\\ldots";
});
defineMacro("\\cdots", function(context) {
	if (context.future().text in spaceAfterDots) return "\\@cdots\\,";
	else return "\\@cdots";
});
defineMacro("\\dotsb", "\\cdots");
defineMacro("\\dotsm", "\\cdots");
defineMacro("\\dotsi", "\\!\\cdots");
defineMacro("\\dotsx", "\\ldots\\,");
defineMacro("\\DOTSI", "\\relax");
defineMacro("\\DOTSB", "\\relax");
defineMacro("\\DOTSX", "\\relax");
defineMacro("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax");
defineMacro("\\,", "\\tmspace+{3mu}{.1667em}");
defineMacro("\\thinspace", "\\,");
defineMacro("\\>", "\\mskip{4mu}");
defineMacro("\\:", "\\tmspace+{4mu}{.2222em}");
defineMacro("\\medspace", "\\:");
defineMacro("\\;", "\\tmspace+{5mu}{.2777em}");
defineMacro("\\thickspace", "\\;");
defineMacro("\\!", "\\tmspace-{3mu}{.1667em}");
defineMacro("\\negthinspace", "\\!");
defineMacro("\\negmedspace", "\\tmspace-{4mu}{.2222em}");
defineMacro("\\negthickspace", "\\tmspace-{5mu}{.277em}");
defineMacro("\\enspace", "\\kern.5em ");
defineMacro("\\enskip", "\\hskip.5em\\relax");
defineMacro("\\quad", "\\hskip1em\\relax");
defineMacro("\\qquad", "\\hskip2em\\relax");
defineMacro("\\tag", "\\@ifstar\\tag@literal\\tag@paren");
defineMacro("\\tag@paren", "\\tag@literal{({#1})}");
defineMacro("\\tag@literal", (context) => {
	if (context.macros.get("\\df@tag")) throw new ParseError("Multiple \\tag");
	return "\\gdef\\df@tag{\\text{#1}}";
});
defineMacro("\\bmod", "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}\\mathbin{\\rm mod}\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}");
defineMacro("\\pod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)");
defineMacro("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}");
defineMacro("\\mod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1");
defineMacro("\\newline", "\\\\\\relax");
defineMacro("\\TeX", "\\textrm{\\html@mathml{T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{TeX}}");
var latexRaiseA = makeEm(fontMetricsData["Main-Regular"]["T".charCodeAt(0)][1] - .7 * fontMetricsData["Main-Regular"]["A".charCodeAt(0)][1]);
defineMacro("\\LaTeX", "\\textrm{\\html@mathml{" + ("L\\kern-.36em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{LaTeX}}");
defineMacro("\\KaTeX", "\\textrm{\\html@mathml{" + ("K\\kern-.17em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{KaTeX}}");
defineMacro("\\hspace", "\\@ifstar\\@hspacer\\@hspace");
defineMacro("\\@hspace", "\\hskip #1\\relax");
defineMacro("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax");
defineMacro("\\ordinarycolon", ":");
defineMacro("\\vcentcolon", "\\mathrel{\\mathop\\ordinarycolon}");
defineMacro("\\dblcolon", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}{\\mathop{\\char\"2237}}");
defineMacro("\\coloneqq", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char\"2254}}");
defineMacro("\\Coloneqq", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char\"2237\\char\"3d}}");
defineMacro("\\coloneq", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char\"3a\\char\"2212}}");
defineMacro("\\Coloneq", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char\"2237\\char\"2212}}");
defineMacro("\\eqqcolon", "\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char\"2255}}");
defineMacro("\\Eqqcolon", "\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char\"3d\\char\"2237}}");
defineMacro("\\eqcolon", "\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char\"2239}}");
defineMacro("\\Eqcolon", "\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char\"2212\\char\"2237}}");
defineMacro("\\colonapprox", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char\"3a\\char\"2248}}");
defineMacro("\\Colonapprox", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char\"2237\\char\"2248}}");
defineMacro("\\colonsim", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char\"3a\\char\"223c}}");
defineMacro("\\Colonsim", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char\"2237\\char\"223c}}");
defineMacro("∷", "\\dblcolon");
defineMacro("∹", "\\eqcolon");
defineMacro("≔", "\\coloneqq");
defineMacro("≕", "\\eqqcolon");
defineMacro("⩴", "\\Coloneqq");
defineMacro("\\ratio", "\\vcentcolon");
defineMacro("\\coloncolon", "\\dblcolon");
defineMacro("\\colonequals", "\\coloneqq");
defineMacro("\\coloncolonequals", "\\Coloneqq");
defineMacro("\\equalscolon", "\\eqqcolon");
defineMacro("\\equalscoloncolon", "\\Eqqcolon");
defineMacro("\\colonminus", "\\coloneq");
defineMacro("\\coloncolonminus", "\\Coloneq");
defineMacro("\\minuscolon", "\\eqcolon");
defineMacro("\\minuscoloncolon", "\\Eqcolon");
defineMacro("\\coloncolonapprox", "\\Colonapprox");
defineMacro("\\coloncolonsim", "\\Colonsim");
defineMacro("\\simcolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
defineMacro("\\simcoloncolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}");
defineMacro("\\approxcolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
defineMacro("\\approxcoloncolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}");
defineMacro("\\notni", "\\html@mathml{\\not\\ni}{\\mathrel{\\char`∌}}");
defineMacro("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}");
defineMacro("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}");
defineMacro("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}");
defineMacro("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}");
defineMacro("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{lim}}");
defineMacro("\\varliminf", "\\DOTSB\\operatorname*{\\underline{lim}}");
defineMacro("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{lim}}");
defineMacro("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{lim}}");
defineMacro("\\gvertneqq", "\\html@mathml{\\@gvertneqq}{≩}");
defineMacro("\\lvertneqq", "\\html@mathml{\\@lvertneqq}{≨}");
defineMacro("\\ngeqq", "\\html@mathml{\\@ngeqq}{≱}");
defineMacro("\\ngeqslant", "\\html@mathml{\\@ngeqslant}{≱}");
defineMacro("\\nleqq", "\\html@mathml{\\@nleqq}{≰}");
defineMacro("\\nleqslant", "\\html@mathml{\\@nleqslant}{≰}");
defineMacro("\\nshortmid", "\\html@mathml{\\@nshortmid}{∤}");
defineMacro("\\nshortparallel", "\\html@mathml{\\@nshortparallel}{∦}");
defineMacro("\\nsubseteqq", "\\html@mathml{\\@nsubseteqq}{⊈}");
defineMacro("\\nsupseteqq", "\\html@mathml{\\@nsupseteqq}{⊉}");
defineMacro("\\varsubsetneq", "\\html@mathml{\\@varsubsetneq}{⊊}");
defineMacro("\\varsubsetneqq", "\\html@mathml{\\@varsubsetneqq}{⫋}");
defineMacro("\\varsupsetneq", "\\html@mathml{\\@varsupsetneq}{⊋}");
defineMacro("\\varsupsetneqq", "\\html@mathml{\\@varsupsetneqq}{⫌}");
defineMacro("\\imath", "\\html@mathml{\\@imath}{ı}");
defineMacro("\\jmath", "\\html@mathml{\\@jmath}{ȷ}");
defineMacro("\\llbracket", "\\html@mathml{\\mathopen{[\\mkern-3.2mu[}}{\\mathopen{\\char`⟦}}");
defineMacro("\\rrbracket", "\\html@mathml{\\mathclose{]\\mkern-3.2mu]}}{\\mathclose{\\char`⟧}}");
defineMacro("⟦", "\\llbracket");
defineMacro("⟧", "\\rrbracket");
defineMacro("\\lBrace", "\\html@mathml{\\mathopen{\\{\\mkern-3.2mu[}}{\\mathopen{\\char`⦃}}");
defineMacro("\\rBrace", "\\html@mathml{\\mathclose{]\\mkern-3.2mu\\}}}{\\mathclose{\\char`⦄}}");
defineMacro("⦃", "\\lBrace");
defineMacro("⦄", "\\rBrace");
defineMacro("\\minuso", "\\mathbin{\\html@mathml{{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}{\\char`⦵}}");
defineMacro("⦵", "\\minuso");
defineMacro("\\darr", "\\downarrow");
defineMacro("\\dArr", "\\Downarrow");
defineMacro("\\Darr", "\\Downarrow");
defineMacro("\\lang", "\\langle");
defineMacro("\\rang", "\\rangle");
defineMacro("\\uarr", "\\uparrow");
defineMacro("\\uArr", "\\Uparrow");
defineMacro("\\Uarr", "\\Uparrow");
defineMacro("\\N", "\\mathbb{N}");
defineMacro("\\R", "\\mathbb{R}");
defineMacro("\\Z", "\\mathbb{Z}");
defineMacro("\\alef", "\\aleph");
defineMacro("\\alefsym", "\\aleph");
defineMacro("\\Alpha", "\\mathrm{A}");
defineMacro("\\Beta", "\\mathrm{B}");
defineMacro("\\bull", "\\bullet");
defineMacro("\\Chi", "\\mathrm{X}");
defineMacro("\\clubs", "\\clubsuit");
defineMacro("\\cnums", "\\mathbb{C}");
defineMacro("\\Complex", "\\mathbb{C}");
defineMacro("\\Dagger", "\\ddagger");
defineMacro("\\diamonds", "\\diamondsuit");
defineMacro("\\empty", "\\emptyset");
defineMacro("\\Epsilon", "\\mathrm{E}");
defineMacro("\\Eta", "\\mathrm{H}");
defineMacro("\\exist", "\\exists");
defineMacro("\\harr", "\\leftrightarrow");
defineMacro("\\hArr", "\\Leftrightarrow");
defineMacro("\\Harr", "\\Leftrightarrow");
defineMacro("\\hearts", "\\heartsuit");
defineMacro("\\image", "\\Im");
defineMacro("\\infin", "\\infty");
defineMacro("\\Iota", "\\mathrm{I}");
defineMacro("\\isin", "\\in");
defineMacro("\\Kappa", "\\mathrm{K}");
defineMacro("\\larr", "\\leftarrow");
defineMacro("\\lArr", "\\Leftarrow");
defineMacro("\\Larr", "\\Leftarrow");
defineMacro("\\lrarr", "\\leftrightarrow");
defineMacro("\\lrArr", "\\Leftrightarrow");
defineMacro("\\Lrarr", "\\Leftrightarrow");
defineMacro("\\Mu", "\\mathrm{M}");
defineMacro("\\natnums", "\\mathbb{N}");
defineMacro("\\Nu", "\\mathrm{N}");
defineMacro("\\Omicron", "\\mathrm{O}");
defineMacro("\\plusmn", "\\pm");
defineMacro("\\rarr", "\\rightarrow");
defineMacro("\\rArr", "\\Rightarrow");
defineMacro("\\Rarr", "\\Rightarrow");
defineMacro("\\real", "\\Re");
defineMacro("\\reals", "\\mathbb{R}");
defineMacro("\\Reals", "\\mathbb{R}");
defineMacro("\\Rho", "\\mathrm{P}");
defineMacro("\\sdot", "\\cdot");
defineMacro("\\sect", "\\S");
defineMacro("\\spades", "\\spadesuit");
defineMacro("\\sub", "\\subset");
defineMacro("\\sube", "\\subseteq");
defineMacro("\\supe", "\\supseteq");
defineMacro("\\Tau", "\\mathrm{T}");
defineMacro("\\thetasym", "\\vartheta");
defineMacro("\\weierp", "\\wp");
defineMacro("\\Zeta", "\\mathrm{Z}");
defineMacro("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}");
defineMacro("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}");
defineMacro("\\plim", "\\DOTSB\\mathop{\\operatorname{plim}}\\limits");
defineMacro("\\bra", "\\mathinner{\\langle{#1}|}");
defineMacro("\\ket", "\\mathinner{|{#1}\\rangle}");
defineMacro("\\braket", "\\mathinner{\\langle{#1}\\rangle}");
defineMacro("\\Bra", "\\left\\langle#1\\right|");
defineMacro("\\Ket", "\\left|#1\\right\\rangle");
var braketHelper = (one) => (context) => {
	var left = context.consumeArg().tokens;
	var middle = context.consumeArg().tokens;
	var middleDouble = context.consumeArg().tokens;
	var right = context.consumeArg().tokens;
	var oldMiddle = context.macros.get("|");
	var oldMiddleDouble = context.macros.get("\\|");
	context.macros.beginGroup();
	var midMacro = (double) => (context) => {
		if (one) {
			context.macros.set("|", oldMiddle);
			if (middleDouble.length) context.macros.set("\\|", oldMiddleDouble);
		}
		var doubled = double;
		if (!double && middleDouble.length) {
			if (context.future().text === "|") {
				context.popToken();
				doubled = true;
			}
		}
		return {
			tokens: doubled ? middleDouble : middle,
			numArgs: 0
		};
	};
	context.macros.set("|", midMacro(false));
	if (middleDouble.length) context.macros.set("\\|", midMacro(true));
	var arg = context.consumeArg().tokens;
	var expanded = context.expandTokens([
		...right,
		...arg,
		...left
	]);
	context.macros.endGroup();
	return {
		tokens: expanded.reverse(),
		numArgs: 0
	};
};
defineMacro("\\bra@ket", braketHelper(false));
defineMacro("\\bra@set", braketHelper(true));
defineMacro("\\Braket", "\\bra@ket{\\left\\langle}{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}");
defineMacro("\\Set", "\\bra@set{\\left\\{\\:}{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}");
defineMacro("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}");
defineMacro("\\angln", "{\\angl n}");
defineMacro("\\blue", "\\textcolor{##6495ed}{#1}");
defineMacro("\\orange", "\\textcolor{##ffa500}{#1}");
defineMacro("\\pink", "\\textcolor{##ff00af}{#1}");
defineMacro("\\red", "\\textcolor{##df0030}{#1}");
defineMacro("\\green", "\\textcolor{##28ae7b}{#1}");
defineMacro("\\gray", "\\textcolor{gray}{#1}");
defineMacro("\\purple", "\\textcolor{##9d38bd}{#1}");
defineMacro("\\blueA", "\\textcolor{##ccfaff}{#1}");
defineMacro("\\blueB", "\\textcolor{##80f6ff}{#1}");
defineMacro("\\blueC", "\\textcolor{##63d9ea}{#1}");
defineMacro("\\blueD", "\\textcolor{##11accd}{#1}");
defineMacro("\\blueE", "\\textcolor{##0c7f99}{#1}");
defineMacro("\\tealA", "\\textcolor{##94fff5}{#1}");
defineMacro("\\tealB", "\\textcolor{##26edd5}{#1}");
defineMacro("\\tealC", "\\textcolor{##01d1c1}{#1}");
defineMacro("\\tealD", "\\textcolor{##01a995}{#1}");
defineMacro("\\tealE", "\\textcolor{##208170}{#1}");
defineMacro("\\greenA", "\\textcolor{##b6ffb0}{#1}");
defineMacro("\\greenB", "\\textcolor{##8af281}{#1}");
defineMacro("\\greenC", "\\textcolor{##74cf70}{#1}");
defineMacro("\\greenD", "\\textcolor{##1fab54}{#1}");
defineMacro("\\greenE", "\\textcolor{##0d923f}{#1}");
defineMacro("\\goldA", "\\textcolor{##ffd0a9}{#1}");
defineMacro("\\goldB", "\\textcolor{##ffbb71}{#1}");
defineMacro("\\goldC", "\\textcolor{##ff9c39}{#1}");
defineMacro("\\goldD", "\\textcolor{##e07d10}{#1}");
defineMacro("\\goldE", "\\textcolor{##a75a05}{#1}");
defineMacro("\\redA", "\\textcolor{##fca9a9}{#1}");
defineMacro("\\redB", "\\textcolor{##ff8482}{#1}");
defineMacro("\\redC", "\\textcolor{##f9685d}{#1}");
defineMacro("\\redD", "\\textcolor{##e84d39}{#1}");
defineMacro("\\redE", "\\textcolor{##bc2612}{#1}");
defineMacro("\\maroonA", "\\textcolor{##ffbde0}{#1}");
defineMacro("\\maroonB", "\\textcolor{##ff92c6}{#1}");
defineMacro("\\maroonC", "\\textcolor{##ed5fa6}{#1}");
defineMacro("\\maroonD", "\\textcolor{##ca337c}{#1}");
defineMacro("\\maroonE", "\\textcolor{##9e034e}{#1}");
defineMacro("\\purpleA", "\\textcolor{##ddd7ff}{#1}");
defineMacro("\\purpleB", "\\textcolor{##c6b9fc}{#1}");
defineMacro("\\purpleC", "\\textcolor{##aa87ff}{#1}");
defineMacro("\\purpleD", "\\textcolor{##7854ab}{#1}");
defineMacro("\\purpleE", "\\textcolor{##543b78}{#1}");
defineMacro("\\mintA", "\\textcolor{##f5f9e8}{#1}");
defineMacro("\\mintB", "\\textcolor{##edf2df}{#1}");
defineMacro("\\mintC", "\\textcolor{##e0e5cc}{#1}");
defineMacro("\\grayA", "\\textcolor{##f6f7f7}{#1}");
defineMacro("\\grayB", "\\textcolor{##f0f1f2}{#1}");
defineMacro("\\grayC", "\\textcolor{##e3e5e6}{#1}");
defineMacro("\\grayD", "\\textcolor{##d6d8da}{#1}");
defineMacro("\\grayE", "\\textcolor{##babec2}{#1}");
defineMacro("\\grayF", "\\textcolor{##888d93}{#1}");
defineMacro("\\grayG", "\\textcolor{##626569}{#1}");
defineMacro("\\grayH", "\\textcolor{##3b3e40}{#1}");
defineMacro("\\grayI", "\\textcolor{##21242c}{#1}");
defineMacro("\\kaBlue", "\\textcolor{##314453}{#1}");
defineMacro("\\kaGreen", "\\textcolor{##71B307}{#1}");
/**
* This file contains the “gullet” where macros are expanded
* until only non-macro tokens remain.
*/
var implicitCommands = {
	"^": true,
	"_": true,
	"\\limits": true,
	"\\nolimits": true
};
var MacroExpander = class {
	constructor(input, settings, mode) {
		this.settings = void 0;
		this.expansionCount = void 0;
		this.lexer = void 0;
		this.macros = void 0;
		this.stack = void 0;
		this.mode = void 0;
		this.settings = settings;
		this.expansionCount = 0;
		this.feed(input);
		this.macros = new Namespace(macros, settings.macros);
		this.mode = mode;
		this.stack = [];
	}
	/**
	* Feed a new input string to the same MacroExpander
	* (with existing macros etc.).
	*/
	feed(input) {
		this.lexer = new Lexer(input, this.settings);
	}
	/**
	* Switches between "text" and "math" modes.
	*/
	switchMode(newMode) {
		this.mode = newMode;
	}
	/**
	* Start a new group nesting within all namespaces.
	*/
	beginGroup() {
		this.macros.beginGroup();
	}
	/**
	* End current group nesting within all namespaces.
	*/
	endGroup() {
		this.macros.endGroup();
	}
	/**
	* Ends all currently nested groups (if any), restoring values before the
	* groups began.  Useful in case of an error in the middle of parsing.
	*/
	endGroups() {
		this.macros.endGroups();
	}
	/**
	* Returns the topmost token on the stack, without expanding it.
	* Similar in behavior to TeX's `\futurelet`.
	*/
	future() {
		if (this.stack.length === 0) this.pushToken(this.lexer.lex());
		return this.stack[this.stack.length - 1];
	}
	/**
	* Remove and return the next unexpanded token.
	*/
	popToken() {
		this.future();
		return this.stack.pop();
	}
	/**
	* Add a given token to the token stack.  In particular, this get be used
	* to put back a token returned from one of the other methods.
	*/
	pushToken(token) {
		this.stack.push(token);
	}
	/**
	* Append an array of tokens to the token stack.
	*/
	pushTokens(tokens) {
		this.stack.push(...tokens);
	}
	/**
	* Find an macro argument without expanding tokens and append the array of
	* tokens to the token stack. Uses Token as a container for the result.
	*/
	scanArgument(isOptional) {
		var start;
		var end;
		var tokens;
		if (isOptional) {
			this.consumeSpaces();
			if (this.future().text !== "[") return null;
			start = this.popToken();
			var _this$consumeArg = this.consumeArg(["]"]);
			tokens = _this$consumeArg.tokens;
			end = _this$consumeArg.end;
		} else {
			var _this$consumeArg2 = this.consumeArg();
			tokens = _this$consumeArg2.tokens;
			start = _this$consumeArg2.start;
			end = _this$consumeArg2.end;
		}
		this.pushToken(new Token("EOF", end.loc));
		this.pushTokens(tokens);
		return new Token("", SourceLocation.range(start, end));
	}
	/**
	* Consume all following space tokens, without expansion.
	*/
	consumeSpaces() {
		for (;;) if (this.future().text === " ") this.stack.pop();
		else break;
	}
	/**
	* Consume an argument from the token stream, and return the resulting array
	* of tokens and start/end token.
	*/
	consumeArg(delims) {
		var tokens = [];
		var isDelimited = delims && delims.length > 0;
		if (!isDelimited) this.consumeSpaces();
		var start = this.future();
		var tok;
		var depth = 0;
		var match = 0;
		do {
			tok = this.popToken();
			tokens.push(tok);
			if (tok.text === "{") ++depth;
			else if (tok.text === "}") {
				--depth;
				if (depth === -1) throw new ParseError("Extra }", tok);
			} else if (tok.text === "EOF") throw new ParseError("Unexpected end of input in a macro argument, expected '" + (delims && isDelimited ? delims[match] : "}") + "'", tok);
			if (delims && isDelimited) {
				if ((depth === 0 || depth === 1 && delims[match] === "{") && tok.text === delims[match]) {
					++match;
					if (match === delims.length) {
						tokens.splice(-match, match);
						break;
					}
				} else match = 0;
			}
		} while (depth !== 0 || isDelimited);
		if (start.text === "{" && tokens[tokens.length - 1].text === "}") {
			tokens.pop();
			tokens.shift();
		}
		tokens.reverse();
		return {
			tokens,
			start,
			end: tok
		};
	}
	/**
	* Consume the specified number of (delimited) arguments from the token
	* stream and return the resulting array of arguments.
	*/
	consumeArgs(numArgs, delimiters) {
		if (delimiters) {
			if (delimiters.length !== numArgs + 1) throw new ParseError("The length of delimiters doesn't match the number of args!");
			var delims = delimiters[0];
			for (var i = 0; i < delims.length; i++) {
				var tok = this.popToken();
				if (delims[i] !== tok.text) throw new ParseError("Use of the macro doesn't match its definition", tok);
			}
		}
		var args = [];
		for (var _i = 0; _i < numArgs; _i++) args.push(this.consumeArg(delimiters && delimiters[_i + 1]).tokens);
		return args;
	}
	/**
	* Increment `expansionCount` by the specified amount.
	* Throw an error if it exceeds `maxExpand`.
	*/
	countExpansion(amount) {
		this.expansionCount += amount;
		if (this.expansionCount > this.settings.maxExpand) throw new ParseError("Too many expansions: infinite loop or need to increase maxExpand setting");
	}
	/**
	* Expand the next token only once if possible.
	*
	* If the token is expanded, the resulting tokens will be pushed onto
	* the stack in reverse order, and the number of such tokens will be
	* returned.  This number might be zero or positive.
	*
	* If not, the return value is `false`, and the next token remains at the
	* top of the stack.
	*
	* In either case, the next token will be on the top of the stack,
	* or the stack will be empty (in case of empty expansion
	* and no other tokens).
	*
	* Used to implement `expandAfterFuture` and `expandNextToken`.
	*
	* If expandableOnly, only expandable tokens are expanded and
	* an undefined control sequence results in an error.
	*/
	expandOnce(expandableOnly) {
		var topToken = this.popToken();
		var name = topToken.text;
		var expansion = !topToken.noexpand ? this._getExpansion(name) : null;
		if (expansion == null || expandableOnly && expansion.unexpandable) {
			if (expandableOnly && expansion == null && name[0] === "\\" && !this.isDefined(name)) throw new ParseError("Undefined control sequence: " + name);
			this.pushToken(topToken);
			return false;
		}
		this.countExpansion(1);
		var tokens = expansion.tokens;
		var args = this.consumeArgs(expansion.numArgs, expansion.delimiters);
		if (expansion.numArgs) {
			tokens = tokens.slice();
			for (var i = tokens.length - 1; i >= 0; --i) {
				var tok = tokens[i];
				if (tok.text === "#") {
					if (i === 0) throw new ParseError("Incomplete placeholder at end of macro body", tok);
					tok = tokens[--i];
					if (tok.text === "#") tokens.splice(i + 1, 1);
					else if (/^[1-9]$/.test(tok.text)) tokens.splice(i, 2, ...args[+tok.text - 1]);
					else throw new ParseError("Not a valid argument number", tok);
				}
			}
		}
		this.pushTokens(tokens);
		return tokens.length;
	}
	/**
	* Expand the next token only once (if possible), and return the resulting
	* top token on the stack (without removing anything from the stack).
	* Similar in behavior to TeX's `\expandafter\futurelet`.
	* Equivalent to expandOnce() followed by future().
	*/
	expandAfterFuture() {
		this.expandOnce();
		return this.future();
	}
	/**
	* Recursively expand first token, then return first non-expandable token.
	*/
	expandNextToken() {
		for (;;) if (this.expandOnce() === false) {
			var token = this.stack.pop();
			if (token.treatAsRelax) token.text = "\\relax";
			return token;
		}
	}
	/**
	* Fully expand the given macro name and return the resulting list of
	* tokens, or return `undefined` if no such macro is defined.
	*/
	expandMacro(name) {
		return this.macros.has(name) ? this.expandTokens([new Token(name)]) : void 0;
	}
	/**
	* Fully expand the given token stream and return the resulting list of
	* tokens.  Note that the input tokens are in reverse order, but the
	* output tokens are in forward order.
	*/
	expandTokens(tokens) {
		var output = [];
		var oldStackLength = this.stack.length;
		this.pushTokens(tokens);
		while (this.stack.length > oldStackLength) if (this.expandOnce(true) === false) {
			var token = this.stack.pop();
			if (token.treatAsRelax) {
				token.noexpand = false;
				token.treatAsRelax = false;
			}
			output.push(token);
		}
		this.countExpansion(output.length);
		return output;
	}
	/**
	* Fully expand the given macro name and return the result as a string,
	* or return `undefined` if no such macro is defined.
	*/
	expandMacroAsText(name) {
		var tokens = this.expandMacro(name);
		if (tokens) return tokens.map((token) => token.text).join("");
		else return tokens;
	}
	/**
	* Returns the expanded macro as a reversed array of tokens and a macro
	* argument count.  Or returns `null` if no such macro.
	*/
	_getExpansion(name) {
		var definition = this.macros.get(name);
		if (definition == null) return definition;
		if (name.length === 1) {
			var catcode = this.lexer.catcodes[name];
			if (catcode != null && catcode !== 13) return;
		}
		var expansion = typeof definition === "function" ? definition(this) : definition;
		if (typeof expansion === "string") {
			var numArgs = 0;
			if (expansion.includes("#")) {
				var stripped = expansion.replace(/##/g, "");
				while (stripped.includes("#" + (numArgs + 1))) ++numArgs;
			}
			var bodyLexer = new Lexer(expansion, this.settings);
			var tokens = [];
			var tok = bodyLexer.lex();
			while (tok.text !== "EOF") {
				tokens.push(tok);
				tok = bodyLexer.lex();
			}
			tokens.reverse();
			return {
				tokens,
				numArgs
			};
		}
		return expansion;
	}
	/**
	* Determine whether a command is currently "defined" (has some
	* functionality), meaning that it's a macro (in the current group),
	* a function, a symbol, or one of the special commands listed in
	* `implicitCommands`.
	*/
	isDefined(name) {
		return this.macros.has(name) || Object.prototype.hasOwnProperty.call(functions, name) || Object.prototype.hasOwnProperty.call(symbols.math, name) || Object.prototype.hasOwnProperty.call(symbols.text, name) || Object.prototype.hasOwnProperty.call(implicitCommands, name);
	}
	/**
	* Determine whether a command is expandable.
	*/
	isExpandable(name) {
		var macro = this.macros.get(name);
		if (macro != null) return typeof macro === "string" || typeof macro === "function" || !macro.unexpandable;
		return Object.prototype.hasOwnProperty.call(functions, name) && !functions[name].primitive;
	}
};
var unicodeSubRegEx = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/;
var uSubsAndSups = Object.freeze({
	"₊": "+",
	"₋": "-",
	"₌": "=",
	"₍": "(",
	"₎": ")",
	"₀": "0",
	"₁": "1",
	"₂": "2",
	"₃": "3",
	"₄": "4",
	"₅": "5",
	"₆": "6",
	"₇": "7",
	"₈": "8",
	"₉": "9",
	"ₐ": "a",
	"ₑ": "e",
	"ₕ": "h",
	"ᵢ": "i",
	"ⱼ": "j",
	"ₖ": "k",
	"ₗ": "l",
	"ₘ": "m",
	"ₙ": "n",
	"ₒ": "o",
	"ₚ": "p",
	"ᵣ": "r",
	"ₛ": "s",
	"ₜ": "t",
	"ᵤ": "u",
	"ᵥ": "v",
	"ₓ": "x",
	"ᵦ": "β",
	"ᵧ": "γ",
	"ᵨ": "ρ",
	"ᵩ": "ϕ",
	"ᵪ": "χ",
	"⁺": "+",
	"⁻": "-",
	"⁼": "=",
	"⁽": "(",
	"⁾": ")",
	"⁰": "0",
	"¹": "1",
	"²": "2",
	"³": "3",
	"⁴": "4",
	"⁵": "5",
	"⁶": "6",
	"⁷": "7",
	"⁸": "8",
	"⁹": "9",
	"ᴬ": "A",
	"ᴮ": "B",
	"ᴰ": "D",
	"ᴱ": "E",
	"ᴳ": "G",
	"ᴴ": "H",
	"ᴵ": "I",
	"ᴶ": "J",
	"ᴷ": "K",
	"ᴸ": "L",
	"ᴹ": "M",
	"ᴺ": "N",
	"ᴼ": "O",
	"ᴾ": "P",
	"ᴿ": "R",
	"ᵀ": "T",
	"ᵁ": "U",
	"ⱽ": "V",
	"ᵂ": "W",
	"ᵃ": "a",
	"ᵇ": "b",
	"ᶜ": "c",
	"ᵈ": "d",
	"ᵉ": "e",
	"ᶠ": "f",
	"ᵍ": "g",
	"ʰ": "h",
	"ⁱ": "i",
	"ʲ": "j",
	"ᵏ": "k",
	"ˡ": "l",
	"ᵐ": "m",
	"ⁿ": "n",
	"ᵒ": "o",
	"ᵖ": "p",
	"ʳ": "r",
	"ˢ": "s",
	"ᵗ": "t",
	"ᵘ": "u",
	"ᵛ": "v",
	"ʷ": "w",
	"ˣ": "x",
	"ʸ": "y",
	"ᶻ": "z",
	"ᵝ": "β",
	"ᵞ": "γ",
	"ᵟ": "δ",
	"ᵠ": "ϕ",
	"ᵡ": "χ",
	"ᶿ": "θ"
});
var unicodeAccents = {
	"́": {
		"text": "\\'",
		"math": "\\acute"
	},
	"̀": {
		"text": "\\`",
		"math": "\\grave"
	},
	"̈": {
		"text": "\\\"",
		"math": "\\ddot"
	},
	"̃": {
		"text": "\\~",
		"math": "\\tilde"
	},
	"̄": {
		"text": "\\=",
		"math": "\\bar"
	},
	"̆": {
		"text": "\\u",
		"math": "\\breve"
	},
	"̌": {
		"text": "\\v",
		"math": "\\check"
	},
	"̂": {
		"text": "\\^",
		"math": "\\hat"
	},
	"̇": {
		"text": "\\.",
		"math": "\\dot"
	},
	"̊": {
		"text": "\\r",
		"math": "\\mathring"
	},
	"̋": { "text": "\\H" },
	"̧": { "text": "\\c" }
};
var unicodeSymbols = {
	"á": "á",
	"à": "à",
	"ä": "ä",
	"ǟ": "ǟ",
	"ã": "ã",
	"ā": "ā",
	"ă": "ă",
	"ắ": "ắ",
	"ằ": "ằ",
	"ẵ": "ẵ",
	"ǎ": "ǎ",
	"â": "â",
	"ấ": "ấ",
	"ầ": "ầ",
	"ẫ": "ẫ",
	"ȧ": "ȧ",
	"ǡ": "ǡ",
	"å": "å",
	"ǻ": "ǻ",
	"ḃ": "ḃ",
	"ć": "ć",
	"ḉ": "ḉ",
	"č": "č",
	"ĉ": "ĉ",
	"ċ": "ċ",
	"ç": "ç",
	"ď": "ď",
	"ḋ": "ḋ",
	"ḑ": "ḑ",
	"é": "é",
	"è": "è",
	"ë": "ë",
	"ẽ": "ẽ",
	"ē": "ē",
	"ḗ": "ḗ",
	"ḕ": "ḕ",
	"ĕ": "ĕ",
	"ḝ": "ḝ",
	"ě": "ě",
	"ê": "ê",
	"ế": "ế",
	"ề": "ề",
	"ễ": "ễ",
	"ė": "ė",
	"ȩ": "ȩ",
	"ḟ": "ḟ",
	"ǵ": "ǵ",
	"ḡ": "ḡ",
	"ğ": "ğ",
	"ǧ": "ǧ",
	"ĝ": "ĝ",
	"ġ": "ġ",
	"ģ": "ģ",
	"ḧ": "ḧ",
	"ȟ": "ȟ",
	"ĥ": "ĥ",
	"ḣ": "ḣ",
	"ḩ": "ḩ",
	"í": "í",
	"ì": "ì",
	"ï": "ï",
	"ḯ": "ḯ",
	"ĩ": "ĩ",
	"ī": "ī",
	"ĭ": "ĭ",
	"ǐ": "ǐ",
	"î": "î",
	"ǰ": "ǰ",
	"ĵ": "ĵ",
	"ḱ": "ḱ",
	"ǩ": "ǩ",
	"ķ": "ķ",
	"ĺ": "ĺ",
	"ľ": "ľ",
	"ļ": "ļ",
	"ḿ": "ḿ",
	"ṁ": "ṁ",
	"ń": "ń",
	"ǹ": "ǹ",
	"ñ": "ñ",
	"ň": "ň",
	"ṅ": "ṅ",
	"ņ": "ņ",
	"ó": "ó",
	"ò": "ò",
	"ö": "ö",
	"ȫ": "ȫ",
	"õ": "õ",
	"ṍ": "ṍ",
	"ṏ": "ṏ",
	"ȭ": "ȭ",
	"ō": "ō",
	"ṓ": "ṓ",
	"ṑ": "ṑ",
	"ŏ": "ŏ",
	"ǒ": "ǒ",
	"ô": "ô",
	"ố": "ố",
	"ồ": "ồ",
	"ỗ": "ỗ",
	"ȯ": "ȯ",
	"ȱ": "ȱ",
	"ő": "ő",
	"ṕ": "ṕ",
	"ṗ": "ṗ",
	"ŕ": "ŕ",
	"ř": "ř",
	"ṙ": "ṙ",
	"ŗ": "ŗ",
	"ś": "ś",
	"ṥ": "ṥ",
	"š": "š",
	"ṧ": "ṧ",
	"ŝ": "ŝ",
	"ṡ": "ṡ",
	"ş": "ş",
	"ẗ": "ẗ",
	"ť": "ť",
	"ṫ": "ṫ",
	"ţ": "ţ",
	"ú": "ú",
	"ù": "ù",
	"ü": "ü",
	"ǘ": "ǘ",
	"ǜ": "ǜ",
	"ǖ": "ǖ",
	"ǚ": "ǚ",
	"ũ": "ũ",
	"ṹ": "ṹ",
	"ū": "ū",
	"ṻ": "ṻ",
	"ŭ": "ŭ",
	"ǔ": "ǔ",
	"û": "û",
	"ů": "ů",
	"ű": "ű",
	"ṽ": "ṽ",
	"ẃ": "ẃ",
	"ẁ": "ẁ",
	"ẅ": "ẅ",
	"ŵ": "ŵ",
	"ẇ": "ẇ",
	"ẘ": "ẘ",
	"ẍ": "ẍ",
	"ẋ": "ẋ",
	"ý": "ý",
	"ỳ": "ỳ",
	"ÿ": "ÿ",
	"ỹ": "ỹ",
	"ȳ": "ȳ",
	"ŷ": "ŷ",
	"ẏ": "ẏ",
	"ẙ": "ẙ",
	"ź": "ź",
	"ž": "ž",
	"ẑ": "ẑ",
	"ż": "ż",
	"Á": "Á",
	"À": "À",
	"Ä": "Ä",
	"Ǟ": "Ǟ",
	"Ã": "Ã",
	"Ā": "Ā",
	"Ă": "Ă",
	"Ắ": "Ắ",
	"Ằ": "Ằ",
	"Ẵ": "Ẵ",
	"Ǎ": "Ǎ",
	"Â": "Â",
	"Ấ": "Ấ",
	"Ầ": "Ầ",
	"Ẫ": "Ẫ",
	"Ȧ": "Ȧ",
	"Ǡ": "Ǡ",
	"Å": "Å",
	"Ǻ": "Ǻ",
	"Ḃ": "Ḃ",
	"Ć": "Ć",
	"Ḉ": "Ḉ",
	"Č": "Č",
	"Ĉ": "Ĉ",
	"Ċ": "Ċ",
	"Ç": "Ç",
	"Ď": "Ď",
	"Ḋ": "Ḋ",
	"Ḑ": "Ḑ",
	"É": "É",
	"È": "È",
	"Ë": "Ë",
	"Ẽ": "Ẽ",
	"Ē": "Ē",
	"Ḗ": "Ḗ",
	"Ḕ": "Ḕ",
	"Ĕ": "Ĕ",
	"Ḝ": "Ḝ",
	"Ě": "Ě",
	"Ê": "Ê",
	"Ế": "Ế",
	"Ề": "Ề",
	"Ễ": "Ễ",
	"Ė": "Ė",
	"Ȩ": "Ȩ",
	"Ḟ": "Ḟ",
	"Ǵ": "Ǵ",
	"Ḡ": "Ḡ",
	"Ğ": "Ğ",
	"Ǧ": "Ǧ",
	"Ĝ": "Ĝ",
	"Ġ": "Ġ",
	"Ģ": "Ģ",
	"Ḧ": "Ḧ",
	"Ȟ": "Ȟ",
	"Ĥ": "Ĥ",
	"Ḣ": "Ḣ",
	"Ḩ": "Ḩ",
	"Í": "Í",
	"Ì": "Ì",
	"Ï": "Ï",
	"Ḯ": "Ḯ",
	"Ĩ": "Ĩ",
	"Ī": "Ī",
	"Ĭ": "Ĭ",
	"Ǐ": "Ǐ",
	"Î": "Î",
	"İ": "İ",
	"Ĵ": "Ĵ",
	"Ḱ": "Ḱ",
	"Ǩ": "Ǩ",
	"Ķ": "Ķ",
	"Ĺ": "Ĺ",
	"Ľ": "Ľ",
	"Ļ": "Ļ",
	"Ḿ": "Ḿ",
	"Ṁ": "Ṁ",
	"Ń": "Ń",
	"Ǹ": "Ǹ",
	"Ñ": "Ñ",
	"Ň": "Ň",
	"Ṅ": "Ṅ",
	"Ņ": "Ņ",
	"Ó": "Ó",
	"Ò": "Ò",
	"Ö": "Ö",
	"Ȫ": "Ȫ",
	"Õ": "Õ",
	"Ṍ": "Ṍ",
	"Ṏ": "Ṏ",
	"Ȭ": "Ȭ",
	"Ō": "Ō",
	"Ṓ": "Ṓ",
	"Ṑ": "Ṑ",
	"Ŏ": "Ŏ",
	"Ǒ": "Ǒ",
	"Ô": "Ô",
	"Ố": "Ố",
	"Ồ": "Ồ",
	"Ỗ": "Ỗ",
	"Ȯ": "Ȯ",
	"Ȱ": "Ȱ",
	"Ő": "Ő",
	"Ṕ": "Ṕ",
	"Ṗ": "Ṗ",
	"Ŕ": "Ŕ",
	"Ř": "Ř",
	"Ṙ": "Ṙ",
	"Ŗ": "Ŗ",
	"Ś": "Ś",
	"Ṥ": "Ṥ",
	"Š": "Š",
	"Ṧ": "Ṧ",
	"Ŝ": "Ŝ",
	"Ṡ": "Ṡ",
	"Ş": "Ş",
	"Ť": "Ť",
	"Ṫ": "Ṫ",
	"Ţ": "Ţ",
	"Ú": "Ú",
	"Ù": "Ù",
	"Ü": "Ü",
	"Ǘ": "Ǘ",
	"Ǜ": "Ǜ",
	"Ǖ": "Ǖ",
	"Ǚ": "Ǚ",
	"Ũ": "Ũ",
	"Ṹ": "Ṹ",
	"Ū": "Ū",
	"Ṻ": "Ṻ",
	"Ŭ": "Ŭ",
	"Ǔ": "Ǔ",
	"Û": "Û",
	"Ů": "Ů",
	"Ű": "Ű",
	"Ṽ": "Ṽ",
	"Ẃ": "Ẃ",
	"Ẁ": "Ẁ",
	"Ẅ": "Ẅ",
	"Ŵ": "Ŵ",
	"Ẇ": "Ẇ",
	"Ẍ": "Ẍ",
	"Ẋ": "Ẋ",
	"Ý": "Ý",
	"Ỳ": "Ỳ",
	"Ÿ": "Ÿ",
	"Ỹ": "Ỹ",
	"Ȳ": "Ȳ",
	"Ŷ": "Ŷ",
	"Ẏ": "Ẏ",
	"Ź": "Ź",
	"Ž": "Ž",
	"Ẑ": "Ẑ",
	"Ż": "Ż",
	"ά": "ά",
	"ὰ": "ὰ",
	"ᾱ": "ᾱ",
	"ᾰ": "ᾰ",
	"έ": "έ",
	"ὲ": "ὲ",
	"ή": "ή",
	"ὴ": "ὴ",
	"ί": "ί",
	"ὶ": "ὶ",
	"ϊ": "ϊ",
	"ΐ": "ΐ",
	"ῒ": "ῒ",
	"ῑ": "ῑ",
	"ῐ": "ῐ",
	"ό": "ό",
	"ὸ": "ὸ",
	"ύ": "ύ",
	"ὺ": "ὺ",
	"ϋ": "ϋ",
	"ΰ": "ΰ",
	"ῢ": "ῢ",
	"ῡ": "ῡ",
	"ῠ": "ῠ",
	"ώ": "ώ",
	"ὼ": "ὼ",
	"Ύ": "Ύ",
	"Ὺ": "Ὺ",
	"Ϋ": "Ϋ",
	"Ῡ": "Ῡ",
	"Ῠ": "Ῠ",
	"Ώ": "Ώ",
	"Ὼ": "Ὼ"
};
/**
* This file contains the parser used to parse out a TeX expression from the
* input. Since TeX isn't context-free, standard parsers don't work particularly
* well.
*
* The strategy of this parser is as such:
*
* The main functions (the `.parse...` ones) take a position in the current
* parse string to parse tokens from. The lexer (found in Lexer.js, stored at
* this.gullet.lexer) also supports pulling out tokens at arbitrary places. When
* individual tokens are needed at a position, the lexer is called to pull out a
* token, which is then used.
*
* The parser has a property called "mode" indicating the mode that
* the parser is currently in. Currently it has to be one of "math" or
* "text", which denotes whether the current environment is a math-y
* one or a text-y one (e.g. inside \text). Currently, this serves to
* limit the functions which can be used in text mode.
*
* The main functions then return an object which contains the useful data that
* was parsed at its given point, and a new position at the end of the parsed
* data. The main functions can call each other and continue the parsing by
* using the returned position as a new starting point.
*
* There are also extra `.handle...` functions, which pull out some reused
* functionality into self-contained functions.
*
* The functions return ParseNodes.
*/
var Parser = class Parser {
	constructor(input, settings) {
		this.mode = void 0;
		this.gullet = void 0;
		this.settings = void 0;
		this.leftrightDepth = void 0;
		this.nextToken = void 0;
		this.mode = "math";
		this.gullet = new MacroExpander(input, settings, this.mode);
		this.settings = settings;
		this.leftrightDepth = 0;
		this.nextToken = null;
	}
	/**
	* Checks a result to make sure it has the right type, and throws an
	* appropriate error otherwise.
	*/
	expect(text, consume) {
		if (consume === void 0) consume = true;
		if (this.fetch().text !== text) throw new ParseError("Expected '" + text + "', got '" + this.fetch().text + "'", this.fetch());
		if (consume) this.consume();
	}
	/**
	* Discards the current lookahead token, considering it consumed.
	*/
	consume() {
		this.nextToken = null;
	}
	/**
	* Return the current lookahead token, or if there isn't one (at the
	* beginning, or if the previous lookahead token was consume()d),
	* fetch the next token as the new lookahead token and return it.
	*/
	fetch() {
		if (this.nextToken == null) this.nextToken = this.gullet.expandNextToken();
		return this.nextToken;
	}
	/**
	* Switches between "text" and "math" modes.
	*/
	switchMode(newMode) {
		this.mode = newMode;
		this.gullet.switchMode(newMode);
	}
	/**
	* Main parsing function, which parses an entire input.
	*/
	parse() {
		if (!this.settings.globalGroup) this.gullet.beginGroup();
		if (this.settings.colorIsTextColor) this.gullet.macros.set("\\color", "\\textcolor");
		try {
			var parse = this.parseExpression(false);
			this.expect("EOF");
			if (!this.settings.globalGroup) this.gullet.endGroup();
			return parse;
		} finally {
			this.gullet.endGroups();
		}
	}
	/**
	* Fully parse a separate sequence of tokens as a separate job.
	* Tokens should be specified in reverse order, as in a MacroDefinition.
	*/
	subparse(tokens) {
		var oldToken = this.nextToken;
		this.consume();
		this.gullet.pushToken(new Token("}"));
		this.gullet.pushTokens(tokens);
		var parse = this.parseExpression(false);
		this.expect("}");
		this.nextToken = oldToken;
		return parse;
	}
	/**
	* Parses an "expression", which is a list of atoms.
	*
	* `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
	*                 happens when functions have higher precedence than infix
	*                 nodes in implicit parses.
	*
	* `breakOnTokenText`: The text of the token that the expression should end
	*                     with, or `null` if something else should end the
	*                     expression.
	*/
	parseExpression(breakOnInfix, breakOnTokenText) {
		var body = [];
		while (true) {
			if (this.mode === "math") this.consumeSpaces();
			var lex = this.fetch();
			if (Parser.endOfExpression.has(lex.text)) break;
			if (breakOnTokenText && lex.text === breakOnTokenText) break;
			if (breakOnInfix && functions[lex.text] && functions[lex.text].infix) break;
			var atom = this.parseAtom(breakOnTokenText);
			if (!atom) break;
			else if (atom.type === "internal") continue;
			body.push(atom);
		}
		if (this.mode === "text") this.formLigatures(body);
		return this.handleInfixNodes(body);
	}
	/**
	* Rewrites infix operators such as \over with corresponding commands such
	* as \frac.
	*
	* There can only be one infix operator per group.  If there's more than one
	* then the expression is ambiguous.  This can be resolved by adding {}.
	*/
	handleInfixNodes(body) {
		var overIndex = -1;
		var funcName;
		for (var i = 0; i < body.length; i++) {
			var node = body[i];
			if (node.type === "infix") {
				if (overIndex !== -1) throw new ParseError("only one infix operator per group", node.token);
				overIndex = i;
				funcName = node.replaceWith;
			}
		}
		if (overIndex !== -1 && funcName) {
			var numerNode;
			var denomNode;
			var numerBody = body.slice(0, overIndex);
			var denomBody = body.slice(overIndex + 1);
			if (numerBody.length === 1 && numerBody[0].type === "ordgroup") numerNode = numerBody[0];
			else numerNode = {
				type: "ordgroup",
				mode: this.mode,
				body: numerBody
			};
			if (denomBody.length === 1 && denomBody[0].type === "ordgroup") denomNode = denomBody[0];
			else denomNode = {
				type: "ordgroup",
				mode: this.mode,
				body: denomBody
			};
			var _node;
			if (funcName === "\\\\abovefrac") _node = this.callFunction(funcName, [
				numerNode,
				body[overIndex],
				denomNode
			], []);
			else _node = this.callFunction(funcName, [numerNode, denomNode], []);
			return [_node];
		} else return body;
	}
	/**
	* Handle a subscript or superscript with nice errors.
	*/
	handleSupSubscript(name) {
		var symbolToken = this.fetch();
		var symbol = symbolToken.text;
		this.consume();
		this.consumeSpaces();
		var group;
		do {
			var _group;
			group = this.parseGroup(name);
		} while (((_group = group) == null ? void 0 : _group.type) === "internal");
		if (!group) throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
		return group;
	}
	/**
	* Converts the textual input of an unsupported command into a text node
	* contained within a color node whose color is determined by errorColor
	*/
	formatUnsupportedCmd(text) {
		var textordArray = [];
		for (var i = 0; i < text.length; i++) textordArray.push({
			type: "textord",
			mode: "text",
			text: text[i]
		});
		var textNode = {
			type: "text",
			mode: this.mode,
			body: textordArray
		};
		return {
			type: "color",
			mode: this.mode,
			color: this.settings.errorColor,
			body: [textNode]
		};
	}
	/**
	* Parses a group with optional super/subscripts.
	*/
	parseAtom(breakOnTokenText) {
		var base = this.parseGroup("atom", breakOnTokenText);
		if ((base == null ? void 0 : base.type) === "internal") return base;
		if (this.mode === "text") return base;
		var superscript;
		var subscript;
		while (true) {
			this.consumeSpaces();
			var lex = this.fetch();
			if (lex.text === "\\limits" || lex.text === "\\nolimits") {
				if (base && base.type === "op") {
					base.limits = lex.text === "\\limits";
					base.alwaysHandleSupSub = true;
				} else if (base && base.type === "operatorname") {
					if (base.alwaysHandleSupSub) base.limits = lex.text === "\\limits";
				} else throw new ParseError("Limit controls must follow a math operator", lex);
				this.consume();
			} else if (lex.text === "^") {
				if (superscript) throw new ParseError("Double superscript", lex);
				superscript = this.handleSupSubscript("superscript");
			} else if (lex.text === "_") {
				if (subscript) throw new ParseError("Double subscript", lex);
				subscript = this.handleSupSubscript("subscript");
			} else if (lex.text === "'") {
				if (superscript) throw new ParseError("Double superscript", lex);
				var prime = {
					type: "textord",
					mode: this.mode,
					text: "\\prime"
				};
				var primes = [prime];
				this.consume();
				while (this.fetch().text === "'") {
					primes.push(prime);
					this.consume();
				}
				if (this.fetch().text === "^") primes.push(this.handleSupSubscript("superscript"));
				superscript = {
					type: "ordgroup",
					mode: this.mode,
					body: primes
				};
			} else if (uSubsAndSups[lex.text]) {
				var isSub = unicodeSubRegEx.test(lex.text);
				var subsupTokens = [];
				subsupTokens.push(new Token(uSubsAndSups[lex.text]));
				this.consume();
				while (true) {
					var token = this.fetch().text;
					if (!uSubsAndSups[token]) break;
					if (unicodeSubRegEx.test(token) !== isSub) break;
					subsupTokens.unshift(new Token(uSubsAndSups[token]));
					this.consume();
				}
				var body = this.subparse(subsupTokens);
				if (isSub) subscript = {
					type: "ordgroup",
					mode: "math",
					body
				};
				else superscript = {
					type: "ordgroup",
					mode: "math",
					body
				};
			} else break;
		}
		if (superscript && subscript) return {
			type: "supsub",
			mode: this.mode,
			base,
			sup: superscript,
			sub: subscript
		};
		else if (superscript) return {
			type: "supsub",
			mode: this.mode,
			base,
			sup: superscript
		};
		else if (subscript) return {
			type: "supsub",
			mode: this.mode,
			base,
			sub: subscript
		};
		else return base;
	}
	/**
	* Parses an entire function, including its base and all of its arguments.
	*/
	parseFunction(breakOnTokenText, name) {
		var token = this.fetch();
		var func = token.text;
		var funcData = functions[func];
		if (!funcData) return null;
		this.consume();
		if (name && name !== "atom" && !funcData.allowedInArgument) throw new ParseError("Got function '" + func + "' with no arguments" + (name ? " as " + name : ""), token);
		else if (this.mode === "text" && !funcData.allowedInText) throw new ParseError("Can't use function '" + func + "' in text mode", token);
		else if (this.mode === "math" && funcData.allowedInMath === false) throw new ParseError("Can't use function '" + func + "' in math mode", token);
		var _this$parseArguments = this.parseArguments(func, funcData), args = _this$parseArguments.args, optArgs = _this$parseArguments.optArgs;
		return this.callFunction(func, args, optArgs, token, breakOnTokenText);
	}
	/**
	* Call a function handler with a suitable context and arguments.
	*/
	callFunction(name, args, optArgs, token, breakOnTokenText) {
		var context = {
			funcName: name,
			parser: this,
			token,
			breakOnTokenText
		};
		var func = functions[name];
		if (func && func.handler) return func.handler(context, args, optArgs);
		else throw new ParseError("No function handler for " + name);
	}
	/**
	* Parses the arguments of a function or environment
	*/
	parseArguments(func, funcData) {
		var _funcData$numOptional;
		var numOptionalArgs = (_funcData$numOptional = funcData.numOptionalArgs) != null ? _funcData$numOptional : 0;
		var totalArgs = funcData.numArgs + numOptionalArgs;
		if (totalArgs === 0) return {
			args: [],
			optArgs: []
		};
		var args = [];
		var optArgs = [];
		for (var i = 0; i < totalArgs; i++) {
			var _funcData$argTypes;
			var argType = (_funcData$argTypes = funcData.argTypes) == null ? void 0 : _funcData$argTypes[i];
			var isOptional = i < numOptionalArgs;
			if ("primitive" in funcData && funcData.primitive && argType == null || funcData.type === "sqrt" && i === 1 && optArgs[0] == null) argType = "primitive";
			var arg = this.parseGroupOfType("argument to '" + func + "'", argType, isOptional);
			if (isOptional) optArgs.push(arg);
			else if (arg != null) args.push(arg);
			else throw new ParseError("Null argument, please report this as a bug");
		}
		return {
			args,
			optArgs
		};
	}
	/**
	* Parses a group when the mode is changing.
	*/
	parseGroupOfType(name, type, optional) {
		switch (type) {
			case "color": return this.parseColorGroup(optional);
			case "size": return this.parseSizeGroup(optional);
			case "url": return this.parseUrlGroup(optional);
			case "math":
			case "text": return this.parseArgumentGroup(optional, type);
			case "hbox":
				var group = this.parseArgumentGroup(optional, "text");
				return group != null ? {
					type: "styling",
					mode: group.mode,
					body: [group],
					style: "text",
					resetFont: true
				} : null;
			case "raw":
				var token = this.parseStringGroup(optional);
				return token != null ? {
					type: "raw",
					mode: "text",
					string: token.text
				} : null;
			case "primitive":
				if (optional) throw new ParseError("A primitive argument cannot be optional");
				var _group2 = this.parseGroup(name);
				if (_group2 == null) throw new ParseError("Expected group as " + name, this.fetch());
				return _group2;
			case "original":
			case void 0: return this.parseArgumentGroup(optional);
			default: throw new ParseError("Unknown group type as " + name, this.fetch());
		}
	}
	/**
	* Discard any space tokens, fetching the next non-space token.
	*/
	consumeSpaces() {
		while (this.fetch().text === " ") this.consume();
	}
	/**
	* Parses a group, essentially returning the string formed by the
	* brace-enclosed tokens plus some position information.
	*/
	parseStringGroup(optional) {
		var argToken = this.gullet.scanArgument(optional);
		if (argToken == null) return null;
		var str = "";
		var nextToken;
		while ((nextToken = this.fetch()).text !== "EOF") {
			str += nextToken.text;
			this.consume();
		}
		this.consume();
		argToken.text = str;
		return argToken;
	}
	/**
	* Parses a regex-delimited group: the largest sequence of tokens
	* whose concatenated strings match `regex`. Returns the string
	* formed by the tokens plus some position information.
	*/
	parseRegexGroup(regex, modeName) {
		var firstToken = this.fetch();
		var lastToken = firstToken;
		var str = "";
		var nextToken;
		while ((nextToken = this.fetch()).text !== "EOF" && regex.test(str + nextToken.text)) {
			lastToken = nextToken;
			str += lastToken.text;
			this.consume();
		}
		if (str === "") throw new ParseError("Invalid " + modeName + ": '" + firstToken.text + "'", firstToken);
		return firstToken.range(lastToken, str);
	}
	/**
	* Parses a color description.
	*/
	parseColorGroup(optional) {
		var res = this.parseStringGroup(optional);
		if (res == null) return null;
		var match = /^(#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-f0-9]{6}|[a-z]+)$/i.exec(res.text);
		if (!match) throw new ParseError("Invalid color: '" + res.text + "'", res);
		var color = match[0];
		if (/^[0-9a-f]{6}$/i.test(color)) color = "#" + color;
		return {
			type: "color-token",
			mode: this.mode,
			color
		};
	}
	/**
	* Parses a size specification, consisting of magnitude and unit.
	*/
	parseSizeGroup(optional) {
		var res;
		var isBlank = false;
		this.gullet.consumeSpaces();
		if (!optional && this.gullet.future().text !== "{") res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size");
		else res = this.parseStringGroup(optional);
		if (!res) return null;
		if (!optional && res.text.length === 0) {
			res.text = "0pt";
			isBlank = true;
		}
		var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(res.text);
		if (!match) throw new ParseError("Invalid size: '" + res.text + "'", res);
		var data = {
			number: +(match[1] + match[2]),
			unit: match[3]
		};
		if (!validUnit(data)) throw new ParseError("Invalid unit: '" + data.unit + "'", res);
		return {
			type: "size",
			mode: this.mode,
			value: data,
			isBlank
		};
	}
	/**
	* Parses an URL, checking escaped letters and allowed protocols,
	* and setting the catcode of % as an active character (as in \hyperref).
	*/
	parseUrlGroup(optional) {
		this.gullet.lexer.setCatcode("%", 13);
		this.gullet.lexer.setCatcode("~", 12);
		var res = this.parseStringGroup(optional);
		this.gullet.lexer.setCatcode("%", 14);
		this.gullet.lexer.setCatcode("~", 13);
		if (res == null) return null;
		var url = res.text.replace(/\\([#$%&~_^{}])/g, "$1");
		return {
			type: "url",
			mode: this.mode,
			url
		};
	}
	/**
	* Parses an argument with the mode specified.
	*/
	parseArgumentGroup(optional, mode) {
		var argToken = this.gullet.scanArgument(optional);
		if (argToken == null) return null;
		var outerMode = this.mode;
		if (mode) this.switchMode(mode);
		this.gullet.beginGroup();
		var expression = this.parseExpression(false, "EOF");
		this.expect("EOF");
		this.gullet.endGroup();
		var result = {
			type: "ordgroup",
			mode: this.mode,
			loc: argToken.loc,
			body: expression
		};
		if (mode) this.switchMode(outerMode);
		return result;
	}
	/**
	* Parses an ordinary group, which is either a single nucleus (like "x")
	* or an expression in braces (like "{x+y}") or an implicit group, a group
	* that starts at the current position, and ends right before a higher explicit
	* group ends, or at EOF.
	*/
	parseGroup(name, breakOnTokenText) {
		var firstToken = this.fetch();
		var text = firstToken.text;
		var result;
		if (text === "{" || text === "\\begingroup") {
			this.consume();
			var groupEnd = text === "{" ? "}" : "\\endgroup";
			this.gullet.beginGroup();
			var expression = this.parseExpression(false, groupEnd);
			var lastToken = this.fetch();
			this.expect(groupEnd);
			this.gullet.endGroup();
			result = {
				type: "ordgroup",
				mode: this.mode,
				loc: SourceLocation.range(firstToken, lastToken),
				body: expression,
				semisimple: text === "\\begingroup" || void 0
			};
		} else {
			result = this.parseFunction(breakOnTokenText, name) || this.parseSymbol();
			if (result == null && text[0] === "\\" && !Object.prototype.hasOwnProperty.call(implicitCommands, text)) {
				if (this.settings.throwOnError) throw new ParseError("Undefined control sequence: " + text, firstToken);
				result = this.formatUnsupportedCmd(text);
				this.consume();
			}
		}
		return result;
	}
	/**
	* Form ligature-like combinations of characters for text mode.
	* This includes inputs like "--", "---", "``" and "''".
	* The result will simply replace multiple textord nodes with a single
	* character in each value by a single textord node having multiple
	* characters in its value.  The representation is still ASCII source.
	* The group will be modified in place.
	*/
	formLigatures(group) {
		var n = group.length - 1;
		for (var i = 0; i < n; ++i) {
			var a = group[i];
			if (a.type !== "textord") continue;
			var v = a.text;
			var next = group[i + 1];
			if (!next || next.type !== "textord") continue;
			if (v === "-" && next.text === "-") {
				var afterNext = group[i + 2];
				if (i + 1 < n && afterNext && afterNext.type === "textord" && afterNext.text === "-") {
					group.splice(i, 3, {
						type: "textord",
						mode: "text",
						loc: SourceLocation.range(a, afterNext),
						text: "---"
					});
					n -= 2;
				} else {
					group.splice(i, 2, {
						type: "textord",
						mode: "text",
						loc: SourceLocation.range(a, next),
						text: "--"
					});
					n -= 1;
				}
			}
			if ((v === "'" || v === "`") && next.text === v) {
				group.splice(i, 2, {
					type: "textord",
					mode: "text",
					loc: SourceLocation.range(a, next),
					text: v + v
				});
				n -= 1;
			}
		}
	}
	/**
	* Parse a single symbol out of the string. Here, we handle single character
	* symbols and special functions like \verb.
	*/
	parseSymbol() {
		var nucleus = this.fetch();
		var text = nucleus.text;
		if (/^\\verb[^a-zA-Z]/.test(text)) {
			this.consume();
			var arg = text.slice(5);
			var star = arg.charAt(0) === "*";
			if (star) arg = arg.slice(1);
			if (arg.length < 2 || arg.charAt(0) !== arg.slice(-1)) throw new ParseError("\\verb assertion failed --\n                    please report what input caused this bug");
			arg = arg.slice(1, -1);
			return {
				type: "verb",
				mode: "text",
				body: arg,
				star
			};
		}
		if (Object.prototype.hasOwnProperty.call(unicodeSymbols, text[0]) && !symbols[this.mode][text[0]]) {
			if (this.settings.strict && this.mode === "math") this.settings.reportNonstrict("unicodeTextInMathMode", "Accented Unicode text character \"" + text[0] + "\" used in math mode", nucleus);
			text = unicodeSymbols[text[0]] + text.slice(1);
		}
		var match = combiningDiacriticalMarksEndRegex.exec(text);
		if (match) {
			text = text.substring(0, match.index);
			if (text === "i") text = "ı";
			else if (text === "j") text = "ȷ";
		}
		var symbol;
		if (symbols[this.mode][text]) {
			if (this.settings.strict && this.mode === "math" && extraLatin.includes(text)) this.settings.reportNonstrict("unicodeTextInMathMode", "Latin-1/Unicode text character \"" + text[0] + "\" used in math mode", nucleus);
			var group = symbols[this.mode][text].group;
			var loc = SourceLocation.range(nucleus);
			var s;
			if (isAtom(group)) s = {
				type: "atom",
				mode: this.mode,
				family: group,
				loc,
				text
			};
			else s = {
				type: group,
				mode: this.mode,
				loc,
				text
			};
			symbol = s;
		} else if (text.charCodeAt(0) >= 128) {
			if (this.settings.strict) {
				if (!supportedCodepoint(text.charCodeAt(0))) this.settings.reportNonstrict("unknownSymbol", "Unrecognized Unicode character \"" + text[0] + "\"" + (" (" + text.charCodeAt(0) + ")"), nucleus);
				else if (this.mode === "math") this.settings.reportNonstrict("unicodeTextInMathMode", "Unicode text character \"" + text[0] + "\" used in math mode", nucleus);
			}
			symbol = {
				type: "textord",
				mode: "text",
				loc: SourceLocation.range(nucleus),
				text
			};
		} else return null;
		this.consume();
		if (match) for (var i = 0; i < match[0].length; i++) {
			var accent = match[0][i];
			if (!unicodeAccents[accent]) throw new ParseError("Unknown accent ' " + accent + "'", nucleus);
			var command = unicodeAccents[accent][this.mode] || unicodeAccents[accent].text;
			if (!command) throw new ParseError("Accent " + accent + " unsupported in " + this.mode + " mode", nucleus);
			symbol = {
				type: "accent",
				mode: this.mode,
				loc: SourceLocation.range(nucleus),
				label: command,
				isStretchy: false,
				isShifty: true,
				base: symbol
			};
		}
		return symbol;
	}
};
Parser.endOfExpression = /* @__PURE__ */ new Set([
	"}",
	"\\endgroup",
	"\\end",
	"\\right",
	"&"
]);
/**
* Parses an expression using a Parser, then returns the parsed result.
*/
var parseTree = function parseTree(toParse, settings) {
	if (!(typeof toParse === "string" || toParse instanceof String)) throw new TypeError("KaTeX can only parse string typed expression");
	var parser = new Parser(toParse, settings);
	delete parser.gullet.macros.current["\\df@tag"];
	var tree = parser.parse();
	delete parser.gullet.macros.current["\\current@color"];
	delete parser.gullet.macros.current["\\color"];
	if (parser.gullet.macros.get("\\df@tag")) {
		if (!settings.displayMode) throw new ParseError("\\tag works only in display equations");
		tree = [{
			type: "tag",
			mode: "text",
			body: tree,
			tag: parser.subparse([new Token("\\df@tag")])
		}];
	}
	return tree;
};
/**
* Parse and build an expression, and place that expression in the DOM node
* given.
*/
var render$1 = function render(expression, baseNode, options) {
	baseNode.textContent = "";
	var node = renderToDomTree(expression, options).toNode();
	baseNode.appendChild(node);
};
if (typeof document !== "undefined") {
	if (document.compatMode !== "CSS1Compat") {
		typeof console !== "undefined" && console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype.");
		render$1 = function render() {
			throw new ParseError("KaTeX doesn't work in quirks mode.");
		};
	}
}
/**
* Parse and build an expression, and return the markup for that.
*/
var renderToString = function renderToString(expression, options) {
	return renderToDomTree(expression, options).toMarkup();
};
/**
* Parse an expression and return the parse tree.
*/
var generateParseTree = function generateParseTree(expression, options) {
	return parseTree(expression, new Settings(options));
};
/**
* If the given error is a KaTeX ParseError and options.throwOnError is false,
* renders the invalid LaTeX as a span with hover title giving the KaTeX
* error message.  Otherwise, simply throws the error.
*/
var renderError = function renderError(error, expression, options) {
	if (options.throwOnError || !(error instanceof ParseError)) throw error;
	var node = makeSpan(["katex-error"], [new SymbolNode(expression)]);
	node.setAttribute("title", error.toString());
	node.setAttribute("style", "color:" + options.errorColor);
	return node;
};
/**
* Generates and returns the katex build tree. This is used for advanced
* use cases (like rendering to custom output).
*/
var renderToDomTree = function renderToDomTree(expression, options) {
	var settings = new Settings(options);
	try {
		return buildTree(parseTree(expression, settings), expression, settings);
	} catch (error) {
		return renderError(error, expression, settings);
	}
};
var katex = {
	/**
	* Current KaTeX version
	*/
	version: "0.18.5",
	/**
	* Renders the given LaTeX into an HTML+MathML combination, and adds
	* it as a child to the specified DOM node.
	*/
	render: render$1,
	/**
	* Renders the given LaTeX into an HTML+MathML combination string,
	* for sending to the client.
	*/
	renderToString,
	/**
	* KaTeX error, usually during parsing.
	*/
	ParseError,
	/**
	* The schema of Settings
	*/
	SETTINGS_SCHEMA,
	/**
	* Parses the given LaTeX into KaTeX's internal parse tree structure,
	* without rendering to HTML or MathML.
	*
	* NOTE: This method is not currently recommended for public use.
	* The internal tree representation is unstable and is very likely
	* to change. Use at your own risk.
	*/
	__parse: generateParseTree,
	/**
	* Renders the given LaTeX into an HTML+MathML internal DOM tree
	* representation, without flattening that representation to a string.
	*
	* NOTE: This method is not currently recommended for public use.
	* The internal tree representation is unstable and is very likely
	* to change. Use at your own risk.
	*/
	__renderToDomTree: renderToDomTree,
	/**
	* Renders the given LaTeX into an HTML internal DOM tree representation,
	* without MathML and without flattening that representation to a string.
	*
	* NOTE: This method is not currently recommended for public use.
	* The internal tree representation is unstable and is very likely
	* to change. Use at your own risk.
	*/
	__renderToHTMLTree: function renderToHTMLTree(expression, options) {
		var settings = new Settings(options);
		try {
			return buildHTMLTree(parseTree(expression, settings), expression, settings);
		} catch (error) {
			return renderError(error, expression, settings);
		}
	},
	/**
	* extends internal font metrics object with a new object
	* each key in the new object represents a font name
	*/
	__setFontMetrics: setFontMetrics,
	/**
	* adds a new symbol to builtin symbols table
	*/
	__defineSymbol: defineSymbol,
	/**
	* adds a new function to builtin function list,
	* which directly produce parse tree elements
	* and have their own html/mathml builders
	*/
	__defineFunction: defineFunction,
	/**
	* adds a new macro to builtin macro list
	*/
	__defineMacro: defineMacro,
	/**
	* Expose the dom tree node types, which can be useful for type checking nodes.
	*
	* NOTE: These methods are not currently recommended for public use.
	* The internal tree representation is unstable and is very likely
	* to change. Use at your own risk.
	*/
	__domTree: {
		Span,
		Anchor,
		SymbolNode,
		SvgNode,
		PathNode,
		LineNode
	}
};
//#endregion
//#region tools/lib/math.mjs
const OPTS$1 = {
	throwOnError: true,
	strict: "ignore",
	output: "htmlAndMathml"
};
/** One fragment of TeX as HTML; throws with a readable message if it will not parse. */
function tex(src, display) {
	return katex.renderToString(String(src).trim(), {
		...OPTS$1,
		displayMode: !!display
	});
}
//#endregion
//#region tools/lib/paths.mjs
const holdsSpec = (d) => existsSync(join(d, "docs", "create_course.md")) || existsSync(join(d, "courses", "_template")) || existsSync(join(d, "template", "course.yaml"));
function findEngine(from) {
	for (let d = from, up = 0; up < 5; d = dirname(d), up++) if (holdsSpec(d)) return d;
	return resolve(from, "..");
}
/** The folder the running script was installed in (this repo, or the package). */
const ENGINE = findEngine(dirname(fileURLToPath(import.meta.url)));
const here = () => resolve(process.env.INIT_CWD || process.cwd());
const WORKSPACE = process.env.AUTHOR_WORKSPACE ? resolve(process.env.AUTHOR_WORKSPACE) : existsSync(join(ENGINE, "courses")) ? ENGINE : here();
const COURSES$1 = join(WORKSPACE, "courses");
join(WORKSPACE, ".author");
existsSync(join(ENGINE, "courses", "_template")) ? join(ENGINE, "courses", "_template") : join(ENGINE, "template");
existsSync(join(ENGINE, "docs")) && join(ENGINE, "docs");
//#endregion
//#region src/blocks/interactive.js
const INTERACTIVE = ["attempt"];
//#endregion
//#region src/figures/base.js
function esc$1(s) {
	return String(s).replace(/[&<>]/g, function(c) {
		return {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;"
		}[c];
	});
}
var PAL = [
	"var(--hi)",
	"var(--lo)",
	"var(--dc)",
	"var(--hz)"
];
function tone(i) {
	return PAL[i % PAL.length];
}
function attr(o) {
	return Object.keys(o).map(function(k) {
		return k + "=\"" + o[k] + "\"";
	}).join(" ");
}
function txt(x, y, s, cls, anchor) {
	return "<text x=\"" + x + "\" y=\"" + y + "\" class=\"fx-t " + (cls || "") + "\" text-anchor=\"" + (anchor || "middle") + "\">" + esc$1(s) + "</text>";
}
function round(v) {
	var a = Math.abs(v);
	if (a >= 1e3 || a < .01 && a > 0) return v.toExponential(1);
	return String(Math.round(v * 100) / 100);
}
function fmt(f, dflt) {
	if (typeof f === "function") return f;
	if (typeof f === "string") return function(v) {
		return f.replace("{}", function() {
			return dflt(v);
		});
	};
	return dflt;
}
//#endregion
//#region src/figures/axes.js
const MARGIN = {
	l: 56,
	r: 20,
	t: 18,
	b: 44
};
const TICK_FONT = 10;
const MONO_ADVANCE = .6;
const TICK_GAP = 9;
const TITLE_BAND = 20;
/** the tick strings `grid` will draw, so their width can be accounted for */
function tickLabels(domain, ticks = 5, fmt = round) {
	const out = [];
	for (let i = 0; i <= ticks; i++) out.push(String(fmt(domain[0] + (domain[1] - domain[0]) * i / ticks)));
	return out;
}
function leftMargin(labels, ylabel) {
	const widest = Math.max(0, ...labels.map((s) => s.length)) * TICK_FONT * MONO_ADVANCE;
	return Math.max(MARGIN.l, Math.ceil(widest) + TICK_GAP + (ylabel ? TITLE_BAND : 6));
}
/** map a data range onto pixels */
function scale(domain, range) {
	const [d0, d1] = domain, [r0, r1] = range;
	const span = d1 - d0 || 1;
	return (v) => r0 + (v - d0) / span * (r1 - r0);
}
/** `yDomain` is optional only so a caller with no vertical axis can omit it;
*  every chart that draws ticks passes it, and gets a margin that fits them. */
function frame(spec, yDomain, ticks = 5, fmt = round) {
	const w = spec.w || 640, h = spec.h || 320;
	const m = yDomain ? {
		...MARGIN,
		l: leftMargin(tickLabels(yDomain, ticks, fmt), spec.ylabel)
	} : MARGIN;
	return {
		w,
		h,
		m,
		iw: w - m.l - m.r,
		ih: h - m.t - m.b
	};
}
/** horizontal gridlines with value labels, plus the two axis rules */
function grid$1(f, yDomain, ticks = 5, fmt = round) {
	const py = scale(yDomain, [f.m.t + f.ih, f.m.t]);
	let out = "";
	for (let i = 0; i <= ticks; i++) {
		const v = yDomain[0] + (yDomain[1] - yDomain[0]) * i / ticks;
		const y = py(v);
		out += `<line x1="${f.m.l}" y1="${y}" x2="${f.w - f.m.r}" y2="${y}" class="fx-g"/>`;
		out += txt(f.m.l - 9, y + 4, fmt(v), "fx-ax", "end");
	}
	out += `<line x1="${f.m.l}" y1="${f.m.t + f.ih}" x2="${f.w - f.m.r}" y2="${f.m.t + f.ih}" class="fx-ax-l"/>`;
	out += `<line x1="${f.m.l}" y1="${f.m.t}" x2="${f.m.l}" y2="${f.m.t + f.ih}" class="fx-ax-l"/>`;
	return out;
}
/** value labels along the horizontal axis, matching the vertical ones */
function xTicks(f, xDomain, ticks = 5, fmt = round) {
	let out = "";
	const px = scale(xDomain, [f.m.l, f.w - f.m.r]);
	for (let i = 0; i <= ticks; i++) {
		const v = xDomain[0] + (xDomain[1] - xDomain[0]) * i / ticks;
		out += txt(px(v), f.m.t + f.ih + 18, fmt(v), "fx-ax");
	}
	return out;
}
function axisLabels(f, spec) {
	let out = "";
	if (spec.xlabel) out += txt(f.m.l + f.iw / 2, f.h - 6, spec.xlabel, "fx-al");
	if (spec.ylabel) out += `<text transform="translate(14,${f.m.t + f.ih / 2}) rotate(-90)" class="fx-t fx-al" text-anchor="middle">${esc$1(spec.ylabel)}</text>`;
	return out;
}
function legend(items, tone) {
	if (items.length < 2) return "";
	return `<div class="fx-leg">` + items.map((l, i) => `<span><i style="background:${tone(i)}"></i>${esc$1(l)}</span>`).join("") + `</div>`;
}
/** pad a domain so marks do not sit on the frame */
function padded(values, pad = .08) {
	let lo = Math.min(...values), hi = Math.max(...values);
	if (lo === hi) {
		lo -= 1;
		hi += 1;
	}
	const d = (hi - lo) * pad;
	return [lo - d, hi + d];
}
//#endregion
//#region src/figures/bar.js
function bar(spec) {
	const bars = spec.bars || [];
	if (!bars.length) return "";
	const values = bars.map((b) => Number(b.value) || 0);
	const top = spec.max != null ? spec.max : Math.max(...values, 0);
	const base = spec.baseline != null ? spec.baseline : Math.min(0, ...values);
	const dom = [base, top === base ? base + 1 : top];
	const f = frame(spec, dom, spec.ticks || 5);
	const py = scale(dom, [f.m.t + f.ih, f.m.t]);
	const label = fmt(spec.valueFmt, String);
	const slot = f.iw / bars.length;
	const bw = Math.min(slot * .62, 74);
	const wide = bars.length > 12 || f.w > 720;
	let out = `<svg viewBox="0 0 ${f.w} ${f.h}" class="fx"` + (wide ? ` style="min-width:${Math.min(Math.round(f.w), 760)}px"` : ``) + ` role="img">`;
	out += grid$1(f, dom, spec.ticks || 5);
	const labelLines = (s) => {
		s = String(s == null ? "" : s);
		const cap = Math.max(6, Math.floor(slot / 6.4));
		if (s.length <= cap || !s.includes(" ")) return [s];
		const w = s.split(/\s+/), mid = Math.ceil(w.length / 2);
		return [w.slice(0, mid).join(" "), w.slice(mid).join(" ")];
	};
	bars.forEach((b, i) => {
		const v = Number(b.value) || 0;
		const x = f.m.l + slot * i + (slot - bw) / 2;
		const y = py(v), y0 = py(dom[0]);
		out += `<rect x="${x.toFixed(1)}" y="${Math.min(y, y0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y0 - y).toFixed(1)}" rx="2" class="fx-bar" style="fill:${tone(b.accent != null ? b.accent : i)}"/>`;
		out += txt(x + bw / 2, y - 7, label(v), "fx-el");
		labelLines(b.label).forEach((ln, li) => {
			out += txt(x + bw / 2, f.m.t + f.ih + 17 + li * 11, ln, "fx-ax");
		});
	});
	out += axisLabels(f, spec);
	return out + "</svg>";
}
//#endregion
//#region src/figures/flow.js
function flow(spec) {
	var steps = spec.steps || [];
	return "<ol class=\"fx-flow is-" + (spec.dir === "col" ? "col" : "row") + "\">" + steps.map(function(s, i) {
		return "<li class=\"fx-step\"><span class=\"fx-si\">" + (i + 1) + "</span><span class=\"fx-sl\">" + esc$1(s.label) + "</span>" + (s.note ? "<span class=\"fx-sn\">" + esc$1(s.note) + "</span>" : "") + "</li>";
	}).join("") + "</ol>";
}
//#endregion
//#region src/figures/graph.js
function graph(spec) {
	var nodes = spec.nodes || [], edges = spec.edges || [], layout = spec.layout || (nodes.length > 5 ? "layered" : "circle"), r = spec.r || 27, W = spec.w || 640, H = spec.h || (layout === "row" ? 150 : layout === "circle" ? 360 : 320), pos = {};
	var SIZES = [
		11,
		10,
		9,
		8
	];
	var GROW = spec.grow || 1.7;
	function words(raw) {
		return String(raw == null ? "" : raw).replace(/\n/g, " ").split(/\s+/).filter(Boolean);
	}
	function wrap(ws, maxW, cw) {
		var lines = [], cur = "";
		ws.forEach(function(w) {
			var cand = cur ? cur + " " + w : w;
			if (!cur || cand.length * cw <= maxW) cur = cand;
			else {
				lines.push(cur);
				cur = w;
			}
		});
		if (cur) lines.push(cur);
		return lines;
	}
	var widest = function(lines, cw) {
		return lines.reduce(function(m, t) {
			return Math.max(m, t.length);
		}, 0) * cw;
	};
	function fit(raw, base) {
		var ws = words(raw);
		if (!ws.length) ws = [""];
		for (var s = 0; s < SIZES.length; s++) {
			var fs = SIZES[s], cw = fs * .6, maxW = 2 * (base - 4);
			var lines = wrap(ws, maxW, cw);
			var longest = widest(lines, cw);
			var textH = lines.length * (fs + 2);
			if (longest <= maxW && textH <= maxW || s === SIZES.length - 1) {
				var need = Math.max(longest / 2 + 6, textH / 2 + 4);
				var lim = s === SIZES.length - 1 ? Math.max(base * GROW, need) : base * GROW;
				return {
					lines,
					fs,
					lh: fs + 2,
					rEff: Math.round(Math.min(lim, Math.max(base, need)))
				};
			}
		}
	}
	var FI = {};
	nodes.forEach(function(n) {
		FI[n.id] = fit(n.label == null ? n.id : n.label, r);
	});
	var radOf = function(id) {
		return (FI[id] || { rEff: r }).rEff;
	};
	var maxR = nodes.reduce(function(m, n) {
		return Math.max(m, radOf(n.id));
	}, r);
	var NFS = 10, NCW = NFS * .6, NLH = 12, NPAD = 5, NGAP = 6;
	function fitNote(raw, base) {
		var ws = words(raw);
		if (!ws.length) return null;
		var lines = wrap(ws, Math.max(2 * base + 30, 132), NCW);
		return {
			lines,
			w: Math.round(widest(lines, NCW)) + 2 * NPAD,
			h: 2 * NPAD + lines.length * NLH
		};
	}
	var NI = {};
	nodes.forEach(function(n) {
		if (n.note) NI[n.id] = fitNote(n.note, radOf(n.id));
	});
	var noteW = function(id) {
		return NI[id] ? NI[id].w : 0;
	};
	var noteH = function(id) {
		return NI[id] ? NI[id].h + NGAP : 0;
	};
	var spanOf = function(id) {
		return Math.max(2 * radOf(id), noteW(id));
	};
	var maxSpan = nodes.reduce(function(m, n) {
		return Math.max(m, spanOf(n.id));
	}, 2 * r);
	var maxNoteH = nodes.reduce(function(m, n) {
		return Math.max(m, noteH(n.id));
	}, 0);
	if (layout === "manual") nodes.forEach(function(n) {
		pos[n.id] = {
			x: n.x,
			y: n.y
		};
	});
	else if (layout === "row") {
		W = Math.max(W, nodes.length * (maxSpan + 26) + 40);
		var gap = W / (nodes.length + 1);
		nodes.forEach(function(n, k) {
			pos[n.id] = {
				x: gap * (k + 1),
				y: H / 2
			};
		});
	} else if (layout === "layered") {
		var indeg = {}, adj = {};
		nodes.forEach(function(n) {
			indeg[n.id] = 0;
			adj[n.id] = [];
		});
		edges.forEach(function(e) {
			if (e.from === e.to || !(e.to in indeg)) return;
			indeg[e.to]++;
			if (adj[e.from]) adj[e.from].push(e.to);
		});
		var layer = {}, queue = nodes.filter(function(n) {
			return !indeg[n.id];
		}).map(function(n) {
			return n.id;
		});
		nodes.forEach(function(n) {
			layer[n.id] = 0;
		});
		if (!queue.length && nodes.length) queue = [nodes[0].id];
		var guard = 0;
		while (queue.length && guard++ < 5e3) {
			var id = queue.shift();
			(adj[id] || []).forEach(function(t) {
				if (layer[t] < layer[id] + 1) {
					layer[t] = layer[id] + 1;
					queue.push(t);
				}
			});
		}
		var touched = {};
		edges.forEach(function(e) {
			if (e.from === e.to) return;
			if (e.from in indeg) touched[e.from] = 1;
			if (e.to in indeg) touched[e.to] = 1;
		});
		var loose = nodes.filter(function(n) {
			return !touched[n.id];
		});
		var flow = nodes.filter(function(n) {
			return touched[n.id];
		});
		var byL = {};
		flow.forEach(function(n) {
			(byL[layer[n.id]] = byL[layer[n.id]] || []).push(n.id);
		});
		if (!Object.keys(byL).length) byL[0] = [];
		var pred = {}, succ = {}, idx = {};
		nodes.forEach(function(n) {
			pred[n.id] = [];
			succ[n.id] = [];
		});
		edges.forEach(function(e) {
			if (e.from === e.to || !(e.to in layer) || !(e.from in layer)) return;
			succ[e.from].push(e.to);
			pred[e.to].push(e.from);
		});
		var lkeys = Object.keys(byL).map(Number).sort(function(a, b) {
			return a - b;
		});
		var reindex = function() {
			lkeys.forEach(function(k) {
				byL[k].forEach(function(id, j) {
					idx[id] = j;
				});
			});
		};
		var bary = function(id, rel) {
			var ns = rel[id] || [], s = 0;
			if (!ns.length) return idx[id];
			ns.forEach(function(m) {
				s += idx[m];
			});
			return s / ns.length;
		};
		reindex();
		for (var sw = 0; sw < 6; sw++) {
			var rel = sw % 2 ? succ : pred;
			(sw % 2 ? lkeys.slice().reverse() : lkeys).forEach(function(k) {
				byL[k] = byL[k].slice().sort(function(a, b) {
					return bary(a, rel) - bary(b, rel) || idx[a] - idx[b];
				});
			});
			reindex();
		}
		var L = Math.max.apply(null, Object.keys(byL).map(Number)) + 1;
		var pitch = maxR * 2 + 30 + maxNoteH;
		W = Math.max(W, (L + 1) * (maxSpan + 40));
		var flowH = Math.max(200, Object.keys(byL).reduce(function(m, k) {
			return Math.max(m, byL[k].length);
		}, 0) * pitch + 40);
		var rowH = maxR * 2 + 26 + maxNoteH;
		var perRow = Math.max(1, Math.floor((W - 40) / (maxSpan + 26))), looseRows = Math.ceil(loose.length / perRow), bandH = loose.length ? looseRows * rowH + 26 : 0;
		H = spec.h || flowH + bandH;
		loose.forEach(function(n, k) {
			var row = Math.floor(k / perRow), col = k % perRow, wide2 = Math.min(perRow, loose.length - row * perRow);
			pos[n.id] = {
				x: W / (wide2 + 1) * (col + 1),
				y: flowH + 13 + row * rowH + maxR
			};
		});
		Object.keys(byL).forEach(function(k) {
			var col = byL[k], cx2 = W / (L + 1) * (Number(k) + 1);
			col.forEach(function(id, j) {
				pos[id] = {
					x: cx2,
					y: flowH / (col.length + 1) * (j + 1)
				};
			});
		});
	} else {
		var cx = W / 2, cy = H / 2;
		var ring = nodes.length ? nodes.length * (maxSpan + 16) / (2 * Math.PI) : 0;
		var rad = Math.max(Math.min(W, H) / 2 - maxR - 26, ring);
		nodes.forEach(function(n, k) {
			var ang = k / nodes.length * Math.PI * 2 - Math.PI / 2;
			pos[n.id] = {
				x: cx + rad * Math.cos(ang),
				y: cy + rad * Math.sin(ang)
			};
		});
	}
	var selfOf = {};
	edges.forEach(function(e) {
		if (e.from === e.to || e.self) selfOf[e.from] = e.label || " ";
	});
	var pad = Object.keys(selfOf).length || edges.some(function(e) {
		return e.label;
	}) ? 40 : 26;
	var xs = [], ys = [];
	nodes.forEach(function(n) {
		var p = pos[n.id];
		if (!p) return;
		var rr = radOf(n.id) + (n.here ? 7 : 0);
		var loop = selfOf[n.id] != null ? rr + 34 + String(selfOf[n.id]).length * 2.7 : rr;
		var half = Math.max(loop, noteW(n.id) / 2);
		xs.push(p.x - half, p.x + half);
		ys.push(p.y - loop, p.y + Math.max(loop, rr + noteH(n.id)));
	});
	var vx = 0, vy = 0, vw = W, vh = H;
	if (xs.length) {
		vx = Math.min.apply(null, xs) - pad;
		vy = Math.min.apply(null, ys) - pad;
		vw = Math.max.apply(null, xs) + pad - vx;
		vh = Math.max.apply(null, ys) + pad - vy;
	}
	var big = nodes.length >= 8 || vw > 720;
	var out = "<svg viewBox=\"" + vx.toFixed(1) + " " + vy.toFixed(1) + " " + vw.toFixed(1) + " " + vh.toFixed(1) + "\" class=\"fx\"" + (big ? " style=\"min-width:" + Math.min(Math.round(vw), 760) + "px\"" : "") + " role=\"img\">";
	out += "<defs><marker id=\"fxa\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0 L10 5 L0 10 z\" fill=\"var(--ink-3)\"/></marker></defs>";
	function nlabel(x, y, f) {
		var s = "<rect x=\"" + (x - f.w / 2).toFixed(1) + "\" y=\"" + y.toFixed(1) + "\" width=\"" + f.w + "\" height=\"" + f.h + "\" rx=\"3\" class=\"fx-eh\"/>";
		f.lines.forEach(function(ln, i) {
			s += txt(x.toFixed(1), (y + NPAD + i * NLH + NFS * .82).toFixed(1), ln, "fx-el");
		});
		return s;
	}
	function elabel(x, y, s) {
		var w = String(s).length * 5.4 + 10;
		return "<rect x=\"" + (x - w / 2).toFixed(1) + "\" y=\"" + (y - 9).toFixed(1) + "\" width=\"" + w.toFixed(1) + "\" height=\"14\" rx=\"3\" class=\"fx-eh\"/>" + txt(x, y + 1.5, s, "fx-el");
	}
	var cenX = 0, cenY = 0, nc = 0;
	nodes.forEach(function(n) {
		var p = pos[n.id];
		if (p) {
			cenX += p.x;
			cenY += p.y;
			nc++;
		}
	});
	cenX /= nc || 1;
	cenY /= nc || 1;
	edges.forEach(function(e) {
		var a = pos[e.from], b = pos[e.to];
		if (!a) return;
		if (e.from === e.to || e.self) {
			var rr = radOf(e.from);
			var ox = a.x - cenX, oy = a.y - cenY, horiz = Math.abs(ox) > Math.abs(oy);
			var sx = horiz ? ox >= 0 ? 1 : -1 : 0, sy = horiz ? 0 : oy >= 0 ? 1 : -1;
			if (!horiz && sy === 0) sy = -1;
			var bulge = rr + 26, p1, p2, c1, c2, lx, ly;
			if (horiz) {
				p1 = [a.x + sx * rr, a.y - 11];
				p2 = [a.x + sx * rr, a.y + 11];
				c1 = [a.x + sx * bulge, a.y - 30];
				c2 = [a.x + sx * bulge, a.y + 30];
				lx = a.x + sx * (bulge + String(e.label || "").length * 2.7 + 4);
				ly = a.y;
			} else {
				p1 = [a.x - 11, a.y + sy * rr];
				p2 = [a.x + 11, a.y + sy * rr];
				c1 = [a.x - 30, a.y + sy * bulge];
				c2 = [a.x + 30, a.y + sy * bulge];
				lx = a.x;
				ly = a.y + sy * (bulge + 12);
			}
			out += "<path d=\"M" + p1[0] + " " + p1[1] + " C" + c1[0] + " " + c1[1] + " " + c2[0] + " " + c2[1] + " " + p2[0] + " " + p2[1] + "\" class=\"fx-e\" marker-end=\"url(#fxa)\"/>";
			if (e.label) out += elabel(lx, ly, e.label);
			return;
		}
		if (!b) return;
		var ra = radOf(e.from), rb = radOf(e.to);
		var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, x1 = a.x + ux * ra, y1 = a.y + uy * ra, x2 = b.x - ux * (rb + 6), y2 = b.y - uy * (rb + 6);
		var bend = e.curve == null ? layout === "circle" ? .16 : 0 : e.curve;
		if (bend) {
			var mx = (x1 + x2) / 2 - uy * d * bend, my = (y1 + y2) / 2 + ux * d * bend;
			out += "<path d=\"M" + x1 + " " + y1 + " Q" + mx + " " + my + " " + x2 + " " + y2 + "\" class=\"fx-e\" marker-end=\"url(#fxa)\"/>";
			if (e.label) out += elabel(mx, my, e.label);
		} else {
			out += "<line " + attr({
				x1,
				y1,
				x2,
				y2
			}) + " class=\"fx-e\" marker-end=\"url(#fxa)\"/>";
			if (e.label) out += elabel((x1 + x2) / 2 - uy * 11, (y1 + y2) / 2 + ux * 11, e.label);
		}
	});
	nodes.forEach(function(n) {
		var p = pos[n.id];
		if (!p) return;
		var f = FI[n.id] || fit(n.id, r), rr = f.rEff;
		var accent = n.accent != null ? tone(n.accent) : "var(--rule)";
		out += "<g class=\"fx-node" + (n.here ? " is-here" : "") + (n.state ? " is-" + n.state.replace(/\s+/g, "-") : "") + "\" data-node=\"" + esc$1(n.id) + "\">";
		if (n.title) out += "<title>" + esc$1(n.title) + (n.state ? " — " + esc$1(n.state) : "") + "</title>";
		if (n.here) out += "<circle cx=\"" + p.x + "\" cy=\"" + p.y + "\" r=\"" + (rr + 6) + "\" class=\"fx-here\"/>";
		out += "<circle cx=\"" + p.x + "\" cy=\"" + p.y + "\" r=\"" + rr + "\" class=\"fx-n\" style=\"stroke:" + accent + "\"/>";
		f.lines.forEach(function(ln, j) {
			var ly2 = p.y + f.fs * .34 + (j - (f.lines.length - 1) / 2) * f.lh;
			out += "<text x=\"" + p.x + "\" y=\"" + ly2.toFixed(1) + "\" class=\"fx-t fx-nl\" text-anchor=\"middle\" style=\"font-size:" + f.fs + "px\">" + esc$1(ln) + "</text>";
		});
		if (NI[n.id]) out += nlabel(p.x, p.y + rr + NGAP, NI[n.id]);
		out += "</g>";
	});
	return out + "</svg>";
}
//#endregion
//#region src/figures/grid.js
function grid(spec) {
	var rl = spec.rowLabels || [], cl = spec.colLabels || [], cells = spec.cells || [];
	var vs = window.COURSE && window.COURSE.valueStyles || {};
	var gi = {};
	(spec.groups || []).forEach(function(g, n) {
		(g.cells || []).forEach(function(rc) {
			gi[rc[0] + "," + rc[1]] = n % 3;
		});
	});
	function val(v) {
		var t = String(v).trim();
		return vs[t] ? "<span class=\"" + vs[t] + "\">" + esc$1(t) + "</span>" : esc$1(t);
	}
	var corner = (spec.rowVars || []).join("") + "\\" + (spec.colVars || []).join("");
	var h = "<div class=\"fx-grid\"><div class=\"fx-gw\" style=\"grid-template-columns:repeat(" + (cl.length + 1) + ",auto)\">";
	h += "<div class=\"fx-gc\">" + esc$1(corner) + "</div>";
	cl.forEach(function(c) {
		h += "<div class=\"fx-gh\">" + esc$1(c) + "</div>";
	});
	for (var i = 0; i < rl.length; i++) {
		h += "<div class=\"fx-gh\">" + esc$1(rl[i]) + "</div>";
		for (var j = 0; j < cl.length; j++) {
			var g = gi[i + "," + j];
			var idx = spec.index === "binary" ? "<span class=\"fx-gi\">" + parseInt(String(rl[i]) + String(cl[j]), 2) + "</span>" : "";
			h += "<div class=\"fx-gcell" + (g != null ? " g" + g : "") + "\">" + idx + val((cells[i] || [])[j]) + "</div>";
		}
	}
	h += "</div>";
	if (spec.groups && spec.groups.length) h += "<div class=\"fx-gl\">" + spec.groups.map(function(g, n) {
		return "<span class=\"l" + n % 3 + "\">" + esc$1(g.label) + "</span>";
	}).join("") + "</div>";
	return h + "</div>";
}
//#endregion
//#region src/figures/matrix.js
function matrix(spec) {
	return "<div class=\"fx-mx\"><span class=\"fx-br\">[</span><table>" + (spec.rows || []).map(function(r) {
		return "<tr>" + r.map(function(c) {
			return "<td>" + esc$1(c) + "</td>";
		}).join("") + "</tr>";
	}).join("") + "</table><span class=\"fx-br\">]</span>" + (spec.label ? "<span class=\"fx-mxl\">" + esc$1(spec.label) + "</span>" : "") + "</div>";
}
//#endregion
//#region src/figures/plot.js
function plot(spec) {
	var W = spec.w || 620, H = spec.h || 300, m = {
		l: 52,
		r: 18,
		t: 16,
		b: 40
	}, iw = W - m.l - m.r, ih = H - m.t - m.b, series = (spec.series || []).map(function(s) {
		if (s.points) return s;
		var from = s.from != null ? s.from : spec.xrange ? spec.xrange[0] : 0, to = s.to != null ? s.to : spec.xrange ? spec.xrange[1] : 10, n = s.samples || 80, pts = [], f;
		try {
			f = new Function("x", "return (" + s.fn + ");");
		} catch (e) {
			return {
				label: s.label,
				points: []
			};
		}
		for (var i = 0; i <= n; i++) {
			var x = from + (to - from) * (i / n), y = f(x);
			if (isFinite(y)) pts.push([x, y]);
		}
		return {
			label: s.label,
			points: pts,
			dash: s.dash
		};
	});
	var xf = fmt(spec.xfmt, round), yf = fmt(spec.yfmt, round);
	var xs = [], ys = [];
	series.forEach(function(s) {
		s.points.forEach(function(p) {
			xs.push(p[0]);
			ys.push(p[1]);
		});
	});
	if (!xs.length) return "<svg viewBox=\"0 0 " + W + " " + H + "\" class=\"fx\"></svg>";
	var x0 = spec.xrange ? spec.xrange[0] : Math.min.apply(null, xs), x1 = spec.xrange ? spec.xrange[1] : Math.max.apply(null, xs), y0 = spec.yrange ? spec.yrange[0] : Math.min.apply(null, ys), y1 = spec.yrange ? spec.yrange[1] : Math.max.apply(null, ys);
	if (x1 === x0) x1 = x0 + 1;
	if (y1 === y0) y1 = y0 + 1;
	m.l = leftMargin(tickLabels([y0, y1], spec.ticks || 5, yf), spec.ylabel);
	iw = W - m.l - m.r;
	var px = function(x) {
		return m.l + (x - x0) / (x1 - x0) * iw;
	}, py = function(y) {
		return m.t + ih - (y - y0) / (y1 - y0) * ih;
	};
	var out = "<svg viewBox=\"0 0 " + W + " " + H + "\" class=\"fx\" role=\"img\">";
	var ticks = spec.ticks || 5, i;
	for (i = 0; i <= ticks; i++) {
		var gv = y0 + (y1 - y0) * i / ticks, gy = py(gv);
		out += "<line x1=\"" + m.l + "\" y1=\"" + gy + "\" x2=\"" + (W - m.r) + "\" y2=\"" + gy + "\" class=\"fx-g\"/>";
		out += txt(m.l - 9, gy + 4, yf(gv), "fx-ax", "end");
	}
	for (i = 0; i <= ticks; i++) {
		var xv = x0 + (x1 - x0) * i / ticks, gx = px(xv);
		out += txt(gx, H - m.b + 18, xf(xv), "fx-ax");
	}
	out += "<line x1=\"" + m.l + "\" y1=\"" + (m.t + ih) + "\" x2=\"" + (W - m.r) + "\" y2=\"" + (m.t + ih) + "\" class=\"fx-ax-l\"/>";
	out += "<line x1=\"" + m.l + "\" y1=\"" + m.t + "\" x2=\"" + m.l + "\" y2=\"" + (m.t + ih) + "\" class=\"fx-ax-l\"/>";
	series.forEach(function(s, k) {
		if (!s.points.length) return;
		var d = s.points.map(function(p, j) {
			return (j ? "L" : "M") + px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1);
		}).join(" ");
		out += "<path d=\"" + d + "\" class=\"fx-s\" style=\"stroke:" + tone(k) + "\"" + (s.dash ? " stroke-dasharray=\"5 4\"" : "") + "/>";
	});
	if (spec.xlabel) out += txt(m.l + iw / 2, H - 6, spec.xlabel, "fx-al");
	if (spec.ylabel) out += "<text transform=\"translate(13," + (m.t + ih / 2) + ") rotate(-90)\" class=\"fx-t fx-al\" text-anchor=\"middle\">" + esc$1(spec.ylabel) + "</text>";
	out += "</svg>";
	if (series.length > 1 || spec.legend) out += "<div class=\"fx-leg\">" + series.map(function(s, k) {
		return "<span><i style=\"background:" + tone(k) + "\"></i>" + esc$1(s.label || "series " + (k + 1)) + "</span>";
	}).join("") + "</div>";
	return out;
}
//#endregion
//#region src/figures/scatter.js
/** least-squares line, drawn only when asked for */
function fit(points) {
	const n = points.length;
	if (n < 2) return null;
	const sx = points.reduce((a, p) => a + p[0], 0), sy = points.reduce((a, p) => a + p[1], 0);
	const sxx = points.reduce((a, p) => a + p[0] * p[0], 0);
	const sxy = points.reduce((a, p) => a + p[0] * p[1], 0);
	const d = n * sxx - sx * sx;
	if (!d) return null;
	const m = (n * sxy - sx * sy) / d;
	return {
		m,
		b: (sy - m * sx) / n
	};
}
function scatter(spec) {
	const series = spec.series || [];
	const all = series.flatMap((s) => s.points || []);
	if (!all.length) return "";
	const xd = spec.xrange || padded(all.map((p) => p[0]));
	const yd = spec.yrange || padded(all.map((p) => p[1]));
	const xf = fmt(spec.xfmt, round), yf = fmt(spec.yfmt, round);
	const f = frame(spec, yd, spec.ticks || 5, yf);
	const px = scale(xd, [f.m.l, f.w - f.m.r]);
	const py = scale(yd, [f.m.t + f.ih, f.m.t]);
	let out = `<svg viewBox="0 0 ${f.w} ${f.h}" class="fx" role="img">`;
	out += grid$1(f, yd, spec.ticks || 5, yf);
	out += xTicks(f, xd, spec.ticks || 5, xf);
	series.forEach((s, i) => {
		const pts = s.points || [];
		if (spec.trend) {
			const line = fit(pts);
			if (line) {
				const x0 = xd[0], x1 = xd[1];
				out += `<line x1="${px(x0)}" y1="${py(line.m * x0 + line.b)}" x2="${px(x1)}" y2="${py(line.m * x1 + line.b)}" class="fx-trend" style="stroke:${tone(i)}"/>`;
			}
		}
		pts.forEach((p) => {
			out += `<circle cx="${px(p[0]).toFixed(1)}" cy="${py(p[1]).toFixed(1)}" r="3.6" class="fx-pt" style="fill:${tone(i)}"/>`;
		});
	});
	out += axisLabels(f, spec) + "</svg>";
	return out + legend(series.map((s, i) => s.label || `series ${i + 1}`), tone);
}
//#endregion
//#region src/figures/svg.js
function svg(spec) {
	return "<svg viewBox=\"" + (spec.viewBox || "0 0 640 320") + "\" class=\"fx\" role=\"img\">" + (spec.body || "") + "</svg>";
}
//#endregion
//#region src/figures/timing.js
function timing(spec) {
	var u = spec.unit || 26, hh = 22, pad = 3;
	function draw(w) {
		var v = String(w).split(""), width = v.length * u, prev = null, x = 0, path = [];
		var y = function(t) {
			return t === "1" ? pad : pad + hh;
		};
		for (var i = 0; i < v.length; i++) {
			var t = v[i] === "1" ? "1" : "0";
			if (prev === null) path.push("M " + x + " " + y(t));
			else if (t !== prev) path.push("L " + x + " " + y(t));
			x += u;
			path.push("L " + x + " " + y(t));
			prev = t;
		}
		return "<svg width=\"" + width + "\" height=\"" + (hh + pad * 2) + "\" aria-hidden=\"true\"><path d=\"" + path.join(" ") + "\" fill=\"none\" stroke=\"var(--hi)\" stroke-width=\"1.8\"/></svg>";
	}
	return "<div class=\"fx-tm\">" + (spec.signals || []).map(function(s) {
		return "<div class=\"fx-tr\"><span class=\"fx-tn\">" + esc$1(s.name) + "</span>" + draw(s.wave) + "</div>";
	}).join("") + "</div>";
}
//#endregion
//#region src/figures/circuit.js
function circuit(spec) {
	const unit = 48, pad = 42;
	const w = Math.max(2, Number(spec.w) || 8), h = Math.max(2, Number(spec.h) || 5);
	const X = (x) => pad + x * unit, Y = (y) => pad + y * unit;
	const line = (a, b, cls = "fx-c-wire") => `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" class="${cls}"/>`;
	const wires = (spec.wires || []).map((v) => line(v.from, v.to)).join("");
	const parts = (spec.parts || []).map((p) => {
		const x = X(p.x), y = Y(p.y), turn = p.dir === "v" ? " transform=\"rotate(90)\"" : "";
		return `<g class="fx-c-part"><title>${esc$1([p.label, p.value].filter(Boolean).join(" · ") || p.type)}</title><g transform="translate(${x} ${y})"><g${turn}>${{
			resistor: "<path d=\"M-24 0h5l4-9 8 18 7-18 7 18 8-18 4 9h5\"/>",
			capacitor: "<path d=\"M-24 0h16m0-13v26m16-26v26M8 0h16\"/>",
			battery: "<path d=\"M-24 0h16m0-14v28M6-9v18M6 0h18\"/>",
			switch: "<path d=\"M-24 0h10m28 0h10M-14 0L11-13\"/><circle cx=\"-14\" r=\"2\"/><circle cx=\"14\" r=\"2\"/>",
			diode: "<path d=\"M-24 0h12m24 0h12M-12-13v26l24-13zM12-13v26\"/>",
			lamp: "<path d=\"M-24 0h8m32 0h8\"/><circle r=\"16\"/><path d=\"M-11-11L11 11M11-11L-11 11\"/>",
			source: "<path d=\"M-24 0h8m32 0h8\"/><circle r=\"16\"/><path d=\"M-9 0q5-10 9 0t9 0\"/>"
		}[p.type] || ""}</g></g>` + (p.label ? txt(x, y - 30, p.label, "fx-cl") : "") + (p.value ? txt(x, y + 38, p.value, "fx-cv") : "") + "</g>";
	}).join("");
	const dots = (spec.junctions || []).map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" class="fx-c-dot"/>`).join("");
	return `<svg class="fx fx-circuit" viewBox="0 0 ${X(w) + pad} ${Y(h) + pad}" role="img" aria-label="Circuit diagram">${wires}${parts}${dots}</svg>`;
}
//#endregion
//#region src/figures/drawing.js
function drawing(spec) {
	const w = Number(spec.w) || 640, h = Number(spec.h) || 320;
	const shapes = (spec.shapes || []).map((s) => {
		const color = s.accent == null ? "var(--ink-2)" : tone(s.accent);
		const common = `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
		const points = (s.points || []).map((p) => p.join(",")).join(" ");
		let body = "";
		if (s.type === "line" || s.type === "arrow") {
			const [a, b] = s.points || [];
			if (a && b) {
				body = `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${common}/>`;
				if (s.type === "arrow") {
					const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
					const wing = (sign) => [b[0] - 12 * Math.cos(angle + sign * .5), b[1] - 12 * Math.sin(angle + sign * .5)];
					const l = wing(1), r = wing(-1);
					body += `<polyline points="${l.join(",")} ${b.join(",")} ${r.join(",")}" fill="none" ${common}/>`;
				}
			}
		} else if (s.type === "path") body = `<polyline points="${points}" fill="none" ${common}/>`;
		else if (s.type === "rect") body = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="3" fill="var(--surface-2)" ${common}/>`;
		else if (s.type === "ellipse") body = `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.w / 2}" ry="${s.h / 2}" fill="var(--surface-2)" ${common}/>`;
		else if (s.type === "text") body = `<text x="${s.x}" y="${s.y}" class="fx-t fx-d-label" style="fill:${color}">${esc$1(s.text || "")}</text>`;
		return `<g>${s.label ? `<title>${esc$1(s.label)}</title>` : ""}${body}</g>`;
	}).join("");
	return `<svg class="fx fx-drawing" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc$1(spec.alt || "Annotated drawing").replace(/"/g, "&quot;")}">${shapes}</svg>`;
}
//#endregion
//#region src/figures/index.js
const Figures = {
	bar,
	circuit,
	drawing,
	flow,
	graph,
	grid,
	matrix,
	plot,
	scatter,
	svg,
	timing
};
const KINDS = Object.keys(Figures);
//#endregion
//#region src/figures/schema.js
const CHART = [
	"w",
	"h",
	"xlabel",
	"ylabel",
	"ticks"
];
const SPEC = {
	circuit: {
		keys: [
			"w",
			"h",
			"wires",
			"parts",
			"junctions"
		],
		items: {
			wires: ["from", "to"],
			parts: [
				"type",
				"x",
				"y",
				"dir",
				"label",
				"value"
			]
		}
	},
	drawing: {
		keys: [
			"w",
			"h",
			"alt",
			"shapes"
		],
		items: { shapes: [
			"type",
			"x",
			"y",
			"w",
			"h",
			"points",
			"text",
			"label",
			"accent"
		] }
	},
	graph: {
		keys: [
			"nodes",
			"edges",
			"layout",
			"r",
			"w",
			"h"
		],
		enums: { layout: [
			"circle",
			"row",
			"layered",
			"manual"
		] },
		items: {
			nodes: [
				"id",
				"label",
				"x",
				"y",
				"accent",
				"here",
				"state",
				"note",
				"title"
			],
			edges: [
				"from",
				"to",
				"label",
				"self",
				"curve"
			]
		}
	},
	plot: {
		keys: [
			...CHART,
			"series",
			"xrange",
			"yrange",
			"legend",
			"xfmt",
			"yfmt"
		],
		fmts: ["xfmt", "yfmt"],
		items: { series: [
			"label",
			"fn",
			"points",
			"from",
			"to",
			"dash",
			"samples"
		] }
	},
	scatter: {
		keys: [
			...CHART,
			"series",
			"xrange",
			"yrange",
			"trend",
			"xfmt",
			"yfmt"
		],
		fmts: ["xfmt", "yfmt"],
		items: { series: ["label", "points"] }
	},
	bar: {
		keys: [
			...CHART,
			"bars",
			"max",
			"baseline",
			"valueFmt"
		],
		fmts: ["valueFmt"],
		items: { bars: [
			"label",
			"value",
			"accent"
		] }
	},
	flow: {
		keys: ["steps", "dir"],
		enums: { dir: ["row", "col"] },
		items: { steps: ["label", "note"] }
	},
	grid: {
		keys: [
			"rowVars",
			"colVars",
			"rowLabels",
			"colLabels",
			"cells",
			"index",
			"groups"
		],
		enums: { index: ["binary"] },
		items: { groups: ["label", "cells"] }
	},
	timing: {
		keys: ["signals", "unit"],
		items: { signals: ["name", "wave"] }
	},
	matrix: { keys: ["rows", "label"] },
	svg: { keys: ["body", "viewBox"] }
};
//#endregion
//#region tools/lib/figures.mjs
const missing = KINDS.filter((k) => !SPEC[k]);
const extra = Object.keys(SPEC).filter((k) => !KINDS.includes(k));
if (missing.length || extra.length) throw new Error(`src/figures/schema.js is out of step with the registry: ` + [missing.length ? `no spec for ${missing.join(", ")}` : "", extra.length ? `spec for unregistered ${extra.join(", ")}` : ""].filter(Boolean).join("; "));
const why = (v) => v === null ? ` — an unquoted comma in a YAML flow mapping ends the pair, not the value; quote the whole string` : ``;
function checkKeys(obj, allowed, what, errs) {
	for (const [k, v] of Object.entries(obj)) if (!allowed.includes(k)) errs.push(`${what}: unknown key "${k}"${why(v)}`);
}
function checkPlotFns(spec, where, errs) {
	for (const ser of spec.series || []) {
		if (!ser || ser.points || ser.fn == null) continue;
		let f;
		try {
			f = new Function("x", "return (" + ser.fn + ");");
		} catch (e) {
			errs.push(`${where}: plot fn "${ser.fn}" does not parse — ${e.message}`);
			continue;
		}
		const from = ser.from != null ? ser.from : spec.xrange ? spec.xrange[0] : 0;
		const to = ser.to != null ? ser.to : spec.xrange ? spec.xrange[1] : 10;
		let finite = 0, threw = null;
		for (let i = 0; i <= 20 && !threw; i++) try {
			const y = f(from + (to - from) * (i / 20));
			if (typeof y === "number" && isFinite(y)) finite++;
		} catch (e) {
			threw = e.message;
		}
		if (threw) errs.push(`${where}: plot fn "${ser.fn}" throws — ${threw}`);
		else if (!finite) errs.push(`${where}: plot fn "${ser.fn}" has no finite value on [${from}, ${to}] — the chart renders empty`);
	}
}
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const point = (p) => Array.isArray(p) && p.length === 2 && p.every(finite);
function checkDiagram(kind, spec, where, errs) {
	for (const key of ["w", "h"]) if (spec[key] != null && (!finite(spec[key]) || spec[key] <= 0)) errs.push(`${where}: figure ${kind} ${key} must be a positive number`);
	if (kind === "circuit") {
		for (const field of [
			"wires",
			"parts",
			"junctions"
		]) if (spec[field] != null && !Array.isArray(spec[field])) errs.push(`${where}: circuit ${field} must be a list`);
		if (!(spec.wires || []).length && !(spec.parts || []).length) errs.push(`${where}: circuit needs wires or parts`);
		for (const wire of Array.isArray(spec.wires) ? spec.wires : []) if (!point(wire?.from) || !point(wire?.to)) errs.push(`${where}: circuit wire needs two [x, y] points`);
		for (const part of Array.isArray(spec.parts) ? spec.parts : []) {
			if (!part || ![
				"resistor",
				"capacitor",
				"battery",
				"switch",
				"diode",
				"lamp",
				"source"
			].includes(part.type)) errs.push(`${where}: unknown circuit part "${part?.type}"`);
			if (!finite(part?.x) || !finite(part?.y)) errs.push(`${where}: circuit part needs numeric x and y`);
			if (part?.dir != null && !["h", "v"].includes(part.dir)) errs.push(`${where}: circuit part dir must be h or v`);
		}
		for (const p of Array.isArray(spec.junctions) ? spec.junctions : []) if (!point(p)) errs.push(`${where}: circuit junction needs [x, y]`);
	} else {
		if (!String(spec.alt || "").trim()) errs.push(`${where}: drawing needs alt text`);
		if (!Array.isArray(spec.shapes) || !spec.shapes.length) errs.push(`${where}: drawing needs shapes`);
		for (const shape of Array.isArray(spec.shapes) ? spec.shapes : []) {
			if (!shape || ![
				"line",
				"arrow",
				"path",
				"rect",
				"ellipse",
				"text"
			].includes(shape.type)) {
				errs.push(`${where}: unknown drawing shape "${shape?.type}"`);
				continue;
			}
			if ([
				"line",
				"arrow",
				"path"
			].includes(shape.type) && (!Array.isArray(shape.points) || shape.points.length < 2 || !shape.points.every(point))) errs.push(`${where}: drawing ${shape.type} needs at least two [x, y] points`);
			if ([
				"rect",
				"ellipse",
				"text"
			].includes(shape.type) && (!finite(shape.x) || !finite(shape.y))) errs.push(`${where}: drawing ${shape.type} needs numeric x and y`);
			if (["rect", "ellipse"].includes(shape.type) && (!finite(shape.w) || shape.w <= 0 || !finite(shape.h) || shape.h <= 0)) errs.push(`${where}: drawing ${shape.type} needs positive w and h`);
			if (shape.type === "text" && !String(shape.text || "").trim()) errs.push(`${where}: drawing text needs text`);
			if (shape.accent != null && (!Number.isInteger(shape.accent) || shape.accent < 0 || shape.accent > 3)) errs.push(`${where}: drawing accent must be 0–3`);
		}
	}
}
/** Check one `{t:"figure", kind, spec}` block. `where` names the subsection. */
function checkFigure(b, where, errs) {
	const s = SPEC[b.kind];
	if (!s) {
		errs.push(`${where}: unknown figure kind "${b.kind}"`);
		return;
	}
	const spec = b.spec || {};
	if (typeof spec !== "object" || Array.isArray(spec)) {
		errs.push(`${where}: figure "${b.kind}" spec is not a mapping`);
		return;
	}
	checkKeys(spec, s.keys, `${where}: figure ${b.kind} spec`, errs);
	for (const [k, allowed] of Object.entries(s.enums || {})) if (spec[k] != null && !allowed.includes(spec[k])) errs.push(`${where}: figure ${b.kind} ${k}: "${spec[k]}" is not one of ${allowed.join(", ")} — the renderer ignores it and falls back to "${allowed[0]}"`);
	for (const k of s.fmts || []) {
		const f = spec[k];
		if (f == null) continue;
		if (typeof f !== "string") errs.push(`${where}: figure ${b.kind} ${k} must be a format string like "{} ms" — a course is data, so it cannot hold a function`);
		else if (!f.includes("{}")) errs.push(`${where}: figure ${b.kind} ${k} "${f}" has no {} — every label would read the same`);
	}
	for (const [field, allowed] of Object.entries(s.items || {})) (Array.isArray(spec[field]) ? spec[field] : []).forEach((it, i) => {
		if (it && typeof it === "object" && !Array.isArray(it)) checkKeys(it, allowed, `${where}: figure ${b.kind} ${field}[${i + 1}]`, errs);
	});
	if (b.kind === "plot") checkPlotFns(spec, where, errs);
	if (b.kind === "circuit" || b.kind === "drawing") checkDiagram(b.kind, spec, where, errs);
}
//#endregion
//#region tools/lib/slides.mjs
/** Validate the data a slide component reads, including each nested visual. */
function checkSlides(b, where, errs) {
	if (!Array.isArray(b.frames) || !b.frames.length) {
		errs.push(`${where}: slides needs at least one frame`);
		return;
	}
	for (const [i, frame] of b.frames.entries()) {
		const at = `${where}: slide ${i + 1}`;
		if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
			errs.push(`${at} must be a mapping`);
			continue;
		}
		for (const key of Object.keys(frame)) if (![
			"title",
			"text",
			"figure",
			"image"
		].includes(key)) errs.push(`${at}: unknown key "${key}"`);
		if (!frame.title && !frame.text && !frame.figure && !frame.image) errs.push(`${at} is empty`);
		if (frame.figure && frame.image) errs.push(`${at} can have one visual, figure or image`);
		if (frame.figure) {
			if (typeof frame.figure !== "object" || Array.isArray(frame.figure)) errs.push(`${at}: figure must be a mapping`);
			else {
				for (const key of Object.keys(frame.figure)) if (!["kind", "spec"].includes(key)) errs.push(`${at}: figure has unknown key "${key}"`);
				checkFigure({
					t: "figure",
					...frame.figure
				}, at, errs);
			}
		}
		if (frame.image) {
			if (typeof frame.image !== "object" || Array.isArray(frame.image)) errs.push(`${at}: image must be a mapping`);
			else {
				for (const key of Object.keys(frame.image)) if (!["src", "alt"].includes(key)) errs.push(`${at}: image has unknown key "${key}"`);
				if (!String(frame.image.src || "").trim()) errs.push(`${at}: image has no src`);
				if (!String(frame.image.alt || "").trim()) errs.push(`${at}: image has no alt text`);
			}
		}
	}
}
//#endregion
//#region src/lib/follows.js
/** is this block attached to the block above it? */
const isFollow = (b) => !!(b && b.follows);
/** index of the block `blocks[i]` attaches to, or -1 when it attaches to nothing */
function parentIndex(blocks, i) {
	if (!isFollow(blocks[i])) return -1;
	for (let j = i - 1; j >= 0; j--) if (!isFollow(blocks[j])) return j;
	return -1;
}
//#endregion
//#region src/lib/tiers.js
const TIERS = [
	"spine",
	"depth",
	"apply"
];
const tierOf = (b) => TIERS.includes(b.tier) ? b.tier : "spine";
//#endregion
//#region src/lib/util.js
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;"
})[c]);
const flattenMath = (h) => {
	let out = "", i = 0;
	for (;;) {
		const at = h.indexOf("<span class=\"katex\"", i);
		if (at < 0) return out + h.slice(i);
		out += h.slice(i, at);
		let depth = 0, j = at;
		for (;;) {
			const close = h.indexOf("</span>", j);
			if (close < 0) {
				j = h.length;
				break;
			}
			const open = h.indexOf("<span", j);
			if (open >= 0 && open < close) {
				depth++;
				j = open + 5;
			} else {
				j = close + 7;
				if (!--depth) break;
			}
		}
		out += h.slice(at, j).replace(/<[^>]+>/g, "");
		i = j;
	}
};
const ENT = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: "\"",
	apos: "'",
	nbsp: " "
};
const entities = (t) => t.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, e) => {
	if (e[0] === "#") {
		const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
		return Number.isFinite(n) && n > 0 && n <= 1114111 ? String.fromCodePoint(n) : m;
	}
	return e in ENT ? ENT[e] : m;
});
const strip = (h) => entities(flattenMath(String(h).replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/\s+([.;:,)])/g, "$1").replace(/\(\s+/g, "(").trim());
const clip = (t, n = 168) => t.length > n ? t.slice(0, n - 2) + "…" : t;
function collect(v, out) {
	if (typeof v === "string") out.push(v);
	else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
	else if (v && typeof v === "object") Object.values(v).forEach((x) => collect(x, out));
}
const textOf = (v) => {
	const p = [];
	collect(v, p);
	return p.join(" ");
};
//#endregion
//#region src/lib/math.js
const OPTS = {
	throwOnError: false,
	strict: "ignore",
	output: "htmlAndMathml"
};
const INLINE = /<m>([\s\S]*?)<\/m>/g;
const inline = /* @__PURE__ */ new Map();
const display = /* @__PURE__ */ new Map();
const render = (src, cache, displayMode) => {
	const key = String(src).trim();
	let out = cache.get(key);
	if (out === void 0) {
		out = katex.renderToString(key, {
			...OPTS,
			displayMode
		});
		cache.set(key, out);
	}
	return out;
};
/** A display equation, for the `math` block. */
const displayTex = (src) => render(src, display, true);
/** Every `<m>…</m>` in a string. Returns the string untouched when there is none. */
function M(html) {
	const s = String(html == null ? "" : html);
	return s.includes("<m>") ? s.replace(INLINE, (_, src) => render(src, inline, false)) : s;
}
//#endregion
//#region src/blocks/index.js
const reg = {};
const Blocks = {
	register: (name, def) => {
		reg[name] = def;
	},
	get: (name) => reg[name],
	has: (name) => Object.prototype.hasOwnProperty.call(reg, name),
	names: () => Object.keys(reg)
};
let CFG = {};
const LABEL_WORDS = 4;
const UNSOURCED = {
	unverified: "unverified",
	generated: "generated"
};
const U = {
	esc,
	strip,
	clip,
	box: (cls, label, inner) => {
		const long = String(label || "").trim().split(/\s+/).length > LABEL_WORDS;
		return `<div class="${cls}">` + (label ? `<span class="blabel${long ? " is-line" : ""}">${label}</span>` : "") + `${inner}</div>`;
	},
	cell: (v, map) => {
		const s = String(v).trim();
		return map && map[s] ? `<span class="${map[s]}">${esc(s)}</span>` : esc(s);
	},
	src: (b, env) => {
		if (!b.source) return "";
		if (UNSOURCED[b.source]) return `<span class="bsrc is-un">${UNSOURCED[b.source]}</span>`;
		if (env && env.prevSource === b.source) return "";
		return `<span class="bsrc">${esc(b.source)}</span>`;
	},
	caption: (num, text, kind = "Figure") => (num ? `<b class="fnum">${esc(kind)} ${esc(num)}</b>` : "") + (num && text ? "<i class=\"sep\" aria-hidden=\"true\"></i>" : "") + (text || ""),
	body: (b) => {
		const c = b.core;
		if (!c) return b.h || "";
		return (Array.isArray(c) ? `<ul class="bcore bcore-l">${c.map((x) => `<li>${x}</li>`).join("")}</ul>` : `<p class="bcore">${c}</p>`) + (b.h || "");
	},
	items: (b) => {
		if (!hasItems(b)) return "";
		const tag = b.ordered ? "ol" : "ul";
		return `<${tag} class="bitems">${b.items.map((i) => `<li>${i}</li>`).join("")}</${tag}>`;
	}
};
/** does this block carry an enumeration in `items:`? */
const hasItems = (b) => !!b && Array.isArray(b.items) && b.items.length > 0;
const R = Blocks.register;
const holdsOf = (t) => (Blocks.get(t) || {}).holds === "structure" ? "structure" : "prose";
R("p", {
	notes: "hidden",
	render: (b) => `<p>${b.h}</p>`
});
R("def", {
	apart: true,
	notes: "lead",
	defaultLabel: "Definition",
	name: (b) => b.term,
	render: (b, U2, env) => U.box("def", b.label || (b.term ? "" : "Definition"), (b.term ? `<dt>${esc(b.term)}</dt>` : "") + U.body(b) + U.items(b) + U.src(b, env))
});
R("key", {
	notes: "lead",
	defaultLabel: "Key rule",
	render: (b, U2, env) => U.box("key", b.label || (b.core || b.gist ? "" : "Key rule"), U.body(b) + U.items(b) + U.src(b, env))
});
R("trap", {
	notes: "lead",
	defaultLabel: "Common mistake",
	render: (b, U2, env) => U.box("trap", b.label || "Common mistake", U.body(b) + U.items(b) + U.src(b, env))
});
R("note", {
	notes: "closed",
	defaultLabel: "Note",
	render: (b) => U.box("note", b.label || "Note", U.body(b) + U.items(b))
});
R("ex", {
	apart: true,
	notes: "closed",
	defaultLabel: "Worked example",
	name: (b) => b.title || b.label,
	render: (b) => U.box("ex", b.label || "Worked example", (b.title ? `<p><b>${b.title}</b></p>` : "") + U.body(b))
});
R("list", {
	holds: "structure",
	notes: "closed",
	defaultLabel: "List",
	render: (b) => {
		return `<div class="blk">${b.label ? `<span class="blabel">${b.label}</span>` : ""}` + U.body(b) + U.items(b) + `</div>`;
	}
});
R("table", {
	holds: "structure",
	apart: true,
	notes: "caption",
	defaultLabel: "Table",
	name: (b) => b.cap || b.label,
	render: (b, _u, env) => {
		const vmap = b.map || (b.mono ? CFG.valueStyles : null);
		const sep = (i) => b.split != null && i === b.split - 1 ? " class=\"tsplit\"" : "";
		let h = U.body(b) + `<div class="tscroll"><table class="tbl${b.mono ? " tmono" : ""}">`;
		const cap = U.caption(env.fignum, b.cap, "Table");
		if (cap) h += `<caption>${cap}</caption>`;
		h += "<thead><tr>" + (b.head || []).map((c, i) => `<th${sep(i)}>${c}</th>`).join("") + "</tr></thead><tbody>";
		h += (b.rows || []).map((r) => "<tr>" + r.map((c, i) => `<td${sep(i)}>${vmap ? U.cell(c, vmap) : c}</td>`).join("") + "</tr>").join("");
		return h + "</tbody></table></div>";
	}
});
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const groupCount = (re) => {
	try {
		return new RegExp(re + "|").exec("").length - 1;
	} catch {
		return 0;
	}
};
function highlight(src, syn) {
	const rules = [];
	if (syn.comment) rules.push({
		cls: "tok-c",
		re: `${reEsc(syn.comment)}[^\n]*`
	});
	if (syn.strings !== false) rules.push({
		cls: "tok-s",
		re: "\"(?:[^\"\\\\]|\\\\.)*\""
	});
	for (const p of syn.patterns || []) try {
		new RegExp(p.re);
		rules.push({
			cls: p.cls || "tok-n",
			re: p.re
		});
	} catch {}
	if (syn.keywords?.length) rules.push({
		cls: "tok-k",
		re: `\\b(?:${syn.keywords.map(reEsc).join("|")})\\b`
	});
	if (!rules.length) return esc(src);
	const at = [];
	let g = 1;
	for (const r of rules) {
		at.push(g);
		g += 1 + groupCount(r.re);
	}
	let re;
	try {
		re = new RegExp(rules.map((r) => `(${r.re})`).join("|"), "g");
	} catch {
		return esc(src);
	}
	let out = "", last = 0;
	for (const m of src.matchAll(re)) {
		const i = at.findIndex((slot) => m[slot] !== void 0);
		if (i < 0) continue;
		out += esc(src.slice(last, m.index)) + `<span class="${rules[i].cls}">${esc(m[0])}</span>`;
		last = m.index + m[0].length;
	}
	return out + esc(src.slice(last));
}
R("code", {
	holds: "structure",
	apart: true,
	notes: "closed",
	defaultLabel: "Listing",
	name: (b) => b.label || b.lang,
	render: (b) => U.body(b) + `<div class="codewrap"><span class="lang">${esc(b.lang || "code")}</span><pre><code>${CFG.syntax ? highlight(b.src, CFG.syntax) : esc(b.src)}</code></pre></div>`
});
R("math", {
	holds: "structure",
	apart: true,
	notes: "open",
	defaultLabel: "Equation",
	name: (b) => b.label,
	render: (b) => U.body(b) + `<div class="mathblk">` + (b.label ? `<span class="blabel">${b.label}</span>` : "") + (b.tex ? displayTex(b.tex) : `<p class="fx-miss">a math block has no tex</p>`) + (b.note ? `<span class="mathnote">${b.note}</span>` : "") + `</div>`
});
R("figure", {
	holds: "structure",
	apart: true,
	notes: "open",
	defaultLabel: "Figure",
	name: (b) => b.cap,
	render: (b, _u, env) => {
		const fn = Figures[b.kind];
		const body = fn ? fn(b.spec || {}) : `<p class="fx-miss">unknown figure kind: ${esc(b.kind)}</p>`;
		const cap = U.caption(env.fignum, b.cap);
		return `<div class="figure">${cap ? `<span class="fcap">${cap}</span>` : ""}${body}</div>`;
	}
});
R("slides", {
	holds: "structure",
	apart: true,
	notes: "open",
	defaultLabel: "Slides",
	name: (b) => b.cap,
	render: () => ""
});
R("image", {
	holds: "structure",
	apart: true,
	notes: "caption",
	defaultLabel: "Image",
	name: (b) => b.cap || b.alt,
	render: (b, _u, env) => {
		const w = b.width ? ` style="max-width:${parseInt(b.width, 10)}px"` : "";
		const cap = U.caption(env.fignum, b.cap);
		return `<figure class="imgblock"${w}><img src="${b.src}" alt="${esc(b.alt || "")}" loading="lazy">` + (cap || b.credit ? `<figcaption>${cap}` + (b.credit ? `<span class="credit">${esc(b.credit)}</span>` : "") + "</figcaption>" : "") + "</figure>";
	}
});
//#endregion
//#region src/lib/gist.js
const NOTES_MODES = [
	"open",
	"lead",
	"caption",
	"closed",
	"hidden"
];
/** the authored claim, whichever field carries it — `core` first, then `gist` */
const leadOf = (b) => b && (b.core || b.gist) || null;
/** Does this block state its claim separately from its development? */
const hasCore = (b) => !!(b && b.core);
const MIN_WORDS = 6;
const MAX_CHARS = 200;
function sentenceEnd(html) {
	let inTag = false, inMath = false;
	for (let i = 0; i < html.length; i++) {
		const c = html[i];
		if (inTag) {
			if (c === ">") inTag = false;
			continue;
		}
		if (c === "<") {
			if (html.startsWith("<m>", i)) inMath = true;
			else if (html.startsWith("</m>", i)) inMath = false;
			inTag = true;
			continue;
		}
		if (inMath) continue;
		if ((c === "." || c === "!" || c === "?") && (i + 1 >= html.length || /\s/.test(html[i + 1]))) return i + 1;
	}
	return -1;
}
function closeTags(html) {
	const open = [];
	const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
	for (let m; m = re.exec(html);) {
		if (m[3] === "/" || VOID.has(m[2].toLowerCase())) continue;
		if (m[1] === "/") {
			const at = open.lastIndexOf(m[2].toLowerCase());
			if (at >= 0) open.splice(at, 1);
		} else open.push(m[2].toLowerCase());
	}
	return html + open.reverse().map((t) => `</${t}>`).join("");
}
const VOID = /* @__PURE__ */ new Set([
	"br",
	"img",
	"hr",
	"input",
	"wbr",
	"source"
]);
function deriveLead(b) {
	if (!b || b.core || b.gist) return null;
	const body = String(b.h || "").trim();
	if (!body) return null;
	const firstP = body.split(/<\/p\s*>/i)[0].replace(/^\s*<p\b[^>]*>/i, "");
	const end = sentenceEnd(firstP);
	const slice = end > 0 ? firstP.slice(0, end) : firstP;
	const t = strip(M(slice));
	if (!t) return null;
	if (t.length > MAX_CHARS) return null;
	if (/[:;]$/.test(t)) return null;
	if (t.split(/\s+/).length < MIN_WORDS) return null;
	if (end <= 0) return null;
	return closeTags(slice.trim());
}
/**
* The name a block is known by — its Index-depth row, and the title field of
* its search entry. Registry entries may override; the fallbacks below are the
* authored fields in the order a reader would recognise them.
*/
function nameOf(b) {
	if (!b) return "";
	const d = Blocks.get(b.t);
	if (d && typeof d.name === "function") {
		const n = d.name(b);
		if (n) return String(n);
	}
	const first = b.term || b.label || b.cap || b.title || b.alt;
	if (first) return clip(strip(String(first)), 120);
	const own = strip(Array.isArray(b.items) ? String(b.items[0] || "") : String(b.h || ""));
	if (own) return clip(own, 80);
	return d && d.defaultLabel || b.t;
}
/**
* How to present one block at one depth.
*
*   mode  "full"    the block entire (core, where declared, ahead of h)
*         "lead"    the claim only; the development is closed
*         "caption" the block's name only, styled as its own caption
*         "closed"  a one-line stub carrying the name
*         "hidden"  not in the document at this depth
*   name  the string a closed row shows
*   lead  the claim's HTML, when mode is "lead"
*   more  whether anything is closed and therefore expandable in place
*
* `full` is never anything but "full": depth closes prose, it never removes a
* block, so every block is reachable at every depth by opening it.
*/
function present(b, depth) {
	if (!b) return {
		mode: "hidden",
		name: "",
		lead: null,
		more: false
	};
	const d = Blocks.get(b.t) || {};
	const name = nameOf(b);
	const lead = leadOf(b);
	const shown = lead || deriveLead(b);
	const explicit = NOTES_MODES.includes(b.notes) ? b.notes : null;
	const kind = NOTES_MODES.includes(d.notes) ? d.notes : "lead";
	const promote = holdsOf(b.t) === "structure" ? "open" : "lead";
	const notes = explicit || (kind === "lead" && hasItems(b) ? "open" : null) || (lead && (kind === "closed" || kind === "caption") ? promote : kind);
	const hasBody = !!String(b.h || "").trim() || hasItems(b) || b.t === "figure" || b.t === "image" || b.t === "table" || b.t === "math" || b.t === "code" || b.t === "list";
	if (depth === "full") return {
		mode: "full",
		name,
		lead: null,
		more: false
	};
	if (depth === "index") {
		if (notes === "hidden") return {
			mode: "hidden",
			name,
			lead: null,
			more: false
		};
		return {
			mode: "closed",
			name,
			lead: null,
			more: hasBody || !!lead
		};
	}
	switch (notes) {
		case "hidden": return {
			mode: "hidden",
			name,
			lead: null,
			more: false
		};
		case "open": return {
			mode: "full",
			name,
			lead: null,
			more: false
		};
		case "caption": return {
			mode: "caption",
			name,
			lead: null,
			more: hasBody
		};
		case "closed": return {
			mode: "closed",
			name,
			lead: null,
			more: hasBody
		};
		default:
			if (!shown) return {
				mode: "closed",
				name,
				lead: null,
				more: hasBody
			};
			return {
				mode: "lead",
				name,
				lead: shown,
				more: lead ? hasCore(b) ? hasBody : true : true
			};
	}
}
//#endregion
//#region src/lib/asides.js
const ANCHOR = /<n\s+k="([^"]+)"\s*>([\s\S]*?)<\/n>/g;
/** every anchor key written in a string, for the build's pairing check */
const anchorKeys = (s) => [...String(s || "").matchAll(ANCHOR)].map((m) => m[1]);
//#endregion
//#region tools/lib/structure.mjs
const RUN_IN = /(?:^|[\s>:])\((1|a|i)\)\s[\s\S]*?\((2|b|ii)\)\s[\s\S]*?\((3|c|iii)\)\s/;
const CALLOUTS = /* @__PURE__ */ new Set([
	"def",
	"key",
	"trap",
	"note"
]);
function checkRunInLists(C, errs) {
	for (const s of C.sections) for (const u of s.subs) (u.blocks || []).forEach((b, i) => {
		if (!b || b.t === "code") return;
		for (const k of ["h", "core"]) {
			const v = String(Array.isArray(b[k]) ? b[k].join(" ") : b[k] || "").replace(/<m>[\s\S]*?<\/m>/g, " ");
			if (RUN_IN.test(v)) errs.push(`${u.id} block ${i + 1} (${b.t}) ${k}: an enumeration run into prose — ` + (CALLOUTS.has(b.t) || b.t === "list" ? `move the steps into items: (with ordered: true)` : `write it as <ol>, or as a list block`));
		}
		if (b.items != null && !CALLOUTS.has(b.t) && b.t !== "list") errs.push(`${u.id} block ${i + 1} (${b.t}): items: renders only on list, ${[...CALLOUTS].join(", ")} — on a ${b.t} it draws nothing`);
	});
}
function checkFollows(C, errs) {
	for (const s of C.sections) for (const u of s.subs) {
		const bs = u.blocks || [];
		bs.forEach((b, i) => {
			if (!b || b.follows == null) return;
			const at = `${u.id} block ${i + 1} (${b.t})`;
			if (b.follows !== true) {
				errs.push(`${at}: follows: is true or absent, not ${JSON.stringify(b.follows)}`);
				return;
			}
			const p = parentIndex(bs, i);
			if (p < 0) {
				errs.push(`${at}: follows: on the first block — there is nothing above it to follow`);
				return;
			}
			if (b.t === "attempt") errs.push(`${at}: an attempt cannot follow anything`);
			const pt = tierOf(bs[p]), t = tierOf(b);
			if (pt !== "spine" && t !== pt) errs.push(`${at}: a ${t} block follows block ${p + 1}, which is ${pt} — the lane hides ${pt} on its own, so a follow-up of it must be ${pt} too`);
		});
	}
}
const ASIDE_MAX = 320;
function checkAsides(C, errs, warns) {
	const strip = (v) => String(v).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
	for (const s of C.sections) for (const u of s.subs) {
		(u.blocks || []).forEach((b, i) => {
			if (!b) return;
			const at = `${u.id} block ${i + 1} (${b.t})`;
			const own = textOf({
				...b,
				asides: null
			});
			const anchors = anchorKeys(own);
			const notes = b.asides == null ? {} : b.asides;
			if (typeof notes !== "object" || Array.isArray(notes)) {
				errs.push(`${at}: asides: is a mapping of anchor key to note`);
				return;
			}
			const seen = /* @__PURE__ */ new Set();
			for (const k of anchors) {
				if (seen.has(k)) errs.push(`${at}: anchor "${k}" is used twice — one anchor, one aside`);
				seen.add(k);
				if (notes[k] == null) errs.push(`${at}: <n k="${k}"> has no asides.${k}`);
			}
			for (const [k, v] of Object.entries(notes)) {
				if (!seen.has(k)) errs.push(`${at}: asides.${k} has no <n k="${k}"> anchor in the block, so it is never shown`);
				if (typeof v !== "string") {
					errs.push(`${at}: asides.${k} is not a string`);
					continue;
				}
				if (anchorKeys(v).length) errs.push(`${at}: asides.${k} contains an anchor — asides do not nest`);
				if (strip(v).length > ASIDE_MAX) warns.push(`${at}: asides.${k} runs past ${ASIDE_MAX} characters — consider a depth follow-up if this crowds the margin (no length limit)`);
			}
		});
		if (anchorKeys(textOf(u.quiz || [])).length) errs.push(`${u.id}: an aside anchor in a question — asides belong to blocks`);
	}
}
//#endregion
//#region tools/validate.mjs
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COURSES = COURSES$1;
const coreBlocks = readFileSync(join(ROOT, "src/blocks/index.js"), "utf8");
const KNOWN = /* @__PURE__ */ new Set([...[...coreBlocks.matchAll(/\bR\("([a-z]+)"/g)].map((m) => m[1]), ...INTERACTIVE]);
const args = process.argv.slice(2);
const isolated = args.includes("--isolated");
const wanted = args.filter((a) => !a.startsWith("--"));
const courses = existsSync(COURSES) ? readdirSync(COURSES, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name).filter((n) => !wanted.length || wanted.includes(n)) : [];
const allCourseIds = isolated ? courses : existsSync(COURSES) ? readdirSync(COURSES, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name) : [];
const otherIds = {};
const byCode = {};
const byHue = {};
for (const cid of allCourseIds) try {
	const { course } = loadCourse(join(COURSES, cid));
	const set = /* @__PURE__ */ new Set();
	course.sections.forEach((s2) => {
		set.add(s2.id);
		s2.subs.forEach((u) => set.add(u.id));
	});
	otherIds[cid] = set;
	(byCode[String(course.code || cid).replace(/\s+/g, "")] ||= []).push(cid);
	(byHue[Number(course.theme && course.theme.hue) || 0] ||= []).push(cid);
} catch {}
function checkSpineStandsAlone(C, errs) {
	const spineFigs = /* @__PURE__ */ new Set();
	for (const s of C.sections) for (const u of s.subs) for (const b of u.blocks || []) if (b && b.id && tierOf(b) === "spine") spineFigs.add(b.id);
	for (const s of C.sections) for (const u of s.subs) for (const b of u.blocks || []) {
		if (!b || tierOf(b) !== "spine") continue;
		for (const m of textOf(b).matchAll(/<f\s+k="([^"]+)"/g)) if (!spineFigs.has(m[1])) errs.push(`${u.id}: a spine block cites figure "${m[1]}", which only exists in a collapsed tier`);
	}
}
const FORMATS = /* @__PURE__ */ new Set([
	"multiple-choice",
	"short-answer",
	"cued-recall",
	"derivation",
	"numeric"
]);
const DRILL_MIN = 3;
function checkDrills(C, errs, warns) {
	const bank = C.drills || {};
	if (!Object.keys(bank).length) return;
	const examFormats = new Set((C.exam || {}).format || []);
	for (const [key, file] of Object.entries(bank)) {
		const at = `drills/${key}`;
		if (!C.concepts[key]) {
			errs.push(`${at}: names concept "${key}", which no concepts/ file defines`);
			continue;
		}
		const items = file.items || [];
		if (items.length < DRILL_MIN) errs.push(`${at}: ${items.length} item(s) — the criterion needs ${DRILL_MIN} different ones`);
		const formats = /* @__PURE__ */ new Set(), answers = /* @__PURE__ */ new Set();
		items.forEach((it, i) => {
			const where = `${at} item ${i + 1}`;
			if (!String(it.stem || "").trim()) errs.push(`${where}: no stem`);
			if (!String(it.answer || "").trim()) errs.push(`${where}: no answer`);
			if (!(it.steps || []).length) errs.push(`${where}: no worked steps — M11 wants it reconstructible`);
			if (!FORMATS.has(it.format)) errs.push(`${where}: unknown format "${it.format}"`);
			formats.add(it.format);
			const a = String(it.answer || "").trim().toLowerCase();
			if (answers.has(a)) errs.push(`${where}: another item in this file has the same answer`);
			answers.add(a);
			if (a.length > 3 && String(it.stem || "").toLowerCase().includes(a)) errs.push(`${where}: the stem contains the answer`);
			if (!it.verified) warns.push(`${where}: no verified: date — it counts as unverified`);
		});
		if (formats.size < 2) errs.push(`${at}: every item is ${[...formats][0]} — practice format has to vary`);
		if (examFormats.size && ![...formats].some((f) => examFormats.has(f))) errs.push(`${at}: no item matches the exam format (${[...examFormats].join(", ")})`);
	}
}
function checkReviewSet(C, errs, warns) {
	const reviewed = Object.entries(C.concepts || {}).filter(([, c]) => c && c.review).map(([k]) => k);
	for (const key of reviewed) if (!C.drills[key]) errs.push(`concepts/${key}: review: true with no drills/${key}.yaml — a reviewed concept owes ${DRILL_MIN} worked items`);
	for (const key of Object.keys(C.drills)) if (C.concepts[key] && !C.concepts[key].review) warns.push(`drills/${key}: the concept is not marked review: true — the drill bank and the declared review set disagree`);
	if (reviewed.length && !C.reviewBasis) errs.push(`materials/expectations.md: ${reviewed.length} concept(s) are marked for review but no review.basis says on what grounds — an undeclared set cannot be revised`);
}
function checkExaminableInSpine(C, warns) {
	const examFormats = new Set((C.exam || {}).format || []);
	if (!examFormats.size) return;
	const tiersOf = {};
	for (const s of C.sections) for (const u of s.subs) for (const b of u.blocks || []) {
		if (!b) continue;
		for (const m of textOf(b).matchAll(/<c\s+k="([^"]+)"/g)) (tiersOf[m[1]] ||= /* @__PURE__ */ new Set()).add(tierOf(b));
	}
	for (const [key, file] of Object.entries(C.drills)) {
		if (!(file.items || []).some((it) => examFormats.has(it.format))) continue;
		const tiers = tiersOf[key];
		if (tiers && !tiers.has("spine")) warns.push(`concepts/${key}: the exam can test it, but every block citing it is ${[...tiers].join("/")} — a spine-only reader never meets it (M25)`);
	}
}
const RESTATE = 8;
function checkClaims(C, errs, warns) {
	const norm = (t) => String(t).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
	for (const s of C.sections) for (const u of s.subs) for (const b of u.blocks || []) {
		if (!b) continue;
		const core = String(b.core || "").trim(), gist = String(b.gist || "").trim();
		if (core && gist) errs.push(`${u.id} ${b.t}: declares both core: and gist: — a block states its claim one way. core: splits the prose, gist: summarises it; both is two records of one choice`);
		if (!core) continue;
		const c = norm(core), h = norm(b.h || "");
		if (!c) {
			errs.push(`${u.id} ${b.t}: core: is empty`);
			continue;
		}
		if (h && (h.startsWith(c) || c.startsWith(h.slice(0, Math.max(24, c.length))))) errs.push(`${u.id} ${b.t}: core: repeats the opening of its own h: — h: holds what develops the claim, not the claim again`);
		else if (h) {
			const w = c.split(" ").filter(Boolean);
			for (let i = 0; i + RESTATE <= w.length; i++) {
				const run = w.slice(i, i + RESTATE).join(" ");
				if (h.includes(run)) {
					warns.push(`${u.id} ${b.t}: h: still contains "${run}…" from its own core: — hoisting a claim means moving it, not copying it`);
					break;
				}
			}
		}
	}
}
const ENUM = /<(ul|ol|table)[\s>]/i;
function checkClaimFit(C, warns) {
	for (const s of C.sections) for (const u of s.subs) for (const b of u.blocks || []) {
		if (!b || !leadOf(b) || b.t === "ex") continue;
		if (present(b, "notes").mode !== "lead") continue;
		if (!ENUM.test(String(b.h || ""))) continue;
		const at = String(b.label || b.term || b.title || "").slice(0, 40);
		warns.push(`${u.id} ${b.t}${at ? ` "${at}"` : ""}: its claim closes a list inside its own body. Either set notes: open, or move the list into a list block`);
	}
}
function checkCells(C, errs) {
	const bad = (where, v) => {
		if (typeof v === "string" || typeof v === "number") return false;
		const shown = JSON.stringify(v) || String(v);
		errs.push(`${where} is ${Array.isArray(v) ? "a list" : typeof v} where a string is required: ${shown.slice(0, 90)}` + (v && !Array.isArray(v) && typeof v === "object" ? ` — an unquoted ": " makes YAML read the line as a mapping; quote the whole string` : ""));
		return true;
	};
	const each = (where, arr, fn) => (arr || []).forEach((v, i) => fn(`${where}[${i}]`, v));
	for (const s of C.sections || []) for (const u of s.subs || []) (u.blocks || []).forEach((b, i) => {
		if (!b) return;
		const at = `${u.id} block ${i} (${b.t})`;
		if (b.items != null) each(`${at} items`, b.items, bad);
		if (b.t === "table") {
			each(`${at} head`, b.head, bad);
			each(`${at} rows`, b.rows, (w, row) => Array.isArray(row) ? each(w, row, bad) : bad(w, row));
		}
		each(`${at} steps`, b.steps, bad);
	});
	for (const s of C.sections || []) for (const u of s.subs || []) (u.quiz || []).forEach((q, i) => each(`${u.id} quiz ${i} steps`, q.steps, bad));
	for (const [k, f] of Object.entries(C.drills || {})) (f.items || []).forEach((it, i) => each(`drills/${k} item ${i} steps`, it.steps, bad));
}
const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function checkCats(C, errs, warns) {
	const cats = C.cats || {};
	const members = {};
	const seen = (key, where) => {
		if (!key) return;
		if (!cats[key]) errs.push(`${where}: cat: "${key}" names no categories/${key}.yaml — a category is declared, never inferred`);
		else (members[key] ||= []).push(where);
	};
	const tags = (list, where) => {
		for (const t of list || []) if (!TAG.test(String(t))) errs.push(`${where}: tag "${t}" is not a slug — lowercase, digits and single hyphens, so the same tag cannot index twice under two spellings`);
	};
	for (const s of C.sections) for (const u of s.subs) (u.blocks || []).forEach((b, i) => {
		if (!b) return;
		seen(b.cat, `${u.id} block ${i + 1}`);
		tags(b.tags, `${u.id} block ${i + 1}`);
	});
	for (const [k, c] of Object.entries(C.concepts || {})) {
		seen(c.cat, `concepts/${k}`);
		tags(c.tags, `concepts/${k}`);
	}
	for (const [k, d] of Object.entries(cats)) {
		const at = `categories/${k}`;
		if (!String(d.name || "").trim()) errs.push(`${at}: no name`);
		if (!String(d.boundary || "").trim()) errs.push(`${at}: no boundary — a category without one is a label with a page. Say what is in it and what is not`);
		if (!(members[k] || []).length) errs.push(`${at}: nothing declares cat: ${k} — a category with no members is a heading, and the page renders empty`);
		for (const sib of d.siblings || []) {
			if (!cats[sib]) {
				errs.push(`${at}: siblings names "${sib}", which is not a category`);
				continue;
			}
			if (!(cats[sib].siblings || []).includes(k)) errs.push(`${at} and categories/${sib}: siblings must name each other — a contrast drawn one way is half a contrast`);
		}
	}
}
function checkClusters(C, errs) {
	for (const [key, c] of Object.entries(C.concepts || {})) for (const other of c.confusable_with || []) {
		const o = (C.concepts || {})[other];
		if (!o) {
			errs.push(`concepts/${key}: confusable_with "${other}", which is not a concept`);
			continue;
		}
		if (!(o.confusable_with || []).includes(key)) errs.push(`concepts/${key} and concepts/${other}: confusable_with must name each other`);
	}
}
function checkPrimers(C, errs) {
	for (const s of C.sections) (s.primer || []).forEach((q, i) => {
		const where = `${s.id} primer ${i + 1}`;
		if (!String(q.ask || "").trim()) errs.push(`${where}: no question`);
		if (!String(q.answer || "").trim()) errs.push(`${where}: no answer — an uncorrected conceptual pretest error is worse than none`);
	});
}
let failed = 0;
for (const id of courses) {
	const errs = [], warns = [];
	let C;
	try {
		const r = loadCourse(join(COURSES, id));
		C = r.course;
		errs.push(...r.errors);
	} catch (e) {
		console.log(`FAIL ${id}  ${e.message}`);
		failed++;
		continue;
	}
	const extraBlocks = existsSync(join(COURSES, id, "blocks.js")) ? new Set([...readFileSync(join(COURSES, id, "blocks.js"), "utf8").matchAll(/register\(\s*"([a-z]+)"/g)].map((m) => m[1])) : /* @__PURE__ */ new Set();
	const ids = /* @__PURE__ */ new Set();
	C.sections.forEach((s) => {
		ids.add(s.id);
		s.subs.forEach((u) => ids.add(u.id));
	});
	if (id === "review") errs.push(`"review" is the cross-course review route, so it cannot also be a course id`);
	const sharesCode = (byCode[String(C.code || id).replace(/\s+/g, "")] || []).filter((x) => x !== id);
	if (sharesCode.length) errs.push(`code "${C.code}" is also used by ${sharesCode.join(", ")} — learner state is keyed on it, so both courses would share one reader's quiz history and review schedule`);
	const sharesHue = (byHue[Number(C.theme && C.theme.hue) || 0] || []).filter((x) => x !== id);
	if (sharesHue.length) warns.push(`theme.hue ${Number(C.theme && C.theme.hue) || 0} is also used by ${sharesHue.join(", ")} — the two are indistinguishable in the library; pick another angle`);
	for (const pat of C.syntax && C.syntax.patterns || []) try {
		new RegExp(pat.re);
	} catch (e) {
		errs.push(`syntax pattern "${pat.re}" does not parse — ${e.message}`);
	}
	for (const s2 of C.sections) {
		const slug = /^\d+[-_]/.test(s2.title) || /[a-z]-[a-z]/.test(s2.title) && s2.title === s2.title.toLowerCase();
		if (!s2.title || slug) errs.push(`${s2.id}: no title — add _section.yaml (showing "${s2.title}")`);
		if (!String(s2.blurb || "").trim()) errs.push(`${s2.id} "${s2.title}": no blurb — the section head and course contents both render it`);
	}
	const defined = new Set(Object.keys(C.concepts || {}));
	const used = /* @__PURE__ */ new Set();
	let qCount = 0;
	const figIds = /* @__PURE__ */ new Set();
	for (const s2 of C.sections) for (const u of s2.subs) for (const b of u.blocks || []) {
		if (!b || ![
			"figure",
			"image",
			"slides"
		].includes(b.t) || !b.id) continue;
		if (figIds.has(b.id)) errs.push(`${u.id}: two figures both claim id "${b.id}"`);
		figIds.add(b.id);
	}
	for (const s of C.sections) for (const u of s.subs) {
		const where = `${u.id} "${u.title}"`;
		let namedTerms = 0;
		for (const b of u.blocks || []) {
			if (!b || !b.t) {
				errs.push(`${where}: a block has no type`);
				continue;
			}
			if (!KNOWN.has(b.t) && !extraBlocks.has(b.t)) errs.push(`${where}: unknown block type "${b.t}"`);
			if (b.t === "figure") checkFigure(b, where, errs);
			if (b.t === "slides") checkSlides(b, where, errs);
			if (b.tier && !TIERS.includes(b.tier)) errs.push(`${where}: unknown tier "${b.tier}" — one of ${TIERS.join(", ")}`);
			if (b.notes && !NOTES_MODES.includes(b.notes)) errs.push(`${where}: unknown notes: "${b.notes}" — one of ${NOTES_MODES.join(", ")}`);
			if (b.t === "attempt" && u.blocks.indexOf(b) !== 0) errs.push(`${where}: an "attempt" block may only be the first block of a subsection`);
			if (b.t === "def" && b.term) namedTerms++;
			if (b.t === "image" && !String(b.alt || "").trim()) errs.push(`${where}: image "${b.src}" has no alt text`);
			const images = b.t === "image" ? [b] : b.t === "slides" ? (Array.isArray(b.frames) ? b.frames : []).map((frame) => frame?.image).filter(Boolean) : [];
			for (const image of images) if (typeof image.src !== "string" || !image.src.trim() || !image.src.startsWith("assets/") || image.src.split("/").includes("..") || image.src.includes("\\") || !existsSync(join(COURSES, id, image.src))) errs.push(`${where}: missing image asset "${image.src}"`);
			if (b.t === "math") {
				if (!String(b.tex || "").trim()) errs.push(`${where}: a math block has no "tex"`);
				else try {
					tex(b.tex, true);
				} catch (e) {
					errs.push(`${where}: math "${String(b.tex).trim()}" — ${e.message.replace(/\s+/g, " ")}`);
				}
			}
			if (b.t === "table" && (b.mono || b.map) && JSON.stringify(b.rows || []).includes("<m>")) errs.push(`${where}: <m> inside a mono/map table — its cells are escaped`);
		}
		if (!namedTerms) errs.push(`${where}: names no term with a def block — its section's primer loses coverage`);
		const q = u.quiz || [];
		if (!q.length) errs.push(`${where}: no questions`);
		const seenType = /* @__PURE__ */ new Set();
		for (const item of q) {
			qCount++;
			const t = String(item.type || "").trim().toLowerCase();
			if (!t) {
				errs.push(`${where}: a question has no type`);
				continue;
			}
			if (seenType.has(t)) errs.push(`${where}: repeats question type "${item.type}"`);
			seenType.add(t);
			for (const k of [
				"q",
				"a",
				"why"
			]) if (!item[k] || !String(item[k]).trim()) errs.push(`${where}: question "${item.type}" missing "${k}"`);
			if (item.concept && !defined.has(item.concept)) errs.push(`${where}: question "${item.type}" names concept "${item.concept}", which no concepts/ file defines`);
		}
		const HTML_FIELDS = [
			"h",
			"q",
			"a",
			"why",
			"cap",
			"label",
			"title",
			"note"
		];
		const bare = new RegExp(`</?(?!(?:a|b|br|c|code|em|f|i|li|m|n|ol|p|span|strong|sub|sup|ul)[\\s/>])[a-zA-Z]|&(?![a-zA-Z#][0-9a-zA-Z]*;)[a-zA-Z#]`);
		const checkHtml = (v, what) => {
			if (typeof v !== "string") return;
			v = v.replace(/<m>[\s\S]*?<\/m>/g, (m) => " ".repeat(m.length));
			if (!bare.test(v)) return;
			const at = v.search(bare);
			errs.push(`${what}: bare "${v[at]}" in HTML — write &lt; or &amp;  …${v.slice(Math.max(0, at - 24), at + 24)}…`);
		};
		for (const b of u.blocks || []) {
			if (!b) continue;
			for (const k of HTML_FIELDS) if (b[k] != null) checkHtml(b[k], `${where} ${b.t}.${k}`);
			for (const row of b.rows || []) for (const c of row) checkHtml(c, `${where} ${b.t} cell`);
			if (Array.isArray(b.items)) b.items.forEach((v) => checkHtml(v, `${where} ${b.t} item`));
			if (b.t === "slides" && Array.isArray(b.frames)) b.frames.forEach((frame, i) => checkHtml(frame?.text, `${where} slide ${i + 1} text`));
			if (b.asides && typeof b.asides === "object") for (const [k, v] of Object.entries(b.asides)) checkHtml(v, `${where} ${b.t}.asides.${k}`);
		}
		for (const item of u.quiz || []) for (const k of HTML_FIELDS) if (item[k] != null) checkHtml(item[k], `${where} quiz "${item.type}".${k}`);
		const text = textOf(u);
		for (const m of text.matchAll(/<m>([\s\S]*?)<\/m>/g)) try {
			tex(m[1], false);
		} catch (e) {
			errs.push(`${where}: math "${m[1].trim()}" — ${e.message.replace(/\s+/g, " ")}`);
		}
		for (const m of text.matchAll(/<c\s+k="([^"]+)"/g)) {
			used.add(m[1]);
			if (!defined.has(m[1])) errs.push(`${where}: concept "${m[1]}" has no definition`);
		}
		for (const m of text.matchAll(/<f\s+k="([^"]+)"/g)) if (!figIds.has(m[1])) errs.push(`${where}: figure reference "${m[1]}" matches no figure id`);
		for (const m of text.matchAll(/href="#([^"]+)"/g)) {
			const target = m[1];
			if (target.startsWith("/")) {
				const [, other, ...rest] = target.split("/");
				const id = rest.join("/");
				if (!otherIds[other]) {
					errs.push(`${where}: link to unknown course "${other}"`);
					continue;
				}
				if (id && !otherIds[other].has(id) && !id.startsWith("c/")) errs.push(`${where}: cross-course link "#${target}" points at nothing in ${other}`);
				continue;
			}
			if (!ids.has(target)) errs.push(`${where}: cross-link "#${target}" points at nothing`);
		}
	}
	checkSpineStandsAlone(C, errs);
	checkClaims(C, errs, warns);
	checkClaimFit(C, warns);
	checkRunInLists(C, errs);
	checkFollows(C, errs);
	checkAsides(C, errs, warns);
	checkCells(C, errs);
	checkCats(C, errs, warns);
	checkReviewSet(C, errs, warns);
	checkDrills(C, errs, warns);
	checkExaminableInSpine(C, warns);
	checkClusters(C, errs);
	checkPrimers(C, errs);
	for (const c of Object.values(C.concepts || {})) for (const m of String(c.body || "").matchAll(/<c\s+k="([^"]+)"/g)) {
		used.add(m[1]);
		if (!defined.has(m[1])) errs.push(`concept card references undefined concept "${m[1]}"`);
	}
	for (const k of defined) if (!used.has(k)) warns.push(`concept "${k}" is defined but never referenced`);
	const subs = C.sections.reduce((n, s) => n + s.subs.length, 0);
	failed += errs.length;
	console.log(`${errs.length ? "FAIL" : "ok  "} ${id.padEnd(10)} ${C.sections.length} sections · ${subs} subsections · ${qCount} questions · ${defined.size} concepts`);
	errs.forEach((e) => console.log("       ✗ " + e));
	warns.forEach((w) => console.log("       ! " + w));
}
if (!courses.length) console.log("no courses found");
process.exit(failed ? 1 : 0);
//#endregion
export {};
