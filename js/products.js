
const SUPABASE_URL = "https://ipwlhlsxtlfqioysyzlc.supabase.co";
const SUPABASE_KEY = "sb_publishable__u9RyOYFvdQ3A-kPQPPO3A_BLjsOHds";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export let products = [];

const fallbackProducts = [
  {
    id: "zw01",
    ref: "ZW01",
    name: "Cotton Kurta Set with Pant",
    category: "kurti",
    price: 484,
    oldPrice: 999,
    rating: 4.8,
    badge: "TEST PRODUCT",
    sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"],
    colors: ["Grey", "Pink", "Yellow"],
    images: ["logo.png"],
    description: "Testing product. Remove fallback after Supabase products are working.",
    reviews: [
      { name: "Test Customer", text: "This is a test review." }
    ],
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
    badge: "TEST PRODUCT",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Blue"],
    images: ["logo.png"],
    description: "Fallback product for frontend testing.",
    reviews: [
      { name: "Test User", text: "Frontend is working." }
    ],
    stock: 8
  }
];

export async function loadProducts() {
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase products error:", error);
      products = fallbackProducts;
      return products;
    }

    if (!data || data.length === 0) {
      console.warn("No Supabase products found. Using fallback products.");
      products = fallbackProducts;
      return products;
    }

    products = data.map((p) => ({
      id: p.id,
      ref: p.ref,
      name: p.name,
      category: p.category,
      price: p.price,
      oldPrice: p.old_price || 0,
      rating: p.rating || 5,
      badge: p.badge || "NEW",
      sizes: p.sizes || [],
      colors: p.colors || [],
      images: p.images?.length ? p.images : ["logo.png"],
      description: p.description || "",
      reviews: p.reviews || [],
      stock: p.stock || 0
    }));

    return products;
  } catch (err) {
    console.error("Products load failed:", err);
    products = fallbackProducts;
    return products;
  }
}

    