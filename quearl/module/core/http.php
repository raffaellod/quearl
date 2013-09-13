<?php
# -*- coding: utf-8; mode: php; tab-width: 3 -*-
#---------------------------------------------------------------------------------------------------
# Quearl
# Copyright 2006-2013 Raffaello D. Di Napoli
#---------------------------------------------------------------------------------------------------
# This file is part of Quearl.
#
# Quearl is free software: you can redistribute it and/or modify it under the terms of the GNU
# Affero General Public License as published by the Free Software Foundation, either version 3 of
# the License, or (at your option) any later version.
#
# Quearl is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
# the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
# General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License along with Quearl. If
# not, see <http://www.gnu.org/licenses/>.
#---------------------------------------------------------------------------------------------------

# HTTP server-to-server communication.


define('QUEARL_CORE_HTTP_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Constants


# Enumeration values for ql_http_get()::$fiOptions.

## Do not follow server-mandated redirects.
define('QL_HG_NOREDIRECT', 0x00000001);
## Only return the response body; discard any headers.
define('QL_HG_RETURNBODY', 0x10000000);


# Internal states of ql_http_get*().

## End.
define('QL__HG_END',      0);
## Establish a connection to the sever.
define('QL__HG_CONNECT',  1);
## Build the HTTP request message and send the request.
define('QL__HG_SEND',     2);
## Read and parse the server’s request.
define('QL__HG_READ',     3);
## Close the connection to the server.
define('QL__HG_SHUTDOWN', 4);



####################################################################################################
# Functions


if (!function_exists('gzdecode')) {
## Inverse function of PHP’s gzencode().
#
# string $s
#    Compressed data to decompress.
# string return
#    Decompressed data, or false if an error occurred or if the source data was invalid.
#
function gzdecode($s) {
	$cb = strlen($s);
	# ID1 and ID2.
	if ($cb < 18 || strncmp($s, "\x1F\x8B", 2) != 0) {
		trigger_error('Invalid GZIP compressed data', E_USER_WARNING);
		return false;
	}
	# CM and FLG.
	list(, $iMethod, $iFlags) = unpack('C2', substr($s, 2, 2));
	# Verify that unused bits are really not used.
	if ($iFlags & 0x1f != $iFlags) {
		trigger_error('Unknown GZIP compressed data', E_USER_WARNING);
		return false;
	}
	$cbHeader = 10;
	$cbExtra = 0;
	$cbFileName = 0;
	if ($iFlags & 0x04 /*FEXTRA*/) {
		# EXTRA: length-prefixed data (2-byte prefix).
		if ($cb - $cbHeader - 2 < 8) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		list(, $cbExtra) = unpack('v', substr($s, 8, 2));
		if ($cb - $cbHeader - 2 - $cbExtra < 8) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		$cbHeader += 2 + $cbExtra;
	}
	if ($iFlags & 0x08 /*FNAME*/) {
		# NAME: NUL-terminated string.
		if ($cb - $cbHeader - 1 < 8) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		$cbFileName = strpos($s, "\x00", 8 + $cbExtra);
		if ($cbFileName === false || $cb - ($cbHeader - $cbExtra) - $cbFileName - 1 < 0) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		$cbHeader += $cbFileName + 1;
	}
	if ($iFlags & 0x10 /*FCOMMENT*/) {
		# COMMENT: NUL-terminated string.
		if ($cb - $cbHeader - 1 < 8) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		$cbComment = strpos($s, "\x00", 8 + $cbExtra + $cbFileName);
		if ($cbComment === false || $cb - ($cbHeader - $cbExtra - $cbFileName) - $cbComment - 1 < 0) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		$cbHeader += $cbComment + 1;
	}
	if ($iFlags & 0x02 /*FHCRC*/) {
		# CRC16.
		if ($cb - $cbHeader - 2 < 8) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		list(, $iHeaderCrc) = unpack('v', substr($s, $cbHeader, 2));
		if ($iHeaderCrc != crc32(substr($s, 0, $cbHeader)) & 0x0000FFFF) {
			trigger_error('Error in GZIP compressed data', E_USER_WARNING);
			return false;
		}
		$cbHeader += 2;
	}
	# CRC32 and ISIZE.
	list(, $iDataCrc, $cbUncomp) = unpack('V2', substr($s, -8));

	if ($cb - $cbHeader <= 8) {
		trigger_error('Error in GZIP compressed data', E_USER_WARNING);
		return false;
	}
	# Cut away and decompress the payload.
	$s = substr($s, $cbHeader, $cb - $cbHeader - 8);
	switch ($iMethod) {
		case 0x08:
			$s = gzinflate($s);
			break;

		default:
			trigger_error('Unknown GZIP compression method ' . pack('H', $iMethod), E_USER_WARNING);
			return false;
	}
	# Validate the decompressed data.
	if (strlen($s) != $cbUncomp || crc32($s) != $iDataCrc) {
		trigger_error('CRC error in GZIP data', E_USER_WARNING);
		return false;
	}
	return $s;
}
}


## Attempts to detect the content type of an HTTP response.
#
# array<string => mixed>& $arrResponse
#    Response, as generated by ql_http_get().
# string $sEntity
#    Entity of the response.
# string return
#    A charset/text encoding if one was detected, or null otherwise.
#
function ql_http_detect_charset(array &$arrResponse, &$sEntity) {
	# This pattern matches RFC 2616 § 3.7 “Media Types”, capturing the MIME content type and an
	# optional “charset” parameter.
	static $sc_reMediaType = '/^
			# Match and capture the MIME type.
			(?P<mimetype>[^;]+)
			# Allow for parameters, separated by “;”.
			(?:
				# Match parameters other than “charset”.
				# TODO: verify that this doesn’t also eat charset=.
#				(?:
#					;[^;]*
#				)*
				# Match the “charset” parameter, and capture its value.
				;\s*(?i:charset)=(?P<charset>\S+)\s*
				# Match any remaining parameter.
				# TODO: verify that this doesn’t also eat charset=.
#				(?:
#					;[^;]*
#				)*
			)?
		$/ADx';

	if (preg_match($sc_reMediaType, @$arrResponse['headers']['Content-Type'], $arrMatch)) {
		# If the pattern captured “charset”, return that.
		if (isset($arrMatch['charset'])) {
			return strtolower($arrMatch['charset']);
		}

		# Else, we have parsers for common response MIME types.
		$sMimeType = strtolower($arrMatch['mimetype']);
		switch ($sMimeType) {
			case 'text/html':
				# An HTML document can contain a “<meta http-equiv="Content-Type"” that overrides any other
				# specification from the server.

				# First, try to locate the <head> element.
				if (preg_match('/<head>(?P<head>.*?)<\/head>/is', $sEntity, $arrMatch)) {
					# Now, with some luck, this will find a <meta http-equiv="Content-Type" …>.
					$sHead = $arrMatch['head'];
					if (preg_match(
						'/
							<meta
								\s+http-equiv=(?P<quotes1>"|\'|)Content-Type(=P<quotes1>)
								\s+content=(?:"([^"]+)"|([^>\s]+))
								\s*
							\/?>
						/ix',
						$sHead, $arrMatch
					)) {
						# Found: parse it just like we did for the header field, above.
						$sContentType = $arrMatch['contenttype'];
						if (preg_match($sc_reMediaType, $sContentType, $arrMatch)) {
							# If the pattern captured “charset”, return that.
							if (isset($arrMatch['charset'])) {
								return strtolower($arrMatch['charset']);
							}
						}
					}
				}
				# This HTML file does not specify an encoding; 
				break;

			default:
				# Check for XML-based file types; we’ll fall through to “text/xml” for these.
				if (substr($sMimeType, -4) != '+xml') {
					if (strncmp($sMimeType, 'text/', 5) == 0) {
						# According to RFC 2616 § 3.7.1 “Canonicalization and Text Defaults”, the default
						# charset for text files is…
						return 'iso-8859-1';
					} else {
						# Not a supported content type.
						break;
					}
				}
				# Fall through.
			case 'text/xml':
			case 'application/xml':
				# The XML opening tag can have an “encoding=” attribute.
				# TODO: this regexp needs improvement: check greediness, allow single-quoted attributes.
				if (preg_match(
					'/^<\?xml\s+(?:[^>]+?)?\s+encoding="(?P<charset>[^"]*)"/A', $sEntity, $arrMatch
				)) {
					return strtolower($arrMatch['charset']);
				} else {
					# This XML file does not specify an encoding; skip all advanced auto-detection
					# patterns suggested in XML 1.0 and just assume the last-resort default of…
					return 'utf-8';
					# TODO: implement scanning for BOMs and the UTF-32 and UTF-16 encodings of “< ?”, as
					# suggested in XML 1.0 Appendix F “Autodetection of Character Encodings”.
				}
		}
	}
	# TODO: check for BOMs or other cues.
	return null;
}


## Send an HTTP request for the specified URL.
#
# string $sUrl
#    URL to request.
# [int $fiOptions]
#    Determines the behavior of the function; it can be 0 or a combination of QL_HG_* constants.
# [array<string => mixed> $arrHeaderFields]
#    Array of request headers; array field values are joined as strings using “; ” as separator as
#    required by e.g. cookies.
# [string $sPostData]
#    If provided, this string will be used as the payload of a POST request (which replaces the
#    default GET request).
# mixed return
#    false if any error occurs; otherwise if $fiOptions includes QL_HG_RETURNBODY, the return value
#    will be a string containing the body of the server’s response; else the return value will be a
#    map with these keys:
#    “newline” => string
#       New-line sequence used in the response.
#    “protocol” => string
#       Protocol/version (e.g. HTTP/1.0).
#    “code” => int
#       HTTP response code (HTTP_STATUS_* or newer codes).
#    “codedesc” => string
#       Description provided by the server for “code”.
#    “requrl” => string
#       URL that was originally requested.
#    “url” => string
#       URL that was eventually obtained, after redirects (if any) were followed.
#    “redirects” => int
#       Number of redirects that were followed before a response was returned.
#    “headers” => array<string => mixed>
#       Map of header fields => values.
#    “body” => string
#       Body of the response, as a single string.
#
function & ql_http_get(
	$sUrl, $fiOptions = QL_HG_RETURNBODY, array $arrHeaderFields = array(), $sPostData = null
) {
	global $ql_debug_http_fread;
	$arrUrl = @parse_url($sUrl);
	if ($arrUrl === false || !isset($arrUrl['host'])) {
		$arrResponse = false;
		return $arrResponse;
	}
	$sOrgUrl = $sUrl;
	# Provide default values for the most essential fields.
	$arrHeaderFields += array(
		'Accept'          => '*/*',
		'Accept-Charset'  => 'utf-8;q=1,utf-16le;q=0.7,utf-16be;q=0.7,iso-8859-1;q=0.5',
		'Accept-Encoding' => 'gzip,x-gzip,deflate,identity',
		'Cache-Control'   => 'no-cache',
		'Connection'      => 'keep-alive',
		'Pragma'          => 'no-cache',
		# Spoof the client user agent.
		'User-Agent'      => $_SERVER['HTTP_USER_AGENT'],
	);
	$cRedirects = 0;
	# $arrSetCookies holds all the cookies the caller provided; $arrCookies will hold these and any
	# additional cookies set by the server.
	if (isset($arrHeaderFields['Cookie'])) {
		# Cookies are handled separately, so remove them from the request headers.
		$arrSetCookies =& $arrHeaderFields['Cookie'];
		unset($arrHeaderFields['Cookie']);
	} else {
		$arrSetCookies = array();
	}
	$arrCookies = $arrSetCookies;

	$iStatus = QL__HG_CONNECT;
	do {
		switch ($iStatus) {
			case QL__HG_CONNECT:
				# Ensure that the URL includes scheme and port.
				$arrUrl += array(
					'scheme' => 'http',
					'port'   => 80,
				);
				$socket = @fsockopen($arrUrl['host'], $arrUrl['port'], $iSocketErr, $sSocketErr, 10);
				if (is_resource($socket)) {
					$iStatus = QL__HG_SEND;
				} else {
					$arrResponse = false;
					$iStatus = QL__HG_END;
				}
				break;

			case QL__HG_SEND:
				# Compose the URL into a string.
				$sUrl = $arrUrl['scheme'] . '://';
				if (isset($arrUrl['user'])) {
					$sUrl .= $arrUrl['user'];
					if (isset($arrUrl['pass'])) {
						$sUrl .= ':' . $arrUrl['pass'];
					}
					$sUrl .= '@';
				}
				$sUrl .= $arrUrl['host'];
				if ($arrUrl['port'] != 80) {
					$sUrl .= ':' . $arrUrl['port'];
				}
				$sUrl .= (isset($arrUrl['path']) ? $arrUrl['path'] : '/');
				if (isset($arrUrl['query'])) {
					$sUrl .= '?' . $arrUrl['query'];
				}

				# Assemble the request header.
				$sRequest = ($sPostData !== null ? 'POST ' : 'GET ') . $sUrl . " HTTP/1.1\r\n" .
								'Host: ' . $arrUrl['host'] . ':' . $arrUrl['port'] . "\r\n";
				foreach ($arrHeaderFields as $sName => $mValue) {
					$sRequest .= $sName . ': ' . $mValue . "\r\n";
				}
				# Add the cookies, if any.
				if ($arrCookies) {
					$sCookies = '';
					foreach ($arrCookies as $sName => $arrCookie) {
						$sCookies .= '; ' . $sName . '=' . $arrCookie['value'];
					}
					$sRequest .= 'Cookie: ' . substr($sCookies, 2) . "\r\n";
				}
				# Add the POST request payload, if any.
				if ($sPostData !== null) {
					$sRequest .= 'Content-Length: ' . strlen($sPostData) . "\r\n" .
									 "\r\n" .
									 $sPostData;
				}
				$sRequest .= "\r\n";

				# Submit the request.
				fwrite($socket, $sRequest);
				$iStatus = QL__HG_READ;
				break;

			case QL__HG_READ:
				# In most cases, this is the last stage; the behavior will only be different in case of
				# redirections or HTTP_STATUS_CONTINUE return status.
				$iStatus = QL__HG_SHUTDOWN;

				# Read the response header up to (and including some of) the beginning of the body.
				$s = '';
				do {
					$s .= fread($socket, 4096);
					$arrResponse = ql_http_parse_rfc2616_response($s);
					# A false return value means that the headers were not fully read, so continue on
					# reading more.
				} while (!$arrResponse && !feof($socket));
				if ($ql_debug_http_fread) {
					ql_log(
						'DEBUG',
						'ql_http_get() - initial read',
						'<pre>' . ql_lenc($s) . '</pre>'
					);
				}
				if (!$arrResponse) {
					break;
				}

				# If the response should have a message body, go ahead and read it.
				if ($arrResponse['code'] >= HTTP_STATUS_OK &&
					$arrResponse['code'] != HTTP_STATUS_NO_CONTENT &&
					$arrResponse['code'] != HTTP_STATUS_NOT_MODIFIED
				) {
					$s =& $arrResponse['body'];

					# The way we’ll read the rest of the response depends on how the server is sending
					# the response.
					if (
						isset($arrResponse['headers']['Transfer-Encoding']) &&
						strtolower($arrResponse['headers']['Transfer-Encoding']) != 'identity'
					) {
						if ($ql_debug_http_fread) {
							ql_log('DEBUG', 'ql_http_get() - transfer: chunked');
						}
						$cbNL = strlen($arrResponse['newline']);
						# The first read could have read more than one chunk, so we have to parse them to
						# find out the total number of bytes we’re supposed to read.
						$ibSizeEnd = strpos($s, ';');
						$ibNL      = strpos($s, $arrResponse['newline']);
						if ($ibSizeEnd === false || $ibSizeEnd > $ibNL) {
							$ibSizeEnd = $ibNL;
						}
						$cbChunks = $cbChunk = hexdec(substr($s, 0, $ibSizeEnd));
						$s = substr($s, $ibNL + $cbNL);
						$cbRead = strlen($s);
						for (;;) {
							# Collect all chunks in the data obtained while reading the current chunk.
							while ($cbRead > $cbChunks) {
								$ibNextChunk = $cbChunks + $cbNL;
								$ibSizeEnd = strpos($s, ';',                     $ibNextChunk);
								$ibNL      = strpos($s, $arrResponse['newline'], $ibNextChunk);
								if ($ibNL === false) {
									# Couldn’t read a single chunk, need more data.
									break;
								}
								if ($ibSizeEnd === false || $ibSizeEnd > $ibNL) {
									$ibSizeEnd = $ibNL;
								}
								$cbChunk = hexdec(substr($s, $ibNextChunk, $ibSizeEnd - $ibNextChunk));
								if (!$cbChunk) {
									if ($ql_debug_http_fread) {
										ql_log(
											'DEBUG',
											'ql_http_get() - end; ' .
												$cbRead . ' read, ' . $cbChunks . 'total'
										);
									}
									# 0 bytes mean END, even if there’s something else beyond the zero.
									$s = substr($s, 0, $cbChunks);
									$cbRead = $cbChunks;
									break(2);
								}
								# Discard the start of the chunk we just parsed.
								$s = substr($s, 0, $ibNextChunk - $cbNL) . substr($s, $ibNL + $cbNL);
								$cbChunks += $cbChunk;
								$cbRead = strlen($s);
							}
							if ($ql_debug_http_fread) {
								ql_log(
									'DEBUG',
									'ql_http_get() - before reading; ' .
										$cbRead . ' read, ' . $cbChunks . ' total'
								);
							}
							# Need at least one digit for the size of the next chunk, which is typically
							# found after an empty line.
							$cbToRead = $cbChunks + $cbNL + $cbNL + 1;
							while ($cbToRead > $cbRead && !feof($socket)) {
								# If we didn’t have at least a digit of the size of the next chunk, read
								# more than that, expecting more digits.
								$s .= fread($socket, $cbChunks - $cbRead + 64);
								$cbRead = strlen($s);
							}
							if ($cbToRead > $cbRead && feof($socket)) {
								$arrResponse = false;
								# The loop ended due to EOF, so end the loop and jump to the end of the case
								# statement.
								break(2);
							}
							if ($ql_debug_http_fread) {
								ql_log(
									'DEBUG',
									'ql_http_get() - after reading; ' .
										$cbRead . 'read, ' .
										$cbChunks . ' total, ' .
										rtrim(substr($s, $cbChunks + $cbNL, 5)) . ' following'
								);
							}
						}
					} else if (isset($arrResponse['headers']['Content-Length'])) {
						if ($ql_debug_http_fread) {
							ql_log('DEBUG', 'ql_http_get() - transfer: Content-Length');
						}
						$cbBody = $arrResponse['headers']['Content-Length'];
						$cbRead = strlen($s);
						if ($ql_debug_http_fread) {
							ql_log(
								'DEBUG',
								'ql_http_get() - before reading; ' .
									$cbRead . ' read, ' . $cbBody . ' total'
							);
						}
						while ($cbBody > $cbRead && !feof($socket)) {
							$s .= fread($socket, $cbBody - $cbRead);
							$cbRead = strlen($s);
						}
						if ($ql_debug_http_fread) {
							ql_log(
								'DEBUG',
								'ql_http_get() - after reading; ' .
									$cbRead . ' read, ' . $cbBody . 'total'
							);
						}
					} else {
						if ($ql_debug_http_fread) {
							ql_log('DEBUG', 'ql_http_get() - transfer: until EOF');
							ql_log('DEBUG', 'ql_http_get() - before reading; ' . strlen($s) . 'read');
						}
						while (!feof($socket)) {
							$s .= fread($socket, 4096);
						}
						if ($ql_debug_http_fread) {
							ql_log('DEBUG', 'ql_http_get() - after reading; ' . strlen($s) . 'read');
						}
					}
				}

				# Collect the cookies in a separate array.
				if (isset($arrResponse['headers']['Set-Cookie'])) {
					$arrCookies = $arrResponse['headers']['Set-Cookie'] + $arrCookies;
					unset($arrResponse['headers']['Set-Cookie']);
				}

				# HTTP_STATUS_CONTINUE must not specify a redirect using Location.
				if ($arrResponse['code'] == HTTP_STATUS_CONTINUE) {
					$iStatus = QL__HG_READ;
				} else if (
					isset($arrResponse['headers']['Location']) &&
					($arrRedirectUrl = @parse_url($arrResponse['headers']['Location'])) !== false
				) {
					if (!($fiOptions & QL_HG_NOREDIRECT)) {
						# Follow the redirection. If the new location is on a different server, don’t try
						# to use the same login/password.
						if (isset($arrRedirectUrl['host'])) {
							unset($arrUrl['user'], $arrUrl['pass']);
						}
						$arrUrl = $arrRedirectUrl + $arrUrl;
						if ($ql_debug_http_fread) {
							ql_log(
								'DEBUG', 'ql_http_get() - redirect',
								'<tt>' . ql_lenc($arrResponse['headers']['Location']) . '</tt>' . NL .
									ql_logdumpvars(array(
										'$arrRedirectUrl' => &$arrRedirectUrl,
										'$arrUrl' => &$arrUrl
									))
							);
						}
						++$cRedirects;

						if ($arrResponse['code'] == HTTP_STATUS_SEE_OTHER) {
							# Redirecting from a POST becomes a GET.
							if ($sPostData !== null) {
								$sPostData = null;
								unset($arrHeaderFields['Content-Type']);
							}
						}

						if (
							isset($arrResponse['headers']['Connection']) &&
							strtolower($arrResponse['headers']['Connection']) == 'keep-alive'
						) {
							$iStatus = QL__HG_SEND;
						} else {
							$iStatus = QL__HG_CONNECT;
						}
					}
				} else {
					# All good, decode the response.
					if (isset($arrResponse['headers']['Content-Encoding'])) {
						switch (strtolower($arrResponse['headers']['Content-Encoding'])) {
							case 'gzip':
							case 'x-gzip':
							case 'deflate':
								$s = gzdecode($s);
								break;
						}
					}

					# Perform any necessary encoding conversions.
					$sCharset = ql_http_detect_charset($arrResponse, $s);
					if ($sCharset !== null) {
						# Now that we know what charset the response uses, convert it into UTF-8 for
						# further processing.
						$sUtf8 = ql_unicode_conv($s, $sCharset);
						if ($sUtf8 !== false) {
							$s = $sUtf8;
						}
					}
				}
				break;

			case QL__HG_SHUTDOWN:
				fclose($socket);
				$iStatus = QL__HG_END;
				break;
		}
	} while ($iStatus != QL__HG_END);
	if ($arrResponse) {
		# Provide some more information about the response.
		$arrResponse['requrl'   ] = $sOrgUrl;
		$arrResponse['url'      ] = $sUrl;
		$arrResponse['redirects'] = $cRedirects;
#		$arrResponse['reqheaders'] =& $arrHeaderFields;

		# Only return cookies the server did not revoke.
		foreach ($arrCookies as $sName => $arrCookie) {
			if ($arrCookie['value'] != '') {
				$arrSetCookies[$sName] = $arrCookie;
			} else if (isset($arrSetCookies[$sName])) {
				unset($arrSetCookies[$sName]);
			}
		}
		if ($arrSetCookies) {
			$arrResponse['headers']['Set-Cookie'] =& $arrSetCookies;
		}
	}
	if (($fiOptions & QL_HG_RETURNBODY) && is_array($arrResponse)) {
		# If the caller only wants the response body and we did not encounter errors, return what the
		# caller asked for.
		return $arrResponse['body'];
	} else {
		# Else return everything, which is either the array or false.
		return $arrResponse;
	}
}


## Executes multiple GET HTTP requests, passing the responses of each to the specified callback.
# Always follows redirects.
#
# TODO: written years ago and not used in a long time, probably bitrotten: revive or remove.
#
# array<string+> $arrUrls
#    Array of URLs to request.
# callback $fnCallback
#    Function to be called upon completion of each request.
#
function ql_http_get_multi(array $arrUrls, $fnCallback) {
	$arrRemaining = array();
	foreach ($arrUrls as $sUrl) {
		$arrUrl = @parse_url($sUrl);
		if ($arrUrl !== false && isset($arrUrl['host']) && isset($arrUrl['path'])) {
			$arrRemaining[] = array(
				'requrl' => $sUrl,
				'scheme' => isset($arrUrl['scheme']) ? $arrUrl['scheme'] : 'http',
				'host'   => $arrUrl['host'],
				'port'   => isset($arrUrl['port']) ? (int)$arrUrl['port'] : 80,
				'path'   => $arrUrl['path'] . (isset($arrUrl['query']) ? '?' . $arrUrl['query'] : ''),
				'buffer' => ''
			);
		}
	}
	unset($arrUrls);

	while ($arrRemaining) {
		# Arbitrarily limit to 5 simultaneous requests.
		$arrTargets = array_slice($arrRemaining, 0, 5);
		$arrRemaining = array_slice($arrRemaining, 5);

		$arrSockets = array();
		for ($i = 0; $i < count($arrTargets); ++$i) {
			$arrTarget =& $arrTargets[$i];
			$socket = @fsockopen($arrTarget['host'], $arrTarget['port'], $iSocketErr, $sSocketErr, 10);
			if (is_resource($socket)) {
				stream_set_blocking($socket, false);
				$arrSockets[$i] = $arrTarget['socket'] = $socket;
			} else {
				$arrTarget['socket'] = null;
				call_user_func($fnCallback, $arrTarget['requrl'], array(
					'protocol' => null,
					'code'     => 0,
					'codedesc' => $iSocketErr . ': ' . $sSocketErr,
					'headers'  => array(),
					'body'     => null
				));
			}
		}

		$arrRRemaining = array();
		$arrWRemaining = $arrSockets;
		$arrX = null;
		while (count($arrWRemaining) + count($arrRRemaining)) {
			$arrR = $arrRRemaining;
			$arrW = $arrWRemaining;
			stream_select($arrR, $arrW, $arrX, null);
			foreach ($arrW as $socket) {
				$i = array_search($socket, $arrWRemaining);
				$arrTarget =& $arrTargets[$i];
				fwrite($socket,
					'GET ' . $arrTarget['scheme'] . '://' .
								$arrTarget['host'] . ':' . $arrTarget['port'] . $arrTarget['path'] .
								" HTTP/1.1\r\n" .
					'Host: ' . $arrTarget['host'] . ':' . $arrTarget['port'] . "\r\n" .
					'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'] . "\r\n" .
					"Accept: */*\r\n" .
					"Accept-Charset: utf-8;q=1,utf-16le;q=0.7,utf-16be;q=0.7,iso-8859-1;q=0.5\r\n" .
					"Pragma: no-cache\r\n" .
					"Cache-Control: no-cache\r\n" .
					"Connection: keep-alive\r\n" .
					"\r\n"
				);
				# Move this handle from the write array to the read array.
				$arrRRemaining[$i] =& $arrWRemaining[$i];
				unset($arrWRemaining[$i]);
			}
			foreach ($arrR as $socket) {
				$i = array_search($socket, $arrRRemaining);
				$arrTarget =& $arrTargets[$i];
				$arrTarget['buffer'] .= fread($socket, 16384);
				if (feof($socket)) {
					# Read is over.
					$arrResponse = ql_http_parse_rfc2616_response($arrTarget['buffer']);
					switch ($arrResponse['code']) {
						case HTTP_STATUS_CONTINUE:
							$iStatus = QL__HG_READ;
							break;

						case HTTP_STATUS_OK:
						case HTTP_STATUS_CREATED:
						case HTTP_STATUS_ACCEPTED:
						case HTTP_STATUS_NO_CONTENT:

							call_user_func($fnCallback, $arrTarget['requrl'], $arrResponse);
							$iStatus = QL__HG_SHUTDOWN;
							break;

						case HTTP_STATUS_MOVED_PERMANENTLY:
						case HTTP_STATUS_FOUND:
						case HTTP_STATUS_SEE_OTHER:
						case HTTP_STATUS_NOT_MODIFIED:
						case HTTP_STATUS_TEMPORARY_REDIRECT:
							if (
								!empty($arrResponse['headers']['Location']) &&
								($arrRedirectUrl = @parse_url(
									$arrResponse['headers']['Location']
								)) !== false
							) {
								if (isset($arrRedirectUrl['scheme'])) {
									$arrTarget['scheme'] = $arrRedirectUrl['scheme'];
								}
								if (isset($arrRedirectUrl['host'])) {
									$arrTarget['host'] = $arrRedirectUrl['host'];
								}
								if (isset($arrRedirectUrl['port'])) {
									$arrTarget['port'] = (int)$arrRedirectUrl['port'];
								}
								if (isset($arrRedirectUrl['path'])) {
									$arrTarget['path'] = $arrRedirectUrl['path'];
								}
								if (isset($arrRedirectUrl['query'])) {
									$arrTarget['path'] .= '?' . $arrRedirectUrl['query'];
								}

								if ($arrResponse['headers']['Connection'] == 'keep-alive') {
									$iStatus = QL__HG_SEND;
								} else {
									$iStatus = QL__HG_CONNECT;
								}
							} else {
								$iStatus = QL__HG_SHUTDOWN;
							}
							break;

						default:
							$iStatus = QL__HG_SHUTDOWN;
							break;
					}
					$arrTarget['buffer'] = '';
					switch ($iStatus) {
						case QL__HG_CONNECT:
							# Re-queue for reading.
							$arrRemaining[] =& $arrTarget;
							unset($arrRRemaining[$i]);
							fclose($socket);
							break;

						case QL__HG_SEND:
							# Move this handle from the write array to the read array.
							$arrWRemaining[$i] =& $arrRRemaining[$i];
							unset($arrRRemaining[$i]);
							break;

						case QL__HG_READ:
							break;

						case QL__HG_SHUTDOWN:
							# Terminate the connection.
							unset($arrRRemaining[$i]);
							fclose($socket);
							break;
					}
				}
			}
		}
	}
}


## Breaks down an RFC 2616 (“HTTP/1.1”) header returning the contained fields, converted into the
# appropriate data type.
#
# string $s
#    Header string.
# [string $sNL]
#    New-line sequence used in $s. If omitted, automatic detection will be attempted.
# array<string => mixed> return
#    Array of fields (each of which can also be an array, in case of multiple fields), or false in
#    case of any errors.
#
function & ql_http_parse_rfc2616_header($s, $sNL = null) {
	# Most of the parsing is the same as for RCF 822.
	$arrFields =& ql_parse_rfc822_header($s, $sNL);
	if ($arrFields === false) {
		# Something went wrong.
		return $arrFields;
	}
	# Convert the type of every known non-string field.
	foreach ($arrFields as $sName => &$mValue) {
		switch ($sName) {
			default:
				if (strncmp($sName, 'Accept', 6) == 0) {
					$mValue =& ql_parse_rfc2616_accept_field($mValue);
				}
				break;

			# Integer fields.
			case 'Content-Length':
				settype($mValue, 'int');
				break;

			# RFC 822-style date/time.
			case 'Expires':
			case 'If-Modified-Since':
			case 'If-Unmodified-Since':
			case 'Last-Modified':
			case 'Retry-After':
				$mValue = strtotime($mValue);
				break;

			case 'Set-Cookie':
				# ql_parse_rfc822_header() doesn’t unnecessarily make the field an array if it’s not
				# repeated, so do it now.
				if (!is_array($mValue)) {
					$mValue = array($mValue);
				}
				$arrCookies = array();
				foreach ($mValue as $sCookie) {
					$arrParts = explode(';', $sCookie);
					if (strpos($arrParts[0], '=') !== false) {
						list($sName, $sValue) = explode('=', trim(array_shift($arrParts)), 2);
						if ($sName == '') {
							# Skip invalid attribute names.
							continue;
						}
						# Build up the cookie as a map.
						$arrCookie = array(
							'value' => urldecode(trim($sValue)),
						);
						foreach ($arrParts as $sPart) {
							$sPart = trim($sPart);
							if (strtolower($sPart) == 'secure') {
								$arrCookie['secure'] = true;
							} else {
								$arrPart = explode('=', $sPart, 2);
								if (count($arrPart) == 2) {
									$arrPart[0] = strtolower($arrPart[0]);
									switch ($arrPart[0]) {
										case 'expires':
											$arrPart[1] = strtotime($arrPart[1]);
										case 'path':
										case 'domain':
											$arrCookie[$arrPart[0]] = $arrPart[1];
											break;
									}
								}
							}
						}
						$arrCookies[$sName] =& $arrCookie;
						unset($arrCookie);
					}
				}
				$mValue = $arrCookies;
				break;
		}
	}
	return $arrFields;
}


## Parses and breaks down an RFC 2616 (“HTTP/1.1”) response string. If the headers are not complete,
# it returns false to indicate that it should be called again once more data has been received from
# the HTTP server.
#
# string $s
#    HTTP response string.
# [string $sNL]
#    New-line sequence used in $s. If omitted, automatic detection will be attempted.
# array<string => mixed> return
#    false if the headers were incomplete; otherwise map containing these keys:
#    “newline” => string
#       New-line sequence used in the response.
#    “protocol” => string
#       Protocol/version (e.g. HTTP/1.0).
#    “code” => int
#       HTTP response code (HTTP_STATUS_* or newer codes).
#    “codedesc” => string
#       Description provided by the server for “code”.
#    “headers” => array<string => mixed>
#       Map of header fields => values.
#    “body” => string
#       Body of the response, as a single string. Not necessarily the entire response body, but the
#       caller can add to this any remaining bytes read from the remote server.
#
function & ql_http_parse_rfc2616_response($s, $sNL = null) {
	# Attempt to detect the new-line style if not provided.
	if (
		(empty($sNL) && ($sNL = ql_str_detectnl($s)) === false) ||
		($ichHeadersEnd = strpos($s, $sNL . $sNL)) === false
	) {
		# The header is presumably incomplete, we need more data.
		$arrResponse = false;
		return $arrResponse;
	}
	$arrResponse = array(
		'newline' => $sNL,
	);

	# Parse the first line, ideally “HTTP/x.y nnn …”.
	$ich = strpos($s, $sNL);
	$arrParts = explode(' ', substr($s, 0, $ich), 3);
	$ich += strlen($sNL);
	if (count($arrParts) > 1 && strncmp($arrParts[0], 'HTTP/', 5) == 0) {
		$arrResponse['protocol'] = $arrParts[0];
		$arrResponse['code'    ] = (int)$arrParts[1];
		$arrResponse['codedesc'] = trim(@$arrParts[2]);
	} else {
		$arrResponse['protocol'] = 'HTTP/0.9';
		$arrResponse['code'    ] = (int)$arrParts[0];
		$arrResponse['codedesc'] = trim(@$arrParts[1] . ' ' . @$arrParts[2]);
	}

	# Parse the response header and separate it from the message body.
	if ($ichHeadersEnd > $ich) {
		$arrResponse['headers'] =& http_parse_rfc2616_header(
			substr($s, $ich, $ichHeadersEnd - $ich), $sNL
		);
	} else {
		$arrResponse['headers'] = array();
	}
	# This is probably incomplete, but the caller can continue reading data from the server and
	# adding to this string.
	$arrResponse['body'] = substr($s, $ichHeadersEnd + (strlen($sNL) << 1));

	return $arrResponse;
}

?>
