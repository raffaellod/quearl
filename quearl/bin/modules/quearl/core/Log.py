#!/usr/bin/python
# -*- coding: utf-8; mode: python; tab-width: 3; indent-tabs-mode: nil -*-
#
# Copyright 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013
# Raffaello D. Di Napoli
#
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

"""Definition of the log class."""

import binascii
import fcntl
import io
import re
import time
from xml.sax.saxutils import escape as xml_escape



####################################################################################################
# Classes


class Logger(object):
   """Generator of rich XML-based log files."""

   def __init__(self, app):
      """Constructor.

      quearl.core.Application app
         Application instance.
      """

      pass


   def __call__(self, *args, **kwargs):
      """Shorthand for write(). See Logger.write()."""

      return self.write(*args, **kwargs)


   @staticmethod
   def enc(s):
      """Converts characters forbidden or deprecated in XML to XML entities. Similar to
      xml_escape(), but will encode and enclose illegal characters in <raw> elements, that will be
      rendered by the JS code in log.xsl. See also <http://www.w3.org/TR/REC-xml/#charsets>.

      str s
         String to encode.
      str return
         Encoded string.
      """

      # First, generate XML entities for XML reserved characters.
      s = xml_escape(s)

      # Replace illegal characters with a special tag rendered by the XLST+JS code.
      s = re.sub(
         r'[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd]+',
         lambda match: '<raw>' + binascii.hexlify(match.group(0)) + '</raw>',
         s
      )
      return s


   def write(self, sCategory, sTitle, sContents = None, sLogName = ''):
      """Appends markup to the log.

      str sCategory
         Event category.
      str sTitle
         Event title.
      [str sContents]
         Markup to log. Can contain elements defined in log.xsl.
      [str sLogName]
         Log name; if omitted, defaults to the default log.
      str return
         Same as sTitle, to allow inserting this function call as a filter for another function's
         argument.
      """

      $fTS = microtime(true)
      sFilePath = os.path.join(
         _APP['core']['log_lpath'],
         sLogName + ql_format_timestamp('%Y-%m-%d', $fTS, 'UTC') + '.log.xml'
      )
      fileLog = None
      try:
         cRetries = 15
         while True:
            try:
               fileLog = open(sFilePath, 'rb+')
            else:
               break
            cRetries -= 1
            if cRetries == 0:
               # Number of attempts exhausted.
               raise Exception('Unable to acquire log lock')
            touch(sFilePath)
            time.sleep(1)

         fcntl.flock(fileLog, fcntl.LOCK_EX)
         # Rewind enough bytes to delete the trailing “</log>”, so we can add another entry and then
         # terminate the root element back again.
         fileLog.seek(-len('</log>\n'), io.SEEK_END)
         # If the resulting file position is 0, we assume the file to be empty and…
         if fileLog.tell() == 0:
            # …add an XML prolog with a reference to the log-specific XSL file.
            # TODO: this path calculation is a little too unstable.
            cDirs = _APP['core']['log_lpath'][0:len(_SERVER['LROOTDIR'])].count('/')
            sXslPath = '../' * cDirs + 'module/core/log.xsl'
            s = '<?xml version="1.0" encoding="utf-8"?>\n' +
                '<?xml-stylesheet type="text/xsl" href="{xslpath}"?>\n'.format(
                   xslpath = sXslPath
                ) +
                '<log generator="{ver}/{rev} Logger" date="{date}">\n'.format(
                   ver  = QUEARL_VERSION,
                   rev  = QUEARL_REV,
                   date = ql_format_timestamp('%x', $fTS, 'UTC'),
                )
         else:
            s = ''
         s += '<entry ts="{ts}" time="{time}" timef="timef" cat="{cat}" title="{title}">'.format(
            ts    = $fTS,
            time  = ql_format_timestamp('%X', $fTS, 'UTC'),
            timef = ql_format_timestamp('%F', $fTS, 'UTC'),
            cat   = sCategory,
            title = xml_escape(sTitle),
         )
         if sContents:
            s += '\n{}\n'.format(sContents)
         s += '</entry>\n</log>\n'
         fileLog.write(s)
         fcntl.flock(fileLog, fcntl.LOCK_UN)
      finally:
         if fileLog:
            fileLog.close()
      return sTitle

