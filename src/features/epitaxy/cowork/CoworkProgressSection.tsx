/**
 * Official residual Progress section body (index-BELzQL5P):
 * - lQt title Progress `sIMS7iH+wa` / product 进度
 * - children: todos → vZt (CZt rows), else EmptyProgressState pQt `tq0BEownQn`
 * - NOT agent background tasks (those are transcript task_event, not Progress rail)
 * - CZt status chrome: wZt completed / _Zt in_progress numbered / kZt pending numbered
 */
import { Icon } from "../../../shell/icons";
import { CoworkActivitySection } from "./CoworkActivitySection";
import type { CoworkTodoItem } from "./coworkActivityTypes";

export function CoworkProgressSection({
  allTodosCompleted,
  isExpanded,
  onToggle,
  todos,
}: {
  allTodosCompleted: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  todos: CoworkTodoItem[];
}) {
  // Residual xQt Progress maxContentHeight: e.length > 0 ? "24rem" : "12rem"
  const maxContentHeight = todos.length > 0 ? "24rem" : "12rem";
  // Residual headerLeftAction when collapsed && all completed: "{count} of {count}" BYBvgncezG
  const headerLeftAction =
    !isExpanded && allTodosCompleted ? (
      <span className="text-text-500 font-small">
        {todos.length} of {todos.length}
      </span>
    ) : undefined;

  return (
    <CoworkActivitySection
      contentClassName="!pb-2"
      headerLeftAction={headerLeftAction}
      isExpanded={isExpanded}
      maxContentHeight={maxContentHeight}
      title="进度"
      onToggle={onToggle}
    >
      {todos.length > 0 ? <CoworkTodoList todos={todos} /> : <CoworkEmptyProgressState />}
    </CoworkActivitySection>
  );
}

/** Residual vZt TodoList */
function CoworkTodoList({ todos }: { todos: CoworkTodoItem[] }) {
  return (
    <div className="flex flex-col" data-official-source="index-BELzQL5P.js:vZt">
      {todos.map((todo, index) => (
        <CoworkTodoRow
          key={todo.id}
          index={index + 1}
          isLast={index === todos.length - 1}
          todo={todo}
        />
      ))}
    </div>
  );
}

/** Residual CZt TodoItem row (comment button omitted until feedback residual wired). */
function CoworkTodoRow({
  index,
  isLast,
  todo,
}: {
  index: number;
  isLast: boolean;
  todo: CoworkTodoItem;
}) {
  const label =
    todo.status === "in_progress" && todo.activeForm ? todo.activeForm : todo.content;

  return (
    <div className="group/todo flex relative" data-official-source="index-BELzQL5P.js:CZt">
      <div className="flex flex-col items-center mr-3">
        <div className="flex-shrink-0">
          {todo.status === "completed" ? (
            <OfficialCompletedTodoIcon />
          ) : todo.status === "in_progress" ? (
            <OfficialNumberedTodoIcon accent number={index} />
          ) : (
            <OfficialNumberedTodoIcon number={index} />
          )}
        </div>
      </div>
      <div
        className={[
          "pb-3 text-sm flex-1 min-w-0 pr-6 transition-all duration-200",
          isLast ? "pb-0" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {todo.status === "completed" ? (
          <span className="text-text-500 line-through transition-colors duration-200">{todo.content}</span>
        ) : todo.status === "in_progress" ? (
          <span className="text-text-100 transition-colors duration-200">{label}</span>
        ) : (
          <span className="text-text-300 transition-colors duration-200">{todo.content}</span>
        )}
      </div>
    </div>
  );
}

/** Residual wZt completed badge: accent circle + check (im size 12). */
function OfficialCompletedTodoIcon() {
  return (
    <div
      className="w-6 h-6 rounded-full bg-accent-200 flex items-center justify-center"
      data-official-source="index-BELzQL5P.js:wZt"
    >
      <Icon className="text-bg-100" customSize={12} name="Check" />
    </div>
  );
}

/** Residual kZt pending / _Zt in_progress numbered circle. */
function OfficialNumberedTodoIcon({
  accent = false,
  number,
}: {
  accent?: boolean;
  number: number;
}) {
  return (
    <div
      className={[
        "w-6 h-6 rounded-full bg-alpha-1 flex items-center justify-center",
        accent ? "border border-accent-200" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-official-source={accent ? "index-BELzQL5P.js:_Zt" : "index-BELzQL5P.js:kZt"}
    >
      <span className="text-xs font-bold text-text-400">{number}</span>
    </div>
  );
}

/** Residual pQt EmptyProgressState */
function CoworkEmptyProgressState() {
  return (
    <div className="flex flex-col items-start gap-3" data-official-source="index-BELzQL5P.js:pQt">
      <div className="-ml-3">
        <img
          alt=""
          className="dark:hidden"
          draggable={false}
          height={66}
          src="/images/illustrations/session-progress.svg"
          width={117}
        />
        <img
          alt=""
          className="hidden dark:block"
          draggable={false}
          height={66}
          src="/images/illustrations/session-progress-dark.svg"
          width={117}
        />
      </div>
      <p className="text-text-500 font-small">See task progress for longer tasks.</p>
    </div>
  );
}
