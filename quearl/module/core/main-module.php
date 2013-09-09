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

# Module base class.


define('QUEARL_CORE_MAIN_MODULE_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Classes


## Interface for Quearl modules.
#
abstract class QlModule {

	## Loaded and registered modules.
	public static /*array<string => QlModule>*/ $sm_arrModules = array();
	## Module’s directory, guaranteed to have a trailing path separator..
	protected /*string*/ $m_sModuleDir;
	## Module’s read-only data directory, guaranteed to have a trailing path separator.
	protected /*string*/ $m_sRODataDir;


	## Constructor.
	#
	public function __construct() {
		self::$sm_arrModules[$this->abbr()] = $this;
		$sAbbr = $this->abbr();
		$this->m_sModuleDir = $_SERVER['LROOTDIR'] . 'module/' . $sAbbr . '/';
		global $_APP;
		$this->m_sRODataDir = $_APP['core']['rodata_lpath'] . $sAbbr . '/';
	}


	## Returns the abbreviation for this module.
	#
	# string return
	#    Module name abbreviation.
	#
	public abstract function abbr();


	## Gives the module the possibility to add data to a response.
	#
	# string $sUrl
	#    Request being handled.
	# QlResponse $response
	#    Response for the request.
	# QlXhtmlResponseEntity $ent
	#    Instance of a QlResponseEntity-derived class being used to generate the response entity.
	#
	public function augment_response_body($sUrl, QlResponse $response, QlXhtmlResponseEntity $ent) {
	}


	## Gives the module the possibility to add data to a response.
	#
	# string $sUrl
	#    Request being handled.
	# QlResponse $response
	#    Response for the request.
	# QlXhtmlResponseEntity $ent
	#    Instance of a QlResponseEntity-derived class being used to generate the response entity.
	#
	public function augment_response_head($sUrl, QlResponse $response, QlXhtmlResponseEntity $ent) {
	}


	## Displays an error page for issues detected very early during the initialization of Quearl or
	# one of its modules. The error page is a template, which will be sent as a response to the
	# browser along with any optional HTTP headers. This method does not return.
	#
	# This may be called before $ql_session or $ql_db are available, and will work even in case
	# $ql_app was defaulted.
	#
	# string $sTemplateName
	#    Name of the “page” template to be used.
	# [array<mixed> $arrVars]
	#    Array or array-of-arrays; either way, the leaf elements maps substitution variables with
	#    their names. Localization constants can only be sourced from the core module.
	# [array<string => mixed> $arrHeaders]
	#    Map of HTTP headers (name => value) to be sent as part of the response.
	# [string $sLocale]
	#    Locale to be used to decide which template localization to load; see the $sLocale argument
	#    for QlModule::get_template_filename().
	#
	public function early_error_response(
		$iHttpStatus, $sTemplateName, array $arrVars = array(), array $arrHeaders = array(),
		$sLocale = null
	) {
		if (!defined('L10N_CORE_L10N_INCLUDED')) {
			# The core module hasn’t been localized yet; do it with the specified locale.
			# Make sure that we do have a specified locale, though.
			if ($sLocale === null) {
				$sLocale = QlSession::detect_locale();
			}
			QlModule::get('core')->localize($sLocale);
		}

		# Create the response.
		$response = new QlResponse();
		$response->set_http_status($iHttpStatus);
		# Output the headers.
		foreach ($arrHeaders as $sName => &$mValue) {
			$response->set_header_field($sName, $mValue);
		}

		# Create a minimal entity for the response.
		$ent = new QlXhtmlResponseEntity($response, $sLocale);
		$ent->set_subtitle(L10N_CORE_ERR_DBUNAVAIL_TITLE);
		# Generate the page contents from the template.
		$ent->add_body($this->load_template('page', $sTemplateName, $arrVars, $sLocale));
		# Display the page, then abort.
		$ent->send_close();
		exit;
	}


	## Returns a loaded QlModule instance given its abbreviation.
	#
	# string $sAbbr
	#    Module name abbreviation.
	# QlModule return
	#    Requested module.
	#
	public static function get($sAbbr) {
		return self::$sm_arrModules[$sAbbr];
	}


	## Returns all loaded Quearl modules.
	#
	# array<string => QlModule>& return
	#    Loaded modules.
	#
	public static function & get_loaded_modules() {
		return self::$sm_arrModules;
	}


	## Returns the privilege token names provided by this module, mapped to their descriptions.
	#
	# array<string => string> return
	#   Privilege tokens and their descriptions.
	#
	public function get_privilege_tokens() {
		return array();
	}


	## Returns QuearlTags provided by this module.
	#
	# array<string => array<string => mixed>> return
	#    Tag info.
	#
	public function get_qlt() {
		return array();
	}


	## Returns an array containing URLs robots should not try to access (as patterns conforming to
	# robots.txt).
	#
	# array<int => string> return
	#    URLs to be included in robots.txt.
	#
	public function get_robots_exclusions() {
		return array();
	}


	## Returns an array containing Sitemap info for the URLs handled by this module.
	#
	# array<int => mixed> return
	#   Sitemap info.
	#
	public function get_site_map() {
		return array();
	}


	## Returns SQL fragments to generate queries on a specified table.
	#
	# string $sTable
	#    Table name.
	# [string $sMatch]
	#    Filter on the “ql_label” field.
	# [array<int => array<string, string, string>> $arrFilters]
	#    Filters for other fields, in the format array(field name, operator, value).
	# array<string => string> return
	#    Query fragments.
	#
	public function & get_table_list_items_q($sTable, $sMatch = '', array $arrFilters = array()) {
		global $ql_db;
		$arrQ = $this->_get_table_list_items_q($sTable, $sMatch);
		if ($arrQ) {
			if ($arrFilters) {
				if ($arrQ['where'] !=  '') {
					$arrQ['where'] .= ' AND ';
				}
				$arrWhereClauses = array();
				foreach ($arrFilters as $sFieldName => &$arrFilter) {
					if (strpos($sFieldName, '.') === false) {
						$sFieldName = $arrQ['mainalias'] . '.' . $sFieldName;
					}
					$arrWhereClauses[$sFieldName] = array(
						$arrFilter[0],
						$arrFilter[0] == 'lk' || $arrFilter[0] == 'nl'
							? QlDbConnection::pcre_to_like($arrFilter[1])
							: $arrFilter[1],
					);
				}
				$arrQ['where'] .= $ql_db->where_clauses_to_string($arrWhereClauses);
			}
		}
		return $arrQ;
	}


	## Returns an array of query components to be used in calls to QlDbConnection::query_item_list()
	# for a specified table.
	#
	# string $sTable
	#    Table name.
	# string $sMatch
	#    Filter on the “ql_label” field.
	# array<string => mixed> return
	#    Query components.
	#
	protected function _get_table_list_items_q($sTable, $sMatch) {
		return null;
	}


	## Returns the name of a template file from this module. If a version of the template is
	# available for the current session’s locale, its file name is returned; otherwise the name of
	# the template for default locale will be returned. If the template is not available in any
	# locale, the returned file name will be the template name with its type as the file name
	# extension.
	#
	# string $sType
	#    Template type (which is also the file name extension).
	# string $sName
	#    Template name (which is the stem of the file name).
	# [string $sLocale]
	#    Desired locale; defaults to the current locale for this session.
	# string return
	#    Template file name.
	#
	protected function get_template_filename($sType, $sName, $sLocale = null) {
		if ($sLocale === null) {
			$sLocale = $_SESSION['ql_locale'];
		}
		$sFileNameBase = $this->m_sModuleDir . 'template/' . $sName;

		# First attempt: template localized for the provided/session locale.
		$sUserL10nFileName = $sFileNameBase . '.l10n_' . $sLocale . '.' . $sType;
		if (file_exists($sUserL10nFileName)) {
			return $sUserL10nFileName;
		}
		# Second attempt: template localized for the default locale.
		global $_APP;
		$sDefL10nFileName = $sFileNameBase . '.l10n_' . $_APP['core']['default_locale'] . '.' .
								  $sType;
		if (file_exists($sDefL10nFileName)) {
			return $sDefL10nFileName;
		}
		# Third and last attempt: non-localized (locale-neutral) template.
		$sL10nNeutralFileName = $sFileNameBase . '.' . $sType;
		if (file_exists($sL10nNeutralFileName)) {
			return $sL10nNeutralFileName;
		}

		# Log an error, showing the file names that were checked for.
		ql_log(
			'E_USER_ERROR',
			'Template not found: ' . $sName . ' (type: ' . $sType .
				($sLocale ? ', locale: ' . $sLocale : '') . ')',
			ql_logdumpvars(array(
				'$sUserL10nFileName'    => $sUserL10nFileName,
				'$sDefL10nFileName'     => $sDefL10nFileName,
				'$sL10nNeutralFileName' => $sL10nNeutralFileName,
			))
		);
		return false;
	}


	## Gives the module the possibility to instantiate a response for the specified request. If the
	# module won’t handle the request, it must return null.
	#
	# string $sUrl
	#    Requested URL.
	# QlResponse $response
	#    Response for the request.
	# QlResponseEntity return
	#    Instance of a QlResponseEntity-derived class to be used to generate the response entity, or
	#    null if the module does not handle the specified request.
	#
	public function handle_request($sUrl, QlResponse $response) {
		return null;
	}


	## Gives the module the possibility to instantiate a response for the specified request for a
	# static file. If the module won’t handle the request, it must return null.
	#
	# Note: this method is called before QlModule::init(), so extra attention must be made to avoid
	# trying to access resources that are not yet available (e.g. QlDbConnection, QlSession).
	#
	# string $sUrl
	#    Requested URL.
	# QlResponse $response
	#    Response for the request.
	# QlResponseEntity return
	#    Instance of a QlResponseEntity-derived class to be used to generate the response entity, or
	#    null if the module does not handle the specified request.
	#
	public function handle_static_request($sUrl, QlResponse $response) {
		return null;
	}


	## Initializes the module. Invoked after the “core” module has been loaded and instances of
	# QlApplication ($_APP) and QlSession ($_SESSION) exist, and the locale ($_SESSION['ql_locale'])
	# is set.
	#
	protected function init() {
		$this->localize();
	}


	## Loads a template, applying substitutions according to the provided arguments.
	#
	# TODO: document the format and the way this works!
	#
	# string $sType
	#    Template type (same as the file name extension).
	# string $sName
	#    Template name.
	# [array<mixed> $arrVars]
	#    Array or array-of-arrays; either way, the leaf elements maps substitution variables with
	#    their names.
	# [string $sLocale]
	#    Desired locale; defaults to the current locale for this session.
	# string return
	#    Template contents.
	#
	public function load_template($sType, $sName, array $arrVars = array(), $sLocale = null) {
		static $arrLoadedTemplates = array();
		if (isset($arrLoadedTemplates[$sType][$sName])) {
			$s = $arrLoadedTemplates[$sType][$sName];
		} else {
			$sFileName = $this->get_template_filename($sType, $sName, $sLocale);
			if ($sFileName === false) {
				return false;
			}
			$s = file_get_contents($sFileName);
			if ($s === false) {
				return false;
			}
			$arrLoadedTemplates[$sType][$sName] = $s;
		}
		if (!isset($arrVars[0]) || !is_array($arrVars[0])) {
			$arrVars = array($arrVars);
		}
		return QlModule::template_subst($s, $arrVars);
	}


	## Loads the localization file for the module.
	#
	# TODO: document how this works.
	#
	public function localize($sLocale = null) {
		if ($sLocale == null) {
			$sLocale = $_SESSION['ql_locale'];
		}
		require $this->m_sRODataDir . 'l10n/php/' . $sLocale . '.l10n.php';
	}


	## Performs substitutions in a template.
	#
	# Replacements can be specified as:
	# “$$Var_Name$$”   A double-dollar-enclosed mixed-case string will be treated as a variable
	#                  substitution, and replaced with the corresponding value in $arrVars.
	# “$$CONST_NAME$$” A double-dollar-enclosed uppercase string will be interpreted as a constant
	#                  name (which includes localization constants), and will be replaced with the
	#                  value of the constant.
	#
	# string $s
	#    Template contents.
	# array<int => array<string => string>>& $arrVars
	#    Array of variable => value mappings.
	# string return
	#    Resulting string.
	#
	public static function template_subst($s, array& $arrVars) {
		# This regexp will capture each substitution. If a match has a “lower” (which is also captured
		# by “name”), “name” must be a reference to a variable; otherwise “name” is the name of a
		# constant.
		if (preg_match_all(
			'/\$\$(?P<name>[_0-9A-Za-z]*?(?P<lower>[a-z])?[_0-9A-Za-z]*?)(?::(?P<indent>\d+))?\$\$/',
			$s, $arrMatches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE
		)) {
			# Iterate backwards to avoid messing up with the offsets captured by preg_match_all().
			for ($arrMatch = end($arrMatches); $arrMatch; $arrMatch = prev($arrMatches)) {
				$sName = $arrMatch['name'][0];
				$sRepl = null;
				# If we have lowercase letters, it’s a variable.
				if (isset($arrMatch['lower'][0])) {
					# For each of the mappings, check if such variable exists.
					for ($i = 0; $i < count($arrVars); ++$i) {
						if (isset($arrVars[$i][$sName])) {
							# Variable found in this mapping.
							$sRepl = $arrVars[$i][$sName];
							break;
						}
					}
				} else {
					# Constant.
					$sRepl = constant($sName);
				}

				if ($sRepl !== null) {
					# Apply the specified indentation, if any.
					if (!empty($arrMatch['indent'][0])) {
						$sRepl = rtrim(ql_indent((int)$arrMatch['indent'][0], $sRepl . NL));
					}
					# Insert the replacement in the original string.
					$s  = substr($s, 0, $arrMatch[0][1]) .
							$sRepl .
							substr($s, $arrMatch[0][1] + strlen($arrMatch[0][0]));
				}
			}
		}
		return $s;
	}
}

?>
