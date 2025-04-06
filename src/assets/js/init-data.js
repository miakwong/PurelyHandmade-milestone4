// Initialize product data in localStorage
window.initializeData = function() {
  // Categories
  const categories = [
    { id: 1, name: 'Ceramics', slug: 'ceramics', description: 'Handcrafted ceramic items' },
    { id: 2, name: 'Wood Crafts', slug: 'wood-crafts', description: 'Handmade wooden items and carvings' },
    { id: 3, name: 'Textiles', slug: 'textiles', description: 'Handwoven and textile-based products' }
  ];
  
  // Initial Designers
  const designers = [
    {
      id: 'd1',
      name: 'Emma Thompson',
      specialty: 'Ceramic Artist',
      bio: 'Emma brings 15 years of ceramic artistry to our collection. Her handcrafted mugs and bowls are known for their delicate glazes and functional design.',
      image: '../assets/img/designer1.jpg',
      social: {
        instagram: 'https://instagram.com/emmathompsonceramics',
        pinterest: 'https://pinterest.com/emmathompsonceramics',
        etsy: 'https://etsy.com/shop/emmathompsonceramics'
      }
    },
    {
      id: 'd2',
      name: 'Michael Chen',
      specialty: 'Wood Craftsman',
      bio: "Michael's hand-carved wooden pieces showcase the natural beauty of sustainable hardwoods. Each piece tells a story through its grain patterns and careful detailing.",
      image: '../assets/img/designer2.jpg',
      social: {
        instagram: 'https://instagram.com/michaelchenwoodcraft',
        pinterest: 'https://pinterest.com/michaelchenwoodcraft',
        youtube: 'https://youtube.com/@michaelchenwoodcraft'
      }
    },
    {
      id: 'd3',
      name: 'Sophia Williams',
      specialty: 'Textile Artist',
      bio: 'Sophia weaves natural fibers into stunning textiles using traditional techniques. Her passion for sustainable materials shines through in every handwoven piece.',
      image: '../assets/img/designer3.jpg',
      social: {
        instagram: 'https://instagram.com/sophiawilliamstextiles',
        pinterest: 'https://pinterest.com/sophiawilliamstextiles',
        tiktok: 'https://tiktok.com/@sophiawilliamstextiles'
      }
    }
  ];
  
  // Products with designer IDs
  const products = [
    {
      id: 1, 
      name: 'Handmade Ceramic Mug',
      categoryId: 1,
      designerId: 'd1', // Emma Thompson
      description: 'A beautifully crafted handmade ceramic mug. Perfect for your morning coffee or tea. Each piece is unique and individually crafted by our artisans.',
      details: 'Material: Ceramic<br>Size: 4" height x 3" diameter<br>Capacity: 300ml<br>Care: Dishwasher safe',
      price: 25.99,
      onSale: false,
      listingDate: '2024-03-15',
      images: ['src/assets/img/mug_1.JPG', 'src/assets/img/mug_2.JPG', 'src/assets/img/mug_3.JPG'],
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
      designerId: 'd1', // Emma Thompson
      description: 'A set of four modern handcrafted ceramic mugs. Each mug features a unique glaze pattern.',
      details: 'Material: Ceramic<br>Size: 4" height x 3" diameter<br>Capacity: 300ml<br>Care: Dishwasher safe<br>Set includes: 4 mugs',
      price: 89.99,
      onSale: true,
      salePrice: 79.99,
      listingDate: '2024-03-20',
      images: ['src/assets/img/mug_item2_1.JPG', 'src/assets/img/mug_item2_2.JPG', 'src/assets/img/mug_item2_3.JPG'],
      stock: 8,
      reviews: [
        { name: 'Sarah T.', rating: 5, comment: 'These mugs are stunning! Perfect size and feel great in the hand.', date: '2023-11-05' }
      ]
    },
    {
      id: 3, 
      name: 'Artisan Ceramic Teacup Set',
      categoryId: 1,
      designerId: 'd1', // Emma Thompson
      description: 'An elegant set of handcrafted ceramic teacups with matching saucers. Perfect for your afternoon tea ritual.',
      details: 'Material: Ceramic<br>Cup Size: 3" height x 2.5" diameter<br>Capacity: 200ml<br>Care: Hand wash recommended<br>Set includes: 4 cups, 4 saucers',
      price: 99.99,
      onSale: false,
      listingDate: '2024-02-15',
      images: ['src/assets/img/mug_3.JPG', 'src/assets/img/mug_2.JPG', 'src/assets/img/mug_1.JPG'],
      stock: 5,
      reviews: []
    },
    {
      id: 4, 
      name: 'Handcrafted Wooden Sculpture',
      categoryId: 2,
      designerId: 'd2', // Michael Chen
      description: 'A stunning handcrafted wooden sculpture that brings natural beauty to your space. Each piece is unique and carefully carved by our master woodworker.',
      details: 'Material: Solid oak<br>Size: 12" height x 6" width x 6" depth<br>Finish: Natural oil<br>Care: Dust regularly, avoid direct sunlight',
      price: 149.99,
      onSale: false,
      listingDate: '2024-03-25',
      images: ['src/assets/img/Wood_1.JPG', 'src/assets/img/Wood_2.JPG', 'src/assets/img/Wood_3.JPG'],
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
      designerId: 'd2', // Michael Chen
      description: 'A beautiful hand-turned wooden bowl perfect for displaying fruits or as a centerpiece. Made from sustainably sourced wood.',
      details: 'Material: Maple wood<br>Size: 4" height x 10" diameter<br>Finish: Food-safe mineral oil<br>Care: Hand wash only, dry thoroughly',
      price: 79.99,
      onSale: true,
      salePrice: 69.99,
      listingDate: '2024-01-15',
      images: ['src/assets/img/wood_item2_1.JPG', 'src/assets/img/wood_item2_2.JPG', 'src/assets/img/wood_item2_3.JPG'],
      stock: 7,
      reviews: [
        { name: 'David K.', rating: 5, comment: 'This bowl is simply beautiful! The craftsmanship is outstanding.', date: '2023-11-15' }
      ]
    },
    {
      id: 6, 
      name: 'Handwoven Textile Wall Hanging',
      categoryId: 3,
      designerId: 'd3', // Sophia Williams
      description: 'A beautiful handwoven wall hanging made with natural fibers and dyes. Perfect for adding texture and warmth to any room.',
      details: 'Material: Cotton and wool blend<br>Size: 24" x 36"<br>Colors: Natural dyes<br>Hanging: Wooden dowel included<br>Care: Spot clean only',
      price: 89.99,
      onSale: false,
      listingDate: '2024-03-10',
      images: ['src/assets/img/Handwoven_1.JPG', 'src/assets/img/Handwoven_2.JPG', 'src/assets/img/Handwoven_3.JPG'],
      stock: 2,
      reviews: [
        { name: 'Emily R.', rating: 5, comment: 'This wall hanging is even more beautiful in person! The craftsmanship is incredible.', date: '2023-10-25' },
        { name: 'Thomas N.', rating: 4, comment: 'Love the natural colors and texture. It's the perfect addition to my living room.', date: '2023-09-18' }
      ]
    },
    {
      id: 7, 
      name: 'Handwoven Basket Set',
      categoryId: 3,
      designerId: 'd3', // Sophia Williams
      description: 'Set of three handwoven baskets in varying sizes. Perfect for storage or as decorative pieces. Each basket is made from sustainable materials.',
      details: 'Material: Natural seagrass<br>Sizes: Small (6" diameter), Medium (8" diameter), Large (10" diameter)<br>Finish: Natural<br>Care: Dust regularly, avoid moisture',
      price: 69.99,
      onSale: true,
      salePrice: 59.99,
      listingDate: '2024-03-01',
      images: ['src/assets/img/handwoven_item2_1.JPG', 'src/assets/img/handwoven_item2_2.JPG', 'src/assets/img/handwoven_item2_3.JPG'],
      stock: 4,
      reviews: [
        { name: 'Jennifer L.', rating: 5, comment: 'These baskets are beautiful and well-made. Perfect for organizing my space!', date: '2023-11-08' }
      ]
    }
  ];
  
  // Store data in localStorage
  localStorage.setItem('categories', JSON.stringify(categories));
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem('designers', JSON.stringify(designers));
  
  console.log('Data initialized successfully:', 
    products.length, 'products,', 
    categories.length, 'categories, and',
    designers.length, 'designers.'
  );
  
  return { products, categories, designers };
};

// Call initialization function
window.initializeData(); 