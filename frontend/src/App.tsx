import React from 'react'
import ApiStatus from './components/ApiStatus'
import LoginPanel from './components/LoginPanel'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Persons from './pages/Persons'
import Reports from './pages/Reports'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import Products from './pages/Products'
import Contacts from './pages/Contacts'
import InvoiceEditor from './pages/InvoiceEditor'
import ContactEditor from './pages/ContactEditor'
import PersonEditor from './pages/PersonEditor'
import ProductEditor from './pages/ProductEditor'
import Activity from './pages/Activity'
import Tasks from './pages/Tasks'
import TaskEditor from './pages/TaskEditor'
import PaymentEditor from './pages/PaymentEditor'

type RouteKey = 'dashboard' | 'invoices' | 'persons' | 'products' | 'reports' | 'settings' | 'contacts' | 'activity' | 'tasks' | 'payments'

function useHashRoute(defaultRoute: RouteKey = 'dashboard') {
	const [route, setRoute] = React.useState<RouteKey>(() => {
		const h = (window.location.hash || '').replace('#', '') as RouteKey
		return (['dashboard','invoices','persons','products','reports','settings','contacts','activity','tasks','payments'] as RouteKey[]).includes(h) ? h : defaultRoute
	})
	React.useEffect(() => {
		const onHash = () => {
				const h = (window.location.hash || '').replace('#', '') as RouteKey
				if ((['dashboard','invoices','persons','products','reports','settings','contacts','activity','tasks','payments'] as RouteKey[]).includes(h)) {
				setRoute(h)
			}
		}
		window.addEventListener('hashchange', onHash)
		return () => window.removeEventListener('hashchange', onHash)
	}, [])
	const navigate = (r: RouteKey) => {
		window.location.hash = r
		setRoute(r)
	}
	return { route, navigate }
}

const App: React.FC = () => {
	const { route, navigate } = useHashRoute('dashboard')
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
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='dashboard'?'bg-[var(--background)]':''}`} href="#dashboard" onClick={(e)=>{e.preventDefault();navigate('dashboard')}}>داشبورد</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='invoices'?'bg-[var(--background)]':''}`} href="#invoices" onClick={(e)=>{e.preventDefault();navigate('invoices')}}>فاکتورها</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='payments'?'bg-[var(--background)]':''}`} href="#payments" onClick={(e)=>{e.preventDefault();navigate('payments')}}>پرداخت‌ها</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='contacts'?'bg-[var(--background)]':''}`} href="#contacts" onClick={(e)=>{e.preventDefault();navigate('contacts')}}>مخاطبین</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='persons'?'bg-[var(--background)]':''}`} href="#persons" onClick={(e)=>{e.preventDefault();navigate('persons')}}>اشخاص</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='products'?'bg-[var(--background)]':''}`} href="#products" onClick={(e)=>{e.preventDefault();navigate('products')}}>کالاها</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='reports'?'bg-[var(--background)]':''}`} href="#reports" onClick={(e)=>{e.preventDefault();navigate('reports')}}>گزارشات</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='settings'?'bg-[var(--background)]':''}`} href="#settings" onClick={(e)=>{e.preventDefault();navigate('settings')}}>تنظیمات</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='activity'?'bg-[var(--background)]':''}`} href="#activity" onClick={(e)=>{e.preventDefault();navigate('activity')}}>فعالیت‌ها</a></li>
								<li><a className={`block px-3 py-2 rounded hover:bg-[var(--background)] ${route==='tasks'?'bg-[var(--background)]':''}`} href="#tasks" onClick={(e)=>{e.preventDefault();navigate('tasks')}}>وظایف</a></li>
							</ul>
						</nav>
					</aside>

					{/* Content */}
					<main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4">
						{route === 'dashboard' && <Dashboard />}
						{route === 'invoices' && <Invoices />}
						{route === 'contacts' && <Contacts />}
						{route === 'persons' && <Persons />}
						{route === 'reports' && <Reports />}
						{route === 'products' && <Products />}
						{route === 'payments' && <Payments />}
						{route === 'settings' && <Settings />}
						{route === 'activity' && <Activity />}
						{route === 'tasks' && <Tasks />}

						{/* Editor overlays based on hash */}
						{String(window.location.hash||'').startsWith('#invoice-edit') && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<InvoiceEditor mode="edit" />
								</div>
							</div>
						)}
						{String(window.location.hash||'')==='#invoice-new' && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<InvoiceEditor mode="create" />
								</div>
							</div>
						)}
						{String(window.location.hash||'').startsWith('#contact-edit') && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<ContactEditor mode="edit" />
								</div>
							</div>
						)}
						{String(window.location.hash||'')==='#contact-new' && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<ContactEditor mode="create" />
								</div>
							</div>
						)}

						{String(window.location.hash||'').startsWith('#product-edit') && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<ProductEditor mode="edit" />
								</div>
							</div>
						)}
						{String(window.location.hash||'')==='#product-new' && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<ProductEditor mode="create" />
								</div>
							</div>
						)}
						{String(window.location.hash||'').startsWith('#person-edit') && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<PersonEditor mode="edit" />
								</div>
							</div>
						)}
						{String(window.location.hash||'')==='#person-new' && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-3xl w-full rounded shadow-lg">
									<PersonEditor mode="create" />
								</div>
							</div>
						)}

						{String(window.location.hash||'').startsWith('#task-edit') && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-2xl w-full rounded shadow-lg">
									<TaskEditor mode="edit" />
								</div>
							</div>
						)}
						{String(window.location.hash||'')==='#task-new' && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-2xl w-full rounded shadow-lg">
									<TaskEditor mode="create" />
								</div>
							</div>
						)}

						{/* Payment editor */}
						{String(window.location.hash||'').startsWith('#payment') && (
							<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
								<div className="bg-white max-w-xl w-full rounded shadow-lg">
									<PaymentEditor />
								</div>
							</div>
						)}
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

