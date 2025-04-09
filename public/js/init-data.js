// Initialize product data in localStorage
window.initializeData = function() {
  // Check if data is already initialized
  if (localStorage.getItem('dataInitialized')) {
    console.log('Data already initialized');
    return JSON.parse(localStorage.getItem('dataInitialized'));
  }

  // Categories
  const categories = [
    { id: 1, name: 'Ceramics', slug: 'ceramics', description: 'Handcrafted ceramic items' },
    { id: 2, name: 'Wood Crafts', slug: 'wood-crafts', description: 'Handmade wooden items and carvings' },
    { id: 3, name: 'Textiles', slug: 'textiles', description: 'Handwoven and textile-based products' }
  ];
  
  // Products
  const products = [
    {
      id: 1, 
      name: 'Handmade Ceramic Mug',
      categoryId: 1,
      description: 'A beautifully crafted handmade ceramic mug. Perfect for your morning coffee or tea. Each piece is unique and individually crafted by our artisans.',
      details: 'Material: Ceramic<br>Size: 4" height x 3" diameter<br>Capacity: 300ml<br>Care: Dishwasher safe',
      price: 25.99,
      onSale: false,
      listingDate: '2024-03-15',
      images: ['/server/uploads/images/mug_1.JPG', '/server/uploads/images/mug_2.JPG', '/server/uploads/images/mug_3.JPG'],
      stock: 15,
      reviews: [
        { name: 'Jane D.', rating: 5, comment: 'Beautiful mug, love the craftsmanship!', date: '2023-10-15' },
        { name: 'Michael R.', rating: 4, comment: 'Great quality and unique design.', date: '2023-09-20' }
      ]
    },
    {
      id: 2, 
      name: 'Handcrafted Modern Mug Set',
      categoryId: 1,
      description: 'A set of four modern handcrafted ceramic mugs. Each mug features a unique glaze pattern.',
      details: 'Material: Ceramic<br>Size: 4" height x 3" diameter<br>Capacity: 300ml<br>Care: Dishwasher safe<br>Set includes: 4 mugs',
      price: 89.99,
      onSale: true,
      salePrice: 79.99,
      listingDate: '2024-03-20',
      images: ['/server/uploads/images/mug_item2_1.JPG', '/server/uploads/images/mug_item2_2.JPG', '/server/uploads/images/mug_item2_3.JPG'],
      stock: 8,
      reviews: [
        { name: 'Sarah T.', rating: 5, comment: 'These mugs are stunning! Perfect size and feel great in the hand.', date: '2023-11-05' }
      ]
    },
    {
      id: 3, 
      name: 'Artisan Ceramic Teacup Set',
      categoryId: 1,
      description: 'An elegant set of handcrafted ceramic teacups with matching saucers. Perfect for your afternoon tea ritual.',
      details: 'Material: Ceramic<br>Cup Size: 3" height x 2.5" diameter<br>Capacity: 200ml<br>Care: Hand wash recommended<br>Set includes: 4 cups, 4 saucers',
      price: 99.99,
      onSale: false,
      listingDate: '2024-02-15',
      images: ['/server/uploads/images/mug_3.JPG', '/server/uploads/images/mug_2.JPG', '/server/uploads/images/mug_1.JPG'],
      stock: 5,
      reviews: []
    },
    {
      id: 4, 
      name: 'Handcrafted Wooden Sculpture',
      categoryId: 2,
      description: 'A stunning handcrafted wooden sculpture that brings natural beauty to your space. Each piece is unique and carefully carved by our master woodworker.',
      details: 'Material: Solid oak<br>Size: 12" height x 6" width x 6" depth<br>Finish: Natural oil<br>Care: Dust regularly, avoid direct sunlight',
      price: 149.99,
      onSale: false,
      listingDate: '2024-03-25',
      images: ['/server/uploads/images/Wood_1.JPG', '/server/uploads/images/Wood_2.JPG', '/server/uploads/images/Wood_3.JPG'],
      stock: 3,
      reviews: [
        { name: 'Robert J.', rating: 5, comment: 'Stunning piece of art. The craftsmanship is exceptional.', date: '2023-10-10' },
        { name: 'Lisa M.', rating: 4, comment: 'Beautiful grain patterns and excellent finish.', date: '2023-09-05' }
      ]
    },
    {
      id: 5, 
      name: 'Decorative Wooden Bowl',
      categoryId: 2,
      description: 'A beautiful hand-turned wooden bowl perfect for displaying fruits or as a centerpiece. Made from sustainably sourced wood.',
      details: 'Material: Maple wood<br>Size: 4" height x 10" diameter<br>Finish: Food-safe mineral oil<br>Care: Hand wash only, dry thoroughly',
      price: 79.99,
      onSale: true,
      salePrice: 69.99,
      listingDate: '2024-01-15',
      images: ['/server/uploads/images/wood_item2_1.JPG', '/server/uploads/images/wood_item2_2.JPG', '/server/uploads/images/wood_item2_3.JPG'],
      stock: 7,
      reviews: [
        { name: 'David K.', rating: 5, comment: 'This bowl is simply beautiful! The craftsmanship is outstanding.', date: '2023-11-15' }
      ]
    },
    {
      id: 6, 
      name: 'Handwoven Textile Wall Hanging',
      categoryId: 3,
      description: 'A beautiful handwoven wall hanging made with natural fibers and dyes. Perfect for adding texture and warmth to any room.',
      details: 'Material: Cotton and wool blend<br>Size: 24" x 36"<br>Colors: Natural dyes<br>Hanging: Wooden dowel included<br>Care: Spot clean only',
      price: 89.99,
      onSale: false,
      listingDate: '2024-03-10',
      images: ['/server/uploads/images/Handwoven_1.JPG', '/server/uploads/images/Handwoven_2.JPG', '/server/uploads/images/Handwoven_3.JPG'],
      stock: 2,
      reviews: [
        { name: 'Emily R.', rating: 5, comment: 'This wall hanging is even more beautiful in person! The craftsmanship is incredible.', date: '2023-10-25' },
        { name: 'Thomas N.', rating: 4, comment: 'Love the natural colors and texture. It\'s the perfect addition to my living room.', date: '2023-09-18' }
      ]
    },
    {
      id: 7, 
      name: 'Handwoven Basket Set',
      categoryId: 3,
      description: 'Set of three handwoven baskets in varying sizes. Perfect for storage or as decorative pieces. Each basket is made from sustainable materials.',
      details: 'Material: Natural seagrass<br>Sizes: Small (6" diameter), Medium (8" diameter), Large (10" diameter)<br>Finish: Natural<br>Care: Dust regularly, avoid moisture',
      price: 69.99,
      onSale: true,
      salePrice: 59.99,
      listingDate: '2024-03-01',
      images: ['/server/uploads/images/handwoven_item2_1.JPG', '/server/uploads/images/handwoven_item2_2.JPG', '/server/uploads/images/handwoven_item2_3.JPG'],
      stock: 4,
      reviews: [
        { name: 'Jennifer L.', rating: 5, comment: 'These baskets are beautiful and well-made. Perfect for organizing my space!', date: '2023-11-08' }
      ]
    }
  ];
  
  // Store data in localStorage
  localStorage.setItem('categories', JSON.stringify(categories));
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem('dataInitialized', JSON.stringify({ products, categories }));
  
  console.log('Data initialized successfully:', 
    products.length, 'products,', 
    categories.length, 'categories'
  );
  
  return { products, categories };
};

// Only initialize if not already done
if (!localStorage.getItem('dataInitialized')) {
  window.initializeData();
} 