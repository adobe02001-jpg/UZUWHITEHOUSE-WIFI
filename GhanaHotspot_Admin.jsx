import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell
} from "recharts";

// ── Vouchers from the PDF (UZU-HOSTEL 3Gb cards) ──
const VOUCHERS = [
  "XSDG-3544","RFKF-2256","QKQB-2583","BHGJ-5994","AMME-4222",
  "ZSSA-4558","LPJH-7969","JUPD-7287","WRFL-9798","UWLG-9925",
  "TARD-9253","KQHH-3379","BDYM-6497","KSDC-8945","QBAH-9168",
  "MHSK-5791","NEJJ-1149","YGFM-3878","VRRD-3432","PYTL-2561",
  "VMKG-8515","LFGH-2868","KDJM-3614","AXFN-6957","ENHP-7417",
  "HCKR-9767","ZABG-7933","DQDJ-9383","RKMQ-7243","RMHK-3718",
  "DGRQ-2558","DJNL-7124","NQQK-9289","FBXN-8555","DEEN-9626",
  "WRNR-8182","UUVS-8154","SWDS-9125","YERX-6596","BZZV-7273",
  "UPBP-2559","KBVX-6322","TNCT-8614","EMRU-6681","WDDU-6474",
  "WYXX-2566","NQLW-1259","JXYT-2557","TYXA-4931","QFLX-4338",
  "VTEY-2127","KKDC-5226","LKRW-6129","JFWF-7628","UKQD-6923",
  "NTPF-1726","DPGB-9636","GCMH-2831","FDLG-7241","EDKG-4659",
  "NJPK-6469","VNUP-9279","JKYQ-3595","WGCQ-7911","FRBK-5542",
  "YDFH-9673","VFRN-1488","WYAQ-3819","UDEK-8556","WWQN-9878",
  "GUFU-8799","NDQU-2836","VNAT-4873","GQKQ-7515","FJFY-4443",
  "SKRV-8185","NRGW-8238","JXWX-9271","NHSC-7724","NFHA-8462",
  "PDYZ-1129","GKZF-6668","MZQB-8932","FGRH-4571","DFSM-1635",
  "PMHE-4694","MKJJ-1758","KJKN-6823","NZMP-4673","RPNQ-2442",
  "QSJK-3427","CMQQ-7587","PGXV-2757","GTDY-7533","KNZQ-9113",
  "LDMX-2389","HHTW-8761","ELZW-4151","KUMA-7933","GXUA-4414",
  "JSAY-1491","PANC-4282","AAZD-8678","UESJ-9565","FDEL-4952",
  "EAXP-6455","VRJM-1547","VMBQ-3949","QVPL-9657","UHGL-2756",
  "MNKX-8159","RBCX-1257","RBQR-8471","KKNS-9585","GGRA-6583",
  "ARPC-7617","TAME-8722","WSKA-1156","DYPD-9276","BYMC-2995",
  "JDQF-1115","RKUH-9335","XQXL-8455","KMAM-8289","WJEM-8925",
  "XCNP-6756","TDXT-3982","PFFX-9217","QYQZ-7948","METU-8995",
  "NXCW-6736","XVSC-1967","CFAB-9414","TVQE-5351","MBEE-2713",
  "LWZM-5959","WYHJ-4912","REXJ-1464","YDYV-1112","YBMT-8269",
  "BMGY-2123","ALWW-9181","JNRX-4648","BVSD-5597","KYMF-9965",
  "GXMK-2538","VSGJ-7693","NCBE-4372","LBBJ-6856","WXHN-6425",
  "QJBK-3115","FVHM-4389","SRNS-5869","MRZA-2749","UYAY-6525",
  "QBFY-8325","LFLX-1116","LXXD-8692","GBDD-1483","VPVL-7174",
  "RTAK-9875","EFST-6466","FBYQ-8863","ZFQV-6169","JFAV-6866",
  "CLSA-3163","HXXU-7174","BCPZ-4372","AYFB-3284","HZDJ-7486",
  "CJPD-9514","TPSQ-2227","FGPT-7135","FGAL-1768","SZXQ-6676",
  "KJUR-3199","GGWY-6418","MMZB-1848","PABG-5862","BXTA-6511",
  "HDVC-1131","PJYF-5569","VQAH-1199","QSJM-3645","ECST-5674",
  "RZUT-1719","LBCX-4355","EJQX-6126","KMVE-2491","QXDC-6257",
  "YWSH-6798","WRLQ-5455","KFZS-6612","FMBM-4967","UBQP-6224",
  "HSCS-7471","FMXZ-6937","DFRF-5684","FSKK-4856","VMSC-1834",
];

// ── Mock data ──
const revenueData = [
  { day:"Mon", "3GB":35,"6GB":18,"Unlimited":8 },
  { day:"Tue", "3GB":42,"6GB":22,"Unlimited":11 },
  { day:"Wed", "3GB":28,"6GB":14,"Unlimited":6 },
  { day:"Thu", "3GB":55,"6GB":27,"Unlimited":13 },
  { day:"Fri", "3GB":63,"6GB":31,"Unlimited":15 },
  { day:"Sat", "3GB":71,"6GB":38,"Unlimited":19 },
  { day:"Sun", "3GB":48,"6GB":24,"Unlimited":10 },
];

const packageShare = [
  { name:"3GB — GH₵5",  value:68, color:"#F59E0B" },
  { name:"6GB — GH₵9",  value:24, color:"#3B82F6" },
  { name:"Unlimited",   value:8,  color:"#10B981" },
];

const networkShare = [
  { name:"MTN",        value:52, color:"#FBBF24" },
  { name:"Telecel",   value:28, color:"#60A5FA" },
  { name:"AirtelTigo", value:20, color:"#F87171" },
];

const TRANSACTIONS = [
  { ref:"GHHS-A3F2B19C1D2E", phone:"0241234567", network:"MTN",        pkg:"3GB",      amt:5.00,  status:"success",  time:"14:32" },
  { ref:"GHHS-B9E1C04D5F6A", phone:"0551234567", network:"Telecel",   pkg:"Unlimited", amt:40.00, status:"success",  time:"13:58" },
  { ref:"GHHS-C7D3A82E9B0F", phone:"0261234567", network:"AirtelTigo",pkg:"6GB",       amt:9.00,  status:"pending",  time:"13:47" },
  { ref:"GHHS-D1F4B63C8A2E", phone:"0201234567", network:"MTN",        pkg:"3GB",       amt:5.00,  status:"success",  time:"13:21" },
  { ref:"GHHS-E5A2D71F0C4B", phone:"0241345678", network:"MTN",        pkg:"3GB",       amt:5.00,  status:"failed",   time:"12:55" },
  { ref:"GHHS-F8C6E40A9D3B", phone:"0551456789", network:"Telecel",   pkg:"6GB",       amt:9.00,  status:"success",  time:"12:30" },
  { ref:"GHHS-G2B9F17E5C1A", phone:"0261567890", network:"AirtelTigo",pkg:"3GB",       amt:5.00,  status:"success",  time:"11:48" },
  { ref:"GHHS-H4A1C83D7E2F", phone:"0201678901", network:"MTN",        pkg:"Unlimited", amt:40.00, status:"success",  time:"11:12" },
  { ref:"GHHS-I6D5B92F4A0E", phone:"0241789012", network:"MTN",        pkg:"3GB",       amt:5.00,  status:"pending",  time:"10:55" },
  { ref:"GHHS-J0E7A14C8B6D", phone:"0551890123", network:"Telecel",   pkg:"6GB",       amt:9.00,  status:"success",  time:"10:21" },
];

const ACTIVE_USERS = [
  { mac:"A4:C3:F0:12:3B:45", phone:"0241234567", pkg:"3GB",       expires:"25 Mar 2026", data_used:1.2, data_total:3,     status:"online" },
  { mac:"B7:E1:D4:56:7C:89", phone:"0551234567", pkg:"Unlimited", expires:"18 Apr 2026", data_used:12.4,data_total:null,  status:"online" },
  { mac:"C2:A8:B5:90:1D:EF", phone:"0261234567", pkg:"6GB",       expires:"01 Apr 2026", data_used:3.8, data_total:6,     status:"idle" },
  { mac:"D5:F2:C9:34:8E:12", phone:"0201234567", pkg:"3GB",       expires:"25 Mar 2026", data_used:2.9, data_total:3,     status:"online" },
  { mac:"E8:B0:A3:78:2F:56", phone:"0241345678", pkg:"3GB",       expires:"24 Mar 2026", data_used:0.5, data_total:3,     status:"idle" },
  { mac:"F1:D6:E7:BC:45:90", phone:"0261456789", pkg:"6GB",       expires:"31 Mar 2026", data_used:1.1, data_total:6,     status:"online" },
];

// ── Components ──
const Badge = ({ status }) => {
  const cfg = {
    success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    pending: "bg-amber-500/20  text-amber-400  border border-amber-500/30",
    failed:  "bg-red-500/20    text-red-400    border border-red-500/30",
    online:  "bg-emerald-500/20 text-emerald-400",
    idle:    "bg-[#6A5A42]/20  text-[#9A8A72]",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${cfg[status]||""}`}>
      {status}
    </span>
  );
};

const KPI = ({ label, value, sub, accent }) => (
  <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5 flex flex-col gap-1 hover:border-amber-500/40 transition-colors">
    <span className="text-[#7A6A55] text-xs uppercase tracking-widest font-mono">{label}</span>
    <span className={`text-3xl font-bold ${accent||"text-white"}`}>{value}</span>
    {sub && <span className="text-[#7A6A55] text-xs">{sub}</span>}
  </div>
);

const SectionHead = ({ title, subtitle }) => (
  <div className="flex items-end justify-between mb-4">
    <div>
      <h2 className="text-white font-semibold text-sm uppercase tracking-widest">{title}</h2>
      {subtitle && <p className="text-[#7A6A55] text-xs mt-0.5">{subtitle}</p>}
    </div>
    <div className="h-px flex-1 mx-4 bg-[#2D2519]" />
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#231D15] border border-[#443825] rounded-lg p-3 text-xs">
      <p className="text-[#9A8A72] mb-1 font-mono">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="text-white font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function GhanaHotspotAdmin() {
  const [tab, setTab]       = useState("overview");
  const [vSearch, setVSearch] = useState("");
  const [vStatus, setVStatus] = useState("all"); // all | unused | used
  const [txSearch, setTxSearch] = useState("");
  const [mikrotik, setMikrotik] = useState({ connected: true, uptime: "14d 7h 22m", cpu: 12, mem: 38 });
  const [tick, setTick] = useState(0);

  // Simulate live ticker
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 3000);
    return () => clearInterval(t);
  }, []);

  // Voucher states (first 18 marked used for demo)
  const voucherData = VOUCHERS.map((code, i) => ({ code, used: i < 18 }));
  const filteredVouchers = voucherData.filter(v => {
    const matchSearch = v.code.toLowerCase().includes(vSearch.toLowerCase());
    const matchStatus = vStatus === "all" || (vStatus === "used" && v.used) || (vStatus === "unused" && !v.used);
    return matchSearch && matchStatus;
  });

  const totalRevToday = TRANSACTIONS.filter(t => t.status === "success").reduce((s, t) => s + t.amt, 0);
  const activeCount   = ACTIVE_USERS.filter(u => u.status === "online").length;
  const usedVouchers  = voucherData.filter(v => v.used).length;

  const filteredTx = TRANSACTIONS.filter(t =>
    t.ref.includes(txSearch) || t.phone.includes(txSearch) || t.pkg.toLowerCase().includes(txSearch.toLowerCase())
  );

  const TABS = ["overview", "transactions", "users", "vouchers", "mikrotik"];

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#1A1510", minHeight: "100vh", color: "#F2E8D5" }}>
      {/* ── TOPBAR ── */}
      <header style={{ borderBottom: "1px solid #1E293B" }} className="flex items-center justify-between px-6 py-4 sticky top-0 z-50" 
              style={{ background: "rgba(26,21,16,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1E293B" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #C2410C)" }}>
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-wide">GhanaHotspot</span>
            <span className="text-[#7A6A55] text-xs ml-2">UZU-HOSTEL</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${mikrotik.connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-[#9A8A72]">MikroTik</span>
            <span className={mikrotik.connected ? "text-emerald-400" : "text-red-400"}>
              {mikrotik.connected ? "LIVE" : "DOWN"}
            </span>
          </span>
          <span className="text-[#6A5A42]">|</span>
          <span className="text-[#9A8A72]">
            Today: <span className="text-amber-400 font-bold">GH₵ {totalRevToday.toFixed(2)}</span>
          </span>
          <span className="text-[#6A5A42]">|</span>
          <span className="text-[#9A8A72]">
            Online: <span className="text-emerald-400 font-bold">{activeCount} devices</span>
          </span>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav className="flex gap-1 px-6 pt-4 pb-0 border-b border-[#3A3020]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-xs uppercase tracking-widest rounded-t-lg transition-all"
            style={{
              background: tab === t ? "#F59E0B" : "transparent",
              color: tab === t ? "#1A1510" : "#9A8A72",
              fontWeight: tab === t ? "700" : "400",
              borderBottom: tab === t ? "2px solid #F59E0B" : "2px solid transparent",
            }}>
            {t}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-screen-xl mx-auto">

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPI label="Revenue Today" value={`GH₵ ${totalRevToday.toFixed(2)}`} sub="8 transactions" accent="text-amber-400" />
              <KPI label="Active Devices" value={activeCount} sub={`${ACTIVE_USERS.length} total provisioned`} accent="text-emerald-400" />
              <KPI label="Vouchers Sold" value={`${usedVouchers} / ${VOUCHERS.length}`} sub="18% utilised" />
              <KPI label="MikroTik Uptime" value={mikrotik.uptime} sub={`CPU ${mikrotik.cpu}% · RAM ${mikrotik.mem}%`} accent="text-blue-400" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Revenue bar */}
              <div className="md:col-span-2 bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
                <SectionHead title="Sales This Week" subtitle="Packages sold per day" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3A3020" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "#9A8A72", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9A8A72", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ color: "#94A3B8", fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="3GB"       fill="#F59E0B" radius={[3,3,0,0]} />
                    <Bar dataKey="6GB"       fill="#3B82F6" radius={[3,3,0,0]} />
                    <Bar dataKey="Unlimited" fill="#10B981" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Package donut */}
              <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
                <SectionHead title="Package Mix" subtitle="By transaction count" />
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={packageShare} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                      dataKey="value" stroke="none">
                      {packageShare.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "#231D15", border: "1px solid #1E293B", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {packageShare.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-[#9A8A72]">{p.name}</span>
                      </span>
                      <span className="font-bold" style={{ color: p.color }}>{p.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Network split + recent tx */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
                <SectionHead title="Network Split" subtitle="MoMo provider usage" />
                {networkShare.map(n => (
                  <div key={n.name} className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9A8A72]">{n.name}</span>
                      <span className="font-bold" style={{ color: n.color }}>{n.value}%</span>
                    </div>
                    <div className="h-1.5 bg-[#2D2519] rounded-full">
                      <div className="h-full rounded-full transition-all" style={{ width: `${n.value}%`, background: n.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:col-span-2 bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
                <SectionHead title="Recent Transactions" subtitle="Last 5 payments" />
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#6A5A42] uppercase tracking-wider">
                      <th className="text-left pb-2">Ref</th>
                      <th className="text-left pb-2">Phone</th>
                      <th className="text-left pb-2">Pkg</th>
                      <th className="text-right pb-2">Amt</th>
                      <th className="text-right pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TRANSACTIONS.slice(0,5).map(t => (
                      <tr key={t.ref} className="border-t border-[#3A3020]/50">
                        <td className="py-2 text-[#7A6A55] font-mono">{t.ref.slice(0,18)}…</td>
                        <td className="py-2 text-[#D8CAAB]">{t.phone}</td>
                        <td className="py-2 text-[#D8CAAB]">{t.pkg}</td>
                        <td className="py-2 text-right text-amber-400 font-bold">₵{t.amt.toFixed(2)}</td>
                        <td className="py-2 text-right"><Badge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TRANSACTIONS ══════════════════ */}
        {tab === "transactions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionHead title="All Transactions" subtitle={`${TRANSACTIONS.length} records today`} />
              <input
                placeholder="Search ref / phone / package…"
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                className="bg-[#231D15] border border-[#443825] rounded-lg px-3 py-2 text-xs text-[#D8CAAB] placeholder-[#6A5A42] focus:outline-none focus:border-amber-500/50 w-56"
              />
            </div>
            <div className="bg-[#231D15] border border-[#3A3020] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#1A1510]">
                  <tr className="text-[#6A5A42] uppercase tracking-wider">
                    {["Reference","Time","Phone","Network","Package","Amount","Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((t, i) => (
                    <tr key={t.ref} className={`border-t border-[#3A3020]/50 hover:bg-[#2D2519]/30 transition-colors ${i % 2 === 0 ? "" : "bg-[#1A1510]/30"}`}>
                      <td className="px-4 py-3 text-[#7A6A55] font-mono">{t.ref}</td>
                      <td className="px-4 py-3 text-[#9A8A72]">{t.time}</td>
                      <td className="px-4 py-3 text-[#D8CAAB]">{t.phone}</td>
                      <td className="px-4 py-3">
                        <span className="text-[#D8CAAB]">{t.network}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-[#2D2519] text-[#D8CAAB] px-2 py-0.5 rounded">{t.pkg}</span>
                      </td>
                      <td className="px-4 py-3 text-amber-400 font-bold">GH₵ {t.amt.toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTx.length === 0 && (
                <p className="text-center text-[#6A5A42] py-8 text-xs">No transactions match your search</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                { label:"Successful", count: TRANSACTIONS.filter(t=>t.status==="success").length, color:"text-emerald-400", amt: TRANSACTIONS.filter(t=>t.status==="success").reduce((s,t)=>s+t.amt,0) },
                { label:"Pending",    count: TRANSACTIONS.filter(t=>t.status==="pending").length, color:"text-amber-400",   amt: TRANSACTIONS.filter(t=>t.status==="pending").reduce((s,t)=>s+t.amt,0) },
                { label:"Failed",     count: TRANSACTIONS.filter(t=>t.status==="failed").length,  color:"text-red-400",     amt: TRANSACTIONS.filter(t=>t.status==="failed").reduce((s,t)=>s+t.amt,0) },
              ].map(s => (
                <div key={s.label} className="bg-[#231D15] border border-[#3A3020] rounded-xl p-4">
                  <div className="text-[#7A6A55] mb-1">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                  <div className="text-[#7A6A55] mt-1">GH₵ {s.amt.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════ ACTIVE USERS ══════════════════ */}
        {tab === "users" && (
          <div className="space-y-4">
            <SectionHead title="Active Hotspot Users" subtitle="Provisioned in MikroTik" />
            <div className="bg-[#231D15] border border-[#3A3020] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#1A1510]">
                  <tr className="text-[#6A5A42] uppercase tracking-wider">
                    {["MAC Address","Phone","Package","Data Used","Expires","Status","Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_USERS.map((u, i) => {
                    const pct = u.data_total ? Math.round((u.data_used / u.data_total) * 100) : null;
                    return (
                      <tr key={u.mac} className="border-t border-[#3A3020]/50 hover:bg-[#2D2519]/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[#9A8A72]">{u.mac}</td>
                        <td className="px-4 py-3 text-[#D8CAAB]">{u.phone}</td>
                        <td className="px-4 py-3">
                          <span className="bg-[#2D2519] text-[#D8CAAB] px-2 py-0.5 rounded">{u.pkg}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={pct && pct > 85 ? "text-red-400 font-bold" : "text-[#D8CAAB]"}>
                              {u.data_used}GB {u.data_total ? `/ ${u.data_total}GB` : ""}
                            </span>
                            {pct !== null && (
                              <div className="w-16 h-1 bg-[#2D2519] rounded-full">
                                <div className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : "#10B981" }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#9A8A72]">{u.expires}</td>
                        <td className="px-4 py-3"><Badge status={u.status} /></td>
                        <td className="px-4 py-3">
                          <button className="text-red-400 hover:text-red-300 transition-colors text-xs border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-500/10">
                            Kick
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400">
              ⚡ Run expiry check: <code className="bg-amber-500/10 px-2 py-0.5 rounded">POST /internal/run-expiry-check</code> — or wait for the hourly systemd timer to fire.
            </div>
          </div>
        )}

        {/* ══════════════════ VOUCHERS ══════════════════ */}
        {tab === "vouchers" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <SectionHead title={`UZU-HOSTEL Vouchers (${VOUCHERS.length})`} subtitle="3GB / GH₵5 · 7-day validity" />
              <input placeholder="Search code…" value={vSearch} onChange={e => setVSearch(e.target.value)}
                className="bg-[#231D15] border border-[#443825] rounded-lg px-3 py-2 text-xs text-[#D8CAAB] placeholder-[#6A5A42] focus:outline-none focus:border-amber-500/50 w-40" />
              <div className="flex gap-1">
                {["all","unused","used"].map(s => (
                  <button key={s} onClick={() => setVStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs uppercase tracking-wide transition-all"
                    style={{
                      background: vStatus === s ? "#F59E0B" : "#3A3020",
                      color: vStatus === s ? "#1A1510" : "#9A8A72",
                      fontWeight: vStatus === s ? "700" : "400"
                    }}>
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-[#7A6A55] text-xs ml-auto">
                {filteredVouchers.filter(v=>!v.used).length} unused · {filteredVouchers.filter(v=>v.used).length} used
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {filteredVouchers.map(v => (
                <div key={v.code}
                  className="bg-[#231D15] border rounded-lg p-3 flex flex-col gap-1 transition-all hover:scale-105"
                  style={{ borderColor: v.used ? "#3A3020" : "#F59E0B33" }}>
                  <span className="text-xs uppercase tracking-widest font-bold"
                    style={{ color: v.used ? "#475569" : "#F59E0B" }}>
                    {v.code.split("-")[0]}
                  </span>
                  <span className="text-[#6A5A42] text-xs font-mono">{v.code.split("-")[1]}</span>
                  <span className="text-xs mt-1" style={{ color: v.used ? "#EF4444" : "#10B981" }}>
                    {v.used ? "● USED" : "● AVAIL"}
                  </span>
                </div>
              ))}
            </div>
            {filteredVouchers.length === 0 && (
              <p className="text-center text-[#6A5A42] py-12 text-xs">No vouchers match your filter</p>
            )}

            <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
              <p className="text-[#7A6A55] text-xs mb-3 uppercase tracking-wider">Batch Stats</p>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { l:"Total Printed", v: VOUCHERS.length, c:"text-white" },
                  { l:"Used",          v: usedVouchers,    c:"text-red-400" },
                  { l:"Available",     v: VOUCHERS.length - usedVouchers, c:"text-emerald-400" },
                  { l:"Revenue if all sold", v:`GH₵ ${(VOUCHERS.length * 5).toLocaleString()}`, c:"text-amber-400" },
                ].map(s => (
                  <div key={s.l}>
                    <div className="text-[#6A5A42] text-xs">{s.l}</div>
                    <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ MIKROTIK ══════════════════ */}
        {tab === "mikrotik" && (
          <div className="space-y-6">
            <SectionHead title="MikroTik RouterOS" subtitle="192.168.88.1 · REST API v7" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPI label="Connection" value={mikrotik.connected ? "ONLINE" : "OFFLINE"}
                accent={mikrotik.connected ? "text-emerald-400" : "text-red-400"} />
              <KPI label="Uptime" value={mikrotik.uptime} accent="text-blue-400" />
              <KPI label="CPU Load" value={`${mikrotik.cpu}%`}
                accent={mikrotik.cpu > 80 ? "text-red-400" : "text-white"}
                sub="Hotspot + routing" />
              <KPI label="RAM Used" value={`${mikrotik.mem}%`}
                accent={mikrotik.mem > 80 ? "text-red-400" : "text-white"}
                sub="of 256 MB" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hotspot profiles */}
              <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
                <SectionHead title="Hotspot Profiles" subtitle="Configured in RouterOS" />
                {[
                  { name:"3gb-7day",       data:"3,072 MB", time:"7 days",  rate:"10 Mbps" },
                  { name:"6gb-14day",      data:"6,144 MB", time:"14 days", rate:"10 Mbps" },
                  { name:"unlimited-30day",data:"Unlimited",time:"30 days", rate:"20 Mbps" },
                ].map(p => (
                  <div key={p.name} className="flex items-center justify-between py-3 border-b border-[#3A3020] last:border-0 text-xs">
                    <span className="font-mono text-amber-400">{p.name}</span>
                    <div className="flex gap-4 text-[#7A6A55]">
                      <span>{p.data}</span>
                      <span>{p.time}</span>
                      <span className="text-emerald-400">{p.rate}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* API endpoints */}
              <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
                <SectionHead title="API Endpoints" subtitle="RouterOS REST /rest/" />
                {[
                  { method:"POST", path:"/ip/hotspot/user/add",    desc:"Create user" },
                  { method:"POST", path:"/ip/hotspot/active/login", desc:"Force login by MAC" },
                  { method:"DELETE",path:"/ip/hotspot/user/{id}",  desc:"Delete / expire user" },
                  { method:"GET",  path:"/ip/hotspot/user",        desc:"List all users" },
                  { method:"GET",  path:"/ip/hotspot/active",      desc:"Active sessions" },
                ].map(e => (
                  <div key={e.path} className="flex items-center gap-3 py-2 border-b border-[#3A3020] last:border-0 text-xs">
                    <span className="w-12 text-center font-bold rounded py-0.5"
                      style={{ background: e.method==="POST" ? "#10B98120" : e.method==="DELETE" ? "#EF444420" : "#3B82F620",
                               color:      e.method==="POST" ? "#10B981"   : e.method==="DELETE" ? "#EF4444"   : "#3B82F6" }}>
                      {e.method}
                    </span>
                    <span className="font-mono text-[#9A8A72] flex-1">{e.path}</span>
                    <span className="text-[#6A5A42]">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Walled garden & security */}
            <div className="bg-[#231D15] border border-[#3A3020] rounded-xl p-5">
              <SectionHead title="Walled Garden" subtitle="Domains allowed before payment" />
              <div className="flex flex-wrap gap-2">
                {["pay.yourhostel.com", "api.hubtel.com", "momo.mtn.com.gh"].map(d => (
                  <span key={d} className="bg-[#2D2519] text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-mono">
                    ✓ {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 space-y-1">
              <p className="font-bold">⚠ Security Reminder</p>
              <p className="text-red-400/70">Hotspot clients are blocked from accessing MikroTik admin ports (80, 443, 8728, 8729) via firewall rules. The <code className="bg-red-500/10 px-1 rounded">/internal/</code> FastAPI endpoint is only accessible from 127.0.0.1 via nginx.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
