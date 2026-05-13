
export let products = [
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
    description: "Testing product. Remove this once Supabase works.",
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


    