import {
  Activity,
  AlertCircle,
  Calendar,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Download,
  FlaskConical,
  MessageSquare,
  Pill,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// Mock Data
const appointmentsData = [
  { name: 'Mon', appointments: 120, completed: 80 },
  { name: 'Tue', appointments: 150, completed: 110 },
  { name: 'Wed', appointments: 110, completed: 90 },
  { name: 'Thu', appointments: 160, completed: 130 },
  { name: 'Fri', appointments: 130, completed: 100 },
  { name: 'Sat', appointments: 180, completed: 150 },
  { name: 'Sun', appointments: 170, completed: 140 },
];

const patientVisitData = [
  { name: 'New Patients', value: 842, color: '#8B5CF6' },
  { name: 'Returning Patients', value: 1234, color: '#3B82F6' },
  { name: 'Walk-in Patients', value: 467, color: '#10B981' },
];

const revenueData = [
  { name: 'Week 1', value: 15000 },
  { name: 'Week 2', value: 20000 },
  { name: 'Week 3', value: 18000 },
  { name: 'Week 4', value: 28450 },
];

const genderData = [
  { name: 'Male', value: 1234, color: '#8B5CF6' },
  { name: 'Female', value: 1289, color: '#3B82F6' },
  { name: 'Other', value: 20, color: '#10B981' },
];

const ageGroupData = [
  { name: '0-18', value: 234, percent: '9.2%' },
  { name: '19-30', value: 542, percent: '21.3%' },
  { name: '31-45', value: 887, percent: '34.9%' },
  { name: '46-60', value: 567, percent: '22.3%' },
  { name: '60+', value: 313, percent: '12.3%' },
];

const deptStats = [
  { name: 'Cardiology', patients: 542, percentage: 75, color: '#EC4899' },
  { name: 'General Medicine', patients: 1024, percentage: 60, color: '#3B82F6' },
  { name: 'Orthopedics', patients: 342, percentage: 45, color: '#10B981' },
  { name: 'Neurology', patients: 298, percentage: 35, color: '#F59E0B' },
  { name: 'Dermatology', patients: 256, percentage: 30, color: '#EF4444' },
];

export default function DashboardHome() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, Dr. James Wilson 👋</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <CalendarIcon size={16} className="text-muted-foreground" />
            <span>July 31, 2026</span>
            <ChevronDown size={14} className="text-muted-foreground ml-1" />
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            <Download size={16} />
            <span>Export</span>
            <ChevronDown size={14} className="ml-1 opacity-70" />
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Total Patients */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">2,543</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-500">
                <TrendingUp size={14} />
                <span>12.5%</span>
                <span className="text-muted-foreground font-normal ml-1">from last month</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 w-full h-12 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorPv1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorPv1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">142</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-500">
                <TrendingUp size={14} />
                <span>8.3%</span>
                <span className="text-muted-foreground font-normal ml-1">from yesterday</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 w-full h-12 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentsData}>
                <defs>
                  <linearGradient id="colorPv2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="appointments" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorPv2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Medicines in Stock */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
              <Pill size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Medicines in Stock</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">1,289</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-medium text-muted-foreground">
                <span>In 320 categories</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 w-full h-12 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorPv3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPv3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lab Tests Today */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
              <FlaskConical size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lab Tests Today</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">86</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-500">
                <TrendingUp size={14} />
                <span>15.7%</span>
                <span className="text-muted-foreground font-normal ml-1">from yesterday</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 w-full h-12 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentsData}>
                <defs>
                  <linearGradient id="colorPv4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="completed" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorPv4)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">$8,420</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-500">
                <TrendingUp size={14} />
                <span>18.2%</span>
                <span className="text-muted-foreground font-normal ml-1">from yesterday</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 w-full h-12 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorPv5" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorPv5)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Appointments Overview</h3>
            <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-border">
              This Week <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex gap-6 mb-6">
            <div className="bg-muted dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-border/50 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
                <span className="text-xs text-muted-foreground font-medium">Appointments</span>
              </div>
              <p className="text-xl font-bold text-foreground">842</p>
            </div>
            <div className="bg-muted dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-border/50 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                <span className="text-xs text-muted-foreground font-medium">Completed</span>
              </div>
              <p className="text-xl font-bold text-foreground">467</p>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="appointments" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorAppt)" activeDot={{ r: 6, fill: "#8B5CF6", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} fill="none" activeDot={{ r: 6, fill: "#10B981", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Visit Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Patient Visit Overview</h3>
            <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-border">
              This Month <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 h-[260px]">
            <div className="w-[180px] h-[180px] relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientVisitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {patientVisitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">2,543</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Visits</span>
              </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
              {patientVisitData.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-foreground font-medium">{item.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between ml-4.5">
                    <span className="text-xs text-muted-foreground">{item.value} ({(item.value / 2543 * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
            <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-border">
              This Month <ChevronDown size={14} />
            </button>
          </div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground">$28,450</h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">Total Revenue</p>
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-500">
              <TrendingUp size={14} />
              <span>18.2%</span>
              <span className="text-muted-foreground font-normal ml-1">from last month</span>
            </div>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `${val / 1000}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`$${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 6, fill: "#8B5CF6", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Department Statistics */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Department Statistics</h3>
            <button className="text-xs font-medium text-primary hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-5">
            {deptStats.map((dept, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted dark:bg-slate-800 border border-border" style={{ color: dept.color }}>
                      <Activity size={14} />
                    </div>
                    <span className="font-medium text-foreground">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-xs">{dept.patients} Patients</span>
                    <span className="font-bold text-foreground w-8 text-right">{dept.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full" style={{ width: `${dept.percentage}%`, backgroundColor: dept.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Gender Distribution</h3>
          </div>
          <div className="flex items-center justify-between h-[240px]">
            <div className="w-[200px] h-[200px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">2,543</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Patients</span>
              </div>
            </div>
            <div className="flex-1 pl-6 space-y-6">
              {genderData.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: item.color }}>
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-none mb-1">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.value} ({(item.value / 2543 * 100).toFixed(1)}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age Group Distribution */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Age Group Distribution</h3>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageGroupData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                />
                <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {ageGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? '#8B5CF6' : 'hsl(var(--primary)/0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between px-4 mt-[-15px] relative z-10 pointer-events-none">
              {ageGroupData.map((d, i) => (
                <div key={i} className="text-[10px] text-muted-foreground text-center flex-1">
                  <span className="block">{d.value}</span>
                  <span className="block opacity-70">({d.percent})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        {/* Active Staff */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Active Staff</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">48</h4>
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <TrendingUp size={10} />
              <span>4 this month</span>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Pending Payments</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">$2,840</h4>
            <div className="flex items-center gap-1 text-[10px] font-medium text-red-500">
              <TrendingDown size={10} />
              <span>5.2% from last month</span>
            </div>
          </div>
        </div>

        {/* Expired Medicines */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Expired Medicines</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">23</h4>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <span>View and restock</span>
            </div>
          </div>
        </div>

        {/* Unread Messages */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Unread Messages</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">7</h4>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <span>View messages</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">System Status</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">All Systems</h4>
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <span>Operational</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
