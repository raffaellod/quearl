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

# Definition of the session classes. Same prerequisite constraints as main.php.


define('QUEARL_CORE_MAIN_SESSION_INCLUDED', true);

require_once 'main-application.php';



####################################################################################################
# Constants


# Enumeration values for $_SESSION['ql_user_acclvl']. Must be powers of two. The greater the value,
# the less restricted the access.

define('QL_ACCLVL_ANON',      0x0000);
define('QL_ACCLVL_USER',      0x0001);
define('QL_ACCLVL_POWERUSER', 0x0010);
define('QL_ACCLVL_ADMIN',     0x0200);
define('QL_ACCLVL_ROOT',      0x2000);


# Enumeration values for QlSession::m_iClientType.

## Regular (remote) user.
define('QL_CLIENTTYPE_USER',    0);
## Bot (automated web crawler). Excluded from statistics counting and not counted as online user.
define('QL_CLIENTTYPE_CRAWLER', 1);



####################################################################################################
# Classes


## Implementation of a session tracking mechanism.
#
# Note: sessions are never saved for crawlers, nor are the session IDs propagated from one page to
# another.
#
class QlSession {

	## Session ID.
	public /*string*/ $m_sID;
	## Subsession ID (if subsessions are enabled for this session).
	public /*string*/ $m_sSubID;
	## If true, write_and_close() needs to be called.
	public /*bool*/ $m_bLocked;
	## Type of remote client for which this request is being processed (QL_CLIENTTYPE_*).
	public /*int*/ $m_iClientType;


	## Constructor. Upon the first time a session is created, propagation of its ID via query string
	# and cookies is enabled; from the second time on, only the best propagation method is kept.
	#
	public function __construct() {
		global $_APP, $ql_db, $ql_fScriptStart;
		global $ql_debug_session_SID;
		$iTS = (int)$ql_fScriptStart;

		# Determine the type of client/user agent.
		$this->m_iClientType = QL_CLIENTTYPE_USER;
		if ($_SERVER['HTTP_USER_AGENT'] != '') {
			# Detect search engine bots.
			$sBotList = file_get_contents($_APP['core']['rodata_lpath'] . 'core/robotuseragents.txt');
			if (strpos($sBotList, "\n" . $_SERVER['HTTP_USER_AGENT'] . "\n") !== false) {
				$this->m_iClientType = QL_CLIENTTYPE_CRAWLER;
				if (isset($_GET['s'])) {
					# Bots should not be crawling with SIDs. Remove the SID and redirect the bot;
					# hopefully it will then update its own cache, discarding the URL with SID.
					header($_SERVER['SERVER_PROTOCOL'] . ' 301 Moved Permanently');
					# TODO: don’t assume “http”.
					$sURL = 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['RFULLPATH'] . '?' .
							  preg_replace('/(:?^s=[^&]&?|&?s=[^&])/', '', $_SERVER['QUERY_STRING']);
					header('Location: ' . $sURL);
					exit;
				}
			}
			unset($sBotList);
		}

		# Determine the session ID (SID) if provided by the user agent, and store it in $this->m_sID.
		if ($this->m_iClientType == QL_CLIENTTYPE_CRAWLER)
			$bLoaded = false;
		else {
			$bLoaded = $this->load();
			# If no session was loaded, create a new one.
			if (!$bLoaded) {
				do {
					# Create a new session ID, making sure it’s really new (i.e. not already in the db).
					$this->m_sID = ql_str_uid(32, $ql_fScriptStart, $_SERVER['REMOTE_REAL_ADDR']);
					$ql_db->query('
						INSERT INTO sessions(id, locked, firsthit, lasthit)
						VALUES (\'' . $this->m_sID . '\', 1, ' . $iTS . ', ' . $iTS . ')
					');
				} while ($ql_db->get_last_affected_rows() != 1);
				if ($ql_debug_session_SID)
					ql_log('DEBUG', 'QlSession::__construct(): new session: “' . $this->m_sID . '”');
				$this->m_bLocked = true;
				setcookie('s', $this->m_sID, null, $_SERVER['RROOTDIR']);
			}
		}

		# If this is true, we need to create a new $_SESSION.
		if (!$bLoaded)
			$this->start();

		# Define the SID constant.
		if (isset($_COOKIE['s']) || !$bLoaded)
			# Using cookies, or there’s just no SID to propagate.
			define('SID', '');
		else {
			# No cookie was used, so stick to using the URL Rewriter.
			define('SID', 's=' . $this->m_sID);
			output_add_rewrite_var('s', $this->m_sID);
		}

		# This must be recalculated on each request, because of possible DST changes.
		$_SESSION['ql_tzoffset'] = ql_format_timestamp('%Z', $iTS, $_SESSION['ql_timezone']);

		# Update statistics on visits to the web site; exclude bots and power users.
		if (
			$this->m_iClientType == QL_CLIENTTYPE_USER &&
			!$this->check_access_level(QL_ACCLVL_POWERUSER)
		) {
			$sTS = ql_format_timestamp('%Y%m%d%H', $iTS, 'UTC');
			$ql_db->query('
				INSERT INTO stats_hits_bydayhour(ymdh, c)
				VALUES (' . $sTS . ', 1)
				ON DUPLICATE KEY UPDATE c = c + 1
			');
			if ($_SERVER['HTTP_USER_AGENT'] != '')
				$ql_db->query('
					INSERT INTO stats_useragents(ua, ym, c)
					VALUES (
						\'' . $ql_db->escape($_SERVER['HTTP_USER_AGENT']) . '\',
						' . substr($sTS, 0, 6) . ',
						1
					)
					ON DUPLICATE KEY UPDATE c = c + 1
				');
		}

		$GLOBALS['ql_session'] = $this;
	}


	## Destructor.
	#
	public function __destructor() {
		$this->write_and_close();
		unset($GLOBALS['ql_session'], $GLOBALS['_SESSION']);
	}


	## Check whether the user has the specified generic access level.
	#
	# int $iAccessLevel
	#    Generic access level.
	#
	public function check_access_level($iAccessLevel) {
		return $_SESSION['ql_user_acclvl'] >= $iAccessLevel;
	}


	## Checks whether the user has been granted the specified privileges.
	#
	# string+ …
	#    Privileges to check for.
	# return:bool
	#    true if the user is privileged enough, false otherwise.
	#
	public function check_priv_tokens(/*…*/) {
		foreach (func_get_args() as $sPrivToken)
			if (strpos($_SESSION['ql_user_privtokens'], ' ' . $sPrivToken . ' ') === false)
				return false;
		return true;
	}


	## Attempts to select a locale among those reported by the user agent as being preferred by the
	# user. In case none of these locales is supported, or if no such preference is indicated, the
	# site’s default locale is returned instead.
	#
	# string return
	#    Detected locale.
	#
	public static function detect_locale() {
		global $_APP;
		# The user (if logged in at all) has no locale preference, and the URL they’re visiting
		# doesn’t specify a locale either. Check if the user agent provides any suggestions.
		if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
			$arrInstalledLocales =& $_APP['core']['installed_locales'];
			$arrDefaultLanguageLocales =& $_APP['core']['default_language_locales'];
			foreach (ql_str_parse_rfc2616_accept_field(
				strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'])
			) as $sLang => $fQ) {
				# Check if this language/locale is installed.
				if (isset($arrInstalledLocales[$sLang]))
					return $sLang;
				# Break the language in a language/locale pair, and see if we have at least a default
				# locale for the language.
				$arrMatch = explode('-', $sLang, 2);
				$sLang = $arrMatch[0] . '-' . @$arrDefaultLanguageLocales[$arrMatch[0]];
				if (isset($arrInstalledLocales[$sLang]))
					return $sLang;
			}
		}
		# Still no locale? Use the site-defined default.
		return $_APP['core']['default_locale'];
	}


	## Enables distinguishing among parallel workflows performed on a single user session (e.g. on a
	# single browser instance, maybe via multiple tabs) via an always-unique HTTP “ss” parameter.
	# Subsession-specific data is accessible via $_SESSION['sub'].
	#
	# [bool $bKeepId]
	#    If this is not true, the subsession ID will be changed, while preserving the subsession-
	#    specific data.
	#
	public function enable_subsessions($bKeepId = false) {
		global $_APP, $ql_fScriptStart;
		if ($this->m_iClientType == QL_CLIENTTYPE_CRAWLER) {
			# Crawlers are banned from using sessions and subsessions.
			define('SSID', '');
			return;
		}

		$iTS = (int)$ql_fScriptStart;
		# Make sure we have an array containing all subsessions.
		if (!isset($_SESSION['subs']))
			$_SESSION['subs'] = array();
		# Get the ss parameter from $_POST or $_GET.
		$sSSID = @$_POST['ss'];
		if ($sSSID === null)
			$sSSID = @$_GET['ss'];
		# Check that we got a valid subsession ID.
		if (
			$sSSID !== null &&
			(!preg_match('/^[0-9A-Za-z\-_]{8}$/AD', $sSSID) || !isset($_SESSION['subs'][$sSSID]))
		)
			$sSSID = null;

		if ($sSSID !== null && $bKeepId)
			# We have a valid subsession ID that we want to keep.
			$this->m_sSubID = $sSSID;
		else {
			# We don’t have a valid subsession ID, or we don’t wa to keep it: create a new ID.
			$sNewSSID = ql_str_uid(8, $ql_fScriptStart);
			if ($sSSID !== null) {
				# If we already have a subsession, replace its ID now, but keep its contents…
				$_SESSION['subs'][$sNewSSID] =& $_SESSION['subs'][$sSSID];
				unset($_SESSION['subs'][$sSSID]);
			} else
				# …else, start a new subsession.
				$_SESSION['subs'][$sNewSSID] = array();
			# Either way, update the last-used timestamp…
			$_SESSION['subs'][$sNewSSID]['__ql_mtime'] = $iTS;

			# …which we’ll use to detect abandoned subsessions and discard them after a while.
			foreach ($_SESSION['subs'] as $sSSID => $arrSS)
				if ($arrSS['__ql_mtime'] < $iTS - $_APP['core']['session_gc_max_idle'])
					unset($_SESSION['subs'][$sSSID]);

			# This is the subsession ID we’ll use.
			$this->m_sSubID = $sNewSSID;
		}

		# Make the data for the current subsession available via $_SESSION['sub'];
		$_SESSION['sub'] =& $_SESSION['subs'][$this->m_sSubID];
		# Ensure that the subsession ID is propabated.
		define('SSID', 'ss=' . $this->m_sSubID);
		$_SERVER['RFULLPATHQ'] = ql_url_addqs($_SERVER['RFULLPATHQ'], SSID);
	}


	## Collects and deletes expired sessions (garbage collector).
	#
	public function gc() {
		global $_APP, $ql_db, $ql_fScriptStart;
		$ql_db->query('
			DELETE FROM sessions
			WHERE lasthit < ' . ((int)$ql_fScriptStart - $_APP['core']['session_gc_max_idle']) . '
		');
		# TODO: make self-adapting.
		ql_log('DEBUG', 'Deleted ' . $ql_db->get_last_affected_rows() . ' expired sessions',
			'If this is occurring too often, decrease the gc rate; if too rarely, increase it.'
		);
	}


	## Returns the type of remote client for which this request is being processed.
	#
	# int return
	#    Client type (QL_CLIENTTYPE_*).
	#
	public function get_client_type() {
		return $this->m_iClientType;
	}


	## Returns the session identifier (SID).
	#
	# string return
	#    Fixed-length identifier of the current session.
	#
	public function get_id() {
		return $this->m_sID;
	}


	## Returns the session identifier (SID) as an URL argument.
	#
	# string return
	#    URL argument containing the fixed-length identifier of the current session.
	#
	public function get_id_url() {
		return 's=' . $this->m_sID;
	}


	## Returns the subsession identifier (SSID), if any.
	#
	# string return
	#    Fixed-length identifier of the current subsession, or an empty string.
	#
	public function get_subid() {
		return $this->m_sSubID;
	}


	## Calculates the highest access level among the specified privileges.
	#
	# string $sPrivTokens
	#    List of privilege tokens.
	# int return
	#    Highest access level granted by the tokens in $sPrivTokens.
	#
	private static function get_user_access_level($sPrivTokens) {
		$iAccessLevel = QL_ACCLVL_ANON;
		$arrPrivTokens = array();
		# Build a list of all known privileges, to speed up scanning.
		foreach (QlModule::get_loaded_modules() as $module)
			$arrPrivTokens += $module->get_privilege_tokens();
		# Scan the granted privileges, to find the highest level.
		foreach (explode(' ', $sPrivTokens) as $sPrivToken)
			if ($iAccessLevel < (int)@$arrPrivTokens[$sPrivToken][0])
				$iAccessLevel = $arrPrivTokens[$sPrivToken][0];
		return $iAccessLevel;
	}


	## Resets user-related session information to that of an anonymous user.
	#
	private function init_anonymous_user() {
		$_SESSION = array(
			'ql_user_acclvl'     => QL_ACCLVL_ANON,
			'ql_user_email'      => '',
			'ql_user_group'      => '',
			'ql_user_id'         => null,
			'ql_user_idgroup'    => null,
			'ql_user_name'       => '',
			'ql_user_privtokens' => '',
		);
	}


	## Attempts to load and lock the session associated to the SID provided by the user agent, if
	# any.
	#
	# bool return
	#    true if a session (whose ID is now in $this->m_sID) was loaded (and locked), or false in any
	#    other case.
	#
	private function load() {
		global $ql_db, $ql_fScriptStart;
		global $ql_debug_session_SID;
		$sSID = null;
		# Get the SID in just about any possible way.
		foreach (array('_COOKIE', '_POST', '_GET') as $sMapName) {
			$sSID = @$GLOBALS[$sMapName]['s'];
			if ($sSID !== null)
				break;
		}
		if ($sSID === null)
			return false;

		# Ensure we were passed a valid SID.
		if (!preg_match('/^[-_0-9A-Za-z]{32}$/AD', $sSID)) {
			if ($ql_debug_session_SID)
				ql_log('DEBUG', 'QlSession::load(): invalid SID passed: “' . $sSID . '”');
			return false;
		}

		# Ensure that the session really exists. To ensure it won’t be garbage-collected between this
		# check and the locking below, also update its lasthit.
		$ql_db->query('
			UPDATE sessions
			SET lasthit = ' . (int)$ql_fScriptStart . ',
			WHERE id = \'' . $sSID . '\'
		');
		if ($ql_db->get_last_affected_rows() != 1) {
			# The update failed: the session does not exist. If it used to, we need the user to re-log-
			# in.
			# TODO: let the user know.
			if ($ql_debug_session_SID)
				ql_log('DEBUG', 'QlSession::load(): passed SID not found in table: “' . $sSID . '”');
			return false;
		}

		# Lock this valid session. Since it might already be locked, proceed with a compare-and-swap.
		$cRetries = 15;
		do
			$ql_db->query('
				UPDATE sessions
				SET locked = 1
				WHERE id = \'' . $sSID . '\'
					AND locked = 0
			');
		while ($ql_db->get_last_affected_rows() != 1 && --$cRetries && (sleep(1) || true));
		if (!$cRetries)
			# TODO: warn the user and change this to ql_log(), don’t just drop the bomb.
			trigger_error('Unable to acquire session lock', E_USER_ERROR);

		# Load the section data.
		$sData = $ql_db->query_value('
			SELECT data
			FROM sessions
			WHERE id = \'' . $sSID . '\'
		');
		$arrData = @unserialize($sData);
		if (!$arrData) {
			# There was some problem with loading the session, discard it.
			ql_log(
				'E_USER_WARNING',
				'QlSession::load(): User session “' . $sSID . '” data corrupt',
				'<pre>' . ql_lenc($sData) . '</pre>'
			);
			$ql_db->query('
				DELETE FROM sessions
				WHERE id = \'' . $sSID . '\'
			');
			return false;
		}

		# Validate access to this session.
		if ($arrData['ql_ipaddr'] != $_SERVER['REMOTE_REAL_ADDR']) {
			# The session is valid, but it wasn’t started from the same IP address as the one
			# originating this HTTP request: revoke the lock and pretend we didn’t see it; the only
			# side effect will be that we updated its lasthit timestamp.
			ql_log(
				'E_USER_NOTICE',
				'QlSession::load(): IP address mismatch for user session “' . $sSID . '”: was ' .
					$arrData['ql_ipaddr'] . ', now accessed from ' . $_SERVER['REMOTE_REAL_ADDR']
			);
			$ql_db->query('
				UPDATE sessions
				SET locked = 0
				WHERE id = \'' . $sSID . '\'
					AND locked = 1
			');
			return false;
		}

		# All good, proceed to using the loaded SID and $_SESSION.
		$this->m_sID = $sSID;
		$this->m_bLocked = true;
		$GLOBALS['_SESSION'] =& $arrData;
		return true;
	}


	## Attempts to log the specified user in.
	#
	# string $sUserName
	#    User name.
	# string $sPassword
	#    Clear-text password.
	# bool $bSetCookie
	#    If true, and the login succeededs, the provided login data is saved to a cookie.
	# bool return
	#    true if the login was successful, or false otherwise.
	#
	public function login($sUserName, $sPassword, $bSetCookie) {
		global $_APP, $ql_db, $ql_fScriptStart;
		$_SESSION = $ql_db->query_assoc('
			SELECT
				u.email       AS ql_user_email,
				ug.name       AS ql_user_group,
				u.id          AS ql_user_id,
				u.idusergroup AS ql_user_idgroup,
				u.name        AS ql_user_name,
				ug.privtokens AS ql_user_privtokens,
				u.locale      AS ql_locale,
				u.lastlogints
			FROM users AS u
				INNER JOIN usergroups AS ug
					ON ug.id = u.idusergroup
			WHERE u.name = \'' . $ql_db->escape($sUserName) . '\'
				AND u.pwhash = \'' . md5($sPassword) . '\'
				AND u.active != 0
		');
		if (!$_SESSION)
			return false;

		# Update the last login time.
		$iTS = (int)$ql_fScriptStart;
		$ql_db->query('
			UPDATE users
			SET lastlogints = ' . $iTS . '
			WHERE id = ' . $_SESSION['ql_user_id'] . '
		');

		# Prepare the retrieved data.
		$_SESSION['ql_user_acclvl'] = $this->get_user_access_level($_SESSION['ql_user_privtokens']);
		settype($_SESSION['ql_user_id'], 'int');
		settype($_SESSION['ql_user_idgroup'], 'int');
		$_SESSION['ql_user_logintime'] = $iTS;
		$_SESSION['ql_user_privtokens'] = ' ' . $_SESSION['ql_user_privtokens'] . ' ';
		if ((int)$_SESSION['lastlogints'] == 0)
			# Only set this for the first login, so we don’t waste space on a variable that’s going to
			# be false for nearly every login.
			$_SESSION['ql_firstlogin'] = true;
		unset($_SESSION['lastlogints']);

		# Save user name and password, if requested.
		if ($bSetCookie)
			setcookie(
				'al',
				$_SESSION['ql_user_name'] . ':' . $sPassword,
				$iTS + $_APP['core']['session_autologin_lifetime'] * 86400 /*(24 * 60 * 60)*/,
				$_SERVER['RROOTDIR']
			);

		return true;
	}


	## Logs the active user off, by resetting the session to that of an anonymous user.
	#
	public function logout() {
		$this->init_anonymous_user();
		setcookie('al', '', null, $_SERVER['RROOTDIR']);
	}


	## (DEPRECATED) Add a message to be displayed when the page is loaded.
	#
	# string $s
	#    Message to be displayed.
	#
	public function onload_msg($s) {
		$_SESSION['ql_onload_msg'][] = $s;
	}


	## (DEPRECATED) Sets an UI element to receive focus when the page is loaded.
	#
	# string $sID
	#    ID of the element to receive focus.
	# [bool $bForce]
	#    If true, this call will override any previous calls to this same method.
	#
	public function onload_focus($sID, $bForce = true) {
		if (!isset($_SESSION['ql_onload_focus']) || $bForce)
			$_SESSION['ql_onload_focus'] = $sID;
	}


	## Logs the current user back in, possibly also recreating the auto-login cookie.
	#
	# string $sPassword
	#    Non-hashed password; it’s not extracted from the auto-login cookie even if the latter is
	#    available.
	# bool return
	#    true if successful, or false if something went wrong during the login. In either case, the
	#    user will still be logged in, i.e. a failure doesn’t mean that the user is logged out.
	#
	public function relogin($sPassword) {
		return $this->login($_SESSION['ql_user_name'], $sPassword, isset($_COOKIE['al']));
	}


	## Verifies that the user has all the privileges passed as arguments; if that’s not the case, the
	# page generation is interrupted, resulting in an “access denied” error message instead. Can be
	# used for both UI and UI-less (asynchronous) checks. Does not return.
	#
	# string+ …
	#    Privileges to check for.
	#
	public function require_priv_tokens(/*…*/) {
		global $ql_sAction;
		$arrTokens = func_get_args();
		if (!call_user_func_array(array($this, 'check_priv_tokens'), $arrTokens))
			if (strncmp($ql_sAction, 'ar_', 3) == 0) {
				# Make sure ql_async_response() is defined.
				require_once 'async.php';

				ql_async_response('application/json', array(
					'error' => L10N_CORE_ERR_RESTRICTEDASYNC,
				));
			} else if (headers_sent()) {
				# require_priv_tokens() is always called prior to any processing, so this should never
				# happen. And yet, just in case…
				$s  = '<h1>403 Access Denied</h1>' . NL .
						'<p>' . L10N_CORE_ERR_RESTRICTEDPAGE . '</p>' . NL;
				echo $s;
				exit;
			} else {
				$this->onload_msg(L10N_CORE_ERR_RESTRICTEDPAGE);
				ql_redirect($_SERVER['RROOTDIR'] . ql_loc_url(''));
			}
	}


	## Initializes a new session, either from an auto-login or from scratch.
	#
	private function start() {
		global $_APP;

		# Attempt an auto-login.
		$arrALCookie = null;
		if (isset($_COOKIE['al'])) {
			# The user agent sent an auto-login cookie: verify its validity.
			$arrALCookie = explode(':', $_COOKIE['al'], 2);
			if (count($arrALCookie) != 2)
				# Discard this invalid auto-login cookie and go anonymous.
				setcookie('al', '', null, $_SERVER['RROOTDIR']);
		}
		# If we have no auto-login cookie, or the login with that fails, go anonymous.
		if (!$arrALCookie || !$this->login($arrALCookie[0], $arrALCookie[1], true))
			$this->init_anonymous_user();
		unset($arrALCookie);

		# Add connection-specific information.
		$_SESSION['ql_ipaddr'] = $_SERVER['REMOTE_REAL_ADDR'];
		$_SESSION['ql_useragent'] = $_SERVER['HTTP_USER_AGENT'];
		# Ignore absent/empty referrers, or our own pages.
		# Note: a page of ours can actually be the referrer for a new session, when the previous one
		# expired and the user clicked a link on a page from that session.
		if (!empty($_SERVER['HTTP_REFERER'])) {
			# TODO: don’t assume “http”.
			$sProtHost = 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['RROOTDIR'];
			if (strncmp($_SERVER['HTTP_REFERER'], $sProtHost, strlen($sProtHost)) != 0)
				$_SESSION['ql_referrer'] = $_SERVER['HTTP_REFERER'];
		}

		# If the login did not select a timezone, best-guess it - except for bots, who won’t care.
		if (empty($_SESSION['ql_timezone']))
			if ($this->m_iClientType == QL_CLIENTTYPE_USER)
				$_SESSION['ql_timezone'] = ql_timezone_from_ip($_SERVER['REMOTE_ADDR']);
			else
				$_SESSION['ql_timezone'] = $_APP['core']['default_timezone'];
	}


	## Creates a hash code for the specified user, optionally also returning the values used to
	# generate it.
	#
	# string $sName
	#    User name. If any of the remaining arguments is omitted, this name will be used to retrieve
	#    the missing information from the database.
	# [mixed $sPwHash]
	#    Current password’s MD5 hash. If true, the current password hash will be retrieved and saved
	#    in the returned array.
	# [mixed $sEmail]
	#    Current e-mail address. If true, the current e-mail address will be retrieved and saved in
	#    the returned array.
	# [mixed $iID]
	#    User ID. If true, the ID will be retrieved and saved in the returned array.
	# array<string => mixed> return
	#    Array containing these keys:
	#    “hash” => string
	#       Computed hash for the user.
	#    [“pwhash” => string]
	#       MD5 hash of the user’s password.
	#    [“email” => string]
	#       User’s e-mail address.
	#    [“id” => int]
	#       User ID.
	#
	public static function user_hash($sName, $sPwHash = null, $sEmail = null, $iID = null) {
		global $ql_db;
		if (is_string($sPwHash) && is_string($sEmail) && is_numeric($iID))
			$arrUser = func_get_args();
		else {
			$arrUser = $ql_db->query_row('
				SELECT
					name,
					pwhash,
					email,
					id
				FROM users
				WHERE name = \'' . $ql_db->escape($sName) . '\'
			');
			if (!$arrUser)
				return null;
		}
		$arrRet = array(
			'hash' => md5(implode('', $arrUser)),
		);
		if ($sPwHash === true)
			$arrRet['pwhash'] =& $arrUser[1];
		if ($sEmail === true)
			$arrRet['email'] =& $arrUser[2];
		if ($iID === true)
			$arrRet['id'] = (int)$arrUser[3];
		return $arrRet;
	}


	## Saves the $_SESSION array to the database storage, then discards it.
	#
	public function write_and_close() {
		global $_APP, $ql_db, $ql_fScriptStart;
		if (!$this->m_bLocked)
			return;

		# “sub” is merely a reference to an item in “subs”, so it shouldn’t be saved.
		if ($this->m_sSubID != '')
			unset($_SESSION['sub']);
		# Update and unlock the session record.
		$ql_db->query('
			UPDATE sessions
			SET
				locked = 0,
				iduser = ' . ($_SESSION['ql_user_id'] ? $_SESSION['ql_user_id'] : 'NULL') . ',
				lasthit = ' . (int)$ql_fScriptStart . ',
				data = \'' . $ql_db->escape(serialize($_SESSION)) . '\'
			WHERE id = \'' . $this->m_sID . '\'
				AND locked = 1
		');
		# Restore “sub”.
		if ($this->m_sSubID != '')
			$_SESSION['sub'] =& $_SESSION['subs'][$this->m_sSubID];
		# Ensure the update really worked.
		if ($ql_db->get_last_affected_rows() != 1)
			return;
		$this->m_bLocked = false;

		# Clean up, once in a while.
		if (
			mt_rand(1, $_APP['core']['session_gc_divisor']) <= $_APP['core']['session_gc_probability']
		)
			$this->gc();
	}
}

?>
