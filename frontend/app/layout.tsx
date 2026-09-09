import './globals.css';
export const metadata={title:'Projeto Seringa | Verificação inteligente',description:'Plataforma de apoio à verificação visual e rastreabilidade de medicamentos injetáveis',manifest:'/manifest.webmanifest'};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-PT"><body>{children}</body></html>}
