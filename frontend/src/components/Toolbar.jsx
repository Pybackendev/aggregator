export default function Toolbar({ search, onSearchChange, sort, onSortChange, currency, currencies, onCurrencyChange, count, todayCount }) {
  return (
    <div className="toolbar">
      <input
        className="search-input"
        type="search"
        aria-label="Поиск по названию"
        maxLength={500}
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select className="sort-select" aria-label="Валюта бюджета" value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
        <option value="">Все валюты</option>
        {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
      <select className="sort-select" aria-label="Сортировка" value={sort} onChange={(e) => onSortChange(e.target.value)}>
        <option value="newest">Сначала новые</option>
        <option value="budget">{currency ? "По бюджету" : "По сумме без пересчёта"}</option>
      </select>
      <div className="count-pill">
        Показано: {count}
        {todayCount > 0 && <span className="trend-up"> · {todayCount} за сутки</span>}
      </div>
    </div>
  );
}
