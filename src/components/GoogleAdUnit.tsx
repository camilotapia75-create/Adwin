"use client";
import { useEffect } from "react";

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

export default function GoogleAdUnit() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-6">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2425690390095661"
        data-ad-slot="2203440783"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
