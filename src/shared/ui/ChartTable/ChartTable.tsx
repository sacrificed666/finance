import styles from "./ChartTable.module.scss";

interface ChartTableProps {
  caption: string;
  columns: string[];
  rows: { key: string; cells: string[] }[];
}

// The figures of a chart as a table that only screen readers see
const ChartTable = ({ caption, columns, rows }: ChartTableProps) => (
  // The wrapper hides the table, which ignores overflow and would stretch the page
  <div className={styles.hidden}>
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            {row.cells.map((cell, index) =>
              index === 0 ? (
                <th key={columns[index]} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={columns[index]}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ChartTable;
