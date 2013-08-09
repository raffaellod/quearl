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
	public /*array*/ $m_arrCssSections = array();


	## Constructor.
	#
	public function __construct() {
		global $_APP;
		# Create a default $_APP array, loading only core.conf which is necessary to successfully call
		# lock() and _read(). This will be overwritten by a successful call to _read().
		$_APP = array(
			'core' => ql_php_get_array_file_contents($_SERVER['LROOTDIR'] . 'config/core/module.conf'),
		);

		$this->m_sFileName = $_SERVER['LROOTDIR'] . $_APP['core']['rwdata_dir'] . 'core/app.dat';
		$this->m_sLockFileName = $_SERVER['LROOTDIR'] . $_APP['core']['lock_dir'] . 'app.dat.lock';
		$this->m_cLocks = 0;
		$this->_read();
	}


	## Destructor.
	#
	public function __destruct() {
		if ($this->m_cLocks > 0)
			$this->unlock();
		unset($GLOBALS['_APP']);
	}


	## Returns an array with all the CSS sections loaded thus far.
	#
	# array<array<string => string>> return
	#    Array of CSS sections.
	#
	public function & getcsssections() {
		return $this->m_arrCssSections;
	}


	## Loads a $_APP section from a config file. If the section has been loaded before, this will
	# overwrite any values with those specified in the file for each given key; keys assigned to null
	# in the file will cause the corresponding key in the $_APP section to be deleted. Keys not
	# present in the config file will remain unaffected.
	#
	# If the section name ends in “-css”, the section will also be stored to a separate array of
	# style sections, obtainable by calling QlApplication::getcsssections().
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
	public function loadsection($sSection, $sFileName, $bForce = false) {
		global $_APP;
		$bIsCss = (substr($sSection, -10) == 'style.conf');
		$bLoad = $bForce ||
			!isset($_APP[$sSection]['__ql_mtime']) ||
			$_APP[$sSection]['__ql_mtime'] < filemtime($sFileName);
		if ($bLoad) {
			$this->lock();
			if (!isset($_APP[$sSection]))
				$_APP[$sSection] = array();
			$arrSection =& $_APP[$sSection];
			$arrNew = ql_php_get_array_file_contents($sFileName);
			$arrSection = $arrNew + $arrSection;
			foreach ($arrNew as $sVar => $mValue)
				if ($mValue === null)
					unset($arrSection[$sVar]);
				else if ($bIsCss && strncmp($sVar, 'XHTML', 5) == 0)
					# This is a CSS section: style any XML fragments within.
					$arrSection[$sVar] = preg_replace(
						'/(\r?\n|\r)\t*/', ' ', ql_template_subst($mValue, $this->m_arrCssSections)
					);
			if ($bIsCss)
				$this->m_arrCssSections[$sSection] =& $arrSection;
			$arrSection['__ql_mtime'] = filemtime($sFileName);
			$this->unlock();
		} else if ($bIsCss)
			$this->m_arrCssSections[$sSection] =& $_APP[$sSection];
		return $bLoad;
	}


	## Serializes access to $_APP.
	#
	# bool return
	#    true. This method does not return on error.
	#
	public function lock() {
		if ($this->m_cLocks <= 0) {
			while (!($this->m_fileLock = fopen($this->m_sLockFileName, 'ab')))
				sleep(1);
			if (!$this->m_fileLock)
				trigger_error('Unable to acquire application lock', E_USER_ERROR);
			flock($this->m_fileLock, LOCK_EX);
			++$this->m_cLocks;
			$this->_read();
		}
		return true;
	}


	## Reads $_APP from persistent storage.
	#
	# bool return
	#    true if $_APP was loaded from persistent storage, or false if the latter was unavailable,
	#    which means that $_APP has the default contents loaded from the configuration files.
	#
	private function _read() {
		global $_APP;
		# Keep a backup of the default core section, so we can restore it in case something goes
		# wrong.
		$arrDefaultCore =& $_APP['core'];
		$s = @file_get_contents($this->m_sFileName);
		if ($s) {
			$_APP = @unserialize($s);
			if ($_APP !== false) {
				$this->m_cb = strlen($s);
				$this->m_iCRC = $_APP['__ql_CRC'];
				unset($s, $_APP['__ql_CRC']);
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

		# Restore the default $_APP created in the constructor.
		$_APP = array(
			'core' => &$arrDefaultCore,
		);
		$this->m_cb = 0;
		$this->m_iCRC = 0;
		return false;
	}


	## Reloads $_APP. Useful for scripts that wish to reload $_APP after running for an extended
	# amount of time.
	#
	public function reload() {
		$this->_read();
	}


	## Leaves the serialized context started with QlApplication::lock().
	#
	public function unlock() {
		if ($this->m_cLocks > 0) {
			$this->_write();
			fclose($this->m_fileLock);
			@unlink($this->m_sLockFileName);
			$this->m_fileLock = null;
			--$this->m_cLocks;
		}
	}


	## Writes $_APP to persistent storage.
	#
	# bool return
	#    true if writing was successful or not necessary, false if it was necessary but failed.
	#
	private function _write() {
		global $_APP;
		$s = serialize($_APP);
		# Recalculate size and CRC of the serialized $_APP; if different, we’ll need to update the
		# persistent storage.
		if ($this->m_cb != ($cb = strlen($s)) || $this->m_iCRC != ($iCRC = crc32($s))) {
			$this->m_cb = $cb;
			$this->m_iCRC = (isset($iCRC) ? $iCRC : crc32($s));
			$_APP['__ql_CRC'] = $this->m_iCRC;
			file_put_contents($this->m_sFileName, serialize($_APP));
			unset($_APP['__ql_CRC']);
		}
		return true;
	}
}

?>
