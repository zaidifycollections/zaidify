export function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast";

  if (isError) {
    toast.classList.add("err");
  }

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
