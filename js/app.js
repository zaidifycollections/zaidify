import { products, loadProducts } from "./products.js";
import { state, ADMIN_EMAIL } from "./state.js";
import { showToast } from "./toast.js";
import { openOverlay, closeOverlay, setupModalClose } from "./modal.js";
import { addToCart, renderCart, updateCartBadge } from "./cart.js";
import {
  toggleWishlist,
  renderWishlist,
  updateWishlistBadge,
  isWishlisted
} from "./wishlist.js";
import { filterProducts, sortProducts } from "./search.js";

let selectedProduct = null;
let selectedSize = "";
let selectedColor = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  setupModalClose();
  setupEvents();

  await loadProducts();

  renderAll();
  updateAuthUI(null);
});

function setupEvents() {
  $("searchBtn")?.addEventListener("click", renderAll);
  $("searchInput")?.addEventListener("input", renderAll);

  $("mobileSearchBtn")?.addEventListener("click", () => {
    if ($("searchInput") && $("mobileSearchInput")) {
      $("searchInput").value = $("mobileSearchInput").value;
    }
    renderAll();
  });

  $("mobileSearchInput")?.addEventListener("input", () => {
    if ($("searchInput") && $("mobileSearchInput")) {
      $("searchInput").value = $("mobileSearchInput").value;
    }
    renderAll();
  });

  ["categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach((id) => {
    $(id)?.addEventListener("change", renderAll);
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

    document.querySelector('.category-tile[data-category="all"]')?.classList.add("active");

    renderAll();
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

      renderAll();
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
    renderWishlist(openProductDetail);
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
    if (!selectedProduct) return;

    if (!selectedSize) {
      showToast("Select size first", true);
      return;
    }

    addToCart(selectedProduct, selectedSize, selectedColor);
    updateCartBadge();
    renderCart();
    showToast("Added to cart");
  });

  $("modalBuyNowBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;

    if (!selectedSize) {
      showToast("Select size first", true);
      return;
    }

    addToCart(selectedProduct, selectedSize, selectedColor);
    updateCartBadge();
    renderCart();

    closeOverlay("productModal");
    openOverlay("cartOverlay");

    showToast("Added to cart");
  });

  $("modalWishlistBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;

    toggleWishlist(selectedProduct);
    updateWishlistBadge();
    renderWishlist(openProductDetail);
    updateWishlistButton();
    renderAll();
  });

  $("loginTabBtn")?.addEventListener("click", () => {
    switchAuthTab("login");
  });

  $("signupTabBtn")?.addEventListener("click", () => {
    switchAuthTab("signup");
  });

  $("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = $("loginEmail")?.value.trim().toLowerCase();
    const pass = $("loginPassword")?.value.trim();

    if (!email || !pass) {
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

    state.user = {
      email,
      name
    };

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

function renderAll() {
  let list = filterProducts(products, {
    search: $("searchInput")?.value || "",
    category: $("categoryFilter")?.value || "all",
    size: $("sizeFilter")?.value || "all",
    price: $("priceFilter")?.value || "all"
  });

  list = sortProducts(list, $("sortFilter")?.value || "popular");

  renderProductScroller("featuredProducts", list.slice(0, 10));
  renderProductScroller("popularProducts", [...products].sort((a, b) => b.rating - a.rating).slice(0, 10));
  renderProductsGrid(list);

  if ($("resultCount")) {
    $("resultCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"} found`;
  }

  updateCartBadge();
  updateWishlistBadge();
}

function productCard(product) {
  const wished = isWishlisted(product.id);

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-card-img-wrap">
        <img
          class="product-card-img"
          src="${product.images?.[0] || "logo.png"}"
          alt="${product.name}"
          onerror="this.src='logo.png'"
        >

        <span class="product-badge">${product.badge || "NEW"}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${product.name}</div>

        <div class="product-card-price">
          <span class="price-now">₹${product.price}</span>
          <span class="price-old">${product.oldPrice ? "₹" + product.oldPrice : ""}</span>
        </div>

        <div class="card-rating">
          ★★★★★ <span class="rev-count">${product.reviews?.length || 0} reviews</span>
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

      const product = products.find((p) => p.id === btn.dataset.wishId);
      if (!product) return;

      toggleWishlist(product);
      updateWishlistBadge();
      renderAll();
    });
  });

  container.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      openProductDetail(card.dataset.productId);
    });
  });
}

function openProductDetail(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.colors?.[0] || "";

  $("modalProductImage").src = product.images?.[0] || "logo.png";
  $("modalProductName").textContent = product.name;
  $("modalProductRef").textContent = product.ref || product.id;
  $("modalProductPrice").textContent = `₹${product.price}`;
  $("modalOldPrice").textContent = product.oldPrice ? `₹${product.oldPrice}` : "";
  $("modalProductDesc").textContent = product.description || "";
  $("modalReviewCount").textContent = `${product.reviews?.length || 0} reviews`;

  $("modalThumbs").innerHTML = (product.images || ["logo.png"]).map((img, index) => `
    <img
      src="${img}"
      class="${index === 0 ? "active" : ""}"
      alt="${product.name}"
      onerror="this.src='logo.png'"
    >
  `).join("");

  $("modalThumbs").querySelectorAll("img").forEach((img) => {
    img.addEventListener("click", () => {
      $("modalProductImage").src = img.src;

      $("modalThumbs").querySelectorAll("img").forEach((i) => {
        i.classList.remove("active");
      });

      img.classList.add("active");
    });
  });

  $("modalSizeOptions").innerHTML = (product.sizes || []).map((size) => `
    <button class="option-btn size-option" type="button" data-size="${size}">
      ${size}
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

  $("modalColorOptions").innerHTML = (product.colors || []).map((color) => `
    <button class="option-btn color-option ${color === selectedColor ? "active" : ""}" type="button" data-color="${color}">
      ${color}
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

  $("modalReviews").innerHTML = (product.reviews || []).map((review) => `
    <div class="review-item">
      <div class="review-name">${review.name} <span class="stars">★★★★★</span></div>
      <div class="review-text">${review.text}</div>
    </div>
  `).join("");

  updateWishlistButton();
  openOverlay("productModal");
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

  box.textContent = message;
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

  $("statProducts").textContent = products.length;
  $("statOrders").textContent = orders.length;
  $("statCustomers").textContent = customers.length;
  $("statRevenue").textContent = `₹${orders.reduce((sum, order) => sum + (order.total || 0), 0)}`;

  if ($("statPending")) {
    $("statPending").textContent = orders.filter((o) => o.status === "New").length;
  }

  if ($("statLowStock")) {
    $("statLowStock").textContent = products.filter((p) => Number(p.stock || 0) <= 5).length;
  }

  renderAdminProducts();
  renderAdminInventory();
  renderAdminReviews();
}

function renderAdminProducts() {
  const box = $("adminProductsTable");
  if (!box) return;

  if (!products.length) {
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
        ${products.map((p) => `
          <tr>
            <td><img src="${p.images?.[0] || "logo.png"}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;" onerror="this.src='logo.png'"></td>
            <td>${p.ref || p.id}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>₹${p.price}</td>
            <td>${(p.sizes || []).join(", ")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminInventory() {
  const box = $("adminInventoryTable");
  if (!box) return;

  if (!products.length) {
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
        ${products.map((p) => {
          const stock = Number(p.stock || 0);
          const status = stock <= 5 ? "Low Stock" : "In Stock";

          return `
            <tr>
              <td>${p.ref || p.id}</td>
              <td>${p.name}</td>
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

  const reviews = products.flatMap((product) =>
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
      <div class="review-name">${review.name} — ${review.product}</div>
      <div class="review-text">${review.text}</div>
    </div>
  `).join("");
}