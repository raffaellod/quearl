#!/usr/bin/python
# -*- coding: utf-8; mode: python; tab-width: 3 -*-
#---------------------------------------------------------------------------------------------------
# Quearl
# Copyright 2013 Raffaello D. Di Napoli
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

"""Classes to manage a Quearl installation."""

import configparser
import os



####################################################################################################
# QuearlInst

class QuearlInst(object):
	"""Provides access to a Quearl installation for maintenance purposes."""

	def __init__(self, sQuearlDir):
		"""Constructor.

		str sQuearlDir
			Quearl installation subdirectory, e.g. the directory containing the “module” directory;
			default: “quearl”.
		"""

		self._m_sModulesDir = os.path.join(sQuearlDir, 'module')
		self._m_sConfigsDir = os.path.join(sQuearlDir, 'config')
		cpBootstrapConf = configparser.ConfigParser(
			comment_prefixes      = '#',
			delimiters            = ':',
			empty_lines_in_values = False,
			interpolation         = None
		)
		with open(os.path.join(self._m_sConfigsDir, 'core/bootstrap.conf'), 'r') as fileBootstrapConf:
			cpBootstrapConf.read_string('[core]\n' + fileBootstrapConf.read())
		self._m_sRODataDir = os.path.join(sQuearlDir, cpBootstrapConf['core']['rodata_lpath'])


	def modules(self):
		"""Iterates over every module."""

		for sFileName in os.listdir(self._m_sModulesDir):
			sFileName = os.path.join(self._m_sModulesDir, sFileName)
			if os.path.isdir(sFileName):
				yield QuearlModule(self, sFileName)


	def rodata_dir(self):
		"""Returns the Quearl-wide read-only data directory.

		str return
			Directory.
		"""

		return self._m_sRODataDir



####################################################################################################
# QuearlModule

class QuearlModule(object):
	"""Quearl module installation directory."""

	def __init__(self, qinst, sBaseDir):
		"""Constructor.

		QuearlInst qinst
			Provides access to the Quearl installation.
		str sBaseDir
			Base directory of the module.
		"""

		# _m_sAbbr like “core”, “ecomm”, …
		# TODO: FIXME: read this by parsing the module’s main.php!
		self._m_sAbbr = os.path.basename(sBaseDir)
		self._m_sBaseDir = sBaseDir
		self._m_sL10nDir = os.path.join(sBaseDir, 'l10n')
		if not os.path.isdir(self._m_sL10nDir):
			# Maybe this module has no localization.
			self._m_sL10nDir = None
		self._m_sRODataDir = os.path.join(qinst.rodata_dir(), self._m_sAbbr)


	def abbr(self):
		"""Returns the module’s abbreviated name.

		str return
			Abbreviation.
		"""

		return self._m_sAbbr


	def base_dir(self):
		"""Returns the module’s base directory.

		str return
			Base directory.
		"""

		return self._m_sBaseDir


	def l10n_dir(self):
		"""Returns the module’s localization files directory.

		str return
			Localization files directory, or None if non-existent.
		"""

		return self._m_sL10nDir


	def rodata_dir(self):
		"""Returns the module’s read-only data directory.

		str return
			Directory.
		"""

		return self._m_sRODataDir



####################################################################################################
# __main__

if __name__ == '__main__':
	import sys

	# Get the full path of this script.
	sDir = os.path.dirname(os.path.abspath(sys.argv[0]))
	# Obtain the Quearl installation subdirectory.
	sDir = os.path.normpath(os.path.join(sDir, '..'))
	# Instantiate a QuearlInst.
	qinst = QuearlInst(sDir)

	sys.exit(0)

