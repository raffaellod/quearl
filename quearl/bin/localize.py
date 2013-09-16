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

import gzip
import os
import re
import sys



####################################################################################################
# l10n_generator

class l10n_generator(object):
	"""Generates localization files for all programming languages from the localized string files."""

	@classmethod
	def update_module(cls, module):
		"""Updates every localization file in a given module.

		QuearlModule module
			Module for which to update the localization.
		"""

		sL10nDir = module.l10n_dir()
		if sL10nDir == None:
			# This module has no localization files.
			return

		for sFileName in os.listdir(sL10nDir):
			if sFileName.endswith('.l10n'):
				cls.update_from_l10n_file(module, os.path.join(sL10nDir, sFileName))


	@classmethod
	def update_from_l10n_file(cls, module, sL10nFileName):
		"""Creates/updates the localization files generated from the specified l10n file.

		QuearlModule module
			Module to which the file belongs.
		str sL10nFileName
			Full path to the .l10n file.
		"""

		sModulePrefix = module.abbr().upper()
		dictL10nEntries = None
		# Find out the locale from the l10n file name.
		match = re.search(
			r'[\/](?P<locale>(?P<language>[a-z]{2})-(?P<country>[a-z]{2}))\.l10n$', sL10nFileName
		)
		sLocale = match.group('locale')
		sLanguage = match.group('language')
		sCountry = match.group('country')
		# Get the last modification time of the .l10n file.
		dtL10nFile = os.path.getmtime(sL10nFileName)

		for sType in 'php', 'js':
			sOutputDir = os.path.join(module.rodata_dir(), 'l10n', sType)
			sOutputFileName = os.path.join(sOutputDir, sLocale + '.' + sType)
			try:
				# Try to get the last modification time of the output file.
				dtOutputFile = os.path.getmtime(sOutputFileName)
				if dtL10nFile <= dtOutputFile:
					# The file doesn’t need to be re-generated.
					continue
			except OSError:
				# Assume that the file does not exist.
				pass

			# Make sure we read and processed the source .l10n file.
			if dictL10nEntries == None:
				# We did not, so do it now.
				with open(sL10nFileName, 'r') as fileL10n:
					sys.stdout.write('Processing l10n file {}\n'.format(sL10nFileName))
					dictL10nEntries = cls.parse_l10n(fileL10n)
				# Add a few more constants.
				dictL10nEntries['L10N_INCLUDED'  ] = True
				dictL10nEntries['LANG_ISO639'    ] = sLanguage
				dictL10nEntries['COUNTRY_ISO3166'] = sCountry

			# Generate the output.
			sys.stdout.write('Generating localization in {} format\n'.format(sType.upper()))
			sFile = getattr(cls, 'l10n_to_' + sType)(sModulePrefix, dictL10nEntries)

			# Make sure the destination directory exists.
			try:
				os.makedirs(sOutputDir, 0o755, True)
			except OSError:
				# The subdirectory was already there, or couldn’t be created. In the latter case,
				# opening the file will fail, so an exception will be raised in any case.
				pass

			# Store the generated file.
			if sType == 'js':
				# Also write a gzipped version of the same file.
				sys.stdout.write('Updating {}.gz\n'.format(sOutputFileName))
				with open(sOutputFileName + '.gz', 'wb') as fileOutput:
					fileOutput.write(gzip.compress(sFile.encode('utf-8')))
			sys.stdout.write('Updating {}\n'.format(sOutputFileName))
			with open(sOutputFileName, 'w') as fileOutput:
				fileOutput.write(sFile)


	@staticmethod
	def parse_l10n(fileL10n):
		"""Parses a .l10n file, returning a dictionary containing the entries defined."""

		# Prepare this module’s localization.
		dictEntries = {}
		iLine = 0
		# Parse through the whole file.
		for sLine in fileL10n:
			iLine += 1
			sLine = sLine.lstrip()
			# Skip empty lines and comments.
			if len(sLine) > 0 and sLine[0] != '#':
				match = re.match(r'^(?P<name>[0-9A-Z_]+)(:?:(?P<type>int))?\t+(?P<value>.*)$', sLine)
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
				dictEntries[match.group('name')] = oValue
		return dictEntries


	@staticmethod
	def l10n_to_php(sModulePrefix, dictL10nEntries):
		"""Generates a PHP localization file with the provided entries.

		str sModulePrefix
			Prefix to be prepended to each generated constant’s name.
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
				if oValue:
					sValue = 'true'
				else:
					sValue = 'false'
			elif isinstance(oValue, str):
				# Escape escape sequences.
				sValue = oValue.replace('\\', '\\\\').replace('\n', '\\n')
				# Escape the quotes we use, and add them at either ends.
				sValue = "'" + sValue.replace("'", "\\'") + "'"
			else:
				# Python and PHP are similar enough that for numeric types we can simply use repr().
				sValue = repr(oValue)
			s += "define('L10N_{}_{}', {});\n".format(sModulePrefix, sName, sValue)
		s += '\n' \
			  '?>'
		return s


	@staticmethod
	def l10n_to_js(sModulePrefix, dictL10nEntries):
		"""Generates a JavaScript localization file with the provided entries.

		str sModulePrefix
			Prefix to be prepended to each generated constant’s name.
		dict(object) dictL10nEntries
			Localized constants.
		str return
			JavaScript version of the contents of dictL10nEntries.
		"""

		# Note that semicolons and most whitespace are omitted from the output, in an attempt to
		# reduce the resulting JS size.
		s = '// -*- coding: utf-8; mode: javascript; tab-width: 3 -*-\n' \
			 '// AUTOMATICALLY-GENERATED FILE - do not edit!\n' \
			 '\n' \
			 'var L=L10n\n'
		for sName, oValue in dictL10nEntries.items():
			if isinstance(oValue, bool):
				sValue = oValue and 'true' or 'false'
			else:
				# Thanks to the similarities between Python strings and JS strings, for most types we
				# can simply use repr().
				sValue = repr(oValue)
			s += 'L.{}_{}={}\n'.format(sModulePrefix, sName, sValue)
		s += 'L=undefined\n'
		return s



####################################################################################################
# __main__

if __name__ == '__main__':
	# Get the full path of this script.
	sDir = os.path.dirname(os.path.abspath(sys.argv[0]))
	# Setup the PATH environment variable to load quearl_inst.
	sys.path.append(sDir)
	import quearl_inst

	# Obtain the Quearl installation subdirectory and instantiate a QuearlInst for it.
	qinst = quearl_inst.QuearlInst(os.path.normpath(os.path.join(sDir, '..')))
	# Update all modules.
	for module in qinst.modules():
		l10n_generator.update_module(module)

	sys.exit(0)

