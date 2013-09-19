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

# Definition of the application class. Same prerequisite constraints as main.php.


define('QUEARL_CORE_MAIN_APPLICATION_INCLUDED', true);

# This is just an explicit dependency declaration; were it not for require_once, this would be a
# circular dependency.
require_once 'main.php';



####################################################################################################
# Classes


## DESIGN_8261 QlApplication
#
# QlApplication stores any non-session-specific data, from the most essential (e.g. Quearl core
# directories) to the most frivolous (e.g. color theme configuration).
#
# Every HTTP request requires QlApplication to be available in order to be handled, so the singleton
# instance is made available as early as possible; QlApplication is instantiated even before
# QlCoreModule.
#
# Due to the number of configuration files that need to be loaded and parsed for each module to set
# up its own $_APP section, QlApplication is always persisted to disk, ready to be reloaded on every
# HTTP request. The most typical code path (persisted status available and successfully loaded) must
# read and process the smallest number of configuration files and entries as possible before the
# persisted state is reloaded; this minimal subset of the “core” section is called bootstrap, and
# it’s loaded from config/core/bootstrap.conf in QlApplication::__construct().
#
# If reloading from persistent state succeeds, the persisted data will replace everything, including
# the bootstrapped “core” section, since that’s included in the persisted data anyway.
#
# In case of load failure (which includes every execution before the first request for a non-static
# file is served), QlApplication will adjust the bootstrapped “core” section, and Quearl will
# subsequently let each module (including the “core” module) load its own section, eventually
# leading to a fully loaded QlApplication instance, which will then be persisted when the execution
# of Quearl comes to an end.

## Manages the application (cross-session) data, stored in $_APP.
#
class QlApplication {

	## Persistent storage file name.
	private /*string*/ $m_sFileName;
	## Name of the locking file.
	private /*string*/ $m_sLockFileName;
	## Handle to the locking file (if open).
	private /*resource*/ $m_fileLock;
	## Number of locks held by this instance.
	private /*int*/ $m_cLocks;
	## Size of $_APP’s persistent storage.
	private /*int*/ $m_cb;
	## CRC of $_APP’s persistent storage.
	private /*int*/ $m_iCRC;
	## true if reloading $_APP from persistent storage didn’t succeed.
	private /*int*/ $m_bDefaulted;


	## Constructor.
	#
	public function __construct() {
		# Create a default $_APP array loading only bootstrap.conf, which is necessary to successfully
		# call read().
		# Notice that this doesn’t set $_APP['core']['__ql_mtime'], so when QlCoreModule will load its
		# own module.conf, this stub section will always be overwritten.
		global $_APP;
		$_APP = array();
		$arrSection =& $this->load_section_nolock(
			'core', $_SERVER['LROOTDIR'] . 'config/core/bootstrap.conf'
		);
		$this->merge_section_nounlock('core', $arrSection);

		# Now we can go ahead with constructing $this.
		$this->m_sFileName = $_APP['core']['rwdata_lpath'] . 'core/app.dat';
		$this->m_sLockFileName = $_APP['core']['lock_lpath'] . 'app.dat.lock';
		$this->m_cLocks = 0;
		# Set size and CRC to provide a never-matching reference for QlApplicaion::unlock().
		$this->m_cb = 0;
		$this->m_iCRC = 0;
		$this->m_bDefaulted = false;

		# Try to reload the whole $_APP from persistent storage.
		if (!$this->reload()) {
			# If reloading failed, adjust the bootstrapped “core” section in the same way modules would
			# before a load_section() returning true and merge_section(). Note that $arrSection still
			# holds a reference to the section.
			$arrSection['load_modules'] = preg_split(
				'/\s*,\s*/', $arrSection['load_modules'], 0, PREG_SPLIT_NO_EMPTY
			);
		}

		$GLOBALS['ql_app'] = $this;
	}


	## Destructor.
	#
	public function __destruct() {
		if ($this->m_cLocks > 0) {
			ql_log(
				'E_USER_WARNING',
				'QlApplication still has ' . $this->m_cLocks . ' locks upon destruction!'
			);
			# Cheat on the number of locks to force writing to persistent storage.
			$this->m_cLocks = 1;
			$this->unlock();
		}
		unset($GLOBALS['ql_app'], $GLOBALS['_APP']);
	}


	## Loads a $_APP section from a config file.
	#
	# The caller can check the return value to perform any adjustments to the section. in case it was
	# actually loaded; after that, the QlApplication instance must be unlocked.
	#
	# string $sSection
	#    $_APP section to be loaded.
	# string $sFileName
	#    Path of the file to load.
	# [bool $bForce]
	#    If true, the section will be reloaded even if it hasn’t changed since the last loading.
	# mixed return
	#    false if loading the section was not necessary, or the section’s contents if it was really
	#    loaded from the configuration file. In the latter case, the caller will need to merge the
	#    new section passing it to QlApplication::merge_section() after making any necessary
	#    adjustments to the section’s contents.
	#
	public function & load_section($sSection, $sFileName = null, $bForce = false) {
		if ($sFileName === null) {
			# Default the file name for this section.
			$sFileName = $_SERVER['LROOTDIR'] . 'config/' . $sSection . '/module.conf';
		}
		# Assume we won’t need to load this section.
		$arrSection = false;
		global $_APP;
		if ($bForce || (int)@$_APP[$sSection]['__ql_mtime'] < filemtime($sFileName)) {
			ql_log('INFO', 'Loading $_APP[\'' . $sSection . '\']');
			$this->lock();
			$arrSection =& $this->load_section_nolock($sSection, $sFileName);
			# Don’t move this line to load_section_nolock(), or it will affect __construct() as well.
			# We don’t want to skip loading the “core” section (later) due to bootstrap.conf being
			# loaded first with the same name.
			$arrSection['__ql_mtime'] = filemtime($sFileName);
		}
		return $arrSection;
	}


	## Non-locking implementation of QlApplication::load_section().
	#
	# string $sSection
	#    $_APP section to be loaded.
	# string $sFileName
	#    Path of the file to load.
	# array<string => string> return
	#    Contents of the newly-loaded section.
	#
	private function & load_section_nolock($sSection, $sFileName) {
		$sContents = file_get_contents($sFileName);
		# Strip the UTF-8 BOM, if present.
		if (substr($sContents, 0, 3) == "\xef\xbb\xbf") {
			$sContents = substr($sContents, 3);
		}
		# Delete comments, since ql_parse_rfc822_header() doesn’t discard them.
		$sContents = preg_replace('/^#.*$/m', '', $sContents);
		# Parse and process the section.
		$arrSection =& ql_parse_rfc822_header($sContents);
		foreach ($arrSection as $sEntry => $sValue) {
			if (substr($sEntry, -6) == '_lpath') {
				# Make entries ending in “_lpath” absolute paths.
				$arrSection[$sEntry] = $_SERVER['LROOTDIR'] . $sValue;
			}
		}
		return $arrSection;
	}


	## Serializes access to $_APP. Does not return on error.
	#
	public function lock() {
		if ($this->m_cLocks == 0) {
			$cRetries = 15;
			do {
				$this->m_fileLock = fopen($this->m_sLockFileName, 'ab');
			} while (!$this->m_fileLock && --$cRetries && (sleep(1) || true));
			if (!$cRetries) {
				# Number of attempts exhausted.
				trigger_error('Unable to acquire application lock', E_USER_ERROR);
			}
			flock($this->m_fileLock, LOCK_EX);
			# Make sure that $_APP is up to date.
			$this->reload();
		}
		++$this->m_cLocks;
	}


	## Merges a section loaded by QlApplication::load_section() into $_APP, then unlocks $_APP.
	#
	# If the section has been loaded before, this will overwrite any values with those specified in
	# the file for each given key; keys assigned to null in the file will cause the corresponding key
	# in the $_APP section to be deleted. Keys not present in $arrNewSection will remain unaffected.
	#
	# string $sSection
	#    Name of the $_APP section.
	# array<string => mixed>& $arrNewSection
	#    Contents of the newly-loaded section.
	#
	public function merge_section($sSection, &$arrNewSection) {
		$this->merge_section_nounlock($sSection, $arrNewSection);
		$this->unlock();
	}


	## Non-(un)locking implementation of QlApplication::merge_section().
	#
	# string $sSection
	#    Name of the $_APP section.
	# array<string => mixed>& $arrNewSection
	#    Contents of the newly-loaded section.
	#
	private function merge_section_nounlock($sSection, &$arrNewSection) {
		global $_APP;
		if (isset($_APP[$sSection])) {
			# The section already exists, perform a merge of the two arrays.
			$arrCurrSection =& $_APP[$sSection];
			# Merge $arrNewSection into $arrCurrSection. Note that this loops iterates over the former,
			# but updates the latter.
			foreach ($arrNewSection as $sEntry => $sValue) {
				if ($sValue === null) {
					# Values set to null are removed from the section.
					unset($arrCurrSection[$sEntry]);
				} else {
					# Keys in $arrNewSection override keys already in $arrCurrSection.
					$arrCurrSection[$sEntry] = $sValue;
				}
			}
		} else {
			# The section did not already exist, so just use the array as-is.
			$_APP[$sSection] =& $arrNewSection;
		}
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
		$sApp = @file_get_contents($this->m_sFileName);
		if ($sApp) {
			# Keep a backup of the current $_APP, so we can restore it in case something goes wrong.
			$arrApp = @unserialize($sApp);
			if ($arrApp !== false) {
				# A valid array was loaded; overwrite $_APP with that.
				$GLOBALS['_APP'] =& $arrApp;
				# Recalculate size and CRC for later.
				$this->m_cb = strlen($sApp);
				$this->m_iCRC = crc32($sApp);
				return true;
			}
		}
		# Something went wrong. Check if we already detected this, so we don’t pollute the log.
		if (!$this->m_bDefaulted) {
			# TODO: also e-mail an administrator?
			ql_log(
				'E_USER_WARNING',
				'Application data ' . ($sApp === false ? 'missing' : 'corrupt') . ', defaults loaded!',
				'<pre>' . ql_lenc($sApp) . '</pre>'
			);
			$this->m_bDefaulted = true;
		}
		return false;
	}


	## Leaves the serialized context started with QlApplication::lock().
	#
	public function unlock() {
		if ($this->m_cLocks == 1) {
			# Recalculate size and CRC of the serialized $_APP; if different, we’ll need to update the
			# persistent storage.
			global $_APP;
			$s = serialize($_APP);
			$cb = strlen($s);
			$iCRC = crc32($s);
			if ($this->m_cb != $cb || $this->m_iCRC != $iCRC) {
				$this->m_cb = $cb;
				$this->m_iCRC = $iCRC;
				file_put_contents($this->m_sFileName, $s);
			}
			flock($this->m_fileLock, LOCK_UN);
			fclose($this->m_fileLock);
			$this->m_fileLock = null;
		}
		if ($this->m_cLocks > 0) {
			--$this->m_cLocks;
		} else {
			ql_log('E_USER_WARNING', 'Incorrect number of calls to QlApplication::unlock()!');
		}
	}
}

?>
