#!/usr/bin/python
# -*- coding: utf-8; mode: python; tab-width: 3 -*-
#---------------------------------------------------------------------------------------------------
# Quearl
# Copyright 2007-2013 Raffaello D. Di Napoli
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

"""JavaScript preprocessor. Minifies JS files and generates compressed copies."""

import gzip
import os
import re
import sys



####################################################################################################
# JsPreproc

class JsPreproc(object):
	"""JavaScript preprocessor. Minifies JavaScript files and generates compressed copies."""

	@classmethod
	def update_module(cls, module):
		"""Preprocesses every JS file in a given module.

		QuearlModule module
			Module for which to preprocess JS files.
		"""

		sJsDir = os.path.join(module.base_dir(), 'js')
		if not os.path.isdir(sJsDir):
			# This module has no JavaScript files.
			return

		for sFileName in os.listdir(sJsDir):
			if sFileName.endswith('.js'):
				cls.preprocess_js_file(module, os.path.join(sJsDir, sFileName))


	@classmethod
	def preprocess_js_file(cls, module, sInputFileName):
		"""Pre-processes a JavaScript file, generating minified and minified+compressed versions.

		QuearlModule module
			Module to which the file belongs.
		str sInputFileName
			Full path to the source JS file.
		"""

		# Get the last modification time of the source JS file.
		dtInputFile = os.path.getmtime(sInputFileName)

		sOutputDir = os.path.join(module.rodata_dir(), 'js')
		sOutputFileName = os.path.join(sOutputDir, os.path.basename(sInputFileName))
		try:
			# Try to get the last modification time of the output file.
			dtOutputFile = os.path.getmtime(sOutputFileName)
			if dtInputFile <= dtOutputFile:
				# The file doesn’t need to be re-ore-processed.
				return
		except OSError:
			# Assume that the file does not exist.
			pass

		# Read and pre-process the source JS file.
		with open(sInputFileName, 'r') as fileInput:
			sys.stdout.write('Pre-processing JS file {}\n'.format(sInputFileName))
			sJsSource = fileInput.read()

		# Generate the output.
		sys.stdout.write('Minifying JavaScript\n')
		sMinSource = cls.minify(sJsSource)

		# Make sure the destination directory exists.
		try:
			os.makedirs(sOutputDir, 0o755, True)
		except OSError:
			# The subdirectory was already there, or couldn’t be created. In the latter case,
			# opening the file will fail, so an exception will be raised in any case.
			pass

		# Write a gzipped version of the same file.
		sys.stdout.write('Updating {}.gz\n'.format(sOutputFileName))
		with open(sOutputFileName + '.gz', 'wb') as fileOutput:
			fileOutput.write(gzip.compress(sMinSource.encode('utf-8')))
		# Store the generated file.
		sys.stdout.write('Updating {}\n'.format(sOutputFileName))
		with open(sOutputFileName, 'w') as fileOutput:
			fileOutput.write(sMinSource)


	@staticmethod
	def minify(s):
		"""Returns a minified version of the input JavaScript source code.

		A key point of this minification is that line numbers of the input and the output must match;
		this allows having meaningful line numbers reported back to the server whenever an error
		(exception) occurs on the remote client.

		str s
			JavaScript source.
		str return
			Minified JavaScript source.
		"""

		# Delete C-style comments that don’t extent into multiple lines. Since removing the comment
		# could join two tokens (e.g. “a/*b*/c” => “ac”), replace them with a single space, but also
		# make sure that the pattern captures any surrounding whitespace, to mitigate the unnecessary
		# whitespace we’re adding.
		# TODO: this is not string- nor regexp-safe.
		s = re.sub('[ \t\f\v]*/\*.*?\*/[ \t\f\v]*', ' ', s)

		# TODO: this is not string- nor regexp-safe, and can break multi-line C-style comments.
		s = re.sub('//.*$', '', s, flags = re.MULTILINE)

		# Trim leading whitespace on each line.
		s = re.sub('^[ \t\f\v]+', '', s, flags = re.MULTILINE)
		# Trim trailing whitespace on each line.
		s = re.sub('[ \t\f\v]+$', '', s, flags = re.MULTILINE)

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
		JsPreproc.update_module(module)

	sys.exit(0)

