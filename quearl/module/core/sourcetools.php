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

# Language syntax highlighting.


define('QUEARL_CORE_SOURCETOOLS_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Constants


define('QL_SYHL_NORMAL',   0x0000001);
define('QL_SYHL_COMMENT',  0x0000002);
define('QL_SYHL_STRING',   0x0000003);
define('QL_SYHL_NUMBER',   0x0000004);
define('QL_SYHL_KEYWORD0', 0x0000010);
define('QL_SYHL_KEYWORD1', 0x0000011);
define('QL_SYHL_KEYWORD2', 0x0000012);
define('QL_SYHL_KEYWORD3', 0x0000013);
define('QL_SYHL_KEYWORD4', 0x0000014);
define('QL_SYHL_KEYWORD5', 0x0000015);
define('QL_SYHL_KEYWORD6', 0x0000016);
define('QL_SYHL_KEYWORD7', 0x0000017);
define('QL_SYHL_KEYWORD8', 0x0000018);
define('QL_SYHL_KEYWORD9', 0x0000019);
define('QL_SYHL_SUBLANG',  0x0000100);



####################################################################################################
# Functions


## Applies HTML-based syntax highlighting to a string, according to the specified language.
#
# string $s
#    Source code whose syntax should be highlighted.
# string $sLanguage
#    Programming language name.
# [array<string => mixed> $arrOptions]
#    Formatting options:
#    [int 'maxstringlen']
#       Trim comments exceeding this length.
#    [int 'maxcommentlen']
#       Trim strings exceeding this length.
#
function ql_str_syntaxhighlight($s, $sLanguage, array $arrOptions = array()) {
	# Available colors.
	# TODO: use CSS to reduce output size.
	static $arrColors = array(
		QL_SYHL_NORMAL   => array('begin' => '', 'end' => ''),
		QL_SYHL_COMMENT  => array('begin' => '<span style="color: #009900;">', 'end' => '</span>'),
		QL_SYHL_STRING   => array(
			'begin' => '<span style="color: #888888; background: #F8F8F8;">', 'end' => '</span>'
		),
		QL_SYHL_NUMBER   => array('begin' => '<span style="color: #BB8800;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD0 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD1 => array('begin' => '<span style="color: #339999;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD2 => array('begin' => '<span style="color: #993399;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD3 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD4 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD5 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD6 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD7 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD8 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_KEYWORD9 => array('begin' => '<span style="color: #0033CC;">', 'end' => '</span>'),
		QL_SYHL_SUBLANG  => array(
			'begin' => '<span style="color: #000000; background: #FFCC33;">', 'end' => '</span>'
		),
	);
	# Language syntax definitions.
	static $arrTokenTypesByLang = array(

		'php' => array(
			array(
				'type'     => QL_SYHL_STRING,
				'match'    => '/((\')([^\'\\\\]*(?:\\\\.[^\'\\\\]*)*)(\'))/'
			),
			array(
				'type'     => QL_SYHL_STRING,
				'match'    => '/((")([^"\\\\]*(?:\\\\.[^"\\\\]*)*)("))/'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((#)(.*?))$/m'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((\/\/)(.*?))$/m'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((\/\*)(.*?)(\*\/))/'
			),
			array(
				'type'     => QL_SYHL_NUMBER,
				'match'    => '/(\b\d+(\.\d+)?([Ee][+\-]?\d+)?\b)/'
			),
			array(
				'type'     => QL_SYHL_KEYWORD0,
				'match'    => '/\b(%s)\b/i',
				'matcharr' => array(
					'__FILE__', '__LINE__',
					'abstract', 'array', 'as',
					'break',
					'case', 'catch', 'cfunction', 'class', 'clone', 'const', 'continue',
					'declare', 'default', 'die', 'do',
					'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif',
						'endswitch', 'endwhile', 'eval', 'exception', 'exit', 'extends',
					'false', 'final', 'for', 'foreach', 'function',
					'global',
					'if', 'implements', 'include', 'include_once', 'interface', 'isset',
					'list',
					'null',
					'old_function',
					'php_user_filter', 'print', 'private', 'protected', 'public',
					'require', 'require_once', 'return',
					'static', 'switch',
					'this', 'throw', 'true', 'try',
					'unset', 'use',
					'var',
					'while',
				)
			),
			array(
				'type'     => QL_SYHL_KEYWORD0,
				'match'    => '/(\$(?:%s))\b/i',
				'matcharr' => array(
					'GLOBALS',
					'_COOKIE', '_ENV', '_FILES', '_GET', '_POST', '_REQUEST', '_SERVER', '_SESSION',
					'php_errormsg',
					'this',
				)
			),
			array(
				'type'     => QL_SYHL_KEYWORD0,
				'match'    => '/\b(%s)\b/',
				'matcharr' => array(
					'__CLASS__', '__FUNCTION__', '__METHOD__',
				)
			),
			array(
				'type'     => QL_SYHL_KEYWORD2,
				'match'    => '/([!%&()*+,\-.\/:;<=>^\[\]{|}~]+)/'
			),
			array(
				'type'     => QL_SYHL_KEYWORD2,
				'match'    => '/\b(%s)\b/i',
				'matcharr' => array(
					'and',
					'new',
					'or',
					'xor',
				)
			),
		),


		'mysql' => array(
			array(
				'type'     => QL_SYHL_STRING,
				'match'    => '/((\')([^\'\\\\]*(?:\\\\.[^\'\\\\]*)*)(\'))/'
			),
			array(
				'type'     => QL_SYHL_STRING,
				'match'    => '/((")([^"\\\\]*(?:\\\\.[^"\\\\]*)*)("))/'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((#)(.*?))$/m'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((--)(.*?))$/m'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((\/\*)(.*?)(\*\/))/'
			),
			array(
				'type'     => QL_SYHL_NUMBER,
				'match'    => '/(\b\d+(\.\d+)?([Ee][+\-]?\d+)?\b)/'
			),
			array(
				'type'     => QL_SYHL_KEYWORD1,
				'match'    => '/\b(%s)\(/i',
				'matcharr' => array(
					'ABS', 'ACOS', 'ADDDATE', 'ADDTIME', 'ASIN', 'ATAN', 'ATAN2', 'AVG',
					'BIN', 'BIT_AND', 'BIT_OR', 'BIT_LENGTH', 'BIT_XOR',
					'CEIL', 'CEILING', 'CHAR_LENGTH', 'CHARACTER_LENGTH', 'COMPRESS', 'CONCAT',
						'CONCAT_WS', 'CONV', 'CONVERT_TZ', 'COS', 'COT', 'COUNT', 'CRC32', 'CURDATE',
						'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'CURTIME',
					'DATE_ADD', 'DATE_FORMAT', 'DATE_SUB', 'DATEDIFF', 'DAY', 'DAYNAME', 'DAYOFMONTH',
						'DAYOFWEEK', 'DAYOFYEAR', 'DEGREES',
					'ELT', 'EXP', 'EXPORT_SET', 'EXTRACT',
					'FIELD', 'FIND_IN_SET', 'FLOOR', 'FORMAT', 'FROM_DAYS', 'FROM_UNIXTIME',
					'GET_FORMAT', 'GROUP_CONCAT',
					'HEX',
					'IF', 'IFNULL', 'INSERT', 'INSTR',
					'LAST_DAY', 'LCASE', 'LEFT', 'LENGTH', 'LN', 'LOAD_FILE', 'LOCALTIME',
						'LOCALTIMESTAMP', 'LOCATE', 'LOG', 'LOG10', 'LOG2', 'LOWER', 'LPAD', 'LTRIM',
					'MAKE_SET', 'MAKEDATE', 'MAKETIME', 'MAX', 'MD5', 'MICROSECOND', 'MID', 'MIN', 'MOD',
						'MONTHNAME',
					'NOW', 'NULLIF',
					'OCT', 'OCTET_LENGTH', 'ORD',
					'PERIOD_ADD', 'PERIOD_DIFF', 'PI', 'POSITION', 'POW', 'POWER',
					'QUARTER', 'QUOTE',
					'RADIANS', 'RAND', 'REPEAT', 'REPLACE', 'REVERSE', 'RIGHT', 'ROUND', 'RPAD', 'RTRIM',
					'SEC_TO_TIME', 'SECOND', 'SHA1', 'SIGN', 'SIN', 'SOUNDEX', 'SPACE', 'SQRT',
						'STR_TO_DATE', 'STD', 'STDDEV', 'SUBDATE', 'SUBSTRING', 'SUBSTRING_INDEX',
						'SUBTIME', 'SUM', 'SYSDATE',
					'TAN', 'TIME', 'TIME_FORMAT', 'TIME_TO_SEC', 'TIMEDIFF', 'TIMESTAMP', 'TIMESTAMPADD',
						'TIMESTAMPDIFF', 'TO_DAYS', 'TRIM', 'TRUNCATE',
					'UCASE', 'UNCOMPRESS', 'UNCOMPRESSD_LENGTH', 'UNHEX', 'UNIX_TIMESTAMP', 'UPPER',
						'UTC_DATE', 'UTC_TIME', 'UTC_TIMESTAMP',
					'VARIANCE',
					'WEEKDAY', 'WEEKOFYEAR',
					'YEARWEEK',
				)
			),
			array(
				'type'     => QL_SYHL_KEYWORD0,
				'match'    => '/\b(%s)\b/i',
				'matcharr' => array(
					'ADD', 'ALL', 'ALTER', 'ANALYZE', 'AS', 'ASC', 'ASENSITIVE',
					'BEFORE', 'BIGINT', 'BLOB', 'BOTH', 'BY',
					'CALL', 'CASCADE', 'CASE', 'CHANGE', 'CHAR', 'CHARACTER', 'CHECK', 'COLUMN',
						'CONDITION', 'CONNECTION', 'CONSTRAINT', 'CONTINUE', 'CONVERT', 'CREATE', 'CROSS',
						'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'CURRENT_USER', 'CURSOR',
					'DATABASE', 'DATABASES', 'DAY_HOUR', 'DAY_MICROSECOND', 'DAY_MINUTE', 'DAY_SECOND',
						'DEC', 'DECIMAL', 'DECLARE', 'DEFAULT', 'DELAYED', 'DELETE', 'DESC', 'DESCRIBE',
						'DETERMINISTIC', 'DISTINCT', 'DISTINCTROW', 'DOUBLE', 'DROP', 'DUAL',
					'EACH', 'ELSE', 'ELSEIF', 'ENCLOSED', 'ESCAPE', 'ESCAPED', 'EXISTS', 'EXIT',
						'EXPLAIN',
					'FALSE', 'FETCH', 'FLOAT', 'FOR', 'FORCE', 'FOREIGN', 'FROM', 'FULLTEXT',
					'GOTO', 'GRANT', 'GROUP',
					'HAVING', 'HIGH_PRIORITY', 'HOUR_MICROSECOND', 'HOUR_MINUTE', 'HOUR_SECOND',
					'IF', 'IGNORE', 'INDEX', 'INNER', 'INOUT', 'INSENSITIVE', 'INSERT', 'INT', 'INTEGER',
						'INTERVAL', 'INTO', 'ITERATE',
					'JOIN',
					'KEY', 'KEYS', 'KILL',
					'LEADING', 'LEAVE', 'LEFT', 'LIMIT', 'LINES', 'LOAD DATA INFILE', 'LOCALTIME',
						'LOCALTIMESTAMP', 'LOCK', 'LONG', 'LONGBLOB', 'LONGTEXT', 'LOOP', 'LOW_PRIORITY',
					'MATCH', 'MEDIUMBLOB', 'MEDIUMINT', 'MEDIUMTEXT', 'MIDDLEINT', 'MINUTE_MICROSECOND',
						'MINUTE_SECOND', 'MODIFIES',
					'NATURAL', 'NO_WRITE_TO_BINLOG', 'NULL', 'NUMERIC',
					'ON', 'OPTIMIZE', 'OPTION', 'OPTIONALLY', 'ORDER', 'OUT', 'OUTER', 'OUTFILE',
					'PRECISION', 'PRIMARY', 'PROCEDURE', 'PURGE',
					'READ', 'READS', 'REAL', 'REFERENCES', 'RENAME', 'REPEAT', 'REPLACE', 'REQUIRE',
						'RESTRICT', 'RETURN', 'REVOKE', 'RIGHT', 'ROLLBACK TO SAVEPOINT', 'ROUTINE',
					'SCHEMA', 'SCHEMAS', 'SECOND_MICROSECOND', 'SELECT', 'SENSITIVE', 'SEPARATOR', 'SET',
						'SET TRANACTIONS', 'SHOW', 'SHOW FUNCTION STATUS', 'SHOW PROCEDURE STATUS',
						'SMALLINT', 'SONAME', 'SPATIAL', 'SPECIFIC', 'SQL', 'SQLEXCEPTION', 'SQLSTATE',
						'SQLWARNING', 'SQL_BIG_RESULT', 'SQL_CALC_FOUND_ROWS', 'SQL_SMALL_RESULT', 'SSL',
						'START TRANSACTION', 'STARTING', 'STRAIGHT_JOIN',
					'TABLE', 'TABLES', 'TERMINATED', 'THEN', 'TINYBLOB', 'TINYINT', 'TINYTEXT', 'TO',
						'TRAILING', 'TRIGGER', 'TRUE',
					'UNDO', 'UNION', 'UNIQUE', 'UNLOCK', 'UNSIGNED', 'UPDATE', 'USAGE', 'USE', 'USING',
						'UTC_DATE', 'UTC_TIME', 'UTC_TIMESTAMP',
					'VALUES', 'VARBINARY', 'VARCHAR', 'VARCHARACTER', 'VARYING',
					'WHEN', 'WHERE', 'WHILE', 'WITH', 'WRITE',
					'YEAR_MONTH',
					'ZEROFILL',
				)
			),
			array(
				'type'  => QL_SYHL_KEYWORD2,
				'match' => '/([!%&()*+,\-.\/:;<=>^|~]+)/'
			),
			array(
				'type'     => QL_SYHL_KEYWORD2,
				'match'    => '/\b(%s)\b/i',
				'matcharr' => array(
					'AND',
					'BETWEEN', 'BINARY',
					'COLLATE',
					'DIV',
					'IN', 'IS',
					'LIKE',
					'MOD',
					'NOT',
					'OR',
					'REGEXP', 'RLIKE',
					'XOR'
				)
			),
		),


		'xml' => array(
			array(
				'type'     => QL_SYHL_SUBLANG,
				'match'    => '/((<\?php)(.*?)(\?>))/s',
				'sublang'  => 'php'
			),
			array(
				'type'     => QL_SYHL_COMMENT,
				'match'    => '/((<!--)(.*?)(-->))/'
			),
			array(
				'type'     => QL_SYHL_NORMAL,
				'match'    => '/((<!\[CDATA\[)(.*?)(\]\]>))/s'
			),
			/*array(
				'type'     => QL_SYHL_SUBLANG,
				'match'    => '/(<style[^>]>()(.*?)()<\/style>)/',
				'sublang'  => 'css'
			),*/
			/*array(
				'type'     => QL_SYHL_SUBLANG,
				'match'    => '/(<script[^>]>()(.*?)()<\/script>)/',
				'sublang'  => 'javascript'
			),*/
			array(
				'type'     => QL_SYHL_KEYWORD0,
				'match'    => '/(<\/?[0-9A-Za-z?!:\-]+)/'
			),
			array(
				'type'     => QL_SYHL_KEYWORD0,
				'match'    => '/(\/?>)/'
			),
			/*array(
				'type'     => QL_SYHL_STRING,
				'match'    => '/=((")([^"]*)("))[^<>]*>/'
			),*/
			array(
				'type'     => QL_SYHL_KEYWORD1,
				'match'    => '/([0-9A-Za-z\-:]+=)[^<>]*>/'
			),
			array(
				'type'     => QL_SYHL_KEYWORD2,
				'match'    => '/(&[0-9A-Za-z]+;)/'
			),
		),


		'css' => array(
			# TODO: implement.
		),


		'javascript' => array(
			# TODO: implement.
		),


		'c' => array(
			# TODO: implement.
		),


		'c++' => array(
			# TODO: implement.
		),
	);

	$sLanguage = strtolower($sLanguage);
	if (!isset($arrTokenTypesByLang[$sLanguage]))
		# Unknown language.
		return false;

	# Copy the token types array, so we can customize it for this invocation.
	$arrTokenTypes = $arrTokenTypesByLang[$sLanguage];
	# Convert newline characters.
	$sNL = ql_str_detectnl($s, "\n");
	if ($sNL != "\n")
		$s = str_replace($sNL, "\n", $s);
	# For each token type, add information on the next match and apply any specified formatting.
	foreach ($arrTokenTypes as &$arrTT) {
		$arrTT['next'] = array(1 => array(null, -1));
		if (isset($arrTT['matcharr']))
			$arrTT['match'] = sprintf(
				$arrTT['match'], str_replace(' ', '\s+', implode('|', $arrTT['matcharr']))
			);
	}

	# Setup the scan loop, including setting a time limit in case some regexp misbehaves.
	$sOut = '';
	$cch = strlen($s);
	if (!$cch)
		return '';
	$ich = 0;
	$iOldTimeLimit = ini_get('max_execution_time');
	set_time_limit(5);
	for (;;) {
		# Find the next match for each token type, keeping track of the closest.
		foreach ($arrTokenTypes as &$arrTT)
			# Don’t re-execute the regexp if the next match we found previously is still forward in the
			# string.
			if (
				$arrTT['next'][1][1] >= $ich ||
				preg_match($arrTT['match'], $s, $arrMatch, PREG_OFFSET_CAPTURE, $ich)
			) {
				# Save the next match.
				if ($arrTT['next'][1][1] < $ich) {
					$arrTT['next'] =& $arrMatch;
					unset($arrTT['next'][0], $arrMatch);
				}
				# Keep track of the closest match among all token types.
				if (!isset($arrNearestTT) || $arrTT['next'][1][1] < $arrNearestTT['next'][1][1])
					$arrNearestTT =& $arrTT;
			}
		# If no matches were found, terminate the loop by consuming the remainder of the string.
		if (isset($arrNearestTT)) {
			$sOut .= utf8_xmlenc(substr($s, $ich));
			break;
		}
		# Apply the syntax highlighting according to the closest matching token type.
		$arrTT =& $arrNearestTT;
		unset($arrNearestTT);

		# Add any character up to the beginning of the token type, and start the styling.
		$sOut .= utf8_xmlenc(substr($s, $ich, $arrTT['next'][1][1] - $ich));
		$sOut .= $arrColors[$arrTT['type']]['begin'];

		if ($arrTT['type'] == QL_SYHL_SUBLANG)
			# This token type begins a block of source code in a different language: apply recursively.
			$sOut .= utf8_xmlenc($arrTT['next'][2][0]) .
						$arrColors[$arrTT['type']]['end'] .
							ql_str_syntaxhighlight($arrTT['next'][3][0], $arrTT['sublang'], $arrOptions) .
						$arrColors[$arrTT['type']]['begin'] .
						utf8_xmlenc($arrTT['next'][4][0]);
		else if ($arrTT['type'] == QL_SYHL_STRING && isset($arrOptions['maxstringlen']))
			# Truncate the string as requested.
			$sOut .= utf8_xmlenc($arrTT['next'][2][0] .
						substr($arrTT['next'][3][0], 0, $arrOptions['maxstringlen']) .
						$arrTT['next'][4][0]);
		else if ($arrTT['type'] == QL_SYHL_COMMENT && isset($arrOptions['maxcommentlen']))
			# Truncate the comment as requested.
			$sOut .= utf8_xmlenc($arrTT['next'][2][0] .
						substr($arrTT['next'][3][0], 0, $arrOptions['maxcommentlen']) .
						$arrTT['next'][4][0]);
		else
			# Add the token as-is.
			$sOut .= utf8_xmlenc($arrTT['next'][1][0]);

		# End the styling and reset the next match indicator for this token type.
		$sOut .= $arrColors[$arrTT['type']]['end'];
		$ich = $arrTT['next'][1][1] + strlen($arrTT['next'][1][0]);
		$arrTT['next'] = array(1 => array(null, -1));
	}

	set_time_limit($iOldTimeLimit);
	return $sOut;
}

?>
