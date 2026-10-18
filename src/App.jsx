
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Menu, X, MapPin, Clock3
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./App.css";

gsap.registerPlugin(ScrollTrigger);

const coffeePhoto =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=2000&q=90";

const cafePhoto =
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1400&q=85";

const beanPhoto =
  "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1400&q=85";

const products = [
  {
    number: "01",
    name: "Velvet Cappuccino",
    type: "THE SIGNATURE",
    price: "₹220",
    description: "Double espresso. Silky steamed milk.",
    image:
      "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=900&q=85",
  },
  {
    number: "02",
    name: "Midnight Mocha",
    type: "THE INDULGENCE",
    price: "₹260",
    description: "Dark chocolate. Rich espresso.",
    image:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=85",
  },
  {
    number: "03",
    name: "Golden Cold Brew",
    type: "SLOW CRAFTED",
    price: "₹240",
    description: "Slow-steeped. Smooth. Unforgettable.",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=85",
  },
];

function FloatingBean({ className, delay = "0s" }) {
  return (
    <span
      className={`floating-bean ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    />
  );
}

function App() {
  const root = useRef(null);
  const heroRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", {
        y: 28,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".hero-visual", {
        opacity: 0,
        scale: 1.08,
        duration: 1.5,
        ease: "power2.out",
      });

      gsap.utils.toArray(".reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 86%",
              once: true,
            },
          }
        );
      });

      gsap.to(".orbit-ring", {
        rotation: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  function handlePointerMove(event) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = heroRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    });
  }

  function resetPointer() {
    setPointer({ x: 0, y: 0 });
  }

  return (
    <main ref={root}>
      <div className="film-grain" aria-hidden="true" />

      <header className="navbar">
        <a className="brand" href="#home" aria-label="NOIR home">
          <span className="brand-mark">N.</span>
          <span className="brand-name">
            NOIR
            <small>THE ART OF COFFEE</small>
          </span>
        </a>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#story" onClick={() => setMenuOpen(false)}>Our story</a>
          <a href="#menu" onClick={() => setMenuOpen(false)}>Menu</a>
          <a href="#experience" onClick={() => setMenuOpen(false)}>Experience</a>
          <a href="#visit" onClick={() => setMenuOpen(false)}>Visit</a>
        </nav>

        <a className="nav-cta" href="#visit">
          Book a table <ArrowUpRight size={15} />
        </a>

        <button
          className="mobile-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <section
        className="hero"
        id="home"
        ref={heroRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={resetPointer}
      >
        <div className="hero-background" />
        <div className="hero-vignette" />
        <div className="hero-light-beam" />

        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            PREMIUM COFFEE <i>·</i> CRAFTED WITH SOUL
          </p>

          <h1>
            More than
            <br />
            just a <em>coffee.</em>
          </h1>

          <p className="hero-description">
            A slower morning. A deeper conversation.
            <br />
            A little moment that belongs entirely to you.
          </p>

          <div className="hero-actions">
            <a className="button button-gold" href="#menu">
              Explore our menu <ArrowRight size={16} />
            </a>
            <span className="hero-note">
              SMALL BATCH <b>·</b> SLOW CRAFT <b>·</b> BIG FEELING
            </span>
          </div>
        </div>

        <div
          className="hero-visual"
          style={{
            "--mouse-x": `${pointer.x * 10}px`,
            "--mouse-y": `${pointer.y * 7}px`,
          }}
        >
          <div className="visual-glow" />
          <div className="orbit-ring"><span /></div>

          <div className="coffee-photo-wrap">
            <img
              className="coffee-photo"
              src={coffeePhoto}
              alt="A beautifully prepared cup of coffee"
              fetchPriority="high"
            />
            <div className="photo-shine" />
            <div className="photo-bottom-shade" />
          </div>

          <div className="steam steam-one"><i /></div>
          <div className="steam steam-two"><i /></div>
          <div className="steam steam-three"><i /></div>

          <FloatingBean className="bean-one" delay="-1s" />
          <FloatingBean className="bean-two" delay="-3s" />
          <FloatingBean className="bean-three" delay="-2s" />
          <FloatingBean className="bean-four" delay="-4s" />
          <FloatingBean className="bean-five" delay="-1.5s" />

          <div className="scene-label">
            <span>01 / 03</span>
            <small>THE SIGNATURE POUR</small>
          </div>

          <div className="hero-caption">
            <span>N.</span>
            <small>MADE FOR THE MOMENT</small>
          </div>
        </div>

        <a className="scroll-cue" href="#story">
          <span>SCROLL TO DISCOVER</span>
          <ArrowDown size={17} />
        </a>

        <div className="hero-index">01 <span>—</span> 05</div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>
              GOOD TASTE IS A RITUAL <b>✳</b> ROASTED WITH INTENTION <b>✳</b> TAKE YOUR TIME <b>✳</b> ONE MORE CUP, ALWAYS <b>✳</b>
            </span>
          ))}
        </div>
      </div>

      <section className="story section" id="story">
        <div className="story-image reveal">
          <img src={beanPhoto} alt="Coffee beans in warm light" loading="lazy" />
          <span className="image-index">FIG. 01 — THE RITUAL</span>
          <div className="story-stamp">SLOW<br />DOWN<span>✳</span></div>
        </div>

        <div className="story-content reveal">
          <p className="eyebrow">OUR PHILOSOPHY <span>— 001</span></p>
          <h2>A place for<br /><em>curious minds.</em></h2>
          <p className="body-copy">
            We believe the best things in life are never rushed. From carefully
            sourced beans to the final pour, every detail is a small act of devotion.
          </p>
          <p className="body-copy muted">
            Come for the coffee. Stay for the conversations, the quiet corners,
            and the moments you didn't know you needed.
          </p>
          <a className="text-link" href="#experience">
            Discover our world <ArrowUpRight size={17} />
          </a>
          <div className="story-number">01<span>/</span>05</div>
        </div>

        <div className="story-values">
          <div>
            <span className="value-icon">✳</span>
            <h3>Thoughtful sourcing</h3>
            <p>Beans with a story, from people who care.</p>
          </div>
          <div>
            <span className="value-icon">◈</span>
            <h3>Made with intention</h3>
            <p>Precision in every pull, patience in every pour.</p>
          </div>
          <div>
            <span className="value-icon">✧</span>
            <h3>Room to breathe</h3>
            <p>A little escape from the noise outside.</p>
          </div>
        </div>
      </section>

      <section className="menu-section section" id="menu">
        <div className="section-heading reveal">
          <div>
            <p className="eyebrow">THE SIGNATURE MENU <span>— 002</span></p>
            <h2>Crafted for<br /><em>your moments.</em></h2>
          </div>
          <p className="heading-side">
            Not just another cup.
            <br />
            Your new favourite ritual.
          </p>
        </div>

        <div className="menu-layout">
          <div className="product-list">
            {products.map((product, index) => (
              <button
                className={`product-row ${activeProduct === index ? "selected" : ""}`}
                key={product.name}
                onMouseEnter={() => setActiveProduct(index)}
                onFocus={() => setActiveProduct(index)}
                onClick={() => setActiveProduct(index)}
              >
                <span className="product-number">{product.number}</span>
                <span className="product-info">
                  <small>{product.type}</small>
                  <strong>{product.name}</strong>
                  <span>{product.description}</span>
                </span>
                <span className="product-price">{product.price}</span>
                <ArrowUpRight className="product-arrow" size={18} />
              </button>
            ))}

            <a className="button button-outline menu-more" href="#visit">
              Explore the full menu <ArrowRight size={16} />
            </a>
          </div>

          <div className="product-showcase">
            <img
              key={products[activeProduct].image}
              src={products[activeProduct].image}
              alt={products[activeProduct].name}
              loading="lazy"
            />
            <div className="showcase-overlay" />
            <div className="showcase-number">{products[activeProduct].number} <span>/ 03</span></div>
            <div className="showcase-bottom">
              <span>NOIR SIGNATURES</span>
              <strong>{products[activeProduct].name}</strong>
              <span>{products[activeProduct].price} <ArrowUpRight size={16} /></span>
            </div>
          </div>
        </div>

        <p className="menu-footnote">
          A FEW OF OUR FAVOURITE THINGS. MADE FRESH, EVERY DAY.
        </p>
      </section>

      <section className="experience section" id="experience">
        <div className="experience-photo reveal">
          <img src={cafePhoto} alt="Warm coffee shop atmosphere" loading="lazy" />
          <span>FIG. 02 — YOUR CORNER OF THE WORLD</span>
        </div>

        <div className="experience-copy reveal">
          <p className="eyebrow">THE EXPERIENCE <span>— 003</span></p>
          <h2>More than a cup.<br /><em>A feeling.</em></h2>
          <p className="body-copy">
            Golden light through the window. Your favourite song in the
            background. Nothing on the agenda but being here.
          </p>
          <a className="button button-gold" href="#visit">
            Make it your moment <ArrowRight size={16} />
          </a>
        </div>

        <div className="experience-quote reveal">
          <span>“</span>
          <p>There is a kind of magic<br />in doing nothing, beautifully.</p>
          <small>THE NOIR PHILOSOPHY</small>
        </div>
      </section>

      <section className="visit section" id="visit">
        <div className="visit-copy reveal">
          <p className="eyebrow">YOUR TABLE IS WAITING <span>— 004</span></p>
          <h2>Let's make<br /><em>some moments.</em></h2>
          <p className="body-copy">
            Your favourite seat. Your usual order. Or something new.
            There's always room for you at NOIR.
          </p>

          <div className="visit-details">
            <div>
              <MapPin size={18} />
              <span><small>FIND US</small>Hyderabad, Telangana, India</span>
            </div>
            <div>
              <Clock3 size={18} />
              <span><small>WHENEVER YOU NEED US</small>8:00 AM — 11:00 PM</span>
            </div>
          </div>

          <a className="button button-gold" href="mailto:hello@noir.example?subject=NOIR%20Cafe%20Enquiry">
            Plan your visit <ArrowRight size={16} />
          </a>
        </div>

        <div className="visit-image reveal">
          <img src={cafePhoto} alt="An inviting café interior" loading="lazy" />
          <span className="visit-image-label">NOIR <i>·</i> COME AS YOU ARE</span>
        </div>
      </section>

      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-mark">N.</span>
          <span className="brand-name">NOIR<small>THE ART OF COFFEE</small></span>
        </a>
        <p>Made for the moments that matter.</p>
        <a href="#home" className="back-top">BACK TO TOP ↑</a>
        <a className="social-link" href="https://instagram.com/" target="_blank" rel="noreferrer">
          Instagram ↗
        </a>
        <small className="copyright">© 2026 NOIR. CONCEPT WEBSITE.</small>
      </footer>
    </main>
  );
}

export default App;
