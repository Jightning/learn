#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region node_modules/js-yaml/dist/js-yaml.mjs
/*! js-yaml 5.4.2 https://github.com/nodeca/js-yaml @license MIT */
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
function isPlainObject$1(data) {
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
		} else if (isPlainObject$1(item)) {
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
	identify: isPlainObject$1,
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
/**
* The dumper schema for maximum compatibility. It combines all supported type
* variants from YAML 1.1 and YAML 1.2 so strings matching any of them are
* quoted. This makes the generated YAML more compatible with other parsers.
*
* The schema is based on YAML 1.1, but extends `!!int` and `!!float` to accept
* both YAML 1.1 and Core Schema forms, since Core Schema supports some forms
* that YAML 1.1 does not.
*
* @category Schemas
*/
var DUMP_SCHEMA = new Schema([
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
	identify: (data) => data instanceof Map || isPlainObject$1(data),
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
	identify: isPlainObject$1,
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
function tagPercentEncode(source) {
	return encodeURI(source).replace(/!/g, "%21");
}
function tagNameFull(rawTag, tagHandlers) {
	if (rawTag.startsWith("!<") && rawTag.endsWith(">")) return decodeURIComponent(rawTag.slice(2, -1));
	const handleEnd = rawTag.indexOf("!", 1);
	const handle = handleEnd === -1 ? "!" : rawTag.slice(0, handleEnd + 1);
	const prefix = tagHandlers?.[handle] ?? DEFAULT_TAG_HANDLERS[handle] ?? handle;
	return decodeURIComponent(prefix) + decodeURIComponent(rawTag.slice(handle.length));
}
function tagNameShort(fullTag) {
	let tag = fullTag;
	if (tag.charCodeAt(0) === 33) {
		tag = tag.slice(1);
		return `!${tagPercentEncode(tag)}`;
	}
	if (tag.slice(0, 18) === "tag:yaml.org,2002:") return `!!${tagPercentEncode(tag.slice(18))}`;
	return `!<${tagPercentEncode(tag)}>`;
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
var INVALID = Symbol("INVALID");
function buildRepresentTypes(schema) {
	const defaultTags = new Set([
		schema.defaultScalarTag,
		schema.defaultSequenceTag,
		schema.defaultMappingTag
	].filter((t) => t !== void 0));
	const implicitScalars = schema.implicitScalarTags;
	const explicitTags = schema.tags.filter((t) => !(t.nodeKind === "scalar" && t.implicit) && !defaultTags.has(t));
	const defaultTagsLast = schema.tags.filter((t) => defaultTags.has(t));
	return [
		...implicitScalars.map((tag) => ({
			tag,
			implicitTag: true
		})),
		...explicitTags.map((tag) => ({
			tag,
			implicitTag: false
		})),
		...defaultTagsLast.map((tag) => ({
			tag,
			implicitTag: true
		}))
	];
}
function matchTag(state, object) {
	for (let index = 0, length = state.representTypes.length; index < length; index += 1) {
		const { tag, implicitTag } = state.representTypes[index];
		if (tag.identify(object)) {
			let tagName;
			if (tag.matchByTagPrefix) tagName = tag.representTagName(object);
			else tagName = tag.tagName;
			return {
				tag,
				tagName,
				implicitTag
			};
		}
	}
	return null;
}
function build(state, object) {
	if (!state.noRefs && object !== null && typeof object === "object") {
		const existing = state.refs.get(object);
		if (existing) {
			if (existing.anchor === void 0) existing.anchor = `ref_${state.refCounter++}`;
			return {
				kind: "alias",
				anchor: existing.anchor
			};
		}
	}
	const matched = matchTag(state, object);
	if (!matched) {
		if (object === void 0) return INVALID;
		if (state.skipInvalid) return INVALID;
		throw new YAMLException(`unacceptable kind of an object to dump ${Object.prototype.toString.call(object)}`);
	}
	const { tag, tagName, implicitTag } = matched;
	const nodeTagName = implicitTag ? tagName : tagNameShort(tagName);
	if (tag.nodeKind === "scalar") return {
		kind: "scalar",
		tag: nodeTagName,
		tagged: !implicitTag,
		style: SCALAR_STYLE.PLAIN,
		value: tag.represent(object)
	};
	if (tag.nodeKind === "sequence") {
		const container = tag.represent(object);
		const node = {
			kind: "sequence",
			tag: nodeTagName,
			tagged: !implicitTag,
			style: COLLECTION_STYLE.BLOCK,
			items: []
		};
		if (!state.noRefs) state.refs.set(object, node);
		for (let index = 0, length = container.length; index < length; index += 1) {
			let item = build(state, container[index]);
			if (item === INVALID && container[index] === void 0) item = build(state, null);
			if (item === INVALID) continue;
			node.items.push(item);
		}
		return node;
	}
	const map = tag.represent(object);
	const node = {
		kind: "mapping",
		tag: nodeTagName,
		tagged: !implicitTag,
		style: COLLECTION_STYLE.BLOCK,
		items: []
	};
	if (!state.noRefs) state.refs.set(object, node);
	for (const [objectKey, objectValue] of map) {
		const key = build(state, objectKey);
		if (key === INVALID) continue;
		const value = build(state, objectValue);
		if (value === INVALID) continue;
		node.items.push({
			key,
			value
		});
	}
	return node;
}
/**
* Convert JS object to AST. A JS value is one YAML document. An unrepresentable
* root becomes an empty document, which the presenter renders as an empty
* string.
*
* @category AST
*/
function jsToAst(input, schema, options = {}) {
	const root = build({
		representTypes: buildRepresentTypes(schema),
		noRefs: options.noRefs ?? false,
		skipInvalid: options.skipInvalid ?? false,
		refs: /* @__PURE__ */ new Map(),
		refCounter: 0
	}, input);
	return [{
		contents: root === INVALID ? null : root,
		directives: []
	}];
}
/**
* Return from a visitor to stop the whole traversal.
*
* @category AST
*/
var VISIT_BREAK = Symbol("visit:break");
/**
* Return from a visitor to skip the current node's children.
*
* @category AST
*/
var VISIT_SKIP = Symbol("visit:skip");
function visitNode(node, visitor, ctx) {
	const control = visitor(node, ctx);
	if (control === VISIT_BREAK) return true;
	if (control === VISIT_SKIP) return false;
	const depth = ctx.depth + 1;
	switch (node.kind) {
		case "sequence":
			for (const item of node.items) if (visitNode(item, visitor, {
				depth,
				parent: node,
				isKey: false
			})) return true;
			break;
		case "mapping": for (const { key, value } of node.items) {
			if (visitNode(key, visitor, {
				depth,
				parent: node,
				isKey: true
			})) return true;
			if (visitNode(value, visitor, {
				depth,
				parent: node,
				isKey: false
			})) return true;
		}
	}
	return false;
}
/**
* Walk every node in the documents, calling {@link Visitor} once per
* node (pre-order).
*
* @category AST
*/
function visit(documents, visitor) {
	for (const doc of documents) if (doc.contents && visitNode(doc.contents, visitor, {
		depth: 0,
		parent: null,
		isKey: false
	})) return;
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
	if (layout.node.tag !== layout.presenterOptions.schema.defaultScalarTag.tagName) return;
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
function setBit(mask, bit) {
	return mask | 1 << bit;
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
var NS_PLAIN_FLOW_OUT = new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT})$`, "u");
var NS_PLAIN_FLOW_IN = new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_IN})$`, "u");
var NS_PLAIN_BLOCK_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY})$`, "u");
var NS_PLAIN_FLOW_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_FLOW_KEY})$`, "u");
var NB_SINGLE_ONE_LINE = new RegExp(`^(?:${SRC_NB_JSON})*$`, "u");
var NB_SINGLE_MULTI_LINE = new RegExp(`^(?:${SRC_NB_JSON}|\\n)*$`, "u");
var BLOCK_SCALAR_CONTENT = new RegExp(`^(?:${SRC_NB_CHAR}|\\n)*$`, "u");
var C_FORBIDDEN_FIRST_LINE = /^(?:---|\.\.\.)(?=$|[ \t\n\r])/;
var C_FORBIDDEN_CONTENT = /^(?:---|\.\.\.)(?=$|[ \t\n\r])/m;
function canUsePlain(layout) {
	const str = layout.node.value;
	if (str !== "") {
		if (!(layout.isKey ? layout.flowOnly ? NS_PLAIN_FLOW_KEY : NS_PLAIN_BLOCK_KEY : layout.flowOnly ? NS_PLAIN_FLOW_IN : NS_PLAIN_FLOW_OUT).test(str)) return false;
		if (layout.shiftOfFirstLine === 0 && C_FORBIDDEN_FIRST_LINE.test(str)) return false;
		if (layout.shiftOfContent === 0) {
			const firstLineBreak = str.indexOf("\n");
			if (firstLineBreak !== -1) {
				const content = str.slice(firstLineBreak + 1);
				if (C_FORBIDDEN_CONTENT.test(content)) return false;
			}
		}
	}
	const resolvedTag = layout.presenterOptions.schema.resolveImplicitScalarTag(str).tag.tagName;
	if (!layout.node.tagged && resolvedTag !== layout.node.tag) return false;
	if (!layout.node.tagged && str === "=" && resolvedTag === layout.presenterOptions.schema.defaultScalarTag.tagName) return false;
	return true;
}
function canUseSingleQuoted(layout) {
	const str = layout.node.value;
	if (!(layout.isKey ? NB_SINGLE_ONE_LINE : NB_SINGLE_MULTI_LINE).test(str)) return false;
	if (/[ \t]\n|\n[ \t]/.test(str)) return false;
	if (!layout.isKey && layout.shiftOfContent === 0) {
		const firstLineBreak = str.indexOf("\n");
		if (firstLineBreak !== -1 && C_FORBIDDEN_CONTENT.test(str.slice(firstLineBreak + 1))) return false;
	}
	return true;
}
function canUseBlock(layout) {
	if (layout.flowOnly || !BLOCK_SCALAR_CONTENT.test(layout.node.value)) return false;
	const contentIndent = layout.shiftOfContent - layout.shiftOfParent;
	if (contentIndent < 1) return false;
	if (contentIndent > 9 && /^\n* /.test(layout.node.value)) return false;
	if (layout.shiftOfContent === 0 && C_FORBIDDEN_CONTENT.test(layout.node.value)) return false;
	return true;
}
function detectAllowedStyles(layout) {
	let mask = setBit(0, SCALAR_STYLE.DOUBLE_QUOTED);
	if (canUsePlain(layout)) mask = setBit(mask, SCALAR_STYLE.PLAIN);
	if (canUseSingleQuoted(layout)) mask = setBit(mask, SCALAR_STYLE.SINGLE_QUOTED);
	if (canUseBlock(layout)) mask = setBit(setBit(mask, SCALAR_STYLE.LITERAL_BLOCK), SCALAR_STYLE.FOLDED_BLOCK);
	layout.allowedStylesMask = mask;
}
function renderScalar(layout) {
	switch (layout.style) {
		case SCALAR_STYLE.PLAIN: return renderPlain(layout);
		case SCALAR_STYLE.SINGLE_QUOTED: return renderSingleQuoted(layout);
		case SCALAR_STYLE.LITERAL_BLOCK: return renderLiteralBlock(layout);
		case SCALAR_STYLE.FOLDED_BLOCK: return renderFoldedBlock(layout);
		case SCALAR_STYLE.DOUBLE_QUOTED: return renderDoubleQuoted(layout);
	}
}
function renderPlain(layout) {
	return encodeFlowBreaks(layout.node.value, layout.shiftOfContent);
}
function renderSingleQuoted(layout) {
	return `'${encodeFlowBreaks(layout.node.value, layout.shiftOfContent).replace(/'/g, "''")}'`;
}
function renderLiteralBlock(layout) {
	const value = layout.node.value;
	return "|" + blockHeader(value, layout.shiftOfParent, layout.shiftOfContent) + dropEndingNewline(indentString(value, layout.shiftOfContent));
}
function renderFoldedBlock(layout) {
	const value = layout.node.value;
	const w = layout.presenterOptions.lineWidth;
	let availableWidth = Infinity;
	if (w !== -1) availableWidth = Math.max(Math.min(w, 40), w - layout.shiftOfContent);
	return ">" + blockHeader(value, layout.shiftOfParent, layout.shiftOfContent) + dropEndingNewline(indentString(foldBlockScalar(value, availableWidth), layout.shiftOfContent));
}
function renderDoubleQuoted(layout) {
	return `"${escapeString(layout.node.value)}"`;
}
function encodeFlowBreaks(string, shiftOfContent) {
	let nextLF = string.indexOf("\n");
	if (nextLF === -1) return string;
	const pad = " ".repeat(shiftOfContent);
	let result = string.slice(0, nextLF);
	const lineRe = /(\n+)([^\n]*)/g;
	lineRe.lastIndex = nextLF;
	let match;
	while (match = lineRe.exec(string)) {
		const breaks = match[1].length;
		const line = match[2];
		result += "\n".repeat(breaks + 1) + pad + line;
	}
	return result;
}
function indentString(string, spaces) {
	const indent = " ".repeat(spaces);
	let position = 0;
	let result = "";
	const length = string.length;
	while (position < length) {
		let line;
		const next = string.indexOf("\n", position);
		if (next === -1) {
			line = string.slice(position);
			position = length;
		} else {
			line = string.slice(position, next + 1);
			position = next + 1;
		}
		if (line.length && line !== "\n") result += indent;
		result += line;
	}
	return result;
}
function needIndentIndicator(string) {
	return /^\n* /.test(string);
}
function blockHeader(string, shiftOfParent, shiftOfContent) {
	const indentIndicator = needIndentIndicator(string) ? String(shiftOfContent - shiftOfParent) : "";
	const clip = string[string.length - 1] === "\n";
	return `${indentIndicator}${clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-"}\n`;
}
function dropEndingNewline(string) {
	return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function isMoreIndented(char) {
	return char === " " || char === "	";
}
function foldLine(line, width) {
	if (line === "" || isMoreIndented(line[0])) return line;
	const breakRe = / [^ \t]/g;
	let match;
	let start = 0;
	let end;
	let curr = 0;
	let next = 0;
	let result = "";
	while (match = breakRe.exec(line)) {
		next = match.index;
		if (next - start > width) {
			end = curr > start ? curr : next;
			result += `\n${line.slice(start, end)}`;
			start = end + 1;
		}
		curr = next;
	}
	result += "\n";
	if (line.length - start > width && curr > start) result += `${line.slice(start, curr)}\n${line.slice(curr + 1)}`;
	else result += line.slice(start);
	return result.slice(1);
}
function foldBlockScalar(string, width) {
	const lineRe = /(\n+)([^\n]*)/g;
	let nextLF = string.indexOf("\n");
	if (nextLF === -1) nextLF = string.length;
	lineRe.lastIndex = nextLF;
	let result = foldLine(string.slice(0, nextLF), width);
	let prevMoreIndented = string[0] === "\n" || isMoreIndented(string[0]);
	let moreIndented;
	let match;
	while (match = lineRe.exec(string)) {
		const prefix = match[1];
		const line = match[2];
		moreIndented = line !== "" && isMoreIndented(line[0]);
		result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
		prevMoreIndented = moreIndented;
	}
	return result;
}
var CHARACTERS_TO_ESCAPE = /["\\\x00-\x1F\x7F-\xA0\u2028\u2029\uD800-\uDFFF\uFEFF\uFFFE\uFFFF]/gu;
function escapeCharacter(character) {
	switch (character) {
		case "\0": return "\\0";
		case "\x07": return "\\a";
		case "\b": return "\\b";
		case "	": return "\\t";
		case "\n": return "\\n";
		case "\v": return "\\v";
		case "\f": return "\\f";
		case "\r": return "\\r";
		case "\x1B": return "\\e";
		case "\"": return "\\\"";
		case "\\": return "\\\\";
		case "": return "\\N";
		case "\xA0": return "\\_";
		case "\u2028": return "\\L";
		case "\u2029": return "\\P";
	}
	const code = character.charCodeAt(0);
	const hex = code.toString(16).toUpperCase();
	if (code <= 255) return `\\x${"0".repeat(2 - hex.length)}${hex}`;
	return `\\u${"0".repeat(4 - hex.length)}${hex}`;
}
function escapeString(string) {
	return string.replace(CHARACTERS_TO_ESCAPE, escapeCharacter);
}
var CHAR_LINE_FEED = 10;
var DEFAULT_PRESENTER_OPTIONS = {
	indent: 2,
	seqNoIndent: false,
	seqInlineFirst: true,
	lineWidth: 80,
	flowBracketPadding: false,
	flowSkipCommaSpace: false,
	flowSkipColonSpace: false,
	quoteFlowKeys: false,
	quoteStyle: "single",
	forceQuotes: false,
	scalarStyleRules: Object.keys(DEFAULT_SCALAR_STYLE_RULES).map((name) => Reflect.get(DEFAULT_SCALAR_STYLE_RULES, name)),
	tagBeforeAnchor: false
};
function nodeTagShort(node) {
	return node.tagged ? node.tag : tagNameShort(node.tag);
}
function createPresenterState(options) {
	const opts = {
		...DEFAULT_PRESENTER_OPTIONS,
		...options
	};
	if (opts.flowSkipColonSpace) opts.quoteFlowKeys = true;
	return {
		...opts,
		defaultScalarTagName: opts.schema.defaultScalarTag.tagName,
		openEnded: false
	};
}
function generateNextLine(state, level) {
	return `\n${" ".repeat(state.indent * level)}`;
}
function scalarLayout(state, node, parent, level, isKey, flowOnly) {
	return {
		node,
		parent,
		level,
		isKey,
		flowOnly,
		shiftOfParent: level === 0 ? -1 : state.indent * (level - 1),
		shiftOfContent: state.indent * Math.max(1, level),
		shiftOfFirstLine: level === 0 ? 0 : state.indent * level,
		presenterOptions: state,
		allowedStylesMask: 0,
		style: node.style
	};
}
function writeFlowSequence(state, level, node) {
	let result = "";
	for (let index = 0, length = node.items.length; index < length; index += 1) {
		const item = writeNode(state, level, node.items[index], node, {}).text;
		if (index > 0) result += `,${!state.flowSkipCommaSpace ? " " : ""}`;
		result += item;
	}
	const pad = state.flowBracketPadding && node.items.length > 0 ? " " : "";
	return `[${pad}${result}${pad}]`;
}
function writeBlockSequence(state, level, node, compact) {
	let result = "";
	for (let index = 0, length = node.items.length; index < length; index += 1) {
		const item = writeNode(state, level + 1, node.items[index], node, {
			block: true,
			compact: state.seqInlineFirst,
			isblockseq: true
		}).text;
		if (!compact || result !== "") result += generateNextLine(state, level);
		if (item === "" || CHAR_LINE_FEED === item.charCodeAt(0)) result += "-";
		else result += "- ";
		result += item;
	}
	return result;
}
function writeFlowMapping(state, level, node) {
	let result = "";
	for (const { key, value } of node.items) {
		let pairBuffer = "";
		if (result !== "") pairBuffer += `,${!state.flowSkipCommaSpace ? " " : ""}`;
		const keyRender = writeNode(state, level, key, node, { iskey: true });
		const keyText = keyRender.text;
		const valueText = writeNode(state, level, value, node, {}).text;
		const sep = state.flowSkipColonSpace || valueText === "" ? "" : " ";
		const keyIsBareProps = key.kind === "scalar" && keyRender.noBody && (key.tagged || key.anchor !== void 0);
		const keyColonSep = key.kind === "alias" || keyIsBareProps ? " " : "";
		pairBuffer += `${keyText}${keyColonSep}:${sep}${valueText}`;
		result += pairBuffer;
	}
	const pad = state.flowBracketPadding && result !== "" ? " " : "";
	return `{${pad}${result}${pad}}`;
}
function writeBlockMapping(state, level, node, compact) {
	let result = "";
	for (let index = 0, length = node.items.length; index < length; index += 1) {
		let pairBuffer = "";
		if (!compact || result !== "") pairBuffer += generateNextLine(state, level);
		const { key, value } = node.items[index];
		const keyIsBlock = (key.kind === "mapping" || key.kind === "sequence") && key.style === COLLECTION_STYLE.BLOCK && key.items.length !== 0 || key.kind === "scalar" && (key.style === SCALAR_STYLE.LITERAL_BLOCK || key.style === SCALAR_STYLE.FOLDED_BLOCK);
		const keyRender = keyIsBlock ? writeNode(state, level + 1, key, node, {
			block: true,
			compact: true,
			isblockseq: !cannotBeCompact(state, key, level + 1)
		}) : writeNode(state, level + 1, key, node, {
			block: true,
			compact: true,
			iskey: true
		});
		const keyText = keyRender.text;
		const keyHasLineBreak = key.kind === "scalar" && key.value.indexOf("\n") !== -1;
		const keyIsTooLong = keyText.length > 1024 && /^[\s\S]{1025}/u.test(keyText);
		const explicitPair = keyIsBlock || keyHasLineBreak || keyIsTooLong;
		if (explicitPair) if (keyText && CHAR_LINE_FEED === keyText.charCodeAt(0)) pairBuffer += "?";
		else pairBuffer += "? ";
		pairBuffer += keyText;
		if (explicitPair) pairBuffer += generateNextLine(state, level);
		const valueText = writeNode(state, level + 1, value, node, {
			block: true,
			compact: explicitPair,
			isblockseq: explicitPair && !cannotBeCompact(state, value, level + 1)
		}).text;
		const keyIsBareProps = key.kind === "scalar" && keyRender.noBody && (key.tagged || key.anchor !== void 0);
		const keyColonSep = !explicitPair && (key.kind === "alias" || keyIsBareProps) ? " " : "";
		if (valueText === "" || CHAR_LINE_FEED === valueText.charCodeAt(0)) pairBuffer += `${keyColonSep}:`;
		else pairBuffer += `${keyColonSep}: `;
		pairBuffer += valueText;
		result += pairBuffer;
	}
	return result;
}
function cannotBeCompact(state, node, level) {
	if (node.kind === "alias") return true;
	return node.tagged || node.anchor !== void 0 || state.indent < 2 && level > 0;
}
function writeNode(state, level, node, parent, ctx) {
	if (node.kind === "alias") {
		state.openEnded = false;
		return {
			text: `*${node.anchor}`,
			noBody: false
		};
	}
	const { block = false, iskey = false, isblockseq = false } = ctx;
	let compact = ctx.compact ?? false;
	const hasAnchor = node.anchor !== void 0;
	if (cannotBeCompact(state, node, level)) compact = false;
	let body;
	let shouldPrintTag = node.tagged;
	const useBlockCollection = block && (node.kind === "mapping" || node.kind === "sequence") && node.style === COLLECTION_STYLE.BLOCK && node.items.length !== 0;
	if (node.kind === "mapping") if (useBlockCollection) body = writeBlockMapping(state, level, node, compact);
	else body = writeFlowMapping(state, level, node);
	else if (node.kind === "sequence") if (useBlockCollection) if (state.seqNoIndent && !isblockseq && level > 0) body = writeBlockSequence(state, level - 1, node, compact);
	else body = writeBlockSequence(state, level, node, compact);
	else body = writeFlowSequence(state, level, node);
	else {
		const layout = scalarLayout(state, node, parent, level, iskey, !block);
		detectAllowedStyles(layout);
		for (const rule of state.scalarStyleRules) rule(layout);
		body = renderScalar(layout);
		state.openEnded = (layout.style === SCALAR_STYLE.LITERAL_BLOCK || layout.style === SCALAR_STYLE.FOLDED_BLOCK) && (node.value === "\n" || node.value.endsWith("\n\n"));
		shouldPrintTag = node.tagged || body === "" && layout.flowOnly && parent?.kind === "sequence" && !hasAnchor || layout.style !== SCALAR_STYLE.PLAIN && node.tag !== state.defaultScalarTagName;
	}
	if ((node.kind === "mapping" || node.kind === "sequence") && !useBlockCollection) state.openEnded = false;
	if (useBlockCollection && compact && level > 0 && state.indent > 2) body = `${" ".repeat(state.indent - 2)}${body}`;
	const noBody = body === "";
	let text = body;
	if (shouldPrintTag || hasAnchor) {
		const props = [];
		const tag = shouldPrintTag ? nodeTagShort(node) : null;
		const anchor = hasAnchor ? `&${node.anchor}` : null;
		if (state.tagBeforeAnchor) {
			if (tag !== null) props.push(tag);
			if (anchor !== null) props.push(anchor);
		} else {
			if (anchor !== null) props.push(anchor);
			if (tag !== null) props.push(tag);
		}
		const sep = body === "" || body.charCodeAt(0) === CHAR_LINE_FEED ? "" : " ";
		text = `${props.join(" ")}${sep}${body}`;
	}
	return {
		text,
		noBody
	};
}
function rootStartsOwnLine(node) {
	return (node.kind === "sequence" || node.kind === "mapping") && node.style === COLLECTION_STYLE.BLOCK && node.items.length !== 0 && !node.tagged && node.anchor === void 0;
}
function writeDocumentDirectives(doc) {
	let result = "";
	for (const directive of doc.directives) {
		if (directive.kind === "yaml") {
			result += `%YAML ${directive.version}\n`;
			continue;
		}
		const { handle, prefix } = directive;
		result += `%TAG ${handle} ${prefix}\n`;
	}
	return result;
}
/**
* Build YAML from AST.
*
* @category AST
*/
function present(documents, options) {
	const state = createPresenterState(options);
	let result = "";
	let previousEnded = false;
	for (let index = 0; index < documents.length; index += 1) {
		const doc = documents[index];
		state.openEnded = false;
		const directives = writeDocumentDirectives(doc);
		const hasDirectives = directives !== "";
		const marker = doc.explicitStart || hasDirectives || index > 0 && !previousEnded;
		result += directives;
		if (doc.contents === null) {
			if (marker) result += "---\n";
		} else if (marker) {
			const body = writeNode(state, 0, doc.contents, null, {
				block: true,
				compact: true
			}).text;
			const sep = body === "" ? "" : hasDirectives || rootStartsOwnLine(doc.contents) ? "\n" : " ";
			result += `---${sep}${body}\n`;
		} else result += writeNode(state, 0, doc.contents, null, {
			block: true,
			compact: true
		}).text + "\n";
		previousEnded = doc.explicitEnd || state.openEnded;
		if (previousEnded) result += "...\n";
	}
	return result;
}
var DEFAULT_DUMP_OPTIONS = {
	...DEFAULT_PRESENTER_OPTIONS,
	schema: DUMP_SCHEMA,
	skipInvalid: false,
	noRefs: false,
	flowLevel: -1,
	sortKeys: false,
	transform: () => {}
};
function defaultCompareFn(a, b) {
	const x = String(a);
	const y = String(b);
	if (x < y) return -1;
	if (x > y) return 1;
	return 0;
}
/**
* Serializes JS object as a YAML document. By default it can dump every
* supported YAML type, so it throws an exception if you try to dump regexps or
* functions. However, you can disable exceptions by setting the
* {@link DumpOptions.skipInvalid} option to `true`.
*
* @category Main
*/
function dump(input, options = {}) {
	const opts = {
		...DEFAULT_DUMP_OPTIONS,
		...options
	};
	const documents = jsToAst(input, opts.schema, {
		noRefs: opts.noRefs,
		skipInvalid: opts.skipInvalid
	});
	if (opts.flowLevel >= 0) visit(documents, (node, ctx) => {
		if (ctx.depth < opts.flowLevel) return;
		if (node.kind === "sequence" || node.kind === "mapping") node.style = COLLECTION_STYLE.FLOW;
		return VISIT_SKIP;
	});
	if (opts.sortKeys) {
		const compareFn = opts.sortKeys === true ? defaultCompareFn : opts.sortKeys;
		visit(documents, (node) => {
			if (node.kind !== "mapping") return;
			node.items.sort((a, b) => compareFn(a.key.kind === "scalar" ? a.key.value : "", b.key.kind === "scalar" ? b.key.value : ""));
		});
	}
	opts.transform(documents);
	return present(documents, {
		...pick(opts, Object.keys(DEFAULT_PRESENTER_OPTIONS)),
		schema: opts.schema
	});
}
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
//#region node_modules/@babel/runtime/helpers/extends.js
var require_extends = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function _extends() {
		return module.exports = _extends = Object.assign ? Object.assign.bind() : function(n) {
			for (var e = 1; e < arguments.length; e++) {
				var t = arguments[e];
				for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
			}
			return n;
		}, module.exports.__esModule = true, module.exports["default"] = module.exports, _extends.apply(null, arguments);
	}
	module.exports = _extends, module.exports.__esModule = true, module.exports["default"] = module.exports;
}));
//#endregion
//#region node_modules/mathjs/lib/esm/core/config.js
var DEFAULT_CONFIG = {
	relTol: 1e-12,
	absTol: 1e-15,
	matrix: "Matrix",
	number: "number",
	numberFallback: "number",
	precision: 64,
	predictable: false,
	randomSeed: null,
	legacySubset: false
};
//#endregion
//#region node_modules/mathjs/lib/esm/utils/customs.js
/**
* Get a property of a plain object or array
* Throws an error in case the object is not a plain object or the
* property is not defined on the object itself
* @param {Object} object
* @param {string} prop
* @return {*} Returns the property value when safe
*/
function getSafeProperty(object, prop) {
	if (isSafeObjectProperty(object, prop) || isSafeArrayProperty(object, prop)) return object[prop];
	if (isSafeMethod(object, prop)) throw new Error("Cannot access method \"".concat(prop, "\" as a property"));
	if (object === null || object === void 0) throw new TypeError("Cannot access property \"".concat(prop, "\": object is ").concat(object));
	throw new Error("No access to property \"" + prop + "\"");
}
/**
* Set a property on a plain object or array.
* Throws an error in case the object is not a plain object or the
* property would override an inherited property like .constructor or .toString
* @param {Object} object
* @param {string} prop
* @param {*} value
* @return {*} Returns the value
*/
function setSafeProperty(object, prop, value) {
	if (isSafeObjectProperty(object, prop) || isSafeArrayProperty(object, prop)) {
		object[prop] = value;
		return value;
	}
	throw new Error("No access to property \"".concat(prop, "\""));
}
/**
* Test whether a property is safe for reading and writing on an object
* For example .constructor and .__proto__ are not safe
* @param {Object} object
* @param {string} prop
* @return {boolean} Returns true when safe
*/
function isSafeObjectProperty(object, prop) {
	if (!isPlainObject(object)) return false;
	return !(prop in Object.prototype);
}
/**
* Test whether a property is safe for reading and writing on an Array
* For example .__proto__ and .constructor are not safe
* @param {unknown} array
* @param {string | number} prop
* @return {boolean} Returns true when safe
*/
function isSafeArrayProperty(array, prop) {
	if (!Array.isArray(array)) return false;
	return typeof prop === "number" || typeof prop === "string" && isInteger$1(prop) || prop === "length";
}
function isInteger$1(prop) {
	return /^\d+$/.test(prop);
}
/**
* Validate whether a method is safe.
* Throws an error when that's not the case.
* @param {Object} object
* @param {string} method
* @return {function} Returns the method when valid
*/
function getSafeMethod(object, method) {
	if (!isSafeMethod(object, method)) throw new Error("No access to method \"" + method + "\"");
	return object[method];
}
/**
* Check whether a method is safe.
* Throws an error when that's not the case (for example for `constructor`).
* @param {Object} object
* @param {string} method
* @return {boolean} Returns true when safe, false otherwise
*/
function isSafeMethod(object, method) {
	if (object === null || object === void 0 || typeof object[method] !== "function") return false;
	if (hasOwnProperty(object, method) && Object.getPrototypeOf && method in Object.getPrototypeOf(object)) return false;
	if (safeNativeMethods.has(method)) return true;
	if (method in Object.prototype) return false;
	if (method in Function.prototype) return false;
	return true;
}
function isPlainObject(object) {
	return typeof object === "object" && object && object.constructor === Object;
}
var safeNativeMethods = /* @__PURE__ */ new Set([
	"toString",
	"valueOf",
	"toLocaleString"
]);
//#endregion
//#region node_modules/mathjs/lib/esm/utils/map.js
/**
* A map facade on a bare object.
*
* The small number of methods needed to implement a scope,
* forwarding on to the SafeProperty functions. Over time, the codebase
* will stop using this method, as all objects will be Maps, rather than
* more security prone objects.
*/
var ObjectWrappingMap = class {
	constructor(object) {
		this.wrappedObject = object;
		this[Symbol.iterator] = this.entries;
	}
	keys() {
		return Object.keys(this.wrappedObject).filter((key) => this.has(key)).values();
	}
	get(key) {
		return getSafeProperty(this.wrappedObject, key);
	}
	set(key, value) {
		setSafeProperty(this.wrappedObject, key, value);
		return this;
	}
	has(key) {
		return isSafeObjectProperty(this.wrappedObject, key) && key in this.wrappedObject;
	}
	entries() {
		return mapIterator(this.keys(), (key) => [key, this.get(key)]);
	}
	forEach(callback) {
		for (var key of this.keys()) callback(this.get(key), key, this);
	}
	delete(key) {
		if (isSafeObjectProperty(this.wrappedObject, key)) delete this.wrappedObject[key];
	}
	clear() {
		for (var key of this.keys()) this.delete(key);
	}
	get size() {
		return Object.keys(this.wrappedObject).length;
	}
};
/**
* Create a map with two partitions: a and b.
* The set with bKeys determines which keys/values are read/written to map b,
* all other values are read/written to map a
*
* For example:
*
*   const a = new Map()
*   const b = new Map()
*   const p = new PartitionedMap(a, b, new Set(['x', 'y']))
*
* In this case, values `x` and `y` are read/written to map `b`,
* all other values are read/written to map `a`.
*/
var PartitionedMap = class {
	/**
	* @param {Map} a
	* @param {Map} b
	* @param {Set} bKeys
	*/
	constructor(a, b, bKeys) {
		this.a = a;
		this.b = b;
		this.bKeys = bKeys;
		this[Symbol.iterator] = this.entries;
	}
	get(key) {
		return this.bKeys.has(key) ? this.b.get(key) : this.a.get(key);
	}
	set(key, value) {
		if (this.bKeys.has(key)) this.b.set(key, value);
		else this.a.set(key, value);
		return this;
	}
	has(key) {
		return this.b.has(key) || this.a.has(key);
	}
	keys() {
		return (/* @__PURE__ */ new Set([...this.a.keys(), ...this.b.keys()]))[Symbol.iterator]();
	}
	entries() {
		return mapIterator(this.keys(), (key) => [key, this.get(key)]);
	}
	forEach(callback) {
		for (var key of this.keys()) callback(this.get(key), key, this);
	}
	delete(key) {
		return this.bKeys.has(key) ? this.b.delete(key) : this.a.delete(key);
	}
	clear() {
		this.a.clear();
		this.b.clear();
	}
	get size() {
		return [...this.keys()].length;
	}
};
/**
* Create a new iterator that maps over the provided iterator, applying a mapping function to each item
*/
function mapIterator(it, callback) {
	return { next: () => {
		var n = it.next();
		return n.done ? n : {
			value: callback(n.value),
			done: false
		};
	} };
}
/**
* Creates an empty map, or whatever your platform's polyfill is.
*
* @returns an empty Map or Map like object.
*/
function createEmptyMap() {
	return /* @__PURE__ */ new Map();
}
/**
* Creates a Map from the given object.
*
* @param { Map | { [key: string]: unknown } | undefined } mapOrObject
* @returns
*/
function createMap(mapOrObject) {
	if (!mapOrObject) return createEmptyMap();
	if (isMap(mapOrObject)) return mapOrObject;
	if (isObject(mapOrObject)) return new ObjectWrappingMap(mapOrObject);
	throw new Error("createMap can create maps from objects or Maps");
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/is.js
function isNumber(x) {
	return typeof x === "number";
}
function isBigNumber(x) {
	if (!x || typeof x !== "object" || typeof x.constructor !== "function") return false;
	if (x.isBigNumber === true && typeof x.constructor.prototype === "object" && x.constructor.prototype.isBigNumber === true) return true;
	if (typeof x.constructor.isDecimal === "function" && x.constructor.isDecimal(x) === true) return true;
	return false;
}
function isBigInt(x) {
	return typeof x === "bigint";
}
function isComplex(x) {
	return x && typeof x === "object" && Object.getPrototypeOf(x).isComplex === true || false;
}
function isFraction(x) {
	return x && typeof x === "object" && Object.getPrototypeOf(x).isFraction === true || false;
}
function isUnit(x) {
	return x && x.constructor.prototype.isUnit === true || false;
}
function isString(x) {
	return typeof x === "string";
}
var isArray = Array.isArray;
function isMatrix(x) {
	return x && x.constructor.prototype.isMatrix === true || false;
}
/**
* Test whether a value is a collection: an Array or Matrix
* @param {*} x
* @returns {boolean} isCollection
*/
function isCollection(x) {
	return Array.isArray(x) || isMatrix(x);
}
function isDenseMatrix(x) {
	return x && x.isDenseMatrix && x.constructor.prototype.isMatrix === true || false;
}
function isSparseMatrix(x) {
	return x && x.isSparseMatrix && x.constructor.prototype.isMatrix === true || false;
}
function isRange(x) {
	return x && x.constructor.prototype.isRange === true || false;
}
function isIndex(x) {
	return x && x.constructor.prototype.isIndex === true || false;
}
function isBoolean(x) {
	return typeof x === "boolean";
}
function isResultSet(x) {
	return x && x.constructor.prototype.isResultSet === true || false;
}
function isHelp(x) {
	return x && x.constructor.prototype.isHelp === true || false;
}
function isFunction(x) {
	return typeof x === "function";
}
function isDate(x) {
	return x instanceof Date;
}
function isRegExp(x) {
	return x instanceof RegExp;
}
function isObject(x) {
	return !!(x && typeof x === "object" && x.constructor === Object && !isComplex(x) && !isFraction(x));
}
/**
* Returns `true` if the passed object appears to be a Map (i.e. duck typing).
*
* Methods looked for are `get`, `set`, `keys` and `has`.
*
* @param {Map | object} object
* @returns
*/
function isMap(object) {
	if (!object) return false;
	return object instanceof Map || object instanceof ObjectWrappingMap || typeof object.set === "function" && typeof object.get === "function" && typeof object.keys === "function" && typeof object.has === "function";
}
function isPartitionedMap(object) {
	return isMap(object) && isMap(object.a) && isMap(object.b);
}
function isObjectWrappingMap(object) {
	return isMap(object) && isObject(object.wrappedObject);
}
function isNull(x) {
	return x === null;
}
function isUndefined(x) {
	return x === void 0;
}
function isAccessorNode(x) {
	return x && x.isAccessorNode === true && x.constructor.prototype.isNode === true || false;
}
function isArrayNode(x) {
	return x && x.isArrayNode === true && x.constructor.prototype.isNode === true || false;
}
function isAssignmentNode(x) {
	return x && x.isAssignmentNode === true && x.constructor.prototype.isNode === true || false;
}
function isBlockNode(x) {
	return x && x.isBlockNode === true && x.constructor.prototype.isNode === true || false;
}
function isConditionalNode(x) {
	return x && x.isConditionalNode === true && x.constructor.prototype.isNode === true || false;
}
function isConstantNode(x) {
	return x && x.isConstantNode === true && x.constructor.prototype.isNode === true || false;
}
function rule2Node(node) {
	return isConstantNode(node) || isOperatorNode(node) && node.args.length === 1 && isConstantNode(node.args[0]) && "-+~".includes(node.op);
}
function isFunctionAssignmentNode(x) {
	return x && x.isFunctionAssignmentNode === true && x.constructor.prototype.isNode === true || false;
}
function isFunctionNode(x) {
	return x && x.isFunctionNode === true && x.constructor.prototype.isNode === true || false;
}
function isIndexNode(x) {
	return x && x.isIndexNode === true && x.constructor.prototype.isNode === true || false;
}
function isNode(x) {
	return x && x.isNode === true && x.constructor.prototype.isNode === true || false;
}
function isObjectNode(x) {
	return x && x.isObjectNode === true && x.constructor.prototype.isNode === true || false;
}
function isOperatorNode(x) {
	return x && x.isOperatorNode === true && x.constructor.prototype.isNode === true || false;
}
function isParenthesisNode(x) {
	return x && x.isParenthesisNode === true && x.constructor.prototype.isNode === true || false;
}
function isRangeNode(x) {
	return x && x.isRangeNode === true && x.constructor.prototype.isNode === true || false;
}
function isRelationalNode(x) {
	return x && x.isRelationalNode === true && x.constructor.prototype.isNode === true || false;
}
function isSymbolNode(x) {
	return x && x.isSymbolNode === true && x.constructor.prototype.isNode === true || false;
}
function isChain(x) {
	return x && x.constructor.prototype.isChain === true || false;
}
function typeOf(x) {
	var t = typeof x;
	if (t === "object") {
		if (x === null) return "null";
		if (isBigNumber(x)) return "BigNumber";
		if (x.constructor && x.constructor.name) return x.constructor.name;
		return "Object";
	}
	return t;
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/object.js
/**
* Clone an object
*
*     clone(x)
*
* Can clone any primitive type, array, and object.
* If x has a function clone, this function will be invoked to clone the object.
*
* @param {*} x
* @return {*} clone
*/
function clone(x) {
	var type = typeof x;
	if (type === "number" || type === "bigint" || type === "string" || type === "boolean" || x === null || x === void 0) return x;
	if (typeof x.clone === "function") return x.clone();
	if (Array.isArray(x)) return x.map(function(value) {
		return clone(value);
	});
	if (x instanceof Date) return new Date(x.valueOf());
	if (isBigNumber(x)) return x;
	if (isObject(x)) return mapObject(x, clone);
	if (type === "function") return x;
	throw new TypeError("Cannot clone: unknown type of value (value: ".concat(x, ")"));
}
/**
* Apply map to all properties of an object
* @param {Object} object
* @param {function} callback
* @return {Object} Returns a copy of the object with mapped properties
*/
function mapObject(object, callback) {
	var clone = {};
	for (var key in object) if (hasOwnProperty(object, key)) clone[key] = callback(object[key]);
	return clone;
}
/**
* Deep extend an object a with the properties of object b
* @param {Object} a
* @param {Object} b
* @returns {Object}
*/
function deepExtend(a, b) {
	if (Array.isArray(b)) throw new TypeError("Arrays are not supported by deepExtend");
	for (var prop in b) if (hasOwnProperty(b, prop) && !(prop in Object.prototype) && !(prop in Function.prototype)) {
		if (b[prop] && b[prop].constructor === Object) {
			if (a[prop] === void 0) a[prop] = {};
			if (a[prop] && a[prop].constructor === Object) deepExtend(a[prop], b[prop]);
			else a[prop] = b[prop];
		} else if (Array.isArray(b[prop])) throw new TypeError("Arrays are not supported by deepExtend");
		else a[prop] = b[prop];
	}
	return a;
}
/**
* Deep test equality of all fields in two pairs of arrays or objects.
* Compares values and functions strictly (ie. 2 is not the same as '2').
* @param {Array | Object} a
* @param {Array | Object} b
* @returns {boolean}
*/
function deepStrictEqual(a, b) {
	var prop, i, len;
	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		for (i = 0, len = a.length; i < len; i++) if (!deepStrictEqual(a[i], b[i])) return false;
		return true;
	} else if (typeof a === "function") return a === b;
	else if (a instanceof Object) {
		if (Array.isArray(b) || !(b instanceof Object)) return false;
		for (prop in a) if (!(prop in b) || !deepStrictEqual(a[prop], b[prop])) return false;
		for (prop in b) if (!(prop in a)) return false;
		return true;
	} else return a === b;
}
/**
* Recursively flatten a nested object.
* @param {Object} nestedObject
* @return {Object} Returns the flattened object
*/
function deepFlatten(nestedObject) {
	var flattenedObject = {};
	_deepFlatten(nestedObject, flattenedObject);
	return flattenedObject;
}
function _deepFlatten(nestedObject, flattenedObject) {
	for (var prop in nestedObject) if (hasOwnProperty(nestedObject, prop)) {
		var value = nestedObject[prop];
		if (typeof value === "object" && value !== null) _deepFlatten(value, flattenedObject);
		else flattenedObject[prop] = value;
	}
}
/**
* Attach a lazy loading property to a constant.
* The given function `fn` is called once when the property is first requested.
*
* @param {Object} object         Object where to add the property
* @param {string} prop           Property name
* @param {Function} valueResolver Function returning the property value. Called
*                                without arguments.
*/
function lazy(object, prop, valueResolver) {
	var _uninitialized = true;
	var _value;
	Object.defineProperty(object, prop, {
		get: function get() {
			if (_uninitialized) {
				_value = valueResolver();
				_uninitialized = false;
			}
			return _value;
		},
		set: function set(value) {
			_value = value;
			_uninitialized = false;
		},
		configurable: true,
		enumerable: true
	});
}
/**
* A safe hasOwnProperty
* @param {Object} object
* @param {string} property
*/
function hasOwnProperty(object, property) {
	return object && Object.hasOwnProperty.call(object, property);
}
/**
* Test whether an object is a factory. a factory has fields:
*
* - factory: function (type: Object, config: Object, load: function, typed: function [, math: Object])   (required)
* - name: string (optional)
* - path: string    A dot separated path (optional)
* - math: boolean   If true (false by default), the math namespace is passed
*                   as fifth argument of the factory function
*
* @param {*} object
* @returns {boolean}
*/
function isLegacyFactory(object) {
	return object && typeof object.factory === "function";
}
/**
* Shallow version of pick, creating an object composed of the picked object properties
* but not for nested properties
* @param {Object} object
* @param {string[]} properties
* @return {Object}
*/
function pickShallow(object, properties) {
	var copy = {};
	for (var i = 0; i < properties.length; i++) {
		var key = properties[i];
		var value = object[key];
		if (value !== void 0) copy[key] = value;
	}
	return copy;
}
//#endregion
//#region node_modules/mathjs/lib/esm/core/function/config.js
var MATRIX_OPTIONS = ["Matrix", "Array"];
var NUMBER_OPTIONS = [
	"number",
	"BigNumber",
	"bigint",
	"Fraction"
];
function configFactory(config, emit) {
	/**
	* Set configuration options for math.js, and get current options.
	* Will emit a 'config' event, with arguments (curr, prev, changes).
	*
	* This function is only available on a mathjs instance created using `create`.
	*
	* Syntax:
	*
	*     math.config(config: Object): Object
	*
	* Examples:
	*
	*     import { create, all } from 'mathjs'
	*
	*     // create a mathjs instance
	*     const math = create(all)
	*
	*     math.config().number                // outputs 'number'
	*     math.evaluate('0.4')                // outputs number 0.4
	*     math.config({number: 'Fraction'})
	*     math.evaluate('0.4')                // outputs Fraction 2/5
	*
	* @param {Object} [options] Available options:
	*                            {number} relTol
	*                              Minimum relative difference between two
	*                              compared values, used by all comparison functions.
	*                            {number} absTol
	*                              Minimum absolute difference between two
	*                              compared values, used by all comparison functions.
	*                            {string} matrix
	*                              A string 'Matrix' (default) or 'Array'.
	*                            {string} number
	*                              A string 'number' (default), 'BigNumber', 'bigint', or 'Fraction'
	*                            {number} precision
	*                              The number of significant digits for BigNumbers.
	*                              Not applicable for Numbers.
	*                            {string} parenthesis
	*                              How to display parentheses in LaTeX and string
	*                              output.
	*                            {string} randomSeed
	*                              Random seed for seeded pseudo random number generator.
	*                              Set to null to randomly seed.
	* @return {Object} Returns the current configuration
	*/
	function _config(options) {
		if (options) {
			if (options.epsilon !== void 0) {
				console.warn("Warning: The configuration option \"epsilon\" is deprecated. Use \"relTol\" and \"absTol\" instead.");
				var optionsFix = clone(options);
				optionsFix.relTol = options.epsilon;
				optionsFix.absTol = options.epsilon * .001;
				delete optionsFix.epsilon;
				return _config(optionsFix);
			}
			if (options.legacySubset === true) console.warn("Warning: The configuration option \"legacySubset\" is for compatibility only and might be deprecated in the future.");
			var prev = clone(config);
			validateOption(options, "matrix", MATRIX_OPTIONS);
			validateOption(options, "number", NUMBER_OPTIONS);
			deepExtend(config, options);
			var curr = clone(config);
			emit("config", curr, prev, clone(options));
			return curr;
		} else return clone(config);
	}
	_config.MATRIX_OPTIONS = MATRIX_OPTIONS;
	_config.NUMBER_OPTIONS = NUMBER_OPTIONS;
	Object.keys(DEFAULT_CONFIG).forEach((key) => {
		Object.defineProperty(_config, key, {
			get: () => config[key],
			enumerable: true,
			configurable: true
		});
	});
	return _config;
}
/**
* Validate an option
* @param {Object} options         Object with options
* @param {string} name            Name of the option to validate
* @param {Array.<string>} values  Array with valid values for this option
*/
function validateOption(options, name, values) {
	if (options[name] !== void 0 && !values.includes(options[name])) console.warn("Warning: Unknown value \"" + options[name] + "\" for configuration option \"" + name + "\". Available options: " + values.map((value) => JSON.stringify(value)).join(", ") + ".");
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/number.js
/**
* @typedef {{sign: '+' | '-' | '', coefficients: number[], exponent: number}} SplitValue
*/
/**
* Check if a number is integer
* @param {number | boolean} value
* @return {boolean} isInteger
*/
function isInteger(value) {
	if (typeof value === "boolean") return true;
	return Number.isFinite(value) ? value === Math.round(value) : false;
}
/**
* Ensure the number type is compatible with the provided value.
* If not, return 'number' instead.
*
* For example:
*
*     safeNumberType('2.3', { number: 'bigint', numberFallback: 'number' })
*
* will return 'number' and not 'bigint' because trying to create a bigint with
* value 2.3 would throw an exception.
*
* @param {string} numberStr
* @param {{
*   number: 'number' | 'BigNumber' | 'bigint' | 'Fraction'
*   numberFallback: 'number' | 'BigNumber'
* }} config
* @returns {'number' | 'BigNumber' | 'bigint' | 'Fraction'}
*/
function safeNumberType(numberStr, config) {
	if (config.number === "bigint") try {
		BigInt(numberStr);
	} catch (_unused) {
		return config.numberFallback;
	}
	return config.number;
}
/**
* Calculate the sign of a number
* @param {number} x
* @returns {number}
*/
var sign = Math.sign || function(x) {
	if (x > 0) return 1;
	else if (x < 0) return -1;
	else return 0;
};
/**
* Calculate the base-2 logarithm of a number
* @param {number} x
* @returns {number}
*/
var log2 = Math.log2 || function log2(x) {
	return Math.log(x) / Math.LN2;
};
/**
* Calculate the base-10 logarithm of a number
* @param {number} x
* @returns {number}
*/
var log10 = Math.log10 || function log10(x) {
	return Math.log(x) / Math.LN10;
};
/**
* Calculate the natural logarithm of a number + 1
* @param {number} x
* @returns {number}
*/
var log1p = Math.log1p || function(x) {
	return Math.log(x + 1);
};
/**
* Calculate cubic root for a number
*
* Code from es6-shim.js:
*   https://github.com/paulmillr/es6-shim/blob/master/es6-shim.js#L1564-L1577
*
* @param {number} x
* @returns {number} Returns the cubic root of x
*/
var cbrt = Math.cbrt || function cbrt(x) {
	if (x === 0) return x;
	var negate = x < 0;
	var result;
	if (negate) x = -x;
	if (Number.isFinite(x)) {
		result = Math.exp(Math.log(x) / 3);
		result = (x / (result * result) + 2 * result) / 3;
	} else result = x;
	return negate ? -result : result;
};
/**
* Calculates exponentiation minus 1
* @param {number} x
* @return {number} res
*/
var expm1 = Math.expm1 || function expm1(x) {
	return x >= 2e-4 || x <= -2e-4 ? Math.exp(x) - 1 : x + x * x / 2 + x * x * x / 6;
};
/**
* Formats a number in a given base
* @param {number} n
* @param {number} base
* @param {number} size
* @returns {string}
*/
function formatNumberToBase(n, base, size) {
	var prefix = {
		2: "0b",
		8: "0o",
		16: "0x"
	}[base];
	var suffix = "";
	if (size) {
		if (size < 1) throw new Error("size must be in greater than 0");
		if (!isInteger(size)) throw new Error("size must be an integer");
		if (n > 2 ** (size - 1) - 1 || n < -(2 ** (size - 1))) throw new Error("Value must be in range [-2^".concat(size - 1, ", 2^").concat(size - 1, "-1]"));
		if (!isInteger(n)) throw new Error("Value must be an integer");
		if (n < 0) n = n + 2 ** size;
		suffix = "i".concat(size);
	}
	var sign = "";
	if (n < 0) {
		n = -n;
		sign = "-";
	}
	return "".concat(sign).concat(prefix).concat(n.toString(base)).concat(suffix);
}
/**
* Convert a number to a formatted string representation.
*
* Syntax:
*
*    format(value)
*    format(value, options)
*    format(value, precision)
*    format(value, fn)
*
* Where:
*
*    {number} value   The value to be formatted
*    {Object} options An object with formatting options. Available options:
*                     {string} notation
*                         Number notation. Choose from:
*                         'fixed'          Always use regular number notation.
*                                          For example '123.40' and '14000000'
*                         'exponential'    Always use exponential notation.
*                                          For example '1.234e+2' and '1.4e+7'
*                         'engineering'    Always use engineering notation.
*                                          For example '123.4e+0' and '14.0e+6'
*                         'auto' (default) Regular number notation for numbers
*                                          having an absolute value between
*                                          `lowerExp` and `upperExp` bounds, and
*                                          uses exponential notation elsewhere.
*                                          Lower bound is included, upper bound
*                                          is excluded.
*                                          For example '123.4' and '1.4e7'.
*                         'bin', 'oct, or
*                         'hex'            Format the number using binary, octal,
*                                          or hexadecimal notation.
*                                          For example '0b1101' and '0x10fe'.
*                     {number} wordSize    The word size in bits to use for formatting
*                                          in binary, octal, or hexadecimal notation.
*                                          To be used only with 'bin', 'oct', or 'hex'
*                                          values for 'notation' option. When this option
*                                          is defined the value is formatted as a signed
*                                          twos complement integer of the given word size
*                                          and the size suffix is appended to the output.
*                                          For example
*                                          format(-1, {notation: 'hex', wordSize: 8}) === '0xffi8'.
*                                          Default value is undefined.
*                     {number} precision   A number between 0 and 16 to round
*                                          the digits of the number.
*                                          In case of notations 'exponential',
*                                          'engineering', and 'auto',
*                                          `precision` defines the total
*                                          number of significant digits returned.
*                                          In case of notation 'fixed',
*                                          `precision` defines the number of
*                                          significant digits after the decimal
*                                          point.
*                                          `precision` is undefined by default,
*                                          not rounding any digits.
*                     {number} lowerExp    Exponent determining the lower boundary
*                                          for formatting a value with an exponent
*                                          when `notation='auto`.
*                                          Default value is `-3`.
*                     {number} upperExp    Exponent determining the upper boundary
*                                          for formatting a value with an exponent
*                                          when `notation='auto`.
*                                          Default value is `5`.
*    {Function} fn    A custom formatting function. Can be used to override the
*                     built-in notations. Function `fn` is called with `value` as
*                     parameter and must return a string. Is useful for example to
*                     format all values inside a matrix in a particular way.
*
* Examples:
*
*    format(6.4)                                        // '6.4'
*    format(1240000)                                    // '1.24e6'
*    format(1/3)                                        // '0.3333333333333333'
*    format(1/3, 3)                                     // '0.333'
*    format(21385, 2)                                   // '21000'
*    format(12.071, {notation: 'fixed'})                // '12'
*    format(2.3,    {notation: 'fixed', precision: 2})  // '2.30'
*    format(52.8,   {notation: 'exponential'})          // '5.28e+1'
*    format(12345678, {notation: 'engineering'})        // '12.345678e+6'
*
* @param {number} value
* @param {Object | Function | number} [options]
* @return {string} str The formatted value
*/
function format$2(value, options) {
	if (typeof options === "function") return options(value);
	if (value === Infinity) return "Infinity";
	else if (value === -Infinity) return "-Infinity";
	else if (isNaN(value)) return "NaN";
	var { notation, precision, wordSize } = normalizeFormatOptions(options);
	switch (notation) {
		case "fixed": return toFixed$1(value, precision);
		case "exponential": return toExponential$1(value, precision);
		case "engineering": return toEngineering$1(value, precision);
		case "bin": return formatNumberToBase(value, 2, wordSize);
		case "oct": return formatNumberToBase(value, 8, wordSize);
		case "hex": return formatNumberToBase(value, 16, wordSize);
		case "auto": return toPrecision(value, precision, options).replace(/((\.\d*?)(0+))($|e)/, function() {
			var digits = arguments[2];
			var e = arguments[4];
			return digits !== "." ? digits + e : e;
		});
		default: throw new Error("Unknown notation \"" + notation + "\". Choose \"auto\", \"exponential\", \"fixed\", \"bin\", \"oct\", or \"hex.");
	}
}
/**
* Normalize format options into an object:
*   {
*     notation: string,
*     precision: number | undefined,
*     wordSize: number | undefined
*   }
*/
function normalizeFormatOptions(options) {
	var notation = "auto";
	var precision;
	var wordSize;
	if (options !== void 0) {
		if (isNumber(options)) precision = options;
		else if (isBigNumber(options)) precision = options.toNumber();
		else if (isObject(options)) {
			if (options.precision !== void 0) precision = _toNumberOrThrow(options.precision, () => {
				throw new Error("Option \"precision\" must be a number or BigNumber");
			});
			if (options.wordSize !== void 0) wordSize = _toNumberOrThrow(options.wordSize, () => {
				throw new Error("Option \"wordSize\" must be a number or BigNumber");
			});
			if (options.notation) notation = options.notation;
		} else throw new Error("Unsupported type of options, number, BigNumber, or object expected");
	}
	return {
		notation,
		precision,
		wordSize
	};
}
/**
* Split a number into sign, coefficients, and exponent
* @param {number | string} value
* @return {SplitValue}
*              Returns an object containing sign, coefficients, and exponent
*/
function splitNumber(value) {
	var match = String(value).toLowerCase().match(/^(-?)(\d+\.?\d*)(e([+-]?\d+))?$/);
	if (!match) throw new SyntaxError("Invalid number " + value);
	var sign = match[1];
	var digits = match[2];
	var exponent = parseFloat(match[4] || "0");
	var dot = digits.indexOf(".");
	exponent += dot !== -1 ? dot - 1 : digits.length - 1;
	var coefficients = digits.replace(".", "").replace(/^0*/, function(zeros) {
		exponent -= zeros.length;
		return "";
	}).replace(/0*$/, "").split("").map(function(d) {
		return parseInt(d);
	});
	if (coefficients.length === 0) {
		coefficients.push(0);
		exponent++;
	}
	return {
		sign,
		coefficients,
		exponent
	};
}
/**
* Format a number in engineering notation. Like '1.23e+6', '2.3e+0', '3.500e-3'
* @param {number | string} value
* @param {number} [precision]        Optional number of significant figures to return.
*/
function toEngineering$1(value, precision) {
	if (isNaN(value) || !Number.isFinite(value)) return String(value);
	var rounded = roundDigits(splitNumber(value), precision);
	var e = rounded.exponent;
	var c = rounded.coefficients;
	var newExp = e % 3 === 0 ? e : e < 0 ? e - 3 - e % 3 : e - e % 3;
	if (isNumber(precision)) while (precision > c.length || e - newExp + 1 > c.length) c.push(0);
	else {
		var missingZeros = Math.abs(e - newExp) - (c.length - 1);
		for (var i = 0; i < missingZeros; i++) c.push(0);
	}
	var expDiff = Math.abs(e - newExp);
	var decimalIdx = 1;
	while (expDiff > 0) {
		decimalIdx++;
		expDiff--;
	}
	var decimals = c.slice(decimalIdx).join("");
	var decimalVal = isNumber(precision) && decimals.length || decimals.match(/[1-9]/) ? "." + decimals : "";
	var str = c.slice(0, decimalIdx).join("") + decimalVal + "e" + (e >= 0 ? "+" : "") + newExp.toString();
	return rounded.sign + str;
}
/**
* Format a number with fixed notation.
* @param {number | string} value
* @param {number} [precision=undefined]  Optional number of decimals after the
*                                        decimal point. null by default.
*/
function toFixed$1(value, precision) {
	if (isNaN(value) || !Number.isFinite(value)) return String(value);
	var splitValue = splitNumber(value);
	var rounded = typeof precision === "number" ? roundDigits(splitValue, splitValue.exponent + 1 + precision) : splitValue;
	var c = rounded.coefficients;
	var p = rounded.exponent + 1;
	var pp = p + (precision || 0);
	if (c.length < pp) c = c.concat(zeros(pp - c.length));
	if (p < 0) {
		c = zeros(-p + 1).concat(c);
		p = 1;
	}
	if (p < c.length) c.splice(p, 0, p === 0 ? "0." : ".");
	return rounded.sign + c.join("");
}
/**
* Format a number in exponential notation. Like '1.23e+5', '2.3e+0', '3.500e-3'
* @param {number | string} value
* @param {number} [precision]  Number of digits in formatted output.
*                              If not provided, the maximum available digits
*                              is used.
*/
function toExponential$1(value, precision) {
	if (isNaN(value) || !Number.isFinite(Number(value))) return String(value);
	var split = splitNumber(value);
	var rounded = precision ? roundDigits(split, precision) : split;
	var c = rounded.coefficients;
	var e = rounded.exponent;
	if (c.length < precision) c = c.concat(zeros(precision - c.length));
	var first = c.shift();
	return rounded.sign + first + (c.length > 0 ? "." + c.join("") : "") + "e" + (e >= 0 ? "+" : "") + e;
}
/**
* Format a number with a certain precision
* @param {number | string} value
* @param {number} [precision=undefined] Optional number of digits.
* @param {{lowerExp: number | undefined, upperExp: number | undefined}} [options]
*                                       By default:
*                                         lowerExp = -3 (incl)
*                                         upper = +5 (excl)
* @return {string}
*/
function toPrecision(value, precision, options) {
	if (isNaN(value) || !Number.isFinite(value)) return String(value);
	var lowerExp = _toNumberOrDefault$1(options === null || options === void 0 ? void 0 : options.lowerExp, -3);
	var upperExp = _toNumberOrDefault$1(options === null || options === void 0 ? void 0 : options.upperExp, 5);
	var split = splitNumber(value);
	var rounded = precision ? roundDigits(split, precision) : split;
	if (rounded.exponent < lowerExp || rounded.exponent >= upperExp) return toExponential$1(value, precision);
	else {
		var c = rounded.coefficients;
		var e = rounded.exponent;
		if (c.length < precision) c = c.concat(zeros(precision - c.length));
		c = c.concat(zeros(e - c.length + 1 + (c.length < precision ? precision - c.length : 0)));
		c = zeros(-e).concat(c);
		var dot = e > 0 ? e : 0;
		if (dot < c.length - 1) c.splice(dot + 1, 0, ".");
		return rounded.sign + c.join("");
	}
}
/**
* Round the number of digits of a number *
* @param {SplitValue} split       A value split with .splitNumber(value)
* @param {number} precision  A positive integer
* @return {SplitValue}
*              Returns an object containing sign, coefficients, and exponent
*              with rounded digits
*/
function roundDigits(split, precision) {
	var rounded = {
		sign: split.sign,
		coefficients: split.coefficients,
		exponent: split.exponent
	};
	var c = rounded.coefficients;
	while (precision <= 0) {
		c.unshift(0);
		rounded.exponent++;
		precision++;
	}
	if (c.length > precision) {
		if (c.splice(precision, c.length - precision)[0] >= 5) {
			var i = precision - 1;
			c[i]++;
			while (c[i] === 10) {
				c.pop();
				if (i === 0) {
					c.unshift(0);
					rounded.exponent++;
					i++;
				}
				i--;
				c[i]++;
			}
		}
	}
	return rounded;
}
/**
* Create an array filled with zeros.
* @param {number} length
* @return {Array}
*/
function zeros(length) {
	var arr = [];
	for (var i = 0; i < length; i++) arr.push(0);
	return arr;
}
/**
* Count the number of significant digits of a number.
*
* For example:
*   2.34 returns 3
*   0.0034 returns 2
*   120.5e+30 returns 4
*
* @param {number} value
* @return {number} digits   Number of significant digits
*/
function digits(value) {
	return value.toExponential().replace(/e.*$/, "").replace(/^0\.?0*|\./, "").length;
}
/**
* Compares two floating point numbers.
* @param {number} a - First value to compare
* @param {number} b - Second value to compare
* @param {number} [relTol=1e-09] - The relative tolerance, indicating the maximum allowed difference relative to the larger absolute value. Must be greater than 0.
* @param {number} [absTol=1e-12] - The minimum absolute tolerance, useful for comparisons near zero. Must be at least 0.
* @return {boolean} whether the two numbers are nearly equal
*
* @throws {Error} If `relTol` is less than or equal to 0.
* @throws {Error} If `absTol` is less than 0.
*
* @example
* nearlyEqual(1.000000001, 1.0, 1e-8);            // true
* nearlyEqual(1.000000002, 1.0, 0);            // false
* nearlyEqual(1.0, 1.009, undefined, 0.01);       // true
* nearlyEqual(0.000000001, 0.0, undefined, 1e-8); // true
*/
function nearlyEqual(a, b) {
	var relTol = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1e-8;
	var absTol = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 0;
	if (relTol <= 0) throw new Error("Relative tolerance must be greater than 0");
	if (absTol < 0) throw new Error("Absolute tolerance must be at least 0");
	if (isNaN(a) || isNaN(b)) return false;
	if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
	if (a === b) return true;
	return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), absTol);
}
/**
* Calculate the hyperbolic arccos of a number
* @param {number} x
* @return {number}
*/
var acosh = Math.acosh || function(x) {
	return Math.log(Math.sqrt(x * x - 1) + x);
};
var asinh = Math.asinh || function(x) {
	return Math.log(Math.sqrt(x * x + 1) + x);
};
/**
* Calculate the hyperbolic arctangent of a number
* @param {number} x
* @return {number}
*/
var atanh = Math.atanh || function(x) {
	return Math.log((1 + x) / (1 - x)) / 2;
};
/**
* Calculate the hyperbolic cosine of a number
* @param {number} x
* @returns {number}
*/
var cosh = Math.cosh || function(x) {
	return (Math.exp(x) + Math.exp(-x)) / 2;
};
/**
* Calculate the hyperbolic sine of a number
* @param {number} x
* @returns {number}
*/
var sinh = Math.sinh || function(x) {
	return (Math.exp(x) - Math.exp(-x)) / 2;
};
/**
* Calculate the hyperbolic tangent of a number
* @param {number} x
* @returns {number}
*/
var tanh = Math.tanh || function(x) {
	var e = Math.exp(2 * x);
	return (e - 1) / (e + 1);
};
function _toNumberOrThrow(value, onError) {
	if (isNumber(value)) return value;
	else if (isBigNumber(value)) return value.toNumber();
	else onError();
}
function _toNumberOrDefault$1(value, defaultValue) {
	if (isNumber(value)) return value;
	else if (isBigNumber(value)) return value.toNumber();
	else return defaultValue;
}
//#endregion
//#region node_modules/mathjs/lib/esm/plain/number/arithmetic.js
var n1$2 = "number";
var n2$1 = "number, number";
function absNumber(a) {
	return Math.abs(a);
}
absNumber.signature = n1$2;
function addNumber(a, b) {
	return a + b;
}
addNumber.signature = n2$1;
function subtractNumber(a, b) {
	return a - b;
}
subtractNumber.signature = n2$1;
function multiplyNumber(a, b) {
	return a * b;
}
multiplyNumber.signature = n2$1;
function divideNumber(a, b) {
	return a / b;
}
divideNumber.signature = n2$1;
function unaryMinusNumber(x) {
	return -x;
}
unaryMinusNumber.signature = n1$2;
function unaryPlusNumber(x) {
	return x;
}
unaryPlusNumber.signature = n1$2;
function cbrtNumber(x) {
	return cbrt(x);
}
cbrtNumber.signature = n1$2;
function cubeNumber(x) {
	return x * x * x;
}
cubeNumber.signature = n1$2;
function expNumber(x) {
	return Math.exp(x);
}
expNumber.signature = n1$2;
function expm1Number(x) {
	return expm1(x);
}
expm1Number.signature = n1$2;
/**
* Calculate gcd for numbers
* @param {number} a
* @param {number} b
* @returns {number} Returns the greatest common denominator of a and b
*/
function gcdNumber(a, b) {
	if (!isInteger(a) || !isInteger(b)) throw new Error("Parameters in function gcd must be integer numbers");
	var r;
	while (b !== 0) {
		r = a % b;
		a = b;
		b = r;
	}
	return a < 0 ? -a : a;
}
gcdNumber.signature = n2$1;
/**
* Calculate lcm for two numbers
* @param {number} a
* @param {number} b
* @returns {number} Returns the least common multiple of a and b
*/
function lcmNumber(a, b) {
	if (!isInteger(a) || !isInteger(b)) throw new Error("Parameters in function lcm must be integer numbers");
	if (a === 0 || b === 0) return 0;
	var t;
	var prod = a * b;
	while (b !== 0) {
		t = b;
		b = a % t;
		a = t;
	}
	return Math.abs(prod / a);
}
lcmNumber.signature = n2$1;
/**
* Calculate the logarithm of a value, optionally to a given base.
* @param {number} x
* @param {number | null | undefined} base
* @return {number}
*/
function logNumber(x, y) {
	if (y) return Math.log(x) / Math.log(y);
	return Math.log(x);
}
/**
* Calculate the 10-base logarithm of a number
* @param {number} x
* @return {number}
*/
function log10Number(x) {
	return log10(x);
}
log10Number.signature = n1$2;
/**
* Calculate the 2-base logarithm of a number
* @param {number} x
* @return {number}
*/
function log2Number(x) {
	return log2(x);
}
log2Number.signature = n1$2;
/**
* Calculate the natural logarithm of a `number+1`
* @param {number} x
* @returns {number}
*/
function log1pNumber(x) {
	return log1p(x);
}
log1pNumber.signature = n1$2;
/**
* Calculate the modulus of two numbers
* @param {number} x
* @param {number} y
* @returns {number} res
* @private
*/
function modNumber(x, y) {
	return y === 0 ? x : x - y * Math.floor(x / y);
}
modNumber.signature = n2$1;
function signNumber(x) {
	return sign(x);
}
signNumber.signature = n1$2;
function sqrtNumber(x) {
	return Math.sqrt(x);
}
sqrtNumber.signature = n1$2;
function squareNumber(x) {
	return x * x;
}
squareNumber.signature = n1$2;
/**
* Calculate xgcd for two numbers
* @param {number} a
* @param {number} b
* @return {number} result
* @private
*/
function xgcdNumber(a, b) {
	var t;
	var q;
	var r;
	var x = 0;
	var lastx = 1;
	var y = 1;
	var lasty = 0;
	if (!isInteger(a) || !isInteger(b)) throw new Error("Parameters in function xgcd must be integer numbers");
	while (b) {
		q = Math.floor(a / b);
		r = a - q * b;
		t = x;
		x = lastx - q * x;
		lastx = t;
		t = y;
		y = lasty - q * y;
		lasty = t;
		a = b;
		b = r;
	}
	var res;
	if (a < 0) res = [
		-a,
		-lastx,
		-lasty
	];
	else res = [
		a,
		a ? lastx : 0,
		lasty
	];
	return res;
}
xgcdNumber.signature = n2$1;
/**
* Calculates the power of x to y, x^y, for two numbers.
* @param {number} x
* @param {number} y
* @return {number} res
*/
function powNumber(x, y) {
	if (x * x < 1 && y === Infinity || x * x > 1 && y === -Infinity) return 0;
	return Math.pow(x, y);
}
powNumber.signature = n2$1;
/**
* Calculate the norm of a number, the absolute value.
* @param {number} x
* @return {number}
*/
function normNumber(x) {
	return Math.abs(x);
}
normNumber.signature = n1$2;
//#endregion
//#region node_modules/mathjs/lib/esm/utils/product.js
/** @param {number} i
*  @param {number} n
*  @returns {number} product of i to n
*/
function product(i, n) {
	if (n < i) return 1;
	if (n === i) return n;
	var half = n + i >> 1;
	return product(i, half) * product(half + 1, n);
}
//#endregion
//#region node_modules/mathjs/lib/esm/plain/number/combinations.js
function combinationsNumber(n, k) {
	if (!isInteger(n) || n < 0) throw new TypeError("Positive integer value expected in function combinations");
	if (!isInteger(k) || k < 0) throw new TypeError("Positive integer value expected in function combinations");
	if (k > n) throw new TypeError("k must be less than or equal to n");
	var nMinusk = n - k;
	var answer = 1;
	var firstnumerator = k < nMinusk ? nMinusk + 1 : k + 1;
	var nextdivisor = 2;
	var lastdivisor = k < nMinusk ? k : nMinusk;
	for (var nextnumerator = firstnumerator; nextnumerator <= n; ++nextnumerator) {
		answer *= nextnumerator;
		while (nextdivisor <= lastdivisor && answer % nextdivisor === 0) {
			answer /= nextdivisor;
			++nextdivisor;
		}
	}
	if (nextdivisor <= lastdivisor) answer /= product(nextdivisor, lastdivisor);
	return answer;
}
combinationsNumber.signature = "number, number";
//#endregion
//#region node_modules/mathjs/lib/esm/plain/number/constants.js
var pi = Math.PI;
2 * Math.PI;
var e = Math.E;
//#endregion
//#region node_modules/mathjs/lib/esm/plain/number/probability.js
function gammaNumber(n) {
	var x;
	if (isInteger(n)) {
		if (n <= 0) return Number.isFinite(n) ? Infinity : NaN;
		if (n > 171) return Infinity;
		return product(1, n - 1);
	}
	if (n < .5) return Math.PI / (Math.sin(Math.PI * n) * gammaNumber(1 - n));
	if (n >= 171.35) return Infinity;
	if (n > 85) {
		var twoN = n * n;
		var threeN = twoN * n;
		var fourN = threeN * n;
		var fiveN = fourN * n;
		return Math.sqrt(2 * Math.PI / n) * Math.pow(n / Math.E, n) * (1 + 1 / (12 * n) + 1 / (288 * twoN) - 139 / (51840 * threeN) - 571 / (2488320 * fourN) + 163879 / (209018880 * fiveN) + 5246819 / (75246796800 * fiveN * n));
	}
	--n;
	x = gammaP[0];
	for (var i = 1; i < gammaP.length; ++i) x += gammaP[i] / (n + i);
	var t = n + gammaG + .5;
	return Math.sqrt(2 * Math.PI) * Math.pow(t, n + .5) * Math.exp(-t) * x;
}
gammaNumber.signature = "number";
var gammaG = 4.7421875;
var gammaP = [
	.9999999999999971,
	57.15623566586292,
	-59.59796035547549,
	14.136097974741746,
	-.4919138160976202,
	3399464998481189e-20,
	4652362892704858e-20,
	-9837447530487956e-20,
	.0001580887032249125,
	-.00021026444172410488,
	.00021743961811521265,
	-.0001643181065367639,
	8441822398385275e-20,
	-26190838401581408e-21,
	36899182659531625e-22
];
var lnSqrt2PI = .9189385332046728;
var lgammaSeries = [
	1.000000000190015,
	76.18009172947146,
	-86.50532032941678,
	24.01409824083091,
	-1.231739572450155,
	.001208650973866179,
	-5395239384953e-18
];
function lgammaNumber(n) {
	if (n < 0) return NaN;
	if (n === 0) return Infinity;
	if (!Number.isFinite(n)) return n;
	if (n < .5) return Math.log(Math.PI / Math.sin(Math.PI * n)) - lgammaNumber(1 - n);
	n = n - 1;
	var base = n + 5 + .5;
	var sum = lgammaSeries[0];
	for (var i = 6; i >= 1; i--) sum += lgammaSeries[i] / (n + i);
	return lnSqrt2PI + (n + .5) * Math.log(base) - base + Math.log(sum);
}
lgammaNumber.signature = "number";
//#endregion
//#region node_modules/mathjs/lib/esm/plain/number/trigonometry.js
var n1$1 = "number";
var n2 = "number, number";
function acosNumber(x) {
	return Math.acos(x);
}
acosNumber.signature = n1$1;
function acoshNumber(x) {
	return acosh(x);
}
acoshNumber.signature = n1$1;
function acotNumber(x) {
	return Math.atan(1 / x);
}
acotNumber.signature = n1$1;
function acothNumber(x) {
	return Number.isFinite(x) ? (Math.log((x + 1) / x) + Math.log(x / (x - 1))) / 2 : 0;
}
acothNumber.signature = n1$1;
function acscNumber(x) {
	return Math.asin(1 / x);
}
acscNumber.signature = n1$1;
function acschNumber(x) {
	var xInv = 1 / x;
	return Math.log(xInv + Math.sqrt(xInv * xInv + 1));
}
acschNumber.signature = n1$1;
function asecNumber(x) {
	return Math.acos(1 / x);
}
asecNumber.signature = n1$1;
function asechNumber(x) {
	var xInv = 1 / x;
	var ret = Math.sqrt(xInv * xInv - 1);
	return Math.log(ret + xInv);
}
asechNumber.signature = n1$1;
function asinNumber(x) {
	return Math.asin(x);
}
asinNumber.signature = n1$1;
function asinhNumber(x) {
	return asinh(x);
}
asinhNumber.signature = n1$1;
function atanNumber(x) {
	return Math.atan(x);
}
atanNumber.signature = n1$1;
function atan2Number(y, x) {
	return Math.atan2(y, x);
}
atan2Number.signature = n2;
function atanhNumber(x) {
	return atanh(x);
}
atanhNumber.signature = n1$1;
function cosNumber(x) {
	return Math.cos(x);
}
cosNumber.signature = n1$1;
function coshNumber(x) {
	return cosh(x);
}
coshNumber.signature = n1$1;
function cotNumber(x) {
	return 1 / Math.tan(x);
}
cotNumber.signature = n1$1;
function cothNumber(x) {
	var e = Math.exp(2 * x);
	return (e + 1) / (e - 1);
}
cothNumber.signature = n1$1;
function cscNumber(x) {
	return 1 / Math.sin(x);
}
cscNumber.signature = n1$1;
function cschNumber(x) {
	if (x === 0) return Number.POSITIVE_INFINITY;
	else return Math.abs(2 / (Math.exp(x) - Math.exp(-x))) * sign(x);
}
cschNumber.signature = n1$1;
function secNumber(x) {
	return 1 / Math.cos(x);
}
secNumber.signature = n1$1;
function sechNumber(x) {
	return 2 / (Math.exp(x) + Math.exp(-x));
}
sechNumber.signature = n1$1;
function sinNumber(x) {
	return Math.sin(x);
}
sinNumber.signature = n1$1;
function sinhNumber(x) {
	return sinh(x);
}
sinhNumber.signature = n1$1;
function tanNumber(x) {
	return Math.tan(x);
}
tanNumber.signature = n1$1;
function tanhNumber(x) {
	return tanh(x);
}
tanhNumber.signature = n1$1;
//#endregion
//#region node_modules/mathjs/lib/esm/plain/number/utils.js
var n1 = "number";
function isIntegerNumber(x) {
	return isInteger(x);
}
isIntegerNumber.signature = n1;
function isNegativeNumber(x) {
	return x < 0;
}
isNegativeNumber.signature = n1;
function isPositiveNumber(x) {
	return x > 0;
}
isPositiveNumber.signature = n1;
function isZeroNumber(x) {
	return x === 0;
}
isZeroNumber.signature = n1;
function isNaNNumber(x) {
	return Number.isNaN(x);
}
isNaNNumber.signature = n1;
//#endregion
//#region node_modules/mathjs/lib/esm/utils/factory.js
/**
* Create a factory function, which can be used to inject dependencies.
*
* The created functions are memoized, a consecutive call of the factory
* with the exact same inputs will return the same function instance.
* The memoized cache is exposed on `factory.cache` and can be cleared
* if needed.
*
* Example:
*
*     const name = 'log'
*     const dependencies = ['config', 'typed', 'divideScalar', 'Complex']
*
*     export const createLog = factory(name, dependencies, ({ typed, config, divideScalar, Complex }) => {
*       // ... create the function log here and return it
*     }
*
* @param {string} name           Name of the function to be created
* @param {string[]} dependencies The names of all required dependencies
* @param {function} create       Callback function called with an object with all dependencies
* @param {Object} [meta]
*     Optional object with meta information that will be attached
*     to the created factory function as property `meta`. For explanation
*     of what meta properties can be specified and what they mean, see
*     docs/core/extension.md.
* @returns {function}
*/
function factory(name, dependencies, create, meta) {
	function assertAndCreate(scope) {
		var deps = pickShallow(scope, dependencies.map(stripOptionalNotation));
		assertDependencies(name, dependencies, scope);
		return create(deps);
	}
	assertAndCreate.isFactory = true;
	assertAndCreate.fn = name;
	assertAndCreate.dependencies = dependencies.slice().sort();
	if (meta) assertAndCreate.meta = meta;
	return assertAndCreate;
}
/**
* Test whether an object is a factory. This is the case when it has
* properties name, dependencies, and a function create.
* @param {*} obj
* @returns {boolean}
*/
function isFactory(obj) {
	return typeof obj === "function" && typeof obj.fn === "string" && Array.isArray(obj.dependencies);
}
/**
* Assert that all dependencies of a list with dependencies are available in the provided scope.
*
* Will throw an exception when there are dependencies missing.
*
* @param {string} name   Name for the function to be created. Used to generate a useful error message
* @param {string[]} dependencies
* @param {Object} scope
*/
function assertDependencies(name, dependencies, scope) {
	if (!dependencies.filter((dependency) => !isOptionalDependency(dependency)).every((dependency) => scope[dependency] !== void 0)) {
		var missingDependencies = dependencies.filter((dependency) => scope[dependency] === void 0);
		throw new Error("Cannot create function \"".concat(name, "\", ") + "some dependencies are missing: ".concat(missingDependencies.map((d) => "\"".concat(d, "\"")).join(", "), "."));
	}
}
function isOptionalDependency(dependency) {
	return dependency && dependency[0] === "?";
}
function stripOptionalNotation(dependency) {
	return dependency && dependency[0] === "?" ? dependency.slice(1) : dependency;
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/noop.js
function noBignumber() {
	throw new Error("No \"bignumber\" implementation available");
}
function noFraction() {
	throw new Error("No \"fraction\" implementation available");
}
function noMatrix() {
	throw new Error("No \"matrix\" implementation available");
}
function noSubset() {
	throw new Error("No \"matrix\" implementation available");
}
//#endregion
//#region node_modules/mathjs/lib/esm/core/function/typed.js
var import_typed_function = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(global, factory) {
		typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.typed = factory());
	})(exports, (function() {
		"use strict";
		function ok() {
			return true;
		}
		function notOk() {
			return false;
		}
		function undef() {}
		const NOT_TYPED_FUNCTION = "Argument is not a typed-function.";
		/**
		* @typedef {{
		*   params: Param[],
		*   fn: function,
		*   test: function,
		*   implementation: function
		* }} Signature
		*
		* @typedef {{
		*   types: Type[],
		*   hasAny: boolean,
		*   hasConversion: boolean,
		*   restParam: boolean
		* }} Param
		*
		* @typedef {{
		*   name: string,
		*   typeIndex: number,
		*   test: function,
		*   isAny: boolean,
		*   conversion?: ConversionDef,
		*   conversionIndex: number,
		* }} Type
		*
		* @typedef {{
		*   from: string,
		*   to: string,
		*   convert: function (*) : *
		* }} ConversionDef
		*
		* @typedef {{
		*   name: string,
		*   test: function(*) : boolean,
		*   isAny?: boolean
		* }} TypeDef
		*/
		/**
		* @returns {() => function}
		*/
		function create() {
			/**
			* Returns true if the argument is a non-null "plain" object
			*/
			function isPlainObject(x) {
				return typeof x === "object" && x !== null && x.constructor === Object;
			}
			const _types = [
				{
					name: "number",
					test: function(x) {
						return typeof x === "number";
					}
				},
				{
					name: "string",
					test: function(x) {
						return typeof x === "string";
					}
				},
				{
					name: "boolean",
					test: function(x) {
						return typeof x === "boolean";
					}
				},
				{
					name: "Function",
					test: function(x) {
						return typeof x === "function";
					}
				},
				{
					name: "Array",
					test: Array.isArray
				},
				{
					name: "Date",
					test: function(x) {
						return x instanceof Date;
					}
				},
				{
					name: "RegExp",
					test: function(x) {
						return x instanceof RegExp;
					}
				},
				{
					name: "Object",
					test: isPlainObject
				},
				{
					name: "null",
					test: function(x) {
						return x === null;
					}
				},
				{
					name: "undefined",
					test: function(x) {
						return x === void 0;
					}
				}
			];
			const anyType = {
				name: "any",
				test: ok,
				isAny: true
			};
			let typeMap;
			let typeList;
			let nConversions = 0;
			let typed = { createCount: 0 };
			/**
			* Takes a type name and returns the corresponding official type object
			* for that type.
			*
			* @param {string} typeName
			* @returns {TypeDef} type
			*/
			function findType(typeName) {
				const type = typeMap.get(typeName);
				if (type) return type;
				let message = "Unknown type \"" + typeName + "\"";
				const name = typeName.toLowerCase();
				let otherName;
				for (otherName of typeList) if (otherName.toLowerCase() === name) {
					message += ". Did you mean \"" + otherName + "\" ?";
					break;
				}
				throw new TypeError(message);
			}
			/**
			* Adds an array `types` of type definitions to this typed instance.
			* Each type definition should be an object with properties:
			* 'name' - a string giving the name of the type; 'test' - function
			* returning a boolean that tests membership in the type; and optionally
			* 'isAny' - true only for the 'any' type.
			*
			* The second optional argument, `before`, gives the name of a type that
			* these types should be added before. The new types are added in the
			* order specified.
			* @param {TypeDef[]} types
			* @param {string | boolean} [beforeSpec='any'] before
			*/
			function addTypes(types) {
				let beforeSpec = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "any";
				const beforeIndex = beforeSpec ? findType(beforeSpec).index : typeList.length;
				const newTypes = [];
				for (let i = 0; i < types.length; ++i) {
					if (!types[i] || typeof types[i].name !== "string" || typeof types[i].test !== "function") throw new TypeError("Object with properties {name: string, test: function} expected");
					const typeName = types[i].name;
					if (typeMap.has(typeName)) throw new TypeError("Duplicate type name \"" + typeName + "\"");
					newTypes.push(typeName);
					typeMap.set(typeName, {
						name: typeName,
						test: types[i].test,
						isAny: types[i].isAny,
						index: beforeIndex + i,
						conversionsTo: []
					});
				}
				const affectedTypes = typeList.slice(beforeIndex);
				typeList = typeList.slice(0, beforeIndex).concat(newTypes).concat(affectedTypes);
				for (let i = beforeIndex + newTypes.length; i < typeList.length; ++i) typeMap.get(typeList[i]).index = i;
			}
			/**
			* Removes all types and conversions from this typed instance.
			* May cause previously constructed typed-functions to throw
			* strange errors when they are called with types that do not
			* match any of their signatures.
			*/
			function clear() {
				typeMap = /* @__PURE__ */ new Map();
				typeList = [];
				nConversions = 0;
				addTypes([anyType], false);
			}
			clear();
			addTypes(_types);
			/**
			* Removes all conversions, leaving the types alone.
			*/
			function clearConversions() {
				let typeName;
				for (typeName of typeList) typeMap.get(typeName).conversionsTo = [];
				nConversions = 0;
			}
			/**
			* Find the type names that match a value.
			* @param {*} value
			* @return {string[]} Array of names of types for which
			*                  the type test matches the value.
			*/
			function findTypeNames(value) {
				const matches = typeList.filter((name) => {
					const type = typeMap.get(name);
					return !type.isAny && type.test(value);
				});
				if (matches.length) return matches;
				return ["any"];
			}
			/**
			* Check if an entity is a typed function created by any instance
			* @param {any} entity
			* @returns {boolean}
			*/
			function isTypedFunction(entity) {
				return entity && typeof entity === "function" && "_typedFunctionData" in entity;
			}
			/**
			* Find a specific signature from a (composed) typed function, for example:
			*
			*   typed.findSignature(fn, ['number', 'string'])
			*   typed.findSignature(fn, 'number, string')
			*   typed.findSignature(fn, 'number,string', {exact: true})
			*
			* This function findSignature will by default return the best match to
			* the given signature, possibly employing type conversions.
			*
			* The (optional) third argument is a plain object giving options
			* controlling the signature search. Currently the only implemented
			* option is `exact`: if specified as true (default is false), only
			* exact matches will be returned (i.e. signatures for which `fn` was
			* directly defined). Note that a (possibly different) type matching
			* `any`, or one or more instances of TYPE matching `...TYPE` are
			* considered exact matches in this regard, as no conversions are used.
			*
			* This function returns a "signature" object, as does `typed.resolve()`,
			* which is a plain object with four keys: `params` (the array of parameters
			* for this signature), `fn` (the originally supplied function for this
			* signature), `test` (a generated function that determines if an argument
			* list matches this signature, and `implementation` (the function to call
			* on a matching argument list, that performs conversions if necessary and
			* then calls the originally supplied function).
			*
			* @param {Function} fn                   A typed-function
			* @param {string | string[]} signature
			*     Signature to be found, can be an array or a comma separated string.
			* @param {object} options  Controls the signature search as documented
			* @return {{ params: Param[], fn: function, test: function, implementation: function }}
			*     Returns the matching signature, or throws an error when no signature
			*     is found.
			*/
			function findSignature(fn, signature, options) {
				if (!isTypedFunction(fn)) throw new TypeError(NOT_TYPED_FUNCTION);
				const exact = options && options.exact;
				const params = parseSignature(Array.isArray(signature) ? signature.join(",") : signature);
				const canonicalSignature = stringifyParams(params);
				if (!exact || canonicalSignature in fn.signatures) {
					const match = fn._typedFunctionData.signatureMap.get(canonicalSignature);
					if (match) return match;
				}
				const nParams = params.length;
				let remainingSignatures;
				if (exact) {
					remainingSignatures = [];
					let name;
					for (name in fn.signatures) remainingSignatures.push(fn._typedFunctionData.signatureMap.get(name));
				} else remainingSignatures = fn._typedFunctionData.signatures;
				for (let i = 0; i < nParams; ++i) {
					const want = params[i];
					const filteredSignatures = [];
					let possibility;
					for (possibility of remainingSignatures) {
						const have = getParamAtIndex(possibility.params, i);
						if (!have || want.restParam && !have.restParam) continue;
						if (!have.hasAny) {
							const haveTypes = paramTypeSet(have);
							if (want.types.some((wtype) => !haveTypes.has(wtype.name))) continue;
						}
						filteredSignatures.push(possibility);
					}
					remainingSignatures = filteredSignatures;
					if (remainingSignatures.length === 0) break;
				}
				let candidate;
				for (candidate of remainingSignatures) if (candidate.params.length <= nParams) return candidate;
				throw new TypeError("Signature not found (signature: " + (fn.name || "unnamed") + "(" + stringifyParams(params, ", ") + "))");
			}
			/**
			* Find the proper function to call for a specific signature from
			* a (composed) typed function, for example:
			*
			*   typed.find(fn, ['number', 'string'])
			*   typed.find(fn, 'number, string')
			*   typed.find(fn, 'number,string', {exact: true})
			*
			* This function find will by default return the best match to
			* the given signature, possibly employing type conversions (and returning
			* a function that will perform those conversions as needed). The
			* (optional) third argument is a plain object giving options contolling
			* the signature search. Currently only the option `exact` is implemented,
			* which defaults to "false". If `exact` is specified as true, then only
			* exact matches will be returned (i.e. signatures for which `fn` was
			* directly defined). Uses of `any` and `...TYPE` are considered exact if
			* no conversions are necessary to apply the corresponding function.
			*
			* @param {Function} fn                   A typed-function
			* @param {string | string[]} signature
			*     Signature to be found, can be an array or a comma separated string.
			* @param {object} options  Controls the signature match as documented
			* @return {function}
			*     Returns the function to call for the given signature, or throws an
			*     error if no match is found.
			*/
			function find(fn, signature, options) {
				return findSignature(fn, signature, options).implementation;
			}
			/**
			* Convert a given value to another data type, specified by type name.
			*
			* @param {*} value
			* @param {string} typeName
			*/
			function convert(value, typeName) {
				const type = findType(typeName);
				if (type.test(value)) return value;
				const conversions = type.conversionsTo;
				if (conversions.length === 0) throw new Error("There are no conversions to " + typeName + " defined.");
				for (let i = 0; i < conversions.length; i++) if (findType(conversions[i].from).test(value)) return conversions[i].convert(value);
				throw new Error("Cannot convert " + value + " to " + typeName);
			}
			/**
			* Stringify parameters in a normalized way
			* @param {Param[]} params
			* @param {string} [','] separator
			* @return {string}
			*/
			function stringifyParams(params) {
				let separator = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : ",";
				return params.map((p) => p.name).join(separator);
			}
			/**
			* Parse a parameter, like "...number | boolean"
			* @param {string} param
			* @return {Param} param
			*/
			function parseParam(param) {
				const restParam = param.indexOf("...") === 0;
				const typeDefs = (!restParam ? param : param.length > 3 ? param.slice(3) : "any").split("|").map((s) => findType(s.trim()));
				let hasAny = false;
				let paramName = restParam ? "..." : "";
				return {
					types: typeDefs.map(function(type) {
						hasAny = type.isAny || hasAny;
						paramName += type.name + "|";
						return {
							name: type.name,
							typeIndex: type.index,
							test: type.test,
							isAny: type.isAny,
							conversion: null,
							conversionIndex: -1
						};
					}),
					name: paramName.slice(0, -1),
					hasAny,
					hasConversion: false,
					restParam
				};
			}
			/**
			* Expands a parsed parameter with the types available from currently
			* defined conversions.
			* @param {Param} param
			* @return {Param} param
			*/
			function expandParam(param) {
				const matchingConversions = availableConversions(param.types.map((t) => t.name));
				let hasAny = param.hasAny;
				let newName = param.name;
				const convertibleTypes = matchingConversions.map(function(conversion) {
					const type = findType(conversion.from);
					hasAny = type.isAny || hasAny;
					newName += "|" + conversion.from;
					return {
						name: conversion.from,
						typeIndex: type.index,
						test: type.test,
						isAny: type.isAny,
						conversion,
						conversionIndex: conversion.index
					};
				});
				return {
					types: param.types.concat(convertibleTypes),
					name: newName,
					hasAny,
					hasConversion: convertibleTypes.length > 0,
					restParam: param.restParam
				};
			}
			/**
			* Return the set of type names in a parameter.
			* Caches the result for efficiency
			*
			* @param {Param} param
			* @return {Set<string>} typenames
			*/
			function paramTypeSet(param) {
				if (!param.typeSet) {
					param.typeSet = /* @__PURE__ */ new Set();
					param.types.forEach((type) => param.typeSet.add(type.name));
				}
				return param.typeSet;
			}
			/**
			* Parse a signature with comma separated parameters,
			* like "number | boolean, ...string"
			*
			* @param {string} signature
			* @return {Param[]} params
			*/
			function parseSignature(rawSignature) {
				const params = [];
				if (typeof rawSignature !== "string") throw new TypeError("Signatures must be strings");
				const signature = rawSignature.trim();
				if (signature === "") return params;
				const rawParams = signature.split(",");
				for (let i = 0; i < rawParams.length; ++i) {
					const parsedParam = parseParam(rawParams[i].trim());
					if (parsedParam.restParam && i !== rawParams.length - 1) throw new SyntaxError("Unexpected rest parameter \"" + rawParams[i] + "\": only allowed for the last parameter");
					if (parsedParam.types.length === 0) return null;
					params.push(parsedParam);
				}
				return params;
			}
			/**
			* Test whether a set of params contains a restParam
			* @param {Param[]} params
			* @return {boolean} Returns true when the last parameter is a restParam
			*/
			function hasRestParam(params) {
				const param = last(params);
				return param ? param.restParam : false;
			}
			/**
			* Create a type test for a single parameter, which can have one or multiple
			* types.
			* @param {Param} param
			* @return {function(x: *) : boolean} Returns a test function
			*/
			function compileTest(param) {
				if (!param || param.types.length === 0) return ok;
				else if (param.types.length === 1) return findType(param.types[0].name).test;
				else if (param.types.length === 2) {
					const test0 = findType(param.types[0].name).test;
					const test1 = findType(param.types[1].name).test;
					return function or(x) {
						return test0(x) || test1(x);
					};
				} else {
					const tests = param.types.map(function(type) {
						return findType(type.name).test;
					});
					return function or(x) {
						for (let i = 0; i < tests.length; i++) if (tests[i](x)) return true;
						return false;
					};
				}
			}
			/**
			* Create a test for all parameters of a signature
			* @param {Param[]} params
			* @return {function(args: Array<*>) : boolean}
			*/
			function compileTests(params) {
				let tests, test0, test1;
				if (hasRestParam(params)) {
					tests = initial(params).map(compileTest);
					const varIndex = tests.length;
					const lastTest = compileTest(last(params));
					const testRestParam = function(args) {
						for (let i = varIndex; i < args.length; i++) if (!lastTest(args[i])) return false;
						return true;
					};
					return function testArgs(args) {
						for (let i = 0; i < tests.length; i++) if (!tests[i](args[i])) return false;
						return testRestParam(args) && args.length >= varIndex + 1;
					};
				} else if (params.length === 0) return function testArgs(args) {
					return args.length === 0;
				};
				else if (params.length === 1) {
					test0 = compileTest(params[0]);
					return function testArgs(args) {
						return test0(args[0]) && args.length === 1;
					};
				} else if (params.length === 2) {
					test0 = compileTest(params[0]);
					test1 = compileTest(params[1]);
					return function testArgs(args) {
						return test0(args[0]) && test1(args[1]) && args.length === 2;
					};
				} else {
					tests = params.map(compileTest);
					return function testArgs(args) {
						for (let i = 0; i < tests.length; i++) if (!tests[i](args[i])) return false;
						return args.length === tests.length;
					};
				}
			}
			/**
			* Find the parameter at a specific index of a Params list.
			* Handles rest parameters.
			* @param {Param[]} params
			* @param {number} index
			* @return {Param | null} Returns the matching parameter when found,
			*                        null otherwise.
			*/
			function getParamAtIndex(params, index) {
				return index < params.length ? params[index] : hasRestParam(params) ? last(params) : null;
			}
			/**
			* Get all type names of a parameter
			* @param {Params[]} params
			* @param {number} index
			* @return {string[]} Returns an array with type names
			*/
			function getTypeSetAtIndex(params, index) {
				const param = getParamAtIndex(params, index);
				if (!param) return /* @__PURE__ */ new Set();
				return paramTypeSet(param);
			}
			/**
			* Test whether a type is an exact type or conversion
			* @param {Type} type
			* @return {boolean} Returns true when
			*/
			function isExactType(type) {
				return type.conversion === null || type.conversion === void 0;
			}
			/**
			* Helper function for creating error messages: create an array with
			* all available types on a specific argument index.
			* @param {Signature[]} signatures
			* @param {number} index
			* @return {string[]} Returns an array with available types
			*/
			function mergeExpectedParams(signatures, index) {
				const typeSet = /* @__PURE__ */ new Set();
				signatures.forEach((signature) => {
					const paramSet = getTypeSetAtIndex(signature.params, index);
					let name;
					for (name of paramSet) typeSet.add(name);
				});
				return typeSet.has("any") ? ["any"] : Array.from(typeSet);
			}
			/**
			* Create
			* @param {string} name             The name of the function
			* @param {array.<*>} args          The actual arguments passed to the function
			* @param {Signature[]} signatures  A list with available signatures
			* @return {TypeError} Returns a type error with additional data
			*                     attached to it in the property `data`
			*/
			function createError(name, args, signatures) {
				let err, expected;
				const _name = name || "unnamed";
				let matchingSignatures = signatures;
				let index;
				for (index = 0; index < args.length; index++) {
					const nextMatchingDefs = [];
					matchingSignatures.forEach((signature) => {
						const test = compileTest(getParamAtIndex(signature.params, index));
						if ((index < signature.params.length || hasRestParam(signature.params)) && test(args[index])) nextMatchingDefs.push(signature);
					});
					if (nextMatchingDefs.length === 0) {
						expected = mergeExpectedParams(matchingSignatures, index);
						if (expected.length > 0) {
							const actualTypes = findTypeNames(args[index]);
							err = /* @__PURE__ */ new TypeError("Unexpected type of argument in function " + _name + " (expected: " + expected.join(" or ") + ", actual: " + actualTypes.join(" | ") + ", index: " + index + ")");
							err.data = {
								category: "wrongType",
								fn: _name,
								index,
								actual: actualTypes,
								expected
							};
							return err;
						}
					} else matchingSignatures = nextMatchingDefs;
				}
				const lengths = matchingSignatures.map(function(signature) {
					return hasRestParam(signature.params) ? Infinity : signature.params.length;
				});
				if (args.length < Math.min.apply(null, lengths)) {
					expected = mergeExpectedParams(matchingSignatures, index);
					err = /* @__PURE__ */ new TypeError("Too few arguments in function " + _name + " (expected: " + expected.join(" or ") + ", index: " + args.length + ")");
					err.data = {
						category: "tooFewArgs",
						fn: _name,
						index: args.length,
						expected
					};
					return err;
				}
				const maxLength = Math.max.apply(null, lengths);
				if (args.length > maxLength) {
					err = /* @__PURE__ */ new TypeError("Too many arguments in function " + _name + " (expected: " + maxLength + ", actual: " + args.length + ")");
					err.data = {
						category: "tooManyArgs",
						fn: _name,
						index: args.length,
						expectedLength: maxLength
					};
					return err;
				}
				const argTypes = [];
				for (let i = 0; i < args.length; ++i) argTypes.push(findTypeNames(args[i]).join("|"));
				err = /* @__PURE__ */ new TypeError("Arguments of type \"" + argTypes.join(", ") + "\" do not match any of the defined signatures of function " + _name + ".");
				err.data = {
					category: "mismatch",
					actual: argTypes
				};
				return err;
			}
			/**
			* Find the lowest index of all types of a parameter
			* @param {Param} param
			* @return {number} Returns the index of the lowest type in typed.types
			*/
			function getLowestTypeIndex(param) {
				let min = typeList.length + 1;
				for (let i = 0; i < param.types.length; i++) min = Math.min(min, param.types[i].typeIndex);
				return min;
			}
			/**
			* Find the lowest index of the conversion of all types of the parameter
			* having a conversion
			* @param {Param} param
			* @return {number} Returns the lowest index of the conversions of this type
			*/
			function getLowestConversionIndex(param) {
				let min = nConversions + 1;
				for (let i = 0; i < param.types.length; i++) if (!isExactType(param.types[i])) min = Math.min(min, param.types[i].conversionIndex);
				return min;
			}
			/**
			* Compare two params. The return value is a number that is
			* negative when param1 should be considered first, positive
			* when param2 should be considered first, and zero when the
			* params are indistinguishable. Primarily as a debugging aid,
			* the value is always less than one in absolute value, and
			* a smaller absolute value indicates a less important distinction
			* between the parameters.
			* @param {Param} param1
			* @param {Param} param2
			* @return {number} negative, positive, or zero depending on whether
			*                  param1 should be ordered before, after, or equivalently
			*                  to param2
			*/
			function compareParams(param1, param2) {
				if (param1.hasAny) {
					if (!param2.hasAny) return .1;
				} else if (param2.hasAny) return -.1;
				if (param1.restParam) {
					if (!param2.restParam) return .01;
				} else if (param2.restParam) return -.01;
				const typeDiff = getLowestTypeIndex(param1) - getLowestTypeIndex(param2);
				if (typeDiff < 0) return -.001;
				if (typeDiff > 0) return .001;
				const conv1 = getLowestConversionIndex(param1);
				const conv2 = getLowestConversionIndex(param2);
				if (param1.hasConversion) {
					if (!param2.hasConversion) return (1 + conv1) * 1e-6;
				} else if (param2.hasConversion) return -(1 + conv2) * 1e-6;
				const convDiff = conv1 - conv2;
				if (convDiff < 0) return -1e-7;
				if (convDiff > 0) return 1e-7;
				return 0;
			}
			/**
			* Compare two signatures. The result is a number that is negative
			* when the first signature should be preferred to the second, positive
			* when the second signature should be preferred, and zero in case the
			* two signatures are essentially equivalent. Primarily as a debugging
			* aid, a larger absolute value indicates a more "important" difference.
			*
			* @param {Signature} signature1
			* @param {Signature} signature2
			* @return {number} returns a negative number when signature1 must get a
			*                  lower index than signature2, a positive number when the
			*                  opposite holds, or zero when both are equivalent.
			*/
			function compareSignatures(signature1, signature2) {
				const pars1 = signature1.params;
				const pars2 = signature2.params;
				const last1 = last(pars1);
				const last2 = last(pars2);
				const hasRest1 = hasRestParam(pars1);
				const hasRest2 = hasRestParam(pars2);
				if (hasRest1 && last1.hasAny) {
					if (!hasRest2 || !last2.hasAny) return 1e7;
				} else if (hasRest2 && last2.hasAny) return -1e7;
				let any1 = 0;
				let conv1 = 0;
				let par;
				for (par of pars1) {
					if (par.hasAny) ++any1;
					if (par.hasConversion) ++conv1;
				}
				let any2 = 0;
				let conv2 = 0;
				for (par of pars2) {
					if (par.hasAny) ++any2;
					if (par.hasConversion) ++conv2;
				}
				if (any1 !== any2) return (any1 - any2) * 1e6;
				if (hasRest1 && last1.hasConversion) {
					if (!hasRest2 || !last2.hasConversion) return 1e5;
				} else if (hasRest2 && last2.hasConversion) return -1e5;
				if (conv1 !== conv2) return (conv1 - conv2) * 1e4;
				if (hasRest1) {
					if (!hasRest2) return 1e3;
				} else if (hasRest2) return -1e3;
				const lengthCriterion = (pars1.length - pars2.length) * (hasRest1 ? -100 : 100);
				if (lengthCriterion !== 0) return lengthCriterion;
				const comparisons = [];
				let tc = 0;
				for (let i = 0; i < pars1.length; ++i) {
					const thisComparison = compareParams(pars1[i], pars2[i]);
					comparisons.push(thisComparison);
					tc += thisComparison;
				}
				if (tc !== 0) return (tc < 0 ? -10 : 10) + tc;
				let c;
				let bonus = 9;
				const decrement = bonus / (comparisons.length + 1);
				for (c of comparisons) {
					if (c !== 0) return (c < 0 ? -bonus : bonus) + c;
					bonus -= decrement;
				}
				return 0;
			}
			/**
			* Produce a list of all conversions from distinct types to one of
			* the given types.
			*
			* @param {string[]} typeNames
			* @return {ConversionDef[]} Returns the conversions that are available
			*                        resulting in any given type (if any)
			*/
			function availableConversions(typeNames) {
				if (typeNames.length === 0) return [];
				const types = typeNames.map(findType);
				if (typeNames.length === 1) return types[0].conversionsTo;
				const knownTypes = new Set(typeNames);
				const convertibleTypes = /* @__PURE__ */ new Set();
				for (let i = 0; i < types.length; ++i) for (const match of types[i].conversionsTo) if (!knownTypes.has(match.from)) convertibleTypes.add(match.from);
				const matches = [];
				for (const typeName of convertibleTypes) {
					let bestIndex = nConversions + 1;
					let bestConversion = null;
					for (let i = 0; i < types.length; ++i) for (const match of types[i].conversionsTo) if (match.from === typeName && match.index < bestIndex) {
						bestIndex = match.index;
						bestConversion = match;
					}
					matches.push(bestConversion);
				}
				return matches;
			}
			/**
			* Preprocess arguments before calling the original function:
			* - if needed convert the parameters
			* - in case of rest parameters, move the rest parameters into an Array
			* @param {Param[]} params
			* @param {function} fn
			* @return {function} Returns fn or a wrapped function if needed. If it
			*                    has conversions, the function will be named to indicate
			*                    what conversions are occurring.
			*/
			function compileArgsPreprocessing(params, fn) {
				let fnConvert = fn;
				let name = "";
				if (params.some((p) => p.hasConversion)) {
					const restParam = hasRestParam(params);
					const compiledConversions = params.map(compileArgConversion);
					name = compiledConversions.map((conv) => conv.name).join(";");
					fnConvert = function convertArgs() {
						const args = [];
						const last = restParam ? arguments.length - 1 : arguments.length;
						for (let i = 0; i < last; i++) args[i] = compiledConversions[i](arguments[i]);
						if (restParam) args[last] = arguments[last].map(compiledConversions[last]);
						return fn.apply(this, args);
					};
				}
				let fnPreprocess = fnConvert;
				if (hasRestParam(params)) {
					const offset = params.length - 1;
					fnPreprocess = function preprocessRestParams() {
						return fnConvert.apply(this, slice(arguments, 0, offset).concat([slice(arguments, offset)]));
					};
				}
				if (name) Object.defineProperty(fnPreprocess, "name", { value: name });
				return fnPreprocess;
			}
			/**
			* Compile conversion for a parameter to the right type
			* @param {Param} param
			* @return {function} Returns the wrapped function that will convert arguments
			*
			*/
			function compileArgConversion(param) {
				let test0, test1, conversion0, conversion1;
				const tests = [];
				const conversions = [];
				let name = "";
				param.types.forEach(function(type) {
					if (type.conversion) {
						name += type.conversion.from + "~>" + type.conversion.to + ",";
						tests.push(findType(type.conversion.from).test);
						conversions.push(type.conversion.convert);
					}
				});
				if (name) name = name.slice(0, -1);
				else name = "pass";
				let convertor = (arg) => arg;
				switch (conversions.length) {
					case 0: break;
					case 1:
						test0 = tests[0];
						conversion0 = conversions[0];
						convertor = function convertArg(arg) {
							if (test0(arg)) return conversion0(arg);
							return arg;
						};
						break;
					case 2:
						test0 = tests[0];
						test1 = tests[1];
						conversion0 = conversions[0];
						conversion1 = conversions[1];
						convertor = function convertArg(arg) {
							if (test0(arg)) return conversion0(arg);
							if (test1(arg)) return conversion1(arg);
							return arg;
						};
						break;
					default: convertor = function convertArg(arg) {
						for (let i = 0; i < conversions.length; i++) if (tests[i](arg)) return conversions[i](arg);
						return arg;
					};
				}
				Object.defineProperty(convertor, "name", { value: name });
				return convertor;
			}
			/**
			* Split params with union types in to separate params.
			*
			* For example:
			*
			*     splitParams([['Array', 'Object'], ['string', 'RegExp'])
			*     // returns:
			*     // [
			*     //   ['Array', 'string'],
			*     //   ['Array', 'RegExp'],
			*     //   ['Object', 'string'],
			*     //   ['Object', 'RegExp']
			*     // ]
			*
			* @param {Param[]} params
			* @return {Param[]}
			*/
			function splitParams(params) {
				function _splitParams(params, index, paramsSoFar) {
					if (index < params.length) {
						const param = params[index];
						let resultingParams = [];
						if (param.restParam) {
							const exactTypes = param.types.filter(isExactType);
							if (exactTypes.length < param.types.length) resultingParams.push({
								types: exactTypes,
								name: "..." + exactTypes.map((t) => t.name).join("|"),
								hasAny: exactTypes.some((t) => t.isAny),
								hasConversion: false,
								restParam: true
							});
							resultingParams.push(param);
						} else resultingParams = param.types.map(function(type) {
							return {
								types: [type],
								name: type.name,
								hasAny: type.isAny,
								hasConversion: type.conversion,
								restParam: false
							};
						});
						return flatMap(resultingParams, function(nextParam) {
							return _splitParams(params, index + 1, paramsSoFar.concat([nextParam]));
						});
					} else return [paramsSoFar];
				}
				return _splitParams(params, 0, []);
			}
			/**
			* Test whether two param lists represent conflicting signatures
			* @param {Param[]} params1
			* @param {Param[]} params2
			* @return {boolean} Returns true when the signatures conflict, false otherwise.
			*/
			function conflicting(params1, params2) {
				const ii = Math.max(params1.length, params2.length);
				for (let i = 0; i < ii; i++) {
					const typeSet1 = getTypeSetAtIndex(params1, i);
					const typeSet2 = getTypeSetAtIndex(params2, i);
					let overlap = false;
					let name;
					for (name of typeSet2) if (typeSet1.has(name)) {
						overlap = true;
						break;
					}
					if (!overlap) return false;
				}
				const len1 = params1.length;
				const len2 = params2.length;
				const restParam1 = hasRestParam(params1);
				const restParam2 = hasRestParam(params2);
				return restParam1 ? restParam2 ? len1 === len2 : len2 >= len1 : restParam2 ? len1 >= len2 : len1 === len2;
			}
			/**
			* Helper function for `resolveReferences` that returns a copy of
			* functionList wihe any prior resolutions cleared out, in case we are
			* recycling signatures from a prior typed function construction.
			*
			* @param {Array.<function|typed-reference>} functionList
			* @return {Array.<function|typed-reference>}
			*/
			function clearResolutions(functionList) {
				return functionList.map((fn) => {
					if (isReferToSelf(fn)) return referToSelf(fn.referToSelf.callback);
					if (isReferTo(fn)) return makeReferTo(fn.referTo.references, fn.referTo.callback);
					return fn;
				});
			}
			/**
			* Take a list of references, a list of functions functionList, and a
			* signatureMap indexing signatures into functionList, and return
			* the list of resolutions, or a false-y value if they don't all
			* resolve in a valid way (yet).
			*
			* @param {string[]} references
			* @param {Array<function|typed-reference} functionList
			* @param {Object.<string, integer>} signatureMap
			* @return {function[] | false} resolutions
			*/
			function collectResolutions(references, functionList, signatureMap) {
				const resolvedReferences = [];
				let reference;
				for (reference of references) {
					let resolution = signatureMap[reference];
					if (typeof resolution !== "number") throw new TypeError("No definition for referenced signature \"" + reference + "\"");
					resolution = functionList[resolution];
					if (typeof resolution !== "function") return false;
					resolvedReferences.push(resolution);
				}
				return resolvedReferences;
			}
			/**
			* Resolve any references in the functionList for the typed function
			* itself. The signatureMap tells which index in the functionList a
			* given signature should be mapped to (for use in resolving typed.referTo)
			* and self provides the destions of a typed.referToSelf.
			*
			* @param {Array<function | typed-reference-object>} functionList
			* @param {Object.<string, function>} signatureMap
			* @param {function} self  The typed-function itself
			* @return {Array<function>} The list of resolved functions
			*/
			function resolveReferences(functionList, signatureMap, self) {
				const resolvedFunctions = clearResolutions(functionList);
				const isResolved = new Array(resolvedFunctions.length).fill(false);
				let leftUnresolved = true;
				while (leftUnresolved) {
					leftUnresolved = false;
					let nothingResolved = true;
					for (let i = 0; i < resolvedFunctions.length; ++i) {
						if (isResolved[i]) continue;
						const fn = resolvedFunctions[i];
						if (isReferToSelf(fn)) {
							resolvedFunctions[i] = fn.referToSelf.callback(self);
							resolvedFunctions[i].referToSelf = fn.referToSelf;
							isResolved[i] = true;
							nothingResolved = false;
						} else if (isReferTo(fn)) {
							const resolvedReferences = collectResolutions(fn.referTo.references, resolvedFunctions, signatureMap);
							if (resolvedReferences) {
								resolvedFunctions[i] = fn.referTo.callback.apply(this, resolvedReferences);
								resolvedFunctions[i].referTo = fn.referTo;
								isResolved[i] = true;
								nothingResolved = false;
							} else leftUnresolved = true;
						}
					}
					if (nothingResolved && leftUnresolved) throw new SyntaxError("Circular reference detected in resolving typed.referTo");
				}
				return resolvedFunctions;
			}
			/**
			* Validate whether any of the function bodies contains a self-reference
			* usage like `this(...)` or `this.signatures`. This self-referencing is
			* deprecated since typed-function v3. It has been replaced with
			* the functions typed.referTo and typed.referToSelf.
			* @param {Object.<string, function>} signaturesMap
			*/
			function validateDeprecatedThis(signaturesMap) {
				const deprecatedThisRegex = /\bthis(\(|\.signatures\b)/;
				Object.keys(signaturesMap).forEach((signature) => {
					const fn = signaturesMap[signature];
					if (deprecatedThisRegex.test(fn.toString())) throw new SyntaxError("Using `this` to self-reference a function is deprecated since typed-function@3. Use typed.referTo and typed.referToSelf instead.");
				});
			}
			/**
			* Create a typed function
			* @param {String} name               The name for the typed function
			* @param {Object.<string, function>} rawSignaturesMap
			*                                    An object with one or
			*                                    multiple signatures as key, and the
			*                                    function corresponding to the
			*                                    signature as value.
			* @return {function}  Returns the created typed function.
			*/
			function createTypedFunction(name, rawSignaturesMap) {
				typed.createCount++;
				if (Object.keys(rawSignaturesMap).length === 0) throw new SyntaxError("No signatures provided");
				if (typed.warnAgainstDeprecatedThis) validateDeprecatedThis(rawSignaturesMap);
				const parsedParams = [];
				const originalFunctions = [];
				const signaturesMap = {};
				const preliminarySignatures = [];
				let signature;
				for (signature in rawSignaturesMap) {
					if (!Object.prototype.hasOwnProperty.call(rawSignaturesMap, signature)) continue;
					const params = parseSignature(signature);
					if (!params) continue;
					parsedParams.forEach(function(pp) {
						if (conflicting(pp, params)) throw new TypeError("Conflicting signatures \"" + stringifyParams(pp) + "\" and \"" + stringifyParams(params) + "\".");
					});
					parsedParams.push(params);
					const functionIndex = originalFunctions.length;
					originalFunctions.push(rawSignaturesMap[signature]);
					const conversionParams = params.map(expandParam);
					let sp;
					for (sp of splitParams(conversionParams)) {
						const spName = stringifyParams(sp);
						preliminarySignatures.push({
							params: sp,
							name: spName,
							fn: functionIndex
						});
						if (sp.every((p) => !p.hasConversion)) signaturesMap[spName] = functionIndex;
					}
				}
				preliminarySignatures.sort(compareSignatures);
				const resolvedFunctions = resolveReferences(originalFunctions, signaturesMap, theTypedFn);
				let s;
				for (s in signaturesMap) if (Object.prototype.hasOwnProperty.call(signaturesMap, s)) signaturesMap[s] = resolvedFunctions[signaturesMap[s]];
				const signatures = [];
				const internalSignatureMap = /* @__PURE__ */ new Map();
				for (s of preliminarySignatures) if (!internalSignatureMap.has(s.name)) {
					s.fn = resolvedFunctions[s.fn];
					signatures.push(s);
					internalSignatureMap.set(s.name, s);
				}
				const ok0 = signatures[0] && signatures[0].params.length <= 2 && !hasRestParam(signatures[0].params);
				const ok1 = signatures[1] && signatures[1].params.length <= 2 && !hasRestParam(signatures[1].params);
				const ok2 = signatures[2] && signatures[2].params.length <= 2 && !hasRestParam(signatures[2].params);
				const ok3 = signatures[3] && signatures[3].params.length <= 2 && !hasRestParam(signatures[3].params);
				const ok4 = signatures[4] && signatures[4].params.length <= 2 && !hasRestParam(signatures[4].params);
				const ok5 = signatures[5] && signatures[5].params.length <= 2 && !hasRestParam(signatures[5].params);
				const allOk = ok0 && ok1 && ok2 && ok3 && ok4 && ok5;
				for (let i = 0; i < signatures.length; ++i) signatures[i].test = compileTests(signatures[i].params);
				const test00 = ok0 ? compileTest(signatures[0].params[0]) : notOk;
				const test10 = ok1 ? compileTest(signatures[1].params[0]) : notOk;
				const test20 = ok2 ? compileTest(signatures[2].params[0]) : notOk;
				const test30 = ok3 ? compileTest(signatures[3].params[0]) : notOk;
				const test40 = ok4 ? compileTest(signatures[4].params[0]) : notOk;
				const test50 = ok5 ? compileTest(signatures[5].params[0]) : notOk;
				const test01 = ok0 ? compileTest(signatures[0].params[1]) : notOk;
				const test11 = ok1 ? compileTest(signatures[1].params[1]) : notOk;
				const test21 = ok2 ? compileTest(signatures[2].params[1]) : notOk;
				const test31 = ok3 ? compileTest(signatures[3].params[1]) : notOk;
				const test41 = ok4 ? compileTest(signatures[4].params[1]) : notOk;
				const test51 = ok5 ? compileTest(signatures[5].params[1]) : notOk;
				for (let i = 0; i < signatures.length; ++i) signatures[i].implementation = compileArgsPreprocessing(signatures[i].params, signatures[i].fn);
				const fn0 = ok0 ? signatures[0].implementation : undef;
				const fn1 = ok1 ? signatures[1].implementation : undef;
				const fn2 = ok2 ? signatures[2].implementation : undef;
				const fn3 = ok3 ? signatures[3].implementation : undef;
				const fn4 = ok4 ? signatures[4].implementation : undef;
				const fn5 = ok5 ? signatures[5].implementation : undef;
				const len0 = ok0 ? signatures[0].params.length : -1;
				const len1 = ok1 ? signatures[1].params.length : -1;
				const len2 = ok2 ? signatures[2].params.length : -1;
				const len3 = ok3 ? signatures[3].params.length : -1;
				const len4 = ok4 ? signatures[4].params.length : -1;
				const len5 = ok5 ? signatures[5].params.length : -1;
				const iStart = allOk ? 6 : 0;
				const iEnd = signatures.length;
				const tests = signatures.map((s) => s.test);
				const fns = signatures.map((s) => s.implementation);
				const generic = function generic() {
					for (let i = iStart; i < iEnd; i++) if (tests[i](arguments)) return fns[i].apply(this, arguments);
					return typed.onMismatch(name, arguments, signatures);
				};
				function theTypedFn(arg0, arg1) {
					if (arguments.length === len0 && test00(arg0) && test01(arg1)) return fn0.apply(this, arguments);
					if (arguments.length === len1 && test10(arg0) && test11(arg1)) return fn1.apply(this, arguments);
					if (arguments.length === len2 && test20(arg0) && test21(arg1)) return fn2.apply(this, arguments);
					if (arguments.length === len3 && test30(arg0) && test31(arg1)) return fn3.apply(this, arguments);
					if (arguments.length === len4 && test40(arg0) && test41(arg1)) return fn4.apply(this, arguments);
					if (arguments.length === len5 && test50(arg0) && test51(arg1)) return fn5.apply(this, arguments);
					return generic.apply(this, arguments);
				}
				try {
					Object.defineProperty(theTypedFn, "name", { value: name });
				} catch (err) {}
				theTypedFn.signatures = signaturesMap;
				theTypedFn._typedFunctionData = {
					signatures,
					signatureMap: internalSignatureMap
				};
				return theTypedFn;
			}
			/**
			* Action to take on mismatch
			* @param {string} name      Name of function that was attempted to be called
			* @param {Array} args       Actual arguments to the call
			* @param {Array} signatures Known signatures of the named typed-function
			*/
			function _onMismatch(name, args, signatures) {
				throw createError(name, args, signatures);
			}
			/**
			* Return all but the last items of an array or function Arguments
			* @param {Array | Arguments} arr
			* @return {Array}
			*/
			function initial(arr) {
				return slice(arr, 0, arr.length - 1);
			}
			/**
			* return the last item of an array or function Arguments
			* @param {Array | Arguments} arr
			* @return {*}
			*/
			function last(arr) {
				return arr[arr.length - 1];
			}
			/**
			* Slice an array or function Arguments
			* @param {Array | Arguments | IArguments} arr
			* @param {number} start
			* @param {number} [end]
			* @return {Array}
			*/
			function slice(arr, start, end) {
				return Array.prototype.slice.call(arr, start, end);
			}
			/**
			* Return the first item from an array for which test(arr[i]) returns true
			* @param {Array} arr
			* @param {function} test
			* @return {* | undefined} Returns the first matching item
			*                         or undefined when there is no match
			*/
			function findInArray(arr, test) {
				for (let i = 0; i < arr.length; i++) if (test(arr[i])) return arr[i];
			}
			/**
			* Flat map the result invoking a callback for every item in an array.
			* https://gist.github.com/samgiles/762ee337dff48623e729
			* @param {Array} arr
			* @param {function} callback
			* @return {Array}
			*/
			function flatMap(arr, callback) {
				return Array.prototype.concat.apply([], arr.map(callback));
			}
			/**
			* Create a reference callback to one or multiple signatures
			*
			* Syntax:
			*
			*     typed.referTo(signature1, signature2, ..., function callback(fn1, fn2, ...) {
			*       // ...
			*     })
			*
			* @returns {{referTo: {references: string[], callback}}}
			*/
			function referTo() {
				const references = initial(arguments).map((s) => stringifyParams(parseSignature(s)));
				const callback = last(arguments);
				if (typeof callback !== "function") throw new TypeError("Callback function expected as last argument");
				return makeReferTo(references, callback);
			}
			function makeReferTo(references, callback) {
				return { referTo: {
					references,
					callback
				} };
			}
			/**
			* Create a reference callback to the typed-function itself
			*
			* @param {(self: function) => function} callback
			* @returns {{referToSelf: { callback: function }}}
			*/
			function referToSelf(callback) {
				if (typeof callback !== "function") throw new TypeError("Callback function expected as first argument");
				return { referToSelf: { callback } };
			}
			/**
			* Test whether something is a referTo object, holding a list with reference
			* signatures and a callback.
			*
			* @param {Object | function} objectOrFn
			* @returns {boolean}
			*/
			function isReferTo(objectOrFn) {
				return objectOrFn && typeof objectOrFn.referTo === "object" && Array.isArray(objectOrFn.referTo.references) && typeof objectOrFn.referTo.callback === "function";
			}
			/**
			* Test whether something is a referToSelf object, holding a callback where
			* to pass `self`.
			*
			* @param {Object | function} objectOrFn
			* @returns {boolean}
			*/
			function isReferToSelf(objectOrFn) {
				return objectOrFn && typeof objectOrFn.referToSelf === "object" && typeof objectOrFn.referToSelf.callback === "function";
			}
			/**
			* Check if name is (A) new, (B) a match, or (C) a mismatch; and throw
			* an error in case (C).
			*
			* @param { string | undefined } nameSoFar
			* @param { string | undefined } newName
			* @returns { string } updated name
			*/
			function checkName(nameSoFar, newName) {
				if (!nameSoFar) return newName;
				if (newName && newName !== nameSoFar) {
					const err = /* @__PURE__ */ new Error("Function names do not match (expected: " + nameSoFar + ", actual: " + newName + ")");
					err.data = {
						actual: newName,
						expected: nameSoFar
					};
					throw err;
				}
				return nameSoFar;
			}
			/**
			* Retrieve the implied name from an object with signature keys
			* and function values, checking whether all value names match
			*
			* @param { {string: function} } obj
			*/
			function getObjectName(obj) {
				let name;
				for (const key in obj) if (Object.prototype.hasOwnProperty.call(obj, key) && (isTypedFunction(obj[key]) || typeof obj[key].signature === "string")) name = checkName(name, obj[key].name);
				return name;
			}
			/**
			* Copy all of the signatures from the second argument into the first,
			* which is modified by side effect, checking for conflicts
			*
			* @param {Object.<string, function|typed-reference>} dest
			* @param {Object.<string, function|typed-reference>} source
			*/
			function mergeSignatures(dest, source) {
				let key;
				for (key in source) if (Object.prototype.hasOwnProperty.call(source, key)) {
					if (key in dest) {
						if (source[key] !== dest[key]) {
							const err = /* @__PURE__ */ new Error("Signature \"" + key + "\" is defined twice");
							err.data = {
								signature: key,
								sourceFunction: source[key],
								destFunction: dest[key]
							};
							throw err;
						}
					}
					dest[key] = source[key];
				}
			}
			const saveTyped = typed;
			/**
			* Originally the main function was a typed function itself, but then
			* it might not be able to generate error messages if the client
			* replaced the type system with different names.
			*
			* Main entry: typed([name], functions/objects with signatures...)
			*
			* Assembles and returns a new typed-function from the given items
			* that provide signatures and implementations, each of which may be
			* * a plain object mapping (string) signatures to implementing functions,
			* * a previously constructed typed function, or
			* * any other single function with a string-valued property `signature`.
			* The name of the resulting typed-function will be given by the
			* string-valued name argument if present, or if not, by the name
			* of any of the arguments that have one, as long as any that do are
			* consistent with each other. If no name is specified, the name will be
			* an empty string.
			*
			* @param {string} maybeName [optional]
			* @param {(function|object)[]} signature providers
			* @returns {typed-function}
			*/
			typed = function(maybeName) {
				const named = typeof maybeName === "string";
				const start = named ? 1 : 0;
				let name = named ? maybeName : "";
				const allSignatures = {};
				for (let i = start; i < arguments.length; ++i) {
					const item = arguments[i];
					let theseSignatures = {};
					let thisName;
					if (typeof item === "function") {
						thisName = item.name;
						if (typeof item.signature === "string") theseSignatures[item.signature] = item;
						else if (isTypedFunction(item)) theseSignatures = item.signatures;
					} else if (isPlainObject(item)) {
						theseSignatures = item;
						if (!named) thisName = getObjectName(item);
					}
					if (Object.keys(theseSignatures).length === 0) {
						const err = /* @__PURE__ */ new TypeError("Argument to 'typed' at index " + i + " is not a (typed) function, nor an object with signatures as keys and functions as values.");
						err.data = {
							index: i,
							argument: item
						};
						throw err;
					}
					if (!named) name = checkName(name, thisName);
					mergeSignatures(allSignatures, theseSignatures);
				}
				return createTypedFunction(name || "", allSignatures);
			};
			typed.create = create;
			typed.createCount = saveTyped.createCount;
			typed.onMismatch = _onMismatch;
			typed.throwMismatchError = _onMismatch;
			typed.createError = createError;
			typed.clear = clear;
			typed.clearConversions = clearConversions;
			typed.addTypes = addTypes;
			typed._findType = findType;
			typed.referTo = referTo;
			typed.referToSelf = referToSelf;
			typed.convert = convert;
			typed.findSignature = findSignature;
			typed.find = find;
			typed.isTypedFunction = isTypedFunction;
			typed.warnAgainstDeprecatedThis = true;
			/**
			* add a type (convenience wrapper for typed.addTypes)
			* @param {{name: string, test: function}} type
			* @param {boolean} [beforeObjectTest=true]
			*                          If true, the new test will be inserted before
			*                          the test with name 'Object' (if any), since
			*                          tests for Object match Array and classes too.
			*/
			typed.addType = function(type, beforeObjectTest) {
				let before = "any";
				if (beforeObjectTest !== false && typeMap.has("Object")) before = "Object";
				typed.addTypes([type], before);
			};
			/**
			* Verify that the ConversionDef conversion has a valid format.
			*
			* @param {conversionDef} conversion
			* @return {void}
			* @throws {TypeError|SyntaxError}
			*/
			function _validateConversion(conversion) {
				if (!conversion || typeof conversion.from !== "string" || typeof conversion.to !== "string" || typeof conversion.convert !== "function") throw new TypeError("Object with properties {from: string, to: string, convert: function} expected");
				if (conversion.to === conversion.from) throw new SyntaxError("Illegal to define conversion from \"" + conversion.from + "\" to itself.");
			}
			/**
			* Add a conversion
			*
			* @param {ConversionDef} conversion
			* @param {{override: boolean}} [options]
			* @returns {void}
			* @throws {TypeError}
			*/
			typed.addConversion = function(conversion) {
				let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : { override: false };
				_validateConversion(conversion);
				const to = findType(conversion.to);
				const existing = to.conversionsTo.find((other) => other.from === conversion.from);
				if (existing) {
					if (options && options.override) typed.removeConversion({
						from: existing.from,
						to: conversion.to,
						convert: existing.convert
					});
					else throw new Error("There is already a conversion from \"" + conversion.from + "\" to \"" + to.name + "\"");
				}
				to.conversionsTo.push({
					from: conversion.from,
					to: to.name,
					convert: conversion.convert,
					index: nConversions++
				});
			};
			/**
			* Convenience wrapper to call addConversion on each conversion in a list.
			*
			* @param {ConversionDef[]} conversions
			* @param {{override: boolean}} [options]
			* @returns {void}
			* @throws {TypeError}
			*/
			typed.addConversions = function(conversions, options) {
				conversions.forEach((conversion) => typed.addConversion(conversion, options));
			};
			/**
			* Remove the specified conversion. The format is the same as for
			* addConversion, and the convert function must match or an error
			* is thrown.
			*
			* @param {{from: string, to: string, convert: function}} conversion
			* @returns {void}
			* @throws {TypeError|SyntaxError|Error}
			*/
			typed.removeConversion = function(conversion) {
				_validateConversion(conversion);
				const to = findType(conversion.to);
				const existingConversion = findInArray(to.conversionsTo, (c) => c.from === conversion.from);
				if (!existingConversion) throw new Error("Attempt to remove nonexistent conversion from " + conversion.from + " to " + conversion.to);
				if (existingConversion.convert !== conversion.convert) throw new Error("Conversion to remove does not match existing conversion");
				const index = to.conversionsTo.indexOf(existingConversion);
				to.conversionsTo.splice(index, 1);
			};
			/**
			* Produce the specific signature that a typed function
			* will execute on the given arguments. Here, a "signature" is an
			* object with properties 'params', 'test', 'fn', and 'implementation'.
			* This last property is a function that converts params as necessary
			* and then calls 'fn'. Returns null if there is no matching signature.
			* @param {typed-function} tf
			* @param {any[]} argList
			* @returns {{params: string, test: function, fn: function, implementation: function}}
			*/
			typed.resolve = function(tf, argList) {
				if (!isTypedFunction(tf)) throw new TypeError(NOT_TYPED_FUNCTION);
				const sigs = tf._typedFunctionData.signatures;
				for (let i = 0; i < sigs.length; ++i) if (sigs[i].test(argList)) return sigs[i];
				return null;
			};
			return typed;
		}
		return create();
	}));
})))(), 1);
var _createTyped2 = function _createTyped() {
	_createTyped2 = import_typed_function.default.create;
	return import_typed_function.default;
};
/**
* Factory function for creating a new typed instance
* @param {Object} dependencies   Object with data types like Complex and BigNumber
* @returns {Function}
*/
var createTyped = /* #__PURE__ */ factory("typed", [
	"?BigNumber",
	"?Complex",
	"?DenseMatrix",
	"?Fraction"
], function createTyped(_ref) {
	var { BigNumber, Complex, DenseMatrix, Fraction } = _ref;
	var typed = _createTyped2();
	typed.clear();
	typed.addTypes([
		{
			name: "number",
			test: isNumber
		},
		{
			name: "Complex",
			test: isComplex
		},
		{
			name: "BigNumber",
			test: isBigNumber
		},
		{
			name: "bigint",
			test: isBigInt
		},
		{
			name: "Fraction",
			test: isFraction
		},
		{
			name: "Unit",
			test: isUnit
		},
		{
			name: "identifier",
			test: (s) => isString && /^(?:[A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088F\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5C\u0C5D\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDC-\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C8A\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7DC\uA7F1-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF40\uDF42-\uDF49\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDD70-\uDD7A\uDD7C-\uDD8A\uDD8C-\uDD92\uDD94\uDD95\uDD97-\uDDA1\uDDA3-\uDDB1\uDDB3-\uDDB9\uDDBB\uDDBC\uDDC0-\uDDF3\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67\uDF80-\uDF85\uDF87-\uDFB0\uDFB2-\uDFBA]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD40-\uDD59\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD23\uDD4A-\uDD65\uDD6F-\uDD85\uDE80-\uDEA9\uDEB0\uDEB1\uDEC2-\uDEC7\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDF70-\uDF81\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC71\uDC72\uDC75\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE3F\uDE40\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61\uDF80-\uDF89\uDF8B\uDF8E\uDF90-\uDFB5\uDFB7\uDFD1\uDFD3]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A\uDF40-\uDF46]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCDF\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEB0-\uDEF8\uDFC0-\uDFE0]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDDB0-\uDDDB\uDEE0-\uDEF2\uDF02\uDF04-\uDF10\uDF12-\uDF33\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC80-\uDD43]|\uD80B[\uDF90-\uDFF0]|[\uD80C\uD80E\uD80F\uD81C-\uD822\uD840-\uD868\uD86A-\uD86D\uD86F-\uD872\uD874-\uD879\uD880-\uD883\uD885-\uD88C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2F\uDC41-\uDC46\uDC60-\uDFFF]|\uD810[\uDC00-\uDFFA]|\uD811[\uDC00-\uDE46]|\uD818[\uDD00-\uDD1D]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE70-\uDEBE\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDD40-\uDD6C\uDE40-\uDE7F\uDEA0-\uDEB8\uDEBB-\uDED3\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3\uDFF2\uDFF3]|\uD823[\uDC00-\uDCD5\uDCFF-\uDD1E\uDD80-\uDDF2]|\uD82B[\uDFF0-\uDFF3\uDFF5-\uDFFB\uDFFD\uDFFE]|\uD82C[\uDC00-\uDD22\uDD32\uDD50-\uDD52\uDD55\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD837[\uDF00-\uDF1E\uDF25-\uDF2A]|\uD838[\uDC30-\uDC6D\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDE90-\uDEAD\uDEC0-\uDEEB]|\uD839[\uDCD0-\uDCEB\uDDD0-\uDDED\uDDF0\uDEC0-\uDEDE\uDEE0-\uDEE2\uDEE4\uDEE5\uDEE7-\uDEED\uDEF0-\uDEF4\uDEFE\uDEFF\uDFE0-\uDFE6\uDFE8-\uDFEB\uDFED\uDFEE\uDFF0-\uDFFE]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDEDF\uDF00-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEAD\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0\uDFF0-\uDFFF]|\uD87B[\uDC00-\uDE5D]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A\uDF50-\uDFFF]|\uD88D[\uDC00-\uDC79])(?:[0-9A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088F\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5C\u0C5D\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDC-\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C8A\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7DC\uA7F1-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF40\uDF42-\uDF49\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDD70-\uDD7A\uDD7C-\uDD8A\uDD8C-\uDD92\uDD94\uDD95\uDD97-\uDDA1\uDDA3-\uDDB1\uDDB3-\uDDB9\uDDBB\uDDBC\uDDC0-\uDDF3\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67\uDF80-\uDF85\uDF87-\uDFB0\uDFB2-\uDFBA]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD40-\uDD59\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD23\uDD4A-\uDD65\uDD6F-\uDD85\uDE80-\uDEA9\uDEB0\uDEB1\uDEC2-\uDEC7\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDF70-\uDF81\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC71\uDC72\uDC75\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE3F\uDE40\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61\uDF80-\uDF89\uDF8B\uDF8E\uDF90-\uDFB5\uDFB7\uDFD1\uDFD3]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A\uDF40-\uDF46]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCDF\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEB0-\uDEF8\uDFC0-\uDFE0]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDDB0-\uDDDB\uDEE0-\uDEF2\uDF02\uDF04-\uDF10\uDF12-\uDF33\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC80-\uDD43]|\uD80B[\uDF90-\uDFF0]|[\uD80C\uD80E\uD80F\uD81C-\uD822\uD840-\uD868\uD86A-\uD86D\uD86F-\uD872\uD874-\uD879\uD880-\uD883\uD885-\uD88C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2F\uDC41-\uDC46\uDC60-\uDFFF]|\uD810[\uDC00-\uDFFA]|\uD811[\uDC00-\uDE46]|\uD818[\uDD00-\uDD1D]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE70-\uDEBE\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDD40-\uDD6C\uDE40-\uDE7F\uDEA0-\uDEB8\uDEBB-\uDED3\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3\uDFF2\uDFF3]|\uD823[\uDC00-\uDCD5\uDCFF-\uDD1E\uDD80-\uDDF2]|\uD82B[\uDFF0-\uDFF3\uDFF5-\uDFFB\uDFFD\uDFFE]|\uD82C[\uDC00-\uDD22\uDD32\uDD50-\uDD52\uDD55\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD837[\uDF00-\uDF1E\uDF25-\uDF2A]|\uD838[\uDC30-\uDC6D\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDE90-\uDEAD\uDEC0-\uDEEB]|\uD839[\uDCD0-\uDCEB\uDDD0-\uDDED\uDDF0\uDEC0-\uDEDE\uDEE0-\uDEE2\uDEE4\uDEE5\uDEE7-\uDEED\uDEF0-\uDEF4\uDEFE\uDEFF\uDFE0-\uDFE6\uDFE8-\uDFEB\uDFED\uDFEE\uDFF0-\uDFFE]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDEDF\uDF00-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEAD\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0\uDFF0-\uDFFF]|\uD87B[\uDC00-\uDE5D]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A\uDF50-\uDFFF]|\uD88D[\uDC00-\uDC79])*$/.test(s)
		},
		{
			name: "string",
			test: isString
		},
		{
			name: "Chain",
			test: isChain
		},
		{
			name: "Array",
			test: isArray
		},
		{
			name: "Matrix",
			test: isMatrix
		},
		{
			name: "DenseMatrix",
			test: isDenseMatrix
		},
		{
			name: "SparseMatrix",
			test: isSparseMatrix
		},
		{
			name: "Range",
			test: isRange
		},
		{
			name: "Index",
			test: isIndex
		},
		{
			name: "boolean",
			test: isBoolean
		},
		{
			name: "ResultSet",
			test: isResultSet
		},
		{
			name: "Help",
			test: isHelp
		},
		{
			name: "function",
			test: isFunction
		},
		{
			name: "Date",
			test: isDate
		},
		{
			name: "RegExp",
			test: isRegExp
		},
		{
			name: "null",
			test: isNull
		},
		{
			name: "undefined",
			test: isUndefined
		},
		{
			name: "AccessorNode",
			test: isAccessorNode
		},
		{
			name: "ArrayNode",
			test: isArrayNode
		},
		{
			name: "AssignmentNode",
			test: isAssignmentNode
		},
		{
			name: "BlockNode",
			test: isBlockNode
		},
		{
			name: "ConditionalNode",
			test: isConditionalNode
		},
		{
			name: "ConstantNode",
			test: isConstantNode
		},
		{
			name: "FunctionNode",
			test: isFunctionNode
		},
		{
			name: "FunctionAssignmentNode",
			test: isFunctionAssignmentNode
		},
		{
			name: "IndexNode",
			test: isIndexNode
		},
		{
			name: "Node",
			test: isNode
		},
		{
			name: "ObjectNode",
			test: isObjectNode
		},
		{
			name: "OperatorNode",
			test: isOperatorNode
		},
		{
			name: "ParenthesisNode",
			test: isParenthesisNode
		},
		{
			name: "RangeNode",
			test: isRangeNode
		},
		{
			name: "RelationalNode",
			test: isRelationalNode
		},
		{
			name: "SymbolNode",
			test: isSymbolNode
		},
		{
			name: "Map",
			test: isMap
		},
		{
			name: "Object",
			test: isObject
		}
	]);
	typed.addConversions([
		{
			from: "number",
			to: "BigNumber",
			convert: function convert(x) {
				if (!BigNumber) throwNoBignumber(x);
				if (digits(x) > 15) throw new TypeError("Cannot implicitly convert a number with >15 significant digits to BigNumber (value: " + x + "). Use function bignumber(x) to convert to BigNumber.");
				return new BigNumber(x);
			}
		},
		{
			from: "number",
			to: "Complex",
			convert: function convert(x) {
				if (!Complex) throwNoComplex(x);
				return new Complex(x, 0);
			}
		},
		{
			from: "BigNumber",
			to: "Complex",
			convert: function convert(x) {
				if (!Complex) throwNoComplex(x);
				return new Complex(x.toNumber(), 0);
			}
		},
		{
			from: "bigint",
			to: "number",
			convert: function convert(x) {
				if (x > Number.MAX_SAFE_INTEGER) throw new TypeError("Cannot implicitly convert bigint to number: value exceeds the max safe integer value (value: " + x + ")");
				return Number(x);
			}
		},
		{
			from: "bigint",
			to: "BigNumber",
			convert: function convert(x) {
				if (!BigNumber) throwNoBignumber(x);
				return new BigNumber(x.toString());
			}
		},
		{
			from: "bigint",
			to: "Fraction",
			convert: function convert(x) {
				if (!Fraction) throwNoFraction(x);
				return new Fraction(x);
			}
		},
		{
			from: "Fraction",
			to: "BigNumber",
			convert: function convert(x) {
				throw new TypeError("Cannot implicitly convert a Fraction to BigNumber or vice versa. Use function bignumber(x) to convert to BigNumber or fraction(x) to convert to Fraction.");
			}
		},
		{
			from: "Fraction",
			to: "Complex",
			convert: function convert(x) {
				if (!Complex) throwNoComplex(x);
				return new Complex(x.valueOf(), 0);
			}
		},
		{
			from: "number",
			to: "Fraction",
			convert: function convert(x) {
				if (!Fraction) throwNoFraction(x);
				var f = new Fraction(x);
				if (f.valueOf() !== x) throw new TypeError("Cannot implicitly convert a number to a Fraction when there will be a loss of precision (value: " + x + "). Use function fraction(x) to convert to Fraction.");
				return f;
			}
		},
		{
			from: "string",
			to: "number",
			convert: function convert(x) {
				var n = Number(x);
				if (isNaN(n)) throw new Error("Cannot convert \"" + x + "\" to a number");
				return n;
			}
		},
		{
			from: "string",
			to: "BigNumber",
			convert: function convert(x) {
				if (!BigNumber) throwNoBignumber(x);
				try {
					return new BigNumber(x);
				} catch (err) {
					throw new Error("Cannot convert \"" + x + "\" to BigNumber");
				}
			}
		},
		{
			from: "string",
			to: "bigint",
			convert: function convert(x) {
				try {
					return BigInt(x);
				} catch (err) {
					throw new Error("Cannot convert \"" + x + "\" to BigInt");
				}
			}
		},
		{
			from: "string",
			to: "Fraction",
			convert: function convert(x) {
				if (!Fraction) throwNoFraction(x);
				try {
					return new Fraction(x);
				} catch (err) {
					throw new Error("Cannot convert \"" + x + "\" to Fraction");
				}
			}
		},
		{
			from: "string",
			to: "Complex",
			convert: function convert(x) {
				if (!Complex) throwNoComplex(x);
				try {
					return new Complex(x);
				} catch (err) {
					throw new Error("Cannot convert \"" + x + "\" to Complex");
				}
			}
		},
		{
			from: "boolean",
			to: "number",
			convert: function convert(x) {
				return +x;
			}
		},
		{
			from: "boolean",
			to: "BigNumber",
			convert: function convert(x) {
				if (!BigNumber) throwNoBignumber(x);
				return new BigNumber(+x);
			}
		},
		{
			from: "boolean",
			to: "bigint",
			convert: function convert(x) {
				return BigInt(+x);
			}
		},
		{
			from: "boolean",
			to: "Fraction",
			convert: function convert(x) {
				if (!Fraction) throwNoFraction(x);
				return new Fraction(+x);
			}
		},
		{
			from: "boolean",
			to: "string",
			convert: function convert(x) {
				return String(x);
			}
		},
		{
			from: "Array",
			to: "Matrix",
			convert: function convert(array) {
				if (!DenseMatrix) throwNoMatrix();
				return new DenseMatrix(array);
			}
		},
		{
			from: "Matrix",
			to: "Array",
			convert: function convert(matrix) {
				return matrix.valueOf();
			}
		}
	]);
	typed.onMismatch = (name, args, signatures) => {
		var usualError = typed.createError(name, args, signatures);
		if (["wrongType", "mismatch"].includes(usualError.data.category) && args.length === 1 && isCollection(args[0]) && signatures.some((sig) => !sig.params.includes(","))) {
			var err = new TypeError("Function '".concat(name, "' doesn't apply to matrices. To call it ") + "elementwise on a matrix 'M', try 'map(M, ".concat(name, ")'."));
			err.data = usualError.data;
			throw err;
		}
		throw usualError;
	};
	typed.onMismatch = (name, args, signatures) => {
		var usualError = typed.createError(name, args, signatures);
		if (["wrongType", "mismatch"].includes(usualError.data.category) && args.length === 1 && isCollection(args[0]) && signatures.some((sig) => !sig.params.includes(","))) {
			var err = new TypeError("Function '".concat(name, "' doesn't apply to matrices. To call it ") + "elementwise on a matrix 'M', try 'map(M, ".concat(name, ")'."));
			err.data = usualError.data;
			throw err;
		}
		throw usualError;
	};
	return typed;
});
function throwNoBignumber(x) {
	throw new Error("Cannot convert value ".concat(x, " into a BigNumber: no class 'BigNumber' provided"));
}
function throwNoComplex(x) {
	throw new Error("Cannot convert value ".concat(x, " into a Complex number: no class 'Complex' provided"));
}
function throwNoMatrix() {
	throw new Error("Cannot convert array into a Matrix: no class 'DenseMatrix' provided");
}
function throwNoFraction(x) {
	throw new Error("Cannot convert value ".concat(x, " into a Fraction, no class 'Fraction' provided."));
}
var createResultSet = /* #__PURE__ */ factory("ResultSet", [], () => {
	/**
	* A ResultSet contains a list or results
	* @class ResultSet
	* @param {Array} entries
	* @constructor ResultSet
	*/
	function ResultSet(entries) {
		if (!(this instanceof ResultSet)) throw new SyntaxError("Constructor must be called with the new operator");
		this.entries = entries || [];
	}
	/**
	* Attach type information
	*/
	ResultSet.prototype.type = "ResultSet";
	ResultSet.prototype.isResultSet = true;
	/**
	* Returns the array with results hold by this ResultSet
	* @memberof ResultSet
	* @returns {Array} entries
	*/
	ResultSet.prototype.valueOf = function() {
		return this.entries;
	};
	/**
	* Returns the stringified results of the ResultSet
	* @memberof ResultSet
	* @returns {string} string
	*/
	ResultSet.prototype.toString = function() {
		return "[" + this.entries.map(String).join(", ") + "]";
	};
	/**
	* Get a JSON representation of the ResultSet
	* @memberof ResultSet
	* @returns {Object} Returns a JSON object structured as:
	*                   `{"mathjs": "ResultSet", "entries": [...]}`
	*/
	ResultSet.prototype.toJSON = function() {
		return {
			mathjs: "ResultSet",
			entries: this.entries
		};
	};
	/**
	* Instantiate a ResultSet from a JSON object
	* @memberof ResultSet
	* @param {Object} json  A JSON object structured as:
	*                       `{"mathjs": "ResultSet", "entries": [...]}`
	* @return {ResultSet}
	*/
	ResultSet.fromJSON = function(json) {
		return new ResultSet(json.entries);
	};
	return ResultSet;
}, { isClass: true });
//#endregion
//#region node_modules/mathjs/lib/esm/utils/bignumber/formatter.js
/**
* Formats a BigNumber in a given base
* @param {BigNumber} n
* @param {number} base
* @param {number} size
* @returns {string}
*/
function formatBigNumberToBase(n, base, size) {
	var BigNumberCtor = n.constructor;
	var big2 = new BigNumberCtor(2);
	var suffix = "";
	if (size) {
		if (size < 1) throw new Error("size must be in greater than 0");
		if (!isInteger(size)) throw new Error("size must be an integer");
		if (n.greaterThan(big2.pow(size - 1).sub(1)) || n.lessThan(big2.pow(size - 1).mul(-1))) throw new Error("Value must be in range [-2^".concat(size - 1, ", 2^").concat(size - 1, "-1]"));
		if (!n.isInteger()) throw new Error("Value must be an integer");
		if (n.lessThan(0)) n = n.add(big2.pow(size));
		suffix = "i".concat(size);
	}
	switch (base) {
		case 2: return "".concat(n.toBinary()).concat(suffix);
		case 8: return "".concat(n.toOctal()).concat(suffix);
		case 16: return "".concat(n.toHexadecimal()).concat(suffix);
		default: throw new Error("Base ".concat(base, " not supported "));
	}
}
/**
* Convert a BigNumber to a formatted string representation.
*
* Syntax:
*
*    format(value)
*    format(value, options)
*    format(value, precision)
*    format(value, fn)
*
* Where:
*
*    {number} value   The value to be formatted
*    {Object} options An object with formatting options. Available options:
*                     {string} notation
*                         Number notation. Choose from:
*                         'fixed'          Always use regular number notation.
*                                          For example '123.40' and '14000000'
*                         'exponential'    Always use exponential notation.
*                                          For example '1.234e+2' and '1.4e+7'
*                         'auto' (default) Regular number notation for numbers
*                                          having an absolute value between
*                                          `lower` and `upper` bounds, and uses
*                                          exponential notation elsewhere.
*                                          Lower bound is included, upper bound
*                                          is excluded.
*                                          For example '123.4' and '1.4e7'.
*                         'bin', 'oct, or
*                         'hex'            Format the number using binary, octal,
*                                          or hexadecimal notation.
*                                          For example '0b1101' and '0x10fe'.
*                     {number} wordSize    The word size in bits to use for formatting
*                                          in binary, octal, or hexadecimal notation.
*                                          To be used only with 'bin', 'oct', or 'hex'
*                                          values for 'notation' option. When this option
*                                          is defined the value is formatted as a signed
*                                          twos complement integer of the given word size
*                                          and the size suffix is appended to the output.
*                                          For example
*                                          format(-1, {notation: 'hex', wordSize: 8}) === '0xffi8'.
*                                          Default value is undefined.
*                     {number} precision   A number between 0 and 16 to round
*                                          the digits of the number.
*                                          In case of notations 'exponential',
*                                          'engineering', and 'auto',
*                                          `precision` defines the total
*                                          number of significant digits returned.
*                                          In case of notation 'fixed',
*                                          `precision` defines the number of
*                                          significant digits after the decimal
*                                          point.
*                                          `precision` is undefined by default.
*                     {number} lowerExp    Exponent determining the lower boundary
*                                          for formatting a value with an exponent
*                                          when `notation='auto`.
*                                          Default value is `-3`.
*                     {number} upperExp    Exponent determining the upper boundary
*                                          for formatting a value with an exponent
*                                          when `notation='auto`.
*                                          Default value is `5`.
*    {Function} fn    A custom formatting function. Can be used to override the
*                     built-in notations. Function `fn` is called with `value` as
*                     parameter and must return a string. Is useful for example to
*                     format all values inside a matrix in a particular way.
*
* Examples:
*
*    format(6.4)                                        // '6.4'
*    format(1240000)                                    // '1.24e6'
*    format(1/3)                                        // '0.3333333333333333'
*    format(1/3, 3)                                     // '0.333'
*    format(21385, 2)                                   // '21000'
*    format(12e8, {notation: 'fixed'})                  // returns '1200000000'
*    format(2.3,    {notation: 'fixed', precision: 4})  // returns '2.3000'
*    format(52.8,   {notation: 'exponential'})          // returns '5.28e+1'
*    format(12400,  {notation: 'engineering'})          // returns '12.400e+3'
*
* @param {BigNumber} value
* @param {Object | Function | number | BigNumber} [options]
* @return {string} str The formatted value
*/
function format$1(value, options) {
	if (typeof options === "function") return options(value);
	if (!value.isFinite()) return value.isNaN() ? "NaN" : value.gt(0) ? "Infinity" : "-Infinity";
	var { notation, precision, wordSize } = normalizeFormatOptions(options);
	switch (notation) {
		case "fixed": return toFixed(value, precision);
		case "exponential": return toExponential(value, precision);
		case "engineering": return toEngineering(value, precision);
		case "bin": return formatBigNumberToBase(value, 2, wordSize);
		case "oct": return formatBigNumberToBase(value, 8, wordSize);
		case "hex": return formatBigNumberToBase(value, 16, wordSize);
		case "auto":
			var lowerExp = _toNumberOrDefault(options === null || options === void 0 ? void 0 : options.lowerExp, -3);
			var upperExp = _toNumberOrDefault(options === null || options === void 0 ? void 0 : options.upperExp, 5);
			if (value.isZero()) return "0";
			var str;
			var rounded = value.toSignificantDigits(precision);
			var exp = rounded.e;
			if (exp >= lowerExp && exp < upperExp) str = rounded.toFixed();
			else str = toExponential(value, precision);
			return str.replace(/((\.\d*?)(0+))($|e)/, function() {
				var digits = arguments[2];
				var e = arguments[4];
				return digits !== "." ? digits + e : e;
			});
		default: throw new Error("Unknown notation \"" + notation + "\". Choose \"auto\", \"exponential\", \"fixed\", \"bin\", \"oct\", or \"hex.");
	}
}
/**
* Format a BigNumber in engineering notation. Like '1.23e+6', '2.3e+0', '3.500e-3'
* @param {BigNumber} value
* @param {number} [precision]        Optional number of significant figures to return.
*/
function toEngineering(value, precision) {
	var e = value.e;
	var newExp = e % 3 === 0 ? e : e < 0 ? e - 3 - e % 3 : e - e % 3;
	var valueStr = value.mul(Math.pow(10, -newExp)).toPrecision(precision);
	if (valueStr.includes("e")) {
		var BigNumber = value.constructor;
		valueStr = new BigNumber(valueStr).toFixed();
	}
	return valueStr + "e" + (e >= 0 ? "+" : "") + newExp.toString();
}
/**
* Format a number in exponential notation. Like '1.23e+5', '2.3e+0', '3.500e-3'
* @param {BigNumber} value
* @param {number} [precision]  Number of digits in formatted output.
*                              If not provided, the maximum available digits
*                              is used.
* @returns {string} str
*/
function toExponential(value, precision) {
	if (precision !== void 0) return value.toExponential(precision - 1);
	else return value.toExponential();
}
/**
* Format a number with fixed notation.
* @param {BigNumber} value
* @param {number} [precision=undefined] Optional number of decimals after the
*                                       decimal point. Undefined by default.
*/
function toFixed(value, precision) {
	return value.toFixed(precision);
}
function _toNumberOrDefault(value, defaultValue) {
	if (isNumber(value)) return value;
	else if (isBigNumber(value)) return value.toNumber();
	else return defaultValue;
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/string.js
/**
* Format a value of any type into a string.
*
* Usage:
*     math.format(value)
*     math.format(value, precision)
*     math.format(value, options)
*
* When value is a function:
*
* - When the function has a property `syntax`, it returns this
*   syntax description.
* - In other cases, a string `'function'` is returned.
*
* When `value` is an Object:
*
* - When the object contains a property `format` being a function, this
*   function is invoked as `value.format(options)` and the result is returned.
* - When the object has its own `toString` method, this method is invoked
*   and the result is returned.
* - In other cases the function will loop over all object properties and
*   return JSON object notation like '{"a": 2, "b": 3}'.
*
* Example usage:
*     math.format(2/7)                // '0.2857142857142857'
*     math.format(math.pi, 3)         // '3.14'
*     math.format(new Complex(2, 3))  // '2 + 3i'
*     math.format('hello')            // '"hello"'
*
* @param {*} value             Value to be stringified
* @param {Object | number | Function} [options]
*     Formatting options. See src/utils/number.js:format for a
*     description of the available options controlling number output.
*     This generic "format" also supports the option property `truncate: NN`
*     giving the maximum number NN of characters to return (if there would
*     have been more, they are deleted and replaced by an ellipsis).
* @return {string} str
*/
function format(value, options) {
	var result = _format(value, options);
	if (options && typeof options === "object" && "truncate" in options && result.length > options.truncate) return result.substring(0, options.truncate - 3) + "...";
	return result;
}
function _format(value, options) {
	if (typeof value === "number") return format$2(value, options);
	if (isBigNumber(value)) return format$1(value, options);
	if (looksLikeFraction(value)) {
		if (!options || options.fraction !== "decimal") return "".concat(value.s * value.n, "/").concat(value.d);
		else return value.toString();
	}
	if (Array.isArray(value)) return formatArray(value, options);
	if (isString(value)) return stringify(value);
	if (typeof value === "function") return value.syntax ? String(value.syntax) : "function";
	if (value && typeof value === "object") {
		if (typeof value.format === "function") return value.format(options);
		else if (value && value.toString(options) !== {}.toString()) return value.toString(options);
		else return "{" + Object.keys(value).map((key) => {
			return stringify(key) + ": " + format(value[key], options);
		}).join(", ") + "}";
	}
	return String(value);
}
/**
* Stringify a value into a string enclosed in double quotes.
* Unescaped double quotes and backslashes inside the value are escaped.
* @param {*} value
* @return {string}
*/
function stringify(value) {
	var text = String(value);
	var escaped = "";
	var i = 0;
	while (i < text.length) {
		var c = text.charAt(i);
		escaped += c in controlCharacters ? controlCharacters[c] : c;
		i++;
	}
	return "\"" + escaped + "\"";
}
var controlCharacters = {
	"\"": "\\\"",
	"\\": "\\\\",
	"\b": "\\b",
	"\f": "\\f",
	"\n": "\\n",
	"\r": "\\r",
	"	": "\\t"
};
/**
* Escape special HTML characters
* @param {*} value
* @return {string}
*/
function escape(value) {
	var text = String(value);
	text = text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	return text;
}
/**
* Recursively format an n-dimensional matrix
* Example output: "[[1, 2], [3, 4]]"
* @param {Array} array
* @param {Object | number | Function} [options]  Formatting options. See
*                                                lib/utils/number:format for a
*                                                description of the available
*                                                options.
* @returns {string} str
*/
function formatArray(array, options) {
	if (Array.isArray(array)) {
		var str = "[";
		var len = array.length;
		for (var i = 0; i < len; i++) {
			if (i !== 0) str += ", ";
			str += formatArray(array[i], options);
		}
		str += "]";
		return str;
	} else return format(array, options);
}
/**
* Check whether a value looks like a Fraction (unsafe duck-type check)
* @param {*} value
* @return {boolean}
*/
function looksLikeFraction(value) {
	return value && typeof value === "object" && typeof value.s === "bigint" && typeof value.n === "bigint" && typeof value.d === "bigint" || false;
}
var createResolve = /* #__PURE__ */ factory("resolve", [
	"typed",
	"parse",
	"ConstantNode",
	"FunctionNode",
	"OperatorNode",
	"ParenthesisNode"
], (_ref) => {
	var { typed, parse, ConstantNode, FunctionNode, OperatorNode, ParenthesisNode } = _ref;
	/**
	* resolve(expr, scope) replaces variable nodes with their scoped values
	*
	* Syntax:
	*
	*     math.resolve(expr, scope)
	*
	* Examples:
	*
	*     math.resolve('x + y', {x:1, y:2})           // Node '1 + 2'
	*     math.resolve(math.parse('x+y'), {x:1, y:2}) // Node '1 + 2'
	*     math.simplify('x+y', {x:2, y: math.parse('x+x')}).toString() // "6"
	*
	* See also:
	*
	*     simplify, evaluate
	*
	* @param {Node | Node[]} node
	*     The expression tree (or trees) to be simplified
	* @param {Object} scope
	*     Scope specifying variables to be resolved
	* @return {Node | Node[]} Returns `node` with variables recursively substituted.
	* @throws {ReferenceError}
	*     If there is a cyclic dependency among the variables in `scope`,
	*     resolution is impossible and a ReferenceError is thrown.
	*/
	function _resolve(node, scope) {
		var within = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : /* @__PURE__ */ new Set();
		if (!scope) return node;
		if (isSymbolNode(node)) {
			if (within.has(node.name)) {
				var variables = Array.from(within).join(", ");
				throw new ReferenceError("recursive loop of variable definitions among {".concat(variables, "}"));
			}
			var value = scope.get(node.name);
			if (isNode(value)) {
				var nextWithin = new Set(within);
				nextWithin.add(node.name);
				return _resolve(value, scope, nextWithin);
			} else if (typeof value === "number") return parse(String(value));
			else if (value !== void 0) return new ConstantNode(value);
			else return node;
		} else if (isOperatorNode(node)) {
			var args = node.args.map(function(arg) {
				return _resolve(arg, scope, within);
			});
			return new OperatorNode(node.op, node.fn, args, node.implicit);
		} else if (isParenthesisNode(node)) return new ParenthesisNode(_resolve(node.content, scope, within));
		else if (isFunctionNode(node)) {
			var _args = node.args.map(function(arg) {
				return _resolve(arg, scope, within);
			});
			return new FunctionNode(node.name, _args);
		}
		return node.map((child) => _resolve(child, scope, within));
	}
	return typed("resolve", {
		Node: _resolve,
		"Node, Map | null | undefined": _resolve,
		"Node, Object": (n, scope) => _resolve(n, createMap(scope)),
		"Array | Matrix": typed.referToSelf((self) => (A) => A.map((n) => self(n))),
		"Array | Matrix, null | undefined": typed.referToSelf((self) => (A) => A.map((n) => self(n))),
		"Array, Object": typed.referTo("Array,Map", (selfAM) => (A, scope) => selfAM(A, createMap(scope))),
		"Matrix, Object": typed.referTo("Matrix,Map", (selfMM) => (A, scope) => selfMM(A, createMap(scope))),
		"Array | Matrix, Map": typed.referToSelf((self) => (A, scope) => A.map((n) => self(n, scope)))
	});
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/algebra/simplify/wildcards.js
function isNumericNode(x) {
	return isConstantNode(x) || isOperatorNode(x) && x.isUnary() && isConstantNode(x.args[0]);
}
function isConstantExpression(x) {
	if (isConstantNode(x)) return true;
	if ((isFunctionNode(x) || isOperatorNode(x)) && x.args.every(isConstantExpression)) return true;
	if (isParenthesisNode(x) && isConstantExpression(x.content)) return true;
	return false;
}
//#endregion
//#region node_modules/@babel/runtime/helpers/typeof.js
var require_typeof = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function _typeof(o) {
		"@babel/helpers - typeof";
		return module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, module.exports.__esModule = true, module.exports["default"] = module.exports, _typeof(o);
	}
	module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
}));
//#endregion
//#region node_modules/@babel/runtime/helpers/toPrimitive.js
var require_toPrimitive = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var _typeof = require_typeof()["default"];
	function toPrimitive(t, r) {
		if ("object" != _typeof(t) || !t) return t;
		var e = t[Symbol.toPrimitive];
		if (void 0 !== e) {
			var i = e.call(t, r || "default");
			if ("object" != _typeof(i)) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === r ? String : Number)(t);
	}
	module.exports = toPrimitive, module.exports.__esModule = true, module.exports["default"] = module.exports;
}));
//#endregion
//#region node_modules/@babel/runtime/helpers/toPropertyKey.js
var require_toPropertyKey = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var _typeof = require_typeof()["default"];
	var toPrimitive = require_toPrimitive();
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	module.exports = toPropertyKey, module.exports.__esModule = true, module.exports["default"] = module.exports;
}));
//#endregion
//#region node_modules/mathjs/lib/esm/function/algebra/simplify/util.js
var import_defineProperty = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var toPropertyKey = require_toPropertyKey();
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;
})))(), 1);
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
			(0, import_defineProperty.default)(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
var createUtil = /* #__PURE__ */ factory("simplifyUtil", [
	"FunctionNode",
	"OperatorNode",
	"SymbolNode"
], (_ref) => {
	var { FunctionNode, OperatorNode, SymbolNode } = _ref;
	var T = true;
	var F = false;
	var defaultName = "defaultF";
	var defaultContext = {
		add: {
			trivial: T,
			total: T,
			commutative: T,
			associative: T
		},
		unaryPlus: {
			trivial: T,
			total: T,
			commutative: T,
			associative: T
		},
		subtract: {
			trivial: F,
			total: T,
			commutative: F,
			associative: F
		},
		multiply: {
			trivial: T,
			total: T,
			commutative: T,
			associative: T
		},
		divide: {
			trivial: F,
			total: T,
			commutative: F,
			associative: F
		},
		paren: {
			trivial: T,
			total: T,
			commutative: T,
			associative: F
		},
		defaultF: {
			trivial: F,
			total: T,
			commutative: F,
			associative: F
		}
	};
	var realContext = {
		divide: { total: F },
		log: { total: F }
	};
	var positiveContext = {
		subtract: { total: F },
		abs: { trivial: T },
		log: { total: T }
	};
	function hasProperty(nodeOrName, property) {
		var context = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : defaultContext;
		var name = defaultName;
		if (typeof nodeOrName === "string") name = nodeOrName;
		else if (isOperatorNode(nodeOrName)) name = nodeOrName.fn.toString();
		else if (isFunctionNode(nodeOrName)) name = nodeOrName.name;
		else if (isParenthesisNode(nodeOrName)) name = "paren";
		if (hasOwnProperty(context, name)) {
			var properties = context[name];
			if (hasOwnProperty(properties, property)) return properties[property];
			if (hasOwnProperty(defaultContext, name)) return defaultContext[name][property];
		}
		if (hasOwnProperty(context, defaultName)) {
			var _properties = context[defaultName];
			if (hasOwnProperty(_properties, property)) return _properties[property];
			return defaultContext[defaultName][property];
		}
		if (hasOwnProperty(defaultContext, name)) {
			var _properties2 = defaultContext[name];
			if (hasOwnProperty(_properties2, property)) return _properties2[property];
		}
		return defaultContext[defaultName][property];
	}
	function isCommutative(node) {
		return hasProperty(node, "commutative", arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : defaultContext);
	}
	function isAssociative(node) {
		return hasProperty(node, "associative", arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : defaultContext);
	}
	/**
	* Merge the given contexts, with primary overriding secondary
	* wherever they might conflict
	*/
	function mergeContext(primary, secondary) {
		var merged = _objectSpread({}, primary);
		for (var prop in secondary) if (hasOwnProperty(primary, prop)) merged[prop] = _objectSpread(_objectSpread({}, secondary[prop]), primary[prop]);
		else merged[prop] = secondary[prop];
		return merged;
	}
	/**
	* Flatten all associative operators in an expression tree.
	* Assumes parentheses have already been removed.
	*/
	function flatten(node, context) {
		if (!node.args || node.args.length === 0) return node;
		node.args = allChildren(node, context);
		for (var i = 0; i < node.args.length; i++) flatten(node.args[i], context);
	}
	/**
	* Get the children of a node as if it has been flattened.
	* TODO implement for FunctionNodes
	*/
	function allChildren(node, context) {
		var op;
		var children = [];
		var _findChildren = function findChildren(node) {
			for (var i = 0; i < node.args.length; i++) {
				var child = node.args[i];
				if (isOperatorNode(child) && op === child.op) _findChildren(child);
				else children.push(child);
			}
		};
		if (isAssociative(node, context)) {
			op = node.op;
			_findChildren(node);
			return children;
		} else return node.args;
	}
	/**
	*  Unflatten all flattened operators to a right-heavy binary tree.
	*/
	function unflattenr(node, context) {
		if (!node.args || node.args.length === 0) return;
		var makeNode = createMakeNodeFunction(node);
		var l = node.args.length;
		for (var i = 0; i < l; i++) unflattenr(node.args[i], context);
		if (l > 2 && isAssociative(node, context)) {
			var curnode = node.args.pop();
			while (node.args.length > 0) curnode = makeNode([node.args.pop(), curnode]);
			node.args = curnode.args;
		}
	}
	/**
	*  Unflatten all flattened operators to a left-heavy binary tree.
	*/
	function unflattenl(node, context) {
		if (!node.args || node.args.length === 0) return;
		var makeNode = createMakeNodeFunction(node);
		var l = node.args.length;
		for (var i = 0; i < l; i++) unflattenl(node.args[i], context);
		if (l > 2 && isAssociative(node, context)) {
			var curnode = node.args.shift();
			while (node.args.length > 0) curnode = makeNode([curnode, node.args.shift()]);
			node.args = curnode.args;
		}
	}
	function createMakeNodeFunction(node) {
		if (isOperatorNode(node)) return function(args) {
			try {
				return new OperatorNode(node.op, node.fn, args, node.implicit);
			} catch (err) {
				console.error(err);
				return [];
			}
		};
		else return function(args) {
			return new FunctionNode(new SymbolNode(node.name), args);
		};
	}
	return {
		createMakeNodeFunction,
		hasProperty,
		isCommutative,
		isAssociative,
		mergeContext,
		flatten,
		allChildren,
		unflattenr,
		unflattenl,
		defaultContext,
		realContext,
		positiveContext
	};
});
var createSimplify = /* #__PURE__ */ factory("simplify", [
	"typed",
	"parse",
	"equal",
	"resolve",
	"simplifyConstant",
	"simplifyCore",
	"AccessorNode",
	"ArrayNode",
	"ConstantNode",
	"FunctionNode",
	"IndexNode",
	"ObjectNode",
	"OperatorNode",
	"ParenthesisNode",
	"SymbolNode",
	"replacer"
], (_ref) => {
	var { typed, parse, equal, resolve, simplifyConstant, simplifyCore, AccessorNode, ArrayNode, ConstantNode, FunctionNode, IndexNode, ObjectNode, OperatorNode, ParenthesisNode, SymbolNode, replacer } = _ref;
	var { hasProperty, isCommutative, isAssociative, mergeContext, flatten, unflattenr, unflattenl, createMakeNodeFunction, defaultContext, realContext, positiveContext } = createUtil({
		FunctionNode,
		OperatorNode,
		SymbolNode
	});
	/**
	* Simplify an expression tree.
	*
	* A list of rules are applied to an expression, repeating over the list until
	* no further changes are made.
	* It's possible to pass a custom set of rules to the function as second
	* argument. A rule can be specified as an object, string, or function:
	*
	*     const rules = [
	*       { l: 'n1*n3 + n2*n3', r: '(n1+n2)*n3' },
	*       'n1*n3 + n2*n3 -> (n1+n2)*n3',
	*       function (node) {
	*         // ... return a new node or return the node unchanged
	*         return node
	*       }
	*     ]
	*
	* String and object rules consist of a left and right pattern. The left is
	* used to match against the expression and the right determines what matches
	* are replaced with. The main difference between a pattern and a normal
	* expression is that variables starting with the following characters are
	* interpreted as wildcards:
	*
	* - 'n' - Matches any node [Node]
	* - 'c' - Matches a constant literal (5 or 3.2) [ConstantNode]
	* - 'cl' - Matches a constant literal; same as c [ConstantNode]
	* - 'cd' - Matches a decimal literal (5 or -3.2) [ConstantNode or unaryMinus wrapping a ConstantNode]
	* - 'ce' - Matches a constant expression (-5 or √3) [Expressions consisting of only ConstantNodes, functions, and operators]
	* - 'v' - Matches a variable; anything not matched by c (-5 or x) [Node that is not a ConstantNode]
	* - 'vl' - Matches a variable literal (x or y) [SymbolNode]
	* - 'vd' - Matches a non-decimal expression; anything not matched by cd (x or √3) [Node that is not a ConstantNode or unaryMinus that is wrapping a ConstantNode]
	* - 've' - Matches a variable expression; anything not matched by ce (x or 2x) [Expressions that contain a SymbolNode or other non-constant term]
	*
	* The default list of rules is exposed on the function as `simplify.rules`
	* and can be used as a basis to built a set of custom rules. Note that since
	* the `simplifyCore` function is in the default list of rules, by default
	* simplify will convert any function calls in the expression that have
	* operator equivalents to their operator forms.
	*
	* To specify a rule as a string, separate the left and right pattern by '->'
	* When specifying a rule as an object, the following keys are meaningful:
	* - l - the left pattern
	* - r - the right pattern
	* - s - in lieu of l and r, the string form that is broken at -> to give them
	* - repeat - whether to repeat this rule until the expression stabilizes
	* - assuming - gives a context object, as in the 'context' option to
	*     simplify. Every property in the context object must match the current
	*     context in order, or else the rule will not be applied.
	* - imposeContext - gives a context object, as in the 'context' option to
	*     simplify. Any settings specified will override the incoming context
	*     for all matches of this rule.
	*
	* For more details on the theory, see:
	*
	* - [Strategies for simplifying math expressions (Stackoverflow)](https://stackoverflow.com/questions/7540227/strategies-for-simplifying-math-expressions)
	* - [Symbolic computation - Simplification (Wikipedia)](https://en.wikipedia.org/wiki/Symbolic_computation#Simplification)
	*
	*  An optional `options` argument can be passed as last argument of `simplify`.
	*  Currently available options (defaults in parentheses):
	*  - `consoleDebug` (false): whether to write the expression being simplified
	*    and any changes to it, along with the rule responsible, to console
	*  - `context` (simplify.defaultContext): an object giving properties of
	*    each operator, which determine what simplifications are allowed. The
	*    currently meaningful properties are commutative, associative,
	*    total (whether the operation is defined for all arguments), and
	*    trivial (whether the operation applied to a single argument leaves
	*    that argument unchanged). The default context is very permissive and
	*    allows almost all simplifications. Only properties differing from
	*    the default need to be specified; the default context is used as a
	*    fallback. Additional contexts `simplify.realContext` and
	*    `simplify.positiveContext` are supplied to cause simplify to perform
	*    just simplifications guaranteed to preserve all values of the expression
	*    assuming all variables and subexpressions are real numbers or
	*    positive real numbers, respectively. (Note that these are in some cases
	*    more restrictive than the default context; for example, the default
	*    context will allow `x/x` to simplify to 1, whereas
	*    `simplify.realContext` will not, as `0/0` is not equal to 1.)
	*  - `exactFractions` (true): whether to try to convert all constants to
	*    exact rational numbers.
	*  - `fractionsLimit` (10000): when `exactFractions` is true, constants will
	*    be expressed as fractions only when both numerator and denominator
	*    are smaller than `fractionsLimit`.
	*
	* Syntax:
	*
	*     math.simplify(expr)
	*     math.simplify(expr, rules)
	*     math.simplify(expr, rules)
	*     math.simplify(expr, rules, scope)
	*     math.simplify(expr, rules, scope, options)
	*     math.simplify(expr, scope)
	*     math.simplify(expr, scope, options)
	*
	* Examples:
	*
	*     math.simplify('2 * 1 * x ^ (2 - 1)')      // Node "2 * x"
	*     math.simplify('2 * 3 * x', {x: 4})        // Node "24"
	*     const f = math.parse('2 * 1 * x ^ (2 - 1)')
	*     math.simplify(f)                          // Node "2 * x"
	*     math.simplify('0.4 * x', {}, {exactFractions: true})  // Node "x * 2 / 5"
	*     math.simplify('0.4 * x', {}, {exactFractions: false}) // Node "0.4 * x"
	*
	* See also:
	*
	*     simplifyCore, derivative, evaluate, parse, rationalize, resolve
	*
	* @param {Node | string} expr
	*            The expression to be simplified
	* @param {SimplifyRule[]} [rules]
	*            Optional list with custom rules
	* @param {Object} [scope] Optional scope with variables
	* @param {SimplifyOptions} [options] Optional configuration settings
	* @return {Node} Returns the simplified form of `expr`
	*/
	typed.addConversion({
		from: "Object",
		to: "Map",
		convert: createMap
	});
	var simplify = typed("simplify", {
		Node: _simplify,
		"Node, Map": (expr, scope) => _simplify(expr, false, scope),
		"Node, Map, Object": (expr, scope, options) => _simplify(expr, false, scope, options),
		"Node, Array": _simplify,
		"Node, Array, Map": _simplify,
		"Node, Array, Map, Object": _simplify
	});
	typed.removeConversion({
		from: "Object",
		to: "Map",
		convert: createMap
	});
	simplify.defaultContext = defaultContext;
	simplify.realContext = realContext;
	simplify.positiveContext = positiveContext;
	function removeParens(node) {
		return node.transform(function(node) {
			return isParenthesisNode(node) ? removeParens(node.content) : node;
		});
	}
	var SUPPORTED_CONSTANTS = {
		true: true,
		false: true,
		e: true,
		i: true,
		Infinity: true,
		LN2: true,
		LN10: true,
		LOG2E: true,
		LOG10E: true,
		NaN: true,
		phi: true,
		pi: true,
		SQRT1_2: true,
		SQRT2: true,
		tau: true
	};
	simplify.rules = [
		simplifyCore,
		{
			l: "log(e)",
			r: "1"
		},
		{
			s: "n-n1 -> n+-n1",
			assuming: { subtract: { total: true } }
		},
		{
			s: "n-n -> 0",
			assuming: { subtract: { total: false } }
		},
		{
			s: "-(cl*v) -> v * (-cl)",
			assuming: {
				multiply: { commutative: true },
				subtract: { total: true }
			}
		},
		{
			s: "-(cl*v) -> (-cl) * v",
			assuming: {
				multiply: { commutative: false },
				subtract: { total: true }
			}
		},
		{
			s: "-(v*cl) -> v * (-cl)",
			assuming: {
				multiply: { commutative: false },
				subtract: { total: true }
			}
		},
		{
			l: "-(n1/n2)",
			r: "-n1/n2"
		},
		{
			l: "-v",
			r: "v * (-1)"
		},
		{
			l: "(n1 + n2)*(-1)",
			r: "n1*(-1) + n2*(-1)",
			repeat: true
		},
		{
			l: "n/n1^n2",
			r: "n*n1^-n2"
		},
		{
			l: "n/n1",
			r: "n*n1^-1"
		},
		{
			s: "(n1*n2)^n3 -> n1^n3 * n2^n3",
			assuming: { multiply: { commutative: true } }
		},
		{
			s: "(n1*n2)^(-1) -> n2^(-1) * n1^(-1)",
			assuming: { multiply: { commutative: false } }
		},
		{
			s: "(n ^ n1) ^ n2 -> n ^ (n1 * n2)",
			assuming: { divide: { total: true } }
		},
		{
			l: " vd   * ( vd   * n1 + n2)",
			r: "vd^2       * n1 +  vd   * n2"
		},
		{
			s: " vd   * (vd^n4 * n1 + n2)   ->  vd^(1+n4)  * n1 +  vd   * n2",
			assuming: { divide: { total: true } }
		},
		{
			s: "vd^n3 * ( vd   * n1 + n2)   ->  vd^(n3+1)  * n1 + vd^n3 * n2",
			assuming: { divide: { total: true } }
		},
		{
			s: "vd^n3 * (vd^n4 * n1 + n2)   ->  vd^(n3+n4) * n1 + vd^n3 * n2",
			assuming: { divide: { total: true } }
		},
		{
			l: "n*n",
			r: "n^2"
		},
		{
			s: "n * n^n1 -> n^(n1+1)",
			assuming: { divide: { total: true } }
		},
		{
			s: "n^n1 * n^n2 -> n^(n1+n2)",
			assuming: { divide: { total: true } }
		},
		simplifyConstant,
		{
			s: "n+n -> 2*n",
			assuming: { add: { total: true } }
		},
		{
			l: "n+-n",
			r: "0"
		},
		{
			l: "vd*n + vd",
			r: "vd*(n+1)"
		},
		{
			l: "n3*n1 + n3*n2",
			r: "n3*(n1+n2)"
		},
		{
			l: "n3^(-n4)*n1 +   n3  * n2",
			r: "n3^(-n4)*(n1 + n3^(n4+1) *n2)"
		},
		{
			l: "n3^(-n4)*n1 + n3^n5 * n2",
			r: "n3^(-n4)*(n1 + n3^(n4+n5)*n2)"
		},
		{
			s: "n*vd + vd -> (n+1)*vd",
			assuming: { multiply: { commutative: false } }
		},
		{
			s: "vd + n*vd -> (1+n)*vd",
			assuming: { multiply: { commutative: false } }
		},
		{
			s: "n1*n3 + n2*n3 -> (n1+n2)*n3",
			assuming: { multiply: { commutative: false } }
		},
		{
			s: "n^n1 * n -> n^(n1+1)",
			assuming: {
				divide: { total: true },
				multiply: { commutative: false }
			}
		},
		{
			s: "n1*n3^(-n4) + n2 * n3    -> (n1 + n2*n3^(n4 +  1))*n3^(-n4)",
			assuming: { multiply: { commutative: false } }
		},
		{
			s: "n1*n3^(-n4) + n2 * n3^n5 -> (n1 + n2*n3^(n4 + n5))*n3^(-n4)",
			assuming: { multiply: { commutative: false } }
		},
		{
			l: "n*cd + cd",
			r: "(n+1)*cd"
		},
		{
			s: "cd*n + cd -> cd*(n+1)",
			assuming: { multiply: { commutative: false } }
		},
		{
			s: "cd + cd*n -> cd*(1+n)",
			assuming: { multiply: { commutative: false } }
		},
		simplifyConstant,
		{
			s: "(-n)*n1 -> -(n*n1)",
			assuming: { subtract: { total: true } }
		},
		{
			s: "n1*(-n) -> -(n1*n)",
			assuming: {
				subtract: { total: true },
				multiply: { commutative: false }
			}
		},
		{
			s: "ce+ve -> ve+ce",
			assuming: { add: { commutative: true } },
			imposeContext: { add: { commutative: false } }
		},
		{
			s: "vd*cd -> cd*vd",
			assuming: { multiply: { commutative: true } },
			imposeContext: { multiply: { commutative: false } }
		},
		{
			l: "n+-n1",
			r: "n-n1"
		},
		{
			l: "n+-(n1)",
			r: "n-(n1)"
		},
		{
			s: "n*(n1^-1) -> n/n1",
			assuming: { multiply: { commutative: true } }
		},
		{
			s: "n*n1^-n2 -> n/n1^n2",
			assuming: { multiply: { commutative: true } }
		},
		{
			s: "n^-1 -> 1/n",
			assuming: { multiply: { commutative: true } }
		},
		{
			l: "n^1",
			r: "n"
		},
		{
			s: "n*(n1/n2) -> (n*n1)/n2",
			assuming: { multiply: { associative: true } }
		},
		{
			s: "n-(n1+n2) -> n-n1-n2",
			assuming: { addition: {
				associative: true,
				commutative: true
			} }
		},
		{
			l: "1*n",
			r: "n",
			imposeContext: { multiply: { commutative: true } }
		},
		{
			s: "n1/(n2/n3) -> (n1*n3)/n2",
			assuming: { multiply: { associative: true } }
		},
		{
			l: "n1/(-n2)",
			r: "-n1/n2"
		}
	];
	/**
	* Takes any rule object as allowed by the specification in simplify
	* and puts it in a standard form used by applyRule
	*/
	function _canonicalizeRule(ruleObject, context) {
		var newRule = {};
		if (ruleObject.s) {
			var lr = ruleObject.s.split("->");
			if (lr.length === 2) {
				newRule.l = lr[0];
				newRule.r = lr[1];
			} else throw SyntaxError("Could not parse rule: " + ruleObject.s);
		} else {
			newRule.l = ruleObject.l;
			newRule.r = ruleObject.r;
		}
		newRule.l = removeParens(parse(newRule.l));
		newRule.r = removeParens(parse(newRule.r));
		for (var prop of [
			"imposeContext",
			"repeat",
			"assuming"
		]) if (prop in ruleObject) newRule[prop] = ruleObject[prop];
		if (ruleObject.evaluate) newRule.evaluate = parse(ruleObject.evaluate);
		if (isAssociative(newRule.l, context)) {
			var nonCommutative = !isCommutative(newRule.l, context);
			var leftExpandsym;
			if (nonCommutative) leftExpandsym = _getExpandPlaceholderSymbol();
			var makeNode = createMakeNodeFunction(newRule.l);
			var expandsym = _getExpandPlaceholderSymbol();
			newRule.expanded = {};
			newRule.expanded.l = makeNode([newRule.l, expandsym]);
			flatten(newRule.expanded.l, context);
			unflattenr(newRule.expanded.l, context);
			newRule.expanded.r = makeNode([newRule.r, expandsym]);
			if (nonCommutative) {
				newRule.expandedNC1 = {};
				newRule.expandedNC1.l = makeNode([leftExpandsym, newRule.l]);
				newRule.expandedNC1.r = makeNode([leftExpandsym, newRule.r]);
				newRule.expandedNC2 = {};
				newRule.expandedNC2.l = makeNode([leftExpandsym, newRule.expanded.l]);
				newRule.expandedNC2.r = makeNode([leftExpandsym, newRule.expanded.r]);
			}
		}
		return newRule;
	}
	/**
	* Parse the string array of rules into nodes
	*
	* Example syntax for rules:
	*
	* Position constants to the left in a product:
	* { l: 'n1 * c1', r: 'c1 * n1' }
	* n1 is any Node, and c1 is a ConstantNode.
	*
	* Apply difference of squares formula:
	* { l: '(n1 - n2) * (n1 + n2)', r: 'n1^2 - n2^2' }
	* n1, n2 mean any Node.
	*
	* Short hand notation:
	* 'n1 * c1 -> c1 * n1'
	*/
	function _buildRules(rules, context) {
		var ruleSet = [];
		for (var i = 0; i < rules.length; i++) {
			var rule = rules[i];
			var newRule = void 0;
			var ruleType = typeof rule;
			switch (ruleType) {
				case "string": rule = { s: rule };
				case "object":
					newRule = _canonicalizeRule(rule, context);
					break;
				case "function":
					newRule = rule;
					break;
				default: throw TypeError("Unsupported type of rule: " + ruleType);
			}
			ruleSet.push(newRule);
		}
		return ruleSet;
	}
	var _lastsym = 0;
	function _getExpandPlaceholderSymbol() {
		return new SymbolNode("_p" + _lastsym++);
	}
	function _simplify(expr, rules) {
		var scope = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : createEmptyMap();
		var options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
		var debug = options.consoleDebug;
		rules = _buildRules(rules || simplify.rules, options.context);
		var res = resolve(expr, scope);
		res = removeParens(res);
		var visited = {};
		var str = res.toString({ parenthesis: "all" });
		while (!visited[str]) {
			visited[str] = true;
			_lastsym = 0;
			var laststr = str;
			if (debug) console.log("Working on: ", str);
			for (var i = 0; i < rules.length; i++) {
				var rulestr = "";
				if (typeof rules[i] === "function") {
					res = rules[i](res, options);
					if (debug) rulestr = rules[i].name;
				} else {
					flatten(res, options.context);
					res = applyRule(res, rules[i], options.context);
					if (debug) rulestr = "".concat(rules[i].l.toString(), " -> ").concat(rules[i].r.toString());
				}
				if (debug) {
					var newstr = res.toString({ parenthesis: "all" });
					if (newstr !== laststr) {
						console.log("Applying", rulestr, "produced", newstr);
						laststr = newstr;
					}
				}
				unflattenl(res, options.context);
			}
			str = res.toString({ parenthesis: "all" });
		}
		return res;
	}
	function mapRule(nodes, rule, context) {
		var resNodes = nodes;
		if (nodes) for (var i = 0; i < nodes.length; ++i) {
			var newNode = applyRule(nodes[i], rule, context);
			if (newNode !== nodes[i]) {
				if (resNodes === nodes) resNodes = nodes.slice();
				resNodes[i] = newNode;
			}
		}
		return resNodes;
	}
	/**
	* Returns a simplfied form of node, or the original node if no simplification was possible.
	*
	* @param  {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} node
	* @param  {Object | Function} rule
	* @param  {Object} context -- information about assumed properties of operators
	* @return {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} The simplified form of `expr`, or the original node if no simplification was possible.
	*/
	function applyRule(node, rule, context) {
		if (rule.assuming) {
			for (var symbol in rule.assuming) for (var property in rule.assuming[symbol]) if (hasProperty(symbol, property, context) !== rule.assuming[symbol][property]) return node;
		}
		var mergedContext = mergeContext(rule.imposeContext, context);
		var res = node;
		if (res instanceof OperatorNode || res instanceof FunctionNode) {
			var newArgs = mapRule(res.args, rule, context);
			if (newArgs !== res.args) {
				res = res.clone();
				res.args = newArgs;
			}
		} else if (res instanceof ParenthesisNode) {
			if (res.content) {
				var newContent = applyRule(res.content, rule, context);
				if (newContent !== res.content) res = new ParenthesisNode(newContent);
			}
		} else if (res instanceof ArrayNode) {
			var newItems = mapRule(res.items, rule, context);
			if (newItems !== res.items) res = new ArrayNode(newItems);
		} else if (res instanceof AccessorNode) {
			var newObj = res.object;
			if (res.object) newObj = applyRule(res.object, rule, context);
			var newIndex = res.index;
			if (res.index) newIndex = applyRule(res.index, rule, context);
			if (newObj !== res.object || newIndex !== res.index) res = new AccessorNode(newObj, newIndex);
		} else if (res instanceof IndexNode) {
			var newDims = mapRule(res.dimensions, rule, context);
			if (newDims !== res.dimensions) res = new IndexNode(newDims);
		} else if (res instanceof ObjectNode) {
			var changed = false;
			var newProps = {};
			for (var prop in res.properties) {
				newProps[prop] = applyRule(res.properties[prop], rule, context);
				if (newProps[prop] !== res.properties[prop]) changed = true;
			}
			if (changed) res = new ObjectNode(newProps);
		}
		var repl = rule.r;
		var matches = _ruleMatch(rule.l, res, mergedContext)[0];
		if (!matches && rule.expanded) {
			repl = rule.expanded.r;
			matches = _ruleMatch(rule.expanded.l, res, mergedContext)[0];
		}
		if (!matches && rule.expandedNC1) {
			repl = rule.expandedNC1.r;
			matches = _ruleMatch(rule.expandedNC1.l, res, mergedContext)[0];
			if (!matches) {
				repl = rule.expandedNC2.r;
				matches = _ruleMatch(rule.expandedNC2.l, res, mergedContext)[0];
			}
		}
		if (matches) {
			var implicit = res.implicit;
			res = repl.clone();
			if (implicit && "implicit" in repl) res.implicit = true;
			res = res.transform(function(node) {
				if (node.isSymbolNode && hasOwnProperty(matches.placeholders, node.name)) return matches.placeholders[node.name].clone();
				else return node;
			});
		}
		if (rule.repeat && res !== node) res = applyRule(res, rule, context);
		return res;
	}
	/**
	* Get (binary) combinations of a flattened binary node
	* e.g. +(node1, node2, node3) -> [
	*        +(node1,  +(node2, node3)),
	*        +(node2,  +(node1, node3)),
	*        +(node3,  +(node1, node2))]
	*
	*/
	function getSplits(node, context) {
		var res = [];
		var right, rightArgs;
		var makeNode = createMakeNodeFunction(node);
		if (isCommutative(node, context)) for (var i = 0; i < node.args.length; i++) {
			rightArgs = node.args.slice(0);
			rightArgs.splice(i, 1);
			right = rightArgs.length === 1 ? rightArgs[0] : makeNode(rightArgs);
			res.push(makeNode([node.args[i], right]));
		}
		else for (var _i = 1; _i < node.args.length; _i++) {
			var left = node.args[0];
			if (_i > 1) left = makeNode(node.args.slice(0, _i));
			rightArgs = node.args.slice(_i);
			right = rightArgs.length === 1 ? rightArgs[0] : makeNode(rightArgs);
			res.push(makeNode([left, right]));
		}
		return res;
	}
	/**
	* Returns the set union of two match-placeholders or null if there is a conflict.
	*/
	function mergeMatch(match1, match2) {
		var res = { placeholders: {} };
		if (!match1.placeholders && !match2.placeholders) return res;
		else if (!match1.placeholders) return match2;
		else if (!match2.placeholders) return match1;
		for (var key in match1.placeholders) if (hasOwnProperty(match1.placeholders, key)) {
			res.placeholders[key] = match1.placeholders[key];
			if (hasOwnProperty(match2.placeholders, key)) {
				if (!_exactMatch(match1.placeholders[key], match2.placeholders[key])) return null;
			}
		}
		for (var _key in match2.placeholders) if (hasOwnProperty(match2.placeholders, _key)) res.placeholders[_key] = match2.placeholders[_key];
		return res;
	}
	/**
	* Combine two lists of matches by applying mergeMatch to the cartesian product of two lists of matches.
	* Each list represents matches found in one child of a node.
	*/
	function combineChildMatches(list1, list2) {
		var res = [];
		if (list1.length === 0 || list2.length === 0) return res;
		var merged;
		for (var i1 = 0; i1 < list1.length; i1++) for (var i2 = 0; i2 < list2.length; i2++) {
			merged = mergeMatch(list1[i1], list2[i2]);
			if (merged) res.push(merged);
		}
		return res;
	}
	/**
	* Combine multiple lists of matches by applying mergeMatch to the cartesian product of two lists of matches.
	* Each list represents matches found in one child of a node.
	* Returns a list of unique matches.
	*/
	function mergeChildMatches(childMatches) {
		if (childMatches.length === 0) return childMatches;
		var sets = childMatches.reduce(combineChildMatches);
		var uniqueSets = [];
		var unique = {};
		for (var i = 0; i < sets.length; i++) {
			var s = JSON.stringify(sets[i], replacer);
			if (!unique[s]) {
				unique[s] = true;
				uniqueSets.push(sets[i]);
			}
		}
		return uniqueSets;
	}
	/**
	* Determines whether node matches rule.
	*
	* @param {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} rule
	* @param {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} node
	* @param {Object} context -- provides assumed properties of operators
	* @param {Boolean} isSplit -- whether we are in process of splitting an
	*                    n-ary operator node into possible binary combinations.
	*                    Defaults to false.
	* @return {Object} Information about the match, if it exists.
	*/
	function _ruleMatch(rule, node, context, isSplit) {
		var res = [{ placeholders: {} }];
		if (rule instanceof OperatorNode && node instanceof OperatorNode || rule instanceof FunctionNode && node instanceof FunctionNode) {
			if (rule instanceof OperatorNode) {
				if (rule.op !== node.op || rule.fn !== node.fn) return [];
			} else if (rule instanceof FunctionNode) {
				if (rule.name !== node.name) return [];
			}
			if (node.args.length === 1 && rule.args.length === 1 || !isAssociative(node, context) && node.args.length === rule.args.length || isSplit) {
				var childMatches = [];
				for (var i = 0; i < rule.args.length; i++) {
					var childMatch = _ruleMatch(rule.args[i], node.args[i], context);
					if (childMatch.length === 0) break;
					childMatches.push(childMatch);
				}
				if (childMatches.length !== rule.args.length) {
					if (!isCommutative(node, context) || rule.args.length === 1) return [];
					if (rule.args.length > 2) throw new Error("permuting >2 commutative non-associative rule arguments not yet implemented");
					var leftMatch = _ruleMatch(rule.args[0], node.args[1], context);
					if (leftMatch.length === 0) return [];
					var rightMatch = _ruleMatch(rule.args[1], node.args[0], context);
					if (rightMatch.length === 0) return [];
					childMatches = [leftMatch, rightMatch];
				}
				res = mergeChildMatches(childMatches);
			} else if (node.args.length >= 2 && rule.args.length === 2) {
				var splits = getSplits(node, context);
				var splitMatches = [];
				for (var _i2 = 0; _i2 < splits.length; _i2++) {
					var matchSet = _ruleMatch(rule, splits[_i2], context, true);
					splitMatches = splitMatches.concat(matchSet);
				}
				return splitMatches;
			} else if (rule.args.length > 2) throw Error("Unexpected non-binary associative function: " + rule.toString());
			else return [];
		} else if (rule instanceof SymbolNode) {
			if (rule.name.length === 0) throw new Error("Symbol in rule has 0 length...!?");
			if (SUPPORTED_CONSTANTS[rule.name]) {
				if (rule.name !== node.name) return [];
			} else switch (rule.name[1] >= "a" && rule.name[1] <= "z" ? rule.name.substring(0, 2) : rule.name[0]) {
				case "n":
				case "_p":
					res[0].placeholders[rule.name] = node;
					break;
				case "c":
				case "cl":
					if (isConstantNode(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				case "v":
					if (!isConstantNode(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				case "vl":
					if (isSymbolNode(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				case "cd":
					if (isNumericNode(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				case "vd":
					if (!isNumericNode(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				case "ce":
					if (isConstantExpression(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				case "ve":
					if (!isConstantExpression(node)) res[0].placeholders[rule.name] = node;
					else return [];
					break;
				default: throw new Error("Invalid symbol in rule: " + rule.name);
			}
		} else if (rule instanceof ConstantNode) {
			if (!equal(rule.value, node.value)) return [];
		} else return [];
		return res;
	}
	/**
	* Determines whether p and q (and all their children nodes) are identical.
	*
	* @param {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} p
	* @param {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} q
	* @return {Object} Information about the match, if it exists.
	*/
	function _exactMatch(p, q) {
		if (p instanceof ConstantNode && q instanceof ConstantNode) {
			if (!equal(p.value, q.value)) return false;
		} else if (p instanceof SymbolNode && q instanceof SymbolNode) {
			if (p.name !== q.name) return false;
		} else if (p instanceof OperatorNode && q instanceof OperatorNode || p instanceof FunctionNode && q instanceof FunctionNode) {
			if (p instanceof OperatorNode) {
				if (p.op !== q.op || p.fn !== q.fn) return false;
			} else if (p instanceof FunctionNode) {
				if (p.name !== q.name) return false;
			}
			if (p.args.length !== q.args.length) return false;
			for (var i = 0; i < p.args.length; i++) if (!_exactMatch(p.args[i], q.args[i])) return false;
		} else return false;
		return true;
	}
	return simplify;
});
var createSimplifyConstant = /* #__PURE__ */ factory("simplifyConstant", [
	"typed",
	"config",
	"mathWithTransform",
	"matrix",
	"isBounded",
	"?fraction",
	"?bignumber",
	"AccessorNode",
	"ArrayNode",
	"ConstantNode",
	"FunctionNode",
	"IndexNode",
	"ObjectNode",
	"OperatorNode",
	"SymbolNode"
], (_ref) => {
	var { typed, config, mathWithTransform, matrix, isBounded, fraction, bignumber, AccessorNode, ArrayNode, ConstantNode, FunctionNode, IndexNode, ObjectNode, OperatorNode, SymbolNode } = _ref;
	var { isCommutative, isAssociative, allChildren, createMakeNodeFunction } = createUtil({
		FunctionNode,
		OperatorNode,
		SymbolNode
	});
	/**
	* simplifyConstant() takes a mathjs expression (either a Node representing
	* a parse tree or a string which it parses to produce a node), and replaces
	* any subexpression of it consisting entirely of constants with the computed
	* value of that subexpression.
	*
	* Syntax:
	*
	*     math.simplifyConstant(expr)
	*     math.simplifyConstant(expr, options)
	*
	* Examples:
	*
	*     math.simplifyConstant('x + 4*3/6')  // Node "x + 2"
	*     math.simplifyConstant('z cos(0)')   // Node "z 1"
	*     math.simplifyConstant('(5.2 + 1.08)t', {exactFractions: false})  // Node "6.28 t"
	*
	* See also:
	*
	*     simplify, simplifyCore, resolve, derivative
	*
	* @param {Node | string} node
	*     The expression to be simplified
	* @param {Object} options
	*     Simplification options, as per simplify()
	* @return {Node} Returns expression with constant subexpressions evaluated
	*/
	var simplifyConstant = typed("simplifyConstant", {
		Node: (node) => _ensureNode(foldFraction(node, {})),
		"Node, Object": function Node_Object(expr, options) {
			return _ensureNode(foldFraction(expr, options));
		}
	});
	function _removeFractions(thing) {
		if (isFraction(thing)) return thing.valueOf();
		if (thing instanceof Array) return thing.map(_removeFractions);
		if (isMatrix(thing)) return matrix(_removeFractions(thing.valueOf()));
		return thing;
	}
	function _eval(fnname, args, options) {
		try {
			return mathWithTransform[fnname].apply(null, args);
		} catch (ignore) {
			args = args.map(_removeFractions);
			return _toNumber(mathWithTransform[fnname].apply(null, args), options);
		}
	}
	var _toNode = typed({
		Fraction: _fractionToNode,
		number: function number(n) {
			if (n < 0) return unaryMinusNode(new ConstantNode(-n));
			return new ConstantNode(n);
		},
		BigNumber: function BigNumber(n) {
			if (n < 0) return unaryMinusNode(new ConstantNode(-n));
			return new ConstantNode(n);
		},
		bigint: function bigint(n) {
			if (n < 0n) return unaryMinusNode(new ConstantNode(-n));
			return new ConstantNode(n);
		},
		Complex: function Complex(s) {
			throw new Error("Cannot convert Complex number to Node");
		},
		string: function string(s) {
			return new ConstantNode(s);
		},
		Matrix: function Matrix(m) {
			return new ArrayNode(m.valueOf().map((e) => _toNode(e)));
		}
	});
	function _ensureNode(thing) {
		if (isNode(thing)) return thing;
		return _toNode(thing);
	}
	function _exactFraction(n, options) {
		if (options && options.exactFractions !== false && isBounded(n) && fraction) {
			var f = fraction(n);
			var fractionsLimit = options && typeof options.fractionsLimit === "number" ? options.fractionsLimit : Infinity;
			if (f.valueOf() === n && f.n < fractionsLimit && f.d < fractionsLimit) return f;
		}
		return n;
	}
	var _toNumber = typed({
		"string, Object": function string_Object(s, options) {
			var numericType = safeNumberType(s, config);
			if (numericType === "BigNumber") {
				if (bignumber === void 0) noBignumber();
				return bignumber(s);
			} else if (numericType === "bigint") return BigInt(s);
			else if (numericType === "Fraction") {
				if (fraction === void 0) noFraction();
				return fraction(s);
			} else return _exactFraction(parseFloat(s), options);
		},
		"Fraction, Object": function Fraction_Object(s, options) {
			return s;
		},
		"BigNumber, Object": function BigNumber_Object(s, options) {
			return s;
		},
		"number, Object": function number_Object(s, options) {
			return _exactFraction(s, options);
		},
		"bigint, Object": function bigint_Object(s, options) {
			return s;
		},
		"Complex, Object": function Complex_Object(s, options) {
			if (s.im !== 0) return s;
			return _exactFraction(s.re, options);
		},
		"Matrix, Object": function Matrix_Object(s, options) {
			return matrix(_exactFraction(s.valueOf()));
		},
		"Array, Object": function Array_Object(s, options) {
			return s.map(_exactFraction);
		}
	});
	function unaryMinusNode(n) {
		return new OperatorNode("-", "unaryMinus", [n]);
	}
	function _fractionToNode(f) {
		var fromBigInt = (value) => config.number === "BigNumber" && bignumber ? bignumber(value) : Number(value);
		var numeratorValue = f.s * f.n;
		var numeratorNode = numeratorValue < 0n ? new OperatorNode("-", "unaryMinus", [new ConstantNode(-fromBigInt(numeratorValue))]) : new ConstantNode(fromBigInt(numeratorValue));
		return f.d === 1n ? numeratorNode : new OperatorNode("/", "divide", [numeratorNode, new ConstantNode(fromBigInt(f.d))]);
	}
	function _foldAccessor(obj, index, options) {
		if (!isIndexNode(index)) return new AccessorNode(_ensureNode(obj), _ensureNode(index));
		if (isArrayNode(obj) || isMatrix(obj)) {
			var remainingDims = Array.from(index.dimensions);
			while (remainingDims.length > 0) if (isConstantNode(remainingDims[0]) && typeof remainingDims[0].value !== "string") {
				var first = _toNumber(remainingDims.shift().value, options);
				if (isArrayNode(obj)) obj = obj.items[first - 1];
				else {
					obj = obj.valueOf()[first - 1];
					if (obj instanceof Array) obj = matrix(obj);
				}
			} else if (remainingDims.length > 1 && isConstantNode(remainingDims[1]) && typeof remainingDims[1].value !== "string") {
				var second = _toNumber(remainingDims[1].value, options);
				var tryItems = [];
				var fromItems = isArrayNode(obj) ? obj.items : obj.valueOf();
				for (var item of fromItems) if (isArrayNode(item)) tryItems.push(item.items[second - 1]);
				else if (isMatrix(obj)) tryItems.push(item[second - 1]);
				else break;
				if (tryItems.length === fromItems.length) {
					if (isArrayNode(obj)) obj = new ArrayNode(tryItems);
					else obj = matrix(tryItems);
					remainingDims.splice(1, 1);
				} else break;
			} else break;
			if (remainingDims.length === index.dimensions.length) return new AccessorNode(_ensureNode(obj), index);
			if (remainingDims.length > 0) {
				index = new IndexNode(remainingDims);
				return new AccessorNode(_ensureNode(obj), index);
			}
			return obj;
		}
		if (isObjectNode(obj) && index.dimensions.length === 1 && isConstantNode(index.dimensions[0])) {
			var key = index.dimensions[0].value;
			if (key in obj.properties) return obj.properties[key];
			return new ConstantNode();
		}
		return new AccessorNode(_ensureNode(obj), index);
	}
	function foldOp(fn, args, makeNode, options) {
		var first = args.shift();
		var reduction = args.reduce((sofar, next) => {
			if (!isNode(next)) {
				var last = sofar.pop();
				if (isNode(last)) return [last, next];
				try {
					sofar.push(_eval(fn, [last, next], options));
					return sofar;
				} catch (ignoreandcontinue) {
					sofar.push(last);
				}
			}
			sofar.push(_ensureNode(sofar.pop()));
			return [makeNode([sofar.length === 1 ? sofar[0] : makeNode(sofar), _ensureNode(next)])];
		}, [first]);
		if (reduction.length === 1) return reduction[0];
		return makeNode([reduction[0], _toNode(reduction[1])]);
	}
	function foldFraction(node, options) {
		switch (node.type) {
			case "SymbolNode": return node;
			case "ConstantNode":
				switch (typeof node.value) {
					case "number": return _toNumber(node.value, options);
					case "bigint": return _toNumber(node.value, options);
					case "string": return node.value;
					default: if (!isNaN(node.value)) return _toNumber(node.value, options);
				}
				return node;
			case "FunctionNode":
				if (mathWithTransform[node.name] && mathWithTransform[node.name].rawArgs) return node;
				if (!["add", "multiply"].includes(node.name)) {
					var args = node.args.map((arg) => foldFraction(arg, options));
					if (!args.some(isNode)) try {
						return _eval(node.name, args, options);
					} catch (ignoreandcontinue) {}
					if (node.name === "size" && args.length === 1 && isArrayNode(args[0])) {
						var sz = [];
						var section = args[0];
						while (isArrayNode(section)) {
							sz.push(section.items.length);
							section = section.items[0];
						}
						return matrix(sz);
					}
					return new FunctionNode(node.name, args.map(_ensureNode));
				}
			case "OperatorNode":
				var fn = node.fn.toString();
				var _args;
				var res;
				var makeNode = createMakeNodeFunction(node);
				if (isOperatorNode(node) && node.isUnary()) {
					_args = [foldFraction(node.args[0], options)];
					if (!isNode(_args[0])) res = _eval(fn, _args, options);
					else res = makeNode(_args);
				} else if (isAssociative(node, options.context)) {
					_args = allChildren(node, options.context);
					_args = _args.map((arg) => foldFraction(arg, options));
					if (isCommutative(fn, options.context)) {
						var consts = [];
						var vars = [];
						for (var i = 0; i < _args.length; i++) if (!isNode(_args[i])) consts.push(_args[i]);
						else vars.push(_args[i]);
						if (consts.length > 1) {
							res = foldOp(fn, consts, makeNode, options);
							vars.unshift(res);
							res = foldOp(fn, vars, makeNode, options);
						} else res = foldOp(fn, _args, makeNode, options);
					} else res = foldOp(fn, _args, makeNode, options);
				} else {
					_args = node.args.map((arg) => foldFraction(arg, options));
					res = foldOp(fn, _args, makeNode, options);
				}
				return res;
			case "ParenthesisNode": return foldFraction(node.content, options);
			case "AccessorNode": return _foldAccessor(foldFraction(node.object, options), foldFraction(node.index, options), options);
			case "ArrayNode":
				var foldItems = node.items.map((item) => foldFraction(item, options));
				if (foldItems.some(isNode)) return new ArrayNode(foldItems.map(_ensureNode));
				return matrix(foldItems);
			case "IndexNode": return new IndexNode(node.dimensions.map((n) => simplifyConstant(n, options)));
			case "ObjectNode":
				var foldProps = {};
				for (var prop in node.properties) foldProps[prop] = simplifyConstant(node.properties[prop], options);
				return new ObjectNode(foldProps);
			default: throw new Error("Unimplemented node type in simplifyConstant: ".concat(node.type));
		}
	}
	return simplifyConstant;
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/operators.js
var properties = [
	{
		AssignmentNode: {},
		FunctionAssignmentNode: {}
	},
	{ ConditionalNode: {
		latexLeftParens: false,
		latexRightParens: false,
		latexParens: false
	} },
	{ "OperatorNode:or": {
		op: "or",
		associativity: "left",
		associativeWith: []
	} },
	{ "OperatorNode:xor": {
		op: "xor",
		associativity: "left",
		associativeWith: []
	} },
	{ "OperatorNode:and": {
		op: "and",
		associativity: "left",
		associativeWith: []
	} },
	{ "OperatorNode:bitOr": {
		op: "|",
		associativity: "left",
		associativeWith: []
	} },
	{ "OperatorNode:bitXor": {
		op: "^|",
		associativity: "left",
		associativeWith: []
	} },
	{ "OperatorNode:bitAnd": {
		op: "&",
		associativity: "left",
		associativeWith: []
	} },
	{
		"OperatorNode:equal": {
			op: "==",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:unequal": {
			op: "!=",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:smaller": {
			op: "<",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:larger": {
			op: ">",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:smallerEq": {
			op: "<=",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:largerEq": {
			op: ">=",
			associativity: "left",
			associativeWith: []
		},
		RelationalNode: {
			associativity: "left",
			associativeWith: []
		}
	},
	{
		"OperatorNode:leftShift": {
			op: "<<",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:rightArithShift": {
			op: ">>",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:rightLogShift": {
			op: ">>>",
			associativity: "left",
			associativeWith: []
		}
	},
	{ "OperatorNode:to": {
		op: "to",
		associativity: "left",
		associativeWith: []
	} },
	{ RangeNode: {} },
	{
		"OperatorNode:add": {
			op: "+",
			associativity: "left",
			associativeWith: ["OperatorNode:add", "OperatorNode:subtract"]
		},
		"OperatorNode:subtract": {
			op: "-",
			associativity: "left",
			associativeWith: []
		}
	},
	{
		"OperatorNode:multiply": {
			op: "*",
			associativity: "left",
			associativeWith: [
				"OperatorNode:multiply",
				"OperatorNode:divide",
				"Operator:dotMultiply",
				"Operator:dotDivide"
			]
		},
		"OperatorNode:divide": {
			op: "/",
			associativity: "left",
			associativeWith: [],
			latexLeftParens: false,
			latexRightParens: false,
			latexParens: false
		},
		"OperatorNode:dotMultiply": {
			op: ".*",
			associativity: "left",
			associativeWith: [
				"OperatorNode:multiply",
				"OperatorNode:divide",
				"OperatorNode:dotMultiply",
				"OperatorNode:doDivide"
			]
		},
		"OperatorNode:dotDivide": {
			op: "./",
			associativity: "left",
			associativeWith: []
		},
		"OperatorNode:mod": {
			op: "mod",
			associativity: "left",
			associativeWith: []
		}
	},
	{ "OperatorNode:multiply": {
		associativity: "left",
		associativeWith: [
			"OperatorNode:multiply",
			"OperatorNode:divide",
			"Operator:dotMultiply",
			"Operator:dotDivide"
		]
	} },
	{
		"OperatorNode:unaryPlus": {
			op: "+",
			associativity: "right"
		},
		"OperatorNode:unaryMinus": {
			op: "-",
			associativity: "right"
		},
		"OperatorNode:bitNot": {
			op: "~",
			associativity: "right"
		},
		"OperatorNode:not": {
			op: "not",
			associativity: "right"
		}
	},
	{
		"OperatorNode:pow": {
			op: "^",
			associativity: "right",
			associativeWith: [],
			latexRightParens: false
		},
		"OperatorNode:dotPow": {
			op: ".^",
			associativity: "right",
			associativeWith: []
		}
	},
	{ "OperatorNode:nullish": {
		op: "??",
		associativity: "left",
		associativeWith: []
	} },
	{ "OperatorNode:factorial": {
		op: "!",
		associativity: "left"
	} },
	{ "OperatorNode:ctranspose": {
		op: "'",
		associativity: "left"
	} }
];
/**
* Returns the first non-parenthesis internal node, but only
* when the 'parenthesis' option is unset or auto.
* @param {Node} _node
* @param {string} parenthesis
* @return {Node}
*/
function unwrapParen(_node, parenthesis) {
	if (!parenthesis || parenthesis !== "auto") return _node;
	var node = _node;
	while (isParenthesisNode(node)) node = node.content;
	return node;
}
/**
* Get the precedence of a Node.
* Higher number for higher precedence, starting with 0.
* Returns null if the precedence is undefined.
*
* @param {Node} _node
* @param {string} parenthesis
* @param {string} implicit
* @param {Node} parent (for determining context for implicit multiplication)
* @return {number | null}
*/
function getPrecedence(_node, parenthesis, implicit, parent) {
	var node = _node;
	if (parenthesis !== "keep") node = _node.getContent();
	var identifier = node.getIdentifier();
	var precedence = null;
	for (var i = 0; i < properties.length; i++) if (identifier in properties[i]) {
		precedence = i;
		break;
	}
	if (identifier === "OperatorNode:multiply" && node.implicit && implicit !== "show") {
		var leftArg = unwrapParen(node.args[0], parenthesis);
		if (!(isConstantNode(leftArg) && parent && parent.getIdentifier() === "OperatorNode:divide" && rule2Node(unwrapParen(parent.args[0], parenthesis))) && !(leftArg.getIdentifier() === "OperatorNode:divide" && rule2Node(unwrapParen(leftArg.args[0], parenthesis)) && isConstantNode(unwrapParen(leftArg.args[1])))) precedence += 1;
	}
	return precedence;
}
/**
* Get the associativity of an operator (left or right).
* Returns a string containing 'left' or 'right' or null if
* the associativity is not defined.
*
* @param {Node} _node
* @param {string} parenthesis
* @return {string|null}
* @throws {Error}
*/
function getAssociativity(_node, parenthesis) {
	var node = _node;
	if (parenthesis !== "keep") node = _node.getContent();
	var identifier = node.getIdentifier();
	var index = getPrecedence(node, parenthesis);
	if (index === null) return null;
	var property = properties[index][identifier];
	if (hasOwnProperty(property, "associativity")) {
		if (property.associativity === "left") return "left";
		if (property.associativity === "right") return "right";
		throw Error("'" + identifier + "' has the invalid associativity '" + property.associativity + "'.");
	}
	return null;
}
/**
* Check if an operator is associative with another operator.
* Returns either true or false or null if not defined.
*
* @param {Node} nodeA
* @param {Node} nodeB
* @param {string} parenthesis
* @return {boolean | null}
*/
function isAssociativeWith(nodeA, nodeB, parenthesis) {
	var a = parenthesis !== "keep" ? nodeA.getContent() : nodeA;
	var b = parenthesis !== "keep" ? nodeA.getContent() : nodeB;
	var identifierA = a.getIdentifier();
	var identifierB = b.getIdentifier();
	var index = getPrecedence(a, parenthesis);
	if (index === null) return null;
	var property = properties[index][identifierA];
	if (hasOwnProperty(property, "associativeWith") && property.associativeWith instanceof Array) {
		for (var i = 0; i < property.associativeWith.length; i++) if (property.associativeWith[i] === identifierB) return true;
		return false;
	}
	return null;
}
/**
* Get the operator associated with a function name.
* Returns a string with the operator symbol, or null if the
* input is not the name of a function associated with an
* operator.
*
* @param {string} Function name
* @return {string | null} Associated operator symbol, if any
*/
function getOperator(fn) {
	var identifier = "OperatorNode:" + fn;
	for (var group of properties) if (identifier in group) return group[identifier].op;
	return null;
}
//#endregion
//#region node_modules/mathjs/lib/esm/function/algebra/simplifyCore.js
var name$26 = "simplifyCore";
var createSimplifyCore = /* #__PURE__ */ factory(name$26, [
	"typed",
	"parse",
	"equal",
	"isZero",
	"add",
	"subtract",
	"multiply",
	"divide",
	"pow",
	"AccessorNode",
	"ArrayNode",
	"ConstantNode",
	"FunctionNode",
	"IndexNode",
	"ObjectNode",
	"OperatorNode",
	"ParenthesisNode",
	"SymbolNode"
], (_ref) => {
	var { typed, parse, equal, isZero, add, subtract, multiply, divide, pow, AccessorNode, ArrayNode, ConstantNode, FunctionNode, IndexNode, ObjectNode, OperatorNode, ParenthesisNode, SymbolNode } = _ref;
	var node0 = new ConstantNode(0);
	var node1 = new ConstantNode(1);
	var nodeT = new ConstantNode(true);
	var nodeF = new ConstantNode(false);
	function isAlwaysBoolean(node) {
		return isOperatorNode(node) && [
			"and",
			"not",
			"or"
		].includes(node.op);
	}
	var { hasProperty, isCommutative } = createUtil({
		FunctionNode,
		OperatorNode,
		SymbolNode
	});
	/**
	* simplifyCore() performs single pass simplification suitable for
	* applications requiring ultimate performance. To roughly summarize,
	* it handles cases along the lines of simplifyConstant() but where
	* knowledge of a single argument is sufficient to determine the value.
	* In contrast, simplify() extends simplifyCore() with additional passes
	* to provide deeper simplification (such as gathering like terms).
	*
	* Specifically, simplifyCore:
	*
	* * Converts all function calls with operator equivalents to their
	*   operator forms.
	* * Removes operators or function calls that are guaranteed to have no
	*   effect (such as unary '+').
	* * Removes double unary '-', '~', and 'not'
	* * Eliminates addition/subtraction of 0 and multiplication/division/powers
	*   by 1 or 0.
	* * Converts addition of a negation into subtraction.
	* * Eliminates logical operations with constant true or false leading
	*   arguments.
	* * Puts constants on the left of a product, if multiplication is
	*   considered commutative by the options (which is the default)
	*
	* Syntax:
	*
	*     math.simplifyCore(expr)
	*     math.simplifyCore(expr, options)
	*
	* Examples:
	*
	*     const f = math.parse('2 * 1 * x ^ (1 - 0)')
	*     math.simplifyCore(f)                          // Node "2 * x"
	*     math.simplify('2 * 1 * x ^ (1 - 0)', [math.simplifyCore]) // Node "2 * x"
	*
	* See also:
	*
	*     simplify, simplifyConstant, resolve, derivative
	*
	* @param {Node | string} node
	*     The expression to be simplified
	* @param {Object} options
	*     Simplification options, as per simplify()
	* @return {Node} Returns expression with basic simplifications applied
	*/
	function _simplifyCore(nodeToSimplify) {
		var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		var context = options ? options.context : void 0;
		if (hasProperty(nodeToSimplify, "trivial", context)) {
			if (isFunctionNode(nodeToSimplify) && nodeToSimplify.args.length === 1) return _simplifyCore(nodeToSimplify.args[0], options);
			var simpChild = false;
			var childCount = 0;
			nodeToSimplify.forEach((c) => {
				++childCount;
				if (childCount === 1) simpChild = _simplifyCore(c, options);
			});
			if (childCount === 1) return simpChild;
		}
		var node = nodeToSimplify;
		if (isFunctionNode(node)) {
			var op = getOperator(node.name);
			if (op) {
				if (node.args.length > 2 && hasProperty(node, "associative", context)) while (node.args.length > 2) {
					var last = node.args.pop();
					var seclast = node.args.pop();
					node.args.push(new OperatorNode(op, node.name, [last, seclast]));
				}
				node = new OperatorNode(op, node.name, node.args);
			} else return new FunctionNode(_simplifyCore(node.fn), node.args.map((n) => _simplifyCore(n, options)));
		}
		if (isOperatorNode(node) && node.isUnary()) {
			var a0 = _simplifyCore(node.args[0], options);
			if (node.op === "~") {
				if (isOperatorNode(a0) && a0.isUnary() && a0.op === "~") return a0.args[0];
			}
			if (node.op === "not") {
				if (isOperatorNode(a0) && a0.isUnary() && a0.op === "not") {
					if (isAlwaysBoolean(a0.args[0])) return a0.args[0];
				}
			}
			var finish = true;
			if (node.op === "-") {
				if (isOperatorNode(a0)) {
					if (a0.isBinary() && a0.fn === "subtract") {
						node = new OperatorNode("-", "subtract", [a0.args[1], a0.args[0]]);
						finish = false;
					}
					if (a0.isUnary() && a0.op === "-") return a0.args[0];
				}
			}
			if (finish) return new OperatorNode(node.op, node.fn, [a0]);
		}
		if (isOperatorNode(node) && node.isBinary()) {
			var _a = _simplifyCore(node.args[0], options);
			var a1 = _simplifyCore(node.args[1], options);
			if (node.op === "+") {
				if (isConstantNode(_a) && isZero(_a.value)) return a1;
				if (isConstantNode(a1) && isZero(a1.value)) return _a;
				if (isOperatorNode(a1) && a1.isUnary() && a1.op === "-") {
					a1 = a1.args[0];
					node = new OperatorNode("-", "subtract", [_a, a1]);
				}
			}
			if (node.op === "-") {
				if (isOperatorNode(a1) && a1.isUnary() && a1.op === "-") return _simplifyCore(new OperatorNode("+", "add", [_a, a1.args[0]]), options);
				if (isConstantNode(_a) && isZero(_a.value)) return _simplifyCore(new OperatorNode("-", "unaryMinus", [a1]));
				if (isConstantNode(a1) && isZero(a1.value)) return _a;
				return new OperatorNode(node.op, node.fn, [_a, a1]);
			}
			if (node.op === "*") {
				if (isConstantNode(_a)) {
					if (isZero(_a.value)) return node0;
					else if (equal(_a.value, 1)) return a1;
				}
				if (isConstantNode(a1)) {
					if (isZero(a1.value)) return node0;
					else if (equal(a1.value, 1)) return _a;
					if (isCommutative(node, context)) return new OperatorNode(node.op, node.fn, [a1, _a], node.implicit);
				}
				return new OperatorNode(node.op, node.fn, [_a, a1], node.implicit);
			}
			if (node.op === "/") {
				if (isConstantNode(_a) && isZero(_a.value)) return node0;
				if (isConstantNode(a1) && equal(a1.value, 1)) return _a;
				return new OperatorNode(node.op, node.fn, [_a, a1]);
			}
			if (node.op === "^") {
				if (isConstantNode(a1)) {
					if (isZero(a1.value)) return node1;
					else if (equal(a1.value, 1)) return _a;
				}
			}
			if (node.op === "and") {
				if (isConstantNode(_a)) {
					if (_a.value) {
						if (isAlwaysBoolean(a1)) return a1;
						if (isConstantNode(a1)) return a1.value ? nodeT : nodeF;
					} else return nodeF;
				}
				if (isConstantNode(a1)) {
					if (a1.value) {
						if (isAlwaysBoolean(_a)) return _a;
					} else return nodeF;
				}
			}
			if (node.op === "or") {
				if (isConstantNode(_a)) {
					if (_a.value) return nodeT;
					else if (isAlwaysBoolean(a1)) return a1;
				}
				if (isConstantNode(a1)) {
					if (a1.value) return nodeT;
					else if (isAlwaysBoolean(_a)) return _a;
				}
			}
			return new OperatorNode(node.op, node.fn, [_a, a1]);
		}
		if (isOperatorNode(node)) return new OperatorNode(node.op, node.fn, node.args.map((a) => _simplifyCore(a, options)));
		if (isArrayNode(node)) return new ArrayNode(node.items.map((n) => _simplifyCore(n, options)));
		if (isAccessorNode(node)) return new AccessorNode(_simplifyCore(node.object, options), _simplifyCore(node.index, options));
		if (isIndexNode(node)) return new IndexNode(node.dimensions.map((n) => _simplifyCore(n, options)));
		if (isObjectNode(node)) {
			var newProps = {};
			for (var prop in node.properties) newProps[prop] = _simplifyCore(node.properties[prop], options);
			return new ObjectNode(newProps);
		}
		return node;
	}
	return typed(name$26, {
		Node: _simplifyCore,
		"Node,Object": _simplifyCore
	});
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/algebra/derivative.js
var name$25 = "derivative";
var createDerivative = /* #__PURE__ */ factory(name$25, [
	"typed",
	"config",
	"parse",
	"simplify",
	"equal",
	"isZero",
	"numeric",
	"ConstantNode",
	"FunctionNode",
	"OperatorNode",
	"ParenthesisNode",
	"SymbolNode"
], (_ref) => {
	var { typed, config, parse, simplify, equal, isZero, numeric, ConstantNode, FunctionNode, OperatorNode, ParenthesisNode, SymbolNode } = _ref;
	/**
	* Takes the derivative of an expression expressed in parser Nodes.
	* The derivative will be taken over the supplied variable in the
	* second parameter. If there are multiple variables in the expression,
	* it will return a partial derivative.
	*
	* This uses rules of differentiation which can be found here:
	*
	* - [Differentiation rules (Wikipedia)](https://en.wikipedia.org/wiki/Differentiation_rules)
	*
	* Syntax:
	*
	*     math.derivative(expr, variable)
	*     math.derivative(expr, variable, options)
	*
	* Examples:
	*
	*     math.derivative('x^2', 'x')                     // Node '2 * x'
	*     math.derivative('x^2', 'x', {simplify: false})  // Node '2 * 1 * x ^ (2 - 1)'
	*     math.derivative('sin(2x)', 'x'))                // Node '2 * cos(2 * x)'
	*     math.derivative('2*x', 'x').evaluate()          // number 2
	*     math.derivative('x^2', 'x').evaluate({x: 4})    // number 8
	*     const f = math.parse('x^2')
	*     const x = math.parse('x')
	*     math.derivative(f, x)                           // Node {2 * x}
	*
	* See also:
	*
	*     simplify, parse, evaluate
	*
	* @param  {Node | string} expr           The expression to differentiate
	* @param  {SymbolNode | string} variable The variable over which to differentiate
	* @param  {{simplify: boolean}} [options]
	*                         There is one option available, `simplify`, which
	*                         is true by default. When false, output will not
	*                         be simplified.
	* @return {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode}    The derivative of `expr`
	*/
	function plainDerivative(expr, variable) {
		var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : { simplify: true };
		var cache = /* @__PURE__ */ new Map();
		var variableName = variable.name;
		function isConstCached(node) {
			var cached = cache.get(node);
			if (cached !== void 0) return cached;
			var res = _isConst(isConstCached, node, variableName);
			cache.set(node, res);
			return res;
		}
		var res = _derivative(expr, isConstCached);
		return options.simplify ? simplify(res) : res;
	}
	function parseIdentifier(string) {
		var symbol = parse(string);
		if (!symbol.isSymbolNode) throw new TypeError("Invalid variable. " + "Cannot parse ".concat(JSON.stringify(string), " into a variable in function derivative"));
		return symbol;
	}
	var derivative = typed(name$25, {
		"Node, SymbolNode": plainDerivative,
		"Node, SymbolNode, Object": plainDerivative,
		"Node, string": (node, symbol) => plainDerivative(node, parseIdentifier(symbol)),
		"Node, string, Object": (node, symbol, options) => plainDerivative(node, parseIdentifier(symbol), options)
	});
	derivative._simplify = true;
	derivative.toTex = function(deriv) {
		return _derivTex.apply(null, deriv.args);
	};
	var _derivTex = typed("_derivTex", {
		"Node, SymbolNode": function Node_SymbolNode(expr, x) {
			if (isConstantNode(expr) && typeOf(expr.value) === "string") return _derivTex(parse(expr.value).toString(), x.toString(), 1);
			else return _derivTex(expr.toTex(), x.toString(), 1);
		},
		"Node, ConstantNode": function Node_ConstantNode(expr, x) {
			if (typeOf(x.value) === "string") return _derivTex(expr, parse(x.value));
			else throw new Error("The second parameter to 'derivative' is a non-string constant");
		},
		"Node, SymbolNode, ConstantNode": function Node_SymbolNode_ConstantNode(expr, x, order) {
			return _derivTex(expr.toString(), x.name, order.value);
		},
		"string, string, number": function string_string_number(expr, x, order) {
			var d;
			if (order === 1) d = "{d\\over d" + x + "}";
			else d = "{d^{" + order + "}\\over d" + x + "^{" + order + "}}";
			return d + "\\left[".concat(expr, "\\right]");
		}
	});
	/**
	* Checks if a node is constants (e.g. 2 + 2).
	* Accepts (usually memoized) version of self as the first parameter for recursive calls.
	* Classification is done as follows:
	*
	*   1. ConstantNodes are constants.
	*   2. If there exists a SymbolNode, of which we are differentiating over,
	*      in the subtree it is not constant.
	*
	* @param  {function} isConst  Function that tells whether sub-expression is a constant
	* @param  {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} node
	* @param  {string} varName     Variable that we are differentiating
	* @return {boolean}  if node is constant
	*/
	var _isConst = typed("_isConst", {
		"function, ConstantNode, string": function function_ConstantNode_string() {
			return true;
		},
		"function, SymbolNode, string": function function_SymbolNode_string(isConst, node, varName) {
			return node.name !== varName;
		},
		"function, ParenthesisNode, string": function function_ParenthesisNode_string(isConst, node, varName) {
			return isConst(node.content, varName);
		},
		"function, FunctionAssignmentNode, string": function function_FunctionAssignmentNode_string(isConst, node, varName) {
			if (!node.params.includes(varName)) return true;
			return isConst(node.expr, varName);
		},
		"function, FunctionNode | OperatorNode, string": function function_FunctionNode__OperatorNode_string(isConst, node, varName) {
			return node.args.every((arg) => isConst(arg, varName));
		}
	});
	/**
	* Applies differentiation rules.
	*
	* @param  {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode} node
	* @param  {function} isConst  Function that tells if a node is constant
	* @return {ConstantNode | SymbolNode | ParenthesisNode | FunctionNode | OperatorNode}    The derivative of `expr`
	*/
	var _derivative = typed("_derivative", {
		"ConstantNode, function": function ConstantNode_function() {
			return createConstantNode(0);
		},
		"SymbolNode, function": function SymbolNode_function(node, isConst) {
			if (isConst(node)) return createConstantNode(0);
			return createConstantNode(1);
		},
		"ParenthesisNode, function": function ParenthesisNode_function(node, isConst) {
			return new ParenthesisNode(_derivative(node.content, isConst));
		},
		"FunctionAssignmentNode, function": function FunctionAssignmentNode_function(node, isConst) {
			if (isConst(node)) return createConstantNode(0);
			return _derivative(node.expr, isConst);
		},
		"FunctionNode, function": function FunctionNode_function(node, isConst) {
			if (isConst(node)) return createConstantNode(0);
			var arg0 = node.args[0];
			var arg1;
			var div = false;
			var negative = false;
			var funcDerivative;
			switch (node.name) {
				case "cbrt":
					div = true;
					funcDerivative = new OperatorNode("*", "multiply", [createConstantNode(3), new OperatorNode("^", "pow", [arg0, new OperatorNode("/", "divide", [createConstantNode(2), createConstantNode(3)])])]);
					break;
				case "sqrt":
				case "nthRoot":
					if (node.args.length === 1) {
						div = true;
						funcDerivative = new OperatorNode("*", "multiply", [createConstantNode(2), new FunctionNode("sqrt", [arg0])]);
					} else if (node.args.length === 2) {
						arg1 = new OperatorNode("/", "divide", [createConstantNode(1), node.args[1]]);
						return _derivative(new OperatorNode("^", "pow", [arg0, arg1]), isConst);
					}
					break;
				case "log10": arg1 = createConstantNode(10);
				case "log":
					if (!arg1 && node.args.length === 1) {
						funcDerivative = arg0.clone();
						div = true;
					} else if (node.args.length === 1 && arg1 || node.args.length === 2 && isConst(node.args[1])) {
						funcDerivative = new OperatorNode("*", "multiply", [arg0.clone(), new FunctionNode("log", [arg1 || node.args[1]])]);
						div = true;
					} else if (node.args.length === 2) return _derivative(new OperatorNode("/", "divide", [new FunctionNode("log", [arg0]), new FunctionNode("log", [node.args[1]])]), isConst);
					break;
				case "pow":
					if (node.args.length === 2) return _derivative(new OperatorNode("^", "pow", [arg0, node.args[1]]), isConst);
					break;
				case "exp":
					funcDerivative = new FunctionNode("exp", [arg0.clone()]);
					break;
				case "sin":
					funcDerivative = new FunctionNode("cos", [arg0.clone()]);
					break;
				case "cos":
					funcDerivative = new OperatorNode("-", "unaryMinus", [new FunctionNode("sin", [arg0.clone()])]);
					break;
				case "tan":
					funcDerivative = new OperatorNode("^", "pow", [new FunctionNode("sec", [arg0.clone()]), createConstantNode(2)]);
					break;
				case "sec":
					funcDerivative = new OperatorNode("*", "multiply", [node, new FunctionNode("tan", [arg0.clone()])]);
					break;
				case "csc":
					negative = true;
					funcDerivative = new OperatorNode("*", "multiply", [node, new FunctionNode("cot", [arg0.clone()])]);
					break;
				case "cot":
					negative = true;
					funcDerivative = new OperatorNode("^", "pow", [new FunctionNode("csc", [arg0.clone()]), createConstantNode(2)]);
					break;
				case "asin":
					div = true;
					funcDerivative = new FunctionNode("sqrt", [new OperatorNode("-", "subtract", [createConstantNode(1), new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)])])]);
					break;
				case "acos":
					div = true;
					negative = true;
					funcDerivative = new FunctionNode("sqrt", [new OperatorNode("-", "subtract", [createConstantNode(1), new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)])])]);
					break;
				case "atan":
					div = true;
					funcDerivative = new OperatorNode("+", "add", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)]);
					break;
				case "asec":
					div = true;
					funcDerivative = new OperatorNode("*", "multiply", [new FunctionNode("abs", [arg0.clone()]), new FunctionNode("sqrt", [new OperatorNode("-", "subtract", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)])])]);
					break;
				case "acsc":
					div = true;
					negative = true;
					funcDerivative = new OperatorNode("*", "multiply", [new FunctionNode("abs", [arg0.clone()]), new FunctionNode("sqrt", [new OperatorNode("-", "subtract", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)])])]);
					break;
				case "acot":
					div = true;
					negative = true;
					funcDerivative = new OperatorNode("+", "add", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)]);
					break;
				case "sinh":
					funcDerivative = new FunctionNode("cosh", [arg0.clone()]);
					break;
				case "cosh":
					funcDerivative = new FunctionNode("sinh", [arg0.clone()]);
					break;
				case "tanh":
					funcDerivative = new OperatorNode("^", "pow", [new FunctionNode("sech", [arg0.clone()]), createConstantNode(2)]);
					break;
				case "sech":
					negative = true;
					funcDerivative = new OperatorNode("*", "multiply", [node, new FunctionNode("tanh", [arg0.clone()])]);
					break;
				case "csch":
					negative = true;
					funcDerivative = new OperatorNode("*", "multiply", [node, new FunctionNode("coth", [arg0.clone()])]);
					break;
				case "coth":
					negative = true;
					funcDerivative = new OperatorNode("^", "pow", [new FunctionNode("csch", [arg0.clone()]), createConstantNode(2)]);
					break;
				case "asinh":
					div = true;
					funcDerivative = new FunctionNode("sqrt", [new OperatorNode("+", "add", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)])]);
					break;
				case "acosh":
					div = true;
					funcDerivative = new FunctionNode("sqrt", [new OperatorNode("-", "subtract", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)])]);
					break;
				case "atanh":
					div = true;
					funcDerivative = new OperatorNode("-", "subtract", [createConstantNode(1), new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)])]);
					break;
				case "asech":
					div = true;
					negative = true;
					funcDerivative = new OperatorNode("*", "multiply", [arg0.clone(), new FunctionNode("sqrt", [new OperatorNode("-", "subtract", [createConstantNode(1), new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)])])])]);
					break;
				case "acsch":
					div = true;
					negative = true;
					funcDerivative = new OperatorNode("*", "multiply", [new FunctionNode("abs", [arg0.clone()]), new FunctionNode("sqrt", [new OperatorNode("+", "add", [new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)]), createConstantNode(1)])])]);
					break;
				case "acoth":
					div = true;
					negative = true;
					funcDerivative = new OperatorNode("-", "subtract", [createConstantNode(1), new OperatorNode("^", "pow", [arg0.clone(), createConstantNode(2)])]);
					break;
				case "abs":
					funcDerivative = new OperatorNode("/", "divide", [new FunctionNode(new SymbolNode("abs"), [arg0.clone()]), arg0.clone()]);
					break;
				default: throw new Error("Cannot process function \"" + node.name + "\" in derivative: the function is not supported, undefined, or the number of arguments passed to it are not supported");
			}
			var op, func;
			if (div) {
				op = "/";
				func = "divide";
			} else {
				op = "*";
				func = "multiply";
			}
			var chainDerivative = _derivative(arg0, isConst);
			if (negative) chainDerivative = new OperatorNode("-", "unaryMinus", [chainDerivative]);
			return new OperatorNode(op, func, [chainDerivative, funcDerivative]);
		},
		"OperatorNode, function": function OperatorNode_function(node, isConst) {
			if (isConst(node)) return createConstantNode(0);
			if (node.op === "+") return new OperatorNode(node.op, node.fn, node.args.map(function(arg) {
				return _derivative(arg, isConst);
			}));
			if (node.op === "-") {
				if (node.isUnary()) return new OperatorNode(node.op, node.fn, [_derivative(node.args[0], isConst)]);
				if (node.isBinary()) return new OperatorNode(node.op, node.fn, [_derivative(node.args[0], isConst), _derivative(node.args[1], isConst)]);
			}
			if (node.op === "*") {
				var constantTerms = node.args.filter(function(arg) {
					return isConst(arg);
				});
				if (constantTerms.length > 0) {
					var nonConstantTerms = node.args.filter(function(arg) {
						return !isConst(arg);
					});
					var nonConstantNode = nonConstantTerms.length === 1 ? nonConstantTerms[0] : new OperatorNode("*", "multiply", nonConstantTerms);
					return new OperatorNode("*", "multiply", constantTerms.concat(_derivative(nonConstantNode, isConst)));
				}
				return new OperatorNode("+", "add", node.args.map(function(argOuter) {
					return new OperatorNode("*", "multiply", node.args.map(function(argInner) {
						return argInner === argOuter ? _derivative(argInner, isConst) : argInner.clone();
					}));
				}));
			}
			if (node.op === "/" && node.isBinary()) {
				var arg0 = node.args[0];
				var arg1 = node.args[1];
				if (isConst(arg1)) return new OperatorNode("/", "divide", [_derivative(arg0, isConst), arg1]);
				if (isConst(arg0)) return new OperatorNode("*", "multiply", [new OperatorNode("-", "unaryMinus", [arg0]), new OperatorNode("/", "divide", [_derivative(arg1, isConst), new OperatorNode("^", "pow", [arg1.clone(), createConstantNode(2)])])]);
				return new OperatorNode("/", "divide", [new OperatorNode("-", "subtract", [new OperatorNode("*", "multiply", [_derivative(arg0, isConst), arg1.clone()]), new OperatorNode("*", "multiply", [arg0.clone(), _derivative(arg1, isConst)])]), new OperatorNode("^", "pow", [arg1.clone(), createConstantNode(2)])]);
			}
			if (node.op === "^" && node.isBinary()) {
				var _arg = node.args[0];
				var _arg2 = node.args[1];
				if (isConst(_arg)) {
					if (isConstantNode(_arg) && (isZero(_arg.value) || equal(_arg.value, 1))) return createConstantNode(0);
					return new OperatorNode("*", "multiply", [node, new OperatorNode("*", "multiply", [new FunctionNode("log", [_arg.clone()]), _derivative(_arg2.clone(), isConst)])]);
				}
				if (isConst(_arg2)) {
					if (isConstantNode(_arg2)) {
						if (isZero(_arg2.value)) return createConstantNode(0);
						if (equal(_arg2.value, 1)) return _derivative(_arg, isConst);
					}
					var powMinusOne = new OperatorNode("^", "pow", [_arg.clone(), new OperatorNode("-", "subtract", [_arg2, createConstantNode(1)])]);
					return new OperatorNode("*", "multiply", [_arg2.clone(), new OperatorNode("*", "multiply", [_derivative(_arg, isConst), powMinusOne])]);
				}
				return new OperatorNode("*", "multiply", [new OperatorNode("^", "pow", [_arg.clone(), _arg2.clone()]), new OperatorNode("+", "add", [new OperatorNode("*", "multiply", [_derivative(_arg, isConst), new OperatorNode("/", "divide", [_arg2.clone(), _arg.clone()])]), new OperatorNode("*", "multiply", [_derivative(_arg2, isConst), new FunctionNode("log", [_arg.clone()])])])]);
			}
			throw new Error("Cannot process operator \"" + node.op + "\" in derivative: the operator is not supported, undefined, or the number of arguments passed to it are not supported");
		}
	});
	/**
	* Helper function to create a constant node with a specific type
	* (number, BigNumber, Fraction)
	* @param {number} value
	* @param {string} [valueType]
	* @return {ConstantNode}
	*/
	function createConstantNode(value, valueType) {
		return new ConstantNode(numeric(value, valueType || safeNumberType(String(value), config)));
	}
	return derivative;
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/algebra/rationalize.js
var name$24 = "rationalize";
var createRationalize = /* #__PURE__ */ factory(name$24, [
	"config",
	"typed",
	"equal",
	"isZero",
	"add",
	"subtract",
	"multiply",
	"divide",
	"pow",
	"parse",
	"simplifyConstant",
	"simplifyCore",
	"simplify",
	"?bignumber",
	"?fraction",
	"mathWithTransform",
	"matrix",
	"AccessorNode",
	"ArrayNode",
	"ConstantNode",
	"FunctionNode",
	"IndexNode",
	"ObjectNode",
	"OperatorNode",
	"SymbolNode",
	"ParenthesisNode"
], (_ref) => {
	var { config, typed, equal, isZero, add, subtract, multiply, divide, pow, parse, simplifyConstant, simplifyCore, simplify, fraction, bignumber, mathWithTransform, matrix, AccessorNode, ArrayNode, ConstantNode, FunctionNode, IndexNode, ObjectNode, OperatorNode, SymbolNode, ParenthesisNode } = _ref;
	/**
	* Transform a rationalizable expression in a rational fraction.
	* If rational fraction is one variable polynomial then converts
	* the numerator and denominator in canonical form, with decreasing
	* exponents, returning the coefficients of numerator.
	*
	* Syntax:
	*
	*     math.rationalize(expr)
	*     math.rationalize(expr, detailed)
	*     math.rationalize(expr, scope)
	*     math.rationalize(expr, scope, detailed)
	*
	* Examples:
	*
	*     math.rationalize('sin(x)+y')
	*                   //  Error: There is an unsolved function call
	*     math.rationalize('2x/y - y/(x+1)')
	*                   // (2*x^2-y^2+2*x)/(x*y+y)
	*     math.rationalize('(2x+1)^6')
	*                   // 64*x^6+192*x^5+240*x^4+160*x^3+60*x^2+12*x+1
	*     math.rationalize('2x/( (2x-1) / (3x+2) ) - 5x/ ( (3x+4) / (2x^2-5) ) + 3')
	*                   // -20*x^4+28*x^3+104*x^2+6*x-12)/(6*x^2+5*x-4)
	*     math.rationalize('x/(1-x)/(x-2)/(x-3)/(x-4) + 2x/ ( (1-2x)/(2-3x) )/ ((3-4x)/(4-5x) )') =
	*                   // (-30*x^7+344*x^6-1506*x^5+3200*x^4-3472*x^3+1846*x^2-381*x)/
	*                   //     (-8*x^6+90*x^5-383*x^4+780*x^3-797*x^2+390*x-72)
	*
	*     math.rationalize('x+x+x+y',{y:1}) // 3*x+1
	*     math.rationalize('x+x+x+y',{})    // 3*x+y
	*
	*     const ret = math.rationalize('x+x+x+y',{},true)
	*                   // ret.expression=3*x+y, ret.variables = ["x","y"]
	*     const ret = math.rationalize('-2+5x^2',{},true)
	*                   // ret.expression=5*x^2-2, ret.variables = ["x"], ret.coefficients=[-2,0,5]
	*
	* See also:
	*
	*     simplify
	*
	* @param  {Node|string} expr    The expression to check if is a polynomial expression
	* @param  {Object|boolean}      optional scope of expression or true for already evaluated rational expression at input
	* @param  {Boolean}  detailed   optional True if return an object, false if return expression node (default)
	*
	* @return {Object | Node}    The rational polynomial of `expr` or an object
	*            `{expression, numerator, denominator, variables, coefficients}`, where
	*              `expression` is a `Node` with the node simplified expression,
	*              `numerator` is a `Node` with the simplified numerator of expression,
	*              `denominator` is a `Node` or `boolean` with the simplified denominator or `false` (if there is no denominator),
	*              `variables` is an array with variable names,
	*              and `coefficients` is an array with coefficients of numerator sorted by increased exponent
	*           {Expression Node}  node simplified expression
	*
	*/
	function _rationalize(expr) {
		var scope = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		var detailed = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
		var setRules = rulesRationalize();
		var polyRet = polynomial(expr, scope, true, setRules.firstRules);
		var nVars = polyRet.variables.length;
		var noExactFractions = { exactFractions: false };
		var withExactFractions = { exactFractions: true };
		expr = polyRet.expression;
		if (nVars >= 1) {
			expr = expandPower(expr);
			var sBefore;
			var rules;
			var eDistrDiv = true;
			var redoInic = false;
			expr = simplify(expr, setRules.firstRules, {}, noExactFractions);
			var s;
			while (true) {
				rules = eDistrDiv ? setRules.distrDivRules : setRules.sucDivRules;
				expr = simplify(expr, rules, {}, withExactFractions);
				eDistrDiv = !eDistrDiv;
				s = expr.toString();
				if (s === sBefore) break;
				redoInic = true;
				sBefore = s;
			}
			if (redoInic) expr = simplify(expr, setRules.firstRulesAgain, {}, noExactFractions);
			expr = simplify(expr, setRules.finalRules, {}, noExactFractions);
		}
		var coefficients = [];
		var retRationalize = {};
		if (expr.type === "OperatorNode" && expr.isBinary() && expr.op === "/") {
			if (nVars === 1) {
				expr.args[0] = polyToCanonical(expr.args[0], coefficients);
				expr.args[1] = polyToCanonical(expr.args[1]);
			}
			if (detailed) {
				retRationalize.numerator = expr.args[0];
				retRationalize.denominator = expr.args[1];
			}
		} else {
			if (nVars === 1) expr = polyToCanonical(expr, coefficients);
			if (detailed) {
				retRationalize.numerator = expr;
				retRationalize.denominator = null;
			}
		}
		if (!detailed) return expr;
		retRationalize.coefficients = coefficients;
		retRationalize.variables = polyRet.variables;
		retRationalize.expression = expr;
		return retRationalize;
	}
	return typed(name$24, {
		Node: _rationalize,
		"Node, boolean": (expr, detailed) => _rationalize(expr, {}, detailed),
		"Node, Object": _rationalize,
		"Node, Object, boolean": _rationalize
	});
	/**
	*  Function to simplify an expression using an optional scope and
	*  return it if the expression is a polynomial expression, i.e.
	*  an expression with one or more variables and the operators
	*  +, -, *, and ^, where the exponent can only be a positive integer.
	*
	* Syntax:
	*
	*     polynomial(expr,scope,extended, rules)
	*
	* @param  {Node | string} expr     The expression to simplify and check if is polynomial expression
	* @param  {object} scope           Optional scope for expression simplification
	* @param  {boolean} extended       Optional. Default is false. When true allows divide operator.
	* @param  {array}  rules           Optional. Default is no rule.
	*
	*
	* @return {Object}
	*            {Object} node:   node simplified expression
	*            {Array}  variables:  variable names
	*/
	function polynomial(expr, scope, extended, rules) {
		var variables = [];
		var node = simplify(expr, rules, scope, { exactFractions: false });
		extended = !!extended;
		var oper = "+-*" + (extended ? "/" : "");
		recPoly(node);
		var retFunc = {};
		retFunc.expression = node;
		retFunc.variables = variables;
		return retFunc;
		/**
		*  Function to simplify an expression using an optional scope and
		*  return it if the expression is a polynomial expression, i.e.
		*  an expression with one or more variables and the operators
		*  +, -, *, and ^, where the exponent can only be a positive integer.
		*
		* Syntax:
		*
		*     recPoly(node)
		*
		*
		* @param  {Node} node               The current sub tree expression in recursion
		*
		* @return                           nothing, throw an exception if error
		*/
		function recPoly(node) {
			var tp = node.type;
			if (tp === "FunctionNode") throw new Error("There is an unsolved function call");
			else if (tp === "OperatorNode") {
				if (node.op === "^") {
					if (node.args[1].type !== "ConstantNode" || !isInteger(parseFloat(node.args[1].value))) throw new Error("There is a non-integer exponent");
					else recPoly(node.args[0]);
				} else {
					if (!oper.includes(node.op)) throw new Error("Operator " + node.op + " invalid in polynomial expression");
					for (var i = 0; i < node.args.length; i++) recPoly(node.args[i]);
				}
			} else if (tp === "SymbolNode") {
				var _name = node.name;
				if (variables.indexOf(_name) === -1) variables.push(_name);
			} else if (tp === "ParenthesisNode") recPoly(node.content);
			else if (tp !== "ConstantNode") throw new Error("type " + tp + " is not allowed in polynomial expression");
		}
	}
	/**
	* Return a rule set to rationalize an polynomial expression in rationalize
	*
	* Syntax:
	*
	*     rulesRationalize()
	*
	* @return {array}        rule set to rationalize an polynomial expression
	*/
	function rulesRationalize() {
		var oldRules = [
			simplifyCore,
			{
				l: "n+n",
				r: "2*n"
			},
			{
				l: "n+-n",
				r: "0"
			},
			simplifyConstant,
			{
				l: "n*(n1^-1)",
				r: "n/n1"
			},
			{
				l: "n*n1^-n2",
				r: "n/n1^n2"
			},
			{
				l: "n1^-1",
				r: "1/n1"
			},
			{
				l: "n*(n1/n2)",
				r: "(n*n1)/n2"
			},
			{
				l: "1*n",
				r: "n"
			}
		];
		var rulesFirst = [
			{
				l: "(-n1)/(-n2)",
				r: "n1/n2"
			},
			{
				l: "(-n1)*(-n2)",
				r: "n1*n2"
			},
			{
				l: "n1--n2",
				r: "n1+n2"
			},
			{
				l: "n1-n2",
				r: "n1+(-n2)"
			},
			{
				l: "(n1+n2)*n3",
				r: "(n1*n3 + n2*n3)"
			},
			{
				l: "n1*(n2+n3)",
				r: "(n1*n2+n1*n3)"
			},
			{
				l: "c1*n + c2*n",
				r: "(c1+c2)*n"
			},
			{
				l: "c1*n + n",
				r: "(c1+1)*n"
			},
			{
				l: "c1*n - c2*n",
				r: "(c1-c2)*n"
			},
			{
				l: "c1*n - n",
				r: "(c1-1)*n"
			},
			{
				l: "v/c",
				r: "(1/c)*v"
			},
			{
				l: "v/-c",
				r: "-(1/c)*v"
			},
			{
				l: "-v*-c",
				r: "c*v"
			},
			{
				l: "-v*c",
				r: "-c*v"
			},
			{
				l: "v*-c",
				r: "-c*v"
			},
			{
				l: "v*c",
				r: "c*v"
			},
			{
				l: "-(-n1*n2)",
				r: "(n1*n2)"
			},
			{
				l: "-(n1*n2)",
				r: "(-n1*n2)"
			},
			{
				l: "-(-n1+n2)",
				r: "(n1-n2)"
			},
			{
				l: "-(n1+n2)",
				r: "(-n1-n2)"
			},
			{
				l: "(n1^n2)^n3",
				r: "(n1^(n2*n3))"
			},
			{
				l: "-(-n1/n2)",
				r: "(n1/n2)"
			},
			{
				l: "-(n1/n2)",
				r: "(-n1/n2)"
			}
		];
		var rulesDistrDiv = [
			{
				l: "(n1/n2 + n3/n4)",
				r: "((n1*n4 + n3*n2)/(n2*n4))"
			},
			{
				l: "(n1/n2 + n3)",
				r: "((n1 + n3*n2)/n2)"
			},
			{
				l: "(n1 + n2/n3)",
				r: "((n1*n3 + n2)/n3)"
			}
		];
		var rulesSucDiv = [{
			l: "(n1/(n2/n3))",
			r: "((n1*n3)/n2)"
		}, {
			l: "(n1/n2/n3)",
			r: "(n1/(n2*n3))"
		}];
		var setRules = {};
		setRules.firstRules = oldRules.concat(rulesFirst, rulesSucDiv);
		setRules.distrDivRules = rulesDistrDiv;
		setRules.sucDivRules = rulesSucDiv;
		setRules.firstRulesAgain = oldRules.concat(rulesFirst);
		setRules.finalRules = [
			simplifyCore,
			{
				l: "n*-n",
				r: "-n^2"
			},
			{
				l: "n*n",
				r: "n^2"
			},
			simplifyConstant,
			{
				l: "n*-n^n1",
				r: "-n^(n1+1)"
			},
			{
				l: "n*n^n1",
				r: "n^(n1+1)"
			},
			{
				l: "n^n1*-n^n2",
				r: "-n^(n1+n2)"
			},
			{
				l: "n^n1*n^n2",
				r: "n^(n1+n2)"
			},
			{
				l: "n^n1*-n",
				r: "-n^(n1+1)"
			},
			{
				l: "n^n1*n",
				r: "n^(n1+1)"
			},
			{
				l: "n^n1/-n",
				r: "-n^(n1-1)"
			},
			{
				l: "n^n1/n",
				r: "n^(n1-1)"
			},
			{
				l: "n/-n^n1",
				r: "-n^(1-n1)"
			},
			{
				l: "n/n^n1",
				r: "n^(1-n1)"
			},
			{
				l: "n^n1/-n^n2",
				r: "n^(n1-n2)"
			},
			{
				l: "n^n1/n^n2",
				r: "n^(n1-n2)"
			},
			{
				l: "n1+(-n2*n3)",
				r: "n1-n2*n3"
			},
			{
				l: "v*(-c)",
				r: "-c*v"
			},
			{
				l: "n1+-n2",
				r: "n1-n2"
			},
			{
				l: "v*c",
				r: "c*v"
			},
			{
				l: "(n1^n2)^n3",
				r: "(n1^(n2*n3))"
			}
		];
		return setRules;
	}
	/**
	*  Expand recursively a tree node for handling with expressions with exponents
	*  (it's not for constants, symbols or functions with exponents)
	*  PS: The other parameters are internal for recursion
	*
	* Syntax:
	*
	*     expandPower(node)
	*
	* @param  {Node} node         Current expression node
	* @param  {node} parent       Parent current node inside the recursion
	* @param  (int}               Parent number of chid inside the rercursion
	*
	* @return {node}        node expression with all powers expanded.
	*/
	function expandPower(node, parent, indParent) {
		var tp = node.type;
		var internal = arguments.length > 1;
		if (tp === "OperatorNode" && node.isBinary()) {
			var does = false;
			var val;
			if (node.op === "^") {
				if ((node.args[0].type === "ParenthesisNode" || node.args[0].type === "OperatorNode") && node.args[1].type === "ConstantNode") {
					val = parseFloat(node.args[1].value);
					does = val >= 2 && isInteger(val);
				}
			}
			if (does) {
				if (val > 2) {
					var nEsqTopo = node.args[0];
					node = new OperatorNode("*", "multiply", [nEsqTopo, new OperatorNode("^", "pow", [node.args[0].cloneDeep(), new ConstantNode(val - 1)])]);
				} else node = new OperatorNode("*", "multiply", [node.args[0], node.args[0].cloneDeep()]);
				if (internal) {
					if (indParent === "content") parent.content = node;
					else parent.args[indParent] = node;
				}
			}
		}
		if (tp === "ParenthesisNode") expandPower(node.content, node, "content");
		else if (tp !== "ConstantNode" && tp !== "SymbolNode") for (var i = 0; i < node.args.length; i++) expandPower(node.args[i], node, i);
		if (!internal) return node;
	}
	/**
	* Auxilary function for rationalize
	* Convert near canonical polynomial in one variable in a canonical polynomial
	* with one term for each exponent in decreasing order
	*
	* Syntax:
	*
	*     polyToCanonical(node [, coefficients])
	*
	* @param  {Node | string} expr       The near canonical polynomial expression to convert in a a canonical polynomial expression
	*
	*        The string or tree expression needs to be at below syntax, with free spaces:
	*         (  (^(-)? | [+-]? )cte (*)? var (^expo)?  | cte )+
	*       Where 'var' is one variable with any valid name
	*             'cte' are real numeric constants with any value. It can be omitted if equal than 1
	*             'expo' are integers greater than 0. It can be omitted if equal than 1.
	*
	* @param  {array}   coefficients             Optional returns coefficients sorted by increased exponent
	*
	*
	* @return {node}        new node tree with one variable polynomial or string error.
	*/
	function polyToCanonical(node, coefficients) {
		if (coefficients === void 0) coefficients = [];
		coefficients[0] = 0;
		var o = {};
		o.cte = 1;
		o.oper = "+";
		o.fire = "";
		var maxExpo = 0;
		var varname = "";
		recurPol(node, null, o);
		maxExpo = coefficients.length - 1;
		var first = true;
		var no;
		for (var i = maxExpo; i >= 0; i--) {
			if (coefficients[i] === 0) continue;
			var n1 = new ConstantNode(first ? coefficients[i] : Math.abs(coefficients[i]));
			var op = coefficients[i] < 0 ? "-" : "+";
			if (i > 0) {
				var n2 = new SymbolNode(varname);
				if (i > 1) {
					var n3 = new ConstantNode(i);
					n2 = new OperatorNode("^", "pow", [n2, n3]);
				}
				if (coefficients[i] === -1 && first) n1 = new OperatorNode("-", "unaryMinus", [n2]);
				else if (Math.abs(coefficients[i]) === 1) n1 = n2;
				else n1 = new OperatorNode("*", "multiply", [n1, n2]);
			}
			if (first) no = n1;
			else if (op === "+") no = new OperatorNode("+", "add", [no, n1]);
			else no = new OperatorNode("-", "subtract", [no, n1]);
			first = false;
		}
		if (first) return new ConstantNode(0);
		else return no;
		/**
		* Recursive auxilary function inside polyToCanonical for
		* converting expression in canonical form
		*
		* Syntax:
		*
		*     recurPol(node, noPai, obj)
		*
		* @param  {Node} node        The current subpolynomial expression
		* @param  {Node | Null}  noPai   The current parent node
		* @param  {object}    obj        Object with many internal flags
		*
		* @return {}                    No return. If error, throws an exception
		*/
		function recurPol(node, noPai, o) {
			var tp = node.type;
			if (tp === "FunctionNode") throw new Error("There is an unsolved function call");
			else if (tp === "OperatorNode") {
				if (!"+-*^".includes(node.op)) throw new Error("Operator " + node.op + " invalid");
				if (noPai !== null) {
					if ((node.fn === "unaryMinus" || node.fn === "pow") && noPai.fn !== "add" && noPai.fn !== "subtract" && noPai.fn !== "multiply") throw new Error("Invalid " + node.op + " placing");
					if ((node.fn === "subtract" || node.fn === "add" || node.fn === "multiply") && noPai.fn !== "add" && noPai.fn !== "subtract") throw new Error("Invalid " + node.op + " placing");
					if ((node.fn === "subtract" || node.fn === "add" || node.fn === "unaryMinus") && o.noFil !== 0) throw new Error("Invalid " + node.op + " placing");
				}
				if (node.op === "^" || node.op === "*") o.fire = node.op;
				for (var _i = 0; _i < node.args.length; _i++) {
					if (node.fn === "unaryMinus") o.oper = "-";
					if (node.op === "+" || node.fn === "subtract") {
						o.fire = "";
						o.cte = 1;
						o.oper = _i === 0 ? "+" : node.op;
					}
					o.noFil = _i;
					recurPol(node.args[_i], node, o);
				}
			} else if (tp === "SymbolNode") {
				if (node.name !== varname && varname !== "") throw new Error("There is more than one variable");
				varname = node.name;
				if (noPai === null) {
					coefficients[1] = 1;
					return;
				}
				if (noPai.op === "^" && o.noFil !== 0) throw new Error("In power the variable should be the first parameter");
				if (noPai.op === "*" && o.noFil !== 1) throw new Error("In multiply the variable should be the second parameter");
				if (o.fire === "" || o.fire === "*") {
					if (maxExpo < 1) coefficients[1] = 0;
					coefficients[1] += o.cte * (o.oper === "+" ? 1 : -1);
					maxExpo = Math.max(1, maxExpo);
				}
			} else if (tp === "ConstantNode") {
				var valor = parseFloat(node.value);
				if (noPai === null) {
					coefficients[0] = valor;
					return;
				}
				if (noPai.op === "^") {
					if (o.noFil !== 1) throw new Error("Constant cannot be powered");
					if (!isInteger(valor) || valor <= 0) throw new Error("Non-integer exponent is not allowed");
					for (var _i2 = maxExpo + 1; _i2 < valor; _i2++) coefficients[_i2] = 0;
					if (valor > maxExpo) coefficients[valor] = 0;
					coefficients[valor] += o.cte * (o.oper === "+" ? 1 : -1);
					maxExpo = Math.max(valor, maxExpo);
					return;
				}
				o.cte = valor;
				if (o.fire === "") coefficients[0] += o.cte * (o.oper === "+" ? 1 : -1);
			} else throw new Error("Type " + tp + " is not allowed");
		}
	}
});
//#endregion
//#region node_modules/mathjs/lib/esm/error/IndexError.js
/**
* Create a range error with the message:
*     'Index out of range (index < min)'
*     'Index out of range (index < max)'
*
* @param {number} index     The actual index
* @param {number} [min=0]   Minimum index (included)
* @param {number} [max]     Maximum index (excluded)
* @extends RangeError
*/
function IndexError(index, min, max) {
	if (!(this instanceof IndexError)) throw new SyntaxError("Constructor must be called with the new operator");
	this.index = index;
	if (arguments.length < 3) {
		this.min = 0;
		this.max = min;
	} else {
		this.min = min;
		this.max = max;
	}
	if (this.min !== void 0 && this.index < this.min) this.message = "Index out of range (" + this.index + " < " + this.min + ")";
	else if (this.max !== void 0 && this.index >= this.max) this.message = "Index out of range (" + this.index + " > " + (this.max - 1) + ")";
	else this.message = "Index out of range (" + this.index + ")";
	this.stack = (/* @__PURE__ */ new Error()).stack;
}
IndexError.prototype = /* @__PURE__ */ new RangeError();
IndexError.prototype.constructor = RangeError;
IndexError.prototype.name = "IndexError";
IndexError.prototype.isIndexError = true;
//#endregion
//#region node_modules/mathjs/lib/esm/error/DimensionError.js
/**
* Create a range error with the message:
*     'Dimension mismatch (<actual size> != <expected size>)'
* @param {number | number[]} actual        The actual size
* @param {number | number[]} expected      The expected size
* @param {string} [relation='!=']          Optional relation between actual
*                                          and expected size: '!=', '<', etc.
* @extends RangeError
*/
function DimensionError(actual, expected, relation) {
	if (!(this instanceof DimensionError)) throw new SyntaxError("Constructor must be called with the new operator");
	this.actual = actual;
	this.expected = expected;
	this.relation = relation;
	this.message = "Dimension mismatch (" + (Array.isArray(actual) ? "[" + actual.join(", ") + "]" : actual) + " " + (this.relation || "!=") + " " + (Array.isArray(expected) ? "[" + expected.join(", ") + "]" : expected) + ")";
	this.stack = (/* @__PURE__ */ new Error()).stack;
}
DimensionError.prototype = /* @__PURE__ */ new RangeError();
DimensionError.prototype.constructor = RangeError;
DimensionError.prototype.name = "DimensionError";
DimensionError.prototype.isDimensionError = true;
//#endregion
//#region node_modules/mathjs/lib/esm/utils/array.js
var import_extends = /* @__PURE__ */ __toESM(require_extends(), 1);
/**
* Calculate the size of a multi dimensional array.
* This function checks the size of the first entry, it does not validate
* whether all dimensions match. (use function `validate` for that)
* @param {Array} x
* @return {number[]} size
*/
function arraySize(x) {
	var s = [];
	while (Array.isArray(x)) {
		s.push(x.length);
		x = x[0];
	}
	return s;
}
/**
* A safe map
* @param {Array} array
* @param {function} callback
*/
function map(array, callback) {
	return Array.prototype.map.call(array, callback);
}
/**
* A safe forEach
* @param {Array} array
* @param {function} callback
*/
function forEach(array, callback) {
	Array.prototype.forEach.call(array, callback);
}
/**
* A safe join
* @param {Array} array
* @param {string} separator
*/
function join$1(array, separator) {
	return Array.prototype.join.call(array, separator);
}
/**
* Recursively maps over each element of nested array using a provided callback function.
*
* @param {Array} array - The array to be mapped.
* @param {Function} callback - The function to execute on each element, taking three arguments:
*   - `value` (any): The current element being processed in the array.
*   - `index` (Array<number>): The index of the current element being processed in the array.
*   - `array` (Array): The array `deepMap` was called upon.
* @param {boolean} [skipIndex=false] - If true, the callback function is called with only the value.
* @returns {Array} A new array with each element being the result of the callback function.
*/
function deepMap$1(array, callback) {
	var skipIndex = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
	if (array.length === 0) return [];
	if (skipIndex) return recursiveMap(array);
	var index = [];
	return recursiveMapWithIndex(array, 0);
	function recursiveMapWithIndex(value, depth) {
		if (Array.isArray(value)) {
			var N = value.length;
			var result = Array(N);
			for (var i = 0; i < N; i++) {
				index[depth] = i;
				result[i] = recursiveMapWithIndex(value[i], depth + 1);
			}
			return result;
		} else return callback(value, index.slice(0, depth), array);
	}
	function recursiveMap(value) {
		if (Array.isArray(value)) {
			var N = value.length;
			var result = Array(N);
			for (var i = 0; i < N; i++) result[i] = recursiveMap(value[i]);
			return result;
		} else return callback(value);
	}
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/collection.js
/**
* Execute the callback function element wise for each element in array and any
* nested array
* Returns an array with the results
* @param {Array | Matrix} array
* @param {Function} callback   The callback is called with two parameters:
*                              value1 and value2, which contain the current
*                              element of both arrays.
* @param {boolean} [skipZeros] Invoke callback function for non-zero values only.
*
* @return {Array | Matrix} res
*/
function deepMap(array, callback, skipZeros) {
	if (!skipZeros) {
		if (isMatrix(array)) return array.map((x) => callback(x), false, true);
		else return deepMap$1(array, callback, true);
	}
	var skipZerosCallback = (x) => x === 0 ? x : callback(x);
	if (isMatrix(array)) return array.map((x) => skipZerosCallback(x), false, true);
	else return deepMap$1(array, skipZerosCallback, true);
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/lruQueue.js
function lruQueue(limit) {
	var size = 0;
	var base = 1;
	var queue = Object.create(null);
	var map = Object.create(null);
	var index = 0;
	var del = function del(id) {
		var oldIndex = map[id];
		if (!oldIndex) return;
		delete queue[oldIndex];
		delete map[id];
		--size;
		if (base !== oldIndex) return;
		if (!size) {
			index = 0;
			base = 1;
			return;
		}
		while (!Object.prototype.hasOwnProperty.call(queue, ++base));
	};
	limit = Math.abs(limit);
	return {
		hit: function hit(id) {
			var oldIndex = map[id];
			var nuIndex = ++index;
			queue[nuIndex] = id;
			map[id] = nuIndex;
			if (!oldIndex) {
				++size;
				if (size <= limit) return void 0;
				id = queue[base];
				del(id);
				return id;
			}
			delete queue[oldIndex];
			if (base !== oldIndex) return void 0;
			while (!Object.prototype.hasOwnProperty.call(queue, ++base));
		},
		delete: del,
		clear: function clear() {
			size = index = 0;
			base = 1;
			queue = Object.create(null);
			map = Object.create(null);
		}
	};
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/function.js
/**
* Memoize a given function by caching the computed result.
* The cache of a memoized function can be cleared by deleting the `cache`
* property of the function.
*
* @param {function} fn                     The function to be memoized.
*                                          Must be a pure function.
* @param {Object} [options]
* @param {function(args: Array): string} [options.hasher]
*    A custom hash builder. Is JSON.stringify by default.
* @param {number | undefined} [options.limit]
*    Maximum number of values that may be cached. Undefined indicates
*    unlimited (default)
* @return {function}                       Returns the memoized function
*/
function memoize(fn) {
	var { hasher, limit } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
	limit = limit == null ? Number.POSITIVE_INFINITY : limit;
	hasher = hasher == null ? JSON.stringify : hasher;
	return function memoize() {
		if (typeof memoize.cache !== "object") memoize.cache = {
			values: /* @__PURE__ */ new Map(),
			lru: lruQueue(limit || Number.POSITIVE_INFINITY)
		};
		var args = [];
		for (var i = 0; i < arguments.length; i++) args[i] = arguments[i];
		var hash = hasher(args);
		if (memoize.cache.values.has(hash)) {
			memoize.cache.lru.hit(hash);
			return memoize.cache.values.get(hash);
		}
		var newVal = fn.apply(fn, args);
		memoize.cache.values.set(hash, newVal);
		memoize.cache.values.delete(memoize.cache.lru.hit(hash));
		return newVal;
	};
}
//#endregion
//#region node_modules/mathjs/lib/esm/utils/bignumber/constants.js
/**
* Calculate BigNumber e
* @param {function} BigNumber   BigNumber constructor
* @returns {BigNumber} Returns e
*/
var createBigNumberE = memoize(function(BigNumber) {
	return new BigNumber(1).exp();
}, { hasher });
memoize(function(BigNumber) {
	return new BigNumber(1).plus(new BigNumber(5).sqrt()).div(2);
}, { hasher });
/**
* Calculate BigNumber pi.
* @param {function} BigNumber   BigNumber constructor
* @returns {BigNumber} Returns pi
*/
var createBigNumberPi = memoize(function(BigNumber) {
	return BigNumber.acos(-1);
}, { hasher });
memoize(function(BigNumber) {
	return createBigNumberPi(BigNumber).times(2);
}, { hasher });
/**
* Create a hash for a BigNumber constructor function. The created has is
* the configured precision
* @param {Array} args         Supposed to contain a single entry with
*                             a BigNumber constructor
* @return {number} precision
* @private
*/
function hasher(args) {
	return args[0].precision;
}
//#endregion
//#region node_modules/mathjs/lib/esm/constants.js
var createPi = /* #__PURE__ */ recreateFactory("pi", ["config", "?BigNumber"], (_ref3) => {
	var { config, BigNumber } = _ref3;
	return config.number === "BigNumber" ? createBigNumberPi(BigNumber) : pi;
});
var createE = /* #__PURE__ */ recreateFactory("e", ["config", "?BigNumber"], (_ref5) => {
	var { config, BigNumber } = _ref5;
	return config.number === "BigNumber" ? createBigNumberE(BigNumber) : e;
});
function recreateFactory(name, dependencies, create) {
	return factory(name, dependencies, create, { recreateOnConfigChange: true });
}
//#endregion
//#region node_modules/mathjs/lib/esm/type/number.js
var name$23 = "number";
var dependencies$21 = ["typed"];
/**
* Separates the radix, integer part, and fractional part of a non decimal number string
* @param {string} input string to parse
* @returns {object} the parts of the string or null if not a valid input
*/
function getNonDecimalNumberParts(input) {
	var nonDecimalWithRadixMatch = input.match(/(0[box])([0-9a-fA-F]*)\.([0-9a-fA-F]*)/);
	if (nonDecimalWithRadixMatch) return {
		input,
		radix: {
			"0b": 2,
			"0o": 8,
			"0x": 16
		}[nonDecimalWithRadixMatch[1]],
		integerPart: nonDecimalWithRadixMatch[2],
		fractionalPart: nonDecimalWithRadixMatch[3]
	};
	else return null;
}
/**
* Makes a number from a radix, and integer part, and a fractional part
* @param {parts} [x] parts of the number string (from getNonDecimalNumberParts)
* @returns {number} the number
*/
function makeNumberFromNonDecimalParts(parts) {
	var n = parseInt(parts.integerPart, parts.radix);
	var f = 0;
	for (var i = 0; i < parts.fractionalPart.length; i++) {
		var digitValue = parseInt(parts.fractionalPart[i], parts.radix);
		f += digitValue / Math.pow(parts.radix, i + 1);
	}
	var result = n + f;
	if (isNaN(result)) throw new SyntaxError("String \"" + parts.input + "\" is not a valid number");
	return result;
}
var createNumber = /* #__PURE__ */ factory(name$23, dependencies$21, (_ref) => {
	var { typed } = _ref;
	/**
	* Create a number or convert a string, boolean, or unit to a number.
	* When value is a matrix, all elements will be converted to number.
	*
	* Syntax:
	*
	*    math.number(value)
	*    math.number(unit, valuelessUnit)
	*
	* Examples:
	*
	*    math.number(2)                         // returns number 2
	*    math.number('7.2')                     // returns number 7.2
	*    math.number(true)                      // returns number 1
	*    math.number([true, false, true, true]) // returns [1, 0, 1, 1]
	*    math.number(math.unit('52cm'), 'm')    // returns 0.52
	*
	* See also:
	*
	*    bignumber, bigint, boolean, numeric, complex, index, matrix, string, unit
	*
	* @param {string | number | BigNumber | Fraction | boolean | Array | Matrix | Unit | null} [value]  Value to be converted
	* @param {Unit | string} [valuelessUnit] A valueless unit, used to convert a unit to a number
	* @return {number | Array | Matrix} The created number
	*/
	var number = typed("number", {
		"": function _() {
			return 0;
		},
		number: function number(x) {
			return x;
		},
		string: function string(x) {
			if (x === "NaN") return NaN;
			var nonDecimalNumberParts = getNonDecimalNumberParts(x);
			if (nonDecimalNumberParts) return makeNumberFromNonDecimalParts(nonDecimalNumberParts);
			var size = 0;
			var wordSizeSuffixMatch = x.match(/(0[box][0-9a-fA-F]*)i([0-9]*)/);
			if (wordSizeSuffixMatch) {
				size = Number(wordSizeSuffixMatch[2]);
				x = wordSizeSuffixMatch[1];
			}
			var num = Number(x);
			if (isNaN(num)) throw new SyntaxError("String \"" + x + "\" is not a valid number");
			if (wordSizeSuffixMatch) {
				if (num > 2 ** size - 1) throw new SyntaxError("String \"".concat(x, "\" is out of range"));
				if (num >= 2 ** (size - 1)) num = num - 2 ** size;
			}
			return num;
		},
		BigNumber: function BigNumber(x) {
			return x.toNumber();
		},
		bigint: function bigint(x) {
			return Number(x);
		},
		Fraction: function Fraction(x) {
			return x.valueOf();
		},
		Unit: typed.referToSelf((self) => (x) => {
			var clone = x.clone();
			clone.value = self(x.value);
			return clone;
		}),
		null: function _null(x) {
			return 0;
		},
		"Unit, string | Unit": function Unit_string__Unit(unit, valuelessUnit) {
			return unit.toNumber(valuelessUnit);
		},
		"Array | Matrix": typed.referToSelf((self) => (x) => deepMap(x, self))
	});
	number.fromJSON = function(json) {
		return parseFloat(json.value);
	};
	return number;
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/keywords.js
var keywords = /* @__PURE__ */ new Set(["end"]);
var createNode = /* #__PURE__ */ factory("Node", ["mathWithTransform"], (_ref) => {
	var { mathWithTransform } = _ref;
	/**
	* Validate the symbol names of a scope.
	* Throws an error when the scope contains an illegal symbol.
	* @param {Object} scope
	*/
	function _validateScope(scope) {
		for (var symbol of [...keywords]) if (scope.has(symbol)) throw new Error("Scope contains an illegal symbol, \"" + symbol + "\" is a reserved keyword");
	}
	class Node {
		get type() {
			return "Node";
		}
		get isNode() {
			return true;
		}
		/**
		* Evaluate the node
		* @param {Object} [scope]  Scope to read/write variables
		* @return {*}              Returns the result
		*/
		evaluate(scope) {
			return this.compile().evaluate(scope);
		}
		/**
		* Compile the node into an optimized, evauatable JavaScript function
		* @return {{evaluate: function([Object])}} object
		*                Returns an object with a function 'evaluate',
		*                which can be invoked as expr.evaluate([scope: Object]),
		*                where scope is an optional object with
		*                variables.
		*/
		compile() {
			var expr = this._compile(mathWithTransform, {});
			var args = {};
			var context = null;
			function evaluate(scope) {
				var s = createMap(scope);
				_validateScope(s);
				return expr(s, args, context);
			}
			return { evaluate };
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			throw new Error("Method _compile must be implemented by type " + this.type);
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			throw new Error("Cannot run forEach on a Node interface");
		}
		/**
		* Create a new Node whose children are the results of calling the
		* provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {OperatorNode} Returns a transformed copy of the node
		*/
		map(callback) {
			throw new Error("Cannot run map on a Node interface");
		}
		/**
		* Validate whether an object is a Node, for use with map
		* @param {Node} node
		* @returns {Node} Returns the input if it's a node, else throws an Error
		* @protected
		*/
		_ifNode(node) {
			if (!isNode(node)) throw new TypeError("Callback function must return a Node");
			return node;
		}
		/**
		* Recursively traverse all nodes in a node tree. Executes given callback for
		* this node and each of its child nodes.
		* @param {function(node: Node, path: string, parent: Node)} callback
		*          A callback called for every node in the node tree.
		*/
		traverse(callback) {
			callback(this, null, null);
			function _traverse(node, callback) {
				node.forEach(function(child, path, parent) {
					callback(child, path, parent);
					_traverse(child, callback);
				});
			}
			_traverse(this, callback);
		}
		/**
		* Recursively transform a node tree via a transform function.
		*
		* For example, to replace all nodes of type SymbolNode having name 'x' with
		* a ConstantNode with value 2:
		*
		*     const res = Node.transform(function (node, path, parent) {
		*       if (node && node.isSymbolNode) && (node.name === 'x')) {
		*         return new ConstantNode(2)
		*       }
		*       else {
		*         return node
		*       }
		*     })
		*
		* @param {function(node: Node, path: string, parent: Node) : Node} callback
		*          A mapping function accepting a node, and returning
		*          a replacement for the node or the original node. The "signature"
		*          of the callback must be:
		*          callback(node: Node, index: string, parent: Node) : Node
		* @return {Node} Returns the original node or its replacement
		*/
		transform(callback) {
			function _transform(child, path, parent) {
				var replacement = callback(child, path, parent);
				if (replacement !== child) return replacement;
				return child.map(_transform);
			}
			return _transform(this, null, null);
		}
		/**
		* Find any node in the node tree matching given filter function. For
		* example, to find all nodes of type SymbolNode having name 'x':
		*
		*     const results = Node.filter(function (node) {
		*       return (node && node.isSymbolNode) && (node.name === 'x')
		*     })
		*
		* @param {function(node: Node, path: string, parent: Node) : Node} callback
		*            A test function returning true when a node matches, and false
		*            otherwise. Function signature:
		*            callback(node: Node, index: string, parent: Node) : boolean
		* @return {Node[]} nodes
		*            An array with nodes matching given filter criteria
		*/
		filter(callback) {
			var nodes = [];
			this.traverse(function(node, path, parent) {
				if (callback(node, path, parent)) nodes.push(node);
			});
			return nodes;
		}
		/**
		* Create a shallow clone of this node
		* @return {Node}
		*/
		clone() {
			throw new Error("Cannot clone a Node interface");
		}
		/**
		* Create a deep clone of this node
		* @return {Node}
		*/
		cloneDeep() {
			return this.map(function(node) {
				return node.cloneDeep();
			});
		}
		/**
		* Deep compare this node with another node.
		* @param {Node} other
		* @return {boolean} Returns true when both nodes are of the same type and
		*                   contain the same values (as do their childs)
		*/
		equals(other) {
			return other ? this.type === other.type && deepStrictEqual(this, other) : false;
		}
		/**
		* Get string representation. (wrapper function)
		*
		* This function can get an object of the following form:
		* {
		*    handler: //This can be a callback function of the form
		*             // "function callback(node, options)"or
		*             // a map that maps function names (used in FunctionNodes)
		*             // to callbacks
		*    parenthesis: "keep" //the parenthesis option (This is optional)
		* }
		*
		* @param {Object} [options]
		* @return {string}
		*/
		toString(options) {
			var customString = this._getCustomString(options);
			if (typeof customString !== "undefined") return customString;
			return this._toString(options);
		}
		/**
		* Internal function to generate the string output.
		* This has to be implemented by every Node
		*
		* @throws {Error}
		*/
		_toString() {
			throw new Error("_toString not implemented for " + this.type);
		}
		/**
		* Get a JSON representation of the node
		* Both .toJSON() and the static .fromJSON(json) should be implemented by all
		* implementations of Node
		* @returns {Object}
		*/
		toJSON() {
			throw new Error("Cannot serialize object: toJSON not implemented by " + this.type);
		}
		/**
		* Get HTML representation. (wrapper function)
		*
		* This function can get an object of the following form:
		* {
		*    handler: //This can be a callback function of the form
		*             // "function callback(node, options)" or
		*             // a map that maps function names (used in FunctionNodes)
		*             // to callbacks
		*    parenthesis: "keep" //the parenthesis option (This is optional)
		* }
		*
		* @param {Object} [options]
		* @return {string}
		*/
		toHTML(options) {
			var customString = this._getCustomString(options);
			if (typeof customString !== "undefined") return customString;
			return this._toHTML(options);
		}
		/**
		* Internal function to generate the HTML output.
		* This has to be implemented by every Node
		*
		* @throws {Error}
		*/
		_toHTML() {
			throw new Error("_toHTML not implemented for " + this.type);
		}
		/**
		* Get LaTeX representation. (wrapper function)
		*
		* This function can get an object of the following form:
		* {
		*    handler: //This can be a callback function of the form
		*             // "function callback(node, options)"or
		*             // a map that maps function names (used in FunctionNodes)
		*             // to callbacks
		*    parenthesis: "keep" //the parenthesis option (This is optional)
		* }
		*
		* @param {Object} [options]
		* @return {string}
		*/
		toTex(options) {
			var customString = this._getCustomString(options);
			if (typeof customString !== "undefined") return customString;
			return this._toTex(options);
		}
		/**
		* Internal function to generate the LaTeX output.
		* This has to be implemented by every Node
		*
		* @param {Object} [options]
		* @throws {Error}
		*/
		_toTex(options) {
			throw new Error("_toTex not implemented for " + this.type);
		}
		/**
		* Helper used by `to...` functions.
		*/
		_getCustomString(options) {
			if (options && typeof options === "object") switch (typeof options.handler) {
				case "object":
				case "undefined": return;
				case "function": return options.handler(this, options);
				default: throw new TypeError("Object or function expected as callback");
			}
		}
		/**
		* Get identifier.
		* @return {string}
		*/
		getIdentifier() {
			return this.type;
		}
		/**
		* Get the content of the current Node.
		* @return {Node} node
		**/
		getContent() {
			return this;
		}
	}
	return Node;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/transform/utils/errorTransform.js
/**
* Transform zero-based indices to one-based indices in errors
* @param {Error} err
* @returns {Error | IndexError} Returns the transformed error
*/
function errorTransform(err) {
	if (err && err.isIndexError) return new IndexError(err.index + 1, err.min + 1, err.max !== void 0 ? err.max + 1 : void 0);
	return err;
}
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/utils/access.js
function accessFactory(_ref) {
	var { subset } = _ref;
	/**
	* Retrieve part of an object:
	*
	* - Retrieve a property from an object
	* - Retrieve a part of a string
	* - Retrieve a matrix subset
	*
	* @param {Object | Array | Matrix | string} object
	* @param {Index} index
	* @return {Object | Array | Matrix | string} Returns the subset
	*/
	return function access(object, index) {
		try {
			if (Array.isArray(object)) return subset(object, index);
			else if (object && typeof object.subset === "function") return object.subset(index);
			else if (typeof object === "string") return subset(object, index);
			else if (typeof object === "object") {
				if (!index.isObjectProperty()) throw new TypeError("Cannot apply a numeric index as object property");
				return getSafeProperty(object, index.getObjectProperty());
			} else throw new TypeError("Cannot apply index: unsupported type of object");
		} catch (err) {
			throw errorTransform(err);
		}
	};
}
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/AccessorNode.js
var name$21 = "AccessorNode";
var createAccessorNode = /* #__PURE__ */ factory(name$21, ["subset", "Node"], (_ref) => {
	var { subset, Node } = _ref;
	var access = accessFactory({ subset });
	/**
	* Are parenthesis needed?
	* @private
	*/
	function needParenthesis(node) {
		return !(isAccessorNode(node) || isArrayNode(node) || isConstantNode(node) || isFunctionNode(node) || isObjectNode(node) || isParenthesisNode(node) || isSymbolNode(node));
	}
	class AccessorNode extends Node {
		/**
		* @constructor AccessorNode
		* @extends {Node}
		* Access an object property or get a matrix subset
		*
		* @param {Node} object                 The object from which to retrieve
		*                                      a property or subset.
		* @param {IndexNode} index             IndexNode containing ranges
		* @param {boolean} [optionalChaining=false]
		*     Optional property, if the accessor was written as optional-chaining
		*     using `a?.b`, or `a?.["b"] with bracket notation.
		*     Forces evaluate to undefined if the given object is undefined or null.
		*/
		constructor(object, index) {
			var optionalChaining = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
			super();
			if (!isNode(object)) throw new TypeError("Node expected for parameter \"object\"");
			if (!isIndexNode(index)) throw new TypeError("IndexNode expected for parameter \"index\"");
			this.object = object;
			this.index = index;
			this.optionalChaining = optionalChaining;
		}
		get name() {
			if (this.index) return this.index.isObjectProperty() ? this.index.getObjectProperty() : "";
			else return this.object.name || "";
		}
		get type() {
			return name$21;
		}
		get isAccessorNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalObject = this.object._compile(math, argNames);
			var evalIndex = this.index._compile(math, argNames);
			var optionalChaining = this.optionalChaining;
			var prevOptionalChaining = isAccessorNode(this.object) && this.object.optionalChaining;
			if (this.index.isObjectProperty()) {
				var prop = this.index.getObjectProperty();
				return function evalAccessorNode(scope, args, context) {
					var ctx = context || {};
					var object = evalObject(scope, args, ctx);
					if (optionalChaining && object == null) {
						ctx.optionalShortCircuit = true;
						return;
					}
					if (prevOptionalChaining && ctx !== null && ctx !== void 0 && ctx.optionalShortCircuit) return;
					return getSafeProperty(object, prop);
				};
			} else return function evalAccessorNode(scope, args, context) {
				var ctx = context || {};
				var object = evalObject(scope, args, ctx);
				if (optionalChaining && object == null) {
					ctx.optionalShortCircuit = true;
					return;
				}
				if (prevOptionalChaining && ctx !== null && ctx !== void 0 && ctx.optionalShortCircuit) return;
				return access(object, evalIndex(scope, args, object));
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.object, "object", this);
			callback(this.index, "index", this);
		}
		/**
		* Create a new AccessorNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {AccessorNode} Returns a transformed copy of the node
		*/
		map(callback) {
			return new AccessorNode(this._ifNode(callback(this.object, "object", this)), this._ifNode(callback(this.index, "index", this)), this.optionalChaining);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {AccessorNode}
		*/
		clone() {
			return new AccessorNode(this.object, this.index, this.optionalChaining);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string}
		*/
		_toString(options) {
			var object = this.object.toString(options);
			if (needParenthesis(this.object)) object = "(" + object + ")";
			var optionalChaining = this.optionalChaining ? this.index.dotNotation ? "?" : "?." : "";
			return object + optionalChaining + this.index.toString(options);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string}
		*/
		_toHTML(options) {
			var object = this.object.toHTML(options);
			if (needParenthesis(this.object)) object = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + object + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			return object + this.index.toHTML(options);
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string}
		*/
		_toTex(options) {
			var object = this.object.toTex(options);
			if (needParenthesis(this.object)) object = "\\left(' + object + '\\right)";
			return object + this.index.toTex(options);
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$21,
				object: this.object,
				index: this.index,
				optionalChaining: this.optionalChaining
			};
		}
		/**
		* Instantiate an AccessorNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     `{"mathjs": "AccessorNode", object: ..., index: ...}`,
		*     where mathjs is optional
		* @returns {AccessorNode}
		*/
		static fromJSON(json) {
			return new AccessorNode(json.object, json.index, json.optionalChaining);
		}
	}
	(0, import_defineProperty.default)(AccessorNode, "name", name$21);
	return AccessorNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/ArrayNode.js
var name$20 = "ArrayNode";
var createArrayNode = /* #__PURE__ */ factory(name$20, ["Node"], (_ref) => {
	var { Node } = _ref;
	class ArrayNode extends Node {
		/**
		* @constructor ArrayNode
		* @extends {Node}
		* Holds an 1-dimensional array with items
		* @param {Node[]} [items]   1 dimensional array with items
		*/
		constructor(items) {
			super();
			this.items = items || [];
			if (!Array.isArray(this.items) || !this.items.every(isNode)) throw new TypeError("Array containing Nodes expected");
		}
		get type() {
			return name$20;
		}
		get isArrayNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalItems = map(this.items, function(item) {
				return item._compile(math, argNames);
			});
			if (math.config.matrix !== "Array") {
				var matrix = math.matrix;
				return function evalArrayNode(scope, args, context) {
					return matrix(map(evalItems, function(evalItem) {
						return evalItem(scope, args, context);
					}));
				};
			} else return function evalArrayNode(scope, args, context) {
				return map(evalItems, function(evalItem) {
					return evalItem(scope, args, context);
				});
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			for (var i = 0; i < this.items.length; i++) {
				var node = this.items[i];
				callback(node, "items[" + i + "]", this);
			}
		}
		/**
		* Create a new ArrayNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {ArrayNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var items = [];
			for (var i = 0; i < this.items.length; i++) items[i] = this._ifNode(callback(this.items[i], "items[" + i + "]", this));
			return new ArrayNode(items);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {ArrayNode}
		*/
		clone() {
			return new ArrayNode(this.items.slice(0));
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toString(options) {
			return "[" + this.items.map(function(node) {
				return node.toString(options);
			}).join(", ") + "]";
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$20,
				items: this.items
			};
		}
		/**
		* Instantiate an ArrayNode from its JSON representation
		* @param {Object} json  An object structured like
		*                       `{"mathjs": "ArrayNode", items: [...]}`,
		*                       where mathjs is optional
		* @returns {ArrayNode}
		*/
		static fromJSON(json) {
			return new ArrayNode(json.items);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toHTML(options) {
			return "<span class=\"math-parenthesis math-square-parenthesis\">[</span>" + this.items.map(function(node) {
				return node.toHTML(options);
			}).join("<span class=\"math-separator\">,</span>") + "<span class=\"math-parenthesis math-square-parenthesis\">]</span>";
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			function itemsToTex(items, nested) {
				var mixedItems = items.some(isArrayNode) && !items.every(isArrayNode);
				var itemsFormRow = nested || mixedItems;
				var itemSep = itemsFormRow ? "&" : "\\\\";
				var itemsTex = items.map(function(node) {
					if (node.items) return itemsToTex(node.items, !nested);
					else return node.toTex(options);
				}).join(itemSep);
				return mixedItems || !itemsFormRow || itemsFormRow && !nested ? "\\begin{bmatrix}" + itemsTex + "\\end{bmatrix}" : itemsTex;
			}
			return itemsToTex(this.items, false);
		}
	}
	(0, import_defineProperty.default)(ArrayNode, "name", name$20);
	return ArrayNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/utils/assign.js
function assignFactory(_ref) {
	var { subset, matrix } = _ref;
	/**
	* Replace part of an object:
	*
	* - Assign a property to an object
	* - Replace a part of a string
	* - Replace a matrix subset
	*
	* @param {Object | Array | Matrix | string} object
	* @param {Index} index
	* @param {*} value
	* @return {Object | Array | Matrix | string} Returns the original object
	*                                            except in case of a string
	*/
	return function assign(object, index, value) {
		try {
			if (Array.isArray(object)) {
				matrix(object).subset(index, value).valueOf().forEach((item, index) => {
					object[index] = item;
				});
				return object;
			} else if (object && typeof object.subset === "function") return object.subset(index, value);
			else if (typeof object === "string") return subset(object, index, value);
			else if (typeof object === "object") {
				if (!index.isObjectProperty()) throw TypeError("Cannot apply a numeric index as object property");
				setSafeProperty(object, index.getObjectProperty(), value);
				return object;
			} else throw new TypeError("Cannot apply index: unsupported type of object");
		} catch (err) {
			throw errorTransform(err);
		}
	};
}
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/AssignmentNode.js
var name$19 = "AssignmentNode";
var createAssignmentNode = /* #__PURE__ */ factory(name$19, [
	"subset",
	"?matrix",
	"Node"
], (_ref) => {
	var { subset, matrix, Node } = _ref;
	var access = accessFactory({ subset });
	var assign = assignFactory({
		subset,
		matrix
	});
	function needParenthesis(node, parenthesis, implicit) {
		if (!parenthesis) parenthesis = "keep";
		var precedence = getPrecedence(node, parenthesis, implicit);
		var exprPrecedence = getPrecedence(node.value, parenthesis, implicit);
		return parenthesis === "all" || exprPrecedence !== null && exprPrecedence <= precedence;
	}
	class AssignmentNode extends Node {
		/**
		* @constructor AssignmentNode
		* @extends {Node}
		*
		* Define a symbol, like `a=3.2`, update a property like `a.b=3.2`, or
		* replace a subset of a matrix like `A[2,2]=42`.
		*
		* Syntax:
		*
		*     new AssignmentNode(symbol, value)
		*     new AssignmentNode(object, index, value)
		*
		* Usage:
		*
		*    new AssignmentNode(new SymbolNode('a'), new ConstantNode(2))  // a=2
		*    new AssignmentNode(new SymbolNode('a'),
		*                       new IndexNode('b'),
		*                       new ConstantNode(2))   // a.b=2
		*    new AssignmentNode(new SymbolNode('a'),
		*                       new IndexNode(1, 2),
		*                       new ConstantNode(3))  // a[1,2]=3
		*
		* @param {SymbolNode | AccessorNode} object
		*     Object on which to assign a value
		* @param {IndexNode} [index=null]
		*     Index, property name or matrix index. Optional. If not provided
		*     and `object` is a SymbolNode, the property is assigned to the
		*     global scope.
		* @param {Node} value
		*     The value to be assigned
		*/
		constructor(object, index, value) {
			super();
			this.object = object;
			this.index = value ? index : null;
			this.value = value || index;
			if (!isSymbolNode(object) && !isAccessorNode(object)) throw new TypeError("SymbolNode or AccessorNode expected as \"object\"");
			if (isSymbolNode(object) && object.name === "end") throw new Error("Cannot assign to symbol \"end\"");
			if (this.index && !isIndexNode(this.index)) throw new TypeError("IndexNode expected as \"index\"");
			if (!isNode(this.value)) throw new TypeError("Node expected as \"value\"");
		}
		get name() {
			if (this.index) return this.index.isObjectProperty() ? this.index.getObjectProperty() : "";
			else return this.object.name || "";
		}
		get type() {
			return name$19;
		}
		get isAssignmentNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalObject = this.object._compile(math, argNames);
			var evalIndex = this.index ? this.index._compile(math, argNames) : null;
			var evalValue = this.value._compile(math, argNames);
			var name = this.object.name;
			if (!this.index) {
				if (!isSymbolNode(this.object)) throw new TypeError("SymbolNode expected as object");
				return function evalAssignmentNode(scope, args, context) {
					var value = evalValue(scope, args, context);
					scope.set(name, value);
					return value;
				};
			} else if (this.index.isObjectProperty()) {
				var prop = this.index.getObjectProperty();
				return function evalAssignmentNode(scope, args, context) {
					var object = evalObject(scope, args, context);
					var value = evalValue(scope, args, context);
					setSafeProperty(object, prop, value);
					return value;
				};
			} else if (isSymbolNode(this.object)) return function evalAssignmentNode(scope, args, context) {
				var childObject = evalObject(scope, args, context);
				var value = evalValue(scope, args, context);
				var index = evalIndex(scope, args, childObject);
				scope.set(name, assign(childObject, index, value));
				return value;
			};
			else {
				var evalParentObject = this.object.object._compile(math, argNames);
				if (this.object.index.isObjectProperty()) {
					var parentProp = this.object.index.getObjectProperty();
					return function evalAssignmentNode(scope, args, context) {
						var parent = evalParentObject(scope, args, context);
						var childObject = getSafeProperty(parent, parentProp);
						var index = evalIndex(scope, args, childObject);
						var value = evalValue(scope, args, context);
						setSafeProperty(parent, parentProp, assign(childObject, index, value));
						return value;
					};
				} else {
					var evalParentIndex = this.object.index._compile(math, argNames);
					return function evalAssignmentNode(scope, args, context) {
						var parent = evalParentObject(scope, args, context);
						var parentIndex = evalParentIndex(scope, args, parent);
						var childObject = access(parent, parentIndex);
						var index = evalIndex(scope, args, childObject);
						var value = evalValue(scope, args, context);
						assign(parent, parentIndex, assign(childObject, index, value));
						return value;
					};
				}
			}
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.object, "object", this);
			if (this.index) callback(this.index, "index", this);
			callback(this.value, "value", this);
		}
		/**
		* Create a new AssignmentNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {AssignmentNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var object = this._ifNode(callback(this.object, "object", this));
			var index = this.index ? this._ifNode(callback(this.index, "index", this)) : null;
			var value = this._ifNode(callback(this.value, "value", this));
			return new AssignmentNode(object, index, value);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {AssignmentNode}
		*/
		clone() {
			return new AssignmentNode(this.object, this.index, this.value);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string}
		*/
		_toString(options) {
			var object = this.object.toString(options);
			var index = this.index ? this.index.toString(options) : "";
			var value = this.value.toString(options);
			if (needParenthesis(this, options && options.parenthesis, options && options.implicit)) value = "(" + value + ")";
			return object + index + " = " + value;
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$19,
				object: this.object,
				index: this.index,
				value: this.value
			};
		}
		/**
		* Instantiate an AssignmentNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     `{"mathjs": "AssignmentNode", object: ..., index: ..., value: ...}`,
		*     where mathjs is optional
		* @returns {AssignmentNode}
		*/
		static fromJSON(json) {
			return new AssignmentNode(json.object, json.index, json.value);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string}
		*/
		_toHTML(options) {
			var object = this.object.toHTML(options);
			var index = this.index ? this.index.toHTML(options) : "";
			var value = this.value.toHTML(options);
			if (needParenthesis(this, options && options.parenthesis, options && options.implicit)) value = "<span class=\"math-paranthesis math-round-parenthesis\">(</span>" + value + "<span class=\"math-paranthesis math-round-parenthesis\">)</span>";
			return object + index + "<span class=\"math-operator math-assignment-operator math-variable-assignment-operator math-binary-operator\">=</span>" + value;
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string}
		*/
		_toTex(options) {
			var object = this.object.toTex(options);
			var index = this.index ? this.index.toTex(options) : "";
			var value = this.value.toTex(options);
			if (needParenthesis(this, options && options.parenthesis, options && options.implicit)) value = "\\left(".concat(value, "\\right)");
			return object + index + "=" + value;
		}
	}
	(0, import_defineProperty.default)(AssignmentNode, "name", name$19);
	return AssignmentNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/BlockNode.js
var name$18 = "BlockNode";
var createBlockNode = /* #__PURE__ */ factory(name$18, ["ResultSet", "Node"], (_ref) => {
	var { ResultSet, Node } = _ref;
	class BlockNode extends Node {
		/**
		* @constructor BlockNode
		* @extends {Node}
		* Holds a set with blocks
		* @param {Array.<{node: Node} | {node: Node, visible: boolean}>} blocks
		*            An array with blocks, where a block is constructed as an
		*            Object with properties block, which is a Node, and visible,
		*            which is a boolean. The property visible is optional and
		*            is true by default
		*/
		constructor(blocks) {
			super();
			if (!Array.isArray(blocks)) throw new Error("Array expected");
			this.blocks = blocks.map(function(block) {
				var node = block && block.node;
				var visible = block && block.visible !== void 0 ? block.visible : true;
				if (!isNode(node)) throw new TypeError("Property \"node\" must be a Node");
				if (typeof visible !== "boolean") throw new TypeError("Property \"visible\" must be a boolean");
				return {
					node,
					visible
				};
			});
		}
		get type() {
			return name$18;
		}
		get isBlockNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalBlocks = map(this.blocks, function(block) {
				return {
					evaluate: block.node._compile(math, argNames),
					visible: block.visible
				};
			});
			return function evalBlockNodes(scope, args, context) {
				var results = [];
				forEach(evalBlocks, function evalBlockNode(block) {
					var result = block.evaluate(scope, args, context);
					if (block.visible) results.push(result);
				});
				return new ResultSet(results);
			};
		}
		/**
		* Execute a callback for each of the child blocks of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			for (var i = 0; i < this.blocks.length; i++) callback(this.blocks[i].node, "blocks[" + i + "].node", this);
		}
		/**
		* Create a new BlockNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {BlockNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var blocks = [];
			for (var i = 0; i < this.blocks.length; i++) {
				var block = this.blocks[i];
				var node = this._ifNode(callback(block.node, "blocks[" + i + "].node", this));
				blocks[i] = {
					node,
					visible: block.visible
				};
			}
			return new BlockNode(blocks);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {BlockNode}
		*/
		clone() {
			var blocks = this.blocks.map(function(block) {
				return {
					node: block.node,
					visible: block.visible
				};
			});
			return new BlockNode(blocks);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toString(options) {
			return this.blocks.map(function(param) {
				return param.node.toString(options) + (param.visible ? "" : ";");
			}).join("\n");
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$18,
				blocks: this.blocks
			};
		}
		/**
		* Instantiate an BlockNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     `{"mathjs": "BlockNode", blocks: [{node: ..., visible: false}, ...]}`,
		*     where mathjs is optional
		* @returns {BlockNode}
		*/
		static fromJSON(json) {
			return new BlockNode(json.blocks);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toHTML(options) {
			return this.blocks.map(function(param) {
				return param.node.toHTML(options) + (param.visible ? "" : "<span class=\"math-separator\">;</span>");
			}).join("<span class=\"math-separator\"><br /></span>");
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			return this.blocks.map(function(param) {
				return param.node.toTex(options) + (param.visible ? "" : ";");
			}).join("\\;\\;\n");
		}
	}
	(0, import_defineProperty.default)(BlockNode, "name", name$18);
	return BlockNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/ConditionalNode.js
var name$17 = "ConditionalNode";
var createConditionalNode = /* #__PURE__ */ factory(name$17, ["Node"], (_ref) => {
	var { Node } = _ref;
	/**
	* Test whether a condition is met
	* @param {*} condition
	* @returns {boolean} true if condition is true or non-zero, else false
	*/
	function testCondition(condition) {
		if (typeof condition === "number" || typeof condition === "boolean" || typeof condition === "string") return !!condition;
		if (condition) {
			if (isBigNumber(condition)) return !condition.isZero();
			if (isComplex(condition)) return !!(condition.re || condition.im);
			if (isUnit(condition)) return !!condition.value;
		}
		if (condition === null || condition === void 0) return false;
		throw new TypeError("Unsupported type of condition \"" + typeOf(condition) + "\"");
	}
	class ConditionalNode extends Node {
		/**
		* A lazy evaluating conditional operator: 'condition ? trueExpr : falseExpr'
		*
		* @param {Node} condition   Condition, must result in a boolean
		* @param {Node} trueExpr    Expression evaluated when condition is true
		* @param {Node} falseExpr   Expression evaluated when condition is true
		*
		* @constructor ConditionalNode
		* @extends {Node}
		*/
		constructor(condition, trueExpr, falseExpr) {
			super();
			if (!isNode(condition)) throw new TypeError("Parameter condition must be a Node");
			if (!isNode(trueExpr)) throw new TypeError("Parameter trueExpr must be a Node");
			if (!isNode(falseExpr)) throw new TypeError("Parameter falseExpr must be a Node");
			this.condition = condition;
			this.trueExpr = trueExpr;
			this.falseExpr = falseExpr;
		}
		get type() {
			return name$17;
		}
		get isConditionalNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalCondition = this.condition._compile(math, argNames);
			var evalTrueExpr = this.trueExpr._compile(math, argNames);
			var evalFalseExpr = this.falseExpr._compile(math, argNames);
			return function evalConditionalNode(scope, args, context) {
				return testCondition(evalCondition(scope, args, context)) ? evalTrueExpr(scope, args, context) : evalFalseExpr(scope, args, context);
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.condition, "condition", this);
			callback(this.trueExpr, "trueExpr", this);
			callback(this.falseExpr, "falseExpr", this);
		}
		/**
		* Create a new ConditionalNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {ConditionalNode} Returns a transformed copy of the node
		*/
		map(callback) {
			return new ConditionalNode(this._ifNode(callback(this.condition, "condition", this)), this._ifNode(callback(this.trueExpr, "trueExpr", this)), this._ifNode(callback(this.falseExpr, "falseExpr", this)));
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {ConditionalNode}
		*/
		clone() {
			return new ConditionalNode(this.condition, this.trueExpr, this.falseExpr);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var precedence = getPrecedence(this, parenthesis, options && options.implicit);
			var condition = this.condition.toString(options);
			var conditionPrecedence = getPrecedence(this.condition, parenthesis, options && options.implicit);
			if (parenthesis === "all" || this.condition.type === "OperatorNode" || conditionPrecedence !== null && conditionPrecedence <= precedence) condition = "(" + condition + ")";
			var trueExpr = this.trueExpr.toString(options);
			var truePrecedence = getPrecedence(this.trueExpr, parenthesis, options && options.implicit);
			if (parenthesis === "all" || this.trueExpr.type === "OperatorNode" || truePrecedence !== null && truePrecedence <= precedence) trueExpr = "(" + trueExpr + ")";
			var falseExpr = this.falseExpr.toString(options);
			var falsePrecedence = getPrecedence(this.falseExpr, parenthesis, options && options.implicit);
			if (parenthesis === "all" || this.falseExpr.type === "OperatorNode" || falsePrecedence !== null && falsePrecedence <= precedence) falseExpr = "(" + falseExpr + ")";
			return condition + " ? " + trueExpr + " : " + falseExpr;
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$17,
				condition: this.condition,
				trueExpr: this.trueExpr,
				falseExpr: this.falseExpr
			};
		}
		/**
		* Instantiate an ConditionalNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     ```
		*     {"mathjs": "ConditionalNode",
		*      "condition": ...,
		*      "trueExpr": ...,
		*      "falseExpr": ...}
		*     ```
		*     where mathjs is optional
		* @returns {ConditionalNode}
		*/
		static fromJSON(json) {
			return new ConditionalNode(json.condition, json.trueExpr, json.falseExpr);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var precedence = getPrecedence(this, parenthesis, options && options.implicit);
			var condition = this.condition.toHTML(options);
			var conditionPrecedence = getPrecedence(this.condition, parenthesis, options && options.implicit);
			if (parenthesis === "all" || this.condition.type === "OperatorNode" || conditionPrecedence !== null && conditionPrecedence <= precedence) condition = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + condition + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			var trueExpr = this.trueExpr.toHTML(options);
			var truePrecedence = getPrecedence(this.trueExpr, parenthesis, options && options.implicit);
			if (parenthesis === "all" || this.trueExpr.type === "OperatorNode" || truePrecedence !== null && truePrecedence <= precedence) trueExpr = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + trueExpr + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			var falseExpr = this.falseExpr.toHTML(options);
			var falsePrecedence = getPrecedence(this.falseExpr, parenthesis, options && options.implicit);
			if (parenthesis === "all" || this.falseExpr.type === "OperatorNode" || falsePrecedence !== null && falsePrecedence <= precedence) falseExpr = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + falseExpr + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			return condition + "<span class=\"math-operator math-conditional-operator\">?</span>" + trueExpr + "<span class=\"math-operator math-conditional-operator\">:</span>" + falseExpr;
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			return "\\begin{cases} {" + this.trueExpr.toTex(options) + "}, &\\quad{\\text{if }\\;" + this.condition.toTex(options) + "}\\\\{" + this.falseExpr.toTex(options) + "}, &\\quad{\\text{otherwise}}\\end{cases}";
		}
	}
	(0, import_defineProperty.default)(ConditionalNode, "name", name$17);
	return ConditionalNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/utils/latex.js
var import_dist = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var _extends = Object.assign || function(target) {
		for (var i = 1; i < arguments.length; i++) {
			var source = arguments[i];
			for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
		}
		return target;
	};
	var defaultEscapes = {
		"{": "\\{",
		"}": "\\}",
		"\\": "\\textbackslash{}",
		"#": "\\#",
		$: "\\$",
		"%": "\\%",
		"&": "\\&",
		"^": "\\textasciicircum{}",
		_: "\\_",
		"~": "\\textasciitilde{}"
	};
	var formatEscapes = {
		"–": "\\--",
		"—": "\\---",
		" ": "~",
		"	": "\\qquad{}",
		"\r\n": "\\newline{}",
		"\n": "\\newline{}"
	};
	var defaultEscapeMapFn = function defaultEscapeMapFn(defaultEscapes, formatEscapes) {
		return _extends({}, defaultEscapes, formatEscapes);
	};
	/**
	* Escape a string to be used in LaTeX documents.
	* @param {string} str the string to be escaped.
	* @param {boolean} params.preserveFormatting whether formatting escapes should
	*  be performed (default: false).
	* @param {function} params.escapeMapFn the function to modify the escape maps.
	* @return {string} the escaped string, ready to be used in LaTeX.
	*/
	module.exports = function(str) {
		var _ref = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, _ref$preserveFormatti = _ref.preserveFormatting, preserveFormatting = _ref$preserveFormatti === void 0 ? false : _ref$preserveFormatti, _ref$escapeMapFn = _ref.escapeMapFn, escapeMapFn = _ref$escapeMapFn === void 0 ? defaultEscapeMapFn : _ref$escapeMapFn;
		var runningStr = String(str);
		var result = "";
		var escapes = escapeMapFn(_extends({}, defaultEscapes), preserveFormatting ? _extends({}, formatEscapes) : {});
		var escapeKeys = Object.keys(escapes);
		var _loop = function _loop() {
			var specialCharFound = false;
			escapeKeys.forEach(function(key, index) {
				if (specialCharFound) return;
				if (runningStr.length >= key.length && runningStr.slice(0, key.length) === key) {
					result += escapes[escapeKeys[index]];
					runningStr = runningStr.slice(key.length, runningStr.length);
					specialCharFound = true;
				}
			});
			if (!specialCharFound) {
				result += runningStr.slice(0, 1);
				runningStr = runningStr.slice(1, runningStr.length);
			}
		};
		while (runningStr) _loop();
		return result;
	};
})))(), 1);
var latexSymbols = {
	Alpha: "A",
	alpha: "\\alpha",
	Beta: "B",
	beta: "\\beta",
	Gamma: "\\Gamma",
	gamma: "\\gamma",
	Delta: "\\Delta",
	delta: "\\delta",
	Epsilon: "E",
	epsilon: "\\epsilon",
	varepsilon: "\\varepsilon",
	Zeta: "Z",
	zeta: "\\zeta",
	Eta: "H",
	eta: "\\eta",
	Theta: "\\Theta",
	theta: "\\theta",
	vartheta: "\\vartheta",
	Iota: "I",
	iota: "\\iota",
	Kappa: "K",
	kappa: "\\kappa",
	varkappa: "\\varkappa",
	Lambda: "\\Lambda",
	lambda: "\\lambda",
	Mu: "M",
	mu: "\\mu",
	Nu: "N",
	nu: "\\nu",
	Xi: "\\Xi",
	xi: "\\xi",
	Omicron: "O",
	omicron: "o",
	Pi: "\\Pi",
	pi: "\\pi",
	varpi: "\\varpi",
	Rho: "P",
	rho: "\\rho",
	varrho: "\\varrho",
	Sigma: "\\Sigma",
	sigma: "\\sigma",
	varsigma: "\\varsigma",
	Tau: "T",
	tau: "\\tau",
	Upsilon: "\\Upsilon",
	upsilon: "\\upsilon",
	Phi: "\\Phi",
	phi: "\\phi",
	varphi: "\\varphi",
	Chi: "X",
	chi: "\\chi",
	Psi: "\\Psi",
	psi: "\\psi",
	Omega: "\\Omega",
	omega: "\\omega",
	true: "\\mathrm{True}",
	false: "\\mathrm{False}",
	i: "i",
	inf: "\\infty",
	Inf: "\\infty",
	infinity: "\\infty",
	Infinity: "\\infty",
	oo: "\\infty",
	lim: "\\lim",
	undefined: "\\mathbf{?}"
};
var latexOperators = {
	transpose: "^\\top",
	ctranspose: "^H",
	factorial: "!",
	pow: "^",
	dotPow: ".^\\wedge",
	unaryPlus: "+",
	unaryMinus: "-",
	bitNot: "\\~",
	not: "\\neg",
	multiply: "\\cdot",
	divide: "\\frac",
	dotMultiply: ".\\cdot",
	dotDivide: ".:",
	mod: "\\mod",
	add: "+",
	subtract: "-",
	to: "\\rightarrow",
	leftShift: "<<",
	rightArithShift: ">>",
	rightLogShift: ">>>",
	equal: "=",
	unequal: "\\neq",
	smaller: "<",
	larger: ">",
	smallerEq: "\\leq",
	largerEq: "\\geq",
	bitAnd: "\\&",
	bitXor: "\\underline{|}",
	bitOr: "|",
	and: "\\wedge",
	xor: "\\veebar",
	or: "\\vee"
};
var latexFunctions = {
	abs: { 1: "\\left|${args[0]}\\right|" },
	add: { 2: "\\left(${args[0]}".concat(latexOperators.add, "${args[1]}\\right)") },
	cbrt: { 1: "\\sqrt[3]{${args[0]}}" },
	ceil: { 1: "\\left\\lceil${args[0]}\\right\\rceil" },
	cube: { 1: "\\left(${args[0]}\\right)^3" },
	divide: { 2: "\\frac{${args[0]}}{${args[1]}}" },
	dotDivide: { 2: "\\left(${args[0]}".concat(latexOperators.dotDivide, "${args[1]}\\right)") },
	dotMultiply: { 2: "\\left(${args[0]}".concat(latexOperators.dotMultiply, "${args[1]}\\right)") },
	dotPow: { 2: "\\left(${args[0]}".concat(latexOperators.dotPow, "${args[1]}\\right)") },
	exp: { 1: "\\exp\\left(${args[0]}\\right)" },
	expm1: "\\left(e".concat(latexOperators.pow, "{${args[0]}}-1\\right)"),
	fix: { 1: "\\mathrm{${name}}\\left(${args[0]}\\right)" },
	floor: { 1: "\\left\\lfloor${args[0]}\\right\\rfloor" },
	fraction: { 2: "\\frac{${args[0]}}{${args[1]}}" },
	gcd: "\\gcd\\left(${args}\\right)",
	hypot: "\\hypot\\left(${args}\\right)",
	log: {
		1: "\\ln\\left(${args[0]}\\right)",
		2: "\\log_{${args[1]}}\\left(${args[0]}\\right)"
	},
	log10: { 1: "\\log_{10}\\left(${args[0]}\\right)" },
	log1p: {
		1: "\\ln\\left(${args[0]}+1\\right)",
		2: "\\log_{${args[1]}}\\left(${args[0]}+1\\right)"
	},
	log2: "\\log_{2}\\left(${args[0]}\\right)",
	mod: { 2: "\\left(${args[0]}".concat(latexOperators.mod, "${args[1]}\\right)") },
	multiply: { 2: "\\left(${args[0]}".concat(latexOperators.multiply, "${args[1]}\\right)") },
	norm: {
		1: "\\left\\|${args[0]}\\right\\|",
		2: void 0
	},
	nthRoot: { 2: "\\sqrt[${args[1]}]{${args[0]}}" },
	nthRoots: { 2: "\\{y : y^${args[1]} = {${args[0]}}\\}" },
	pow: { 2: "\\left(${args[0]}\\right)".concat(latexOperators.pow, "{${args[1]}}") },
	round: {
		1: "\\left\\lfloor${args[0]}\\right\\rceil",
		2: void 0
	},
	sign: { 1: "\\mathrm{${name}}\\left(${args[0]}\\right)" },
	sqrt: { 1: "\\sqrt{${args[0]}}" },
	square: { 1: "\\left(${args[0]}\\right)^2" },
	subtract: { 2: "\\left(${args[0]}".concat(latexOperators.subtract, "${args[1]}\\right)") },
	unaryMinus: { 1: "".concat(latexOperators.unaryMinus, "\\left(${args[0]}\\right)") },
	unaryPlus: { 1: "".concat(latexOperators.unaryPlus, "\\left(${args[0]}\\right)") },
	bitAnd: { 2: "\\left(${args[0]}".concat(latexOperators.bitAnd, "${args[1]}\\right)") },
	bitNot: { 1: latexOperators.bitNot + "\\left(${args[0]}\\right)" },
	bitOr: { 2: "\\left(${args[0]}".concat(latexOperators.bitOr, "${args[1]}\\right)") },
	bitXor: { 2: "\\left(${args[0]}".concat(latexOperators.bitXor, "${args[1]}\\right)") },
	leftShift: { 2: "\\left(${args[0]}".concat(latexOperators.leftShift, "${args[1]}\\right)") },
	rightArithShift: { 2: "\\left(${args[0]}".concat(latexOperators.rightArithShift, "${args[1]}\\right)") },
	rightLogShift: { 2: "\\left(${args[0]}".concat(latexOperators.rightLogShift, "${args[1]}\\right)") },
	bellNumbers: { 1: "\\mathrm{B}_{${args[0]}}" },
	catalan: { 1: "\\mathrm{C}_{${args[0]}}" },
	stirlingS2: { 2: "\\mathrm{S}\\left(${args}\\right)" },
	arg: { 1: "\\arg\\left(${args[0]}\\right)" },
	conj: { 1: "\\left(${args[0]}\\right)^*" },
	im: { 1: "\\Im\\left\\lbrace${args[0]}\\right\\rbrace" },
	re: { 1: "\\Re\\left\\lbrace${args[0]}\\right\\rbrace" },
	and: { 2: "\\left(${args[0]}".concat(latexOperators.and, "${args[1]}\\right)") },
	not: { 1: latexOperators.not + "\\left(${args[0]}\\right)" },
	or: { 2: "\\left(${args[0]}".concat(latexOperators.or, "${args[1]}\\right)") },
	xor: { 2: "\\left(${args[0]}".concat(latexOperators.xor, "${args[1]}\\right)") },
	cross: { 2: "\\left(${args[0]}\\right)\\times\\left(${args[1]}\\right)" },
	ctranspose: { 1: "\\left(${args[0]}\\right)".concat(latexOperators.ctranspose) },
	det: { 1: "\\det\\left(${args[0]}\\right)" },
	dot: { 2: "\\left(${args[0]}\\cdot${args[1]}\\right)" },
	expm: { 1: "\\exp\\left(${args[0]}\\right)" },
	inv: { 1: "\\left(${args[0]}\\right)^{-1}" },
	pinv: { 1: "\\left(${args[0]}\\right)^{+}" },
	sqrtm: { 1: "{${args[0]}}".concat(latexOperators.pow, "{\\frac{1}{2}}") },
	trace: { 1: "\\mathrm{tr}\\left(${args[0]}\\right)" },
	transpose: { 1: "\\left(${args[0]}\\right)".concat(latexOperators.transpose) },
	combinations: { 2: "\\binom{${args[0]}}{${args[1]}}" },
	combinationsWithRep: { 2: "\\left(\\!\\!{\\binom{${args[0]}}{${args[1]}}}\\!\\!\\right)" },
	factorial: { 1: "\\left(${args[0]}\\right)".concat(latexOperators.factorial) },
	gamma: { 1: "\\Gamma\\left(${args[0]}\\right)" },
	lgamma: { 1: "\\ln\\Gamma\\left(${args[0]}\\right)" },
	equal: { 2: "\\left(${args[0]}".concat(latexOperators.equal, "${args[1]}\\right)") },
	larger: { 2: "\\left(${args[0]}".concat(latexOperators.larger, "${args[1]}\\right)") },
	largerEq: { 2: "\\left(${args[0]}".concat(latexOperators.largerEq, "${args[1]}\\right)") },
	smaller: { 2: "\\left(${args[0]}".concat(latexOperators.smaller, "${args[1]}\\right)") },
	smallerEq: { 2: "\\left(${args[0]}".concat(latexOperators.smallerEq, "${args[1]}\\right)") },
	unequal: { 2: "\\left(${args[0]}".concat(latexOperators.unequal, "${args[1]}\\right)") },
	erf: { 1: "erf\\left(${args[0]}\\right)" },
	max: "\\max\\left(${args}\\right)",
	min: "\\min\\left(${args}\\right)",
	variance: "\\mathrm{Var}\\left(${args}\\right)",
	acos: { 1: "\\cos^{-1}\\left(${args[0]}\\right)" },
	acosh: { 1: "\\cosh^{-1}\\left(${args[0]}\\right)" },
	acot: { 1: "\\cot^{-1}\\left(${args[0]}\\right)" },
	acoth: { 1: "\\coth^{-1}\\left(${args[0]}\\right)" },
	acsc: { 1: "\\csc^{-1}\\left(${args[0]}\\right)" },
	acsch: { 1: "\\mathrm{csch}^{-1}\\left(${args[0]}\\right)" },
	asec: { 1: "\\sec^{-1}\\left(${args[0]}\\right)" },
	asech: { 1: "\\mathrm{sech}^{-1}\\left(${args[0]}\\right)" },
	asin: { 1: "\\sin^{-1}\\left(${args[0]}\\right)" },
	asinh: { 1: "\\sinh^{-1}\\left(${args[0]}\\right)" },
	atan: { 1: "\\tan^{-1}\\left(${args[0]}\\right)" },
	atan2: { 2: "\\mathrm{atan2}\\left(${args}\\right)" },
	atanh: { 1: "\\tanh^{-1}\\left(${args[0]}\\right)" },
	cos: { 1: "\\cos\\left(${args[0]}\\right)" },
	cosh: { 1: "\\cosh\\left(${args[0]}\\right)" },
	cot: { 1: "\\cot\\left(${args[0]}\\right)" },
	coth: { 1: "\\coth\\left(${args[0]}\\right)" },
	csc: { 1: "\\csc\\left(${args[0]}\\right)" },
	csch: { 1: "\\mathrm{csch}\\left(${args[0]}\\right)" },
	sec: { 1: "\\sec\\left(${args[0]}\\right)" },
	sech: { 1: "\\mathrm{sech}\\left(${args[0]}\\right)" },
	sin: { 1: "\\sin\\left(${args[0]}\\right)" },
	sinh: { 1: "\\sinh\\left(${args[0]}\\right)" },
	tan: { 1: "\\tan\\left(${args[0]}\\right)" },
	tanh: { 1: "\\tanh\\left(${args[0]}\\right)" },
	to: { 2: "\\left(${args[0]}".concat(latexOperators.to, "${args[1]}\\right)") },
	numeric: function numeric(node, options) {
		return node.args[0].toTex();
	},
	number: {
		0: "0",
		1: "\\left(${args[0]}\\right)",
		2: "\\left(\\left(${args[0]}\\right)${args[1]}\\right)"
	},
	string: {
		0: "\\mathtt{\"\"}",
		1: "\\mathrm{string}\\left(${args[0]}\\right)"
	},
	bignumber: {
		0: "0",
		1: "\\left(${args[0]}\\right)"
	},
	bigint: {
		0: "0",
		1: "\\left(${args[0]}\\right)"
	},
	complex: {
		0: "0",
		1: "\\left(${args[0]}\\right)",
		2: "\\left(\\left(${args[0]}\\right)+".concat(latexSymbols.i, "\\cdot\\left(${args[1]}\\right)\\right)")
	},
	matrix: {
		0: "\\begin{bmatrix}\\end{bmatrix}",
		1: "\\left(${args[0]}\\right)",
		2: "\\left(${args[0]}\\right)"
	},
	sparse: {
		0: "\\begin{bsparse}\\end{bsparse}",
		1: "\\left(${args[0]}\\right)"
	},
	unit: {
		1: "\\left(${args[0]}\\right)",
		2: "\\left(\\left(${args[0]}\\right)${args[1]}\\right)"
	}
};
var defaultTemplate = "\\mathrm{${name}}\\left(${args}\\right)";
var latexUnits = { deg: "^\\circ" };
function escapeLatex(string) {
	return (0, import_dist.default)(string, { preserveFormatting: true });
}
function toSymbol(name, isUnit) {
	isUnit = typeof isUnit === "undefined" ? false : isUnit;
	if (isUnit) {
		if (hasOwnProperty(latexUnits, name)) return latexUnits[name];
		return "\\mathrm{" + escapeLatex(name) + "}";
	}
	if (hasOwnProperty(latexSymbols, name)) return latexSymbols[name];
	return escapeLatex(name);
}
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/ConstantNode.js
var name$16 = "ConstantNode";
var createConstantNode = /* #__PURE__ */ factory(name$16, ["Node", "isBounded"], (_ref) => {
	var { Node, isBounded } = _ref;
	class ConstantNode extends Node {
		/**
		* A ConstantNode holds a constant value like a number or string.
		*
		* Usage:
		*
		*     new ConstantNode(2.3)
		*     new ConstantNode('hello')
		*
		* @param {*} value    Value can be any type (number, BigNumber, bigint, string, ...)
		* @constructor ConstantNode
		* @extends {Node}
		*/
		constructor(value) {
			super();
			this.value = value;
		}
		get type() {
			return name$16;
		}
		get isConstantNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var value = this.value;
			return function evalConstantNode() {
				return value;
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {}
		/**
		* Create a new ConstantNode with children produced by the given callback.
		* Trivial because there are no children.
		* @param {function(child: Node, path: string, parent: Node) : Node} callback
		* @returns {ConstantNode} Returns a clone of the node
		*/
		map(callback) {
			return this.clone();
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {ConstantNode}
		*/
		clone() {
			return new ConstantNode(this.value);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			return format(this.value, options);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var value = this._toString(options);
			switch (typeOf(this.value)) {
				case "number":
				case "bigint":
				case "BigNumber":
				case "Fraction": return "<span class=\"math-number\">" + value + "</span>";
				case "string": return "<span class=\"math-string\">" + value + "</span>";
				case "boolean": return "<span class=\"math-boolean\">" + value + "</span>";
				case "null": return "<span class=\"math-null-symbol\">" + value + "</span>";
				case "undefined": return "<span class=\"math-undefined\">" + value + "</span>";
				default: return "<span class=\"math-symbol\">" + value + "</span>";
			}
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$16,
				value: this.value
			};
		}
		/**
		* Instantiate a ConstantNode from its JSON representation
		* @param {Object} json  An object structured like
		*                       `{"mathjs": "SymbolNode", value: 2.3}`,
		*                       where mathjs is optional
		* @returns {ConstantNode}
		*/
		static fromJSON(json) {
			return new ConstantNode(json.value);
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var value = this._toString(options);
			switch (typeOf(this.value)) {
				case "string": return "\\mathtt{" + escapeLatex(value) + "}";
				case "number":
				case "BigNumber":
					if (!isBounded(this.value)) return this.value.valueOf() < 0 ? "-\\infty" : "\\infty";
					var index = value.toLowerCase().indexOf("e");
					if (index !== -1) return value.substring(0, index) + "\\cdot10^{" + value.substring(index + 1) + "}";
					return value;
				case "bigint": return value.toString();
				case "Fraction": return this.value.toLatex();
				default: return value;
			}
		}
	}
	(0, import_defineProperty.default)(ConstantNode, "name", name$16);
	return ConstantNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/FunctionAssignmentNode.js
var name$15 = "FunctionAssignmentNode";
var createFunctionAssignmentNode = /* #__PURE__ */ factory(name$15, ["typed", "Node"], (_ref) => {
	var { typed, Node } = _ref;
	/**
	* Is parenthesis needed?
	* @param {Node} node
	* @param {Object} parenthesis
	* @param {string} implicit
	* @private
	*/
	function needParenthesis(node, parenthesis, implicit) {
		var precedence = getPrecedence(node, parenthesis, implicit);
		var exprPrecedence = getPrecedence(node.expr, parenthesis, implicit);
		return parenthesis === "all" || exprPrecedence !== null && exprPrecedence <= precedence;
	}
	class FunctionAssignmentNode extends Node {
		/**
		* @constructor FunctionAssignmentNode
		* @extends {Node}
		* Function assignment
		*
		* @param {string} name           Function name
		* @param {string[] | Array.<{name: string, type: string}>} params
		*                                Array with function parameter names, or an
		*                                array with objects containing the name
		*                                and type of the parameter
		* @param {Node} expr             The function expression
		*/
		constructor(name, params, expr) {
			super();
			if (typeof name !== "string") throw new TypeError("String expected for parameter \"name\"");
			if (!Array.isArray(params)) throw new TypeError("Array containing strings or objects expected for parameter \"params\"");
			if (!isNode(expr)) throw new TypeError("Node expected for parameter \"expr\"");
			if (keywords.has(name)) throw new Error("Illegal function name, \"" + name + "\" is a reserved keyword");
			var paramNames = /* @__PURE__ */ new Set();
			for (var param of params) {
				var _name = typeof param === "string" ? param : param.name;
				if (paramNames.has(_name)) throw new Error("Duplicate parameter name \"".concat(_name, "\""));
				else paramNames.add(_name);
			}
			this.name = name;
			this.params = params.map(function(param) {
				return param && param.name || param;
			});
			this.types = params.map(function(param) {
				return param && param.type || "any";
			});
			this.expr = expr;
		}
		get type() {
			return name$15;
		}
		get isFunctionAssignmentNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var childArgNames = Object.create(argNames);
			forEach(this.params, function(param) {
				childArgNames[param] = true;
			});
			var expr = this.expr;
			var evalExpr = expr._compile(math, childArgNames);
			var name = this.name;
			var params = this.params;
			var signature = join$1(this.types, ",");
			var syntax = name + "(" + join$1(this.params, ", ") + ")";
			return function evalFunctionAssignmentNode(scope, args, context) {
				var signatures = {};
				signatures[signature] = function() {
					var childArgs = Object.create(args);
					for (var i = 0; i < params.length; i++) childArgs[params[i]] = arguments[i];
					return evalExpr(scope, childArgs, context);
				};
				var fn = typed(name, signatures);
				fn.syntax = syntax;
				fn.expr = expr.toString();
				scope.set(name, fn);
				return fn;
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.expr, "expr", this);
		}
		/**
		* Create a new FunctionAssignmentNode whose children are the results of
		* calling the provided callback function for each child of the original
		* node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {FunctionAssignmentNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var expr = this._ifNode(callback(this.expr, "expr", this));
			return new FunctionAssignmentNode(this.name, this.params.slice(0), expr);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {FunctionAssignmentNode}
		*/
		clone() {
			return new FunctionAssignmentNode(this.name, this.params.slice(0), this.expr);
		}
		/**
		* get string representation
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var expr = this.expr.toString(options);
			if (needParenthesis(this, parenthesis, options && options.implicit)) expr = "(" + expr + ")";
			return this.name + "(" + this.params.join(", ") + ") = " + expr;
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			var types = this.types;
			return {
				mathjs: name$15,
				name: this.name,
				params: this.params.map(function(param, index) {
					return {
						name: param,
						type: types[index]
					};
				}),
				expr: this.expr
			};
		}
		/**
		* Instantiate an FunctionAssignmentNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     ```
		*     {"mathjs": "FunctionAssignmentNode",
		*      name: ..., params: ..., expr: ...}
		*     ```
		*     where mathjs is optional
		* @returns {FunctionAssignmentNode}
		*/
		static fromJSON(json) {
			return new FunctionAssignmentNode(json.name, json.params, json.expr);
		}
		/**
		* get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var params = [];
			for (var i = 0; i < this.params.length; i++) params.push("<span class=\"math-symbol math-parameter\">" + escape(this.params[i]) + "</span>");
			var expr = this.expr.toHTML(options);
			if (needParenthesis(this, parenthesis, options && options.implicit)) expr = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + expr + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			return "<span class=\"math-function\">" + escape(this.name) + "</span><span class=\"math-parenthesis math-round-parenthesis\">(</span>" + params.join("<span class=\"math-separator\">,</span>") + "<span class=\"math-parenthesis math-round-parenthesis\">)</span><span class=\"math-operator math-assignment-operator math-variable-assignment-operator math-binary-operator\">=</span>" + expr;
		}
		/**
		* get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var expr = this.expr.toTex(options);
			if (needParenthesis(this, parenthesis, options && options.implicit)) expr = "\\left(".concat(expr, "\\right)");
			return "\\mathrm{" + this.name + "}\\left(" + this.params.map(toSymbol).join(",") + "\\right)=" + expr;
		}
	}
	(0, import_defineProperty.default)(FunctionAssignmentNode, "name", name$15);
	return FunctionAssignmentNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/IndexNode.js
var name$14 = "IndexNode";
var createIndexNode = /* #__PURE__ */ factory(name$14, ["Node", "size"], (_ref) => {
	var { Node, size } = _ref;
	class IndexNode extends Node {
		/**
		* @constructor IndexNode
		* @extends Node
		*
		* Describes a subset of a matrix or an object property.
		* Cannot be used on its own, needs to be used within an AccessorNode or
		* AssignmentNode.
		*
		* @param {Node[]} dimensions
		* @param {boolean} [dotNotation=false]
		*     Optional property describing whether this index was written using dot
		*     notation like `a.b`, or using bracket notation like `a["b"]`
		*     (which is the default). This property is used for string conversion.
		*/
		constructor(dimensions, dotNotation) {
			super();
			this.dimensions = dimensions;
			this.dotNotation = dotNotation || false;
			if (!Array.isArray(dimensions) || !dimensions.every(isNode)) throw new TypeError("Array containing Nodes expected for parameter \"dimensions\"");
			if (this.dotNotation && !this.isObjectProperty()) throw new Error("dotNotation only applicable for object properties");
		}
		get type() {
			return name$14;
		}
		get isIndexNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalDimensions = map(this.dimensions, function(dimension, i) {
				if (dimension.filter((node) => node.isSymbolNode && node.name === "end").length > 0) {
					var childArgNames = Object.create(argNames);
					childArgNames.end = true;
					var _evalDimension = dimension._compile(math, childArgNames);
					return function evalDimension(scope, args, context) {
						if (!isMatrix(context) && !isArray(context) && !isString(context)) throw new TypeError("Cannot resolve \"end\": context must be a Matrix, Array, or string but is " + typeOf(context));
						var s = size(context);
						var childArgs = Object.create(args);
						childArgs.end = s[i];
						return _evalDimension(scope, childArgs, context);
					};
				} else return dimension._compile(math, argNames);
			});
			var index = getSafeProperty(math, "index");
			return function evalIndexNode(scope, args, context) {
				return index(...map(evalDimensions, function(evalDimension) {
					return evalDimension(scope, args, context);
				}));
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			for (var i = 0; i < this.dimensions.length; i++) callback(this.dimensions[i], "dimensions[" + i + "]", this);
		}
		/**
		* Create a new IndexNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {IndexNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var dimensions = [];
			for (var i = 0; i < this.dimensions.length; i++) dimensions[i] = this._ifNode(callback(this.dimensions[i], "dimensions[" + i + "]", this));
			return new IndexNode(dimensions, this.dotNotation);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {IndexNode}
		*/
		clone() {
			return new IndexNode(this.dimensions.slice(0), this.dotNotation);
		}
		/**
		* Test whether this IndexNode contains a single property name
		* @return {boolean}
		*/
		isObjectProperty() {
			return this.dimensions.length === 1 && isConstantNode(this.dimensions[0]) && typeof this.dimensions[0].value === "string";
		}
		/**
		* Returns the property name if IndexNode contains a property.
		* If not, returns null.
		* @return {string | null}
		*/
		getObjectProperty() {
			return this.isObjectProperty() ? this.dimensions[0].value : null;
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			return this.dotNotation ? "." + this.getObjectProperty() : "[" + this.dimensions.join(", ") + "]";
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$14,
				dimensions: this.dimensions,
				dotNotation: this.dotNotation
			};
		}
		/**
		* Instantiate an IndexNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     `{"mathjs": "IndexNode", dimensions: [...], dotNotation: false}`,
		*     where mathjs is optional
		* @returns {IndexNode}
		*/
		static fromJSON(json) {
			return new IndexNode(json.dimensions, json.dotNotation);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var dimensions = [];
			for (var i = 0; i < this.dimensions.length; i++) dimensions[i] = this.dimensions[i].toHTML();
			if (this.dotNotation) return "<span class=\"math-operator math-accessor-operator\">.</span><span class=\"math-symbol math-property\">" + escape(this.getObjectProperty()) + "</span>";
			else return "<span class=\"math-parenthesis math-square-parenthesis\">[</span>" + dimensions.join("<span class=\"math-separator\">,</span>") + "<span class=\"math-parenthesis math-square-parenthesis\">]</span>";
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var dimensions = this.dimensions.map(function(range) {
				return range.toTex(options);
			});
			return this.dotNotation ? "." + this.getObjectProperty() : "_{" + dimensions.join(",") + "}";
		}
	}
	(0, import_defineProperty.default)(IndexNode, "name", name$14);
	return IndexNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/ObjectNode.js
var name$13 = "ObjectNode";
var createObjectNode = /* #__PURE__ */ factory(name$13, ["Node"], (_ref) => {
	var { Node } = _ref;
	class ObjectNode extends Node {
		/**
		* @constructor ObjectNode
		* @extends {Node}
		* Holds an object with keys/values
		* @param {Object.<string, Node>} [properties]   object with key/value pairs
		*/
		constructor(properties) {
			super();
			this.properties = properties || {};
			if (properties) {
				if (!(typeof properties === "object") || !Object.keys(properties).every(function(key) {
					return isNode(properties[key]);
				})) throw new TypeError("Object containing Nodes expected");
			}
		}
		get type() {
			return name$13;
		}
		get isObjectNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalEntries = {};
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) {
				var stringifiedKey = stringify(key);
				var parsedKey = JSON.parse(stringifiedKey);
				evalEntries[parsedKey] = getSafeProperty(this.properties, key)._compile(math, argNames);
			}
			return function evalObjectNode(scope, args, context) {
				var obj = {};
				for (var _key in evalEntries) if (hasOwnProperty(evalEntries, _key)) obj[_key] = evalEntries[_key](scope, args, context);
				return obj;
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) callback(this.properties[key], "properties[" + stringify(key) + "]", this);
		}
		/**
		* Create a new ObjectNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {ObjectNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var properties = {};
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) properties[key] = this._ifNode(callback(this.properties[key], "properties[" + stringify(key) + "]", this));
			return new ObjectNode(properties);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {ObjectNode}
		*/
		clone() {
			var properties = {};
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) properties[key] = this.properties[key];
			return new ObjectNode(properties);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toString(options) {
			var entries = [];
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) entries.push(stringify(key) + ": " + this.properties[key].toString(options));
			return "{" + entries.join(", ") + "}";
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$13,
				properties: this.properties
			};
		}
		/**
		* Instantiate an OperatorNode from its JSON representation
		* @param {Object} json  An object structured like
		*                       `{"mathjs": "ObjectNode", "properties": {...}}`,
		*                       where mathjs is optional
		* @returns {ObjectNode}
		*/
		static fromJSON(json) {
			return new ObjectNode(json.properties);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toHTML(options) {
			var entries = [];
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) entries.push("<span class=\"math-symbol math-property\">" + escape(key) + "</span><span class=\"math-operator math-assignment-operator math-property-assignment-operator math-binary-operator\">:</span>" + this.properties[key].toHTML(options));
			return "<span class=\"math-parenthesis math-curly-parenthesis\">{</span>" + entries.join("<span class=\"math-separator\">,</span>") + "<span class=\"math-parenthesis math-curly-parenthesis\">}</span>";
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var entries = [];
			for (var key in this.properties) if (hasOwnProperty(this.properties, key)) entries.push("\\mathbf{" + key + ":} & " + this.properties[key].toTex(options) + "\\\\");
			return "\\left\\{\\begin{array}{ll}" + entries.join("\n") + "\\end{array}\\right\\}";
		}
	}
	(0, import_defineProperty.default)(ObjectNode, "name", name$13);
	return ObjectNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/utils/scope.js
/**
* Create a new scope which can access the parent scope,
* but does not affect it when written. This is suitable for variable definitions
* within a block node, or function definition.
*
* If parent scope has a createSubScope method, it delegates to that. Otherwise,
* creates an empty map, and copies the parent scope to it, adding in
* the remaining `args`.
*
* @param {Map} parentScope
* @param  {Object} args
* @returns {PartitionedMap}
*/
function createSubScope(parentScope, args) {
	return new PartitionedMap(parentScope, new ObjectWrappingMap(args), new Set(Object.keys(args)));
}
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/OperatorNode.js
var name$12 = "OperatorNode";
var createOperatorNode = /* #__PURE__ */ factory(name$12, ["Node"], (_ref) => {
	var { Node } = _ref;
	/**
	* Returns true if the expression starts with a constant, under
	* the current parenthesization:
	* @param {Node} expression
	* @param {string} parenthesis
	* @return {boolean}
	*/
	function startsWithConstant(expr, parenthesis) {
		var curNode = expr;
		if (parenthesis === "auto") while (isParenthesisNode(curNode)) curNode = curNode.content;
		if (isConstantNode(curNode)) return true;
		if (isOperatorNode(curNode)) return startsWithConstant(curNode.args[0], parenthesis);
		return false;
	}
	/**
	* Calculate which parentheses are necessary. Gets an OperatorNode
	* (which is the root of the tree) and an Array of Nodes
	* (this.args) and returns an array where 'true' means that an argument
	* has to be enclosed in parentheses whereas 'false' means the opposite.
	*
	* @param {OperatorNode} root
	* @param {string} parenthesis
	* @param {Node[]} args
	* @param {boolean} latex
	* @return {boolean[]}
	* @private
	*/
	function calculateNecessaryParentheses(root, parenthesis, implicit, args, latex) {
		var precedence = getPrecedence(root, parenthesis, implicit);
		var associativity = getAssociativity(root, parenthesis);
		if (parenthesis === "all" || args.length > 2 && root.getIdentifier() !== "OperatorNode:add" && root.getIdentifier() !== "OperatorNode:multiply") return args.map(function(arg) {
			switch (arg.getContent().type) {
				case "ArrayNode":
				case "ConstantNode":
				case "SymbolNode":
				case "ParenthesisNode": return false;
				default: return true;
			}
		});
		var result;
		switch (args.length) {
			case 0:
				result = [];
				break;
			case 1:
				var operandPrecedence = getPrecedence(args[0], parenthesis, implicit, root);
				if (latex && operandPrecedence !== null) {
					var operandIdentifier;
					var rootIdentifier;
					if (parenthesis === "keep") {
						operandIdentifier = args[0].getIdentifier();
						rootIdentifier = root.getIdentifier();
					} else {
						operandIdentifier = args[0].getContent().getIdentifier();
						rootIdentifier = root.getContent().getIdentifier();
					}
					if (properties[precedence][rootIdentifier].latexLeftParens === false) {
						result = [false];
						break;
					}
					if (properties[operandPrecedence][operandIdentifier].latexParens === false) {
						result = [false];
						break;
					}
				}
				if (operandPrecedence === null) {
					result = [false];
					break;
				}
				if (operandPrecedence <= precedence) {
					result = [true];
					break;
				}
				result = [false];
				break;
			case 2:
				var lhsParens;
				var lhsPrecedence = getPrecedence(args[0], parenthesis, implicit, root);
				var assocWithLhs = isAssociativeWith(root, args[0], parenthesis);
				if (lhsPrecedence === null) lhsParens = false;
				else if (lhsPrecedence === precedence && associativity === "right" && !assocWithLhs) lhsParens = true;
				else if (lhsPrecedence < precedence) lhsParens = true;
				else lhsParens = false;
				var rhsParens;
				var rhsPrecedence = getPrecedence(args[1], parenthesis, implicit, root);
				var assocWithRhs = isAssociativeWith(root, args[1], parenthesis);
				if (rhsPrecedence === null) rhsParens = false;
				else if (rhsPrecedence === precedence && associativity === "left" && !assocWithRhs) rhsParens = true;
				else if (rhsPrecedence < precedence) rhsParens = true;
				else rhsParens = false;
				if (latex) {
					var _rootIdentifier;
					var lhsIdentifier;
					var rhsIdentifier;
					if (parenthesis === "keep") {
						_rootIdentifier = root.getIdentifier();
						lhsIdentifier = root.args[0].getIdentifier();
						rhsIdentifier = root.args[1].getIdentifier();
					} else {
						_rootIdentifier = root.getContent().getIdentifier();
						lhsIdentifier = root.args[0].getContent().getIdentifier();
						rhsIdentifier = root.args[1].getContent().getIdentifier();
					}
					if (lhsPrecedence !== null) {
						if (properties[precedence][_rootIdentifier].latexLeftParens === false) lhsParens = false;
						if (properties[lhsPrecedence][lhsIdentifier].latexParens === false) lhsParens = false;
					}
					if (rhsPrecedence !== null) {
						if (properties[precedence][_rootIdentifier].latexRightParens === false) rhsParens = false;
						if (properties[rhsPrecedence][rhsIdentifier].latexParens === false) rhsParens = false;
					}
				}
				result = [lhsParens, rhsParens];
				break;
			default: if (root.getIdentifier() === "OperatorNode:add" || root.getIdentifier() === "OperatorNode:multiply") result = args.map(function(arg) {
				var argPrecedence = getPrecedence(arg, parenthesis, implicit, root);
				var assocWithArg = isAssociativeWith(root, arg, parenthesis);
				var argAssociativity = getAssociativity(arg, parenthesis);
				if (argPrecedence === null) return false;
				else if (precedence === argPrecedence && associativity === argAssociativity && !assocWithArg) return true;
				else if (argPrecedence < precedence) return true;
				return false;
			});
		}
		if (args.length >= 2 && root.getIdentifier() === "OperatorNode:multiply" && root.implicit && parenthesis !== "all" && implicit === "hide") {
			for (var i = 1; i < result.length; ++i) if (startsWithConstant(args[i], parenthesis) && !result[i - 1] && (parenthesis !== "keep" || !isParenthesisNode(args[i - 1]))) result[i] = true;
		}
		return result;
	}
	class OperatorNode extends Node {
		/**
		* @constructor OperatorNode
		* @extends {Node}
		* An operator with two arguments, like 2+3
		*
		* @param {string} op           Operator name, for example '+'
		* @param {string} fn           Function name, for example 'add'
		* @param {Node[]} args         Operator arguments
		* @param {boolean} [implicit]  Is this an implicit multiplication?
		* @param {boolean} [isPercentage] Is this an percentage Operation?
		*/
		constructor(op, fn, args, implicit, isPercentage) {
			super();
			if (typeof op !== "string") throw new TypeError("string expected for parameter \"op\"");
			if (typeof fn !== "string") throw new TypeError("string expected for parameter \"fn\"");
			if (!Array.isArray(args) || !args.every(isNode)) throw new TypeError("Array containing Nodes expected for parameter \"args\"");
			this.implicit = implicit === true;
			this.isPercentage = isPercentage === true;
			this.op = op;
			this.fn = fn;
			this.args = args || [];
		}
		get type() {
			return name$12;
		}
		get isOperatorNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			if (typeof this.fn !== "string" || !isSafeMethod(math, this.fn)) {
				if (!math[this.fn]) throw new Error("Function " + this.fn + " missing in provided namespace \"math\"");
				else throw new Error("No access to function \"" + this.fn + "\"");
			}
			var fn = getSafeProperty(math, this.fn);
			var evalArgs = map(this.args, function(arg) {
				return arg._compile(math, argNames);
			});
			if (typeof fn === "function" && fn.rawArgs === true) {
				var rawArgs = this.args;
				return function evalOperatorNode(scope, args, context) {
					return fn(rawArgs, math, createSubScope(scope, args));
				};
			} else if (evalArgs.length === 1) {
				var evalArg0 = evalArgs[0];
				return function evalOperatorNode(scope, args, context) {
					return fn(evalArg0(scope, args, context));
				};
			} else if (evalArgs.length === 2) {
				var _evalArg = evalArgs[0];
				var evalArg1 = evalArgs[1];
				return function evalOperatorNode(scope, args, context) {
					return fn(_evalArg(scope, args, context), evalArg1(scope, args, context));
				};
			} else return function evalOperatorNode(scope, args, context) {
				return fn.apply(null, map(evalArgs, function(evalArg) {
					return evalArg(scope, args, context);
				}));
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			for (var i = 0; i < this.args.length; i++) callback(this.args[i], "args[" + i + "]", this);
		}
		/**
		* Create a new OperatorNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {OperatorNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var args = [];
			for (var i = 0; i < this.args.length; i++) args[i] = this._ifNode(callback(this.args[i], "args[" + i + "]", this));
			return new OperatorNode(this.op, this.fn, args, this.implicit, this.isPercentage);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {OperatorNode}
		*/
		clone() {
			return new OperatorNode(this.op, this.fn, this.args.slice(0), this.implicit, this.isPercentage);
		}
		/**
		* Check whether this is an unary OperatorNode:
		* has exactly one argument, like `-a`.
		* @return {boolean}
		*     Returns true when an unary operator node, false otherwise.
		*/
		isUnary() {
			return this.args.length === 1;
		}
		/**
		* Check whether this is a binary OperatorNode:
		* has exactly two arguments, like `a + b`.
		* @return {boolean}
		*     Returns true when a binary operator node, false otherwise.
		*/
		isBinary() {
			return this.args.length === 2;
		}
		/**
		* Get string representation.
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var implicit = options && options.implicit ? options.implicit : "hide";
			var args = this.args;
			var parens = calculateNecessaryParentheses(this, parenthesis, implicit, args, false);
			if (args.length === 1) {
				var assoc = getAssociativity(this, parenthesis);
				var operand = args[0].toString(options);
				if (parens[0]) operand = "(" + operand + ")";
				var opIsNamed = /[a-zA-Z]+/.test(this.op);
				if (assoc === "right") return this.op + (opIsNamed ? " " : "") + operand;
				else if (assoc === "left") return operand + (opIsNamed ? " " : "") + this.op;
				return operand + this.op;
			} else if (args.length === 2) {
				var lhs = args[0].toString(options);
				var rhs = args[1].toString(options);
				if (parens[0]) lhs = "(" + lhs + ")";
				if (parens[1]) rhs = "(" + rhs + ")";
				if (this.implicit && this.getIdentifier() === "OperatorNode:multiply" && implicit === "hide") return lhs + " " + rhs;
				return lhs + " " + this.op + " " + rhs;
			} else if (args.length > 2 && (this.getIdentifier() === "OperatorNode:add" || this.getIdentifier() === "OperatorNode:multiply")) {
				var stringifiedArgs = args.map(function(arg, index) {
					arg = arg.toString(options);
					if (parens[index]) arg = "(" + arg + ")";
					return arg;
				});
				if (this.implicit && this.getIdentifier() === "OperatorNode:multiply" && implicit === "hide") return stringifiedArgs.join(" ");
				return stringifiedArgs.join(" " + this.op + " ");
			} else return this.fn + "(" + this.args.join(", ") + ")";
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$12,
				op: this.op,
				fn: this.fn,
				args: this.args,
				implicit: this.implicit,
				isPercentage: this.isPercentage
			};
		}
		/**
		* Instantiate an OperatorNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     ```
		*     {"mathjs": "OperatorNode",
		*      "op": "+", "fn": "add", "args": [...],
		*      "implicit": false,
		*      "isPercentage":false}
		*     ```
		*     where mathjs is optional
		* @returns {OperatorNode}
		*/
		static fromJSON(json) {
			return new OperatorNode(json.op, json.fn, json.args, json.implicit, json.isPercentage);
		}
		/**
		* Get HTML representation.
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var implicit = options && options.implicit ? options.implicit : "hide";
			var args = this.args;
			var parens = calculateNecessaryParentheses(this, parenthesis, implicit, args, false);
			if (args.length === 1) {
				var assoc = getAssociativity(this, parenthesis);
				var operand = args[0].toHTML(options);
				if (parens[0]) operand = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + operand + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
				if (assoc === "right") return "<span class=\"math-operator math-unary-operator math-lefthand-unary-operator\">" + escape(this.op) + "</span>" + operand;
				else return operand + "<span class=\"math-operator math-unary-operator math-righthand-unary-operator\">" + escape(this.op) + "</span>";
			} else if (args.length === 2) {
				var lhs = args[0].toHTML(options);
				var rhs = args[1].toHTML(options);
				if (parens[0]) lhs = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + lhs + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
				if (parens[1]) rhs = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + rhs + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
				if (this.implicit && this.getIdentifier() === "OperatorNode:multiply" && implicit === "hide") return lhs + "<span class=\"math-operator math-binary-operator math-implicit-binary-operator\"></span>" + rhs;
				return lhs + "<span class=\"math-operator math-binary-operator math-explicit-binary-operator\">" + escape(this.op) + "</span>" + rhs;
			} else {
				var stringifiedArgs = args.map(function(arg, index) {
					arg = arg.toHTML(options);
					if (parens[index]) arg = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + arg + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
					return arg;
				});
				if (args.length > 2 && (this.getIdentifier() === "OperatorNode:add" || this.getIdentifier() === "OperatorNode:multiply")) {
					if (this.implicit && this.getIdentifier() === "OperatorNode:multiply" && implicit === "hide") return stringifiedArgs.join("<span class=\"math-operator math-binary-operator math-implicit-binary-operator\"></span>");
					return stringifiedArgs.join("<span class=\"math-operator math-binary-operator math-explicit-binary-operator\">" + escape(this.op) + "</span>");
				} else return "<span class=\"math-function\">" + escape(this.fn) + "</span><span class=\"math-paranthesis math-round-parenthesis\">(</span>" + stringifiedArgs.join("<span class=\"math-separator\">,</span>") + "<span class=\"math-paranthesis math-round-parenthesis\">)</span>";
			}
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var implicit = options && options.implicit ? options.implicit : "hide";
			var args = this.args;
			var parens = calculateNecessaryParentheses(this, parenthesis, implicit, args, true);
			var op = latexOperators[this.fn];
			op = typeof op === "undefined" ? this.op : op;
			if (args.length === 1) {
				var assoc = getAssociativity(this, parenthesis);
				var operand = args[0].toTex(options);
				if (parens[0]) operand = "\\left(".concat(operand, "\\right)");
				if (assoc === "right") return op + operand;
				else if (assoc === "left") return operand + op;
				return operand + op;
			} else if (args.length === 2) {
				var lhs = args[0];
				var lhsTex = lhs.toTex(options);
				if (parens[0]) lhsTex = "\\left(".concat(lhsTex, "\\right)");
				var rhsTex = args[1].toTex(options);
				if (parens[1]) rhsTex = "\\left(".concat(rhsTex, "\\right)");
				var lhsIdentifier;
				if (parenthesis === "keep") lhsIdentifier = lhs.getIdentifier();
				else lhsIdentifier = lhs.getContent().getIdentifier();
				switch (this.getIdentifier()) {
					case "OperatorNode:divide": return op + "{" + lhsTex + "}{" + rhsTex + "}";
					case "OperatorNode:pow":
						lhsTex = "{" + lhsTex + "}";
						rhsTex = "{" + rhsTex + "}";
						switch (lhsIdentifier) {
							case "ConditionalNode":
							case "OperatorNode:divide": lhsTex = "\\left(".concat(lhsTex, "\\right)");
						}
						break;
					case "OperatorNode:multiply": if (this.implicit && implicit === "hide") return lhsTex + "~" + rhsTex;
				}
				return lhsTex + op + rhsTex;
			} else if (args.length > 2 && (this.getIdentifier() === "OperatorNode:add" || this.getIdentifier() === "OperatorNode:multiply")) {
				var texifiedArgs = args.map(function(arg, index) {
					arg = arg.toTex(options);
					if (parens[index]) arg = "\\left(".concat(arg, "\\right)");
					return arg;
				});
				if (this.getIdentifier() === "OperatorNode:multiply" && this.implicit && implicit === "hide") return texifiedArgs.join("~");
				return texifiedArgs.join(op);
			} else return "\\mathrm{" + this.fn + "}\\left(" + args.map(function(arg) {
				return arg.toTex(options);
			}).join(",") + "\\right)";
		}
		/**
		* Get identifier.
		* @return {string}
		*/
		getIdentifier() {
			return this.type + ":" + this.fn;
		}
	}
	(0, import_defineProperty.default)(OperatorNode, "name", name$12);
	return OperatorNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/ParenthesisNode.js
var name$11 = "ParenthesisNode";
var createParenthesisNode = /* #__PURE__ */ factory(name$11, ["Node"], (_ref) => {
	var { Node } = _ref;
	class ParenthesisNode extends Node {
		/**
		* @constructor ParenthesisNode
		* @extends {Node}
		* A parenthesis node describes manual parenthesis from the user input
		* @param {Node} content
		* @extends {Node}
		*/
		constructor(content) {
			super();
			if (!isNode(content)) throw new TypeError("Node expected for parameter \"content\"");
			this.content = content;
		}
		get type() {
			return name$11;
		}
		get isParenthesisNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			return this.content._compile(math, argNames);
		}
		/**
		* Get the content of the current Node.
		* @return {Node} content
		* @override
		**/
		getContent() {
			return this.content.getContent();
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.content, "content", this);
		}
		/**
		* Create a new ParenthesisNode whose child is the result of calling
		* the provided callback function on the child of this node.
		* @param {function(child: Node, path: string, parent: Node) : Node} callback
		* @returns {ParenthesisNode} Returns a clone of the node
		*/
		map(callback) {
			var content = callback(this.content, "content", this);
			return new ParenthesisNode(content);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {ParenthesisNode}
		*/
		clone() {
			return new ParenthesisNode(this.content);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toString(options) {
			if (!options || options && !options.parenthesis || options && options.parenthesis === "keep") return "(" + this.content.toString(options) + ")";
			return this.content.toString(options);
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$11,
				content: this.content
			};
		}
		/**
		* Instantiate an ParenthesisNode from its JSON representation
		* @param {Object} json  An object structured like
		*                       `{"mathjs": "ParenthesisNode", "content": ...}`,
		*                       where mathjs is optional
		* @returns {ParenthesisNode}
		*/
		static fromJSON(json) {
			return new ParenthesisNode(json.content);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toHTML(options) {
			if (!options || options && !options.parenthesis || options && options.parenthesis === "keep") return "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + this.content.toHTML(options) + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			return this.content.toHTML(options);
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toTex(options) {
			if (!options || options && !options.parenthesis || options && options.parenthesis === "keep") return "\\left(".concat(this.content.toTex(options), "\\right)");
			return this.content.toTex(options);
		}
	}
	(0, import_defineProperty.default)(ParenthesisNode, "name", name$11);
	return ParenthesisNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/RangeNode.js
var name$10 = "RangeNode";
var createRangeNode = /* #__PURE__ */ factory(name$10, ["Node"], (_ref) => {
	var { Node } = _ref;
	/**
	* Calculate the necessary parentheses
	* @param {Node} node
	* @param {string} parenthesis
	* @param {string} implicit
	* @return {Object} parentheses
	* @private
	*/
	function calculateNecessaryParentheses(node, parenthesis, implicit) {
		var precedence = getPrecedence(node, parenthesis, implicit);
		var parens = {};
		var startPrecedence = getPrecedence(node.start, parenthesis, implicit);
		parens.start = startPrecedence !== null && startPrecedence <= precedence || parenthesis === "all";
		if (node.step) {
			var stepPrecedence = getPrecedence(node.step, parenthesis, implicit);
			parens.step = stepPrecedence !== null && stepPrecedence <= precedence || parenthesis === "all";
		}
		var endPrecedence = getPrecedence(node.end, parenthesis, implicit);
		parens.end = endPrecedence !== null && endPrecedence <= precedence || parenthesis === "all";
		return parens;
	}
	class RangeNode extends Node {
		/**
		* @constructor RangeNode
		* @extends {Node}
		* create a range
		* @param {Node} start  included lower-bound
		* @param {Node} end    included upper-bound
		* @param {Node} [step] optional step
		*/
		constructor(start, end, step) {
			super();
			if (!isNode(start)) throw new TypeError("Node expected");
			if (!isNode(end)) throw new TypeError("Node expected");
			if (step && !isNode(step)) throw new TypeError("Node expected");
			if (arguments.length > 3) throw new Error("Too many arguments");
			this.start = start;
			this.end = end;
			this.step = step || null;
		}
		get type() {
			return name$10;
		}
		get isRangeNode() {
			return true;
		}
		/**
		* Check whether the RangeNode needs the `end` symbol to be defined.
		* This end is the size of the Matrix in current dimension.
		* @return {boolean}
		*/
		needsEnd() {
			return this.filter(function(node) {
				return isSymbolNode(node) && node.name === "end";
			}).length > 0;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var range = math.range;
			var evalStart = this.start._compile(math, argNames);
			var evalEnd = this.end._compile(math, argNames);
			if (this.step) {
				var evalStep = this.step._compile(math, argNames);
				return function evalRangeNode(scope, args, context) {
					return range(evalStart(scope, args, context), evalEnd(scope, args, context), evalStep(scope, args, context));
				};
			} else return function evalRangeNode(scope, args, context) {
				return range(evalStart(scope, args, context), evalEnd(scope, args, context));
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.start, "start", this);
			callback(this.end, "end", this);
			if (this.step) callback(this.step, "step", this);
		}
		/**
		* Create a new RangeNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {RangeNode} Returns a transformed copy of the node
		*/
		map(callback) {
			return new RangeNode(this._ifNode(callback(this.start, "start", this)), this._ifNode(callback(this.end, "end", this)), this.step && this._ifNode(callback(this.step, "step", this)));
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {RangeNode}
		*/
		clone() {
			return new RangeNode(this.start, this.end, this.step && this.step);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var parens = calculateNecessaryParentheses(this, parenthesis, options && options.implicit);
			var str;
			var start = this.start.toString(options);
			if (parens.start) start = "(" + start + ")";
			str = start;
			if (this.step) {
				var step = this.step.toString(options);
				if (parens.step) step = "(" + step + ")";
				str += ":" + step;
			}
			var end = this.end.toString(options);
			if (parens.end) end = "(" + end + ")";
			str += ":" + end;
			return str;
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$10,
				start: this.start,
				end: this.end,
				step: this.step
			};
		}
		/**
		* Instantiate an RangeNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     `{"mathjs": "RangeNode", "start": ..., "end": ..., "step": ...}`,
		*     where mathjs is optional
		* @returns {RangeNode}
		*/
		static fromJSON(json) {
			return new RangeNode(json.start, json.end, json.step);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var parens = calculateNecessaryParentheses(this, parenthesis, options && options.implicit);
			var str;
			var start = this.start.toHTML(options);
			if (parens.start) start = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + start + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			str = start;
			if (this.step) {
				var step = this.step.toHTML(options);
				if (parens.step) step = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + step + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
				str += "<span class=\"math-operator math-range-operator\">:</span>" + step;
			}
			var end = this.end.toHTML(options);
			if (parens.end) end = "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + end + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>";
			str += "<span class=\"math-operator math-range-operator\">:</span>" + end;
			return str;
		}
		/**
		* Get LaTeX representation
		* @params {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var parens = calculateNecessaryParentheses(this, parenthesis, options && options.implicit);
			var str = this.start.toTex(options);
			if (parens.start) str = "\\left(".concat(str, "\\right)");
			if (this.step) {
				var step = this.step.toTex(options);
				if (parens.step) step = "\\left(".concat(step, "\\right)");
				str += ":" + step;
			}
			var end = this.end.toTex(options);
			if (parens.end) end = "\\left(".concat(end, "\\right)");
			str += ":" + end;
			return str;
		}
	}
	(0, import_defineProperty.default)(RangeNode, "name", name$10);
	return RangeNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/RelationalNode.js
var name$9 = "RelationalNode";
var createRelationalNode = /* #__PURE__ */ factory(name$9, ["Node"], (_ref) => {
	var { Node } = _ref;
	var operatorMap = {
		equal: "==",
		unequal: "!=",
		smaller: "<",
		larger: ">",
		smallerEq: "<=",
		largerEq: ">="
	};
	class RelationalNode extends Node {
		/**
		* A node representing a chained conditional expression, such as 'x > y > z'
		*
		* @param {String[]} conditionals
		*     An array of conditional operators used to compare the parameters
		* @param {Node[]} params
		*     The parameters that will be compared
		*
		* @constructor RelationalNode
		* @extends {Node}
		*/
		constructor(conditionals, params) {
			super();
			if (!Array.isArray(conditionals)) throw new TypeError("Parameter conditionals must be an array");
			if (!Array.isArray(params)) throw new TypeError("Parameter params must be an array");
			if (conditionals.length !== params.length - 1) throw new TypeError("Parameter params must contain exactly one more element than parameter conditionals");
			this.conditionals = conditionals;
			this.params = params;
		}
		get type() {
			return name$9;
		}
		get isRelationalNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var self = this;
			var compiled = this.params.map((p) => p._compile(math, argNames));
			return function evalRelationalNode(scope, args, context) {
				var evalLhs;
				var evalRhs = compiled[0](scope, args, context);
				for (var i = 0; i < self.conditionals.length; i++) {
					evalLhs = evalRhs;
					evalRhs = compiled[i + 1](scope, args, context);
					if (!getSafeProperty(math, self.conditionals[i])(evalLhs, evalRhs)) return false;
				}
				return true;
			};
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			this.params.forEach((n, i) => callback(n, "params[" + i + "]", this), this);
		}
		/**
		* Create a new RelationalNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {RelationalNode} Returns a transformed copy of the node
		*/
		map(callback) {
			return new RelationalNode(this.conditionals.slice(), this.params.map((n, i) => this._ifNode(callback(n, "params[" + i + "]", this)), this));
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {RelationalNode}
		*/
		clone() {
			return new RelationalNode(this.conditionals, this.params);
		}
		/**
		* Get string representation.
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var precedence = getPrecedence(this, parenthesis, options && options.implicit);
			var paramStrings = this.params.map(function(p, index) {
				var paramPrecedence = getPrecedence(p, parenthesis, options && options.implicit);
				return parenthesis === "all" || paramPrecedence !== null && paramPrecedence <= precedence ? "(" + p.toString(options) + ")" : p.toString(options);
			});
			var ret = paramStrings[0];
			for (var i = 0; i < this.conditionals.length; i++) {
				ret += " " + operatorMap[this.conditionals[i]];
				ret += " " + paramStrings[i + 1];
			}
			return ret;
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$9,
				conditionals: this.conditionals,
				params: this.params
			};
		}
		/**
		* Instantiate a RelationalNode from its JSON representation
		* @param {Object} json
		*     An object structured like
		*     `{"mathjs": "RelationalNode", "conditionals": ..., "params": ...}`,
		*     where mathjs is optional
		* @returns {RelationalNode}
		*/
		static fromJSON(json) {
			return new RelationalNode(json.conditionals, json.params);
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var precedence = getPrecedence(this, parenthesis, options && options.implicit);
			var paramStrings = this.params.map(function(p, index) {
				var paramPrecedence = getPrecedence(p, parenthesis, options && options.implicit);
				return parenthesis === "all" || paramPrecedence !== null && paramPrecedence <= precedence ? "<span class=\"math-parenthesis math-round-parenthesis\">(</span>" + p.toHTML(options) + "<span class=\"math-parenthesis math-round-parenthesis\">)</span>" : p.toHTML(options);
			});
			var ret = paramStrings[0];
			for (var i = 0; i < this.conditionals.length; i++) ret += "<span class=\"math-operator math-binary-operator math-explicit-binary-operator\">" + escape(operatorMap[this.conditionals[i]]) + "</span>" + paramStrings[i + 1];
			return ret;
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var parenthesis = options && options.parenthesis ? options.parenthesis : "keep";
			var precedence = getPrecedence(this, parenthesis, options && options.implicit);
			var paramStrings = this.params.map(function(p, index) {
				var paramPrecedence = getPrecedence(p, parenthesis, options && options.implicit);
				return parenthesis === "all" || paramPrecedence !== null && paramPrecedence <= precedence ? "\\left(" + p.toTex(options) + "\right)" : p.toTex(options);
			});
			var ret = paramStrings[0];
			for (var i = 0; i < this.conditionals.length; i++) ret += latexOperators[this.conditionals[i]] + paramStrings[i + 1];
			return ret;
		}
	}
	(0, import_defineProperty.default)(RelationalNode, "name", name$9);
	return RelationalNode;
}, {
	isClass: true,
	isNode: true
});
var createSymbolNode = /* #__PURE__ */ factory("SymbolNode", [
	"math",
	"?Unit",
	"Node"
], (_ref) => {
	var { math, Unit, Node } = _ref;
	/**
	* Check whether some name is a valueless unit like "inch".
	* @param {string} name
	* @return {boolean}
	*/
	function isValuelessUnit(name) {
		return Unit ? Unit.isValuelessUnit(name) : false;
	}
	class SymbolNode extends Node {
		/**
		* @constructor SymbolNode
		* @extends {Node}
		* A symbol node can hold and resolve a symbol
		* @param {string} name
		* @extends {Node}
		*/
		constructor(name) {
			super();
			if (typeof name !== "string") throw new TypeError("String expected for parameter \"name\"");
			this.name = name;
		}
		get type() {
			return "SymbolNode";
		}
		get isSymbolNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var name = this.name;
			if (argNames[name] === true) return function(scope, args, context) {
				return getSafeProperty(args, name);
			};
			else if (name in math) return function(scope, args, context) {
				return scope.has(name) ? scope.get(name) : getSafeProperty(math, name);
			};
			else {
				var isUnit = isValuelessUnit(name);
				return function(scope, args, context) {
					return scope.has(name) ? scope.get(name) : isUnit ? new Unit(null, name) : SymbolNode.onUndefinedSymbol(name);
				};
			}
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {}
		/**
		* Create a new SymbolNode with children produced by the given callback.
		* Trivial since a SymbolNode has no children
		* @param {function(child: Node, path: string, parent: Node) : Node} callback
		* @returns {SymbolNode} Returns a clone of the node
		*/
		map(callback) {
			return this.clone();
		}
		/**
		* Throws an error 'Undefined symbol {name}'
		* @param {string} name
		*/
		static onUndefinedSymbol(name) {
			throw new Error("Undefined symbol " + name);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {SymbolNode}
		*/
		clone() {
			return new SymbolNode(this.name);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toString(options) {
			return this.name;
		}
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toHTML(options) {
			var name = escape(this.name);
			if (name === "true" || name === "false") return "<span class=\"math-symbol math-boolean\">" + name + "</span>";
			else if (name === "i") return "<span class=\"math-symbol math-imaginary-symbol\">" + name + "</span>";
			else if (name === "Infinity") return "<span class=\"math-symbol math-infinity-symbol\">" + name + "</span>";
			else if (name === "NaN") return "<span class=\"math-symbol math-nan-symbol\">" + name + "</span>";
			else if (name === "null") return "<span class=\"math-symbol math-null-symbol\">" + name + "</span>";
			else if (name === "undefined") return "<span class=\"math-symbol math-undefined-symbol\">" + name + "</span>";
			return "<span class=\"math-symbol\">" + name + "</span>";
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: "SymbolNode",
				name: this.name
			};
		}
		/**
		* Instantiate a SymbolNode from its JSON representation
		* @param {Object} json  An object structured like
		*                       `{"mathjs": "SymbolNode", name: "x"}`,
		*                       where mathjs is optional
		* @returns {SymbolNode}
		*/
		static fromJSON(json) {
			return new SymbolNode(json.name);
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		_toTex(options) {
			var isUnit = false;
			if (typeof math[this.name] === "undefined" && isValuelessUnit(this.name)) isUnit = true;
			var symbol = toSymbol(this.name, isUnit);
			if (symbol[0] === "\\") return symbol;
			return " " + symbol;
		}
	}
	return SymbolNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/node/FunctionNode.js
var name$7 = "FunctionNode";
var createFunctionNode = /* #__PURE__ */ factory(name$7, [
	"math",
	"Node",
	"SymbolNode"
], (_ref) => {
	var _FunctionNode;
	var { math, Node, SymbolNode } = _ref;
	var strin = (entity) => format(entity, { truncate: 78 });
	function expandTemplate(template, node, options) {
		var latex = "";
		var regex = /\$(?:\{([a-z_][a-z_0-9]*)(?:\[([0-9]+)\])?\}|\$)/gi;
		var inputPos = 0;
		var match;
		while ((match = regex.exec(template)) !== null) {
			latex += template.substring(inputPos, match.index);
			inputPos = match.index;
			if (match[0] === "$$") {
				latex += "$";
				inputPos++;
			} else {
				inputPos += match[0].length;
				var property = node[match[1]];
				if (!property) throw new ReferenceError("Template: Property " + match[1] + " does not exist.");
				if (match[2] === void 0) switch (typeof property) {
					case "string":
						latex += property;
						break;
					case "object":
						if (isNode(property)) latex += property.toTex(options);
						else if (Array.isArray(property)) latex += property.map(function(arg, index) {
							if (isNode(arg)) return arg.toTex(options);
							throw new TypeError("Template: " + match[1] + "[" + index + "] is not a Node.");
						}).join(",");
						else throw new TypeError("Template: " + match[1] + " has to be a Node, String or array of Nodes");
						break;
					default: throw new TypeError("Template: " + match[1] + " has to be a Node, String or array of Nodes");
				}
				else if (isNode(property[match[2]] && property[match[2]])) latex += property[match[2]].toTex(options);
				else throw new TypeError("Template: " + match[1] + "[" + match[2] + "] is not a Node.");
			}
		}
		latex += template.slice(inputPos);
		return latex;
	}
	class FunctionNode extends Node {
		/**
		* @constructor FunctionNode
		* @extends {./Node}
		* invoke a list with arguments on a node
		* @param {./Node | string} fn
		*     Item resolving to a function on which to invoke
		*     the arguments, typically a SymbolNode or AccessorNode
		* @param {./Node[]} args
		*/
		constructor(fn, args, optional) {
			super();
			if (typeof fn === "string") fn = new SymbolNode(fn);
			if (!isNode(fn)) throw new TypeError("Node expected as parameter \"fn\"");
			if (!Array.isArray(args) || !args.every(isNode)) throw new TypeError("Array containing Nodes expected for parameter \"args\"");
			var optionalType = typeof optional;
			if (!(optionalType === "undefined" || optionalType === "boolean")) throw new TypeError("optional flag, if specified, must be boolean");
			this.fn = fn;
			this.args = args || [];
			this.optional = !!optional;
		}
		get name() {
			return this.fn.name || "";
		}
		get type() {
			return name$7;
		}
		get isFunctionNode() {
			return true;
		}
		/**
		* Compile a node into a JavaScript function.
		* This basically pre-calculates as much as possible and only leaves open
		* calculations which depend on a dynamic scope with variables.
		* @param {Object} math     Math.js namespace with functions and constants.
		* @param {Object} argNames An object with argument names as key and `true`
		*                          as value. Used in the SymbolNode to optimize
		*                          for arguments from user assigned functions
		*                          (see FunctionAssignmentNode) or special symbols
		*                          like `end` (see IndexNode).
		* @return {function} Returns a function which can be called like:
		*                        evalNode(scope: Object, args: Object, context: *)
		*/
		_compile(math, argNames) {
			var evalArgs = this.args.map((arg) => arg._compile(math, argNames));
			var fromOptionalChaining = this.optional || isAccessorNode(this.fn) && this.fn.optionalChaining;
			if (isSymbolNode(this.fn)) {
				var _name = this.fn.name;
				if (!argNames[_name]) {
					var fn = _name in math ? getSafeProperty(math, _name) : void 0;
					var isRaw = typeof fn === "function" && fn.rawArgs === true;
					var resolveFn = (scope) => {
						var value;
						if (scope.has(_name)) value = scope.get(_name);
						else if (_name in math) value = getSafeProperty(math, _name);
						else if (fromOptionalChaining) value = void 0;
						else return FunctionNode.onUndefinedFunction(_name);
						if (typeof value === "function" || fromOptionalChaining && value === void 0) return value;
						throw new TypeError("'".concat(_name, "' is not a function; its value is:\n  ").concat(strin(value)));
					};
					if (isRaw) {
						var rawArgs = this.args;
						return function evalFunctionNode(scope, args, context) {
							var fn = resolveFn(scope);
							if (fn.rawArgs === true) return fn(rawArgs, math, createSubScope(scope, args));
							else return fn(...evalArgs.map((evalArg) => evalArg(scope, args, context)));
						};
					} else switch (evalArgs.length) {
						case 0: return function evalFunctionNode(scope, args, context) {
							var fn = resolveFn(scope);
							if (fromOptionalChaining && fn === void 0) return void 0;
							return fn();
						};
						case 1: return function evalFunctionNode(scope, args, context) {
							var fn = resolveFn(scope);
							if (fromOptionalChaining && fn === void 0) return void 0;
							var evalArg0 = evalArgs[0];
							return fn(evalArg0(scope, args, context));
						};
						case 2: return function evalFunctionNode(scope, args, context) {
							var fn = resolveFn(scope);
							if (fromOptionalChaining && fn === void 0) return void 0;
							var evalArg0 = evalArgs[0];
							var evalArg1 = evalArgs[1];
							return fn(evalArg0(scope, args, context), evalArg1(scope, args, context));
						};
						default: return function evalFunctionNode(scope, args, context) {
							var fn = resolveFn(scope);
							if (fromOptionalChaining && fn === void 0) return void 0;
							return fn(...evalArgs.map((evalArg) => evalArg(scope, args, context)));
						};
					}
				} else {
					var _rawArgs = this.args;
					return function evalFunctionNode(scope, args, context) {
						var fn = getSafeProperty(args, _name);
						if (fromOptionalChaining && fn === void 0) return void 0;
						if (typeof fn !== "function") throw new TypeError("Argument '".concat(_name, "' was not a function; received: ").concat(strin(fn)));
						if (fn.rawArgs) return fn(_rawArgs, math, createSubScope(scope, args));
						else {
							var values = evalArgs.map((evalArg) => evalArg(scope, args, context));
							return fn.apply(fn, values);
						}
					};
				}
			} else if (isAccessorNode(this.fn) && isIndexNode(this.fn.index) && this.fn.index.isObjectProperty()) {
				var evalObject = this.fn.object._compile(math, argNames);
				var prop = this.fn.index.getObjectProperty();
				var _rawArgs2 = this.args;
				return function evalFunctionNode(scope, args, context) {
					var object = evalObject(scope, args, context);
					if (fromOptionalChaining && (object == null || object[prop] === void 0)) return;
					var fn = getSafeMethod(object, prop);
					if (fn !== null && fn !== void 0 && fn.rawArgs) return fn(_rawArgs2, math, createSubScope(scope, args));
					else {
						var values = evalArgs.map((evalArg) => evalArg(scope, args, context));
						return fn.apply(object, values);
					}
				};
			} else {
				var fnExpr = this.fn.toString();
				var evalFn = this.fn._compile(math, argNames);
				var _rawArgs3 = this.args;
				return function evalFunctionNode(scope, args, context) {
					var fn = evalFn(scope, args, context);
					if (fromOptionalChaining && fn === void 0) return void 0;
					if (typeof fn !== "function") throw new TypeError("Expression '".concat(fnExpr, "' did not evaluate to a function; value is:") + "\n  ".concat(strin(fn)));
					if (fn.rawArgs) return fn(_rawArgs3, math, createSubScope(scope, args));
					else {
						var values = evalArgs.map((evalArg) => evalArg(scope, args, context));
						return fn.apply(fn, values);
					}
				};
			}
		}
		/**
		* Execute a callback for each of the child nodes of this node
		* @param {function(child: Node, path: string, parent: Node)} callback
		*/
		forEach(callback) {
			callback(this.fn, "fn", this);
			for (var i = 0; i < this.args.length; i++) callback(this.args[i], "args[" + i + "]", this);
		}
		/**
		* Create a new FunctionNode whose children are the results of calling
		* the provided callback function for each child of the original node.
		* @param {function(child: Node, path: string, parent: Node): Node} callback
		* @returns {FunctionNode} Returns a transformed copy of the node
		*/
		map(callback) {
			var fn = this._ifNode(callback(this.fn, "fn", this));
			var args = [];
			for (var i = 0; i < this.args.length; i++) args[i] = this._ifNode(callback(this.args[i], "args[" + i + "]", this));
			return new FunctionNode(fn, args);
		}
		/**
		* Create a clone of this node, a shallow copy
		* @return {FunctionNode}
		*/
		clone() {
			return new FunctionNode(this.fn, this.args.slice(0));
		}
		/**
		* Throws an error 'Undefined function {name}'
		* @param {string} name
		*/
		/**
		* Get string representation. (wrapper function)
		* This overrides parts of Node's toString function.
		* If callback is an object containing callbacks, it
		* calls the correct callback for the current node,
		* otherwise it falls back to calling Node's toString
		* function.
		*
		* @param {Object} options
		* @return {string} str
		* @override
		*/
		toString(options) {
			var customString;
			var name = this.fn.toString(options);
			if (options && typeof options.handler === "object" && hasOwnProperty(options.handler, name)) customString = options.handler[name](this, options);
			if (typeof customString !== "undefined") return customString;
			return super.toString(options);
		}
		/**
		* Get string representation
		* @param {Object} options
		* @return {string} str
		*/
		_toString(options) {
			var args = this.args.map(function(arg) {
				return arg.toString(options);
			});
			return (isFunctionAssignmentNode(this.fn) ? "(" + this.fn.toString(options) + ")" : this.fn.toString(options)) + "(" + args.join(", ") + ")";
		}
		/**
		* Get a JSON representation of the node
		* @returns {Object}
		*/
		toJSON() {
			return {
				mathjs: name$7,
				fn: this.fn,
				args: this.args
			};
		}
		/**
		* Instantiate an AssignmentNode from its JSON representation
		* @param {Object} json  An object structured like
		*                       `{"mathjs": "FunctionNode", fn: ..., args: ...}`,
		*                       where mathjs is optional
		* @returns {FunctionNode}
		*/
		/**
		* Get HTML representation
		* @param {Object} options
		* @return {string} str
		*/
		_toHTML(options) {
			var args = this.args.map(function(arg) {
				return arg.toHTML(options);
			});
			return "<span class=\"math-function\">" + escape(this.fn) + "</span><span class=\"math-paranthesis math-round-parenthesis\">(</span>" + args.join("<span class=\"math-separator\">,</span>") + "<span class=\"math-paranthesis math-round-parenthesis\">)</span>";
		}
		/**
		* Get LaTeX representation. (wrapper function)
		* This overrides parts of Node's toTex function.
		* If callback is an object containing callbacks, it
		* calls the correct callback for the current node,
		* otherwise it falls back to calling Node's toTex
		* function.
		*
		* @param {Object} options
		* @return {string}
		*/
		toTex(options) {
			var customTex;
			if (options && typeof options.handler === "object" && hasOwnProperty(options.handler, this.name)) customTex = options.handler[this.name](this, options);
			if (typeof customTex !== "undefined") return customTex;
			return super.toTex(options);
		}
		/**
		* Get LaTeX representation
		* @param {Object} options
		* @return {string} str
		*/
		_toTex(options) {
			var args = this.args.map(function(arg) {
				return arg.toTex(options);
			});
			var latexConverter;
			if (latexFunctions[this.name]) latexConverter = latexFunctions[this.name];
			if (math[this.name] && (typeof math[this.name].toTex === "function" || typeof math[this.name].toTex === "object" || typeof math[this.name].toTex === "string")) latexConverter = math[this.name].toTex;
			var customToTex;
			switch (typeof latexConverter) {
				case "function":
					customToTex = latexConverter(this, options);
					break;
				case "string":
					customToTex = expandTemplate(latexConverter, this, options);
					break;
				case "object": switch (typeof latexConverter[args.length]) {
					case "function":
						customToTex = latexConverter[args.length](this, options);
						break;
					case "string": customToTex = expandTemplate(latexConverter[args.length], this, options);
				}
			}
			if (typeof customToTex !== "undefined") return customToTex;
			return expandTemplate(defaultTemplate, this, options);
		}
		/**
		* Get identifier.
		* @return {string}
		*/
		getIdentifier() {
			return this.type + ":" + this.name;
		}
	}
	_FunctionNode = FunctionNode;
	(0, import_defineProperty.default)(FunctionNode, "name", name$7);
	(0, import_defineProperty.default)(FunctionNode, "onUndefinedFunction", function(name) {
		throw new Error("Undefined function " + name);
	});
	(0, import_defineProperty.default)(FunctionNode, "fromJSON", function(json) {
		return new _FunctionNode(json.fn, json.args);
	});
	return FunctionNode;
}, {
	isClass: true,
	isNode: true
});
//#endregion
//#region node_modules/mathjs/lib/esm/expression/parse.js
var name$6 = "parse";
var createParse = /* #__PURE__ */ factory(name$6, [
	"typed",
	"numeric",
	"config",
	"AccessorNode",
	"ArrayNode",
	"AssignmentNode",
	"BlockNode",
	"ConditionalNode",
	"ConstantNode",
	"FunctionAssignmentNode",
	"FunctionNode",
	"IndexNode",
	"ObjectNode",
	"OperatorNode",
	"ParenthesisNode",
	"RangeNode",
	"RelationalNode",
	"SymbolNode"
], (_ref) => {
	var { typed, numeric, config, AccessorNode, ArrayNode, AssignmentNode, BlockNode, ConditionalNode, ConstantNode, FunctionAssignmentNode, FunctionNode, IndexNode, ObjectNode, OperatorNode, ParenthesisNode, RangeNode, RelationalNode, SymbolNode } = _ref;
	/**
	* Parse an expression. Returns a node tree, which can be evaluated by
	* invoking node.evaluate() or transformed into a functional object via node.compile().
	*
	* Note the evaluating arbitrary expressions may involve security risks,
	* see [https://mathjs.org/docs/expressions/security.html](https://mathjs.org/docs/expressions/security.html) for more information.
	*
	* Syntax:
	*
	*     math.parse(expr)
	*     math.parse(expr, options)
	*     math.parse([expr1, expr2, expr3, ...])
	*     math.parse([expr1, expr2, expr3, ...], options)
	*
	* Example:
	*
	*     const node1 = math.parse('sqrt(3^2 + 4^2)')
	*     node1.compile().evaluate() // 5
	*
	*     let scope = {a:3, b:4}
	*     const node2 = math.parse('a * b')
	*     node2.evaluate(scope) // 12
	*     const code2 = node2.compile()
	*     code2.evaluate(scope) // 12
	*     scope.a = 5
	*     code2.evaluate(scope) // 20
	*
	*     const nodes = math.parse(['a = 3', 'b = 4', 'a * b'])
	*     nodes[2].compile().evaluate() // 12
	*
	* See also:
	*
	*     evaluate, compile
	*
	* History:
	*
	*     v0.9   Created
	*     v0.13  Switched to one-based indices
	*     v0.14  Added `[1,2;3,4]` notation for matrices
	*     v0.18  Dropped the `function` keyword
	*     v0.20  Added ternary conditional
	*     v0.27  Allow multi-line expressions; allow functions that receive
	*            unevaluated parameters (`rawArgs`)
	*     v3     Add object notation; allow assignments internal to other
	*            expressions
	*     v7.3   Supported binary, octal, and hexadecimal notation
	*     v9.5   Support for calculations with percentages
	*     v12.4  Allow trailing commas in matrices
	*     v14.8  Add nullish coalescing operator
	*     v15.1  Add optional chaining operator
	*
	* @param {string | string[] | Matrix} expr          Expression to be parsed
	* @param {{nodes: Object<string, Node>}} [options]  Available options:
	*                                                   - `nodes` a set of custom nodes
	* @return {Node | Node[]} node
	* @throws {Error}
	*/
	var parse = typed(name$6, {
		string: function string(expression) {
			return parseStart(expression, {});
		},
		"Array | Matrix": function Array__Matrix(expressions) {
			return parseMultiple(expressions, {});
		},
		"string, Object": function string_Object(expression, options) {
			return parseStart(expression, options.nodes !== void 0 ? options.nodes : {});
		},
		"Array | Matrix, Object": parseMultiple
	});
	function parseMultiple(expressions) {
		var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
		var extraNodes = options.nodes !== void 0 ? options.nodes : {};
		return deepMap(expressions, function(elem) {
			if (typeof elem !== "string") throw new TypeError("String expected");
			return parseStart(elem, extraNodes);
		});
	}
	var TOKENTYPE = {
		NULL: 0,
		DELIMITER: 1,
		NUMBER: 2,
		SYMBOL: 3,
		UNKNOWN: 4
	};
	var DELIMITERS = {
		",": true,
		"(": true,
		")": true,
		"[": true,
		"]": true,
		"{": true,
		"}": true,
		"\"": true,
		"'": true,
		";": true,
		"+": true,
		"-": true,
		"*": true,
		".*": true,
		"/": true,
		"./": true,
		"%": true,
		"^": true,
		".^": true,
		"~": true,
		"!": true,
		"&": true,
		"|": true,
		"^|": true,
		"=": true,
		":": true,
		"?": true,
		"?.": true,
		"??": true,
		"==": true,
		"!=": true,
		"<": true,
		">": true,
		"<=": true,
		">=": true,
		"<<": true,
		">>": true,
		">>>": true
	};
	var NAMED_DELIMITERS = {
		mod: true,
		to: true,
		in: true,
		and: true,
		xor: true,
		or: true,
		not: true
	};
	var CONSTANTS = {
		true: true,
		false: false,
		null: null,
		undefined: void 0
	};
	var NUMERIC_CONSTANTS = ["NaN", "Infinity"];
	var ESCAPE_CHARACTERS = {
		"\"": "\"",
		"'": "'",
		"\\": "\\",
		"/": "/",
		b: "\b",
		f: "\f",
		n: "\n",
		r: "\r",
		t: "	"
	};
	function initialState() {
		return {
			extraNodes: {},
			expression: "",
			comment: "",
			index: 0,
			token: "",
			tokenType: TOKENTYPE.NULL,
			nestingLevel: 0,
			conditionalLevel: null
		};
	}
	/**
	* View upto `length` characters of the expression starting at the current character.
	*
	* @param {Object} state
	* @param {number} [length=1] Number of characters to view
	* @returns {string}
	* @private
	*/
	function currentString(state, length) {
		return state.expression.substr(state.index, length);
	}
	/**
	* View the current character. Returns '' if end of expression is reached.
	*
	* @param {Object} state
	* @returns {string}
	* @private
	*/
	function currentCharacter(state) {
		return currentString(state, 1);
	}
	/**
	* Get the next character from the expression.
	* The character is stored into the char c. If the end of the expression is
	* reached, the function puts an empty string in c.
	* @private
	*/
	function next(state) {
		state.index++;
	}
	/**
	* Preview the previous character from the expression.
	* @return {string} cNext
	* @private
	*/
	function prevCharacter(state) {
		return state.expression.charAt(state.index - 1);
	}
	/**
	* Preview the next character from the expression.
	* @return {string} cNext
	* @private
	*/
	function nextCharacter(state) {
		return state.expression.charAt(state.index + 1);
	}
	/**
	* Get next token in the current string expr.
	* The token and token type are available as token and tokenType
	* @private
	*/
	function getToken(state) {
		state.tokenType = TOKENTYPE.NULL;
		state.token = "";
		state.comment = "";
		while (true) {
			if (currentCharacter(state) === "#") while (currentCharacter(state) !== "\n" && currentCharacter(state) !== "") {
				state.comment += currentCharacter(state);
				next(state);
			}
			if (parse.isWhitespace(currentCharacter(state), state.nestingLevel)) next(state);
			else break;
		}
		if (currentCharacter(state) === "") {
			state.tokenType = TOKENTYPE.DELIMITER;
			return;
		}
		if (currentCharacter(state) === "\n" && !state.nestingLevel) {
			state.tokenType = TOKENTYPE.DELIMITER;
			state.token = currentCharacter(state);
			next(state);
			return;
		}
		var c1 = currentCharacter(state);
		var c2 = currentString(state, 2);
		var c3 = currentString(state, 3);
		if (c3.length === 3 && DELIMITERS[c3]) {
			state.tokenType = TOKENTYPE.DELIMITER;
			state.token = c3;
			next(state);
			next(state);
			next(state);
			return;
		}
		if (c2.length === 2 && DELIMITERS[c2] && (c2 !== "?." || !parse.isDigit(state.expression.charAt(state.index + 2)))) {
			state.tokenType = TOKENTYPE.DELIMITER;
			state.token = c2;
			next(state);
			next(state);
			return;
		}
		if (DELIMITERS[c1]) {
			state.tokenType = TOKENTYPE.DELIMITER;
			state.token = c1;
			next(state);
			return;
		}
		if (parse.isDigitDot(c1)) {
			state.tokenType = TOKENTYPE.NUMBER;
			var _c = currentString(state, 2);
			if (_c === "0b" || _c === "0o" || _c === "0x") {
				state.token += currentCharacter(state);
				next(state);
				state.token += currentCharacter(state);
				next(state);
				while (parse.isAlpha(currentCharacter(state), prevCharacter(state), nextCharacter(state)) || parse.isDigit(currentCharacter(state))) {
					state.token += currentCharacter(state);
					next(state);
				}
				if (currentCharacter(state) === ".") {
					state.token += ".";
					next(state);
					while (parse.isAlpha(currentCharacter(state), prevCharacter(state), nextCharacter(state)) || parse.isDigit(currentCharacter(state))) {
						state.token += currentCharacter(state);
						next(state);
					}
				} else if (currentCharacter(state) === "i") {
					state.token += "i";
					next(state);
					while (parse.isDigit(currentCharacter(state))) {
						state.token += currentCharacter(state);
						next(state);
					}
				}
				return;
			}
			if (currentCharacter(state) === ".") {
				state.token += currentCharacter(state);
				next(state);
				if (!parse.isDigit(currentCharacter(state))) {
					state.tokenType = TOKENTYPE.DELIMITER;
					return;
				}
			} else {
				while (parse.isDigit(currentCharacter(state))) {
					state.token += currentCharacter(state);
					next(state);
				}
				if (parse.isDecimalMark(currentCharacter(state), nextCharacter(state))) {
					state.token += currentCharacter(state);
					next(state);
				}
			}
			while (parse.isDigit(currentCharacter(state))) {
				state.token += currentCharacter(state);
				next(state);
			}
			if (currentCharacter(state) === "E" || currentCharacter(state) === "e") {
				if (parse.isDigit(nextCharacter(state)) || nextCharacter(state) === "-" || nextCharacter(state) === "+") {
					state.token += currentCharacter(state);
					next(state);
					if (currentCharacter(state) === "+" || currentCharacter(state) === "-") {
						state.token += currentCharacter(state);
						next(state);
					}
					if (!parse.isDigit(currentCharacter(state))) throw createSyntaxError(state, "Digit expected, got \"" + currentCharacter(state) + "\"");
					while (parse.isDigit(currentCharacter(state))) {
						state.token += currentCharacter(state);
						next(state);
					}
					if (parse.isDecimalMark(currentCharacter(state), nextCharacter(state))) throw createSyntaxError(state, "Digit expected, got \"" + currentCharacter(state) + "\"");
				} else if (parse.isDecimalMark(nextCharacter(state), state.expression.charAt(state.index + 2))) {
					next(state);
					throw createSyntaxError(state, "Digit expected, got \"" + currentCharacter(state) + "\"");
				}
			}
			return;
		}
		if (parse.isAlpha(currentCharacter(state), prevCharacter(state), nextCharacter(state))) {
			while (parse.isAlpha(currentCharacter(state), prevCharacter(state), nextCharacter(state)) || parse.isDigit(currentCharacter(state))) {
				state.token += currentCharacter(state);
				next(state);
			}
			if (hasOwnProperty(NAMED_DELIMITERS, state.token)) state.tokenType = TOKENTYPE.DELIMITER;
			else state.tokenType = TOKENTYPE.SYMBOL;
			return;
		}
		state.tokenType = TOKENTYPE.UNKNOWN;
		while (currentCharacter(state) !== "") {
			state.token += currentCharacter(state);
			next(state);
		}
		throw createSyntaxError(state, "Syntax error in part \"" + state.token + "\"");
	}
	/**
	* Get next token and skip newline tokens
	*/
	function getTokenSkipNewline(state) {
		do
			getToken(state);
		while (state.token === "\n");
	}
	/**
	* Open parameters.
	* New line characters will be ignored until closeParams(state) is called
	*/
	function openParams(state) {
		state.nestingLevel++;
	}
	/**
	* Close parameters.
	* New line characters will no longer be ignored
	*/
	function closeParams(state) {
		state.nestingLevel--;
	}
	/**
	* Checks whether the current character `c` is a valid alpha character:
	*
	* - A latin letter (upper or lower case) Ascii: a-z, A-Z
	* - An underscore                        Ascii: _
	* - A dollar sign                        Ascii: $
	* - A latin letter with accents          Unicode: \u00C0 - \u02AF
	* - A greek letter                       Unicode: \u0370 - \u03FF
	* - A mathematical alphanumeric symbol   Unicode: \u{1D400} - \u{1D7FF} excluding invalid code points
	*
	* The previous and next characters are needed to determine whether
	* this character is part of a unicode surrogate pair.
	*
	* @param {string} c      Current character in the expression
	* @param {string} cPrev  Previous character
	* @param {string} cNext  Next character
	* @return {boolean}
	*/
	parse.isAlpha = function isAlpha(c, cPrev, cNext) {
		return parse.isValidLatinOrGreek(c) || parse.isValidMathSymbol(c, cNext) || parse.isValidMathSymbol(cPrev, c);
	};
	/**
	* Test whether a character is a valid latin, greek, or letter-like character
	* @param {string} c
	* @return {boolean}
	*/
	parse.isValidLatinOrGreek = function isValidLatinOrGreek(c) {
		return /^[a-zA-Z_$\u00C0-\u02AF\u0370-\u03FF\u2100-\u214F]$/.test(c);
	};
	/**
	* Test whether two given 16 bit characters form a surrogate pair of a
	* unicode math symbol.
	*
	* https://unicode-table.com/en/
	* https://www.wikiwand.com/en/Mathematical_operators_and_symbols_in_Unicode
	*
	* Note: In ES6 will be unicode aware:
	* https://stackoverflow.com/questions/280712/javascript-unicode-regexes
	* https://mathiasbynens.be/notes/es6-unicode-regex
	*
	* @param {string} high
	* @param {string} low
	* @return {boolean}
	*/
	parse.isValidMathSymbol = function isValidMathSymbol(high, low) {
		return /^[\uD835]$/.test(high) && /^[\uDC00-\uDFFF]$/.test(low) && /^[^\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDFCC\uDFCD]$/.test(low);
	};
	/**
	* Check whether given character c is a white space character: space, tab, or enter
	* @param {string} c
	* @param {number} nestingLevel
	* @return {boolean}
	*/
	parse.isWhitespace = function isWhitespace(c, nestingLevel) {
		return c === " " || c === "	" || c === "\xA0" || c === "\n" && nestingLevel > 0;
	};
	/**
	* Test whether the character c is a decimal mark (dot).
	* This is the case when it's not the start of a delimiter '.*', './', or '.^'
	* @param {string} c
	* @param {string} cNext
	* @return {boolean}
	*/
	parse.isDecimalMark = function isDecimalMark(c, cNext) {
		return c === "." && cNext !== "/" && cNext !== "*" && cNext !== "^";
	};
	/**
	* checks if the given char c is a digit or dot
	* @param {string} c   a string with one character
	* @return {boolean}
	*/
	parse.isDigitDot = function isDigitDot(c) {
		return c >= "0" && c <= "9" || c === ".";
	};
	/**
	* checks if the given char c is a digit
	* @param {string} c   a string with one character
	* @return {boolean}
	*/
	parse.isDigit = function isDigit(c) {
		return c >= "0" && c <= "9";
	};
	/**
	* Start of the parse levels below, in order of precedence
	* @return {Node} node
	* @private
	*/
	function parseStart(expression, extraNodes) {
		var state = initialState();
		(0, import_extends.default)(state, {
			expression,
			extraNodes
		});
		getToken(state);
		var node = parseBlock(state);
		if (state.token !== "") {
			if (state.tokenType === TOKENTYPE.DELIMITER) throw createError(state, "Unexpected operator " + state.token);
			else throw createSyntaxError(state, "Unexpected part \"" + state.token + "\"");
		}
		return node;
	}
	/**
	* Parse a block with expressions. Expressions can be separated by a newline
	* character '\n', or by a semicolon ';'. In case of a semicolon, no output
	* of the preceding line is returned.
	* @return {Node} node
	* @private
	*/
	function parseBlock(state) {
		var node;
		var blocks = [];
		var visible;
		if (state.token !== "" && state.token !== "\n" && state.token !== ";") {
			node = parseAssignment(state);
			if (state.comment) node.comment = state.comment;
		}
		while (state.token === "\n" || state.token === ";") {
			if (blocks.length === 0 && node) {
				visible = state.token !== ";";
				blocks.push({
					node,
					visible
				});
			}
			getToken(state);
			if (state.token !== "\n" && state.token !== ";" && state.token !== "") {
				node = parseAssignment(state);
				if (state.comment) node.comment = state.comment;
				visible = state.token !== ";";
				blocks.push({
					node,
					visible
				});
			}
		}
		if (blocks.length > 0) return new BlockNode(blocks);
		else {
			if (!node) {
				node = new ConstantNode(void 0);
				if (state.comment) node.comment = state.comment;
			}
			return node;
		}
	}
	/**
	* Assignment of a function or variable,
	* - can be a variable like 'a=2.3'
	* - or a updating an existing variable like 'matrix(2,3:5)=[6,7,8]'
	* - defining a function like 'f(x) = x^2'
	* @return {Node} node
	* @private
	*/
	function parseAssignment(state) {
		var name, args, value, valid;
		var node = parseConditional(state);
		if (state.token === "=") {
			if (isSymbolNode(node)) {
				name = node.name;
				getTokenSkipNewline(state);
				value = parseAssignment(state);
				return new AssignmentNode(new SymbolNode(name), value);
			} else if (isAccessorNode(node)) {
				if (node.optionalChaining) throw createSyntaxError(state, "Cannot assign to optional chain");
				getTokenSkipNewline(state);
				value = parseAssignment(state);
				return new AssignmentNode(node.object, node.index, value);
			} else if (isFunctionNode(node) && isSymbolNode(node.fn)) {
				valid = true;
				args = [];
				name = node.name;
				node.args.forEach(function(arg, index) {
					if (isSymbolNode(arg)) args[index] = arg.name;
					else valid = false;
				});
				if (valid) {
					getTokenSkipNewline(state);
					value = parseAssignment(state);
					return new FunctionAssignmentNode(name, args, value);
				}
			}
			throw createSyntaxError(state, "Invalid left hand side of assignment operator =");
		}
		return node;
	}
	/**
	* conditional operation
	*
	*     condition ? truePart : falsePart
	*
	* Note: conditional operator is right-associative
	*
	* @return {Node} node
	* @private
	*/
	function parseConditional(state) {
		var node = parseLogicalOr(state);
		while (state.token === "?") {
			var prev = state.conditionalLevel;
			state.conditionalLevel = state.nestingLevel;
			getTokenSkipNewline(state);
			var condition = node;
			var trueExpr = parseAssignment(state);
			if (state.token !== ":") throw createSyntaxError(state, "False part of conditional expression expected");
			state.conditionalLevel = null;
			getTokenSkipNewline(state);
			node = new ConditionalNode(condition, trueExpr, parseAssignment(state));
			state.conditionalLevel = prev;
		}
		return node;
	}
	/**
	* logical or, 'x or y'
	* @return {Node} node
	* @private
	*/
	function parseLogicalOr(state) {
		var node = parseLogicalXor(state);
		while (state.token === "or") {
			getTokenSkipNewline(state);
			node = new OperatorNode("or", "or", [node, parseLogicalXor(state)]);
		}
		return node;
	}
	/**
	* logical exclusive or, 'x xor y'
	* @return {Node} node
	* @private
	*/
	function parseLogicalXor(state) {
		var node = parseLogicalAnd(state);
		while (state.token === "xor") {
			getTokenSkipNewline(state);
			node = new OperatorNode("xor", "xor", [node, parseLogicalAnd(state)]);
		}
		return node;
	}
	/**
	* logical and, 'x and y'
	* @return {Node} node
	* @private
	*/
	function parseLogicalAnd(state) {
		var node = parseBitwiseOr(state);
		while (state.token === "and") {
			getTokenSkipNewline(state);
			node = new OperatorNode("and", "and", [node, parseBitwiseOr(state)]);
		}
		return node;
	}
	/**
	* bitwise or, 'x | y'
	* @return {Node} node
	* @private
	*/
	function parseBitwiseOr(state) {
		var node = parseBitwiseXor(state);
		while (state.token === "|") {
			getTokenSkipNewline(state);
			node = new OperatorNode("|", "bitOr", [node, parseBitwiseXor(state)]);
		}
		return node;
	}
	/**
	* bitwise exclusive or (xor), 'x ^| y'
	* @return {Node} node
	* @private
	*/
	function parseBitwiseXor(state) {
		var node = parseBitwiseAnd(state);
		while (state.token === "^|") {
			getTokenSkipNewline(state);
			node = new OperatorNode("^|", "bitXor", [node, parseBitwiseAnd(state)]);
		}
		return node;
	}
	/**
	* bitwise and, 'x & y'
	* @return {Node} node
	* @private
	*/
	function parseBitwiseAnd(state) {
		var node = parseRelational(state);
		while (state.token === "&") {
			getTokenSkipNewline(state);
			node = new OperatorNode("&", "bitAnd", [node, parseRelational(state)]);
		}
		return node;
	}
	/**
	* Parse a chained conditional, like 'a > b >= c'
	* @return {Node} node
	*/
	function parseRelational(state) {
		var params = [parseShift(state)];
		var conditionals = [];
		var operators = {
			"==": "equal",
			"!=": "unequal",
			"<": "smaller",
			">": "larger",
			"<=": "smallerEq",
			">=": "largerEq"
		};
		while (hasOwnProperty(operators, state.token)) {
			var cond = {
				name: state.token,
				fn: operators[state.token]
			};
			conditionals.push(cond);
			getTokenSkipNewline(state);
			params.push(parseShift(state));
		}
		if (params.length === 1) return params[0];
		else if (params.length === 2) return new OperatorNode(conditionals[0].name, conditionals[0].fn, params);
		else return new RelationalNode(conditionals.map((c) => c.fn), params);
	}
	/**
	* Bitwise left shift, bitwise right arithmetic shift, bitwise right logical shift
	* @return {Node} node
	* @private
	*/
	function parseShift(state) {
		var node = parseConversion(state), name, fn, params;
		var operators = {
			"<<": "leftShift",
			">>": "rightArithShift",
			">>>": "rightLogShift"
		};
		while (hasOwnProperty(operators, state.token)) {
			name = state.token;
			fn = operators[name];
			getTokenSkipNewline(state);
			params = [node, parseConversion(state)];
			node = new OperatorNode(name, fn, params);
		}
		return node;
	}
	/**
	* conversion operators 'to' and 'in'
	* @return {Node} node
	* @private
	*/
	function parseConversion(state) {
		var node = parseRange(state), name, fn, params;
		var operators = {
			to: "to",
			in: "to"
		};
		while (hasOwnProperty(operators, state.token)) {
			name = state.token;
			fn = operators[name];
			getTokenSkipNewline(state);
			if (name === "in" && "])},;".includes(state.token)) node = new OperatorNode("*", "multiply", [node, new SymbolNode("in")], true);
			else {
				params = [node, parseRange(state)];
				node = new OperatorNode(name, fn, params);
			}
		}
		return node;
	}
	/**
	* parse range, "start:end", "start:step:end", ":", "start:", ":end", etc
	* @return {Node} node
	* @private
	*/
	function parseRange(state) {
		var node;
		var params = [];
		if (state.token === ":") {
			if (state.conditionalLevel === state.nestingLevel) throw createSyntaxError(state, "The true-expression of a conditional operator may not be empty");
			else node = new ConstantNode(1);
		} else node = parseAddSubtract(state);
		if (state.token === ":" && state.conditionalLevel !== state.nestingLevel) {
			params.push(node);
			while (state.token === ":" && params.length < 3) {
				getTokenSkipNewline(state);
				if (state.token === ")" || state.token === "]" || state.token === "," || state.token === "") params.push(new SymbolNode("end"));
				else params.push(parseAddSubtract(state));
			}
			if (params.length === 3) node = new RangeNode(params[0], params[2], params[1]);
			else node = new RangeNode(params[0], params[1]);
		}
		return node;
	}
	/**
	* add or subtract
	* @return {Node} node
	* @private
	*/
	function parseAddSubtract(state) {
		var node = parseMultiplyDivideModulus(state), name, fn, params;
		var operators = {
			"+": "add",
			"-": "subtract"
		};
		while (hasOwnProperty(operators, state.token)) {
			name = state.token;
			fn = operators[name];
			getTokenSkipNewline(state);
			var rightNode = parseMultiplyDivideModulus(state);
			if (rightNode.isPercentage) params = [node, new OperatorNode("*", "multiply", [node, rightNode])];
			else params = [node, rightNode];
			node = new OperatorNode(name, fn, params);
		}
		return node;
	}
	/**
	* multiply, divide, modulus
	* @return {Node} node
	* @private
	*/
	function parseMultiplyDivideModulus(state) {
		var node = parseImplicitMultiplication(state), last = node, name, fn;
		var operators = {
			"*": "multiply",
			".*": "dotMultiply",
			"/": "divide",
			"./": "dotDivide",
			"%": "mod",
			mod: "mod"
		};
		while (true) if (hasOwnProperty(operators, state.token)) {
			name = state.token;
			fn = operators[name];
			getTokenSkipNewline(state);
			last = parseImplicitMultiplication(state);
			node = new OperatorNode(name, fn, [node, last]);
		} else break;
		return node;
	}
	/**
	* implicit multiplication
	* @return {Node} node
	* @private
	*/
	function parseImplicitMultiplication(state) {
		var node = parseRule2(state), last = node;
		while (true) if (state.tokenType === TOKENTYPE.SYMBOL || state.token === "in" && isConstantNode(node) || state.token === "in" && isOperatorNode(node) && node.fn === "unaryMinus" && isConstantNode(node.args[0]) || state.tokenType === TOKENTYPE.NUMBER && !isConstantNode(last) && (!isOperatorNode(last) || last.op === "!") || state.token === "(") {
			last = parseRule2(state);
			node = new OperatorNode("*", "multiply", [node, last], true);
		} else break;
		return node;
	}
	/**
	* Infamous "rule 2" as described in https://github.com/josdejong/mathjs/issues/792#issuecomment-361065370
	* And as amended in https://github.com/josdejong/mathjs/issues/2370#issuecomment-1054052164
	* Explicit division gets higher precedence than implicit multiplication
	* when the division matches this pattern:
	*   [unaryPrefixOp]?[number] / [number] [symbol]
	* @return {Node} node
	* @private
	*/
	function parseRule2(state) {
		var node = parseUnaryPercentage(state);
		var last = node;
		var tokenStates = [];
		while (true) if (state.token === "/" && rule2Node(last)) {
			tokenStates.push((0, import_extends.default)({}, state));
			getTokenSkipNewline(state);
			if (state.tokenType === TOKENTYPE.NUMBER) {
				tokenStates.push((0, import_extends.default)({}, state));
				getTokenSkipNewline(state);
				if (state.tokenType === TOKENTYPE.SYMBOL || state.token === "(" || state.token === "in") {
					(0, import_extends.default)(state, tokenStates.pop());
					tokenStates.pop();
					last = parseUnaryPercentage(state);
					node = new OperatorNode("/", "divide", [node, last]);
				} else {
					tokenStates.pop();
					(0, import_extends.default)(state, tokenStates.pop());
					break;
				}
			} else {
				(0, import_extends.default)(state, tokenStates.pop());
				break;
			}
		} else break;
		return node;
	}
	/**
	* Unary percentage operator (treated as `value / 100`)
	* @return {Node} node
	* @private
	*/
	function parseUnaryPercentage(state) {
		var node = parseUnary(state);
		if (state.token === "%") {
			var previousState = (0, import_extends.default)({}, state);
			getTokenSkipNewline(state);
			try {
				parseUnary(state);
				(0, import_extends.default)(state, previousState);
			} catch (_unused) {
				node = new OperatorNode("/", "divide", [node, new ConstantNode(100)], false, true);
			}
		}
		return node;
	}
	/**
	* Unary plus and minus, and logical and bitwise not
	* @return {Node} node
	* @private
	*/
	function parseUnary(state) {
		var name, params, fn;
		var operators = {
			"-": "unaryMinus",
			"+": "unaryPlus",
			"~": "bitNot",
			not: "not"
		};
		if (hasOwnProperty(operators, state.token)) {
			fn = operators[state.token];
			name = state.token;
			getTokenSkipNewline(state);
			params = [parseUnary(state)];
			return new OperatorNode(name, fn, params);
		}
		return parsePow(state);
	}
	/**
	* power
	* Note: power operator is right associative
	* @return {Node} node
	* @private
	*/
	function parsePow(state) {
		var node = parseNullishCoalescing(state), name, fn, params;
		if (state.token === "^" || state.token === ".^") {
			name = state.token;
			fn = name === "^" ? "pow" : "dotPow";
			getTokenSkipNewline(state);
			params = [node, parseUnary(state)];
			node = new OperatorNode(name, fn, params);
		}
		return node;
	}
	/**
	* nullish coalescing operator
	* @return {Node} node
	* @private
	*/
	function parseNullishCoalescing(state) {
		var node = parseLeftHandOperators(state);
		while (state.token === "??") {
			getTokenSkipNewline(state);
			node = new OperatorNode("??", "nullish", [node, parseLeftHandOperators(state)]);
		}
		return node;
	}
	/**
	* Left hand operators: factorial x!, ctranspose x'
	* @return {Node} node
	* @private
	*/
	function parseLeftHandOperators(state) {
		var node = parseCustomNodes(state), name, fn, params;
		var operators = {
			"!": "factorial",
			"'": "ctranspose"
		};
		while (hasOwnProperty(operators, state.token)) {
			name = state.token;
			fn = operators[name];
			getToken(state);
			params = [node];
			node = new OperatorNode(name, fn, params);
			node = parseAccessors(state, node);
		}
		return node;
	}
	/**
	* Parse a custom node handler. A node handler can be used to process
	* nodes in a custom way, for example for handling a plot.
	*
	* A handler must be passed as second argument of the parse function.
	* - must extend math.Node
	* - must contain a function _compile(defs: Object) : string
	* - must contain a function find(filter: Object) : Node[]
	* - must contain a function toString() : string
	* - the constructor is called with a single argument containing all parameters
	*
	* For example:
	*
	*     nodes = {
	*       'plot': PlotHandler
	*     }
	*
	* The constructor of the handler is called as:
	*
	*     node = new PlotHandler(params)
	*
	* The handler will be invoked when evaluating an expression like:
	*
	*     node = math.parse('plot(sin(x), x)', nodes)
	*
	* @return {Node} node
	* @private
	*/
	function parseCustomNodes(state) {
		var params = [];
		if (state.tokenType === TOKENTYPE.SYMBOL && hasOwnProperty(state.extraNodes, state.token)) {
			var CustomNode = state.extraNodes[state.token];
			getToken(state);
			if (state.token === "(") {
				params = [];
				openParams(state);
				getToken(state);
				if (state.token !== ")") {
					params.push(parseAssignment(state));
					while (state.token === ",") {
						getToken(state);
						params.push(parseAssignment(state));
					}
				}
				if (state.token !== ")") throw createSyntaxError(state, "Parenthesis ) expected");
				closeParams(state);
				getToken(state);
			}
			return new CustomNode(params);
		}
		return parseSymbol(state);
	}
	/**
	* parse symbols: functions, variables, constants, units
	* @return {Node} node
	* @private
	*/
	function parseSymbol(state) {
		var node, name;
		if (state.tokenType === TOKENTYPE.SYMBOL || state.tokenType === TOKENTYPE.DELIMITER && state.token in NAMED_DELIMITERS) {
			name = state.token;
			getToken(state);
			if (hasOwnProperty(CONSTANTS, name)) node = new ConstantNode(CONSTANTS[name]);
			else if (NUMERIC_CONSTANTS.includes(name)) node = new ConstantNode(numeric(name, "number"));
			else node = new SymbolNode(name);
			node = parseAccessors(state, node);
			return node;
		}
		return parseString(state);
	}
	/**
	* parse accessors:
	* - function invocation in round brackets (...), for example sqrt(2) or sqrt?.(2) with optional chaining
	* - index enclosed in square brackets [...], for example A[2,3] or A?.[2,3] with optional chaining
	* - dot notation for properties, like foo.bar or foo?.bar with optional chaining
	* @param {Object} state
	* @param {Node} node    Node on which to apply the parameters. If there
	*                       are no parameters in the expression, the node
	*                       itself is returned
	* @param {string[]} [types]  Filter the types of notations
	*                            can be ['(', '[', '.']
	* @return {Node} node
	* @private
	*/
	function parseAccessors(state, node, types) {
		var params;
		while (true) {
			var optional = false;
			if (state.token === "?.") {
				optional = true;
				getToken(state);
			}
			var hasNextAccessor = (state.token === "(" || state.token === "[" || state.token === ".") && (!types || types.includes(state.token));
			if (!(optional || hasNextAccessor)) break;
			params = [];
			if (state.token === "(") {
				if (optional || isSymbolNode(node) || isAccessorNode(node)) {
					openParams(state);
					getToken(state);
					if (state.token !== ")") {
						params.push(parseAssignment(state));
						while (state.token === ",") {
							getToken(state);
							params.push(parseAssignment(state));
						}
					}
					if (state.token !== ")") throw createSyntaxError(state, "Parenthesis ) expected");
					closeParams(state);
					getToken(state);
					node = new FunctionNode(node, params, optional);
				} else return node;
			} else if (state.token === "[") {
				openParams(state);
				getToken(state);
				if (state.token !== "]") {
					params.push(parseAssignment(state));
					while (state.token === ",") {
						getToken(state);
						params.push(parseAssignment(state));
					}
				}
				if (state.token !== "]") throw createSyntaxError(state, "Parenthesis ] expected");
				closeParams(state);
				getToken(state);
				node = new AccessorNode(node, new IndexNode(params), optional);
			} else {
				if (!optional) getToken(state);
				if (!(state.tokenType === TOKENTYPE.SYMBOL || state.tokenType === TOKENTYPE.DELIMITER && state.token in NAMED_DELIMITERS)) {
					var message = "Property name expected after ";
					message += optional ? "optional chain" : "dot";
					throw createSyntaxError(state, message);
				}
				params.push(new ConstantNode(state.token));
				getToken(state);
				node = new AccessorNode(node, new IndexNode(params, true), optional);
			}
		}
		return node;
	}
	/**
	* Parse a single or double quoted string.
	* @return {Node} node
	* @private
	*/
	function parseString(state) {
		var node, str;
		if (state.token === "\"" || state.token === "'") {
			str = parseStringToken(state, state.token);
			node = new ConstantNode(str);
			node = parseAccessors(state, node);
			return node;
		}
		return parseMatrix(state);
	}
	/**
	* Parse a string surrounded by single or double quotes
	* @param {Object} state
	* @param {"'" | "\""} quote
	* @return {string}
	*/
	function parseStringToken(state, quote) {
		var str = "";
		while (currentCharacter(state) !== "" && currentCharacter(state) !== quote) if (currentCharacter(state) === "\\") {
			next(state);
			var char = currentCharacter(state);
			var escapeChar = ESCAPE_CHARACTERS[char];
			if (escapeChar !== void 0) {
				str += escapeChar;
				state.index += 1;
			} else if (char === "u") {
				var unicode = state.expression.slice(state.index + 1, state.index + 5);
				if (/^[0-9A-Fa-f]{4}$/.test(unicode)) {
					str += String.fromCharCode(parseInt(unicode, 16));
					state.index += 5;
				} else throw createSyntaxError(state, "Invalid unicode character \\u".concat(unicode));
			} else throw createSyntaxError(state, "Bad escape character \\".concat(char));
		} else {
			str += currentCharacter(state);
			next(state);
		}
		getToken(state);
		if (state.token !== quote) throw createSyntaxError(state, "End of string ".concat(quote, " expected"));
		getToken(state);
		return str;
	}
	/**
	* parse the matrix
	* @return {Node} node
	* @private
	*/
	function parseMatrix(state) {
		var array, params, rows, cols;
		if (state.token === "[") {
			openParams(state);
			getToken(state);
			if (state.token !== "]") {
				var row = parseRow(state);
				if (state.token === ";") {
					rows = 1;
					params = [row];
					while (state.token === ";") {
						getToken(state);
						if (state.token !== "]") {
							params[rows] = parseRow(state);
							rows++;
						}
					}
					if (state.token !== "]") throw createSyntaxError(state, "End of matrix ] expected");
					closeParams(state);
					getToken(state);
					cols = params[0].items.length;
					for (var r = 1; r < rows; r++) if (params[r].items.length !== cols) throw createError(state, "Column dimensions mismatch (" + params[r].items.length + " !== " + cols + ")");
					array = new ArrayNode(params);
				} else {
					if (state.token !== "]") throw createSyntaxError(state, "End of matrix ] expected");
					closeParams(state);
					getToken(state);
					array = row;
				}
			} else {
				closeParams(state);
				getToken(state);
				array = new ArrayNode([]);
			}
			return parseAccessors(state, array);
		}
		return parseObject(state);
	}
	/**
	* Parse a single comma-separated row from a matrix, like 'a, b, c'
	* @return {ArrayNode} node
	*/
	function parseRow(state) {
		var params = [parseAssignment(state)];
		var len = 1;
		while (state.token === ",") {
			getToken(state);
			if (state.token !== "]" && state.token !== ";") {
				params[len] = parseAssignment(state);
				len++;
			}
		}
		return new ArrayNode(params);
	}
	/**
	* parse an object, enclosed in angle brackets{...}, for example {value: 2}
	* @return {Node} node
	* @private
	*/
	function parseObject(state) {
		if (state.token === "{") {
			openParams(state);
			var key;
			var properties = {};
			do {
				getToken(state);
				if (state.token !== "}") {
					if (state.token === "\"" || state.token === "'") key = parseStringToken(state, state.token);
					else if (state.tokenType === TOKENTYPE.SYMBOL || state.tokenType === TOKENTYPE.DELIMITER && state.token in NAMED_DELIMITERS) {
						key = state.token;
						getToken(state);
					} else throw createSyntaxError(state, "Symbol or string expected as object key");
					if (state.token !== ":") throw createSyntaxError(state, "Colon : expected after object key");
					getToken(state);
					properties[key] = parseAssignment(state);
				}
			} while (state.token === ",");
			if (state.token !== "}") throw createSyntaxError(state, "Comma , or bracket } expected after object value");
			closeParams(state);
			getToken(state);
			var node = new ObjectNode(properties);
			node = parseAccessors(state, node);
			return node;
		}
		return parseNumber(state);
	}
	/**
	* parse a number
	* @return {Node} node
	* @private
	*/
	function parseNumber(state) {
		var numberStr;
		if (state.tokenType === TOKENTYPE.NUMBER) {
			numberStr = state.token;
			getToken(state);
			var numericType = safeNumberType(numberStr, config);
			return new ConstantNode(numeric(numberStr, numericType));
		}
		return parseParentheses(state);
	}
	/**
	* parentheses
	* @return {Node} node
	* @private
	*/
	function parseParentheses(state) {
		var node;
		if (state.token === "(") {
			openParams(state);
			getToken(state);
			node = parseAssignment(state);
			if (state.token !== ")") throw createSyntaxError(state, "Parenthesis ) expected");
			closeParams(state);
			getToken(state);
			node = new ParenthesisNode(node);
			node = parseAccessors(state, node);
			return node;
		}
		return parseEnd(state);
	}
	/**
	* Evaluated when the expression is not yet ended but expected to end
	* @return {Node} res
	* @private
	*/
	function parseEnd(state) {
		if (state.token === "") throw createSyntaxError(state, "Unexpected end of expression");
		else throw createSyntaxError(state, "Value expected");
	}
	/**
	* Shortcut for getting the current row value (one based)
	* Returns the line of the currently handled expression
	* @private
	*/
	/**
	* Shortcut for getting the current col value (one based)
	* Returns the column (position) where the last state.token starts
	* @private
	*/
	function col(state) {
		return state.index - state.token.length + 1;
	}
	/**
	* Create an error
	* @param {Object} state
	* @param {string} message
	* @return {SyntaxError} instantiated error
	* @private
	*/
	function createSyntaxError(state, message) {
		var c = col(state);
		var error = /* @__PURE__ */ new SyntaxError(message + " (char " + c + ")");
		error.char = c;
		return error;
	}
	/**
	* Create an error
	* @param {Object} state
	* @param {string} message
	* @return {Error} instantiated error
	* @private
	*/
	function createError(state, message) {
		var c = col(state);
		var error = /* @__PURE__ */ new SyntaxError(message + " (char " + c + ")");
		error.char = c;
		return error;
	}
	typed.addConversion({
		from: "string",
		to: "Node",
		convert: parse
	});
	return parse;
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/matrix/size.js
var name$5 = "size";
var createSize = /* #__PURE__ */ factory(name$5, ["typed"], (_ref) => {
	var { typed } = _ref;
	/**
	* Calculate the size of a matrix or scalar. Always returns an Array containing numbers.
	*
	* Note that in mathjs v14 and older, function size could return a Matrix depending on
	* the input type and configuration.
	*
	* Syntax:
	*
	*     math.size(x)
	*
	* Examples:
	*
	*     math.size(2.3)                       // returns []
	*     math.size('hello world')             // returns [11]
	*
	*     const A = [[1, 2, 3], [4, 5, 6]]
	*     math.size(A)                         // returns [2, 3]
	*     math.size(math.range(1,6).toArray()) // returns [5]
	*
	* See also:
	*
	*     count, resize, squeeze, subset
	*
	* @param {boolean | number | Complex | Unit | string | Array | Matrix} x  A matrix
	* @return {Array} A vector with size of `x`.
	*/
	return typed(name$5, {
		Matrix: (x) => x.size(),
		Array: arraySize,
		string: (x) => [x.length],
		"number | Complex | BigNumber | Unit | boolean | null": (_x) => []
	});
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/relational/equalScalar.js
var name$4 = "equalScalar";
var createEqualScalarNumber = factory(name$4, ["typed", "config"], (_ref2) => {
	var { typed, config } = _ref2;
	return typed(name$4, { "number, number": function number_number(x, y) {
		return nearlyEqual(x, y, config.relTol, config.absTol);
	} });
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/relational/equal.js
var name$3 = "equal";
var createEqualNumber = factory(name$3, ["typed", "equalScalar"], (_ref2) => {
	var { typed, equalScalar } = _ref2;
	return typed(name$3, { "any, any": function any_any(x, y) {
		if (x === null) return y === null;
		if (y === null) return x === null;
		if (x === void 0) return y === void 0;
		if (y === void 0) return x === void 0;
		return equalScalar(x, y);
	} });
});
//#endregion
//#region node_modules/mathjs/lib/esm/function/utils/isBounded.js
var name$2 = "isBounded";
var createIsBounded = /* #__PURE__ */ factory(name$2, ["typed"], (_ref) => {
	var { typed } = _ref;
	/**
	* Test whether a value is bounded. For scalars, this test is equivalent
	* to the isFinite finiteness test. On the other hand, a Matrix or Array
	* is defined to be bounded if every entry is finite.
	*
	* Syntax:
	*
	*     math.isBounded(x)
	*
	* Examples:
	*
	*    math.isBounded(0)                        // returns true
	*    math.isBounded(NaN)                      // returns false
	*    math.isBounded(math.bignumber(Infinity)) // returns false
	*    math.isBounded(math.fraction(1,3))       // returns true
	*    math.isBounded(math.complex('2 - 4i'))   // returns true
	*    math.isBounded(-10000000000000000n)      // returns true
	*    math.isBounded(undefined)                // returns false
	*    math.isBounded(null)                     // returns false
	*    math.isBounded([0.001, -3n, 0])          // returns true
	*    math.isBounded([2, -Infinity, -3])       // returns false
	*
	* See also:
	*
	*    isFinite, isNumeric, isPositive, isNegative, isNaN
	*
	* @param {number | BigNumber | bigint | Complex | Fraction | Unit | Array | Matrix} x       Value to be tested
	* @return {boolean}  Returns true when `x` is bounded.
	*/
	return typed(name$2, {
		number: (n) => Number.isFinite(n),
		"BigNumber | Complex": (x) => x.isFinite(),
		"bigint | Fraction": () => true,
		"null | undefined": () => false,
		Unit: typed.referToSelf((self) => (x) => self(x.value)),
		"Array | Matrix": typed.referToSelf((self) => (A) => {
			if (!Array.isArray(A)) A = A.valueOf();
			return A.every((entry) => self(entry));
		})
	});
});
var createNumeric = /* #__PURE__ */ factory("numeric", [
	"number",
	"?bignumber",
	"?fraction"
], (_ref) => {
	var { number: _number, bignumber, fraction } = _ref;
	var validInputTypes = {
		string: true,
		number: true,
		BigNumber: true,
		Fraction: true
	};
	var validOutputTypes = {
		number: (x) => _number(x),
		BigNumber: bignumber ? (x) => bignumber(x) : noBignumber,
		bigint: (x) => BigInt(x),
		Fraction: fraction ? (x) => fraction(x) : noFraction
	};
	/**
	* Convert a numeric input to a specific numeric type: number, BigNumber, bigint, or Fraction.
	*
	* Syntax:
	*
	*    math.numeric(x)
	*    math.numeric(value, outputType)
	*
	* Examples:
	*
	*    math.numeric('4')                           // returns 4
	*    math.numeric('4', 'number')                 // returns 4
	*    math.numeric('4', 'bigint')                 // returns 4n
	*    math.numeric('4', 'BigNumber')              // returns BigNumber 4
	*    math.numeric('4', 'Fraction')               // returns Fraction 4
	*    math.numeric(4, 'Fraction')                 // returns Fraction 4
	*    math.numeric(math.fraction(2, 5), 'number') // returns 0.4
	*
	* See also:
	*
	*    number, fraction, bignumber, bigint, string, format
	*
	* History:
	*
	*    v6       Created
	*    v13      Added `bigint` support
	*    v14.2.1  Prefer mathjs `bigint()` to built-in `BigInt()`
	*
	* @param {string | number | BigNumber | bigint | Fraction } value
	*              A numeric value or a string containing a numeric value
	* @param {string} outputType
	*              Desired numeric output type.
	*              Available values: 'number', 'BigNumber', or 'Fraction'
	* @return {number | BigNumber | bigint | Fraction}
	*              Returns an instance of the numeric in the requested type
	*/
	return function numeric(value) {
		var outputType = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "number";
		if ((arguments.length > 2 ? arguments[2] : void 0) !== void 0) throw new SyntaxError("numeric() takes one or two arguments");
		var inputType = typeOf(value);
		if (!(inputType in validInputTypes)) throw new TypeError("Cannot convert " + value + " of type \"" + inputType + "\"; valid input types are " + Object.keys(validInputTypes).join(", "));
		if (!(outputType in validOutputTypes)) throw new TypeError("Cannot convert " + value + " to type \"" + outputType + "\"; valid output types are " + Object.keys(validOutputTypes).join(", "));
		if (outputType === inputType) return value;
		else return validOutputTypes[outputType](value);
	};
});
var createReplacer = /* #__PURE__ */ factory("replacer", [], () => {
	/**
	* Stringify data types into their JSON representation.
	* Most data types can be serialized using their `.toJSON` method,
	* but not all, for example the number `Infinity`. For these cases you have
	* to use the replacer. Example usage:
	*
	*     JSON.stringify([2, Infinity], math.replacer)
	*
	* @param {string} key
	* @param {*} value
	* @returns {*} Returns the replaced object
	*/
	return function replacer(key, value) {
		if (typeof value === "number" && (!Number.isFinite(value) || isNaN(value))) return {
			mathjs: "number",
			value: String(value)
		};
		if (typeof value === "bigint") return {
			mathjs: "bigint",
			value: String(value)
		};
		return value;
	};
});
//#endregion
//#region node_modules/mathjs/lib/esm/factoriesNumber.js
var createUnaryMinus = /* #__PURE__ */ createNumberFactory("unaryMinus", unaryMinusNumber);
var createUnaryPlus = /* #__PURE__ */ createNumberFactory("unaryPlus", unaryPlusNumber);
var createAbs = /* #__PURE__ */ createNumberFactory("abs", absNumber);
var createExp = /* #__PURE__ */ createNumberFactory("exp", expNumber);
var createMultiply = /* #__PURE__ */ createNumberFactory("multiply", multiplyNumber);
var createSqrt = /* #__PURE__ */ createNumberFactory("sqrt", sqrtNumber);
var createSubtract = /* #__PURE__ */ createNumberFactory("subtract", subtractNumber);
var createPow = /* #__PURE__ */ createNumberFactory("pow", powNumber);
var createLog = /* #__PURE__ */ createNumberOptionalSecondArgFactory("log", logNumber);
var createAdd = /* #__PURE__ */ createNumberFactory("add", addNumber);
var createDivide = /* #__PURE__ */ createNumberFactory("divide", divideNumber);
var createMatrix = /* #__PURE__ */ factory("matrix", [], () => noMatrix);
var createSubset = /* #__PURE__ */ factory("subset", [], () => noSubset);
createNumberFactory("combinations", combinationsNumber);
createNumberFactory("gamma", gammaNumber);
createNumberFactory("lgamma", lgammaNumber);
var createCos = /* #__PURE__ */ createNumberFactory("cos", cosNumber);
var createSin = /* #__PURE__ */ createNumberFactory("sin", sinNumber);
var createTan = /* #__PURE__ */ createNumberFactory("tan", tanNumber);
var createIsZero = /* #__PURE__ */ createNumberFactory("isZero", isZeroNumber);
function createNumberFactory(name, fn) {
	return factory(name, ["typed"], (_ref) => {
		var { typed } = _ref;
		return typed(fn);
	});
}
function createNumberOptionalSecondArgFactory(name, fn) {
	return factory(name, ["typed"], (_ref2) => {
		var { typed } = _ref2;
		return typed({
			number: fn,
			"number,number": fn
		});
	});
}
//#endregion
//#region node_modules/mathjs/lib/esm/error/ArgumentsError.js
/**
* Create a syntax error with the message:
*     'Wrong number of arguments in function <fn> (<count> provided, <min>-<max> expected)'
* @param {string} fn     Function name
* @param {number} count  Actual argument count
* @param {number} min    Minimum required argument count
* @param {number} [max]  Maximum required argument count
* @extends Error
*/
function ArgumentsError(fn, count, min, max) {
	if (!(this instanceof ArgumentsError)) throw new SyntaxError("Constructor must be called with the new operator");
	this.fn = fn;
	this.count = count;
	this.min = min;
	this.max = max;
	this.message = "Wrong number of arguments in function " + fn + " (" + count + " provided, " + min + (max !== void 0 && max !== null ? "-" + max : "") + " expected)";
	this.stack = (/* @__PURE__ */ new Error()).stack;
}
ArgumentsError.prototype = /* @__PURE__ */ new Error();
ArgumentsError.prototype.constructor = Error;
ArgumentsError.prototype.name = "ArgumentsError";
ArgumentsError.prototype.isArgumentsError = true;
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesTyped.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var typedDependencies = { createTyped };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesAbs.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var absDependencies = {
	typedDependencies,
	createAbs
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var NodeDependencies = { createNode };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSubset.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var subsetDependencies = { createSubset };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesAccessorNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var AccessorNodeDependencies = {
	NodeDependencies,
	subsetDependencies,
	createAccessorNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesAdd.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var addDependencies = {
	typedDependencies,
	createAdd
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesArrayNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var ArrayNodeDependencies = {
	NodeDependencies,
	createArrayNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesMatrix.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var matrixDependencies = { createMatrix };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesAssignmentNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var AssignmentNodeDependencies = {
	matrixDependencies,
	NodeDependencies,
	subsetDependencies,
	createAssignmentNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesNumber.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var numberDependencies = {
	typedDependencies,
	createNumber
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesPow.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var powDependencies = {
	typedDependencies,
	createPow
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesBlockNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var BlockNodeDependencies = {
	NodeDependencies,
	ResultSetDependencies: { createResultSet },
	createBlockNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesConditionalNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var ConditionalNodeDependencies = {
	NodeDependencies,
	createConditionalNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesIsBounded.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var isBoundedDependencies = {
	typedDependencies,
	createIsBounded
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesConstantNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var ConstantNodeDependencies = {
	NodeDependencies,
	isBoundedDependencies,
	createConstantNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesFunctionAssignmentNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var FunctionAssignmentNodeDependencies = {
	NodeDependencies,
	typedDependencies,
	createFunctionAssignmentNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSymbolNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var SymbolNodeDependencies = {
	NodeDependencies,
	createSymbolNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesFunctionNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var FunctionNodeDependencies = {
	NodeDependencies,
	SymbolNodeDependencies,
	createFunctionNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesIndexNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var IndexNodeDependencies = {
	NodeDependencies,
	sizeDependencies: {
		typedDependencies,
		createSize
	},
	createIndexNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesObjectNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var ObjectNodeDependencies = {
	NodeDependencies,
	createObjectNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesOperatorNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var OperatorNodeDependencies = {
	NodeDependencies,
	createOperatorNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesParenthesisNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var ParenthesisNodeDependencies = {
	NodeDependencies,
	createParenthesisNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesRangeNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var RangeNodeDependencies = {
	NodeDependencies,
	createRangeNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesRelationalNode.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var RelationalNodeDependencies = {
	NodeDependencies,
	createRelationalNode
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesNumeric.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var numericDependencies = {
	numberDependencies,
	createNumeric
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesParse.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var parseDependencies = {
	AccessorNodeDependencies,
	ArrayNodeDependencies,
	AssignmentNodeDependencies,
	BlockNodeDependencies,
	ConditionalNodeDependencies,
	ConstantNodeDependencies,
	FunctionAssignmentNodeDependencies,
	FunctionNodeDependencies,
	IndexNodeDependencies,
	ObjectNodeDependencies,
	OperatorNodeDependencies,
	ParenthesisNodeDependencies,
	RangeNodeDependencies,
	RelationalNodeDependencies,
	SymbolNodeDependencies,
	numericDependencies,
	typedDependencies,
	createParse
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesDivide.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var divideDependencies = {
	typedDependencies,
	createDivide
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesMultiply.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var multiplyDependencies = {
	typedDependencies,
	createMultiply
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSqrt.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var sqrtDependencies = {
	typedDependencies,
	createSqrt
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSubtract.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var subtractDependencies = {
	typedDependencies,
	createSubtract
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesCos.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var cosDependencies = {
	typedDependencies,
	createCos
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesUnaryPlus.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var unaryPlusDependencies = {
	typedDependencies,
	createUnaryPlus
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesEqual.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var equalDependencies = {
	equalScalarDependencies: {
		typedDependencies,
		createEqualScalar: createEqualScalarNumber
	},
	typedDependencies,
	createEqual: createEqualNumber
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesIsZero.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var isZeroDependencies = {
	typedDependencies,
	createIsZero
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesReplacer.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var replacerDependencies = { createReplacer };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesResolve.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var resolveDependencies = {
	ConstantNodeDependencies,
	FunctionNodeDependencies,
	OperatorNodeDependencies,
	ParenthesisNodeDependencies,
	parseDependencies,
	typedDependencies,
	createResolve
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSimplifyConstant.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var simplifyConstantDependencies = {
	AccessorNodeDependencies,
	ArrayNodeDependencies,
	ConstantNodeDependencies,
	FunctionNodeDependencies,
	IndexNodeDependencies,
	ObjectNodeDependencies,
	OperatorNodeDependencies,
	SymbolNodeDependencies,
	isBoundedDependencies,
	matrixDependencies,
	typedDependencies,
	createSimplifyConstant
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSimplifyCore.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var simplifyCoreDependencies = {
	AccessorNodeDependencies,
	ArrayNodeDependencies,
	ConstantNodeDependencies,
	FunctionNodeDependencies,
	IndexNodeDependencies,
	ObjectNodeDependencies,
	OperatorNodeDependencies,
	ParenthesisNodeDependencies,
	SymbolNodeDependencies,
	addDependencies,
	divideDependencies,
	equalDependencies,
	isZeroDependencies,
	multiplyDependencies,
	parseDependencies,
	powDependencies,
	subtractDependencies,
	typedDependencies,
	createSimplifyCore
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSimplify.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var simplifyDependencies = {
	AccessorNodeDependencies,
	ArrayNodeDependencies,
	ConstantNodeDependencies,
	FunctionNodeDependencies,
	IndexNodeDependencies,
	ObjectNodeDependencies,
	OperatorNodeDependencies,
	ParenthesisNodeDependencies,
	SymbolNodeDependencies,
	equalDependencies,
	parseDependencies,
	replacerDependencies,
	resolveDependencies,
	simplifyConstantDependencies,
	simplifyCoreDependencies,
	typedDependencies,
	createSimplify
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesDerivative.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var derivativeDependencies = {
	ConstantNodeDependencies,
	FunctionNodeDependencies,
	OperatorNodeDependencies,
	ParenthesisNodeDependencies,
	SymbolNodeDependencies,
	equalDependencies,
	isZeroDependencies,
	numericDependencies,
	parseDependencies,
	simplifyDependencies,
	typedDependencies,
	createDerivative
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesE.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var eDependencies = { createE };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesExp.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var expDependencies = {
	typedDependencies,
	createExp
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesLog.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var logDependencies = {
	typedDependencies,
	createLog
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesPi.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var piDependencies = { createPi };
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesRationalize.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var rationalizeDependencies = {
	AccessorNodeDependencies,
	ArrayNodeDependencies,
	ConstantNodeDependencies,
	FunctionNodeDependencies,
	IndexNodeDependencies,
	ObjectNodeDependencies,
	OperatorNodeDependencies,
	ParenthesisNodeDependencies,
	SymbolNodeDependencies,
	addDependencies,
	divideDependencies,
	equalDependencies,
	isZeroDependencies,
	matrixDependencies,
	multiplyDependencies,
	parseDependencies,
	powDependencies,
	simplifyDependencies,
	simplifyConstantDependencies,
	simplifyCoreDependencies,
	subtractDependencies,
	typedDependencies,
	createRationalize
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesSin.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var sinDependencies = {
	typedDependencies,
	createSin
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesTan.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var tanDependencies = {
	typedDependencies,
	createTan
};
//#endregion
//#region node_modules/mathjs/lib/esm/entry/dependenciesNumber/dependenciesUnaryMinus.generated.js
/**
* THIS FILE IS AUTO-GENERATED
* DON'T MAKE CHANGES HERE
*/
var unaryMinusDependencies = {
	typedDependencies,
	createUnaryMinus
};
//#endregion
//#region node_modules/mathjs/lib/esm/utils/emitter.js
var import_tiny_emitter = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function E() {}
	E.prototype = {
		on: function(name, callback, ctx) {
			var e = this.e || (this.e = {});
			(e[name] || (e[name] = [])).push({
				fn: callback,
				ctx
			});
			return this;
		},
		once: function(name, callback, ctx) {
			var self = this;
			function listener() {
				self.off(name, listener);
				callback.apply(ctx, arguments);
			}
			listener._ = callback;
			return this.on(name, listener, ctx);
		},
		emit: function(name) {
			var data = [].slice.call(arguments, 1);
			var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
			var i = 0;
			var len = evtArr.length;
			for (; i < len; i++) evtArr[i].fn.apply(evtArr[i].ctx, data);
			return this;
		},
		off: function(name, callback) {
			var e = this.e || (this.e = {});
			var evts = e[name];
			var liveEvents = [];
			if (evts && callback) {
				for (var i = 0, len = evts.length; i < len; i++) if (evts[i].fn !== callback && evts[i].fn._ !== callback) liveEvents.push(evts[i]);
			}
			liveEvents.length ? e[name] = liveEvents : delete e[name];
			return this;
		}
	};
	module.exports = E;
	module.exports.TinyEmitter = E;
})))(), 1);
/**
* Extend given object with emitter functions `on`, `off`, `once`, `emit`
* @param {Object} obj
* @return {Object} obj
*/
function mixin(obj) {
	var emitter = new import_tiny_emitter.default();
	obj.on = emitter.on.bind(emitter);
	obj.off = emitter.off.bind(emitter);
	obj.once = emitter.once.bind(emitter);
	obj.emit = emitter.emit.bind(emitter);
	return obj;
}
//#endregion
//#region node_modules/mathjs/lib/esm/core/function/import.js
function importFactory(typed, load, math, importedFactories) {
	/**
	* Import functions from an object or a module.
	*
	* This function is only available on a mathjs instance created using `create`.
	*
	* Syntax:
	*
	*    math.import(functions)
	*    math.import(functions, options)
	*
	* Where:
	*
	* - `functions: Object`
	*   An object with functions or factories to be imported.
	* - `options: Object` An object with import options. Available options:
	*   - `override: boolean`
	*     If true, existing functions will be overwritten. False by default.
	*   - `silent: boolean`
	*     If true, the function will not throw errors on duplicates or invalid
	*     types. False by default.
	*   - `wrap: boolean`
	*     If true, the functions will be wrapped in a wrapper function
	*     which converts data types like Matrix to primitive data types like Array.
	*     The wrapper is needed when extending math.js with libraries which do not
	*     support these data type. False by default.
	*
	* Examples:
	*
	*    import { create, all } from 'mathjs'
	*    import * as numbers from 'numbers'
	*
	*    // create a mathjs instance
	*    const math = create(all)
	*
	*    // define new functions and variables
	*    math.import({
	*      myvalue: 42,
	*      hello: function (name) {
	*        return 'hello, ' + name + '!'
	*      }
	*    })
	*
	*    // use the imported function and variable
	*    math.myvalue * 2               // 84
	*    math.hello('user')             // 'hello, user!'
	*
	*    // import the npm module 'numbers'
	*    // (must be installed first with `npm install numbers`)
	*    math.import(numbers, {wrap: true})
	*
	*    math.fibonacci(7) // returns 13
	*
	* History:
	*
	*    v0.2   Created
	*    v0.7   Changed second parameter to an options object
	*    v2     Dropped support for direct import of a module by name
	*    v14.2  Add facility for specifying the former name of an import
	*
	* @param {Object | Array} functions  Object with functions to be imported.
	* @param {Object} [options]          Import options.
	*/
	function mathImport(functions, options) {
		var num = arguments.length;
		if (num !== 1 && num !== 2) throw new ArgumentsError("import", num, 1, 2);
		if (!options) options = {};
		function flattenImports(flatValues, value, name) {
			if (Array.isArray(value)) value.forEach((item) => flattenImports(flatValues, item));
			else if (isObject(value) || isModule(value)) {
				for (var _name in value) if (hasOwnProperty(value, _name)) flattenImports(flatValues, value[_name], _name);
			} else if (isFactory(value) || name !== void 0) {
				var flatName = isFactory(value) ? isTransformFunctionFactory(value) ? value.fn + ".transform" : value.fn : name;
				if (hasOwnProperty(flatValues, flatName) && flatValues[flatName] !== value && !options.silent) throw new Error("Cannot import \"" + flatName + "\" twice");
				flatValues[flatName] = value;
			} else if (!options.silent) throw new TypeError("Factory, Object, or Array expected");
		}
		var flatValues = {};
		flattenImports(flatValues, functions);
		for (var name in flatValues) if (hasOwnProperty(flatValues, name)) {
			var value = flatValues[name];
			if (isFactory(value)) _importFactory(value, options);
			else if (isSupportedType(value)) _import(name, value, options);
			else if (!options.silent) throw new TypeError("Factory, Object, or Array expected");
		}
	}
	/**
	* Add a property to the math namespace
	* @param {string} name
	* @param {*} value
	* @param {Object} options  See import for a description of the options
	* @private
	*/
	function _import(name, value, options) {
		var _math$Unit;
		if (options.wrap && typeof value === "function") value = _wrap(value);
		if (hasTypedFunctionSignature(value)) value = typed(name, { [value.signature]: value });
		if (typed.isTypedFunction(math[name]) && typed.isTypedFunction(value)) {
			if (options.override) value = typed(name, value.signatures);
			else value = typed(math[name], value);
			math[name] = value;
			delete importedFactories[name];
			_importTransform(name, value);
			math.emit("import", name, function resolver() {
				return value;
			});
			return;
		}
		var isDefined = math[name] !== void 0;
		var isValuelessUnit = (_math$Unit = math.Unit) === null || _math$Unit === void 0 ? void 0 : _math$Unit.isValuelessUnit(name);
		if (!isDefined && !isValuelessUnit || options.override) {
			math[name] = value;
			delete importedFactories[name];
			_importTransform(name, value);
			math.emit("import", name, function resolver() {
				return value;
			});
			return;
		}
		if (!options.silent) throw new Error("Cannot import \"" + name + "\": already exists");
	}
	function _importTransform(name, value) {
		if (value && typeof value.transform === "function") {
			math.expression.transform[name] = value.transform;
			if (allowedInExpressions(name)) math.expression.mathWithTransform[name] = value.transform;
		} else {
			delete math.expression.transform[name];
			if (allowedInExpressions(name)) math.expression.mathWithTransform[name] = value;
		}
	}
	function _deleteTransform(name) {
		delete math.expression.transform[name];
		if (allowedInExpressions(name)) math.expression.mathWithTransform[name] = math[name];
		else delete math.expression.mathWithTransform[name];
	}
	/**
	* Create a wrapper a round an function which converts the arguments
	* to their primitive values (like convert a Matrix to Array)
	* @param {Function} fn
	* @return {Function} Returns the wrapped function
	* @private
	*/
	function _wrap(fn) {
		var wrapper = function wrapper() {
			var args = [];
			for (var i = 0, len = arguments.length; i < len; i++) {
				var arg = arguments[i];
				args[i] = arg && arg.valueOf();
			}
			return fn.apply(math, args);
		};
		if (fn.transform) wrapper.transform = fn.transform;
		return wrapper;
	}
	/**
	* Import an instance of a factory into math.js
	* @param {function(scope: object)} factory
	* @param {Object} options  See import for a description of the options
	* @param {string} [name=factory.name] Optional custom name
	* @private
	*/
	function _importFactory(factory, options) {
		var _factory$meta$formerl, _factory$meta;
		var name = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : factory.fn;
		if (name.includes(".")) throw new Error("Factory name should not contain a nested path. Name: " + JSON.stringify(name));
		var namespace = isTransformFunctionFactory(factory) ? math.expression.transform : math;
		var existingTransform = name in math.expression.transform;
		var existing = hasOwnProperty(namespace, name) ? namespace[name] : void 0;
		var resolver = function resolver() {
			var dependencies = {};
			factory.dependencies.map(stripOptionalNotation).forEach((dependency) => {
				if (dependency.includes(".")) throw new Error("Factory dependency should not contain a nested path. Name: " + JSON.stringify(dependency));
				if (dependency === "math") dependencies.math = math;
				else if (dependency === "mathWithTransform") dependencies.mathWithTransform = math.expression.mathWithTransform;
				else if (dependency === "classes") dependencies.classes = math;
				else dependencies[dependency] = math[dependency];
			});
			var instance = /* #__PURE__ */ factory(dependencies);
			if (instance && typeof instance.transform === "function") throw new Error("Transforms cannot be attached to factory functions. Please create a separate function for it with export const path = \"expression.transform\"");
			if (existing === void 0 || options.override) return instance;
			if (typed.isTypedFunction(existing) && typed.isTypedFunction(instance)) return typed(existing, instance);
			if (options.silent) return existing;
			else throw new Error("Cannot import \"" + name + "\": already exists");
		};
		var former = (_factory$meta$formerl = (_factory$meta = factory.meta) === null || _factory$meta === void 0 ? void 0 : _factory$meta.formerly) !== null && _factory$meta$formerl !== void 0 ? _factory$meta$formerl : "";
		var needsTransform = isTransformFunctionFactory(factory) || factoryAllowedInExpressions(factory);
		var withTransform = math.expression.mathWithTransform;
		if (!factory.meta || factory.meta.lazy !== false) {
			lazy(namespace, name, resolver);
			if (former) lazy(namespace, former, resolver);
			if (existing && existingTransform) {
				_deleteTransform(name);
				if (former) _deleteTransform(former);
			} else if (needsTransform) {
				lazy(withTransform, name, () => namespace[name]);
				if (former) lazy(withTransform, former, () => namespace[name]);
			}
		} else {
			namespace[name] = resolver();
			if (former) namespace[former] = namespace[name];
			if (existing && existingTransform) {
				_deleteTransform(name);
				if (former) _deleteTransform(former);
			} else if (needsTransform) {
				lazy(withTransform, name, () => namespace[name]);
				if (former) lazy(withTransform, former, () => namespace[name]);
			}
		}
		importedFactories[name] = factory;
		math.emit("import", name, resolver);
	}
	/**
	* Check whether given object is a type which can be imported
	* @param {Function | number | string | boolean | null | Unit | Complex} object
	* @return {boolean}
	* @private
	*/
	function isSupportedType(object) {
		return typeof object === "function" || typeof object === "number" || typeof object === "string" || typeof object === "boolean" || object === null || isUnit(object) || isComplex(object) || isBigNumber(object) || isFraction(object) || isMatrix(object) || Array.isArray(object);
	}
	function isModule(object) {
		return typeof object === "object" && object[Symbol.toStringTag] === "Module";
	}
	function hasTypedFunctionSignature(fn) {
		return typeof fn === "function" && typeof fn.signature === "string";
	}
	function allowedInExpressions(name) {
		return !hasOwnProperty(unsafe, name);
	}
	function factoryAllowedInExpressions(factory) {
		return !factory.fn.includes(".") && !hasOwnProperty(unsafe, factory.fn) && (!factory.meta || !factory.meta.isClass);
	}
	function isTransformFunctionFactory(factory) {
		return factory !== void 0 && factory.meta !== void 0 && factory.meta.isTransformFunction === true || false;
	}
	var unsafe = {
		expression: true,
		type: true,
		docs: true,
		error: true,
		json: true,
		chain: true
	};
	return mathImport;
}
//#endregion
//#region node_modules/mathjs/lib/esm/core/create.js
/**
* Create a mathjs instance from given factory functions and optionally config
*
* Usage:
*
*     const mathjs1 = create({ createAdd, createMultiply, ...})
*     const config = { number: 'BigNumber' }
*     const mathjs2 = create(all, config)
*
* @param {Object} [factories] An object with factory functions
*                             The object can contain nested objects,
*                             all nested objects will be flattened.
* @param {Object} [config]    Available options:
*                            {number} relTol
*                              Minimum relative difference between two
*                              compared values, used by all comparison functions.
*                            {number} absTol
*                              Minimum absolute difference between two
*                              compared values, used by all comparison functions.
*                            {string} matrix
*                              A string 'Matrix' (default) or 'Array'.
*                            {string} number
*                              A string 'number' (default), 'BigNumber', or 'Fraction'
*                            {number} precision
*                              The number of significant digits for BigNumbers.
*                              Not applicable for Numbers.
*                            {boolean} predictable
*                              Predictable output type of functions. When true,
*                              output type depends only on the input types. When
*                              false (default), output type can vary depending
*                              on input values. For example `math.sqrt(-4)`
*                              returns `complex('2i')` when predictable is false, and
*                              returns `NaN` when true.
*                            {string} randomSeed
*                              Random seed for seeded pseudo random number generator.
*                              Set to null to randomly seed.
* @returns {Object} Returns a bare-bone math.js instance containing
*                   functions:
*                   - `import` to add new functions
*                   - `config` to change configuration
*                   - `on`, `off`, `once`, `emit` for events
*/
function create(factories, config) {
	var configInternal = (0, import_extends.default)({}, DEFAULT_CONFIG, config);
	if (typeof Object.create !== "function") throw new Error("ES5 not supported by this JavaScript engine. Please load the es5-shim and es5-sham library for compatibility.");
	var math = mixin({
		isNumber,
		isComplex,
		isBigNumber,
		isBigInt,
		isFraction,
		isUnit,
		isString,
		isArray,
		isMatrix,
		isCollection,
		isDenseMatrix,
		isSparseMatrix,
		isRange,
		isIndex,
		isBoolean,
		isResultSet,
		isHelp,
		isFunction,
		isDate,
		isRegExp,
		isObject,
		isMap,
		isPartitionedMap,
		isObjectWrappingMap,
		isNull,
		isUndefined,
		isAccessorNode,
		isArrayNode,
		isAssignmentNode,
		isBlockNode,
		isConditionalNode,
		isConstantNode,
		isFunctionAssignmentNode,
		isFunctionNode,
		isIndexNode,
		isNode,
		isObjectNode,
		isOperatorNode,
		isParenthesisNode,
		isRangeNode,
		isRelationalNode,
		isSymbolNode,
		isChain
	});
	math.config = configFactory(configInternal, math.emit);
	math.expression = {
		transform: {},
		mathWithTransform: { config: math.config }
	};
	var legacyFactories = [];
	var legacyInstances = [];
	/**
	* Load a function or data type from a factory.
	* If the function or data type already exists, the existing instance is
	* returned.
	* @param {Function} factory
	* @returns {*}
	*/
	function load(factory) {
		if (isFactory(factory)) return factory(math);
		var firstProperty = factory[Object.keys(factory)[0]];
		if (isFactory(firstProperty)) return firstProperty(math);
		if (!isLegacyFactory(factory)) {
			console.warn("Factory object with properties `type`, `name`, and `factory` expected", factory);
			throw new Error("Factory object with properties `type`, `name`, and `factory` expected");
		}
		var index = legacyFactories.indexOf(factory);
		var instance;
		if (index === -1) {
			if (factory.math === true) instance = factory.factory(math.type, configInternal, load, math.typed, math);
			else instance = factory.factory(math.type, configInternal, load, math.typed);
			legacyFactories.push(factory);
			legacyInstances.push(instance);
		} else instance = legacyInstances[index];
		return instance;
	}
	var importedFactories = {};
	function lazyTyped() {
		for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
		return math.typed.apply(math.typed, args);
	}
	lazyTyped.isTypedFunction = import_typed_function.default.isTypedFunction;
	var internalImport = importFactory(lazyTyped, load, math, importedFactories);
	math.import = internalImport;
	math.on("config", () => {
		Object.values(importedFactories).forEach((factory) => {
			if (factory && factory.meta && factory.meta.recreateOnConfigChange) internalImport(factory, { override: true });
		});
	});
	math.create = create.bind(null, factories);
	math.factory = factory;
	math.import(Object.values(deepFlatten(factories)));
	math.ArgumentsError = ArgumentsError;
	math.DimensionError = DimensionError;
	math.IndexError = IndexError;
	return math;
}
//#endregion
//#region src/lib/formula-math.js
const formulaMath = create({
	...parseDependencies,
	...simplifyDependencies,
	...rationalizeDependencies,
	...sqrtDependencies,
	...absDependencies,
	...sinDependencies,
	...cosDependencies,
	...tanDependencies,
	...expDependencies,
	...logDependencies,
	...eDependencies,
	...piDependencies,
	...addDependencies,
	...subtractDependencies,
	...multiplyDependencies,
	...divideDependencies,
	...powDependencies,
	...unaryMinusDependencies,
	...unaryPlusDependencies,
	...derivativeDependencies
}, {
	relTol: Number.MIN_VALUE,
	absTol: 0
});
//#endregion
//#region src/lib/formula-calculus.js
const { parse: parse$1, derivative, rationalize: rationalize$1 } = formulaMath;
//#endregion
//#region src/lib/formula.js
const { parse, simplify, rationalize } = formulaMath;
Object.freeze([
	"objectives",
	"families",
	"concepts"
]);
//#endregion
//#region tools/lib/load.mjs
function parseFile(path) {
	const raw = readFileSync(path, "utf8");
	if (extname(path) === ".json") return JSON.parse(raw);
	return load(raw);
}
//#endregion
//#region tools/lib/digest.mjs
const DATA = /* @__PURE__ */ new Set([
	".yaml",
	".yml",
	".json"
]);
const dataFiles = (dir) => existsSync(dir) ? readdirSync(dir).filter((f) => DATA.has(extname(f))).sort() : [];
const stem$1 = (f) => basename(f, extname(f));
const read = (p) => {
	try {
		return parseFile(p) || {};
	} catch {
		return {};
	}
};
/** leading digits of a filename: "03-linear" -> 3, "2-integrals" -> 2 */
const num = (f) => Number(/^(\d+)/.exec(f)?.[1] ?? 0);
const cited = (blocks) => {
	const out = /* @__PURE__ */ new Set();
	for (const m of JSON.stringify(blocks || []).matchAll(/<c\s+k=\\?"([^"\\]+)/g)) out.add(m[1]);
	return [...out];
};
/** One line per subsection: id, title, what it defines, what it states, what it cites. */
function subLine(u, id) {
	const blocks = Array.isArray(u.blocks) ? u.blocks : [];
	const defs = blocks.filter((b) => b?.t === "def").map((b) => b.term).filter(Boolean);
	const keys = blocks.filter((b) => b?.t === "key").map((b) => b.label).filter(Boolean);
	const types = (Array.isArray(u.quiz) ? u.quiz : []).map((q) => q?.type).filter(Boolean);
	const parts = [`${id} ${u.title || "(untitled)"}`];
	if (defs.length) parts.push(`defines: ${defs.join("; ")}`);
	if (keys.length) parts.push(`states: ${keys.join("; ")}`);
	const c = cited(blocks);
	if (c.length) parts.push(`cites: ${c.join(",")}`);
	const cats = [...new Set(blocks.map((b) => b?.cat).filter(Boolean))];
	if (cats.length) parts.push(`cat: ${cats.join(",")}`);
	if (types.length) parts.push(`quiz: ${types.join(",")}`);
	const claims = blocks.filter((b) => CLAIMY.has(b?.t));
	if (claims.length) {
		const withCore = claims.filter((b) => b.core).length;
		const withGist = claims.filter((b) => b.gist).length;
		if (withCore + withGist < claims.length) parts.push(`unclaimed: ${claims.length - withCore - withGist}/${claims.length}`);
	}
	if (!blocks.length) parts.push("EMPTY");
	return parts.join(" | ");
}
const CLAIMY = /* @__PURE__ */ new Set([
	"def",
	"key",
	"trap"
]);
/**
* Walk a course folder, however far along it is.
* Returns the structured view (for planning) and `text` (for prompts).
*/
function digest(dir) {
	const sections = [];
	const secRoot = join(dir, "sections");
	for (const d of existsSync(secRoot) ? readdirSync(secRoot).sort() : []) {
		const path = join(secRoot, d);
		if (!existsSync(path) || !statSync(path).isDirectory()) continue;
		if (!readdirSync(path).length) continue;
		const meta = dataFiles(path).find((f) => stem$1(f) === "_section");
		const s = meta ? read(join(path, meta)) : {};
		const id = `s${num(d)}`;
		const subs = dataFiles(path).filter((f) => stem$1(f) !== "_section").map((f) => ({
			file: f,
			n: num(f),
			data: read(join(path, f))
		})).sort((a, b) => a.n - b.n).map((f, i) => ({
			id: `${id}-${i + 1}`,
			file: join(path, f.file),
			title: f.data.title || stem$1(f.file),
			blocks: Array.isArray(f.data.blocks) ? f.data.blocks.length : 0,
			spine: Array.isArray(f.data.blocks) ? f.data.blocks.filter((b) => b && (!b.tier || b.tier === "spine")).length : 0,
			quiz: Array.isArray(f.data.quiz) ? f.data.quiz.length : 0,
			tiers: new Set((Array.isArray(f.data.blocks) ? f.data.blocks : []).map((b) => b?.tier || "spine")),
			line: subLine(f.data, `${id}-${i + 1}`)
		}));
		sections.push({
			id,
			dir: path,
			title: s.title || d,
			blurb: !!s.blurb,
			subs
		});
	}
	const conceptMap = /* @__PURE__ */ new Map();
	const canonicalPath = [
		"yaml",
		"yml",
		"json"
	].map((ext) => join(dir, "categorize", `concepts.${ext}`)).find(existsSync);
	if (canonicalPath) {
		const list = read(canonicalPath);
		if (Array.isArray(list)) {
			for (const c of list) if (c && typeof c.id === "string") conceptMap.set(c.id, c);
		}
	}
	for (const f of dataFiles(join(dir, "concepts"))) {
		const c = read(join(dir, "concepts", f));
		const key = c.id || c.key || stem$1(f);
		if (!conceptMap.has(key)) conceptMap.set(key, c);
	}
	const concepts = [...conceptMap].map(([key, c]) => ({
		key,
		term: c.term || key,
		review: !!c.review,
		body: !!c.body,
		variants: (read(join(dir, "practice", `${key}.yaml`)).items || read(join(dir, "drills", `${key}.yaml`)).items || []).length
	}));
	const cats = dataFiles(join(dir, "categories")).map((f) => {
		const c = read(join(dir, "categories", f));
		return {
			key: stem$1(f),
			name: c.name || stem$1(f),
			boundary: c.boundary || "",
			siblings: c.siblings || []
		};
	});
	return {
		sections,
		subs: sections.flatMap((s) => s.subs),
		concepts,
		cats,
		text: [
			sections.length ? "SECTIONS AND SUBSECTIONS (id, title, coverage)" : "",
			...sections.map((s) => [`${s.id} ${s.title}`, ...s.subs.map((u) => "  " + u.line)].join("\n")),
			concepts.length ? "\nCONCEPTS (key, term, practice variants)" : "",
			...concepts.map((c) => `  ${c.key} — ${c.term} — ${c.variants} variants`),
			cats.length ? "\nCATEGORIES (key — name — boundary) — tag into these, never beside them" : "",
			...cats.map((c) => `  ${c.key} — ${c.name} — ${c.boundary.replace(/\s+/g, " ").trim()}`)
		].filter(Boolean).join("\n")
	};
}
//#endregion
//#region tools/lib/sources.mjs
const SYSTEM = [
	"/bin",
	"/boot",
	"/dev",
	"/etc",
	"/lib",
	"/proc",
	"/sbin",
	"/sys",
	"/usr",
	"/private/etc",
	"/System",
	"/Library",
	"/Applications"
];
const BROAD = [
	"/var",
	"/private",
	"/private/var",
	"/Users",
	"/home",
	"/opt",
	"/Volumes",
	"/mnt"
];
const within = (child, parent) => child === parent || child.startsWith(parent + sep);
function roots(courseDir, paths = [], base = process.cwd()) {
	const repo = resolve(courseDir, "..", "..");
	const courses = join(repo, "courses");
	const own = join(courseDir, "sources");
	const out = existsSync(own) ? [realpathSync(own)] : [];
	for (const p of paths) {
		const abs = resolve(base, p.replace(/^~(?=$|\/)/, homedir()));
		if (!existsSync(abs)) throw new Error(`--source ${p}: ${abs} does not exist`);
		const real = realpathSync(abs);
		const home = realpathSync(homedir());
		const refuse = (why) => {
			throw new Error(`--source ${p}: refused, ${why}`);
		};
		if (real === sep || real === home || within(home, real)) refuse("it contains your whole home folder or more");
		if (SYSTEM.some((s) => within(real, s))) refuse("it is a system folder");
		if (BROAD.includes(real)) refuse("it is too broad; name the folder you mean");
		if (within(realpathSync(repo), real)) refuse("it contains this repository, and with it every private course");
		if (within(real, realpathSync(courses)) && !within(real, realpathSync(courseDir))) refuse("it is inside another course");
		if (!out.some((r) => within(real, r))) out.push(real);
	}
	return out;
}
const DOC = /* @__PURE__ */ new Set([
	".md",
	".markdown",
	".mdx",
	".txt",
	".tex",
	".html",
	".htm",
	".rst",
	".adoc",
	".org"
]);
const CODE = /* @__PURE__ */ new Set([
	".js",
	".mjs",
	".cjs",
	".jsx",
	".ts",
	".tsx",
	".py",
	".rb",
	".go",
	".rs",
	".java",
	".kt",
	".swift",
	".c",
	".h",
	".cc",
	".cpp",
	".hpp",
	".cs",
	".php",
	".scala",
	".sh",
	".sql",
	".r",
	".jl",
	".lua",
	".dart",
	".vue",
	".svelte",
	".css",
	".scss",
	".json",
	".yaml",
	".yml",
	".toml",
	".ini",
	".csv",
	".xml",
	".proto",
	".graphql",
	".ipynb"
]);
/** Extraction registration only. `doc` and `text` retain their older meaning:
binary teaching sources are catalogued, but never read as UTF-8 here. */
const SOURCE_FORMATS = new Map([
	...[...DOC, ...CODE].map((ext) => [ext, "text"]),
	[".pdf", "pdf"],
	[".pptx", "pptx"],
	[".ppt", "ppt"],
	[".png", "image"],
	[".jpg", "image"],
	[".jpeg", "image"],
	[".gif", "image"],
	[".webp", "image"],
	[".svg", "image"]
]);
const SECRET = /(^|\/)(\.env[^/]*|.*\.(pem|key|p12|pfx|keystore|jks)|id_(rsa|dsa|ecdsa|ed25519)[^/]*|\.?(credentials|secrets?)(\.[^/]*)?|\.netrc|\.npmrc|\.pypirc)$/i;
const BULK_DIR = /(^|\/)(node_modules|vendor|dist|build|out|target|coverage|__pycache__|\.[^/]*)(\/|$)/;
const BULK_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|go\.sum|[^/]*\.min\.(js|css)|[^/]*\.map)$/;
const LIMIT = 2e4;
const skip = (rel) => SECRET.test(rel) || BULK_DIR.test(rel) || BULK_FILE.test(rel);
function gitFiles(dir) {
	const git = (args) => execFileSync("git", [
		"-C",
		dir,
		...args
	], {
		encoding: "utf8",
		maxBuffer: 268435456,
		stdio: [
			"ignore",
			"pipe",
			"ignore"
		]
	});
	try {
		git(["rev-parse", "--show-toplevel"]);
	} catch {
		return null;
	}
	try {
		git([
			"check-ignore",
			"-q",
			"."
		]);
		return null;
	} catch {}
	try {
		return git([
			"ls-files",
			"-co",
			"--exclude-standard",
			"-z",
			"--",
			"."
		]).split("\0").filter(Boolean);
	} catch {
		return null;
	}
}
function walk(dir) {
	const out = [];
	const go = (d) => {
		for (const f of readdirSync(d).sort()) {
			if (out.length >= LIMIT) return;
			const path = join(d, f);
			const rel = relative(dir, path);
			if (skip(rel)) continue;
			const st = lstatSync(path);
			if (st.isDirectory()) go(path);
			else if (st.isFile() || st.isSymbolicLink()) out.push(rel);
		}
	};
	go(dir);
	return out;
}
/** Every material file under the roots, sorted, each checked to stay inside
its root (a symlink pointing out is dropped, not followed). */
function list(rootsList) {
	const out = [];
	for (const root of rootsList) {
		if (statSync(root).isFile()) {
			out.push(entry(dirname(root), basename(root), root));
			continue;
		}
		const rels = (gitFiles(root) || walk(root)).filter((r) => !skip(r)).sort().slice(0, LIMIT);
		for (const rel of rels) {
			const path = join(root, rel);
			let real;
			try {
				real = realpathSync(path);
			} catch {
				continue;
			}
			if (!within(real, root) || !statSync(real).isFile()) continue;
			out.push(entry(root, rel, path));
		}
	}
	return out;
}
function entry(root, rel, path) {
	const ext = extname(rel).toLowerCase();
	return {
		root,
		rel,
		path,
		doc: DOC.has(ext),
		text: DOC.has(ext) || CODE.has(ext),
		bytes: statSync(path).size,
		format: SOURCE_FORMATS.get(ext) || "binary"
	};
}
const mapPath = (repo, id) => join(repo, ".author", id, "map.txt");
function loadMap(repo, id) {
	const p = mapPath(repo, id);
	const out = {};
	if (!existsSync(p)) return out;
	for (const line of readFileSync(p, "utf8").split("\n")) {
		const m = /^(\S[^:]*\.(?:ya?ml|json)):\s*(.*)$/.exec(line.trim());
		if (m) out[m[1]] = m[2].split("|").map((x) => x.trim()).filter((x) => x && !/^none$/i.test(x));
	}
	return out;
}
/** Does map entry `name` ("/abs/f.md" or "/abs/f.md#Heading") cover this topic? */
const names = (name, path, heading) => {
	const [file, head] = splitName(name);
	return file === path && (!head || bare(head) === bare(heading));
};
const splitName = (name) => {
	const i = name.indexOf("#");
	return i < 0 ? [name, null] : [name.slice(0, i), name.slice(i + 1)];
};
const FIGURE = /^(Figure \d|The (horizontal|vertical) axis|The (graph|differential equation) (is|shows)|.{0,40}is shown below)|axis is labeled|is marked on|\b(starts|ends) (from|at) \(|toward (the )?(upper|lower) (left|right)/i;
const describesFigure = (paragraph) => FIGURE.test(paragraph.trim());
const SMALL = /^(a|an|and|as|at|by|for|from|in|of|on|or|the|to|vs\.?|with)$/;
const NOT_TOPIC = /^(Figure|Example|Solution|Remark|Table|Interactive|Continued|Historical|Note|Theorem|Definition|Rule|Algorithm|Principle|Proof|Corollary)\b/;
const titleCase = (s) => {
	const w = s.trim().split(/\s+/);
	if (w.length < 2 || w.length > 9 || NOT_TOPIC.test(s)) return false;
	if (/[.,;:!?)]$/.test(s) || !/^[\w\s’'\-–,&]+$/.test(s)) return false;
	return /^[A-Z0-9]/.test(w[0]) && /^[A-Z]/.test(w[w.length - 1]) && w.every((x) => /^[A-Z0-9]/.test(x) || SMALL.test(x));
};
/** A line's heading and the prose it runs into, or null when it is not one. */
function headingOf(line) {
	if (line.length > 1e3) return null;
	const marked = /^##+\s+(.+?)\s*$/.exec(line);
	if (marked) return {
		heading: marked[1],
		rest: "",
		kind: "marked"
	};
	if (titleCase(line)) return {
		heading: line.trim(),
		rest: "",
		kind: "inferred"
	};
	for (const m of line.matchAll(/[a-z](?=[A-Z])/g)) {
		const head = line.slice(0, m.index + 1);
		if (titleCase(head.replace(/^\d+(\.\d+)*\s+/, "X "))) return {
			heading: head,
			rest: line.slice(m.index + 1),
			kind: "inferred"
		};
	}
	return null;
}
const bare = (s) => s.replace(/^\d+(\.\d+)*\s+/, "").replace(/\s+/g, " ").trim();
function readableHtml(html) {
	return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<img\b[^>]*>/gi, " ").replace(/<h1\b[^>]*>/gi, "\n# ").replace(/<h[2-6]\b[^>]*>/gi, "\n## ").replace(/<\/h[1-6]>/gi, "\n").replace(/<\/(?:p|li|section|div)>/gi, "\n\n").replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|#160);/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(?:39|x27);/gi, "'");
}
/** Text split into the topics its headings name. Text before any heading
belongs to the `# ` title, or to "(untitled)". */
function topics(md) {
	if (/^\s*(?:<!doctype html|<html\b)/i.test(md)) md = readableHtml(md);
	const title = /^#\s+(.+)$/m.exec(md)?.[1] || "(untitled)";
	const out = [{
		heading: title,
		lines: [],
		kind: "title"
	}];
	for (const line of md.replace(/^#\s.*$/m, "").replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
		const h = headingOf(line);
		if (h && bare(h.heading) !== bare(title)) out.push({
			heading: h.heading,
			lines: [h.rest],
			kind: h.kind
		});
		else out[out.length - 1].lines.push(h ? h.rest : line);
	}
	return out.map((t) => ({
		heading: t.heading,
		body: t.lines.join("\n").trim(),
		kind: t.kind
	})).filter((t, i) => i === 0 || t.body);
}
//#endregion
//#region tools/lib/coverage.mjs
const STOP = new Set(`a about above after again against all also an and any are as at be
because been before being below between both but by can could did do does doing down
during each few for from further had has have having here how however if in into is it
its itself just let may more most much must no nor not now of off on once only or other
our out over own same shall should since so some such than that the their them then there
these they this those through thus to too under until up upon very was we were what when
where which while who whom why will with would you your example solution figure problem
problems section equation equations eq see find given use using used get show shown note
recall one two three called form following obtain obtained follows
write written thereby hence therefore consider case cases now since readily`.split(/\s+/));
const stem = (w) => w.endsWith("ss") ? w : w.replace(/ies$/, "y").replace(/(ing|ed|es|s|ly)$/, "").replace(/(.)\1$/, "$1");
/** Stemmed content words of `text`, with markup and math removed. */
function terms(text) {
	const plain = String(text).replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$\n]*\$/g, " ").replace(/<m>[\s\S]*?<\/m>/g, " ").replace(/<[^>]+>/g, " ").replace(/\\[a-zA-Z]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
	const out = /* @__PURE__ */ new Set();
	for (const w of plain.toLowerCase().split(/[^a-z]+/)) {
		if (w.length < 3 || STOP.has(w)) continue;
		const s = stem(w);
		if (s.length >= 3 && !STOP.has(s)) out.add(s);
	}
	return out;
}
const MIN_TERMS = 3;
const HEADING = 3;
const TOP = 10;
/**
* A topic as a bag of words: each term counted once per paragraph it
* appears in. That count is the "distribution" half of the score: a term the
* source returns to in four paragraphs is what the topic is about; a term
* that appears once ("journey", "blown") is colour.
*/
function bag(heading, body) {
	const tf = /* @__PURE__ */ new Map();
	const add = (ts, n) => {
		for (const t of ts) tf.set(t, (tf.get(t) || 0) + n);
	};
	add(terms(heading), HEADING);
	for (const para of body.split(/\n\s*\n/)) {
		const text = para.trim();
		if (/^\[figure/.test(text) || describesFigure(text)) continue;
		const ts = terms(text);
		if (ts.size >= MIN_TERMS) add(ts, 1);
	}
	return tf;
}
/** Rarity of every term across a set of bags (inverse document frequency). */
function idf(bags) {
	const df = /* @__PURE__ */ new Map();
	for (const b of bags) for (const t of b.keys()) df.set(t, (df.get(t) || 0) + 1);
	const w = /* @__PURE__ */ new Map();
	for (const [t, d] of df) w.set(t, Math.log((bags.length + 1) / (d + 1)));
	return w;
}
const weightIn = (tf, w) => {
	const out = /* @__PURE__ */ new Map();
	for (const [t, n] of tf) out.set(t, (w.get(t) || 0) * (1 + Math.log(n)));
	return out;
};
/**
* How much of a topic `have` says: the weight of the topic's heaviest terms
* that `have` contains, over the weight of all of them. 1 when the topic has
* no weighted terms (nothing to miss). `missing` is what the gap is about,
* heaviest first.
*/
function score(tf, have, w) {
	const top = [...weightIn(tf, w)].sort((a, b) => b[1] - a[1]).slice(0, TOP);
	let hit = 0, all = 0;
	for (const [t, x] of top) {
		all += x;
		if (have.has(t)) hit += x;
	}
	const missing = top.filter(([t]) => !have.has(t)).map(([t]) => t);
	return {
		score: all ? hit / all : 1,
		weight: all,
		missing
	};
}
/** Every string anywhere inside a parsed YAML value, joined. */
function textOf(value) {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(textOf).join("\n");
	if (value && typeof value === "object") return Object.values(value).map(textOf).join("\n");
	return "";
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
const workspaceAt = process.argv.indexOf("--workspace");
const requestedWorkspace = workspaceAt >= 0 ? process.argv[workspaceAt + 1] : null;
if (workspaceAt >= 0 && (!requestedWorkspace || requestedWorkspace.startsWith("--"))) throw new Error("--workspace needs a directory path");
const WORKSPACE = requestedWorkspace ? resolve(requestedWorkspace) : process.env.AUTHOR_WORKSPACE ? resolve(process.env.AUTHOR_WORKSPACE) : here();
const COURSES = join(WORKSPACE, "courses");
const STATE = join(WORKSPACE, ".author");
existsSync(join(ENGINE, "courses", "_template")) ? join(ENGINE, "courses", "_template") : join(ENGINE, "template");
existsSync(join(ENGINE, "docs")) && join(ENGINE, "docs");
//#endregion
//#region tools/lib/coverage-report.mjs
const reviewPath = (id) => join(COURSES, id, "materials", "coverage-review.yaml");
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const sourceKey = (own, path) => path.startsWith(own + sep) ? relative(own, path) : path;
const disposition = (value) => typeof value === "string" ? { disposition: value } : value || {};
function reviewProblem(value) {
	const row = disposition(value);
	if (![
		"taught",
		"bridged",
		"moved",
		"skipped",
		"false-match"
	].includes(row.disposition)) return "choose taught, bridged, moved, skipped, or false-match";
	if (row.disposition === "skipped" && !String(row.reason || "").trim()) return "skipped needs a reason";
	if (row.disposition === "false-match" && !String(row.reason || "").trim()) return "false-match needs a reason";
	if (row.disposition === "moved" && !String(row.to || "").trim()) return "moved needs a destination in to:";
	return null;
}
function readReview(id) {
	const path = reviewPath(id);
	if (!existsSync(path)) return {
		topics: {},
		files: {}
	};
	const data = parseFile(path);
	if (!data || typeof data !== "object" || Array.isArray(data) || data.topics && (typeof data.topics !== "object" || Array.isArray(data.topics)) || data.files && (typeof data.files !== "object" || Array.isArray(data.files))) throw new Error(`${path}: expected topics: and files: mappings`);
	return {
		...data,
		topics: data.topics || {},
		files: data.files || {}
	};
}
const suspect = (rows) => {
	const inferred = rows.filter((t) => t.kind === "inferred");
	return inferred.length >= 120 && inferred.filter((t) => t.body.length < 120).length / inferred.length >= .75;
};
function coverageReport(id, below = .25) {
	const dir = join(COURSES, id);
	const own = realpathSync(dir);
	const saved = join(STATE, id, "roots.txt");
	const files = list(roots(dir, (existsSync(saved) ? readFileSync(saved, "utf8").split("\n").filter(Boolean) : []).filter(existsSync))).filter((f) => f.doc);
	const map = loadMap(WORKSPACE, id);
	const mapped = Object.keys(map).length > 0;
	const subs = digest(dir).subs.map((u) => ({
		id: u.id,
		sources: map[relative(dir, u.file)] || [],
		have: terms(textOf(parseFile(u.file)?.blocks))
	}));
	const found = files.map((f) => {
		const extracted = topics(readFileSync(f.path, "utf8"));
		if (suspect(extracted)) throw new Error(`${f.path}: ${extracted.length} topics, mostly short inferred headings; topic extraction looks wrong. Mark real headings in the source or split it before reviewing coverage`);
		const key = sourceKey(own, f.path);
		const repeats = /* @__PURE__ */ new Map();
		return {
			path: f.path,
			key,
			label: f.path.startsWith(own + sep) ? relative(own, f.path) : f.rel || basename(f.path),
			id: `f-${hash(key)}`,
			topics: extracted.map((t) => {
				const heading = t.heading.replace(/\s+/g, " ").trim();
				const occurrence = (repeats.get(heading) || 0) + 1;
				repeats.set(heading, occurrence);
				return {
					id: `t-${hash(`${key}\0${heading}\0${occurrence}`)}`,
					heading: t.heading,
					tf: bag(t.heading, t.body)
				};
			})
		};
	});
	const weights = idf(found.flatMap((f) => f.topics.map((t) => t.tf)));
	const entries = subs.flatMap((s) => s.sources);
	const review = readReview(id);
	const rows = [], targets = [];
	for (const file of found) {
		const unowned = mapped && !entries.some((n) => n.split("#")[0] === file.path);
		const fileRows = file.topics.map((t) => {
			const best = (unowned ? [] : mapped ? subs.filter((s) => s.sources.some((n) => names(n, file.path, t.heading))) : subs).map((s) => ({
				id: s.id,
				...score(t.tf, s.have, weights)
			})).sort((a, b) => b.score - a.score)[0] || {
				id: "no subsection is mapped to it",
				score: 0,
				missing: score(t.tf, /* @__PURE__ */ new Set(), weights).missing
			};
			return {
				...t,
				source: file.path,
				sourceLabel: file.label,
				fileId: file.id,
				unowned,
				best: best.id,
				score: best.score,
				missing: best.missing,
				low: best.score < below
			};
		});
		rows.push(...fileRows);
		if (unowned && fileRows.some((r) => r.low)) targets.push({
			id: file.id,
			kind: "files",
			source: file.path,
			sourceLabel: file.label,
			heading: "(unmapped file)"
		});
		else targets.push(...fileRows.filter((r) => r.low).map((r) => ({
			...r,
			kind: "topics"
		})));
	}
	return {
		files,
		mapped,
		rows,
		targets,
		unresolved: targets.map((t) => ({
			...t,
			problem: reviewProblem(review[t.kind][t.id])
		})).filter((t) => t.problem),
		review,
		below
	};
}
function initCoverageReview(id, report) {
	const review = report.review;
	let added = 0;
	for (const target of report.targets) {
		if (target.id in review[target.kind]) continue;
		review[target.kind][target.id] = {
			disposition: "pending",
			source: target.sourceLabel,
			heading: target.heading
		};
		added++;
	}
	if (added) {
		const path = reviewPath(id);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, "# Review low coverage leads; scores are not proof.\n" + dump(review, {
			lineWidth: 100,
			sortKeys: true
		}));
	}
	return added;
}
//#endregion
//#region tools/coverage.mjs
const args = process.argv.slice(2);
const at = args.indexOf("--below");
const pa = args.indexOf("--profile");
const below = at < 0 ? .25 : Number(args[at + 1]);
const profile = pa < 0 ? "draft" : args[pa + 1];
const id = args.find((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1) && (pa < 0 || i !== pa + 1));
if (!id || !Number.isFinite(below) || below < 0 || below > 1 || !["draft", "publish"].includes(profile)) {
	console.error("usage: coverage.mjs <course> [--all] [--below 0.25] [--init-review] [--profile draft|publish]");
	process.exit(2);
}
let report;
try {
	report = coverageReport(id, below);
} catch (e) {
	console.error(e.message);
	process.exit(2);
}
if (!report.files.length) {
	console.log(`Coverage unavailable: courses/${id} has no readable source documents. Inspect the source catalog for visual or unresolved sources.`);
	process.exit(0);
}
if (args.includes("--init-review")) {
	const added = initCoverageReview(id, report);
	console.log(`review checklist: ${reviewPath(id)} (${added} new leads)`);
	report = coverageReport(id, below);
}
if (!report.mapped) console.log("No finished subsections recorded yet: topics use their best match anywhere (lenient).\n");
let shownCount = 0;
let omitted = 0;
const limit = args.includes("--all") ? Infinity : 60;
for (const source of [...new Set(report.rows.map((r) => r.source))]) {
	const rows = report.rows.filter((r) => r.source === source);
	if (rows[0]?.unowned) {
		const target = report.targets.find((t) => t.kind === "files" && t.source === source);
		if (shownCount++ < limit) console.log(`${source}  [${target?.id || "no low topics"}] — no finished subsection maps this file`);
		else omitted++;
		continue;
	}
	const shown = args.includes("--all") ? rows : rows.filter((r) => r.low);
	if (!shown.length) continue;
	if (shownCount < limit) console.log(source);
	for (const row of shown) {
		if (shownCount++ >= limit) {
			omitted++;
			continue;
		}
		console.log(`  ${row.low ? "!" : " "} ${row.id} ${Math.round(row.score * 100)}%  ${row.sourceLabel}#${row.heading}   (${row.best})`);
	}
}
if (omitted) console.log(`… ${omitted} more leads; use --all to print every score or --init-review for the checklist`);
const average = report.rows.length ? Math.round(100 * report.rows.reduce((n, r) => n + r.score, 0) / report.rows.length) : null;
console.log(`\nLexical coverage: ${average == null ? "unavailable" : average + "%"} (mean topic overlap, not mastery). ${report.rows.filter((r) => r.low).length} of ${report.rows.length} source topics below ${Math.round(below * 100)}%. ${report.unresolved.length} review decisions pending. Scores are leads, not proof; run coverage ${id} --init-review to create the checklist.`);
if (profile === "publish" && report.unresolved.length) {
	for (const t of report.unresolved.slice(0, 30)) console.log(`       ! ${t.id} ${t.sourceLabel}#${t.heading}: ${t.problem}`);
	if (report.unresolved.length > 30) console.log(`       ! ${report.unresolved.length - 30} more unresolved leads`);
}
//#endregion
export {};
