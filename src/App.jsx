import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stage } from "./scene/stage";
import "./App.css";

gsap.registerPlugin(ScrollTrigger);

const CoffeeScene = lazy(() => import("./scene/CoffeeScene.jsx"));

const roomPhoto = "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=2000&q=80";
const visitPhoto = "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=1400&q=80";

const steps = [
  { name: "Grind", detail: "18 g of Chikmagalur single origin, ground to order." },
  { name: "Pull", detail: "A 28-second shot at 93 °C, thick with crema." },
  { name: "Steam", detail: "Whole milk, stretched to 60 °C until it shines." },
  { name: "Pour", detail: "One steady pour, then a cut through the middle." },
];

const drinks = [
  { name: "Velvet Cappuccino", note: "Double ristretto under silky whole milk, poured to a heart.", specs: ["180 ml", "2 shots", "60 °C"], price: "₹220" },
  { name: "Rose Cardamom Latte", note: "Espresso with rose and green cardamom, finished with dried petals.", specs: ["240 ml", "2 shots", "rose & cardamom"], price: "₹260" },
  { name: "Golden Cold Brew", note: "Steeped for 18 hours, served over clear ice.", specs: ["300 ml", "18 h steep", "over ice"], price: "₹240" },
];

const navLinks = [["#story", "The pour"], ["#menu", "Menu"], ["#room", "The room"], ["#visit", "Visit"]];

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function App() {
  const heroStage = useRef(null);
  const storyStage = useRef(null);
  const menuStage = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drink, setDrink] = useState(0);
  const [step, setStep] = useState(-1);
  const [sceneActive, setSceneActive] = useState(true);
  const progressRef = useRef(null);

  useEffect(() => { stage.drink = drink; }, [drink]);

  // scroll drives the 3D stage: hero -> the pour -> menu
  useEffect(() => {
    stage.anchors = { hero: heroStage.current, story: storyStage.current, menu: menuStage.current };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    stage.reducedMotion = reduce.matches;
    const story = document.getElementById("story");
    const menu = document.getElementById("menu");
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const storyTop = story.getBoundingClientRect().top + y;
      const storyEnd = storyTop + story.offsetHeight - vh;
      const menuTop = menu.getBoundingClientRect().top + y;
      const menuBottom = menuTop + menu.offsetHeight;

      const intoStory = clamp01(y / Math.max(storyTop, 1));
      const intoMenu = clamp01((y - storyEnd) / Math.max(menuTop - storyEnd, 1));
      stage.s = intoStory + intoMenu;
      stage.pour = clamp01((y - storyTop) / Math.max(storyEnd - storyTop, 1));

      if (progressRef.current) progressRef.current.style.transform = `scaleX(${stage.pour})`;
      setStep(stage.pour <= 0 ? -1 : Math.min(3, Math.floor(stage.pour * 4)));
      setSceneActive(y < menuBottom);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onMotion = () => { stage.reducedMotion = reduce.matches; };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduce.addEventListener("change", onMotion);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduce.removeEventListener("change", onMotion);
    };
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (stage.reducedMotion) return;
      stage.pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      stage.pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".hero h1 .line > span", { yPercent: 110, duration: 1.2, stagger: 0.12, ease: "power4.out", delay: 0.2 });
      gsap.from(".hero .fade-in", { opacity: 0, y: 16, duration: 1, stagger: 0.1, ease: "power2.out", delay: 0.7 });
      gsap.from(".scene-layer", { opacity: 0, duration: 2.2, ease: "power1.out", delay: 0.1 });
      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.from(el, { opacity: 0, y: 36, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } });
      });
    });
    return () => mm.revert();
  }, []);


  return (
    <div className="page">
      <a className="skip-link" href="#menu">Skip to the menu</a>
      <div className="scene-layer" aria-hidden="true">
        <SceneBoundary>
          <Suspense fallback={null}>
            <CoffeeScene active={sceneActive} />
          </Suspense>
        </SceneBoundary>
      </div>
      <div className="grain" aria-hidden="true" />

      <header className="nav">
        <a className="wordmark" href="#home" aria-label="NOIR, back to top">NOIR</a>
        <nav id="site-nav" className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Main">
          {navLinks.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <a className="nav-book" href="#visit">Book a table</a>
        <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="site-nav">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="kicker fade-in">Café · Hyderabad · 8 am – 11 pm</p>
            <h1>
              <span className="line"><span>Two cups.</span></span>
              <span className="line"><span>One table.</span></span>
              <span className="line"><span><em>No hurry.</em></span></span>
            </h1>
            <p className="lede fade-in">A small café for first dates, old friends, and long afternoons that turn into evenings. Candles go on every table at sunset.</p>
            <div className="hero-actions fade-in">
              <a className="btn btn-solid" href="#menu">See the menu <ArrowRight size={16} /></a>
              <a className="btn btn-line" href="#visit">Book a table for two</a>
            </div>
          </div>
          <div className="stage-anchor hero-stage" ref={heroStage} />
          <a className="scroll-hint fade-in" href="#story"><ArrowDown size={15} /> Scroll to watch the pour</a>
        </section>

        <section className="story" id="story" aria-labelledby="story-title">
          <div className="story-pin">
            <div className="story-copy">
              <p className="kicker">The pour</p>
              <h2 id="story-title">Every heart is poured by hand.</h2>
              <ol className="steps">
                {steps.map((s, i) => (
                  <li key={s.name} className={i === step ? "is-now" : i < step ? "is-done" : ""}>
                    <span className="step-num">{i + 1}</span>
                    <span className="step-name">{s.name}</span>
                    <span className="step-detail">{s.detail}</span>
                  </li>
                ))}
              </ol>
              <div className="pour-meter" aria-hidden="true"><span ref={progressRef} /></div>
            </div>
            <div className="stage-anchor story-stage" ref={storyStage} />
          </div>
        </section>

        <section className="menu" id="menu" aria-labelledby="menu-title">
          <div className="menu-head">
            <p className="kicker">The menu</p>
            <h2 id="menu-title">Made for sharing.</h2>
            <p className="menu-aside">Ask at the counter for this week's single origin.</p>
          </div>
          <div className="menu-body">
            <div className="stage-anchor menu-stage" ref={menuStage} />
            <ul className="drinks">
              {drinks.map((d, i) => (
                <li key={d.name}>
                  <button className={i === drink ? "drink is-on" : "drink"} aria-pressed={i === drink} onClick={() => setDrink(i)} onMouseEnter={() => setDrink(i)} onFocus={() => setDrink(i)}>
                    <span className="drink-name">{d.name}</span>
                    <span className="drink-price mono">{d.price}</span>
                    <span className="drink-note">{d.note}</span>
                    <span className="drink-specs mono">{d.specs.join("  ·  ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="room" id="room" aria-labelledby="room-title">
          <figure className="room-photo">
            <img src={roomPhoto} alt="A small table for two by a sunny window, set with a coffee press and a potted rose" loading="lazy" />
            <div className="lace" />
          </figure>
          <div className="room-copy reveal">
            <p className="kicker">The room</p>
            <h2 id="room-title">Small tables, soft light, and a window seat for two.</h2>
            <p>Twenty-two seats, fresh flowers every Friday, and a corner by the window where the afternoon sun comes through lace curtains. Stay as long as the conversation does.</p>
          </div>
        </section>

        <section className="visit" id="visit" aria-labelledby="visit-title">
          <div className="visit-copy reveal">
            <p className="kicker">Visit</p>
            <h2 id="visit-title">Your table for two is waiting.</h2>
            <dl className="facts">
              <div><dt>Open</dt><dd className="mono">Every day, 08:00 – 23:00</dd></div>
              <div><dt>Find us</dt><dd>Hyderabad, Telangana</dd></div>
              <div><dt>Tables</dt><dd>Walk in, or book ahead for birthdays, anniversaries, and proposals.</dd></div>
            </dl>
            <a className="btn btn-solid" href="mailto:hello@noir.example?subject=Table%20at%20NOIR">Book a table <ArrowUpRight size={16} /></a>
          </div>
          <figure className="visit-photo reveal">
            <img src={visitPhoto} alt="A glass of coffee in soft window light" loading="lazy" />
          </figure>
        </section>
      </main>

      <footer className="footer">
        <span className="wordmark">NOIR</span>
        <p>A café for two in Hyderabad. Open every day until 11 pm.</p>
        <a href="https://instagram.com/" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14} /></a>
        <small className="mono">© 2026 NOIR · Concept website</small>
      </footer>
    </div>
  );
}

export default App;
