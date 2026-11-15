"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Armchair, ArrowDownUp, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Dumbbell, Flame, Flower2, Grid2X2, Headphones, Heart, Leaf, Menu, Package, Plus, Search, ShieldCheck, Shirt, ShoppingBag, SlidersHorizontal, Sparkles, Star, Store, UserRound, UsersRound, X, Zap } from "lucide-react";
import { AuthDialog } from "@/components/auth-dialog";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { SellDialog } from "@/components/sell-dialog";
import { CartDialog, OrdersDialog, ProductDialog } from "@/components/commerce-dialogs";
import { ProfileDialog } from "@/components/profile-dialog";
import { Brand, Dialog, EmptyState, requestJson } from "@/components/ui";
import { CATEGORIES, money, type CartItem, type Order, type Product, type StoreData, type User } from "@/lib/types";

type Modal = "auth" | "onboarding" | "sell" | "profile" | "cart" | "orders" | "notifications" | "help" | "about" | null;
const categoryIcons = [Headphones, Shirt, Armchair, Flower2, Dumbbell];
const navItems = [{ label: "For you", Icon: Compass }, { label: "All products", Icon: Grid2X2 }, { label: "Trending", Icon: Flame }, { label: "New arrivals", Icon: Zap }];
const seedOrder = ["sv-headphones", "sv-sneakers", "sv-plant", "sv-watch", "sv-tote", "sv-lamp", "sv-speaker", "sv-beauty"];
const heroSlides = [
  { eyebrow: "THE EVERYDAY EDIT", title: <>Little upgrades.<br />Big possibilities.</>, text: "For your space, your style, and everything in between.", button: "Explore the collection", category: "All finds" },
  { eyebrow: "TUNE INTO SOMETHING GOOD", title: <>Your world.<br />A little more connected.</>, text: "Meet the tech that fits right into your everyday.", button: "Find your next upgrade", category: "Electronics" },
  { eyebrow: "MAKE ROOM FOR THE GOOD STUFF", title: <>Small details.<br />A whole lot of home.</>, text: "Thoughtful little things for your favourite place to be.", button: "Find your home favourites", category: "Home & living" },
];

export default function Shopverse({ initialData }: { initialData: StoreData }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState("For you");
  const [category, setCategory] = useState("All finds");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [maxPrice, setMaxPrice] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(initialData.user && !initialData.user.onboarded ? "onboarding" : null);
  const [product, setProduct] = useState<Product | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [notificationRead, setNotificationRead] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const pendingModal = useRef<Modal>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const user = data.user;
  const savedCount = data.saved.length;
  const cartCount = data.cart.reduce((sum, item) => sum + item.quantity, 0);
  const listings = data.products.filter((item) => item.sellerId === user?.id);
  const isDiscovery = ["For you", "All products"].includes(view) && category === "All finds" && !query;
  const slide = heroSlides[heroIndex];

  useEffect(() => {
    if (!initialData.user) {
      try {
        const stored = JSON.parse(localStorage.getItem("shopverse-guest") || "{}");
        const validIds = new Set(initialData.products.map((item) => item.id));
        const saved = Array.isArray(stored.saved) ? [...new Set<string>(stored.saved.filter((id: unknown) => typeof id === "string" && validIds.has(id)))].slice(0, 100) : [];
        const cart: CartItem[] = Array.isArray(stored.cart) ? stored.cart.filter((item: CartItem) => item && validIds.has(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10).slice(0, 100) : [];
        setData((current) => ({ ...current, saved, cart }));
      } catch { /* A blocked or empty local store should never block browsing. */ }
    }
    setHydrated(true);
  }, [initialData]);
  useEffect(() => { if (hydrated && !data.user) { try { localStorage.setItem("shopverse-guest", JSON.stringify({ saved: data.saved, cart: data.cart })); } catch { /* Browsing still works without local storage. */ } } }, [data.user, data.saved, data.cart, hydrated]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 4200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === "k") { event.preventDefault(); searchRef.current?.focus(); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); }, []);

  function notify(message: string, error = false) { setToast({ message, error }); }
  function changeView(next: string) { setView(next); setCategory("All finds"); setQuery(""); setMaxPrice(0); setInStock(false); setMobileOpen(false); setFilterOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function chooseCategory(next: string) { setCategory(next); setView(next === "All finds" ? "For you" : "All products"); setQuery(""); setMobileOpen(false); setMaxPrice(0); }
  function login(next: Modal = null) { pendingModal.current = next; setModal("auth"); setProduct(null); setMobileOpen(false); }
  function personalize() { if (!user) login("onboarding"); else setModal("onboarding"); }
  function startSelling() { if (!user) login("sell"); else if (!user.onboarded) { pendingModal.current = "sell"; setModal("onboarding"); } else setModal("sell"); setMobileOpen(false); }
  function showOrders() { if (!user) login("orders"); else setModal("orders"); setMobileOpen(false); }
  async function verified(nextUser: User) {
    const guest = !user ? { saved: data.saved, cart: data.cart } : null;
    setData((current) => ({ ...current, user: nextUser }));
    if (guest && (guest.saved.length || guest.cart.length)) {
      try { await requestJson("/api/collection", { method: "PUT", body: JSON.stringify(guest) }); } catch { notify("You’re signed in. Some guest items could not be synced.", true); }
    }
    try { setData(await requestJson<StoreData>("/api/store")); localStorage.removeItem("shopverse-guest"); } catch { /* Keep the verified account if refreshing fails. */ }
    if (!nextUser.onboarded) setModal("onboarding");
    else { setModal(pendingModal.current === "onboarding" ? "onboarding" : pendingModal.current); pendingModal.current = null; notify(`Lovely to see you, ${nextUser.username}.`); }
  }
  function onboarded(nextUser: User) {
    setData((current) => ({ ...current, user: nextUser }));
    setModal(pendingModal.current && pendingModal.current !== "onboarding" ? pendingModal.current : "profile"); pendingModal.current = null;
    changeView("For you"); notify("Your universe is ready. Welcome home.");
  }
  async function logout() {
    try { await requestJson("/api/auth/logout", { method: "POST" }); setData((current) => ({ ...current, user: null, saved: [], cart: [] })); setModal(null); changeView("For you"); notify("You’re logged out. See you again soon."); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not log out.", true); }
  }
  async function toggleSaved(item: Product) {
    const wasSaved = data.saved.includes(item.id);
    setData((current) => ({ ...current, saved: wasSaved ? current.saved.filter((id) => id !== item.id) : [...current.saved, item.id] }));
    try { if (user) await requestJson("/api/collection", { method: "POST", body: JSON.stringify({ type: "save", productId: item.id, saved: !wasSaved }) }); notify(wasSaved ? "Removed from your saved finds." : "A good find, saved for later."); }
    catch (err) { setData((current) => ({ ...current, saved: wasSaved ? [...current.saved, item.id] : current.saved.filter((id) => id !== item.id) })); notify(err instanceof Error ? err.message : "Could not save this item.", true); }
  }
  async function quantity(id: string, amount: number) {
    const item = data.products.find((entry) => entry.id === id);
    if (!item || amount < 0 || amount > Math.min(item.stock, 10)) { notify("That’s all the available stock for this item.", true); return; }
    const previous = data.cart;
    setData((current) => ({ ...current, cart: amount === 0 ? current.cart.filter((entry) => entry.productId !== id) : current.cart.some((entry) => entry.productId === id) ? current.cart.map((entry) => entry.productId === id ? { ...entry, quantity: amount } : entry) : [...current.cart, { productId: id, quantity: amount }] }));
    try { if (user) await requestJson("/api/collection", { method: "POST", body: JSON.stringify({ type: "cart", productId: id, quantity: amount }) }); }
    catch (err) { setData((current) => ({ ...current, cart: previous })); notify(err instanceof Error ? err.message : "Could not update your bag.", true); }
  }
  function addToBag(item: Product, amount = 1) { const current = data.cart.find((entry) => entry.productId === item.id)?.quantity || 0; if (current + amount > Math.min(item.stock, 10)) { notify("You’ve reached the available quantity for this item.", true); return; } quantity(item.id, current + amount); notify("A lovely choice. Added to your bag."); }
  function published(item: Product) { setData((current) => ({ ...current, products: [item, ...current.products] })); changeView("For you"); notify("Your item is live. Let the discovering begin."); }
  async function checkout(address: string): Promise<Order> { const result = await requestJson<{ order: Order }>("/api/orders", { method: "POST", body: JSON.stringify({ address }) }); setData((current) => ({ ...current, cart: [], products: current.products.map((item) => { const ordered = result.order.items.find((entry) => entry.productId === item.id); return ordered ? { ...item, stock: item.stock - ordered.quantity } : item; }) })); return result.order; }

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    const items = data.products.filter((item) => {
      if (view === "Saved finds" && !data.saved.includes(item.id)) return false;
      if (view === "My listings" && (!user || item.sellerId !== user.id)) return false;
      if (view === "Trending" && !["Bestseller", "Trending"].includes(item.badge || "") && item.reviews < 80) return false;
      if (view === "New arrivals" && item.isDemo && item.badge !== "New arrival") return false;
      if (category !== "All finds" && item.category !== category) return false;
      if (view === "For you" && user?.onboarded && category === "All finds" && user.interests.length && !user.interests.includes(item.category) && item.sellerId !== user.id && !search) return false;
      if (search && !`${item.name} ${item.brand} ${item.category} ${item.description}`.toLowerCase().includes(search)) return false;
      if (maxPrice && item.price > maxPrice) return false;
      if (inStock && item.stock <= 0) return false;
      return true;
    });
    const recommendedScore = (item: Product) => {
      let score = !item.isDemo ? 100 : 10 - seedOrder.indexOf(item.id) / 10;
      if (user && item.sellerId === user.id) score += 100;
      if (user?.onboarded) {
        if (user.interests.includes(item.category)) score += 30;
        if ((user.budget === "Under ₹1,000" && item.price <= 1000) || (user.budget === "₹1,000 – ₹3,000" && item.price >= 1000 && item.price <= 3000) || (user.budget === "₹3,000 – ₹5,000" && item.price >= 3000 && item.price <= 5000)) score += 10;
        if ((user.style === "Minimal & modern" && ["Home & living", "Electronics"].includes(item.category)) || (user.style === "Bold & expressive" && ["Fashion", "Beauty"].includes(item.category)) || (user.style === "Everyday essentials" && item.price < 2500)) score += 2;
      }
      return score;
    };
    if (sort === "price-low") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") items.sort((a, b) => b.price - a.price);
    else if (sort === "rating") items.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    else if (sort === "recommended") items.sort((a, b) => recommendedScore(b) - recommendedScore(a));
    return items;
  }, [data.products, data.saved, user, view, category, query, sort, maxPrice, inStock]);

  const feedTitle = query ? `Finds for “${query}”` : category !== "All finds" ? `${category}, your way.` : view === "For you" ? "A few things you might love" : view === "All products" ? "All the good stuff" : view === "Trending" ? "Good finds, getting noticed" : view === "New arrivals" ? "New here. Already favourites." : view === "Saved finds" ? "Your someday, maybe, definitely." : "Your shelf. Your story.";
  const feedSubtitle = view === "My listings" ? `${listings.length} ${listings.length === 1 ? "listing" : "listings"} · Your products, out in the world.` : view === "Saved finds" ? `${savedCount} little things worth coming back to.` : user?.onboarded && view === "For you" ? `Inspired by your love for ${user.interests.join(", ").toLowerCase()}.` : "Handpicked discoveries. Not-so-everyday prices.";

  return <div className="app-shell">
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}><button className="brand-home" aria-label="Shopverse home" onClick={() => changeView("For you")}><Brand /></button><div className="sidebar-scroll"><div className="nav-section-label">YOUR UNIVERSE</div><nav className="primary-nav" aria-label="Discover">{navItems.map(({ label, Icon }) => <button key={label} className={`nav-link ${view === label && category === "All finds" ? "active" : ""}`} onClick={() => changeView(label)}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{label === "Trending" && <span className="hot-label">HOT</span>}{label === "For you" && <span className="nav-active-dot" />}</button>)}</nav><div className="nav-section-label category-nav-label">SHOP BY CATEGORY</div><nav className="category-nav" aria-label="Product categories">{CATEGORIES.map((item, index) => { const Icon = categoryIcons[index]; return <button key={item} className={`nav-link ${category === item ? "active" : ""}`} onClick={() => chooseCategory(item)}><Icon size={18} strokeWidth={1.6} /><span>{item}</span></button>; })}</nav><div className="nav-divider" /><nav className="personal-nav" aria-label="Your collection"><button className={`nav-link ${view === "Saved finds" ? "active" : ""}`} onClick={() => changeView("Saved finds")}><Heart size={18} strokeWidth={1.7} /><span>Saved finds</span>{savedCount > 0 && <span className="nav-count">{savedCount}</span>}</button><button className="nav-link" onClick={showOrders}><Package size={18} strokeWidth={1.7} /><span>My orders</span></button>{user && <button className={`nav-link ${view === "My listings" ? "active" : ""}`} onClick={() => changeView("My listings")}><Store size={18} strokeWidth={1.7} /><span>My listings</span>{listings.length > 0 && <span className="nav-count">{listings.length}</span>}</button>}</nav>
    <div className="sidebar-sell-card"><span className="sell-card-icon"><Store size={19} /></span><h3>Have something good?</h3><p>Someone’s going to love it.</p><button onClick={startSelling}>Sell your items<ArrowUpRight size={16} /></button><span className="sell-decoration">✳</span></div><button className="sidebar-help" onClick={() => { setModal("help"); setMobileOpen(false); }}><CircleHelp size={16} />A little help?</button></div><button className="sidebar-profile" onClick={() => user ? setModal(user.onboarded ? "profile" : "onboarding") : login()}><span className="sidebar-avatar">{user ? user.username.slice(0, 1).toUpperCase() : <UserRound size={19} />}</span><span><strong>{user ? user.username : "Hey, explorer"}</strong><small>{user ? "Your little universe" : "Make yourself at home"}</small></span><ChevronRight size={16} /></button></aside>

    <div className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={22} /></button><div className="breadcrumb"><span>Discover</span><ChevronRight size={13} /><strong>{category !== "All finds" ? category : view}</strong></div><div className="topbar-actions"><div className="search-field"><Search size={17} /><input ref={searchRef} aria-label="Search products" placeholder="Search for your next favourite…" value={query} onChange={(event) => { setQuery(event.target.value); if (["My listings", "Saved finds"].includes(view)) setView("All products"); }} />{query ? <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button> : <kbd>⌘ K</kbd>}</div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => { setModal("notifications"); setNotificationRead(true); }}><Bell size={20} strokeWidth={1.7} />{!notificationRead && <span className="notification-dot" />}</button><button className="icon-button header-bag" aria-label={`Shopping bag, ${cartCount} items`} onClick={() => setModal("cart")}><ShoppingBag size={21} strokeWidth={1.7} />{cartCount > 0 && <span className="bag-count">{cartCount}</span>}</button><span className="header-divider" /><button className="login-button" onClick={() => user ? setModal(user.onboarded ? "profile" : "onboarding") : login()}>{user ? <span className="header-avatar">{user.username[0].toUpperCase()}</span> : <UserRound size={17} />}<span>{user ? user.username.split(" ")[0] : "Log in"}</span><ChevronDown size={13} /></button></div></header>

    <main className="main-content"><div className="intro-row"><div><div className="intro-eyebrow"><span /> YOUR EVERYDAY, REIMAGINED</div><h1>{user ? `A little more you, ${user.username.split(" ")[0]}.` : "Your next favourite is here."}</h1><p>A world of good finds, made a little more you.</p></div><button className="personalize-button" onClick={personalize}><Sparkles size={16} /><span>{user?.onboarded ? "Fine-tune your feed" : "Make it yours"}</span><ArrowUpRight size={14} /></button></div>

    {isDiscovery && <section className="hero" aria-label="Featured collection"><img className="hero-art" src="/images/shopverse-hero.png" alt="Beautiful everyday finds: ivory headphones, an instant camera, and a speaker on sage green display stands" fetchPriority="high" /><div className="hero-shading" /><div className="hero-content" key={heroIndex}><span className="hero-eyebrow"><span />{slide.eyebrow}</span><h2>{slide.title}</h2><p>{slide.text}</p><button onClick={() => { chooseCategory(slide.category); setTimeout(() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }}>{slide.button}<ArrowUpRight size={17} /></button></div><span className="hero-corner-note"><Sparkles size={13} />GOOD THINGS LIVE HERE</span><div className="hero-pagination">{heroSlides.map((_, index) => <button key={index} className={heroIndex === index ? "active" : ""} aria-label={`Show featured collection ${index + 1}`} aria-pressed={heroIndex === index} onClick={() => setHeroIndex(index)} />)}</div></section>}

    {!["My listings", "Saved finds"].includes(view) && <section className="interests-section" aria-label="Browse by interest"><div className="small-section-heading"><h2>Follow your curiosity</h2><button className="text-button" onClick={() => { changeView("All products"); setTimeout(() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}>Explore all<ArrowRight size={14} /></button></div><div className="category-tiles"><button className={`category-tile ${category === "All finds" ? "selected" : ""}`} onClick={() => chooseCategory("All finds")}><span><Sparkles size={20} strokeWidth={1.7} /></span><strong>All finds</strong></button>{CATEGORIES.map((item, index) => { const Icon = categoryIcons[index]; return <button key={item} className={`category-tile ${category === item ? "selected" : ""}`} onClick={() => chooseCategory(item)}><span><Icon size={21} strokeWidth={1.5} /></span><strong>{item}</strong></button>; })}</div></section>}

    {view === "My listings" && <div className="seller-dashboard-banner"><span><Store size={32} /></span><div><h2>Big ideas start with a little listing.</h2><p>Your next customer could be one good find away.</p></div><button className="primary-button" onClick={startSelling}>List something lovely<Plus size={17} /></button></div>}

    <section className="product-section" ref={feedRef}><div className="products-heading"><div><div className="feed-title-line"><h2>{feedTitle}</h2>{view === "For you" && !query && <span className="for-you-tag"><Sparkles size={11} />FOR YOU</span>}</div><p>{query ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "find" : "finds"} with your name on them.` : feedSubtitle}</p></div><div className="product-controls"><label className="sort-control"><ArrowDownUp size={14} /><span className="sort-prefix">Sort by:</span><select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Highest rated</option></select><ChevronDown size={12} /></label><div className="filter-wrap"><button className={`filter-button ${maxPrice || inStock ? "has-filters" : ""}`} onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}><SlidersHorizontal size={16} />Filters{(!!maxPrice || inStock) && <span>{Number(!!maxPrice) + Number(inStock)}</span>}</button>{filterOpen && <div className="filter-popover"><div><h3>A little fine-tuning</h3><button className="icon-button" aria-label="Close filters" onClick={() => setFilterOpen(false)}><X size={15} /></button></div><label className="field-label" htmlFor="price-filter">Your price range</label><select id="price-filter" className="text-input" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))}><option value={0}>Any price</option><option value={1000}>Under ₹1,000</option><option value={3000}>Under ₹3,000</option><option value={5000}>Under ₹5,000</option></select><label className="checkbox-label"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} />Only show in-stock finds</label><div className="filter-footer"><button className="text-button" onClick={() => { setMaxPrice(0); setInStock(false); }}>Reset</button><button className="primary-button" onClick={() => setFilterOpen(false)}>Show {visibleProducts.length} finds<Check size={14} /></button></div></div>}</div></div></div>
      {!!maxPrice && <div className="active-filters"><button onClick={() => setMaxPrice(0)}>Under {money(maxPrice)}<X size={12} /></button></div>}
      {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((item, index) => <ProductCard key={item.id} product={item} saved={data.saved.includes(item.id)} eager={index < 4} own={item.sellerId === user?.id} onOpen={() => setProduct(item)} onSave={() => toggleSaved(item)} onAdd={() => addToBag(item)} />)}</div> : <EmptyState icon={view === "Saved finds" ? <Heart size={34} /> : view === "My listings" ? <Store size={34} /> : <Search size={34} />} title={view === "Saved finds" ? "Keep a little something for later." : view === "My listings" ? "Your shelf is full of possibilities." : "The right find is still out there."} text={view === "Saved finds" ? "Tap the heart on anything you love. Your favourites will feel right at home here." : view === "My listings" ? "Your first listing is the start of something good. Add photos, tell its story, and make it live." : category !== "All finds" && !query ? "This corner of our universe is still growing. Explore more finds, or be the first to list something here." : "Try a different search or give your filters a little room. There’s more to discover."} action={view === "My listings" ? "Create my first listing" : "Explore all finds"} onAction={view === "My listings" ? startSelling : () => changeView("All products")} />}
    </section>

    <section className="personal-banner"><span className="personal-banner-art"><Sparkles size={29} /><span className="orbit-one" /><span className="orbit-two" /></span><div><span className="eyebrow">LESS SCROLLING. MORE “THAT’S SO ME.”</span><h2>Not just a feed. Your feed.</h2><p>A few little details about you. A whole world of better finds.</p></div><button className="outline-button" onClick={personalize}>{user?.onboarded ? "Refresh your interests" : "Make it personal"}<ArrowUpRight size={16} /></button></section>
    <div className="trust-row"><div><Leaf size={22} /><span><strong>Little finds, big feelings</strong><small>Thoughtfully chosen for everyday life.</small></span></div><div><UsersRound size={22} /><span><strong>Real people. Good things.</strong><small>Discover your next independent favourite.</small></span></div><div><ShieldCheck size={22} /><span><strong>Your universe, your way</strong><small>A space that gets a little more you.</small></span></div></div>
    <footer className="page-footer"><span>© 2026 Shopverse. Made for your kind of everyday.</span><div><button onClick={() => setModal("about")}>Our little story</button><span>·</span><button onClick={() => setModal("help")}>Help & support</button><span>·</span><span className="footer-country">Made with a little love in India <Heart size={10} /></span></div></footer>
    </main></div>

    {modal === "auth" && <AuthDialog onClose={() => { setModal(null); pendingModal.current = null; }} onVerified={verified} />}
    {modal === "onboarding" && user && <OnboardingDialog user={user} onClose={() => { setModal(null); pendingModal.current = null; }} onComplete={onboarded} />}
    {modal === "sell" && <SellDialog onClose={() => setModal(null)} onPublished={published} onView={(item) => { setModal(null); setProduct(item); }} />}
    {modal === "profile" && user && <ProfileDialog user={user} savedCount={savedCount} listingsCount={listings.length} onClose={() => setModal(null)} onEdit={() => setModal("onboarding")} onLogout={logout} onOrders={showOrders} onSaved={() => { setModal(null); changeView("Saved finds"); }} onSelling={() => { setModal(null); changeView("My listings"); }} />}
    {modal === "cart" && <CartDialog cart={data.cart} products={data.products} user={user} onClose={() => setModal(null)} onQuantity={quantity} onLogin={() => login("cart")} onCheckout={checkout} onOrders={() => setModal("orders")} />}
    {modal === "orders" && user && <OrdersDialog onClose={() => setModal(null)} />}
    {product && !modal && <ProductDialog key={product.id} product={data.products.find((item) => item.id === product.id) || product} saved={data.saved.includes(product.id)} onSave={() => toggleSaved(product)} onAdd={(amount) => addToBag(product, amount)} onClose={() => setProduct(null)} onBag={() => { setProduct(null); setModal("cart"); }} />}
    {modal === "notifications" && <Dialog title="Your updates" onClose={() => setModal(null)} className="info-dialog"><span className="round-feature"><Bell size={23} /></span><h2>A little hello.</h2><p>Good things happening in your universe.</p><button className="notification-card" onClick={personalize}><span><Sparkles size={20} /></span><div><strong>A feed that feels like you</strong><p>Share your interests to meet your next favourites.</p><small>WELCOME TO SHOPVERSE</small></div><ArrowUpRight size={17} /></button><button className="notification-card" onClick={startSelling}><span><Store size={20} /></span><div><strong>Your seller story is waiting</strong><p>List your first product and let good things find their people.</p><small>A LITTLE POSSIBILITY</small></div><ArrowUpRight size={17} /></button><span className="info-bottom-note">You’re all caught up. Go find something good.</span></Dialog>}
    {modal === "help" && <Dialog title="Shopverse help and support" onClose={() => setModal(null)} className="info-dialog"><span className="round-feature"><CircleHelp size={24} /></span><h2>A little help goes a long way.</h2><p>Here are a few answers to get you going.</p><div className="faq-list"><details><summary>How does phone sign-in work?<ChevronDown size={16} /></summary><p>Enter your number and verify the six-digit code. New members answer four short questions to personalize their feed. In this preview, a clearly labeled test code is displayed instead of sending an SMS.</p></details><details><summary>How do I sell an item?<ChevronDown size={16} /></summary><p>Sign in, complete your profile, then select “Sell your items.” Add 1–4 photos, a name, category, price, and description. Your listing is saved and appears on the storefront immediately.</p><button className="text-button" onClick={startSelling}>Start my seller story<ArrowUpRight size={14} /></button></details><details><summary>Why am I seeing these products?<ChevronDown size={16} /></summary><p>Your interests choose the categories in your For you feed. Your style and budget help rank them. You can change your preferences anytime, or browse all products to explore outside your usual universe.</p></details><details><summary>Are real payments enabled?<ChevronDown size={16} /></summary><p>Not in this preview. The curated catalog contains showcase products. Demo checkout saves an order to your account, but no money is collected and nothing is shipped. Seller-uploaded listings are saved to the database.</p></details><details><summary>Where are my saved finds and orders?<ChevronDown size={16} /></summary><p>Use the heart on any product to save it. Find your collection in “Saved finds” and your orders in “My orders.” Sign in to keep them across devices; guest collections stay in this browser.</p></details></div></Dialog>}
    {modal === "about" && <Dialog title="The Shopverse story" onClose={() => setModal(null)} className="info-dialog about-dialog"><Brand /><span className="about-sparkle"><Sparkles size={40} /></span><span className="eyebrow">GOOD THINGS. REAL PEOPLE.</span><h2>A little universe<br />of possibilities.</h2><p>Shopverse is a place for your kind of things. The small upgrades, the everyday essentials, and the independent discoveries that make life feel a little more you.</p><p>Find something you love. Share something you’ve made. There’s room for every kind of everyday here.</p><div className="about-preview"><Leaf size={19} /><span>You’re exploring a working marketplace preview with a curated sample catalog and demo checkout.</span></div><button className="primary-button" onClick={() => setModal(null)}>Make yourself at home<ArrowRight size={17} /></button></Dialog>}
    {toast && <div className={`toast ${toast.error ? "error" : ""}`} role="status"><span>{toast.error ? <CircleHelp size={18} /> : <Check size={18} />}</span>{toast.message}<button aria-label="Dismiss message" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>;
}

function ProductCard({ product, saved, own, eager, onOpen, onSave, onAdd }: { product: Product; saved: boolean; own: boolean; eager: boolean; onOpen: () => void; onSave: () => void; onAdd: () => void }) {
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  return <article className="product-card"><div className="product-image-wrap"><button className="product-image-button" onClick={onOpen} aria-label={`View ${product.name}`}><img src={product.images[0]} alt={product.name} loading={eager ? "eager" : "lazy"} style={product.isDemo ? undefined : { objectFit: "contain" }} /></button>{(own || product.badge) && <span className={`product-badge ${(product.badge || "").toLowerCase().replaceAll(" ", "-")}`}>{own ? <><Store size={10} />Your listing</> : product.badge === "Bestseller" ? <><Flame size={10} />Bestseller</> : product.badge}</span>}<button className={`save-button ${saved ? "is-saved" : ""}`} aria-label={saved ? `Unsave ${product.name}` : `Save ${product.name}`} onClick={onSave}><Heart size={16} strokeWidth={1.6} fill={saved ? "currentColor" : "none"} /></button></div><div className="product-card-body"><div className="product-brand-row"><span className="product-brand">{product.brand}</span><span className="product-rating"><Star size={10} fill="currentColor" /><strong>{product.rating}</strong>{product.reviews > 0 && <span>({product.reviews})</span>}</span></div><button className="product-name" onClick={onOpen}>{product.name}</button><div className="product-bottom"><div className="product-prices"><strong>{money(product.price)}</strong>{discount > 0 && <s>{money(product.originalPrice)}</s>}{discount > 0 && <span>{discount}% off</span>}</div><button className="quick-add" onClick={onAdd} aria-label={`Add ${product.name} to bag`} disabled={!product.stock}><Plus size={17} strokeWidth={1.7} /></button></div></div></article>;
}
