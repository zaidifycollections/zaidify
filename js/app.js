/* =========================
   ZAIDIFY COLLECTIONS V4
   ONE FILE APP.JS
========================= */

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

const $ = (id) => document.getElementById(id);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", async () => {
  ensureAccountOverlay();
  bindEvents();
  setupOverlayClose();

  await checkAuth();
  await loadProducts();

  renderAll();
  updateBadges();
});

/* =========================
   AUTH
========================= */

async function checkAuth() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.warn("Auth check error:", error.message);
  }

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

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    return toast("Invalid login credentials", true);
  }

  currentUser = data.user;
  updateAuthUI();
  closeOverlay("loginOverlay");
  toast("Logged in successfully");
}

async function signupUser(e) {
  e.preventDefault();

  const email = $("signupEmail")?.value.trim().toLowerCase();
  const password = $("signupPassword")?.value.trim();

  if (!email || !password) return toast("Enter email and password", true);

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error(error);
    return toast(error.message, true);
  }

  toast("Signup successful. Check email if confirmation is required.");
  switchAuthTab("login");
}

async function googleLogin() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    console.error(error);
    toast("Google login failed", true);
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
  closeOverlay("adminOverlay");
  closeOverlay("accountOverlay");
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

  const accountEmail = $("accountEmail");
  if (accountEmail) accountEmail.textContent = currentUser?.email || "Not logged in";
}

/* =========================
   PRODUCTS / SUPABASE
========================= */

async function loadProducts() {
  showLoading();

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product load error:", error);
    products = [];
    toast("Products failed to load", true);
    renderAll();
    return;
  }

  products = (data || []).map(normalizeProduct).filter(Boolean);
}

function normalizeProduct(p) {
  const columnImages = [
    p.image_1,
    p.image_2,
    p.image_3,
    p.image_4,
    p.image_5,
    p.image_6,
    p.image_7,
    p.image_8,
    p.image_9,
    p.image_10
  ]
    .map(cleanText)
    .filter(isRealImage);

  const jsonImages = normalizeImagesField(p.images);
  const finalImages = columnImages.length
    ? columnImages
    : jsonImages.length
      ? jsonImages
      : ["logo.png"];

  const variants = normalizeVariants(p.variants);

  const price = Number(
    p.price ||
    p.std ||
    p.std_price ||
    p.standard_price ||
    p.price_std ||
    p.price_s ||
    p.price_m ||
    p.price_l ||
    0
  );

  return {
    id: p.id,
    ref: cleanText(p.ref || p.product_id || p.sku || p.id),
    name: cleanText(p.name || p.product_name || "Product"),
    category: cleanText(p.category || "women").toLowerCase(),
    price,
    oldPrice: Number(p.old_price || p.oldPrice || p.mrp || 0),
    stock: Number(p.stock || p.quantity || 0),
    sizes: normalizeList(p.sizes),
    colors: normalizeList(p.colors),
    images: finalImages,
    variants,
    description: cleanText(p.description || ""),
    badge: cleanText(p.badge || "NEW"),
    rating: Number(p.rating || 5),
    created_at: p.created_at || ""
  };
}

function normalizeImagesField(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(cleanText).filter(isRealImage);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(cleanText).filter(isRealImage);
      }
    } catch {}

    return trimmed
      .split(/[\n,]/)
      .map(cleanText)
      .filter(isRealImage);
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
    .map((v) => ({
      color: cleanText(v.color),
      images: normalizeImagesField(v.images)
    }))
    .filter((v) => v.color && v.images.length);
}

function normalizeList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(cleanText).filter(Boolean);
      }
    } catch {}

    return value.split(",").map(cleanText).filter(Boolean);
  }

  return [];
}

function getFilteredProducts() {
  const search = (
    $("searchInput")?.value ||
    $("mobileSearchInput")?.value ||
    ""
  ).toLowerCase().trim();

  const category = $("categoryFilter")?.value || "all";
  const size = $("sizeFilter")?.value || "all";
  const price = $("priceFilter")?.value || "all";
  const sort = $("sortFilter")?.value || "popular";

  let list = products.filter((p) => {
    const text = `${p.name} ${p.ref} ${p.category} ${p.description} ${p.colors.join(" ")} ${p.sizes.join(" ")}`.toLowerCase();

    const matchSearch = !search || text.includes(search);

    const matchCategory =
      category === "all" ||
      p.category === category ||
      (category === "women" && ["women", "kurti", "sets", "coords"].includes(p.category));

    const matchSize = size === "all" || p.sizes.includes(size);

    let matchPrice = true;
    if (price !== "all" && price.includes("-")) {
      const [min, max] = price.split("-").map(Number);
      matchPrice = Number(p.price) >= min && Number(p.price) <= max;
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

  if ($("resultCount")) {
    $("resultCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"} found`;
  }

  updateBadges();
}

function renderProducts(containerId, list) {
  const box = $(containerId);
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty-state">No products found</div>`;
    return;
  }

  box.innerHTML = list.map((p) => {
    const img = safeImg(p.images[0]);

    return `
      <article class="product-card" data-id="${escapeAttr(p.id)}">
        <div class="product-card-img-wrap">
          <img class="product-card-img" src="${escapeAttr(img)}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.src='logo.png'">
          <span class="product-badge">${escapeHTML(p.badge)}</span>
        </div>

        <div class="product-card-body">
          <div class="product-card-title">${escapeHTML(p.name)}</div>

          <div class="product-card-price">
            <span class="price-now">₹${Number(p.price || 0)}</span>
            ${p.oldPrice ? `<span class="price-old">₹${Number(p.oldPrice)}</span>` : ""}
          </div>

          <div class="card-rating">★★★★★ <span class="rev-count">${Number(p.rating || 5)}</span></div>

          <div class="product-card-actions">
            <button class="view-product-btn" data-view="${escapeAttr(p.id)}" type="button">VIEW</button>
            <button class="quick-wishlist-btn" data-wish="${escapeAttr(p.id)}" type="button">${isWishlisted(p.id) ? "♥" : "♡"}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  box.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openProduct(btn.dataset.view);
    });
  });

  box.querySelectorAll("[data-wish]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const product = products.find((p) => String(p.id) === String(btn.dataset.wish));
      toggleWishlist(product);
      renderAll();
    });
  });

  box.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => openProduct(card.dataset.id));
  });
}

function showLoading() {
  ["featuredProducts", "popularProducts", "productsGrid"].forEach((id) => {
    const box = $(id);
    if (box) box.innerHTML = `<div class="loading-products">Loading products...</div>`;
  });
}

/* =========================
   PRODUCT MODAL
========================= */

function openProduct(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.variants?.[0]?.color || product.colors?.[0] || "";

  setText("modalProductRef", product.ref);
  setText("modalProductName", product.name);
  setText("modalProductPrice", `₹${Number(product.price || 0)}`);
  setText("modalOldPrice", product.oldPrice ? `₹${Number(product.oldPrice)}` : "");
  setText("modalReviewCount", `${Number(product.rating || 5)} rating`);
  setText("modalProductDesc", product.description || "Premium product from Zaidify Collections.");

  renderProductImages(getImagesForColor(product, selectedColor));
  renderSizeOptions(product.sizes);
  renderColorOptions(product);
  updateModalWishlistBtn();

  openOverlay("productModal");
}

function getImagesForColor(product, color) {
  const variant = product.variants?.find(
    (v) => String(v.color).toLowerCase() === String(color).toLowerCase()
  );

  if (variant?.images?.length) return variant.images;

  return product.images?.length ? product.images : ["logo.png"];
}

function renderProductImages(images) {
  const finalImages = images?.length ? images.map(safeImg) : ["logo.png"];

  if ($("modalProductImage")) {
    $("modalProductImage").src = finalImages[0];
  }

  if (!$("modalThumbs")) return;

  $("modalThumbs").innerHTML = finalImages.map((img, index) => `
    <img src="${escapeAttr(img)}" alt="Product thumbnail ${index + 1}" class="${index === 0 ? "active" : ""}" onerror="this.src='logo.png'">
  `).join("");

  $("modalThumbs").querySelectorAll("img").forEach((img) => {
    img.addEventListener("click", () => {
      $("modalProductImage").src = img.src;
      $("modalThumbs").querySelectorAll("img").forEach((x) => x.classList.remove("active"));
      img.classList.add("active");
    });
  });
}

function renderSizeOptions(sizes) {
  const box = $("modalSizeOptions");
  if (!box) return;

  const finalSizes = sizes?.length ? sizes : ["Free Size"];

  box.innerHTML = finalSizes.map((size) => `
    <button class="option-btn" data-size="${escapeAttr(size)}" type="button">${escapeHTML(size)}</button>
  `).join("");

  box.querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedSize = btn.dataset.size;
      box.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function renderColorOptions(product) {
  const box = $("modalColorOptions");
  if (!box) return;

  const colors = product.variants?.length
    ? product.variants.map((v) => v.color).filter(Boolean)
    : product.colors;

  const finalColors = colors?.length ? colors : ["Default"];

  if (!selectedColor) selectedColor = finalColors[0];

  box.innerHTML = finalColors.map((color) => `
    <button class="option-btn ${String(color).toLowerCase() === String(selectedColor).toLowerCase() ? "active" : ""}" data-color="${escapeAttr(color)}" type="button">${escapeHTML(color)}</button>
  `).join("");

  box.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      box.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderProductImages(getImagesForColor(product, selectedColor));
    });
  });
}

function updateModalWishlistBtn() {
  if (!$("modalWishlistBtn") || !selectedProduct) return;
  $("modalWishlistBtn").textContent = isWishlisted(selectedProduct.id) ? "♥ WISHLISTED" : "♡ WISHLIST";
}

/* =========================
   CART
========================= */

function addSelectedToCart(openCartAfter = false) {
  if (!selectedProduct) return;
  if (!selectedSize) return toast("Select size first", true);

  const color = selectedColor || "Default";
  const image = safeImg(getImagesForColor(selectedProduct, color)[0]);
  const key = `${selectedProduct.id}-${selectedSize}-${color}`;

  const existing = state.cart.find((item) => item.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      key,
      id: selectedProduct.id,
      ref: selectedProduct.ref,
      name: selectedProduct.name,
      price: Number(selectedProduct.price || 0),
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

  box.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <img src="${escapeAttr(safeImg(item.image))}" alt="${escapeAttr(item.name)}" onerror="this.src='logo.png'">

      <div>
        <div class="cart-item-title">${escapeHTML(item.name)}</div>
        <div class="cart-item-meta">${escapeHTML(item.size)} / ${escapeHTML(item.color)}</div>
        <div class="cart-item-price">₹${Number(item.price)} × ${Number(item.qty)}</div>
      </div>

      <button class="remove-btn" data-remove-cart="${escapeAttr(item.key)}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cart = state.cart.filter((item) => item.key !== btn.dataset.removeCart);
      saveCart();
      renderCart();
      updateBadges();
    });
  });

  const total = state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  setText("cartTotal", `₹${total}`);
}

/* =========================
   WISHLIST
========================= */

function toggleWishlist(product) {
  if (!product) return;

  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter((item) => String(item.id) !== String(product.id));
    toast("Removed from wishlist");
  } else {
    state.wishlist.push({
      id: product.id,
      ref: product.ref,
      name: product.name,
      price: Number(product.price || 0),
      image: safeImg(product.images[0])
    });
    toast("Added to wishlist");
  }

  saveWishlist();
  updateBadges();
}

function isWishlisted(id) {
  return state.wishlist.some((item) => String(item.id) === String(id));
}

function renderWishlist() {
  const box = $("wishlistItems");
  if (!box) return;

  if (!state.wishlist.length) {
    box.innerHTML = `<div class="empty-state">Your wishlist is empty</div>`;
    return;
  }

  box.innerHTML = state.wishlist.map((item) => `
    <div class="wishlist-item">
      <img src="${escapeAttr(safeImg(item.image))}" alt="${escapeAttr(item.name)}" onerror="this.src='logo.png'">

      <div>
        <div class="wishlist-item-title">${escapeHTML(item.name)}</div>
        <div class="wishlist-item-price">₹${Number(item.price)}</div>
        <button class="view-product-btn" data-open-wish="${escapeAttr(item.id)}" type="button">VIEW</button>
      </div>

      <button class="remove-btn" data-remove-wish="${escapeAttr(item.id)}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.wishlist = state.wishlist.filter((item) => String(item.id) !== String(btn.dataset.removeWish));
      saveWishlist();
      renderWishlist();
      renderAll();
      updateBadges();
    });
  });

  box.querySelectorAll("[data-open-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeOverlay("wishlistOverlay");
      openProduct(btn.dataset.openWish);
    });
  });
}

/* =========================
   ADMIN
========================= */

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

  boxes.forEach((box) => {
    if (!products.length) {
      box.innerHTML = `<div class="za-empty-box">No products found.</div>`;
      return;
    }

    box.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Ref</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Sizes</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p) => `
              <tr>
                <td>
                  <img src="${escapeAttr(safeImg(p.images[0]))}" style="width:48px;height:48px;object-fit:cover;border-radius:10px;" onerror="this.src='logo.png'">
                </td>
                <td>${escapeHTML(p.ref)}</td>
                <td>${escapeHTML(p.name)}</td>
                <td>${escapeHTML(p.category)}</td>
                <td>₹${Number(p.price)}</td>
                <td>${Number(p.stock)}</td>
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

  if (!products.length) {
    box.innerHTML = `<div class="za-empty-box">No inventory found.</div>`;
    return;
  }

  box.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Product</th>
            <th>Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${products.map((p) => `
            <tr>
              <td>${escapeHTML(p.ref)}</td>
              <td>${escapeHTML(p.name)}</td>
              <td>${Number(p.stock)}</td>
              <td>${Number(p.stock) <= 5 ? "Low Stock" : "In Stock"}</td>
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
    price: Number($("ap-price")?.value || 0),
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
  if (!product.price) return toast("Product price required", true);

  const { error } = await supabaseClient.from("products").insert(product);

  if (error) {
    console.error("Product save failed:", error);
    return toast(`Product save failed: ${error.message}`, true);
  }

  toast("Product saved successfully");

  $("adminProductForm")?.reset();

  await loadProducts();
  renderAll();
  renderAdmin();
  openAdminPage("products");
}

function openAdminPage(page) {
  if (!page) return;

  qsa(".za-admin-nav").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminPage === page);
  });

  qsa(".za-admin-page").forEach((section) => {
    section.classList.remove("active");
  });

  const target = $(`admin-${page}`);
  if (target) target.classList.add("active");

  setText("adminPageTitle", titleCase(page.replace("-", " ")));
}

/* =========================
   ACCOUNT / HELP CENTRE
========================= */

function ensureAccountOverlay() {
  if ($("accountOverlay")) return;

  const html = `
    <div id="accountOverlay" class="overlay hidden">
      <div class="modal auth-modal">
        <button id="closeAccountBtn" class="close-btn" type="button">×</button>

        <h2>My Account</h2>
        <p style="text-align:center;color:rgba(255,255,255,0.65);margin-bottom:18px;" id="accountEmail">Not logged in</p>

        <div class="account-help-list" style="display:grid;gap:12px;">
          <button class="main-btn purple" id="helpWhatsappBtn" type="button">WhatsApp Support</button>
          <button class="main-btn" id="helpEmailSupportBtn" type="button">Email Support</button>
          <button class="main-btn" id="helpReturnsBtn" type="button">Returns & Refunds</button>
          <button class="main-btn" id="helpShippingBtn" type="button">Shipping Help</button>
          <button class="main-btn" id="accountLogoutBtn" type="button">Logout</button>
        </div>

        <p style="margin-top:18px;color:rgba(255,255,255,0.55);font-size:13px;line-height:1.6;">
          WhatsApp is only for customer support/help centre. Orders should be placed through website cart/checkout.
        </p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);
}

function openWhatsAppSupport() {
  const text = encodeURIComponent("Hi Zaidify Collections, I need help with my order/query.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
}

function openEmail(subject, body) {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  $("loginForm")?.addEventListener("submit", loginUser);
  $("signupForm")?.addEventListener("submit", signupUser);
  $("googleLoginBtn")?.addEventListener("click", googleLogin);

  $("loginBtn")?.addEventListener("click", () => openOverlay("loginOverlay"));

  $("accountBtn")?.addEventListener("click", () => {
    if (!currentUser) return openOverlay("loginOverlay");
    updateAuthUI();
    openOverlay("accountOverlay");
  });

  $("closeAccountBtn")?.addEventListener("click", () => closeOverlay("accountOverlay"));
  $("accountLogoutBtn")?.addEventListener("click", logoutUser);

  $("helpWhatsappBtn")?.addEventListener("click", openWhatsAppSupport);
  $("helpEmailSupportBtn")?.addEventListener("click", () => openEmail(
    "Support Request - Zaidify Collections",
    "Hi Zaidify Collections,\n\nI need help with:\n\n"
  ));
  $("helpReturnsBtn")?.addEventListener("click", () => openEmail(
    "Returns / Refund Request - Zaidify Collections",
    "Hi Zaidify Collections,\n\nI need help with a return/refund.\n\nOrder details:\nReason:\n\n"
  ));
  $("helpShippingBtn")?.addEventListener("click", () => openEmail(
    "Shipping Help - Zaidify Collections",
    "Hi Zaidify Collections,\n\nI need help with shipping/tracking.\n\nOrder details:\n\n"
  ));

  $("cartBtn")?.addEventListener("click", () => {
    renderCart();
    openOverlay("cartOverlay");
  });

  $("wishlistBtn")?.addEventListener("click", () => {
    renderWishlist();
    openOverlay("wishlistOverlay");
  });

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

  qsa(".za-admin-nav").forEach((btn) => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminPage));
  });

  qsa("[data-admin-go]").forEach((btn) => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminGo));
  });

  $("adminProductForm")?.addEventListener("submit", saveAdminProduct);

  qsa(".category-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("inactive")) return toast("Coming soon");

      qsa(".category-tile").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if ($("categoryFilter")) $("categoryFilter").value = btn.dataset.category || "all";

      renderAll();
      scrollToProducts();
    });
  });

  ["categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach((id) => {
    $(id)?.addEventListener("change", () => {
      renderAll();
      scrollToProducts(false);
    });
  });

  ["searchInput", "mobileSearchInput"].forEach((id) => {
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

function setupOverlayClose() {
  qsa(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeOverlay(overlay.id);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      qsa(".overlay.open, .admin-overlay.open").forEach((overlay) => {
        closeOverlay(overlay.id);
      });
    }
  });
}

/* =========================
   HELPERS
========================= */

function switchAuthTab(type) {
  const login = type === "login";

  $("loginTabBtn")?.classList.toggle("active", login);
  $("signupTabBtn")?.classList.toggle("active", !login);
  $("loginForm")?.classList.toggle("hidden", !login);
  $("signupForm")?.classList.toggle("hidden", login);
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

  qsa(".category-tile").forEach((b) => b.classList.remove("active"));
  qsa(".category-tile[data-category='all']")[0]?.classList.add("active");

  renderAll();
  scrollToProducts(false);
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
  return String(value || "")
    .split(",")
    .map(cleanText)
    .filter(Boolean);
}

function splitLines(value) {
  return String(value || "")
    .split(/\n/)
    .map(cleanText)
    .filter(Boolean);
}

function parseVariants(value) {
  const text = cleanText(value);
  if (!text) return [];

  try {
    return normalizeVariants(JSON.parse(text));
  } catch {
    toast("Variants JSON invalid. Product saved without variants.", true);
    return [];
  }
}

function safeImg(url) {
  const clean = cleanText(url);
  return isRealImage(clean) ? clean : "logo.png";
}

function isRealImage(url) {
  if (!url) return false;
  if (url === "null" || url === "undefined") return false;
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
  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.className = "toast";
  if (isError) box.classList.add("err");

  requestAnimationFrame(() => box.classList.add("show"));

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    box.classList.remove("show");
  }, 2400);
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
  return String(value || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

function scrollToProducts(smooth = true) {
  $("products")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

function syncSearchInputs(sourceId) {
  const source = $(sourceId);
  if (!source) return;

  if (sourceId === "searchInput" && $("mobileSearchInput")) {
    $("mobileSearchInput").value = source.value;
  }

  if (sourceId === "mobileSearchInput" && $("searchInput")) {
    $("searchInput").value = source.value;
  }
}

function debounce(fn, delay = 200) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
