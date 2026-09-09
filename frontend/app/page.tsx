'use client';

import Link from 'next/link';

const features = [
  ['01', 'Verificação visual', 'A imagem é analisada pelo sistema antes do registo da verificação.'],
  ['02', 'Rotação de locais', 'O histórico ajuda a apresentar o próximo local recomendado.'],
  ['03', 'Rastreabilidade', 'As verificações ficam organizadas para consulta no histórico.'],
];

export default function Home() {
  return <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3" aria-label="Projeto Seringa início">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 font-black text-slate-950">S</span>
        <span><b className="block tracking-tight">PROJETO SERINGA</b><small className="text-slate-400">Inteligência para verificação</small></span>
      </Link>
      <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        <a href="#como-funciona" className="hover:text-white">Como funciona</a>
        <a href="#seguranca" className="hover:text-white">Segurança</a>
        <a href="#tecnologia" className="hover:text-white">Tecnologia</a>
      </div>
      <Link href="/verify" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Abrir aplicação</Link>
    </nav>

    <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pt-24">
      <div className="self-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Sistema em evolução</div>
        <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl">Uma camada inteligente para tornar a verificação mais <span className="text-emerald-300">clara, rastreável e segura.</span></h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">O Projeto Seringa combina interface simples, visão computacional, regras de segurança e histórico para apoiar processos de medicamentos injetáveis.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/verify" className="rounded-2xl bg-emerald-400 px-6 py-3.5 font-bold text-slate-950 hover:bg-emerald-300">Experimentar o fluxo</Link><a href="#como-funciona" className="rounded-2xl border border-white/15 px-6 py-3.5 font-semibold text-white hover:bg-white/5">Conhecer a arquitetura</a></div>
        <p className="mt-5 max-w-xl text-xs leading-5 text-slate-500">Software de apoio à decisão. Não prescreve, não altera doses e não constitui autorização médica para administrar medicamentos.</p>
      </div>
      <div className="relative"><div className="absolute -inset-10 rounded-full bg-emerald-400/10 blur-3xl"/><div className="relative rounded-[2rem] border border-white/10 bg-white/[.06] p-4 shadow-2xl backdrop-blur"><div className="rounded-[1.5rem] bg-slate-900 p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Painel de verificação</span><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Protegido</span></div><div className="mt-6 grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-slate-600 bg-slate-950"><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-400/10 text-3xl">◎</div><p className="mt-4 font-semibold">Área de captura</p><p className="mt-1 text-xs text-slate-500">Imagem analisada antes do resultado</p></div></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/5 p-3"><small className="text-slate-500">Dose</small><b className="mt-1 block">Prescrita</b></div><div className="rounded-xl bg-white/5 p-3"><small className="text-slate-500">IA</small><b className="mt-1 block">Análise</b></div><div className="rounded-xl bg-white/5 p-3"><small className="text-slate-500">Registo</small><b className="mt-1 block">Auditável</b></div></div></div></div></div>
    </section>

    <section id="como-funciona" className="border-y border-white/10 bg-white/[.03]"><div className="mx-auto max-w-6xl px-6 py-20 lg:px-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-emerald-300">Como funciona</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Uma experiência web pensada desde o início para crescer.</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{features.map(([n,t,d])=><article key={n} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"><span className="text-sm font-bold text-emerald-300">{n}</span><h3 className="mt-8 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-slate-400">{d}</p></article>)}</div></div></section>

    <section id="seguranca" className="mx-auto max-w-6xl px-6 py-20 lg:px-8"><div className="grid gap-8 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-emerald-300">Segurança por desenho</p><h2 className="mt-3 text-3xl font-bold">A incerteza não é escondida.</h2><p className="mt-5 leading-8 text-slate-400">Quando a informação não cumpre os critérios definidos, o fluxo pode bloquear a verificação. O sistema mantém uma fronteira clara entre análise de software e decisão clínica.</p></div><div className="rounded-3xl border border-white/10 bg-white/[.04] p-7"><ul className="space-y-5 text-sm text-slate-300"><li><b className="text-white">Identidade:</b> arquitetura preparada para utilizadores autenticados.</li><li><b className="text-white">Escopo:</b> cada utilizador deve aceder apenas aos seus dados.</li><li><b className="text-white">Auditoria:</b> histórico e eventos preparados para rastreabilidade.</li><li><b className="text-white">Fallback:</b> indisponibilidade ou baixa confiança conduz a bloqueio, não a um falso positivo.</li></ul></div></div></section>

    <section id="tecnologia" className="bg-emerald-300 text-slate-950"><div className="mx-auto max-w-6xl px-6 py-16 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[.2em]">Arquitetura</p><h2 className="mt-3 text-3xl font-black">Um modelo que podemos reutilizar.</h2></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{['Next.js','FastAPI','Supabase','AI Providers'].map(x=><div key={x} className="rounded-2xl border border-slate-950/10 bg-white/50 p-4 text-center text-sm font-bold">{x}</div>)}</div></div></div></section>

    <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 Projeto Seringa</span><span>Software de apoio — não substitui avaliação ou autorização clínica.</span></footer>
  </main>;
}
