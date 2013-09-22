/* -*- coding: utf-8; mode: javascript; tab-width: 3 -*-

Copyright 2010, 2011, 2012, 2013
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

/** Implementation of Ql.SelectorEval. */



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.SelectorEval

/** Provides evaluation of selector-like expressions, in a subset of the Selectors1 specification;
see [DESIGN_1136 JS: Ql.SelectorEval.evaluate()] for the allowed selectors. Will take advantage of
Selectors1.NodeSelector.querySelectAll() or HTML5.HTMLDocument.getElementsByClassName() and
HTML5.HTMLElement.getElementsByClassName() if available; see also [DESIGN_1139 JS: Ql.SelectorEval
optimizations]

The rules employed are largely based on <http://www.w3.org/TR/css3-selectors/#w3cselgrammar>, with
some adjustments made to use RegExp’s in place of Flex+Yacc.
*/
function $Ql$SelectorEval() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$SelectorEval, arguments);
}
Ql.SelectorEval = $Ql$SelectorEval;


/** Buffer containing the unprocessed part of the selector. */
Ql.SelectorEval.prototype._m_sBuf/*:String*/ = null;

Ql.SelectorEval.ATTRIB_MATCH_OP/*:RegExp*/ = /^[$*~|^]?=/;
Ql.SelectorEval.HASH/*:RegExp*/ = /^#([^\x00-\x2c\x2e\x2f\x3a-\x40\x5b-\x5e\x60\x7b-\x7f]+)/;
Ql.SelectorEval.NOT/*:RegExp*/ = /^:not\(/;
Ql.SelectorEval.NS_SEP_NEGASSERT/*:RegExp*/ = /^\|(?!=)/;
Ql.SelectorEval.NTH_ARG/*:RegExp*/ =
	/^odd|even|([-+]?)(\d+(?![Nn])|(\d*)[Nn](?:[\t\n\f\r ]*([-+])[\t\n\f\r ]*(\d+))?)/;
/** Rule: ident
	: "-"? nmstart nmchar*
*/
Ql.SelectorEval.IDENT/*:RegExp*/ =
	/^-?[^\x00-\x40\x5b-\x5e\x60\x7b-\x7f][^\x00-\x2c\x2e\x2f\x3a-\x40\x5b-\x5e\x60\x7b-\x7f]*/;
/** Rule: string
	: """ [^\n\f\r"]* """
	| "'" [^\n\f\r']* "'"
*/
Ql.SelectorEval.STRING1/*:RegExp*/ = /^'([^\n\f\r']*)'/;
Ql.SelectorEval.STRING2/*:RegExp*/ = /^"([^\n\f\r"]*)"/;


/** DESIGN_1136 JS: Ql.SelectorEval.evaluate()

The Ql.DOM.Dokelement.select() method accepts a selector expression constructed according to the
Selectors 1 API. The allowed selectors are (see <http://www.w3.org/TR/css3-selectors/>):

┌───────────────────────┬──────────────────────────────────────────────────────────────────────────┐
│ Selector					│ Description																					│
├───────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ *							│ any element																					│
│ E							│ element of type E																			│
│ E[foo]						│ E with a “foo” attribute																	│
│ E[foo="bar"]				│ E whose “foo” attribute value is exactly equal to “bar”						│
│ E[foo~="bar"]			│ E whose “foo” attribute value is a list of whitespace-separated values,	│
│								│ one of which is exactly equal to “bar”												│
│ E[foo^="bar"]			│ E whose “foo” attribute value begins exactly with the string “bar”			│
│ E[foo$="bar"]			│ E whose “foo” attribute value ends exactly with the string “bar”			│
│ E[foo*="bar"]			│ E whose “foo” attribute value contains the substring “bar”					│
│ E[foo|="en"]				│ E whose “foo” attribute has a hyphen-separated list of values beginning	│
│								│ (from the left) with “en”																│
│ E:root						│ E, root of the document																	│
│ E:nth-child(n)			│ E, the n-th child of its parent														│
│ E:nth-last-child(n)	│ E, n-th child, counting from the last one											│
│ E:nth-of-type(n)		│ E, the n-th sibling of its type														│
│ E:nth-last-of-type(n)	│ E, n-th sibling, counting from the last one										│
│ E:first-child			│ E, first child of its parent															│
│ E:last-child				│ E, last child																				│
│ E:first-of-type			│ E, first sibling of its type															│
│ E:last-of-type			│ E, last sibling																				│
│ E:only-child				│ E, only child of its parent																│
│ E:only-of-type			│ E, only sibling of its type																│
│ E:empty					│ E that has no children (including text nodes)										│
│ E:target					│ E being the target of the referring URI												│
│ E:lang(fr)				│ E in language “fr”																			│
│ E:enabled					│ E that is enabled																			│
│ E:disabled				│ E that is disabled																			│
│ E:checked					│ E that is checked (e.g. a checkbox)													│
│ E.warning					│ E whose class is “warning”																│
│ E#myid						│ E with ID equal to “myid”																│
│ E:not(s)					│ E that does not match simple selector s												│
│ E F							│ F descendant of E																			│
│ E > F						│ F child of E																					│
│ E + F						│ F immediately preceded by E																│
│ E ~ F						│ F preceded by E																				│
└───────────────────────┴──────────────────────────────────────────────────────────────────────────┘

TODO: currently, namespaces are parsed, but do not take part in node matching. Make them matter.
*/

/** Evaluates a selector-like expression.

ndRoot:Ql.DOM.Dokelement
	Starting (root) node.
sSel:String
	Selector to be evaulated.
return:Array(Ql.DOM.Element*)
	Array of matching elements.
*/
function $Ql$SelectorEval$evaluate(ndRoot, sSel) {
	Function.checkArgs($Ql$SelectorEval$evaluate, arguments, Ql.DOM.Dokelement, String);
	var nlSel, arr;
	if (ndRoot._.querySelectorAll) {
		// Try the fastest way.
		try {
			nlSel = ndRoot._.querySelectorAll(sSel);
		} catch (x) {
		}
	}
	if (nlSel) {
		arr = [];
		for (var i = 0, c = nlSel.length; i < c; ++i) {
			arr.push(Ql.DOM.wrap(nlSel[i]));
		}
	} else {
		this._m_sBuf = sSel;
		// Trim whitespace, as per <http://www.w3.org/TR/selectors-api/#processing-selectors>.
		this._acceptRule_s();
		// Apply the topmost grammar rule.
		arr = this._requireRule_selectors_group(ndRoot);
		this._acceptRule_s();
		if (this._m_sBuf) {
			// Must have used up the whole selector.
			throw new SyntaxError("Garbage at the end of the selector");
		}
		this._m_sBuf = null;
	}
	return arr;
}
Ql.SelectorEval.prototype.evaluate = $Ql$SelectorEval$evaluate;


/** DESIGN_1138 JS: Ql.SelectorEval.evaluateUp()

The Ql.SelectorEval.evaluateUp() method (implementation of Ql.DOM.Node.selectAncestor()) applies a
selector expression against the ancestors of a node, returning the first full match; this makes it a
reverse-direction counterpart to [DESIGN_1136 JS: Ql.SelectorEval.evaluate()].

Due to the limited scope and use-cases, the accepted syntax is very limited:

┌───────────┬────────────────────────────┐
│ Selector	│ Description					  │
├───────────┼────────────────────────────┤
│ *			│ any element					  │
│ E			│ element of type E			  │
│ E.warning	│ E whose class is “warning” │
└───────────┴────────────────────────────┘
*/

/** Evaluates a selector-like expression, applying it to the parents of the specified node, instead
of its children. See [DESIGN_1138 JS: Ql.SelectorEval.evaluateUp()] for the supported syntax.

TODO: namespace support!

ndSubj:Ql.DOM.Node
	Starting (child) node.
sSel:String
	Selector to be evaulated.
return:Array(Ql.DOM.Element)
	First matching parent element, or null if none were found.
*/
function $Ql$SelectorEval$evaluateUp(ndSubj, sSel) {
	Function.checkArgs($Ql$SelectorEval$evaluateUp, arguments, Ql.DOM.Node, String);
	this._m_sBuf = sSel;
	// Trim whitespace, as per <http://www.w3.org/TR/selectors-api/#processing-selectors>.
	this._acceptRule_s();
	var sName = this._acceptChar("*") || this._acceptRegExp(Ql.SelectorEval.IDENT);
	if (sName == "*") {
		sName = null;
	}
	var sCssClass = (this._acceptChar(".") && this._acceptRegExp(Ql.SelectorEval.IDENT) || null);
	this._acceptRule_s();
	if (this._m_sBuf) {
		// Must have used up the whole selector.
		throw new SyntaxError("Garbage at the end of the selector");
	}
	this._m_sBuf = null;
	// Scan the parents of the provided node.
	for (
		var nd = ndSubj._;
		(nd = Ql.DOM._getParentNode(nd)) && Ql.DOM._getNodeType(nd) == Node.ELEMENT_NODE;
	) {
		if (!sName || Ql.DOM._getNodeName(nd) == sName) {
			if (!sCssClass || Ql.DOM._isCssClass(nd, sCssClass)) {
				return Ql.DOM.wrap(nd);
			}
		}
	}
	return null;
}
Ql.SelectorEval.prototype.evaluateUp = $Ql$SelectorEval$evaluateUp;


/** See Object.toString().
*/
function $Ql$SelectorEval$toString() {
	Function.checkArgs($Ql$SelectorEval$toString, arguments);
	return "[object Ql.SelectorEval" + (this._m_sBuf ? " parsing \"" + this._m_sBuf + "\"]" : "]");
}
Ql.SelectorEval.prototype.toString = $Ql$SelectorEval$toString;


/** DESIGN_1139 JS: Ql.SelectorEval optimizations

Even though at <http://www.w3.org/TR/css3-selectors/#universal-selector> it’s stated that the lack
of a type_selector token (an element name specifier) should be treated as a type_selector of value
“*”, this proves inefficient in cases like “#id” which would be interpreted as “*#id” and then
executed as getElementsByTagName("*") subsequently filtered by id attribute, rather than the much
more efficient use of getElementById().

To be able to use every built-in query function (getElementsByClassName(), getElementsByTagName()
and getElementById()), each simple_selector_sequence token is broken down so that the first filter
is actually created as an enumerator function, while every subsequent filter will be a boolean
function that will be applied on every Element fetched by the enumerator.

This way, the enumerator can be optimized to use one of the built-int methods, with a generic
enumerator function enumByCombinator() performing a slow one-by-one enumeration for cases where a
built-in function is not available - most notably, any simple_selector_sequence preceded by any
combinator but “ ”.

In this comprehensive list of (rule) selector examples, you can see that the slow one-by-one
enumerator is actually used in uncommon scenarios, the common ones being selection by id or CSS
class, using space (descendant-of) as combinator. In the right column, commas (,) indicate the
switch to a different simple_selector_sequence, while ampersands (&) indicate the application of a
filter on the results of the closest enumeration to its left.

┌─────────────────┬───────────────────────────────────────────────────────┐
│ Selector			│ Execution															  │
├─────────────────┼───────────────────────────────────────────────────────┤
│ [a]					│ enum(fltByAttr)													  │
│ .c					│ getByCN															  │
│ .c.c				│ getByCN & fltByCN												  │
│ .c > .c ~ e		│ getByCN , enum(fltByCN) , enum(fltByTN)					  │
│ .c e:not(.c) e	│ getByCN , getByTN & fltByNot(fltByCN) , getByTN		  │
│ e					│ getByTN															  │
│ e > * > *			│ getByTN , enum(fltByTN) , enum(fltByTN)					  │
│ e > #id			│ getByTN , enum(fltById)										  │
│ e #id				│ getByTN , getById												  │
│ e[a] + e			│ getByTN & fltByAttr , enum(fltByTN)						  │
│ e > .c				│ getByTN , enum(fltByCN)										  │
│ e .c				│ getByTN , getByCN												  │
│ e.c > e + e		│ getByTN & fltByCN , enum(fltByTN) , enum(fltByTN)	  │
│ e ~ e				│ getByTN , enum(fltByTN)										  │
│ e e[a]				│ getByTN , getByTN & fltByAttr								  │
│ e:ps				│ getByTN & fltByPseudo											  │
│ e#id + e			│ getByTN & fltById , enum(fltByTN)							  │
│ e#id[a] > e.c	│ getByTN & fltById & fltByAttr , enum(fByTN) & fltByCN │
│ e:not(e)			│ getByTN & fltByNot(fltByTN)									  │
│ #id					│ getById															  │
│ #id [a]			│ getById , enum(fltByAttr)									  │
│ #id e[a] e:ps	│ getById , getByTN & fltByAttr , getByTN & fltByPseudo │
│ #id e:not([a])	│ getById , getByTN & fltByNot(fltByAttr)					  │
│ #id e#id > [a]	│ getById , getByTN & fltById , enum(fltByAttr)			  │
│ #id #id  > *[a]	│ getById , fltById , enum(fltByTN) , fltByAttr			  │
│ #id > :not(.c)	│ getById , enum(fltByNot(fltByCN))							  │
└─────────────────┴───────────────────────────────────────────────────────┘

TODO: also use DOM3-XPath if available (FX1.5, FX2, maybe others).
*/


/** Generic enumerator, used as a fallback when no built-in enumerator (e.g. getElementsBy*) is
available.

sCombinator:String
	Combinator.
ndBase:Ql.DOM.Dokelement
	Element to be used as root for the query.
fnFirstFilter:Function
	First filter to be applied. This additional argument makes it unnecessary to modify the following
	one, simplifying the call.
arrFilters:Array(Function*)
	Battery of filters to be applied to each enumerated item.
return:Array(Element*)
	Enumerated elements that match all of the specified filters.
*/
function $Ql$SelectorEval$_enumByCombinator(sCombinator, ndBase, fnFirstFilter, arrFilters) {
	var arr;
	if (sCombinator == " ") {
		var nlUnfiltered = ndBase._getElementsByTagName("*");
		arr = [];
		for (var i = 0, c = nlUnfiltered.length; i < c; ++i) {
			var elt = nlUnfiltered[i];
			// IE5.5 bug, IE6 bug, IE7 bug, IE8 bug: getElementsByTagName("*") doesn’t only return
			// Elements.
			if (
				Ql.DOM._getNodeType(elt) == Node.ELEMENT_NODE &&
				fnFirstFilter(elt) && this._applyFilters(elt, arrFilters)
			) {
				arr.push(elt);
			}
		}
	} else {
		// Grab (the first, for “+”) matching sibling(s) (or children, for “>”).
		var bAdjacentOnly = (sCombinator == "+"),
			 sFirstProp = (sCombinator == ">" ? "firstChild" : "nextSibling");
		arr = [];
		for (var nd = ndBase._[sFirstProp]; nd; nd = nd.nextSibling) {
			if (Ql.DOM._getNodeType(nd) == Node.ELEMENT_NODE) {
				if (fnFirstFilter(nd) && this._applyFilters(nd, arrFilters)) {
					arr.push(nd);
				}
				if (bAdjacentOnly) {
					// “+” stops at the first ELEMENT_NODE, matching or not.
					break;
				}
			}
		}
	}
	return arr;
}
Ql.SelectorEval.prototype._enumByCombinator = $Ql$SelectorEval$_enumByCombinator;


/** Creates a version of Ql.SelectorEval._enumByCombinator() with a bound first filter.

fnFirstFilter:Function
	First filter to be applied; will be passed as the eponymous argument to _enumByCombinator().
return:Function
	Bound version of _enumByCombinator().
*/
function $Ql$SelectorEval$_createEnumeratorByCombinator(fnFirstFilter) {
	return function(sCombinator, ndBase, arrFilters) {
		return this._enumByCombinator(sCombinator, ndBase, fnFirstFilter, arrFilters);
	};
}
Ql.SelectorEval.prototype._createEnumeratorByCombinator =
	$Ql$SelectorEval$_createEnumeratorByCombinator;


/** Applies the filters to the specified Element.

elt:Element
	Element to be tested.
arrFilters:Array(Function*)
	Battery of filters to be used as tests.
return:bool
	true if the specified element passed every test, false otherwise.
*/
function $Ql$SelectorEval$_applyFilters(elt, arrFilters) {
	for (var i = 0; i < arrFilters.length; ++i) {
		if (!arrFilters[i](elt)) {
			return false;
		}
	}
	return true;
}
Ql.SelectorEval.prototype._applyFilters = $Ql$SelectorEval$_applyFilters;


/** Rule: selectors_group
	: selector [ s* "," s* selector ]*

ndBase:Ql.DOM.Dokelement
	Element to be used as base for the query.
return:Array(Ql.DOM.Element*)
	Selection of unique matching elements.
*/
function $Ql$SelectorEval$_requireRule_selectors_group(ndBase) {
	var arrSel = this._requireRule_selector(ndBase);
	this._acceptRule_s();
	while (this._acceptChar(",")) {
		this._acceptRule_s();
		var arrOtherSel = this._requireRule_selector(ndBase);
		// There must be no duplicates in the returned array, so add the items conditionally, one by
		// one.
		for (var i = 0, c = arrOtherSel.length; i < c; ++i) {
			if (arrSel.indexOf(arrOtherSel[i]) == -1) {
				arrSel.push(arrOtherSel[i]);
			}
		}
	}
	return arrSel;
}
Ql.SelectorEval.prototype._requireRule_selectors_group =
	$Ql$SelectorEval$_requireRule_selectors_group;


/** Rule: selector
	: simple_selector_sequence [ combinator simple_selector_sequence ]*

ndBase:Ql.DOM.Dokelement
	Element to be used as base for the query.
return:Array(Ql.DOM.Element*)
	Selection of unique matching elements.
*/
function $Ql$SelectorEval$_requireRule_selector(ndBase) {
	// The initial selector sequence is applied to the Node on which the select() method was called.
	var arr = this._requireRule_simple_selector_sequence(" ", [ndBase]);
	for (var sCombinator; sCombinator = this._acceptRule_combinator(); ) {
		// Reduce the result set using the combinator, into a new set.
		arr = this._requireRule_simple_selector_sequence(sCombinator, arr);
	}
	return arr;
}
Ql.SelectorEval.prototype._requireRule_selector = $Ql$SelectorEval$_requireRule_selector;


/** Rule: combinator
	: s* [ "+" | ">" | "~" ] s*
	| s+

return:String
	Combinator character; a matched whitespace combinator character is returned as a single space
	character.
*/
function $Ql$SelectorEval$_acceptRule_combinator() {
	var bWs = this._acceptRule_s();
	if (this._m_sBuf) {
		var sCombinator = this._m_sBuf.charAt(0);
		if ("+>~".indexOf(sCombinator) != -1) {
			this._m_sBuf = this._m_sBuf.substr(1);
			this._acceptRule_s();
			return sCombinator;
		}
	}
	if (bWs) {
		return " ";
	}
	return null;
}
Ql.SelectorEval.prototype._acceptRule_combinator = $Ql$SelectorEval$_acceptRule_combinator;


/** Rule: simple_selector_sequence
	: type_selector [ hash | class | attrib | negation | pseudo ]*
	| [ hash | class | attrib | negation | pseudo ]+

sCombinator:String
	Combinator preceding this simple selector sequence.
arrPrevSel:Array(Ql.DOM.Element*)
	Elements generated from a previous call to this function.
return:Array(Ql.DOM.Element*)
	New selection of unique matching elements.
*/
function $Ql$SelectorEval$_requireRule_simple_selector_sequence(sCombinator, arrPrevSel) {
	// The first component of the sequence will be retrieved as a filtered enumator.
	var fnEnumerator = this._acceptRule_type_selector(true);
	if (!fnEnumerator) {
		fnEnumerator = this._acceptRule_hash(true) || this._acceptRule_class(true) ||
							this._acceptRule_attrib(true) ||
							this._acceptRule_negation(true) || this._acceptRule_pseudo(true);
		if (!fnEnumerator) {
			throw new SyntaxError(
				"Expected “type_selector” or “hash” or “class” or “attrib” or “negation” or “pseudo”"
			);
		}
	}
	// Any following component will be retrieved as a simple filter.
	var arrFilters = [], fnFilter;
	while (fnFilter = (
		this._acceptRule_hash() || this._acceptRule_class() || this._acceptRule_attrib() ||
		this._acceptRule_negation() || this._acceptRule_pseudo()
	)) {
		arrFilters.push(fnFilter);
	}

	// Create a new selection, starting from the items in arrPrevSel, using the enumerator on each of
	// them, and relying on it to apply the filters.
	var arrSel = [];
	for (var iPrevSel = 0, cPrevSel = arrPrevSel.length; iPrevSel < cPrevSel; ++iPrevSel) {
		var arrMoreSel = fnEnumerator.call(this, sCombinator, arrPrevSel[iPrevSel], arrFilters);
		// Merge the sub-selection, avoiding duplicates, and wrapping the elements at the same time.
		for (var i = 0, c = arrMoreSel.length; i < c; ++i) {
			var elt = Ql.DOM.wrap(arrMoreSel[i]);
			if (arrSel.indexOf(elt) == -1) {
				arrSel.push(elt);
			}
		}
	}
	return arrSel;
}
Ql.SelectorEval.prototype._requireRule_simple_selector_sequence =
	$Ql$SelectorEval$_requireRule_simple_selector_sequence;


/** Rule: type_selector + universal + namespace_prefix (combined)
	: [ [ ident | "*" ]? "|" ]? [ ident | "*" ]

[bReturnEnumerator:bool]
	If specified and true, a filtering enumerator will be returned; a simple filter will be returned
	instead.
return:Function
	Enumerator or filter that returns the matched type selector.
*/
function $Ql$SelectorEval$_acceptRule_type_selector(bReturnEnumerator /*= false*/) {
	var sNamespace, sType = this._acceptChar("*") || this._acceptRegExp(Ql.SelectorEval.IDENT);
	if (this._acceptChar("|")) {
		// The first ident or "*" (if matched) was actually the namespace.
		sNamespace = sType || "";
		sType = this._acceptChar("*") || this._acceptRegExp(Ql.SelectorEval.IDENT);
		if (!sType) {
			throw new SyntaxError("Expected “ident” or “*”");
		}
	} else {
		if (!sType) {
			return null;
		}
		sNamespace = null;
	}

	var fnFilter = function(elt) {
		// TODO: respect sNamespace.
		return Ql.DOM._getNodeName(elt) == sType;
	};
	if (!bReturnEnumerator) {
		return fnFilter;
	}
	return function(sCombinator, ndBase, arrFilters) {
		var arr;
		if (sCombinator == " ") {
			var nlUnfiltered = ndBase._getElementsByTagName(sType);
			arr = [];
			for (var i = 0, c = nlUnfiltered.length; i < c; ++i) {
				if (this._applyFilters(nlUnfiltered[i], arrFilters)) {
					arr.push(nlUnfiltered[i]);
				}
			}
		} else {
			arr = this._enumByCombinator(sCombinator, ndBase, fnFilter, arrFilters);
		}
		return arr;
	};
}
Ql.SelectorEval.prototype._acceptRule_type_selector = $Ql$SelectorEval$_acceptRule_type_selector;


/** Rule: hash
	: "#" nmchar+

[bReturnEnumerator:bool]
	If specified and true, a filtering enumerator will be returned; a simple filter will be returned
	instead.
return:Function
	Enumerator or filter that returns true if a provided Element’s id attribute equals the matched
	hash.
*/
function $Ql$SelectorEval$_acceptRule_hash(bReturnEnumerator /*= false*/) {
	var sId = this._acceptRegExp(Ql.SelectorEval.HASH, 1);
	if (!sId) {
		return null;
	}

	var fnFilter = function(elt) {
		// TODO: what namespace? Will need Ql.DOM._getAttributeNS().
		return elt.getAttribute("id") == sId;
	};
	return !bReturnEnumerator ? fnFilter : function(sCombinator, ndBase, arrFilters) {
		var arr;
		if (sCombinator == " ") {
			var doc;
			if (ndBase instanceof Ql.DOM.Document) {
				doc = ndBase;
			} else {
				doc = ndBase.getOwnerDocument();
			}
			ndBase = ndBase._;
			// TODO: what namespace?
			var eltIdProper = doc._.getElementById(sId);
			// If the node properly identified by sId is a descendant of ndBase, add it to the
			// selection (unless filtered away); otherwise, return an empty selection.
			arr = [];
			if (eltIdProper) {
				for (var nd = eltIdProper.parentNode; nd; nd = Ql.DOM._getParentNode(nd)) {
					if (Ql.DOM._isSameNode(ndBase, nd)) {
						if (this._applyFilters(eltIdProper, arrFilters)) {
							arr.push(eltIdProper);
						}
						break;
					}
				}
			}
		} else {
			arr = this._enumByCombinator(sCombinator, ndBase, fnFilter, arrFilters);
		}
		return arr;
	};
}
Ql.SelectorEval.prototype._acceptRule_hash = $Ql$SelectorEval$_acceptRule_hash;


/** Rule: class
	: "." ident

[bReturnEnumerator:bool]
	If specified and true, a filtering enumerator will be returned; a simple filter will be returned
	instead.
return:Function
	Enumerator or filter that returns true if a provided Element is of the matched CSS class.
*/
function $Ql$SelectorEval$_acceptRule_class(bReturnEnumerator /*= false*/) {
	// Once a dot is found, the class name becomes required.
	if (!this._acceptChar(".")) {
		return null;
	}
	var sCssClass = this._acceptRegExp(Ql.SelectorEval.IDENT);
	if (!sCssClass) {
		throw new SyntaxError("Expected “ident”");
	}

	var fnFilter = function(elt) {
		return Ql.DOM._isCssClass(elt, sCssClass);
	};
	return !bReturnEnumerator ? fnFilter : function(sCombinator, ndBase, arrFilters) {
		var arr;
		if (sCombinator == " " && "getElementsByClassName" in ndBase._) {
			var nlUnfiltered = ndBase._.getElementsByClassName(sCssClass);
			arr = [];
			for (var i = 0, c = nlUnfiltered.length; i < c; ++i) {
				if (this._applyFilters(nlUnfiltered[i], arrFilters)) {
					arr.push(nlUnfiltered[i]);
				}
			}
		} else {
			arr = this._enumByCombinator(sCombinator, ndBase, fnFilter, arrFilters);
		}
		return arr;
	};
}
Ql.SelectorEval.prototype._acceptRule_class = $Ql$SelectorEval$_acceptRule_class;


/** Rule: attrib
	: "[" s* [ [ ident | "*" ]? "|" ]? ident s* [
			[ "=" | "^=" | "$=" | "*=" | "~=" | "|=" ] s*
			[ ident | string ] s*
		]? "]"

[bReturnEnumerator:bool]
	If specified and true, a filtering enumerator will be returned; a simple filter will be returned
	instead.
return:Function
	Enumerator or filter that returns true if a provided Element’s attribute compares positively with
	the matched value, according to the matched operator.
*/
function $Ql$SelectorEval$_acceptRule_attrib(bReturnEnumerator /*= false*/) {
	if (!this._acceptChar("[")) {
		return null;
	}

	this._acceptRule_s();
	var sNamespace, sAttrName = this._acceptRegExp(Ql.SelectorEval.IDENT);
	if (sAttrName === null && this._acceptChar("*")) {
		sNamespace = "*";
	}
	// Match “|”, but avoid matching “|=”; they can both occur after an initial ident token.
	if (this._acceptRegExp(Ql.SelectorEval.NS_SEP_NEGASSERT)) {
		// The first ident was actually the namespace.
		if (sNamespace != "*") {
			sNamespace = sAttrName || "";
		}
		sAttrName = this._acceptRegExp(Ql.SelectorEval.IDENT);
	} else {
		sNamespace = null;
	}
	if (sAttrName === null) {
		throw new SyntaxError("Expected “ident”");
	}
	this._acceptRule_s();

	var fnFilter, sOperator = this._acceptRegExp(Ql.SelectorEval.ATTRIB_MATCH_OP);
	// TODO: respect sNamespace.
	if (sOperator) {
		this._acceptRule_s();
		var sValue = this._acceptRegExp(Ql.SelectorEval.IDENT) ||
						 this._acceptRegExp(Ql.SelectorEval.STRING2, 1) ||
						 this._acceptRegExp(Ql.SelectorEval.STRING1, 1);
		if (sValue === null) {
			throw new SyntaxError("Expected “ident” or “string”");
		}
		this._acceptRule_s();
		switch (sOperator) {
			case "=":
				fnFilter = function(elt) {
					return Ql.DOM._getAttribute(elt, sAttrName) == sValue;
				};
				break;
			case "~=":
				var reValue = new RegExp(
					"(?:^|[\t\n\f\r ])" + RegExp.escape(sValue) + "(?:[\t\n\f\r ]|$)"
				);
				fnFilter = function(elt) {
					return reValue.test(Ql.DOM._getAttribute(elt, sAttrName));
				};
				break;
			case "|=":
				fnFilter = function(elt) {
					return sValue.languageTagCompare(Ql.DOM._getAttribute(elt, sAttrName)) > 0;
				};
				break;
			case "^=":
				fnFilter = function(elt) {
					return Ql.DOM._getAttribute(elt, sAttrName).substr(0, sValue.length) == sValue;
				};
				break;
			case "$=":
				fnFilter = function(elt) {
					return Ql.DOM._getAttribute(elt, sAttrName).substr(-sValue.length) == sValue;
				};
				break;
			case "*=":
				fnFilter = function(elt) {
					return Ql.DOM._getAttribute(elt, sAttrName).indexOf(sValue) != -1;
				};
				break;
		}
	} else {
		fnFilter = function(elt) {
			return Ql.DOM._hasAttribute(elt, sAttrName);
		};
	}

	this._requireChar("]");
	return !bReturnEnumerator ? fnFilter : this._createEnumeratorByCombinator(fnFilter);
}
Ql.SelectorEval.prototype._acceptRule_attrib = $Ql$SelectorEval$_acceptRule_attrib;


/** Rule: negation
	: ":" "not" "(" s* negation_arg s* ")"

Rule: negation_arg
	: type_selector | hash | class | attrib | pseudo

[bReturnEnumerator:bool]
	If specified and true, a filtering enumerator will be returned; a simple filter will be returned
	instead.
return:Function
	Enumerator or filter that returns false if a provided Element satisfies the matched parenthesized
	condition.
*/
function $Ql$SelectorEval$_acceptRule_negation(bReturnEnumerator /*= false*/) {
	if (!this._acceptRegExp(Ql.SelectorEval.NOT)) {
		return null;
	}

	this._acceptRule_s();
	var fnFilter = this._acceptRule_type_selector() || this._acceptRule_hash() ||
						this._acceptRule_class() || this._acceptRule_attrib() ||
						this._acceptRule_pseudo();
	if (!fnFilter) {
		throw new SyntaxError(
			"Expected “type_selector” or “hash” or “class” or “attrib” or “pseudo”"
		);
	}
	this._acceptRule_s();
	this._requireChar(")");

	// Return a negated matching function.
	var fnNegFilter = function(elt) {
		return !fnFilter(elt);
	};
	return !bReturnEnumerator ? fnNegFilter : this._createEnumeratorByCombinator(fnNegFilter);
}
Ql.SelectorEval.prototype._acceptRule_negation = $Ql$SelectorEval$_acceptRule_negation;


/** Rule: pseudo + functional_pseudo (combined)
	: ":" "lang" "(" s* language_tag s* ")"
	| ":" nth_function "(" s* nth_arg s* ")"
	| ":" ident

Rule: language_tag (not in W3C proposed grammar)
	: ident

Rule: nth_function (not in W3C proposed grammar)
	: "nth-child" | "nth-last-child"
	| "nth-of-type" | "nth-last-of-type"

Rule: nth_arg (originally nth, from <http://www.w3.org/TR/css3-selectors/#nth-child-pseudo>)
	: sign? number? "n" [ s* sign s* number ]?
	| sign? number
	| "odd"
	| "even"

Rule: sign (not in W3C proposed grammar)
	: "-" | "+"

Rule: number (not in W3C proposed grammar, not the same as W3C num)
	: "[0-9]+"

[bReturnEnumerator:bool]
	If specified and true, a filtering enumerator will be returned; a simple filter will be returned
	instead.
return:Function
	Enumerator or filter that returns true if a provided Element corresponds to the matched pseudo-
	element.
*/
function $Ql$SelectorEval$_acceptRule_pseudo(bReturnEnumerator /*= false*/) {
	if (!this._acceptChar(":")) {
		return null;
	}
	var sPseudo = this._acceptRegExp(Ql.SelectorEval.IDENT);
	if (!sPseudo) {
		throw new SyntaxError("Expected “ident”");
	}

	var fnEnumerator, fnFilter, arrMatch;
	// Branch according to the pseudo identifier.
	sPseudo = sPseudo.toLowerCase();
	if (sPseudo == "lang" && this._requireChar("(")) {
		this._acceptRule_s();
		var sLang = this._acceptRegExp(Ql.SelectorEval.IDENT);
		if (!sLang) {
			throw new SyntaxError("Expected “language_tag”");
		}
		this._acceptRule_s();
		this._requireChar(")");

		fnFilter = function(elt) {
			// The language tag is inherited, so the attribute must be checked for elt and all of its
			// parent elements.
			// TODO: check for anything with the semantics of a lang attribute (see
			// <http://www.w3.org/TR/css3-selectors/#lang-pseudo>).
			for (
				var ndParent = elt;
				ndParent && ndParent.nodeType == Node.ELEMENT_NODE;
				ndParent = Ql.DOM._getParentNode(ndParent)
			) {
				if (sLang.languageTagCompare(Ql.DOM._getAttribute(ndParent, "lang")) > 0) {
					return true;
				}
			}
			return false;
		};
	// Matches first-child, last-child, first-of-type, last-of-type, nth-child, nth-last-child,
	// nth-of-type, nth-last-of-type.
	} else if (arrMatch = sPseudo.match(/^(first|last|(nth)(-last)?)-(child|of-type)$/)) {
		var iAn, iB, bReverse, bOfType = (arrMatch[4] == "of-type");
		if (!arrMatch[2]) {
			iAn = 0;
			iB = 1;
			bReverse = (arrMatch[1] == "last");
		} else {
			bReverse = !!arrMatch[3];

			this._requireChar("(");
			this._acceptRule_s();
			arrMatch = this._acceptRegExp(Ql.SelectorEval.NTH_ARG, true);
			if (!arrMatch) {
				throw new SyntaxError("Expected “nth_arg”");
			}
			this._acceptRule_s();
			this._requireChar(")");

			arrMatch[0] = arrMatch[0].toLowerCase();
			if (arrMatch[0] == "odd") {
				iAn = 2;
				iB = 1;
			} else if (arrMatch[0] == "even") {
				iAn = 2;
				iB = 0;
			} else if (arrMatch[3]) {
				// “-n” == “-1n”.
				iAn = parseInt(arrMatch[1] + (arrMatch[3] || "1"));
				iB = (arrMatch[5] ? parseInt(arrMatch[4] + arrMatch[5]) : 0);
			} else {
				iAn = 0;
				iB = parseInt(arrMatch[1] + arrMatch[2]);
			}
		}

		// Enumerates the element’s parent’s children, to find out the element’s own index; once
		// found, the nth-expression is applied.
		//
		// Note: it’d be fairly easy to have alternate versions depending on the value of bReverse and
		// bOfType, but is the speed gain really worth the increase in code size and maintenance
		// complexity?
		// TODO: namespaces support.
		fnFilter = function(elt) {
			var sPropFirst = (bReverse ?  "lastChild" : "firstChild"),
				 sPropNext = (bReverse ? "previousSibling" : "nextSibling"),
				 iSibling = 1 - iB, sName;
			if (bOfType) {
				sName = elt.nodeName;
			}
			for (
				var ndSibling = Ql.DOM._getParentNode(elt)[sPropFirst];
				ndSibling;
				ndSibling = ndSibling[sPropNext]
			) {
				if (
					Ql.DOM._getNodeType(ndSibling) == Node.ELEMENT_NODE &&
					(!bOfType || ndSibling.nodeName == sName)
				) {
					if (Ql.DOM._isSameNode(elt, ndSibling)) {
						if (iAn == 0) {
							return iSibling == 0;
						} else {
							return iSibling / iAn >= 0 && iSibling % iAn == 0;
						}
					}
					++iSibling;
				}
			}
		};
	} else {
		switch (sPseudo) {
			case "checked":
				fnFilter = function(elt) {
					return elt.checked;
				};
				break;

			case "disabled":
				fnFilter = function(elt) {
					return elt.disabled;
				};
				break;

			case "empty":
				fnFilter = function(elt) {
					for (var ndChild = elt.firstChild; ndChild; ndChild = ndChild.nextSibling) {
						switch (Ql.DOM._getNodeType(ndChild)) {
							case Node.TEXT_NODE:
							case Node.CDATA_SECTION_NODE:
							case Node.ENTITY_REFERENCE_NODE:
								if (!ndChild.nodeValue) {
									break;
								}
								// Fall through…
							case Node.ELEMENT_NODE:
								return false;
						}
					}
					return true;
				};
				break;

			case "enabled":
				fnFilter = function(elt) {
					return "disabled" in elt && !elt.disabled;
				};
				break;

			case "only-child":
			case "only-of-type":
				var bOfType = (sPseudo == "only-of-type");
				// TODO: namespaces support.
				fnFilter = function(elt) {
					var sName;
					if (bOfType) {
						sName = elt.nodeName;
					}
					for (
						var ndSibling = Ql.DOM._getParentNode(elt).firstChild;
						ndSibling;
						ndSibling = ndSibling.nextSibling
					) {
						if (
							Ql.DOM._getNodeType(ndSibling) == Node.ELEMENT_NODE &&
							(!bOfType || ndSibling.nodeName == sName)
						) {
							if (!Ql.DOM._isSameNode(elt, ndSibling)) {
								return false;
							}
						}
					}
					return true;
				};
				break;

			case "root":
				fnEnumerator = function(sCombinator, ndBase, arrFilters) {
					var arr = [];
					if (sCombinator == " " && ndBase instanceof Ql.DOM.Document) {
						var elt = ndBase._.documentElement;
						if (this._applyFilters(elt, arrFilters)) {
							arr.push(elt);
						}
					}
					return arr;
				};
				fnFilter = function(elt) {
					var doc = Ql.DOM._getOwnerDocument(elt);
					return Ql.DOM._isSameNode(doc.documentElement, elt);
				};
				break;

			case "target":
				// TODO: ?
				break;

			default:
				throw new SyntaxError("Unrecognized “pseudo” identifier");
		}
	}
	if (bReturnEnumerator) {
		return fnEnumerator || this._createEnumeratorByCombinator(fnFilter);
	} else {
		return fnFilter;
	}
}
Ql.SelectorEval.prototype._acceptRule_pseudo = $Ql$SelectorEval$_acceptRule_pseudo;


/** Rule: s
	: "\t" | "\n" | "\f" | "\r" | " "

return:String
	true if any whitespace was removed, false if none were present.
*/
function $Ql$SelectorEval$_acceptRule_s() {
	var ichStart = -1, cch = this._m_sBuf.length;
	while (++ichStart < cch) {
		if ("\t\n\f\r ".indexOf(this._m_sBuf.charAt(ichStart)) === -1) {
			break;
		}
	}
	if (ichStart <= 0) {
		return false;
	}
	this._m_sBuf = this._m_sBuf.substr(ichStart, cch - ichStart);
	return true;
}
Ql.SelectorEval.prototype._acceptRule_s = $Ql$SelectorEval$_acceptRule_s;


/** Matches, and removes if successful, a single character from this._m_sBuf.

ch:String
	Character to be matched.
return:String
	The matched character.
*/
function $Ql$SelectorEval$_acceptChar(ch) {
	if (!this._m_sBuf || this._m_sBuf.charAt(0) !== ch) {
		return null;
	}
	// Consume the matched character.
	this._m_sBuf = this._m_sBuf.substr(1);
	return ch;
}
Ql.SelectorEval.prototype._acceptChar = $Ql$SelectorEval$_acceptChar;
function $Ql$SelectorEval$_requireChar(ch) {
	if (!this._m_sBuf || this._m_sBuf.charAt(0) !== ch) {
		throw new SyntaxError("Expected “" + ch + "”");
	}
	// Consume the matched character.
	this._m_sBuf = this._m_sBuf.substr(1);
	return ch;
}
Ql.SelectorEval.prototype._requireChar = $Ql$SelectorEval$_requireChar;


/** Matches, and removes if successful, a regular expression from this._m_sBuf.

re:RegExp
	Expression to be matched; it can include capturing sub-patterns, and must be anchored (^).
[vReturnPattern:var]
	Index of the capturing pattern to be returned, or true to request the whole match array to be
	returned. If omitted, the whole matched string will be returned, i.e. the match array element of
	index [0].
return:(String|Array(String+))
	Matched pattern.
*/
function $Ql$SelectorEval$_acceptRegExp(re, vReturnPattern /*= 0*/) {
	var arrMatch;
	if (!this._m_sBuf || !(arrMatch = this._m_sBuf.match(re))) {
		return null;
	}
	// Consume the matched characters.
	this._m_sBuf = this._m_sBuf.substr(arrMatch[0].length);
	return vReturnPattern === true ? arrMatch : arrMatch[vReturnPattern || 0];
}
Ql.SelectorEval.prototype._acceptRegExp = $Ql$SelectorEval$_acceptRegExp;

