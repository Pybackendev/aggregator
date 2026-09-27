import { useState } from "react";

export default function FilterForm({ filters, onAdd, onDelete }) {
  const [keyword, setKeyword] = useState("");
  const [minBudget, setMinBudget] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({
      keyword: keyword.trim() || null,
      min_budget: minBudget ? Number(minBudget) : null,
    });
    setKeyword("");
    setMinBudget("");
  }

  return (
    <div>
      <form className="filter-form" onSubmit={handleSubmit}>
        <input
          placeholder="ключевое слово (например python)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          placeholder="мин. бюджет"
          type="number"
          value={minBudget}
          onChange={(e) => setMinBudget(e.target.value)}
        />
        <button type="submit">Добавить фильтр</button>
      </form>

      {filters.length === 0 ? (
        <div className="empty">Фильтров пока нет.</div>
      ) : (
        filters.map((f) => (
          <div className="card" key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {f.keyword && <span className="badge">слово: {f.keyword}</span>}
              {f.min_budget != null && <span className="badge">от {f.min_budget}</span>}
            </div>
            <button className="secondary" onClick={() => onDelete(f.id)}>
              Удалить
            </button>
          </div>
        ))
      )}
    </div>
  );
}
