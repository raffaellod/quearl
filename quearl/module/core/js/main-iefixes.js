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

/** Fixes specific to MS Internet Explorer: implementation of some necessary parts of W3C standards,
and much more. See [DESIGN_6350 JS: IE fixes]. */

/** DESIGN_6350 JS: IE fixes

Fixes for older versions of Internet Explorer are generally moved out of the main source files, to
help separate “real code” from “workaround code”.

In most cases, a specific operation which required a fix was wrapped in a Ql.DOM._*() static method,
which has an alternate IE-friendly version in main-iefixes.js; this due to augmentation (see
[MAN#0001 JS: Inheritance and augmentation]), which will copy methods from a base class into the
derived class’s prototype, causing the redefinition (fix) of the base class’s methods to be
ineffective (copied methods will stay unaffected).

Bugs and inconsistencies related to DOM event handling proved to be particularly nasty; the fixes
are well documented in the source file, with the most complicated ones featuring additional
documentation here. Generally, they are all due to one or more of these reasons:

•	IE5.5/IE6/IE7/IE8 have a vastly insufficient event handling model; see [DESIGN_6353 JS: IE fixes:
	Events];

•	IE5.5 features completely off-standard semantics for the Node.document property which, by the
	way, should be ownerDocument; see [DESIGN_6351 JS: IE fixes: IE5.5 documents];

•	IE5.5/IE6/IE7 have a very delicate memory management logic, and you can’t just use closures to
	fix everything;

•	IE5.5/IE6/IE7/IE8 have a very serious bug related to named function expressions, where the value
	of the function identifier is an entirely different object than the one returned by the
	expression, so using one and then looking for the other (e.g. add one and search for the other,
	in an Array with indexOf) invariably and unexpectedly fails.
*/


////////////////////////////////////////////////////////////////////////////////////////////////////
// Early corrections (setup)

/* Rationale: IE5.5/IE6/IE7/IE8 always add 1 to the line numbers passed to the onerror handler, but
only if the script was not external.
*/
Ql._onError = (function() {
	var fnOverridden = Ql._onError;

	return function $Ql$_onError_IE55(sError, sFileName, iLine) {
		if (sFileName == location.href) {
			--iLine;
		}
		return fnOverridden.call(this, sError, sFileName, iLine);
	};
})();
window.onerror = Ql._onError;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Additional Quearl initialization code

/* Replica of the DOM-compliant initialization code, altered to work in IE5.5/IE6/IE7/IE8.
*/
if (Browser.version < 90000) {

	(function() {

		/** Receives a load event, and de-registers itself.
		*/
		function onInit_eventListener_l_IE55() {
			window.detachEvent("on" + window.event.type, onInit_eventListener_l_IE55);
			Ql._onInit(window.event.type);
		};


		/** Receives a readystatechange event, and de-registers itself.
		*/
		function onInit_eventListener_rsc_IE55() {
			if (document.readyState == "complete") {
				window.detachEvent("on" + window.event.type, onInit_eventListener_rsc_IE55);
				Ql._onInit(window.event.type);
			}
		};


		/** Tries to invoke the doScroll() method, which is (was) documented to fail if the document
		is not completely loaded. Idea by Diego Perini, based on a remark in
		<http://msdn.microsoft.com/en-us/library/ms531426.aspx>:

			«A few methods, such as doScroll, require the primary document to be completely loaded. If
			these methods are part of an initialization function, they should be handled when the
			ondocumentready event fires.»

		This is interpreted to mean that if doScroll does not throw an exception, the document has
		been completely loaded.

		Additionally, this also checks for document.body, which has been reported to be absent from
		fully loaded documents in some cases.
		*/
		function onInit_doScroll_IE55() {
			// Don’t try to scroll if the UI has already been manipulated, i.e. after window.onload.
			if (!Ql._onInit._bEarlyInitDone) {
				if (document.body) {
					var b;
					try {
						document.body.doScroll("left");
						b = true;
					} catch (x) {
					}
					if (b) {
						Ql._onInit("doScroll");
						return;
					}
				}
				setTimeout(onInit_doScroll_IE55, Math.MIN_TIMEOUT);
			}
		};


		// IE5.5 approach.
		window.attachEvent("onreadystatechange", onInit_eventListener_rsc_IE55);
		window.attachEvent("onload", onInit_eventListener_l_IE55);
		onInit_doScroll_IE55();
	})();

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Amendments to Ql.DOM - DOM1 and DOM2-Core

/* IE5.5/IE6/IE7 have a poor implementation of DOM1, and their DOM2-Core lacks quite a lot. They
expect attribute names spelt in camelCase, making their implementation incompatible with the rest of
the browser world.
*/

/* Rationale: IE5.5/IE6/IE7/IE8 have no Node global object, which is needed pretty much everywhere
for the constants it provides. Here’s a non-implementation of DOM1.Node (mostly for nodeType) to fix
at least that.
*/
if (Browser.version < 90000) {

	window.Node = {};
	Node.toString = Function.createToStringMethod("Node");

	Node.ELEMENT_NODE                =  1;
	Node.ATTRIBUTE_NODE              =  2;
	Node.TEXT_NODE                   =  3;
	Node.CDATA_SECTION_NODE          =  4;
	Node.ENTITY_REFERENCE_NODE       =  5;
	Node.ENTITY_NODE                 =  6;
	Node.PROCESSING_INSTRUCTION_NODE =  7;
	Node.COMMENT_NODE                =  8;
	Node.DOCUMENT_NODE               =  9;
	Node.DOCUMENT_TYPE_NODE          = 10;
	Node.DOCUMENT_FRAGMENT_NODE      = 11;
	Node.NOTATION_NODE               = 12;

}


/* Rationale: IE5.5/IE6/IE7 map element attributes to object properties. This causes some properties
to have altered names, due to conflicts with JS reserved words (e.g. class changed to className),
and some more to have a camelCased style (e.g. rowspan changed to rowSpan); either way, this
requires a mapping table, and the redefinition of all attribute-related methods/getters.
*/
if (Browser.version < 80000) {

	(function() {

		/** Translation table between attribute names and the (pretty arbitrary) names IE5.5/IE6/IE7
		give them. */
		var mapJsAttrNames = {
			"accesskey":  "accessKey",
			"checked":    "defaultChecked",
			"choff":      "chOff",
			"class":      "className",
			"codebase":   "codeBase",
			"codetype":   "codeType",
			"colspan":    "colSpan",
			"datetime":   "dateTime",
			"enctype":    "encoding",
			"for":        "htmlFor",
			"http-equiv": "httpEquiv",
			"ismap":      "isMap",
			"longdesc":   "longDesc",
			"readonly":   "readOnly",
			"rowspan":    "rowSpan",
			"tabindex":   "tabIndex",
			"usemap":     "useMap",
			"selected":   "defaultSelected",
			"value":      "defaultValue"
		};


		function $Ql$DOM$_getAttribute_IE55(elt, sName) {
			var s = elt.getAttribute(mapJsAttrNames[sName] || sName);
			// A missing “known” attribute has value null, while a missing “unknown” attribute has
			// value undefined (correctly, from IE’s “attribute == property” point of view); the DOM
			// however wants this method to return "" in either case.
			return s ? s.toString() : "";
		}
		Ql.DOM._getAttribute = $Ql$DOM$_getAttribute_IE55;


		// IE5.5/IE6 have no support for DOM2-Core entirely, so they don’t have this at all.
		function $Ql$DOM$_hasAttribute_IE55(elt, sName) {
			if (sName in mapJsAttrNames) {
				sName = mapJsAttrNames[sName];
			}
			// A “known” attribute always appears in the Element and in its attributes collection, but
			// the attributes[…].specified property reveals whether it was actually specified.
			if (sName in elt.attributes) {
				return elt.attributes[sName].specified;
			} else {
				return elt.getAttribute(sName) != null;
			}
		}
		Ql.DOM._hasAttribute = $Ql$DOM$_hasAttribute_IE55;


		function $Ql$DOM$_removeAttribute_IE55(elt, sName) {
			elt.removeAttribute(mapJsAttrNames[sName] || sName);
		}
		Ql.DOM._removeAttribute = $Ql$DOM$_removeAttribute_IE55;


		function $Ql$DOM$_setAttribute_IE55(elt, sName, sValue) {
			elt.setAttribute(mapJsAttrNames[sName] || sName, sValue.toString());
		}
		Ql.DOM._setAttribute = $Ql$DOM$_setAttribute_IE55;

	})();

}


/* Rationale: IE5.5 doesn’t understand getElementsByTagName("*"), but provides the “all collection”.
*/
if (Browser.version < 60000) {

	Ql.DOM.Document.prototype._sm_mapBuiltinLists = Object.merge({
		"*": "all"
	}, Ql.DOM.Document.prototype._sm_mapBuiltinLists);
	Ql.DOM.Element.prototype._sm_mapBuiltinLists = Object.merge({
		"*": "all"
	}, Ql.DOM.Element.prototype._sm_mapBuiltinLists);

}


/** DESIGN_6351 JS: IE fixes: IE5.5 documents

IE5.5 has serious issues with the Node.ownerDocument property, starting from the fact that it calls
it just document.

The main issue is that an unlinked node loses a reference to its real owner document; the .document
property is, for unlinked nodes, set to some object of a class similar to a Document, but with
several properties behaving like the document of the virtual “about:blank” page. Such class is
referred to as pseudo-Document, within Quearl; due to its purpose of holding dangling nodes though,
object of this class are mapped by Ql.DOM._getNodeType() to Node.DOCUMENT_FRAGMENT_NODE and,
consequently, to Ql.DOM.DocumentFragment by Ql.DOM.wrap().

These are the differences between a Document and a pseudo-Document:

┌──────────────┬───────────────────────────┬────────────────────┐
│ Property		│ Document						 │ Pseudo-Document	 │
├──────────────┼───────────────────────────┼────────────────────┤
│ frames			│ Object							 │ <throws on access> │
│ location		│ "http://www.example.com/" | <throws on access> │
│ readyState	│ "complete"					 │ "uninitialized"	 │
│ URL				│ "http://www.example.com/" │ "about:blank"		 │
│ URLUnencoded	│ "http://www.example.com/" │ "about:blank"		 │
└──────────────┴───────────────────────────┴────────────────────┘

To this, add the fact that the DOM tree has a structure different from the standard:

	Topmost levels of the DOM tree, according to DOM1:

	[HTMLDocument]				.ownerDocument = null;     .parentNode = null
		[HTMLHtmlElement]		.ownerDocument = document; .parentNode = document
			[HTMLBodyElement]	.ownerDocument = document; .parentNode = <html>

	Topmost levels of the DOM tree, according to IE5.5:

	[HTMLDocument]				.document = document; .parentNode = null
		[HTMLHtmlElement]		.document = document; .parentNode = null
			[HTMLBodyElement]	.document = document; .parentNode = <html>

This alone makes it impossible to climb in a loop all the way up from a node to its own document by
using .parentNode: simply using .parentNode || .document will cause infinite loops, since even a
document has a non-null .document property (linking it to itself).

Last but not least, in IE5.5 Document lacks a nodeType property, so whether or not an object is a
Document must be inferred by examining typical (or less so) Document-only properties, while making
sure to distinguish it from the above mentioned pseudo-Document (see the table above).

These issues, combined, require getter functions for Node.nodeType, Node.ownerDocument,
Node.parentNode. Also, a redefined Ql.DOM.Document._createElement() is necessary, to attach a
document’s Quearl-generated identifier to every new Node, which Ql.DOM._getOwnerDocument() will use,
in turn making it possible for Ql.DOM.wrap() to work. Ql.DOM._getOwnerDocument() interprets the lack
of an attached document identifier as meaning that a Node was created from the original server-
generated page; this is helpful when such node is unlinked, thereby losing its only way to track
down its document (Node.document).
*/

/* Rationale: IE5.5 is very wildly off-standard regarding DOM documents, and requires quite a lot of
working around it. See [DESIGN_6351 JS: IE fixes: IE5.5 documents] to see just how bad it is.
*/
if (Browser.version < 60000) {

	// Other than documents lacking the nodeType property, and pseudo-Documents trying to pass as
	// documents, this has to face the fact that in IE5.5, comment nodes are reported as elements
	// with nodeName “!” - coherently with its bug where a comment is delimited by <! … > instead of
	// <!-- … -->, hence making it look like an omit-closing ! element.
	function $Ql$DOM$_getNodeType_IE55(nd) {
		if ("nodeType" in nd) {
			return nd.nodeName == "!" ? Node.COMMENT_NODE : nd.nodeType;
		}
		if ("documentElement" in nd && "location" in nd && "URL" in nd) {
			return nd.URL == "about:blank" ? Node.DOCUMENT_FRAGMENT_NODE : Node.DOCUMENT_NODE;
		}
		return undefined;
	}
	Ql.DOM._getNodeType = $Ql$DOM$_getNodeType_IE55;


	// Uses the Ql data member set by Ql.DOM.Document._createElement() in case the node is currently
	// unlinked.
	function $Ql$DOM$_getOwnerDocument_IE55(nd) {
		if (nd.document.URL != "about:blank") {
			// The document property is an actual document: use that.
			return nd.document;
		}
		if ("_ql_data" in nd) {
			var mapQlData = Ql._getData(nd);
			if ("sOwnerDocId" in mapQlData) {
				// The modified Ql.DOM.Document._createElement() created this node, so the real owner
				// document is in the Quearl data. Assume/hope that the document wrapper hasn’t been
				// destroyed since.
				return this._m_mapDocWrappers[mapQlData.sOwnerDocId]._;
			}
		}
		// The node is attached to a fragment instead of a document, and has no Quearl data to help:
		// it must be a node from the original document, now unlinked.
		return window.document;
	}
	Ql.DOM._getOwnerDocument = $Ql$DOM$_getOwnerDocument_IE55;


	// The incorrect hierarchy makes it impossible to climb, in a loop, all the way up from a node to
	// its own document by using .parentNode, and simply using .parentNode || .document will cause
	// infinite loops because in IE5.5 a document is always owned by itself.
	function $Ql$DOM$_getParentNode_IE55(nd) {
		if ("nodeType" in nd) {
			// nd is an actual node, so return its document (if root) or parentNode (if non-root).
			return nd === nd.document.documentElement ? nd.document : nd.parentNode;
		}
		// Document or document fragment.
		return null;
	}
	Ql.DOM._getParentNode = $Ql$DOM$_getParentNode_IE55;


	// This is the same as the non-IEfix version, except here the getters Ql.DOM._getNodeName() and
	// Ql.DOM._getOwnerDocument() are used, while for performance reasons the non-IEfix version uses
	// the properties directly. This way, only IE5.5 is affected.
	function $Ql$DOM$_isHtml_IE55(nd) {
		var doc;
		if (Ql.DOM._getNodeType(nd) == Node.DOCUMENT_NODE) {
			doc = nd;
		} else {
			doc = Ql.DOM._getOwnerDocument(nd);
		}
		// From here on, same as the original Ql.DOM._isHtml().
		var mapQlData = Ql._getData(doc);
		if (!("bHtml" in mapQlData)) {
			var eltRoot = doc.documentElement;
			mapQlData.bHtml = (eltRoot ? eltRoot.nodeName == "HTML" : true);
		}
		return mapQlData.bHtml;
	}
	Ql.DOM._isHtml = $Ql$DOM$_isHtml_IE55;


	// Necessary to make Ql.DOM._getOwnerDocument() work.
	// TODO: do the same for every Node, not just Elements?
	(function() {
		var fnOverridden = Ql.DOM.Document.prototype._createElement;

		function $Ql$DOM$Document$_createElement_IE55(sName) {
			var elt = fnOverridden.call(this, sName);
			Ql._getData(elt).sOwnerDocId = Ql._getData(this._).sId;
			return elt;
		}
		Ql.DOM.Document.prototype._createElement = $Ql$DOM$Document$_createElement_IE55;
	})();

}


/* Rationale: in IE5.5/IE6/IE7/IE8, frames need to appear in the document.frames collection in order
to be used as targets for forms; this requies some cooperation from Ql.DOM.Node.appendChild() and
Ql.DOM.Node.insertBefore(). Read [DESIGN_4780 JS: AsyncRequest: IFrame quirks] to find out why this
can’t be any less ugly than it is.
*/
if (Browser.version < 90000) {

	(function() {
		var fnOverridden = Ql.DOM.Node.prototype.appendChild;

		function $Ql$DOM$Node$appendChild_IE55(nd) {
			Function.checkArgs($Ql$DOM$Node$appendChild_IE55, arguments, Ql.DOM.Node);
			fnOverridden.call(this, nd);
			if (nd instanceof Ql.DOM.IFrame) {
				// Trigger the special Ql.DOM.IFrame.setAttribute().
				nd.setAttribute("id", nd._.getAttribute("id"));
			}
			return nd;
		}
		Ql.DOM.Node.prototype.appendChild = $Ql$DOM$Node$appendChild_IE55;
	})();


	(function() {
		var fnOverridden = Ql.DOM.Node.prototype.insertBefore;

		function $Ql$DOM$Node$insertBefore_IE55(nd, ndNext) {
			Function.checkArgs(
				$Ql$DOM$Node$insertBefore_IE55, arguments, Ql.DOM.Node, [null, Ql.DOM.Node]
			);
			fnOverridden.call(this, nd, ndNext);
			if (nd instanceof Ql.DOM.IFrame) {
				// Trigger the special Ql.DOM.IFrame.setAttribute().
				nd.setAttribute("id", nd._.getAttribute("id"));
			}
			return nd;
		}
		Ql.DOM.Node.prototype.insertBefore = $Ql$DOM$Node$insertBefore_IE55;
	})();


	function $Ql$DOM$IFrame$setAttribute_IE55(sName, sValue) {
		Function.checkArgs($Ql$DOM$IFrame$setAttribute_IE55, arguments, String, String);
		Ql.DOM.Element.prototype.setAttribute.call(this, sName, sValue);
		if (sName == "id" && this._.parentNode) {
			Ql.DOM._getOwnerDocument(this._).frames[sValue].name = sValue;
		}
	}
	Ql.DOM.IFrame.prototype.setAttribute = $Ql$DOM$IFrame$setAttribute_IE55;

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Event classes and amendments to Ql.EventTarget and Ql.DOM.Document - DOM2-Events

/** DESIGN_6353 JS: IE fixes: Events

Events handling in every version of IE before 9 is almost completely non-standard, meaning that it’s
hard to find something standards-compliant in their implementation.

A quick list of issues:

•	No event capturing, only bubbling;

•	Some events, such as submit, don’t bubble even though they should, according to DOM2-Events;

•	No DOM2-Events.Event* classes (except the memberless Event in IE8), so no DOM2-Events.Event.*
	constants;

•	The fireEvent() method (alternative to DOM2-Events.EventTarget.dispatchEvent()) refuses to fire
	events of types IE doesn’t know, throwing an exception instead.

And now, bigger issues.

An event handler (listener in DOM2-Events terms) registered with attachEvent() (alternative, and
inferior, to DOM2-Events.EventTarget.addEventListener()) is invoked with this === window, instead of
the object on which it was registered. To make this worse, the window.event object (alternative to
the argument passed to a DOM2-Events listener) lacks a currentTarget property, making it impossible
for a handler to access the element it was attached to. This makes attachEvent() useless for most
cases, with one exception: handlers for load and unload events will only be invoked it registered
using attachEvent(), as opposed to being attached via on* properties. This of course required
special-casing them.

For events which should bubble that IE doesn’t make behave so, a special handler,
Ql.EventTarget._dispatchingEventHandler_IE55(), can be permanently installed in the _wrap() method
of a Ql.DOM.Element-derived class using, for example:

	Ql.EventTarget._enableDispatchingHandler_IE55.call(this, "submit")

The special dispatching handler will manually propagate the event for the capturing, at-target and
bubbling phases, thereby mimicking DOM2-Events. The regular Ql.EventTarget.addEventListener() and
removeEventListener() will make sure not to touch the dispatching handler, and will avoid installing
regular handlers on object that they know IE wont’t propagate the event to, relying entirely on the
propagation by _dispatchingEventHandler_IE55().
*/

if (Browser.version < 90000) {

	/** Implementation of DOM2-Events.Event.
	*/
	function $Event_IE55() {
		if (arguments[0] === Function.PROTOTYPING) {
			return;
		}
		Function.checkArgs($Event_IE55, arguments);
	}
	window.Event = $Event_IE55;
	Event.prototype.toString = Function.createToStringMethod("Event");

	Event.CAPTURING_PHASE = 1;
	Event.AT_TARGET       = 2;
	Event.BUBBLING_PHASE  = 3;


	function $Event_IE55$initEvent(sEventType, bCanBubble, bCancelable) {
		Function.checkArgs($Event_IE55$initEvent, arguments, String, Boolean, Boolean);
		this.type = sEventType;
		this.bubbles = bCanBubble;
		this.cancelable = bCancelable;
	}
	Event.prototype.initEvent = $Event_IE55$initEvent;


	function $Event_IE55$preventDefault() {
		Function.checkArgs($Event_IE55$preventDefault, arguments);
		this.returnValue = false;
	}
	Event.prototype.preventDefault = $Event_IE55$preventDefault;


	function $Event_IE55$stopPropagation() {
		Function.checkArgs($Event_IE55$stopPropagation, arguments);
		this.cancelBubble = true;
	}
	Event.prototype.stopPropagation = $Event_IE55$stopPropagation;


	// Implementation of DOM2-Events.MutationEvent.
	//
	function $MutationEvent_IE55() {
		if (arguments[0] === Function.PROTOTYPING) {
			return;
		}
		Function.checkArgs($MutationEvent_IE55, arguments);
	}
	window.MutationEvent = $MutationEvent_IE55;
	MutationEvent.inheritFrom(Event).prototype.toString =
		Function.createToStringMethod("MutationEvent");

	MutationEvent.MODIFICATION = 1;
	MutationEvent.ADDITION     = 2;
	MutationEvent.REMOVAL      = 3;


	function $MutationEvent_IE55$initMutationEvent(
		sEventType, bCanBubble, bCancelable, ndRelatedNode, sPrevValue, sNewValue, sAttrName,
		iAttrChange
	) {
		Function.checkArgs(
			$MutationEvent_IE55$initMutationEvent, arguments, String, Boolean, Boolean, Object.anyType,
			[null, String], [null, String], [null, String], Number
		);
		this.initEvent(sEventType, bCanBubble, bCancelable);
		this.relatedNode = ndRelatedNode;
		this.prevValue   = sPrevValue;
		this.newValue    = sNewValue;
		this.attrName    = sAttrName;
		this.attrChange  = iAttrChange;
	}
	MutationEvent.prototype.initMutationEvent = $MutationEvent_IE55$initMutationEvent;


	/** Implementation of DOM2-Events.UIEvent.
	*/
	function $UIEvent_IE55() {
		if (arguments[0] === Function.PROTOTYPING) {
			return;
		}
		Function.checkArgs($UIEvent_IE55, arguments);
	}
	window.UIEvent = $UIEvent_IE55;
	UIEvent.inheritFrom(Event).prototype.toString = Function.createToStringMethod("UIEvent");


	function $UIEvent_IE55$initUIEvent(sEventType, bCanBubble, bCancelable, wndView, iDetail) {
		Function.checkArgs(
			$UIEvent_IE55$initUIEvent, arguments, String, Boolean, Boolean, Object.anyType, Number
		);
		this.initEvent(sEventType, bCanBubble, bCancelable);
		this.view   = wndView;
		this.detail = iDetail;
	}
	UIEvent.prototype.initUIEvent = $UIEvent_IE55$initUIEvent;


	/** Implementation of DOM2-Events.MouseEvent.
	*/
	function $MouseEvent() {
		if (arguments[0] === Function.PROTOTYPING) {
			return;
		}
		Function.checkArgs($MouseEvent, arguments);
	}
	window.MouseEvent = $MouseEvent;
	MouseEvent.inheritFrom(UIEvent).prototype.toString = Function.createToStringMethod("MouseEvent");


	function $MouseEvent$initMouseEvent(
		sEventType, bCanBubble, bCancelable, wndView, iDetail, cxScreen, cyScreen, cxClient, cyClient,
		bCtrlKey, bAltKey, bShiftKey, bMetaKey, iButton, ndRelatedTarget
	) {
		Function.checkArgs(
			$MouseEvent$initMouseEvent, arguments, String, Boolean, Boolean, Object.anyType, Number,
			Number, Number, Number, Number, Boolean, Boolean, Boolean, Boolean, Number,
			Object.anyTypeOpt
		);
		this.initUIEvent(sEventType, bCanBubble, bCancelable, wndView, iDetail);
		this.screenX       = cxScreen;
		this.screenY       = cyScreen;
		this.clientX       = cxClient;
		this.clientY       = cyClient;
		this.ctrlKey       = bCtrlKey;
		this.altKey        = bAltKey;
		this.shiftKey      = bShiftKey;
		this.metaKey       = bMetaKey;
		this.button        = iButton;
		this.relatedTarget = ndRelatedTarget;
	}
	MouseEvent.prototype.initMouseEvent = $MouseEvent$initMouseEvent;


	/** Implementation of DOM2-Events.HTMLEvent.
	*/
	function $HTMLEvent_IE55() {
		if (arguments[0] === Function.PROTOTYPING) {
			return;
		}
		Function.checkArgs($HTMLEvent_IE55, arguments);
	}
	window.HTMLEvent = $HTMLEvent_IE55;
	HTMLEvent.inheritFrom(Event).prototype.toString = Function.createToStringMethod("HTMLEvent");


	// Creates an Event using document.createEventObject(), and then patches it to look like the real
	// thing (DOM2-Events.Event).
	function $Ql$DOM$Document$createEvent_IE55(sEventGroup) {
		Function.checkArgs($Ql$DOM$Document$createEvent_IE55, arguments, String);
		var arrMatch = sEventGroup.match(/^((?:Mouse|UI|Mutation|HTML)?Event)s$/);
		if (!arrMatch) {
			throw new /*DOMException(NOT_SUPPORTED_ERR)*/Error("Unknown event group");
		}
		var e = this._.createEventObject();
		Object.merge(e, window[arrMatch[1]].prototype);
		// Object.merge() skipped this one, since e already had it.
		e.returnValue = true;
		e.timeStamp = (new Date()).getTime();
		return e;
	}
	Ql.DOM.Document.prototype.createEvent = $Ql$DOM$Document$createEvent_IE55;


	// Uses DOM0 or attachEvent() to register a special callback, which will invoke all the
	// registered listeners with the proper context.
	function $Ql$EventTarget$_addNewEvL_IE55(arrEvLs, sEventType, bCapture) {
		var sOnEvent = "on" + sEventType;
		// If we already registered a DOM0 handler, or the event type doesn’t require attachEvent(),
		// or attachEvent() fails anyway…
		if (
			arrEvLs._bDOM0Handler ||
			(sEventType != "load" && sEventType != "unload") ||
			!this._.attachEvent(sOnEvent, Ql.EventTarget._eventHandler_IE55)
		) {
			// …attach our handler the DOM0 way, and remember we did so.
			// Exclude these events, which are handled by permanent listeners attached to the (few)
			// elements that can generate them.
			if (sEventType != "submit" && sEventType != "reset") {
				this._[sOnEvent] = Ql.EventTarget._eventHandler_IE55;
			}
			arrEvLs._bDOM0Handler = true;
		}
	}
	Ql.EventTarget._addNewEvL = $Ql$EventTarget$_addNewEvL_IE55;


	function $Ql$EventTarget$_dispatchEvent_IE55(e) {
		// Tell Ql.EventTarget._eventHandler_IE55() that this event object has already been sanitized.
		e.target = this._;
		if ("fireEvent" in this._) {
			try {
				return this._.fireEvent("on" + e.type, e);
			} catch (x) {
				// If the event type is unknown to IE, fireEvent() will throw an exception. In IE5.5/IE6
				// it is possible to block only that, checking x.number == 0x80070057 (E_INVALIDARG),
				// but this does not seem to work any more in IE7. No other exceptions should be thrown
				// anyway, so blocking them all is no big deal.
			}
		}
		// No luck, need to dispatch the event by hand.
		return Ql.EventTarget._dispatchEventByHand_IE55.call(this, e, true, true, true);
	}
	Ql.EventTarget._dispatchEvent = $Ql$EventTarget$_dispatchEvent_IE55;


	/** Manual alternative to fireEvent(), to dispatch events (e.g. custom ones) that the native
	method will refuse to. Since it directly invokes Ql.EventTarget._executeListeners(), it requires
	a sanitized event.
	*/
	function $Ql$EventTarget$_dispatchEventByHand_IE55(e, bCapturing, bAtTarget, bBubbling) {
		var sProp, arrAncestors;
		if ((bCapturing || bBubbling) && e.bubbles) {
			arrAncestors = this.getAncestors();
		}
		if (bCapturing && e.bubbles) {
			// Invoke handlers for the capturing phase.
			sProp = "_m_arrEvLs_C_" + e.type;
			e.eventPhase = Event.CAPTURING_PHASE;
			for (var i = 0, c = arrAncestors.length; i < c; ++i) {
				var eltAncestor = arrAncestors[i];
				if (sProp in eltAncestor) {
					e.currentTarget = eltAncestor;
					Ql.EventTarget._executeListeners(eltAncestor[sProp], eltAncestor, e);
					if (e.cancelBubble) {
						break;
					}
				}
			}
		}
		if (!e.cancelBubble) {
			sProp = "_m_arrEvLs_B_" + e.type;
			if (bAtTarget) {
				// Invoke handlers for the target itself.
				e.eventPhase = Event.AT_TARGET;
				e.currentTarget = this;
				if (sProp in this) {
					Ql.EventTarget._executeListeners(this[sProp], this, e);
				}
			}
			if (bBubbling && e.bubbles && !e.cancelBubble) {
				// Invoke handlers for the bubbling phase.
				e.eventPhase = Event.BUBBLING_PHASE;
				for (var i = arrAncestors.length - 1; i >= 0; --i) {
					var eltAncestor = arrAncestors[i];
					if (sProp in eltAncestor) {
						e.currentTarget = eltAncestor;
						Ql.EventTarget._executeListeners(eltAncestor[sProp], eltAncestor, e);
						if (e.cancelBubble) {
							break;
						}
					}
				}
			}
		}
		return e.returnValue !== false;
	}
	Ql.EventTarget._dispatchEventByHand_IE55 = $Ql$EventTarget$_dispatchEventByHand_IE55;


	/** Handles an event like Ql.EventTarget._eventHandler_IE55(), also making it capturable and
	bubbling.
	*/
	function $Ql$EventTarget$_dispatchingEventHandler_IE55(e) {
		if (!e) {
			e = window.event;
		}
		// e hasn’t been sanitized by Ql.EventTarget._dispatchEvent().
		var eltThis = Ql.EventTarget._sanitizeEventObject_IE55.call(this, e);
		// Dispatch the event like, and even better than, IE should.
		Ql.EventTarget._dispatchEventByHand_IE55.call(Ql.DOM.wrap(eltThis), e, true, true, true);
	}
	Ql.EventTarget._dispatchingEventHandler_IE55 = $Ql$EventTarget$_dispatchingEventHandler_IE55;


	/** Installs Ql.EventTarget._eventDispatchingHandler_IE55() to handle and standardize the
	behavior of the specified type of event. Supposed to be invoked in the _wrap() method of a
	Ql.DOM.Element-derived class.
	*/
	function $Ql$EventTarget$_enableDispatchingHandler_IE55(sEventType) {
		this._["on" + sEventType] = Ql.EventTarget._dispatchingEventHandler_IE55;
	}
	Ql.EventTarget._enableDispatchingHandler_IE55 = $Ql$EventTarget$_enableDispatchingHandler_IE55;


	/** Handles an IE5.5/IE6/IE7/IE8 event, converting it in a DOM2-Events.Event if needed (i.e. if
	generated by IE itself, without Quearl intervention), and passes it to
	Ql.EventTarget._eventListener().
	*/
	function $Ql$EventTarget$_eventHandler_IE55(e) {
		if (!e) {
			e = window.event;
		}
		// e hasn’t been sanitized by Ql.EventTarget._dispatchEvent().
		var eltThis = Ql.EventTarget._sanitizeEventObject_IE55.call(this, e);
		// Finish sanitization.
		e.eventPhase = (eltThis === e.target ? Event.AT_TARGET : Event.BUBBLING_PHASE);
		e.currentTarget = eltThis;
		// Join the DOM-compliant code path.
		Ql.EventTarget._eventListener.call(eltThis, e);
	}
	Ql.EventTarget._eventHandler_IE55 = $Ql$EventTarget$_eventHandler_IE55;


	// Undoes what Ql.EventTarget._addNewEvL() in this file does.
	function $Ql$EventTarget$_removeLastEvL_IE55(arrEvLs, sEventType, bCapture) {
		var sOnEvent = "on" + sEventType;
		if (arrEvLs._bDOM0Handler) {
			this._[sOnEvent] = null;
		} else {
			this._.detachEvent(sOnEvent, Ql.EventTarget._eventHandler_IE55);
		}
	}
	Ql.EventTarget._removeLastEvL = $Ql$EventTarget$_removeLastEvL_IE55;


	/** Molds an IE5.5/IE6/IE7/IE8 EventObject into in a DOM2-Events, and returns a fixed this
	object.
	*/
	function $Ql$EventTarget$_sanitizeEventObject_IE55(e) {
		// Quearl doesn’t allow for event listeners to be registered on window, so if this === window,
		// this handler has been registered with attachEvent(). Quearl only does that on the same
		// element that will fire the event, so the real this is e.srcElement.
		if (!("target" in e)) {
			// The event is straight from IE, so it needs treatment.
			e.target = (e.srcElement || window.document);
			if (e.type == "mouseover") {
				e.relatedTarget = e.fromElement;
			} else if (e.type == "mouseout") {
				e.relatedTarget = e.toElement;
			}
			e.preventDefault = Event.prototype.preventDefault;
			e.stopPropagation = Event.prototype.stopPropagation;
		}
		return this !== window ? this : e.srcElement;
	}
	Ql.EventTarget._sanitizeEventObject_IE55 = $Ql$EventTarget$_sanitizeEventObject_IE55;


	// Complete unfinished business for Ql.core.
	Ql.DOM.document.addEventListener("earlyload", $Ql$modules$core$init, false);

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Amendments to Ql.DOM.Document

/* Redefine some methods to make up for monstrous holes in IE5.5/IE6/IE7/IE8’s DOM compliance.
*/

if (Browser.version < 90000) {

	// IE5.5 only has createElement() and createTextNode(), IE6/IE7/IE8 also have createAttribute()
	// and createComment(); everything they can’t create, will be dropped.
	function $Ql$DOM$Document$_importNode_IE55(nd, bAllChildren) {
		switch (Ql.DOM._getNodeType(nd)) {
			case Node.ELEMENT_NODE:
				var ndImp = this._createElement(nd.nodeName);
				// Copy attributes.
				for (var i = 0, c = nd.attributes.length; i < c; ++i) {
					var sName = nd.attributes[i].nodeName;
					ndImp[sName] = nd[sName];
				}
				// Copy children.
				for (var ndChild = nd.firstChild; ndChild; ndChild = ndChild.nextSibling) {
					var ndImpChild = this._importNode(ndChild, bAllChildren);
					if (ndImpChild) {
						ndImp.appendChild(ndImpChild);
					}
				}
				return ndImp;

			case Node.CDATA_SECTION_NODE:
			case Node.TEXT_NODE:
				return this._.createTextNode(nd.nodeValue);

			case Node.ATTRIBUTE_NODE:
				if (Browser.version < 60000) {
					return null;
				}
				return null; // TODO: do something!

			case Node.COMMENT_NODE:
				if (Browser.version < 60000) {
					// Yes, this is what IE5.5 thinks a comment is.
					return this._createElement("!");
				}
				return this._.createComment(nd.nodeValue);
		}
	}
	Ql.DOM.Document.prototype._importNode = $Ql$DOM$Document$_importNode_IE55;

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Amendments to Ql.DOM.Element

/* Redefine some methods to take advantage of IE5.5/IE6/IE7/IE8’s DOM non-compliance.
*/

if (Browser.version >= 70000 && Browser.version < 90000) {

	// IE7/IE8 do support position: fixed, but they don’t realize that it makes an item’s position
	// independent from its container: .offsetParent is null as it should, but the .offset* values
	// are relative to what .offsetParent would be if position: absolute was specified, instead of
	// being absolute.
	function $Ql$DOM$Element$getOffsetRect_IE7(eltRelTo /*= null*/) {
		Function.checkArgs(
			$Ql$DOM$Element$getOffsetRect_IE7, arguments, [undefined, null, Ql.DOM.Element]
		);
		var eltThis = this._, map = {
			 	left: eltThis.offsetLeft,
			 	top: eltThis.offsetTop,
			 	width: eltThis.offsetWidth,
			 	height: eltThis.offsetHeight,
			 	fixed: (this.getComputedStyle("position") == "fixed")
			 };
		if (eltRelTo) {
			// .offset* refer to non-existant .offsetParent, so drop a temporary position: absolute
			// element in the same hierarchy position, and use its .offsetParent instead.
			var elt, eltTemp = this.getOwnerDocument().createElement("span");
			eltTemp.setStyle("position", "absolute");
			eltTemp.setStyle("left", "0");
			eltTemp.setStyle("top", "0");
			if (map.fixed) {
				this.getParentNode().insertBefore(eltTemp, this);
				elt = eltTemp;
			} else {
				elt = this;
			}
			while (
				(elt = elt._.offsetParent) &&
				((elt = Ql.DOM.wrap(elt)).isDescendantOf(eltRelTo) || map.fixed)
			) {
				map.left += elt._.offsetLeft;
				map.top += elt._.offsetTop;
				if (elt.getComputedStyle("position") == "fixed") {
					map.fixed = true;
					// Move the position: absolute element here, to access its .offsetParent.
					elt.getParentNode().insertBefore(eltTemp, elt);
					elt = eltTemp;
				}
			}
			eltTemp.unlink();
		}
		map.right = map.left + map.width;
		map.bottom = map.top + map.height;
		return map;
	}
	Ql.DOM.Element.prototype.getOffsetRect = $Ql$DOM$Element$getOffsetRect_IE7;

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Amendments to Ql.DOM.Element - DOM2-Style

/* Redefine some of the improved methods to fit IE5.5/IE6/IE7/IE8 models.

Note: a cleaner way to improve .style would be to add methods to it, but that has proved to trigger
incredible bugs in (at least) IE6, such as methods (Functions) being irreversibly turned into
Strings!
*/

(function() {

	/** Translation table between CSS property names and the (pretty arbitrary) names
	IE5.5/IE6/IE7/IE8 give them. Some are camelCased, some are just different. */
	var mapCssPropNames = {
		"float": "styleFloat"
	};


	/** Resolves both property names’ camelCasedness and inconsistencies.

	String sName
		CSS property name to fix.
	String return
		Fixed name.
	*/
	function fixCssPropName(sName) {
		return mapCssPropNames[sName] || sName.toCamelCase();
	}


	// IE5.5/IE6/IE7/IE8 don’t have document.defaultView.getComputedStyle(), but they provide a
	// currentStyle attribute, although with different semantics (it’s the cascaded style, not the
	// computed style) but works just as well here. camelCase applies here, too.
	function $Ql$DOM$Element$copyStylesFrom_IE55(eltSrc, bForce, arrStyles) {
		Function.checkArgs(
			$Ql$DOM$Element$copyStylesFrom_IE55, arguments, Ql.DOM.Element, Boolean, Array
		);
		var csssdSrc = (bForce ? eltSrc.currentStyle : eltSrc.style),
			 csssdDst = this._.style;
		for (var i = 0, c = arrStyles.length; i < c; ++i) {
			var sName = fixCssPropName(arrStyles[i]), sVal = csssdSrc[sName];
			if (bForce || sVal) {
				csssdDst[sName] = sVal;
			}
		}
	}
	Ql.DOM.Element.prototype.copyStylesFrom = $Ql$DOM$Element$copyStylesFrom_IE55;


	// IE5.5/IE6/IE7/IE8 have nothing that returns the computed style, but in a few cases it’s
	// possible to work around this problem by calculating the property value on the fly.
	function $Ql$DOM$Element$getComputedStyle_IE55(sName) {
		Function.checkArgs($Ql$DOM$Element$getComputedStyle_IE55, arguments, String);
		var sValue = this._.currentStyle[fixCssPropName(sName)] || "";
		/*switch (sValue) {
			case "auto":
			case "inherit":
		}*/
		if (sName.substr(-5) == "color" && sValue.charAt(0) == "#") {
			// Convert a #rrggbb color to rgb() notation.
			var iValue;
			sValue = sValue.substr(1);
			if (sValue.length == 3) {
				sValue = sValue.charAt(0) + sValue.charAt(0) +
							sValue.charAt(1) + sValue.charAt(1) +
							sValue.charAt(2) + sValue.charAt(2);
			}
			var iValue = parseInt(sValue, 16);
			sValue = "rgb(" + ( iValue        & 0xff) + ", " +
									((iValue >>  8) & 0xff) + ", " +
									((iValue >> 16) & 0xff) + ")";
		}
		return sValue;
	}
	Ql.DOM.Element.prototype.getComputedStyle = $Ql$DOM$Element$getComputedStyle_IE55;


	/* Rationale: IE5.5/IE6/IE7/IE8 completely ignore CSS2’s opacity attribute, but they have a
	rather cumbersome alternative to it. camelCase rulez.
	*/
	if (Browser.version < 90000) {

		function $Ql$DOM$Element$getStyle_IE55(sName) {
			Function.checkArgs($Ql$DOM$Element$getStyle_IE55, arguments, String);
			if (sName == "opacity") {
				var arrMatch = this._.style.filter.match(/\balpha\(opacity=(\d+)\)/);
				return arrMatch ? (parseFloat(arrMatch[1]) / 100).toString() : "";
			}
			// undefined would be returned for CSS attributes IE doesn’t know.
			return this._.style[fixCssPropName(sName)] || "";
		}
		Ql.DOM.Element.prototype.getStyle = $Ql$DOM$Element$getStyle_IE55;


		function $Ql$DOM$Element$removeStyle_IE55(sName) {
			Function.checkArgs($Ql$DOM$Element$removeStyle_IE55, arguments, String);
			var csssd = this._.style, sVal = this.getStyle(sName);
			if (sName == "opacity") {
				csssd.filter = csssd.filter.replace(/\balpha\(opacity=\d+\)/, "").trim();
			} else {
				csssd[fixCssPropName(sName)] = "";
			}
			return sVal;
		}
		Ql.DOM.Element.prototype.removeStyle = $Ql$DOM$Element$removeStyle_IE55;


//		var temp = createTempElement();
		function getFontScale(elt) {
			var fScale = 1;
			temp.style.fontFamily = elt.currentStyle.fontFamily;
			temp.style.lineHeight = elt.currentStyle.lineHeight;
			for (; elt != body; elt = elt.parentNode) {
				var sSize = elt.currentStyle.fontSize;
				if (sSize) {
					if (sSize.substr(-2) == "em") {
						fScale *= parseFloat(sSize);
					} else if (sSize.substr(-1) == "%") {
						fScale *= parseFloat(sSize) / 100;
					} else if (sSize.substr(-2) == "ex") {
						fScale *= parseFloat(sSize) / 2;
					} else {
						temp.style.fontSize = sSize;
						return 1;
					}
				}
			}
			return fScale;
		}
		function getPixelValue(elt, sValue) {
			if (sValue.substr(-2) == "px") {
				return parseInt(sValue) || 0;
			}
			var bNegative = (sValue.charAt(0) == "-");
			if (bNegative) {
				sValue = sValue.substr(1);
			}
			if (!RegExp.DIGIT.test(sValue.substr(-1))) {
				fScale = getFontScale(elt);
			}
			temp.style.width = sValue;
			body.appendChild(temp);
			var iPx = Math.round((bNegative && -fScale || fScale) * temp.offsetWidth);
			temp.removeNode();
			return iPx;
		}


		function $Ql$DOM$Element$setStyle_IE55(sName, sValue, sPriority /*= ""*/) {
			Function.checkArgs(
				$Ql$DOM$Element$setStyle_IE55, arguments, String, String, [undefined, String]
			);
			var csssd = this._.style;
			if (sName == "opacity") {
				var iValue = Math.round(parseFloat(sValue) * 100);
				if (iValue == 100) {
					this.removeStyle(sName);
				} else if (/\balpha\(opacity=\d+\)/.test(csssd.filter)) {
					csssd.filter = csssd.filter.replace(
						/\balpha\(opacity=\d+\)/, "alpha(opacity=" + iValue + ")"
					);
				} else {
					csssd.filter = "alpha(opacity=" + iValue + ") " + csssd.filter;
				}
			} else {
				// TODO: FIXME
				if (false && Browser.version < 60000) {
					// Fix the quirks mode box model bug: IE5.5 will shrink the contents to accomodate
					// borders and padding, while here we’ll do the opposite, i.e. grow the width to make
					// room for borders and padding.
					// The use of runtimeStyle to keep the element unchanged while altering its style to
					// read the converted pixel values, is from an example by Dean Edwards.
					var csssdCurrent = this._.currentStyle,
						 csssdOverride = this._.runtimeStyle;
					switch (sName) {
						case "width":
							// Backup current values.
							var sOldLeft = csssd.left, sOldWidth = csssd.width,
								 sOldLeftOvr = csssdOverride.left,
								 sOldWidthOvr = csssdOverride.width;
							// Force the current values to stay.
							csssdOverride.left = csssdCurrent.left;
							csssdOverride.width = csssdCurrent.width;
							// Recalculate sValue.
							csssd.width = sValue;
							var iPxValue = csssd.pixelWidth;
							csssd.left = csssdCurrent.borderLeftWidth;
							alert("borderLeftWidth: " + csssd.left + " (" + csssd.pixelLeft + ")");
							iPxValue += csssd.pixelLeft;
							csssd.left = csssdCurrent.borderRightWidth;
							alert("borderRightWidth: " + csssd.left + " (" + csssd.pixelLeft + ")");
							iPxValue += csssd.pixelLeft;
							csssd.left = csssdCurrent.paddingLeft;
							alert("paddingLeft: " + csssd.left + " (" + csssd.pixelLeft + ")");
							iPxValue += csssd.pixelLeft;
							csssd.left = csssdCurrent.paddingRight;
							alert("paddingRight: " + csssd.left + " (" + csssd.pixelLeft + ")");
							iPxValue += csssd.pixelLeft;
							sValue = iPxValue.toString() + "px";
							// Restore previous values.
							csssd.left = sOldLeft;
							csssd.width = sOldWidth;
							csssdOverride.left = sOldLeftOvr;
							csssdOverride.width = sOldWidthOvr;
							break;

						case "height":
							// Force the current values to stay.
							csssdOverride.top = csssd.top;
							csssdOverride.height = csssd.height;
							// Recalculate sValue.
							csssd.height = sValue;
							var iPxValue = csssd.pixelHeight;
							csssd.top = csssd.borderTopWidth;
							iPxValue += csssd.pixelTop;
							csssd.top = csssd.borderBottomWidth;
							iPxValue += csssd.pixelTop;
							csssd.top = csssd.paddingTop;
							iPxValue += csssd.pixelTop;
							csssd.top = csssd.paddingBottom;
							iPxValue += csssd.pixelTop;
							sValue = iPxValue.toString() + "px";
							// Restore the override style.
							csssd.top = csssdOverride.top;
							csssd.height = csssdOverride.height;
							csssdOverride.top = "";
							csssdOverride.height = "";
							break;
					}
				}
				csssd[fixCssPropName(sName)] = sValue;
			}
		}
		Ql.DOM.Element.prototype.setStyle = $Ql$DOM$Element$setStyle_IE55;

	}
})();



////////////////////////////////////////////////////////////////////////////////////////////////////
// Amendments to Ql.DOM.Element-derived classes

/* Redefine some methods to take advantage of/work around IE5.5/IE6/IE7’s DOM non-compliance.
*/

/* Rationale: in IE5.5/IE6/IE7, IFrames have a non-standard property (implemented everywhere else,
though), contentWindow, which offers a document property, so the lack of
DOM2-HTML.HTMLIFrame.contentDocument can be worked around.
*/
if (Browser.version < 80000) {

	function $Ql$DOM$IFrame$getContentDocument_IE55() {
		Function.checkArgs($Ql$DOM$IFrame$getContentDocument_IE55, arguments);
		var doc = this._.contentWindow.document;
		return doc && Ql.DOM.wrap(doc);
	}
	Ql.DOM.IFrame.prototype.getContentDocument = $Ql$DOM$IFrame$getContentDocument_IE55;

}


/* Rationale: in IE5.5/IE6/IE7/IE8, HTMLFormElement-specific event types (submit, reset) do not
bubble, while they should (<http://www.w3.org/TR/DOM-Level-2-Events/events.html
#Events-eventgroupings-htmlevents>). This must be worked around by always having a listener on these
event types, which will manually dispatch the events.
*/
if (Browser.version < 90000) {

	(function() {
		var fnOverridden = Ql.DOM.Form.prototype._wrap;

		function $Ql$DOM$Form$_wrap_IE55(nd) {
			fnOverridden.call(this, nd);
			Ql.EventTarget._enableDispatchingHandler_IE55.call(this, "submit");
			Ql.EventTarget._enableDispatchingHandler_IE55.call(this, "reset");
			return this;
		}
		Ql.DOM.Form.prototype._wrap = $Ql$DOM$Form$_wrap_IE55;
	})();

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Amendments to other classes


/** DESIGN_6352 JS: AsyncRequest: XMLHTTP ActiveX

The now-standard XMLHttpRequest originated as an ActiveX (COM) component named Microsoft.XMLHTTP,
shipped with IE4 (nonetheless!). Over the years, Microsoft has updated the component many times;
some of these updates brought incompatible changes, so they ended up having a list of recommended
versions to use (see <http://blogs.msdn.com/b/xmlteam/archive/2006/10/23/
using-the-right-version-of-msxml-in-internet-explorer.aspx>).

Of course, it would be nice to just use the latest, but IE5.5 and IE6 (those who don’t offer a
non-ActiveX XMLHttpRequest) did not (obviously) ship with the latest version (see
<http://support.microsoft.com/kb/269238>):

•	IE5.5 is reported (see above) to have shipped with MSXML2.XMLHTTP, which in later versions would
	come to mean MSXML2.XMLHTTP.3.0; yet tests show that, at least on Windows Me, it only shipped
	with the old Microsoft.XMLHTTP;

•	IE6 shipped with MSXML2.XMLHTTP.3.0, which is the latest of its series;

•	Several other Microsoft products (.NET Framework 3.0, Visual Studio 2005, SQL Server 2005)
   install MSXML2.XMLHTTP.6.0, which can be used just as well in JavaScript.

IE7/IE8 have a native XMLHttpRequest, but it may be disabled per policy settings, so the ActiveX
alternative should always be tried.
*/

Ql.AsyncRequest.prototype._createXhr = (function() {

	/** ProgIDs that we’ll try to instantiate. See [DESIGN_6352 JS: AsyncRequest: XMLHTTP ActiveX] to
	understand why only these ProgIDs are here. */
	var arrProgIDs = ["MSXML2.XMLHTTP.6.0", "MSXML2.XMLHTTP.3.0", "Microsoft.XMLHTTP"];


	function $Ql$AsyncRequest$_createXhr_IE55() {
		try {
			if ("XMLHttpRequest" in window) {
				this._m_xhr = new XMLHttpRequest();
				return true;
			}
			for (var i = 0, c = arrProgIDs.length; i < c; ++i) {
				this._m_xhr = new ActiveXObject(arrProgIDs[i]);
				return true;
			}
		} catch (x) {
		}
		this._m_bForceIFrame = true;
		return false;
	}
	return $Ql$AsyncRequest$_createXhr_IE55;
})();


if (Browser.version < 90000) {

	// IE5.5/IE6/IE7/IE8 do have an XML parser, but it’s an ActiveX object instead of the global de
	// facto standard DOMParser.
	function $Ql$AsyncRequest$_parseXml_IE55(s, sMimeType) {
		var xd;
		try {
			xd = new ActiveXObject("Microsoft.XMLDOM");
		} catch (x) {
			return null;
		}
		xd.async = false;
		xd.loadXML(s);
		return xd;
	}
	Ql.AsyncRequest.prototype._parseXml = $Ql$AsyncRequest$_parseXml_IE55;

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// PNG fix for IE5.5/IE6

/* IE5.5/IE6 can’t handle alpha colors in PNG images, instead blending non-opaque colors with the
background color of the image. This can be only be fixed in <img> elements in a very complicated
way, and only in Windows.

TODO: FIXME
*/
if (false && Browser.version < 70000 && navigator.platform == "Win32") {

	/** Applies or undoes the fix.

	[bActivate:bool]
		true if the fix should be applied, false otherwise. Defaults to true.
	*/
	$._aaElemMethods["img"]._pngFix_IE55 = function $Ql$HTMLImage$_pngFix_IE55(bActivate /*= true*/) {
		// This whole function seems to fail randomly, mostly aroung the playing with styles part.
		try {
			// If the file name specifies a non-PNG, the code in the else clause will check if the fix
			// was present (it now needs to be removed).
			if (bActivate !== false && /\.[Pp][Nn][Gg]$/.test(this.getAttribute("src"))) {
				this.setAttribute("srcPng", this.getAttribute("src"));
				if (this.currentStyle.width == "auto" && this.currentStyle.height == "auto") {
					// Forget about any set size.
					this.removeStyle("width");
					this.removeStyle("height");
					if (this.currentStyle["display"] == "none") {
						// The element is not rendered, which causes its actual size to be unavailable. So
						// it’s necessary to move it in the document, hidden at absolute position (0,0).
						this.runtimeStyle["display"   ] = "block";
						this.runtimeStyle["visibility"] = "hidden";
						this.runtimeStyle["position"  ] = "absolute";
						// Now the measurements are available.
						this.setStyle("width",  this._.offsetWidth  + "px");
						this.setStyle("height", this._.offsetHeight + "px");
						// Undo all of the above.
						this.runtimeStyle["position"  ] = "";
						this.runtimeStyle["visibility"] = "";
						this.runtimeStyle["display"   ] = "";
					} else {
						// Reassign the CSS size to that of the image.
						this.setStyle("width",  this.offsetWidth  + "px");
						this.setStyle("height", this.offsetHeight + "px");
					}
				}
				this.setAttribute("src", location.RROOTDIR + "gfx/blank.gif");
				this.runtimeStyle["filter"] =
					"progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" +
					Uri.encode(this.getAttribute("srcPng")) + "';sizingMethod='scale')";
			} else if (
				this.hasAttribute("srcPng") &&
				this.getAttribute("src") != location.RROOTDIR + "gfx/blank.gif"
			) {
				// src is being set to a non-blank.gif non-PNG image, or bActivate is false, so undo the
				// fix.
				this.removeStyle("width");
				this.removeStyle("height");
				this.removeAttribute("srcPng");
				this.runtimeStyle["filter"] = "";
			}
		} catch (x) {
		}
	};


	/** Adds a new initializer for <img> elements.
	*/
	function $Ql$HTMLImage$$_pngFix_IE55() {
		this.addEventListener("load", this._pngFix_IE55, false);
	};
	Object.overrideMethod($._aaElemInits, "img", $Ql$HTMLImage$$_pngFix_IE55);


	/** Fixes every image, as soon as the document has been created.
	*/
	document.addEventListener("earlyload", function $Ql$HTMLImage$_pngFixAll_IE55(e) {
		var arrImgs = document.select("img");
		for (var i = 0; i < arrImgs.length; ++i) {
			var img = arrImgs[i];
			img.addEventListener("load", img._pngFix_IE55, false);
			if (img.readyState == "complete") {
				// The <img> has been loaded already, so no onload event will be triggered: apply the
				// fix now.
				img._pngFix_IE55();
			}
		};
	}, false);

}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions


/** Enables Quearl functionality for the page.
*/
function $Ql$modules$core_iefix$init() {
	// Wrap all server-generated form elements.
	this.select("form");
}
Ql.DOM.document.addEventListener("earlyload", $Ql$modules$core_iefix$init, false);

