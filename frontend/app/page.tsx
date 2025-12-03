'use client';

import Link from "next/link";


export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border mb-6">
            <span className="text-xs text-muted-foreground font-medium">
              Powered by Hedera Network
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Turn <span style={{color: 'var(--brick)'}}>Your Property</span> Into Instant Liquidity
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Nigeria's first real estate DeFi protocol. Tokenize your property,
            borrow heNGN stablecoins instantly, and keep ownership of your home.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/tokenize"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors text-center"
            >
              Get Started
            </Link>
            <Link
              href="/properties"
              className="px-8 py-3 bg-card border border-border text-foreground rounded-lg font-semibold hover:bg-muted transition-colors text-center"
            >
              Explore Platform
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Instant Settlement</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Secure on Hedera</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Carbon Negative</span>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three simple steps to unlock your property's value</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Tokenize Property</h3>
              <p className="text-sm text-muted-foreground">
                Submit your property details. Get it verified and receive RWA tokens.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Borrow heNGN</h3>
              <p className="text-sm text-muted-foreground">
                Lock tokens as collateral. Borrow up to 66% of your property value.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Repay & Unlock</h3>
              <p className="text-sm text-muted-foreground">
                Pay back your loan anytime. Unlock collateral. Keep your property.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}