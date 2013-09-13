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

# Implementation of the “core” module.


define('QUEARL_CORE_MAIN_COREMODULE_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Classes


class QlCoreModule extends QlModule {

	## See QlModule::abbr().
	#
	public function abbr() {
		return 'core';
	}


	## See QlModule::augment_response_body().
	#
	public function augment_response_body($sUrl, QlResponse $response, QlXhtmlResponseEntity $ent) {
	}


	## See QlModule::augment_response_head().
	#
	public function augment_response_head($sUrl, QlResponse $response, QlXhtmlResponseEntity $ent) {
	}


	## See QlModule::get_privilege_tokens().
	#
	public function get_privilege_tokens() {
		return array(
			'REG'  => array(QL_ACCLVL_USER,      'Registered user'),
			'DBGU' => array(QL_ACCLVL_USER,      'Registered debug user'),
			'USR'  => array(QL_ACCLVL_POWERUSER, 'Can manage users'),
			'DBGA' => array(QL_ACCLVL_ADMIN,     'Debug administrator'),
		);
	}


	## See QlModule::get_qlt().
	#
	public function get_qlt() {
		return array(
			'shortcuts' => array(
				'/\[email](.*?)\[\/email]/'               => '[email=$1]$1[/email]',
				'/\[flash=([^\[]*)](www\..*?)\[\/flash]/' => '[flash=$1]http://$2[/flash]',
				'/\[flash=([^\[]*)]\/(.*?)\[\/flash]/'    => '[flash=$1]' . $_SERVER['RROOTDIR'] .
																				'$2[/flash]',
				'/\[img](.*?)\[\/img]/'                   => '[img=$1][/img]',
				'/\[img=(www\..*?)]/'                     => '[img=http://$1]',
				'/\[img=\/(.*?)]/'                        => '[img=' . $_SERVER['RROOTDIR'] . '$1]',
				'/\[url](.*?)\[\/url]/'                   => '[url=$1]$1[/url]',
				'/\[url=(www\.[^\]]+)]/'                  => '[url=http://$1]',
				'/\[url=\/([^\]]+)]/'                     => '[url=' . $_SERVER['RROOTDIR'] . '$1]',
			),

			'tags' => array(
				'align' => array(
					'ml'     => true,
					'startp' => '/\[align=(left|center|right)]/',
					'endp'   => '/\[\/align]/',
					'startf' => '<div style="text-align: %1$s;">',
					'end'    => '</div>',
				),
				'b' => array(
					'startp' => '/\[b]/',
					'endp'   => '/\[\/b]/',
					'startf' => '<strong>',
					'end'    => '</strong>',
				),
				'color' => array(
					'startp' => '/\[color=(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|[a-z]+)]/',
					'endp'   => '/\[\/color]/',
					'startf' => '<span style="color: %1$s;">',
					'end'    => '</span>',
				),
				'email' => array(
					'startp' => '/\[email=([^\]]+)]/',
					'endp'   => '/\[\/email]/',
					'startf' => '<a href="mailto:%1$s">',
					'end'    => '</a>',
				),
				'flash' => array(
					'startp' => '/\[flash=(\d+)x(\d+)](.*?)(?=\[\/flash])/s',
					'endp'   => '/\[\/flash]/',
					'startf' => '<object type="application/x-shockwave-flash" data="%3$s" width="%1$d"' .
										' height="%2$d">' .
										'<param name="movie" value="%3$s"/>' .
										'<table style="width: %1$dpx; height: %2$dpx;"><tr>' .
											'<td class="ac am">' .
												'<a href="http://www.adobe.com/go/getflashplayer" ' .
													'title="Flash Player"><img src="' . $_SERVER['RROOTDIR'] .
													'gfx/getflash.gif" alt="Get Adobe Flash Player"/></a>' .
											'</td>' .
										'</tr></table>' .
									'</object>',
					'end'    => '',
				),
				'i' => array(
					'startp' => '/\[i]/',
					'endp'   => '/\[\/i]/',
					'startf' => '<em>',
					'end'    => '</em>',
				),
				'img' => array(
					'startp' => '/\[img=([^\]]+)](.*?)(?=\[\/img])/s',
					'endp'   => '/\[\/img]/',
					'startf' => '<img src="%1$s" alt="%2$s"/>',
					'end'    => '',
				),
				'ol' => array(
					'ml'     => true,
					'startp' => '/(?<=^|\n)#(?:' . utf8_getws('B') . ')*/',
					'endp'   => '/\n/',
					'startf' => '<ol><li>',
					'end'    => '</li></ol>',
				),
				's' => array(
					'startp' => '/\[s]/',
					'endp'   => '/\[\/s]/',
					'startf' => '<span class="s">',
					'end'    => '</span>',
				),
				'u' => array(
					'startp' => '/\[u]/',
					'endp'   => '/\[\/u]/',
					'startf' => '<span class="u">',
					'end'    => '</span>',
				),
				'ul' => array(
					'ml'     => true,
					'startp' => '/(?<=^|\n)\*(?:' . utf8_getws('B') . ')*/',
					'endp'   => '/\n/',
					'startf' => '<ul><li>',
					'end'    => '</li></ul>',
				),
				'url' => array(
					'startp' => '/\[url=([^\]]+)]/',
					'endp'   => '/\[\/url]/',
					'startf' => '<a href="%1$s">',
					'end'    => '</a>',
				),
			),

			'fixes' => array(
				'/<br\/>\n<br\/>\n/'                         => "</p>\n<p>",
				'/<p>(?:' . utf8_getws() . '|<br\/>)*<\/p>/' => '',
				'/<br\/>(?:' . utf8_getws() . ')*<\/p>/'     => "</p>\n",
				'/<\/([ou]l)>(?:' . utf8_getws() . ')*<\1>/' => '',
			),

			'accurate' => array(
				'/<img src="' . preg_quote($_SERVER['RROOTDIR'], '/') . '([^"]+)"/e' =>
						'"\0" . (($arrImageInfo = @getimagesize($_SERVER[\'LROOTDIR\'] . \'$1\')) ? \' ' .
							'style="width: \' . $arrImageInfo[0] . \'px; height: \' . $arrImageInfo[1] .' .
							' \'px;"\' : \'\')',
			),

			'examples' => array(
				'<strong>[b]</strong>Bold<strong>[/b]</strong>, ' .
					'<strong>[i]</strong>italic<strong>[/i]</strong>, ' .
					'<strong>[u]</strong>underline<strong>[/u]</strong>, ' .
					'<strong>[s]</strong>strike-through<strong>[/s]</strong>'
				=> '[b]Bold[/b], [i]italic[/i], [u]underline[/u], [s]strike-through[/s]',

				'<strong>[color=</strong>red<strong>]</strong>Color text<strong>[/color]</strong>' .
					'<br/><strong>[color=</strong>#003399<strong>]</strong>Color text<strong>[/color]' .
					'</strong>'
				=> '[color=red]Color text[/color]' . NL .
					'[color=#003399]Color text[/color]',

				'<strong>[url]</strong>http://www.example.com<strong>[/url]</strong><br/>' .
					'<strong>[url=</strong>http://www.example.com<strong>]</strong>Sample URL' .
					'<strong>[/url]</strong>'
				=> '[url]http://www.example.com[/url]' . NL .
					'[url=http://www.example.com]Sample URL[/url]',

				'<strong>[email]</strong>user@example.com<strong>[/email]</strong><br/>' .
					'<strong>[email=</strong>user@example.com<strong>]</strong>Sample e-mail link' .
					'<strong>[/email]</strong>'
				=> '[email]user@example.com[/email]' . NL .
					'[email=user@example.com]Sample e-mail link[/email]',

				'<strong>[align=</strong>center<strong>]</strong>Center<strong>[/align]</strong><br/>' .
					'<strong>[align=</strong>right<strong>]</strong>Right-justify<strong>[/align]' .
					'</strong>'
				=> '[align=center]Center[/align]' . NL . '[align=right]Right-justify[/align]',

				'Bulleted list:<br/><strong>*</strong> Item 1<br/><strong>*</strong> Item 2'
				=> 'Bulleted list:' . NL . '* Item 1' . NL . '* Item 2',

				'Numbered list:<br/><strong>#</strong> Item 1<br/><strong>#</strong> Item 2'
				=> 'Numbered list:' . NL . '# Item 1' . NL . '# Item 2',

#				'<strong>[img]</strong>/gfx/cmd_newitem.png<strong>[/img]</strong>'
#				=> '[img]/gfx/cmd_newitem.png[/img]',

#				'<strong>[flash=100x50]</strong>flash.swf<strong>[/flash]</strong>'
#				=> '[flash=100x50]flash.swf[/flash]',
			),
		);
	}


	## See QlModule::get_robots_exclusions().
	#
	public function get_robots_exclusions() {
		return array(
			'/a_',
			'/m_',
		);
	}


	## See QlModule::_get_table_list_items_q().
	#
	protected function _get_table_list_items_q($sTable, $sMatch) {
		global $ql_db, $ql_session;
		switch ($sTable) {
			case 'users':
				$ql_session->require_priv_tokens('USR');
				return array(
					'maintable' => 'users',
					'mainalias' => 'u',
					'id'        => 'id',
					'vlfields'  => 'u.id AS ql_value, ' .
										"IF(fullname != '', CONCAT(name, ' (', fullname, ')'), name) " .
											'AS ql_label',
					'tables'    => 'users AS u',
					'where'     => $sMatch != ''
											? '(IF(' .
													"fullname != '', CONCAT(name, ' (', fullname, ')'), name" .
											  ") LIKE '" . $ql_db->escape($sMatch) . "%')"
											: '',
					'sort'      => array('name' => QL_DB_SORT_STD_ASC),
					'limit'     => 100,
				);

			default:
				return null;
		}
	}


	## See QlModule::handle_request().
	#
	public function handle_request($sUrl, QlResponse $response) {
		# TODO: implementation.
	}


	## See QlModule::handle_static_request(). Responds to requests for existent pre-processed
	# JavaScript, CSS or localization JS files, for any module.
	#
	public function handle_static_request($sUrl, QlResponse $response) {
		# Validate the requested URL.
		if (!preg_match(
			'/^
				# Match the module abbreviation.
				[_0-9a-z]+\/
				# Match and capture “l10n\/js” or other supported pre-processed static file types from a
				# whitelist.
				(?P<dir>l10n\/js|css|js)\/
				# Match and capture the file name extension from a whitelist.
				[^\/]+\.(?P<fnext>css|js)
			$/ADx', $sUrl, $arrMatch
		)) {
			# Don’t know how to serve this file.
			trigger_error('Don’t know how to serve request for “' . $sUrl . '”', E_USER_NOTICE);
			return null;
		}
		# Ensure that the file name extension is the same as the directory containing the file. This
		# disallows explicit requests for the compressed versions of pre-processed files (which have
		# an additional file name extension).
		if (
			$arrMatch['dir'] != $arrMatch['fnext'] &&
			($arrMatch['dir'] == 'l10n/js' && $arrMatch['fnext'] != 'js')
		) {
			trigger_error('File name extension mismatch in “' . $sUrl . '”', E_USER_NOTICE);
			return null;
		}
		global $_APP;
		$sFileName = $_APP['core']['rodata_lpath'] . $sUrl;
		# Check if the file exists before assuming we can respond this request.
		if (!is_file($sFileName) || !is_readable($sFileName)) {
			# Can’t serve this file.
			trigger_error('Can’t serve unreadable file “' . $sFileName . '”', E_USER_NOTICE);
			return null;
		}

		static $arrMimeTypes = array(
			'css' => 'text/css; charset=utf-8',
			'js'  => 'text/javascript; charset=utf-8',
		);

		# Respond to the request. First, check if the client already has a cached version of the file.
		if ($response->use_cache(filemtime($sFileName))) {
			# No need for a response entity.
			$ent = new QlNullResponseEntity($response);
		} else {
			# Provide the file as the entity.
			$ent = new QlStaticResponseEntity($response);
			$ent->set_file($sFileName, $arrMimeTypes[$arrMatch['fnext']], true);
		}
		return $ent;
	}


	## See QlModule::init().
	#
	protected function init() {
		parent::init();
		# The “core” $_APP section is always loaded by QlCoreModule::main_run() before this method is
		# called.
	}


	## Initializes Quearl and processeses the request, generating and sending a response. Does not
	# return.
	#
	public static function main() {
		self::main_init();
		$ent = self::main_run();
		$ent->send_close();
		exit;
	}


	# Initializes the environment for Quearl: enforces required PHP settings, figures out the
	# installation’s directory structure, instantiates QlApplication (loading at least the bootstrap
	# part of the “core” section, which provides more path information), and loads all the configured
	# modules.
	#
	private static function main_init() {
		# Required settings.

		# English only please; we handle all localization ourselves.
		setlocale(LC_ALL, 'C');
		# Only output valid XHTML (“&” needs to be escaped using the “&amp;” entity reference).
		ini_set('arg_separator.output',    '&amp;');
		# Show all errors and warnings. We don’t actually “show” them; we’ll log them instead.
		ini_set('error_reporting',         E_ALL | E_STRICT);
		# These two settings are used by ql__errorfilter_obhandler() to locate, log and hide errors.
		ini_set('error_prepend_string',    '<ql:error>');
		ini_set('error_append_string',     '</ql:error>');
		# Don’t format errors using HTML tags; plain text is better for logging.
		ini_set('html_errors',             0);
		# Please don’t touch our quotes.
		ini_set('magic_quotes_runtime',    0);
		# We manage our internal buffers, so always flush after echo.
		ini_set('implicit_flush',          1);
		# URI attributes where we want the SID to be injected.
		ini_set('url_rewriter.tags',       'a=href,area=href,iframe=src,input=src,fieldset=');
		# We handle output compression ourselves whenever accepted by the remote client.
		ini_set('zlib.output_compression', 0);
		@apache_setenv('no-gzip',          1);
		# Without this, file/FTP-related functions (even ftp_mdtm() that should really be UTC-only!)
		# will return timestamps offset according to the timezone.
		date_default_timezone_set('UTC');

		# These settings are also required, but they can’t be set via code.

		# We manage our internal buffers.
		#ini_set('output_buffering', 0);
		#ini_set('output_handler',   '');
		# Don’t help remote variable injection.
		#ini_set('register_globals', 0);
		# More of a personal preference…
		#ini_set('short_open_tag',   0);

		# Undo silly magic_quotes.
		if (get_magic_quotes_gpc()) {
			ql_array_stripslashes($_GET);
			ql_array_stripslashes($_POST);
			ql_array_stripslashes($_COOKIE);
		}

		# Enables logging errors to the log file, and their removal from the output.
		set_error_handler('ql__errorhandler');
		ob_start('ql__errorfilter_obhandler');

		# Remote/local paths variables overview:
		#
		#    DOCUMENT_ROOT   (not standard)
		#    PATH_INFO                                               /with/some/url
		#    PHP_SELF                    /quearl/module/core/main.php/with/some/url
		#    REQUEST_URI                                             /with/some/url?test&s=1
		#    SCRIPT_FILENAME /var/wwwroot/quearl/module/core/main.php
		#    SCRIPT_NAME                 /quearl/module/core/main.php
		#    __FILE__        /var/wwwroot/quearl/module/core/main.php
		#
		# Other variables:
		#
		#    GATEWAY_INTERFACE    CGI/1.1
		#    HTTP_ACCEPT          text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
		#    HTTP_ACCEPT_LANGUAGE it-IT,it;q=0.8,en-US;q=0.5,en;q=0.3
		#    HTTP_ACCEPT_ENCODING gzip, deflate
		#    HTTP_CACHE_CONTROL   max-age=0
		#    HTTP_CONNECTION      keep-alive
		#    HTTP_HOST            www.quearl.dankerd.local:8008
		#    PATH_INFO            (see above)
		#    PATH_TRANSLATED      (not useful)
		#    PHP_SELF             (see above)
		#    QUERY_STRING         test&s=1
		#    REDIRECT_STATUS      200
		#    SCRIPT_FILENAME      (see above)
		#    SCRIPT_NAME          (see above)
		#    SERVER_ADDR          ::1
		#    SERVER_ADMIN         webmaster@example.com
		#    SERVER_NAME          www.quearl.dankerd.local
		#    SERVER_PORT          8008
		#    SERVER_PROTOCOL      HTTP/1.1
		#    SERVER_SOFTWARE      Apache
		#    REMOTE_ADDR          ::1
		#    REMOTE_PORT          47305
		#    REQUEST_METHOD       GET
		#    REQUEST_TIME         1378436512
		#    REQUEST_URI          (see above)

		# Root directory of this installation, according to the server (default is “…/quearl/”).
		$_SERVER['LROOTDIR'] = substr(
			__FILE__, 0, -31 /*-strlen('module/core/main-coremodule.php')*/
		);
		# Path of the current script, relative to LROOTDIR. Does not include the first directory,
		# which is assumed to be the installation directory (default “quearl”), nor a leading path
		# separator.
		$_SERVER['LFILEPATH'] = preg_replace('/^[\\/]?[^\\/]+[\\/]/', '', $_SERVER['SCRIPT_NAME']);

		# The above two variables are enough to create the QlApplication instance $ql_app. Note that
		# this implicitly loads at least the bootstrap part of the “core” $_APP section (if not the
		# entire persisted $_APP from a previous execution).
		new QlApplication();

		global $_APP;
		# Root directory of this installation, according to the remote client.
		$_SERVER['RROOTDIR'] = $_APP['core']['root_rpath'];
		# Path of the current document, relative to RROOTDIR. Does not include a leading path
		# separator.
		$_SERVER['RFILEPATH'] = substr($_SERVER['PATH_INFO'], strlen($_SERVER['RROOTDIR']));

		# Absolute path of this URL, according to the remote client.
		$_SERVER['RFULLPATH'] = ql_path_join($_SERVER['RROOTDIR'], $_SERVER['PATH_INFO'], '/');
		# Like RFULLPATH, but may include “fixed” query string parameters (e.g. doc?id=927), which
		# will be set at a later point.
		$_SERVER['RFULLPATHQ'] = $_SERVER['RFULLPATH'];

		# Load all the modules.
		foreach ($_APP['core']['load_modules'] as $sModule) {
			if ($sModule == 'core') {
				# We don’t need to include anything for the “core” module, just instantiate it.
				new QlCoreModule();
			} else {
				# This should also instantiate the module’s QlModule-derived class, if it has one.
				require_once '../' . $sModule . '/main.php';
			}
		}
	}


	# Quearl execution stage: adds a few useful variables to $_SERVER, possibly responds to HTTP
	# requests for static files; sets up a database connection, authenticates the user, initializes
	# all modules, and responds the HTTP request.
	#
	# QlResponseEntity return
	#    Generated response entity.
	#
	private static function main_run() {
		# Notice that this variable is a reference, so it will stay up-to-date.
		$arrModules =& QlModule::get_loaded_modules();


		# Protocol through which this request was made (http or https).
		if (
			isset($_SERVER['HTTPS']) &&
			(strtolower($_SERVER['HTTPS']) == 'on' || $_SERVER['HTTPS'] == '1')
		) {
			$_SERVER['HTTP_PROTOCOL'] = 'https://';
		} else {
			$_SERVER['HTTP_PROTOCOL'] = 'http://';
		}

		# REMOTE_REAL_ADDR will be the most local IP address that originated the request, excluding
		# proxies and other middle tiers. Defaults to a fake address.
		$_SERVER['REMOTE_REAL_ADDR'] = '0.0.0.255';
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
					$_SERVER['REMOTE_REAL_ADDR'] = $sIP;
					break;
				//}
			}
		}

		# Make sure we do have an HTTP_USER_AGENT key; some code relies on it being a string.
		if (!isset($_SERVER['HTTP_USER_AGENT'])) {
			$_SERVER['HTTP_USER_AGENT'] = '';
		}

		# Parse the compression methods accepted by the remote client; some code relies on this being
		# an array.
		if (isset($_SERVER['HTTP_ACCEPT_ENCODING'])) {
			$_SERVER['HTTP_ACCEPT_ENCODING'] =& ql_parse_rfc2616_accept_field(
				$_SERVER['HTTP_ACCEPT_ENCODING']
			);
		} else {
			# Assume only “identity” is acceptable.
			$_SERVER['HTTP_ACCEPT_ENCODING'] = array('identity' => 1.0);
		}


		# Initialize the response object.
		$response = new QlResponse();

		# If this server is also serving static files (see [DESIGN_5015 Static files]) and…
		global $_APP;
		if (
			$_APP['core']['static_host'] == '' ||
			$_APP['core']['static_host'] == $_SERVER['HTTP_HOST']
		) {
			# …the requested URL is in the static files directory…
			if (strncmp(
				$_SERVER['REQUEST_URI'],
				$_APP['core']['static_root_rpath'],
				strlen($_APP['core']['static_root_rpath'])
			) == 0) {
				# …ask each module to serve this requested static file.
				$sUrl = substr($_SERVER['REQUEST_URI'], strlen($_APP['core']['static_root_rpath']));
				foreach ($arrModules as $module) {
					$ent = $module->handle_static_request($sUrl, $response);
					# Unlike regular responses, static responses are handled in full by a single module,
					# so if this module instantiated a response entity, stop now.
					if ($ent) {
						return $ent;
					}
				}
				# If we’re still here, no module knows how to respond to the request for this URL as a
				# static resource. Fall through to let them process this as a request for a regular
				# resource.
			}
		}


		# Load the rest of the “core” $_APP, section, which we need before we can continue. Other
		# modules will do this in their init() method.
		global $ql_app;
		$arrSection =& $ql_app->load_section('core');
		if ($arrSection !== false) {
			# Convert every non-string entry.
			settype($arrSection['session_gc_max_idle'       ], 'int');
			settype($arrSection['session_gc_probability'    ], 'int');
			settype($arrSection['session_gc_divisor'        ], 'int');
			settype($arrSection['session_autologin_lifetime'], 'int');
			$arrSection['installed_locales'] = preg_split(
				'/\s*,\s*/', $arrSection['installed_locales'], 0, PREG_SPLIT_NO_EMPTY
			);
			$arrDefaultLanguageLocales = array();
			foreach (preg_split(
				'/\s*,\s*/', $arrSection['default_language_locales'], 0, PREG_SPLIT_NO_EMPTY
			) as $sPair) {
				$arrMatch = explode('=', $sPair, 2);
				$arrDefaultLanguageLocales[$arrMatch[0]] = $arrMatch[1];
			}
			$arrSection['default_language_locales'] =& $arrDefaultLanguageLocales;
			unset($arrDefaultLanguageLocales);
			$ql_app->merge_section('core', $arrSection);
		}
		unset($arrSection);

		# More settings.
		if (!empty($_APP['core']['default_email_sender'])) {
			ini_set(
				'sendmail_from', $_APP['core']['default_email_sender'] . '@' . $_APP['core']['domain']
			);
		}


		# Find out what we’re up to.
		global $ql_sAction;
		$ql_sAction = @$_POST['a'];
		if ($ql_sAction === null) {
			$ql_sAction = @$_GET['a'];
			if ($ql_sAction === null) {
				$ql_sAction = '';
			}
		}
		# Check if both a GET “s” session ID and a SID cookie were passed for a non-asynchronous
		# request, and in that case redirect to this same URL to get rid of the unnecessary GET “s”
		# variable.
		if (isset($_GET['s']) && isset($_COOKIE['s']) && strncmp($ql_sAction, 'ar_', 3) != 0) {
			ql_refresh();
		}

		# (DEPRECATED) Static arrays.
		global $ql_arrStatic;
		$ql_arrStatic = array();

		# Extract the locale from the URL, if possible.
		$sRequestLocale = null;
		if (preg_match(
			'/^\/(?P<locale>[a-z]{2}-[a-z]{2})(?:\/|$)/AD', $_SERVER['REQUEST_URI'], $arrMatch
		)) {
			$sRequestLocale = $arrMatch['locale'];
		}

		try {
			# Establish the main database connection.
			global $ql_db, $_APP;
			$ql_db = new QlDb(
				$_APP['core']['database_host'],
				$_APP['core']['database_username'],
				$_APP['core']['database_password']
			);
			$ql_db->select_database($_APP['core']['database_name']);

			# This try block allows the code within to throw the QlNullResponseEntity instance
			# generated by QlResponse::redirect(). Other exceptions will still get to the outer block.
			try {
				# Create the QlSession object.
				new QlSession();
			} catch (QlNullResponseEntity $entRedirect) {
				# Use this as the final response entity.
				return $entRedirect;
			}

			# Select a locale for this request (and session, possibly).
			if (
				$sRequestLocale !== null &&
				array_search($sRequestLocale, $_APP['core']['installed_locales'], true)
			) {
				# The link-specified language has the highest priority.
				$_SESSION['ql_locale'] = $sRequestLocale;
			}
			if (empty($_SESSION['ql_locale'])) {
				# The user (if logged in at all) has no locale preference, and the URL they’re visiting
				# doesn’t specify a locale either. Try to detect the locale in some other way.
				$_SESSION['ql_locale'] = QlSession::detect_locale();

				# If the URL specified a language that we couldn’t use (typo in the URL?), or no
				# language was specified at all (e.g. accessing the web site root, “/”), redirect to the
				# root specific to the locale we just detected.
				if ($sRequestLocale !== $_SESSION['ql_locale']) {
					return $response->redirect($_SERVER['RROOTDIR'] . $_SESSION['ql_locale'] . '/');
				}
			}
			echo $_SESSION['ql_locale'] . '<br/>ALL OK';
			exit;

			# This is the earliest point at which a logout can be performed.
			global $ql_sAction;
			if ($ql_sAction == 'logout') {
				global $ql_session;
				$ql_session->logout();
				ql_refresh();
			}

			# Initialize all loaded modules. This non-foreach loop allows new modules to be inserted
			# while we’re iterating on it.
			for (reset($arrModules); $sName = key($arrModules); next($arrModules)) {
				$arrModules[$sName]->init();
			}

			# Search for a module to handle this request. $ent is guaranteed to be non-null after the
			# loop, since QlCoreModule will always return an entity, acting as fall-back module.
			$ent = null;
			foreach ($arrModules as $module) {
				$ent = $module->handle_request('???', $response);
				# If the module instantiated a response entity, no need to iterate any further.
				if ($ent) {
					break;
				}
			}

			if ($ent instanceof QlXhtmlResponseEntity) {
				# Let modules expand the response’s <head> and HTTP header. Basic modules should add
				# their scripts before their dependant modules, so iterate over $arrModules backwards.
				$module = end($arrModules);
				do {
					$module->augment_response_head('', $response, $ent);
				} while ($module = prev($arrModules));

				# Let modules augment the response’s <body>. Iterate in the usual most-specialized-to-
				# most-basic module order, allowing basic modules to provide defaults for what more
				# specialized modules did not add.
				foreach ($arrModules as $module) {
					$module->augment_response_body('', $response, $ent);
				}
			}
		} catch (QlErrorResponse $er) {
			if (!defined('L10N_CORE_L10N_INCLUDED')) {
				# The module hasn’t been localized yet, do it now. If the locale hasn’t been determined
				# yet, attempt an automatic detection.
				if (!isset($_SESSION['ql_locale'])) {
					if (empty($_SESSION)) {
						$_SESSION = array();
					}
					$_SESSION['ql_locale'] = QlSession::detect_locale();
				}
				QlModule::get('core')->localize();
			}

			# Create the error response entity, replacing any other entity we might have generated.
			$ent = $er->create_entity($response);
		}

		# Response entities can begin sending data during the loop above; for all other responses,
		# make sure now that the response headers and data are sent.
		return $ent;
	}
}

?>
