
import { products, loadProducts } from "./products.js";
import { state, ADMIN_EMAIL } from "./state.js";
import { showToast } from "./toast.js";
import { openOverlay, closeOverlay, setupModalClose } from "./modal.js";
alert("APP JS LOADED");

let selectedProduct = null;
let selectedSize = "";
let selectedColor = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    setupModalClose();
    setupEvents();

    await safeLoadProducts();

    renderAllProducts();
    updateBadges();
    updateAuthUI(null);
  } catch (err) {
    console.error("APP CRASH:", err);
    showToast("App error. Check code.", true);
  }
});

async function safeLoadProducts() {
  try {
    await loadProducts();
  } catch (err) {
    console.error("loadProducts failed:", err);
  }
}

function getProducts() {
  return Array.isArray(products) ? products : [];
}

function setupEvents() {
  $("searchBtn")?.addEventListener("click", renderAllProducts);
  $("searchInput")?.addEventListener("input", renderAllProducts);

  $("mobileSearchBtn")?.addEventListener("click", () => {
    if ($("searchInput") && $("mobileSearchInput")) {
      $("searchInput").value = $("mobileSearchInput").value;
    }
    renderAllProducts();
  });

  $("mobileSearchInput")?.addEventListener("input", () => {
    if ($("searchInput") && $("mobileSearchInput")) {
      $("searchInput").value = $("mobileSearchInput").value;
    }
    renderAllProducts();
  });

  ["categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach((id) => {
    $(id)?.addEventListener("change", renderAllProducts);
  });

  $("clearFiltersBtn")?.addEventListener("click", () => {
    if ($("searchInput")) $("searchInput").value = "";
    if ($("mobileSearchInput")) $("mobileSearchInput").value = "";
    if ($("categoryFilter")) $("categoryFilter").value = "all";
    if ($("sizeFilter")) $("sizeFilter").value = "all";
    if ($("priceFilter")) $("priceFilter").value = "all";
    if ($("sortFilter")) $("sortFilter").value = "popular";

    document.querySelectorAll(".category-tile").forEach((btn) => {
      btn.classList.remove("active");
    });

    document
      .querySelector('.category-tile[data-category="all"]')
      ?.classList.add("active");

    renderAllProducts();
  });

  document.querySelectorAll(".category-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("inactive")) {
        showToast("Coming soon");
        return;
      }

      document.querySelectorAll(".category-tile").forEach((b) => {
        b.classList.remove("active");
      });

      btn.classList.add("active");

      if ($("categoryFilter")) {
        $("categoryFilter").value = btn.dataset.category || "all";
      }

      renderAllProducts();
    });
  });

  $("cartBtn")?.addEventListener("click", () => {
    renderCart();
    openOverlay("cartOverlay");
  });

  $("closeCartBtn")?.addEventListener("click", () => {
    closeOverlay("cartOverlay");
  });

  $("wishlistBtn")?.addEventListener("click", () => {
    renderWishlist();
    openOverlay("wishlistOverlay");
  });

  $("closeWishlistBtn")?.addEventListener("click", () => {
    closeOverlay("wishlistOverlay");
  });

  $("loginBtn")?.addEventListener("click", () => {
    openOverlay("loginOverlay");
  });

  $("closeLoginBtn")?.addEventListener("click", () => {
    closeOverlay("loginOverlay");
  });

  $("policyBtn")?.addEventListener("click", () => {
    openOverlay("policyOverlay");
  });

  $("closePolicyBtn")?.addEventListener("click", () => {
    closeOverlay("policyOverlay");
  });

  $("closeProductModal")?.addEventListener("click", () => {
    closeOverlay("productModal");
  });

  $("modalAddCartBtn")?.addEventListener("click", () => {
    addSelectedProductToCart(false);
  });

  $("modalBuyNowBtn")?.addEventListener("click", () => {
    addSelectedProductToCart(true);
  });

  $("modalWishlistBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;
    toggleWishlist(selectedProduct);
    updateWishlistButton();
    renderAllProducts();
    updateBadges();
  });

  $("loginTabBtn")?.addEventListener("click", () => switchAuthTab("login"));
  $("signupTabBtn")?.addEventListener("click", () => switchAuthTab("signup"));

  $("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = $("loginEmail")?.value.trim().toLowerCase();
    const password = $("loginPassword")?.value.trim();

    if (!email || !password) {
      setAuthMessage("Enter email and password", true);
      return;
    }

    state.user = {
      email,
      name: email.split("@")[0]
    };

    updateAuthUI(state.user);
    closeOverlay("loginOverlay");

    showToast("Logged in");
  });

  $("signupForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = $("signupEmail")?.value.trim().toLowerCase();
    const name = $("signupName")?.value.trim();

    if (!email || !name) {
      setAuthMessage("Enter name and email", true);
      return;
    }

    state.user = { email, name };

    updateAuthUI(state.user);
    closeOverlay("loginOverlay");

    showToast("Account created");
  });

  $("accountBtn")?.addEventListener("click", () => {
    showToast("Account frontend ready");
  });

  $("adminBtn")?.addEventListener("click", () => {
    if (!state.user || state.user.email !== ADMIN_EMAIL) {
      showToast("Admin access denied", true);
      return;
    }

    renderAdmin();
    openOverlay("adminOverlay");
  });

  $("backToStoreBtn")?.addEventListener("click", () => {
    closeOverlay("adminOverlay");
  });

  $("adminLogoutBtn")?.addEventListener("click", () => {
    state.user = null;
    updateAuthUI(null);
    closeOverlay("adminOverlay");
    showToast("Logged out");
  });

  document.querySelectorAll(".admin-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      openAdminPage(btn.dataset.adminPage);
    });
  });

  document.querySelectorAll("[data-admin-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openAdminPage(btn.dataset.adminGo);
    });
  });

  $("adminProductForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Product save frontend ready. Backend next.");
  });
}

function renderAllProducts() {
  let list = getFilteredProducts();

  renderProductScroller("featuredProducts", list.slice(0, 12));
  renderProductScroller(
    "popularProducts",
    [...getProducts()].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 12)
  );
  renderProductsGrid(list);

  if ($("resultCount")) {
    $("resultCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"} found`;
  }

  updateBadges();
}

function getFilteredProducts() {
  const search = ($("searchInput")?.value || "").trim().toLowerCase();
  const category = $("categoryFilter")?.value || "all";
  const size = $("sizeFilter")?.value || "all";
  const price = $("priceFilter")?.value || "all";
  const sort = $("sortFilter")?.value || "popular";

  let list = getProducts().filter((product) => {
    const name = String(product.name || "").toLowerCase();
    const ref = String(product.ref || "").toLowerCase();
    const desc = String(product.description || "").toLowerCase();
    const productCategory = String(product.category || "").toLowerCase();
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];

    const matchesSearch =
      !search ||
      name.includes(search) ||
      ref.includes(search) ||
      desc.includes(search) ||
      productCategory.includes(search);

    const matchesCategory =
      category === "all" ||
      productCategory === category ||
      (category === "women" && ["kurti", "coords", "sets", "women"].includes(productCategory));

    const matchesSize =
      size === "all" ||
      sizes.includes(size);

    let matchesPrice = true;

    if (price !== "all") {
      const [min, max] = price.split("-").map(Number);
      matchesPrice = Number(product.price || 0) >= min && Number(product.price || 0) <= max;
    }

    return matchesSearch && matchesCategory && matchesSize && matchesPrice;
  });

  if (sort === "low-high") {
    list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sort === "high-low") {
    list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sort === "newest") {
    list.reverse();
  } else {
    list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  return list;
}

function renderProductScroller(containerId, list) {
  const container = $(containerId);
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">No products found</div>`;
    return;
  }

  container.innerHTML = list.map(productCard).join("");
  bindProductButtons(container);
}

function renderProductsGrid(list) {
  const container = $("productsGrid");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">No products found</div>`;
    return;
  }

  container.innerHTML = list.map(productCard).join("");
  bindProductButtons(container);
}

function productCard(product) {
  const image = product.images?.[0] || "logo.png";
  const oldPrice = product.oldPrice || product.old_price || 0;
  const reviewCount = product.reviews?.length || 0;
  const wished = isWishlisted(product.id);

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-card-img-wrap">
        <img
          class="product-card-img"
          src="${image}"
          alt="${escapeHtml(product.name || "Product")}"
          onerror="this.src='logo.png'"
        >
        <span class="product-badge">${escapeHtml(product.badge || "NEW")}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${escapeHtml(product.name || "Product")}</div>

        <div class="product-card-price">
          <span class="price-now">₹${product.price || 0}</span>
          <span class="price-old">${oldPrice ? "₹" + oldPrice : ""}</span>
        </div>

        <div class="card-rating">
          ★★★★★ <span class="rev-count">${reviewCount} reviews</span>
        </div>

        <div class="product-card-actions">
          <button class="view-product-btn" type="button" data-view-id="${product.id}">
            VIEW
          </button>

          <button class="quick-wishlist-btn" type="button" data-wish-id="${product.id}">
            ${wished ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindProductButtons(container) {
  container.querySelectorAll("[data-view-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openProductDetail(btn.dataset.viewId);
    });
  });

  container.querySelectorAll("[data-wish-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const product = getProducts().find((p) => String(p.id) === String(btn.dataset.wishId));
      if (!product) return;

      toggleWishlist(product);
      updateBadges();
      renderAllProducts();
    });
  });

  container.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      openProductDetail(card.dataset.productId);
    });
  });
}

function openProductDetail(productId) {
  const product = getProducts().find((p) => String(p.id) === String(productId));
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.colors?.[0] || "";

  if ($("modalProductImage")) $("modalProductImage").src = product.images?.[0] || "logo.png";
  if ($("modalProductName")) $("modalProductName").textContent = product.name || "Product";
  if ($("modalProductRef")) $("modalProductRef").textContent = product.ref || product.id;
  if ($("modalProductPrice")) $("modalProductPrice").textContent = `₹${product.price || 0}`;
  if ($("modalOldPrice")) $("modalOldPrice").textContent = product.oldPrice ? `₹${product.oldPrice}` : "";
  if ($("modalProductDesc")) $("modalProductDesc").textContent = product.description || "";
  if ($("modalReviewCount")) $("modalReviewCount").textContent = `${product.reviews?.length || 0} reviews`;

  if ($("modalThumbs")) {
    $("modalThumbs").innerHTML = (product.images?.length ? product.images : ["logo.png"]).map((img, index) => `
      <img
        src="${img}"
        class="${index === 0 ? "active" : ""}"
        alt="${escapeHtml(product.name || "Product")}"
        onerror="this.src='logo.png'"
      >
    `).join("");

    $("modalThumbs").querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () => {
        if ($("modalProductImage")) $("modalProductImage").src = img.src;

        $("modalThumbs").querySelectorAll("img").forEach((i) => {
          i.classList.remove("active");
        });

        img.classList.add("active");
      });
    });
  }

  if ($("modalSizeOptions")) {
    $("modalSizeOptions").innerHTML = (product.sizes || []).map((size) => `
      <button class="option-btn size-option" type="button" data-size="${escapeHtml(size)}">
        ${escapeHtml(size)}
      </button>
    `).join("");

    $("modalSizeOptions").querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSize = btn.dataset.size;

        $("modalSizeOptions").querySelectorAll("button").forEach((b) => {
          b.classList.remove("active");
        });

        btn.classList.add("active");
      });
    });
  }

  if ($("modalColorOptions")) {
    $("modalColorOptions").innerHTML = (product.colors || []).map((color) => `
      <button class="option-btn color-option ${color === selectedColor ? "active" : ""}" type="button" data-color="${escapeHtml(color)}">
        ${escapeHtml(color)}
      </button>
    `).join("");

    $("modalColorOptions").querySelectorAll("[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color;

        $("modalColorOptions").querySelectorAll("button").forEach((b) => {
          b.classList.remove("active");
        });

        btn.classList.add("active");
      });
    });
  }

  if ($("modalReviews")) {
    const reviews = product.reviews || [];

    $("modalReviews").innerHTML = reviews.length
      ? reviews.map((review) => `
          <div class="review-item">
            <div class="review-name">${escapeHtml(review.name || "Customer")} <span class="stars">★★★★★</span></div>
            <div class="review-text">${escapeHtml(review.text || "")}</div>
          </div>
        `).join("")
      : `<div class="empty-state">No reviews yet</div>`;
  }

  updateWishlistButton();
  openOverlay("productModal");
}

function addSelectedProductToCart(openCartAfter) {
  if (!selectedProduct) return;

  if (!selectedSize) {
    showToast("Select size first", true);
    return;
  }

  addToCart(selectedProduct, selectedSize, selectedColor);
  renderCart();
  updateBadges();

  if (openCartAfter) {
    closeOverlay("productModal");
    openOverlay("cartOverlay");
  }

  showToast("Added to cart");
}

function addToCart(product, size, color) {
  if (!Array.isArray(state.cart)) state.cart = [];

  const key = `${product.id}-${size}-${color}`;

  const existing = state.cart.find((item) => item.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      key,
      id: product.id,
      name: product.name,
      ref: product.ref,
      price: Number(product.price || 0),
      image: product.images?.[0] || "logo.png",
      size,
      color,
      qty: 1
    });
  }

  localStorage.setItem("zc_cart", JSON.stringify(state.cart));
}

function renderCart() {
  const box = $("cartItems");
  const totalBox = $("cartTotal");

  if (!box) return;

  if (!state.cart || !state.cart.length) {
    box.innerHTML = `<div class="empty-state">Your cart is empty</div>`;
    if (totalBox) totalBox.textContent = "₹0";
    return;
  }

  box.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <img src="${item.image || "logo.png"}" alt="${escapeHtml(item.name)}" onerror="this.src='logo.png'">

      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHtml(item.name)}</div>
        <div class="cart-item-meta">${escapeHtml(item.size)} / ${escapeHtml(item.color || "")}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty}</div>

        <div class="qty-control">
          <button class="qty-btn" data-dec="${item.key}" type="button">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-inc="${item.key}" type="button">+</button>
        </div>
      </div>

      <button class="remove-btn" data-remove="${item.key}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cart = state.cart.filter((item) => item.key !== btn.dataset.remove);
      localStorage.setItem("zc_cart", JSON.stringify(state.cart));
      renderCart();
      updateBadges();
    });
  });

  box.querySelectorAll("[data-inc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.cart.find((x) => x.key === btn.dataset.inc);
      if (item) item.qty += 1;
      localStorage.setItem("zc_cart", JSON.stringify(state.cart));
      renderCart();
      updateBadges();
    });
  });

  box.querySelectorAll("[data-dec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.cart.find((x) => x.key === btn.dataset.dec);
      if (!item) return;

      item.qty -= 1;

      if (item.qty <= 0) {
        state.cart = state.cart.filter((x) => x.key !== btn.dataset.dec);
      }

      localStorage.setItem("zc_cart", JSON.stringify(state.cart));
      renderCart();
      updateBadges();
    });
  });

  const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);

  if (totalBox) totalBox.textContent = `₹${total}`;
}

function isWishlisted(productId) {
  if (!Array.isArray(state.wishlist)) state.wishlist = [];
  return state.wishlist.some((item) => String(item.id) === String(productId));
}

function toggleWishlist(product) {
  if (!Array.isArray(state.wishlist)) state.wishlist = [];

  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter((item) => String(item.id) !== String(product.id));
    showToast("Removed from wishlist");
  } else {
    state.wishlist.push({
      id: product.id,
      name: product.name,
      ref: product.ref,
      price: product.price,
      image: product.images?.[0] || "logo.png"
    });
    showToast("Added to wishlist");
  }

  localStorage.setItem("zc_wishlist", JSON.stringify(state.wishlist));
}

function renderWishlist() {
  const box = $("wishlistItems");
  if (!box) return;

  if (!state.wishlist || !state.wishlist.length) {
    box.innerHTML = `<div class="empty-state">Your wishlist is empty</div>`;
    return;
  }

  box.innerHTML = state.wishlist.map((item) => `
    <div class="wishlist-item">
      <img src="${item.image || "logo.png"}" alt="${escapeHtml(item.name)}" onerror="this.src='logo.png'">

      <div class="wishlist-item-info">
        <div class="wishlist-item-title">${escapeHtml(item.name)}</div>
        <div class="wishlist-item-meta">${escapeHtml(item.ref || item.id)}</div>
        <div class="wishlist-item-price">₹${item.price}</div>

        <button class="view-product-btn" data-open-wish="${item.id}" type="button">
          VIEW PRODUCT
        </button>
      </div>

      <button class="remove-btn" data-remove-wish="${item.id}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-open-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeOverlay("wishlistOverlay");
      openProductDetail(btn.dataset.openWish);
    });
  });

  box.querySelectorAll("[data-remove-wish]").forEach((btn) => {
    state.wishlist = state.wishlist.filter((item) => String(item.id) !== String(btn.dataset.removeWish));
    localStorage.setItem("zc_wishlist", JSON.stringify(state.wishlist));
    renderWishlist();
    renderAllProducts();
    updateBadges();
  });
}

function updateBadges() {
  const cartCount = (state.cart || []).reduce((sum, item) => sum + Number(item.qty || 1), 0);
  const wishCount = (state.wishlist || []).length;

  if ($("cartBadge")) $("cartBadge").textContent = cartCount;
  if ($("wishlistBadge")) $("wishlistBadge").textContent = wishCount;
}

function updateWishlistButton() {
  if (!$("modalWishlistBtn") || !selectedProduct) return;

  $("modalWishlistBtn").textContent =
    isWishlisted(selectedProduct.id)
      ? "♥ WISHLISTED"
      : "♡ WISHLIST";
}

function switchAuthTab(type) {
  const login = type === "login";

  $("loginTabBtn")?.classList.toggle("active", login);
  $("signupTabBtn")?.classList.toggle("active", !login);
  $("loginForm")?.classList.toggle("hidden", !login);
  $("signupForm")?.classList.toggle("hidden", login);

  setAuthMessage("");
}

function setAuthMessage(message, isError = false) {
  const box = $("authMessage");
  if (!box) return;

  box.textContent = message || "";
  box.className = "lmsg";

  if (!message) return;

  box.classList.add(isError ? "err" : "ok");
}

function updateAuthUI(user) {
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.email === ADMIN_EMAIL;

  $("loginBtn")?.classList.toggle("hidden", isLoggedIn);
  $("accountBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("adminBtn")?.classList.toggle("hidden", !isAdmin);
  $("adminBtn")?.setAttribute("aria-hidden", String(!isAdmin));
}

function openAdminPage(page) {
  if (!page) return;

  document.querySelectorAll(".admin-nav").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminPage === page);
  });

  document.querySelectorAll(".admin-page").forEach((section) => {
    section.classList.remove("active");
  });

  $(`admin-${page}`)?.classList.add("active");

  const title = $("adminPageTitle");

  if (title) {
    title.textContent = page
      .replace("-", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function renderAdmin() {
  const orders = state.orders || [];
  const customers = state.customers || [];
  const list = getProducts();

  if ($("statProducts")) $("statProducts").textContent = list.length;
  if ($("statOrders")) $("statOrders").textContent = orders.length;
  if ($("statCustomers")) $("statCustomers").textContent = customers.length;
  if ($("statRevenue")) $("statRevenue").textContent = `₹${orders.reduce((sum, order) => sum + (order.total || 0), 0)}`;
  if ($("statPending")) $("statPending").textContent = orders.filter((o) => o.status === "New").length;
  if ($("statLowStock")) $("statLowStock").textContent = list.filter((p) => Number(p.stock || 0) <= 5).length;

  renderAdminProducts();
  renderAdminInventory();
  renderAdminReviews();
}

function renderAdminProducts() {
  const box = $("adminProductsTable");
  const list = getProducts();

  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty-state">No products found</div>`;
    return;
  }

  box.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Image</th>
          <th>Ref</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Sizes</th>
        </tr>
      </thead>

      <tbody>
        ${list.map((p) => `
          <tr>
            <td><img src="${p.images?.[0] || "logo.png"}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;" onerror="this.src='logo.png'"></td>
            <td>${escapeHtml(p.ref || p.id)}</td>
            <td>${escapeHtml(p.name || "")}</td>
            <td>${escapeHtml(p.category || "")}</td>
            <td>₹${p.price || 0}</td>
            <td>${(p.sizes || []).map(escapeHtml).join(", ")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminInventory() {
  const box = $("adminInventoryTable");
  const list = getProducts();

  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="empty-state">No inventory found</div>`;
    return;
  }

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
        ${list.map((p) => {
          const stock = Number(p.stock || 0);
          const status = stock <= 5 ? "Low Stock" : "In Stock";

          return `
            <tr>
              <td>${escapeHtml(p.ref || p.id)}</td>
              <td>${escapeHtml(p.name || "")}</td>
              <td>${stock}</td>
              <td>${status}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminReviews() {
  const box = $("adminReviewsList");
  if (!box) return;

  const reviews = getProducts().flatMap((product) =>
    (product.reviews || []).map((review) => ({
      product: product.name,
      ...review
    }))
  );

  if (!reviews.length) {
    box.innerHTML = `<div class="empty-state">No reviews yet</div>`;
    return;
  }

  box.innerHTML = reviews.map((review) => `
    <div class="review-item">
      <div class="review-name">${escapeHtml(review.name || "Customer")} — ${escapeHtml(review.product || "")}</div>
      <div class="review-text">${escapeHtml(review.text || "")}</div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}