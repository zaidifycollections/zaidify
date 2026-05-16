const SUPABASE_URL = "https://ipwlhlsxtlfqioysyzlc.supabase.co";
const SUPABASE_KEY = "sb_publishable__u9RyOYFvdQ3A-kPQPPO3A_BLjsOHds";
const ADMIN_EMAIL = "zaidifycollections@gmail.com";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let selectedProduct = null;
let selectedSize = "";
let selectedColor = "";
let currentUser = null;

const state = {
  cart: JSON.parse(localStorage.getItem("zc_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("zc_wishlist") || "[]")
};

const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
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

  if (!email || !password) return toast("Enter email and password");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    return toast("Invalid login credentials");
  }

  currentUser = data.user;
  updateAuthUI();
  closeOverlay("loginOverlay");
  toast("Logged in");
}

async function signupUser(e) {
  e.preventDefault();

  const email = $("signupEmail")?.value.trim().toLowerCase();
  const password = $("signupPassword")?.value.trim();

  if (!email || !password) return toast("Enter email and password");

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error(error);
    return toast(error.message);
  }

  toast("Signup successful. Login now.");
  switchAuthTab("login");
}

async function googleLogin() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href
    }
  });

  if (error) {
    console.error(error);
    toast("Google login failed");
  }
}

function isAdmin() {
  return currentUser?.email === ADMIN_EMAIL;
}

function updateAuthUI() {
  const loggedIn = Boolean(currentUser);

  $("loginBtn")?.classList.toggle("hidden", loggedIn);
  $("accountBtn")?.classList.toggle("hidden", !loggedIn);
  $("adminBtn")?.classList.toggle("hidden", !isAdmin());
}

/* PRODUCTS */
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product load error:", error);
    products = [];
    return toast("Products failed to load");
  }

  products = (data || []).map(normalizeProduct);
}

function normalizeProduct(p) {
  const imagesFromColumns = [
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
  ].filter(Boolean);

  const jsonImages = Array.isArray(p.images) ? p.images : [];

  const price =
    Number(
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
    ref: p.ref || p.product_id || p.id,
    name: p.name || p.product_name || "Product",
    category: String(p.category || "women").toLowerCase(),
    price,
    oldPrice: Number(p.old_price || p.mrp || p.oldPrice || 0),
    stock: Number(p.stock || 0),
    sizes: normalizeList(p.sizes),
    colors: normalizeList(p.colors),
    images: imagesFromColumns.length ? imagesFromColumns : jsonImages.length ? jsonImages : ["logo.png"],
    variants: Array.isArray(p.variants) ? p.variants : [],
    description: p.description || "",
    badge: p.badge || "NEW",
    rating: Number(p.rating || 5)
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function getFilteredProducts() {
  const search =
    ($("searchInput")?.value ||
      $("mobileSearchInput")?.value ||
      "").toLowerCase().trim();

  const category = $("categoryFilter")?.value || "all";
  const size = $("sizeFilter")?.value || "all";
  const price = $("priceFilter")?.value || "all";
  const sort = $("sortFilter")?.value || "popular";

  let list = products.filter(p => {
    const text = `${p.name} ${p.ref} ${p.category} ${p.description}`.toLowerCase();

    const matchSearch = !search || text.includes(search);
    const matchCategory =
      category === "all" ||
      p.category === category ||
      (category === "women" && ["women", "kurti", "sets", "coords"].includes(p.category));

    const matchSize = size === "all" || p.sizes.includes(size);

    let matchPrice = true;
    if (price !== "all" && price.includes("-")) {
      const [min, max] = price.split("-").map(Number);
      matchPrice = p.price >= min && p.price <= max;
    }

    return matchSearch && matchCategory && matchSize && matchPrice;
  });

  if (sort === "low-high") list.sort((a, b) => a.price - b.price);
  if (sort === "high-low") list.sort((a, b) => b.price - a.price);
  if (sort === "popular") list.sort((a, b) => b.rating - a.rating);

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

  box.innerHTML = list.map(p => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-card-img-wrap">
        <img class="product-card-img" src="${safeImg(p.images[0])}" alt="${escapeHTML(p.name)}" onerror="this.src='logo.png'">
        <span class="product-badge">${escapeHTML(p.badge)}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${escapeHTML(p.name)}</div>

        <div class="product-card-price">
          <span class="price-now">₹${p.price}</span>
          ${p.oldPrice ? `<span class="price-old">₹${p.oldPrice}</span>` : ""}
        </div>

        <div class="card-rating">★★★★★ <span class="rev-count">${p.rating}</span></div>

        <div class="product-card-actions">
          <button class="view-product-btn" data-view="${p.id}" type="button">VIEW</button>
          <button class="quick-wishlist-btn" data-wish="${p.id}" type="button">${isWishlisted(p.id) ? "♥" : "♡"}</button>
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

/* PRODUCT MODAL */
function openProduct(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.variants?.[0]?.color || product.colors?.[0] || "";

  const images = getImagesForColor(product, selectedColor);
  renderProductImages(images);

  setText("modalProductName", product.name);
  setText("modalProductRef", product.ref);
  setText("modalProductPrice", `₹${product.price}`);
  setText("modalOldPrice", product.oldPrice ? `₹${product.oldPrice}` : "");
  setText("modalProductDesc", product.description);
  setText("modalReviewCount", `${product.rating} rating`);

  renderSizeOptions(product.sizes);
  renderColorOptions(product);
  updateModalWishlistBtn();

  openOverlay("productModal");
}

function getImagesForColor(product, color) {
  const variant = product.variants?.find(v =>
    String(v.color || "").toLowerCase() === String(color || "").toLowerCase()
  );

  if (variant?.images?.length) return variant.images;
  return product.images?.length ? product.images : ["logo.png"];
}

function renderProductImages(images) {
  const finalImages = images?.length ? images : ["logo.png"];

  if ($("modalProductImage")) {
    $("modalProductImage").src = safeImg(finalImages[0]);
  }

  if ($("modalThumbs")) {
    $("modalThumbs").innerHTML = finalImages.map((img, i) => `
      <img src="${safeImg(img)}" class="${i === 0 ? "active" : ""}" onerror="this.src='logo.png'">
    `).join("");

    $("modalThumbs").querySelectorAll("img").forEach(img => {
      img.addEventListener("click", () => {
        $("modalProductImage").src = img.src;
        $("modalThumbs").querySelectorAll("img").forEach(x => x.classList.remove("active"));
        img.classList.add("active");
      });
    });
  }
}

function renderSizeOptions(sizes) {
  if (!$("modalSizeOptions")) return;

  $("modalSizeOptions").innerHTML = sizes.map(size => `
    <button class="option-btn" data-size="${escapeHTML(size)}" type="button">${escapeHTML(size)}</button>
  `).join("");

  $("modalSizeOptions").querySelectorAll("[data-size]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedSize = btn.dataset.size;
      $("modalSizeOptions").querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function renderColorOptions(product) {
  if (!$("modalColorOptions")) return;

  const colors = product.variants?.length
    ? product.variants.map(v => v.color).filter(Boolean)
    : product.colors;

  $("modalColorOptions").innerHTML = colors.map(color => `
    <button class="option-btn ${color === selectedColor ? "active" : ""}" data-color="${escapeHTML(color)}" type="button">${escapeHTML(color)}</button>
  `).join("");

  $("modalColorOptions").querySelectorAll("[data-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      $("modalColorOptions").querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProductImages(getImagesForColor(product, selectedColor));
    });
  });
}

/* CART */
function addSelectedToCart(openAfter) {
  if (!selectedProduct) return;
  if (!selectedSize) return toast("Select size first");

  const image = getImagesForColor(selectedProduct, selectedColor)[0] || "logo.png";
  const key = `${selectedProduct.id}-${selectedSize}-${selectedColor}`;
  const existing = state.cart.find(i => i.key === key);

  if (existing) existing.qty += 1;
  else {
    state.cart.push({
      key,
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image,
      size: selectedSize,
      color: selectedColor,
      qty: 1
    });
  }

  saveCart();
  updateBadges();
  renderCart();
  toast("Added to cart");

  if (openAfter) {
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
      <img src="${safeImg(item.image)}" onerror="this.src='logo.png'">
      <div>
        <div class="cart-item-title">${escapeHTML(item.name)}</div>
        <div class="cart-item-meta">${escapeHTML(item.size)} / ${escapeHTML(item.color)}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty}</div>
      </div>
      <button class="remove-btn" data-remove="${item.key}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.cart = state.cart.filter(i => i.key !== btn.dataset.remove);
      saveCart();
      renderCart();
      updateBadges();
    });
  });

  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  setText("cartTotal", `₹${total}`);
}

/* WISHLIST */
function toggleWishlist(product) {
  if (!product) return;

  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter(i => String(i.id) !== String(product.id));
    toast("Removed from wishlist");
  } else {
    state.wishlist.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]
    });
    toast("Added to wishlist");
  }

  saveWishlist();
  updateBadges();
}

function isWishlisted(id) {
  return state.wishlist.some(i => String(i.id) === String(id));
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
      <img src="${safeImg(item.image)}" onerror="this.src='logo.png'">
      <div>
        <div class="wishlist-item-title">${escapeHTML(item.name)}</div>
        <div class="wishlist-item-price">₹${item.price}</div>
      </div>
      <button class="remove-btn" data-remove-wish="${item.id}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-wish]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.wishlist = state.wishlist.filter(i => String(i.id) !== String(btn.dataset.removeWish));
      saveWishlist();
      renderWishlist();
      renderAll();
    });
  });
}

/* ADMIN */
function renderAdmin() {
  setText("statProducts", products.length);
  setText("statOrders", "0");
  setText("statRevenue", "₹0");
  setText("statCustomers", "0");
  setText("statLowStock", products.filter(p => p.stock <= 5).length);

  renderAdminProducts();
  renderAdminInventory();
}

function renderAdminProducts() {
  const boxes = [$("adminProductsTable"), $("adminProductsOverview")].filter(Boolean);

  boxes.forEach(box => {
    box.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Image</th><th>Ref</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Sizes</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td><img src="${safeImg(p.images[0])}" style="width:48px;height:48px;object-fit:cover;border-radius:10px" onerror="this.src='logo.png'"></td>
              <td>${escapeHTML(p.ref)}</td>
              <td>${escapeHTML(p.name)}</td>
              <td>${escapeHTML(p.category)}</td>
              <td>₹${p.price}</td>
              <td>${p.stock}</td>
              <td>${p.sizes.join(", ")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  });
}

function renderAdminInventory() {
  const box = $("adminInventoryTable");
  if (!box) return;

  box.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Ref</th><th>Product</th><th>Stock</th><th>Status</th></tr>
      </thead>
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
  `;
}

async function saveAdminProduct(e) {
  e.preventDefault();

  if (!isAdmin()) return toast("Only admin can save products");

  const images = splitLines($("ap-images")?.value);

  const product = {
    ref: $("ap-id")?.value.trim(),
    name: $("ap-name")?.value.trim(),
    category: $("ap-category")?.value,
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
    variants: parseVariants($("ap-variants")?.value),
    description: $("ap-description")?.value.trim(),
    badge: $("ap-badge")?.value.trim() || "NEW",
    is_active: $("ap-active")?.value === "true"
  };

  if (!product.ref || !product.name) return toast("Product ref and name required");

  const { error } = await supabaseClient.from("products").insert(product);

  if (error) {
    console.error(error);
    return toast("Product save failed");
  }

  toast("Product saved");
  await loadProducts();
  renderAll();
  renderAdmin();
  openAdminPage("products");
}

function openAdminPage(page) {
  if (!page) return;

  qsa(".za-admin-nav, .admin-nav").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.adminPage === page);
  });

  qsa(".za-admin-page, .admin-page").forEach(section => {
    section.classList.remove("active");
  });

  const target = $(`admin-${page}`);
  if (target) target.classList.add("active");

  setText("adminPageTitle", page.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase()));
}

/* EVENTS */
function bindEvents() {
  $("loginForm")?.addEventListener("submit", loginUser);
  $("signupForm")?.addEventListener("submit", signupUser);
  $("googleLoginBtn")?.addEventListener("click", googleLogin);

  $("loginBtn")?.addEventListener("click", () => openOverlay("loginOverlay"));
  $("cartBtn")?.addEventListener("click", () => { renderCart(); openOverlay("cartOverlay"); });
  $("wishlistBtn")?.addEventListener("click", () => { renderWishlist(); openOverlay("wishlistOverlay"); });

  $("closeCartBtn")?.addEventListener("click", () => closeOverlay("cartOverlay"));
  $("closeWishlistBtn")?.addEventListener("click", () => closeOverlay("wishlistOverlay"));
  $("closeLoginBtn")?.addEventListener("click", () => closeOverlay("loginOverlay"));
  $("closeProductModal")?.addEventListener("click", () => closeOverlay("productModal"));

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
    if (!isAdmin()) return toast("Admin access denied");
    renderAdmin();
    openOverlay("adminOverlay");
  });

  $("adminLogoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    updateAuthUI();
    closeOverlay("adminOverlay");
  });

  $("backToStoreBtn")?.addEventListener("click", () => closeOverlay("adminOverlay"));

  qsa(".za-admin-nav, .admin-nav").forEach(btn => {
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
      $("products")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  ["searchInput", "mobileSearchInput", "categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach(id => {
    $(id)?.addEventListener("input", renderAll);
    $(id)?.addEventListener("change", renderAll);
  });

  $("searchBtn")?.addEventListener("click", () => {
    renderAll();
    $("products")?.scrollIntoView({ behavior: "smooth" });
  });

  $("mobileSearchBtn")?.addEventListener("click", () => {
    if ($("searchInput") && $("mobileSearchInput")) $("searchInput").value = $("mobileSearchInput").value;
    renderAll();
    $("products")?.scrollIntoView({ behavior: "smooth" });
  });

  $("clearFiltersBtn")?.addEventListener("click", clearFilters);
}

/* HELPERS */
function switchAuthTab(type) {
  const isLogin = type === "login";
  $("loginTabBtn")?.classList.toggle("active", isLogin);
  $("signupTabBtn")?.classList.toggle("active", !isLogin);
  $("loginForm")?.classList.toggle("hidden", !isLogin);
  $("signupForm")?.classList.toggle("hidden", isLogin);
}

function updateModalWishlistBtn() {
  if (!$("modalWishlistBtn") || !selectedProduct) return;
  $("modalWishlistBtn").textContent = isWishlisted(selectedProduct.id) ? "♥ WISHLISTED" : "♡ WISHLIST";
}

function clearFilters() {
  if ($("searchInput")) $("searchInput").value = "";
  if ($("mobileSearchInput")) $("mobileSearchInput").value = "";
  if ($("categoryFilter")) $("categoryFilter").value = "all";
  if ($("sizeFilter")) $("sizeFilter").value = "all";
  if ($("priceFilter")) $("priceFilter").value = "all";
  if ($("sortFilter")) $("sortFilter").value = "popular";
  renderAll();
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

function updateBadges() {
  setText("cartBadge", state.cart.reduce((sum, item) => sum + item.qty, 0));
  setText("wishlistBadge", state.wishlist.length);
}

function saveCart() {
  localStorage.setItem("zc_cart", JSON.stringify(state.cart));
}

function saveWishlist() {
  localStorage.setItem("zc_wishlist", JSON.stringify(state.wishlist));
}

function splitList(value) {
  return String(value || "").split(",").map(x => x.trim()).filter(Boolean);
}

function splitLines(value) {
  return String(value || "").split("\n").map(x => x.trim()).filter(Boolean);
}

function parseVariants(value) {
  if (!value || !value.trim()) return [];
  try {
    return JSON.parse(value);
  } catch {
    toast("Variants JSON invalid");
    return [];
  }
}

function safeImg(url) {
  return String(url || "logo.png").trim();
}

function setText(id, text) {
  if ($(id)) $(id).textContent = text;
}

function toast(message) {
  const box = $("toast");
  if (!box) return alert(message);

  box.textContent = message;
  box.classList.add("show");

  setTimeout(() => box.classList.remove("show"), 2200);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
