const SUPABASE_URL = "https://ipwlhlsxtlfqioysyzlc.supabase.co";
const SUPABASE_KEY = "sb_publishable__u9RyOYFvdQ3A-kPQPPO3A_BLjsOHds";
const ADMIN_EMAIL = "zaidifycollections@gmail.com";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let selectedProduct = null;
let selectedSize = "";
let selectedColor = "";
let currentUser = null;

let state = {
  cart: JSON.parse(localStorage.getItem("zc_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("zc_wishlist") || "[]")
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  setupEvents();
  await checkAuth();
  await loadProducts();
  renderAll();
  updateBadges();
});

async function checkAuth() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;
  updateAuthUI();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
  });
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Products load error:", error);
    toast("Products failed to load");
    products = [];
    return;
  }

  products = (data || []).map(normalizeProduct);
}

function normalizeProduct(p) {
  const imageColumns = [
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

  const finalImages = imageColumns.length
    ? imageColumns
    : jsonImages.length
      ? jsonImages
      : ["logo.png"];

  return {
    id: p.id,
    ref: p.ref || p.id,
    name: p.name || "Product",
    category: String(p.category || "women").toLowerCase(),
    price: Number(p.price || 0),
    oldPrice: Number(p.old_price || 0),
    stock: Number(p.stock || 0),
    sizes: normalizeList(p.sizes),
    colors: normalizeList(p.colors),
    images: finalImages,
    variants: Array.isArray(p.variants) ? p.variants : [],
    description: p.description || "",
    badge: p.badge || "NEW",
    rating: Number(p.rating || 5),
    isActive: p.is_active !== false
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

function setupEvents() {
  $("cartBtn")?.addEventListener("click", () => {
    renderCart();
    openOverlay("cartOverlay");
  });

  $("wishlistBtn")?.addEventListener("click", () => {
    renderWishlist();
    openOverlay("wishlistOverlay");
  });

  $("loginBtn")?.addEventListener("click", () => openOverlay("loginOverlay"));

  $("closeCartBtn")?.addEventListener("click", () => closeOverlay("cartOverlay"));
  $("closeWishlistBtn")?.addEventListener("click", () => closeOverlay("wishlistOverlay"));
  $("closeLoginBtn")?.addEventListener("click", () => closeOverlay("loginOverlay"));
  $("closeProductModal")?.addEventListener("click", () => closeOverlay("productModal"));
  $("closePolicyBtn")?.addEventListener("click", () => closeOverlay("policyOverlay"));
  $("policyBtn")?.addEventListener("click", () => openOverlay("policyOverlay"));

  $("loginTabBtn")?.addEventListener("click", () => switchAuthTab("login"));
  $("signupTabBtn")?.addEventListener("click", () => switchAuthTab("signup"));

  $("loginForm")?.addEventListener("submit", handleLogin);
  $("signupForm")?.addEventListener("submit", handleSignup);

  $("googleLoginBtn")?.addEventListener("click", handleGoogleLogin);

  $("accountBtn")?.addEventListener("click", () => {
    toast(currentUser?.email || "Account");
  });

  $("adminBtn")?.addEventListener("click", () => {
    if (!isAdmin()) {
      toast("Admin access denied");
      return;
    }

    renderAdmin();
    openOverlay("adminOverlay");
  });

  $("backToStoreBtn")?.addEventListener("click", () => closeOverlay("adminOverlay"));

  $("adminLogoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    updateAuthUI();
    closeOverlay("adminOverlay");
    toast("Logged out");
  });

  document.querySelectorAll(".za-admin-nav").forEach((btn) => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminPage));
  });

  document.querySelectorAll("[data-admin-go]").forEach((btn) => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminGo));
  });

  $("adminProductForm")?.addEventListener("submit", handleAdminProductSave);

  document.querySelectorAll(".category-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("inactive")) {
        toast("Coming soon");
        return;
      }

      document.querySelectorAll(".category-tile").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if ($("categoryFilter")) {
        $("categoryFilter").value = btn.dataset.category || "all";
      }

      renderAll();
      $("products")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  ["searchInput", "mobileSearchInput", "categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach((id) => {
    $(id)?.addEventListener("input", renderAll);
    $(id)?.addEventListener("change", renderAll);
  });

  $("searchBtn")?.addEventListener("click", () => {
    renderAll();
    $("products")?.scrollIntoView({ behavior: "smooth" });
  });

  $("mobileSearchBtn")?.addEventListener("click", () => {
    if ($("searchInput") && $("mobileSearchInput")) {
      $("searchInput").value = $("mobileSearchInput").value;
    }

    renderAll();
    $("products")?.scrollIntoView({ behavior: "smooth" });
  });

  $("clearFiltersBtn")?.addEventListener("click", clearFilters);

  $("modalAddCartBtn")?.addEventListener("click", () => addSelectedToCart(false));
  $("modalBuyNowBtn")?.addEventListener("click", () => addSelectedToCart(true));

  $("modalWishlistBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;
    toggleWishlist(selectedProduct);
    updateModalWishlistBtn();
    renderAll();
  });

  document.querySelectorAll(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay(overlay.id);
    });
  });
}

async function handleLogin(e) {
  e.preventDefault();

  const email = $("loginEmail")?.value.trim().toLowerCase();
  const password = $("loginPassword")?.value.trim();

  if (!email || !password) {
    toast("Enter email and password");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login error:", error);
    toast("Invalid login credentials");
    return;
  }

  currentUser = data.user;
  updateAuthUI();
  closeOverlay("loginOverlay");
  toast("Logged in");
}

async function handleSignup(e) {
  e.preventDefault();

  const email = $("signupEmail")?.value.trim().toLowerCase();
  const password = $("signupPassword")?.value.trim();

  if (!email || !password) {
    toast("Enter email and password");
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error("Signup error:", error);
    toast(error.message);
    return;
  }

  toast("Signup done. Check email if needed.");
  switchAuthTab("login");
}

async function handleGoogleLogin() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href
    }
  });

  if (error) {
    console.error("Google login error:", error);
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

function getFilteredProducts() {
  const search = ($("searchInput")?.value || $("mobileSearchInput")?.value || "").trim().toLowerCase();
  const category = $("categoryFilter")?.value || "all";
  const size = $("sizeFilter")?.value || "all";
  const price = $("priceFilter")?.value || "all";
  const sort = $("sortFilter")?.value || "popular";

  let list = products.filter((p) => {
    const text = `${p.name} ${p.ref} ${p.category} ${p.description}`.toLowerCase();

    const searchOk = !search || text.includes(search);

    const categoryOk =
      category === "all" ||
      p.category === category ||
      (category === "women" && ["women", "kurti", "sets", "coords"].includes(p.category));

    const sizeOk = size === "all" || p.sizes.includes(size);

    let priceOk = true;

    if (price !== "all") {
      const [min, max] = price.split("-").map(Number);
      priceOk = p.price >= min && p.price <= max;
    }

    return searchOk && categoryOk && sizeOk && priceOk;
  });

  if (sort === "low-high") list.sort((a, b) => a.price - b.price);
  if (sort === "high-low") list.sort((a, b) => b.price - a.price);
  if (sort === "newest") list.reverse();
  if (sort === "popular") list.sort((a, b) => b.rating - a.rating);

  return list;
}

function renderProducts(containerId, list) {
  const box = $(containerId);
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty-state">No products found</div>`;
    return;
  }

  box.innerHTML = list.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-card-img-wrap">
        <img class="product-card-img" src="${safeImage(p.images[0])}" alt="${escapeHTML(p.name)}" onerror="this.src='logo.png'">
        <span class="product-badge">${escapeHTML(p.badge)}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${escapeHTML(p.name)}</div>

        <div class="product-card-price">
          <span class="price-now">₹${p.price}</span>
          <span class="price-old">${p.oldPrice ? "₹" + p.oldPrice : ""}</span>
        </div>

        <div class="card-rating">★★★★★ <span class="rev-count">${p.rating}</span></div>

        <div class="product-card-actions">
          <button class="view-product-btn" data-view="${p.id}" type="button">VIEW</button>
          <button class="quick-wishlist-btn" data-wish="${p.id}" type="button">${isWishlisted(p.id) ? "♥" : "♡"}</button>
        </div>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openProduct(btn.dataset.view);
    });
  });

  box.querySelectorAll("[data-wish]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const product = products.find((x) => String(x.id) === String(btn.dataset.wish));
      toggleWishlist(product);
      renderAll();
    });
  });

  box.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => openProduct(card.dataset.id));
  });
}

function getImagesForColor(product, color) {
  if (!product) return ["logo.png"];

  const variant = product.variants?.find((v) => {
    return String(v.color || "").toLowerCase() === String(color || "").toLowerCase();
  });

  if (variant && Array.isArray(variant.images) && variant.images.length) {
    return variant.images;
  }

  return product.images?.length ? product.images : ["logo.png"];
}

function openProduct(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.variants?.[0]?.color || product.colors?.[0] || "";

  const variantColors = product.variants?.length
    ? product.variants.map((v) => v.color).filter(Boolean)
    : product.colors;

  renderProductModalImages(getImagesForColor(product, selectedColor));

  if ($("modalProductName")) $("modalProductName").textContent = product.name;
  if ($("modalProductRef")) $("modalProductRef").textContent = product.ref;
  if ($("modalProductPrice")) $("modalProductPrice").textContent = `₹${product.price}`;
  if ($("modalOldPrice")) $("modalOldPrice").textContent = product.oldPrice ? `₹${product.oldPrice}` : "";
  if ($("modalProductDesc")) $("modalProductDesc").textContent = product.description;
  if ($("modalReviewCount")) $("modalReviewCount").textContent = `${product.rating} rating`;

  if ($("modalSizeOptions")) {
    $("modalSizeOptions").innerHTML = product.sizes.map((size) => `
      <button class="option-btn" data-size="${escapeHTML(size)}" type="button">${escapeHTML(size)}</button>
    `).join("");

    $("modalSizeOptions").querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSize = btn.dataset.size;
        $("modalSizeOptions").querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  if ($("modalColorOptions")) {
    $("modalColorOptions").innerHTML = variantColors.map((color) => `
      <button class="option-btn ${color === selectedColor ? "active" : ""}" data-color="${escapeHTML(color)}" type="button">${escapeHTML(color)}</button>
    `).join("");

    $("modalColorOptions").querySelectorAll("[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color;
        $("modalColorOptions").querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderProductModalImages(getImagesForColor(product, selectedColor));
      });
    });
  }

  updateModalWishlistBtn();
  openOverlay("productModal");
}

function renderProductModalImages(images) {
  const safe = images?.length ? images : ["logo.png"];

  if ($("modalProductImage")) {
    $("modalProductImage").src = safeImage(safe[0]);
  }

  if ($("modalThumbs")) {
    $("modalThumbs").innerHTML = safe.map((img, i) => `
      <img src="${safeImage(img)}" class="${i === 0 ? "active" : ""}" onerror="this.src='logo.png'">
    `).join("");

    $("modalThumbs").querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () => {
        if ($("modalProductImage")) $("modalProductImage").src = img.src;
        $("modalThumbs").querySelectorAll("img").forEach((x) => x.classList.remove("active"));
        img.classList.add("active");
      });
    });
  }
}

function addSelectedToCart(openCartAfter) {
  if (!selectedProduct) return;

  if (!selectedSize) {
    toast("Select size first");
    return;
  }

  const image = getImagesForColor(selectedProduct, selectedColor)[0] || "logo.png";
  const key = `${selectedProduct.id}-${selectedSize}-${selectedColor}`;
  const existing = state.cart.find((x) => x.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
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

  if (openCartAfter) {
    closeOverlay("productModal");
    openOverlay("cartOverlay");
  }

  toast("Added to cart");
}

function renderCart() {
  const box = $("cartItems");
  const totalBox = $("cartTotal");
  if (!box) return;

  if (!state.cart.length) {
    box.innerHTML = `<div class="empty-state">Your cart is empty</div>`;
    if (totalBox) totalBox.textContent = "₹0";
    return;
  }

  box.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <img src="${safeImage(item.image)}" onerror="this.src='logo.png'">
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHTML(item.name)}</div>
        <div class="cart-item-meta">${escapeHTML(item.size)} / ${escapeHTML(item.color)}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty}</div>
      </div>
      <button class="remove-btn" data-remove="${item.key}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cart = state.cart.filter((x) => x.key !== btn.dataset.remove);
      saveCart();
      renderCart();
      updateBadges();
    });
  });

  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (totalBox) totalBox.textContent = `₹${total}`;
}

function toggleWishlist(product) {
  if (!product) return;

  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter((x) => String(x.id) !== String(product.id));
    toast("Removed from wishlist");
  } else {
    state.wishlist.push({
      id: product.id,
      name: product.name,
      ref: product.ref,
      price: product.price,
      image: product.images[0]
    });
    toast("Added to wishlist");
  }

  saveWishlist();
  updateBadges();
}

function isWishlisted(id) {
  return state.wishlist.some((x) => String(x.id) === String(id));
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
      <img src="${safeImage(item.image)}" onerror="this.src='logo.png'">
      <div>
        <div class="wishlist-item-title">${escapeHTML(item.name)}</div>
        <div class="wishlist-item-price">₹${item.price}</div>
      </div>
      <button class="remove-btn" data-remove-wish="${item.id}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.wishlist = state.wishlist.filter((x) => String(x.id) !== String(btn.dataset.removeWish));
      saveWishlist();
      renderWishlist();
      renderAll();
    });
  });
}

function renderAdmin() {
  if ($("statProducts")) $("statProducts").textContent = products.length;
  if ($("statOrders")) $("statOrders").textContent = "0";
  if ($("statRevenue")) $("statRevenue").textContent = "₹0";
  if ($("statCustomers")) $("statCustomers").textContent = "0";
  if ($("statLowStock")) $("statLowStock").textContent = products.filter((p) => p.stock <= 5).length;

  renderAdminProducts();
  renderAdminInventory();
}

function renderAdminProducts() {
  const boxes = [$("adminProductsTable"), $("adminProductsOverview")].filter(Boolean);

  boxes.forEach((box) => {
    box.innerHTML = `
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
              <td><img src="${safeImage(p.images[0])}" style="width:48px;height:48px;object-fit:cover;border-radius:10px" onerror="this.src='logo.png'"></td>
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
            <td>${p.stock}</td>
            <td>${p.stock <= 5 ? "Low Stock" : "In Stock"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function handleAdminProductSave(e) {
  e.preventDefault();

  if (!isAdmin()) {
    toast("Only admin can save products");
    return;
  }

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

  if (!product.name || !product.ref) {
    toast("Product ref and name required");
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .insert(product);

  if (error) {
    console.error("Product save error:", error);
    toast("Product save failed");
    return;
  }

  toast("Product saved");
  await loadProducts();
  renderAll();
  renderAdmin();
  openAdminPage("products");
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

function openAdminPage(page) {
  if (!page) return;

  document.querySelectorAll(".za-admin-nav").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminPage === page);
  });

  document.querySelectorAll(".za-admin-page").forEach((section) => {
    section.classList.remove("active");
  });

  const target = $(`admin-${page}`);
  if (target) target.classList.add("active");

  if ($("adminPageTitle")) {
    $("adminPageTitle").textContent = page
      .replace("-", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function switchAuthTab(type) {
  const isLogin = type === "login";

  $("loginTabBtn")?.classList.toggle("active", isLogin);
  $("signupTabBtn")?.classList.toggle("active", !isLogin);
  $("loginForm")?.classList.toggle("hidden", !isLogin);
  $("signupForm")?.classList.toggle("hidden", isLogin);
}

function clearFilters() {
  if ($("searchInput")) $("searchInput").value = "";
  if ($("mobileSearchInput")) $("mobileSearchInput").value = "";
  if ($("categoryFilter")) $("categoryFilter").value = "all";
  if ($("sizeFilter")) $("sizeFilter").value = "all";
  if ($("priceFilter")) $("priceFilter").value = "all";
  if ($("sortFilter")) $("sortFilter").value = "popular";

  document.querySelectorAll(".category-tile").forEach((b) => b.classList.remove("active"));
  document.querySelector('.category-tile[data-category="all"]')?.classList.add("active");

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
  if ($("cartBadge")) {
    $("cartBadge").textContent = state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  if ($("wishlistBadge")) {
    $("wishlistBadge").textContent = state.wishlist.length;
  }
}

function updateModalWishlistBtn() {
  if (!selectedProduct || !$("modalWishlistBtn")) return;

  $("modalWishlistBtn").textContent = isWishlisted(selectedProduct.id)
    ? "♥ WISHLISTED"
    : "♡ WISHLIST";
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
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeImage(url) {
  if (!url) return "logo.png";
  return String(url).trim();
}

function toast(message) {
  const box = $("toast");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.classList.add("show");

  setTimeout(() => {
    box.classList.remove("show");
  }, 2300);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
