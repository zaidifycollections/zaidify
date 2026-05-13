import { state, saveWishlist } from "./state.js";
import { showToast } from "./toast.js";

export function isWishlisted(productId) {
  return state.wishlist.some((item) => item.id === productId);
}

export function toggleWishlist(product) {
  if (isWishlisted(product.id)) {
    state.wishlist = state.wishlist.filter((item) => item.id !== product.id);
    showToast("Removed from wishlist");
  } else {
    state.wishlist.push({
      id: product.id,
      name: product.name,
      ref: product.ref,
      price: product.price,
      image: product.images[0]
    });
    showToast("Added to wishlist");
  }

  saveWishlist();
}

export function renderWishlist(openProductDetail) {
  const box = document.getElementById("wishlistItems");
  if (!box) return;

  if (!state.wishlist.length) {
    box.innerHTML = `<div class="empty-state">Your wishlist is empty</div>`;
    return;
  }

  box.innerHTML = state.wishlist.map((item) => `
    <div class="wishlist-item">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='logo.png'">

      <div class="wishlist-item-info">
        <div class="wishlist-item-title">${item.name}</div>
        <div class="wishlist-item-meta">${item.ref}</div>
        <div class="wishlist-item-price">₹${item.price}</div>

        <button class="view-product-btn" data-open-wish="${item.id}" type="button">
          VIEW PRODUCT
        </button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-open-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openProductDetail(btn.dataset.openWish);
    });
  });
}

export function updateWishlistBadge() {
  const badge = document.getElementById("wishlistBadge");
  if (!badge) return;

  badge.textContent = state.wishlist.length;
}
