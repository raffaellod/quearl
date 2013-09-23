/* -*- coding: utf-8; mode: javascript; tab-width: 3 -*-

Copyright 2007, 2008, 2009, 2010, 2011, 2012, 2013
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

/** Elements made up by one or more native HTML components, with customized behavior. */



////////////////////////////////////////////////////////////////////////////////////////////////////
// Classes


////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp


/** Namespace for composite elements.
*/
Ql.Comp = {};
Ql.Comp.toString = Function.createToStringMethod("Ql.Comp");



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.BusyIndicator


/** Minimalistic animation to indicate background activity. It only supports being created
dynamically, not from server-generated markup.
*/
function $Ql$Comp$BusyIndicator() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$BusyIndicator, arguments);
	QlQl.DOM.CompositeElement.call(this);
}
Ql.Comp.BusyIndicator = $Ql$Comp$BusyIndicator;
Ql.Comp.BusyIndicator.inheritFrom(Ql.DOM.CompositeElement);
Ql.DOM.registerWrapperClass(Ql.Comp.BusyIndicator, "div.Ql-Comp-BusyIndicator");

/** See Ql.DOM.CompositeElement._sClassName. */
Ql.Comp.BusyIndicator.prototype._sClassName/*:String*/ = "Ql.Comp.BusyIndicator";


/** See Ql.DOM.CompositeElement._createNew().
*/
function $Ql$Comp$BusyIndicator$_createNew(doc) {
	this._ = doc._createElement("div");
	this.setAttribute("class", "Ql-Comp-BusyIndicator");
	// Create the background filler.
	this._.appendChild(doc._createElement("div"));
	// Create the bouncing bit.
	this._.appendChild(doc._createElement("span"));
	return this._;
}
Ql.Comp.BusyIndicator.prototype._createNew = $Ql$Comp$BusyIndicator$_createNew;


/** Sets the element next to which the animation will appear and its position relative to it, and
starts the animation.

elt:Ql.DOM.Element
	Element next to which the animation will appear.
[cxTrack:int]
	Width of the indicator’s bar; defaults to the full width of elt.
[iHDir:int]
	See argument iHDir of Ql.DOM.Element.setPosition().
[iVDir:int]
	See argument iVDir of Ql.DOM.Element.setPosition().
return:Ql.Comp.BusyIndicator
	this.
*/
function $Ql$Comp$BusyIndicator$setBuddy(
	elt, cxTrack /*= elt.getOffsetRect().width*/, iHDir /*= undefined*/, iVDir /*= undefined*/
) {
	Function.checkArgs(
		$Ql$Comp$BusyIndicator$setBuddy, arguments,
		Ql.DOM.Element, [undefined, Number], [undefined, Number]
	);
	if (cxTrack === undefined) {
		cxTrack = elt.getOffsetRect().width;
	}
	this.setStyle("visibility", "hidden");
	this.setStyle("width", cxTrack + "px");
	this.getLastChild().setStyle("width", (cxTrack * 0.1) + "px");
	// TODO: check if this is better for e.g. clipped parent elements:
	//    this.getOwnerDocument().getBody().appendChild(this);
	elt.getParentNode().appendChild(this);
	this.setPosition(elt, iHDir || 0, iVDir === undefined && +2 || iVDir);
	this.removeStyle("visibility");
	this._onBounce(true);
	return this;
}
Ql.Comp.BusyIndicator.prototype.setBuddy = $Ql$Comp$BusyIndicator$setBuddy;


/** Starts the sliding thumb animation, according to the specified direction.

bLtR:bool
	If true, the thumb will slide from left to right; if false, the inverse.
*/
function $Ql$Comp$BusyIndicator$_onBounce(bLtR) {
	// If the element is unlinked, stop restarting the animation.
	if (this.getParentNode()) {
		var eltThumb = this.getLastChild(),
			 mapAnim = {elt: eltThumb, prop: "left", units: "px", fn: "braked"};
		mapAnim[!bLtR ? "start" : "end"] = this._.offsetWidth - eltThumb._.offsetWidth;
		mapAnim[bLtR ? "start" : "end"] = 0;
		new Ql.Animation(
			[mapAnim],
			Math.UI_MEDIUM_DELAY,
			this._onBounce.bind(this, !bLtR)
		);
	}
}
Ql.Comp.BusyIndicator.prototype._onBounce = $Ql$Comp$BusyIndicator$_onBounce;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.ColUL


/** Table-structured list.

Though it’s composed by multiple table sections, every method inherited from Ql.DOM.Table actually
manipulates the tbody of index 1, the “main” one.
*/
function $Ql$Comp$ColUL() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$ColUL, arguments);
	Ql.DOM.Table.call(this);
	Ql.DOM.CompositeElement.call(this);
}
Ql.Comp.ColUL = $Ql$Comp$ColUL;
Ql.Comp.ColUL.inheritFrom(Ql.DOM.Table);
Ql.Comp.ColUL.augmentWith(Ql.DOM.CompositeElement);
Ql.DOM.registerWrapperClass(Ql.Comp.ColUL, "table.Ql-Comp-ColUL");

/** See Ql.DOM.Table._sClassName. */
Ql.Comp.ColUL.prototype._sClassName/*:String*/ = "Ql.Comp.ColUL";
/** Index of the column, and direction, of the current sorting order. */
Ql.Comp.ColUL.prototype._m_iSortMode/*:int*/ = 0;


/** See Ql.DOM.Table.appendRow(). It can also create all the row’s cells from a specified array. If
the table is currently sorted, the row will be inserted at the appropriate sorted position, instead
of the end of the table.

[arrCells:Array((String|Ql.DOM.Node)*)]
	Contents of each cell. Indices not in the array will result in empty cells.
[iWeight:int]
	Weight of the row; defaults to 0. Sorted tables sort by weight first, and then by the actual cell
	contents.
return:Ql.DOM.TableRow
	The new row created.
*/
function $Ql$Comp$ColUL$appendRow(arrCells /*= null*/, iWeight /*= 0*/) {
	return this.insertRow(-1, arrCells, iWeight);
}
Ql.Comp.ColUL.prototype.appendRow = $Ql$Comp$ColUL$appendRow;


/** See Ql.DOM.CompositeElement._createNew().
*/
function $Ql$Comp$ColUL$_createNew(doc) {
	this._ = doc._createElement("table");
	this.addCssClass("Ql-Comp-ColUL");
	var thead = this.createTHead(), tfoot = this.createTFoot(),
		 tbodyEmptyBanner = this.appendTBody(), tbodyMain = this.appendTBody();
	tfoot.appendRow().appendCell().setAttribute("class", "Ql-Comp-ColUL_footline");
	tbodyMain.addCssClass("Ql-Comp-ColUL_mainbody");
	tbodyEmptyBanner.addCssClass("Ql-Comp-ColUL_emptybanner");
	tbodyEmptyBanner.appendRow().appendCell().setTextContent(L10n.CORE_LIST_NOITEMS);
	return this._;
}
Ql.Comp.ColUL.prototype._createNew = $Ql$Comp$ColUL$_createNew;


/** See Ql.DOM.Table.deleteRow(). When the ColUL is emptied, this shows the empty banner.
*/
function $Ql$Comp$ColUL$deleteRow(i) {
	Function.checkArgs($Ql$Comp$ColUL$deleteRow, arguments, Number);
	var tbodyMain = this.getTBody(1), tr = tbodyMain.getRow(i);
	if (tr) {
		tr.unlink();
	}
	if (!tbodyMain.getRowCount()) {
		this.getTBody(0).removeStyle("display");
	}
}
Ql.Comp.ColUL.prototype.deleteRow = $Ql$Comp$ColUL$deleteRow;


/** See Ql.DOM.Table.getRow(). This will only return rows from the main tbody.
*/
function $Ql$Comp$ColUL$getRow(i) {
	Function.checkArgs($Ql$Comp$ColUL$getRow, arguments, Number);
	return this.getTBody(1).getRow(i);
}
Ql.Comp.ColUL.prototype.getRow = $Ql$Comp$ColUL$getRow;


/** See Ql.DOM.Table.insertRow(). It can also create all the row’s cells from a specified array.

i:int
	Index the new row should be inserted at, overriding any active sorting.
[arrCells:Array((String|Ql.DOM.Node)*)]
	Contents of each cell. Indices not in the array will result in empty cells.
[iWeight:int]
	Weight of the row; defaults to 0. Sorted tables sort by weight first, and then by the actual cell
	contents.
return:Ql.DOM.TableRow
	The new row created.
*/
function $Ql$Comp$ColUL$insertRow(i, arrCells /*= null*/, iWeight /*= 0*/) {
	Function.checkArgs(
		$Ql$Comp$ColUL$insertRow, arguments,
		Number, [undefined, null, Array], [undefined, null, Number]
	);
	var trHeader = this.getTHead().getRow(0),
		 cColumns = trHeader.getCellCount(),
		 tbodyMain = this.getTBody(1),
		 tr = this.getOwnerDocument().createElement("tr");
	for (var i = 0; i < cColumns; ++i) {
		var td = tr.appendCell();
		td.setAttribute("class", trHeader.getCell(i).getAttribute("class") + " col" + (i + 1));
		if (arrCells && arrCells[i]) {
			if (arrCells[i] instanceof Ql.DOM.Node) {
				td.appendChild(arrCells[i]);
			} else {
				td.setTextContent(arrCells[i].toString());
			}
		}
	}
	if (iWeight != null) {
		tr.setAttribute("weight", iWeight.toString());
	}

	// Calculate the index at which the new row will be inserted.
	var cRows = tbodyMain.getRowCount();
	if (i == -1) {
		if (this._m_iSortMode) {
			// TODO: special-case non-String sort data.
			var iSortCol = Math.abs(this._m_iSortMode) - 1;
			// In the sort order, the actual string comparison only matters for same-weight rows;
			// otherwise, a positive weight makes a row sink, while a negative one makes it float above
			// the rest.
			i = Sorting.insertionIndex(
				{
					"w": iWeight || 0,
					"s": tr.getCell(iSortCol).getTextContent().trim()
				},
				cRows,
				Ql.Comp.ColUL._sort_mkKey.bind(tbodyMain, iSortCol),
				Ql.Comp.ColUL[this._m_iSortMode < 0 ? "_sort_compareDesc" : "_sort_compareAsc"]
			);
		} else {
			i = cRows;
		}
	}
	// And now, insert the row at the calculated index.
	tbodyMain.insertBefore(tr, i < cRows ? tbodyMain.getRow(i) : null);
	// If the tbody was empty, now it’s not, so hide the empty banner.
	if (!cRows) {
		this.getTBody(0).setStyle("display", "none");
	}
	return tr;
}
Ql.Comp.ColUL.prototype.insertRow = $Ql$Comp$ColUL$insertRow;


/** Enables rows sorting by clicking on column headers, creating the necessary UI elements.

th:Ql.DOM.TableCell
	Column header to be made interactive.
*/
function $Ql$Comp$ColUL$_mkSortHeader(th, iCol) {
	// Convert free text into sort links.
	th.convertTextNodesToLinks(
		this._onSortHeaderClick, null, L10n.CORE_LIST_SORTBY_TIP.asFormat(th.getTextContent().trim())
	);
	// Add a sort arrow.
	var eltSortArrow = this.getOwnerDocument().createElement("span");
	eltSortArrow.setAttribute("class", "Ql-Comp-ColUL_sortarrow");
	if (Math.abs(this._m_iSortMode) - 1 == iCol) {
		eltSortArrow.setTextContent(this._m_iSortMode < 0 ? " ↑ " : " ↓ ");
	} else {
		eltSortArrow.setStyle("display", "none");
	}
	if (th.isCssClass("ar")) {
		th.insertBefore(eltSortArrow, th.getFirstChild());
	} else {
		th.appendChild(eltSortArrow);
	}
}
Ql.Comp.ColUL.prototype._mkSortHeader = $Ql$Comp$ColUL$_mkSortHeader;


/** Creates column headers and footers.

arrHeaders:Array(var+)
	TODO: ?
[arrFooters:Array(var+)]
	TODO: ?
return:Ql.Comp.ColUL
	this.
*/
function $Ql$Comp$ColUL$setColumns(arrHeaders, arrFooters /*= []*/) {
	Function.checkArgs($Ql$Comp$ColUL$setColumns, arguments, Array, [undefined, Array]);
	var cColumns = arrHeaders.length,
		 thead = this.getTHead(), tfoot = this.getTFoot();
	thead.setTextContent(null);
	tfoot.setTextContent(null);

	// Create the column headers.
	var tr = thead.appendRow();
	for (var i = 0; i < cColumns; ++i) {
		var vHeader = arrHeaders[i],
			 th = tr.appendChild(this.getOwnerDocument().createElement("th"));
		th.setAttribute("scope", "col");
		if (vHeader instanceof Object) {
			if ("header" in vHeader && vHeader["header"] instanceof Ql.DOM.Node) {
				th.appendChild(vHeader["header"]);
			} else {
				// A NBSP ensures that at least one character ends up in the cell; otherwise some
				// browsers won’t render the cell at all.
				th.setTextContent("header" in vHeader ? vHeader["header"].toString() : " ");
			}
			// TODO: this should be replaced by automatic CSS class names, available for styling,
			// removing presentation from code.
			if ("align" in vHeader) {
				th.setAttribute(
					"class", {"-1": "al", "0": "ac", "1": "ar"}[vHeader["align"].toString()]
				);
			}
		} else {
			// Fall back to NBSP for the reason above.
			th.setTextContent(vHeader ? vHeader.toString() : " ");
		}
		this._mkSortHeader(th, i);
	}

	// Create the footer border.
	var td = tfoot.appendRow().appendCell();
	td.setAttribute("class", "Ql-Comp-ColUL_footline");
	td.setAttribute("colspan", cColumns.toString());
	// Again, make sure the cell is rendered by putting a NBSP in it.
	td.setTextContent(" ");

	// Create the footer(s).
	var cFooters = (arrFooters && arrFooters.length || 0);
	if (cFooters) {
		tr = tfoot.appendRow();
		for (var i = 0, iCol = 0; i < cFooters; ++i, ++iCol) {
			var vFooter = arrFooters[i], td = tr.appendCell(), bAligned = false;
			if (vFooter instanceof Object) {
				if ("footer" in vFooter && vFooter["footer"] instanceof Ql.DOM.Node) {
					td.appendChild(vFooter["footer"]);
				} else {
					td.setTextContent("footer" in vFooter ? vFooter["footer"].toString() : "");
				}
				// TODO: this should be replaced by automatic CSS class names, available for styling,
				// removing presentation from code.
				if ("align" in vFooter) {
					td.setAttribute(
						"class", {"-1": "al", "0": "ac", "1": "ar"}[vFooter["align"].toString()]
					);
					bAligned = true;
				}
				if ("colspan" in vFooter) {
					td.setAttribute("colspan", vFooter["colspan"].toString());
					// Skip colspan-1 additional columns.
					iCol += vFooter["colspan"] - 1;
				}
			} else {
				td.setTextContent(vFooter.toString());
			}
			// If no alignment was specified for this footer cell, use the alignment for the whole
			// column, if possible.
			// TODO: this should be replaced by automatic CSS class names, available for styling,
			// removing presentation from code.
			if (!bAligned && arrHeaders[iCol] instanceof "object" && "align" in arrHeaders[iCol]) {
				td.setAttribute(
					"class", {"-1": "al", "0": "ac", "1": "ar"}[arrHeaders[iCol]["align"].toString()]
				);
			}
		}
	}

	// Adjust the width of the empty banner.
	this.getTBody(0).getRow(0).getCell(0).setAttribute("colspan", cColumns.toString());
	return this;
}
Ql.Comp.ColUL.prototype.setColumns = $Ql$Comp$ColUL$setColumns;


/** Sorts the rows according to the value in a column.

TODO: special case sorting by Date - custom attribute to specify type?

[iSortCol:int]
	Index of the column by which to sort the rows; defaults to 0.
[iSortDir:int]
	Sort order: +1 means ascending (default), -1 descending.
return:Ql.Comp.ColUL
	this.
*/
function $Ql$Comp$ColUL$sort(iSortCol /*= 0*/, iSortDir /*= +1*/) {
	Function.checkArgs($Ql$Comp$ColUL$sort, arguments, [undefined, Number], [undefined, Number]);
	if (iSortCol === undefined) {
		iSortCol = 0;
	}
	if (iSortDir === undefined) {
		iSortDir = +1;
	}
	var tbodyMain = this.getTBody(1), cRows = tbodyMain.getRowCount();
	// In the sort order, the actual string comparison only matters for same-weight rows; otherwise,
	// a positive weight makes a row sink, while a negative one makes it float above the rest.
	Sorting.stableSort(
		cRows,
		Ql.Comp.ColUL._sort_mkKey.bind(tbodyMain, iSortCol),
		function(map, iRow) {
			tbodyMain.insertBefore(map["tr"], tbodyMain.getRow(iRow));
		},
		Ql.Comp.ColUL[iSortDir < 0 ? "_sort_compareDesc" : "_sort_compareAsc"]
	);
	return this;
}
Ql.Comp.ColUL.prototype.sort = $Ql$Comp$ColUL$sort;


/** Compares two cells, in ascending order.

map1:Object(?)
	TODO: ?
map2:Object(?)
	TODO: ?
return:int
	TODO: ?
*/
function $Ql$Comp$ColUL$_sort_compareAsc(map1, map2) {
	if (map1["w"] == map2["w"]) {
		return map1["s"].natCompareNoCase(map2["s"]);
	} else {
		return map1["w"] - map2["w"];
	}
}
Ql.Comp.ColUL._sort_compareAsc = $Ql$Comp$ColUL$_sort_compareAsc;


/** Compares two cells, in descending order.

map1:Object(?)
	TODO: ?
map2:Object(?)
	TODO: ?
return:int
	TODO: ?
*/
function $Ql$Comp$ColUL$_sort_compareDesc(map1, map2) {
	if (map1["w"] == map2["w"]) {
		return -map1["s"].natCompareNoCase(map2["s"]);
	} else {
		return map1["w"] - map2["w"];
	}
}
Ql.Comp.ColUL._sort_compareDesc = $Ql$Comp$ColUL$_sort_compareDesc;


/** Creates a sort key from a cell. Called with tbodyMain for context.

iCol:int
	Column index.
iRow:int
	Row index.
return:Object(?)
	TODO: ?
*/
function $Ql$Comp$ColUL$_sort_mkKey(iCol, iRow) {
	var tr = this.getRow(iRow), sWeight = tr.getAttribute("weight");
	return {
		"w": sWeight ? parseInt(sWeight) : 0,
		"s": tr.getCell(iCol).getTextContent().trim(),
		"tr": tr
	};
}
Ql.Comp.ColUL._sort_mkKey = $Ql$Comp$ColUL$_sort_mkKey;


/** See Ql.DOM.Table._wrap(). It also makes the column headers clickable.
*/
function $Ql$Comp$ColUL$_wrap(elt) {
	Ql.DOM.Table.prototype._wrap.call(this, elt);
	var thead = this.getTHead(), trHeader, cColumns;
	if (thead && (trHeader = thead.getRow(0)) && (cColumns = trHeader.getCellCount())) {
		// Adjust the column headers, and find out which column holds the sort key.
		for (var i = 0; i < cColumns; ++i) {
			var th = trHeader.getCell(i);
			if (th.isCssClass("sortasc")) {
				th.removeCssClass("sortasc");
				this._m_iSortMode = i + 1;
			} else if (th.isCssClass("sortdesc")) {
				th.removeCssClass("sortdesc");
				this._m_iSortMode = -(i + 1);
			}
		}
		// Now that the sort order has been determined, column headers can be made intereractive.
		// TODO: good spot to add class="nosort" detection.
		for (var i = 0; i < cColumns; ++i) {
			this._mkSortHeader(trHeader.getCell(i), i);
		}

		// Adjust the width of the all-spanning cells to match.
		this.getTFoot().getRow(0).getCell(0).setAttribute("colspan", cColumns.toString());
		this.getTBody(0).getRow(0).getCell(0).setAttribute("colspan", cColumns.toString());
	}

	// Private data need the wrapper to stay.
	return this.lockWrapper();
}
Ql.Comp.ColUL.prototype._wrap = $Ql$Comp$ColUL$_wrap;


/** (Re-)sorts the table by the column whose header was clicked, or reverses the sort order if the
table was already sorted by that column.

e:Event
	Event to handle.
*/
function $Ql$Comp$ColUL$_onSortHeaderClick(e) {
	e.preventDefault();
	var th = this.selectAncestor("th"),
		 eltSortArrow = th.select(".Ql-Comp-ColUL_sortarrow")[0],
		 cul = th.getParentNode().getParentNode().getParentNode(),
		 iCol = th.getIndexOfType(), iSortCol = Math.abs(cul._m_iSortMode) - 1;
	if (iCol == iSortCol) {
		// Click on the column that’s already the sort key: reverse the sort order.
		cul._m_iSortMode = -cul._m_iSortMode;
	} else {
		// Click on a different column: re-sort.
		if (iSortCol >= 0) {
			th.getParentNode().getCell(iSortCol).select(
				".Ql-Comp-ColUL_sortarrow"
			)[0].setStyle("display", "none");
		}
		cul._m_iSortMode = iCol + 1;
		eltSortArrow.removeStyle("display");
	}
	// Update the sort cue arrow, and sort the rows.
	eltSortArrow.setTextContent(cul._m_iSortMode < 0 ? " ↑ " : " ↓ ");
	cul.sort(iCol, cul._m_iSortMode < 0 ? -1 : +1);
}
Ql.Comp.ColUL.prototype._onSortHeaderClick = $Ql$Comp$ColUL$_onSortHeaderClick;


/** Adds a row, with an animation effect.

TODO: FIXME: non funziona, perché nessuna proprietà height (offsetHeight, height CSS istantanea)
viene calcolata se l'elemento non è visibile, quindi non si può sapere a priori che altezza dovrà
raggiungere l'animazione.
*/
if (false) Ql.Comp.ColUL.animAdd = function(vRow, i /*= -1*/, onComplete /*= null*/) {
	var tr;
	if (vRow instanceof Array) {
		tr = this.create();
		for (var iC = 0; iC < vRow.length; ++iC) {
			tr.childNodes[iC].appendChildM(vRow[iC]);
		}
	} else {
		tr = vRow;
	}
	tr.setStyle("display", "none");
	this.add(tr, i);
	tr.removeStyle("display");
	if (onComplete) {
		onComplete(tr);
	}
	return tr;
};


/** Removes a row, with an animation effect.

TODO: FIXME

i:int
	Index of the row to be removed.
[onComplete:Function]
	Function to be called when the animation completes.
*/
if (false) Ql.Comp.ColUL.animRemove = function(i, onComplete /*= null*/) {
	// <tr>s and <td>s don't have an own height; to make this work, the contents of each <td> are
	// moved into a temporary <div>, whose height is directly modifiable.
	var tr = this.rows[i],
		 arrSetups = [],
		 arrTargets = [];
	if (tr._bDeleting) {
		return;
	}
	tr._bDeleting = true;
	arrSetups.length = arrTargets.length = tr.cells.length;
	Array.forEach(tr.cells, function(td, i) {
		var div = document.createElement("div"),
			 o;
		while (o = td.firstChild) {
			div.appendChild(o);
		}
		td.appendChild(div);
		div.setStyle("overflow", "hidden");
		arrTargets.push(
			{elt: div, prop: "height", start: div.offsetHeight, end: 0, units: "px", fn: "accelerated"}
		);
	});
	new Ql.Animation(
		arrTargets,
		Math.UI_SHORT_DELAY,
		(function() {
			this.remove(tr.sectionRowIndex);
			if (onComplete) {
				onComplete(tr);
			}
		}).bind(this)
	);
};


/** Removes all the rows, clearing the list.

TODO: FIXME
*/
if (false) Ql.Comp.ColUL.removeAll = function() {
	var o;
	while (o = this.firstChild) {
		this.removeChild(o);
	}
};


/** Scambia due righe, opzionalmente con un'animazione.

TODO: FIXME
*/
if (false) Ql.Comp.ColUL.swap = function(iSrc, iDst, bAnimate /*= false*/, onComplete /*= null*/) {
	if (Math.min(iSrc, iDst) < 0 || Math.max(iSrc, iDst) >= this.rows.length) {
		return false;
	}
	if (iSrc == iDst) {
		return true;
	}
	var trSrc = this.rows[iSrc], trDst = this.rows[iDst], tblAnim;


	var fnComplete = (function() {
		if (bAnimate) {
			;//trDst.setStyle("visibility", "hidden");
		}
		this.removeChild(trSrc);
		this.insertBefore(trDst, iSrc < this.rows.length ? this.rows[iSrc] : null);
		this.insertBefore(trSrc, iDst < this.rows.length ? this.rows[iDst] : null);
		if (bAnimate) {
			/*trSrc.removeStyle("visibility");
			tblAnim.fxFadeOut(Math.SMOOTH_RATE * Math.SMOOTH_STEPS, function() {
				tblAnim.parentNode.removeChild(tblAnim);
			});
			trDst.fxFadeIn(Math.SMOOTH_RATE * Math.SMOOTH_STEPS);*/
		}
		if (onComplete) {
			onComplete(trSrc);
		}
	}).bind(this);


	/*if (bAnimate) {
		var arrSteps, iStep = Math.SMOOTH_STEPS;

		var onMoveStep = (function() {
			if (iStep-- > 0) {
				tblAnim.setStyle("top", arrSteps[iStep] + "px");
				window.setTimeout(onMoveStep, Math.SMOOTH_RATE);
			} else {
				fnComplete();
			}
		}).bind(this);

		var xySrc = trSrc.getPosition(???), cyDst = trDst.getPosition(???)[1];
		tblAnim = this.parentNode._getDetachedRowClone(trSrc.sectionRowIndex);
		tblAnim.setStyle("left", xySrc[0] + "px");
		tblAnim.setStyle("top",  xySrc[1] + "px");
		tblAnim.rows[0].addCssClass("ql_colul_oHighlighted");
		document.getBody().appendChild(tblAnim);
		trSrc.setStyle("visibility", "hidden");
		// Se si muove verso il basso, dovrà toccare il margine inferiore.
		if (iSrc < iDst) {
			cyDst += trDst.offsetHeight - trSrc.offsetHeight;
		}

		arrSteps = Array.fillAnimSteps("smoothscroll", iStep);
		dy = xySrc[1] - cyDst;
		for (var i = 0; i < iStep; ++i) {
			arrSteps[i] = Math.round(cyDst + arrSteps[i] * dy, 2);
		}
		window.setTimeout(onMoveStep, Math.SMOOTH_RATE);
	} else {*/
		fnComplete();
	//}
	return true;
};


/** Crea una tabella temporanea contenente la riga specificata, identica in tutto e per tutto
all'originale.

TODO: FIXME
*/
if (false) Ql.Comp.ColUL.prototype._getDetachedRowClone = function(i) {
	var trSrc = this.getRow(i), trClone = trSrc.cloneNode(true),
		 arrCells = trClone.select(":self > td");
	Array.forEach(trSrc.cells, function(th, i) {
		// Sembra che chi non restituisce la larghezza in pixel qui, permette
		// di usare offsetWidth.
		var cx = th.offsetWidth + "px";
		arrCells[i].setStyle("width", cx);
	});
	var table = this.getOwnerDocument().createElement("table");
	table.setAttribute("class", this.getAttribute("class"));
	table.setStyle("position", "absolute");
	table.setStyle("margin-left", "0");
	table.setStyle("margin-top", "0");
	var tr = table.appendTBody().appendRow();
	tr.setAttribute("class", trClone.getAttribute("class"));
	while (trClone.firstChild) {
		tr.appendChild(trClone.firstChild);
	}
	return table;
};



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.ExclCheckboxListInput


/** Manages multiple ExclCheckboxListInput elements, combining them into a single one, effectively
making them behave as a single-selection list.
*/
function $Ql$DOM$ExclCheckboxListInput() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$DOM$ExclCheckboxListInput, arguments);
	Ql.DOM.ListInput.call(this);
}
Ql.Comp.ExclCheckboxListInput = $Ql$DOM$ExclCheckboxListInput;
Ql.Comp.ExclCheckboxListInput.inheritFrom(Ql.DOM.ListInput);
Ql.DOM.registerWrapperClass(Ql.Comp.ExclCheckboxListInput, "div.Ql-Comp-ExclCheckboxListInput");

/** See Ql.DOM.ListInput._sClassName. */
Ql.Comp.ExclCheckboxListInput.prototype._sClassName/*:String*/ = "Ql.Comp.ExclCheckboxListInput";


/** See Ql.DOM.ListInput.blur().
*/
function $Ql$Comp$ExclCheckboxListInput$blur() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$blur, arguments);
	this._getInputElements().callOnEach("blur");
	return this;
}
Ql.Comp.ExclCheckboxListInput.prototype.blur = $Ql$Comp$ExclCheckboxListInput$blur;


/** See Ql.DOM.ListInput.disable().
*/
function $Ql$Comp$ExclCheckboxListInput$disable() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$disable, arguments);
	this._getInputElements().callOnEach("disable");
	return this;
}
Ql.Comp.ExclCheckboxListInput.prototype.disable = $Ql$Comp$ExclCheckboxListInput$disable;


/** See Ql.DOM.ListInput.enable().
*/
function $Ql$Comp$ExclCheckboxListInput$enable() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$enable, arguments);
	this._getInputElements().callOnEach("enable");
	return this;
}
Ql.Comp.ExclCheckboxListInput.prototype.enable = $Ql$Comp$ExclCheckboxListInput$enable;


/** See Ql.DOM.ListInput.focus(). This sets the focus on the first managed checkbox.
*/
function $Ql$Comp$ExclCheckboxListInput$focus() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$focus, arguments);
	// Focus the first element. Better than nothing, right?
	var arrInputs = this._getInputElements();
	if (arrInputs.length) {
		arrInputs[0].focus();
	}
	return this;
}
Ql.Comp.ExclCheckboxListInput.prototype.focus = $Ql$Comp$ExclCheckboxListInput$focus;


/** Returns the set of input elements managed by this container.
*/
function $Ql$Comp$ExclCheckboxListInput$_getInputElements() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$_getInputElements, arguments);
	// Only select radio inputs with a name attribute matching the suffix of the id attribute of this
	// element.
	var sIdPrefix = this.selectAncestor("form").getAttribute("id") + "__",
		 sName = this.getAttribute("id").substr(sIdPrefix.length);
	return this.select("input[type=radio][name='" + sName + "']");
}
Ql.Comp.ExclCheckboxListInput.prototype._getInputElements =
	$Ql$Comp$ExclCheckboxListInput$_getInputElements;


/** See Ql.DOM.CheckboxInput.getTextContent(). Elements of this class behave just like containers,
so the default “recursively show all” function from Ql.DOM.Element is more fit than
Ql.DOM.CheckboxInput’s version.
*/
Ql.Comp.ExclCheckboxListInput.prototype.getTextContent = Ql.DOM.Element.prototype.getTextContent;


/** See Ql.DOM.ListInput.getValue().
*/
function $Ql$Comp$ExclCheckboxListInput$getValue() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$getValue, arguments);
	var arrInputs = this._getInputElements();
	for (var i = 0, c = arrInputs.length; i < c; ++i) {
		// If the radio element is checked, return its value.
		if (arrInputs[i].getValue()) {
			return arrInputs[i].getAttribute("value");
		}
	}
	return null;
}
Ql.Comp.ExclCheckboxListInput.prototype.getValue = $Ql$Comp$ExclCheckboxListInput$getValue;


/** See Ql.DOM.ListInput.isDisabled().
*/
function $Ql$Comp$ExclCheckboxListInput$isDisabled() {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$isDisabled, arguments);
	var arrInputs = this._getInputElements();
	// TODO: maybe keep track with a member variable instead of relying on the first item?
	return arrInputs.length ? arrInputs[0].isDisabled() : false;
}
Ql.Comp.ExclCheckboxListInput.prototype.isDisabled = $Ql$Comp$ExclCheckboxListInput$isDisabled;


/** See Ql.DOM.ListInput.setDefaultValue() and Ql.Comp.ExclCheckboxListInput.setValue().
*/
function $Ql$Comp$ExclCheckboxListInput$setDefaultValue(vValue) {
	Function.checkArgs(
		$Ql$Comp$ExclCheckboxListInput$setDefaultValue, arguments, [null, Object.ANYTYPE]
	);
	var arrInputs = this._getInputElements();
	for (var i = 0, c = arrInputs.length; i < c; ++i) {
		arrInputs[i].setDefaultValue(vValue !== null && arrInputs[i].getAttribute("value") == vValue);
	}
}
Ql.Comp.ExclCheckboxListInput.prototype.setDefaultValue =
	$Ql$Comp$ExclCheckboxListInput$setDefaultValue;


/** See Ql.DOM.ListInput.setValue().
*/
function $Ql$Comp$ExclCheckboxListInput$setValue(vValue) {
	Function.checkArgs($Ql$Comp$ExclCheckboxListInput$setValue, arguments, [null, Object.ANYTYPE]);
	var arrInputs = this._getInputElements();
	for (var i = 0, c = arrInputs.length; i < c; ++i) {
		// Put on, or remove, a checkmark on it, depending on whether a non-null value was specified,
		// and this option has that same value.
		arrInputs[i].setValue(vValue !== null && arrInputs[i].getAttribute("value") == vValue);
	}
}
Ql.Comp.ExclCheckboxListInput.prototype.setValue = $Ql$Comp$ExclCheckboxListInput$setValue;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.Form


/** Asynchronous form.

It assumes that input elements have id = form’s id + "__" + input name, where name doesn’t
necessarily match a name attribute, since that’s impossible for elements of Ql.DOM.CompositeElement-
derived classes which, instead, host a number of elements with class-defined name/id attributes.

Also, for each input elements, it assumes the existence of an hidden input element of id = form’s
id + "_prev__" + input name, containing the last server-stored value of the input element; this will
be used to ensure coherency on updates.
*/
function $Ql$Comp$Form() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$Form, arguments);
	Ql.DOM.Form.call(this);
	Ql.DOM.CompositeElement.call(this);
}
Ql.Comp.Form = $Ql$Comp$Form;
Ql.Comp.Form.inheritFrom(Ql.DOM.Form);
Ql.Comp.Form.augmentWith(Ql.DOM.CompositeElement);
Ql.DOM.registerWrapperClass(Ql.Comp.Form, "form.Ql-Comp-Form");

/** See Ql.DOM.Form._sClassName. */
Ql.Comp.Form.prototype._sClassName/*:String*/ = "Ql.Comp.Form";
Ql.Comp.Form.prototype.busy = false;


/** Notifies clients that the form was updated asynchronously.

e.asyncResponse:Object(var*)
	Form validation results.
*/
Ql.EventTarget.declareEvent(Ql.Comp.Form, "asyncupdate");


/** See Ql.DOM.CompositeElement._createNew().
*/
function $Ql$Comp$Form$_createNew(doc) {
	this._ = doc._createElement("form");
	this.addCssClass("Ql-Comp-Form");
	return this._;
}
Ql.Comp.Form.prototype._createNew = $Ql$Comp$Form$_createNew;


/** Returns the previous value of a field. If no such previous value exists, as in the case of a
newly-browser-generated array field item, null is returned instead.

sName:String
	Name of the field.
return:var
	Previous contents of the field.
*/
function $Ql$Comp$Form$getFieldPrevValue(sName) {
	Function.checkArgs($Ql$Comp$Form$getFieldPrevValue, arguments, String);
	var arrElts = this.select("#" + this.getAttribute("id") + "_prev__" + sName);
	if (!arrElts.length) {
		return null;
	}
	return arrElts[0].getValue().jsonDecode();
}
Ql.Comp.Form.prototype.getFieldPrevValue = $Ql$Comp$Form$getFieldPrevValue;


/** Returns the value of a field. The (String) value of a checkbox is returned only if its displayed
value (i.e. checkmark) is true; otherwise, a null is returned.

vElement:(String|Ql.DOM.InputElement)
	Name of the field, or the field’s input element itself.
return:var
	Current contents of the field.
*/
function $Ql$Comp$Form$getFieldValue(vElement) {
	Function.checkArgs($Ql$Comp$Form$getFieldValue, arguments, [String, Ql.DOM.InputElement]);
	var elt = (vElement instanceof Ql.DOM.InputElement ? vElement : this.getInputElement(vElement));
	return elt.getValue();
}
Ql.Comp.Form.prototype.getFieldValue = $Ql$Comp$Form$getFieldValue;


/** Returns an input element in the form, given its name.

sName:String
	Name of the input element to retrieve.
return:Ql.DOM.InputElement
	Input element.
*/
function $Ql$Comp$Form$getInputElement(sName) {
	Function.checkArgs($Ql$Comp$Form$getInputElement, arguments, String);
	var arrElts = this.select("#" + this.getAttribute("id") + "__" + sName);
	return arrElts.length ? arrElts[0] : null;
}
Ql.Comp.Form.prototype.getInputElement = $Ql$Comp$Form$getInputElement;


/** Returns a map of input elements in the form. Logically similar to
DOM1-HTML.HTMLFormElement.elements, but with names as keys, instead of numbers. In case of nested
elements of Ql.DOM.CompositeElement-derived classes (e.g. some Ql.DOM.ExclCheckboxInput elements in
a containing Ql.Comp.ExclCheckboxListInput), only the topmost element will be returned; this allows
to easily handle composite elements.

return:Object(Ql.DOM.InputElement*)
	Input elements.
*/
function $Ql$Comp$Form$getInputElements() {
	Function.checkArgs($Ql$Comp$Form$getInputElements, arguments);
	var sIdPrefix = this.getAttribute("id") + "__", cchIdPrefix = sIdPrefix.length,
		 map = {}, nd, stkLevelResume = [this._.firstChild];
	do {
		nd = stkLevelResume.pop();
		while (nd) {
			if (nd.nodeType == Node.ELEMENT_NODE) {
				var cls = Ql.DOM.wrapperClassFor(nd);
				if (cls === Ql.DOM.InputElement || cls.prototype instanceof Ql.DOM.InputElement) {
					// Either a native top-level input element, or a custom element class: grab it, if
					// the id is properly prefixed.
					var sId = nd.getAttribute("id");
					if (sId && sId.substr(0, cchIdPrefix) == sIdPrefix) {
						map[sId.substr(cchIdPrefix)] = Ql.DOM.wrap(nd);
					}
				} else if (nd.firstChild) {
					// Not an input element, but has children: descend into it.
					stkLevelResume.push(nd.nextSibling);
					nd = nd.firstChild;
					continue;
				}
			}
			nd = nd.nextSibling;
		}
	} while (stkLevelResume.length);
	return map;
}
Ql.Comp.Form.prototype.getInputElements = $Ql$Comp$Form$getInputElements;


/** Changes the previous value of a field.

sName:String
	Name of the field.
vValue:var
	New previous value.
*/
function $Ql$Comp$Form$setFieldPrevValue(sName, vValue) {
	Function.checkArgs($Ql$Comp$Form$setFieldPrevValue, arguments, String, [null, Object.ANYTYPE]);
	this.select(
		"#" + this.getAttribute("id") + "_prev__" + sName
	)[0].setValue(Object.toJSONString(vValue));
}
Ql.Comp.Form.prototype.setFieldPrevValue = $Ql$Comp$Form$setFieldPrevValue;


/** Changes the current value of a field. Any non-false/non-null value will turn a checkbox on.

vElement:(String|Ql.DOM.InputElement)
	Name of the field, or the field’s input element itself.
vValue:var
	New contents of the field.
*/
function $Ql$Comp$Form$setFieldValue(vElement, vValue) {
	Function.checkArgs(
		$Ql$Comp$Form$setFieldValue, arguments,
		[String, Ql.DOM.InputElement], [null, Object.ANYTYPE]
	);
	var elt = (vElement instanceof Ql.DOM.InputElement ? vElement : this.getInputElement(vElement));
	elt.setValue(vValue);
}
Ql.Comp.Form.prototype.setFieldValue = $Ql$Comp$Form$setFieldValue;


/** See Ql.DOM.Form._wrap(). It also makes the column headers clickable.
*/
function $Ql$Comp$Form$_wrap(elt) {
	Ql.DOM.Form.prototype._wrap.call(this, elt);

	this.addEventListener("submit", this._onSubmit, false);
	this.addEventListener("reset", this._onReset, false);

	// Private data need the wrapper to stay.
	return this.lockWrapper();
}
Ql.Comp.Form.prototype._wrap = $Ql$Comp$Form$_wrap;


/** Restores the previous value for every field in the form.

e:Event
	Event to handle.
*/
function $Ql$Comp$Form$_onReset(e) {
	if (!confirm(L10n.CORE_WARN_FORM_RESET)) {
		e.preventDefault();
	}
}
Ql.Comp.Form.prototype._onReset = $Ql$Comp$Form$_onReset;


/** Asynchronously submits the form.

e:Event
	Event to handle.
*/
function $Ql$Comp$Form$_onSubmit(e) {
	e.preventDefault();
	if (this.busy) {
		return;
	}
	this.busy = true;

	// Collect value and status of each field.
	var mapElts = this.getInputElements(), mapNewValues = {}, mapPrevValues = {}, arrReenable = [];
	for (var sName in mapElts) {
		var elt = mapElts[sName];
		if (!elt.isDisabled()) {
			elt.disable();
			arrReenable.push(elt);
		}
		mapNewValues[sName] = this.getFieldValue(elt);
		mapPrevValues[sName] = this.getFieldPrevValue(sName);
	}
	// Same as for buttons, but here also create BusyIndicators for the submit buttons, since they’re
	// the ones whose action is being executed.
	var arrButtons = this.select("button"), arrBusyIndicators = [];
	for (var i = 0, c = arrButtons.length; i < c; ++i) {
		var btn = arrButtons[i];
		if (btn.getAttribute("type") == "submit") {
			var bi = this.getOwnerDocument().createElement(Ql.Comp.BusyIndicator);
			bi.setBuddy(btn);
			arrBusyIndicators.push(bi);
		}
		if (!btn.isDisabled()) {
			btn.disable();
			arrReenable.push(btn);
		}
	}
	(new Ql.AsyncRequest()).submit(
		"POST",
		this._.action,
		{
			"a": "ar_apply_" + this.getAttribute("id"),
			"newvalues": Object.toJSONString(mapNewValues),
			"prevvalues": Object.toJSONString(mapPrevValues)
		},
		this._onSubmitComplete.bind(this, arrReenable, arrBusyIndicators)
	);
}
Ql.Comp.Form.prototype._onSubmit = $Ql$Comp$Form$_onSubmit;


/** Updates the form upon receiving the validation results from the server.

arrReenable:Array(?)
	TODO: ?
arrBusyIndicators:Array(?)
	TODO: ?
ar:?
	TODO: ?
vResponse:var
	TODO: ?
*/
function $Ql$Comp$Form$_onSubmitComplete(arrReenable, arrBusyIndicators, ar, vResponse) {
	// Restore interactivity, first.
	arrReenable.callOnEach("enable");
	arrBusyIndicators.callOnEach("unlink");
	this.busy = false;

	if (!vResponse) {
		alert(L10n.CORE_ERR_ASYNC_FAILED);
		return;
	}

	// Update the field values, after they’ve been reformatted by the server.
	var bAllValid = !vResponse["error"], bErrorFocused = false;
	for (var sName in vResponse["fielddata"]) {
		var mapFieldData = vResponse["fielddata"][sName],
			 elt = this.getInputElement(sName),
			 vValue = mapFieldData["value"],
			 bValid = (bAllValid && mapFieldData["valid"]);
		// Set both the field’s value and its default value if everything went well, so that resetting
		// the form will restore it to a status coherent with the server.
		elt.setValue(vValue);
		if (bValid) {
			elt.setDefaultValue(vValue);
		}
		// If the field doesn’t contain valid data, and it’s the first such field, move the focus to
		// it.
		if (!mapFieldData["valid"] && !bErrorFocused) {
			elt.selectContent();
			elt.focus();
			bErrorFocused = true;
		}
		elt[mapFieldData["valid"] ? "removeCssClass" : "addCssClass"]("invalidvalue");
		// Apply the status of the element.
		elt[mapFieldData["disabled"] ? "disable" : "enable"]();
	}

	// Tell any listeners about the successful update.
	var e = document.createEvent("Events");
	e.initEvent("asyncupdate", true, false);
	e.asyncResponse = vResponse;
	this.dispatchEvent(e);

	// This goes after triggering the event, to allow listeners to add messages or change the target
	// URL.
	if (vResponse["error"]) {
		// Show error and notice combined.
		alert(vResponse["error"] + vResponse["notice"]);
	} else {
		// Show notice, if any, and switch to the target URL.
		if (vResponse["notice"]) {
			alert(vResponse["notice"]);
		}
		if (vResponse["endurl"]) {
			location.href = vResponse["endurl"];
		}
	}
}
Ql.Comp.Form.prototype._onSubmitComplete = $Ql$Comp$Form$_onSubmitComplete;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.IncrSearchCombo


/**Text input with autocompletion from a dynamically-loaded list of items.

TODO: FIXME
*/
function $Ql$Comp$IncrSearchCombo() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$IncrSearchCombo, arguments);
	Ql.DOM.ListInput.call(this);
	Ql.DOM.CompositeElement.call(this);
	this._m_arrFixedItems = [];
	this._m_arrItems = [];
	// Create bound versions of these, once for all.
	this._onListClick = this._onListClick.bind(this);
	this._onListMouseOverOut = this._onListMouseOverOut.bind(this);
	this._onListScroll = this._onListScroll.bind(this);
}
Ql.Comp.IncrSearchCombo = $Ql$Comp$IncrSearchCombo;
Ql.Comp.IncrSearchCombo.inheritFrom(Ql.DOM.ListInput);
Ql.Comp.IncrSearchCombo.augmentWith(Ql.DOM.CompositeElement);
Ql.DOM.registerWrapperClass(Ql.Comp.IncrSearchCombo, "div.Ql-Comp-IncrSearchCombo");

/** See Ql.DOM.ListInput._sClassName. */
Ql.Comp.IncrSearchCombo.prototype._sClassName/*:String*/ = "Ql.Comp.IncrSearchCombo";
Ql.Comp.IncrSearchCombo.prototype._m_arrFixedItems/*:Array(String*)*/ = null;
/** The drop-down list, created on-the-fly. */
Ql.Comp.IncrSearchCombo.prototype._m_eltList/*:Ql.DOM.Element*/ = null;
Ql.Comp.IncrSearchCombo.prototype._m_bMouseOverDD/*:bool*/ = false;
Ql.Comp.IncrSearchCombo.prototype._m_mapDLParams = null;
Ql.Comp.IncrSearchCombo.prototype._m_arrItems = null;
Ql.Comp.IncrSearchCombo.prototype._m_bDLPartial = null;
Ql.Comp.IncrSearchCombo.prototype._m_inputIS = null;
Ql.Comp.IncrSearchCombo.prototype._m_inputValue = null;
Ql.Comp.IncrSearchCombo.prototype._m_liHl = null;
Ql.Comp.IncrSearchCombo.prototype._m_sDLUrl = null;
Ql.Comp.IncrSearchCombo.prototype._m_sLastIS = null;
Ql.Comp.IncrSearchCombo.prototype._m_sPrevIS = null;


/** Segnala il cambiamento della selezione da parte dell'utente. */
Ql.EventTarget.declareEvent(Ql.Comp.IncrSearchCombo, "selchange");


/** Adds static items to the list.

arr:Array(String*)
	Strings to be added.
return:Ql.Comp.IncrSearchCombo
	this.
*/
function $Ql$Comp$IncrSearchCombo$addItems(arr) {
	this._m_arrFixedItems = this._m_arrFixedItems.concat(arr);
	if (this._m_arrItems !== null) {
		this._m_arrItems = this._m_arrFixedItems;
	}
	return this;
}
Ql.Comp.IncrSearchCombo.prototype.addItems = $Ql$Comp$IncrSearchCombo$addItems;


/** See Ql.DOM.ListInput.blur().
*/
function $Ql$Comp$IncrSearchCombo$blur() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$blur, arguments);
	this.getFirstChild().blur();
	return this;
}
Ql.Comp.IncrSearchCombo.prototype.blur = $Ql$Comp$IncrSearchCombo$blur;


/** See Ql.DOM.CompositeElement._createNew().
*/
function $Ql$Comp$IncrSearchCombo$_createNew(doc) {
	this._ = doc._createElement("div");
	this.addCssClass("Ql-Comp-IncrSearchCombo");
	this.appendChild(doc.createElement("input[type=text]"));
	this.appendChild(doc.createElement("input[type=hidden]"));
	return this._;
}
Ql.Comp.IncrSearchCombo.prototype._createNew = $Ql$Comp$IncrSearchCombo$_createNew;


/** See Ql.DOM.ListInput.disable().
*/
function $Ql$Comp$IncrSearchCombo$disable() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$disable, arguments);
	this.getFirstChild().disable();
	return this;
}
Ql.Comp.IncrSearchCombo.prototype.disable = $Ql$Comp$IncrSearchCombo$disable;


/** See Ql.DOM.ListInput.enable().
*/
function $Ql$Comp$IncrSearchCombo$enable() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$enable, arguments);
	this.getFirstChild().enable();
	return this;
}
Ql.Comp.IncrSearchCombo.prototype.enable = $Ql$Comp$IncrSearchCombo$enable;


/** See Ql.DOM.ListInput.focus().
*/
function $Ql$Comp$IncrSearchCombo$focus() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$focus, arguments);
	this.getFirstChild().focus();
	return this;
}
Ql.Comp.IncrSearchCombo.prototype.focus = $Ql$Comp$IncrSearchCombo$focus;


/** See Ql.DOM.ListInput.getValue().
*/
function $Ql$Comp$IncrSearchCombo$getValue() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$getValue, arguments);
	var ti = this.getFirstChild();
	return [
		ti.getValue(),
		ti.getNextSibling().getValue()
	];
}
Ql.Comp.IncrSearchCombo.prototype.getValue = $Ql$Comp$IncrSearchCombo$getValue;


/** Hides and destroys the drop-down list.
*/
function $Ql$Comp$IncrSearchCombo$hideList() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$hideList, arguments);
	if (this._m_eltList) {
		this._m_eltList.dismissPopup();
		this._m_liHl = null;
		this._m_eltList.unlink();
		this._m_eltList = null;
	}
}
Ql.Comp.IncrSearchCombo.prototype.hideList = $Ql$Comp$IncrSearchCombo$hideList;


/** See Ql.DOM.ListInput.isDisabled().
*/
function $Ql$Comp$IncrSearchCombo$isDisabled() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$isDisabled, arguments);
	return this.getFirstChild().isDisabled();
}
Ql.Comp.IncrSearchCombo.prototype.isDisabled = $Ql$Comp$IncrSearchCombo$isDisabled;


/** Returns true if the drop-down list is currently visible.

return:bool
	true if visible, false otherwise.
*/
function $Ql$Comp$IncrSearchCombo$isListVisible() {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$isListVisible, arguments);
	return this._m_eltList != null;
}
Ql.Comp.IncrSearchCombo.prototype.isListVisible = $Ql$Comp$IncrSearchCombo$isListVisible;


/** See Ql.DOM.ListInput.setDefaultValue() and Ql.Comp.IncrSearchCombo.setValue().
*/
function $Ql$Comp$IncrSearchCombo$setDefaultValue(vValue) {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$setDefaultValue, arguments, [null, Object.ANYTYPE]);
	var ti = this.getFirstChild();
	ti.setDefaultValue(vValue instanceof Array ? vValue[0] : "");
	ti.getNextSibling().setDefaultValue(vValue instanceof Array ? vValue[1] : "");
}
Ql.Comp.IncrSearchCombo.prototype.setDefaultValue = $Ql$Comp$IncrSearchCombo$setDefaultValue;


/** See Ql.DOM.ListInput.setValue(). If vValue is an array with two items, item 0 is used as the
label, and item 1 (if present) as the actual value, If vValue is a single value, it is used as the
label; the actual value will be "".
*/
function $Ql$Comp$IncrSearchCombo$setValue(vValue) {
	Function.checkArgs($Ql$Comp$IncrSearchCombo$setValue, arguments, [null, Object.ANYTYPE]);
	var ti = this.getFirstChild();
	ti.setValue(vValue instanceof Array ? vValue[0] : "");
	ti.getNextSibling().setValue(vValue instanceof Array ? vValue[1] : "");
}
Ql.Comp.IncrSearchCombo.prototype.setValue = $Ql$Comp$IncrSearchCombo$setValue;


/** See Ql.DOM.ListInput._wrap().
*/
function $Ql$Comp$IncrSearchCombo$_wrap(elt) {
	Ql.DOM.ListInput.prototype._wrap.call(this, elt);
	var ti = this.getFirstChild();
	this._m_sPrevIS = ti.getValue();
	ti.setAttribute("autocomplete", "off");
	ti.addEventListener("keydown", this._onInputISKeyDown, false);
	ti.addEventListener("keyup", this._onInputISKeyUp, false);
	ti.addEventListener("dblclick", this._onInputISDblClick, false);
	ti.addEventListener("focus", this._onInputISFocus, false);
	ti.addEventListener("blur", this._onInputISBlur, false);
	// Create the arrow button to show the drop-down list.
	var aShowList = this.insertBefore(
		this.getOwnerDocument().createElement("a"), this.getLastChild()
	);
	aShowList.setAttribute("href", "#");
	aShowList.setAttribute("class", "tinybtn");
	aShowList.setTextContent("▼");
	aShowList.addEventListener("click", this._onShowListClick);

	// Private data need the wrapper to stay.
	return this.lockWrapper();
}
Ql.Comp.IncrSearchCombo.prototype._wrap = $Ql$Comp$IncrSearchCombo$_wrap;


/** Shows the drop-down list on double click.

e:Event
	Event to handle.
*/
function $Ql$Comp$IncrSearchCombo$_onInputISDblClick(e) {
	var isc = this.getParentNode();
	if (!isc._m_eltList) {
		e.preventDefault();
		isc.showList();
	}
}
Ql.Comp.IncrSearchCombo.prototype._onInputISDblClick = $Ql$Comp$IncrSearchCombo$_onInputISDblClick;


/** Selects all the text in the input element, when focused.

e:Event
	Event to handle.
*/
function $Ql$Comp$IncrSearchCombo$_onInputISFocus(e) {
	var isc = this.getParentNode();
	isc.getFirstChild().select();
}
Ql.Comp.IncrSearchCombo.prototype._onInputISFocus = $Ql$Comp$IncrSearchCombo$_onInputISFocus;


/** Reacts to the user selecting an item from the drop-down list.

e:Event
	Event to handle.
*/
function $Ql$Comp$IncrSearchCombo$_onListClick(e) {
	if (Ql.DOM._getNodeName(e.target) == "li") {
		this._selectItem(Ql.DOM.wrap(e.target));
		this.focus();
	}
}
Ql.Comp.IncrSearchCombo.prototype._onListClick = $Ql$Comp$IncrSearchCombo$_onListClick;


/** Keeps track of the pointer position.

e:Event
	Event to handle.
*/
function $Ql$Comp$IncrSearchCombo$_onListMouseOverOut(e) {
	this._m_bMouseOverDD = (e.type == "mouseover");
}
Ql.Comp.IncrSearchCombo.prototype._onListMouseOverOut =
	$Ql$Comp$IncrSearchCombo$_onListMouseOverOut;


/** Focuses back on the input element. Scrolling may occur by wheel, keys, or clicks on the drop-
down list’s scroll bar; the last one is the reason for handling this event.

e:Event
	Event to handle.
*/
function $Ql$Comp$IncrSearchCombo$_onListScroll(e) {
	this.focus();
}
Ql.Comp.IncrSearchCombo.prototype._onListScroll = $Ql$Comp$IncrSearchCombo$_onListScroll;


/** Shows the drop-down list when the user clicks on the arrow button.

e:Event
	Event to handle.
*/
function $Ql$Comp$IncrSearchCombo$_onShowListClick(e) {
	e.preventDefault();
	var isc = this.getParentNode(), ti = isc.getFirstChild();
	if (ti.isDisabled()) {
		// Can’t focus the input element, so just blur away.
		this.blur();
	} else {
		// Save the currently typed text, to put it back in should the user close the list without
		// actually selecting anything.
		isc._m_sLastIS = ti.getValue();
		ti.setValue("");
		isc.showList();
		ti.focus();
	}
}
Ql.Comp.IncrSearchCombo.prototype._onShowListClick = $Ql$Comp$IncrSearchCombo$_onShowListClick;


// Abilita il caricamento su richiesta degli elementi.
//
Ql.Comp.IncrSearchCombo.prototype.enableDynamicLoad = function(sUrl, mapParams) {
	this._m_arrItems = null;
	this._m_sDLUrl = sUrl;
	this._m_mapDLParams = mapParams;
};


// Elimina eventuali elementi dinamici memorizzati.
//
Ql.Comp.IncrSearchCombo.prototype.purgeDLCache = function() {
	this._m_arrItems = null;
};


// Carica nell'elenco gli elementi corrispondenti alla chiave di ricerca.
//
Ql.Comp.IncrSearchCombo.prototype.showList = function() {
	this._m_eltList = document.createSubtree(
		"ul", {
			"class": "Ql-Comp-IncrSearchCombo_dropdown",

			"click":     this._onListClick,
			"mouseout":  this._onListMouseOverOut,
			"mouseover": this._onListMouseOverOut,
			"scroll":    this._onListScroll
		}
	);
	this._m_eltList.copyStylesFrom(this._m_inputIS, true, [
		"color", "background-color", "background-image", "border-color", "border-style", "font-size",
		"font-name", "font-weight", "font-style"
	]);
	document.getBody().appendChild(this._m_eltList);

	if (this._m_sDLUrl && (this._m_arrItems == null || this._m_bDLPartial)) {
		var li = document.createElement("li");
		li.setAttribute("class", "lightcolor");
		li.appendChild(document.createTextNode(L10n.CORE_LIST_LOADING));
		this._m_eltList.appendChild(li);

		var mapDLP = {
			"ss":    (location.SSID ? location.SSID.substr(3) : ""),
			"match": this._m_inputIS.value
		};
		for (var sParam in this._m_mapDLParams) {
			if (typeof(this._m_mapDLParams[sParam]) == "object") {
				mapDLP[sParam] = String.jsonEncode(this._m_mapDLParams[sParam]);
			} else {
				mapDLP[sParam] = this._m_mapDLParams[sParam];
		}
		Ql.asyncExec(
			this._m_sDLUrl,
			mapDLP,
			(function(bSuccess, vResponse) {
				// Il risultato interessa solo se l'elenco è ancora visibile.
				if (this._m_eltList) {
					if (bSuccess) {
						if (li.getParentNode().isSameNode(this._m_eltList)) {
							this._m_eltList.removeChild(li);
						}
						this._m_bDLPartial = vResponse["partial"];
						this._m_arrItems = this._m_arrFixedItems.concat(vResponse["items"]);
						this._fillList(false);
						if (vResponse["partial"]) {
							li.firstChild.nodeValue = L10n.CORE_LIST_PARTIAL;
							this._m_eltList.appendChild(li);
						}
					} else {
						this.hideList();
					}
				}
			}).bind(this)
		);
	} else {
		this._fillList(false);
	}

	Ql.popupElement(this._m_eltList, this._m_inputIS, {
		dismissOnClickOut: false
	}, +1, +2);
};


// Rabbocca l'elenco.
//
Ql.Comp.IncrSearchCombo.prototype._fillList = function(bRefilter) {
	var reMatch = new RegExp("^" + RegExp.escapeWithWildcards(this._m_inputIS.value), "i"), li;
	if (bRefilter) {
		var o = this._m_eltList.firstChild;
		while (li = o) {
			o = li.nextSibling;
			if (!reMatch.test(li.firstChild.nodeValue)) {
				this._m_eltList.removeChild(li);
			}
		}
		if (this._m_liHl && !this._m_liHl.getParentNode().isSameNode(this._m_eltList)) {
			this._highlightItem(null);
		}
	} else {
		this._m_arrItems.forEach(function(arrItem) {
			if (reMatch.test(arrItem[1])) {
				li = document.createElement("li");
				li._isiValue = arrItem[0];
				li.appendChild(document.createTextNode(arrItem[1]));
				this._m_eltList.appendChild(li);
			}
		}, this);
	}
	if (!this._m_eltList.firstChild) {
		this._m_eltList.appendChild(document.createSubtree(
			"li", {
				"class": "lightcolor"
			},
				L10n.CORE_LIST_NOMATCHES
		));
	}
};


// Evidenzia la selezione.
//
Ql.Comp.IncrSearchCombo.prototype._highlightItem = function(li) {
	if (this._m_liHl) {
		this._m_liHl.removeCssClass("ql_isinput_oHighlighted");
	}
	if ((this._m_liHl = li) && !this._m_liHl.isCssClass("lightcolor")) {
		this._m_liHl.addCssClass("ql_isinput_oHighlighted");
		var y = li.getPosition()[1],
			 cy = li.offsetHeight,
			 yScroll = this._m_eltList.scrollTop,
			 cyClient = this._m_eltList.clientHeight;
		if (y < yScroll) {
			this._m_eltList.scrollTop = y;
		} else if (y + cy > yScroll + cyClient) {
			this._m_eltList.scrollTop = y + cy - cyClient;
		}
	}
};


// Aggiorna la selezione.
//
Ql.Comp.IncrSearchCombo.prototype._selectItem = function(li) {
	if (li.isCssClass("ql_isinput_oHighlighted")) {
		this._m_inputIS.value = li.firstChild.nodeValue;
		this._m_inputValue.value = li._isiValue;
		this.hideList();
		var e = document.createEvent("UIEvents");
		e.initUIEvent("selchange", true, true, window, 0);
		this.dispatchEvent(e);
	}
};


// Se viene deselezionata la casella di testo, nasconde l'elenco.
//
Ql.Comp.IncrSearchCombo.prototype._onInputISBlur = function(e) {
	var isc = this._isi;
	if (!isc._m_bMouseOverDD) {
		isc.hideList();
		if (!isc._m_inputIS.value && isc._m_sLastIS !== null) {
			isc._m_inputIS.value = isc._m_sLastIS;
			isc._m_sLastIS = null;
		}
	}
};


// Gestisce i tasti per selezionare gli elementi nell'elenco.
//
Ql.Comp.IncrSearchCombo.prototype._onInputISKeyDown = function(e) {
	var isc = this._isi;
	switch (e.keyCode) {
		case 0x09: // Tab
			if (isc._m_liHl && isc._m_liHl.isCssClass("ql_isinput_oHighlighted")) {
				e.preventDefault();
				isc._m_sPrevIS = this.value = isc._m_liHl.firstChild.nodeValue;
			}
			break;

		case 0x0a: // LF
		case 0x0d: // CR
			if (isc._m_liHl) {
				e.preventDefault();
				e.stopPropagation();
				isc._selectItem(isc._m_liHl);
			}
			break;

		case 0x1b: // Esc
			if (isc._m_eltList) {
				e.preventDefault();
				e.stopPropagation();
				isc.hideList();
			}
			break;

		case 0x25: // Freccia sx
			break;

		case 0x26: // Freccia su
			e.preventDefault();
			if (isc._m_eltList) {
				isc._highlightItem((isc._m_liHl || {}).previousSibling || isc._m_eltList.lastChild);
			}
			break;

		case 0x27: // Freccia dx
			break;

		case 0x28: // Freccia giù
			e.preventDefault();
			if (isc._m_eltList) {
				isc._highlightItem((isc._m_liHl || {}).nextSibling || isc._m_eltList.firstChild);
			} else {
				isc.showList();
			}
			break;
	}
};


// Gestisce i tasti per selezionare gli elementi nell'elenco.
//
Ql.Comp.IncrSearchCombo.prototype._onInputISKeyUp = function(e) {
	switch (e.keyCode) {
		case 0x0a: // LF
		case 0x0d: // CR
		case 0x1b: // Esc
		case 0x25: // Freccia sx
		case 0x26: // Freccia su
		case 0x27: // Freccia dx
		case 0x28: // Freccia giù
			e.preventDefault();
			return;
	}
	var isc = this._isi;
	if (isc._m_sPrevIS == this.value.substr(0, isc._m_sPrevIS.length)) {
		// La stringa è stata solo allungata: se l'elenco era già visibile, per
		// mantenerlo coerente non deve ricrearlo, ma solo filtrarlo, a meno
		// che non era dinamico e incompleto.
		if (isc._m_eltList) {
			if (isc._m_sDLUrl && isc._m_bDLPartial) {
				isc.hideList();
			} else {
				isc._fillList(true);
			}
		}
	} else {
		// Deve aspettare la richiesta dell'utente per mostrare nuovamente
		// l'elenco.
		isc.hideList();
		if (isc._m_sDLUrl) {
			// Deve scartare tutto m_arrItems.
			isc._m_arrItems = null;
		}
	}
	isc._m_sPrevIS = this.value;
};



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.PwSecurityChecker


/** Instant password security level checker.
*/
function $Ql$Comp$PwSecurityChecker() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$PwSecurityChecker, arguments);
	Ql.DOM.CompositeElement.call(this);
	// Create a bound version once for all.
	this._onUpdate = this._onUpdate.bind(this);
}
Ql.Comp.PwSecurityChecker = $Ql$Comp$PwSecurityChecker;
Ql.Comp.PwSecurityChecker.inheritFrom(Ql.DOM.CompositeElement);

/** See Ql.DOM.CompositeElement._sClassName. */
Ql.Comp.PwSecurityChecker.prototype._sClassName/*:String*/ = "Ql.Comp.PwSecurityChecker";
/** Words that make the password less secure. */
Ql.Comp.PwSecurityChecker.prototype._m_arrBannedWords/*:Array(String*)*/ = null;
/** Minimum number of characters for a secure password. */
Ql.Comp.PwSecurityChecker.prototype._m_cchMin/*:int*/ = 0;
/** Password input element to be checked. */
Ql.Comp.PwSecurityChecker.prototype._m_pi/*:Ql.DOM.PasswordInput*/ = null;


/** See Ql.DOM.CompositeElement._createNew().
*/
function $Ql$Comp$PwSecurityChecker$_createNew(doc) {
	this._ = doc._createElement("div");
	this.addCssClass("Ql-Comp-PwSecurityChecker");
	var eltLabel = this.appendChild(doc.createElement("div"));
	eltLabel.addCssClass("Ql-Comp-PwSecurityChecker_label");
	var eltBar = this.appendChild(doc.createElement("div"));
	eltBar.addCssClass("Ql-Comp-PwSecurityChecker_bar");
	return this._;
}
Ql.Comp.PwSecurityChecker.prototype._createNew = $Ql$Comp$PwSecurityChecker$_createNew;


/** Assigns the password input element to be checked, and assign password security criteria.

pi:Ql.DOM.PasswordInput
	See Ql.Comp.PwSecurityChecker._m_pi.
cchMin:int
	See Ql.Comp.PwSecurityChecker._m_cchMin.
[arrBannedWords:Array(String*)]
	See Ql.Comp.PwSecurityChecker._m_arrBannedWords.
*/
function $Ql$Comp$PwSecurityChecker$setCriteria(pi, cchMin, arrBannedWords /*= []*/) {
	Function.checkArgs(
		$Ql$Comp$PwSecurityChecker$setCriteria, arguments,
		Ql.DOM.PasswordInput, Number, [undefined, Array]
	);
	// Release the currently controlled password input element.
	if (this._m_pi) {
		this._m_pi.removeEventListener("keyup",  this._onUpdate, false);
		this._m_pi.removeEventListener("change", this._onUpdate, false);
	}
	this._m_pi = pi;
	pi.addEventListener("keyup",  this._onUpdate, false);
	pi.addEventListener("change", this._onUpdate, false);
	this._m_cchMin = cchMin;
	// Copy the banned words, in lowercase, as well as their mirrors.
	this._m_arrBannedWords = [];
	if (arrBannedWords) {
		for (var i = 0, c = arrBannedWords.length; i < c; ++i) {
			var sLCase = arrBannedWords[i].toLowerCase();
			this._m_arrBannedWords.push(sLCase);
			this._m_arrBannedWords.push(sLCase.reverse());
		}
	}
	// Update to the current contents of pi.
	this._onUpdate();
}
Ql.Comp.PwSecurityChecker.prototype.setCriteria = $Ql$Comp$PwSecurityChecker$setCriteria;


/** Updates the displayed password security.

e:Event
	Event to handle.
*/
function $Ql$Comp$PwSecurityChecker$_onUpdate(e) {
	var s = this._m_pi.getValue().toLowerCase(), iScore = 0;
	// Requested length.
	if (s.length >= this._m_cchMin) {
		++iScore;
	}
	// “Safe enough” length, even if predictable.
	if (s.length >= 16) {
		++iScore;
	}
	// Should include upper/lowercase alphanumeric characters.
	if (!/[0-9]/.test(s) || !/[A-Z]/.test(s) || !/[a-z]/.test(s)) {
		++iScore;
	}
	// Should include non-alphanumeric characters.
	if (s.match(/[^0-9A-Za-z\s].*[^0-9A-Za-z\s]/)) {
		++iScore;
	}
	// Must not contain banned words, in any combination of case.
	var sLCase = s.toLowerCase();
	for (var i = 0, c = this._m_arrBannedWords.length; i < c; ++i) {
		if (sLCase.indexOf(this._m_arrBannedWords[i]) != -1) {
			--iScore;
		}
	}

	// Adjust the score, and show it.
	if (iScore < 0) {
		iScore = 0;
	} else if (iScore > 3) {
		iScore = 3;
	}
	var eltLabel = this.select(".Ql-Comp-PwSecurityChecker_label")[0];
	eltLabel.setTextContent([
		L10n.CORE_PWSEC_INVALID,
		L10n.CORE_PWSEC_LOW,
		L10n.CORE_PWSEC_MEDIUM,
		L10n.CORE_PWSEC_HIGH
	][iScore]);
	var eltBar = this.select(".Ql-Comp-PwSecurityChecker_bar")[0];
	eltBar.setAttribute(
		"class",
		"Ql-Comp-PwSecurityChecker_bar " + ["", "negativeb", "neutralb", "positiveb"][iScore]
	);
	eltBar.setStyle("width", ["0%", "33%", "67%", "100%"][iScore]);
}
Ql.Comp.PwSecurityChecker.prototype._onUpdate = $Ql$Comp$PwSecurityChecker$_onUpdate;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.TabbedBook


/** Stacked tabbed sheets with user- and script-selectable tabs.
*/
function $Ql$Comp$TabbedBook() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$TabbedBook, arguments);
	Ql.DOM.CompositeElement.call(this);
}
Ql.Comp.TabbedBook = $Ql$Comp$TabbedBook;
Ql.Comp.TabbedBook.inheritFrom(Ql.DOM.CompositeElement);
Ql.DOM.registerWrapperClass(Ql.Comp.TabbedBook, "dl.Ql-Comp-TabbedBook");

/** See Ql.DOM.CompositeElement._sClassName. */
Ql.Comp.TabbedBook.prototype._sClassName/*:String*/ = "Ql.Comp.TabbedBook";
/** Index of the currently active (displayed) tab/page. */
Ql.Comp.TabbedBook.prototype._m_iActivePage/*:int*/ = -1;


/** Adds a new page to the book, with its tab being put last.

[sTabCaption:string]
	Caption for the page’s tab.
return:Ql.Comp.TabbedBookPage
	The newly added page.
*/
function $Ql$Comp$TabbedBook$appendPage(sTabCaption /*= undefined*/) {
	return this.insertPage(-1, sTabCaption);
}
Ql.Comp.TabbedBook.prototype.appendPage = $Ql$Comp$TabbedBook$appendPage;


/** See Ql.DOM.CompositeElement._createNew().
*/
function $Ql$Comp$TabbedBook$_createNew(doc) {
	this._ = doc._createElement("dl");
	this.addCssClass("Ql-Comp-TabbedBook");
	return this._;
}
Ql.Comp.TabbedBook.prototype._createNew = $Ql$Comp$TabbedBook$_createNew;


/** Removes a page and its tab from the book.

i:int
	Index of the page to be removed.
*/
function $Ql$Comp$TabbedBook$deletePage(i) {
	Function.checkArgs($Ql$Comp$TabbedBook$deletePage, arguments, Number);
	var bp = this.getPage(i);
	if (bp) {
		// If this was the active page, select another one.
		if (i == this._m_iActivePage) {
			this.setActivePage(i < this.getPageCount() - 1 ? i + 1 : i - 1);
		}
		// Remove the tab.
		var tab = this.getTab(i);
		if (tab) {
			this.removeChild(tab);
		}
		this.getLastChild().removeChild(bp);
	}
}
Ql.Comp.TabbedBook.prototype.deletePage = $Ql$Comp$TabbedBook$deletePage;


/** Returns a page in the book.

i:int
	Index of the page to be returned.
return:Ql.Comp.TabbedBookPage
	The requested page.
*/
function $Ql$Comp$TabbedBook$getPage(i) {
	Function.checkArgs($Ql$Comp$TabbedBook$getPage, arguments, Number);
	return this.getLastChild().select(":self > div:nth-of-type(" + i + ")")[0] || null;
}
Ql.Comp.TabbedBook.prototype.getPage = $Ql$Comp$TabbedBook$getPage;


/** Returns the number of pages in the book.

return:int
	Number of pages.
*/
function $Ql$Comp$TabbedBook$getPageCount() {
	Function.checkArgs($Ql$Comp$TabbedBook$getPageCount, arguments);
	return this.getLastChild().select(":self > div").length;
}
Ql.Comp.TabbedBook.prototype.getPageCount = $Ql$Comp$TabbedBook$getPageCount;


/** Returns the tab for a page in the book.

i:int
	Index of the page whose tab is to be returned.
return:Ql.DOM.Element
	The requested page’s tab.
*/
function $Ql$Comp$TabbedBook$getTab(i) {
	Function.checkArgs($Ql$Comp$TabbedBook$getTab, arguments, Number);
	return this.select(":self > dt:nth-of-type(" + i + ")")[0] || null;
}
Ql.Comp.TabbedBook.prototype.getTab = $Ql$Comp$TabbedBook$getTab;


/** Inserts a new page in the book.

i:int
	Index at which the tab for the new page will be inserted.
[sTabCaption:string]
	Caption for the page’s tab.
return:Ql.Comp.TabbedBookPage
	The newly added page.
*/
function $Ql$Comp$TabbedBook$insertPage(i, sTabCaption /*= undefined*/) {
	Function.checkArgs($Ql$Comp$TabbedBook$insertPage, arguments, Number);
	// Determine the actual insertion index.
	var doc = this.getOwnerDocument(), ddSpine = this.getLastChild(),
		 arrPages = ddSpine.select(":self > div");
	if (i < 0 || i > arrPages.length) {
		i = arrPages.length;
	}

	// Create and add the page and its tab.
	var page = doc.createElement(Ql.Comp.TabbedBookPage);
	page.setStyle("display", "none");
	ddSpine.insertBefore(page, arrPages[i] || null);
	var tab = doc.createElement(Ql.Comp.TabbedBookTab);
	this.insertBefore(tab, this.getTab(i));
	if (sTabCaption) {
		sTabCaption;
	}
//	tab.convertTextNodesToLinks();
	// Rende cliccabile il testo nella linguetta.
	/*var sTabHref = (oItem.tab.hasAttribute("id") ? "#" + oItem.tab.getAttribute("id") : "#");
	oItem.tab.getTextNodes(/\S/).forEach(function(tn) {
		if (!$._mapMethods.getAncestor.call(tn, "a")) {
			var aSelect = document.createSubtree(
				"a", {
					"href": sTabHref,

					"click": ts._onTabClick
				}
			);
			tn.parentNode.replaceChild(aSelect, tn);
			aSelect.appendChild(tn);
		}
	});*/

	// Check if the active index was affected.
	if (this._m_iActivePage == -1) {
		// Initial selection.
		this._m_iActivePage = i;
	} else if (i <= this._m_iActivePage) {
		// Inserted before the active page: update the index of the latter.
		++this._m_iActivePage;
	}

	return page;
}
Ql.Comp.TabbedBook.prototype.insertPage = $Ql$Comp$TabbedBook$insertPage;


/** Activates (switches to) a page.

i:int
	Index of the tab/page.
*/
function $Ql$Comp$TabbedBook$setActivePage(i) {
	Function.checkArgs($Ql$Comp$TabbedBook$setActivePage, arguments, Number);
	var iOld = this._m_iActivePage;
	if (i != iOld) {
		var arrTabs = this.select(":self > dt"),
			 arrPages = this.getLastChild().select(":self > div");
		// Select the new tab, and show the new page.
		if (i >= 0 && i < arrPages.length) {
			arrTabs[i].addCssClass("Ql-Comp-TabbedBookTab_sel");
			arrPages[i].removeStyle("display");
		}
		// Deselect the old tab, and hide the old page.
		if (iOld >= 0 && iOld < arrPages.length) {
			arrTabs[iOld].removeCssClass("Ql-Comp-TabbedBookTab_sel");
			arrPages[iOld].setStyle("display", "none");
		}
		this._m_iActivePage = i;
	}
}
Ql.Comp.TabbedBook.prototype.setActivePage = $Ql$Comp$TabbedBook$setActivePage;


/** See Ql.DOM.CompositeElement._wrap().
*/
function $Ql$Comp$TabbedBook$_wrap(elt) {
	Ql.DOM.CompositeElement.prototype._wrap.call(this, elt);

	var doc = this.getOwnerDocument();

	// Create the spine, and add it last.
	var ddSpine = this.appendChild(doc.createElement("dd"));
	ddSpine.setAttribute("class", "Ql-Comp-TabbedBook_spine");

	var sHashId = (location.hash ? location.hash.substr(1) : null),
		 tabLast = null;
	for (
		var nd = elt.firstChild, ndNext, iPage = 0;
		!Ql.DOM._isSameNode(nd, ddSpine._);
		nd = ndNext
	) {
		ndNext = nd.nextSibling;
		switch (Ql.DOM._getNodeName(nd)) {

			case "dt":
				var sCssClass = Ql.DOM._getAttribute(nd, "class");
				if (sCssClass) {
					sCssClass = " " + sCssClass;
				}
				var sId = Ql.DOM._getAttribute(nd, "id");
				if (sHashId && sId == sHashId) {
					// If this tab has the id found in the URL, select its page.
					sCssClass += " Ql-Comp-TabbedBookTab_sel";
					this._m_iActivePage = iPage;
				}
				Ql.DOM._setAttribute(nd, "class", "Ql-Comp-TabbedBookTab" + sCssClass);
				nd = Ql.DOM.wrap(nd);
				// Make the tab’s contents link to itself. Don’t use the overridden version defined in
				// Ql.Comp.TabbedBookTab, since that’s not reentrant (it would call Ql.DOM.wrap(this).
				Ql.DOM.Element.prototype.convertTextNodesToLinks.call(
					nd, nd._onClick, sId ? "#" + sId : null
				);
				break;

			case "dd":
				// Create a Ql.Comp.TabbedBookPage and move the dd’s contents and main attributes to it.
				var page = doc.createElement(Ql.Comp.TabbedBookPage);
				if (iPage++ != this._m_iActivePage) {
					// This page is not the active one, so hide it.
					page.setStyle("display", "none");
				}
				ddSpine.appendChild(page);
				if (Ql.DOM._hasAttribute(nd, "class")) {
					page.addCssClass(Ql.DOM._getAttribute(nd, "class"));
				}
				if (Ql.DOM._hasAttribute(nd, "id")) {
					page.setAttribute("id", Ql.DOM._getAttribute(nd, "id"));
				}
				if (nd.style.cssText) {
					page._.style.cssText = nd.style.cssText;
				}
				// Move the dd’s contents to the page.
				while (nd.firstChild) {
					page._.appendChild(nd.firstChild);
				}
				// Fall through to deleting this now-empty <dd>.

			default:
				// Delete everything else.
				elt.removeChild(nd);
				break;
		}
	}
	// If no tab was activated, activate the first.
	if (this._m_iActivePage == -1) {
		this._m_iActivePage = 0;
		this.getFirstChild().addCssClass("Ql-Comp-TabbedBookTab_sel");
		ddSpine.getFirstChild().removeStyle("display");
	}

	// Private data need the wrapper to stay.
	return this.lockWrapper();
}
Ql.Comp.TabbedBook.prototype._wrap = $Ql$Comp$TabbedBook$_wrap;


// Aggiunge una scheda, con animazione.
// Nota: l'effetto è gradevole solo se la linguetta viene inserita
// nell'ultima posizione.
// TODO: FIXME
//
if (false) animAdd = function(oItem, i /*= -1*/, onComplete /*= null*/) {
	oItem.tab.setStyle("display", "none");
	this.add(oItem, i);
	oItem.tab.setStyle("display", "");
	new Ql.Animation(
		[
			{elt: oItem.tab, prop: "opacity", start: 0.00, end: 1.00, finalize: {"opacity": null}}
		],
		Math.UI_SHORT_DELAY,
		(function() {
			if (onComplete) {
				onComplete(oItem);
			}
		}).bind(this)
	);
	return oItem;
};


// Rimuove una scheda, con animazione.
// Nota: l'effetto è gradevole solo se la linguetta rimossa è l'ultima.
// TODO: FIXME
//
if (false) animRemove = function(i, onComplete /*= null*/) {
	if (i < 0 || i >= this.length) {
		throw new /*Range*/Error("Sheet index out of bounds");
	}
	var ts = this.parentNode.parentNode;
	if (i == ts.selectedIndex) {
		// Seleziona un'altra scheda, poiché l'animazione è solo per la
		// linguetta.
		ts.select(i < this.length - 1 ? i + 1 : i - 1);
	}
	var oItem = this[i];
	new Ql.Animation(
		null,
		[
			{elt: oItem.tab, prop: "opacity", start: 1.00, end: 0.00}
		],
		Math.UI_SHORT_DELAY,
		(function() {
			this.remove(i);
			if (onComplete) {
				onComplete(oItem);
			}
		}).bind(this)
	);
	return oItem;
};



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.TabbedBookPage


/** Single Ql.Comp.TabbedBook page.
*/
function $Ql$Comp$TabbedBookPage() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$TabbedBookPage, arguments);
	Ql.DOM.Element.call(this);
}
Ql.Comp.TabbedBookPage = $Ql$Comp$TabbedBookPage;
Ql.Comp.TabbedBookPage.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.Comp.TabbedBookPage, "div.Ql-Comp-TabbedBookPage");

/** See Ql.DOM.Element._sClassName. */
Ql.Comp.TabbedBookPage.prototype._sClassName/*:String*/ = "Ql.Comp.TabbedBookPage";


/** Returns the tab for the page.

return:Ql.DOM.Element
	The page’s tab.
*/
function $Ql$Comp$TabbedBookPage$getTab() {
	Function.checkArgs($Ql$Comp$TabbedBookPage$getTab, arguments);
	var tb = this.getParentNode().getParentNode();
	return tb ? tb.getTab(this.getIndexOfType()) : null;
}
Ql.Comp.TabbedBookPage.prototype.getTab = $Ql$Comp$TabbedBookPage$getTab;



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.Comp.TabbedBookTab


/** Tab for a Ql.Comp.TabbedBookPage.
*/
function $Ql$Comp$TabbedBookTab() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$Comp$TabbedBookTab, arguments);
	Ql.DOM.Element.call(this);
}
Ql.Comp.TabbedBookTab = $Ql$Comp$TabbedBookTab;
Ql.Comp.TabbedBookTab.inheritFrom(Ql.DOM.Element);
Ql.DOM.registerWrapperClass(Ql.Comp.TabbedBookTab, "dt.Ql-Comp-TabbedBookTab");

/** See Ql.DOM.Element._sClassName. */
Ql.Comp.TabbedBookTab.prototype._sClassName/*:String*/ = "Ql.Comp.TabbedBookTab";


/** See Ql.DOM.Element.convertTextNodesToLinks(). This will make text in the tab clickable with the
non-customizable action of activating the tab’s page.
*/
function $Ql$Comp$TabbedBookTab$convertTextNodesToLinks() {
	Function.checkArgs($Ql$Comp$TabbedBookTab$convertTextNodesToLinks, arguments);
	var sHref = this.getPage().getAttribute("id") || null;
	if (sHref) {
		sHref = "#" + sHref;
	}
	Ql.DOM.Element.prototype.convertTextNodesToLinks.call(this, this._onClick, sHref);
	return this;
}
Ql.Comp.TabbedBookTab.prototype.convertTextNodesToLinks =
	$Ql$Comp$TabbedBookTab$convertTextNodesToLinks;


/** Returns the tab for the page.

return:Ql.DOM.Element
	The page’s tab.
*/
function $Ql$Comp$TabbedBookTab$getPage() {
	Function.checkArgs($Ql$Comp$TabbedBookTab$getPage, arguments);
	var tb = this.getParentNode();
	return tb ? tb.getPage(this.getIndexOfType()) : null;
}
Ql.Comp.TabbedBookTab.prototype.getPage = $Ql$Comp$TabbedBookTab$getPage;


/** Makes active the page whose tab was clicked.

e:Event
	Event to handle.
*/
function $Ql$Comp$TabbedBookTab$_onClick(e) {
	if (this.getAttribute("href") == "#") {
		e.preventDefault();
	}
	var tab = this.selectAncestor("dt");
	tab.getParentNode().setActivePage(tab.getIndexOfType());
}
Ql.Comp.TabbedBookTab.prototype._onClick = $Ql$Comp$TabbedBookTab$_onClick;

