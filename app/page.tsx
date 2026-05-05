import Link from "next/link";

function IconBuilding(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function IconUsers(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function IconCube(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function IconChart(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function IconShield(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

const features = [
  {
    title: "Обекти и договори",
    text: "Проследявайте локации, статус, аванси и назначени бригадири на един екран.",
    Icon: IconBuilding,
  },
  {
    title: "Екипи и график",
    text: "Групи работници по обект, присъствие и дневен дневник за координация на площадката.",
    Icon: IconUsers,
  },
  {
    title: "Склад и материали",
    text: "Централен склад с отчислявания към обекти и ясна история на движенията.",
    Icon: IconCube,
  },
  {
    title: "Финанси и отчети",
    text: "Разходи, плащания по обекти и основа за месечни обзори за управленски решения.",
    Icon: IconChart,
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:h-16 sm:px-6 sm:py-0 sm:pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="flex min-w-0 flex-1 touch-manipulation items-center gap-2.5 text-slate-900 no-underline active:opacity-90"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:rounded-lg">
              C
            </span>
            <span className="min-w-0 leading-none">
              <span className="block truncate text-[15px] font-bold tracking-tight sm:text-sm">
                Construction OS
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-slate-500 sm:block">
                Операционна система за строителството
              </span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden min-h-[44px] items-center justify-center rounded-lg px-3 text-sm font-semibold text-slate-700 touch-manipulation transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
              Вход
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm touch-manipulation transition hover:bg-slate-800 active:bg-slate-950 sm:px-5"
            >
              <span className="sm:hidden">Вход</span>
              <span className="hidden sm:inline">Към приложението</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.85]"
            aria-hidden
            style={{
              background:
                "linear-gradient(135deg, rgba(248, 250, 252, 0.97) 0%, rgba(241, 245, 249, 0.98) 45%, rgba(239, 246, 255, 0.55) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-slate-400/10 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 md:py-24 lg:py-28">
            <div className="mx-auto max-w-3xl text-center sm:text-center">
              <p className="inline-flex max-w-[100%] items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-[11px] font-semibold leading-tight text-slate-600 shadow-sm backdrop-blur-sm sm:py-1 sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-pretty">
                  За строителни компании и обекти
                </span>
              </p>
              <h1 className="mt-5 text-pretty text-[1.65rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:mt-6 sm:text-4xl lg:text-5xl lg:leading-[1.1]">
                Централизирайте обектите, екипите и ресурсите
              </h1>
              <p className="mt-4 text-pretty text-[15px] leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
                Единна платформа за проследяване на строителни обекти, персонал,
                склад, материали и финанси — с ясни роли за администратор,
                управител и бригадир.
              </p>
              <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/login"
                  className="inline-flex min-h-[52px] w-full touch-manipulation items-center justify-center rounded-xl bg-blue-700 px-6 py-4 text-base font-semibold text-white shadow-md shadow-blue-700/25 transition hover:bg-blue-800 active:bg-blue-900 sm:w-auto sm:min-h-[48px] sm:px-8 sm:py-3.5"
                >
                  Вход в системата
                </Link>
                <p className="text-pretty text-center text-[13px] leading-relaxed text-slate-500 sm:max-w-xs sm:text-left sm:text-xs">
                  Достъпът е контролиран: акаунти се издават от администрацията
                  и управителите на фирмата.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="text-pretty text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Модули за работа от телефон и офис
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-slate-600 sm:text-base">
              Екраните са подредени за бърз преглед на малък дисплей — същите
              данни и на обект, и в офиса.
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {features.map(({ title, text, Icon }) => (
              <li
                key={title}
                className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition active:scale-[0.99] sm:p-6 sm:hover:border-slate-300 sm:hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-blue-50 group-hover:text-blue-700 sm:h-11 sm:w-11">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:mt-4">
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-600 sm:text-sm">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-[var(--border)] bg-slate-900 py-10 text-white sm:py-14">
          <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-6 px-4 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <IconShield className="h-7 w-7" />
              </span>
              <div className="max-w-xl">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Сигурен достъп по роли
                </h2>
                <p className="mt-2 text-pretty text-[15px] leading-relaxed text-slate-300 sm:text-sm">
                  Главен администратор, управители на фирми и бригадири виждат
                  само данните, които отговарят на отговорностите им.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-[48px] w-full shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 active:bg-white/20 sm:w-auto"
            >
              Започнете от входа
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-6 sm:pb-0">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-slate-900">
              Construction OS
            </p>
            <p className="mt-2 text-pretty text-[13px] leading-relaxed text-slate-500 sm:mt-1 sm:text-xs">
              Първият влязъл потребител при празна база става главен администратор.
              Управители и бригадири се добавят от администрацията и фирмения
              профил.
            </p>
          </div>
          <p className="shrink-0 text-center text-[11px] text-slate-400 sm:text-xs">
            © {new Date().getFullYear()} · Вътрешна система за управление
          </p>
        </div>
      </footer>
    </div>
  );
}
