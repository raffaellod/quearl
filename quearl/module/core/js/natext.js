/* -*- coding: utf-8; mode: javascript; tab-width: 3 -*-

Copyright 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013
Raffaello D. Di Napoli

This file is part of Quearl.

Quearl is free software: you can redistribute it and/or modify it under the terms of the GNU Affero
General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

Quearl is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General
Public License for more details.

You should have received a copy of the GNU Affero General Public License along with Quearl. If not,
see <http://www.gnu.org/licenses/>.
--------------------------------------------------------------------------------------------------*/

/** Extensions to native classes, i.e. Array, String, Function and so on. Meant to be usable with or
w/o Quearl proper.
*/



////////////////////////////////////////////////////////////////////////////////////////////////////
// Function (pre)


/** Checks the validity of a function’s arguments, throwing an exception if invalid arguments are
found.

fn:Function
	Function whose arguments are to be checked.
vArgs:arguments
	The arguments object of the function that is requesting argument validation.
[…:var*]
	Each of the remaining arguments indicates the requested type (if it’s a Function/class) or a list
	of allowed types (if it’s an Array) for the corresponding argument in vArgs.
*/
function $Function$checkArgs(fn, vArgs/*, …*/) {
	for (var iArg = 2, cArgs = arguments.length, iFnArg = 0; iArg < cArgs; ++iArg, ++iFnArg) {
		var vTypes = arguments[iArg],
			 vArg = vArgs[iFnArg], bValid = false,
			 cTypes, iType = 1, vType;
		if (vTypes instanceof Array) {
			cTypes = vTypes.length;
			vType = vTypes[0];
		} else {
			cTypes = 1;
			vType = vTypes;
		}
		do {
			if (vType === Object.ANYTYPEOPT) {
				bValid = true;
			} else if (vType === undefined || vType === null) {
				if (vArg === vType) {
					bValid = true;
				}
			} else if (vArg !== undefined && vArg !== null) {
				if (vType === Object.ANYTYPE) {
					bValid = true;
				} else if (vArg instanceof vType || vArg.constructor === vType) {
					bValid = true;
				}
			}
		} while (!bValid && iType < cTypes && (vType = vTypes[iType++], true));
		if (!bValid) {
			// Grab the list of arguments from the function declaration.
			var s;
			try {
				s = fn.toString().match(/^[^(]*\(([^)]*)\)/);
			} catch (x) {
				// Some browsers may lack the ability to decompile functions.
			}
			if (s != null) {
				var arrArgsDecl = s[1].split(/,[\t ]*/);
				s = "Invalid value for argument “" + arrArgsDecl[iFnArg] + "” in ";
			} else {
				s = "Invalid value for argument #" + iFnArg + " in ";
			}
			s += Function.getName(fn) + "\nExpected:";
			if (vTypes instanceof Array) {
				for (iType = 0; iType < cTypes; ++iType) {
					vType = vTypes[iType];
					if (vType === undefined) {
						s += "\n  undefined";
					} else if (vType === null) {
						s += "\n  null";
					} else if (vType === Object.ANYTYPEOPT) {
						s += "\n  undefined\n  null\n  var";
					} else if (vType === Object.ANYTYPE) {
						s += "\n  var";
					} else {
						s += "\n  " + Function.getName(vType);
					}
				}
			} else {
				s += "\n  " + Function.getName(vTypes);
			}
			s += "\nReceived:\n   ";
//			s += Object.toJSONString(vArg);
			if (vArg === undefined) {
				s += "undefined";
			} else if (vArg === null) {
				s += "null";
			} else if (vArg.constructor) {
				s += Function.getName(vArg.constructor);
			} else {
				s += vArg.toString();
			}
//			alert(s);
			throw new TypeError(s);
		}
	}
}
Function.checkArgs = $Function$checkArgs;


/** Creates an implementation of Object.toString() method returning "[object ClassName]", where
ClassName is the specified string.

sType:String
	Full name of the class.
return:Function
	Generated function.
*/
function $Function$createToStringMethod(sType) {
	Function.checkArgs($Function$createToStringMethod, arguments, String);
	sType = "[object " + sType + "]";
	return function() {
		return sType;
	};
}
Function.createToStringMethod = $Function$createToStringMethod;


/** Special value for Function.checkArgs(), meaning “an object of any type”. */
Object.ANYTYPE/*:Object*/ = {};
/** Special value for Function.checkArgs(): “optional object of any type”. */
Object.ANYTYPEOPT/*:Object*/ = {};

Object.ANYTYPE.toString = Function.createToStringMethod("Object.ANYTYPE");
Object.ANYTYPEOPT.toString = Function.createToStringMethod("Object.ANYTYPEOPT");



////////////////////////////////////////////////////////////////////////////////////////////////////
// Array


/** Adjusts a sparse array, making up for browser bugs.

return:Array(var*)
	this.
*/
if ([, ].length == 2) {
	// IE5.5 bug, IE6 bug, IE7 bug, IE8 bug: a trailing sparse element is not ignored.
	function $Array$s_fixLast() {
		if (!((this.length - 1) in this)) {
			--this.length;
		}
		return this;
	}
	Array.prototype.s = $Array$s_fixLast;
} else if (0 in [, ]) {
	// FX1.5 bug, FX2 bug, FX3 bug: sparse arrays do work, but creating one using the [, ] syntax
	// will add items of value undefined.
	// Note: this makes it impossible to declare an array with items of value explicitly set to
	// undefined.
	function $Array$s_fixSparse() {
		for (var i = 0, c = this.length; i < c; ++i) {
			if (this[i] === undefined) {
				delete this[i];
			}
		}
		return this;
	}
	Array.prototype.s = $Array$s_fixSparse;
} else {
	function $Array$s_noop() {
		return this;
	}
	Array.prototype.s = $Array$s_noop;
}


/** Calls the specified method on every object contained in the array.

sProp:String
	Name of the method to call.
arrArgs:Array(var*)
	Arguments to be passed to the method.
return:Array
	this.
*/
function $Array$applyOnEach(sProp, arrArgs) {
	Function.checkArgs($Array$applyOnEach, arguments, String, Array);
	for (var i = 0, c = this.length; i < c; ++i) {
		if (i in this) {
			var v = this[i];
			if (sProp in v) {
				v[sProp].apply(v, arrArgs);
			}
		}
	}
	return this;
}
Array.prototype.applyOnEach = $Array$applyOnEach;


/** Calls the specified method on every object contained in the array.

sProp:String
	Name of the method to call.
…:var*
	Arguments to be passed to the method.
return:Array
	this.
*/
function $Array$callOnEach(sProp/*, …*/) {
	// Make an array of the arguments past sProp.
	var arrArgs = [];
	for (var i = 1, c = arguments.length; i < c; ++i) {
		arrArgs.push(arguments[i]);
	}
	return this.applyOnEach(sProp, arrArgs);
}
Array.prototype.callOnEach = $Array$callOnEach;


/** See Object.clone().
*/
if (0 in [].concat([, ].s())) {
	// OP9 bug: [].concat([, ]) returns [undefined] instead of [, ] ; this requires cloning
	// iteratively. Note that [, ] must be cleared from FX1.5 bug, FX2 bug and FX3 bug, using s().
	// Fun.
	function $Array$clone_slow() {
		Function.checkArgs($Array$clone_slow, arguments);
		return Array.from(this);
	}
	Array.prototype.clone = $Array$clone_slow;
} else {
	function $Array$clone_concat() {
		Function.checkArgs($Array$clone_concat, arguments);
		return [].concat(this);
	}
	Array.prototype.clone = $Array$clone_concat;
}


/** Creates a new map, using this as the set of keys, and another array as the set of associated
values.

arrValues:Array(var*)
	Set of values.
return:Object(var*)
	Newly created map.
*/
function $Array$combine(arrValues) {
	Function.checkArgs($Array$combine, arguments, Array);
	var map = {};
	for (var i = 0, c = Math.min(this.length, arrValues.length); i < c; ++i) {
		if (i in this) {
			map[this[i]] = arrValues[i];
		}
	}
	return map;
}
Array.prototype.combine = $Array$combine;


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.every) {
	function $Array$prototype$every(fnCallback, oContext /*= undefined*/) {
		return Array.every(this, fnCallback, oContext);
	}
	Array.prototype.every = $Array$prototype$every;
}
if (!Array.every) {
	function $Array$every(arr, fnCallback, oContext /*= undefined*/) {
		Function.checkArgs($Array$every, arguments, Object, Function, [undefined, Object]);
		if (!oContext) {
			oContext = window;
		}
		for (var i = 0, c = arr.length; i < c; ++i) {
			if (i in arr && !fnCallback.call(oContext, arr[i], i, arr)) {
				return false;
			}
		}
		return true;
	}
	Array.every = $Array$every;
}


/** Creates a new array, using the specified value as either a generator function, or a constant to
be repeated for each value.

c:int
	Number of elements the new array will contain.
[vFiller:(Function|var)]
	Either a Function which will be called with the pair (current index, total) for each of the
	elements, or a value which will be identically repeated in each element. If omitted, a sparse
	array will be created.
return:Array(var*)
	Newly generated array.
*/
function $Array$fill(c, vFiller /*= undefined*/) {
	Function.checkArgs($Array$fill, arguments, Number, Object.ANYTYPEOPT);
	var arr = [];
	arr.length = c;
	if (vFiller !== undefined) {
		if (vFiller instanceof Function) {
			for (var i = 0; i < c; ++i) {
				arr[i] = vFiller(i, c);
			}
		} else {
			for (var i = 0; i < c; ++i) {
				arr[i] = vFiller;
			}
		}
	}
	return arr;
}
Array.fill = $Array$fill;


/** Creates a series of values in the range [0; 1], to be used as animation steps; the values are
calculated according to the number of steps and the requested function.

sAnim:String
	Animation to be obtained; can be one of these values:
	•	"linear"
		y = x / c; [0, c) => [0, 1];
	•	"accelerated"
		y = (x / c) ^ 2; [0, c) => [0, 1];
	•	"braked"
		Same as "accelerated", but with both x and y flipped;
	•	"smoothscroll"
		y = 4 * (x / c) ^ 3; [0, c / 2] => [0, 0.5]; for each point, x and y are flipped, and the
		second half of the array is filled with the resulting values; this gives a quick acceleration,
		which is then stopped and reverted.
c:int
	Number of steps in which the animation will be split.
return:Array(float*)
	Array of step values.
*/
function $Array$fillAnimSteps(sAnim, c) {
	Function.checkArgs($Array$fillAnimSteps, arguments, String, Number);
	var arr = [];
	switch (sAnim) {
		case "linear":
			var fScale = 1 / c;
			for (var i = 0; i < c; ++i) {
				arr[i] = i * fScale;
			}
			break;

		case "accelerated":
			var fScale = 1 / (c * c);
			for (var i = 0; i < c; ++i) {
				arr[i] = (i * i) * fScale;
			}
			break;

		case "braked":
			// Small optimization: instead of reversing i, which is used twice in the loop, it’s the
			// array filling that is reversed.
			var fScale = 1 / (c * c),
				 iU = c - 1;
			for (var i = 0; i < c; ++i) {
				arr[iU - i] = 1 - (i * i) * fScale;
			}
			break;

		case "smoothscroll":
			var fScale = 4 / (c * c * c),
				 iH = (c + 1) >> 1,
				 iU = c - 1;
			for (var i = 0; i < iH; ++i) {
				arr[i] = (i * i * i) * fScale;
				arr[iU - i] = 1 - arr[i];
			}
			break;
	}
	// The rounded sum of rounded values will likely never be exactly 1, so fake it here.
	arr[c] = 1;
	return arr;
}
Array.fillAnimSteps = $Array$fillAnimSteps;


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.filter) {
	function $Array$prototype$filter(fnFilter, oContext /*= undefined*/) {
		return Array.filter(this, fnFilter, oContext);
	}
	Array.prototype.filter = $Array$prototype$filter;
}
if (!Array.filter) {
	function $Array$filter(arrSrc, fnFilter, oContext /*= undefined*/) {
		Function.checkArgs($Array$filter, arguments, Object, Function, [undefined, Object]);
		if (!oContext) {
			oContext = window;
		}
		var arrDst = [];
		for (var i = 0, c = arrSrc.length; i < c; ++i) {
			if (i in arrSrc && fnFilter.call(oContext, arrSrc[i], i, arrSrc)) {
				arrDst.push(arrSrc[i]);
			}
		}
		return arrDst;
	}
	Array.filter = $Array$filter;
}


/** Flips the array or a map, returning a map with the keys being the original values, and the
values being the original keys.

return:Object(var*)
	Resulting map.
*/
function $Array$prototype$flip() {
	Function.checkArgs($Array$prototype$flip, arguments);
	var map = {};
	for (var i = 0, c = this.length; i < c; ++i) {
		if (i in this) {
			map[this[i]] = i;
		}
	}
	return map;
}
Array.prototype.flip = $Array$prototype$flip;
function $Array$flip(map) {
	Function.checkArgs($Array$flip, arguments, Object);
	var mapFlipped = {};
	for (var sProp in map) {
		mapFlipped[map[sProp]] = sProp;
	}
	return mapFlipped;
}
Array.flip = $Array$flip;


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.forEach) {
	function $Array$prototype$forEach(fnCallback, oContext /*= undefined*/) {
		Array.forEach(this, fnCallback, oContext);
	}
	Array.prototype.forEach = $Array$prototype$forEach;
}
if (!Array.forEach) {
	function $Array$forEach(arr, fnCallback, oContext /*= undefined*/) {
		Function.checkArgs($Array$forEach, arguments, Object, Function, [undefined, Object]);
		if (!oContext) {
			oContext = window;
		}
		for (var i = 0, c = arr.length; i < c; ++i) {
			if (i in arr) {
				fnCallback.call(oContext, arr[i], i, arr);
			}
		}
	}
	Array.forEach = $Array$forEach;
}


/** Creates an array by shallow-copying elements from an Array-look-alike, such as a DOM NodeList.

o:Object
	Object that behaves like an Array (i.e. provides .length and is addressable with square brackets
	notation).
return:Array(var*)
	New array, with the same contents as the source object.
*/
function $Array$from(o) {
	Function.checkArgs($Array$from, arguments, Object);
	var arr = [];
	arr.length = o.length;
	for (var i = 0, c = o.length; i < c; ++i) {
		if (i in o) {
			arr[i] = o[i];
		}
	}
	return arr;
}
Array.from = $Array$from;


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.indexOf) {
	function $Array$prototype$indexOf(v, iStart /*= 0*/) {
		return Array.indexOf(this, v, iStart);
	}
	Array.prototype.indexOf = $Array$prototype$indexOf;
}
if (!Array.indexOf) {
	function $Array$indexOf(arr, v, iStart /*= 0*/) {
		Function.checkArgs($Array$indexOf, arguments, Object, Object.ANYTYPEOPT, [undefined, Number]);
		if (iStart === undefined) {
			iStart = 0;
		} else if (iStart < 0) {
			iStart = arr.length + iStart;
		}
		for (var i = iStart, c = arr.length; i < c; ++i) {
			if (i in arr && arr[i] === v) {
				return i;
			}
		}
		return -1;
	}
	Array.indexOf = $Array$indexOf;
}


/** Searches an array for an object with a specified property.

vProp:(String|int)
	Name or index of the value to be checked in each item.
v:var
	Value the property must have to pass the filtering.
[iStart:int]
	Index of the first item to scan; defaults to 0.
return:int
	Index of the first item satisfying the criterion.
*/
function $Array$indexOfByProp(vProp, v, iStart /*= 0*/) {
	return Array.indexOfByProp(this, vProp, v, iStart);
}
Array.prototype.indexOfByProp = $Array$indexOfByProp;
function $Array$indexOfByProp(arr, vProp, v, iStart /*= 0*/) {
	Function.checkArgs(
		$Array$indexOfByProp, arguments,
		Object, [String, Number], Object.ANYTYPEOPT, [undefined, Number]
	);
	if (iStart === undefined) {
		iStart = 0;
	} else if (iStart < 0) {
		iStart = arr.length + iStart;
	}
	for (var i = iStart, c = arr.length; i < c; ++i) {
		if (i in arr && arr[i][vProp] === v) {
			return i;
		}
	}
	return -1;
}
Array.indexOfByProp = $Array$indexOfByProp;


/** Adds an item to the array at a specific index.

i:int
	Index of the new item.
v:var
	Value to be inserted.
return:Array
	this.
*/
function $Array$insertAt(i, v) {
	Function.checkArgs($Array$insertAt, arguments, Number, Object.ANYTYPEOPT);
	this.splice(i, 0, v);
	return this;
}
Array.prototype.insertAt = $Array$insertAt;


/** Adds an item to the array, maintaining the order in the (already sorted) array.

v:var
	Value to be added.
[fnCompare:Function]
	Function to be called to compare to items; defaults to using the standard comparison operators.
return:int
	Index of the newly inserted item.
*/
function $Array$insertSorted(v, fnCompare /*= undefined*/) {
	Function.checkArgs($Array$insertSorted, arguments, Object.ANYTYPEOPT, [undefined, Function]);
	if (!fnCompare) {
		fnCompare = Sorting.defaultCompare;
	}
	var iL = 0,
		 iU = this.length,
		 i = null;
	while (iL < iU) {
		var iH = (iL + iU) >> 1,
			 iRes;
		if (iH in this) {
			iRes = fnCompare(v, this[iH]);
		} else {
			// Anything < undefined.
			iRes = -1;
		}
		if (iRes > 0) {
			iL = iH + 1;
		} else if (iRes < 0) {
			iU = iH;
		} else {
			i = iH;
			break;
		}
	}
	if (i === null) {
		i = iL;
	}
	this.insertAt(i, v);
	return i;
}
Array.prototype.insertSorted = $Array$insertSorted;


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.lastIndexOf) {
	function $Array$prototype$lastIndexOf(v, iStart /*= this.length - 1*/) {
		return Array.lastIndexOf(this, v, iStart);
	}
	Array.prototype.lastIndexOf = $Array$prototype$lastIndexOf;
}
if (!Array.lastIndexOf) {
	function $Array$lastIndexOf(arr, v, iStart /*= arr.length - 1*/) {
		Function.checkArgs(
			$Array$lastIndexOf, arguments, Object, Object.ANYTYPEOPT, [undefined, Number]
		);
		if (iStart === undefined) {
			iStart = arr.length - 1;
		} else if (iStart < 0) {
			iStart = arr.length + iStart;
		}
		for (var i = iStart; i >= 0; --i) {
			if (i in arr && arr[i] === v) {
				return i;
			}
		}
		return -1;
	}
	Array.lastIndexOf = $Array$lastIndexOf;
}


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.map) {
	function $Array$prototype$map(fnMap, oContext /*= undefined*/) {
		return Array.map(this, fnMap, oContext);
	}
	Array.prototype.map = $Array$prototype$map;
}
if (!Array.map) {
	function $Array$map(arrSrc, fnMap, oContext /*= undefined*/) {
		Function.checkArgs($Array$map, arguments, Object, Function, Object.ANYTYPEOPT);
		if (!oContext) {
			oContext = window;
		}
		var arrDst = [];
		for (var i = 0, c = arrSrc.length; i < c; ++i) {
			if (i in arrSrc) {
				arrDst[i] = fnMap.call(oContext, arrSrc[i], i, arrSrc);
			}
		}
		arrDst.length = arrSrc.length;
		return arrDst;
	}
	Array.map = $Array$map;
}


/** Defined in ECMAScript 5 and JavaScript 1.8.
*/
if (!Array.prototype.reduce) {
	function $Array$prototype$reduce(fnCallback, vInitialValue /*= undefined*/) {
		return Array.reduce(this, fnCallback, vInitialValue);
	}
	Array.prototype.reduce = $Array$prototype$reduce;
}
if (!Array.reduce) {
	function $Array$reduce(arr, fnCallback, vInitialValue /*= undefined*/) {
		Function.checkArgs($Array$reduce, arguments, Object, Function, Object.ANYTYPEOPT);
		var i = 0, c = arr.length, v;
		if (vInitialValue !== undefined) {
			v = vInitialValue;
		} else {
			for (; i < c; ++i) {
				if (i in arr) {
					v = arr[i++];
					break;
				}
			}
		}
		for (; i < c; ++i) {
			if (i in arr) {
				v = fnCallback.call(window, v, arr[i], i, arr);
			}
		}
		return v;
	}
	Array.reduce = $Array$reduce;
}


/** Searches the array for a value, and removes it from the array.

v:var
	Value to remove.
return:var
	Removed item.
*/
function $Array$remove(v) {
	Function.checkArgs($Array$remove, arguments, Object.ANYTYPEOPT);
	var i = this.indexOf(v);
	if (i == -1) {
		return undefined;
	}
	return this.removeAt(i);
}
Array.prototype.remove = $Array$remove;


/** Removes from the array an item, based on its index.

i:int
	Index of the item to be removed.
return:var
	Removed item.
*/
function $Array$removeAt(i) {
	Function.checkArgs($Array$removeAt, arguments, Number);
	return this.splice(i, 1)[0];
}
Array.prototype.removeAt = $Array$removeAt;


/** Searches an array for an object with a specified property, and removes it.

vProp:(String|int)
	Name or index of the value to be checked in each item.
v:var
	Value the property must have to pass the filtering.
[iStart:int]
	Index of the first item to scan; defaults to 0.
return:var
	Removed item.
*/
function $Array$removeByProp(vProp, v, iStart /*= 0*/) {
	Function.checkArgs(
		$Array$removeByProp, arguments, [String, Number], Object.ANYTYPEOPT, [undefined, Number]
	);
	var i = this.indexOfByProp(vProp, v, iStart);
	return i != -1 ? this.removeAt(i) : undefined;
}
Array.prototype.removeByProp = $Array$removeByProp;


/** Redistributes the value in the array in a random order.

return:Array
	this.
*/
function $Array$shuffle() {
	Function.checkArgs($Array$shuffle, arguments);
	for (var c = this.length, i, vTemp; c; ) {
		i = Math.floor(Math.random() * c--);
		if (i in this) {
			if (c in this) {
				vTemp = this[c];
				this[c] = this[i];
				this[i] = vTemp;
			} else {
				this[c] = this[i];
				delete this[i];
			}
		} else {
			if (c in this) {
				vTemp = this[c];
				delete this[c];
				this[i] = vTemp;
			}
		}
	}
	return this;
}
Array.prototype.shuffle = $Array$shuffle;


/** Defined in JavaScript 1.6.
*/
if (!Array.prototype.some) {
	function $Array$prototype$some(fnCallback, oContext /*= undefined*/) {
		return Array.some(this, fnCallback, oContext);
	}
	Array.prototype.some = $Array$prototype$some;
}
if (!Array.some) {
	function $Array$some(arr, fnCallback, oContext /*= undefined*/) {
		Function.checkArgs($Array$some, arguments, Object, Function, Object.ANYTYPEOPT);
		if (!oContext) {
			oContext = window;
		}
		for (var i = 0, c = arr.length; i < c; ++i) {
			if (i in arr && fnCallback.call(oContext, arr[i], i, arr)) {
				return true;
			}
		}
		return false;
	}
	Array.some = $Array$some;
}


/** See Object.toJSONString().
*/
function $Array$toJSONString(oParserStatus /*= undefined*/) {
	Function.checkArgs($Array$toJSONString, arguments, [undefined, Object]);
	if (oParserStatus) {
		if (oParserStatus.arrParents.indexOf(this) != -1) {
			return "{\"_jsonErr\":\"recursion detected\"}";
		}
		oParserStatus.arrParents.push(this);
	} else {
		oParserStatus = {
			arrParents: [this]
		};
	}
	var arr = [];
	for (var i = 0, c = this.length; i < c; ++i) {
		if (i in this) {
			arr[i] = Object.toJSONString(this[i], oParserStatus);
		} else {
			arr[i] = "";
		}
	// An array with a sparse last element needs one more delimiter.
	if (!((this.length - 1) in this)) {
		arr.push("");
	}
	oParserStatus.arrParents.pop();
	return "[" + arr.join(", ") + "]";
}
Array.prototype.toJSONString = $Array$toJSONString;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Boolean


/** See Object.toJSONString().
*/
function $Boolean$toJSONString(oParserStatus /*= undefined*/) {
	Function.checkArgs($Boolean$toJSONString, arguments, [undefined, Object]);
	return this.toString();
}
Boolean.prototype.toJSONString = $Boolean$toJSONString;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Browser

/** Helps writing code to work around special cases in buggy browsers (mostly IE), and collects and
uniforms “miscellaneous” facilities.
*/
var Browser = {};
Browser.toString = Function.createToStringMethod("Browser");

/** true if the browser supports event bubbling and capturing, or false if only bubbling is
supported. */
Browser.eventCapturing/*:bool*/ = ("addEventListener" in document);
/** true if the browser is Internet Explorer. */
Browser.isIE/*:bool*/ =
/*@cc_on
	true ||
@*/
	false;
/** Version of the browser, as MMmmrr. Non-null only if a specific browser was detected above (i.e.
if any is* attribute is true). */
Browser.version/*:int*/ = (function() {
	if (Browser.isIE) {
		if (!document.implementation) {
			// It could also be 5.0, but 5.0 will fail to even parse any Quearl scripts due to lambdas
			// and exception handlers (ES3/JS1.5).
			return 50500;
		}
		if (!window.XMLHttpRequest) {
			return 60000;
		}
		if (!window.Element) {
			return 70000;
		}
		if (!document.addEventListener) {
			return 80000;
		}
		return 90000;
	}
	if (Browser.isOpera) {
		var s = window.opera.version(), ich = s.indexOf(".");
		return parseInt(s.substr(0, ich)) * 10000 + parseInt(s.substr(ich + 1)) * 100;
	}
	return null;
})();


/** Write debug messages to a browser-provided facility.

s:String
	Debug message.
return:String
	The message. This allows to write func(Browser.log("test")).
*/
function $Browser$log(s) {
	Function.checkArgs($Browser$log, arguments, String);
	if (window.console && window.console.log) {
		window.console.log(s);
	}
	if (window.opera) {
		window.opera.postError(s);
	}
	return s;
}
Browser.log = $Browser$log;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Date


/** Formats a date/time. Same as PHP’s ql_format_timestamp().

sFormat:String
	Requested format.
return:String
	Formatted date/time.
*/
Date.prototype.format = function $Date$format(sFormat) {
	return sFormat.replace(/%[crRxX]/g, (function($0, ich, s) {
		switch ($0) {
			case "%c": return L10n.CORE_FMT_TS_DATE_S + " " + L10n.CORE_FMT_TS_TIME_S;
			case "%r": return "%i" + L10n.CORE_FMT_TS_TIME_S.substr(2, 1) + "%M %p";
			case "%R": return "%h" + L10n.CORE_FMT_TS_TIME_S.substr(2, 1) + "%M";
			case "%x": return L10n.CORE_FMT_TS_DATE_S;
			case "%X": return L10n.CORE_FMT_TS_TIME_S;
		}
	}).bind(this)).replace(/%[%aAbBdefFhHiImMnpPSuwWYzZ]/g, (function($0, ich, s) {
		switch ($0) {
			case "%%":
				return "%";
			case "%a":
				var iWeekDay = this.getDay();
				return L10n["CORE_WEEKDAY_S" + (iWeekDay > 0 && iWeekDay || 7)];
			case "%A":
				var iWeekDay = this.getDay();
				return L10n["CORE_WEEKDAY_L" + (iWeekDay > 0 && iWeekDay || 7)];
			case "%b":
				return L10n["CORE_MONTH_S" + (this.getMonth() + 1)];
			case "%B":
				return L10n["CORE_MONTH_L" + (this.getMonth() + 1)];
			case "%d":
				return this.getDate().toString().pad(2, "0", -1);
			case "%e":
				return this.getDate();
			case "%f":
				return (this.getTime() % 1000).toString().pad(3, "0", -1) + "000";
			case "%F":
				return (this.getTime() % 1000).toString().pad(3, "0", -1);
			case "%h":
				return this.getHours();
			case "%H":
				return this.getHours().toString().pad(2, "0", -1);
			case "%i":
				var iHour = this.getHours() % 12;
				return iHour > 0 && iHour || 12;
			case "%I":
				var iHour = this.getHours() % 12;
				return (iHour > 0 && iHour || 12).toString().pad(2, "0", -1);
			case "%m":
				return (this.getMonth() + 1).toString().pad(2, "0", -1);
			case "%M":
				return this.getMinutes().toString().pad(2, "0", -1);
			case "%n":
				return this.getMonth() + 1;
			case "%p":
				var iHour = this.getHours();
				return iHour > 0 && iHour <= 12 && "AM" || "PM";
//			case "%P":
			case "%S":
				return this.getSeconds().toString().pad(2, "0", -1);
			case "%u":
				var iWeekDay = this.getDay();
				return iWeekDay > 0 && iWeekDay || 7;
			case "%w":
				var iWeekDay = this.getDay();
				return iWeekDay < 7 && iWeekDay || 0;
//			case "%W":
			case "%Y":
				return this.getFullYear();
//			case "%z":
//			case "%Z":
		}
	}).bind(this));
}
Date.prototype.format = $Date$format;


/** Generates a human-readable representation of a duration in milliseconds (Date’s unit). Same as
PHP’s ql_format_duration().

iTD:int
	Duration in milliseconds.
return:String
	Formatted duration.
*/
function $Date$formatDuration(iTD) {
	var s = "";
	for (var sUnit in Date.formatDuration._arrSteps) {
		var arrStep = Date.formatDuration._arrSteps[sUnit],
			 i = Math.floor(iTD % arrStep[0]);
		if (i) {
			s = i + " " + L10n["CORE_TIMELEN_" + sUnit + (i == 1 && "_S" || "S_S")] + " " + s;
		}
		iTD = Math.floor(iTD / arrStep[0]);
	}
	return s.substr(0, s.length - 1);
}
Date.formatDuration = $Date$formatDuration;
Date.formatDuration._arrSteps = {
	"MS":    [   1000],
	"SEC":   [     60],
	"MIN":   [     60],
	"HOUR":  [     24],
	"DAY":   [     30],
	"MONTH": [     12],
	"YEAR":  [1000000]
};


/** See Object.toJSONString().
*/
function $Date$toJSONString(oParserStatus /*= undefined*/) {
	Function.checkArgs($Date$toJSONString, arguments, [undefined, Object]);
	return "new Date(" + this.getTime() + ")";
}
Date.prototype.toJSONString = $Date$toJSONString;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Function


/** DESIGN_2632 JS: Inheritance and augmentation

JavaScript only offers a built-in single inheritance mechanism; in some cases though, it would be
nice for a class to just pack together functionality from more classes at once.

Setting up the built-in single inheritance is a matter of more than a single instruction, and their
meaning is not that intuitive (although, at a closer look, it does make sense). For this reason,
natext.js offers a utility method built into each Function object (i.e. every class), inheritFrom(),
which is used like this:

	function BaseClass() {
	}

	function DerivedClass() {
	}

	DerivedClass.inheritFrom(BaseClass);

This will create an instance of BaseClass, to be used as the prototype for DerivedClass; this might
be an issue for classes with a non-empty constructor, since a new object will be instantiated, but
the constructor should only ensure that the instance be complete in all its members, and avoid
taking any further action.

To allow a constructor to differentiate instantiations by inheritFrom() from regular instantiations,
inheritFrom() will pass it exactly one argument, the object Function.PROTOTYPING; its detection
should cause a constructor to just return immediately. The above example is therefore changed:

	function BaseClass() {
		if (arguments[0] === Function.PROTOTYPING) {
			return;
		}
	}

For good measure, every constructor should begin with the above two lines, so that no modifications
or checks will be necessary before a new class can be derived from the class it constructs.


Still one issue remains: the language does not support multiple inheritance, so if a class needs to
inherit from two or more others, all but one must be merged into its prototype, so that their
members will be also available to the derived class; in Quearl, this is called augmentation, and is
easily applied by calling, e.g. for the above example:

	DerivedClass.augmentWith(BaseClass2);
	DerivedClass.augmentWith(BaseClass3);

In this case, objects of BaseClass2 and BaseClass3 will not be instantiated; instead, members of
their prototypes will be copied to the prototype of DerivedClass, save members already present in
the latter.

This mechanism is more of a hack, since is not explicitly supported by the language; nonetheless, it
works, with the only drawback being that the instanceof operator is completely oblivious of the
relationship implied by the semantics of augmentWith().

Credits go to Gavin Kistner and Doug Crockford for the ideas behind this concept.
*/


/** Unique value that, if passed to a constructor, should cause it to skip the regular
initialization of the object; see [DESIGN_2632 JS: Inheritance and augmentation]. */
Function.PROTOTYPING/*:Object*/ = {};
Function.PROTOTYPING.toString = Function.createToStringMethod("Function.PROTOTYPING");


/** Non-callable function. The only way to implement it here is… to not implement it.
*/
Function.Abstract = null;


/** Extends a class with the members of another class, thereby imitating multiple inheritance;
members already present in the prototype will not be overwritten. See [DESIGN_2632 JS: Inheritance
and augmentation].

vParent:(Function|Object)
	The parent class (Function), or an Object to be used as prototype.
*/
function $Function$augmentWith(vParent) {
	Function.checkArgs($Function$augmentWith, arguments, [Function, Object]);
	var oProto = this.prototype,
		 oParentProto = (vParent instanceof Function && vParent.prototype || vParent);
	for (var sProp in oParentProto) {
		if (!(sProp in oProto)) {
			oProto[sProp] = oParentProto[sProp];
		}
	}
	return this;
}
Function.prototype.augmentWith = $Function$augmentWith;


/** Returns this, permanently bound to the specified arguments. Any further arguments passed during
calls, will be appended to those specified here.

[o:Object]
	this to be bound.
[…:var*]
	Arguments to be bound.
return:Function
	Function that will invoke this with additional arguments.
*/
if (!Function.prototype.bind) {
	function $Function$bind(o/*, …*/) {
		Function.checkArgs($Function$bind, arguments, Object.ANYTYPE);
		var fn = this;
		if (arguments.length == 1) {
			// This is why the first argument is actually named: since it would be the this argument,
			// the bound call can be greatly simplified to this.
			return function(/*…*/) {
				return fn.apply(o, arguments);
			};
		}
		var arrArgs = [];
		for (var i = 1; i < arguments.length; ++i) {
			arrArgs.push(arguments[i]);
		}
		return function(/*…*/) {
			var cArguments = arguments.length;
			if (!cArguments) {
				// Other simplification: no additional arguments, so we can just reuse the bound
				// arguments.
				return fn.apply(o, arrArgs);
			}
			var arr = [];
			for (var i = 0, c = arrArgs.length; i < c; ++i) {
				arr.push(arrArgs[i]);
			}
			for (var i = 0; i < cArguments; ++i) {
				arr.push(arguments[i]);
			}
			return fn.apply(o, arr);
		};
	}
	Function.prototype.bind = $Function$bind;
}


/** Returns the specified non-Function, permanently bound to the specified arguments. Any further
arguments passed during calls, will be appended to those specified here.

Alternate version of Function.bind() for browsers whose DOM objects are not instances of Function
(IE6/IE7/IE8, maybe others: DOM does not mandate so).

fn:non-Function
	Method to be invoked.
[o:Object]
	this to be bound.
[…:var*]
	Arguments to be bound.
return:Function
	Function that will invoke fn with additional arguments.
*/
(function() {
	// Non-random counter of temporary properties. They only have to be unique for each (callback,
	// object) pair, so this is quite safe.
	var iProp = 1;

	function $Function$bindNonFunction(fn, o/*, …*/) {
		Function.checkArgs($Function$bindNonFunction, arguments, Function, Object.ANYTYPE);
		// Make an array of the arguments past o.
		var arrArgs = [];
		for (var i = 2; i < arguments.length; ++i) {
			arrArgs.push(arguments[i]);
		}
		// Must have an actual object, so get a wrapper for integral types.
		switch (typeof(o)) {
			case "string":  o = new String(o); break;
			case "number":  o = new Number(o); break;
			case "boolean": o = new Boolean(o); break;
			default:        o = window; break;
		}
		return function(/*…*/) {
			var arr, mRet, cArguments = arguments.length;
			if (cArguments) {
				arr = [];
				for (var i = 0; i < arrArgs.length; ++i) {
					arr.push(arrArgs[i]);
				}
				for (var i = 0; i < cArguments; ++i) {
					arr.push(arguments[i]);
				}
			} else {
				arr = arrArgs;
			}
			// Get a pseudo-unique property name for this invocation, assign the original function as
			// this property, and invoke it.
			var sProp = "_ql_bNF_apply_" + iProp;
			// Increment or wrap the non-random counter.
			if (iProp < Number.INT_MAX) {
				++iProp;
			} else {
				iProp = 1;
			}
			o[sProp] = fn;
			// Try to avoid using eval().
			switch (arr.length) {
				case 0: mRet = o[sProp](); break;
				case 1: mRet = o[sProp](arr[0]); break;
				case 2: mRet = o[sProp](arr[0], arr[1]); break;
				case 3: mRet = o[sProp](arr[0], arr[1], arr[2]); break;
				case 4: mRet = o[sProp](arr[0], arr[1], arr[2], arr[3]); break;
				case 5: mRet = o[sProp](arr[0], arr[1], arr[2], arr[3], arr[4]); break;
				default:
					// This is really ugly and slow.
					var sArgs = "arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]";
					for (var i = 6, c = arr.length; i < c; ++i) {
						sArgs += ", arr[" + i + "]";
					}
					mRet = eval("o[sProp](" + sArgs + ")");
			}
			try {
				delete o[sProp];
			} catch (x) {
				// IE6 bug, IE7 bug: delete on a COM object’s member.
				o[sProp] = null;
			}
			return mRet;
		};
	}
	Function.bindNonFunction = $Function$bindNonFunction;
})();


/** Empty (no-op) function. It may take any arguments, which will be entirely ignored.

[…:var*]
	Unused arguments.
*/
function $Function$Empty(/*…*/) {
}
Function.Empty = $Function$Empty;


/** False function. It may take any arguments, which will be entirely ignored.

[…:var*]
	Unused arguments.
return:bool
	false.
*/
function $Function$False(/*…*/) {
	return false;
}
Function.False = $Function$False;


/** Identity function. It returns the (first) argument it was passed.

v:var
	Argument to be returned.
return:var
	Argument passed.
*/
function $Function$Identity(v) {
	Function.checkArgs($Function$Identity, arguments, Object.ANYTYPEOPT);
	return v;
}
Function.Identity = $Function$Identity;


/** Makes a class (Function) a descendant of the specified class or prototype. See [DESIGN_2632 JS:
Inheritance and augmentation] for more information.

vParent:(Function|Object)
	The parent class (Function), or an Object to be used as prototype.
return:Function
	this.
*/
function $Function$inheritFrom(vParent) {
	Function.checkArgs($Function$inheritFrom, arguments, [Function, Object]);
	var oParent;
	if (vParent instanceof Function) {
		oParent = new vParent(Function.PROTOTYPING);
	} else {
		oParent = vParent;
	}
	this.prototype = oParent;
	oParent.constructor = this;
	return this;
}
Function.prototype.inheritFrom = $Function$inheritFrom;


/** True function. It may take any arguments, which will be entirely ignored.

[…:var*]
	Unused arguments.
return:bool
	true.
*/
function $Function$True(/*…*/) {
	return true;
}
Function.True = $Function$True;


/** Returns the name of the function.

fn:Function
	Function whose name is to be retrieved.
return:String
	The name of the function, i.e. identifier on the right of “function” in its declaration.
*/
function $Function$getName(fn) {
	Function.checkArgs($Function$getName, arguments, Object.ANYTYPE);
	// Just in case… some browsers may lack the ability to decompile functions.
	try {
		return fn.toString().match(/^[^(]*?(\S+)\(/)[1];
	} catch (x) {
		return "";
	}
}
Function.getName = $Function$getName;


/** See Object.toJSONString().
*/
function $Function$toJSONString(oParserStatus /*= undefined*/) {
	Function.checkArgs($Function$toJSONString, arguments, [undefined, Object]);
	// Trimming is necessary on the left too, because of OP9 bug which adds a new line before the
	// word “function”.
	return "{\"_jsonErr\":\"" + this.toString().match(/^[^{]*/)[0].trim() + "\"}";
}
Function.prototype.toJSONString = $Function$toJSONString;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Math


/** Synchronization constants. */
Math.MIN_TIMEOUT/*:int*/ = 10;
/** Sort UI delay: mostly unnoticeable to the user. */
Math.UI_SHORT_DELAY/*:int*/ = 400;
/** Medium UI delay: fair delay, doesn’t bother the user. */
Math.UI_MEDIUM_DELAY/*:int*/ = 1500;
/** Long UI delay: for when the user expects a longer wait. */
Math.UI_LONG_DELAY/*:int*/ = 3000;
/** Frame rate for smooth animations. */
Math.UI_SMOOTH_RATE/*:int*/ = 40;


/** Calculates the distance between the specified 2D points.

x1:float
	Abscissa of the first point.
y1:float
	Ordinate of the first point.
x2:float
	Abscissa of the second point.
y2:float
	Ordinate of the second point.
return:float
	Distance between the points.
*/
function $Math$distance(x1, y1, x2, y2) {
	Function.checkArgs($Math$distance, arguments, Number, Number, Number, Number);
	var dx = x2 - x1, dy = y2 - y1;
	return Math.sqrt(dx * dx + dy * dy);
}
Math.distance = $Math$distance;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Number


/** Largest positive value for an int. */
Number.INT_MAX/*:int*/ = 0x7fffffff;
/** Largest negative value for an int. */
Number.INT_MIN/*:int*/ = 0x80000000;
/** Bit-mask of the sign bit in an int value. */
Number.INT_SIGN_MASK/*:int*/ = 0x80000000;

/** Formats a number for display.

v:(Number|String)
	Number to be formatted, or a string that will be converted to a number.
[cDecs:int]
	Decimal digits to include in the returned string; defaults to 0.
return:String
	String representation of the number.
*/
(function() {

	/** Cache of RegExps built so far. */
	var mapDecsRegExpCache/*:Object(RegExp*)*/ = {};


	function $Number$format(v, cDecs /*= 0*/) {
		Function.checkArgs($Number$format, arguments, [Number, String], [undefined, Number]);
		if (typeof(v) != "number") {
			v = parseFloat(v);
		}
		var s;
		// Round the number to the closest position.
		if (cDecs > 0) {
			v = parseFloat(v) + Math.pow(10, -cDecs) * 0.5;
			s = Math.floor(v).toString();
		} else {
			v = Math.round(v);
			s = v.toString();
		}
		for (var i = s.length - 3; i > 0; i -= 3) {
			s = s.substr(0, i) + L10n.CORE_NUM_THOUSEP + s.substr(i);
		}
		if (cDecs > 0) {
			// Cache the RegExp; this should hint the browser to keep the compiled version around,
			// granting a free speed-up.
			var reDecs;
			if (cDecs in mapDecsRegExpCache) {
				reDecs = mapDecsRegExpCache[cDecs];
			} else {
				reDecs = new RegExp("\\.(\\d{0," + cDecs + "})");
				mapDecsRegExpCache[cDecs] = cDecs;
			}
			s += L10n.CORE_NUM_DECSEP + (v.toString().match(reDecs) || {1: ""})[1].pad(cDecs, "0", 1);
		}
		return s;
	}
	Number.format = $Number$format;
})();


/** Converts a number in a size in a suitable multiple unit of byte.

i:int
	Size to convert.
iMaxMultiple:int
	Max multiple unit to be used: 0 = B, 1 = KB, 2 = MB, and so on.
return:String
	Formatted size.
*/
function $Number$formatByteSize(i, iMaxMultiple /*= undefined*/) {
	if (iMaxMultiple === undefined) {
		iMaxMultiple = 10;
	}
	if (i < 1024 || iMaxMultiple <= 0) {
		return i + " B";
	}
	if (i < 1048576 || iMaxMultiple <= 1) {
		return Number.format(i / 1024, 2) + " KiB";
	}
	if (i < 1073741824 || iMaxMultiple <= 2) {
		return Number.format(i / 1048576, 2) + " MiB";
	}
	if (i < 1099511627776 || iMaxMultiple <= 3) {
		return Number.format(i / 1073741824, 2) + " GiB";
	}
	if (i < 1125899906842624 || iMaxMultiple <= 4) {
		return Number.format(i / 1099511627776, 2) + " TiB";
	}
	return Number.format(i / 1125899906842624, 2) + " PiB";
}
Number.formatByteSize = $Number$formatByteSize;


/** Formats a currency.

i:float
	Number to convert.
return:String
	Formatted currency.
*/
function $Number$formatCy(i) {
	return Number.format(i, L10n.CORE_CUR_DECS);
}
Number.formatCy = $Number$formatCy;


/** Rotates leftwards the bits in the number.

c:int
	Number of bits to be rotated.
return:int
	Resulting number.
*/
function $Number$rotateLeft(c) {
	Function.checkArgs($Number$rotateLeft, arguments, Number);
	return (this << c) | (this >>> (32 - c));
}
Number.prototype.rotateLeft = $Number$rotateLeft;


/** Returns a fixed-length hexadecimal representation of the number.

return:String
	Representation of the number.
*/
function $Number$toHexString() {
	Function.checkArgs($Number$toHexString, arguments);
	// Break the number in two, to avoid problems with negative numbers.
	return ("000" + ((this >> 16) & 0xffff).toString(16)).substr(-4) +
			 ("000" + ( this        & 0xffff).toString(16)).substr(-4);
}
Number.prototype.toHexString = $Number$toHexString;


/** See Object.toJSONString().
*/
function $Number$toJSONString(oParserStatus /*= undefined*/) {
	Function.checkArgs($Number$toJSONString, arguments, [undefined, Object]);
	return this.toString();
}
Number.prototype.toJSONString = $Number$toJSONString;


/** Returns a little-endian fixed-length hexadecimal representation of the number.

return:String
	Representation of the number.
*/
function $Number$toLEHexString() {
	Function.checkArgs($Number$toLEHexString, arguments);
	// Break the number in two, to avoid problems with negative numbers.
	var s1 = ("000" + ( this        & 0xffff).toString(16)).substr(-4),
		 s2 = ("000" + ((this >> 16) & 0xffff).toString(16)).substr(-4);
	// Reverse the bytes.
	return s1.substr(2, 2) + s1.substr(0, 2) + s2.substr(2, 2) + s2.substr(0, 2);
}
Number.prototype.toLEHexString = $Number$toLEHexString;


/** Sums another integer to this, disregarding the sign bits of both. Truncation on overflow is
performed.

i2:int
	Second addend.
return:int
	Unsigned sum of this and the second addend.
*/
function $Number$uAdd(i2) {
	Function.checkArgs($Number$uAdd, arguments, Number);
	return ((this & Number.INT_MAX) + (i2 & Number.INT_MAX)) ^
		(this & Number.INT_SIGN_MASK) ^ (i2 & Number.INT_SIGN_MASK);
}
Number.prototype.uAdd = $Number$uAdd;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Object


/** Returns a shallow copy of the object.

return:Object(var*)
	Copy of the object.
*/
function $Object$clone(oSrc) {
	Function.checkArgs($Object$clone, arguments, Object);
	var oDst = {};
	for (var sKey in oSrc) {
		oDst[sKey] = oSrc[sKey];
	}
	return oDst;
}
Object.clone = $Object$clone;


/** Defined in ECMAScript 5 and JavaScript 1.8.1.

Note: in WK, non-Functions do have a __proto__ property, but the native .getPrototypeOf() will throw
complaining that is has been called on a non-object.
*/
if (!Object.getPrototypeOf)
	if ("o".__proto__) {
		function $Object$getPrototypeOf___proto__(o) {
			Function.checkArgs($Object$getPrototypeOf___proto__, arguments, Object.ANYTYPE);
			// FX1.5 bug, FX2 bug: the __proto__ of a native Function seems to be the function itself
			// (.toString() match), but it’s not.
			if (o instanceof Function) {
				return Function.prototype;
			}
			return o.__proto__;
		}
		Object.getPrototypeOf = $Object$getPrototypeOf___proto__;
	} else {
		function $Object$getPrototypeOf_cons_proto(o) {
			Function.checkArgs($Object$getPrototypeOf_cons_proto, arguments, Object.ANYTYPE);
			// Note: this won’t work if .constructor has been modified since the object’s
			// instantiation.
			return o.constructor.prototype;
		}
		Object.getPrototypeOf = $Object$getPrototypeOf_cons_proto;
	}


/** Augments an object, performing a set-OR with another; properties in the second object have
precedence over same-name properties in the first.

oDst:Object
	Object to be augmented.
oSrc:Object
	Object from which properties will be copied to oDst.
return:Object
	The destination object.
*/
function $Object$merge(oDst, oSrc) {
	Function.checkArgs($Object$merge, arguments, Object.ANYTYPE, Object.ANYTYPE);
	for (var sKey in oSrc) {
		oDst[sKey] = oSrc[sKey];
	}
	return oDst;
}
Object.merge = $Object$merge;


/** Returns a JSON representation of the object.

v:var
	Variable to convert.
[oParserStatus:Object]
	Internal data. Do not provide a value for this argument.
return:String
	JSON representation.
*/
function $Object$toJSONString(v, oParserStatus /*= undefined*/) {
	Function.checkArgs($Object$toJSONString, arguments, Object.ANYTYPEOPT, [undefined, Object]);
	// NOT 100% COMPATIBLE! Only use to diagnose special-case doubts.
//	if (v.toSource) return v.toSource();
	if (v === undefined) {
		return "undefined";
	}
	if (v === null) {
		return "null";
	}
	if (v === window) {
		return "{\"_jsonErr\":\"window object\"}";
	}

	// Prepare for recursion or forwarding.
	if (!oParserStatus) {
		oParserStatus = {};
	}
	if (!oParserStatus.arrParents) {
		oParserStatus.arrParents = [];
	}

	if (v.toJSONString) {
		return v.toJSONString(oParserStatus);
	}
	// Recurse and iterate.
	if (oParserStatus.arrParents.indexOf(v) != -1) {
		return "{\"_jsonErr\":\"cycle detected\"}";
	}
	oParserStatus.arrParents.push(v);
	var arr = [], arrFunctions = [];
	for (var sKey in v) {
		if (sKey == "constructor") {
			continue;
		}
		var vValue;
		try {
			vValue = v[sKey];
			if (vValue === undefined) {
				vValue = "undefined";
			} else if (vValue === null) {
				vValue = "null";
			} else if (typeof(vValue) == "function") {
				arrFunctions.push(sKey);
				continue;
			} else if (vValue.nodeType !== undefined) {
				// DOM elements have far too many attributes.
				vValue = "{\"_jsonErr\":\"XML node\"}";
			} else {
				vValue = Object.toJSONString(vValue, oParserStatus);
			}
		} catch (x) {
			vValue = "{\"_jsonErr\":\"" + x.message + "\"}";
		}
		arr.push(sKey.toJSONString() + ":" + vValue);
	}
	if (arrFunctions.length) {
		arr.push("\"_jsonOmittedMethods\":" + arrFunctions.toJSONString());
	}
	oParserStatus.arrParents.pop();
	return "{" + arr.join(", ") + "}";
}
Object.toJSONString = $Object$toJSONString;



////////////////////////////////////////////////////////////////////////////////////////////////////
// RegExp


/** Provides testing for a single digit. */
RegExp.DIGIT/*:RegExp*/ = /^\d$/;
/** Whitespace characters. Conceptually the same as String.WHITESPACE. */
RegExp.WHITESPACE_s/*:String*/ = " \n\r\t\f\x0b\u00a0\u2000-\u200b\u2028\u2029\u3000";
/** Provides testing for a single whitespace character. */
RegExp.WHITESPACE/*:RegExp*/ = new RegExp("^[" + RegExp.WHITESPACE_s + "]$");
/** Provides testing for a single zero digit. */
RegExp.ZERO/*:RegExp*/ = /^0$/;


/** Converts a string into a RegExp fragment, escaping any special characters.

s:String
	String to be escaped.
return:String
	Escaped string.
*/
function $RegExp$escape(s) {
	Function.checkArgs($RegExp$escape, arguments, String);
	return s.replace(/([$()*+.\/?[\\\]^{|}])/g, "\\$1");
}
RegExp.escape = $RegExp$escape;


/** Converts a string into a RegExp fragment, escaping any special characters but ? and *, which are
converted to their corresponding RegExp character sequences.

s:String
	String to be escaped.
return:String
	Escaped string.
*/
function $RegExp$escapeWithWildcards(s) {
	Function.checkArgs($RegExp$escapeWithWildcards, arguments, String);
	return s.replace(/([$()+.\/[\\\]^{|}])/g, "\\$1").replacePairs({
		"?": ".",
		"*": ".*"
	});
}
RegExp.escapeWithWildcards = $RegExp$escapeWithWildcards;


/** Determine whether the regular expression is little more than a string comparison.

return:bool
	true if the regular expression does not contain any special characters other than ^ and $, or
	false otherwise.
*/
function $RegExp$isSimple() {
	Function.checkArgs($RegExp$isSimple, arguments);
	if (this.ignoreCase) {
		return false;
	}
	var s = this.source.replace(/\\\\/g, "").replace(/\\[$()*+.\/?[\]^{|}]/g, "");
	return /^\^?[^$()*+.\/?[\\\]^{|}]+\$?$/.test(s);
}
RegExp.prototype.isSimple = $RegExp$isSimple;


/** See Object.toJSONString().
*/
function $RegExp$toJSONString(oParserStatus /*= undefined*/) {
	Function.checkArgs($RegExp$toJSONString, arguments, [undefined, Object]);
	var arrMatch = this.toString().match(/^\/(.*)\/([A-Za-z]*)$/);
	return "new RegExp(" + arrMatch[1].toJSONString() + (
		arrMatch[2] && ", \"" + arrMatch[2] + "\"" || ""
	) + ")";
}
RegExp.prototype.toJSONString = $RegExp$toJSONString;


/** Converts a RegExp fragment into a String, interpreting any PCRE escaped characters.

s:String
	String with excaped sequences.
return:String
	String with PCRE sequences.
*/
function $RegExp$unescape(s) {
	Function.checkArgs($RegExp$unescape, arguments, String);
	return s.replace(/\\(.)/g, "$1");
}
RegExp.unescape = $RegExp$unescape;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Sorting

/** Functions to sort unsorted collections, and keep them sorted. They are as generic as possible,
by not handling data directly, but instead relying on getter/setter/comparer callbacks.
*/
var Sorting = {};
Sorting.toString = Function.createToStringMethod("Sorting");


/** Default comparison function.

v1:var
	First value.
v2:var
	Other value.
return:int
	Standard comparison result integer:
	•	> 0 if v1 > v2;
	•	  0 if v1 == v2;
	•	< 0 if v1 < v2.
*/
function $Sorting$defaultCompare(v1, v2) {
	return v1 <= v2 ? v1 < v2 ? -1 : 0 : 1;
}
Sorting.defaultCompare = $Sorting$defaultCompare;


/** Returns the index at which the specified item should be inserted while keeping the array sorted,
according to the provided sorting function.

vValue:var
	Value to be inserted.
cItems:int
	Number of items in the collection.
fnGetItem:Function
	Callback which retrieves an item by index.
[fnCompare:Function]
	Callback which compares two items; defaults to using the standard comparison operators.
return:int
	Index at which the item should be inserted.
*/
function $Sorting$insertionIndex(
	vValue, cItems, fnGetItem, fnCompare /*= Sorting.defaultCompare*/
) {
	Function.checkArgs(
		$Sorting$insertionIndex, arguments, Object.ANYTYPEOPT, Number, Function, [undefined, Function]
	);
	if (!fnCompare) {
		fnCompare = Sorting.defaultCompare;
	}
	// Since the items are sorted, a binary search will quickly find the proper index.
	var iL = 0, iU = cItems;
	while (iL < iU) {
		var iM = (iL + iU) >> 1,
			 iRes = fnCompare(vValue, fnGetItem(iM));
		if (iRes > 0) {
			iL = iM + 1;
		} else if (iRes < 0) {
			iU = iM;
		} else {
			return iM;
		}
	}
	return iL;
}
Sorting.insertionIndex = $Sorting$insertionIndex;


/** Sorts the items in a collection using a generally fast algorithm, using the default
Array.sort(). This may rearrange equal values, undoing any previous sorting (unstable sort); see
ECMA-262 5.1 § 15.4.4.11 “Array.prototype.sort (comparefn)”.

cItems:int
	Number of items in the collection.
fnGetItem:Function
	Callback which retrieves an item by index.
fnSetItem:Function
	Callback which assigns a new value to an item.
[fnCompare:Function]
	Callback which compares two items; defaults to using the standard comparison operators.
*/
function $Sorting$sort(cItems, fnGetItem, fnSetItem, fnCompare /*= Sorting.defaultCompare*/) {
	Function.checkArgs($Sorting$sort, arguments, Number, Function, Function, [undefined, Function]);
	var arr = Array.fill(cItems, fnGetItem);
	// This will most likely be a quick sort.
	arr.sort(fnCompare || Sorting.defaultCompare);
	arr.forEach(fnSetItem);
}
Sorting.sort = $Sorting$sort;


/** Sorts the items in a collection using a generally fast algorithm, while preserving the order of
equal items (stable sort).

cItems:int
	Number of items in the collection.
fnGetItem:Function
	Callback which retrieves an item by index.
fnSetItem:Function
	Callback which assigns a new value to an item.
[fnCompare:Function]
	Callback which compares two items; defaults to using the standard comparison operators.
*/
function $Sorting$stableSort(cItems, fnGetItem, fnSetItem, fnCompare /*= Sorting.defaultCompare*/) {
	Function.checkArgs(
		$Sorting$stableSort, arguments, Number, Function, Function, [undefined, Function]
	);
	if (!fnCompare) {
		fnCompare = Sorting.defaultCompare;
	}
	// Yes, this is a merge sort.
	var fnMerge = function(arr, cItems) {
		if (cItems > 2) {
			var cItemsL = cItems >> 1,      arrL = arr.slice(0, cItemsL),
				 cItemsU = cItems - cItemsL, arrU = arr.slice(cItemsL);
			fnMerge(arrL, cItemsL);
			fnMerge(arrU, cItemsU);
			var i = 0, iL = 0, iU = 0;
			while (iL < cItemsL && iU < cItemsU) {
				arr[i++] = (fnCompare(arrL[iL], arrU[iU]) <= 0 ? arrL[iL++] : arrU[iU++]);
			}
			while (iL < cItemsL) {
				arr[i++] = arrL[iL++];
			}
			while (iU < cItemsU) {
				arr[i++] = arrU[iU++];
			}
		} else if (cItems == 2) {
			if (fnCompare(arr[0], arr[1]) > 0) {
				var vTemp = arr[0];
				arr[0] = arr[1];
				arr[1] = vTemp;
			}
		}
	};

	var cItemsL = cItems >> 1,      arrL = [],
		 cItemsU = cItems - cItemsL, arrU = [];
	// Given that cItemsU - cItemsL <= 1, both arrays can be filled with a single loop, and if the
	// difference is 1, the last item will be fetched separately.
	for (var i = 0; i < cItemsL; ++i) {
		arrL[i] = fnGetItem(i);
		arrU[i] = fnGetItem(cItemsL + i);
	}
	if (cItemsU > cItemsL) {
		arrU[cItemsL /*== cItemsU - 1*/] = fnGetItem(cItems - 1);
	}
	fnMerge(arrL, cItemsL);
	fnMerge(arrU, cItemsU);
	// Redistribute the items back to the original collection.
	var i = 0, iL = 0, iU = 0;
	while (iL < cItemsL && iU < cItemsU) {
		fnSetItem(fnCompare(arrL[iL], arrU[iU]) <= 0 ? arrL[iL++] : arrU[iU++], i++);
	}
	while (iL < cItemsL) {
		fnSetItem(arrL[iL++], i++);
	}
	while (iU < cItemsU) {
		fnSetItem(arrU[iU++], i++);
	}
}
Sorting.stableSort = $Sorting$stableSort;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Perf

/** Performance measurement tools.
*/
var Perf = {};
Perf.toString = Function.createToStringMethod("Perf");


/** Runs a function multiple times, returning the average duration of the invocations.

fn:Function
	Function to be timed.
oThis:Object
	Function’s this.
arrArgs:Array
	Function arguments.
return:float
	Average execution duration, in milliseconds.
*/
(function() {
	var arrRunCounts = [10, 30, 100, 300, 1000, 3000, 10000, 300000, 1000000, 3000000];

	function $Perf$timeExecution(fn, oThis, arrArgs) {
		Function.checkArgs($Perf$timeExecution, arguments, Function, Object.ANYTYPE, Array);
		var iDuration, cRuns, iRunCount = 0;
		do {
			cRuns = arrRunCounts[iRunCount];
			if (iRunCount < arrRunCounts.length - 1) {
				++iRunCount;
			}
			var tsStart = (new Date()).getTime();
			for (var iRun = 0; iRun < cRuns; ++iRun) {
				fn.apply(oThis, arrArgs);
			}
			// Discard the previous duration; this one is more precise.
			iDuration = (new Date()).getTime() - tsStart;
		// The test should take at least 150 ms (pretty arbitrary).
		} while (iDuration < 150);
		return iDuration / cRuns;
	}
	Perf.timeExecution = $Perf$timeExecution;
})();



////////////////////////////////////////////////////////////////////////////////////////////////////
// String


/** Whitespace characters. Conceptually the same as RegExp.WHITESPACE_s. */
String.WHITESPACE/*:String*/ =
	" \n\r\t\f\x0b\u00a0" +
	"\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";


/** Uses the string as a format specifier for the provided arguments. Similar to a very simplified
sprintf().

[…:var*]
	Arguments to format.
return:String
	Resulting string.
*/
function $String$asFormat(/*…*/) {
	var arrArgs = arguments,
		 cUsedArgs = 0;
	return this.replace(/%(?:%|(?:(\d+)\$)?([difs]))/g, function($0, $1, $2, ich, s) {
		if ($0 == "%%") {
			return "%";
		}
		var mArg;
		if ($1) {
			mArg = arrArgs[$1 - 1];
		} else {
			mArg = arrArgs[cUsedArgs++];
		}
		switch ($2) {
			case "d":
			case "i":
				return parseInt(mArg);
			case "f":
				return parseFloat(mArg);
			case "s":
				return mArg;
		}
	});
}
String.prototype.asFormat = $String$asFormat;


/** See Object.clone().
*/
function $String$clone() {
	Function.checkArgs($String$clone, arguments);
	return "".concat(this);
}
String.prototype.clone = $String$clone;


/** Truncates the string at the required length, adding ellipsis.

cch:int
	Maximum length allowed for the string.
return:String
	Truncated string.
*/
function $String$ellipsis(cch) {
	Function.checkArgs($String$ellipsis, arguments, Number);
	return this.length > cch && this.substr(0, cch - 1) + "…" || this;
}
String.prototype.ellipsis = $String$ellipsis;


/** Determine whether the string is made up entirely by whitespace, or empty.

return:bool
	false if the string contains any non-whitespace characters, or false otherwise.
*/
(function() {
	var reWhitespace = new RegExp("[^" + RegExp.WHITESPACE_s + "]");

	function $String$isWhitespace() {
		Function.checkArgs($String$isWhitespace, arguments);
		return !reWhitespace.test(this);
	}
	String.prototype.isWhitespace = $String$isWhitespace;
})();


/** Decodes a JSON string into a variabile.

return:var
	Rendered value.
*/
function $String$jsonDecode() {
	Function.checkArgs($String$jsonDecode, arguments);
	if (!this) {
		return undefined;
	}
	try {
		return eval("(" + this + ")");
	} catch (x) {
		window.Ql && Ql.logException(x, "String.jsonDecode", {
			"this": this
		});
		throw x;
	}
}
String.prototype.jsonDecode = $String$jsonDecode;


/** See Object.toJSONString().
*/
function $String$jsonEncode(v, oParserStatus /*= undefined*/) {
	Function.checkArgs($String$jsonEncode, arguments, Object.ANYTYPEOPT, [undefined, Object]);
	return Object.toJSONString(v, oParserStatus);
}
String.jsonEncode = $String$jsonEncode;


/** Compares the string to another, treating both as IETF language tags (see
<http://tools.ietf.org/html/bcp47>). The return value is nonzero if the longer string begins with
the shorter string followed by ‘-’, of if the strings are equal; the return value is 0 in any other
case. Examples:

•	"it"      =1= "it"
•	"it-IT"   =1= "it"
•	"it-IT"   =2= "it-IT"
•	"fr"       != "it"
•	"en"      =1= "en-US"
•	"en-UK"    != "en-US"
•	"az"      =1= "az-Arab-IR"
•	"az-Arab" =2= "az-Arab-IR"

s2:String
	Other string.
return:int
	Degree of precision of the match, or 0 if the strings specify two different languages.
*/
function $String$languageTagCompare(s2) {
	Function.checkArgs($String$languageTagCompare, arguments, String);
	s2 = s2.toLowerCase();
	var s1 = this.toLowerCase(), ich = 0, cComponents = 0;
	for (;;) {
		var ch1 = s1.charCodeAt(ich),
			 ch2 = s2.charCodeAt(ich++);
		if (!ch1 && !ch2) {
			// The strings are equal.
			return cComponents + 1;
		}
		if ((!ch1 && ch2 == 0x002d /*‘-’*/) || (!ch2 && ch1 == 0x002d /*‘-’*/)) {
			// One string is a less specific version of the other.
			return cComponents + 1;
		}
		if (ch1 != ch2) {
			// One component is different, and so are the strings.
			return 0;
		}
		if (ch1 == 0x002d /*‘-’*/) {
			++cComponents;
		}
	}
}
String.prototype.languageTagCompare = $String$languageTagCompare;


/** Performs a locale-dependent, case-insensitive string comparison.

s2:String
	Right side of the comparison.
return:int
	Comparison result.
*/
function $String$localeCompareNoCase(s2) {
	Function.checkArgs($String$localeCompareNoCase, arguments, String);
	return this.toLocaleUpperCase().localeCompare(s2.toLocaleUpperCase());
}
String.prototype.localeCompareNoCase = $String$localeCompareNoCase;


/** Computes the string’s MD5 hash.

Note: non-ASCII strings are converted to UTF-8 from UTF-16 (which seems to be the standard for
JavaScript). Non-BMP code points are fully supported.

return:String
	MD5 hash.
*/
(function() {
	// Greatest string padding.
	var c_sPadding = "\x80\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0" +
						  "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
	// Per-round shift amounts.
	var c_arrRoundShifts = [
		  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  5,  9, 14, 20,  5,  9, 14,
		 20,  5,  9, 14, 20,  5,  9, 14, 20,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11,
		 16, 23,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
	];
	// Pre-calculated values for g.
	var c_arrG = [
		 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,  1,  6, 11,  0,  5, 10, 15,
		 4,  9, 14,  3,  8, 13,  2,  7, 12,  5,  8, 11, 14,  1,  4,  7, 10, 13,  0,  3,  6,  9, 12,
		15,  2,  0,  7, 14,  5, 12,  3, 10,  1,  8, 15,  6, 13,  4, 11,  2,  9
	];
	// Pre-calculated values for the constant k.
	var c_arrK = [
		0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613,
		0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193,
		0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d,
		0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
		0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122,
		0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
		0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244,
		0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
		0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb,
		0xeb86d391
	];

	function $String$md5() {
		Function.checkArgs($String$md5, arguments);
		// Initial value for the 128 hash bits.
		var iHash0 = 0x67452301, iHash1 = 0xefcdab89, iHash2 = 0x98badcfe, iHash3 = 0x10325476;
		// Each iteration of this loop will fill arrChunk with 16 32-bit little-endian integers,
		// taking as many JS characters as needed; after their depletion, it runs at least one more
		// iteration, to append the 1 bit’s byte; the loop code will determine, in that extra
		// iteration, exactly how many padding bytes to add.
		var s = this;
		var arrChunk = [], cbCh = 0, ch = 0, cb = 0, cbitAccum = 0, iAccum = 0;
		for (var ich = 0, cch = this.length, cchPadded = cch + 1; ich < cchPadded; ) {
			// Initialize hash value for this chunk.
			var i0 = iHash0, i1 = iHash1, i2 = iHash2, i3 = iHash3;
			// Convert the chunk into 16 integers.
			for (var ib = 0; ib < 16; ) {
				// If ch has been used up entirely, get a new character.
				if (!cbCh) {
					if (ich < cch) {
						// The string is not over: get another character from it, converting it from
						// UTF-16 into an UTF-8 representation, with the bytes in a reversed order.
						ch = s.charCodeAt(ich++);
						if (ch <= 0x007f) {
							// 00000000 0zzzzzzz -> 0zzzzzzz
							cbCh = 1;
						} else if (ch <= 0x07ff) {
							// 00000yyy yyzzzzzz -> 10zzzzzz 110yyyyy
							ch = ((ch >> 6) & 0x0000001f) |
								  ((ch << 8) & 0x00003f00) |
								  0x000080c0;
							cbCh = 2;
						} else if (ch >= 0xd800 && ch <= 0xdbff) {
							// First character of a surrogate pair: get the second in the pair, and
							// assemble them in UTF-32.
							// 110110xx xxxxxxxx | 110111yy yyyyyyyy -> 00000000 0000xxxx xxxxxxyy yyyyyyyy
							ch = ((ch                  & 0x3ff) << 10) |
								  ((s.charCodeAt(ich++) & 0x3ff)      ) +
								  0x10000;
							// Now encode the code point in UTF-8.
							// 00000000 000wwwxx xxxxyyyy yyzzzzzz -> 10zzzzzz 10yyyyyy 10xxxxxx 11110www
							ch = ((ch >> 18) & 0x00000003) |
								  ((ch >>  4) & 0x00003f00) |
								  ((ch << 10) & 0x003f0000) |
								  ((ch << 24) & 0x3f000000) |
								  0x808080f0;
							cbCh = 4;
						} else {
							// xxxxyyyy yyzzzzzz -> 10zzzzzz 10yyyyyy 1110xxxx
							ch = ((ch >> 12) & 0x00000f) |
								  ((ch <<  2) & 0x003f00) |
								  ((ch << 16) & 0x3f0000) |
								  0x008080e0;
							cbCh = 3;
						}
						// Calculate the byte length of the string.
						cb += cbCh;
					} else {
						if (ich == cch) {
							// The string is over: append a single non-UTF-8 byte with a 1 bit, and as many
							// 0s so that cb % 64 == 56. Also add a little-endian 64-bit bit length of the
							// original string (we’ll assume the high 32 bits to be 0).
							var cbPadding = 56 - (cb & 0x3f);
							if (cbPadding < 1) {
								cbPadding += 64;
							}
							s += c_sPadding.substr(0, cbPadding) + String.fromCharCode(
								(cb <<  3) & 0xff,
								(cb >>  5) & 0xff,
								(cb >> 13) & 0xff,
								(cb >> 21) & 0xff
							) + "\0\0\0\0";
							// Update the padded length, to properly end the loop.
							cchPadded = s.length;
						}
						// These characters are not UTF-8, but raw bytes.
						ch = s.charCodeAt(ich++);
						cbCh = 1;
					}
				}
				iAccum |= (ch & 0xff) << cbitAccum;
				ch >>= 8;
				--cbCh;
				cbitAccum += 8;
				if (cbitAccum == 32) {
					arrChunk[ib++] = iAccum;
					cbitAccum = 0;
					iAccum = 0;
				}
			}
			// Process the chunk.
			for (var i = 0; i < 64; ++i) {
				if (i < 16) {
					f = (i1 & i2) | (~i1 & i3);
				} else if (i < 32) {
					f = (i3 & i1) | (~i3 & i2);
				} else if (i < 48) {
					f = i1 ^ i2 ^ i3;
				} else {
					f = i2 ^ (i1 | ~i3);
				}
				var iTemp = i3;
				i3 = i2;
				i2 = i1;
				i1 = i1.uAdd(
					i0.uAdd(f).uAdd(c_arrK[i]).uAdd(arrChunk[c_arrG[i]]).rotateLeft(c_arrRoundShifts[i])
				);
				i0 = iTemp;
			}
			// Add the hash of this chunk to the accumulator.
			iHash0 = iHash0.uAdd(i0);
			iHash1 = iHash1.uAdd(i1);
			iHash2 = iHash2.uAdd(i2);
			iHash3 = iHash3.uAdd(i3);
		}
		return iHash0.toLEHexString() + iHash1.toLEHexString() +
				 iHash2.toLEHexString() + iHash3.toLEHexString();
	}
	String.prototype.md5 = $String$md5;
})();


/** Compares the string to another, using a natural order algorithm:
•	Numbers have the same precedence as in regular sorting, but are grouped (i.e. digits have no
	individual weight);
•	Differences in whitespace are ignored, but will be used to break a tie;
•	Leading zeroes in numbers can make two otherwise identical numbers different, but are otherwise
	ignored, and less important than whitespace anyway (because they appear later in the string).

The algorithm was developed after this table:
•	Ws = whitespace characters
•	0s = zeroes
•	Num = sort order, from any numbers in the string
•	Str = sort order, from any non-whitespace non-digit in the string
•	Len = sort order, according to length (whitespace and digits excluded)

         ┌────┬────┬─────┬─────┬─────┐
         │ Ws │ 0s │ Num │ Str │ Len │
┌────────┼────┼────┼─────┼─────┼─────┤
│ “a”    │  0 │  - │  -  │  1  │  1  │
│ “a ”   │  1 │  - │  -  │  1  │  1  │
│ “a  ”  │  2 │  - │  -  │  1  │  1  │
│ “a0”   │  0 │  1 │  0  │  1  │  1  │
│ “a00”  │  0 │  2 │  0  │  1  │  1  │
│ “a 0”  │  1 │  1 │  0  │  1  │  1  │
│ “a  0” │  2 │  1 │  0  │  1  │  1  │
│ “a1”   │  0 │  0 │  1  │  1  │  2  │
│ “a01”  │  0 │  1 │  1  │  1  │  2  │
│ “a 1”  │  1 │  0 │  1  │  1  │  2  │
│ “a  1” │  2 │  0 │  1  │  1  │  2  │
│ “a2”   │  0 │  0 │  2  │  1  │  2  │
│ “a02”  │  0 │  1 │  2  │  1  │  2  │
│ “a 2”  │  1 │  0 │  2  │  1  │  2  │
│ “a  2” │  2 │  0 │  2  │  1  │  2  │
│ “a11”  │  0 │  0 │ 11  │  1  │  2  │
│ “a011” │  0 │  1 │ 11  │  1  │  2  │
│ “a 11” │  1 │  0 │ 11  │  1  │  2  │
│ “aa”   │  0 │  - │  -  │  2  │  2  │
│ “a a”  │  1 │  - │  -  │  2  │  2  │
│ “a  a” │  2 │  - │  -  │  2  │  2  │
│ “a aa” │  1 │  - │  -  │  3  │  3  │
│ “a ab” │  1 │  - │  -  │  4  │  3  │
│ “a b”  │  1 │  - │  -  │  5  │  2  │
│ “a  b” │  2 │  - │  -  │  5  │  2  │
└────────┴────┴────┴─────┴─────┴─────┘

s2:String
	Other string.
[bNoCase:bool]
	If true, case differences in the two strings will be ignored; i.e. the comparison will be case-
	insensitive. Defaults to false.
return:int
	Standard comparison result integer:
	•	> 0 if this > s2;
	•	  0 if this == s2;
	•	< 0 if this < s2.
*/
function $String$natCompare(s2, bNoCase /*= false*/) {
	Function.checkArgs($String$natCompare, arguments, String, [undefined, Boolean]);
	var s1 = this, sCompareMethod = (bNoCase && "localeCompareNoCase" || "localeCompare");
	var ich1 = 0, ich2 = 0, iCmp = 0, iWsBias = 0, iBias;
	for (;;) {
		var ch1 = s1.charAt(ich1++),
			 ch2 = s2.charAt(ich2++);
		// Skip whitespace, but save the resulting bias.
		iBias = 0;
		while (ch1 && RegExp.WHITESPACE.test(ch1)) {
			++iBias;
			ch1 = s1.charAt(ich1++);
		}
		while (ch2 && RegExp.WHITESPACE.test(ch2)) {
			--iBias;
			ch2 = s2.charAt(ich2++);
		}
		if (iWsBias == 0) {
			iWsBias = iBias;
		}
		// Compare two characters or digit runs.
		if (ch1 && ch2) {
			if (RegExp.DIGIT.test(ch1) && RegExp.DIGIT.test(ch2)) {
				var iZeroBias = 0;
				// Skip leading zeroes, but save the resulting bias.
				while (ch1 && RegExp.ZERO.test(ch1)) {
					++iZeroBias;
					ch1 = s1.charAt(ich1++);
				}
				while (ch2 && RegExp.ZERO.test(ch2)) {
					--iZeroBias;
					ch2 = s2.charAt(ich2++);
				}
				iBias = 0;
				for (;;) {
					var bDigit1 = (ch1 && RegExp.DIGIT.test(ch1)),
						 bDigit2 = (ch2 && RegExp.DIGIT.test(ch2));
					if (!bDigit1 || !bDigit2) {
						break;
					}
					if (iBias == 0) {
						// Compare the most significant different digit.
						iBias = ch1[sCompareMethod](ch2);
					}
					ch1 = s1.charAt(ich1++);
					ch2 = s2.charAt(ich2++);
				}
				// Leading zeroes were stripped, so longer = bigger.
				if (bDigit1) {
					iCmp = +1;
				} else if (bDigit2) {
					iCmp = -1;
				} else {
					// The value of the numbers is the same, so try breaking the tie with some bias.
					iCmp = iBias || iWsBias || iZeroBias;
				}
			} else {
				// Regular comparison.
				iCmp = ch1[sCompareMethod](ch2);
			}
			// The two chars/numbers are different, so quit now.
			if (iCmp != 0) {
				return iCmp;
			}
		}
		if (!ch1 || !ch2) {
			// End of comparison, and the strings are equal so far; the longest goes last, otherwise
			// some bias is needed.
			if (!ch1) {
				return -1;
			}
			if (!ch2) {
				return +1;
			}
			return iWsBias;
		}
	}
}
String.prototype.natCompare = $String$natCompare;


/** Case-insensitive version of String.natCompare().

s2:String
	Other string.
return:int
	Standard comparison result integer:
	•	> 0 if this > s2;
	•	  0 if this == s2;
	•	< 0 if this < s2.
*/
function $String$natCompareNoCase(s2) {
	Function.checkArgs($String$natCompareNoCase, arguments, String);
	return this.natCompare(s2, true);
}
String.prototype.natCompareNoCase = $String$natCompareNoCase;


/** Ensures the string is of a certain length, padding it as necessary.

cchPad:int
	Number of desired total characters.
sPadder:String
	String to be used as padding.
iDir:int
	Side of the string which should be padded if necessary:
	•	< 0 turns “nopad” into “    nopad”;
	•	  0 turns “nopad” into “  nopad  ”;
	•	> 0 turns “nopad” into “nopad    ”.
	It may help to think of the original string as the origin, and iDir as a point relative to it,
	where the padding will be applied.
return:String
	Padded string.
*/
function $String$pad(cchPad, sPadder, iDir) {
	Function.checkArgs($String$pad, arguments, Number, String, Number);
	var s;
	if (this.length >= cchPad) {
		s = this.clone();
	} else if (iDir == 0) {
		s = this.pad(
			this.length + ((cchPad - this.length) >> 1), sPadder, -1
		).pad(cchPad, sPadder, 1);
	} else {
		var sPad = (
			sPadder && sPadder.repeat(Math.ceil((cchPad - this.length) / sPadder.length)) || ""
		);
		if (iDir < 0) {
			s = sPad.substr(sPad.length - (cchPad - this.length)) + this;
		} else {
			s = this + sPad.substr(0, cchPad - this.length);
		}
	}
	return s;
}
String.prototype.pad = $String$pad;


/** Returns this string, repeated as many times as specified.

iMult:int
	Number of repetitions desired.
return:String
	Repeated string.
*/
function $String$repeat(iMult) {
	Function.checkArgs($String$repeat, arguments, Number);
	var s = "";
	while (iMult-- > 0) {
		s += this;
	}
	return s;
}
String.prototype.repeat = $String$repeat;


/** Returns the string, backwards.

return:String
	Reversed string.
*/
function $String$reverse() {
	Function.checkArgs($String$reverse, arguments);
	var s = "";
	for (var i = this.length; i--; ) {
		s += this.charAt(i);
	}
	return s;
}
String.prototype.reverse = $String$reverse;


/** Replaces a set of substrings according to the provided replacement map.

map:Object(var*)
	Maps each source string to each destination string. If a RegExp is to be used for the search, the
	corresponding item will have a number as key, and the item will be an array with the pair (search
	RegExp, substitution) instead of a string.
return:String
	Resulting string.
*/
function $String$replacePairs(map) {
	Function.checkArgs($String$replacePairs, arguments, Object);
	var s = this.clone();
	for (var sSearch in map) {
		if (map[sSearch] instanceof Array) {
			// The value is a pair: ignore the key, use the two values.
			s = s.replace(map[sSearch][0], map[sSearch][1]);
		} else {
			s = s.replace(new RegExp(RegExp.escape(sSearch), "g"), map[sSearch]);
		}
	}
	return s;
}
String.prototype.replacePairs = $String$replacePairs;


if ("ab".substr(-1) != "b")
	// IE5.5 bug, IE6 bug, IE7 bug, IE8 bug: their substr() doesn’t accept a negative starting index,
	// so it must be fixed.
	(function() {
		var fnOverridden = String.prototype.substr;

		function $String$substr_fixNegStart(ichStart, cch /*= undefined*/) {
			Function.checkArgs($String$substr_fixNegStart, arguments, Number, [undefined, Number]);
			if (ichStart < 0) {
				ichStart = this.length + ichStart;
			}
			// Additional IE5.5 bug: the native substr() treats undefined for cch like 0, so substr(x)
			// will always return ""; to fix this, tell it to return the maximum number of characters
			// instead.
			if (cch === undefined) {
				cch = this.length;
			}
			return fnOverridden.call(this, ichStart, cch);
		}
		String.prototype.substr = $String$substr_fixNegStart;
	})();


/** Counts the occurrences of the specified string into this one.

v:(String|RegExp)
	String or RegExp of which to count occurrences.
return:int
	Number of occurrences.
*/
function $String$substrCount(v) {
	Function.checkArgs($String$substrCount, arguments, [String, RegExp]);
	return (this.match(v instanceof RegExp && v || new RegExp(RegExp.escape(v), "g")) || []).length;
}
String.prototype.substrCount = $String$substrCount;


/** Converts “some-dashed-text” to “someDashedText”.

return:String
	Converted string.
*/
(function() {

	function camelizer($0, ich, s) {
		return $0.charAt(1).toUpperCase();
	}


	function $String$toCamelCase() {
		Function.checkArgs($String$toCamelCase, arguments);
		return this.replace(/-[a-z]/g, camelizer);
	}
	String.prototype.toCamelCase = $String$toCamelCase;
})();


/** See Object.toJSONString().
*/
String.prototype.toJSONString = (function() {
	var mapEscapeSeqs = {
		"\\"  : "\\\\",
		"\""  : "\\\"",
		"\x08": "\\b",
		"\x09": "\\t",
		"\x0a": "\\n",
		"\x0c": "\\f",
		"\x0d": "\\r"
	};

	/** Converts C0 control characters in \uxxxx escape sequences.
	*/
	function ctlToEscapeSeq($0, ich, s) {
		var s = "";
		for (var ich = 0, cch = $0.length; ich < cch; ++ich) {
			s += "\\u" + ("000" + $0.charCodeAt(ich).toString(16)).substr(-4);
		}
		return s;
	}


	function $String$toJSONString(oParserStatus /*= undefined*/) {
		Function.checkArgs($String$toJSONString, arguments, [undefined, Object]);
		var s = this.replacePairs(mapEscapeSeqs);
		s = s.replace(/[\x00-\x1f]+/g, ctlToEscapeSeq);
		return "\"" + s + "\"";
	}
	return $String$toJSONString;
})();


/** Defined in ECMAScript 5 and JavaScript 1.8.1. Versions here are optimized for longer strings
with fewer trimmable spaces.
*/
if (!String.prototype.trim) {
	if (Browser.isIE) {
		// This seems to exploit some optimizations in IE5.5/IE6/IE7/IE8’s RegExp compiler.
		(function() {
			var reTrimmer = new RegExp(
				"^[" + RegExp.WHITESPACE_s + "]*((?:[\\S\\s]*[^" + RegExp.WHITESPACE_s + "])?)[" +
					RegExp.WHITESPACE_s + "]*$"
			);

			function $String$trim_IE() {
				Function.checkArgs($String$trim_IE, arguments);
				return this.replace(reTrimmer, "$1");
			}
			String.prototype.trim = $String$trim_IE;
		})();
	} else {
		// Generic non-RegExp version which works quite well on browsers such as FX and OP.
		function $String$trim_noRegExp() {
			Function.checkArgs($String$trim_noRegExp, arguments);
			var ichStart = -1, ichEnd = this.length - 1;
			while (++ichStart <= ichEnd) {
				if (String.WHITESPACE.indexOf(this.charAt(ichStart)) === -1) {
					break;
				}
			}
			while (ichStart <= ichEnd) {
				if (String.WHITESPACE.indexOf(this.charAt(ichEnd)) === -1) {
					break;
				}
				--ichEnd;
			}
			return this.substr(ichStart, ichEnd - ichStart + 1);
		}
		String.prototype.trim = $String$trim_noRegExp;
	}
}


/** Defined in JavaScript 1.8.1. Versions here are optimized for longer strings with fewer trimmable
spaces.
*/
if (!String.prototype.trimLeft) {
	if (Browser.isIE || (Browser.isOpera && Browser.version >= 105000)) {
		// This works best with interpreters featuring a better RegExp engine.
		(function() {
			var reTrimmer = new RegExp("^[" + RegExp.WHITESPACE_s + "][" + RegExp.WHITESPACE_s + "]*");

			function $String$trimLeft_useRegExp() {
				Function.checkArgs($String$trimLeft_useRegExp, arguments);
				return this.replace(reTrimmer, "");
			}
			String.prototype.trimLeft = $String$trimLeft_useRegExp;
		})();
	} else {
		// Generic non-RegExp version which works quite well on browsers such as FX and older OP.
		function $String$trimLeft_noRegExp() {
			Function.checkArgs($String$trimLeft_noRegExp, arguments);
			var ichStart = -1, cch = this.length;
			while (++ichStart < cch) {
				if (String.WHITESPACE.indexOf(this.charAt(ichStart)) === -1) {
					break;
				}
			}
			return this.substr(ichStart, cch - ichStart);
		}
		String.prototype.trimLeft = $String$trimLeft_noRegExp;
	}
}


/** Defined in JavaScript 1.8.1. Versions here are optimized for longer strings with fewer trimmable
spaces.
*/
if (!String.prototype.trimRight) {
	if (Browser.isOpera && Browser.version >= 105000) {
		// This works best with interpreters sporting a more optimized RegExp engine.
		(function() {
			var reTrimmer = new RegExp("[" + RegExp.WHITESPACE_s + "][" + RegExp.WHITESPACE_s + "]*$");

			function $String$trimRight_useRegExp() {
				Function.checkArgs($String$trimRight_useRegExp, arguments);
				return this.replace(reTrimmer, "");
			}
			String.prototype.trimRight = $String$trimRight_useRegExp;
		})();
	} else {
		// Generic non-RegExp version which works quite well on browsers such as IE, FX and older OP.
		function $String$trimRight_noRegExp() {
			Function.checkArgs($String$trimRight_noRegExp, arguments);
			var ichEnd = this.length;
			while (--ichEnd >= 0) {
				if (String.WHITESPACE.indexOf(this.charAt(ichEnd)) === -1) {
					break;
				}
			}
			return this.substr(0, ichEnd + 1);
		}
		String.prototype.trimRight = $String$trimRight_noRegExp;
	}
}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Url


/** URL string.

[s:String]
	String used to initialize the URL components.
*/
function $Url(s /*= undefined*/) {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Url, arguments, [undefined, String]);
	if (s) {
		this.fromString(s);
	} else {
		this.query = {};
	}
}
var Url = $Url;

Url.prototype.scheme/*:String*/ = null;
Url.prototype.user/*:String*/ = null;
Url.prototype.pass/*:String*/ = null;
Url.prototype.host/*:String*/ = null;
Url.prototype.port/*:int*/ = null;
Url.prototype.path/*:String*/ = null;
Url.prototype.query/*:Object(String*)*/ = null;
Url.prototype.fragment/*:String*/ = null;


/** Splits an URL into its components. The URL must be in this format:

http://[user[:pass]@]{[[…]www.]example.com|123.45.67.89}[:80][/dir/path/][?query][#fragment]

s:String
	URL to parse.
return:Url
	this.
*/
function $Url$fromString(s) {
	Function.checkArgs($Url$fromString, arguments, String);
	this.scheme = null;
	this.user = null;
	this.pass = null;
	this.host = null;
	this.port = null;
	this.path = null;
	this.query = {};
	this.fragment = null;

	// IE5.5 bug, IE6 bug, IE7 bug, IE8 bug: it is indeed possible to parse everything with a single
	// RegExp, but since IE won’t set to undefined those subpatterns contained in non-matched
	// subpatterns, it’d be impossible to tell whether a component was specified at all; e.g. with
	// /(\?(.*))?/ an URL without “?…” will still return "" as the query, while every other browser
	// will return undefined for that.

	var sScheme, sUser, sPass, sHost, iPort, sPath, mapQuery = {}, sFragment;
	// Scheme.
	var arrMatch = s.match(/^([a-z]+):\/\//);
	if (arrMatch) {
		sScheme = arrMatch[1];
		s = s.substr(arrMatch[0].length);
		// Fragment.
		var ich = s.indexOf("#");
		if (ich != -1) {
			sFragment = s.substr(ich + 1);
			s = s.substr(0, ich);
		} else {
			sFragment = null;
		}
		// Query.
		ich = s.indexOf("?");
		if (ich != -1) {
			if (ich + 1 < s.length) {
				arrMatch = s.substr(ich + 1).split("&");
			} else {
				arrMatch = null;
			}
			s = s.substr(0, ich);
			if (arrMatch) {
				for (var i = 0, c = arrMatch.length; i < c; ++i) {
					var sQA = arrMatch[i];
					ich = sQA.indexOf("=");
					if (ich != -1) {
						mapQuery[sQA.substr(0, ich)] = sQA.substr(ich + 1);
					} else {
						mapQuery[sQA] = null;
					}
				}
			}
		}
		// User and password.
		arrMatch = s.match(/([^:@]*)(?::([^@]*))?@/);
		if (arrMatch) {
			sUser = arrMatch[1];
			sPass = arrMatch[2] || "";
			s = s.substr(arrMatch[0].length);
		} else {
			sUser = null;
			sPass = null;
		}
		// Host and port, either at the end or followed by a slash.
		arrMatch = s.match(
			/^((?:[0-9a-z](?:[0-9a-z_\-]*[0-9a-z])?\.)*(?:[0-9a-z](?:[0-9a-z_\-]*[0-9a-z])?)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?(?=\/|$)/
		);
		if (arrMatch) {
			sHost = arrMatch[1];
			iPort = (arrMatch[2] ? parseInt(arrMatch[2]) : null);
			// Everything else is the path.
			sPath = s.substr(arrMatch[0].length);

			this.scheme = sScheme;
			this.user = sUser;
			this.pass = sPass;
			this.host = sHost;
			this.port = iPort;
			this.path = sPath;
			this.query = mapQuery;
			this.fragment = sFragment;
		}
	}
	return this;
}
Url.prototype.fromString = $Url$fromString;


/** Encodes a string, making it a legal URL.

s:String
	String to be encoded.
return:String
	Resulting URL.
*/
function $Url$encode(s) {
	Function.checkArgs($Url$encode, arguments, String);
	return encodeURI(s);
}
Url.encode = $Url$encode;


/** Encodes a string, making it a legal URL query component.

s:String
	String to be encoded.
return:String
	Resulting URL.
*/
function $Url$encodeComponent(s) {
	Function.checkArgs($Url$encodeComponent, arguments, String);
	return encodeURIComponent(s);
}
Url.encodeComponent = $Url$encodeComponent;


/** Encodes a map of query arguments into their string form.

mapArgs:Object(String*)
	Query arguments.
return:String
	Query string.
*/
function $Url$encodeQuery(mapArgs) {
	Function.checkArgs($Url$encodeQuery, arguments, Object);
	var s = "";
	for (var sName in mapArgs) {
		s += encodeURIComponent(sName) + "=" + encodeURIComponent(mapArgs[sName]) + "&";
	}
	return s.substr(0, s.length - 1);
}
Url.encodeQuery = $Url$encodeQuery;


/** Strips from a string any characters which could be ambiguous were it to be used as the path part
of an URI.

s:String
	String to be cleaned.
return:String
	String only consisting of valid URI characters.
*/
function $Url$sanitizePath(s) {
	Function.checkArgs($Url$sanitizePath, arguments, String);
	return s.replace(/[ "#%&<>?_]+/g, "_");
}
Url.sanitizePath = $Url$sanitizePath;


/** Returns the last path component in a full file path; inspired by the SUS basename(1) command. It
does NOT process full URLs.

s:String
	Full path to be stripped.
return:String
	Last path component in the source string (i.e. the file name).
*/
function $Url$stripPath(s) {
	Function.checkArgs($Url$stripPath, arguments, String);
	return s.replace(/^(?:.*\/)?([^\/]+)\/?$/, "$1");
}
Url.stripPath = $Url$stripPath;


/** See Object.toString().

Note: this is not exactly the inverse of Url.fromString(), since it won’t generate empty query
strings (“…?”) or empty fragments (“…#”).
*/
function $Url$toString() {
	Function.checkArgs($Url$toString, arguments);
	var s = this.scheme + "://";
	if (this.user != null) {
		s += this.user;
		if (this.pass) {
			s += ":" + this.pass;
		}
		s += "@";
	}
	s += this.host;
	if (this.port) {
		s += ":" + this.port;
	}
	s += this.path;
	var sQuery = Url.encodeQuery(this.query);
	if (sQuery) {
		s += "?" + sQuery;
	}
	if (this.fragment) {
		s += "#" + this.fragment;
	}
	return s;
}
Url.prototype.toString = $Url$toString;

