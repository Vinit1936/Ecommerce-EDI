import React from 'react';

export function Colophon() {
  return (
    <section className="bg-[#EFE7DC] text-[#F0301A] hairline-t hairline-b py-12 md:py-16 my-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Sentence case bold statement */}
        <h2 className="font-display-grotesk font-bold text-2xl sm:text-3xl md:text-4xl leading-tight max-w-2xl tracking-tight">
          Made to be worn. Or judged. Or both.
        </h2>

        {/* Circular copyright mark */}
        <div className="flex items-center gap-2 self-start md:self-auto select-none">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-[#F0301A] flex items-center justify-center font-display-grotesk font-black text-lg md:text-xl">
            ©26
          </div>
        </div>
      </div>
    </section>
  );
}
