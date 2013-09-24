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

/** HTTP request class. */


define('QUEARL_CORE_MAIN_REQUEST_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Constants


# Enumeration values for QlSession::m_iClientType.

/** Regular (remote) user. */
define('QL_CLIENTTYPE_USER',    0);
/** Bot (automated web crawler). Excluded from statistics counting and not counted as on-line user.
*/
define('QL_CLIENTTYPE_CRAWLER', 1);



####################################################################################################
# Classes


/** Stores all the data provided by the HTTP client for a request.
*/
class QlRequest {

	/** Associates each encoding accepted by the client with a grade of preference. */
	private /*array<string => float>*/ $m_arrAcceptedEncodings;
	/** Most local (non-public) IP address that originated the request, excluding proxies and other
	middle tiers. */
	private /*string*/ $m_sClientLocalAddr;
	/** Type of remote client for which this request is being processed (QL_CLIENTTYPE_*). */
	private /*int*/ $m_iClientType;
	/** Map of header field names => values. */
	private /*array<string => mixed>*/ $m_arrHeaderFields;
	/** true if the request is for a static file (see [DESIGN_5015 Static files]). */
	private /*int*/ $m_bStaticUrl;
	/** Requested URL. */
	private /*string*/ $m_sUrl;
	/** Scheme component of the requested URL. */
	private /*string*/ $m_sUrlScheme;
	/** User-Agent HTTP header field. */
	private /*string*/ $m_sUserAgent;


	/** Constructor.
	*/
	public function __construct() {
		# Parse the compression methods accepted by the remote client.
		if (isset($_SERVER['HTTP_ACCEPT_ENCODING'])) {
			$this->m_arrAcceptedEncodings =& ql_parse_rfc2616_accept_field(
				$_SERVER['HTTP_ACCEPT_ENCODING']
			);
		} else {
			# Only “identity” is acceptable, but since that’s always acceptable, don’t bother adding
			# that to the array.
			$this->m_arrAcceptedEncodings = array();
		}

		$this->m_sClientLocalAddr = '0.0.0.255';
		foreach (
			array('HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'HTTP_FROM', 'REMOTE_ADDR') as $sIPKey
		) {
			if (isset($_SERVER[$sIPKey])) {
				$sIP = $_SERVER[$sIPKey];
				// TODO: make this check IPv6 compatible or remove it altogether.
				/*if (
					preg_match('/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $sIP) &&
					$sIP != '127.0.0.1' &&
					strncmp($sIP, '10.',      3) != 0 &&
					strncmp($sIP, '172.16.',  7) != 0 &&
					strncmp($sIP, '192.168.', 8) != 0
				) {*/
					$this->m_sClientLocalAddr = $sIP;
					break;
				//}
			}
		}

		$this->m_arrHeaderFields = array();
		$this->m_bStaticUrl = false;

		$this->m_sUrl = $_SERVER['REQUEST_URI'];
		# If this server is also serving static files (see [DESIGN_5015 Static files]) and…
		global $_APP;
		if (
			$_APP['core']['static_host'] == '' ||
			$_APP['core']['static_host'] == $_SERVER['HTTP_HOST']
		) {
			$cchStaticRoot = strlen($_APP['core']['static_root_rpath']);
			# …the requested URL is in the static files directory…
			if (strncmp($this->m_sUrl, $_APP['core']['static_root_rpath'], $cchStaticRoot) == 0) {
				# …strip the static root, but remember that this is a request for a static file.
				$this->m_sUrl = substr($this->m_sUrl, $cchStaticRoot);
				$this->m_bStaticUrl = true;
			}
		}

		# Protocol through which this request was made (http or https).
		if (
			isset($_SERVER['HTTPS']) &&
			(strtolower($_SERVER['HTTPS']) == 'on' || $_SERVER['HTTPS'] == '1')
		) {
			$this->m_sUrlScheme = 'https://';
		} else {
			$this->m_sUrlScheme = 'http://';
		}

		$this->m_sUserAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

		# Determine the type of client/user agent.
		$this->m_iClientType = QL_CLIENTTYPE_USER;
		if ($this->m_sUserAgent != '') {
			# Detect search engine bots.
			$sBotList = file_get_contents($_APP['core']['rodata_lpath'] . 'core/robotuseragents.txt');
			if (strpos($sBotList, "\n" . $this->m_sUserAgent . "\n") !== false) {
				$this->m_iClientType = QL_CLIENTTYPE_CRAWLER;
			}
			unset($sBotList);
		}
	}


	/** Returns the type of remote client.

	int return
		Client type (QL_CLIENTTYPE_*).
	*/
	public function get_client_type() {
		return $this->m_iClientType;
	}


	/** Returns the most local address of remote client.

	string return
		Non-public address of the client.
	*/
	public function get_client_local_addr() {
		return $this->m_sClientLocalAddr;
	}


	/** Returns an array associating each encoding accepted by the client with a grade of preference
	expressed by the client, sorted by the latter.

	array<string => float>& return
		Array with the accepted encodings.
	*/
	public function & get_accepted_encodings() {
		return $this->m_arrAcceptedEncodings;
	}


	/** Returns the URL requested by the client.

	string return
		URL.
	*/
	public function get_url() {
		return $this->m_sUrl;
	}


	/** Returns the scheme component of the URL requested by the client.

	string return
		Scheme component of the URL.
	*/
	public function get_url_scheme() {
		return $this->m_sUrlScheme;
	}


	/** Returns the User-Agent HTTP header field; if none was provided, this will be an empty string.

	string return
		User agent.
	*/
	public function get_user_agent() {
		return $this->m_sUserAgent;
	}


	/** Returns true if the request is for a static file (see [DESIGN_5015 Static files]), or false
	otherwise.

	bool return
		true if the request is for a static file.
	*/
	public function is_url_static_file() {
		return $this->m_bStaticUrl;
	}


	/** Alters the URL requested by the client.

	string $sUrl
		URL.
	*/
	public function set_url($sUrl) {
		$this->m_sUrl = $sUrl;
	}
}

?>
