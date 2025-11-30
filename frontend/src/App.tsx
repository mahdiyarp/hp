import React from 'react'
import ApiStatus from './components/ApiStatus'
import LoginPanel from './components/LoginPanel'

const App: React.FC = () => {
	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="hp-card px-4 py-3 sticky top-0 z-10">
				<div className="max-w-7xl mx-auto flex items-center gap-4">
					<div className="text-2xl font-bold tracking-wide">حساب‌پاک</div>
					<div className="flex-1" />
					<div className="hidden md:flex items-center gap-3">
						<input
							className="hp-input w-72"
							placeholder="جستجو..."
						/>
						<button className="hp-button">جستجو</button>
						<ApiStatus />
						<LoginPanel />
					</div>
				</div>
			</header>

			{/* Main */}
			<div className="flex-1">
				<div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">
					{/* Sidebar */}
					<aside className="col-span-12 md:col-span-3 lg:col-span-2">
						<nav className="hp-card p-3">
							<ul className="space-y-1 text-sm">
								<li><a className="block px-3 py-2 rounded hover:bg-[var(--background)]" href="#">داشبورد</a></li>
								<li><a className="block px-3 py-2 rounded hover:bg-[var(--background)]" href="#">فاکتورها</a></li>
								<li><a className="block px-3 py-2 rounded hover:bg-[var(--background)]" href="#">اشخاص</a></li>
								<li><a className="block px-3 py-2 rounded hover:bg-[var(--background)]" href="#">گزارشات</a></li>
								<li><a className="block px-3 py-2 rounded hover:bg-[var(--background)]" href="#">تنظیمات</a></li>
							</ul>
						</nav>
					</aside>

					{/* Content */}
					<main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4">
						{/* KPIs */}
						<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
							<div className="hp-card p-4">
								<div className="text-xs text-[var(--primary)]/70">فروش امروز</div>
								<div className="text-2xl font-bold mt-1">۰ تومان</div>
							</div>
							<div className="hp-card p-4">
								<div className="text-xs text-[var(--primary)]/70">پرداختی‌ها</div>
								<div className="text-2xl font-bold mt-1">۰ تومان</div>
							</div>
							<div className="hp-card p-4">
								<div className="text-xs text-[var(--primary)]/70">موجودی انبار</div>
								<div className="text-2xl font-bold mt-1">—</div>
							</div>
							<div className="hp-card p-4">
								<div className="text-xs text-[var(--primary)]/70">یادآورها</div>
								<div className="text-2xl font-bold mt-1">۰</div>
							</div>
						</section>

						{/* Recent activity placeholder */}
						<section className="hp-card p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold">فعالیت‌های اخیر</h2>
								<button className="hp-button ghost text-sm">مشاهده همه</button>
							</div>
							<div className="mt-3 text-sm text-[var(--primary)]/75">
								داده‌ای برای نمایش نیست. پس از ورود اطلاعات، آخرین فاکتورها و پرداخت‌ها اینجا نمایش داده می‌شوند.
							</div>
						</section>
					</main>
				</div>
			</div>

			{/* Footer */}
			<footer className="px-4 py-6 text-center text-xs text-[var(--primary)]/60">
				HesabPak — نسخه آزمایشی رابط کاربری
			</footer>
		</div>
	)
}

export default App

