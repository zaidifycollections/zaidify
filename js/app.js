

    alert("APP JS LOADED");

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
    description: "Testing product for frontend.",
    reviews: [{ name: "Test", text: "Product popup working." }],
    stock: 10
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
});

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

function toast(msg) {
  const box = $("toast");
  if (!box) return alert(msg);
  box.textContent = msg;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2000);
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

  $("loginBtn")?.addEventListener("click", () => {
    openOverlay("loginOverlay");
  });

  $("closeCartBtn")?.addEventListener("click", () => closeOverlay("cartOverlay"));
  $("closeWishlistBtn")?.addEventListener("click", () => closeOverlay("wishlistOverlay"));
  $("closeLoginBtn")?.addEventListener("click", () => closeOverlay("loginOverlay"));
  $("closeProductModal")?.addEventListener("click", () => closeOverlay("productModal"));

  document.querySelectorAll(".category-tile").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-tile").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if ($("categoryFilter")) $("categoryFilter").value = btn.dataset.category || "all";
      renderAll();
    });
  });

  ["searchInput", "categoryFilter", "sizeFilter", "priceFilter", "sortFilter"].forEach((id) => {
    $(id)?.addEventListener("input", renderAll);
    $(id)?.addEventListener("change", renderAll);
  });

  $("modalAddCartBtn")?.addEventListener("click", () => addToCart(false));
  $("modalBuyNowBtn")?.addEventListener("click", () => addToCart(true));

  $("modalWishlistBtn")?.addEventListener("click", () => {
    if (!selectedProduct) return;
    toggleWishlist(selectedProduct);
    updateBadges();
    renderAll();
  });

  $("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("loginEmail")?.value.trim().toLowerCase();

    state.user = { email };
    closeOverlay("loginOverlay");

    $("loginBtn")?.classList.add("hidden");
    $("accountBtn")?.classList.remove("hidden");

    if (email === ADMIN_EMAIL) {
      $("adminBtn")?.classList.remove("hidden");
    }

    toast("Logged in");
  });

  $("adminBtn")?.addEventListener("click", () => {
    openOverlay("adminOverlay");
  });
}

function renderAll() {
  const list = products;

  renderProducts("featuredProducts", list);
  renderProducts("popularProducts", list);
  renderProducts("productsGrid", list);

  if ($("resultCount")) $("resultCount").textContent = `${list.length} product found`;
}

function renderProducts(id, list) {
  const box = $(id);
  if (!box) return;

  box.innerHTML = list.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-card-img-wrap">
        <img class="product-card-img" src="${p.images[0]}" onerror="this.src='logo.png'">
        <span class="product-badge">${p.badge}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-title">${p.name}</div>
        <div class="product-card-price">
          <span class="price-now">₹${p.price}</span>
          <span class="price-old">₹${p.oldPrice}</span>
        </div>

        <div class="product-card-actions">
          <button class="view-product-btn" data-view="${p.id}" type="button">VIEW</button>
          <button class="quick-wishlist-btn" data-wish="${p.id}" type="button">♡</button>
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
      updateBadges();
    });
  });
}

function openProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;

  selectedProduct = p;
  selectedSize = "";
  selectedColor = p.colors[0];

  $("modalProductImage").src = p.images[0];
  $("modalProductName").textContent = p.name;
  $("modalProductRef").textContent = p.ref;
  $("modalProductPrice").textContent = `₹${p.price}`;
  $("modalOldPrice").textContent = `₹${p.oldPrice}`;
  $("modalProductDesc").textContent = p.description;
  $("modalReviewCount").textContent = `${p.reviews.length} reviews`;

  $("modalSizeOptions").innerHTML = p.sizes.map((s) =>
    `<button class="option-btn" data-size="${s}" type="button">${s}</button>`
  ).join("");

  $("modalSizeOptions").querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedSize = btn.dataset.size;
      $("modalSizeOptions").querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  $("modalColorOptions").innerHTML = p.colors.map((c) =>
    `<button class="option-btn" data-color="${c}" type="button">${c}</button>`
  ).join("");

  $("modalReviews").innerHTML = p.reviews.map((r) =>
    `<div class="review-item"><b>${r.name}</b><p>${r.text}</p></div>`
  ).join("");

  openOverlay("productModal");
}

function addToCart(openCart) {
  if (!selectedProduct) return;

  if (!selectedSize) {
    toast("Select size first");
    return;
  }

  state.cart.push({
    id: selectedProduct.id,
    name: selectedProduct.name,
    price: selectedProduct.price,
    image: selectedProduct.images[0],
    size: selectedSize,
    color: selectedColor,
    qty: 1
  });

  localStorage.setItem("zc_cart", JSON.stringify(state.cart));
  updateBadges();
  renderCart();

  if (openCart) {
    closeOverlay("productModal");
    openOverlay("cartOverlay");
  }

  toast("Added to cart");
}

function renderCart() {
  const box = $("cartItems");
  if (!box) return;

  if (!state.cart.length) {
    box.innerHTML = `<div class="empty-state">Your cart is empty</div>`;
    if ($("cartTotal")) $("cartTotal").textContent = "₹0";
    return;
  }

  box.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <img src="${item.image}" onerror="this.src='logo.png'">
      <div>
        <b>${item.name}</b>
        <p>${item.size} / ${item.color}</p>
        <p>₹${item.price}</p>
      </div>
    </div>
  `).join("");

  const total = state.cart.reduce((sum, i) => sum + i.price, 0);
  if ($("cartTotal")) $("cartTotal").textContent = `₹${total}`;
}

function toggleWishlist(product) {
  if (!product) return;

  const exists = state.wishlist.some((x) => x.id === product.id);

  if (exists) {
    state.wishlist = state.wishlist.filter((x) => x.id !== product.id);
    toast("Removed wishlist");
  } else {
    state.wishlist.push(product);
    toast("Added wishlist");
  }

  localStorage.setItem("zc_wishlist", JSON.stringify(state.wishlist));
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
      <img src="${item.images[0]}" onerror="this.src='logo.png'">
      <div>
        <b>${item.name}</b>
        <p>₹${item.price}</p>
      </div>
    </div>
  `).join("");
}

function updateBadges() {
  if ($("cartBadge")) $("cartBadge").textContent = state.cart.length;
  if ($("wishlistBadge")) $("wishlistBadge").textContent = state.wishlist.length;
}

      
      


    
  
         