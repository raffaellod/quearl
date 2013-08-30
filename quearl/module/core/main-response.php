<?php
# -*- coding: utf-8; mode: php; tab-width: 3 -*-
#---------------------------------------------------------------------------------------------------
# Quearl
# Copyright 2005-2013 Raffaello D. Di Napoli
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

// Markup generators.


define('QUEARL_CORE_MAIN_RESPONSE_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Constants


# HTTP response statuses.

define('HTTP_STATUS_CONTINUE',            100);
define('HTTP_STATUS_SWITCHING_PROTOCOLS', 101);
define('HTTP_STATUS_OK',                  200);
define('HTTP_STATUS_CREATED',             201);
define('HTTP_STATUS_ACCEPTED',            202);
define('HTTP_STATUS_NO_CONTENT',          204);
define('HTTP_STATUS_MULTIPLE_CHOICES',    300);
define('HTTP_STATUS_MOVED_PERMANENTLY',   301);
define('HTTP_STATUS_FOUND',               302);
define('HTTP_STATUS_SEE_OTHER',           303);
define('HTTP_STATUS_NOT_MODIFIED',        304);
define('HTTP_STATUS_USE_PROXY',           305);
define('HTTP_STATUS_TEMPORARY_REDIRECT',  307);



####################################################################################################
# Classes


## TODO: comment.
#
class QlResponse {

	## HTTP response code (HTTP_STATUS_* or newer codes).
	private /*int*/ $m_iCode;
	## Description for m_iCode.
	private /*string*/ $m_sCodeDescription;
	## Map of header names => values.
	private /*array<string => mixed>*/ $m_arrHeaders;
	## true if the headers have been sent.
	private /*array<string => mixed>*/ $m_bHeadersSent;


	## Constructor.
	#
	public function __construct() {
		$this->set_http_response(HTTP_STATUS_OK);
		# Setup a default headers.
		$this->m_arrHeaders = array(
			'Content-Type' => 'text/plain; charset=utf-8',
		);
		$this->m_bHeadersSent = false;
	}


	## TODO: comment.
	#
	public function send_chunk($s) {
		# Make sure we sent the headers.
		if (!$this->m_bHeadersSent)
			$this->send_headers();
		echo $s;
	}


	## TODO: comment.
	#
	public function send_headers() {
		header($_SERVER['SERVER_PROTOCOL'] . ' ' . $this->m_iCode . ' ' . $this->m_sCodeDescription);
		foreach ($this->m_arrHeaders as $sName => &$mValue) {
			if (is_string($mValue) || is_int($mValue) || is_float($mValue))
				header($sName . ': ' . $mValue);
			# TODO: convert arrays and warn about strange types.
		}
		$this->m_bHeadersSent = true;
	}


	## TODO: comment.
	#
	public function send_last($s) {
		# Check if we need to send out the headers.
		if (!$this->m_bHeadersSent)
			# This is the first and last data chunk to be sent, so set a Content-Length header since we
			# know exactly how many bytes we’re sending.
			$this->set_header('Content-Length', strlen($s));
			$this->send_headers();
		}
		echo $s;
	}


	## TODO: comment.
	#
	public function set_header($sName, $mValue) {
		$this->m_arrHeaders[$sName] = $mValue;
	}


	## TODO: comment.
	#
	public function set_http_response($iCode, $sCodeDescription = null) {
		# If a description has not been provided, use the standard for the specified code.
		if ($sCodeDescription === null)
			switch ($iCode) {
				case HTTP_STATUS_CONTINUE:            $sCodeDescription = 'Continue';            break;
				case HTTP_STATUS_SWITCHING_PROTOCOLS: $sCodeDescription = 'Switching Protocols'; break;
				case HTTP_STATUS_OK:                  $sCodeDescription = 'OK';                  break;
				case HTTP_STATUS_CREATED:             $sCodeDescription = 'Created';             break;
				case HTTP_STATUS_ACCEPTED:            $sCodeDescription = 'Accepted';            break;
				case HTTP_STATUS_NO_CONTENT:          $sCodeDescription = 'No Content';          break;
				case HTTP_STATUS_MULTIPLE_CHOICES:    $sCodeDescription = 'Multiple Choices';    break;
				case HTTP_STATUS_MOVED_PERMANENTLY:   $sCodeDescription = 'Moved Permanently';   break;
				case HTTP_STATUS_FOUND:               $sCodeDescription = 'Found';               break;
				case HTTP_STATUS_SEE_OTHER:           $sCodeDescription = 'See Other';           break;
				case HTTP_STATUS_NOT_MODIFIED:        $sCodeDescription = 'Not Modified';        break;
				case HTTP_STATUS_USE_PROXY:           $sCodeDescription = 'Use Proxy';           break;
				case HTTP_STATUS_TEMPORARY_REDIRECT:  $sCodeDescription = 'Temporary Redirect';  break;
				# TODO: warn about not knowing what the code is.
				default:                              $sCodeDescription = 'UNKNOWN';             break;
			}
		$this->m_iCode = $iCode;
		$this->m_sCodeDescription = $sCodeDescription;
	}
}

?>
