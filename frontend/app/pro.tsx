'use client';
import { useEffect, useState } from 'react';

const PRO_KEY='seringa_pro_active';
const FEATURES=['Histórico avançado e filtros','Resumo de conferências','Rodízio organizado','Ferramentas de acessibilidade','Experiência Pro sem publicidade'];

export default function ProPanel(){
 const [active,setActive]=useState(false),[key,setKey]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>setActive(localStorage.getItem(PRO_KEY)==='1'),[]);
 function activate(){
  const clean=key.trim().toUpperCase();
  if(/^SERINGA-PRO-[A-Z0-9]{6,20}$/.test(clean)){localStorage.setItem(PRO_KEY,'1');setActive(true);setMessage('Seringa Pro ativado neste aparelho.');}
  else setMessage('Chave inválida. Use uma chave no formato SERINGA-PRO-XXXXXX.');
 }
 if(active)return <section className="mx-auto max-w-3xl px-4"><div className="rounded-[24px] bg-white p-6 shadow-sm"><span className="rounded-full bg-[#D8EEDF] px-3 py-1 text-xs font-black text-[#1B6B63]">✓ PRO ATIVO</span><h2 className="mt-3 text-3xl font-black">Seu Seringa Pro está pronto.</h2><p className="mt-2 text-sm text-[#607773]">Os recursos Pro ficam disponíveis localmente neste aparelho.</p><div className="mt-5 grid gap-2">{FEATURES.map(x=><div key={x} className="rounded-xl border border-[#DCE7E4] p-3 text-sm font-semibold">✓ {x}</div>)}</div></div></section>;
 return <section className="mx-auto max-w-3xl px-4"><div className="rounded-[24px] bg-white p-6 shadow-sm"><span className="text-4xl">⭐</span><small className="mt-2 block font-black tracking-[.14em] text-[#1B6B63]">SERINGA PRO</small><h2 className="mt-1 text-3xl font-black">Mais organização para a sua jornada.</h2><p className="mt-2 text-sm text-[#607773]">Recursos avançados para acompanhar seus registros com mais clareza.</p><div className="mt-5 grid gap-2">{FEATURES.map(x=><div key={x} className="rounded-xl bg-[#F5FAF8] p-3 text-sm font-semibold">✓ {x}</div>)}</div><div className="mt-5 rounded-2xl border border-[#CFE3DE] p-4"><b className="block">Já tem uma chave?</b><input value={key} onChange={e=>setKey(e.target.value)} placeholder="SERINGA-PRO-XXXXXX" className="mt-2 h-12 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827]"/><button onClick={activate} className="mt-3 w-full rounded-xl bg-[#1B6B63] py-3 font-black text-white">Ativar Seringa Pro</button>{message&&<p className="mt-2 text-xs font-semibold text-[#1B6B63]">{message}</p>}</div><p className="mt-4 text-center text-xs text-[#607773]">A compra/geração da licença será ligada ao canal comercial do SERINGA quando este estiver publicado.</p></div></section>;
}
