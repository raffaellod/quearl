<?php /* -*- coding: utf-8; mode: php; tab-width: 3 -*-

Copyright 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013
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

/** MIME type detection. */


define('QUEARL_CORE_MIME_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Functions


/** Returns the MIME type for the specified file.

string $sFileName
	Name of the file to analyze.
string return
	MIME type.
*/
function ql_mime_get_file_type($sFileName) {
	if (!($file = fopen($sFileName, 'rb'))) {
		return 'application/x-unknown-content-type';
	}
	# Read enough bytes to successfully compare to every pattern string defined below (current max
	# bytes: 2114).
	$s = fread($file, 4096);
	fclose($file);
	return ql_mime_get_str_type($s);
}


/** Returns the MIME type for the specified string.

string $s
	Data to analyze.
[bool $bReturnDb]
	If true, the function will return the entire MIME database. Useful for debugging purposes.
string return
	MIME type.
*/
function ql_mime_get_str_type($s, $bReturnDb = false) {
	# Entires tagged with /*S*/ had to be moved out of sort order to avoid being overridden by more
	# generic entries which happened to be defined earlier in the sort order (e.g. “^BZ” would also
	# match “^BZh”).
	static $arrMimeCTDefs = array(
		'application/compress'              => array("\x1f\x9d" => 0),
		'application/internet-shortcut'     => array('[InternetShortcut]' => 0),
		'application/msdos-windows'         => array('MZ' => 0),
		'application/ogg'                   => array('OggS' => 0),
		'application/pdf'                   => array('%PDF-' => 0),
		'application/pgp-signature'         => array('-----BEGIN PGP SIGNATURE-----' => 0),
		'application/postscript'            => array('%!' => 0, "\x04%!" => 0),
		'application/vnd.ms-cab-compressed' => array('MSCF' => 0),
		'application/vnd.ms-excel'          => array(
			'Biff5' => 2114, 'Microsoft Excel 5.0 Worksheet' => 2080
		),
		'application/vnd.ms-htmlhelp'       => array('ITSF' => 0),
		'application/x-arj'                 => array("`\xea" => 0),
/*S*/	'application/x-bzip2'               => array('BZh' => 0),
		'application/x-bzip'                => array('BZ' => 0),
		'application/x-dvi'                 => array("\xf7\x02" => 0),
		'application/x-executable-file'     => array("\x7fELF" => 0, "\x7fOLF" => 0),
		'application/x-gimp-image'          => array('gimp xcf' => 0),
		'application/x-gtar'                => array("ustar  \x00" => 257),
		'application/x-gzip'                => array("\x1f\x8b" => 0),
		'application/x-lha'                 => array(
			'-lh -' => 2, '-lh0-' => 2, '-lh1-' => 2, '-lh2-' => 2, '-lh3-' => 2, '-lh4-' => 2,
			'-lh5-' => 2, '-lhd-' => 2, '-lz4-' => 2, '-lz5-' => 2, '-lzs-' => 2
		),
		'application/x-lzh'                 => array("v\xfd" => 0),
		'application/x-rar'                 => array('Rar!' => 0),
		'application/x-shar'                => array('# This is a shell archive' => 10),
		'application/x-shockwave-flash'     => array('FWS' => 0),
		'application/x-tar'                 => array("ustar\x00" => 257),
		'application/x-uuencode'            => array('begin ' => 0),
		'application/xml'                   => array('<?xml ' => 0),
		'application/zip'                   => array("PK\x03\x04" => 0),
		'audio/basic'                       => array(".sd\x00" => 0, '.snd' => 0),
		'audio/midi'                        => array('MThd' => 0),
		'audio/mod'                         => array('FAR' => 0),
		'audio/x-cmf'                       => array('CTMF' => 0),
		'audio/x-emod'                      => array('EMOD' => 0),
		'audio/x-multitrack'                => array('MTM' => 0, 'NTRK' => 0),
		'audio/x-pn-realaudio'              => array(".ra\xfd" => 0),
		'audio/x-sbi'                       => array('SBI' => 0),
		'audio/x-toc'                       => array('TOC' => 0),
		'audio/x-voc'                       => array('Creative Voice File' => 0),
		'audio/x-wav'                       => array('WAVEfmt ' => 8),
		'image/gif'                         => array('GIF' => 0),
		'image/jpeg'                        => array("\xff\xd8\xff" => 0),
		'image/png'                         => array("\x89PNG\x0d\x0a\x1a\x0a" => 0),
		'image/tiff'                        => array("II*\x00" => 0, 'IIN1' => 0, "MM\x00*" => 0),
		'image/x-cmu-raster'                => array("\xf1\x00@\xbb" => 0),
		'image/x-ms-bmp'                    => array('BM' => 0),
		'image/x-portable-bitmap'           => array('P1' => 0, 'P4' => 0),
		'image/x-portable-graymap'          => array('P2' => 0, 'P5' => 0),
		'image/x-portable-pixmap'           => array('P3' => 0, 'P6' => 0),
		'message/news'                      => array('Article' => 0, 'Path:' => 0, 'Xref:' => 0),
		'message/rfc822'                    => array(
			'#! rnews' => 0, 'Forward to' => 0, 'From:' => 0, 'N#! rnews' => 0, 'Pipe to' => 0,
			'Received:' => 0, 'Return-Path:' => 0, 'Relay-Version:' => 0
		),
		'message/x-gnu-rmail'               => array('BABYL' => 0),
		'text/html'                         => array(
			'<!DOCTYPE HTML' => 0, '<!doctype html' => 0, '<html' => 0, '<HTML' => 0
		),
		'text/rtf'                          => array('{\rtf' => 0),
		'text/vnd.ms-word'                  => array('PO^Q`' => 0, "1\xbe\x00\x00" => 0),
		'text/x-vcard'                      => array('BEGIN:VCARD' => 0, 'begin:vcard' => 0),
		'video/flc'                         => array("\x12\xaf" => 4),
		'video/fli'                         => array("\x11\xaf" => 4),
		'video/mpeg'                        => array(
			"\x00\x00\x01\xb3" => 0, "\x00\x00\x01\xba" => 0
		),
		'video/quicktime'                   => array('mdat' => 4, 'moov' => 4, 'pnot' => 4),
		'video/x-ms-wmv'                    => array("0&\xb2u\x8ef\xcf\x11" => 0),
		'video/x-msvideo'                   => array('AVI LIST' => 8),
		'video/x-sgi-movie'                 => array('MOVI' => 0),
#		'?'                                 => array('!<arch>' => 0),
#		'?'                                 => array("L\x00\x00\x00\x01\x14\x02\x00" => 0),
	);
	# Subtypes of XML document.
	static $arrXmlNSDefs = array(
		'http://www.w3.org/2005/Atom'                                   => 'application/atom+xml',
		'http://www.w3.org/1998/Math/MathML'                            => 'application/mathml+xml',
		'http://www.w3.org/1999/02/22-rdf-syntax-ns#'                   => 'application/rdf+xml',
		'http://www.w3.org/2001/06/grammar'                             => 'application/srgs+xml',
		'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul' =>
			'application/vnd.mozilla.xul+xml',
		'http://www.w3.org/2001/vxml'                                   => 'application/voicexml+xml',
		'http://www.w3.org/1999/xhtml'                                  => 'application/xhtml+xml',
		'http://www.w3.org/2002/06/xhtml2'                              => 'application/xhtml+xml',
		'http://www.w3.org/1999/XSL/Transform'                          => 'application/xslt+xml',
		'http://www.w3.org/2000/svg'                                    => 'image/svg+xml',
	);
	if ($bReturnDb) {
		return $arrMimeCTDefs;
	}
	foreach ($arrMimeCTDefs as $sMimeType => $arrTypeDef) {
		foreach ($arrTypeDef as $sSignature => $iOffset) {
			if (substr($s, $iOffset, strlen($sSignature)) === $sSignature) {
				# Special case for XML files: scan for xmlns attributes in the root element.
				# TODO: this is missing a lot of error checking!
				if ($sMimeType == 'application/xml') {
					for (
						$ich = 6 /*strlen('<' . '?xml ')*/;
						$ich !== false;
						$ich = strpos($s, '<', strpos($s, '>', $ich + 2))
					) {
						if (substr($s, $ich + 1, 3) == '!--') {
							# Comment: find the end, so the loop’s strpos() will correctly skip any
							# commented-out “>” characters.
							$ich = strpos($s, '-->', $ich + 4 /*strlen('<!--')*/);
						} else {
							# If not a DOCTYPE declaration or preprocessing instruction, it’s the root
							# element.
							++$ich;
							if ($s{$ich} != '!' && $s{$ich} != '?') {
								preg_match_all(
									'/\s+xmlns(?::([\-_0-9A-Za-z]+))?="([^"]+)"/',
									substr($s, $ich, strpos($s, '>', $ich) - $ich),
									$arrMatches
								);
								if (is_array($arrMatches)) {
									unset($arrMatches[0]);
									# Look for a default namespace.
									$iMime = array_search('', $arrMatches[1], true);
									if ($iMime !== false) {
										if (isset($arrXmlNSDefs[$arrMatches[2][$iMime]])) {
											return $arrXmlNSDefs[$arrMatches[2][$iMime]];
										}
										unset($arrMatches[2][$iMime]);
									}
									# Lacking a default, assume that the first namespace is the main one.
									foreach ($arrMatches[2] as $sUri) {
										if (isset($arrXmlNSDefs[$sUri])) {
											return $arrXmlNSDefs[$sUri];
										}
									}
								}
								break;
							}
						}
					}
				}
				return $sMimeType;
			}
		}
	}
	return 'application/x-unknown-content-type';
}


/** Searches for conflicts in the MIME type pattern strings in ql_mime_get_str_type()’s
$arrMimeCTDefs. The nesting of loops might look scary, but it’s really just ql_mime_get_str_type()’s
foreach double-loop applied to itself.
*/
function ql_mime__check() {
	$arrMimeCTDefs = ql_mime_get_str_type('', true);
	echo '<h1>Checking for MIME pattern conflicts…</h1>' . NL;
	$arrMimeTypes = array_keys($arrMimeCTDefs);
	foreach ($arrMimeTypes as $iMime1 => $sMimeType1) {
		foreach ($arrMimeCTDefs[$sMimeType1] as $sSignature1 => $iOffset1) {
			foreach ($arrMimeTypes as $iMime2 => $sMimeType2) {
				if ($iMime1 != $iMime2) {
					foreach ($arrMimeCTDefs[$sMimeType2] as $sSignature2 => $iOffset2) {
						if (
							$iOffset1 <= $iOffset2 + strlen($sSignature2) &&
							$iOffset2 <= $iOffset1 + strlen($sSignature1) &&
							substr(
								$sSignature1, $iOffset2 - $iOffset1, strlen($sSignature2)
							) == $sSignature2
						) {
							# TODO: shouldn’t this also check for ! && ! ? As in, shouldn’t the condition
							# be !^^ ?
							if (strlen($sSignature1) > strlen($sSignature2) && $iMime1 < $iMime2) {
								echo '<b>Notice</b>: ' . $sMimeType1 . ' and ' . $sMimeType2 .
									' could be ambiguous if their order was reversed.<br/>' . NL;
							} else {
								echo '<b>Warning</b>: ' . $sMimeType1 . ' and ' . $sMimeType2 .
									' are ambiguous!<br/>' . NL;
							}
						}
					}
				}
			}
		}
	}
	echo '<br/>Scan completed.' . NL;
}

?>
