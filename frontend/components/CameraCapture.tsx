'use client';
import {useEffect,useRef,useState} from 'react';
export default function CameraCapture({onCapture}:{onCapture:(file:File)=>void}){
 const video=useRef<HTMLVideoElement>(null); const stream=useRef<MediaStream|null>(null); const [ready,setReady]=useState(false);
 useEffect(()=>{navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false}).then(s=>{stream.current=s;if(video.current){video.current.srcObject=s;setReady(true)}}).catch(()=>setReady(false));return()=>stream.current?.getTracks().forEach(t=>t.stop())},[]);
 const capture=()=>{if(!video.current)return;const c=document.createElement('canvas');c.width=video.current.videoWidth;c.height=video.current.videoHeight;c.getContext('2d')?.drawImage(video.current,0,0);c.toBlob(b=>b&&onCapture(new File([b],'syringe.jpg',{type:'image/jpeg'})),'image/jpeg',.92)};
 return <div className="relative overflow-hidden rounded-3xl bg-black aspect-[4/3]"><video ref={video} autoPlay playsInline muted className="h-full w-full object-cover"/><div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,.28)]"/><p className="absolute bottom-3 left-0 right-0 text-center text-sm text-white">Alinhe a seringa dentro da guia</p><button disabled={!ready} onClick={capture} className="absolute bottom-12 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-white ring-4 ring-white/40 disabled:opacity-40" aria-label="Tirar fotografia"/></div>
}
