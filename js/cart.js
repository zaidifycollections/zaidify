import { state, saveCart } from "./state.js";

export function addToCart(product, size, color) {
  const existing = state.cart.find(
    (item) => item.id === product.id && item.size === size && item.color === color
  );

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size,
      color,
      qty: 1
    });
  }

  saveCart();
}

export function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;

  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
}

export function renderCart() {
  const box = document.getElementById("cartItems");
  const totalBox = document.getElementById("cartTotal");

  if (!box) return;

  if (!state.cart.length) {
    box.innerHTML = `<div class="empty-state">Your cart is empty</div>`;
    if (totalBox) totalBox.textContent = "₹0";
    return;
  }

  box.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='logo.png'">

      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-meta">${item.size} / ${item.color}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty}</div>
      </div>
    </div>
  `).join("");

  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (totalBox) {
    totalBox.textContent = `₹${total}`;
  }
}
