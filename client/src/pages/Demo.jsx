import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Server,
  Cloud,
  Layers,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Activity,
  ExternalLink,
  Copy,
  Check,
  Code2,
  Terminal,
  Globe,
  Database,
  Cpu,
  Lock,
  ArrowUpRight,
  CheckCircle,
  HelpCircle,
  X,
  Menu,
} from 'lucide-react';

export default function Demo() {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);
  const [lastCoords, setLastCoords] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cloud');
  const [openFaq, setOpenFaq] = useState(0);
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' | 'annual'
  const [cartCount, setCartCount] = useState(0);
  const [activePreviewTab, setActivePreviewTab] = useState('deploy');
  const [modalAction, setModalAction] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [showTrackerWidget, setShowTrackerWidget] = useState(true);

  const sessionId = localStorage.getItem('cf_session_id') || 'cf_sess_active';

  // Listen to document clicks for instant feedback counter
  useEffect(() => {
    const handleClick = (e) => {
      setClickCount((prev) => prev + 1);
      setLastCoords({ x: Math.round(e.pageX), y: Math.round(e.pageY) });
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleActionClick = (title, message) => {
    setModalAction({ title, message });
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailSuccess(true);
    setTimeout(() => {
      setEmailSuccess(false);
      setEmailInput('');
    }, 3500);
  };

  const faqs = [
    {
      q: 'How does ApexCloud scale serverless functions globally?',
      a: 'Our edge engine compiles containerized microservices to native WebAssembly and mirrors state machines across 320+ edge locations with cold-start times under 8 milliseconds.',
    },
    {
      q: 'Can I migrate existing Kubernetes clusters without downtime?',
      a: 'Yes. ApexCloud provides bidirectional mesh proxies that route ingress traffic between your legacy Kubernetes clusters and ApexCloud isolated nodes with 100% zero drop rates.',
    },
    {
      q: 'What compliance certifications are supported out of the box?',
      a: 'All ApexCloud bare-metal zones and edge nodes are SOC 2 Type II, HIPAA BAA, ISO 27001, and PCI-DSS Level 1 certified with real-time audit log streaming.',
    },
    {
      q: 'How does real-time billing and overage prevention work?',
      a: 'You set hard credit limits per team and region. When 90% of budget is reached, automated resource throttling and Slack/webhook alerts trigger instantaneously.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* 1. Realistic ApexCloud Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 lg:gap-8 min-w-0">
            {/* Brand Logo */}
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/demo')}>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-teal-500/20">
                ▲
              </div>
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">ApexCloud</span>
              <span className="hidden sm:inline-block rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[10px] font-mono text-teal-400">
                v4.2.0
              </span>
            </div>

            {/* Navigation Links - Desktop Only (>=1024px) */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs font-semibold text-slate-300">
              <a href="#features" className="hover:text-teal-400 transition-colors whitespace-nowrap">
                Infrastructure
              </a>
              <a href="#preview" className="hover:text-teal-400 transition-colors whitespace-nowrap">
                AI Compute
              </a>
              <a href="#pricing" className="hover:text-teal-400 transition-colors whitespace-nowrap">
                Pricing
              </a>
              <a href="#faq" className="hover:text-teal-400 transition-colors whitespace-nowrap">
                Docs & FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Cart / Compute items counter */}
            <button
              id="btn-cart-instances"
              onClick={() => setCartCount((c) => c + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
              title="Compute instances"
            >
              <Cpu className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span className="hidden sm:inline">Clusters ({cartCount})</span>
              <span className="sm:hidden font-mono">({cartCount})</span>
            </button>

            {/* Sign In Trigger */}
            <button
              id="btn-signin"
              onClick={() => handleActionClick('Sign In', 'Authentication simulation: ApexCloud SSO identity provider connected.')}
              className="hidden md:inline-flex rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 transition-colors"
            >
              Sign In
            </button>

            {/* Return to Dashboard */}
            <button
              id="btn-return-dashboard"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3 sm:px-3.5 py-1.5 text-xs transition-colors shadow-md shadow-teal-500/20 whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:inline">Analytics Dashboard</span>
              <span className="md:hidden">Dashboard</span>
            </button>

            {/* Mobile / Tablet Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors border border-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-4 py-3 space-y-2.5 animate-in fade-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-1 text-xs font-semibold text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-teal-400 transition-colors"
              >
                Infrastructure
              </a>
              <a
                href="#preview"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-teal-400 transition-colors"
              >
                AI Compute
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-teal-400 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-teal-400 transition-colors"
              >
                Docs & FAQ
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleActionClick('Sign In', 'Authentication simulation: ApexCloud SSO identity provider connected.');
                }}
                className="w-full text-center rounded-lg border border-slate-700 bg-slate-900/60 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Sign In to Console
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-medium text-teal-300 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span>ApexCloud Mesh 4.0 Live in 54 Global Regions</span>
            <ArrowRight className="h-3 w-3 text-teal-400" />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Deploy Scalable Cloud Apps <br />
            <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              In Sub-Millisecond Speeds
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Automated autoscaling, serverless edge compute, and integrated data pipelines designed for high-velocity engineering teams.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              id="btn-hero-trial"
              onClick={() => handleActionClick('14-Day Free Trial', 'Free trial provisioned! Your sandbox tenant is spinning up with $300 in test compute credits.')}
              className="rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-3 text-sm shadow-xl shadow-teal-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Start 14-Day Free Trial
            </button>
            <button
              id="btn-hero-demo"
              onClick={() => handleActionClick('Book Technical Demo', 'Demo scheduled! Our solutions architect will connect with you.')}
              className="rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all active:scale-95"
            >
              Book Technical Demo
            </button>
          </div>

          {/* Live Edge Latency Bar */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>US-East (N. Virginia): 4ms</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>EU-Central (Frankfurt): 9ms</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>AP-South (Mumbai): 14ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Product Preview */}
      <section id="preview" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
          {/* Terminal / Preview Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-400">apex-cloud-console // v4.2</span>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex items-center gap-1">
              <button
                id="btn-tab-deploy"
                onClick={() => setActivePreviewTab('deploy')}
                className={`rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
                  activePreviewTab === 'deploy'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CLI Deploy
              </button>
              <button
                id="btn-tab-telemetry"
                onClick={() => setActivePreviewTab('telemetry')}
                className={`rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
                  activePreviewTab === 'telemetry'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telemetry
              </button>
              <button
                id="btn-tab-security"
                onClick={() => setActivePreviewTab('security')}
                className={`rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${
                  activePreviewTab === 'security'
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mesh Rules
              </button>
            </div>
          </div>

          {/* Terminal Content Body */}
          <div className="p-6 font-mono text-xs sm:text-sm">
            {activePreviewTab === 'deploy' && (
              <div className="space-y-3">
                <div className="text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-mono break-all sm:break-normal">$ npx apex-cloud deploy --env=production --region=global</span>
                  <button
                    onClick={() => handleActionClick('CLI Copied', 'Command copied to clipboard.')}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-sans shrink-0 self-start sm:self-auto"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-teal-400">✓ Detected Next.js 15 enterprise project bundle</div>
                <div className="text-teal-400">✓ Uploaded 24 edge microservices to global CDN (48ms)</div>
                <div className="text-emerald-400 font-bold">
                  ● Deployment Live: https://apex-cluster-77.apexcloud.net
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => handleActionClick('Run Live Health Check', 'All 54 edge locations responding with HTTP 200 OK.')}
                    className="rounded-lg bg-teal-500/15 border border-teal-500/30 px-3 py-1.5 text-xs text-teal-300 font-semibold hover:bg-teal-500/25 transition-colors"
                  >
                    Run Live Health Probe
                  </button>
                </div>
              </div>
            )}

            {activePreviewTab === 'telemetry' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <span className="text-slate-400 text-xs">Total Requests</span>
                    <p className="text-lg font-bold text-teal-300">14,290 req/s</p>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <span className="text-slate-400 text-xs">P99 Latency</span>
                    <p className="text-lg font-bold text-emerald-400">7.2 ms</p>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <span className="text-slate-400 text-xs">Memory Load</span>
                    <p className="text-lg font-bold text-cyan-400">34.8%</p>
                  </div>
                </div>
                <button
                  onClick={() => handleActionClick('Telemetry Stream', 'Streaming 50,000 live trace spans.')}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white font-medium"
                >
                  Stream OpenTelemetry Spans
                </button>
              </div>
            )}

            {activePreviewTab === 'security' && (
              <div className="space-y-3">
                <div className="text-slate-300">Active Firewalls: WAF-01 (Managed OWASP Top 10 Core Rules)</div>
                <div className="text-emerald-400">✓ mTLS Strict Encryption: Enabled across all ingress ports</div>
                <div className="text-slate-400">DDoS Scrubbing Capacity: 120 Tbps distributed across Anycast</div>
                <div className="pt-2">
                  <button
                    onClick={() => handleActionClick('Firewall Policy', 'Enforced Zero-Trust authentication rule set.')}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    Enforce Zero-Trust Rules
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Product Features Grid */}
      <section id="features" className="border-t border-slate-800/80 bg-slate-900/40 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Enterprise Cloud Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Built for Infinite Scale & Reliability
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Click any infrastructure component below to simulate provisioning and live telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-teal-500/50 hover:bg-slate-900 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20 group-hover:scale-110 transition-transform">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition-colors">
                Dedicated Bare-Metal Compute
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Single-tenant NVMe storage instances with 100 Gbps network bandwidth and zero noisy-neighbor degradation.
              </p>
              <button
                onClick={() => handleActionClick('Compute Instance', 'Dedicated bare-metal node provisioned in us-east-1.')}
                className="mt-5 w-full rounded-lg bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-200 py-2 text-xs font-semibold transition-colors"
              >
                Provision Compute Node
              </button>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-purple-500/50 hover:bg-slate-900 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
                Edge AI Inference
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Run low-latency LLMs, embeddings, and vision pipelines distributed across 320+ edge points of presence.
              </p>
              <button
                onClick={() => handleActionClick('Edge AI Model', 'Llama-3-8B model shard loaded into edge RAM cache.')}
                className="mt-5 w-full rounded-lg bg-slate-800 hover:bg-purple-500 hover:text-slate-950 text-slate-200 py-2 text-xs font-semibold transition-colors"
              >
                Deploy AI Model
              </button>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-500/50 hover:bg-slate-900 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Zero-Trust Mesh & WAF
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Automated DDoS scrubbing, mTLS mutual authentication, and automated SOC 2 audit telemetry streaming.
              </p>
              <button
                onClick={() => handleActionClick('Security Policy', 'Automated mTLS mesh policy applied to 12 clusters.')}
                className="mt-5 w-full rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 py-2 text-xs font-semibold transition-colors"
              >
                Configure Security Mesh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Cards Section */}
      <section id="pricing" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Transparent Pricing</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Simple, Predictable Cloud Plans</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Choose a tier and test plan selections. Switch between monthly and annual billing.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1 mt-4 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg px-4 py-1.5 transition-all ${
                billingCycle === 'monthly' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition-all ${
                billingCycle === 'annual' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual</span>
              <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[10px] text-emerald-300 font-mono">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <h4 className="text-base font-bold text-white">Developer Starter</h4>
              <p className="text-xs text-slate-400 mt-1">For personal projects and side apps</p>
              <div className="mt-6 text-3xl font-extrabold text-white font-mono">
                {billingCycle === 'annual' ? '$15' : '$19'}
                <span className="text-xs font-normal text-slate-400 font-sans"> / month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>3 Global Edge Regions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>500K Serverless Function Invocations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>Community Discord Support</span>
                </li>
              </ul>
            </div>
            <button
              id="btn-plan-starter"
              onClick={() => handleActionClick('Starter Plan', 'Developer Starter tier selected. Ready to deploy.')}
              className="mt-8 w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
            >
              Select Starter
            </button>
          </div>

          {/* Pro Team Plan (Highlighted) */}
          <div className="rounded-2xl border-2 border-teal-500 bg-slate-900 p-6 flex flex-col justify-between relative shadow-2xl shadow-teal-500/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">
              Most Popular
            </span>
            <div>
              <h4 className="text-base font-bold text-white">Pro Scaleup</h4>
              <p className="text-xs text-slate-400 mt-1">For fast-growing SaaS and mobile products</p>
              <div className="mt-6 text-3xl font-extrabold text-white font-mono">
                {billingCycle === 'annual' ? '$64' : '$79'}
                <span className="text-xs font-normal text-slate-400 font-sans"> / month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>All 54 Global Regions & Edge POPs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>10M Serverless Function Invocations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>Priority 24/7 SLA & Slack Channel</span>
                </li>
              </ul>
            </div>
            <button
              id="btn-plan-pro"
              onClick={() => handleActionClick('Pro Scaleup Plan', 'Pro tier activated with all 54 global regions unlocked.')}
              className="mt-8 w-full rounded-xl bg-teal-500 hover:bg-teal-400 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-teal-500/20 transition-all hover:scale-105"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <h4 className="text-base font-bold text-white">Enterprise VPC</h4>
              <p className="text-xs text-slate-400 mt-1">For mission-critical infrastructure</p>
              <div className="mt-6 text-3xl font-extrabold text-white font-mono">
                {billingCycle === 'annual' ? '$240' : '$299'}
                <span className="text-xs font-normal text-slate-400 font-sans"> / month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>Dedicated Bare-Metal VPC Clusters</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>Custom SLAs & Dedicated Architect</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  <span>SOC 2 Type II & HIPAA Compliance</span>
                </li>
              </ul>
            </div>
            <button
              id="btn-plan-enterprise"
              onClick={() => handleActionClick('Enterprise Inquiry', 'Enterprise inquiry sent to executive solutions team.')}
              className="mt-8 w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion */}
      <section id="faq" className="border-t border-slate-800/80 bg-slate-900/30 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Documentation</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3 pt-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden transition-all"
              >
                <button
                  id={`btn-faq-${idx}`}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-teal-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="h-4 w-4 text-teal-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="rounded-3xl border border-teal-500/30 bg-gradient-to-b from-teal-950/40 to-slate-900 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Accelerate Your Cloud Stack?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Join thousands of modern development teams deploying with sub-millisecond edge latency.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="Enter work email..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
            <button
              type="submit"
              id="btn-final-cta"
              className="w-full sm:w-auto shrink-0 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition-colors"
            >
              Get Started Now
            </button>
          </form>

          {emailSuccess && (
            <div className="mt-3 text-xs text-emerald-400 font-medium animate-in fade-in">
              ✓ Invitation sent! Check your inbox for access credentials.
            </div>
          )}
        </div>
      </section>

      {/* 8. Realistic SaaS Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-3 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black text-xs">
                ▲
              </div>
              <span className="font-bold text-white text-sm">ApexCloud</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Global high-performance cloud platform for next-generation distributed applications.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All Systems Operational (99.99%)</span>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-slate-300">Product</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#features" className="hover:text-slate-300">Bare-Metal Compute</a></li>
              <li><a href="#preview" className="hover:text-slate-300">Edge WebAssembly</a></li>
              <li><a href="#features" className="hover:text-slate-300">Serverless Vectors</a></li>
              <li><a href="#pricing" className="hover:text-slate-300">Global Anycast CDN</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-slate-300">Resources</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#faq" className="hover:text-slate-300">Documentation</a></li>
              <li><button onClick={() => navigate('/sessions')} className="hover:text-slate-300">Telemetry API</button></li>
              <li><button onClick={() => navigate('/heatmap')} className="hover:text-slate-300">Click Heatmaps</button></li>
              <li><a href="#faq" className="hover:text-slate-300">Security Whitepaper</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-slate-300">Company</h5>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={() => navigate('/')} className="hover:text-slate-300 text-teal-400 font-semibold">Analytics Dashboard</button></li>
              <li><span className="text-slate-600">SOC 2 Type II Certified</span></li>
              <li><span className="text-slate-600">GDPR & CCPA Compliant</span></li>
              <li><span className="text-slate-600">Privacy Policy</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-2">
          <p>© 2026 ApexCloud Technologies Inc. All rights reserved.</p>
          <p className="font-mono text-slate-600">Instrumented with CausalFunnel tracker.js</p>
        </div>
      </footer>

      {/* 9. Subtle Floating CausalFunnel Tracking Indicator Pill */}
      {showTrackerWidget && (
        <aside
          aria-label="CausalFunnel Tracking Status"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-teal-500/40 bg-slate-900/90 text-white px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
            </span>
            <span className="font-bold text-teal-400">CausalFunnel Tracked</span>
            <span className="text-slate-400 font-mono text-[11px]">
              • {clickCount} {clickCount === 1 ? 'click' : 'clicks'}
            </span>
            {lastCoords && (
              <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">
                ({lastCoords.x}, {lastCoords.y})
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => navigate('/sessions')}
            className="text-teal-300 hover:text-white font-semibold underline text-xs transition-colors"
            title="Inspect in Sessions"
          >
            Inspect
          </button>

          <button
            onClick={() => setShowTrackerWidget(false)}
            className="p-0.5 text-slate-500 hover:text-slate-300"
            title="Dismiss widget"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </aside>
      )}

      {/* Action Feedback Modal */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setModalAction(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-teal-400" />
                <h4 className="text-base font-bold text-white">{modalAction.title}</h4>
              </div>
              <button onClick={() => setModalAction(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{modalAction.message}</p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalAction(null)}
                className="rounded-lg bg-teal-500 text-slate-950 font-bold px-4 py-1.5 text-xs hover:bg-teal-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
