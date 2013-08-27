<?php
# -*- coding: utf-8; mode: php; tab-width: 3 -*-
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

# JSON decoding functions. JSON encoding functions are in Quearl.core.main.


define('QUEARL_CORE_JSONDEC_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Functions


## Parses a JSON data block.
#
# string $s
#    JSON representation of an object.
# mixed return
#    The parsed object.
#
function ql_json_decode($s) {
	$s = trim($s);
	// Constants.
	switch ($s) {
		case '':
		case 'undefined':
		case 'null':
			return null;
		case 'true':
			return true;
		case 'false':
			return false;
	}
	# Numbers. JSON numbers are the same as PHP ones.
	if (is_numeric($s)) {
		$f = (float)$s;
		return strpos($s, '.') !== false || $f > 0x7fffffff ? $f : (int)$s;
	}
	# Strings.
	if (preg_match('/^"[^"\\\\]*(\\\\.[^"\\\\]*)*"$/s', $s))
		return preg_replace(
			'/\\\\([btnvfr"\\\\]|u([0-9A-Fa-f]{4}))/e',
			'\'$2\' ? ' .
			# xxxx yyyy yyzz zzzz -> 1110xxxx 10yyyyyy 10zzzzzz
			'0x0$2 > 0x07ff ? pack(\'c3\', ' .
										'0xe0 | ( 0x0$2           >> 12), ' .
										'0x80 | ((0x0$2 & 0x0fc0) >>  6), ' .
										'0x80 |  (0x0$2 & 0x003f)' .
									') : (' .
			# 0000 0yyy yyzz zzzz -> 110yyyyy 10zzzzzz
			'0x0$2 > 0x007f ? chr(0xc0 | ((0x0$2 & 0x07c0) >> 6)) . ' .
								  'chr(0x80 |  (0x0$2 & 0x003f)) : ' .
			# 0000 0000 0zzz zzzz -> 0zzzzzzz
								'chr(0x0$2)) : ' .
			# PHP BUG: preg_replace('/e') escapes " as \" in backreferences, so '$1' = '"' comes out as
			# as '\"', i.e. two chars instead of one. */
			'strtr(substr(\'$1\', -1), \'btnvfr\', "\x08\x09\x0a\x0b\x0c\x0d")',
			substr($s, 1, -1)
		);
	# Objects (using new).
	if (preg_match('/^new\s+([A-Za-z_][0-9A-Za-z_]*)\s*\(\s*(.*)\s*\)$/s', $s, $arrMatch)) {
		if ($arrMatch[2] != '') {
			# Read constructor arguments like an array.
			$arrArgs = ql_json_decode('[' . $arrMatch[2] . ']');
			if (!is_array($arrArgs))
				return null;
		} else
			$arrArgs = array();
		$sClassName = 'QlJson' . $arrMatch[1];
		if (!class_exists($sClassName)) {
			$sClassName = 'Json' . $arrMatch[1];
			if (!class_exists($sClassName)) {
				trigger_error('Unable to find class \'' . $sClassName . '\'', E_USER_WARNING);
				return null;
			}
		}
		$o = new $sClassName();
		if (!$o->setfromjson($arrArgs)) {
			trigger_error(
				'Error initializing new instance of \'' . $sClassName . '\'', E_USER_WARNING
			);
			return null;
		}
		return $o;
	}
	# Prepare to parse an array or soft object.
	$cch = strlen($s) - 1;
	if ($s{0} == '[')
		if ($s{$cch} == ']')
			$bSimple = true;
		else {
			trigger_error('JSON syntax error: expected matching \']\'', E_USER_WARNING);
			return null;
		}
	else if ($s{0} == '{')
		if ($s{$cch} == '}')
			$bSimple = false;
		else {
			trigger_error('JSON syntax error: expected matching \'}\'', E_USER_WARNING);
			return null;
		}
	else {
		trigger_error('JSON syntax error: unexpected character \'' . $s{0} . '\'', E_USER_WARNING);
		return null;
	}
	# Soft objects. Parsed piece-by-piece.
	$arr = array();
	$arrNested = array();
	$ichItemStart = 1;
	for ($ich = 1; $ich <= $cch; ++$ich) {
		# Skip whitespace, looking for EOS or a member delimiter (,).
		if (($ich += strspn($s, " \t\r\n", $ich)) == $cch || ($ch = $s{$ich}) == ',') {
			# Member or object completed. Nested objects will be parsed by recursing, so only parse
			# top-level members (!$arrNested).
			if (!$arrNested) {
				$sItem = trim(substr($s, $ichItemStart, $ich - $ichItemStart));
				if ($sItem == '' && $ich == $cch)
					// L'ultimo valore può non esserci, se era la fine della
					// stringa (invece una virgola senza valore dopo NO).
					break;
				if ($bSimple)
					$arr[] = ql_json_decode($sItem);
				else {
					# This RE retrieves the key and any whitespace surrounding the semicolon.
					if (!preg_match('/^("[^"\\\\]*(\\\\.[^"\\\\]*)*")\s*:\s*/s', $sItem, $arrMatch)) {
						trigger_error('JSON syntax error: invalid key in object', E_USER_WARNING);
						return null;
					}
					$arr[ql_json_decode($arrMatch[1])] = ql_json_decode(
						substr($sItem, strlen($arrMatch[0]))
					);
				}
				$ichItemStart = $ich + 1;
				unset($sItem);
			}
		} else {
			$sMatch = substr($s, $ich);
			if (preg_match('/^"[^"\\\\]*(\\\\.[^"\\\\]*)*"/s', $sMatch, $arrMatch))
				# Skip strings.
				# -1 since the loop will ++$ich anyway.
				$ich += strlen($arrMatch[0]) - 1;
			else if (preg_match('/^new\s+[A-Za-z_][0-9A-Za-z_]*\s*/', $sMatch, $arrMatch)) {
				# Skip objects using new.
				# -1 since the loop will ++$ich anyway. Also, increase nesting level.
				$ich += strlen($arrMatch[0]) - 1;
				array_push($arrNested, ')');
			} else
				# Check begin/end of nested objects, to verify brackets matching.
				switch ($ch) {
					case '[':
						array_push($arrNested, ']');
						break;
					case '{':
						array_push($arrNested, '}');
						break;
					case ')':
					case ']':
					case '}':
						if (!$arrNested || array_pop($arrNested) != $ch) {
							trigger_error(
								'JSON syntax error: unexpected closing \'' . $ch . '\'', E_USER_WARNING
							);
							return null;
						}
						break;
				}
		}
	}
	return $arr;
}

?>
