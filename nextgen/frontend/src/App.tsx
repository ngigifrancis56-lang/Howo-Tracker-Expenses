import { useEffect, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, CalendarDays,
  ChartNoAxesCombined, ChevronDown, CircleHelp, ClipboardList, Fuel,
  LayoutDashboard, Menu, MessageCircle, MoreHorizontal, Plus, Search,
  Settings, Truck, Users, Wallet
} from "lucide-react";

type Health = "checking" | "online" | "offline";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Trips", icon: ClipboardList },
  { label: "Vehicles", icon: Truck },
  { label: "Drivers", icon: Users },
  { label: "Expenses", icon: Wallet },
  { label: "Reports", icon: ChartNoAxesCombined }
];

const money = (value: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);

function App() {
  const [health, setHealth] = useState<Health>("checking");
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then(() => setHealth("online"))
      .catch(() => setHealth("offline"));
    return () => controller.abort();
  }, []);

  const cards = [
    { label: "Total revenue", value: money(0), change: "Trip income", icon: Wallet, tone: "blue" },
    { label: "Operating expenses", value: money(0), change: "Fuel, repairs & costs", icon: Fuel, tone: "orange" },
    { label: "Net profit", value: money(0), change: "Revenue less expenses", icon: ChartNoAxesCombined, tone: "green" },
    { label: "Active vehicles", value: "0", change: "Fleet vehicles", icon: Truck, tone: "violet" }
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Truck size={25} strokeWidth={2.2} /></div>
          <div><strong>APEX</strong><span>LOGISTIC GROUP</span></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-link ${active === label ? "active" : ""}`} onClick={() => { setActive(label); setMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link" onClick={() => setActive("Live chat")}><MessageCircle size={18}/><span>Live chat</span></button>
          <button className="nav-link" onClick={() => setActive("Settings")}><Settings size={18}/><span>Settings</span></button>
          <div className="help-card"><CircleHelp size={18}/><strong>Need help?</strong><span>Fleet operations, made clearer.</span></div>
          <div className="copyright">© Big Papa {new Date().getFullYear()}</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div>
          <div className="top-actions">
            <div className={`connection ${health}`}><i />{health === "online" ? "API connected" : health === "offline" ? "API not connected" : "Checking API"}</div>
            <button className="icon-button" aria-label="Search"><Search size={18}/></button>
            <button className="icon-button notification" aria-label="Notifications"><Bell size={18}/></button>
            <div className="user-avatar">AG</div>
          </div>
        </header>

        <section className="content">
          <div className="welcome-row">
            <div><div className="eyebrow">FLEET COMMAND CENTRE</div><h1>Good morning</h1><p>Here is your fleet's financial overview.</p></div>
            <button className="primary-button"><Plus size={17}/> Record a trip</button>
          </div>

          <div className="date-strip"><CalendarDays size={16}/> Financial snapshot <span>•</span> All vehicles <ChevronDown size={15}/></div>

          <div className="stats-grid">
            {cards.map(({ label, value, change, icon: Icon, tone }) => (
              <article className="stat-card" key={label}>
                <div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={19}/></div></div>
                <strong className="stat-value">{value}</strong>
                <div className="stat-foot"><span>{change}</span><MoreHorizontal size={18}/></div>
              </article>
            ))}
          </div>

          <div className="section-grid">
            <section className="panel financial-panel">
              <div className="panel-heading"><div><h2>Financial performance</h2><p>Revenue, expenses and profit over time</p></div><button className="period-button">This month <ChevronDown size={14}/></button></div>
              <div className="empty-chart"><div className="chart-art"><Activity size={34}/></div><strong>Your financial picture starts here</strong><span>Once trips and expenses are recorded, your performance chart will appear here.</span></div>
            </section>
            <section className="panel">
              <div className="panel-heading"><div><h2>Fleet activity</h2><p>Vehicle operations at a glance</p></div><Boxes size={19} className="muted-icon"/></div>
              <div className="fleet-empty"><div className="fleet-illustration"><Truck size={42}/></div><strong>No vehicles added yet</strong><span>Add your first vehicle to start tracking fleet activity.</span><button className="secondary-button">Add a vehicle</button></div>
            </section>
          </div>

          <section className="panel trips-panel">
            <div className="panel-heading"><div><h2>Recent trips</h2><p>Your latest fleet movements</p></div><button className="text-button">View all trips <ArrowUpRight size={15}/></button></div>
            <div className="table-empty"><ClipboardList size={22}/><span>No trips recorded yet</span></div>
          </section>
          <footer className="page-footer"><span>Apex Logistic Group</span><span>Built for better fleet decisions.</span></footer>
        </section>
      </main>
    </div>
  );
}

export default App;