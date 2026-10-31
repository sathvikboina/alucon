import HeroSection from '../components/showcase/HeroSection';
import TabsWrapper from '../components/showcase/TabsWrapper';
import TimelineSection from '../components/showcase/TimelineSection';
import MediaGallery from '../components/showcase/MediaGallery';
import '../components/showcase/showcase.css';

export default function InstitutionalShowcase() {
  return (
    <main>
      <HeroSection />
      <TabsWrapper />
      <TimelineSection />
      <MediaGallery />

      {/* CTA — 3-step funnel: Apply → Explore → Sign Up */}
      <section className="sc-cta">
        <p className="sc-cta-eyebrow">Ready to be part of something greater?</p>
        <h2>Be Part of Our Legacy</h2>
        <p className="sc-cta-sub">
          Join thousands of innovators who shaped the future at IIIT Allahabad.
        </p>

        <div className="sc-cta-actions">
          {/* <a href="/apply"  className="sc-cta-btn sc-cta-btn--primary">
            Apply Now
          </a> */}
          <a href="/register" className="sc-cta-btn sc-cta-btn--secondary">
            Explore
          </a>
          {/* <a href="/signup" className="sc-cta-btn sc-cta-btn--ghost">
            Create Account
          </a> */}
        </div>

        <div className="sc-cta-steps">
          {/* <div className="sc-cta-step">
            <span className="sc-cta-step-num">01</span>
            <span>Apply</span>
          </div> */}
          {/* <div className="sc-cta-step-sep" />
          <div className="sc-cta-step">
            <span className="sc-cta-step-num">02</span>
            <span>Explore</span>
          </div> */}
          {/* <div className="sc-cta-step-sep" />
          <div className="sc-cta-step">
            <span className="sc-cta-step-num">03</span>
            <span>Sign Up</span>
          </div> */}
        </div>
      </section>
    </main>
  );
}