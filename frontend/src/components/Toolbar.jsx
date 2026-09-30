export default function Toolbar({ search, onSearchChange, sort, onSortChange, count, todayCount }) {
  return (
    <div className="toolbar">
      <input
        className="search-input"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select className="sort-select" value={sort} onChange={(e) => onSortChange(e.target.value)}>
        <option value="newest">Сначала новые</option>
        <option value="budget">По бюджету</option>
      </select>
      <div className="count-pill">
        Найдено: {count}
        {todayCount > 0 && <span className="trend-up"> ↑ +{todayCount} сегодня</span>}
      </div>
    </div>
  );
}
