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

	/** Map of header field names => values. */
	private /*array<string => mixed>*/ $m_arrHeaderFields;
	/** URL requested. */
	private /*string*/ $m_sUrl;
	/** Type of remote client for which this request is being processed (QL_CLIENTTYPE_*). */
	private /*int*/ $m_iClientType;


	/** Constructor.
	*/
	public function __construct() {
		$this->m_arrHeaderFields = array();
		$this->m_sUrl = $_SERVER['REQUEST_URI'];

		# Determine the type of client/user agent.
		$this->m_iClientType = QL_CLIENTTYPE_USER;
		if ($_SERVER['HTTP_USER_AGENT'] != '') {
			# Detect search engine bots.
			global $_APP;
			$sBotList = file_get_contents($_APP['core']['rodata_lpath'] . 'core/robotuseragents.txt');
			if (strpos($sBotList, "\n" . $_SERVER['HTTP_USER_AGENT'] . "\n") !== false) {
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


	/** Returns the URL requested by the client.

	string return
		URL.
	*/
	public function get_url() {
		return $this->m_sUrl;
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