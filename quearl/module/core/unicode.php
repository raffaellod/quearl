<?php /* -*- coding: utf-8; mode: php; tab-width: 3 -*-

Copyright 2007, 2008, 2009, 2010, 2011, 2012, 2013
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

# UTF-8-string handling and conversion from/to other encodings.


define('QUEARL_CORE_UNICODE_INCLUDED', true);

# This is just an explicit dependency declaration; were it not for require_once, this would be a
# circular dependency.
require_once 'main.php';



####################################################################################################
# UTF-8 functions


# Functions that are inherently UTF-8 compatible:
#
# explode()
#    Works like strstr(), but the lack of an $offset parameter makes it behave with UTF-8.


## Returns the UTF-8 character at the specified (byte) offset position, and moves the index past it.
#
# string $s
#    UTF-8 string to be parsed.
# int& $ib
#    Byte offset of the desired character.
# string return
#    The UTF-8 character following the specified index.
#
function utf8_charnext($s, &$ib) {
	$cb = strlen($s);
	if ($ib === null || $ib < 0) {
		$ib = 0;
	}
	if ($ib >= $cb) {
		return false;
	}

	$b = ord($s{$ib});
	if ($b <= 0x7f) {
		# 0xxxxxxx
		$cbCh = 1;
	} else if ($b <= 0xbf) {
		# 10xxxxxx
		# Can only appear inside an UTF-8 sequence, so it’s not valid here.
		return false;
	} else if ($b <= 0xdf) {
		# 110xxxxx 10yyyyyy
		$cbCh = 2;
	} else if ($b <= 0xef) {
		# 1110xxxx 10yyyyyy 10zzzzzz
		$cbCh = 3;
	} else if ($b <= 0xf7) {
		# 11110www 10xxxxxx 10yyyyyy 10zzzzzz
		$cbCh = 4;
	} else if ($b <= 0xfb) {
		# 111110vv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		$cbCh = 5;
	} else if ($b <= 0xfd) {
		# 1111110u 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		$cbCh = 6;
	} else if ($b <= 0xfe) {
		# 11111110 10uuuuuu 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		$cbCh = 7;
	} else {
		# 11111111 10tttttt 10uuuuuu 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		$cbCh = 8;
	}

	$ibLast = $ib;
	$ib += $cbCh;
	return ($ib <= $cb ? substr($s, $ibLast, $cbCh) : false);
}


## Returns the UTF-8 character preceding the specified (byte) offset position, and moves the index
# to its starting byte.
#
# string $s
#    UTF-8 string to be parsed.
# int& $ib
#    Byte offset of the desired character.
# string return
#    The UTF-8 character preceding the specified index.
#
function utf8_charprev($s, &$ib) {
	$cb = strlen($s);
	if ($ib === null || $ib > $cb) {
		$ib = $cb;
	}
	if ($ib <= 0) {
		return false;
	}

	$cbCh = 0;
	do {
		$b = ord($s{--$ib});
		++$cbCh;
	} while ($ib > 0 && $b >= 0x80 && $b <= 0xbf);

	if ($b <= 0x7f) {
		# 0xxxxxxx
		# It must be the only character collected in the above loop, as ASCII characters are 1-byte
		# sequences.
		if ($cbCh != 1) {
			return false;
		}
	} else if ($b <= 0xbf) {
		# 110xxxxx 10yyyyyy
		# Can only appear inside an UTF-8 sequence, so it’s not valid here.
		return false;
	} else if ($b <= 0xdf) {
		# 110xxxxx 10yyyyyy
		if ($cbCh != 2) {
			return false;
		}
	} else if ($b <= 0xef) {
		# 1110xxxx 10yyyyyy 10zzzzzz
		if ($cbCh != 3) {
			return false;
		}
	} else if ($b <= 0xf7) {
		# 11110www 10xxxxxx 10yyyyyy 10zzzzzz
		if ($cbCh != 4) {
			return false;
		}
	} else if ($b <= 0xfb) {
		# 111110vv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		if ($cbCh != 5) {
			return false;
		}
	} else if ($b <= 0xfd) {
		# 1111110u 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		if ($cbCh != 6) {
			return false;
		}
	} else if ($b <= 0xfe) {
		# 11111110 10uuuuuu 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		if ($cbCh != 7) {
			return false;
		}
	} else {
		# 11111111 10tttttt 10uuuuuu 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
		# Valid sequence, but symbol outside defined Unicode range.
		if ($cbCh != 8) {
			return false;
		}
	}
	return substr($s, $ib, $cbCh);
}


## Replaces or deletes any invalid UTF-8 sequence. See also: <http://www.w3.org/International/
# questions/qa-forms-utf-8>
#
# string $s
#    String to fix.
# [string $sReplace]
#    Replacement character/string. Defaults to an empty string.
# string return
#    Proper UTF-8 string.
#
function utf8_fix($s, $sReplace = '') {
	# Match either an allowed sequence ($arrMatch[0]) or an invalid symbol ($arrMatch[1]).
	static $sInvalidCharPattern = '/(?:[\x00-\x7f]|[\xc2-\xdf][\x80-\xbf]|\xe0[\xa0-\xbf][\x80-\xbf]|[\xe1-\xec\xee\xef][\x80-\xbf]{2}|\xed[\x80-\x9f][\x80-\xbf]|\xf0[\x90-\xbf][\x80-\xbf]{2}|[\xf1-\xf3][\x80-\xbf]{3}|\xf4[\x80-\x8f][\x80-\xbf]{2}|(.))/S';
	$sRet = '';
	for (
		$ich = 0;
		preg_match($sInvalidCharPattern, $s, $arrMatch, 0, $ich);
		$ich += strlen($arrMatch[0])
	) {
		$sRet .= (isset($arrMatch[1]) ? $sReplace : $arrMatch[0]);
	}
	return $sRet;
}


## Deletes or converts in entity any UTF-8 character not allowed in XML. Improved version of PHP’s
# htmlspecialchars(). See also: <http://www.w3.org/TR/REC-xml/#charsets>
#
# string $s
#    String to fix.
# string return
#    String ready to be embedded in an XML document.
#
function utf8_xmlenc($s) {
	static $arrEntities = array(
		'&' => '&amp;',
		'"' => '&quot;',
		'<' => '&lt;',
		'>' => '&gt;',
	);
	$s = preg_replace(
		'/[^\x09\x0a\x0d\x20-\x{d7ff}\x{e000}-\x{fffd}\x{10000}-\x{10ffff}]+/u', '', $s
	);
	$s = strtr($s, $arrEntities);
	return $s;
}


## Converts sequences of digits in any alphabet in ASCII numbers.
#
# string $s
#    UTF-8 string from which to collect numbers.
# string return
#    UTF-8 string with ASCII-only numbers.
#
function utf8_gathernumbers($s) {
	static $arrToAsciiNumbers = null;
	if ($arrToAsciiNumbers === null) {
		$arrToAsciiNumbers = ql_php_get_array_file_contents(
			$_APP['core']['rodata_lpath'] . 'core/utf-8/toasciinumbers.dat'
		);
	}
	foreach ($arrToAsciiNumbers as $sSetName => &$arrSet) {
		if ($arrSet['category'] == 'Nd') {
			$s = strtr($s, $arrSet);
		} else {
			$converter = new Ql__utf8_gathernumbers_converter($arrSet);
			$s = preg_replace_callback(
				$arrSet['match'], array($converter, 'callback_' . $arrSet['category']), $s
			);
		}
	}
	return $s;
}


## Helper class for utf8_gathernumbers(), to store (instance) data between invocations by
# preg_replace_callback(). Closures would make this much simpler…
#
class Ql__utf8_gathernumbers_converter {

	private /*array(array)&*/ $m_arrSet;


	public function __construct(array& $arrSet) {
		$this->m_arrSet =& $arrSet;
	}


	public function callback_Nl(array& $arrMatch) {
		$mTotal = 0;
		$sNumber = $arrMatch[0];
		while ($ch = utf8_charnext($sNumber, $ib)) {
			$mTotal += $this->m_arrSet['numbers'][$ch];
		}
		return $mTotal;
	}


	public function callback_No(array& $arrMatch) {
		return (int)$arrMatch[1] + $this->m_arrSet['numbers'][$arrMatch[2]];
	}
}


## Returns a series of alternatives (|-separated) for a PCRE matching UTF-8 whitespace characters.
#
# [string $sSet]
#    Each letter in this string will cause one of those to be returned:
#    B Breaking characters.
#    L Line-break characters.
#    N Non-breaking characters.
# string return
#    UTF-8 whitespace PCRE alternatives.
#
function utf8_getws($sSet = 'BL') {
	static $arrWhitespace = null;
	if ($arrWhitespace === null) {
		$arrWhitespace = ql_php_get_array_file_contents(
			$_APP['core']['rodata_lpath'] . 'core/utf-8/whitespace.dat'
		);
	}
	$s = '';
	if (strpos($sSet, 'B') !== false) $s .= $arrWhitespace['B'];
	if (strpos($sSet, 'L') !== false) $s .= $arrWhitespace['L'];
	if (strpos($sSet, 'N') !== false) $s .= $arrWhitespace['N'];
	return substr($s, 0, -1);
}


## UTF-8 version of ltrim().
#
# string $s
#    UTF-8 string.
# string return
#    The input string, without UTF-8 whitespace characters on the left.
#
function utf8_ltrim($s) {
	static $sPattern = null;
	if ($sPattern === null) {
		$sPattern = '/^(?:' . utf8_getws() . ')*/AS';
	}
	return preg_replace($sPattern, '', $s);
}


## UTF-8 version of rtrim().
#
# string $s
#    UTF-8 string.
# string return
#    The input string, without UTF-8 whitespace characters on the right.
#
function utf8_rtrim($s) {
	static $sPattern = null;
	if ($sPattern === null) {
		$sPattern = '/(?:' . utf8_getws() . ')*$/DS';
	}
	return preg_replace($sPattern, '', $s);
}


## UTF-8 version of strlen().
#
# string $s
#    UTF-8 string whose length is to be measured.
# int return
#    Length of the string, in UTF-8 characters.
#
function utf8_strlen($s) {
	return strlen(utf8_decode($s));
}


## UTF-8 version of strpos().
#
# string $sHayStack
#    UTF-8 string to search in.
# string $sNeedle
#    UTF-8 string to search for.
# [int $ichOffset]
#    Number of UTF-8 characters to skip, from the beginning of the string. Defaults to 0.
# int return
#    Offset of the first occurrence of $sNeedle in $sHayStack, or false if $sNeedle was not found.
#
function utf8_strpos($sHayStack, $sNeedle, $ichOffset = 0) {
	if ($ichOffset) {
		# Adjust the offset from characters to bytes. From utf8_substr().
		$iMult = $ichOffset >> 15;
		$iMod = $ichOffset & 0x7fff;
		if (!preg_match(
			'/^(?:' . ($iMult ? '(?:.{32768}){' . $iMult . '}' : '') . '.{' . $iMod . '})(.*)$/us',
			$sHayStack,
			$arrMatch
		)) {
			return false;
		}
		$sHayStack =& $arrMatch[1];
	}
	$ib = strpos($sHayStack, $sNeedle);
	# Convert the returned offset back to UTF-8 characters.
	return $ib !== false ? $ichOffset + utf8_strlen(substr($sHayStack, 0, $ib)) : false;
}


## UTF-8 version of strstr().
#
# string $sHayStack
#    UTF-8 string to search in.
# string $sNeedle
#    UTF-8 string to search for.
# [int $ichOffset]
#    Number of UTF-8 characters to skip, from the beginning of the string. Defaults to 0.
# string return
#    First occurrence of $sNeedle in $sHayStack plus any trailing characters, or false if $sNeedle
#    was not found.
#
function utf8_strstr($sHayStack, $sNeedle, $ichOffset = 0) {
	if ($ichOffset) {
		# Adjust the offset from characters to bytes. From utf8_substr().
		$iMult = $ichOffset >> 15;
		$iMod = $ichOffset & 0x7fff;
		if (!preg_match(
			'/^(?:' . ($iMult ? '(?:.{32768}){' . $iMult . '}' : '') . '.{' . $iMod . '})(.*)$/us',
			$sHayStack,
			$arrMatch
		)) {
			return false;
		}
		$sHayStack =& $arrMatch[1];
	}
	return strstr($sHayStack, $sNeedle);
}


## Transliterates any non-ASCII UTF-8 character.
#
# string $s
#    UTF-8 string.
# string return
#    ASCII-only transliteration of the input string.
#
function utf8_strtoascii($s) {
	static $arrAsciiTranslit = null;
	if ($arrAsciiTranslit === null) {
		$arrAsciiTranslit = ql_php_get_array_file_contents(
			$_APP['core']['rodata_lpath'] . 'core/utf-8/asciitranslit.dat'
		);
	}
	$s = strtr($s, $arrAsciiTranslit);
	# Delete any remaining non-ASCII characters.
	$s = preg_replace('/[\x80-\xff]+/', '', $s);
	return $s;
}


## UTF-8 version of strtolower().
#
# string $s
#    UTF-8 string.
# string return
#    Lowercase version of the input string.
#
function utf8_strtolower($s) {
	static $arrToLower = null;
	if ($arrToLower === null)
		$arrToLower = ql_php_get_array_file_contents(
			$_APP['core']['rodata_lpath'] . 'core/utf-8/tolowercase.dat'
		);
	return strtr($s, $arrToLower);
}


## UTF-8 version of strtoupper().
#
# string $s
#    UTF-8 string.
# string return
#    Uppercase version of the input string.
#
function utf8_strtoupper($s) {
	static $arrToUpper = null;
	if ($arrToUpper === null) {
		$arrToUpper = ql_php_get_array_file_contents(
			$_APP['core']['rodata_lpath'] . 'core/utf-8/touppercase.dat'
		);
	}
	return strtr($s, $arrToUpper);
}


## UTF-8 version of substr().
#
# string $s
#    UTF-8 string whose substring is to be extracted.
# int $ichOffset
#    Offset of the first UTF-8 character to be returned.
# [int $cch]
#    Number of characters to be returned.
# string return
#    The specified portion of the input string.
#
function utf8_substr($s, $ichOffset, $cch = null) {
	$ichOffset = (int)$ichOffset;
	if ($cch !== null) {
		$cch = (int)$cch;
	}
	if (($cch === 0) || ($ichOffset < 0 && $cch < 0 && $cch < $ichOffset)) {
		return '';
	}
	if ($ichOffset < 0) {
		$cchS = strlen(utf8_decode($s));
		$ichOffset = $cchS + $ichOffset;
		if ($ichOffset < 0) {
			$ichOffset = 0;
		}
	}
	if ($ichOffset > 0) {
		$iMult = $ichOffset >> 15;
		$iMod = $ichOffset & 0x7fff;
		$sOffsetPattern = '^(?:' . ($iMult ? '(?:.{32768}){' . $iMult . '}' : '') . '.{' . $iMod .
			'})';
	} else {
		$sOffsetPattern = '^';
	}
	if ($cch === null) {
		$sLengthPattern = '(.*)$';
	} else {
		if (!isset($cchS)) {
			$cchS = strlen(utf8_decode($s));
		}
		if ($ichOffset > $cchS) {
			return '';
		}
		if ($cch > 0) {
			$cch = min($cchS - $ichOffset, $cch);
			$iMult = $cch >> 15;
			$iMod = $cch & 0x7fff;
			$sLengthPattern = '(' . ($iMult ? '(?:.{32768}){' . $iMult . '}' : '') . '.{' . $iMod .
				'})';
		} else if ($cch < 0) {
			if ($cch < $ichOffset - $cchS) {
				return '';
			}
			$iMult = -$cch >> 15;
			$iMod = -$cch & 0x7fff;
			$sLengthPattern = '(.*)(?:' . ($iMult ? '(?:.{32768}){' . $iMult . '}' : '') . '.{' .
				$iMod . '})$';
		} else {
			$sLengthPattern = '';
		}
	}
	return preg_match('/' . $sOffsetPattern . $sLengthPattern . '/us', $s, $arrMatch)
		? $arrMatch[1]
		: '';
}


## UTF-8 version of trim().
#
# string $s
#    UTF-8 string.
# string return
#    The input string, without UTF-8 whitespace characters on either ends.
#
function utf8_trim($s) {
	return utf8_ltrim(utf8_rtrim($s));
}


## UTF-8 version of ucfirst().
#
# string $s
#    UTF-8 string.
# string return
#    The input string, with the first character uppercase, and the rest lowercase.
#
function utf8_ucfirst($s) {
	static $arrToTitle = null;
	if ($arrToTitle === null) {
		$arrToTitle = ql_php_get_array_file_contents(
			$_APP['core']['rodata_lpath'] . 'core/utf-8/totitlecase.dat'
		);
	}
	return strtr($s{0}, $arrToTitle) . substr($s, 1);
}


## UTF-8 version of ucwords().
#
# string $s
#    UTF-8 string.
# string return
#    The input string, with each word turned lowercase with a capital letter.
#
function utf8_ucwords($s) {
	# Fairly quick and clean.
	return preg_replace_callback('/\pL+/u', 'utf8_ucfirst', $s);
}


## Checks the string to be a valid sequence of UTF-8 symbols.
#
# string $s
#    String to check.
# bool return
#    true if the string is valid UTF-8, false otherwise.
#
function utf8_validate($s) {
	return utf8_fix($s) == $s;
}



####################################################################################################
# UTF-16 functions


## Returns the UTF-16 character at the specified (byte) offset position, and moves the index past
# it.
#
# string $s
#    UTF-16 string to be parsed.
# int& $ib
#    Byte offset of the desired character.
# bool $bBigEndian
#    Assumes the string is UTF-16BE-encoded if true, UTF-16LE otherwise.
# string return
#    The UTF-16 character following the specified index.
#
function utf16_charprev($s, &$ib, $bBigEndian) {
	$cb = strlen($s);
	if ($ib === null || $ib > $cb) {
		$ib = $cb;
	}
	if ($ib < 2) {
		return false;
	}
	$b = ord($s{$ib - ($bBigEndian ? 2 : 1)});
	if ($b >= 0xdc && $b <= 0xdf) {
		if ($ib < 4) {
			return false;
		}
		$ib -= 4;
		return substr($s, $ib, 4);
	}
	$ib -= 2;
	return substr($s, $ib, 2);
}


## Returns the UTF-16 character preceding the specified (byte) offset position, and moves the index
# to its starting byte.
#
# string $s
#    UTF-16 string to be parsed.
# int& $ib
#    Byte offset of the desired character.
# bool $bBigEndian
#    Assumes the string is UTF-16BE-encoded if true, UTF-16LE otherwise.
# string return
#    The UTF-16 characters preceding the specified index.
#
function utf16_charnext($s, &$ib, $bBigEndian) {
	if ($ib === null || $ib < 0) {
		$ib = 0;
	}
	$cb = strlen($s) - $ib;
	if ($cb < 2) {
		return false;
	}
	$b = ord($s{$bBigEndian ? $ib : $ib + 1});
	if ($b >= 0xd8 && $b <= 0xdb) {
		if ($cb < 4) {
			return false;
		}
		$ch = substr($s, $ib, 4);
		$ib += 4;
	} else {
		$ch = substr($s, $ib, 2);
		$ib += 2;
	}
	return $ch;
}


## UTF-16 version of strlen().
#
# string $s
#    UTF-16 string whose length is to be measured.
# bool $bBigEndian
#    Assumes the string is UTF-16BE-encoded if true, UTF-16LE otherwise.
# int return
#    Length of the string, in UTF-16 characters.
#
function utf16_strlen($s, $bBigEndian) {
	$cch = strlen($s) >> 1;
	if (preg_match_all(
		$bBigEndian ? '/[\xd8-\xdb].[\xdc-\xdf]./s' : '/.[\xd8-\xdb].[\xdc-\xdf]/s',
		$s,
		$arrMatches,
		PREG_OFFSET_CAPTURE
	)) {
		foreach ($arrMatches[0] as $arrMatch) {
			if (!($arrMatch[1] & 1)) {
				--$cch;
			}
		}
	}
	return $cch;
}


## Checks the string to be a valid sequence of UTF-16 symbols.
#
# string $s
#    String to check.
# bool $bBigEndian
#    Assumes the string is UTF-16BE-encoded if true, UTF-16LE otherwise.
# bool return
#    true if the string is valid UTF-16, false otherwise.
#
function utf16_validate($s, $bBigEndian) {
	return (bool)preg_match(
		$bBigEndian
			? '/^(.{2}|[\xd8-\xdb].[\xdc-\xdf].)*$/s'
			: '/^(.{2}|.[\xd8-\xdb].[\xdc-\xdf])*$/s',
		$s
	);
}



####################################################################################################
# Functions


## Converts between Unicode and non-Unicode encodings.
#
# mixed $s
#    String or character array to convert.
# [string $sInEncoding]
#    Source format. It can be determined automatically, if $s includes a BOM (Byte Order Mark).
# [string $sOutEncoding]
#    Destination format; a “+bom” suffix to the format name causes the returned string to include a
#    BOM. Defaults to UTF-8.
# mixed return
#    Result of the conversion.
#
function ql_unicode_conv($s, $sInEncoding = null, $sOutEncoding = 'utf-8') {
	if ($sInEncoding) {
		# If an encoding was specified, check if it defines the byte order. Regardless, remove the BOM
		# if present, and remember what it means if the encoding was ambiguous. If the encoding
		# doesn’t include a byte order specification, and the BOM is missing, bail out.
		$sInEncoding = strtolower($sInEncoding);
		switch ($sInEncoding = strtolower($sInEncoding)) {
			case 'utf-8':
				if (strncmp($s, "\xef\xbb\xbf", 3) == 0) {
					$s = substr($s, 3);
				}
				break;

			case 'ucs-2':
			case 'utf-16':
				if (strncmp($s, "\xff\xfe", 2) == 0) {
					$sInEncoding .= 'le';
				} else if (strncmp($s, "\xfe\xff", 2) == 0) {
					$sInEncoding .= 'be';
				} else {
					return false;
				}
				$s = substr($s, 2);
				break;

			case 'ucs-2le':
			case 'utf-16le':
				if (strncmp($s, "\xff\xfe", 2) == 0) {
					$s = substr($s, 2);
				}
				break;

			case 'ucs-2be':
			case 'utf-16be':
				if (strncmp($s, "\xfe\xff", 2) == 0) {
					$s = substr($s, 2);
				}
				break;

			case 'ucs-4':
			case 'utf-32':
				if (strncmp($s, "\xff\xfe\x00\x00", 4) == 0) {
					$sInEncoding .= 'le';
				} else if (strncmp($s, "\x00\x00\xfe\xff", 4) == 0) {
					$sInEncoding .= 'be';
				} else {
					return false;
				}
				$s = substr($s, 4);
				break;

			case 'ucs-4le':
			case 'utf-32le':
				if (strncmp($s, "\xff\xfe\x00\x00", 4) == 0) {
					$s = substr($s, 4);
				}
				break;

			case 'ucs-4be':
			case 'utf-32be':
				if (strncmp($s, "\x00\x00\xfe\xff", 4) == 0) {
					$s = substr($s, 4);
				}
				break;
		}
	} else if (is_array($s)) {
		$sInEncoding = 'raw';
	# Check for any encoding defined by a BOM.
	} else if (strncmp($s, "\xff\xfe\x00\x00", 4) == 0) {
		$s = substr($s, 4);
		$sInEncoding = 'utf-32le';
	} else if (strncmp($s, "\x00\x00\xfe\xff", 4) == 0) {
		$s = substr($s, 4);
		$sInEncoding = 'utf-32be';
	} else if (strncmp($s, "\xff\xfe", 2) == 0) {
		$s = substr($s, 2);
		$sInEncoding = 'utf-16le';
	} else if (strncmp($s, "\xfe\xff", 2) == 0) {
		$s = substr($s, 2);
		$sInEncoding = 'utf-16be';
	} else if (strncmp($s, "\xef\xbb\xbf", 3) == 0) {
		$s = substr($s, 3);
		$sInEncoding = 'utf-8';
	} else {
		return false;
	}

	$sOutEncoding = strtolower($sOutEncoding);
	if ($sInEncoding == $sOutEncoding) {
		# No transcoding necessary.
		return $s;
	}
	switch ($sInEncoding) {
		case 'raw':
			$arr = $s;
			break;

		case 'ascii':
		case 'iso-8859-1':
			$arr = unpack('C*', $s);
			break;

		case 'utf-8':
			$arr = array();
			$ib = 0;
			$cb = strlen($s);
			while ($ib < $cb) {
				if (($b = ord($s{$ib})) <= 0x7f) {
					# 0zzzzzzz -> 00000000 00000000 00000000 0zzzzzzz
					$arr[] = $b;
					++$ib;
				} else if ($b <= 0xbf) {
					# 10xxxxxx
					# Can only appear inside an UTF-8 sequence, so it’s not valid here.
					;
				} else if ($b <= 0xdf) {
					# 110yyyyy 10zzzzzz -> 00000000 00000000 00000yyy yyzzzzzz
					$arr[] = ((        $b       & 0x1f) << 6) |
								 (ord($s{$ib + 1}) & 0x3f);
					$ib += 2;
				} else if ($b <= 0xef) {
					# 1110xxxx 10yyyyyy 10zzzzzz -> 00000000 00000000 xxxxyyyy yyzzzzzz
					$arr[] = ((        $b       & 0x0f) << 12) |
								((ord($s{$ib + 1}) & 0x3f) <<  6) |
								 (ord($s{$ib + 2}) & 0x3f);
					$ib += 3;
				} else if ($b <= 0xF7) {
					# 11110www 10xxxxxx 10yyyyyy 10zzzzzz -> 00000000 000wwwxx xxxxyyyy yyzzzzzz
					$arr[] = ((        $b       & 0x07) << 18) |
								((ord($s{$ib + 1}) & 0x3f) << 12) |
								((ord($s{$ib + 2}) & 0x3f) <<  6) |
								 (ord($s{$ib + 3}) & 0x3f);
					$ib += 4;
				} else if ($b <= 0xfb) {
					# 111110vv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
					# Valid sequence, but symbol outside defined Unicode range.
					$ib += 5;
				} else if ($b <= 0xfd) {
					# 1111110u 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
					# Valid sequence, but symbol outside defined Unicode range.
					$ib += 6;
				} else if ($b <= 0xfe) {
					# 11111110 10uuuuuu 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
					# Valid sequence, but symbol outside defined Unicode range.
					$ib += 7;
				} else {
					# 11111111 10tttttt 10uuuuuu 10vvvvvv 10wwwwww 10xxxxxx 10yyyyyy 10zzzzzz
					# Valid sequence, but symbol outside defined Unicode range.
					$ib += 8;
				}
			}
			break;

		case 'ucs-2le':
			$arr = unpack('v*', $s);
			break;

		case 'ucs-2be':
			$arr = unpack('n*', $s);
			break;

		case 'utf-16le':
			$arr = array();
			$ib = 0;
			$cb = strlen($s) - 1;
			while ($ib < $cb) {
				if ((($b = ord($s{$ib + 1})) & 0xd8) == 0xd8) {
					$arr[] = ((        $b       & 0x03) << 18) |
								( ord($s{$ib    })         << 10) |
								((ord($s{$ib + 3}) & 0x03) <<  8) |
								  ord($s{$ib + 2})
								+ 0x10000;
					$ib += 4;
				} else {
					$arr[] = ($b << 8) | ord($s{$ib});
					$ib += 2;
				}
			}
			break;

		case 'utf-16be':
			$arr = array();
			$ib = 0;
			$cb = strlen($s) - 1;
			while ($ib < $cb) {
				if ((($b = ord($s{$ib})) & 0xd8) == 0xd8) {
					$arr[] = ((        $b       & 0x03) << 18) |
								( ord($s{$ib + 1})         << 10) |
								((ord($s{$ib + 2}) & 0x03) <<  8) |
								  ord($s{$ib + 3})
								+ 0x10000;
					$ib += 4;
				} else {
					$arr[] = ($b << 8) | ord($s{$ib + 1});
					$ib += 2;
				}
			}
			break;

		case 'ucs-4le':
		case 'utf-32le':
			$arr = unpack('V*', $s);
			break;

		case 'ucs-4be':
		case 'utf-32be':
			$arr = unpack('N*', $s);
			break;

		default:
			return false;
	}
	$s = '';
	switch ($sOutEncoding) {
		case 'raw':
			$s =& $arr;
			break;

		case 'xml':
			foreach ($arr as $ch) {
				$s .= '&#x' . dechex($ch) . ';';
			}
			break;

		case 'ascii':
			foreach ($arr as $ch) {
				if ($ch <= 0x0000007f) {
					$s .= chr($ch);
				}
			}
			break;

		case 'iso-8859-1':
			foreach ($arr as $ch) {
				if ($ch <= 0x000000ff) {
					$s .= chr($ch);
				}
			}
			break;

		case 'utf-8+bom':
			$s = "\xef\xbb\xbf";
		case 'utf-8':
			foreach ($arr as $ch) {
				if ($ch <= 0x0000007f) {
					# 00000000 00000000 00000000 0zzzzzzz -> 0zzzzzzz
					$s .= chr($ch);
				} else if ($ch <= 0x000007ff) {
					# 00000000 00000000 00000yyy yyzzzzzz -> 110yyyyy 10zzzzzz
					$s .= chr(0xc0 | (($ch & 0x000007c0) >> 6)) .
							chr(0x80 |  ($ch & 0x0000003f)     );
				} else if ($ch <= 0x0000ffff) {
					# 00000000 00000000 xxxxyyyy yyzzzzzz -> 1110xxxx 10yyyyyy 10zzzzzz
					$s .= pack('c3',
								0xe0 | (($ch & 0x0000f000) >> 12),
								0x80 | (($ch & 0x00000fc0) >>  6),
								0x80 |  ($ch & 0x0000003f)
							);
				} else if ($ch <= 0x0010ffff) {
					# 00000000 000wwwxx xxxxyyyy yyzzzzzz -> 11110www 10xxxxxx 10yyyyyy 10zzzzzz
					$s .= pack('c4',
								0xf0 | (($ch & 0x001c0000) >> 18),
								0x80 | (($ch & 0x0003f000) >> 12),
								0x80 | (($ch & 0x00000fc0) >>  6),
								0x80 |  ($ch & 0x0000003f)
							);
				}
			}
			break;

		case 'ucs-2le+bom':
			$s = "\xff\xfe";
		case 'ucs-2le':
			array_unshift($arr, 'v*');
			$s .= call_user_func_array('pack', $arr);
			break;

		case 'ucs-2be+bom':
			$s = "\xfe\xff";
		case 'ucs-2be':
			array_unshift($arr, 'n*');
			$s .= call_user_func_array('pack', $arr);
			break;

		case 'utf-16le+bom':
			$s = "\xff\xfe";
		case 'utf-16le':
			foreach ($arr as $ch) {
				if ($ch <= 0x0000ffff) {
					$s .= chr( $ch & 0x000000ff      ) .
							chr(($ch & 0x0000ff00) >> 8);
				} else if ($ch <= 0x0010ffff) {
					$ch -= 0x10000;
					$s .= pack('c4',
										  ($ch & 0x0003fc00) >> 10,
								0xd8 | (($ch & 0x000c0000) >> 18),
										  ($ch & 0x000000ff),
								0xdc | (($ch & 0x00000300) >>  8)
							);
				}
			}
			break;

		case 'utf-16be+bom':
			$s = "\xfe\xff";
		case 'utf-16be':
			foreach ($arr as $ch) {
				if ($ch <= 0x0000ffff) {
					$s .= chr(($ch & 0x0000ff00) >> 8) .
							chr( $ch & 0x000000ff      );
				} else if ($ch <= 0x0010ffff) {
					$ch -= 0x10000;
					$s .= pack('c4',
								0xd8 | (($ch & 0x000c0000) >> 18),
										  ($ch & 0x0003fc00) >> 10 ,
								0xdc | (($ch & 0x00000300) >>  8),
										  ($ch & 0x000000ff)
							);
				}
			}
			break;

		case 'ucs-4le+bom':
		case 'utf-32le+bom':
			$s = "\xff\xfe\x00\x00";
		case 'ucs-4le':
		case 'utf-32le':
			array_unshift($arr, 'V*');
			$s .= call_user_func_array('pack', $arr);
			break;

		case 'ucs-4be+bom':
		case 'utf-32be+bom':
			$s = "\x00\x00\xfe\xff";
		case 'ucs-4be':
		case 'utf-32be':
			array_unshift($arr, 'N*');
			$s .= call_user_func_array('pack', $arr);
			break;

		default:
			return false;
	}
	return $s;
}

?>
