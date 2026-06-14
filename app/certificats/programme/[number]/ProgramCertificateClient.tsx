'use client'
import Link from 'next/link'
import { Download, CheckCircle, Share2 } from 'lucide-react'

interface Props {
  studentName:      string
  programTitle:     string
  certificateTitle: string
  institutionName:  string
  institutionLogo:  string | null
  institutionSig:   string | null
  adminSig:         string | null
  adminName:        string
  certificateNumber: string
  issuedDate:       string
  verifyUrl:        string
}

export default function ProgramCertificateClient({
  studentName, programTitle, certificateTitle, institutionName,
  institutionLogo, institutionSig, adminSig, adminName,
  certificateNumber, issuedDate, verifyUrl,
}: Props) {

  const handleDownload = () => window.print()

  const handleShare = () => {
    // FIX: use verifyUrl prop from DB instead of window.location.href (SSR unsafe)
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
          .cert-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 0; }
          .cert-card { box-shadow: none !important; border: none !important; }
        }

        .script-font { font-family: 'Cormorant Garamond', serif; }

        .gold-lines-tr {
          background: repeating-linear-gradient(
            -45deg, transparent, transparent 6px, #c9922a 6px, #c9922a 8px
          );
          opacity: 0.65;
        }
        .gold-lines-bl {
          background: repeating-linear-gradient(
            135deg, transparent, transparent 6px, #c9922a 6px, #c9922a 8px
          );
          opacity: 0.65;
        }
      `}</style>

      <div className="cert-wrapper min-h-screen bg-[#e8edf3] flex flex-col items-center justify-center px-4 py-10">

        {/* Actions */}
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

        {/* Certificate */}
        <div className="cert-card bg-white shadow-2xl relative overflow-hidden"
          style={{ width: '100%', maxWidth: '900px', aspectRatio: '1.414 / 1', minHeight: '300px' }}>

          {/* Dark top-left shape */}
          <div className="absolute top-0 left-0 bg-[#0f1a2e]"
            style={{ width: '44%', height: '58%', clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)' }} />

          {/* Gold accent stripe */}
          <div className="absolute bg-gradient-to-b from-[#d4a843] to-[#b8891e]"
            style={{ width: '3px', height: '58%', top: 0, left: '42%', transform: 'skewX(-18deg)', opacity: 0.8 }} />

          {/* Gold lines top-right */}
          <div className="gold-lines-tr absolute"
            style={{ top: 0, right: 0, width: '24%', height: '45%',
              clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)' }} />

          {/* Gold lines bottom-left */}
          <div className="gold-lines-bl absolute"
            style={{ bottom: 0, left: 0, width: '22%', height: '40%',
              clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)' }} />

          {/* Top-left: logos + title */}
          <div className="absolute top-0 left-0 p-5 sm:p-8 flex flex-col gap-3" style={{ width: '40%' }}>
            {/* Institution logo */}
            <div className="flex items-center gap-2">
              {institutionLogo ? (
                <img src={institutionLogo} alt={institutionName}
                  className="h-8 w-auto object-contain brightness-0 invert max-w-[80px]" />
              ) : (
                <span className="text-white font-bold text-xs tracking-wide uppercase truncate max-w-[120px]">
                  {institutionName}
                </span>
              )}
              <div className="w-px h-5 bg-white/30" />
              <img src="/logo.png" alt="EDHA" className="h-5 w-auto brightness-0 invert" />
            </div>

            <div>
              <p className="text-[#d4a843] font-bold uppercase tracking-widest"
                style={{ fontSize: 'clamp(9px, 1.4vw, 13px)' }}>
                CERTIFICAT
              </p>
              <p className="text-white/60 uppercase tracking-wider"
                style={{ fontSize: 'clamp(6px, 0.9vw, 9px)' }}>
                DE PROGRAMME
              </p>
            </div>
          </div>

          {/* Medal */}
          <div className="absolute"
            style={{ top: '40%', left: '28%', transform: 'translate(-50%, -50%)' }}>
            <div className="rounded-full border-4 flex flex-col items-center justify-center"
              style={{
                width: 'clamp(55px, 8.5vw, 85px)', height: 'clamp(55px, 8.5vw, 85px)',
                borderColor: '#d4a843',
                background: 'radial-gradient(circle at 35% 35%, #f5d080, #b8891e)',
                boxShadow: '0 4px 20px rgba(212,168,67,0.4)',
              }}>
              <span style={{ fontSize: 'clamp(14px, 2.2vw, 22px)' }}>🏆</span>
            </div>
            <div className="flex justify-center gap-1 -mt-1">
              <div style={{ width: 7, height: 14, background: '#0f1a2e', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              <div style={{ width: 7, height: 14, background: '#0f1a2e', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
            </div>
          </div>

          {/* Right: content */}
          <div className="absolute flex flex-col justify-center"
            style={{ top: '5%', right: '4%', bottom: '20%', left: '46%' }}>

            {/* Verified badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 text-green-600 border border-green-200 bg-green-50 rounded-full font-medium"
                style={{ fontSize: 'clamp(6px, 1vw, 10px)', padding: '3px 10px' }}>
                <CheckCircle size={9} /> Certificat authentique et vérifié
              </span>
            </div>

            {/* Certificate title */}
            <p className="uppercase text-[#0f1a2e]/50 tracking-widest font-semibold mb-1"
              style={{ fontSize: 'clamp(6px, 0.85vw, 8.5px)' }}>
              {certificateTitle}
            </p>

            <p className="uppercase text-[#0f1a2e]/40 tracking-wider mb-1"
              style={{ fontSize: 'clamp(5px, 0.75vw, 7.5px)' }}>
              DÉCERNÉ À
            </p>

            {/* Student name */}
            <h2 className="script-font text-[#0f1a2e] leading-none mb-3"
              style={{ fontSize: 'clamp(20px, 4vw, 48px)', fontStyle: 'italic', fontWeight: 600 }}>
              {studentName}
            </h2>

            <p className="text-[#0f1a2e]/55 mb-1" style={{ fontSize: 'clamp(6px, 1vw, 10px)' }}>
              pour avoir complété avec succès le programme
            </p>
            <h3 className="font-bold text-[#0f1a2e] mb-1"
              style={{ fontSize: 'clamp(10px, 1.6vw, 16px)' }}>
              {programTitle}
            </h3>
            <p className="text-[#0f1a2e]/40" style={{ fontSize: 'clamp(6px, 0.85vw, 8.5px)' }}>
              proposé par <span className="font-semibold text-[#0f1a2e]/60">{institutionName}</span>
            </p>
          </div>

          {/* Signatures row */}
          <div className="absolute flex items-end justify-between"
            style={{ bottom: '5%', left: '46%', right: '4%' }}>

            {/* Institution signature */}
            <div className="text-center" style={{ minWidth: '30%' }}>
              {institutionSig ? (
                <img src={institutionSig} alt="Signature"
                  className="h-9 object-contain mx-auto mb-1" />
              ) : (
                <div style={{ height: 28, borderBottom: '1.5px solid #0f1a2e', width: '80%', margin: '0 auto 4px' }} />
              )}
              <p className="uppercase tracking-widest text-[#0f1a2e]/45 font-semibold"
                style={{ fontSize: 'clamp(5px, 0.75vw, 7.5px)' }}>
                {institutionName}
              </p>
              <p className="text-[#0f1a2e]/35" style={{ fontSize: 'clamp(4px, 0.65vw, 6.5px)' }}>
                Institution partenaire
              </p>
            </div>

            {/* Date + cert number */}
            <div className="text-center flex-1 px-2">
              <p className="text-[#0f1a2e]/40" style={{ fontSize: 'clamp(5px, 0.75vw, 7.5px)' }}>
                {issuedDate}
              </p>
              <p className="font-mono text-[#0891b2]" style={{ fontSize: 'clamp(4px, 0.7vw, 7px)' }}>
                {certificateNumber}
              </p>
            </div>

            {/* EDHA signature */}
            <div className="text-center" style={{ minWidth: '30%' }}>
              {adminSig ? (
                <img src={adminSig} alt="Signature EDHA"
                  className="h-9 object-contain mx-auto mb-1" />
              ) : (
                <div style={{ height: 28, borderBottom: '1.5px solid #0f1a2e', width: '80%', margin: '0 auto 4px' }} />
              )}
              <p className="uppercase tracking-widest text-[#0f1a2e]/45 font-semibold"
                style={{ fontSize: 'clamp(5px, 0.75vw, 7.5px)' }}>
                {adminName}
              </p>
              <p className="text-[#0f1a2e]/35" style={{ fontSize: 'clamp(4px, 0.65vw, 6.5px)' }}>
                EDHA Academy
              </p>
            </div>
          </div>

          {/* Bottom gold line */}
          <div className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(to right, #d4a843, #0891b2, #d4a843)' }} />
        </div>

        {/* Verification note */}
        <p className="no-print text-xs text-[#6b7280] mt-4 text-center">
          Vérifiez ce certificat sur{' '}
          <Link href={verifyUrl} className="text-blue-600 hover:underline font-mono">
            {verifyUrl}
          </Link>
        </p>
      </div>
    </>
  )
}