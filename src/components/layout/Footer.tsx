import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#EFE7DC] text-[#F0301A] pt-10 pb-16 font-display-grotesk">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 text-xs md:text-sm font-semibold uppercase tracking-wider">
          {/* Col 1: Brand & Rights */}
          <div className="space-y-2">
            <div className="text-base font-black tracking-tighter">++ HELLOHELLO</div>
            <p className="text-xs text-[#F0301A]/80 leading-relaxed font-normal normal-case">
              © 2026 ++HELLOHELLO STUDIO.<br />
              ALL RIGHTS RESERVED.
            </p>
          </div>

          {/* Col 2: Studio Address */}
          <div className="space-y-2">
            <div className="font-bold text-[#F0301A]/60">STUDIO</div>
            <p className="text-xs text-[#F0301A] leading-relaxed font-normal normal-case">
              RUA DE MONTEVIDEO 410<br />
              4150-516 PORTO, PORTUGAL
            </p>
          </div>

          {/* Col 3: Legal */}
          <div className="space-y-2">
            <div className="font-bold text-[#F0301A]/60">LEGAL</div>
            <ul className="space-y-1 text-xs">
              <li>
                <Link href="#" className="hover:opacity-75">PRIVACY POLICY</Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75">TERMS OF SPECIMEN</Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75">SHIPPING & RETURNS</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Social & Site Links */}
          <div className="space-y-2">
            <div className="font-bold text-[#F0301A]/60">CHANNELS</div>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:opacity-75">INSTAGRAM ↗</a>
              </li>
              <li>
                <a href="https://dribbble.com" target="_blank" rel="noreferrer" className="hover:opacity-75">DRIBBBLE ↗</a>
              </li>
              <li>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:opacity-75">TWITTER X ↗</a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:opacity-75">LINKEDIN ↗</a>
              </li>
            </ul>
          </div>

          {/* Col 5: CTA Link */}
          <div className="space-y-2 sm:col-span-2 md:col-span-1">
            <div className="font-bold text-[#F0301A]/60">INQUIRIES</div>
            <div>
              <a
                href="mailto:contact@hellohello.studio"
                className="text-base md:text-lg font-bold hover:opacity-75 inline-flex items-center gap-1"
              >
                LET'S TALK ↗
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Colophon line */}
        <div className="mt-12 pt-6 hairline-t text-center text-[11px] tracking-widest text-[#F0301A]/70 uppercase">
          ++HELLOHELLO ARCHIVE EDITION — MONTEVIDEO CATALOGUE
        </div>
      </div>
    </footer>
  );
}
