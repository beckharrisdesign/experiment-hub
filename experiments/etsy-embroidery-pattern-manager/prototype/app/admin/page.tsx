'use client';

import { useState, useEffect } from 'react';

interface TableData {
  tableName: string;
  columns: string[];
  rows: any[][];
}

export default function AdminPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      const response = await fetch('/api/admin/tables');
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const loadTableData = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/table/${tableName}`);
      if (response.ok) {
        const data = await response.json();
        setTableData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load table data');
      }
    } catch (error) {
      setError('Error loading table data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setQueryResult(null);
    
    try {
      const response = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueryResult(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Query failed');
      }
    } catch (error) {
      setError('Error executing query');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Database Admin</h1>
          <p className="text-text-secondary">View and manage SQLite database</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables List */}
          <div className="lg:col-span-1">
            <div className="bg-background-secondary border border-border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Tables</h2>
              <div className="space-y-2">
                {tables.map((table) => (
                  <button
                    key={table}
                    onClick={() => setSelectedTable(table)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      selectedTable === table
                        ? 'bg-accent-primary text-white'
                        : 'bg-background-tertiary hover:bg-background-primary'
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Query */}
            <div className="bg-background-secondary border border-border rounded-lg p-4 mt-6">
              <h2 className="text-xl font-semibold mb-4">Custom Query</h2>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM brand_identity;"
                className="w-full px-3 py-2 bg-background-tertiary border border-border rounded text-text-primary font-mono text-sm mb-2"
                rows={4}
              />
              <button
                onClick={executeQuery}
                disabled={loading || !query.trim()}
                className="w-full px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Executing...' : 'Execute Query'}
              </button>
            </div>
          </div>

          {/* Table Data */}
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {loading && (
              <div className="p-8 text-center text-text-secondary">Loading...</div>
            )}

            {!loading && selectedTable && tableData && (
              <div className="bg-background-secondary border border-border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">
                  {selectedTable} ({tableData.rows.length} rows)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {tableData.columns.map((col) => (
                          <th key={col} className="text-left px-3 py-2 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-3 py-2">
                              {cell === null ? (
                                <span className="text-text-muted italic">NULL</span>
                              ) : typeof cell === 'string' && cell.length > 50 ? (
                                <span title={cell} className="truncate block max-w-xs">
                                  {cell.substring(0, 50)}...
                                </span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && queryResult && (
              <div className="bg-background-secondary border border-border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">Query Result</h2>
                {queryResult.columns && queryResult.rows ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {queryResult.columns.map((col: string) => (
                            <th key={col} className="text-left px-3 py-2 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row: any[], idx: number) => (
                          <tr key={idx} className="border-b border-border/50">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-3 py-2">
                                {cell === null ? (
                                  <span className="text-text-muted italic">NULL</span>
                                ) : typeof cell === 'string' && cell.length > 50 ? (
                                  <span title={cell} className="truncate block max-w-xs">
                                    {cell.substring(0, 50)}...
                                  </span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-text-secondary">
                    {JSON.stringify(queryResult, null, 2)}
                  </div>
                )}
              </div>
            )}

            {!loading && !selectedTable && !queryResult && (
              <div className="bg-background-secondary border border-border rounded-lg p-8 text-center text-text-secondary">
                Select a table or run a query to view data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

