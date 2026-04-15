export function LandingFooter() {
  return (
    <footer className="py-12 border-t border-surface-border">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg">Vendor<span className="text-brand">IQ</span></span>
          <span className="text-text-muted text-sm">— AI-Powered Vendor Due Diligence</span>
        </div>
        <p className="text-text-muted text-sm text-center">
          © {new Date().getFullYear()} VendorIQ. Built for India 🇮🇳 · reports@vendoriq.in
        </p>
      </div>
    </footer>
  );
}
