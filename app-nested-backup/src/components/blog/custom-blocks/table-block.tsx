/**
 * Table block - styled data table.
 */

interface TableBlockProps {
  rows: string[][]
}

export function TableBlock({ rows }: TableBlockProps) {
  if (!rows?.length) return null
  const header = rows[0]
  const body = rows.slice(1)
  return (
    <div className="my-8 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-3 text-start text-sm font-semibold text-gray-900"
        scope="col"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-sm text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
