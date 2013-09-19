<?php /* -*- coding: utf-8; mode: php; tab-width: 3 -*-

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

// Markup generators.


define('QUEARL_CORE_MAIN_RESPONSE_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Constants


# HTTP response statuses.

define('HTTP_STATUS_CONTINUE',                        100);
define('HTTP_STATUS_SWITCHING_PROTOCOLS',             101);
define('HTTP_STATUS_OK',                              200);
define('HTTP_STATUS_CREATED',                         201);
define('HTTP_STATUS_ACCEPTED',                        202);
define('HTTP_STATUS_NON_AUTHORITATIVE_INFORMATION',   203);
define('HTTP_STATUS_NO_CONTENT',                      204);
define('HTTP_STATUS_RESET_CONTENT',                   205);
define('HTTP_STATUS_PARTIAL_CONTENT',                 206);
define('HTTP_STATUS_MULTIPLE_CHOICES',                300);
define('HTTP_STATUS_MOVED_PERMANENTLY',               301);
define('HTTP_STATUS_FOUND',                           302);
define('HTTP_STATUS_SEE_OTHER',                       303);
define('HTTP_STATUS_NOT_MODIFIED',                    304);
define('HTTP_STATUS_USE_PROXY',                       305);
define('HTTP_STATUS_TEMPORARY_REDIRECT',              307);
define('HTTP_STATUS_BAD_REQUEST',                     400);
define('HTTP_STATUS_UNAUTHORIZED',                    401);
define('HTTP_STATUS_PAYMENT_REQUIRED',                402);
define('HTTP_STATUS_FORBIDDEN',                       403);
define('HTTP_STATUS_NOT_FOUND',                       404);
define('HTTP_STATUS_METHOD_NOT_ALLOWED',              405);
define('HTTP_STATUS_NOT_ACCEPTABLE',                  406);
define('HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED',   407);
define('HTTP_STATUS_REQUEST_TIMEOUT',                 408);
define('HTTP_STATUS_CONFLICT',                        409);
define('HTTP_STATUS_GONE',                            410);
define('HTTP_STATUS_LENGTH_REQUIRED',                 411);
define('HTTP_STATUS_PRECONDITION_FAILED',             412);
define('HTTP_STATUS_REQUEST_ENTITY_TOO_LARGE',        413);
define('HTTP_STATUS_REQUEST_URI_TOO_LONG',            414);
define('HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE',          415);
define('HTTP_STATUS_REQUESTED_RANGE_NOT_SATISFIABLE', 416);
define('HTTP_STATUS_EXPECTATION_FAILED',              417);
define('HTTP_STATUS_IM_A_TEAPOT',                     418); # RFC 2324 (April’s fool).
define('HTTP_STATUS_AUTHENTICATION_TIMEOUT',          419); # Not part of RFC 2616.
define('HTTP_STATUS_UPGRADE_REQUIRED',                426); # RFC 2817.
define('HTTP_STATUS_PRECONDITION_REQUIRED',           428); # RFC 6585.
define('HTTP_STATUS_TOO_MANY_REQUESTS',               429); # RFC 6585.
define('HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE', 431); # RFC 6585.
define('HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS',   451); # Draft.
define('HTTP_STATUS_INTERNAL_SERVER_ERROR',           500);
define('HTTP_STATUS_NOT_IMPLEMENTED',                 501);
define('HTTP_STATUS_BAD_GATEWAY',                     502);
define('HTTP_STATUS_SERVICE_UNAVAILABLE',             503);
define('HTTP_STATUS_GATEWAY_TIMEOUT',                 504);
define('HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED',      505);
define('HTTP_STATUS_VARIANT_ALSO_NEGOTIATES',         506); # RFC 2295.
define('HTTP_STATUS_NOT_EXTENDED',                    510); # RFC 2774.
define('HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED', 511); # RFC 6585.



####################################################################################################
# Classes


## Generates a valid HTTP response header and entity.
#
# TODO: support sending “Cache-Control: public” to allow for shared proxy caching.
#
class QlResponse {

	## HTTP response code (HTTP_STATUS_*).
	private /*int*/ $m_iCode;
	## Description for m_iCode.
	private /*string*/ $m_sCodeDescription;
	## Map of header field names => values.
	private /*array<string => mixed>*/ $m_arrHeaderFields;
	## true if the header has been sent.
	private /*bool*/ $m_bHeaderSent;


	## Constructor.
	#
	public function __construct() {
		$this->set_http_status(HTTP_STATUS_OK);
		$this->m_arrHeaderFields = array();
		$this->m_bHeaderSent = false;

		/*
		foreach ($_SERVER['HTTP_ACCEPT_ENCODING'] as $sEncoding) {
			switch ($sEncoding) {
				case 'x-gzip':
				case 'gzip':
					gzencode(…, 6);
					break;
				case 'deflate':
					gzdeflate(…, 6);
					break;
				default:
					# Unknown encoding type, skip it.
					continue(2);
			}
			$this->m_response->set_header_field('Content-Encoding', $sEncoding);
			$this->m_response->set_header_field('Vary', 'Accept-Encoding');
			break;
		}
		*/
	}


	## Returns true if the HTTP response header has already been sent to the remote client.
	#
	# bool return
	#    true if the HTTP header has been sent, or false otherwise.
	#
	public function header_sent() {
		return $this->m_bHeaderSent;
	}


	## Initiates an HTTP redirection by adding a Location header field pointing to the specified URI,
	# and returns a null response entity.
	#
	# string $sUri
	#    URI to redirect the remote client to.
	# [int $iHttpStatusCode]
	#    HTTP status code; defaults to HTTP_STATUS_SEE_OTHER.
	# [string $sHttpStatusCodeDescription]
	#    Description for the status code; defaults to a standard description of $iCode.
	# QlNullResponseEntity return
	#    Null response entity.
	#
	public function redirect(
		$sUri, $iHttpStatusCode = HTTP_STATUS_SEE_OTHER, $sHttpStatusCodeDescription = null
	) {
		if (strncmp($sUri, 'http://', 7) != 0 && strncmp($sUri, 'https://', 8) != 0) {
			# If the URI does not specify an HTTP schema, assume it doesn’t specify a host either.
			$sUri = $_SERVER['HTTP_PROTOCOL'] . $_SERVER['HTTP_HOST'] . $sUri;
			# If we have a session ID, add it, since we’re redirecting within this host.
			if (defined('SID') && SID != '') {
				$sUri = ql_url_addqs($sUri, SID);
			}
		}
		# Set the necessary header fields.
		$this->set_http_status($iHttpStatusCode, $sHttpStatusCodeDescription);
		$this->set_header_field('Location', $sUri);
		# Return a null response.
		return new QlNullResponseEntity($this);
	}


	## Sends a chunk of data to the remote client, also sending the header first if it hasn’t
	# already been sent.
	#
	# string $s
	#    Data to be sent.
	#
	public function send_data($s) {
		# Make sure we sent the header.
		if (!$this->m_bHeaderSent) {
			$this->send_header();
		}
		echo $s;
		# Remember that Quearl always runs with one buffering level to intercept errors, so flush the
		# output buffer now.
		ob_flush();
	}


	## Sends the contents of a file to the remote client, also sending the header first if it hasn’t
	# already been sent.
	#
	# string $sFileName
	#    File to be sent.
	#
	public function send_file($sFileName) {
		# Make sure we sent the header.
		if (!$this->m_bHeaderSent) {
			$this->send_header();
		}
		# Remember that Quearl always runs with one buffering level to intercept errors, so terminate
		# the output buffer now.
		$sBuf = ob_get_clean();
		if (strlen($sBuf) > 0) {
			# Some bytes were unexpectedly sent before this file, probably by PHP itself (everything
			# running on Quearl should use QlResponse::send_data()); log this extra content.
			# TODO: log $sBuf.
		}
		readfile($sFileName);
	}


	## Sends to the remote client any HTTP header fields accumulated to this point.
	#
	public function send_header() {
		if ($this->m_bHeaderSent) {
			trigger_error('HTTP response header has already been sent', E_USER_WARNING);
		} else {
			if (
				$this->m_iCode != HTTP_STATUS_NOT_MODIFIED &&
				!isset($this->m_arrHeaderFields['Last-Modified']) &&
				!isset($this->m_arrHeaderFields['ETag'])
			) {
				# No cache-enabling header fields are set, so assume that this response must not be
				# cached and add the appropriate HTTP/1.1 header fields accordingly.
				$this->set_header_field('Expires', '0');
				$this->set_header_field(
					'Cache-Control', 'private, no-cache, no-store, must-revalidate'
				);
			}

			# Start by sending the HTTP status.
			header(
				$_SERVER['SERVER_PROTOCOL'] . ' ' . $this->m_iCode . ' ' . $this->m_sCodeDescription
			);
			# Send any other set header fields.
			foreach ($this->m_arrHeaderFields as $sName => &$mValue) {
				if (is_string($mValue) || is_int($mValue) || is_float($mValue)) {
					header($sName . ': ' . $mValue);
				} else if (is_array($mValue)) {
					# TODO: convert the array into multiple (repeated) header fields.
					# header(…, false);
				} else {
					trigger_error(
						'Unexpected data type for header field “' .
							$sName . '”: “' . gettype($mValue) . '”',
						E_USER_WARNING
					);
				}
			}
			$this->m_bHeaderSent = true;
			# Free up some memory.
			$this->m_arrHeaderFields = null;
		}
	}


	## Sets a header field for the response.
	#
	# string $sName
	#    Header field name.
	# mixed $mValue
	#    Header field value. Providing an array here will result in multiple header fields with the
	#    same name being sent, one for each item in the array.
	#
	public function set_header_field($sName, $mValue) {
		$this->m_arrHeaderFields[$sName] = $mValue;
	}


	## Assigns the response an HTTP status code, along with a description.
	#
	# int $iCode
	#    HTTP status code.
	# [string $sCodeDescription]
	#    Description for the status code; defaults to a standard description of $iCode.
	#
	public function set_http_status($iCode, $sCodeDescription = null) {
		# If a description has not been provided, use the standard for the specified code.
		if ($sCodeDescription === null) {
			static $arrCodeDescriptions = array(
				# Sorted by associated status code, not alphabetically.

				# 1xx
				HTTP_STATUS_CONTINUE                        => 'Continue',
				HTTP_STATUS_SWITCHING_PROTOCOLS             => 'Switching Protocols',
				# 2xx
				HTTP_STATUS_OK                              => 'OK',
				HTTP_STATUS_CREATED                         => 'Created',
				HTTP_STATUS_ACCEPTED                        => 'Accepted',
				HTTP_STATUS_NON_AUTHORITATIVE_INFORMATION   => 'Non-Authoritative Information',
				HTTP_STATUS_NO_CONTENT                      => 'No Content',
				HTTP_STATUS_RESET_CONTENT                   => 'Reset Content',
				HTTP_STATUS_PARTIAL_CONTENT                 => 'Partial Content',
				# 3xx
				HTTP_STATUS_MULTIPLE_CHOICES                => 'Multiple Choices',
				HTTP_STATUS_MOVED_PERMANENTLY               => 'Moved Permanently',
				HTTP_STATUS_FOUND                           => 'Found',
				HTTP_STATUS_SEE_OTHER                       => 'See Other',
				HTTP_STATUS_NOT_MODIFIED                    => 'Not Modified',
				HTTP_STATUS_USE_PROXY                       => 'Use Proxy',
				HTTP_STATUS_TEMPORARY_REDIRECT              => 'Temporary Redirect',
				# 4xx
				HTTP_STATUS_BAD_REQUEST                     => 'Bad Request',
				HTTP_STATUS_UNAUTHORIZED                    => 'Unauthorized',
				HTTP_STATUS_PAYMENT_REQUIRED                => 'Payment Required',
				HTTP_STATUS_FORBIDDEN                       => 'Forbidden',
				HTTP_STATUS_NOT_FOUND                       => 'Not Found',
				HTTP_STATUS_METHOD_NOT_ALLOWED              => 'Method Not Allowed',
				HTTP_STATUS_NOT_ACCEPTABLE                  => 'Not Acceptable',
				HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED   => 'Proxy Authentication Required',
				HTTP_STATUS_REQUEST_TIMEOUT                 => 'Request Timeout',
				HTTP_STATUS_CONFLICT                        => 'Conflict',
				HTTP_STATUS_GONE                            => 'Gone',
				HTTP_STATUS_LENGTH_REQUIRED                 => 'Length Required',
				HTTP_STATUS_PRECONDITION_FAILED             => 'Precondition Failed',
				HTTP_STATUS_REQUEST_ENTITY_TOO_LARGE        => 'Request Entity Too Large',
				HTTP_STATUS_REQUEST_URI_TOO_LONG            => 'Request-URI Too Long',
				HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE          => 'Unsupported Media Type',
				HTTP_STATUS_REQUESTED_RANGE_NOT_SATISFIABLE => 'Requested Range Not Satisfiable',
				HTTP_STATUS_EXPECTATION_FAILED              => 'Expectation Failed',
				HTTP_STATUS_IM_A_TEAPOT                     => 'I\'m a teapot',
				HTTP_STATUS_AUTHENTICATION_TIMEOUT          => 'Authentication Timeout',
				HTTP_STATUS_UPGRADE_REQUIRED                => 'Upgrade Required',
				HTTP_STATUS_PRECONDITION_REQUIRED           => 'Precondition Required',
				HTTP_STATUS_TOO_MANY_REQUESTS               => 'Too Many Requests',
				HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE => 'Request Header Fields Too Large',
				HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS   => 'Unavailable For Legal Reasons',
				# 5xx
				HTTP_STATUS_INTERNAL_SERVER_ERROR           => 'Internal Server Error',
				HTTP_STATUS_NOT_IMPLEMENTED                 => 'Not Implemented',
				HTTP_STATUS_BAD_GATEWAY                     => 'Bad Gateway',
				HTTP_STATUS_SERVICE_UNAVAILABLE             => 'Service Unavailable',
				HTTP_STATUS_GATEWAY_TIMEOUT                 => 'Gateway Timeout',
				HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED      => 'HTTP Version Not Supported',
				HTTP_STATUS_VARIANT_ALSO_NEGOTIATES         => 'Variant Also Negotiates',
				HTTP_STATUS_NOT_EXTENDED                    => 'Not Extended',
				HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED => 'Network Authentication Required',
			);
			$sCodeDescription = $arrCodeDescriptions[$iCode];
		}
		$this->m_iCode = $iCode;
		$this->m_sCodeDescription = $sCodeDescription;
	}


	## Associates an entity tag (ETag) and/or a last-modified timestamp to the response, to be used
	# for caching control; see RFC 2616 § 14.19 “ETag” and § 14.29 “Last-Modified”. It also allows to
	# specify a time interval for which remote clients should consider their cache to be up-to-date
	# without even sending a conditional request to the server; see RFC 2616 § 14.21 “Expires”.
	#
	# If the remote client provided an “If-None-Match” request header that matches $sETag, or if it
	# provided a “If-Modified-Since” timestamp that’s not older than $mTS, this method will respond
	# the current request with HTTP status 304 (Not Modified) and halt execution; otherwise the
	# specified response metadata will be prepared to be sent to the remote client in the appropriate
	# header fiels, along with the rest of the response.
	#
	# Regardless of the return value, this method set a few header fields as mandated by RFC 2616 §
	# 10.3.5 “304 Not Modified”: “Date”, “ETag” (if $sETag is not null), “Expires” and
	# “Cache-Control”.
	#
	# [mixed $mTS]
	#    Date/time (timestamp) of the last modification to the entity. If omitted, the response will
	#    not provide a last modification time.
	# [string $sETag]
	#    Tag for the entity that this response would provide. If omitted, the response will not
	#    provide an ETag.
	# [int $iExpiresAfter]
	#    Time that the response will be valid for, in seconds. Before this interval has elapsed, no
	#    requests for the same resource will be made by the remote client. If omitted, the response
	#    will have no expiration date, and caching will be controlled only by the other arguments.
	# bool return
	#    true if the file has been setup for sending, or false if the remote client has a valid
	#    cached copy of the file.
	#
	public function use_cache($mTS = null, $sETag = null, $iExpiresAfter = null) {
		if ($sETag === null && $mTS === null) {
			trigger_error('The arguments $sETag and $mTS cannot both be null', E_USER_WARNING);
			# Go ahead anyway; we can still add the “Expired” and “Cache-Control” header fields.
		}
		if ($this->m_bHeaderSent) {
			trigger_error('HTTP response header has already been sent', E_USER_WARNING);
			return false;
		}
		$bClientCacheValid = false;
		if ($mTS !== null) {
			# Only check for an “If-Modified-Since” header field if the client did not also specify
			# “If-None-Match”, as mandated by RFC 2616 § 14.26 “If-None-Match”.
			if (
				!$bClientCacheValid &&
				!isset($_SERVER['HTTP_IF_NONE_MATCH']) && isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])
			) {
				$iCachedTS = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
				if ($iCachedTS !== false && $iCachedTS >= $mTS) {
					# The entity has not been modified since the remote client last cached it.
					$bClientCacheValid = true;
				}
			}
			# We’re still here, so the remote client has an outdated copy of this entity in its cache.
			# Send it the new last modification time to give it a chance to refresh its cache.
			$this->set_header_field('Last-Modified', ql_format_timestamp('%P', $mTS, 'UTC'));
		}
		if ($sETag !== null) {
			# Double-quote the ETag. Not sure if this is mandatory, since it’s not explicitly stated in
			# the production rule for the ETag header fiels (see RFC 2616 § 14.19 “ETag”), but we do it
			# anyway to avoid using the reserved prefix “W/” (indicating a weak ETag).
			$sETag = '"' . $sETag . '"';
			if (!$bClientCacheValid && isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
				# Convert the list of ETags cached by the remote client into an array.
				$arrCachedETags = preg_split(
					'/\s*,\s*/', $_SERVER['HTTP_IF_NONE_MATCH'], 0, PREG_SPLIT_NO_EMPTY
				);
				# Check if one of the cached ETags matches this entity’s tag or is the “match any”
				# special value (“*”).
				foreach ($arrCachedETags as $sCachedETag) {
					if ($sCachedETag == $sETag || $sCachedETag == '*') {
						# Match: the client cache is valid.
						$bClientCacheValid = true;
						break;
					}
				}
			}
			# We’re still here, so the remote client does not have a cached copy of this entity. Send
			# the ETag out to give it a chance to cache it this time.
			$this->set_header_field('ETag', $sETag);
		}
		if ($iExpiresAfter !== null) {
			# Mark this response as valid for the specified number of seconds, after which all caches
			# will have to re-validate it with a request that we may still respond with a 304 HTTP
			# status (which could set a new Expires value, delaying the next validation, and so on).
			global $ql_fScriptStart;
			$this->set_header_field(
				'Expires', ql_format_timestamp('%P', $ql_fScriptStart + $iExpiresAfter, 'UTC')
			);
			$this->set_header_field(
				'Cache-Control', 'private, maxage=' . $iExpiresAfter . ', must-revalidate'
			);
		} else {
			# Tell the remote client to always revalidate this response (see RFC 2616 § 14.9.4 “Cache
			# Revalidation and Reload Controls”). Note that this does not disallow caching.
			$this->set_header_field('Expires', '0');
			$this->set_header_field('Cache-Control', 'private, maxage=0, must-revalidate');
		}
		# If the client has a valid cached copy of this entity, respond with HTTP status 304.
		if ($bClientCacheValid) {
			$this->set_http_status(HTTP_STATUS_NOT_MODIFIED);
			$this->send_header();
		}
		return $bClientCacheValid;
	}
}


## Generates an error response for issues detected very early during the initialization of Quearl or
# one of its modules. The error page is a template, which will be sent as a response to the browser
# along with any optional HTTP headers.
#
# This may be thrown before $ql_session or $ql_db are available, and will work even in case $ql_app
# was defaulted.
#
class QlErrorResponse extends Exception {

	## HTTP status to report to the remote client.
	private /*int*/ $m_iHttpStatus;
	## Subtitle of the page; should be a brief description of the error.
	private /*string*/ $m_sSubtitle;
	## Name of the “page” template to be used.
	private /*string*/ $m_sTemplateName;
	## Array or array-of-arrays; either way, the leaf elements maps substitution variables with their
	# names. Localization constants can only be sourced from the core module.
	private /*array<mixed>*/ $m_arrVars;
	## HTTP header fields (name => value) to be sent as part of the response.
	private /*array<string => mixed>*/ $m_arrHeaderFields;


	## Constructor.
	#
	# int $iHttpStatus
	#    HTTP status to report to the remote client.
	# string $sSubtitle
	#    Subtitle of the page; should be a brief description of the error.
	# string $sTemplateName
	#    Name of the “page” template to be used.
	# [array<mixed> $arrVars]
	#    Array or array-of-arrays; either way, the leaf elements maps substitution variables with
	#    their names. Localization constants can only be sourced from the core module.
	# [array<string => mixed> $arrHeaderFields]
	#    Map of HTTP header fields (name => value) to be sent as part of the response.
	#
	public function __construct(
		$iHttpStatus, $sSubtitle, $sTemplateName, array $arrVars = array(),
		array $arrHeaderFields = array()
	) {
		$this->m_iHttpStatus = $iHttpStatus;
		$this->m_sSubtitle = $sSubtitle;
		$this->m_sTemplateName = $sTemplateName;
		$this->m_arrVars =& $arrVars;
		$this->m_arrHeaderFields =& $arrHeaderFields;
	}


	## Generates a response entity to inform the user about the error.
	#
	# QlResponse $response
	#    Response the entity will be part of.
	#
	public function create_entity(QlResponse $response) {
		# Prepare the response.
		$response->set_http_status($this->m_iHttpStatus);
		foreach ($this->m_arrHeaderFields as $sName => &$mValue) {
			$response->set_header_field($sName, $mValue);
		}

		# Create and prepare the response entity.
		$ent = new QlXhtmlResponseEntity($response);
		$ent->set_subtitle(constant($this->m_sSubtitle));
		$ent->add_body(
			QlModule::get('core')->load_template('page', $this->m_sTemplateName, $this->m_arrVars)
		);

		return $ent;
	}
};


## Base class for a response entity.
#
abstract class QlResponseEntity {

	## Response this entity is part of.
	protected $m_response;


	## Constructor.
	#
	# QlResponse $response
	#    Response this entity is part of.
	#
	public function __construct(QlResponse $response) {
		$this->m_response = $response;
	}


	## Sends any unsent response data.
	#
	public abstract function send_close();
};


## Null (zero-length) response entity.
#
class QlNullResponseEntity extends QlResponseEntity {

	## Constructor. See QlResponseEntity::__construct().
	#
	public function __construct(QlResponse $response) {
		parent::__construct($response);
		$this->m_response->set_header_field('Content-Type',   'text/plain');
		$this->m_response->set_header_field('Content-Length', '0');
	}


	## See QlResponseEntity::send_close().
	#
	public function send_close() {
		$this->m_response->send_data('');
	}
};


## Regular file sent as a response entity. Supports sending pre-generated compressed versions of the
# file, if supported by the remote client.
#
class QlStaticResponseEntity extends QlResponseEntity {

	## Name of the physical file that will be provided as the response entity.
	protected $m_sFileName;


	## Assigns a physical file that will be provided as the response entity.
	#
	# string $sFileName
	#    Name of the file.
	# string $sContentType
	#    MIME content type of the file.
	# [bool $bHasCompressedVersion]
	#    If true, the remote client can will be served with a compressed version of the file,
	#    provided that the client accepts one of the supported compression encodings, and that such
	#    version of the file exists.
	#
	public function set_file($sFileName, $sContentType, $bHasCompressedVersion = false) {
		if (!is_file($sFileName) || !is_readable($sFileName)) {
			trigger_error('Invalid file name', E_USER_ERROR);
		}

		$this->m_sFileName = $sFileName;
		if ($bHasCompressedVersion) {
			# Check if we have a compressed version of this file matching the encodings accepted by the
			# remote client.
			# TODO: investigate these links:
			#    <http://support.microsoft.com/default.aspx?scid=kb;en-us;Q313712>
			#    <http://support.microsoft.com/default.aspx?scid=kb;en-us;Q312496>
			#    <http://www.vervestudios.co/projects/compression-tests/results>
			#
			foreach ($_SERVER['HTTP_ACCEPT_ENCODING'] as $sEncoding => $fQ) {
				switch ($sEncoding) {
					case 'gzip':
					case 'x-gzip':
						$sEncodedFileName = $sFileName . '.gz';
						break;
#					case 'deflate':
#						$sEncodedFileName = $sFileName . '.z';
#						break;
					default:
						# Unknown encoding type, skip it.
						continue(2);
				}
				if (is_file($sEncodedFileName) && is_readable($sEncodedFileName)) {
					# A copy of the file in this encoding exists, use it.
					$this->m_response->set_header_field('Content-Encoding', $sEncoding);
					$this->m_response->set_header_field('Vary', 'Accept-Encoding');
					$this->m_sFileName = $sEncodedFileName;
					break;
				}
			}
		}
		$this->m_response->set_header_field('Content-Type', $sContentType);
		$this->m_response->set_header_field('Content-Length', filesize($this->m_sFileName));
	}


	## See QlResponseEntity::send_close().
	#
	public function send_close() {
		$this->m_response->send_file($this->m_sFileName);
	}
};


## XHTML document response entity.
#
# TODO: change to a use a real XHTML DOM which can be manipulated server-side.
#
class QlXhtmlResponseEntity extends QlResponseEntity {

	## Content of the <body> section.
	protected /*string*/ $m_sBody;
	## Content of the <head> section.
	protected /*string*/ $m_sHead;
	## true if the <head> has been sent.
	private /*bool*/ $m_bHeadSent;
	## Document locale.
	protected /*string*/ $m_sLocale;
	## Document subtitle (XHTML).
	protected /*string*/ $m_sSubtitle;
	## Document title (XHTML).
	protected /*string*/ $m_sTitle;


	## Constructor.
	#
	# QlResponse $response
	#    Response this entity is part of.
	#
	public function __construct(QlResponse $response) {
		parent::__construct($response);

		# If this class is being instantiated, this request will get a visible page (as opposed to
		# this being e.g. an asynchrnous request), so keep track of it.
		$_SESSION['ql_lastpage'] = rawurldecode($_SERVER['RFULLPATH']);

		$this->m_sLocale = $_SESSION['ql_locale'];
		$this->m_bHeadSent = false;
		global $_APP;
		$this->m_sTitle = $_APP['core']['site_short_name'];
		$this->m_sSubtitle = null;

		# IE5.5 bug, IE6 bug, IE7 bug, IE8 bug: always want text/html, even for XHTML. Generalize this
		# to a check on the Accept field.
		$bAcceptXhtml = false;
		if (isset($_SERVER['HTTP_ACCEPT'])) {
			$arrAccept =& ql_parse_rfc2616_accept_field($_SERVER['HTTP_ACCEPT']);
			if (isset($arrAccept['application/xhtml+xml'])) {
				$bAcceptXhtml = true;
			}
		}

		# Prepare the response header fields.
		$this->m_response->set_header_field(
			'Content-Type', ($bAcceptXhtml ? 'application/xhtml+xml' : 'text/html') . '; charset=utf-8'
		);
		$this->m_response->set_header_field('Content-Language', $this->m_sLocale);

		# Initialize the <head> contents.
		$s  = '<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>' .
					NL .
				'<meta http-equiv="Content-Script-Type" content="text/javascript"/>' . NL .
				'<meta http-equiv="Content-Language" content="' . $this->m_sLocale . '"/>' . NL .
				'<meta http-equiv="X-UA-Compatible" content="IE=8"/>' . NL .
				'<meta name="Generator" content="' . QUEARL_VERSION . '/' . QUEARL_REV . '"/>' . NL .
				'<script type="text/javascript">/*<![CDATA[*/' . NL .
				'	location.SID = "' . (defined('SID') ? SID : '') . '";' . NL .
				'	location.SSID = "' . (defined('SSID') ? SSID : '') . '";' . NL .
				'	location.RROOTDIR = "' . $_SERVER['HTTP_PROTOCOL'] . $_SERVER['HTTP_HOST'] .
						$_SERVER['RROOTDIR'] . '";' . NL .
				'	var Ql = {};' . NL .
				'	Ql._mapXhtmlTemplates = {};' . NL .
				'	var L10n = {};' . NL .
				'/*]]>*/</script>' . NL;
		$this->m_sHead = $s;

		# Initialize the <body> contents.
		$this->m_sBody = '';
	}


	## Adds content to the document’s <body> element.
	#
	# string $s
	#    Markup to be added.
	#
	public function add_body($s) {
		$this->m_sBody .= $s;
	}


	## Adds content to the document’s <head> element.
	#
	# string $s
	#    Markup to be added.
	#
	public function add_head($s) {
		$this->m_sHead .= $s;
	}


	## Links a pre-processed JavaScript file from the document.
	#
	# string $sFileName
	#    Script file name.
	# [bool $bIEOnly]
	#    If true, the script will only be loaded in Internet Explorer. Use this when the amount of
	#    IE-only fixes in a JS file justifies splitting it in “all browsers” and “IE fixes”.
	#
	public function include_js($sFileName, $bIEOnly = false) {
		global $_APP;
		$s  = '<script type="text/javascript" charset="utf-8" src="' .
					make_static_url($sFileName) . '"></script>';
		if ($bIEOnly) {
			$s = '<!--[if IE]>' . $s . '<![endif]-->';
		}
		$this->m_sHead .= $s . NL;
	}


	## Links a pre-processed style sheet to the document.
	#
	# string $sFileName
	#    Style sheet file name.
	# [bool $bIEOnly]
	#    If true, the style sheet will only be loaded in Internet Explorer. Use this when the amount
	#    of IE-only fixes in a CSS file justifies splitting it in “all browsers” and “IE fixes”.
	#
	public function include_css($sFileName, $bIEOnly = false) {
		global $_APP;
		$s  = '<link rel="stylesheet" type="text/css" href="' . make_static_url($sFileName) . '"/>';
		if ($bIEOnly) {
			$s = '<!--[if IE]>' . $s . '<![endif]-->';
		}
		$this->m_sHead .= $s . NL;
	}


	## Embeds an XHTML template in the document, for use by JavaScript code.
	# TODO: finish implementation.
	#
	# string $sTemplateName
	#    Template name. The type is implicitly “xhtml”.
	#
	public function include_template($sTemplateName) {
#		$s  = '<script type="text/javascript">/*<![CDATA[*/' .
#					'Ql._mapXhtmlTemplates[' . ql_json_encode($sTemplateName) . '] = ' .
#						ql_json_encode(?) . ';' .
#				'/*]]>*/</script>';
#		$this->m_sHead .= "\t" . $s . NL;
	}


	## Generates a “static_root_rpath”-based path for the specified file name.
	#
	# string $sFileName
	#    Local name of the file.
	# string return
	#    Absolute URL for the file using the static files path.
	#
	protected static function make_static_url($sFileName) {
		if ($_APP['core']['static_host'] == '') {
			$sUrl = $_SERVER['HTTP_PROTOCOL'] . $_APP['core']['static_host'];
		} else {
			$sUrl = '';
		}
		$sUrl .= $_APP['core']['static_root_rpath'] . $sFileName;
		return utf8_xmlenc($sUrl);
	}


	## Sends the <body> section of the response document to the remote client.
	#
	public function send_body() {
		# Yes, it is ugly. But it’s the only way to do it without remote or local scripts or user
		# agent sniffing.
		$s  = '<!--[if gte IE 8]><body class="css_ie80"><![endif]-->' . NL .
				'<!--[if gte IE 7]><![if lt IE 8]><body class="css_ie70"><![endif]><![endif]-->' . NL .
				'<!--[if gte IE 6]><![if lt IE 7]><body class="css_ie60"><![endif]><![endif]-->' . NL .
				'<!--[if gte IE 5]><![if lt IE 6]><body class="css_ie55"><![endif]><![endif]-->' . NL .
				'<!--[if !IE]><!--><body class="css_w3c"><!--><![endif]-->' . NL .
					ql_indent(1, $this->m_sBody) .
				'</body>' . NL .
				'</html>';
		$this->m_response->send_data($s);
	}


	## See QlResponseEntity::send_close().
	#
	public function send_close() {
		if (!$this->m_bHeadSent) {
			$this->send_head();
		}
		$this->send_body();
	}


	## Sends the <head> section of the response document to the remote client.
	#
	public function send_head() {
		$s  = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" ' .
					'"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">' . NL .
				'<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="' . $this->m_sLocale . '">' . NL .
				'<head>' . NL .
					ql_indent(1, $this->m_sHead) .
				'	<title>' .
						($this->m_sSubtitle != null ? utf8_xmlenc($this->m_sSubtitle) . ' - ' : '') .
						strip_tags($this->m_sTitle) . '</title>' . NL .
				'</head>' . NL;
		$this->m_response->send_data($s);
		$this->m_bHeadSent = true;
	}


	## Sets a title for the page. The string is XHTML, which means that it must be escaped
	# appropriately, and it may include tags.
	#
	# string $sSubtitle
	#    New page subtitle.
	#
	public function set_subtitle($sSubtitle) {
		$this->m_sSubtitle = $sSubtitle;
	}


	## Sets a title for the page. The string is XHTML, which means that it must be escaped
	# appropriately, and it may include tags.
	#
	# string $sTitle
	#    New page title.
	#
	public function set_title($sTitle) {
		$this->m_sTitle = $sTitle;
	}
}

?>
