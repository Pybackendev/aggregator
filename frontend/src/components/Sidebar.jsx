const NAV_ITEMS = [
  { key: "jobs", label: "Заказы", icon: "📋" },
  { key: "favorites", label: "Избранное", icon: "★" },
  { key: "filters", label: "Мои фильтры", icon: "⚙" },
];

export default function Sidebar({ active, onChange, jobsCount, favoritesCount }) {
  const counts = { jobs: jobsCount, favorites: favoritesCount };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🔍</span>
        <span>FH Aggregator</span>
      </div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${active === item.key ? "active" : ""}`}
            onClick={() => onChange(item.key)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span>{item.label}</span>
            {counts[item.key] != null && (
              <span className="sidebar-count">{counts[item.key]}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
