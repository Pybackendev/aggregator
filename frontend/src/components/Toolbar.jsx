import { useRef } from "react";
import { currencyLabel } from "../utils/format";

export default function Toolbar({ search, onSearchChange, sort, onSortChange, currency, currencies, onCurrencyChange, criteria, onCriteriaChange, skills, onReset, count, todayCount }) {
  const searchInput = useRef(null);
  const { status, skill, period, budget } = criteria;
  const filtersChanged = currency || skill || period || budget || status !== "open" || sort !== "newest";
  return (
    <div className="toolbar">
      <div className="search-row">
        <input
          ref={searchInput}
          className="search-input"
          type="search"
          aria-label="Поиск по названию и описанию"
          maxLength={500}
          placeholder="Поиск по названию и описанию"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && <button className="secondary" type="button" onClick={() => { onSearchChange(""); searchInput.current.focus(); }}>Очистить поиск</button>}
      </div>
      <select className="sort-select" aria-label="Статус заказа" value={status} onChange={(e) => onCriteriaChange("status", e.target.value)}>
        <option value="open">Приём ставок</option>
        <option value="">Все статусы</option>
        <option value="closed">Закрытые и недоступные</option>
      </select>
      <select className="sort-select" aria-label="Навык" value={skill} onChange={(e) => onCriteriaChange("skill", e.target.value)}>
        <option value="">Все навыки</option>
        {skills.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select className="sort-select" aria-label="Дата публикации" value={period} onChange={(e) => onCriteriaChange("period", e.target.value)}>
        <option value="">За всё время</option>
        <option value="1">За сутки</option>
        <option value="7">За неделю</option>
        <option value="30">За месяц</option>
      </select>
      <select className="sort-select" aria-label="Валюта бюджета" value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
        <option value="">Все валюты</option>
        {currencies.map((code) => <option key={code} value={code}>{currencyLabel(code)}</option>)}
      </select>
      {currency && (
        <input className="budget-input" type="number" min="0" max="9999999999.99" step="0.01" aria-label="Минимальный бюджет" placeholder="Бюджет от" value={budget} onChange={(e) => onCriteriaChange("budget", e.target.value)} />
      )}
      <select className="sort-select" aria-label="Сортировка" value={sort} onChange={(e) => onSortChange(e.target.value)}>
        <option value="newest">Сначала новые</option>
        {currency && <option value="budget">По бюджету</option>}
      </select>
      {(search || filtersChanged) && <button className="secondary" type="button" onClick={onReset}>Сбросить фильтры</button>}
      <div className="count-pill">
        Показано: {count}
        {todayCount > 0 && <span className="trend-up"> · {todayCount} за сутки</span>}
      </div>
    </div>
  );
}
