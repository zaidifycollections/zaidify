export function filterProducts(products, filters) {
  const search = (filters.search || "").trim().toLowerCase();
  const category = filters.category || "all";
  const size = filters.size || "all";
  const price = filters.price || "all";

  return products.filter((product) => {
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search) ||
      product.ref.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search) ||
      product.description.toLowerCase().includes(search);

    const matchesCategory =
      category === "all" ||
      product.category === category ||
      (category === "women" && ["kurti", "coords", "sets"].includes(product.category));

    const matchesSize =
      size === "all" ||
      product.sizes.includes(size);

    let matchesPrice = true;

    if (price !== "all") {
      const [min, max] = price.split("-").map(Number);
      matchesPrice = product.price >= min && product.price <= max;
    }

    return matchesSearch && matchesCategory && matchesSize && matchesPrice;
  });
}

export function sortProducts(products, sort) {
  const list = [...products];

  if (sort === "low-high") {
    return list.sort((a, b) => a.price - b.price);
  }

  if (sort === "high-low") {
    return list.sort((a, b) => b.price - a.price);
  }

  if (sort === "newest") {
    return list.reverse();
  }

  return list.sort((a, b) => b.rating - a.rating);
}
