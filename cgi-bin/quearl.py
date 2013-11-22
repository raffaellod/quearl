#!/usr/bin/python
# -*- coding: utf-8; mode: python; tab-width: 3; indent-tabs-mode: nil -*-
#
# Copyright 2013
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

"""Quearl invocation."""

import os
import sys


def http_write(sOut):
   bytesOut = bytes(sOut, encoding = 'utf-8')
   sHeader = 'Content-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\n\r\n'.format(
      len(bytesOut)
   )
   sys.stdout.buffer.write(bytes(sHeader, encoding = 'utf-8'))
   sys.stdout.buffer.write(bytesOut)

s = ''

s += 'Environment:\r\n'
s += '\r\n'.join(['{}={}'.format(sName, sValue) for sName, sValue in os.environ.items()])
s += '\r\n\r\n'
s += 'stdin:\r\n'
s += sys.stdin.read()


sys.path.append(os.path.abspath(os.environ['QUEARL_REL_PATH']))

http_write(s)
