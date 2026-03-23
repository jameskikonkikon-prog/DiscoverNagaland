import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About Us | Yana Nagaland' };

export default function AboutPage() {
  return (
    <main style={{
      background: '#0f0f0f',
      minHeight: '100vh',
      color: '#f0f0f0',
      fontFamily: "'Sora', sans-serif",
      padding: '64px 24px 96px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 40, color: '#ffffff' }}>
          About Yana Nagaland
        </h1>

        <Section title="Our Mission">
          <p>We&apos;re building the go-to platform for discovering local businesses and properties across Nagaland. Whether you&apos;re looking for a restaurant in Kohima, a rental in Dimapur, or land in Mokokchung — Yana Nagaland brings it all to one place.</p>
        </Section>

        <Section title="Why We Built This">
          <p>Nagaland has incredible businesses, food joints, services, and properties — but finding them online has always been hard. There&apos;s no local platform that truly understands our state. Google Maps barely covers our towns. JustDial doesn&apos;t reach our villages. We wanted to change that.</p>
          <p style={{ marginTop: 12 }}>Yana Nagaland was built by Nagas, for Nagas. We know the towns, the culture, and the challenges local business owners face. This platform is our way of supporting our own people and helping local businesses get the visibility they deserve.</p>
        </Section>

        <Section title="What We Offer">
          <ul style={{ paddingLeft: 20, lineHeight: 1.9, color: 'rgba(255,255,255,0.72)' }}>
            <li>A free business directory covering all 17 districts</li>
            <li>Real estate listings — buy, sell, and rent properties</li>
            <li>Verified business profiles with photos, reviews, and contact info</li>
            <li>AI-powered tools to help business owners grow</li>
            <li>A platform proudly built and maintained in Nagaland</li>
          </ul>
        </Section>

        <Section title="Coming Soon">
          <ul style={{ paddingLeft: 20, lineHeight: 1.9, color: 'rgba(255,255,255,0.72)' }}>
            <li>Job listings — find and post jobs across Nagaland</li>
            <li>Local maps — discover businesses and places near you</li>
          </ul>
        </Section>

        <Section title="Our Vision">
          <p>&ldquo;To become the first platform people open when they want to find anything local in Nagaland.&rdquo;</p>
        </Section>

        <Section title="Contact">
          <p>Email: <a href="mailto:support@yananagaland.com" style={{ color: '#a78bfa', textDecoration: 'none' }}>support@yananagaland.com</a></p>
        </Section>

        <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>
          Built by Nagas, for Nagaland.
        </div>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 12, letterSpacing: '0.01em' }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  );
}
