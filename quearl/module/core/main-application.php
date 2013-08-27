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

# Definition of the application class. Same prerequisite constraints as main.inc.php.


define('QUEARL_CORE_MAIN_APPLICATION_INCLUDED', true);

# This is just an explicit dependency declaration; were it not for require_once, this would be a
# circular dependency.
require_once 'main.inc.php';



####################################################################################################
# Classes


## Manages the application (cross-session) data, stored in $_APP.
#
class QlApplication {

	## Persistent storage file name.
	public /*string*/ $m_sFileName;
	## Name of the locking file.
	public /*string*/ $m_sLockFileName;
	## Handle to the locking file (if open).
	public /*resource*/ $m_fileLock;
	## Number of locks held by this instance.
	public /*int*/ $m_cLocks;
	## Size of $_APP’s persistent storage.
	public /*int*/ $m_cb;
	## CRC of $_APP’s persistent storage.
	public /*int*/ $m_iCRC;
	## Style sections.
	public /*array*/ $m_arrStyleSections = array();


	## Constructor.
	#
	public function __construct() {
		# Create a default $_APP array loading only core.conf, which is necessary to successfully call
		# read().
		$this->merge_section(
			'core', ql_php_get_array_file_contents($_SERVER['LROOTDIR'] . 'config/core/module.conf')
		);

		global $_APP;
		$this->m_sFileName = $_APP['core']['rwdata_lpath'] . 'core/app.dat';
		$this->m_sLockFileName = $_APP['core']['lock_lpath'] . 'app.dat.lock';
		$this->m_cLocks = 0;
		# Set size and CRC to provide a never-matching reference for QlApplicaion::unlock().
		$this->m_cb = 0;
		$this->m_iCRC = 0;

		# Try and load from persistent storage.
		$this->reload();

		$GLOBALS['ql_app'] = $this;
	}


	## Destructor.
	#
	public function __destruct() {
		if ($this->m_cLocks > 0) {
			# Cheat on the number of locks to force writing to persistent storage.
			$this->m_cLocks = 1;
			$this->unlock();
		}
		unset($GLOBALS['ql_app'], $GLOBALS['_APP']);
	}


	## Returns an array with all the style sections loaded thus far.
	#
	# array<array<string => string>> return
	#    Array of style sections.
	#
	public function & get_style_sections() {
		return $this->m_arrStyleSections;
	}


	## Loads a $_APP section from a config file. See QlApplication::merge_section() for details on
	# how the section’s contents are processed.
	#
	# string $sSection
	#    $_APP section to be loaded.
	# string $sFileName
	#    Path of the file to load.
	# [bool $bForce]
	#    If true, the section will be reloaded even if it hasn’t changed since the last loading.
	# bool return
	#    true if the section was loaded as a result of this call, or false if loading was not
	#    necessary.
	#
	public function load_section($sSection, $sFileName, $bForce = false) {
		global $_APP;
		$bLoad = $bForce || (int)@$_APP[$sSection]['__ql_mtime'] < filemtime($sFileName);
		if ($bLoad) {
			$this->lock();
			$this->merge_section($sSection, ql_php_get_array_file_contents($sFileName));
			$_APP[$sSection]['__ql_mtime'] = filemtime($sFileName);
			$this->unlock();
		}
		return $bLoad;
	}


	## Serializes access to $_APP. Does not return on error.
	#
	public function lock() {
		if ($this->m_cLocks == 0) {
			$cRetries = 15;
			do
				$this->m_fileLock = fopen($this->m_sLockFileName, 'ab');
			while (!$this->m_fileLock && --$cRetries && (sleep(1) || true));
			if (!$cRetries)
				# Number of attempts exhausted.
				trigger_error('Unable to acquire application lock', E_USER_ERROR);
			flock($this->m_fileLock, LOCK_EX);
			# Make sure that $_APP is up to date.
			$this->reload();
		}
		++$this->m_cLocks;
	}


	## Merges a $_APP section. If the section has been loaded before, this will overwrite any values
	# with those specified in the file for each given key; keys assigned to null in the file will
	# cause the corresponding key in the $_APP section to be deleted. Keys not present in $arrNew
	# will remain unaffected.
	#
	# If the section name ends in “-style”, the section will also be stored to a separate array of
	# style sections, obtainable by calling QlApplication::get_style_sections().
	#
	# string $sSection
	#    Name of the $_APP section to be loaded.
	# array<string => mixed> $arrNew
	#    New section contents.
	#
	protected function merge_section($sSection, array $arrNew) {
		global $_APP;
		$bIsCss = (substr($sSection, -6) == '-style');
		if (!isset($_APP[$sSection]))
			$_APP[$sSection] = array();
		$arrSection =& $_APP[$sSection];
		$arrSection = $arrNew + $arrSection;
		foreach ($arrNew as $sVar => $sValue)
			if ($sValue === null)
				# This value must be removed.
				unset($arrSection[$sVar]);
			else if (substr($sVar, -6) == '_lpath')
				# Make local paths absolute.
				$arrSection[$sVar] = $_SERVER['LROOTDIR'] . $sValue;
			else if ($bIsCss && strncmp($sVar, 'XHTML', 5) == 0)
				# Style XHTML fragments in this style section.
				$arrSection[$sVar] = preg_replace(
					'/(\r?\n|\r)\t*/', ' ', ql_template_subst($sValue, $this->m_arrStyleSections)
				);
		if ($bIsCss)
			$this->m_arrStyleSections[$sSection] =& $arrSection;
	}


	## Reads $_APP from persistent storage. Other than being invoked when $ql_app is constructed, it
	# can be called at any time to reload $_APP, which can be useful for scripts that need to make
	# sure they’re using the latest $_APP after running for an extended amount of time.
	#
	# bool return
	#    true if $_APP was loaded from persistent storage, or false if the latter was unavailable, in
	#    which case $_APP is unaffected.
	#
	private function reload() {
		# Try and read from persistent storage.
		$s = @file_get_contents($this->m_sFileName);
		if ($s) {
			# Keep a backup of the current $_APP, so we can restore it in case something goes wrong.
			$arrApp = @unserialize($s);
			if ($arrApp !== false) {
				# A valid array was loaded; overwrite $_APP with that.
				$GLOBALS['_APP'] =& $arrApp;
				# Recalculate size and CRC for later.
				$this->m_cb = strlen($s);
				$this->m_iCRC = crc32($s);
				return true;
			}
		}
		# Something went wrong.
		# TODO: also e-mail an administrator?
		ql_log(
			'E_USER_WARNING',
			'Application data ' . ($s === false ? 'missing' : 'corrupt') . ', defaults loaded!',
			'<pre>' . ql_lenc($s) . '</pre>'
		);
		return false;
	}


	## Leaves the serialized context started with QlApplication::lock().
	#
	public function unlock() {
		global $_APP;
		if ($this->m_cLocks == 1) {
			# Recalculate size and CRC of the serialized $_APP; if different, we’ll need to update the
			# persistent storage.
			$s = serialize($_APP);
			$cb = strlen($s);
			$iCRC = crc32($s);
			if ($this->m_cb != $cb || $this->m_iCRC != $iCRC) {
				$this->m_cb = $cb;
				$this->m_iCRC = $iCRC;
				file_put_contents($this->m_sFileName, $s);
			}
			fclose($this->m_fileLock);
			$this->m_fileLock = null;
		}
		--$this->m_cLocks;
	}
}

?>
