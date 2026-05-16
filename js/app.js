const SUPABASE_URL = "https://ipwlhlsxtlfqioysyzlc.supabase.co";
const SUPABASE_KEY = "sb_publishable__u9RyOYFvdQ3A-kPQPPO3A_BLjsOHds";
const ADMIN_EMAIL = "zaidifycollections@gmail.com";
const SUPPORT_EMAIL = "zaidifycollections@gmail.com";
const WHATSAPP_NUMBER = "918655171445";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let currentUser = null;
let selectedProduct = null;
let selectedSize = "";
let selectedColor = "";

const state = {
  cart: safeJSON(localStorage.getItem("zc_cart"), []),
  wishlist: safeJSON(localStorage.getItem("zc_wishlist"), [])
};

const $ = id => document.getElementById(id);
const qsa = sel => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", async () => {
  injectAccountStyles();
  ensureAccountPage();
  bindEvents();
  setupOverlayClose();
  await checkAuth();
  await loadProducts();
  renderAll();
  updateBadges();
});

/* AUTH */

async function checkAuth() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;
  updateAuthUI();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
  });
}

async function loginUser(e) {
  e.preventDefault();

  const email = $("loginEmail")?.value.trim().toLowerCase();
  const password = $("loginPassword")?.value.trim();

  if (!email || !password) return toast("Enter email and password", true);

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) return toast("Invalid login credentials", true);

  currentUser = data.user;
  updateAuthUI();
  closeOverlay("loginOverlay");
  toast("Logged in");
}

async function signupUser(e) {
  e.preventDefault();

  const email = $("signupEmail")?.value.trim().toLowerCase();
  const password = $("signupPassword")?.value.trim();

  if (!email || !password) return toast("Enter email and password", true);

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) return toast(error.message, true);

  toast("Signup successful. Login now.");
  switchAuthTab("login");
}

async function googleLogin() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) toast("Google login failed", true);
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
  closeOverlay("accountPage");
  closeOverlay("adminOverlay");
  toast("Logged out");
}

function isAdmin() {
  return currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function updateAuthUI() {
  const loggedIn = Boolean(currentUser);

  $("loginBtn")?.classList.toggle("hidden", loggedIn);
  $("accountBtn")?.classList.toggle("hidden", !loggedIn);
  $("adminBtn")?.classList.toggle("hidden", !isAdmin());

  setText("accountUserEmail", currentUser?.email || "Not logged in");
  setText("accountSettingsEmail", currentUser?.email || "Not logged in");
  setText("accountUserName", getAccountName());
}

/* PRODUCTS */

async function loadProducts() {
  showLoading();

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    products = [];
    console.error(error);
    toast("Products failed to load", true);
    return;
  }

  products = (data || []).map(normalizeProduct);
}

function normalizeProduct(p) {
  const columnImages = [
    p.image_1, p.image_2, p.image_3, p.image_4, p.image_5,
    p.image_6, p.image_7, p.image_8, p.image_9, p.image_10
  ].map(cleanText).filter(isRealImage);

  const jsonImages = normalizeImagesField(p.images);
  const sizePrices = getSizePrices(p);
  const price = getStartingPrice(sizePrices);

  return {
    id: p.id,
    ref: cleanText(p.ref || p.product_id || p.sku || p.id),
    name: cleanText(p.name || p.product_name || "Product"),
    category: cleanText(p.category || "women").toLowerCase(),
    price,
    sizePrices,
    oldPrice: Number(p.old_price || p.oldPrice || p.mrp || 0),
    stock: Number(p.stock || p.quantity || 0),
    sizes: normalizeSizes(p.sizes, sizePrices),
    colors: normalizeList(p.colors),
    images: columnImages.length ? columnImages : jsonImages.length ? jsonImages : ["logo.png"],
    variants: normalizeVariants(p.variants),
    description: cleanText(p.description || ""),
    badge: cleanText(p.badge || "NEW"),
    rating: Number(p.rating || 5),
    created_at: p.created_at || ""
  };
}

/* PRICE RULE:
   XXS = price_xxs
   XS = price_xs
   S/M/L/XL/XXL/XXXL/3XL/4XL/5XL/6XL = price_standard
*/
function getSizePrices(p) {
  const standard = Number(p.price_standard || p.standard_price || p.price_std || p.price || 0);
  const xxs = Number(p.price_xxs || p.xxs || 0);
  const xs = Number(p.price_xs || p.xs || 0);

  const sizes = normalizeSizes(p.sizes, {});
  const map = {};

  sizes.forEach(size => {
    const s = normalizeSizeKey(size);

    if (s === "XXS") map[size] = xxs || standard || xs || 0;
    else if (s === "XS") map[size] = xs || standard || xxs || 0;
    else map[size] = standard || xs || xxs || 0;
  });

  if (!Object.keys(map).length) {
    if (xxs) map.XXS = xxs;
    if (xs) map.XS = xs;
    if (standard) {
      ["S", "M", "L", "XL", "XXL"].forEach(size => map[size] = standard);
    }
  }

  return map;
}

function getStartingPrice(sizePrices) {
  const values = Object.values(sizePrices || {}).map(Number).filter(n => n > 0);
  return values.length ? Math.min(...values) : 0;
}

function getPriceForSize(product, size) {
  if (!product) return 0;

  const exact = product.sizePrices?.[size];
  if (exact) return Number(exact);

  const wanted = normalizeSizeKey(size);

  const found = Object.entries(product.sizePrices || {}).find(([k]) => normalizeSizeKey(k) === wanted);

  if (found) return Number(found[1]);

  return Number(product.price || 0);
}

function normalizeSizeKey(size) {
  return String(size || "")
    .trim()
    .toUpperCase()
    .replace("XXXL", "3XL");
}

function normalizeSizes(value, sizePrices = {}) {
  let sizes = [];

  if (Array.isArray(value)) {
    sizes = value.map(cleanText).filter(Boolean);
  } else if (typeof value === "string") {
    let text = value.trim();

    text = text.replace(/[{}[\]'"]/g, "");

    sizes = text
      .split(",")
      .map(cleanText)
      .filter(Boolean)
      .map(s => {
        const up = s.toUpperCase();
        if (up === "XXXL") return "3XL";
        return up;
      });
  }

  if (!sizes.length && sizePrices) {
    sizes = Object.keys(sizePrices);
  }

  return [...new Set(sizes)];
}

function normalizeImagesField(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value.map(cleanText).filter(isRealImage);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(cleanText).filter(isRealImage);
    } catch {}

    return value.split(/[\n,]/).map(cleanText).filter(isRealImage);
  }

  return [];
}

function normalizeVariants(value) {
  let raw = value;
  if (!raw) return [];

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map(v => ({
      color: cleanText(v.color),
      images: normalizeImagesField(v.images)
    }))
    .filter(v => v.color && v.images.length);
}

function normalizeList(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);

  if (typeof value === "string") {
    let text = value.trim().replace(/[{}[\]'"]/g, "");
    return text.split(",").map(cleanText).filter(Boolean);
  }

  return [];
}

function getFilteredProducts() {
  const search = ($("searchInput")?.value || $("mobileSearchInput")?.value || "").toLowerCase().trim();
  const category = $("categoryFilter")?.value || "all";
  const size = $("sizeFilter")?.value || "all";
  const price = $("priceFilter")?.value || "all";
  const sort = $("sortFilter")?.value || "popular";

  let list = products.filter(p => {
    const text = `${p.name} ${p.ref} ${p.category} ${p.description} ${p.colors.join(" ")} ${p.sizes.join(" ")}`.toLowerCase();

    const matchSearch = !search || text.includes(search);
    const matchCategory =
      category === "all" ||
      p.category === category ||
      (category === "women" && ["women", "kurti", "sets", "coords"].includes(p.category));

    const matchSize =
      size === "all" ||
      p.sizes.some(s => normalizeSizeKey(s) === normalizeSizeKey(size));

    let matchPrice = true;
    if (price !== "all" && price.includes("-")) {
      const [min, max] = price.split("-").map(Number);
      matchPrice = p.price >= min && p.price <= max;
    }

    return matchSearch && matchCategory && matchSize && matchPrice;
  });

  if (sort === "low-high") list.sort((a, b) => a.price - b.price);
  else if (sort === "high-low") list.sort((a, b) => b.price - a.price);
  else if (sort === "newest") list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  else list.sort((a, b) => b.rating - a.rating);

  return list;
}

function renderAll() {
  const list = getFilteredProducts();

  renderProducts("featuredProducts", list.slice(0, 8));
  renderProducts("popularProducts", [...list].sort((a, b) => b.rating - a.rating).slice(0, 8));
  renderProducts("productsGrid", list);

  setText("resultCount", `${list.length} product${list.length === 1 ? "" : "s"} found`);
  updateBadges();
}

function renderProducts(containerId, list) {
  const box = $(containerId);
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty-state">No products found</div>`;
    return;
  }

  box.innerHTML = list.map(p => `
    <article class="product-card" data-id="${escapeAttr(p.id)}">
      <div class="product-card-img-wrap">
        <img class="product-card-img" src="${escapeAttr(safeImg(p.images[0]))}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.src='logo.png'">
        <span class="product-badge">${escapeHTML(p.badge)}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${escapeHTML(p.name)}</div>

        <div class="product-card-price">
          <span class="price-now">${p.price ? `₹${p.price}` : "Price on selection"}</span>
          ${p.oldPrice ? `<span class="price-old">₹${p.oldPrice}</span>` : ""}
        </div>

        <div class="card-rating">★★★★★ <span class="rev-count">${p.rating}</span></div>

        <div class="product-card-actions">
          <button class="view-product-btn" data-view="${escapeAttr(p.id)}" type="button">VIEW</button>
          <button class="quick-wishlist-btn" data-wish="${escapeAttr(p.id)}" type="button">${isWishlisted(p.id) ? "♥" : "♡"}</button>
        </div>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openProduct(btn.dataset.view);
    });
  });

  box.querySelectorAll("[data-wish]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const product = products.find(p => String(p.id) === String(btn.dataset.wish));
      toggleWishlist(product);
      renderAll();
    });
  });

  box.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => openProduct(card.dataset.id));
  });
}

function showLoading() {
  ["featuredProducts", "popularProducts", "productsGrid"].forEach(id => {
    if ($(id)) $(id).innerHTML = `<div class="loading-products">Loading products...</div>`;
  });
}

/* PRODUCT MODAL */

function openProduct(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.variants?.[0]?.color || product.colors?.[0] || "";

  setText("modalProductRef", product.ref);
  setText("modalProductName", product.name);
  setText("modalProductPrice", product.price ? `₹${product.price}` : "Select size");
  setText("modalOldPrice", product.oldPrice ? `₹${product.oldPrice}` : "");
  setText("modalReviewCount", `${product.rating} rating`);
  setText("modalProductDesc", product.description || "Premium product from Zaidify Collections.");

  renderProductImages(getImagesForColor(product, selectedColor));
  renderSizeOptions(product.sizes);
  renderColorOptions(product);
  updateModalWishlistBtn();

  openOverlay("productModal");
addProductBackButton();
}
  
function renderSizeOptions(sizes) {
  const box = $("modalSizeOptions");
  if (!box) return;

  const usableSizes = sizes?.length ? sizes : Object.keys(selectedProduct?.sizePrices || {});

  box.innerHTML = usableSizes.map(size => `
    <button class="option-btn" data-size="${escapeAttr(size)}" type="button">${escapeHTML(size)}</button>
  `).join("");

  box.querySelectorAll("[data-size]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedSize = btn.dataset.size;
      box.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const price = getPriceForSize(selectedProduct, selectedSize);
      setText("modalProductPrice", price ? `₹${price}` : "Price unavailable");
    });
  });
}

function renderColorOptions(product) {
  const box = $("modalColorOptions");
  if (!box) return;

  const colors = product.variants?.length ? product.variants.map(v => v.color) : product.colors;
  const finalColors = colors?.length ? colors : ["Default"];

  if (!selectedColor) selectedColor = finalColors[0];

  box.innerHTML = finalColors.map(color => `
    <button class="option-btn ${String(color).toLowerCase() === String(selectedColor).toLowerCase() ? "active" : ""}" data-color="${escapeAttr(color)}" type="button">${escapeHTML(color)}</button>
  `).join("");

  box.querySelectorAll("[data-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      box.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProductImages(getImagesForColor(product, selectedColor));
    });
  });
}

function getImagesForColor(product, color) {
  const variant = product.variants?.find(v =>
    String(v.color).toLowerCase() === String(color).toLowerCase()
  );

  return variant?.images?.length ? variant.images : product.images?.length ? product.images : ["logo.png"];
}

function renderProductImages(images) {
  const finalImages = images?.length ? images.map(safeImg) : ["logo.png"];

  if ($("modalProductImage")) $("modalProductImage").src = finalImages[0];

  if (!$("modalThumbs")) return;

  $("modalThumbs").innerHTML = finalImages.map((img, i) => `
    <img src="${escapeAttr(img)}" class="${i === 0 ? "active" : ""}" onerror="this.src='logo.png'">
  `).join("");

  $("modalThumbs").querySelectorAll("img").forEach(img => {
    img.addEventListener("click", () => {
      $("modalProductImage").src = img.src;
      $("modalThumbs").querySelectorAll("img").forEach(x => x.classList.remove("active"));
      img.classList.add("active");
    });
  });
}

/* CART */

function addSelectedToCart(openCartAfter = false) {
  if (!selectedProduct) return;
  if (!selectedSize) return toast("Select size first", true);

  const price = getPriceForSize(selectedProduct, selectedSize);
  if (!price) return toast("Price unavailable for selected size", true);

  const color = selectedColor || "Default";
  const image = safeImg(getImagesForColor(selectedProduct, color)[0]);
  const key = `${selectedProduct.id}-${selectedSize}-${color}`;

  const existing = state.cart.find(item => item.key === key);

  if (existing) existing.qty += 1;
  else {
    state.cart.push({
      key,
      id: selectedProduct.id,
      ref: selectedProduct.ref,
      name: selectedProduct.name,
      price,
      image,
      size: selectedSize,
      color,
      qty: 1
    });
  }

  saveCart();
  updateBadges();
  renderCart();
  toast("Added to cart");

  if (openCartAfter) {
    closeOverlay("productModal");
    openOverlay("cartOverlay");
  }
}

function renderCart() {
  const box = $("cartItems");
  if (!box) return;

  if (!state.cart.length) {
    box.innerHTML = `<div class="empty-state">Your cart is empty</div>`;
    setText("cartTotal", "₹0");
    return;
  }

  box.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img src="${escapeAttr(safeImg(item.image))}" onerror="this.src='logo.png'">
      <div>
        <div class="cart-item-title">${escapeHTML(item.name)}</div>
        <div class="cart-item-meta">${escapeHTML(item.size)} / ${escapeHTML(item.color)}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty}</div>
      </div>
      <button class="remove-btn" data-remove-cart="${escapeAttr(item.key)}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-cart]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.cart = state.cart.filter(item => item.key !== btn.dataset.removeCart);
      saveCart();
      renderCart();
      updateBadges();
    });
  });

  const total = state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  setText("cartTotal", `₹${total}`);
}

/* WISHLIST */

function toggleWishlist(product) {
  if (!product) return;

  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter(item => String(item.id) !== String(product.id));
    toast("Removed from wishlist");
  } else {
    state.wishlist.push({
      id: product.id,
      ref: product.ref,
      name: product.name,
      price: product.price,
      image: safeImg(product.images[0])
    });
    toast("Added to wishlist");
  }

  saveWishlist();
  updateBadges();
}

function isWishlisted(id) {
  return state.wishlist.some(item => String(item.id) === String(id));
}

function renderWishlist() {
  const box = $("wishlistItems");
  if (!box) return;

  if (!state.wishlist.length) {
    box.innerHTML = `<div class="empty-state">Your wishlist is empty</div>`;
    return;
  }

  box.innerHTML = state.wishlist.map(item => `
    <div class="wishlist-item">
      <img src="${escapeAttr(safeImg(item.image))}" onerror="this.src='logo.png'">
      <div>
        <div class="wishlist-item-title">${escapeHTML(item.name)}</div>
        <div class="wishlist-item-price">${item.price ? `₹${item.price}` : "Select size"}</div>
        <button class="view-product-btn" data-open-wish="${escapeAttr(item.id)}" type="button">VIEW</button>
      </div>
      <button class="remove-btn" data-remove-wish="${escapeAttr(item.id)}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-wish]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.wishlist = state.wishlist.filter(item => String(item.id) !== String(btn.dataset.removeWish));
      saveWishlist();
      renderWishlist();
      renderAll();
      updateBadges();
    });
  });

  box.querySelectorAll("[data-open-wish]").forEach(btn => {
    btn.addEventListener("click", () => {
      closeOverlay("wishlistOverlay");
      openProduct(btn.dataset.openWish);
    });
  });
}

function updateModalWishlistBtn() {
  if (!$("modalWishlistBtn") || !selectedProduct) return;
  $("modalWishlistBtn").textContent = isWishlisted(selectedProduct.id) ? "♥ WISHLISTED" : "♡ WISHLIST";
}

/* ACCOUNT */

function injectAccountStyles() {
  if ($("accountPageStyles")) return;

  document.head.insertAdjacentHTML("beforeend", `
    <style id="accountPageStyles">
      .account-page-overlay.open{display:block!important;padding:0;background:#050008;}
      .account-full-page{min-height:100vh;background:#050008;color:#fff;}
      .account-topbar{height:78px;display:flex;align-items:center;gap:18px;padding:0 28px;border-bottom:1px solid rgba(255,255,255,.1);background:#000;}
      .account-topbar h1{color:#ff00ff;letter-spacing:8px;font-size:24px;}
      .account-layout{max-width:980px;margin:0 auto;display:grid;grid-template-columns:220px 1fr;gap:24px;padding:30px 20px;}
      .account-sidebar{display:grid;gap:10px;align-content:start;}
      .account-tab{border:0;border-radius:10px;background:transparent;color:rgba(255,255,255,.55);padding:16px 20px;text-align:left;font-weight:900;letter-spacing:2px;text-transform:uppercase;}
      .account-tab.active{background:rgba(255,0,255,.13);color:#ff00ff;}
      .account-tab.logout-tab{color:#ff4a4a;}
      .account-main{min-width:0;}
      .account-section{display:none;}
      .account-section.active{display:block;}
      .account-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035);border-radius:16px;padding:26px;margin-bottom:20px;}
      .account-card h2,.account-card h3{color:#ff00ff;margin-bottom:14px;letter-spacing:3px;}
      .za-user-circle.big{width:72px;height:72px;font-size:30px;margin-bottom:14px;}
      .account-quick-links,.account-help-grid{display:flex;gap:10px;flex-wrap:wrap;}
      .account-list-item{display:grid;gap:6px;border-bottom:1px solid rgba(255,255,255,.08);padding:14px 0;}
      @media(max-width:760px){.account-layout{grid-template-columns:1fr}.account-sidebar{grid-template-columns:1fr 1fr}.account-topbar h1{font-size:18px;letter-spacing:4px}}
    </style>
  `);
}

function ensureAccountPage() {
  if ($("accountPage")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div id="accountPage" class="overlay hidden account-page-overlay">
      <div class="account-full-page">
        <div class="account-topbar">
          <button id="accountBackBtn" class="za-outline-btn" type="button">← Back</button>
          <h1>MY ACCOUNT</h1>
        </div>

        <div class="account-layout">
          <aside class="account-sidebar">
            <button class="account-tab active" data-account-tab="profile" type="button">👤 Profile</button>
            <button class="account-tab" data-account-tab="orders" type="button">📦 My Orders</button>
            <button class="account-tab" data-account-tab="addresses" type="button">📍 My Addresses</button>
            <button class="account-tab" data-account-tab="settings" type="button">⚙ Settings</button>
            <button class="account-tab" data-account-tab="help" type="button">❔ Help Centre</button>
            <button class="account-tab logout-tab" id="accountLogoutBtn" type="button">🚪 Logout</button>
          </aside>

          <main class="account-main">
            <section id="account-profile" class="account-section active">
              <div class="account-card">
                <div class="za-user-circle big">Z</div>
                <h2 id="accountUserName">ZAIDIFYCOLLECTIONS</h2>
                <p id="accountUserEmail">zaidifycollections@gmail.com</p>
              </div>

              <div class="account-card">
                <h3>Quick Links</h3>
                <div class="account-quick-links">
                  <button class="main-btn purple" data-account-go="orders" type="button">📦 My Orders</button>
                  <button class="main-btn" data-account-go="help" type="button">❔ Help</button>
                </div>
              </div>
            </section>

            <section id="account-orders" class="account-section">
              <div class="account-card">
                <h2>My Orders</h2>
                <div id="accountOrdersBox" class="za-empty-box">No orders found yet.</div>
              </div>
            </section>

            <section id="account-addresses" class="account-section">
              <div class="account-card">
                <h2>My Addresses</h2>
                <div id="accountAddressesBox" class="za-empty-box">No saved addresses found.</div>
              </div>
            </section>

            <section id="account-settings" class="account-section">
              <div class="account-card">
                <h2>Settings</h2>
                <p>Email: <strong id="accountSettingsEmail">Not logged in</strong></p>
              </div>
            </section>

            <section id="account-help" class="account-section">
              <div class="account-card">
                <h2>Help Centre</h2>
                <p style="color:rgba(255,255,255,.65);margin-bottom:18px;">WhatsApp is only for support. Orders should be placed through website cart/checkout.</p>
                <div class="account-help-grid">
                  <button class="main-btn purple" id="helpWhatsappBtn" type="button">WhatsApp Support</button>
                  <button class="main-btn" id="helpEmailSupportBtn" type="button">Email Support</button>
                  <button class="main-btn" id="helpReturnsBtn" type="button">Returns & Refunds</button>
                  <button class="main-btn" id="helpShippingBtn" type="button">Shipping Help</button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  `);
}

function openAccountPage() {
  if (!currentUser) return openOverlay("loginOverlay");

  setText("accountUserEmail", currentUser.email);
  setText("accountSettingsEmail", currentUser.email);
  setText("accountUserName", getAccountName());

  openAccountTab("profile");
  openOverlay("accountPage");
}

function openAccountTab(tab) {
  qsa(".account-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.accountTab === tab));
  qsa(".account-section").forEach(section => section.classList.remove("active"));
  $(`account-${tab}`)?.classList.add("active");

  if (tab === "orders") loadAccountOrders();
  if (tab === "addresses") loadAccountAddresses();
}

async function loadAccountOrders() {
  const box = $("accountOrdersBox");
  if (!box || !currentUser) return;

  box.innerHTML = "Loading orders...";

  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .eq("user_email", currentUser.email)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    box.innerHTML = "No orders found yet.";
    return;
  }

  box.innerHTML = data.map(o => `
    <div class="account-list-item">
      <strong>Order #${escapeHTML(o.id)}</strong>
      <span>${escapeHTML(o.status || "Processing")}</span>
      <span>₹${Number(o.total || o.amount || 0)}</span>
    </div>
  `).join("");
}

async function loadAccountAddresses() {
  const box = $("accountAddressesBox");
  if (!box || !currentUser) return;

  box.innerHTML = "Loading addresses...";

  const { data, error } = await supabaseClient
    .from("user_addresses")
    .select("*")
    .eq("user_email", currentUser.email)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    box.innerHTML = "No saved addresses found.";
    return;
  }

  box.innerHTML = data.map(a => `
    <div class="account-list-item">
      <strong>${escapeHTML(a.name || "Saved Address")}</strong>
      <span>${escapeHTML(a.address || a.full_address || "")}</span>
      <span>${escapeHTML(a.phone || "")}</span>
    </div>
  `).join("");
}

function getAccountName() {
  const email = currentUser?.email || "Zaidify Collections";
  return email.split("@")[0].replace(/[^a-z0-9]/gi, "").toUpperCase() || "ZAIDIFY";
}

/* ADMIN */

function renderAdmin() {
  setText("statProducts", products.length);
  setText("statOrders", "0");
  setText("statRevenue", "₹0");
  setText("statCustomers", "0");
  renderAdminProducts();
  renderAdminInventory();
}

function renderAdminProducts() {
  const boxes = [$("adminProductsTable"), $("adminProductsOverview")].filter(Boolean);

  boxes.forEach(box => {
    box.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th><th>Ref</th><th>Name</th><th>Category</th><th>From Price</th><th>Stock</th><th>Sizes</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><img src="${escapeAttr(safeImg(p.images[0]))}" style="width:48px;height:48px;object-fit:cover;border-radius:10px;" onerror="this.src='logo.png'"></td>
                <td>${escapeHTML(p.ref)}</td>
                <td>${escapeHTML(p.name)}</td>
                <td>${escapeHTML(p.category)}</td>
                <td>${p.price ? `₹${p.price}` : "N/A"}</td>
                <td>${p.stock}</td>
                <td>${escapeHTML(p.sizes.join(", "))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  });
}

function renderAdminInventory() {
  const box = $("adminInventoryTable");
  if (!box) return;

  box.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="admin-table">
        <thead><tr><th>Ref</th><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td>${escapeHTML(p.ref)}</td>
              <td>${escapeHTML(p.name)}</td>
              <td>${p.stock}</td>
              <td>${p.stock <= 5 ? "Low Stock" : "In Stock"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function saveAdminProduct(e) {
  e.preventDefault();

  if (!isAdmin()) return toast("Only admin can save products", true);

  const images = splitLines($("ap-images")?.value).filter(isRealImage).slice(0, 10);
  const variants = parseVariants($("ap-variants")?.value);

  const product = {
    ref: cleanText($("ap-id")?.value),
    name: cleanText($("ap-name")?.value),
    category: cleanText($("ap-category")?.value || "women").toLowerCase(),
    price_standard: Number($("ap-price")?.value || 0),
    old_price: Number($("ap-old-price")?.value || 0),
    stock: Number($("ap-stock")?.value || 0),
    sizes: splitList($("ap-sizes")?.value),
    colors: splitList($("ap-colors")?.value),
    images,
    image_1: images[0] || null,
    image_2: images[1] || null,
    image_3: images[2] || null,
    image_4: images[3] || null,
    image_5: images[4] || null,
    image_6: images[5] || null,
    image_7: images[6] || null,
    image_8: images[7] || null,
    image_9: images[8] || null,
    image_10: images[9] || null,
    variants,
    description: cleanText($("ap-description")?.value),
    badge: cleanText($("ap-badge")?.value || "NEW"),
    is_active: $("ap-active")?.value === "true"
  };

  if (!product.ref || !product.name) return toast("Product ref and name required", true);

  const { error } = await supabaseClient.from("products").insert(product);

  if (error) return toast(`Product save failed: ${error.message}`, true);

  toast("Product saved");
  $("adminProductForm")?.reset();

  await loadProducts();
  renderAll();
  renderAdmin();
  openAdminPage("products");
}

function openAdminPage(page) {
  qsa(".za-admin-nav").forEach(btn => btn.classList.toggle("active", btn.dataset.adminPage === page));
  qsa(".za-admin-page").forEach(section => section.classList.remove("active"));
  $(`admin-${page}`)?.classList.add("active");
  setText("adminPageTitle", titleCase(page.replace("-", " ")));
}

/* EVENTS */

function bindEvents() {
  $("loginForm")?.addEventListener("submit", loginUser);
  $("signupForm")?.addEventListener("submit", signupUser);
  $("googleLoginBtn")?.addEventListener("click", googleLogin);

  $("loginBtn")?.addEventListener("click", () => openOverlay("loginOverlay"));
  $("accountBtn")?.addEventListener("click", openAccountPage);

  $("accountBackBtn")?.addEventListener("click", () => closeOverlay("accountPage"));
  $("accountLogoutBtn")?.addEventListener("click", logoutUser);

  qsa(".account-tab").forEach(btn => {
    if (btn.dataset.accountTab) btn.addEventListener("click", () => openAccountTab(btn.dataset.accountTab));
  });

  qsa("[data-account-go]").forEach(btn => {
    btn.addEventListener("click", () => openAccountTab(btn.dataset.accountGo));
  });

  $("helpWhatsappBtn")?.addEventListener("click", () => {
  window.open(
    "https://wa.me/918655171445?text=Hi%20Zaidify%20Collections,%20I%20need%20help.",
    "_blank"
  );
});

$("helpEmailSupportBtn")?.addEventListener("click", () => {
  window.location.href =
    "mailto:zaidifycollections@gmail.com?subject=Support Request - Zaidify Collections&body=Hi Zaidify Collections,%0D%0A%0D%0AI need help with:";
});

$("helpReturnsBtn")?.addEventListener("click", () => {
  window.location.href =
    "mailto:zaidifycollections@gmail.com?subject=Return / Refund Request&body=Hi Zaidify Collections,%0D%0A%0D%0AI need help with return/refund.%0D%0AOrder ID:%0D%0AReason:";
});

$("helpShippingBtn")?.addEventListener("click", () => {
  window.location.href =
    "mailto:zaidifycollections@gmail.com?subject=Shipping Help&body=Hi Zaidify Collections,%0D%0A%0D%0AI need help with shipping/tracking.%0D%0AOrder ID:";
});

  $("cartBtn")?.addEventListener("click", () => { renderCart(); openOverlay("cartOverlay"); });
  $("wishlistBtn")?.addEventListener("click", () => { renderWishlist(); openOverlay("wishlistOverlay"); });

  $("closeCartBtn")?.addEventListener("click", () => closeOverlay("cartOverlay"));
  $("closeWishlistBtn")?.addEventListener("click", () => closeOverlay("wishlistOverlay"));
  $("closeLoginBtn")?.addEventListener("click", () => closeOverlay("loginOverlay"));
  $("closeProductModal")?.addEventListener("click", () => closeOverlay("productModal"));
  $("closePolicyBtn")?.addEventListener("click", () => closeOverlay("policyOverlay"));
  $("policyBtn")?.addEventListener("click", () => openOverlay("policyOverlay"));

  $("loginTabBtn")?.addEventListener("click", () => switchAuthTab("login"));
  $("signupTabBtn")?.addEventListener("click", () => switchAuthTab("signup"));

  $("modalAddCartBtn")?.addEventListener("click", () => addSelectedToCart(false));
  $("modalBuyNowBtn")?.addEventListener("click", () => addSelectedToCart(true));

  $("modalWishlistBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;
    toggleWishlist(selectedProduct);
    updateModalWishlistBtn();
    renderAll();
  });

  $("adminBtn")?.addEventListener("click", () => {
    if (!isAdmin()) return toast("Admin access denied", true);
    renderAdmin();
    openOverlay("adminOverlay");
  });

  $("adminLogoutBtn")?.addEventListener("click", logoutUser);
  $("backToStoreBtn")?.addEventListener("click", () => closeOverlay("adminOverlay"));

  qsa(".za-admin-nav").forEach(btn => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminPage));
  });

  qsa("[data-admin-go]").forEach(btn => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminGo));
  });

  $("adminProductForm")?.addEventListener("submit", saveAdminProduct);

  qsa(".category-tile").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("inactive")) return toast("Coming soon");

      qsa(".category-tile").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if ($("categoryFilter")) $("categoryFilter").value = btn.dataset.category || "all";

      renderAll();
      scrollToProducts();
    });
  });

  ["categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach(id => {
    $(id)?.addEventListener("change", renderAll);
  });

  ["searchInput", "mobileSearchInput"].forEach(id => {
    $(id)?.addEventListener("input", debounce(() => {
      syncSearchInputs(id);
      renderAll();
    }, 180));
  });

  $("searchBtn")?.addEventListener("click", () => {
    syncSearchInputs("searchInput");
    renderAll();
    scrollToProducts();
  });

  $("mobileSearchBtn")?.addEventListener("click", () => {
    syncSearchInputs("mobileSearchInput");
    renderAll();
    scrollToProducts();
  });

  $("clearFiltersBtn")?.addEventListener("click", clearFilters);
}

/* HELPERS */
function addProductBackButton() {
  const modal = document.querySelector("#productModal .product-modal");
  if (!modal || document.getElementById("productBackBtn")) return;

  const btn = document.createElement("button");
  btn.id = "productBackBtn";
  btn.type = "button";
  btn.textContent = "← Back";
  btn.className = "za-outline-btn";
  btn.style.cssText = "position:absolute;top:18px;left:18px;z-index:5;";
  btn.addEventListener("click", () => closeOverlay("productModal"));

  modal.appendChild(btn);
}
function openWhatsAppSupport() {
  const text = encodeURIComponent("Hi Zaidify Collections, I need help with my order/query.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
}

function openEmail(subject, body) {
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function switchAuthTab(type) {
  const login = type === "login";
  $("loginTabBtn")?.classList.toggle("active", login);
  $("signupTabBtn")?.classList.toggle("active", !login);
  $("loginForm")?.classList.toggle("hidden", !login);
  $("signupForm")?.classList.toggle("hidden", login);
}

function setupOverlayClose() {
  qsa(".overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeOverlay(overlay.id);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") qsa(".overlay.open, .admin-overlay.open").forEach(o => closeOverlay(o.id));
  });
}

function openOverlay(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeOverlay(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("open");
  el.classList.add("hidden");
  document.body.style.overflow = "";
}

function clearFilters() {
  if ($("searchInput")) $("searchInput").value = "";
  if ($("mobileSearchInput")) $("mobileSearchInput").value = "";
  if ($("categoryFilter")) $("categoryFilter").value = "all";
  if ($("sizeFilter")) $("sizeFilter").value = "all";
  if ($("priceFilter")) $("priceFilter").value = "all";
  if ($("sortFilter")) $("sortFilter").value = "popular";

  qsa(".category-tile").forEach(b => b.classList.remove("active"));
  qsa(".category-tile[data-category='all']")[0]?.classList.add("active");

  renderAll();
}

function updateBadges() {
  setText("cartBadge", state.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0));
  setText("wishlistBadge", state.wishlist.length);
}

function saveCart() {
  localStorage.setItem("zc_cart", JSON.stringify(state.cart));
}

function saveWishlist() {
  localStorage.setItem("zc_wishlist", JSON.stringify(state.wishlist));
}

function splitList(value) {
  return String(value || "").split(",").map(cleanText).filter(Boolean);
}

function splitLines(value) {
  return String(value || "").split(/\n/).map(cleanText).filter(Boolean);
}

function parseVariants(value) {
  const text = cleanText(value);
  if (!text) return [];

  try {
    return normalizeVariants(JSON.parse(text));
  } catch {
    toast("Variants JSON invalid. Saved without variants.", true);
    return [];
  }
}

function safeImg(url) {
  const clean = cleanText(url);
  return isRealImage(clean) ? clean : "logo.png";
}

function isRealImage(url) {
  if (!url || url === "null" || url === "undefined") return false;
  if (url === "logo.png") return true;
  return /^https?:\/\//i.test(url) || /^\.?\//.test(url) || /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function toast(message, isError = false) {
  const box = $("toast");
  if (!box) return alert(message);

  box.textContent = message;
  box.className = "toast";
  if (isError) box.classList.add("err");

  requestAnimationFrame(() => box.classList.add("show"));

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove("show"), 2400);
}

function safeJSON(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, c => c.toUpperCase());
}

function scrollToProducts() {
  $("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncSearchInputs(sourceId) {
  const source = $(sourceId);
  if (!source) return;

  if (sourceId === "searchInput" && $("mobileSearchInput")) $("mobileSearchInput").value = source.value;
  if (sourceId === "mobileSearchInput" && $("searchInput")) $("searchInput").value = source.value;
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
