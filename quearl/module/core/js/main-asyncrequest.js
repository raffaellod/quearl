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

/** Implementation of Ql.AsyncRequest. */



////////////////////////////////////////////////////////////////////////////////////////////////////
// Ql.AsyncRequest

/** Abstraction and simplification of an asynchronous HTTP request (and answer). Uses XMLHttpRequest
objects as well as IFrames, depending on circumstances and availability.

Note: some browsers allow the user to manually abort a pending XMLHttpRequest-based request, by
whatever means work for normal pages (typically, the Esc key): FX1.5, FX2. FX3, FX3.5, EP2.30.
*/
function $Ql$AsyncRequest() {
	if (arguments[0] === Function.PROTOTYPING) {
		return;
	}
	Function.checkArgs($Ql$AsyncRequest, arguments);
	this._m_sId = "ql_ar" + (new Date()).getTime() + Math.round(Math.random() * 0x10000);
	this._m_mapRequestHeaders = {};
	// Create bound versions of these methods, once for all.
	this._onXhrReadyStateChange = this._onXhrReadyStateChange.bind(this);
	this._onIFrameLoad = this._onIFrameLoad.bind(this);
}
Ql.AsyncRequest = $Ql$AsyncRequest;
Ql.AsyncRequest.prototype.toString = Function.createToStringMethod("Ql.AsyncRequest");

/** Request completed, but response unintelligible. */
Ql.AsyncRequest.STATUS_INVALID_RESPONSE/*:int*/ = -3;
/** Request ended with an error (probably network). */
Ql.AsyncRequest.STATUS_ERROR/*:int*/ = -2;
/** The request was interrupted. */
Ql.AsyncRequest.STATUS_ABORTED/*:int*/ = -1;
/** No active request. */
Ql.AsyncRequest.STATUS_IDLE/*:int*/ = 0;
/** Active request awaiting an answer. */
Ql.AsyncRequest.STATUS_PENDING/*:int*/ = 1;
/** Request completed. */
Ql.AsyncRequest.STATUS_COMPLETE/*:int*/ = 2;

/** Request status; one of Ql.AsyncRequest.STATUS_*. */
Ql.AsyncRequest.prototype.status/*:int*/ = Ql.AsyncRequest.STATUS_IDLE;
/** Unique request identifier. */
Ql.AsyncRequest.prototype._m_sId/*:String*/ = null;
/** Request URL. */
Ql.AsyncRequest.prototype._m_sUrl/*:String*/ = null;
/** If true, no native XMLHttpRequest is available, or a file needs to be sent, so it’s necessary to
use an IFrame. */
Ql.AsyncRequest.prototype._m_bForceIFrame/*:bool*/ = false;
/** Function to be invoked upon completion of the request (whether or not it was successfully
completed. */
Ql.AsyncRequest.prototype._m_onComplete/*:Function*/ = null;
/** XMLHttpRequest (or equivalent ActiveX object). */
Ql.AsyncRequest.prototype._m_xhr/*:XMLHttpRequest*/ = null;
/** Map of HTTP request headers (XHR only). */
Ql.AsyncRequest.prototype._m_mapRequestHeaders/*:Object(String*)*/ = null;
/** Form used to submit data to the iframe (IFrame only). */
Ql.AsyncRequest.prototype._m_form/*:HTMLForm*/ = null;
/** IFrame for when an XHR can’t be used (IFrame only). */
Ql.AsyncRequest.prototype._m_iframe/*:HTMLIFrame*/ = null;
/** Element, or element containing elements, that will be moved into the form to be submitted to the
IFrame (IFrame only). */
Ql.AsyncRequest.prototype._m_eltFormContents/*:Ql.DOM.Element*/ = null;


/** Interrupts a pending HTTP request.

return:Ql.AsyncRequest
	this.
*/
function $Ql$AsyncRequest$abort() {
	Function.checkArgs($Ql$AsyncRequest$abort, arguments);
	if (this.status != Ql.AsyncRequest.STATUS_PENDING) {
		throw new Error("No pending request");
	}
	if (this._m_xhr) {
		this._m_xhr.abort();
		// IE5.5 bug, IE6 bug, IE7 bug (AX), IE8 bug (AX), OP9 bug, OP9.50 bug, WK525 bug:
		// XMLHttpRequest.abort() doesn’t trigger onreadystatechange, so the status wasn’t updated,
		// and notification and cleanup still need to be done.
	} else {
		// Clear the src attribute to stop the request. Note: this won’t trigger a load event, so that
		// must be done below.
		// OP9.50 bug, OP10 bug, OP10.50 bug, OP11 bug: this doesn’t really stop loading the page, but
		// this._onReady() will call this._cleanUp() at the end, which will destroy this._m_iframe
		// anyway.
		this._m_iframe.setAttribute("src", "");
	}
	if (this.status == Ql.AsyncRequest.STATUS_PENDING) {
		this._onReady();
	}
	return this;
}
Ql.AsyncRequest.prototype.abort = $Ql$AsyncRequest$abort;


/** Performs some cleanup tasks, after a request has come to completion or has been aborted.
*/
function $Ql$AsyncRequest$_cleanUp() {
	if (this._m_xhr) {
		// IE5.5 bug, IE6 bug, IE7 bug (AX), IE8 bug (AX): they don’t like a null here, so assign an
		// empty function instead.
		this._m_xhr.onreadystatechange = Function.Empty;
		this._m_xhr = null;
	} else {
		var form = this._m_form;
		if (form) {
			if (this._m_eltFormContents) {
				// If the request was completed successfully, clear every uploaded file field.
				if (this.status == Ql.AsyncRequest.STATUS_COMPLETE) {
					var arrFiles = form.select("input[type=file]");
					for (var i = 0; i < arrFiles.length; ++i) {
						arrFiles[i]._.value = "";
					}
				}
				// Restore the form contents element to its former position, discarding the temporary
				// form.
				form.getParentNode().replaceChild(this._m_eltFormContents, form);
			} else {
				// Just remove the whole temporary form.
				form.unlink();
			}
			form = this._m_form = null;
		}
		var iframe = this._m_iframe;
		iframe.removeEventListener("load", this._onIFrameLoad, false);
		// FX1.5 bug, FX2 bug, FX3 bug, FX3.5 bug: if the IFrame is unlinked while its load event is
		// being handled (which is what we do here), the browser will be stuck with the “page loading”
		// animation; clearing the src attribute avoids this. In IE5.5/IE6/IE7/IE8, this fix causes a
		// harmless flashing “Opening page about:blank” in the status bar, presumably from the empty
		// string being translated to about:blank.
		iframe.setAttribute("src", "");
		iframe.unlink();
		iframe = this._m_iframe = null;
	}
	this.status = Ql.AsyncRequest.STATUS_IDLE;
}
Ql.AsyncRequest.prototype._cleanUp = $Ql$AsyncRequest$_cleanUp;


/** Tries to create an XHR object; switches to using an IFrame if unsuccessful.

return:bool
	true if an XHR instance was created; false if a switch to using IFrames is necessary.
*/
function $Ql$AsyncRequest$_createXhr() {
	if ("XMLHttpRequest" in window) {
		try {
			this._m_xhr = new XMLHttpRequest();
			return true;
		} catch (x) {
		}
	}
	this._m_bForceIFrame = true;
	return false;
}
Ql.AsyncRequest.prototype._createXhr = $Ql$AsyncRequest$_createXhr;


/** Parses a response message, converting it from the given MIME type.

s:String
	Response text.
sMimeType:String
	Response MIME type.
return:var
	Rendered value of the response.
*/
function $Ql$AsyncRequest$_parseResponse(s, sMimeType) {
	switch (sMimeType) {
		case "text/plain":
			return s;
		case "application/json":
			return s.jsonDecode();
		default:
			if (sMimeType.substr(-4) != "+xml") {
				throw new TypeError("Unknown MIME type");
			}
			// Fall through…
		case "application/xml":
		case "text/xml":
			if (!this._m_xhr)
				// IFrames need a separate parser.
				return this._parseXml(s, sMimeType);
			}
			return this._m_xhr.responseXML;
	}
}
Ql.AsyncRequest.prototype._parseResponse = $Ql$AsyncRequest$_parseResponse;


/** Parses an XML response message.

s:String
	Response text.
sMimeType:String
	Response MIME type.
return:var
	Rendered value of the response.
*/
if ("DOMParser" in window) {
	function $Ql$AsyncRequest$_parseXml_DOMParser(s, sMimeType) {
		return (new DOMParser()).parseFromString(s, sMimeType);
	}
	Ql.AsyncRequest.prototype._parseXml = $Ql$AsyncRequest$_parseXml_DOMParser;
} else if ("XMLHttpRequest" in window) {
	function $Ql$AsyncRequest$_parseXml_XHR(s, sMimeType) {
		// Trick to access the XHR’s XML parser. No browsers currently supported by Ql need this,
		// but DOMParser is not a standard but a de facto one, so this is a safe fallback.
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "data:" + sMimeType + ";charset=utf-8," + Url.encodeComponent(s), false);
		if ("overrideMimeType" in xhr) {
			xhr.overrideMimeType(sMimeType);
		}
		xhr.send(null);
		return xhr.responseXML;
	}
	Ql.AsyncRequest.prototype._parseXml = $Ql$AsyncRequest$_parseXml_XHR;
} else {
	function $Ql$AsyncRequest$_parseXml_throw(s, sMimeType) {
		throw new Error("Not implemented");
	}
	Ql.AsyncRequest.prototype._parseXml = $Ql$AsyncRequest$_parseXml_throw;
}


/** Assigns a form element, or a container of form elements, to be submitted in the request; this
will cause an IFrame to be used, regardless of the availability of XHR. If the provided element is
not a form, a temporary form will replace it while the request is processed.

elt:Ql.DOM.Element
	Element, or element containing elements, to be submitted.
return:Ql.AsyncRequest
	this.
*/
function $Ql$AsyncRequest$setFormElements(elt) {
	Function.checkArgs($Ql$AsyncRequest$setFormElements, arguments, Ql.DOM.Element);
	if (this.status != Ql.AsyncRequest.STATUS_IDLE) {
		throw new Error("Request still active, cannot change form element");
	}
	this._m_bForceIFrame = true;
	this._m_eltFormContents = elt;
	return this;
}
Ql.AsyncRequest.prototype.setFormElements = $Ql$AsyncRequest$setFormElements;


/** Submits (starts) an asynchronous HTTP request.

sMethod:String
	HTTP method to be used.
[vUrl:(Url|String)]
	URL to be requested; defaults to location.href (without the hash part).
[mapParams:Object(String*)]
	HTTP request headers.
[onComplete:Function]
	Function to be called when the request will be completed (or aborted).
return:Ql.AsyncRequest
	this.
*/
function $Ql$AsyncRequest$submit(
	sMethod, vUrl /*= location.href*/, mapParams /*= {}*/, onComplete /*= undefined*/
) {
	Function.checkArgs(
		$Ql$AsyncRequest$submit, arguments,
		String, [undefined, null, Url, String], [undefined, null, Object], [undefined, null, Function]
	);
	if (this.status != Ql.AsyncRequest.STATUS_IDLE) {
		throw new Error("Request still active, cannot initiate new");
	}
	sMethod = sMethod.toUpperCase();
	if (sMethod != "POST" && sMethod != "GET") {
		throw new RangeError("Invalid request method");
	}
	// Determine the request URL.
	var url;
	if (vUrl instanceof Url) {
		url = vUrl;
	} else {
		url = new Url(vUrl || location.href.substr(0, location.href.length - location.hash.length));
	}

	if (!mapParams) {
		mapParams = {};
	}
	this._m_onComplete = onComplete;

	// No decision between XHR or IFrame has been made yet (i.e. neither has been excluded by
	// features requested by the client), so choose now.
	if (this._m_bForceIFrame || (!this._m_xhr && !this._createXhr())) {
		// No XHR: request a copy of the HTTP headers to be sent in the message body.
		url.query["forcetext"] = "1";
		// If there’s any <input type="file">, change the request method and Content-Type.
		var elt = this._m_eltFormContents;
		if (elt) {
			if (elt instanceof Ql.DOM.FileInput || elt.select("input[type=file]").length) {
				sMethod = "POST";
				this._m_mapRequestHeaders["Content-Type"] = "multipart/form-data";
			}
			elt = null;
		}
	}
	// Back to shared code.

	if (!("Content-Type" in this._m_mapRequestHeaders)) {
		// Set a safe default Content-Type.
		this._m_mapRequestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
	}
	// If there’s a non-null session id, complete the URL to include it.
	if (location.SID) {
		// Split the SID in name and value.
		var ich = location.SID.indexOf("=");
		// Add the SID to the query string.
		url.query[location.SID.substr(0, ich)] = location.SID.substr(ich + 1);
	}
	// Store the URL as a string.
	this._m_sUrl = url.toString();

	// Start the connection. New code split.
	if (this._m_xhr) {
		this._m_xhr.open(sMethod, this._m_sUrl, true);
		// Send any additional headers and prepare to listen for events.
		for (var sName in this._m_mapRequestHeaders) {
			this._m_xhr.setRequestHeader(sName, this._m_mapRequestHeaders[sName]);
		}
		this._m_xhr.onreadystatechange = this._onXhrReadyStateChange;
		// Convert mapParams to a string according to the MIME type, and send the result to the
		// server.
		var sParams = "";
		switch (this._m_mapRequestHeaders["Content-Type"]) {
			case "application/x-www-form-urlencoded":
				sParams = Url.encodeQuery(mapParams);
				break;
		}
		// Wait for the response.
		this._m_xhr.send(sParams);
	} else {
		// Set up a target IFrame.
		var iframe = this._m_iframe = Ql.DOM.document.createElement("iframe");
		iframe.setStyle("display", "none");
		var sIFrameId = "if_" + this._m_sId;
		// If these two lines are reversed, the IFrame’s id won’t be recognized as a possible target
		// for forms.
		iframe.setAttribute("id", sIFrameId);
		Ql.DOM.document.getBody().appendChild(iframe);
		// Set up a form to submit into the IFrame.
		var form = this._m_form = Ql.DOM.document.createElement("form");
		form.setAttribute("action", this._m_sUrl);
		form.setAttribute("method", sMethod);
		form.setAttribute("enctype", this._m_mapRequestHeaders["Content-Type"]);
		form.setAttribute("target", sIFrameId);
		// Create as many input elements as the keys in mapParams.
		for (var sName in mapParams) {
			var input = Ql.DOM.document.createElement("input[type=hidden]");
			form.appendChild(input);
			input.setAttribute("name", sName);
			input.setValue(mapParams[sName]);
		}
		// Add any form elements specified by the client.
		if (this._m_eltFormContents) {
			this._m_eltFormContents.getParentNode().replaceChild(form, this._m_eltFormContents);
			form.appendChild(this._m_eltFormContents);
		} else {
			form.setStyle("display", "none");
			Ql.DOM.document.getBody().appendChild(form);
		}
		// Submit and wait.
		iframe.addEventListener("load", this._onIFrameLoad, false);
		form.submit();
	}
	this.status = Ql.AsyncRequest.STATUS_PENDING;
	return this;
}
Ql.AsyncRequest.prototype.submit = $Ql$AsyncRequest$submit;


/** Updates the page statistics (usually somewhere out of hand, in the page).

mapStats:Object(Number*)
	New statistics to take into account; it must contain these values:
	“xt”:Number
		Server-side execution time, in microseconds;
	“qt”:Number
		Database querying time, in microseconds;
	“qc”:Number
		Count of database queries.
*/
(function() {
	// Keep track of the status of statistics keeping.
	var bEnabled = null;
	// Cache the values generated by the server processing of the page.
	var mapLastStats = null, mapTotalStats = null;


	function $Ql$AsyncRequest$_updateScriptStats(mapStats) {
		if (bEnabled === null) {
			// Determine if the page has the necessary elements to display execution statistics.
			var eltScriptStats = Ql.DOM.document.select("#oScriptStats")[0];
			bEnabled = !!eltScriptStats;
			if (!bEnabled) {
				return;
			}
			// Pick up the JSON chunk left for us by the server-side page generator, decode it and
			// remove it.
			var eltScriptStatsJson = eltScriptStats.getLastChild();
			mapTotalStats = eltScriptStatsJson.getTextContent().jsonDecode();
			eltScriptStatsJson.unlink();
		} else {
			if (!bEnabled) {
				return;
			}
			// Update the overall stats.
			mapTotalStats["xt"] += mapLastStats["xt"];
			mapTotalStats["qt"] += mapLastStats["qt"];
			mapTotalStats["qc"] += mapLastStats["qc"];
			Ql.DOM.document.select("#oScriptStats_txt")[0].setTextContent(
				(Date.formatDuration(mapTotalStats["xt"] * 1000).toString())
			);
			Ql.DOM.document.select("#oScriptStats_tqp")[0].setTextContent(
				Math.round(mapTotalStats["qt"] * 100 / mapTotalStats["xt"]) + "%"
			);
			Ql.DOM.document.select("#oScriptStats_tqc")[0].setTextContent(
				mapTotalStats["qc"].toString()
			);
		}
		// Update the last stats.
		mapLastStats = mapStats;
		Ql.DOM.document.select("#oScriptStats_lxt")[0].setTextContent(
			" + " + Date.formatDuration(mapStats["xt"] * 1000)
		);
		Ql.DOM.document.select("#oScriptStats_lqp")[0].setTextContent(
			" + " + Math.round(mapStats["qt"] * 100 / mapStats["xt"]) + "%"
		);
		Ql.DOM.document.select("#oScriptStats_lqc")[0].setTextContent(" + " + mapStats["qc"]);
	}
	Ql.AsyncRequest._updateScriptStats = $Ql$AsyncRequest$_updateScriptStats;
})();


/** DESIGN_4780 JS: AsyncRequest: IFrame quirks

IFrames, used as a fallback mechanism in place of XMLHttpRequest, and also used to send files
asynchronously à la XHR, exhibit a wide array of “browser customizations”, i.e. there are quite a
few differences across the implementations.

When the HTTP response is text/plain, almost every browser somehow wraps it in HTML for display;
here’s a list of what some do, used by obtaining the .innerHTML of the root element, which is thus
not shown here:

•	IE5.5:
	<HEAD></HEAD>
	<BODY><XMP>response text</XMP></BODY>

•	IE6/IE7/IE8:
	<HEAD></HEAD>
	<BODY><PRE>response text</PRE></BODY>

•	FX1.5:
	response text

•	FX2/FX3/FX3.5:
	<head></head><body><pre>response text</pre></body>

•	OP9/OP9.50/OP10:
	<HEAD></HEAD><BODY><PRE>response text</BODY>

•	OP10.50:
	<head></head><body><pre>response text</body>

•	WK525/WK531/WK533/CR/EP2.30:
	<body><pre style="word-wrap: break-word; white-space: pre-wrap;">response text</pre></body>

When a browser downloads a long, long TextNode, it may split it up in an arbitrary way. Browsers
seem to use different chunk sizes, probably depending on the connection to the server; some however
will always break a server-generated TextNode, even on a flawless local connection, based on a fixed
chunk size:

•	FX1.5/FX2/FX3/FX3.5: 4 KiB

IE5.5/IE6/IE7/IE8 still require frames to appear in the frames collection in order to be used as
target for forms; for that to happen, each needs its name property to be set, but setting it with
.setAttribute() or .name has no effect. Also, the property needs to be set after the frame has been
inserted in the document, instead of before like in every other browser; this might be a leftover
compatibility from earlier versions of IE, such as IE5.5, which would assign a non-inserted element
a different document than the one that created it, thus necessitating the id to be assigned after
the insertion.
*/


/** Handles progress in the HTTP response (IFrame only). Although the frame might have fired this
event, there’s still a host of ways the response could be unusable, so this code can invoke the
completion handler either in success or failure.
*/
function $Ql$AsyncRequest$_onIFrameLoad(e) {
	if (this.status != Ql.AsyncRequest.STATUS_PENDING) {
		// Ignore pages loaded when we’re not waiting for any.
		return;
	}

	// A mine field follows.
	var sResponse = null, doc;
	try {
		// IE5.5 bug, IE6 bug, IE7 bug, IE8 bug: in case of a connection error, they will load
		// about:blank, whose contentDocument is inaccessible due to security issues.
		doc = this._m_iframe.getContentDocument();
	} catch (x) {
	}
	// CR: in case of a connection error, contentDocument is null. Also possible due to an exception
	// caught above.
	if (doc) {
		// OP9 bug, OP9.50 bug, OP10 bug: it looks like the initial empty page loaded by default in
		// the IFrame will fire its load event after the execution of AsyncRequest.submit(), thus
		// causing a spurious invocation of this listener. Checking for about:blank seems to be the
		// only way to detect this bug.
		if (doc._.location == "about:blank") {
			// Never forget this.
			doc.releaseWrapper();
			return;
		}
		// OP9 bug, OP9.50 bug, OP10 bug, OP10.50 bug, EP2.30 bug: in case of a connection error, they
		// will load a fake document (possibly the same as about:blank), which has a different
		// structure than the one expected here, so what follows will throw exceptions.
		try {
			var nd = doc.getDocumentElement()._;
			if (this.debugResponse) {
				alert(nd.innerHTML);
			}
			// Enter whatever nodes the browser added to display text/plain; see [DESIGN_4780 JS:
			// AsyncRequest: IFrame quirks] for details.
			while (Ql.DOM._getNodeType(nd) != Node.TEXT_NODE) {
				nd = nd.lastChild;
			}
			// Move to the first sibling.
			nd = nd.parentNode.firstChild;
			// Some browsers break down long text nodes in smaller chunks; again, see [DESIGN_4780 JS:
			// AsyncRequest: IFrame quirks].
			sResponse = "";
			do {
				sResponse += nd.nodeValue;
			} while (nd = nd.nextSibling);
		} catch (x) {
			sResponse = null;
		}
		// Done with the document (i.e. its wrapper), so discard it.
		doc.releaseWrapper();
		doc = null;
	}
	// Semi-end of the mine field.

	if (sResponse) {
		// The server must have included a copy of some necessary header fields, such as Content-Type,
		// at the beginning of the message.
		var mapHeaders = {};

		// First, determine what newline sequence the browser is using. Only OP seems to keep the one
		// received from the server; all the others change them to either LF (FX, WK, CR, EP) or CR
		// (IE), for some reason.
		var arrMatch = sResponse.match(/^[^\r\n]*(\r?\n?)/);
		if (arrMatch) {
			var sNL = arrMatch[1];
			// Parse and remove the header copy.
			var ich, ichPrev = 0;
			while ((ich = sResponse.indexOf(sNL, ichPrev)) != -1) {
				arrMatch = sResponse.substring(ichPrev, ich).match(/^([^\s:]+)\s*:\s*([^\r\n]*)\s*$/);
				// Go past this line; if it didn’t contain an RFC 822 header field, quit looking for
				// header fields.
				ichPrev = ich + sNL.length;
				if (!arrMatch) {
					break;
				}
				// Store this header field.
				mapHeaders[arrMatch[1]] = arrMatch[2];
			}
			sResponse = sResponse.substr(ichPrev);
		}
		if (!("Content-Type" in mapHeaders)) {
			// Can’t interpret the response, so throw it away.
			sResponse = null;
		}
	}

	if (sResponse) {
		this._onReady(200, sResponse, mapHeaders["Content-Type"]);
	} else {
		this._onReady();
	}
}
Ql.AsyncRequest.prototype._onIFrameLoad = $Ql$AsyncRequest$_onIFrameLoad;


/** Handles completion of the HTTP response.
*/
function $Ql$AsyncRequest$_onReady(
	iHttpStatus /*= undefined*/, sResponse /*= undefined*/, sMimeType /*= undefined*/
) {
	if (iHttpStatus) {
		if (iHttpStatus >= 200 && iHttpStatus < 300) {
			this.status = Ql.AsyncRequest.STATUS_COMPLETE;
		} else {
			this.status = Ql.AsyncRequest.STATUS_ERROR;
		}
	} else {
		this.status = Ql.AsyncRequest.STATUS_ABORTED;
	}
	if (this._m_onComplete) {
		var vResponse = undefined;
		if (this.status == Ql.AsyncRequest.STATUS_COMPLETE) {
			// Everything went fine, so parse the response. Note: the response itself can still contain
			// an error.
			try {
				vResponse = this._parseResponse(sResponse, sMimeType);
			} catch (x) {
				Ql.logException(x, "Ql.AsyncRequest._onReady@parseResponse", {
					"sUrl":        this._m_sUrl,
					"iHttpStatus": iHttpStatus,
					"sMimeType":   sMimeType,
					"sResponse":   sResponse
				});
				this.status = Ql.AsyncRequest.STATUS_INVALID_RESPONSE;
			}
			// If a response was finally parsed, check if it contains a statistics update.
			if (
				vResponse instanceof Object && "ql_scriptstats" in vResponse &&
				(Ql.User.checkPrivTokens("DBGU") || Ql.User.checkPrivTokens("DBGA"))
			)
				Ql.AsyncRequest._updateScriptStats(vResponse["ql_scriptstats"]);
		}
		if (this.debugCallback) {
			this._m_onComplete(this, vResponse);
		} else {
			try {
				this._m_onComplete(this, vResponse);
			} catch (x) {
				Ql.logException(x, "Ql.AsyncRequest._onReady@invokeCallback", {
					"sUrl":        this._m_sUrl,
					"iHttpStatus": iHttpStatus,
					"sResponse":   sResponse
				});
			}
		}
	}
	this._cleanUp();
}
Ql.AsyncRequest.prototype._onReady = $Ql$AsyncRequest$_onReady;


/** Handles progress in the HTTP response (XHR only).
*/
function $Ql$AsyncRequest$_onXhrReadyStateChange() {
	if (this.status != Ql.AsyncRequest.STATUS_PENDING) {
		// Ignore responses received when we’re not waiting for any.
		return;
	}
	if (this._m_xhr.readyState == 4) {
		// If the transfer was aborted, the status will be 0. The check must be guarded for exceptions
		// due to a FX1.5 bug/FX2 bug/FX3 bug/FX3.5 bug, where accessing any response-related property
		// after an aborted transfer generates exceptions; the standard makes no mention of such
		// behavior.
		var bAborted;
		try {
			bAborted = (this._m_xhr.status == 0);
		} catch (x) {
			bAborted = true;
		}
		if (bAborted) {
			this._onReady();
		} else {
			var sMimeType = this._m_xhr.getResponseHeader("Content-Type");
			// Drop the charset from the Content-Type.
			var ich = sMimeType.indexOf(";");
			if (ich != -1) {
				sMimeType = sMimeType.substr(0, ich);
			}

			if (this.debugResponse) {
				alert(this._m_xhr.responseText);
			}
			this._onReady(this._m_xhr.status, this._m_xhr.responseText, sMimeType);
		}
	}
}
Ql.AsyncRequest.prototype._onXhrReadyStateChange = $Ql$AsyncRequest$_onXhrReadyStateChange;

