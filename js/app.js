const ADMIN_EMAIL = "zaidifycollections@gmail.com";

let products = [
  {
    id: "zw01",
    ref: "ZW01",
    name: "Test Cotton Kurta Set",
    category: "kurti",
    price: 484,
    oldPrice: 999,
    rating: 4.8,
    badge: "TEST",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Grey", "Pink"],
    images: ["logo.png"],
    description: "Testing product for frontend. Remove this once Supabase is connected.",
    reviews: [{ name: "Test", text: "Product popup working." }],
    stock: 10
  },
  {
    id: "zw02",
    ref: "ZW02",
    name: "Premium Kurti",
    category: "kurti",
    price: 599,
    oldPrice: 1299,
    rating: 4.7,
    badge: "TEST",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Blue"],
    images: ["logo.png"],
    description: "Second testing product for frontend.",
    reviews: [{ name: "Customer", text: "Cart and wishlist working." }],
    stock: 8
  }
];

let state = {
  user: null,
  cart: JSON.parse(localStorage.getItem("zc_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("zc_wishlist") || "[]")
};

let selectedProduct = null;
let selectedSize = "";
let selectedColor = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  renderAll();
  updateBadges();
  updateAuthUI();
});

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

  $("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = $("loginEmail")?.value.trim().toLowerCase();
    const password = $("loginPassword")?.value.trim();

    if (!email || !password) {
      toast("Enter email and password");
      return;
    }

    state.user = { email };
    updateAuthUI();
    closeOverlay("loginOverlay");
    toast("Logged in");
  });

  $("signupForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = $("signupEmail")?.value.trim().toLowerCase();
    const name = $("signupName")?.value.trim();

    if (!email || !name) {
      toast("Enter name and email");
      return;
    }

    state.user = { email, name };
    updateAuthUI();
    closeOverlay("loginOverlay");
    toast("Account created");
  });

  $("googleLoginBtn")?.addEventListener("click", () => {
    toast("Google sign-in will connect with Supabase next");
  });

  $("accountBtn")?.addEventListener("click", () => {
    toast("Account frontend ready");
  });

  $("adminBtn")?.addEventListener("click", () => {
    if (!state.user || state.user.email !== ADMIN_EMAIL) {
      toast("Admin access denied");
      return;
    }

    renderAdmin();
    openOverlay("adminOverlay");
  });

  $("backToStoreBtn")?.addEventListener("click", () => closeOverlay("adminOverlay"));

  $("adminLogoutBtn")?.addEventListener("click", () => {
    state.user = null;
    updateAuthUI();
    closeOverlay("adminOverlay");
    toast("Logged out");
  });

  document.querySelectorAll(".admin-nav").forEach((btn) => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminPage));
  });

  document.querySelectorAll("[data-admin-go]").forEach((btn) => {
    btn.addEventListener("click", () => openAdminPage(btn.dataset.adminGo));
  });

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
    });
  });

  ["searchInput", "mobileSearchInput", "categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach((id) => {
    $(id)?.addEventListener("input", renderAll);
    $(id)?.addEventListener("change", renderAll);
  });

  $("searchBtn")?.addEventListener("click", renderAll);

  $("mobileSearchBtn")?.addEventListener("click", () => {
    if ($("searchInput") && $("mobileSearchInput")) {
      $("searchInput").value = $("mobileSearchInput").value;
    }
    renderAll();
  });

  $("clearFiltersBtn")?.addEventListener("click", () => {
    if ($("searchInput")) $("searchInput").value = "";
    if ($("mobileSearchInput")) $("mobileSearchInput").value = "";
    if ($("categoryFilter")) $("categoryFilter").value = "all";
    if ($("sizeFilter")) $("sizeFilter").value = "all";
    if ($("priceFilter")) $("priceFilter").value = "all";
    if ($("sortFilter")) $("sortFilter").value = "popular";

    document.querySelectorAll(".category-tile").forEach((b) => b.classList.remove("active"));
    document.querySelector('.category-tile[data-category="all"]')?.classList.add("active");

    renderAll();
  });

  $("modalAddCartBtn")?.addEventListener("click", () => addSelectedToCart(false));
  $("modalBuyNowBtn")?.addEventListener("click", () => addSelectedToCart(true));

  $("modalWishlistBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;
    toggleWishlist(selectedProduct);
    updateModalWishlistBtn();
    renderAll();
    updateBadges();
  });

  $("adminProductForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("Product save frontend ready. Supabase next.");
  });

  document.querySelectorAll(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeOverlay(overlay.id);
      }
    });
  });
}

function renderAll() {
  const list = getFilteredProducts();

  renderProducts("featuredProducts", list);
  renderProducts("popularProducts", [...products].sort((a, b) => b.rating - a.rating));
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

  let list = products.filter((product) => {
    const text = `${product.name} ${product.ref} ${product.category} ${product.description}`.toLowerCase();

    const matchesSearch = !search || text.includes(search);

    const matchesCategory =
      category === "all" ||
      product.category === category ||
      (category === "women" && ["women", "kurti", "sets", "coords"].includes(product.category));

    const matchesSize = size === "all" || product.sizes.includes(size);

    let matchesPrice = true;

    if (price !== "all") {
      const [min, max] = price.split("-").map(Number);
      matchesPrice = product.price >= min && product.price <= max;
    }

    return matchesSearch && matchesCategory && matchesSize && matchesPrice;
  });

  if (sort === "low-high") {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === "high-low") {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === "newest") {
    list.reverse();
  } else {
    list.sort((a, b) => b.rating - a.rating);
  }

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
        <img class="product-card-img" src="${p.images[0]}" alt="${escapeHTML(p.name)}" onerror="this.src='logo.png'">
        <span class="product-badge">${escapeHTML(p.badge)}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${escapeHTML(p.name)}</div>

        <div class="product-card-price">
          <span class="price-now">₹${p.price}</span>
          <span class="price-old">₹${p.oldPrice}</span>
        </div>

        <div class="card-rating">
          ★★★★★ <span class="rev-count">${p.reviews.length} reviews</span>
        </div>

        <div class="product-card-actions">
          <button class="view-product-btn" data-view="${p.id}" type="button">VIEW</button>
          <button class="quick-wishlist-btn" data-wish="${p.id}" type="button">
            ${isWishlisted(p.id) ? "♥" : "♡"}
          </button>
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
      const product = products.find((p) => p.id === btn.dataset.wish);
      toggleWishlist(product);
      renderAll();
      updateBadges();
    });
  });

  box.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => openProduct(card.dataset.id));
  });
}

function openProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  selectedProduct = product;
  selectedSize = "";
  selectedColor = product.colors[0] || "";

  if ($("modalProductImage")) $("modalProductImage").src = product.images[0];
  if ($("modalProductName")) $("modalProductName").textContent = product.name;
  if ($("modalProductRef")) $("modalProductRef").textContent = product.ref;
  if ($("modalProductPrice")) $("modalProductPrice").textContent = `₹${product.price}`;
  if ($("modalOldPrice")) $("modalOldPrice").textContent = `₹${product.oldPrice}`;
  if ($("modalProductDesc")) $("modalProductDesc").textContent = product.description;
  if ($("modalReviewCount")) $("modalReviewCount").textContent = `${product.reviews.length} reviews`;

  if ($("modalThumbs")) {
    $("modalThumbs").innerHTML = product.images.map((img, index) => `
      <img src="${img}" class="${index === 0 ? "active" : ""}" onerror="this.src='logo.png'">
    `).join("");

    $("modalThumbs").querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () => {
        if ($("modalProductImage")) $("modalProductImage").src = img.src;
        $("modalThumbs").querySelectorAll("img").forEach((i) => i.classList.remove("active"));
        img.classList.add("active");
      });
    });
  }

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
    $("modalColorOptions").innerHTML = product.colors.map((color) => `
      <button class="option-btn ${color === selectedColor ? "active" : ""}" data-color="${escapeHTML(color)}" type="button">${escapeHTML(color)}</button>
    `).join("");

    $("modalColorOptions").querySelectorAll("[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color;
        $("modalColorOptions").querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  if ($("modalReviews")) {
    $("modalReviews").innerHTML = product.reviews.map((r) => `
      <div class="review-item">
        <div class="review-name">${escapeHTML(r.name)} <span class="stars">★★★★★</span></div>
        <div class="review-text">${escapeHTML(r.text)}</div>
      </div>
    `).join("");
  }

  updateModalWishlistBtn();
  openOverlay("productModal");
}

function addSelectedToCart(openCartAfter) {
  if (!selectedProduct) return;

  if (!selectedSize) {
    toast("Select size first");
    return;
  }

  const key = `${selectedProduct.id}-${selectedSize}-${selectedColor}`;
  const existing = state.cart.find((item) => item.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      key,
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.images[0],
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
      <img src="${item.image}" alt="${escapeHTML(item.name)}" onerror="this.src='logo.png'">

      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHTML(item.name)}</div>
        <div class="cart-item-meta">${escapeHTML(item.size)} / ${escapeHTML(item.color)}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty}</div>

        <div class="qty-control">
          <button class="qty-btn" data-minus="${item.key}" type="button">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-plus="${item.key}" type="button">+</button>
        </div>
      </div>

      <button class="remove-btn" data-remove="${item.key}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.cart.find((x) => x.key === btn.dataset.plus);
      if (item) item.qty += 1;
      saveCart();
      renderCart();
      updateBadges();
    });
  });

  box.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.cart.find((x) => x.key === btn.dataset.minus);
      if (!item) return;

      item.qty -= 1;

      if (item.qty <= 0) {
        state.cart = state.cart.filter((x) => x.key !== btn.dataset.minus);
      }

      saveCart();
      renderCart();
      updateBadges();
    });
  });

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

function isWishlisted(productId) {
  return state.wishlist.some((item) => item.id === productId);
}

function toggleWishlist(product) {
  if (!product) return;

  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter((item) => item.id !== product.id);
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
      <img src="${item.image}" alt="${escapeHTML(item.name)}" onerror="this.src='logo.png'">

      <div class="wishlist-item-info">
        <div class="wishlist-item-title">${escapeHTML(item.name)}</div>
        <div class="wishlist-item-meta">${escapeHTML(item.ref)}</div>
        <div class="wishlist-item-price">₹${item.price}</div>

        <button class="view-product-btn" data-open-wish="${item.id}" type="button">VIEW PRODUCT</button>
      </div>

      <button class="remove-btn" data-remove-wish="${item.id}" type="button">×</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-open-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeOverlay("wishlistOverlay");
      openProduct(btn.dataset.openWish);
    });
  });

  box.querySelectorAll("[data-remove-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.wishlist = state.wishlist.filter((item) => item.id !== btn.dataset.removeWish);
      saveWishlist();
      renderWishlist();
      renderAll();
      updateBadges();
    });
  });
}

function updateBadges() {
  const cartCount = state.cart.reduce((sum, item) => sum + item.qty, 0);

  if ($("cartBadge")) $("cartBadge").textContent = cartCount;
  if ($("wishlistBadge")) $("wishlistBadge").textContent = state.wishlist.length;
}

function updateModalWishlistBtn() {
  if (!$("modalWishlistBtn") || !selectedProduct) return;

  $("modalWishlistBtn").textContent = isWishlisted(selectedProduct.id)
    ? "♥ WISHLISTED"
    : "♡ WISHLIST";
}


 function switchAuthTab(type) {
  const isLogin = type === "login";

  $("loginTabBtn")?.classList.toggle("active", isLogin);
  $("signupTabBtn")?.classList.toggle("active", !isLogin);

  $("loginForm")?.classList.toggle("hidden", !isLogin);
  $("signupForm")?.classList.toggle("hidden", isLogin);
}
}

function updateAuthUI() {
  const isLoggedIn = Boolean(state.user);
  const isAdmin = state.user?.email === ADMIN_EMAIL;

  $("loginBtn")?.classList.toggle("hidden", isLoggedIn);
  $("accountBtn")?.classList.toggle("hidden", !isLoggedIn);
  $("adminBtn")?.classList.toggle("hidden", !isAdmin);
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

  if ($("adminPageTitle")) {
    $("adminPageTitle").textContent = page.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function renderAdmin() {
  if ($("statProducts")) $("statProducts").textContent = products.length;
  if ($("statOrders")) $("statOrders").textContent = "0";
  if ($("statRevenue")) $("statRevenue").textContent = "₹0";
  if ($("statCustomers")) $("statCustomers").textContent = "0";
  if ($("statPending")) $("statPending").textContent = "0";
  if ($("statLowStock")) $("statLowStock").textContent = products.filter((p) => p.stock <= 5).length;

  renderAdminProducts();
  renderAdminInventory();
  renderAdminReviews();
}

function renderAdminProducts() {
  const box = $("adminProductsTable");
  if (!box) return;

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
            <td><img src="${p.images[0]}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;" onerror="this.src='logo.png'"></td>
            <td>${escapeHTML(p.ref)}</td>
            <td>${escapeHTML(p.name)}</td>
            <td>${escapeHTML(p.category)}</td>
            <td>₹${p.price}</td>
            <td>${p.sizes.map(escapeHTML).join(", ")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
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

function renderAdminReviews() {
  const box = $("adminReviewsList");
  if (!box) return;

  const reviews = products.flatMap((p) =>
    p.reviews.map((r) => ({ ...r, product: p.name }))
  );

  box.innerHTML = reviews.map((r) => `
    <div class="review-item">
      <div class="review-name">${escapeHTML(r.name)} — ${escapeHTML(r.product)}</div>
      <div class="review-text">${escapeHTML(r.text)}</div>
    </div>
  `).join("");
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
  document.body.style.overflow = "";
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
  }, 2200);
}

function saveCart() {
  localStorage.setItem("zc_cart", JSON.stringify(state.cart));
}

function saveWishlist() {
  localStorage.setItem("zc_wishlist", JSON.stringify(state.wishlist));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
