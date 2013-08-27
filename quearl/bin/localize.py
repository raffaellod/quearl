#!/usr/bin/python
# -*- coding: utf-8; mode: python; tab-width: 3 -*-
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

"""Utilities for localization files (.l10n)."""

import os
import re
import sys



####################################################################################################
# l10n_generator

class l10n_generator(object):
	"""Generates localization files for all languages from the localized string files."""

	def __init__(self, sQuearlDir):
		"""Constructor.

		str sQuearlDir
			Quearl installation subdirectory, e.g. the directory containing the “module” directory;
			default: “Quearl”.
		"""

		self.m_sModulesDir = os.path.join(sQuearlDir, 'module')
		# TODO: FIXME: temp hack!
		self.m_sRODataDir = os.path.normpath(os.path.join(self.m_sModulesDir, '../data.ro'))


	def update_all_modules(self):
		"""Updates every localization file in every module."""

		for sFileName in os.listdir(self.m_sModulesDir):
			sFileName = os.path.join(self.m_sModulesDir, sFileName)
			if os.path.isdir(sFileName):
				self.update_module(sFileName)


	def update_module(self, sModuleDir):
		"""Updates every localization file in a given module.

		str sModuleDir
			Full path to the directory containing the module. Note that its basename is not necessarily
			the module’s name.
		"""

		sL10nDir = os.path.join(sModuleDir, 'l10n')
		if not os.path.isdir(sL10nDir):
			# Maybe this module has no localization.
			return

		# sModulePrefix like “QL_CORE”, “QL_ECOMM”, …
		# TODO: FIXME: temp hack!
		sModulePrefix = 'QL_' + os.path.basename(sModuleDir).upper() + '_'
		for sFileName in os.listdir(sL10nDir):
			if sFileName.endswith('.l10n'):
				sFileName = os.path.join(sL10nDir, sFileName)
				if os.path.isfile(sFileName):
					sys.stdout.write('Processing l10n file {}\n'.format(sFileName))
					self.update_from_l10n_file(sFileName, sModulePrefix)


	def update_from_l10n_file(self, sL10nFileName, sModulePrefix):
		"""Updates the localization files originating from the specified l10n file.

		str sL10nFileName
			Full path to the .l10n file.
		str sModulePrefix
			Computed module prefix, ready to be used to generate constant named; must include a
			trailing “_”.
		"""

		# Find out directory and locale from the l10n file name.
		match = re.search(
			'[\\/](?P<moduledir>[^\\/]+)[\\/]l10n[\\/](?P<locale>[^\\/]+)\.l10n$', sL10nFileName
		)
		# We could have the caller provide this, but it’s not necessary.
		sModuleDirName = match.group('moduledir')
		sLocale = match.group('locale')

		dictL10nEntries = {}
		dictL10nEntries[sModulePrefix + 'L10N_INCLUDED'] = True
		with open(sL10nFileName) as fileL10n:
			iLine = 0
			# Parse through the whole file.
			for sLine in fileL10n:
				iLine += 1
				sLine = sLine.lstrip()
				# Skip empty lines and comments.
				if len(sLine) > 0 and sLine[0] != '#':
					match = re.match('^(?P<name>[0-9A-Z_]+)(:?:(?P<type>int))?\t+(?P<value>.*)$', sLine)
					if not match:
						raise SyntaxError('line {}: invalid syntax: {}'.format(iLine, repr(sLine)))
					sType = match.group('type')
					sValue = match.group('value')
					if sType:
						if sType == 'int':
							# Enter ints as… ints.
							oValue = int(sValue)
						else:
							raise SyntaxError('line {}: unknown type: {}'.format(iLine, sType))
					else:
						# Unescape strings.
						oValue = sValue.replace('\\n', '\n').replace('\\\\', '\\')
					# Add the entry.
					dictL10nEntries[sModulePrefix + match.group('name')] = oValue

		# Get the last modification time of the .l10n file.
		dtL10nFile = os.path.getmtime(sL10nFileName)

		for sType in 'php', 'js':
			sOutputDir = os.path.join(self.m_sRODataDir, sModuleDirName, 'l10n', sType)
			# Make sure the destination directory exists.
			try:
				os.makedirs(sOutputDir, 0o755, True)
			except OSError:
				pass
			sOutputFileName = os.path.join(sOutputDir, sLocale + '.l10n.' + sType)
			# Try to get the last modification time of the output file.
			try:
				dtOutputFile = os.path.getmtime(sOutputFileName)
			except:
				# Probably the file doesn’t exist.
				dtOutputFile = None
			# If the file needs to be (re-)generated, go ahead.
			if dtOutputFile == None or dtL10nFile > dtOutputFile:
				sys.stdout.write('Updating {} file {}\n'.format(sType, sOutputFileName))
				sFile = getattr(self, 'l10n_to_' + sType)(dictL10nEntries)
				with open(sOutputFileName, 'w') as f:
					f.write(sFile)


	@staticmethod
	def l10n_to_php(dictL10nEntries):
		"""Generates a PHP localization file with the provided entries.

		dict(object) dictL10nEntries
			Localized constants.
		str return
			PHP version of the contents of dictL10nEntries.
		"""

		s = '<?php\n' \
			 '# -*- coding: utf-8; mode: php; tab-width: 3 -*-\n' \
			 '# AUTOMATICALLY-GENERATED FILE - do not edit!\n' \
			 '\n'
		for sName, oValue in dictL10nEntries.items():
			if isinstance(oValue, bool):
				sValue = oValue and 'true' or 'false'
			elif isinstance(oValue, str):
				# Escape escape sequences.
				sValue = oValue.replace('\\', '\\\\').replace('\n', '\\n')
				# Escape the quotes we use, and add them at either ends.
				sValue = "'" + sValue.replace("'", "\\'") + "'"
			else:
				# Python and PHP are similar enough that for numeric types we can simply use repr().
				sValue = repr(oValue)
			s += "define('" + sName + "', " + sValue + ');\n'
		s += '\n' \
			  '?>'
		return s


	@staticmethod
	def l10n_to_js(dictL10nEntries):
		"""Generates a JavaScript localization file with the provided entries.

		dict(object) dictL10nEntries
			Localized constants.
		str return
			JavaScript version of the contents of dictL10nEntries.
		"""

		s = '// -*- coding: utf-8; mode: javascript; tab-width: 3 -*-\n' \
			 '// AUTOMATICALLY-GENERATED FILE - do not edit!\n' \
			 '\n' \
			 'var L = L10n;\n'
		for sName, oValue in dictL10nEntries.items():
			if isinstance(oValue, bool):
				sValue = oValue and 'true' or 'false'
			else:
				# Thanks to the similarities between Python strings and JS strings, for most types we
				# can simply use repr().
				sValue = repr(oValue)
			s += 'L.' + sName + '=' + sValue + ';\n'
		s += 'L = undefined;\n'
		return s



####################################################################################################
# __main__

if __name__ == '__main__':
	# Get the full path of this script.
	sDir = os.path.dirname(os.path.abspath(sys.argv[0]))
	# Obtain the Queal installation subdirectory.
	sDir = os.path.normpath(os.path.join(sDir, '..'))

	# Instantiate and launch the l10n_generator.
	gen = l10n_generator(sDir)
	gen.update_all_modules()
	sys.exit(0)

