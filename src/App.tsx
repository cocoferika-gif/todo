
import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Priority = "高" | "中" | "低";
type Filter = "すべて" | "未完了" | "完了";

type Todo = {
  id: number;
  title: string;
  category: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
};

const STORAGE_KEY = "task-flow-todos";

const DEFAULT_CATEGORIES = [
  "仕事・転職",
  "学習",
  "プライベート",
  "買い物",
  "その他",
];

const PRIORITY_ORDER: Record<Priority, number> = {
  高: 0,
  中: 1,
  低: 2,
};

// 保存済みのTodoを読み込む
function loadTodos(): Todo[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as Todo[] : [];
  } catch {
    return [];
  }
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("中");

  const [filter, setFilter] = useState<Filter>("すべて");
  const [categoryFilter, setCategoryFilter] = useState("すべて");
  const [sortBy, setSortBy] = useState<"priority" | "date">("priority");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  const [notice, setNotice] = useState("");

  // Todoの変更をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // 件数の集計
  const completedCount = todos.filter(todo => todo.completed).length;
  const remainingCount = todos.length - completedCount;

  // 今日の日付を取得
  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  // Todoを追加
  const addTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      setNotice("タスク名を入力してください。");
      return;
    }

    const newTodo: Todo = {
      id: Date.now(),
      title: title.trim(),
      category,
      dueDate,
      priority,
      completed: false,
      createdAt: Date.now(),
    };

    setTodos(prev => [newTodo, ...prev]);
    setTitle("");
    setDueDate("");
    setPriority("中");
    setShowForm(false);
    setNotice("タスクを追加しました。");
  };

  // 完了・未完了を切り替える
  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  };

  // Todoを削除
  const deleteTodo = (id: number) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  // カテゴリを追加
  const addCategory = () => {
    const value = newCategory.trim();

    if (!value) return;

    if (categories.includes(value)) {
      setNotice("そのカテゴリは既に登録されています。");
      return;
    }

    setCategories(prev => [...prev, value]);
    setCategory(value);
    setNewCategory("");
    setShowCategoryInput(false);
    setNotice("カテゴリを追加しました。");
  };

  // 表示するタスクを絞り込み、並び替える
  const visibleTodos = useMemo(() => {
    let result = [...todos];

    if (filter === "未完了") {
      result = result.filter(todo => !todo.completed);
    } else if (filter === "完了") {
      result = result.filter(todo => todo.completed);
    }

    if (categoryFilter !== "すべて") {
      result = result.filter(todo => todo.category === categoryFilter);
    }

    if (!showCompleted && filter === "すべて") {
      result = result.filter(todo => !todo.completed);
    }

    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      result = result.filter(todo =>
        todo.title.toLowerCase().includes(keyword)
      );
    }

    result.sort((a, b) => {
      // 未完了タスクを完了済みより先に表示
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      if (sortBy === "priority") {
        const priorityDiff =
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];

        if (priorityDiff !== 0) return priorityDiff;
      }

      // 期限が近いものを先に表示。期限未設定は最後
      if (a.dueDate && b.dueDate) {
        const dateDiff = a.dueDate.localeCompare(b.dueDate);
        if (dateDiff !== 0) return dateDiff;
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }

      return b.createdAt - a.createdAt;
    });

    return result;
  }, [todos, filter, categoryFilter, sortBy, search, showCompleted]);

  // 期限の表示を整える
  const formatDate = (date: string) => {
    if (!date) return "期限なし";

    const [year, month, day] = date.split("-");
    return `${year}/${month}/${day}`;
  };

  // 期限切れかどうか
  const isOverdue = (todo: Todo) =>
    !todo.completed && todo.dueDate !== "" && todo.dueDate < todayString;

  // 今日が期限かどうか
  const isDueToday = (todo: Todo) =>
    !todo.completed && todo.dueDate === todayString;

  // すべてのタスクを削除
  const clearCompleted = () => {
    const count = todos.filter(todo => todo.completed).length;

    if (count === 0) {
      setNotice("完了済みのタスクはありません。");
      return;
    }

    if (!window.confirm(`完了済みのタスク ${count} 件を削除しますか？`)) {
      return;
    }

    setTodos(prev => prev.filter(todo => !todo.completed));
    setNotice("完了済みタスクを削除しました。");
  };

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✓</div>
          <div>
            <strong>TASK FLOW</strong>
            <small>MY PERSONAL TODO</small>
          </div>
        </div>

        <div className="save-status">
          <span className="save-dot" />
          自動保存
        </div>
      </header>

      <main className="main-content">
        {/* ページタイトル */}
        <section className="welcome-area">
          <div>
            <span className="eyebrow">MY WORKSPACE</span>
            <h1>今日のタスク</h1>
            <p>やるべきことを整理して、一つずつ進めましょう。</p>
          </div>

          <div className="today-label">
            <span>TODAY</span>
            <strong>
              {today.getFullYear()}.{String(today.getMonth() + 1).padStart(2, "0")}.{String(today.getDate()).padStart(2, "0")}
            </strong>
          </div>
        </section>

        {/* タスク件数 */}
        <section className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">▤</div>
            <span>すべてのタスク</span>
            <strong>{todos.length}<small>件</small></strong>
          </div>

          <div className="stat-card remaining">
            <div className="stat-icon">◷</div>
            <span>未完了</span>
            <strong>{remainingCount}<small>件</small></strong>
          </div>

          <div className="stat-card completed">
            <div className="stat-icon">✓</div>
            <span>完了</span>
            <strong>{completedCount}<small>件</small></strong>
          </div>
        </section>

        {/* 新規タスク追加 */}
        <section className="add-area">
          {!showForm ? (
            <button
              className="add-main-button"
              onClick={() => {
                setShowForm(true);
                setNotice("");
              }}
            >
              <span>＋</span>
              新しいタスクを追加
            </button>
          ) : (
            <form className="task-form" onSubmit={addTodo}>
              <div className="form-heading">
                <h2>新しいタスク</h2>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>

              <label htmlFor="task-title">タスク名</label>
              <input
                id="task-title"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例：職務経歴書を修正する"
                autoFocus
              />

              <div className="form-grid">
                <div>
                  <label htmlFor="task-category">カテゴリ</label>
                  <select
                    id="task-category"
                    className="form-input"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {categories.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="task-date">期限</label>
                  <input
                    id="task-date"
                    className="form-input"
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <label>優先度</label>
              <div className="priority-picker">
                {(["高", "中", "低"] as Priority[]).map(item => (
                  <button
                    type="button"
                    key={item}
                    className={`priority-choice priority-${item} ${priority === item ? "chosen" : ""}`}
                    onClick={() => setPriority(item)}
                  >
                    <span />
                    {item}
                  </button>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowForm(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="submit-button">
                  ＋ タスクを追加
                </button>
              </div>
            </form>
          )}
        </section>

        {/* カテゴリ追加 */}
        <section className="category-area">
          <div className="section-heading">
            <h2>カテゴリ</h2>
            <button
              className="small-action"
              onClick={() => setShowCategoryInput(prev => !prev)}
            >
              ＋ カテゴリ追加
            </button>
          </div>

          {showCategoryInput && (
            <div className="category-add-form">
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") addCategory();
                }}
                placeholder="新しいカテゴリ名"
              />
              <button onClick={addCategory}>追加</button>
            </div>
          )}

          <div className="category-chips">
            <button
              className={`category-chip all ${categoryFilter === "すべて" ? "active" : ""}`}
              onClick={() => setCategoryFilter("すべて")}
            >
              すべて
              <span>{todos.length}</span>
            </button>

            {categories.map((item, index) => {
              const count = todos.filter(todo => todo.category === item).length;

              return (
                <button
                  key={item}
                  className={`category-chip color-${index % 5} ${categoryFilter === item ? "active" : ""}`}
                  onClick={() => setCategoryFilter(item)}
                >
                  {item}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* タスク一覧 */}
        <section className="todo-section">
          <div className="section-heading">
            <div>
              <h2>タスク一覧</h2>
              <span className="task-count">{visibleTodos.length}件表示</span>
            </div>

            <button className="clear-button" onClick={clearCompleted}>
              完了済みを削除
            </button>
          </div>

          {/* 検索・絞り込み */}
          <div className="toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="タスクを検索..."
              />
            </div>

            <select
              className="toolbar-select"
              value={filter}
              onChange={e => setFilter(e.target.value as Filter)}
            >
              <option value="すべて">すべての状態</option>
              <option value="未完了">未完了</option>
              <option value="完了">完了</option>
            </select>

            <select
              className="toolbar-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as "priority" | "date")}
            >
              <option value="priority">優先度順</option>
              <option value="date">期限順</option>
            </select>
          </div>

          <div className="todo-list">
            {visibleTodos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>タスクがありません</h3>
                <p>新しいタスクを追加するか、検索条件を変更してください。</p>
              </div>
            ) : (
              visibleTodos.map(todo => (
                <article
                  className={`todo-item ${todo.completed ? "is-completed" : ""}`}
                  key={todo.id}
                >
                  <button
                    className={`complete-button ${todo.completed ? "checked" : ""}`}
                    onClick={() => toggleTodo(todo.id)}
                    aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
                  >
                    {todo.completed && "✓"}
                  </button>

                  <div className="todo-main">
                    <h3>{todo.title}</h3>
                    <div className="todo-meta">
                      <span className="todo-category">{todo.category}</span>

                      <span className={`todo-date ${
                        isOverdue(todo) ? "overdue" : isDueToday(todo) ? "due-today" : ""
                      }`}>
                        <span>◷</span>
                        {todo.dueDate
                          ? `期限：${formatDate(todo.dueDate)}`
                          : "期限なし"}
                        {isOverdue(todo) && " ・期限切れ"}
                        {isDueToday(todo) && " ・今日まで"}
                      </span>
                    </div>
                  </div>

                  <span className={`priority-badge priority-${todo.priority}`}>
                    <span />
                    {todo.priority}
                  </span>

                  <button
                    className="delete-button"
                    onClick={() => deleteTodo(todo.id)}
                    aria-label="タスクを削除"
                    title="削除"
                  >
                    ×
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="list-footer">
            <label className="completed-toggle">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={e => setShowCompleted(e.target.checked)}
                disabled={filter !== "すべて"}
              />
              完了済みタスクも表示
            </label>

            <span>{completedCount} / {todos.length} 件完了</span>
          </div>
        </section>

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
      </main>

      <footer className="footer">
        <strong>TASK FLOW</strong>
        <span>MY PERSONAL TODO LIST</span>
        <span>データはこのブラウザに保存されます</span>
      </footer>
    </div>
  );
}

export default App;
