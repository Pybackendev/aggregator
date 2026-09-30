export default function UserBadge({ chatId, onClick }) {
  const initial = chatId ? chatId.trim()[0]?.toUpperCase() : "?";
  return (
    <button className="user-badge" onClick={onClick} title={chatId ? chatId : "Не зарегистрирован"}>
      <span className="user-avatar">{initial}</span>
      <span className="user-name">{chatId ? chatId : "Гость"}</span>
    </button>
  );
}
