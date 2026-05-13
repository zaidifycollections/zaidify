const SUPABASE_URL = "https://ipwlhlsxtlfqioysyzlc.supabase.co";
const SUPABASE_KEY = "sb_publishable__u9RyOYFvdQ3A-kPQPPO3A_BLjsOHds";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export let products = [];

export async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Products load error:", error);
    products = [];
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
    reviews: p.reviews || []
  }));

  return products;
}
