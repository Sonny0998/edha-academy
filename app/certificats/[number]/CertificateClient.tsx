'use client'

import Link from 'next/link'
import { Download, CheckCircle, Share2 } from 'lucide-react'

interface Props {
  studentName: string
  courseTitle: string
  instructorName: string
  instructorSig: string | null
  adminSig: string | null
  adminName: string
  certificateNumber: string
  issuedDate: string
  verifyUrl: string
}

export default function CertificateClient({
  studentName, courseTitle, instructorName,
  instructorSig, adminSig, adminName,
  certificateNumber, issuedDate, verifyUrl,
}: Props) {

  // FIX: was using window.print() which is not a real PDF — added html2canvas hint
  // For now uses print with proper @media print styles
  const handleDownload = () => {
    document.title = `Certificat EDHA — ${studentName} — ${courseTitle}`
    window.print()
  }

  const handleShare = () => {
    // FIX: was using window.location.href (SSR unsafe) — now uses the verifyUrl prop from DB
    const url = verifyUrl
    if (navigator.share) {
      navigator.share({ title: `Certificat EDHA — ${studentName}`, url })
    } else {
      navigator.clipboard.writeText(url)
      alert('Lien copié !')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&family=Inter:wght@400;500;600;700&display=swap');

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .cert-wrapper {
            display: flex !important; align-items: center !important;
            justify-content: center !important; min-height: 100vh !important;
            padding: 0 !important;
          }
          .cert-card { box-shadow: none !important; border: none !important; margin: 0 !important; }
          /* Ensure colors print correctly */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        .script-font { font-family: 'Cormorant Garamond', serif; }
        .gold-lines-tl {
          background: repeating-linear-gradient(-45deg, transparent, transparent 6px, #c9922a 6px, #c9922a 8px);
          opacity: 0.7;
        }
        .gold-lines-br {
          background: repeating-linear-gradient(135deg, transparent, transparent 6px, #c9922a 6px, #c9922a 8px);
          opacity: 0.7;
        }
      `}</style>

      <div className="cert-wrapper min-h-screen bg-[#e8edf3] flex flex-col items-center justify-center px-4 py-10">

        <div className="no-print flex gap-3 mb-6">
          <button onClick={handleDownload}
            className="inline-flex items-center gap-2 bg-[#0f1a2e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1a2d4a] transition-colors shadow-md">
            <Download size={15} /> Télécharger PDF
          </button>
          <button onClick={handleShare}
            className="inline-flex items-center gap-2 bg-white border border-[#dde3ea] text-[#0f1a2e] font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-sm">
            <Share2 size={15} /> Partager
          </button>
        </div>

        <div className="cert-card bg-white shadow-2xl relative overflow-hidden"
          style={{ width: '100%', maxWidth: '860px', aspectRatio: '1.414 / 1', minHeight: '300px' }}>

          <div className="absolute top-0 left-0 bg-[#0f1a2e]"
            style={{ width: '42%', height: '55%', clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)' }} />

          <div className="absolute top-0 left-0 bg-gradient-to-b from-[#d4a843] to-[#b8891e]"
            style={{ width: '3px', height: '55%', left: '40%', transform: 'skewX(-20deg)', opacity: 0.8 }} />

          <div className="gold-lines-tl absolute"
            style={{ top: 0, right: 0, width: '22%', height: '42%', clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)' }} />

          <div className="gold-lines-br absolute"
            style={{ bottom: 0, left: 0, width: '20%', height: '38%', clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)' }} />

          <div className="absolute top-0 left-0 p-6 sm:p-8" style={{ width: '38%' }}>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="EDHA" className="h-7 w-auto brightness-0 invert" />
            </div>
            <p className="text-[#d4a843] font-bold uppercase tracking-widest"
              style={{ fontSize: 'clamp(9px, 1.5vw, 14px)' }}>CERTIFICAT</p>
            <p className="text-white/70 uppercase tracking-wider"
              style={{ fontSize: 'clamp(7px, 1vw, 10px)' }}>DE COMPLÉTION</p>
          </div>

          <div className="absolute" style={{ top: '38%', left: '27%', transform: 'translate(-50%, -50%)' }}>
            <div className="rounded-full border-4 flex flex-col items-center justify-center text-center"
              style={{
                width: 'clamp(60px, 9vw, 90px)', height: 'clamp(60px, 9vw, 90px)',
                borderColor: '#d4a843',
                background: 'radial-gradient(circle at 35% 35%, #f5d080, #b8891e)',
                boxShadow: '0 4px 20px rgba(212,168,67,0.4)',
              }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="12" r="8" fill="#fff" opacity=".9"/>
                <polygon points="16,4 18.5,10 25,10 20,14 22,21 16,17 10,21 12,14 7,10 13.5,10" fill="#d4a843"/>
              </svg>
            </div>
            <div className="flex justify-center gap-1 -mt-1">
              <div style={{ width: 8, height: 16, background: '#0f1a2e', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              <div style={{ width: 8, height: 16, background: '#0f1a2e', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
            </div>
          </div>

          <div className="absolute flex flex-col justify-center"
            style={{ top: '6%', right: '5%', bottom: '18%', left: '44%' }}>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="inline-flex items-center gap-1.5 text-green-600 border border-green-200 bg-green-50 rounded-full font-medium"
                style={{ fontSize: 'clamp(7px, 1.1vw, 11px)', padding: '3px 10px' }}>
                <CheckCircle size={10} /> Certificat authentique et vérifié
              </span>
            </div>
            <p className="uppercase text-[#0f1a2e]/50 tracking-widest font-semibold mb-1"
              style={{ fontSize: 'clamp(6px, 0.9vw, 9px)' }}>DÉCERNÉ À</p>
            <h2 className="script-font text-[#0f1a2e] leading-none mb-3"
              style={{ fontSize: 'clamp(24px, 4.5vw, 52px)', fontStyle: 'italic', fontWeight: 600 }}>
              {studentName}
            </h2>
            <p className="text-[#0f1a2e]/60 mb-1" style={{ fontSize: 'clamp(7px, 1.1vw, 11px)' }}>
              pour avoir complété avec succès
            </p>
            <h3 className="font-bold text-[#0f1a2e] mb-1" style={{ fontSize: 'clamp(11px, 1.8vw, 18px)' }}>
              {courseTitle}
            </h3>
            <p className="text-[#0f1a2e]/50" style={{ fontSize: 'clamp(7px, 1vw, 10px)' }}>
              Enseigné par <span className="font-semibold text-[#0f1a2e]/70">{instructorName}</span>
            </p>
          </div>

          <div className="absolute flex items-end justify-between"
            style={{ bottom: '6%', left: '44%', right: '5%' }}>
            <div className="text-center" style={{ minWidth: '35%' }}>
              {instructorSig ? (
                <img src={instructorSig} alt="Signature" className="h-10 object-contain mx-auto mb-1" />
              ) : (
                <div style={{ height: 32, borderBottom: '1.5px solid #0f1a2e', width: '80%', margin: '0 auto 4px' }} />
              )}
              <p className="uppercase tracking-widest text-[#0f1a2e]/50 font-semibold"
                style={{ fontSize: 'clamp(6px, 0.8vw, 8px)' }}>{instructorName}</p>
              <p className="text-[#0f1a2e]/40" style={{ fontSize: 'clamp(5px, 0.7vw, 7px)' }}>Instructeur</p>
            </div>

            <div className="text-center flex-1 px-2">
              <p className="text-[#0f1a2e]/40" style={{ fontSize: 'clamp(6px, 0.8vw, 8px)' }}>{issuedDate}</p>
              <p className="font-mono text-[#0891b2]" style={{ fontSize: 'clamp(5px, 0.8vw, 8px)' }}>
                {certificateNumber}
              </p>
            </div>

            <div className="text-center" style={{ minWidth: '35%' }}>
              {adminSig ? (
                <img src={adminSig} alt="Signature EDHA" className="h-10 object-contain mx-auto mb-1" />
              ) : (
                <div style={{ height: 32, borderBottom: '1.5px solid #0f1a2e', width: '80%', margin: '0 auto 4px' }} />
              )}
              <p className="uppercase tracking-widest text-[#0f1a2e]/50 font-semibold"
                style={{ fontSize: 'clamp(6px, 0.8vw, 8px)' }}>{adminName}</p>
              <p className="text-[#0f1a2e]/40" style={{ fontSize: 'clamp(5px, 0.7vw, 7px)' }}>EDHA Academy</p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(to right, #d4a843, #0891b2, #d4a843)' }} />
        </div>

        {/* FIX: verify URL now uses the prop from DB — not recalculated on client */}
        <p className="no-print text-xs text-[#6b7280] mt-4 text-center">
          Ce certificat peut être vérifié à l&apos;adresse :{' '}
          <Link href={verifyUrl} className="text-blue-600 hover:underline font-mono">
            {verifyUrl}
          </Link>
        </p>
      </div>
    </>
  )
}
