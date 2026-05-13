export function openOverlay(id) {
  const el = document.getElementById(id);

  if (!el) return;

  el.classList.remove("hidden");
  el.classList.add("open");

  document.body.style.overflow = "hidden";
}

export function closeOverlay(id) {
  const el = document.getElementById(id);

  if (!el) return;

  el.classList.remove("open");

  if (id === "adminOverlay") {
    el.classList.add("hidden");
  }

  document.body.style.overflow = "";
}

export function setupModalClose() {
  document.querySelectorAll(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeOverlay(overlay.id);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".overlay.open").forEach((overlay) => {
        closeOverlay(overlay.id);
      });
    }
  });
}
