'use client';

import Link from 'next/link';

const features = [
  ['01', 'Verificação visual', 'Analisa a imagem e mostra o resultado de forma simples.'],
  ['02', 'Próximo local', 'Mostra o próximo local recomendado com base no histórico.'],
  ['03', 'Histórico', 'Mantém as verificações organizadas para consulta.'],
];

const faq = [
  ['O que é o Projeto Seringa?', 'É uma ferramenta de apoio que ajuda a organizar a verificação antes do uso de uma seringa e agulha, mantendo as informações e os registos em um só lugar.'],
  ['Como o projeto pode ajudar a ter mais segurança?', 'O sistema cria uma etapa de verificação antes do uso, analisa as informações disponíveis e pode bloquear o fluxo quando os critérios definidos não são cumpridos.'],
  ['O sistema confirma se posso tomar a dose?', 'Não. O Projeto Seringa não autoriza a administração de medicamentos. Ele oferece apoio à verificação e organização. A decisão clínica continua a ser de um profissional de saúde.'],
  ['Posso controlar o horário de cada uso?', 'Sim. O projeto foi pensado para ajudar a organizar o agendamento e o acompanhamento de cada uso, evitando que as aplicações fiquem sem registo.'],
  ['O sistema guarda o histórico?', 'Sim. As verificações e os usos podem ficar registados para facilitar o acompanhamento e a consulta do histórico.'],
  ['O que acontece quando existe uma dúvida?', 'A segurança vem primeiro. Quando a informação não é suficiente ou a confiança é baixa, o sistema pode interromper a verificação em vez de apresentar um resultado inseguro.'],
  ['O Projeto Seringa substitui um médico ou enfermeiro?', 'Não. É uma ferramenta de apoio. Não substitui orientação profissional, prescrição, avaliação clínica ou autorização para administrar medicamentos.'],
];

function FAQ() {
  return <section id="perguntas" className="border-t border-[#DCEBEC] bg-white">
    <div className="mx-auto max-w-4xl px-6 py-20 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-[#167D8D]">Perguntas frequentes</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tudo explicado de forma simples.</h2>
      <div className="mt-10 space-y-3">
        {faq.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-[#D5E7E8] bg-[#F8FCFC] p-5">
          <summary className="cursor-pointer list-none pr-8 font-bold text-[#16343A]">{question}<span className="float-right text-[#167D8D]">+</span></summary>
          <p className="mt-3 max-w-3xl leading-7 text-[#5C777D]">{answer}</p>
        </details>)}
      </div>
    </div>
  </section>;
}

export default function Home() {
  return <main className="min-h-screen bg-[#F4FAFB] text-[#16343A]">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3" aria-label="Projeto Seringa início">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#167D8D] font-black text-white">S</span>
        <span><b className="block tracking-tight">PROJETO SERINGA</b><small className="text-[#5C777D]">Verificação simples e segura</small></span>
      </Link>
      <div className="hidden items-center gap-8 text-sm text-[#426168] md:flex">
        <a href="#como-funciona" className="hover:text-[#167D8D]">Como funciona</a>
        <a href="#seguranca" className="hover:text-[#167D8D]">Segurança</a>
        <a href="#perguntas" className="hover:text-[#167D8D]">Perguntas</a>
      </div>
      <Link href="/verify" className="rounded-full bg-[#167D8D] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#126B79]">Abrir aplicação</Link>
    </nav>

    <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pt-20">
      <div className="self-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B7DDD7] bg-white px-4 py-2 text-xs font-semibold text-[#167D8D]"><span className="h-2 w-2 rounded-full bg-[#4FB3A4]"/> Feito para ser simples</div>
        <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">Verifique com mais <span className="text-[#167D8D]">clareza e tranquilidade.</span></h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[#426168]">O Projeto Seringa ajuda a organizar a verificação, o local e o histórico em um único fluxo.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/verify" className="rounded-2xl bg-[#167D8D] px-6 py-3.5 font-bold text-white shadow-sm hover:bg-[#126B79]">Começar verificação</Link><a href="#como-funciona" className="rounded-2xl border border-[#C9DDDF] bg-white px-6 py-3.5 font-semibold text-[#16343A] hover:border-[#9FC6C9]">Como funciona</a></div>
        <p className="mt-5 max-w-xl text-xs leading-5 text-[#6A8388]">Software de apoio à decisão. Não prescreve, não altera doses e não substitui avaliação ou autorização clínica.</p>
      </div>
      <div className="relative"><div className="absolute -inset-10 rounded-full bg-[#4FB3A4]/15 blur-3xl"/><div className="relative rounded-[2rem] border border-[#D5E7E8] bg-white p-4 shadow-xl"><div className="rounded-[1.5rem] bg-[#F4FAFB] p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Verificação</span><span className="rounded-full bg-[#E5F4F1] px-3 py-1 text-xs font-semibold text-[#287E70]">Pronto</span></div><div className="mt-6 grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-[#B9D2D5] bg-white"><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#E5F4F1] text-3xl text-[#167D8D]">◎</div><p className="mt-4 font-semibold">Adicionar imagem</p><p className="mt-1 text-xs text-[#6A8388]">A análise acontece antes do resultado</p></div></div>
        <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white p-3"><small className="text-[#6A8388]">Dose</small><b className="mt-1 block">Prescrita</b></div><div className="rounded-xl bg-white p-3"><small className="text-[#6A8388]">IA</small><b className="mt-1 block">Análise</b></div><div className="rounded-xl bg-white p-3"><small className="text-[#6A8388]">Registo</small><b className="mt-1 block">Histórico</b></div></div></div></div></div>
    </section>

    <section id="como-funciona" className="border-y border-[#DCEBEC] bg-white"><div className="mx-auto max-w-6xl px-6 py-20 lg:px-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-[#167D8D]">Como funciona</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Três passos. Sem complicação.</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{features.map(([n,t,d])=><article key={n} className="rounded-3xl border border-[#D5E7E8] bg-[#F8FCFC] p-6"><span className="text-sm font-bold text-[#167D8D]">{n}</span><h3 className="mt-8 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-[#5C777D]">{d}</p></article>)}</div></div></section>

    <section id="seguranca" className="mx-auto max-w-6xl px-6 py-20 lg:px-8"><div className="grid gap-8 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#167D8D]">Segurança</p><h2 className="mt-3 text-3xl font-bold">Quando há dúvida, o sistema avisa.</h2><p className="mt-5 leading-8 text-[#5C777D]">Se a informação não cumprir os critérios definidos, a verificação pode ser bloqueada. A análise do software permanece separada da decisão clínica.</p></div><div className="rounded-3xl border border-[#D5E7E8] bg-white p-7"><ul className="space-y-5 text-sm text-[#426168]"><li><b className="text-[#16343A]">Identidade:</b> preparado para utilizadores autenticados.</li><li><b className="text-[#16343A]">Acesso:</b> cada utilizador deve ver apenas os seus dados.</li><li><b className="text-[#16343A]">Histórico:</b> eventos organizados para rastreabilidade.</li><li><b className="text-[#16343A]">Proteção:</b> baixa confiança ou indisponibilidade conduz a bloqueio.</li></ul></div></div></section>

    <section id="tecnologia" className="bg-[#DDF3F0]"><div className="mx-auto max-w-6xl px-6 py-16 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[.2em] text-[#167D8D]">Tecnologia</p><h2 className="mt-3 text-3xl font-black">Tecnologia por trás da experiência.</h2></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{['Next.js','FastAPI','Supabase','AI Providers'].map(x=><div key={x} className="rounded-2xl border border-[#B7DDD7] bg-white p-4 text-center text-sm font-bold">{x}</div>)}</div></div></div></section>

    <FAQ />
    <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-xs text-[#6A8388] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 Projeto Seringa</span><span>Software de apoio — não substitui avaliação ou autorização clínica.</span></footer>
  </main>;
}
