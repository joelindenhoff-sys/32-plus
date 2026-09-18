const islands = [
  { name: "Gran Canaria", className: "island-canaria", note: "Atlantic coast · year-round living" },
  { name: "Tenerife", className: "island-tenerife", note: "Volcanic landscapes · coastal life" },
  { name: "Lanzarote", className: "island-lanzarote", note: "Design · space · slower living" },
  { name: "Fuerteventura", className: "island-fuerteventura", note: "Long beaches · open horizons" },
];

const homes = [
  { title: "Light-filled apartment near the coast", location: "Maspalomas · Gran Canaria", price: "€1,850", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=90" },
  { title: "Modern island home with terrace", location: "Las Palmas · Gran Canaria", price: "€1,650", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=90" },
  { title: "Ocean-view seasonal apartment", location: "Costa Adeje · Tenerife", price: "€2,200", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=90" },
];

export default function Home() {
  return (
    <main>
      <header className="nav">
        <a href="#top" className="logo-link" aria-label="32+ home"><img src="/logo.png" alt="32+" /></a>
        <div className="nav-title">SEASONAL RENTALS</div>
        <nav><a href="#owners">For owners</a><a href="#how">How it works</a><a className="nav-button" href="#signin">Sign in</a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">CANARY ISLANDS · SEASONAL RENTALS</p>
          <h1>Find a home<br /><i>for a while.</i></h1>
          <p className="hero-text">Furnished homes for genuine temporary stays — with the freedom of a home and none of the commitment of a permanent move.</p>
          <div className="search-box" aria-label="Search seasonal homes">
            <div className="search-field"><label>WHERE</label><strong>Canary Islands</strong></div>
            <div className="search-field"><label>MOVE-IN</label><span>Select date</span></div>
            <div className="search-field"><label>MOVE-OUT</label><span>Select date</span></div>
            <button>Search homes <span>→</span></button>
          </div>
          <p className="search-note">Seasonal stays · furnished homes · flexible destinations</p>
        </div>
        <div className="hero-image">
          <div className="hero-caption"><span>01 / CANARY ISLANDS</span><strong>Live closer<br />to the Atlantic.</strong></div>
        </div>
      </section>

      <section className="intro section">
        <div className="intro-mark">32<span>+</span></div>
        <div><p className="eyebrow">A DIFFERENT KIND OF STAY</p><h2>Not a holiday.<br />Not forever.</h2><p>32+ is for the space in between — when life, work, study or personal circumstances call for a furnished home for a limited time.</p></div>
      </section>

      <section className="section destinations">
        <div className="section-head"><div><p className="eyebrow">EXPLORE THE ISLANDS</p><h2>Choose where<br />you want to live.</h2></div><p>Start in the Canary Islands. The 32+ platform is designed to grow with you into new destinations.</p></div>
        <div className="islands">{islands.map((island) => <a className={`island ${island.className}`} href="#homes" key={island.name}><div><strong>{island.name}</strong><span>{island.note}</span></div></a>)}</div>
      </section>

      <section className="section homes-section" id="homes">
        <div className="section-head"><div><p className="eyebrow">FEATURED HOMES</p><h2>Places to live,<br />not just visit.</h2></div><a className="text-link" href="#">View all homes <span>→</span></a></div>
        <div className="homes">{homes.map((home) => <article className="home-card" key={home.title}><div className="home-photo" style={{backgroundImage:`url(${home.image})`}}><span>Seasonal rental</span></div><div className="home-info"><p>{home.location}</p><h3>{home.title}</h3><strong>{home.price}<small> / month</small></strong></div></article>)}</div>
      </section>

      <section className="owners" id="owners">
        <div className="owner-copy"><p className="eyebrow">FOR OWNERS</p><h2>Your property.<br /><i>The right tenant.</i></h2><p>Reach people looking for a furnished home for a genuine temporary stay. You stay in control of your property and terms.</p></div>
        <a className="owner-button" href="#">List your property <span>→</span></a>
      </section>

      <section className="section how" id="how">
        <div className="section-head"><div><p className="eyebrow">HOW 32+ WORKS</p><h2>Simple from search<br />to move-in.</h2></div><p>A clear process built around seasonal renting — not hotel bookings.</p></div>
        <div className="steps">
          <div><span>01</span><h3>Find your home</h3><p>Search furnished properties by destination, dates and what matters to you.</p></div>
          <div><span>02</span><h3>Tell us about your stay</h3><p>Provide the information needed to arrange a genuine temporary rental.</p></div>
          <div><span>03</span><h3>Sign & move in</h3><p>Review the seasonal agreement, complete the booking and settle into your home.</p></div>
        </div>
      </section>

      <section className="closing"><p className="eyebrow">32+ SEASONAL RENTALS</p><h2>More than a stay.</h2><a href="#homes">Find your home <span>→</span></a></section>

      <footer><a href="#top" className="footer-logo"><img src="/logo.png" alt="32+" /></a><span>SEASONAL RENTALS</span><span>Canary Islands · 2026</span><div className="footer-right"><a href="#owners">Owners</a><a href="#">Terms</a><a href="#">Privacy</a></div></footer>
    </main>
  );
}
