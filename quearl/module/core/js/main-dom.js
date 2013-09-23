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

/** Consolidation of W3C standards and Quearl extended DOM class hierarchy. */



////////////////////////////////////////////////////////////////////////////////////////////////////
// DOM enhancement classes


/** DESIGN_7850 JS: DOM: Wrappers

A DOM wrapper enhances (and hides the bugs of) a browser-defined DOM Node. Thin wrappers are defined
for most standard HTML element types, and they mostly add minor helper methods and bug fixes to
their underlying elements; thicker, more complex wrappers implement additional functionality for UI
components not part of HTML.

Wrappers level inconsistencies across browsers, without recurring to mass-object extension à la
Prototype: this saves memory, since a thin wrapper will be discarded as soon as it goes out of
scope.

Multiple wrappers can exist on one object (but a Document) at any given time; the only restriction
to this situation is that at the time an id attribute is assigned to an element, at most one wrapper
should be referencing it.

The base wrapper class is Ql.DOM.Node, just like the base standard DOM class is Node.

Methods of Ql.DOM.Node and its derived classes should always only accept and/or return wrappers, so
that clients won’t need to explicitly create them. Clients should always store wrappers instead of
plain DOM objects.

A Ql.DOM.Element wrapper can be locked on necessity, so that any other requests for wrappers on its
wrapped object will be satisfied by the very same object. See [DESIGN_7853 JS: DOM: Wrappers: Locks]
for more information on wrapper locks and for details on how a wrapper is really instantiated when
e.g. Ql.DOM.document.createElement() is invoked.
*/

/** DESIGN_7853 JS: DOM: Wrappers: Locks

Locking a wrapper can be helpful for elements which are going to be used frequently, avoiding new
temporary wrappers to be created over and over again.

Locking is also useful (actually, necessary) for wrappers of classes which define data members not
part of the underlying wrapped *Element; such classes can invoke this.lockWrapper() in a redefined
_wrap() method. This will mark every instance as protected from being duplicated, and will ensure
that the object will be alive even when the last reference to it has gone out of scope but the
element is still in the document tree, keeping the wrapper ready for retrieval.


Document wrappers are always locked, since there won’t be many, and because each needs to store the
list of its own locked Element wrappers. This also means that they will be kept in memory
indefinitely until manually released, which must be done using the releaseWrapper() method.


A Ql.DOM.Element wrapper object can be locked by invoking its lockWrapper() method; this way, once
its wrapped element is inserted into its owner document’s tree, any request to wrap that specific
element will be satisfied by the very same wrapper object.

When a Ql.DOM.Element wrapper is locked and inserted into its document’s tree, it must have an id
attribute; if it doesn’t, its underlying element is assigned a unique auto-generated id, but this
won’t be visible to clients calling Ql.DOM.Element.getAttribute()/hasAttribute(). In any case, it’s
always possible for clients to manually set the id attribute on the object; the wrapper will keep in
sync with the new id.

This table illustrates, for each meaningful sequence of operations on a wrapper, what’s their effect
on the wrapper lock, and which sequences of actions cause a wrapper lock to be enforced, which
don’t, and which sequences lead to the wrapper being locked and the wrapped element being removed
bypassing Ql.DOM.Node’s link tracking mechanism (implemented in appendNode(), removeChild(), and so
on). In the last situation (“external deletion”), manual notification of the link destruction is
achieved through a periodic (garbage) collection.

┌────────────────────┬───────────────────────────┬─────────────┐
│ Operation sequence	│ Effect sequence				 │ Collection	│
│ I = insert node		│ I = node inserted			 │ necessary?	│
│ D = delete node		│ D = node deleted			 │					│
│ L = lock wrapper	│ ±L = lock count incr/decr │ (forcibly	│
│ U = unlock wrapper	│ E = enforce lock			 │ relax lock)	│
│ X = external del.	│ R = relax lock				 │					│
├────────────────────┼───────────────────────────┼─────────────┤
│ I						│ I								 │					│
│ I D						│ I D								 │					│
│ I D L					│ I D +L							 │					│
│ I D L U				│ I D +L -L						 │					│
│ I L						│ I (+L E)						 │					│
│ I L D					│ I (+L E) (D R)				 │					│
│ I L D U				│ I (+L E) (D R) -L			 │					│
│ I L U					│ I (+L E) (-L R)				 │					│
│ I L U D				│ I (+L E) (-L R) D			 │					│
│ I L U X				│ I (+L E) (-L R) -			 │					│
│ I L X					│ I (+L E) -					 │		 Yes		│
│ I L X U				│ I (+L E) - (-L R)			 │					│
│ I X						│ I -								 │					│
│ I X L					│ I - +L							 │					│
│ I X L U				│ I - +L -L						 │					│
│ L						│ +L								 │					│
│ L I						│ +L (I E)						 │					│
│ L I D					│ +L (I E) (D R)				 │					│
│ L I D U				│ +L (I E) (D R) -L			 │					│
│ L I U					│ +L (I E) (-L R)				 │					│
│ L I U D				│ +L (I E) (-L R) D			 │					│
│ L I U X				│ +L (I E) (-L R) -			 │					│
│ L I X					│ +L (I E) -					 │		 Yes		│
│ L I X U				│ +L (I E) - (-L R)			 │					│
│ L U						│ +L -L							 │					│
│ L U I					│ +L -L I						 │					│
│ L U I D				│ +L -L I D						 │					│
│ L U I X				│ +L -L I -						 │					│
└────────────────────┴───────────────────────────┴─────────────┘


Instead of document.createElement("table"), the creation of a new element through e.g.
Ql.DOM.document.createElement() involves quite a few more (hidden) steps.

Instantiation by String:
1.	Ql.DOM.document.createElement("table")
2.		elt = this._.createElement("table")
3.		w = Ql.DOM.wrap(elt)
4.			<lookup "table" -> Ql.DOM.TableElement>
5.			w = new Ql.DOM.TableElement()
6.			w._wrap(elt)
7.			return w
8.		return w

Instantiation by class (derived from Ql.DOM.Element only):
1.	Ql.DOM.document.createElement(Ql.DOM.TableElement)
2.		<lookup Ql.DOM.TableElement -> "table">
3.		w = new Ql.DOM.TableElement()
4.		elt = this._.createElement("table")
5.		w._wrap(elt)
6.		return w

Instantiation by class (derived from/implementing Ql.DOM.CompositeElement):
1.	Ql.DOM.document.createElement(CustomTable)
2.		w = new CustomTable()
3.		elt = w._createNew(this)
4.			this._ = doc._createElement("table")
5.			<manipulate this>
6.			return this._
7.		w._wrap(elt)
8.		return w

Automatic instantiation by server-generated markup:
1.	select(<element pattern>)
2.		<for each elt>
3.			w = Ql.DOM.wrap(elt)
4.				<lookup "table" -> Ql.DOM.TableElement>
5.				w = new Ql.DOM.TableElement()
6.				w._wrap(elt)
7.				return w
8.			arr.push(w)
9.		return arr
*/


////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM


/** Namespace for the enhanced DOM object wrappers.
*/
Ql.DOM = {};
Ql.DOM.toString = Function.createToStringMethod("Ql.DOM");

/** Registered wrapper classes: (wrapper class, node name, CSS class). */
Ql.DOM._m_arrWrapperClasses/*:Array(Object*)*/ = [];
/** Existing document wrappers, mapped by the custom id attribute. */
Ql.DOM._m_mapDocWrappers/*:Object(Ql.DOM.Document*)*/ = {};
/** Map from element prefixes into namespace URIs. */
Ql.DOM.namespaces/*:Object(String+)*/ = {
	atom:  "http://www.w3.org/2005/Atom",
	svg:   "http://www.w3.org/2000/svg",
	xhtml: "http://www.w3.org/1999/xhtml",
	xml:   "http://www.w3.org/XML/1998/namespace"
};
/** The current document. Value is assigned as soon as its type is defined. */
Ql.DOM.document/*:Ql.DOM.Document*/ = null;


/** DESIGN_9384 JS: DOM: Static methods

Several Ql.DOM.Node.*() methods have a static counterpart in Ql.DOM._*(), which helps avoiding
wrapping an object when only one method is to be called on it; it also prevents Quearl internal code
from being cluttered by Ql.DOM.wrap() invocations.
*/

/** Finds element wrappers, across all documents, which are marked as being linked, but whose
wrapped element has in fact been unlinked (e.g. by evading Ql.DOM.Node’s methods), and marks them as
unlinked.

return:int
	Number of wrappers that were marked as unlinked.
*/
function $Ql$DOM$_collectWrappers() {
	var cRelaxed = 0;
	for (var sDocId in this._m_mapDocWrappers) {
		var doc = this._m_mapDocWrappers[sDocId],
			 mapLockedElemWrappers = doc._m_mapLockedElemWrappers;
		for (var sId in mapLockedElemWrappers) {
			var elt = mapLockedElemWrappers[sId],
				 eltById = doc._.getElementById(sId);
			// If the wrapper is in the document’s locked wrapper list, but getElementById() can’t find
			// the wrapped element, it has been unlinked: update the wrapper’s linked status.
			if (!eltById || !this._isSameNode(elt._, eltById)) {
				elt._updateLinkedStatus(false);
				++cRelaxed;
			}
		}
	}
	return cRelaxed;
}
Ql.DOM._collectWrappers = $Ql$DOM$_collectWrappers;


/** Static version of Ql.DOM.Element.getAttribute().
*/
function $Ql$DOM$_getAttribute(elt, sName) {
	// Most browsers return null instead of "" for attributes which are not specified for the
	// element.
	var s = elt.getAttribute(sName);
	return s || "";
}
Ql.DOM._getAttribute = $Ql$DOM$_getAttribute;


/** Returns the closest common ancestor to both nodes specified.

nd1:(Node|Ql.DOM.Node)
	First node.
nd2:(Node|Ql.DOM.Node)
	Other node.
return:Ql.DOM.Node
	Closest common ancestor, or null if the two nodes are from different documents.
*/
function $Ql$DOM$getCommonAncestor(nd1, nd2) {
	Function.checkArgs($Ql$DOM$getCommonAncestor, arguments, Object.ANYTYPE, Object.ANYTYPE);
	if (!(nd1 instanceof this.Node)) {
		nd1 = this.wrap(nd1);
	}
	if (!(nd2 instanceof this.Node)) {
		nd2 = this.wrap(nd2);
	}
	if (!nd1.getOwnerDocument().isSameNode(nd2.getOwnerDocument())) {
		// Not in the same document, so no common ancestor.
		return null;
	}
	// Get the full list of ancestors, and then walk it backwards -that is, actually forward- from
	// the root, to nd1/nd2.
	var arrAncestors1 = nd1.getAncestors(),
		 arrAncestors2 = nd2.getAncestors();
	for (
		var i1 = arrAncestors1.length - 1, i2 = arrAncestors2.length - 1;
		i1 >= 0 && i2 >= 0;
		--i1, --i2
	) {
		if (!arrAncestors1[i1].isSameNode(arrAncestors2[i2])) {
			return arrAncestors1[i1 - 1];
		}
	}
	// If we got here, then the two nodes have the very same ancestors, i.e. they’re siblings; so
	// their common ancestor is just their parent.
	return arrAncestors1[0];
}
Ql.DOM.getCommonAncestor = $Ql$DOM$getCommonAncestor;


/** Static version of Ql.DOM.Node.getNodeName().
*/
function $Ql$DOM$_getNodeName(nd) {
	return this._isHtml(nd) ? nd.nodeName.toLowerCase() : nd.nodeName;
}
Ql.DOM._getNodeName = $Ql$DOM$_getNodeName;


/** Static version of Ql.DOM.Node.getNodeType().
*/
function $Ql$DOM$_getNodeType(nd) {
	return nd.nodeType;
}
Ql.DOM._getNodeType = $Ql$DOM$_getNodeType;


/** Static version of Ql.DOM.Node.getOwnerDocument(). A getter is only necessary because of IE5.5
lacking standards support.
*/
function $Ql$DOM$_getOwnerDocument(nd) {
	return nd.ownerDocument;
}
Ql.DOM._getOwnerDocument = $Ql$DOM$_getOwnerDocument;


/** Static version of Ql.DOM.Node.getParentNode(). A getter is only necessary because of IE5.5
having documentRoot.parentNode === null.
*/
function $Ql$DOM$_getParentNode(nd) {
	return nd.parentNode;
}
Ql.DOM._getParentNode = $Ql$DOM$_getParentNode;


/** Static version of Ql.DOM.Element.hasAttribute(). Requires DOM2-Core.
*/
function $Ql$DOM$_hasAttribute(elt, sName) {
	return elt.hasAttribute(sName);
}
Ql.DOM._hasAttribute = $Ql$DOM$_hasAttribute;


/** Static version of Ql.DOM.Element.isCssClass().
*/
function $Ql$DOM$_isCssClass(elt, vClass) {
	var s = " " + this._getAttribute(elt, "class") + " ";
	if (vClass instanceof RegExp) {
		vClass = new RegExp(" " + vClass.source + " ", "i");
		return s.match(vClass) || false;
	}
	return s.indexOf(" " + vClass + " ") != -1;
}
Ql.DOM._isCssClass = $Ql$DOM$_isCssClass;


/** Static version of Ql.DOM.Node.isSameNode().
*/
function $Ql$DOM$_isSameNode(nd1, nd2) {
	return "isSameNode" in nd1 ? nd1.isSameNode(nd2) : nd1 == nd2;
}
Ql.DOM._isSameNode = $Ql$DOM$_isSameNode;


/** Static version of Ql.DOM.Node.isHtml().
*/
function $Ql$DOM$_isHtml(nd) {
	var doc = (nd.nodeType == Node.DOCUMENT_NODE ? nd : nd.ownerDocument),
		 mapQlData = Ql._getData(doc);
	if (!("bHtml" in mapQlData)) {
		var eltRoot = doc.documentElement;
		mapQlData.bHtml = (eltRoot ? eltRoot.nodeName == "HTML" : true);
	}
	return mapQlData.bHtml;
}
Ql.DOM._isHtml = $Ql$DOM$_isHtml;


/** Converts a prefix into a namespace URI.

sPrefix:String
	Prefix.
return:String
	Namespace URI.
*/
function $Ql$DOM$_prefixToNamespace(sPrefix) {
	return this.namespaces[sPrefix] || sPrefix;
}
Ql.DOM._prefixToNamespace = $Ql$DOM$_prefixToNamespace;


/** Registers a Ql.DOM.Node-derived class so that it will be used by Ql.DOM.wrap() whenever elements
of that class are encountered.

cls:Function
	Class to be registered.
sSel:String
	Selector describing the elements that will be wrapped by cls. Not really a complete selector; it
	only accepts the forms:
	•	eltname
	•	eltname.class
	•	input[type=inputtype]
	•	input[type=inputtype].class
*/
function $Ql$DOM$registerWrapperClass(cls, sSel) {
	Function.checkArgs($Ql$DOM$registerWrapperClass, arguments, Function, String);
	var map = {"sel": sSel, "cls": cls}, ich = sSel.indexOf(".");
	if (ich != -1) {
		map["elt"] = sSel.substr(0, ich);
		map["css"] = sSel.substr(ich + 1);
		map["_css_"] = " " + map["css"] + " ";
	} else {
		map["elt"] = sSel;
	}
	this._m_arrWrapperClasses.push(map);
}
Ql.DOM.registerWrapperClass = $Ql$DOM$registerWrapperClass;


/** Static version of Ql.DOM.Element.removeAttribute().
*/
function $Ql$DOM$_removeAttribute(elt, sName) {
	elt.removeAttribute(sName);
}
Ql.DOM._removeAttribute = $Ql$DOM$_removeAttribute;


/** Static version of Ql.DOM.Element.setAttribute().
*/
function $Ql$DOM$_setAttribute(elt, sName, sValue) {
	elt.setAttribute(sName, sValue);
}
Ql.DOM._setAttribute = $Ql$DOM$_setAttribute;


/** Returns an enhanced DOM wrapper for an element.

nd:Node
	Node to be wrapped.
return:Ql.DOM.Node
	Wrapped node.
*/
function $Ql$DOM$wrap(nd) {
	Function.checkArgs($Ql$DOM$wrap, arguments, Object.ANYTYPE);
	switch (this._getNodeType(nd)) {
		case Node.ELEMENT_NODE:
			var doc = this.wrap(this._getOwnerDocument(nd));
			var sId = nd.getAttribute("id");
			if (sId && sId in doc._m_mapLockedElemWrappers) {
				// A wrapper exists: return it.
				nd = doc._m_mapLockedElemWrappers[sId];
			} else {
				// Create a new wrapper, and map the (possibly new) id to it.
				nd = (new (this.wrapperClassFor(nd))())._wrap(nd);
			}
			break;

		case Node.DOCUMENT_NODE:
			var mapQlData = Ql._getData(nd);
			if ("sId" in mapQlData && this._m_mapDocWrappers[mapQlData.sId]) {
				// A wrapper exists: return it.
				nd = this._m_mapDocWrappers[mapQlData.sId];
			} else {
				nd = (new this.Document())._wrap(nd);
			}
			break;

		case Node.TEXT_NODE:
			// Create a new wrapper for the node.
			nd = (new this.Text())._wrap(nd);
			break;

		case Node.DOCUMENT_FRAGMENT_NODE:
			// Create a new wrapper for the node.
			nd = (new this.DocumentFragment())._wrap(nd);
			break;

		default:
			throw new TypeError("Wrappers not implemented for nodeType " + this._getNodeType(nd));
	}
	return nd;
}
Ql.DOM.wrap = $Ql$DOM$wrap;


/** Finds out which wrapper class best models an element.

elt:Element
	Node to be wrapped.
return:Function
	Wrapper class.
*/
function $Ql$DOM$wrapperClassFor(elt) {
	Function.checkArgs($Ql$DOM$wrapperClassFor, arguments, Object.ANYTYPE);
	var sName = this._getNodeName(elt);
	if (sName == "input") {
		sName += "[type=" + this._getAttribute(elt, "type") + "]";
	}
	var sCssClass = " " + this._getAttribute(elt, "class") + " ";
	// Enumerate the array backwards, so that lastly registered (most derived) classes are considered
	// first.
	for (var arrWClasses = this._m_arrWrapperClasses, i = arrWClasses.length - 1; i >= 0; --i) {
		var mapWClass = arrWClasses[i];
		if (mapWClass["elt"] == sName) {
			if ("css" in mapWClass && sCssClass.indexOf(mapWClass["_css_"]) == -1) {
				continue;
			}
			return mapWClass["cls"];
		}
	}
	return this.Element;
}
Ql.DOM.wrapperClassFor = $Ql$DOM$wrapperClassFor;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Node


/** Wrapper for DOM1-Core.Node.
*/
function $Ql$DOM$Node() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Node, arguments);
}
Ql.DOM.Node = $Ql$DOM$Node;

/** Wrapped node. */
Ql.DOM.Node.prototype._/*:Node*/ = null;


/** See DOM1-Core.Node.appendChild().
*/
function $Ql$DOM$Node$appendChild(nd) {
	Function.checkArgs($Ql$DOM$Node$appendChild, arguments, Ql.DOM.Node);
	this._.appendChild(nd._);
	if (nd instanceof Ql.DOM.Element) {
		nd._updateLinkedStatus(true);
	}
	return nd;
}
Ql.DOM.Node.prototype.appendChild = $Ql$DOM$Node$appendChild;


/** Returns an array containing the ancestor nodes (document included), ordered from the closest to
the most remote.

return:Array(Node*)
	Array of ancestor nodes.
*/
function $Ql$DOM$Node$getAncestors() {
	Function.checkArgs($Ql$DOM$Node$getAncestors, arguments);
	var arr = [];
	for (var nd = this._; nd = Ql.DOM._getParentNode(nd); ) {
		arr.push(Ql.DOM.wrap(nd));
	}
	return arr;
}
Ql.DOM.Node.prototype.getAncestors = $Ql$DOM$Node$getAncestors;


/** See DOM1-Core.Node.firstChild.
*/
function $Ql$DOM$Node$getFirstChild() {
	Function.checkArgs($Ql$DOM$Node$getFirstChild, arguments);
	var nd = this._.firstChild;
	return nd && Ql.DOM.wrap(nd);
}
Ql.DOM.Node.prototype.getFirstChild = $Ql$DOM$Node$getFirstChild;


/** Returns the index of this node in its parent’s childNodes collection, or 0 if the element has no
parent.

return:int
	Index of the node.
*/
function $Ql$DOM$Node$getIndex() {
	Function.checkArgs($Ql$DOM$Node$getIndex, arguments);
	var eltThis = this._, ndParent = Ql.DOM._getParentNode(eltThis);
	if (!ndParent) {
		return 0;
	}
	var nlChildNodes = ndParent.childNodes;
	// Scan the children list from both ends, looking for eltThis.
	for (var iPrev = 0, iNext = nlChildNodes.length - 1; ; ++iPrev, --iNext) {
		if (Ql.DOM._isSameNode(nlChildNodes[iPrev], eltThis)) {
			return iPrev;
		}
		if (Ql.DOM._isSameNode(nlChildNodes[iNext], eltThis)) {
			return iNext;
		}
	}
}
Ql.DOM.Node.prototype.getIndex = $Ql$DOM$Node$getIndex;


/** See DOM1-Core.Node.lastChild.
*/
function $Ql$DOM$Node$getLastChild() {
	Function.checkArgs($Ql$DOM$Node$getLastChild, arguments);
	var nd = this._.lastChild;
	return nd && Ql.DOM.wrap(nd);
}
Ql.DOM.Node.prototype.getLastChild = $Ql$DOM$Node$getLastChild;


/** See DOM1-Core.Node.nextSibling.
*/
function $Ql$DOM$Node$getNextSibling() {
	Function.checkArgs($Ql$DOM$Node$getNextSibling, arguments);
	var nd = this._.nextSibling;
	return nd && Ql.DOM.wrap(nd);
}
Ql.DOM.Node.prototype.getNextSibling = $Ql$DOM$Node$getNextSibling;


/** See DOM1-Core.Node.nodeName. A getter is only necessary because of IE5.5/IE6/IE7/IE8, since they
won’t accept application/xhtml+xml, and thus will convert all tags to uppercase because it’s
text/html. This version is for browsers that do accept XHTML.

return:String
	Name of the node.
*/
function $Ql$DOM$Node$getNodeName() {
	Function.checkArgs($Ql$DOM$Node$getNodeName, arguments);
	return Ql.DOM._getNodeName(this._);
}
Ql.DOM.Node.prototype.getNodeName = $Ql$DOM$Node$getNodeName;


/** See DOM1-Core.Node.nodeType. A getter is only necessary because of IE5.5 having issues with
comment and document nodes.

return:String
	Name of the node.
*/
function $Ql$DOM$Node$getNodeType() {
	Function.checkArgs($Ql$DOM$Node$getNodeType, arguments);
	return Ql.DOM._getNodeType(this._);
}
Ql.DOM.Node.prototype.getNodeType = $Ql$DOM$Node$getNodeType;


/** See DOM1-Core.Node.ownerDocument.
*/
function $Ql$DOM$Node$getOwnerDocument() {
	Function.checkArgs($Ql$DOM$Node$getOwnerDocument, arguments);
	return Ql.DOM.wrap(Ql.DOM._getOwnerDocument(this._));
}
Ql.DOM.Node.prototype.getOwnerDocument = $Ql$DOM$Node$getOwnerDocument;


/** See DOM1-Core.Node.parentNode.
*/
function $Ql$DOM$Node$getParentNode() {
	Function.checkArgs($Ql$DOM$Node$getParentNode, arguments);
	var nd = Ql.DOM._getParentNode(this._);
	return nd && Ql.DOM.wrap(nd);
}
Ql.DOM.Node.prototype.getParentNode = $Ql$DOM$Node$getParentNode;


/** See DOM1-Core.Node.previousSibling.
*/
function $Ql$DOM$Node$getPreviousSibling() {
	Function.checkArgs($Ql$DOM$Node$getPreviousSibling, arguments);
	var nd = this._.previousSibling;
	return nd && Ql.DOM.wrap(nd);
}
Ql.DOM.Node.prototype.getPreviousSibling = $Ql$DOM$Node$getPreviousSibling;


/** See DOM1-Core.Node.hasChildNodes().
*/
function $Ql$DOM$Node$hasChildNodes() {
	Function.checkArgs($Ql$DOM$Node$hasChildNodes, arguments);
	this._.hasChildNodes();
}
Ql.DOM.Node.prototype.hasChildNodes = $Ql$DOM$Node$hasChildNodes;


/** See DOM1-Core.Node.insertBefore().
*/
function $Ql$DOM$Node$insertBefore(nd, ndNext) {
	Function.checkArgs($Ql$DOM$Node$insertBefore, arguments, Ql.DOM.Node, [null, Ql.DOM.Node]);
	this._.insertBefore(nd._, ndNext && ndNext._);
	if (nd instanceof Ql.DOM.Element) {
		nd._updateLinkedStatus(true);
	}
	return nd;
}
Ql.DOM.Node.prototype.insertBefore = $Ql$DOM$Node$insertBefore;


/** Returns true if this node is a descendant node of the one specified.

ndAncestor:Ql.DOM.Node
	Node to be checked for ancestorship.
return:bool
	true if o is an ancestor of this.
*/
function $Ql$DOM$Node$isDescendantOf(ndAncestor) {
	Function.checkArgs($Ql$DOM$Node$isDescendantOf, arguments, Ql.DOM.Node);
	ndAncestor = ndAncestor._;
	for (var nd = this._; nd = Ql.DOM._getParentNode(nd); ) {
		if (Ql.DOM._isSameNode(nd, ndAncestor)) {
			return true;
		}
	}
	return false;
}
Ql.DOM.Node.prototype.isDescendantOf = $Ql$DOM$Node$isDescendantOf;


/** Returns true if the document to which the node is attached (or the document itself, if a
Ql.DOM.Document) is HTML, false otherwise (XML). The result of the check is cached on a Document
basis.

return:bool
	true if HTML, false otherwise.
*/
function $Ql$DOM$Node$isHtml() {
	Function.checkArgs($Ql$DOM$Node$isHtml, arguments);
	return Ql.DOM._isHtml(this._);
}
Ql.DOM.Node.prototype.isHtml = $Ql$DOM$Node$isHtml;


/** See DOM3-Core.Node.isSameNode().
*/
function $Ql$DOM$Node$isSameNode(nd2) {
	Function.checkArgs($Ql$DOM$Node$isSameNode, arguments, Ql.DOM.Node);
	return Ql.DOM._isSameNode(this._, nd2._);
}
Ql.DOM.Node.prototype.isSameNode = $Ql$DOM$Node$isSameNode;


/** Returns the contents of any text nodes and input elements. Similar to
DOM3-Core.Node.textContent, but more thorough. No new lines will be returned.

return:String
	Concatenated contents of any text elements contained in the element.
*/
Ql.DOM.Node.prototype.getTextContent = Function.Abstract;


/** See DOM1-Core.Node.removeChild().
*/
function $Ql$DOM$Node$removeChild(nd) {
	Function.checkArgs($Ql$DOM$Node$removeChild, arguments, Ql.DOM.Node);
	this._.removeChild(nd._);
	if (nd instanceof Ql.DOM.Element) {
		nd._updateLinkedStatus(false);
	}
}
Ql.DOM.Node.prototype.removeChild = $Ql$DOM$Node$removeChild;


/** See DOM1-Core.Node.replaceChild().
*/
function $Ql$DOM$Node$replaceChild(ndNew, ndOld) {
	Function.checkArgs($Ql$DOM$Node$replaceChild, arguments, Ql.DOM.Node, Ql.DOM.Node);
	this._.replaceChild(ndNew._, ndOld._);
	if (ndOld instanceof Ql.DOM.Element) {
		ndOld._updateLinkedStatus(false);
	}
	if (ndNew instanceof Ql.DOM.Element) {
		ndNew._updateLinkedStatus(true);
	}
}
Ql.DOM.Node.prototype.replaceChild = $Ql$DOM$Node$replaceChild;


/** Returns the first ancestor node matching the specified selector. See [DESIGN_1138 JS:
Ql.SelectorEval.evaluateUp()] for details on the supported subset of the Selectors 1 API syntax.

TODO: namespace support!

sSel:String
	Selector to be matched.
return:Ql.DOM.Node
	The matching node, or null.
*/
function $Ql$DOM$Node$selectAncestor(sSel) {
	Function.checkArgs($Ql$DOM$Node$selectAncestor, arguments, String);
	return (new Ql.SelectorEval()).evaluateUp(this, sSel);
}
Ql.DOM.Node.prototype.selectAncestor = $Ql$DOM$Node$selectAncestor;


/** See DOM3-Core.Node.textContent.

s:String
	Text that will replace any current contents of the node, or null to just empty the node.
*/
Ql.DOM.Node.prototype.setTextContent = Function.Abstract;


/** Removes the node from its parent’s children, effectively unlinking it from the DOM tree.
*/
function $Ql$DOM$Node$unlink() {
	Function.checkArgs($Ql$DOM$Node$unlink, arguments);
	var ndParent = this.getParentNode();
	if (ndParent) {
		ndParent.removeChild(this);
	}
}
Ql.DOM.Node.prototype.unlink = $Ql$DOM$Node$unlink;


/** Binds the wrapper to a node.

nd:Node
	Node to be wrapped.
return:Ql.DOM.Node
	this.
*/
function $Ql$DOM$Node$_wrap(nd) {
	this._ = nd;
	return this;
}
Ql.DOM.Node.prototype._wrap = $Ql$DOM$Node$_wrap;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.DocumentFragment


/** Wrapper for DOM1-Core.DocumentFragment.
*/
function $Ql$DOM$DocumentFragment() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$DocumentFragment, arguments);
	Ql.DOM.Node.call(this);
}
Ql.DOM.DocumentFragment = $Ql$DOM$DocumentFragment;
Ql.DOM.DocumentFragment.inheritFrom(Ql.DOM.Node);
Ql.DOM.DocumentFragment.prototype.toString =
	Function.createToStringMethod("Ql.DOM.DocumentFragment");



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Dokelement


/** Union of the common parts of DOM1-Core.Document and DOM1-Core.Element with
Selectors1.NodeSelector; only used as a base class.

(Dokelement is a portmanteau of Document and Element.)
*/
function $Ql$DOM$Dokelement() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Dokelement, arguments);
	Ql.DOM.Node.call(this);
	Ql.EventTarget.call(this);
}
Ql.DOM.Dokelement = $Ql$DOM$Dokelement;
Ql.DOM.Dokelement.inheritFrom(Ql.DOM.Node);
Ql.DOM.Dokelement.augmentWith(Ql.EventTarget);

/** Browser built-in lists of descendant DOM elements. It should be static, but needs to be
overridden by derived classes. */
Ql.DOM.Dokelement.prototype._sm_mapBuiltinLists/*:Object(String*)*/ = {};


/** See DOM1-Core.Document.getElementsByTagName() and DOM1-Core.Element.getElementsByTagName().
*/
function $Ql$DOM$Dokelement$_getElementsByTagName(sName) {
	Function.checkArgs($Ql$DOM$Dokelement$_getElementsByTagName, arguments, String);
	var nl;
	if (sName in this._sm_mapBuiltinLists) {
		nl = this._[this._sm_mapBuiltinLists[sName]];
	} else {
		nl = this._.getElementsByTagName(this.isHtml() ? sName.toUpperCase() : sName);
	}
	return nl;
}
Ql.DOM.Dokelement.prototype._getElementsByTagName = $Ql$DOM$Dokelement$_getElementsByTagName;


/** See Ql.DOM.Node.getTextContent().
*/
function $Ql$DOM$Dokelement$getTextContent() {
	Function.checkArgs($Ql$DOM$Dokelement$getTextContent, arguments);
	// "TODO: break" means that getTextContent should really return an additional value specifying
	// whether the element is to be separate (by e.g. a space) from its surrounding elements.
	var s = "";
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeType(nd)) {
			case Node.TEXT_NODE:
			case Node.CDATA_NODE:
				s += nd.nodeValue + " ";
				break;

			case Node.DOCUMENT_NODE:
			case Node.ELEMENT_NODE:
				s += Ql.DOM.wrap(nd).getTextContent() + " ";
				break;
		}
	}
	// Collapse whitespace and newlines.
	return s.replace(/[\t\n\f\r ]+/g, " ");
}
Ql.DOM.Dokelement.prototype.getTextContent = $Ql$DOM$Dokelement$getTextContent;


/** Evaluates a selector-like expression. See the documentation of the implementation, [DESIGN_1136
JS: Ql.SelectorEval.evaluate()], for more information and for the supported syntax.

sSel:String
	Selector to be evaulated.
return:Array(Ql.DOM.Element*)
	Array of matching elements.
*/
function $Ql$DOM$Dokelement$select(sSel) {
	Function.checkArgs($Ql$DOM$Dokelement$select, arguments, String);
	return (new Ql.SelectorEval()).evaluate(this, sSel);
}
Ql.DOM.Dokelement.prototype.select = $Ql$DOM$Dokelement$select;


/** See Ql.DOM.Node.setTextContent().
*/
function $Ql$DOM$Dokelement$setTextContent(s) {
	Function.checkArgs($Ql$DOM$Dokelement$setTextContent, arguments, [null, String]);
	var eltThis = this._;
	if ("textContent" in eltThis) {
		eltThis.textContent = s;
	} else {
		// Remove every child node.
		for (var nd; nd = eltThis.firstChild; ) {
			// TODO: ?
			eltThis.removeChild(nd);
		}
		if (s) {
			eltThis.appendChild(Ql.DOM._getOwnerDocument(eltThis).createTextNode(s));
		}
	}
}
Ql.DOM.Dokelement.prototype.setTextContent = $Ql$DOM$Dokelement$setTextContent;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Document


/** Wrapper for DOM1-Core.Document and DOM1-HTML.HTMLDocument.
*/
function $Ql$DOM$Document() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Document, arguments);
	Ql.DOM.Dokelement.call(this);
	this._m_mapLockedElemWrappers = {};
}
Ql.DOM.Document = $Ql$DOM$Document;
Ql.DOM.Document.inheritFrom(Ql.DOM.Dokelement);
Ql.DOM.Document.prototype.toString = Function.createToStringMethod("Ql.DOM.Document");

/** Locked wrappers, mapped by the elements’ id attribute. */
Ql.DOM.Document.prototype._m_mapLockedElemWrappers/*:Object(Ql.DOM.Element*)*/ = null;
/** Unique number to be used to generate the next automatic element id. */
Ql.DOM.Document.prototype._m_iNextElemAutoId/*:int*/ = 1;
/** See Ql.DOM.Dokelement._sm_mapBuiltinLists. */
Ql.DOM.Document.prototype._sm_mapBuiltinLists/*:Object(String*)*/ = {
	"a":    "links",
	"form": "forms",
	"img":  "images"
};


/** DESIGN_8067 JS: DOM: Page loading events

With Quearl, two distinct “page loaded” events are provided: earlyload and lateload. Both are fired
by the Ql.DOM.document object, and occur at two possibly different page loading stages; their order
is guaranteed to be earlyload first, lateload last.

The earlyload event is fired as soon as the DOM tree has been fully loaded from the markup, and is
ready to be manipulated; this is the same as DOMContentLoaded from DOM2-Events. This means that
media may be missing, but it also usually means that any changes to the document tree will be
applied before the page is rendered, therefore without affecting the user experience.

The lateload event on the other hand, is fired only when all media referenced by the page (images,
style sheets) have been loaded, even though this probably means that the page will have already been
partially or fully rendered.

In practice, the earlyload event should be used in most cases, except when a script actually needs
to perform computations based on the final rendered page, e.g. accessing an external image’s size,
or requesting a computed CSS property value.
*/

/** Notifies that the DOM tree is completely loaded and usable, and every Ql module has been
initialized; see [DESIGN_8067 JS: DOM: Page loading events] for more details. */
Ql.EventTarget.declareEvent(Ql.DOM.Document, "earlyload");

/** Notifies that the page is completely loaded, including external entities; see [DESIGN_8067 JS:
DOM: Page loading events] for more details. */
Ql.EventTarget.declareEvent(Ql.DOM.Document, "lateload");


/** See DOM1-Core.Document.createAttribute().
*/
function $Ql$DOM$Document$createAttribute(sName) {
	Function.checkArgs($Ql$DOM$Document$createAttribute, arguments, String);
	return this._.createAttribute(sName);
}
Ql.DOM.Document.prototype.createAttribute = $Ql$DOM$Document$createAttribute;


/** See DOM1-Core.Document.createCDATASection().
*/
function $Ql$DOM$Document$createCDATASection(sText) {
	Function.checkArgs($Ql$DOM$Document$createCDATASection, arguments, String);
	return this._.createCDATASection(sText);
}
Ql.DOM.Document.prototype.createCDATASection = $Ql$DOM$Document$createCDATASection;


/** See DOM1-Core.Document.createComment().
*/
function $Ql$DOM$Document$createComment(sText) {
	Function.checkArgs($Ql$DOM$Document$createComment, arguments, String);
	return this._.createComment(sText);
}
Ql.DOM.Document.prototype.createComment = $Ql$DOM$Document$createComment;


/** See DOM1-Core.Document.createDocumentFragment().
*/
function $Ql$DOM$Document$createDocumentFragment() {
	Function.checkArgs($Ql$DOM$Document$createDocumentFragment, arguments);
	return this._.createDocumentFragment();
}
Ql.DOM.Document.prototype.createDocumentFragment = $Ql$DOM$Document$createDocumentFragment;


/** See DOM1-Core.Document.createElement(). It also accepts classes, as element name specifiers.

vName:(String|Function)
	Either a String, containing the name of the element to be created, or a class (Function), of
	which an instance will be created.
return:Ql.DOM.Element
	Newly created element.
*/
function $Ql$DOM$Document$createElement(vName) {
	Function.checkArgs($Ql$DOM$Document$createElement, arguments, [String, Function]);
	if (vName instanceof Function) {
		return Ql.DOM.wrap(this._createElement(vName));
	}
	// This if is equivalent to:
	// (vName.prototype instanceof Ql.DOM.CompositeElement)
	if (vName.prototype._createNew) {
		var elt = new vName();
		return elt._wrap(elt._createNew(this));
	} else {
		// Wrapper for a non-composite element type, no need for an external helper.
		for (
			var arrWClasses = Ql.DOM._m_arrWrapperClasses, i = 0, c = arrWClasses.length;
			i < c;
			++i
		) {
			var mapWClass = arrWClasses[i];
			if (mapWClass["cls"] === vName) {
				var elt = (new vName())._wrap(this._createElement(mapWClass["elt"]));
				if ("css" in mapWClass) {
					elt.addCssClass(mapWClass["css"]);
				}
				return elt;
			}
		}
		throw new Exception("Unable to instantiate elements of a generic name");
	}
}
Ql.DOM.Document.prototype.createElement = $Ql$DOM$Document$createElement;


/** See DOM1-Core.Document.createElement(). This is for use by element classes, and behaves more
like the standard (i.e. accepts strings only).

sName:String
	Name of the element to be created.
return:Element
	Newly created element, unwrapped.
*/
function $Ql$DOM$Document$_createElement(sName) {
	var elt;
	if (sName.substr(0, 11) == "input[type=") {
		elt = this._.createElement("input");
		var sInputType = sName.substring(11 /*"input[type="*/, sName.length - 1 /*"]"*/);
		elt.setAttribute("type", sInputType);
	} else {
		elt = this._.createElement(sName);
	}
	return elt;
}
Ql.DOM.Document.prototype._createElement = $Ql$DOM$Document$_createElement;


/** See DOM1-Core.Document.createEntityReference().
*/
function $Ql$DOM$Document$createEntityReference(sName) {
	Function.checkArgs($Ql$DOM$Document$createEntityReference, arguments, String);
	return this._.createEntityReference && this._.createEntityReference(sName);
}
Ql.DOM.Document.prototype.createEntityReference = $Ql$DOM$Document$createEntityReference;


/** See DOM2-Events.DocumentEvent.createEvent().
*/
function $Ql$DOM$Document$createEvent(sEventGroup) {
	Function.checkArgs($Ql$DOM$Document$createEvent, arguments, String);
	return this._.createEvent(sEventGroup);
}
Ql.DOM.Document.prototype.createEvent = $Ql$DOM$Document$createEvent;


// FIXME Crea un elemento del tipo specificato con le proprietà richeste ed i nodi
// figli specificati (dal 3° parametro in poi). Al posto di un nome di
// elemento, è possibile specificarne uno già esistente, o indicare una classe
// Javascript da istanziare.
//
function $Ql$DOM$Document$createSubtree(vElemType, mapProps /*= {}, …*/) {
	if (!(vElemType instanceof Ql.DOM.Node)) {
		vElemType = this.createElement(vElemType);
	}
	if (mapProps) {
		for (var sProp in mapProps) {
			if (sProp == "style") {
				vElemType.style.cssText = mapProps[sProp];
			} else if (mapProps[sProp] instanceof Function) {
				vElemType.addEventListener(sProp, mapProps[sProp], false);
			} else {
				vElemType.setAttribute(sProp, mapProps[sProp]);
			}
		}
	}
	for (var i = 2; i < arguments.length; ++i) {
		var vChild = arguments[i];
		if (vChild) {
			vElemType.appendChild(
				vChild instanceof Array
					? this.createSubtree.apply(this, vChild)
					: this.createTextNode(vChild)
			);
		}
	}
	return vElemType;
}
Ql.DOM.Document.prototype.createSubtree = $Ql$DOM$Document$createSubtree;


/** See DOM1-Core.Document.createTextNode().
*/
function $Ql$DOM$Document$createTextNode(sText) {
	Function.checkArgs($Ql$DOM$Document$createTextNode, arguments, String);
	return Ql.DOM.wrap(this._.createTextNode(sText));
}
Ql.DOM.Document.prototype.createTextNode = $Ql$DOM$Document$createTextNode;


/** See DOM1-Core.Document.createProcessingInstruction().
*/
function $Ql$DOM$Document$createProcessingInstruction(sType, sText) {
	Function.checkArgs($Ql$DOM$Document$createProcessingInstruction, arguments, String, String);
	return this._.createProcessingInstruction(sType, sText);
}
Ql.DOM.Document.prototype.createProcessingInstruction =
	$Ql$DOM$Document$createProcessingInstruction;


/** See DOM1-HTML.HTMLDocument.body. This also works in XHTML mode, in which HTMLDocument may or may
not be implemented.

return:Ql.DOM.Element
	The body element of the document, if any.
*/
function $Ql$DOM$Document$getBody() {
	Function.checkArgs($Ql$DOM$Document$getBody, arguments);
	var elt = this._.body;
	if (!elt) {
		for (var elt = this._.documentElement.lastChild; elt; elt = elt.previouslySibling) {
			if (Ql.DOM._getNodeName(elt) == "body") {
				break;
			}
		}
	}
	return elt && Ql.DOM.wrap(elt);
}
Ql.DOM.Document.prototype.getBody = $Ql$DOM$Document$getBody;


/** See DOM1-Core.Document.documentElement.
*/
function $Ql$DOM$Document$getDocumentElement() {
	Function.checkArgs($Ql$DOM$Document$getDocumentElement, arguments);
	return Ql.DOM.wrap(this._.documentElement);
}
Ql.DOM.Document.prototype.getDocumentElement = $Ql$DOM$Document$getDocumentElement;


/** See Ql.DOM.Node.getOwnerDocument().
*/
function $Ql$DOM$Document$getOwnerDocument() {
	Function.checkArgs($Ql$DOM$Document$getOwnerDocument, arguments);
	return null;
}
Ql.DOM.Document.prototype.getOwnerDocument = $Ql$DOM$Document$getOwnerDocument;


/** See DOM2-Core.Document.importNode().
*/
function $Ql$DOM$Document$importNode(nd, bAllChildren) {
	Function.checkArgs($Ql$DOM$Document$importNode, arguments, Ql.DOM.Node, Boolean);
	return Ql.DOM.wrap(this._importNode(nd._, bAllChildren));
}
Ql.DOM.Document.prototype.importNode = $Ql$DOM$Document$importNode;


/** Wrapper required for alternative implementations. Requires DOM2-Core.
*/
function $Ql$DOM$Document$_importNode(nd, bAllChildren) {
	return this._.importNode(nd, bAllChildren);
}
Ql.DOM.Document.prototype._importNode = $Ql$DOM$Document$_importNode;


/** See Ql.DOM.Node.isHtml(). This is faster, since it already knows that this is a document, and
bHtml has already been initialized when the document was wrapped.
*/
function $Ql$DOM$Document$isHtml() {
	Function.checkArgs($Ql$DOM$Document$isHtml, arguments);
	return Ql._getData(this._).bHtml;
}
Ql.DOM.Document.prototype.isHtml = $Ql$DOM$Document$isHtml;


/** Creates a randomized unique id.

sName:String
	Name of the element. It will be part of the generated id.
return:String
	New unique id.
*/
function $Ql$DOM$Document$_mkAutoId(sName) {
	Function.checkArgs($Ql$DOM$Document$_mkAutoId, arguments, String);
	var s = "_ql_autoid_" + sName + "_" + this._m_iNextElemAutoId++;
	// This should only occur after over 4 billions of generated ids.
	while (this._.getElementById(s)) {
		var i = this._m_iNextElemAutoId = Math.floor(Math.random() * Number.INT_MAX);
		s = "_ql_autoid_" + sName + "_" + i;
	}
	return s;
}
Ql.DOM.Document.prototype._mkAutoId = $Ql$DOM$Document$_mkAutoId;


/** Discard this wrapper, effective immediately. Variables referencing this should be assigned null
as soon as possible.
*/
function $Ql$DOM$Element$releaseWrapper() {
	Function.checkArgs($Ql$DOM$Element$releaseWrapper, arguments);
	var mapQlData = Ql._getData(this._), sId = mapQlData.sId;
	delete Ql.DOM._m_mapDocWrappers[sId];
}
Ql.DOM.Document.prototype.releaseWrapper = $Ql$DOM$Element$releaseWrapper;


/** See Ql.DOM.Node._wrap(). It also adds this wrapper to the global Document wrappers map.
*/
function $Ql$DOM$Element$_wrap(doc) {
	var vRet = Ql.DOM.Node.prototype._wrap.call(this, doc);
	// Side effect here.
	Ql.DOM._isHtml(doc);
	var mapQlData = Ql._getData(doc), sId = mapQlData.sId;
	if (!sId) {
		// Create a unique randomized id, and assign it to the document.
		do {
			sId = Math.floor(Math.random() * Number.INT_MAX).toString();
		} while (sId in Ql.DOM._m_mapDocWrappers);
		mapQlData.sId = sId;
	}
	Ql.DOM._m_mapDocWrappers[sId] = this;
	return vRet;
}
Ql.DOM.Document.prototype._wrap = $Ql$DOM$Element$_wrap;


/** Creates every applicable Ql.DOM.CompositeElement-derived wrapper for each node in the document.
*/
function $Ql$DOM$Document$_wrapWholeTree() {
	// The order of iteration doesn’t really matter, since on each of the returned items,
	// Ql.DOM.wrap() will be invoked individually, using the proper wrapper/element matching
	// algorithm regardless.
	for (
		var arrWClasses = Ql.DOM._m_arrWrapperClasses, i = 0, c = arrWClasses.length; i < c; ++i
	) {
		var mapWClass = arrWClasses[i];
		// This if is equivalent to:
		// (mapWClass["cls"].prototype instanceof Ql.DOM.CompositeElement)
		if (mapWClass["cls"].prototype._createNew) {
			this.select(mapWClass["sel"]);
		}
	}
}
Ql.DOM.Document.prototype._wrapWholeTree = $Ql$DOM$Document$_wrapWholeTree;


// Now it’s possible to set this up. Note: functions like Ql.DOM._isHtml() don’t work in IE at this
// point, so a stripped version of (new Ql.DOM.Document())._wrap(document) is executed here.
Ql.DOM.document = (function(doc) {
	Ql.DOM.Node.prototype._wrap.call(this, doc);
	var mapQlData = Ql._getData(doc);
	mapQlData.bHtml = (doc.documentElement.nodeName == "HTML");
	mapQlData.sId = "main_document";
	Ql.DOM._m_mapDocWrappers[mapQlData.sId] = this;
	return this;
}).call(new Ql.DOM.Document(), document);



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Element


/** Wrapper for DOM1-Core.Element and DOM1-HTML.HTMLElement.
*/
function $Ql$DOM$Element() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Element, arguments);
	Ql.DOM.Dokelement.call(this);
}
Ql.DOM.Element = $Ql$DOM$Element;
Ql.DOM.Element.inheritFrom(Ql.DOM.Dokelement);

/** To use a single .toString() method across all the inheritance chain. */
Ql.DOM.Element.prototype._sClassName/*:String*/ = "Ql.DOM.Element";
/** true if the wrapped element is part of the tree (so locks on the wrapper are to be enforced). */
Ql.DOM.Element.prototype._m_bLinked/*:bool*/ = false;
/** Number of locks on the wrapper, making it non-temporary. */
Ql.DOM.Element.prototype._m_cLocks/*:int*/ = 0;


/** Applies a CSS class to the element.

sClass:String
	CSS class name.
return:String
	New value for the class attribute of the element.
*/
function $Ql$DOM$Element$addCssClass(sClass) {
	Function.checkArgs($Ql$DOM$Element$addCssClass, arguments, String);
	var sPrevClass = Ql.DOM._getAttribute(this._, "class");
	if (sPrevClass && (" " + sPrevClass + " ").indexOf(" " + sClass + " ") == -1) {
		sClass = sPrevClass + " " + sClass;
	}
	Ql.DOM._setAttribute(this._, "class", sClass);
	return sClass;
}
Ql.DOM.Element.prototype.addCssClass = $Ql$DOM$Element$addCssClass;


/** See Ql.Dokelement.addEventListener().
*/
function $Ql$DOM$Element$addEventListener(sEventType, fnCallback, bCapture) {
	Function.checkArgs($Ql$DOM$Element$addEventListener, arguments, String, Function, Boolean);
	Ql.EventTarget.prototype.addEventListener.call(this, sEventType, fnCallback, bCapture);
	this.lockWrapper();
}
Ql.DOM.Element.prototype.addEventListener = $Ql$DOM$Element$addEventListener;


/** Adds a shadow effect using the predefined template.

return:Ql.DOM.Element
	this.
*/
function $Ql$DOM$Element$appendShadow() {
	Function.checkArgs($Ql$DOM$Element$appendShadow, arguments);
	if ("Shadow" in Ql._mapXhtmlTemplates) {
		this._.innerHTML += Ql._mapXhtmlTemplates["Shadow"];
	}
	return this;
}
Ql.DOM.Element.prototype.appendShadow = $Ql$DOM$Element$appendShadow;


/** Converts all text nodes and non-link elements into links.

[fnListener:Function]
	Handler for the click event.
[sHref:String]
	Target URI. Defaults to "#".
[sToolTip:String]
	Hint text for the links.
return:Ql.DOM.Element
	this.
*/
function $Ql$DOM$Element$convertTextNodesToLinks(
	fnListener /*= null*/, sHref /*= "#"*/, sToolTip /*= ""*/
) {
	Function.checkArgs(
		$Ql$DOM$Element$convertTextNodesToLinks, arguments,
		[Function, null, undefined], [String, null, undefined], [String, null, undefined]
	);
	for (var nd = this.getFirstChild(), ndNext; nd; nd = ndNext) {
		ndNext = nd.getNextSibling();
		if (nd instanceof Ql.DOM.Text) {
			if (!nd.getTextContent().isWhitespace()) {
				// Replace the text node with a sort link containing it.
				var a = this.getOwnerDocument().createElement("a");
				a.setAttribute("href", sHref || "#");
				if (sToolTip) {
					a.setAttribute("title", sToolTip);
				}
				if (fnListener) {
					a.addEventListener("click", fnListener, false);
				}
				this.replaceChild(a, nd);
				a.appendChild(nd);
			}
		} else if (nd instanceof Ql.DOM.Element) {
			if (nd.getNodeName() != "a") {
				nd.convertTextNodesToLinks(fnListener, sHref, sToolTip);
			}
		}
	}
	return this;
}
Ql.DOM.Element.prototype.convertTextNodesToLinks = $Ql$DOM$Element$convertTextNodesToLinks;


/** Copies the specified styles from a source element. Requires DOM2-Style.

TODO: most browsers won’t compute the height value for a display: block element, and IE just has no
getComputedStyle, so it’s in an even worse condition; they all need some kind of cascaded resolver.

A few interesting links:
•	<http://ajaxian.com/archives/computed-vs-cascaded-style>
•	<http://erik.eae.net/archives/2007/07/27/18.54.15/>
•	<http://www.howtocreate.co.uk/tutorials/javascript/domcss>

eltSrc:Ql.DOM.Element
	Source element.
bForce:bool
	If true, the property will be copied even if the source element doesn’t define it (so, the
	default for the source element is copied).
arrStyles:Array(String*)
	CSS attributes to be copied.
*/
function $Ql$DOM$Element$copyStylesFrom(eltSrc, bForce, arrStyles) {
	Function.checkArgs($Ql$DOM$Element$copyStylesFrom, arguments, Ql.DOM.Element, Boolean, Array);
	var eltThis = this._, csssdSrc, csssdDst = eltThis.style;
	if (bForce) {
		csssdSrc = Ql.DOM._getOwnerDocument(eltThis).defaultView.getComputedStyle(eltSrc._, null);
	} else {
		csssdSrc = eltSrc._.style;
	}
	for (var i = arrStyles.length - 1; i >= 0; --i) {
		var sName = arrStyles[i],
			 sVal = csssdSrc.getPropertyValue(sName);
		if (bForce || sVal) {
			csssdDst.setProperty(sName, sVal, "");
		}
	}
}
Ql.DOM.Element.prototype.copyStylesFrom = $Ql$DOM$Element$copyStylesFrom;


/** See DOM1-Core.Element.getAttribute().
*/
function $Ql$DOM$Element$getAttribute(sName) {
	Function.checkArgs($Ql$DOM$Element$getAttribute, arguments);
	var sValue = Ql.DOM._getAttribute(this._, sName);
	// Mask an automatically generated id attribute.
	if (sName == "id" && sValue.substr(0, 11 /*"_ql_autoid_"*/) == "_ql_autoid_") {
		sValue = "";
	}
	return sValue;
}
Ql.DOM.Element.prototype.getAttribute = $Ql$DOM$Element$getAttribute;


/** Returns the contents box of the element, computed in pixel units.

return:Object(var*)
	The client size of the element:
	“bottom”:float
		Bottom edge.
	“height”:float
		Height.
	“left”:float
		Left edge.
	“right”:float
		Right edge.
	“top”:float
		Top edge.
	“width”:float
		Width.
*/
function $Ql$DOM$Element$getClientRect() {
	Function.checkArgs($Ql$DOM$Element$getClientRect, arguments);
	var map = {
		left: this._.clientLeft || 0,
		top: this._.clientTop || 0,
		width: this._.clientWidth,
		height: this._.clientHeight
	};
	map.right = map.width - map.left;
	map.bottom = map.height - map.top;
	return map;
}
Ql.DOM.Element.prototype.getClientRect = $Ql$DOM$Element$getClientRect;


/** Returns the current, dynamically-evaluated value for a CSS property of the element. Requires
DOM2-Style.

sName:String
	CSS attribute name.
return:String
	Current value of the attribute.
*/
function $Ql$DOM$Element$getComputedStyle(sName) {
	Function.checkArgs($Ql$DOM$Element$getComputedStyle, arguments, String);
	// WK525 bug, WK531 bug, WK533 bug, CR bug, EP2.30 bug: they all return null for unset
	// properties.
	return Ql.DOM._getOwnerDocument(this._).defaultView.getComputedStyle(
		this._, null
	).getPropertyValue(sName) || "";
}
Ql.DOM.Element.prototype.getComputedStyle = $Ql$DOM$Element$getComputedStyle;


/** Returns the index of this node in its parent’s childNodes collection, or 0 if the element has no
parent.

return:int
	Index of the node.
*/
function $Ql$DOM$Element$getIndexOfType() {
	Function.checkArgs($Ql$DOM$Element$getIndexOfType, arguments);
	var eltThis = this._, ndParent = Ql.DOM._getParentNode(eltThis);
	if (!ndParent) {
		return 0;
	}
	// TODO: namespaces support.
	var iNodeType = eltThis.nodeType, sNodeName = eltThis.nodeName;
	for (var nd = ndParent.firstChild, iOfType = 0; nd; nd = nd.nextSibling) {
		if (nd.nodeType == iNodeType && nd.nodeName == sNodeName) {
			if (Ql.DOM._isSameNode(nd, eltThis)) {
				return iOfType;
			}
			++iOfType;
		}
	}
}
Ql.DOM.Element.prototype.getIndexOfType = $Ql$DOM$Element$getIndexOfType;


/** Returns the rectangle that defines the element in the page, plus a value that is true if the
object has position: fixed.

Not to be used before the document.lateload event is triggered. Requires the commonly available non-
standard offsetLeft/offsetTop/offsetParent properties.

[eltRelTo:Ql.DOM.Element]
	If provided, the returned coordinates will be the distance of this from eltRelTo; the returned
	position: fixed flag will be true if any ancestor, from this to eltRelTo, specifies position:
	fixed.
return:Object(var*)
	Coordinates of the element.
	“left”:float
		Left edge.
	“top”:float
		Top edge.
	“width”:float
		Width.
	“height”:float
		Height.
	“right”:float
		Right edge.
	“bottom”:float
		Bottom edge.
	“fixed”:bool
		“position: fixed” flag.
*/
function $Ql$DOM$Element$getOffsetRect(eltRelTo /*= null*/) {
	Function.checkArgs($Ql$DOM$Element$getOffsetRect, arguments, [undefined, null, Ql.DOM.Element]);
	var eltThis = this._, map = {
		 	left:   eltThis.offsetLeft,
		 	top:    eltThis.offsetTop,
		 	width:  eltThis.offsetWidth,
		 	height: eltThis.offsetHeight,
		 	fixed:  (this.getComputedStyle("position") == "fixed")
		 };
	if (eltRelTo) {
		// Add the offsets of each offsetParent, including at least eltRelTo, or its closest ancestor
		// that is an offsetParent.
		var elt = this;
		do {
			elt = elt._.offsetParent;
			if (!elt) {
				break;
			}
			elt = Ql.DOM.wrap(elt);
			switch (elt.getComputedStyle("position")) {
				case "fixed":
					// This needs to be returned.
					map.fixed = true;
					break;
				case "static":
					// An HTMLTableCellElement is an offsetParent without having position: static; this
					// causes its offsetLeft/Top to be 0 (why?!), and will make positioning of its
					// children harder. Fix this anomaly by forcing it to be non-“static”.
					// TODO: check the CSS display property instead.
					switch (elt.getNodeName()) {
						case "td":
						case "th":
							elt.setStyle("position", "relative");
							break;
					}
					break;
			}
			map.left += elt._.offsetLeft;
			map.top += elt._.offsetTop;
		} while (elt.isDescendantOf(eltRelTo));
	}
	map.right = map.left + map.width;
	map.bottom = map.top + map.height;
	return map;
}
Ql.DOM.Element.prototype.getOffsetRect = $Ql$DOM$Element$getOffsetRect;


/** Retrieves the value of a CSS property on the element from an inline style declaration. Requires
DOM2-Style.

sName:String
	CSS property name.
return:String
	Value of the property.
*/
function $Ql$DOM$Element$getStyle(sName) {
	Function.checkArgs($Ql$DOM$Element$getStyle, arguments, String);
	// WK525 bug, WK531 bug, WK533 bug, CR bug, EP2.30 bug: they all return null for unset
	// properties.
	return this._.style.getPropertyValue(sName) || "";
}
Ql.DOM.Element.prototype.getStyle = $Ql$DOM$Element$getStyle;


/** See DOM2-Core.Element.hasAttribute().
*/
function $Ql$DOM$Element$hasAttribute(sName) {
	Function.checkArgs($Ql$DOM$Element$hasAttribute, arguments, String);
	var bValue = Ql.DOM._hasAttribute(this._, sName);
	// Mask an automatically generated id attribute.
	if (
		bValue && sName == "id" &&
		this._.getAttribute("id").substr(0, 11 /*"_ql_autoid_"*/) == "_ql_autoid_"
	) {
		bValue = false;
	}
	return bValue;
}
Ql.DOM.Element.prototype.hasAttribute = $Ql$DOM$Element$hasAttribute;


/** Returns true if the element’s class attribute includes the specified identifier.

vClass:(String|RegExp)
	CSS class to be checked for. Capturing sub-patterns may be specified.
return:var
	If the specified CSS class is not applied to the element, the return value is false; otherwise,
	if vClass was a RegExp the match array will be returned, or true if vClass was a string.
*/
function $Ql$DOM$Element$isCssClass(vClass) {
	Function.checkArgs($Ql$DOM$Element$isCssClass, arguments, [String, RegExp]);
	return Ql.DOM._isCssClass(this, vClass);
}
Ql.DOM.Element.prototype.isCssClass = $Ql$DOM$Element$isCssClass;


/** Ensures that this wrapper won’t be automatically discarded when no longer referenced.

return:Ql.DOM.Element
	this.
*/
function $Ql$DOM$Element$lockWrapper() {
	Function.checkArgs($Ql$DOM$Element$lockWrapper, arguments);
	if (++this._m_cLocks == 1) {
		var eltThis = this._, sId = eltThis.getAttribute("id"),
			 doc = this.getOwnerDocument();
		// Make sure the wrapper element has an id.
		if (!sId) {
			sId = doc._mkAutoId(Ql.DOM._getNodeName(eltThis));
			eltThis.setAttribute("id", sId);
		}
		doc._m_mapLockedElemWrappers[sId] = this;
	}
	return this;
}
Ql.DOM.Element.prototype.lockWrapper = $Ql$DOM$Element$lockWrapper;


/** See DOM1-Core.Element.removeAttribute().
*/
function $Ql$DOM$Element$removeAttribute(sName) {
	Function.checkArgs($Ql$DOM$Element$removeAttribute, arguments, String);
	var eltThis = this._;
	if (sName == "id") {
		var sId = eltThis.getAttribute("id"), doc = this.getOwnerDocument();
		if (sId && doc._m_mapLockedElemWrappers[sId] === this) {
			// The wrapper is locked, so it needs an id: instead of removing the attribute, just change
			// it to a unique auto-generated one.
			delete doc._m_mapLockedElemWrappers[sId];
			sId = doc._mkAutoId(Ql.DOM._getNodeName(eltThis));
			eltThis.setAttribute("id", sId);
			doc._m_mapLockedElemWrappers[sId] = this;
			return;
		}
	}
	Ql.DOM._removeAttribute(eltThis, sName);
}
Ql.DOM.Element.prototype.removeAttribute = $Ql$DOM$Element$removeAttribute;


/** Removes a CSS class from the element.

sClass:String
	CSS class name.
return:String
	New value for class attribute of the element.
*/
function $Ql$DOM$Element$removeCssClass(sClass) {
	Function.checkArgs($Ql$DOM$Element$removeCssClass, arguments, String);
	var eltThis = this._,
		 sPrevClass = " " + Ql.DOM._getAttribute(eltThis, "class") + " ";
	sClass = sPrevClass.replace(" " + sClass + " ", " ").trim();
	Ql.DOM._setAttribute(eltThis, "class", sClass);
	return sClass;
}
Ql.DOM.Element.prototype.removeCssClass = $Ql$DOM$Element$removeCssClass;


/** See Ql.DOM.Dokelement.removeEventListener().
*/
function $Ql$DOM$Element$removeEventListener(sEventType, fnCallback, bCapture) {
	Function.checkArgs($Ql$DOM$Element$removeEventListener, arguments, String, Function, Boolean);
	Ql.EventTarget.prototype.removeEventListener.call(this, sEventType, fnCallback, bCapture);
	this.unlockWrapper();
}
Ql.DOM.Element.prototype.removeEventListener = $Ql$DOM$Element$removeEventListener;


/** Removes a CSS style from the element. Requires DOM2-Style.

sName:String
	CSS property name.
return:String
	Value of the property, before it was removed.
*/
function $Ql$DOM$Element$removeStyle(sName) {
	Function.checkArgs($Ql$DOM$Element$removeStyle, arguments, String);
	return this._.style.removeProperty(sName);
}
Ql.DOM.Element.prototype.removeStyle = $Ql$DOM$Element$removeStyle;


/** See Ql.DOM.Dokelement.select(), or [DESIGN_1136 JS: Ql.SelectorEval.evaluate()] for the
supported sytax.

An additional, non-standard selector is allowed:

┌──────────┬──────────────┐
│ Selector │ Description  │
├──────────┼──────────────┤
│ :self	  │ this element │
└──────────┴──────────────┘

The :self pseudo-element, when appearing first in a selector, means “this” (the Ql.DOM.Element
upon which select() is being invoked). So, while Ql.DOM.Dokelement.select() allows to only imply “ ”
as selector combinator, as in “span” (same as “:self span”) meaning “every span descendant of this
element”, the :self pseudo-element allows to use other combinators, such as “:self > span” meaning
“every span child of this element”.

This is particularly useful in designing UI elements that need to select among their own child
nodes, but without descending further into the document hierarchy.
*/
function $Ql$DOM$Element$select(sSel) {
	Function.checkArgs($Ql$DOM$Element$select, arguments, String);
	if (sSel.substr(0, 6 /*":self "*/) != ":self ") {
		return Ql.DOM.Dokelement.prototype.select.call(this, sSel);
	}
	var sId = this._.getAttribute("id");
	if (!sId) {
		// Create a randomized id, and assign it to the element.
		sId = this.getOwnerDocument()._mkAutoId(this.getNodeName());
		this._.setAttribute("id", sId);
	}
	// Convert “:self …” into “#id …”.
	return this.getParentNode().select("#" + sId + sSel.substr(5 /*":self"*/));
}
Ql.DOM.Element.prototype.select = $Ql$DOM$Element$select;


/** See DOM1-Core.Element.setAttribute().
*/
function $Ql$DOM$Element$setAttribute(sName, sValue) {
	Function.checkArgs($Ql$DOM$Element$setAttribute, arguments, String, String);
	var eltThis = this._;
	if (sName == "id") {
		var sPrevValue = eltThis.getAttribute("id"),
			 doc = this.getOwnerDocument();
		if (sPrevValue && doc._m_mapLockedElemWrappers[sPrevValue] === this) {
			// The wrapper is locked, so the document’s wrapper map needs to be updated.
			delete doc._m_mapLockedElemWrappers[sPrevValue];
			// Make sure the new value is not an empty string, otherwise silently change it to a unique
			// auto-generated id.
			if (!sValue) {
				sValue = doc._mkAutoId(Ql.DOM._getNodeName(eltThis));
			}
			doc._m_mapLockedElemWrappers[sValue] = this;
		}
	}
	Ql.DOM._setAttribute(eltThis, sName, sValue);
}
Ql.DOM.Element.prototype.setAttribute = $Ql$DOM$Element$setAttribute;


/** Moves the element to the specified position, relative to another existing element.

Note: the result may look incorrect if this is bigger than eltRelTo.

eltRelTo:Ql.DOM.Element
	Element to which the new position is relative.
iHDir:int
	Horizontal position relative to eltRelTo, expressed as though eltRelTo the origin, and this was
	the point at (iHDir,iVDir):
	•	-2 Aligns this’s bottom to eltRelTo’s top.
	•	-1 Aligns this’s bottom to eltRelTo’s bottom.
	•	 0 Center this relative to eltRelTo.
	•	+1 Aligns this’s top to eltRelTo’s top.
	•	+2 Aligns this’s top to eltRelTo’s bottom.
iVDir:int
	Vertical position relative to eltRelTo, expressed like iHDir.
return:Ql.DOM.Element
	this.
*/
function $Ql$DOM$Element$setPosition(eltRelTo, iHDir, iVDir) {
	Function.checkArgs($Ql$DOM$Element$setPosition, arguments, Ql.DOM.Element, Number, Number);
	// Hide the element if necessary, and move it to a safe place, so that it won’t cause scrollbars
	// to change if moved at weird positions during the computation.
	var sVisibility = this.getComputedStyle("visibility");
	if (sVisibility != "hidden") {
		this.setStyle("visibility", "hidden");
	}
	var rectRelToPos = eltRelTo.getOffsetRect(Ql.DOM.getCommonAncestor(this, eltRelTo));
	this.setStyle("position", rectRelToPos.fixed ? "fixed" : "absolute");
	this.setStyle("left", "0");
	this.setStyle("top", "0");
	var mapClientSize;
	if (rectRelToPos.fixed) {
		mapClientSize = this.getOwnerDocument().getDocumentElement().getClientRect();
	}

	// Adjust the position, axis by axis.
	for (var i = 1; i >= 0; --i) {
		var xyThis, cxyThis = this._[i ? "offsetWidth" : "offsetHeight"];
		if (!cxyThis) {
			// If offset* failed to give an accurate dimension, try using CSS.
			var arrMatch = this.getComputedStyle(i ? "width" : "height").match(/^(.+)px$/);
			if (arrMatch) {
				cxyThis = parseFloat(arrMatch[1]);
			}
		}
		var xyRelTo = rectRelToPos[i ? "left" : "top"],
			 cxyRelTo = eltRelTo._[i ? "offsetWidth" : "offsetHeight"];
		switch (i ? iHDir : iVDir) {
			case -2: xyThis = xyRelTo - cxyThis; break;
			case -1: xyThis = xyRelTo - cxyThis + cxyRelTo; break;
			case  0: xyThis = xyRelTo - Math.round((cxyThis - cxyRelTo) * 0.5); break;
			case +1: xyThis = xyRelTo; break;
			case +2: xyThis = xyRelTo + cxyRelTo; break;
			default:
				throw new RangeError(
					"Invalid value for argument " + (i ? "iVDir" : "iHDir") + ": " + (i ? iHDir : iVDir)
				);
		}
		if (false && rectRelToPos.fixed) {
			// Make sure everything fits in the window, otherwise position: fixed will make overflowing
			// parts unreachable.
			var xyClientTL = mapClientSize[i ? "left" : "top"],
				 xyClientBR = mapClientSize[i ? "right" : "bottom"],
				 cxyClient = mapClientSize[i ? "width" : "height"];
			if (xyThis + cxyThis > xyClientBR) {
				xyThis = xyClientBR - cxyThis - Math.ceil(cxyClient * 0.02);
			}
			if (xyThis < xyClientTL) {
				xyThis = xyClientTL + Math.ceil(cxyClient * 0.02);
			}
		}
		// Adjust the position.
		this.setStyle(i ? "left" : "top", xyThis + "px");
	}

	// Restore visibility, if necessary.
	if (sVisibility != "hidden") {
		this.setStyle("visibility", sVisibility);
	}
	return this;
}
Ql.DOM.Element.prototype.setPosition = $Ql$DOM$Element$setPosition;


/** Sets a CSS property for the element. Requires DOM2-Style.

sName:String
	CSS property name.
sValue:String
	New value of the property.
[sPriority:String]
	Priority of the property. Defaults to an empty string, meaning default priority.
return:Ql.DOM.Element
	this.
*/
function $Ql$DOM$Element$setStyle(sName, sValue, sPriority /*= ""*/) {
	Function.checkArgs($Ql$DOM$Element$setStyle, arguments, String, String, [undefined, String]);
	this._.style.setProperty(sName, sValue, sPriority || "");
}
Ql.DOM.Element.prototype.setStyle = $Ql$DOM$Element$setStyle;


/** See Ql.DOM.Node.toString().
*/
function $Ql$DOM$Element$toString() {
	Function.checkArgs($Ql$DOM$Element$toString, arguments);
	var sId = this.getAttribute("id");
	return "[object " + this._sClassName + (sId && " #" + sId) + "]";
}
Ql.DOM.Element.prototype.toString = $Ql$DOM$Element$toString;


/** Allows to discard this wrapper, when no longer in use.

return:Ql.DOM.Element
	this.
*/
function $Ql$DOM$Element$unlockWrapper() {
	Function.checkArgs($Ql$DOM$Element$unlockWrapper, arguments);
	if (--this._m_cLocks == 0) {
		var sId = this._.getAttribute("id"),
			 mapLockedElemWrappers = this.getOwnerDocument()._m_mapLockedElemWrappers;
		if (mapLockedElemWrappers[sId] === this) {
			delete mapLockedElemWrappers[sId];
		}
	}
	return this;
}
Ql.DOM.Element.prototype.unlockWrapper = $Ql$DOM$Element$unlockWrapper;


/** Keeps track of whether the wrapped element is linked in the document tree, to determine whether
its lock status is to be enforced or relaxed.

bLinked:bool
	New linked status of the wrapped element.
*/
function $Ql$DOM$Element$_updateLinkedStatus(bLinked) {
	this._m_bLinked = bLinked;
	// Recurse on every child.
	var mapLockedElemWrappers = this.getOwnerDocument()._m_mapLockedElemWrappers;
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling)
		if (nd.nodeType == Node.ELEMENT_NODE) {
			var sId = nd.getAttribute("id");
			// If the wrapper has ever been locked, an id must have been assigned.
			if (sId && sId in mapLockedElemWrappers) {
				mapLockedElemWrappers[sId]._updateLinkedStatus(bLinked);
			}
		}
}
Ql.DOM.Element.prototype._updateLinkedStatus = $Ql$DOM$Element$_updateLinkedStatus;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Text


/** Wrapper for DOM1-Core.Text.
*/
function $Ql$DOM$Text() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Text, arguments);
	Ql.DOM.Node.call(this);
}
Ql.DOM.Text = $Ql$DOM$Text;
Ql.DOM.Text.inheritFrom(Ql.DOM.Node);
Ql.DOM.Text.prototype.toString = Function.createToStringMethod("Ql.DOM.Text");


/** See Ql.DOM.Node.getTextContent().
*/
function $Ql$DOM$Text$getTextContent() {
	Function.checkArgs($Ql$DOM$Text$getTextContent, arguments);
	return this._.nodeValue;
}
Ql.DOM.Text.prototype.getTextContent = $Ql$DOM$Text$getTextContent;


/** See Ql.DOM.Node.setTextContent().
*/
function $Ql$DOM$Text$setTextContent(s) {
	Function.checkArgs($Ql$DOM$Element$setTextContent, arguments, String);
	this._.nodeValue = s;
}
Ql.DOM.Text.prototype.setTextContent = $Ql$DOM$Text$setTextContent;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.CompositeElement


/** Base or augmenter class for non-native element wrapper classes, i.e. those implementing custom
behavior not part of pure HTML.
*/
function $Ql$DOM$CompositeElement() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$CompositeElement, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.CompositeElement = $Ql$DOM$CompositeElement;
Ql.DOM.CompositeElement.inheritFrom(Ql.DOM.Element);

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.CompositeElement.prototype._sClassName/*:String*/ = "Ql.DOM.CompositeElement";


/** Creates all the native elements making up a composite element of this type.

doc:Ql.DOM.Document
	Document in which the element(s) should be created.
return:Element
	Newly created (containing) element.
*/
Ql.DOM.CompositeElement.prototype._createNew = Function.Abstract;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.FocusableElement


/** Wrapper for “natively” focusable elements, such as <a>, <input> and <button>, which can gain and
lose focus.
*/
function $Ql$DOM$FocusableElement() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$FocusableElement, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.FocusableElement = $Ql$DOM$FocusableElement;
Ql.DOM.FocusableElement.inheritFrom(Ql.DOM.Element);


/** See DOM1-HTML.HTMLInputElement.blur(). Requires DOM1-HTML.

return:Ql.DOM.FocusableElement
	this.
*/
function $Ql$DOM$FocusableElement$blur() {
	Function.checkArgs($Ql$DOM$FocusableElement$blur, arguments);
	this._.blur();
	return this;
}
Ql.DOM.FocusableElement.prototype.blur = $Ql$DOM$FocusableElement$blur;


/** See DOM1-HTML.HTMLInputElement.focus(). Requires DOM1-HTML.

return:Ql.DOM.FocusableElement
	this.
*/
function $Ql$DOM$FocusableElement$focus() {
	Function.checkArgs($Ql$DOM$FocusableElement$focus, arguments);
	this._.focus();
	return this;
}
Ql.DOM.FocusableElement.prototype.focus = $Ql$DOM$FocusableElement$focus;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.InteractiveElement


/** Wrapper for “natively” interactive elements, such as <input> and <button>, which can be enabled/
disabled, can gain focus, and so on.
*/
function $Ql$DOM$InteractiveElement() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$InteractiveElement, arguments);
	Ql.DOM.FocusableElement.call(this);
}
Ql.DOM.InteractiveElement = $Ql$DOM$InteractiveElement;
Ql.DOM.InteractiveElement.inheritFrom(Ql.DOM.FocusableElement);


/** Makes the element non-interactive.

return:Ql.DOM.InteractiveElement
	this.
*/
function $Ql$DOM$InteractiveElement$disable() {
	Function.checkArgs($Ql$DOM$InteractiveElement$disable, arguments);
	this.setAttribute("disabled", "disabled");
	return this;
}
Ql.DOM.InteractiveElement.prototype.disable = $Ql$DOM$InteractiveElement$disable;


/** Makes the element interactive.

return:Ql.DOM.InteractiveElement
	this.
*/
function $Ql$DOM$InteractiveElement$enable() {
	Function.checkArgs($Ql$DOM$InteractiveElement$enable, arguments);
	this.removeAttribute("disabled");
	return this;
}
Ql.DOM.InteractiveElement.prototype.enable = $Ql$DOM$InteractiveElement$enable;


/** Returns true if the element is forced to be non-interactive.

return:bool
	true if non-interactive, false otherwise.
*/
function $Ql$DOM$InteractiveElement$isDisabled() {
	Function.checkArgs($Ql$DOM$InteractiveElement$isDisabled, arguments);
	return this.hasAttribute("disabled");
}
Ql.DOM.InteractiveElement.prototype.isDisabled = $Ql$DOM$InteractiveElement$isDisabled;



////////////////////////////////////////////////////////////////////////////////////////////////////
// DOM-HTML enhancement classes (basic)


/* Specializations of Ql.DOM.Element, mostly matching DOM*-HTML. */


////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Anchor


/** Wrapper for DOM1-HTML.HTMLAnchorElement.
*/
function $Ql$DOM$Anchor() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Anchor, arguments);
	Ql.DOM.InteractiveElement.call(this);
}
Ql.DOM.Anchor = $Ql$DOM$Anchor;
Ql.DOM.Anchor.inheritFrom(Ql.DOM.InteractiveElement);
Ql.DOM.registerWrapperClass(Ql.DOM.Anchor, "a");

/** See Ql.DOM.InteractiveElement._sClassName. */
Ql.DOM.Anchor.prototype._sClassName/*:String*/ = "Ql.DOM.Anchor";



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Br


/** Wrapper for DOM1-HTML.HTMLBRElement.
*/
function $Ql$DOM$Br() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Br, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.Br = $Ql$DOM$Br;
Ql.DOM.Br.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.DOM.Br, "br");

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.Br.prototype._sClassName/*:String*/ = "Ql.DOM.Br";


/** See Ql.DOM.Element.getTextContent().
*/
function $Ql$DOM$Br$getTextContent() {
	Function.checkArgs($Ql$DOM$Br$getTextContent, arguments);
	return "" /*TODO: break*/;
}
Ql.DOM.Br.prototype.getTextContent = $Ql$DOM$Br$getTextContent;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Button


/** Wrapper for DOM1-HTML.HTMLButtonElement.
*/
function $Ql$DOM$Button() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Button, arguments);
	Ql.DOM.InteractiveElement.call(this);
}
Ql.DOM.Button = $Ql$DOM$Button;
Ql.DOM.Button.inheritFrom(Ql.DOM.InteractiveElement);
Ql.DOM.registerWrapperClass(Ql.DOM.Button, "button");

/** See Ql.DOM.InteractiveElement._sClassName. */
Ql.DOM.Button.prototype._sClassName/*:String*/ = "Ql.DOM.Button";



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Form


/** Wrapper for DOM1-HTML.HTMLFormElement.
*/
function $Ql$DOM$Form() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Form, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.Form = $Ql$DOM$Form;
Ql.DOM.Form.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.DOM.Form, "form");

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.Form.prototype._sClassName/*:String*/ = "Ql.DOM.Form";


/** See DOM1-HTML.HTMLFormElement.reset().
*/
function $Ql$DOM$Form$reset() {
	Function.checkArgs($Ql$DOM$Form$reset, arguments);
	return this._.reset();
}
Ql.DOM.Form.prototype.reset = $Ql$DOM$Form$reset;


/** See DOM1-HTML.HTMLFormElement.submit().
*/
function $Ql$DOM$Form$submit() {
	Function.checkArgs($Ql$DOM$Form$submit, arguments);
	return this._.submit();
}
Ql.DOM.Form.prototype.submit = $Ql$DOM$Form$submit;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.IFrame


/** Wrapper for DOM1-HTML.HTMLIFrameElement.
*/
function $Ql$DOM$IFrame() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$IFrame, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.IFrame = $Ql$DOM$IFrame;
Ql.DOM.IFrame.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.DOM.IFrame, "iframe");

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.IFrame.prototype._sClassName/*:String*/ = "Ql.DOM.IFrame";


/** See DOM2-HTML.HTMLIFrameElement.contentDocument. Requires DOM2-HTML.
*/
function $Ql$DOM$IFrame$getContentDocument() {
	Function.checkArgs($Ql$DOM$IFrame$getContentDocument, arguments);
	var doc = this._.contentDocument;
	return doc && Ql.DOM.wrap(doc);
}
Ql.DOM.IFrame.prototype.getContentDocument = $Ql$DOM$IFrame$getContentDocument;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.TableCell


/** Wrapper for DOM1-HTML.HTMLTableCellElement.
*/
function $Ql$DOM$TableCell() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$TableCell, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.TableCell = $Ql$DOM$TableCell;
Ql.DOM.TableCell.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.DOM.TableCell, "th");
Ql.DOM.registerWrapperClass(Ql.DOM.TableCell, "td");

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.TableCell.prototype._sClassName/*:String*/ = "Ql.DOM.TableCell";



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.TableSection


/** Wrapper for DOM1-HTML.HTMLTableSectionElement.
*/
function $Ql$DOM$TableSection() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$TableSection, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.TableSection = $Ql$DOM$TableSection;
Ql.DOM.TableSection.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.DOM.TableSection, "thead");
Ql.DOM.registerWrapperClass(Ql.DOM.TableSection, "tfoot");
Ql.DOM.registerWrapperClass(Ql.DOM.TableSection, "tbody");

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.TableSection.prototype._sClassName/*:String*/ = "Ql.DOM.TableSection";


/** Adds a new row at the end of the table section; it thus behaves like
HTMLTableSection.insertRow(-1).

return:Ql.DOM.TableRow
	Newly-created row.
*/
function $Ql$DOM$TableSection$appendRow() {
	Function.checkArgs($Ql$DOM$TableSection$appendRow, arguments);
	return this.appendChild(this.getOwnerDocument().createElement("tr"));
}
Ql.DOM.TableSection.prototype.appendRow = $Ql$DOM$TableSection$appendRow;


/** See DOM1-HTML.HTMLTableSectionElement.deleteRow().
*/
function $Ql$DOM$TableSection$deleteRow(i) {
	Function.checkArgs($Ql$DOM$TableSection$deleteRow, arguments, Number);
	var tr = this.getRow(i);
	if (tr) {
		tr.unlink();
	}
}
Ql.DOM.TableSection.prototype.deleteRow = $Ql$DOM$TableSection$deleteRow;


/** Returns a <td> element from the row.

i:return
	Index of the row.
return:Ql.DOM.TableRow
	The table row.
*/
function $Ql$DOM$TableSection$getRow(i) {
	Function.checkArgs($Ql$DOM$TableSection$getRow, arguments, Number);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		if (Ql.DOM._getNodeName(nd) == "tr" && i-- == 0) {
			return Ql.DOM.wrap(nd);
		}
	}
	return null;
}
Ql.DOM.TableSection.prototype.getRow = $Ql$DOM$TableSection$getRow;


/** Returns the number of rows in the table.

return:int
	Number of rows.
*/
function $Ql$DOM$TableSection$getRowCount() {
	Function.checkArgs($Ql$DOM$TableSection$getRowCount, arguments);
	var c = 0;
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		if (Ql.DOM._getNodeName(nd) == "tr") {
			++c;
		}
	}
	return c;
}
Ql.DOM.TableSection.prototype.getRowCount = $Ql$DOM$TableSection$getRowCount;


/** See DOM1-HTML.HTMLTableSectionElement.insertRow().
*/
function $Ql$DOM$TableSection$insertRow(i) {
	Function.checkArgs($Ql$DOM$TableSection$insertRow, arguments, Number);
	return this.insertBefore(this.getOwnerDocument().createElement("tr"), this.getRow(i));
}
Ql.DOM.TableSection.prototype.insertRow = $Ql$DOM$TableSection$insertRow;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.Table


/** Wrapper for DOM1-HTML.HTMLTableElement. It adds a few methods, and standardizes behavior across
browsers, especially regarding the case of the generated elements (for example, all-uppercase in
OP9), and the way rows are added to tables with or without table sections.
*/
function $Ql$DOM$Table() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$Table, arguments);
	Ql.DOM.TableSection.call(this);
}
Ql.DOM.Table = $Ql$DOM$Table;
Ql.DOM.Table.inheritFrom(Ql.DOM.TableSection);
Ql.DOM.registerWrapperClass(Ql.DOM.Table, "table");

/** See Ql.DOM.TableSection._sClassName. */
Ql.DOM.Table.prototype._sClassName/*:String*/ = "Ql.DOM.Table";


/** See Ql.DOM.TableSection.appendRow(). It only succeeds if the table contains no <tbody> sections;
otherwise, appendRow() on one of those sections should be used.
*/
function $Ql$DOM$Table$appendRow() {
	Function.checkArgs($Ql$DOM$Table$appendRow, arguments);
	// Make sure that the table contains no <tbody>es; in that case, adding a row is not allowed.
	for (var nd = this._.lastChild; nd; nd = nd.previousSibling) {
		var sName = Ql.DOM._getNodeName(nd);
		if (sName == "tr") {
			// Found a row: no need to check any more nodes, just go ahead.
			break;
		}
		if (sName == "tbody") {
			// Found a tbody section: this appendRow cannot succeed, the tbody’s appendRow must be used
			// instead.
			return null;
		}
	}
	return Ql.DOM.TableSection.prototype.appendRow.call(this);
}
Ql.DOM.Table.prototype.appendRow = $Ql$DOM$Table$appendRow;


/** Adds a <tbody> at the end of the table. If out-of-section rows (direct children of the table)
are present, they will be moved to the newly created table body.

return:Ql.DOM.TableSection
	The new table body section.
*/
function $Ql$DOM$Table$appendTBody() {
	Function.checkArgs($Ql$DOM$Table$appendTBody, arguments);
	return this.insertTBody(-1);
}
Ql.DOM.Table.prototype.appendTBody = $Ql$DOM$Table$appendTBody;


/** See DOM1-HTML.HTMLTableElement.createCaption().
*/
function $Ql$DOM$Table$createCaption() {
	Function.checkArgs($Ql$DOM$Table$createCaption, arguments);
	var caption = this.getCaption();
	if (caption) {
		return caption;
	}
	caption = this.getOwnerDocument().createElement("caption");
	// Insert before anything else.
	return this.insertBefore(caption, this.getFirstChild());
}
Ql.DOM.Table.prototype.createCaption = $Ql$DOM$Table$createCaption;


/** See DOM1-HTML.HTMLTableElement.createTFoot().
*/
function $Ql$DOM$Table$createTFoot() {
	Function.checkArgs($Ql$DOM$Table$createTFoot, arguments);
	var tfoot = this.getTFoot();
	if (tfoot) {
		return tfoot;
	}
	// Find the first <tbody> or <tr> element.
	var nd;
	for (nd = this._.firstChild; nd; nd = nd.nextSibling) {
		var sName = Ql.DOM._getNodeName(nd);
		if (sName == "tbody" || sName == "tr") {
			break;
		}
	}
	// Insert before that (or null).
	tfoot = this.getOwnerDocument().createElement("tfoot");
	return this.insertBefore(tfoot, nd && Ql.DOM.wrap(nd));
}
Ql.DOM.Table.prototype.createTFoot = $Ql$DOM$Table$createTFoot;


/** See DOM1-HTML.HTMLTableElement.createTHead().
*/
function $Ql$DOM$Table$createTHead() {
	Function.checkArgs($Ql$DOM$Table$createTHead, arguments);
	var thead = this.getTHead();
	if (thead) {
		return thead;
	}
	// Find the first <tfoot>, <tbody> or <tr> element.
	var nd;
	for (nd = this._.firstChild; nd; nd = nd.nextSibling) {
		var sName = Ql.DOM._getNodeName(nd);
		if (sName == "tfoot" || sName == "tbody" || sName == "tr") {
			break;
		}
	}
	// Insert before that (or null).
	thead = this.getOwnerDocument().createElement("thead");
	return this.insertBefore(thead, nd && Ql.DOM.wrap(nd));
}
Ql.DOM.Table.prototype.createTHead = $Ql$DOM$Table$createTHead;


/** See DOM1-HTML.HTMLTableElement.deleteCaption().
*/
function $Ql$DOM$Table$deleteCaption() {
	Function.checkArgs($Ql$DOM$Table$deleteCaption, arguments);
	var caption = this.getCaption();
	if (caption) {
		caption.unlink();
	}
}
Ql.DOM.Table.prototype.deleteCaption = $Ql$DOM$Table$deleteCaption;


/** Removes a <tbody> from the table.

i:int
	Index of the table body to be removed.
*/
function $Ql$DOM$Table$deleteTBody(i) {
	Function.checkArgs($Ql$DOM$Table$deleteTBody, arguments, Number);
	var tbody = this.getTBody(i);
	if (tbody) {
		tbody.unlink();
	}
}
Ql.DOM.Table.prototype.deleteTBody = $Ql$DOM$Table$deleteTBody;


/** See DOM1-HTML.HTMLTableElement.deleteTFoot().
*/
function $Ql$DOM$Table$deleteTFoot() {
	Function.checkArgs($Ql$DOM$Table$deleteTFoot, arguments);
	var tfoot = this.getTFoot();
	if (tfoot) {
		tfoot.unlink();
	}
}
Ql.DOM.Table.prototype.deleteTFoot = $Ql$DOM$Table$deleteTFoot;


/** See DOM1-HTML.HTMLTableElement.deleteTHead().
*/
function $Ql$DOM$Table$deleteTHead() {
	Function.checkArgs($Ql$DOM$Table$deleteTHead, arguments);
	var thead = this.getTHead();
	if (thead) {
		thead.unlink();
	}
}
Ql.DOM.Table.prototype.deleteTHead = $Ql$DOM$Table$deleteTHead;


/** See DOM1-HTML.HTMLTableElement.caption.
*/
function $Ql$DOM$Table$getCaption() {
	Function.checkArgs($Ql$DOM$Table$getCaption, arguments);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "caption":
				return Ql.DOM.wrap(nd);
			case "thead":
			case "tbody":
			case "tr":
			case "tfoot":
				// A <caption> must come before these; continuing is futile.
				return null;
		}
	}
	return null;
}
Ql.DOM.Table.prototype.getCaption = $Ql$DOM$Table$getCaption;


/** See Ql.DOM.TableSection.getRow().
*/
function $Ql$DOM$Table$getRow(i) {
	Function.checkArgs($Ql$DOM$Table$getRow, arguments, Number);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "tr":
				if (i-- == 0) {
					return Ql.DOM.wrap(nd);
				}
				break;
			case "tbody":
			case "thead":
			case "tfoot":
				for (var ndInSect = nd.firstChild; ndInSect; ndInSect = ndInSect.nextSibling) {
					if (Ql.DOM._getNodeName(ndInSect) == "tr" && i-- == 0) {
						return Ql.DOM.wrap(ndInSect);
					}
				}
				break;
		}
	}
	return null;
}
Ql.DOM.Table.prototype.getRow = $Ql$DOM$Table$getRow;


/** Returns the number of rows in the table.

return:int
	Number of rows.
*/
function $Ql$DOM$Table$getRowCount() {
	Function.checkArgs($Ql$DOM$Table$getRowCount, arguments);
	var c = 0;
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "tr":
				++c;
				break;
			case "tbody":
			case "thead":
			case "tfoot":
				for (var ndInSect = nd.firstChild; ndInSect; ndInSect = ndInSect.nextSibling) {
					if (Ql.DOM._getNodeName(ndInSect) == "tr") {
						++c;
					}
				}
				break;
		}
	}
	return c;
}
Ql.DOM.Table.prototype.getRowCount = $Ql$DOM$Table$getRowCount;


/** Returns a <tbody> element from the table.

i:int
	Index of the table body section.
return:Ql.DOM.TableSection
	The table body section.
*/
function $Ql$DOM$Table$getTBody(i) {
	Function.checkArgs($Ql$DOM$Table$getTBody, arguments, Number);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "tbody":
				if (i-- == 0) {
					return Ql.DOM.wrap(nd);
				}
				break;
			case "tr":
				// Cannot add <tbody>s if <tr>s are present.
				return null;
		}
	}
	return null;
}
Ql.DOM.Table.prototype.getTBody = $Ql$DOM$Table$getTBody;


/** See DOM1-HTML.HTMLTableElement.tHead.
*/
function $Ql$DOM$Table$getTHead() {
	Function.checkArgs($Ql$DOM$Table$getTHead, arguments);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "thead":
				return Ql.DOM.wrap(nd);
			case "tbody":
			case "tr":
			case "tfoot":
				// A <thead> must come before these; continuing is futile.
				return null;
		}
	}
	return null;
}
Ql.DOM.Table.prototype.getTHead = $Ql$DOM$Table$getTHead;


/** See DOM1-HTML.HTMLTableElement.hFoot.
*/
function $Ql$DOM$Table$getTFoot() {
	Function.checkArgs($Ql$DOM$Table$getTFoot, arguments);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "tfoot":
				return Ql.DOM.wrap(nd);
			case "tbody":
			case "tr":
				// A <tfoot> must come before these; continuing is futile.
				return null;
		}
	}
	return null;
}
Ql.DOM.Table.prototype.getTFoot = $Ql$DOM$Table$getTFoot;


/** See Ql.DOM.TableSection.insertRow(). and DOM1-HTML.HTMLTableElement.insertRow(). It only
succeeds if the table contains no <tbody> sections; otherwise, insertRow() on one of the sections
should be used.
*/
function $Ql$DOM$Table$insertRow(i) {
	Function.checkArgs($Ql$DOM$Table$insertRow, arguments, Number);
	var nd;
	for (nd = this._.firstChild; nd; nd = nd.nextSibling) {
		var sName = Ql.DOM._getNodeName(nd);
		if (sName == "tr") {
			if (i-- == 0)
				break;
		} else if (sName == "tbody") {
			// Cannot add <tr>s if <tbody>s are present.
			return null;
		}
	}
	// Insert before that (or null).
	var tr = this.getOwnerDocument().createElement("tr");
	return this.insertBefore(tr, nd && Ql.DOM.wrap(nd));
}
Ql.DOM.Table.prototype.insertRow = $Ql$DOM$Table$insertRow;


/** Adds a <tbody> at the specified position in the table. If out-of-section rows (direct children
of the table) are present, they will be moved to the newly created table body.

i:int
	Index at which the new section will be inserted.
return:Ql.DOM.TableSection
	The new table body section.
*/
function $Ql$DOM$Table$insertTBody(i) {
	Function.checkArgs($Ql$DOM$Table$insertTBody, arguments, Number);
	var nd, tbody = this.getOwnerDocument().createElement("tbody");
	for (nd = this._.firstChild; nd; nd = nd.nextSibling) {
		var sName = Ql.DOM._getNodeName(nd);
		if (sName == "tbody") {
			if (i-- == 0) {
				break;
			}
		} else if (sName == "tr") {
			// Found a row: move it and all its following siblings (which must all be rows as well) as
			// children of the new tbody, after inserting the tbody here.
			this.insertBefore(tbody, Ql.DOM.wrap(nd));
			var tbody_ = tbody._;
			while (tbody_.nextSibling) {
				tbody_.appendChild(tbody_.nextSibling);
			}
			return tbody;
		}
	}
	// No <tr>s were found, so just add it at the found position (or null).
	return this.insertBefore(tbody, nd && Ql.DOM.wrap(nd));
}
Ql.DOM.Table.prototype.insertTBody = $Ql$DOM$Table$insertTBody;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.TableRow


/** Wrapper for DOM1-HTML.HTMLTableRowElement.
*/
function $Ql$DOM$TableRow() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$TableRow, arguments);
	Ql.DOM.Element.call(this);
}
Ql.DOM.TableRow = $Ql$DOM$TableRow;
Ql.DOM.TableRow.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.DOM.TableRow, "tr");

/** See Ql.DOM.Element._sClassName. */
Ql.DOM.TableRow.prototype._sClassName/*:String*/ = "Ql.DOM.TableRow";


/** Adds a new cell at the end of the table row; it thus behaves like
DOM1-HTML.HTMLTableRowElement.insertCell(-1).

return:Ql.DOM.TableCell
	Newly-created row.
*/
function $Ql$DOM$TableRow$appendCell() {
	Function.checkArgs($Ql$DOM$TableRow$appendCell, arguments);
	return this.appendChild(this.getOwnerDocument().createElement("td"));
}
Ql.DOM.TableRow.prototype.appendCell = $Ql$DOM$TableRow$appendCell;


/** See DOM1-HTML.HTMLTableRowElement.deleteCell().
*/
function $Ql$DOM$TableRow$deleteCell(i) {
	Function.checkArgs($Ql$DOM$TableRow$deleteCell, arguments, Number);
	var cell = this.getCell(i);
	if (cell) {
		cell.unlink();
	}
}
Ql.DOM.TableRow.prototype.deleteCell = $Ql$DOM$TableRow$deleteCell;


/** Returns a <td> element from the row.

i:int
	Index of the cell.
return:Ql.DOM.TableCell
	The table cell.
*/
function $Ql$DOM$TableRow$getCell(i) {
	Function.checkArgs($Ql$DOM$TableRow$getCell, arguments, Number);
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "td":
			case "th":
				if (i-- == 0) {
					return Ql.DOM.wrap(nd);
				}
				break;
		}
	}
	return null;
}
Ql.DOM.TableRow.prototype.getCell = $Ql$DOM$TableRow$getCell;


/** Returns the number of cells in the table row.

return:int
	Number of cells.
*/
function $Ql$DOM$TableRow$getCellCount() {
	Function.checkArgs($Ql$DOM$TableRow$getCellCount, arguments);
	var c = 0;
	for (var nd = this._.firstChild; nd; nd = nd.nextSibling) {
		switch (Ql.DOM._getNodeName(nd)) {
			case "td":
			case "th":
				++c;
				break;
		}
	}
	return c;
}
Ql.DOM.TableRow.prototype.getCellCount = $Ql$DOM$TableRow$getCellCount;


/** See DOM1-HTML.HTMLTableRowElement.insertCell().
*/
function $Ql$DOM$TableRow$insertCell(i) {
	Function.checkArgs($Ql$DOM$TableRow$insertCell, arguments, Number);
	return this.insertBefore(this.getOwnerDocument().createElement("td"), this.getCell(i));
}
Ql.DOM.TableRow.prototype.insertCell = $Ql$DOM$TableRow$insertCell;



////////////////////////////////////////////////////////////////////////////////////////////////////
// DOM-HTML enhancement classes (form-related)


/* Specializations of Ql.DOM.Element, mostly matching DOM*-HTML. */


////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.InputElement


/** Wrapper for DOM1-HTML.HTMLInputElement.
*/
function $Ql$DOM$InputElement() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$InputElement, arguments);
	Ql.DOM.InteractiveElement.call(this);
}
Ql.DOM.InputElement = $Ql$DOM$InputElement;
Ql.DOM.InputElement.inheritFrom(Ql.DOM.InteractiveElement);
Ql.DOM.registerWrapperClass(Ql.DOM.InputElement, "input[type=hidden]");

/** See Ql.DOM.InteractiveElement._sClassName. */
Ql.DOM.InputElement.prototype._sClassName/*:String*/ = "Ql.DOM.InputElement";


/** See DOM1-HTML.HTMLInputElement.value. Requires DOM1-HTML.
*/
function $Ql$DOM$InputElement$getValue() {
	Function.checkArgs($Ql$DOM$InputElement$getValue, arguments);
	return this._.value;
}
Ql.DOM.InputElement.prototype.getValue = $Ql$DOM$InputElement$getValue;


/** See Ql.DOM.InteractiveElement.getTextContent(). Requires DOM1-HTML.
*/
function $Ql$DOM$InputElement$getTextContent() {
	Function.checkArgs($Ql$DOM$InputElement$getTextContent, arguments);
	return this._.value /*TODO: break*/;
}
Ql.DOM.InputElement.prototype.getTextContent = $Ql$DOM$InputElement$getTextContent;


/** See DOM1-HTML.HTMLInputElement.defaultValue. Requires DOM1-HTML.
*/
function $Ql$DOM$InputElement$setDefaultValue(vValue) {
	Function.checkArgs($Ql$DOM$InputElement$setDefaultValue, arguments, [null, Object.ANYTYPE]);
	this.setAttribute("value", "" + vValue);
}
Ql.DOM.InputElement.prototype.setDefaultValue = $Ql$DOM$InputElement$setDefaultValue;


/** See DOM1-HTML.HTMLInputElement.value. Requires DOM1-HTML.
*/
function $Ql$DOM$InputElement$setValue(vValue) {
	Function.checkArgs($Ql$DOM$InputElement$setValue, arguments, [null, Object.ANYTYPE]);
	this._.value = "" + vValue;
}
Ql.DOM.InputElement.prototype.setValue = $Ql$DOM$InputElement$setValue;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.CheckboxInput


/** Wrapper for DOM1-HTML.HTMLInputElement, for type="checkbox".
*/
function $Ql$DOM$CheckboxInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$CheckboxInput, arguments);
	Ql.DOM.InputElement.call(this);
}
Ql.DOM.CheckboxInput = $Ql$DOM$CheckboxInput;
Ql.DOM.CheckboxInput.inheritFrom(Ql.DOM.InputElement);
Ql.DOM.registerWrapperClass(Ql.DOM.CheckboxInput, "input[type=checkbox]");

/** See Ql.DOM.InputElement._sClassName. */
Ql.DOM.CheckboxInput.prototype._sClassName/*:String*/ = "Ql.DOM.CheckboxInput";


/** See Ql.DOM.InputElement.getValue() and DOM1-HTML.HTMLInputElement.checked. Requires DOM1-HTML.
*/
function $Ql$DOM$CheckboxInput$getValue() {
	Function.checkArgs($Ql$DOM$CheckboxInput$getValue, arguments);
	return this._.checked;
}
Ql.DOM.CheckboxInput.prototype.getValue = $Ql$DOM$CheckboxInput$getValue;


/** See Ql.DOM.InputElement.getTextContent(). Requires DOM1-HTML.
*/
function $Ql$DOM$CheckboxInput$getTextContent() {
	Function.checkArgs($Ql$DOM$CheckboxInput$getTextContent, arguments);
	return this._.checked && "[x]" || "[ ]" /*TODO: break*/;
}
Ql.DOM.CheckboxInput.prototype.getTextContent = $Ql$DOM$CheckboxInput$getTextContent;


/** See Ql.DOM.InputElement.setDefaultValue() and DOM1-HTML.HTMLInputElement.defaultChecked.
Requires DOM1-HTML.
*/
function $Ql$DOM$CheckboxInput$setDefaultValue(vValue) {
	Function.checkArgs($Ql$DOM$CheckboxInput$setDefaultValue, arguments, [null, Object.ANYTYPE]);
	if (vValue) {
		this.setAttribute("checked", "checked");
	} else {
		this.removeAttribute("checked");
	}
}
Ql.DOM.CheckboxInput.prototype.setDefaultValue = $Ql$DOM$CheckboxInput$setDefaultValue;


/** See Ql.DOM.InputElement.setValue() and DOM1-HTML.HTMLInputElement.checked. Requires DOM1-HTML.
*/
function $Ql$DOM$CheckboxInput$setValue(vValue) {
	Function.checkArgs($Ql$DOM$CheckboxInput$setValue, arguments, [null, Object.ANYTYPE]);
	this._.checked = !!vValue;
}
Ql.DOM.CheckboxInput.prototype.setValue = $Ql$DOM$CheckboxInput$setValue;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.ExclCheckboxInput


/** Wrapper for DOM1-HTML.HTMLInputElement, for type="radio".
*/
function $Ql$DOM$ExclCheckboxInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$ExclCheckboxInput, arguments);
	Ql.DOM.CheckboxInput.call(this);
}
Ql.DOM.ExclCheckboxInput = $Ql$DOM$ExclCheckboxInput;
Ql.DOM.ExclCheckboxInput.inheritFrom(Ql.DOM.CheckboxInput);
Ql.DOM.registerWrapperClass(Ql.DOM.ExclCheckboxInput, "input[type=radio]");

/** See Ql.DOM.CheckboxInput._sClassName. */
Ql.DOM.ExclCheckboxInput.prototype._sClassName/*:String*/ = "Ql.DOM.ExclCheckboxInput";


/** See Ql.DOM.CheckboxInput.getTextContent(). Requires DOM1-HTML.
*/
function $Ql$DOM$ExclCheckboxInput$getTextContent() {
	Function.checkArgs($Ql$DOM$ExclCheckboxInput$getTextContent, arguments);
	return this._.checked && "(x)" || "( )" /*TODO: break*/;
}
Ql.DOM.ExclCheckboxInput.prototype.getTextContent = $Ql$DOM$ExclCheckboxInput$getTextContent;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.ListInput


/** Wrapper for DOM1-HTML.HTMLSelectElement.
*/
function $Ql$DOM$ListInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$ListInput, arguments);
	Ql.DOM.InputElement.call(this);
}
Ql.DOM.ListInput = $Ql$DOM$ListInput;
Ql.DOM.ListInput.inheritFrom(Ql.DOM.InputElement);
Ql.DOM.registerWrapperClass(Ql.DOM.ListInput, "select");

/** See Ql.DOM.InputElement._sClassName. */
Ql.DOM.ListInput.prototype._sClassName/*:String*/ = "Ql.DOM.ListInput";


/** See Ql.DOM.InputElement.getDisplayValue(). Requires DOM1-HTML.

TODO: FIXME
*/
if (false) {
function $Ql$DOM$ListInput$getDisplayValue() {
	Function.checkArgs($Ql$DOM$ListInput$getDisplayValue, arguments);
	return this._.options[this._.selectedIndex].firstChild.nodeValue /*TODO: break*/;
}
Ql.DOM.ListInput.prototype.getDisplayValue = $Ql$DOM$ListInput$getDisplayValue;
}



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.TextInput


/** Wrapper for DOM1-HTML.HTMLInputElement, for type="text". It doesn’t add anything to
Ql.DOM.InputElement, but it’s useful for instanceof-based checks.
*/
function $Ql$DOM$TextInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$TextInput, arguments);
	Ql.DOM.InputElement.call(this);
}
Ql.DOM.TextInput = $Ql$DOM$TextInput;
Ql.DOM.TextInput.inheritFrom(Ql.DOM.InputElement);
Ql.DOM.registerWrapperClass(Ql.DOM.TextInput, "input[type=text]");

/** See Ql.DOM.InputElement._sClassName. */
Ql.DOM.TextInput.prototype._sClassName/*:String*/ = "Ql.DOM.TextInput";


/** See DOM1-HTML.HTMLInputElement.select. Requires DOM1-HTML.

return:Ql.DOM.TextInput
	this.
*/
function $Ql$DOM$TextInput$selectContent() {
	Function.checkArgs($Ql$DOM$TextInput$selectContent, arguments);
	this._.select();
	return this;
}
Ql.DOM.TextInput.prototype.selectContent = $Ql$DOM$TextInput$selectContent;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.FileInput


/** Wrapper for DOM1-HTML.HTMLInputElement, for type="file".
*/
function $Ql$DOM$FileInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$FileInput, arguments);
	Ql.DOM.TextInput.call(this);
}
Ql.DOM.FileInput = $Ql$DOM$FileInput;
Ql.DOM.FileInput.inheritFrom(Ql.DOM.TextInput);
Ql.DOM.registerWrapperClass(Ql.DOM.FileInput, "input[type=file]");

/** See Ql.DOM.TextInput._sClassName. */
/*String*/ Ql.DOM.FileInput.prototype._sClassName = "Ql.DOM.FileInput";


/** See Ql.DOM.TextInput.getValue(). Strips the path from the file name, since it’s fake (literally,
like “C:\fake_path”) in most browsers.
*/
function $Ql$DOM$FileInput$getValue() {
	Function.checkArgs($Ql$DOM$FileInput$getValue, arguments);
	return Ql.DOM.InputElement.prototype.getValue.call(this).replace(/^.*[\\\/]/, "");
}
Ql.DOM.FileInput.prototype.getValue = $Ql$DOM$FileInput$getValue;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.PasswordInput


/** Wrapper for DOM1-HTML.HTMLInputElement, for type="password". It doesn’t add anything to
Ql.DOM.TextInput, but it’s useful for instanceof-based checks.
*/
function $Ql$DOM$PasswordInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$PasswordInput, arguments);
	Ql.DOM.TextInput.call(this);
}
Ql.DOM.PasswordInput = $Ql$DOM$PasswordInput;
Ql.DOM.PasswordInput.inheritFrom(Ql.DOM.TextInput);
Ql.DOM.registerWrapperClass(Ql.DOM.PasswordInput, "input[type=password]");

/** See Ql.DOM.TextInput._sClassName. */
Ql.DOM.PasswordInput.prototype._sClassName/*:String*/ = "Ql.DOM.PasswordInput";



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.DOM.TextAreaInput


/** Wrapper for DOM1-HTML.HTMLTextAreaElement. It doesn’t add anything to Ql.DOM.TextInput, but it’s
useful for instanceof-based checks.
*/
function $Ql$DOM$TextAreaInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$TextAreaInput, arguments);
	Ql.DOM.TextInput.call(this);
}
Ql.DOM.TextAreaInput = $Ql$DOM$TextAreaInput;
Ql.DOM.TextAreaInput.inheritFrom(Ql.DOM.TextInput);
Ql.DOM.registerWrapperClass(Ql.DOM.TextAreaInput, "textarea");

/** See Ql.DOM.TextInput._sClassName. */
Ql.DOM.TextAreaInput.prototype._sClassName/*:String*/ = "Ql.DOM.TextAreaInput";



////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions


/** Initializes the page as soon as the DOM tree has been fully loaded; it is also (possibly, only)
invoked during a load event. It fires the earlyload and/or lateload events; see [DESIGN_8067 JS:
DOM: Page loading events] for information on these.

sSource:String
	Type of the event that triggered the call to this function.
*/
Ql._onInit = (function() {

	var bEarlyLoadFired = false;

	function $Ql$_onInit(sSource) {
		if (!bEarlyLoadFired) {
//			alert(sSource);
			bEarlyLoadFired = true;

			var e = Ql.DOM.document.createEvent("Events");
			e.initEvent("earlyload", false, false);
			Ql.DOM.document.dispatchEvent(e);
		}
		if (sSource == "load") {
			var e = Ql.DOM.document.createEvent("Events");
			e.initEvent("lateload", false, false);
			Ql.DOM.document.dispatchEvent(e);
		}
	}
	return $Ql$_onInit;
})();

if (document.addEventListener) {
	(function() {

		/** Receives an event, and de-registers itself.

		e:Event
			Event to handle.
		*/
		function $Ql$_onInit$_eventListener(e) {
			this.removeEventListener(e.type, Ql._onInit._eventListener, false);
			Ql._onInit(e.type);
		}
		Ql._onInit._eventListener = $Ql$_onInit$_eventListener;

		// DOM2-Events approach.
		document.addEventListener("DOMContentLoaded", Ql._onInit._eventListener, false);
		// DOM0/DOM2-Events approach. While this might be late for the earlyload event (compared to
		// DOMContentLoaded), it’s better than nothing, and we need it for the lateload event anyway.
		window.addEventListener("load", Ql._onInit._eventListener, false);
	})();
}


/** Enables Ql functionality for the page.
*/
function $Ql$modules$core$init() {

	/** Allows to use the Enter key to submit a form while the user’s focus is on a <select> element,
	as well as Ctrl+Enter for a <textarea> element.
	*/
	function onKeyPress_submitWithReturn(e) {
		if (e.keyCode == 0x0a /*LF*/ || e.keyCode == 0x0d /*CR*/) {
			var bWantCtrl = (Ql.DOM._getNodeName(e.target) == "textarea");
			if (!bWantCtrl || e.ctrlKey) {
				var eltTarget = Ql.DOM.wrap(e.target),
					 form = eltTarget.selectAncestor("form");
				if (form) {
					// Discard this key event, and create a new submit event.
					e.preventDefault();
					e = form.getOwnerDocument().createEvent("HTMLEvents");
					e.initEvent("submit", true, true);
					if (form.dispatchEvent(e))
						form.submit();
				}
			}
		}
	}
	this.addEventListener("keypress", onKeyPress_submitWithReturn, false);


	/** Prevents repeated (accidental) clicks on a form submit button.
	*/
	function onSubmit_debouncer(e) {
		var eltTarget = Ql.DOM.wrap(e.target);
		// Get every submit button that’s not already disabled.
		var arrButtons = eltTarget.select("button[type=submit]:enabled");
		arrButtons.callOnEach("disable");
		window.setTimeout(function() {
			arrButtons.callOnEach("enable");
			return true;
		}, Math.UI_SHORT_DELAY);
		return true;
	}
	this.addEventListener("submit", onSubmit_debouncer, false);


	// Wrap every Ql.DOM.CompositeElement-derived nodes from the server.
	this._wrapWholeTree();
}
// main-iefixes.js hasn’t been loaded yet, but it will take care of this as soon as possible, in
// case of IE5.5/IE6/IE7/IE8.
if (document.addEventListener) {
	Ql.DOM.document.addEventListener("earlyload", $Ql$modules$core$init, false);
}

