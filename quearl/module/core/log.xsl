<?xml version="1.0" encoding="utf-8"?>
<!-- -*- coding: utf-8; mode: xslt; tab-width: 3 -*-
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Quearl
Copyright 2007-2013 Raffaello D. Di Napoli
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
This file is part of Quearl.

Quearl is free software: you can redistribute it and/or modify it under the terms of the GNU Affero
General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

Quearl is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General
Public License for more details.

You should have received a copy of the GNU Affero General Public License along with Quearl. If not,
see <http://www.gnu.org/licenses/>.
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

XML style sheet referenced by Quearl-generated logs.
-->

<xsl:stylesheet version="1.0" xml:lang="en-US" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="utf-8" media-type="application/xhtml+xml"/>

<xsl:template match="//log">
	<html xml:lang="en-US">
		<head>
			<title>Log - <xsl:value-of select="@date"/></title>
			<style type="text/css"><![CDATA[
				html {
					background: #eeeeee;
					font: 70% 'Verdana', 'Helvetica', sans-serif;
				}

				body {
					margin: 0.5em;
				}

				a:link,
				a:active,
				a:visited {
					color: #559911;
					text-decoration: none;
				}
				a:hover {
					color: #77cc22;
					text-decoration: underline;
				}

				p,
				pre,
				table,
				.context,
				.backtrace {
					margin: 0.5em;
				}

				code,
				pre,
				tt {
					font-size: 125%;
				}

				code > pre,
				tt > pre {
					font-size: 100%;
				}

				pre {
					border: 1px dotted #cccccc;
					padding: 0.3em;
				}

				table {
					border-collapse: collapse;
				}
				th,
				td,
				caption {
					padding: 0.2em;
				}
				th,
				td {
					border: solid 1px #cccccc;
				}
				caption {
					text-align: left;
				}
				th {
					background: #eeeeee;
				}

				.al {
					text-align: left;
				}
				.ac {
					text-align: center;
				}
				.ar {
					text-align: right;
				}

				.entry {
					margin-bottom: 0.5em;
					border: 1px solid #888888;
					background: #ffffff;
				}

				.entry > .info {
					margin: 0;
				}
				.entry > .info > tbody > tr > td {
					padding: 0.1em;
					border: none;
					text-align: center;
					vertical-align: middle;
				}
				.entry > .info > tbody > tr > td:first-of-type {
					width: 1.5em;
					color: #ffffff;
					background: #888888;
				}
				.entry > .info > tbody > tr > td.toggle-entry {
					cursor: pointer;
				}
				.entry > .info > tbody > tr > td.toggle-entry:hover {
					background: #336688;
				}
				.entry > .info > tbody > tr > .timestamp {
					width: 8em;
					color: #000000;
					background: #dddddd;
				}
				.entry > .info > tbody > tr > .category {
					width: 11em;
					color: #ffffff;
					background: #dddddd;
				}
				.entry > .info > tbody > tr > .category.DEBUG               { background: #cc9966; }
				.entry > .info > tbody > tr > .category.E_ERROR             { background: #dd3300; }
				.entry > .info > tbody > tr > .category.E_JSEXCEPTION       { background: #cc3366; }
				.entry > .info > tbody > tr > .category.E_NOTICE            { background: #ccaa00; }
				.entry > .info > tbody > tr > .category.E_PARSE             { background: #dd3300; }
				.entry > .info > tbody > tr > .category.E_RECOVERABLE_ERROR { background: #dd3300; }
				.entry > .info > tbody > tr > .category.E_STRICT            { background: #ccaa00; }
				.entry > .info > tbody > tr > .category.E_USER_ERROR        { background: #dd3300; }
				.entry > .info > tbody > tr > .category.E_USER_NOTICE       { background: #ccaa00; }
				.entry > .info > tbody > tr > .category.E_USER_WARNING      { background: #dd7700; }
				.entry > .info > tbody > tr > .category.E_WARNING           { background: #dd7700; }
				.entry > .info > tbody > tr > .category.INFO                { background: #77bb55; }
				.entry > .info > tbody > tr > .title {
					padding-left: 0.3em;
					text-align: left;
					vertical-align: top;
				}

				.raw > b {
					display: inline-block;
					margin: 0.1em;
					border: solid 1px #eedd99;
					background: #ffee88;
					font: 90% monospace;
				}

				.backtrace {
					border: 1px solid #cccccc;
				}
				.backtrace > .frame {
				}
				.backtrace > .frame > tr > td {
					border-width: 0;
				}
				.backtrace > .frame > tr > .file {
					background: #dddddd;
					padding: 0.1em 0.2em;
					white-space: nowrap;
				}
				.backtrace > .frame > tr > .code {
					width: 100%;
				}
				.backtrace > .frame > tr > .run-time-info {
					padding-left: 1.5em;
					color: #888888;
				}

				.context {
					border: 1px solid #cccccc;
					padding-bottom: 0.3em;
				}
				.context .title {
					display: block;
					margin-bottom: 0.3em;
					padding: 0.1em;
					background: #cccccc;
				}
				.context pre {
					margin: 0 0.3em;
					border: none;
					padding: 0;
					cursor: text;
				}
				.context pre .var-name,
				.context pre .var-ellipsis {
					cursor: pointer;
				}
				.context pre .var-name:hover,
				.context pre .var-ellipsis {
					background: #eef8ff;
				}
			]]></style>
			<script type="text/javascript"><![CDATA[

				// Performs post-XSLT formatting.
				document.addEventListener("DOMContentLoaded", function(e) {
					// Scan for <span class="raw"> elements.
					var arrRaws = document.getElementsByClassName("raw");
					for (var iRaw = 0; iRaw < arrRaws.length; ++iRaw) {
						var eltRaw = arrRaws[iRaw];
						// Get contents of the element’s text node, then discard the node.
						var s = eltRaw.firstChild.nodeValue;
						eltRaw.removeChild(eltRaw.firstChild);
						// Render each byte in its own <b> (short for “byte”) element inside eltRaw.
						for (var ich = 0; ich < s.length; ich += 2) {
							var eltRawByte = eltRaw.appendChild(document.createElement("b"));
							eltRawByte.appendChild(document.createTextNode("\\x" + s.substr(ich, 2)));
						}
					}
				}, false);


				// Handles all expand/collapse commands.
				document.addEventListener("click", function(e) {
					var eltTarget = e.target;
					if (!eltTarget.getAttribute) {
						return;
					}
					switch (eltTarget.getAttribute("class")) {
						case "toggle-entry":
							var eltEntryContents =
								eltTarget.parentNode.parentNode.parentNode.parentNode.lastChild;
							var bShow = eltEntryContents.style.getPropertyValue("display") != "";
							eltTarget.firstChild.nodeValue = bShow ? "−" : "+";
							eltEntryContents.style.setProperty("display", bShow ? "" : "none", "");
							break;
						case "var-name":
							// Advance to the following “var-ellipsis” element.
							eltTarget = eltTarget.nextSibling;
							// Fall through.
						case "var-ellipsis": {
							var eltVarEllipsis = eltTarget;
							var eltVarValue = eltVarEllipsis.nextSibling;
							var bValueVisible = eltVarValue.style.getPropertyValue("display") == "";
							eltVarEllipsis.style.setProperty("display", bValueVisible ? "" : "none", "");
							eltVarValue.style.setProperty("display", bValueVisible ? "none" : "", "");
							break;
						}
					}
				}, false);

			]]></script>
		</head>
		<body>
			<xsl:apply-templates/>
		</body>
	</html>
</xsl:template>

<xsl:template match="//log/entry">
	<div class="entry">
		<table class="info"><tbody><tr>
			<td>
				<xsl:if test="(count(*) != 0) or (string-length() != 0)">
					<xsl:attribute name="class">toggle-entry</xsl:attribute>+
				</xsl:if>
			</td>
			<td class="timestamp">
				<strong><xsl:value-of select="@time"/></strong>.<xsl:value-of select="@timef"/>
			</td>
			<td>
				<xsl:attribute name="class">category <xsl:value-of select="@cat"/></xsl:attribute>
				<xsl:value-of select="@cat"/>
			</td>
			<td class="title">
				<xsl:value-of select="@title"/>
			</td>
		</tr></tbody></table>
		<div style="display: none;">
			<xsl:apply-templates/>
		</div>
	</div>
</xsl:template>

<xsl:template match="//log/entry/backtrace">
	<table class="backtrace">
		<xsl:apply-templates/>
	</table>
</xsl:template>

<xsl:template match="//log/entry/backtrace/frame">
	<tbody class="frame">
		<tr>
			<td class="file">
				<xsl:value-of select="@file"/>
				<xsl:if test="@line">
					:<xsl:value-of select="@line"/>
				</xsl:if>
			</td>
			<td class="code">
				<xsl:if test="@code">
					<code><xsl:value-of select="@code"/></code>
				</xsl:if>
			</td>
		</tr>
		<xsl:if test="string-length() != 0">
			<tr>
				<td class="run-time-info" colspan="2">
					<code><xsl:value-of select="."/></code>
				</td>
			</tr>
		</xsl:if>
	</tbody>
</xsl:template>

<xsl:template match="//log/entry/context">
	<div class="context">
		<xsl:if test="@name">
			<strong class="title"><xsl:value-of select="@name"/></strong>
		</xsl:if>
		<xsl:apply-templates>
			<xsl:sort select="@name"/>
		</xsl:apply-templates>
	</div>
</xsl:template>

<xsl:template match="//log/entry/context/var">
	<code><pre><xsl:choose>
		<xsl:when test="contains(., '&#10;') or contains(., '&#13;')">
			<span class="var-name"><xsl:value-of select="@name"/> = </span>
			<span class="var-ellipsis">(…)</span>
			<span style="display: none;"><xsl:value-of select="."/>;</span>
		</xsl:when>
		<xsl:otherwise><xsl:value-of select="@name"/> = <xsl:value-of select="."/>;</xsl:otherwise>
	</xsl:choose></pre></code>
</xsl:template>

<xsl:template match="br|table|tr|pre|code|strong|em|small|big">
	<xsl:element name="{name()}">
		<xsl:apply-templates/>
	</xsl:element>
</xsl:template>

<xsl:template match="p|caption|th|td">
	<xsl:element name="{name()}">
		<xsl:if test="@a">
			<xsl:attribute name="class">a<xsl:value-of select="@a"/></xsl:attribute>
		</xsl:if>
		<xsl:apply-templates/>
	</xsl:element>
</xsl:template>

<xsl:template match="a">
	<a>
		<xsl:attribute name="href"><xsl:value-of select="@href"/></xsl:attribute>
		<xsl:apply-templates/>
	</a>
</xsl:template>

<xsl:template match="span">
	<span>
		<xsl:attribute name="style"><xsl:value-of select="@style"/></xsl:attribute>
		<xsl:apply-templates/>
	</span>
</xsl:template>

<xsl:template match="raw">
	<span class="raw"><xsl:value-of select="."/></span>
</xsl:template>

</xsl:stylesheet>

