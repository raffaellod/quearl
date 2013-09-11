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

# Database connection classes.


define('QUEARL_CORE_MAIN_DB_INCLUDED', true);

require_once 'main.php';



####################################################################################################
# Constants


# Enumeration of client-side sort options for QlDb::query_item_list().

define('QL_DB_SORT_STD_ASC',  0);
define('QL_DB_SORT_STD_DESC', 1);
define('QL_DB_SORT_NAT_ASC',  2);
define('QL_DB_SORT_NAT_DESC', 3);


# MySQL error codes.

define('ER_DUP_ENTRY',   1062);
define('ER_EMPTY_QUERY', 1065);



####################################################################################################
# Classes


## Database connection.
#
class QlDb {

	## Database connection.
	private /*resource*/ $m_conn;
	## true if there are any currently held locks.
	private /*int*/ $m_bPendingLocks;
	## true if there are any pending transactions.
	private /*int*/ $m_bPendingTransactions;
	## Execution time of the last query run.
	private /*float*/ $m_fLastDuration;
	## Cumulative execution time of every query run, in seconds.
	private /*float*/ $m_fTotalDuration;
	## Number of queries executed.
	private /*int*/ $m_cQueries;


	## Constructor.
	#
	# string $sHostName
	#    Database host machine name.
	# string $sUserName
	#    User name to use to connect to the database.
	# string $sPassword
	#    Password for $sUserName.
	#
	public function __construct($sHostName, $sUserName, $sPassword) {
		$this->m_conn = mysql_connect($sHostName, $sUserName, $sPassword);
		if (!$this->m_conn) {
			throw new QlErrorResponse(
				HTTP_STATUS_SERVICE_UNAVAILABLE,
				'L10N_CORE_ERR_DBUNAVAIL_TITLE',
				'error_database_unavailable'
			);
		}

		$this->m_bPendingLocks = false;
		$this->m_bPendingTransactions = false;
		$this->m_fTotalDuration = 0.0;
		$this->m_cQueries = 0;

		# Perform basic setup for this connection.
		mysql_query("
			SET
				time_zone                  = '+00:00',
				@@character_set_client     = 'utf8',
				@@character_set_connection = 'utf8',
				@@character_set_database   = 'utf8',
				@@character_set_results    = 'utf8',
				@@character_set_server     = 'utf8',
				@@collation_connection     = 'utf8_general_ci',
				@@collation_database       = 'utf8_general_ci',
				@@collation_server         = 'utf8_general_ci';
		", $this->m_conn);
	}


	## Destructor.
	#
	public function __destruct() {
		if ($this->m_conn) {
			mysql_close($this->m_conn);
			$this->m_conn = null;
		}
	}


	## Limits concurrent access to the specified tables. For both (read/write and read-only) lists of
	# tables, if aliases are to be used they should be specified provoding the alias as a key, and
	# the actual table name as its associated value.
	#
	# TODO: currently this only always issues LOCK TABLE statements; in the future this should check
	# if the table engine (SHOW TABLE STATUS) supports transactions, and if so begin a real
	# transaction. This might require caching the results of SHOW TABLE STATUS.
	#
	# [array<string => string> $arrWriteLocks]
	#    Tables to be locked for read/write access.
	# [array<string => string> $arrReadLocks]
	#    Tables to be locked for read-only access.
	#
	public function begin_transaction(
		array $arrWriteLocks = array(), array $arrReadLocks = array()
	) {
		$sLocks = '';
		foreach ($arrWriteLocks as $sAlias => $sTable) {
			$sLocks .= $sTable . (is_int($sAlias) ? '' : ' AS ' . $sAlias) . ' WRITE, ';
		}
		foreach ($arrReadLocks as $sAlias => $sTable) {
			$sLocks .= $sTable . (is_int($sAlias) ? '' : ' AS ' . $sAlias) . ' READ, ';
		}
		if ($sLocks) {
			$this->query_raw('LOCK TABLE ' . substr($sLocks, 0, -2) . ';');
			$this->m_bPendingLocks = true;
		}
	}


	## Translates a basic regular expression (BRE) into a LIKE expression.
	#
	# string $s
	#    Basic regular expression to translate.
	# string return
	#    Resulting LIKE expression.
	#
	public static function bre_to_like($s) {
		return str_replace(
			array( '%',  '_', '*', '?'),
			array('\%', '\_', '%', '_'),
			$s
		);
	}


	## Invokes a stored procedure. Use just like call_user_func().
	#
	# string $sProc
	#    Stored procedure name.
	# [mixed …]
	#    Parameters to be passed to the stored procedure.
	#
	public function call_proc($sProc/*, …*/) {
		$arrArgs = func_get_args();
		# Remove $sProc from the arguments.
		array_shift($arrArgs);
		$this->call_proc_array($sProc, $arrArgs);
	}


	## Invokes a stored procedure. Use just like call_user_func_array().
	#
	# string $sProc
	#    Stored procedure name.
	# array<mixed => mixed> $arrArgs
	#    Array of parameters to be passed to the stored procedure.
	#
	public function call_proc_array($sProc, array $arrArgs) {
		foreach ($arrArgs as $mKey => $m) {
			$arrArgs[$mKey] = $this->convert_php_value($m);
		}
		$sQuery = 'CALL ' . $sProc . '(' . implode(', ', $arrArgs) . ');';
		$this->query_raw($sQuery);
	}


	## Releases the concurrency limitations activated by begin_transaction(). In case of transaction
	# support, it always issues a COMMIT statement (ROLLBACK is not supported).
	#
	public function end_transaction() {
		# Don’t swap these two if blocks.
		if ($this->m_bPendingTransactions) {
			$this->query_raw('COMMIT;');
			$this->m_bPendingTransactions = false;
		}
		if ($this->m_bPendingLocks) {
			$this->query_raw('UNLOCK TABLES;');
			$this->m_bPendingLocks = false;
		}
	}


	## Escapes a string into a valid SQL string.
	#
	# string $s
	#    String to escape.
	# [bool $bEscapeLike]
	#    If true, it also escapes characters that have a special meaning for the LIKE operator.
	# string return
	#    SQL-escaped string.
	#
	public function escape($s, $bEscapeLike = false) {
		if ($bEscapeLike) {
			$s = str_replace(
				array( '%',  '_'),
				array('\%', '\_'),
				$s
			);
		}
		return mysql_real_escape_string($s, $this->m_conn);
	}


	## Returns the count of rows affected by the last statement executed.
	#
	# int return
	#    Count of affected rows.
	#
	public function get_last_affected_rows() {
		return mysql_affected_rows($this->m_conn);
	}


	## Returns the cumulative execution time of the last query run.
	#
	# float return
	#    Execution time, in seconds.
	#
	public function get_last_duration() {
		return $this->m_fLastDuration;
	}


	## Returns the numeric code of the last error occurred.
	#
	# int return
	#    Error code.
	#
	public function get_last_error() {
		return mysql_errno($this->m_conn);
	}


	## Returns a description for the last error occurred.
	#
	# string return
	#    Error description.
	#
	public function get_last_error_info() {
		return mysql_error($this->m_conn);
	}


	## Returns the total number of rows that matched the last SELECT statement executed, even if they
	# were excluded from the result set due to a LIMIT statement.
	#
	# int return
	#    Count of matching rows.
	#
	public function get_last_found_rows_count() {
		return (int)mysql_result(mysql_query(
			'SELECT FOUND_ROWS();',
			$this->m_conn
		), 0, 0);
	}


	## Returns the auto-generated ID used in the last INSERT statement.
	#
	# int return
	#    Last ID generated.
	#
	public function get_last_inserted_id() {
		return mysql_insert_id($this->m_conn);
	}


	## Returns the count of queries executed on this connection.
	#
	# int return
	#    Count of queries executed.
	#
	public function get_query_count() {
		return $this->m_cQueries;
	}


	## Returns the cumulative execution time of every query run.
	#
	# float return
	#    Cumulative execution time, in seconds.
	#
	public function get_total_duration() {
		return $this->m_fTotalDuration;
	}


	## Returns the version of the MySQL Server.
	#
	# string return
	#    Version number.
	#
	public function get_version() {
		return 'MySQL Server ' . mysql_get_server_info($this->m_conn);
	}


	## Executes a query. If the executed statement returns a result set (e.g. SELECT), this will
	# return a QlQueryResult instance which can be used to access the returned rows; otherwise the
	# return value will be a boolean in case of success. For all statements, false will be returned
	# in case of failure.
	#
	# string $sQuery
	#    Query to run.
	# mixed return
	#    false in case of failure; otherwise QlQueryResult instance in case of result set, or true
	#    for other queries.
	#
	public function query($sQuery) {
		$mRet = $this->query_raw($sQuery);
		return is_resource($mRet) ? new QlQueryResult($mRet) : $mRet;
	}


	## Returns the full result set of a query as a matrix.
	#
	# string $sQuery
	#    SQL query.
	# array<int => array<string => mixed>> return
	#    Results of the query, records by columns.
	#
	public function & query_all($sQuery) {
		$q = $this->query_raw($sQuery);
		$arr = array();
		while ($arrRow = mysql_fetch_assoc($q)) {
			$arr[] = $arrRow;
		}
		mysql_free_result($q);
		return $arr;
	}


	## Returns as an associative array a single row returned by a db query.
	#
	# string $sQuery
	#    Query to execute.
	# [int $iRow]
	#    Row to return; defaults to 0 (the first).
	# array<string => mixed> return
	#    Returned row.
	#
	public function query_assoc($sQuery, $iRow = 0) {
		$q = $this->query_raw($sQuery);
		if (!$q || mysql_num_rows($q) < 1) {
			return false;
		}
		if ($iRow > 0) {
			mysql_data_seek($q, $iRow);
		}
		$arr = mysql_fetch_assoc($q);
		mysql_free_result($q);
		return $arr;
	}


	## Returns a single column returned by a db query.
	#
	# string $sQuery
	#    Query to execute.
	# [int $iCol]
	#    Column to return; defaults to 0 (the first).
	# array<int => mixed> return
	#    Returned field values.
	#
	public function & query_column($sQuery, $iCol = 0) {
		$q = $this->query_raw($sQuery);
		$arr = array();
		while ($arrRow = mysql_fetch_row($q)) {
			$arr[] = $arrRow[$iCol];
		}
		mysql_free_result($q);
		return $arr;
	}


	## Returns a map obtained by executing a db query and using one of the returned columns as a set
	# of keys, and another one as a set of values to be associated to the keys, acting similarly to
	# array_combine().
	#
	# string $sQuery
	#    Query to execute.
	# [int $iKeysCol]
	#    Index of the column to provide the keys; defaults to 0 (the first).
	# [int $iValuesCol]
	#    Index of the column to provide the values; defaults to 1 (the second).
	# array<mixed => mixed> return
	#    Returned pairs.
	#
	public function & query_combine($sQuery, $iKeysCol = 0, $iValuesCol = 1) {
		$q = $this->query_raw($sQuery);
		$arr = array();
		while ($arrRow = mysql_fetch_row($q)) {
			$arr[$arrRow[$iKeysCol]] = $arrRow[$iValuesCol];
		}
		mysql_free_result($q);
		return $arr;
	}


	## Executes a query for an item list, returning an array of arrays with two elements with keys
	# “value” and “label”.
	#
	# array<string => mixed> $arrQ
	#    Query components. Can include these values:
	#    string “fields”
	#       Fields to be returned, in SELECT syntax. The fields must include “ql_label” and
	#       “ql_value”.
	#    string “tables”
	#       Tables to be used, in FROM syntax.
	#    [string “where”]
	#       WHERE clause conditions.
	#    [array<string => int> “sort”]
	#       Maps each field name with a sort mode (QL_DB_SORT_*).
	#    [int “limit”]
	#       Limits the number of returned rows to this number.
	# array<int => array<string => mixed>> return
	#    Item list.
	#
	public function query_item_list(array $arrQ) {
		global $ql_debug_database_QueryItemList;
		$s = 'SELECT ';
		if (!empty($arrQ['limit'])) {
			$s .= 'SQL_CALC_FOUND_ROWS ';
		}
		$s .= $arrQ['vlfields'] . NL .
			  'FROM ' . $arrQ['tables'] . NL;
		if (!empty($arrQ['where'])) {
			$s .= 'WHERE ' . $arrQ['where'] . NL;
		}
		$sSort = '';
		if (!empty($arrQ['sort'])) {
			foreach ($arrQ['sort'] as $sKey => $iSortMode) {
				switch ($iSortMode) {
					case QL_DB_SORT_STD_ASC:
						$sSort .= $sKey . ' ASC, ';
						break;
					case QL_DB_SORT_STD_DESC:
						$sSort .= $sKey . ' DESC, ';
						break;
					default:
						# If we need to use usort() below, don’t bother sorting in SQL.
						$sSort = '';
						break(2);
				}
			}
			if ($sSort != '') {
				$s .= 'ORDER BY ' . substr($sSort, 0, -2) . NL;
			}
		}
		if (!empty($arrQ['limit'])) {
			$s .= 'LIMIT ' . $arrQ['limit'];
		}
		$s .= ';';
		if ($ql_debug_database_QueryItemList) {
			ql_log('DEBUG', 'QlDb::query_item_list(): query',
				ql_logdumpvars(array('$s' => $s))
			);
		}

		# Execute the query.
		$qItems = $this->query($s);
		$bPartial = !empty($arrQ['limit']) &&
			$this->get_last_found_rows_count() != $qItems->row_count();

		# Save the column name => index map in $arrFields, used to create the lambda function to be
		# called by usort(). “value” is always 0, and “label” is always 1.
		$arrFieldOrder = array();
		foreach ($qItems->get_columns() as $i => $col) {
			$arrFieldOrder[$col->sName] = $i;
		}
		if ($ql_debug_database_QueryItemList) {
			ql_log('DEBUG', 'QlDb::query_item_list(): $arrFieldOrder',
				ql_logdumpvars(array('$arrFieldOrder' => &$arrFieldOrder))
			);
		}

		$arrItems = array();
		# Use fetch_row() for the highest speed.
		while ($arrItem = $qItems->fetch_row()) {
			$arrItems[] = $arrItem;
		}
		$qItems->free();
		unset($qItems);

		if ($sSort == '' && !empty($arrQ['sort'])) {
			$s = '';
			if ($ql_debug_database_QueryItemList) {
				ql_log('DEBUG', 'QlDb::query_item_list(): $arrQ[sort]',
					ql_logdumpvars(array('$arrQ[\'sort\']' => &$arrQ['sort']))
				);
			}
			foreach ($arrQ['sort'] as $sKey => $iSortMode) {
				$iKey = $arrFieldOrder[$sKey];
				switch ($iSortMode) {
					case QL_DB_SORT_STD_ASC:
						$s .= '
							$i = strcasecmp($arr1[' . $iKey . '], $arr2[' . $iKey . ']);
							if ($i != 0) {
								return $i;
							}
						';
						break;
					case QL_DB_SORT_STD_DESC:
						$s .= '
							$i = strcasecmp($arr1[' . $iKey . '], $arr2[' . $iKey . ']);
							if ($i) != 0) {
								return -$i;
							}
						';
						break;
					case QL_DB_SORT_NAT_ASC:
						$s .= '
							$i = strnatcasecmp($arr1[' . $iKey . '], $arr2[' . $iKey . ']);
							if ($i != 0) {
								return $i;
							}
						';
						break;
					case QL_DB_SORT_NAT_DESC:
						$s .= '
							$i = strnatcasecmp($arr1[' . $iKey . '], $arr2[' . $iKey . ']);
							if ($i != 0) {
								return -$i;
							}
						';
						break;
				}
			}
			$s .= 'return 0;' . NL;
			if ($ql_debug_database_QueryItemList) {
				ql_log('DEBUG', 'QlDb::query_item_list(): usort(f)',
					ql_logdumpvars(array('$s' => $s))
				);
			}
			usort($arrItems, create_function('array& $arr1, array& $arr2', $s));
			# If we have more than two columns (“value” and “label”), discard the remaining ones, since
			# they were only provided for sorting, which is now done.
			if (count($arrFieldOrder) > 2) {
				foreach ($arrItems as $i => $arrItem) {
					# Instead of unsetting the extra elements, just recreate the array.
					$arrItems[$i] = array($arrItem[0], $arrItem[1]);
				}
			}
		}
		return array(
			'partial' => $bPartial,
			'items'   => &$arrItems,
		);
	}


	## Implementation of the query*() methods.
	#
	# string $sQuery
	#    SQL query to execute.
	# mixed return
	#    For statements returning rows (e.g. SELECT) this is the result set, or false on failure; for
	#    other statement types, true on successful execution, or false otherwise.
	#
	private function query_raw($sQuery) {
		global $ql_session;
		global $ql_debug_database_Anonymous, $ql_debug_database_Errors;
		global $ql_debug_database_History, $ql_debug_database_Perf;

		# Remove the whitespace we usually put around the query string for formatting purposes.
		$sQuery = trim($sQuery);

		# Execute the query statement while timing it.
		$this->m_fLastDuration = microtime(true);
		$qRet = mysql_query($sQuery, $this->m_conn);
		$this->m_fLastDuration = microtime(true) - $this->m_fLastDuration;

		# Update statistics.
		$this->m_fTotalDuration += $this->m_fLastDuration;
		++$this->m_cQueries;

		# Check if we should log this query.
		$bDebugDbPerf = ($ql_debug_database_Perf && strncmp($sQuery, 'SELECT ', 7) == 0);
		if ((
			# If we’re logging all queries, or logging query performance…
			$ql_debug_database_History || $bDebugDbPerf ||
			# …or an error occurred…
			($ql_debug_database_Errors && mysql_errno($this->m_conn))
		) && (
			# …and we’re debugging pre-login queries, or it’s a debug user…
			$ql_debug_database_Anonymous || ($ql_session && (
				$ql_session->check_priv_tokens('DBGU') || $ql_session->check_priv_tokens('DBGA')
			))
		)) {
			# …then log the query. Write the statement type first, in the log entry title.
			$ich = strpos($sQuery, ' ');
			$sLogEntryTitle = 'QlDb::query_raw(): ' .
				($ich !== false ? substr($sQuery, 0, strpos($sQuery, ' ')) : $sQuery);
			# Add the SQL statement.
			$sLogEntry = '<code><pre>' . ql_lenc($sQuery) . '</pre></code>';
			if (mysql_errno($this->m_conn)) {
				# If an error occurred, report it in the log.
				$sLogEntryTitle .= ': error';
				$sLogEntry .= NL .
							  '<p>' . ql_lenc(mysql_error($this->m_conn)) . '</p>';
			} else if ($bDebugDbPerf) {
				# Query the db for a performance report.
				$qXp = mysql_query(
					'EXPLAIN ' . $sQuery,
					$this->m_conn
				);
				if ($qXp) {
					$sLogEntryTitle .= ': analysis';
					# Add the analysis report generated by the MySQL server.
					$sLogEntry .= NL .
									  '<p>Time: ' . ql_format_duration($this->m_fLastDuration) . '</p>' .
									     NL .
									  '<table>' . NL .
									  '<thead><tr>';
					$cColumns = mysql_num_fields($qXp);
					for ($i = 0; $i < $cColumns; ++$i) {
						$sLogEntry .= '<th>' . mysql_field_name($qXp, $i) . '</th>';
					}
					$sLogEntry .= '</tr></thead>' . NL .
								  '<tbody>' . NL;
					while ($arrXp = mysql_fetch_row($qXp)) {
						$sLogEntry .= '<tr><td>' . implode('</td><td>', $arrXp) . '</td></tr>' . NL;
					}
					$sLogEntry .= '</tbody>' . NL .
								  '</table>';
					mysql_free_result($qXp);
				}
			}
			ql_log('DEBUG', $sLogEntryTitle, $sLogEntry);
		}

		return $qRet;
	}


	## Returns a single row returned by a db query.
	#
	# string $sQuery
	#    Query to execute.
	# [int $iRow]
	#    Row to return; defaults to 0 (the first).
	# array<int => mixed> return
	#    Returned row.
	#
	public function query_row($sQuery, $iRow = 0) {
		$q = $this->query_raw($sQuery);
		if (!$q || mysql_num_rows($q) < 1) {
			return false;
		}
		if ($iRow > 0) {
			mysql_data_seek($q, $iRow);
		}
		$arr = mysql_fetch_row($q);
		mysql_free_result($q);
		return $arr;
	}


	## Returns a single field from a row returned by a db query.
	#
	# string $sQuery
	#    Query to execute.
	# [int $iRow]
	#    Row to return; defaults to 0 (the first).
	# [int $iCol]
	#    Field to return; defaults to 0 (the first).
	# mixed return
	#    Returned field value.
	#
	public function query_value($sQuery, $iRow = 0, $iCol = 0) {
		$q = $this->query_raw($sQuery);
		if (!$q || mysql_num_rows($q) < 1) {
			return false;
		}
		$m = mysql_result($q, $iRow, $iCol);
		mysql_free_result($q);
		return $m;
	}


	## Selects a database to operate on.
	#
	# string $sDatabaseName
	#    Name of the database.
	#
	public function select_database($sDatabaseName) {
		if (!mysql_select_db($sDatabaseName, $this->m_conn)) {
			trigger_error('Unable to select database “' . $sDatabaseName . '”', E_USER_WARNING);
			# TODO: more specific error.
			throw new QlErrorResponse(
				HTTP_STATUS_SERVICE_UNAVAILABLE,
				'L10N_CORE_ERR_DBUNAVAIL_TITLE',
				'error_database_unavailable'
			);
		}
	}


	## Generates a SQL string representation of the specified PHP scalar value.
	#
	# mixed $m
	#   Value to translate.
	# string return
	#   SQL representation of $m.
	#
	public function sql_encode($m) {
		switch (gettype($m)) {
			default:
				return 'NULL';
			case 'boolean':
				return $m ? '1' : '0';
			case 'double':
				if (!is_finite($m)) {
					return 'NULL';
				}
				# Fall through…
			case 'integer':
				return (string)$m;
			case 'string':
				return '\'' . $this->escape($m) . '\'';
		}
	}


	## Generates a list of WHERE clause conditions.
	#
	# array<string => array<string, [mixed]>> $arrClauses
	#    List of conditions: each item has the target field name as key, and an array of two items as
	#    value; the first item is the operator to apply, the second is its right operand.
	# string return
	#    WHERE clause conditions.
	#
	public function where_clauses_to_string(array $arrClauses) {
		$s = '';
		foreach ($arrClauses as $sFieldName => $arrClause) {
			if ($arrClause[1] === null) {
				switch ($arrClause[0]) {
					case 'eq':
					case 'ge':
					case 'le':
					case 'lk': $s .= '(' . $sFieldName . ' IS NULL'; break;
					case 'ne':
					case 'gt':
					case 'lt':
					case 'nl': $s .= '(NOT (' . $sFieldName . ' IS NULL)'; break;
					default:
						# Invalid operator.
						trigger_error(
							'Invalid where_clauses_to_string operator \'' . $arrClause[0] .
								'\'; clause ignored',
							E_USER_WARNING
						);
						$s = substr($s, 0, -1 - strlen($sFieldName));
						continue(2);
				}
			} else {
				$s .= '(' . $sFieldName;
				switch ($arrClause[0]) {
					case 'eq': $s .=  ' = '; break;
					case 'ne': $s .= ' != '; break;
					case 'ge': $s .= ' >= '; break;
					case 'gt': $s .= ' > ';  break;
					case 'le': $s .= ' <= '; break;
					case 'lt': $s .= ' < ';  break;
					case 'lk': $s .=     ' LIKE '; break;
					case 'nl': $s .= ' NOT LIKE '; break;
					default:
						# Invalid operator.
						trigger_error(
							'Invalid where_clauses_to_string operator \'' . $arrClause[0] .
								'\'; clause ignored',
							E_USER_WARNING
						);
						$s = substr($s, 0, -1 - strlen($sFieldName));
						continue(2);
				}
				$s .= $this->convert_php_value($arrClause[1]);
			}
			$s .= ') AND ';
		}
		return substr($s, 0, -5);
	}
}


## Query result set. Do not instantiate manually.
#
class QlQueryResult {

	## Query result set.
	public /*resource*/ $m_qResult;
	## Index of the current row.
	public /*int*/ $m_iSeek = 0;
	## Column information for the result set.
	public /*array<int => stdClass>*/ $m_arrColumns = null;


	## Constructor.
	#
	# resource $qResult
	#    Query result set to associate to the object.
	#
	public function __construct($qResult) {
		$this->m_qResult = $qResult;
	}


	## Destructor.
	#
	public function __destruct() {
		if ($this->m_qResult) {
			mysql_free_result($this->m_qResult);
		}
	}


	## Returns the fields in the current row as an integer-indexed array.
	#
	# array<int => mixed> return
	#    Row fields.
	#
	public function fetch_row() {
		++$this->m_iSeek;
		return mysql_fetch_row($this->m_qResult);
	}


	## Returns the fields in the current row as an associative array.
	#
	# array<string => mixed> return
	#    Row fields.
	#
	public function fetch_assoc() {
		++$this->m_iSeek;
		return mysql_fetch_assoc($this->m_qResult);
	}


	## Releases any resources allocated by the object. After this, the object should no longer be
	# used.
	#
	public function free() {
		mysql_free_result($this->m_qResult);
		$this->m_qResult = null;
	}


	## Returns an array of objects with information on the columns of the result set.
	#
	# array<int => stdclass>& return
	#    Column information.
	#
	public function & get_columns() {
		if ($this->m_arrColumns === null) {
			# Populate the cache.
			$this->m_arrColumns = array();
			$cColumns = mysql_num_fields($this->m_qResult);
			for ($i = 0; $i < $cColumns; ++$i) {
				$o = new stdClass();
				$o->iIndex = $i;
				$o->sName = mysql_field_name($this->m_qResult, $i);
				$o->sType = mysql_field_type($this->m_qResult, $i);
				$o->sFlags = mysql_field_flags($this->m_qResult, $i);
				$o->iLength = mysql_field_len($this->m_qResult, $i);
				$this->m_arrColumns[$i] = $o;
			}
		}
		return $this->m_arrColumns;
	}


	## Returns the count of rows in this result set.
	#
	# int return
	#    Count of rows.
	#
	public function row_count() {
		return mysql_num_rows($this->m_qResult);
	}


	## Moves to a specific row number.
	#
	# int $i
	#    0-based row index.
	# [int $iWhence]
	#    Like fseek(), this can be one of the following values:
	#    SEEK_SET $i is the absolute row index (default).
	#    SEEK_CUR $i is a delta from the current row index.
	#    SEEK_END $i is the distance of the desired row from the end of the result set.
	# int return
	#    Resulting absolute row index.
	#
	public function seek($i, $iWhence = SEEK_SET) {
		switch ($iWhence) {
			case SEEK_SET:
				break;
			case SEEK_CUR:
				$i += $this->m_iSeek;
				break;
			case SEEK_END:
				$i += mysql_num_rows($this->m_qResult);
				break;
			default:
				return false;
		}
		# Maks sure we don’t go out of bounds.
		$i = min(max(0, $i), mysql_num_rows($this->m_qResult));
		@mysql_data_seek($this->m_qResult, $i);
		return $i;
	}


	## Returns the 0-based index of the current row.
	#
	# int return
	#    Index of the current row.
	#
	public function tell() {
		return $this->m_iSeek;
	}
}

?>
