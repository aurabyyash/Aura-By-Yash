export const categories = [
  { id: 'necklaces', name: 'Necklaces', count: '32 items' },
  { id: 'rings', name: 'Rings', count: '24 items' },
  { id: 'bracelets', name: 'Bracelets', count: '18 items' },
  { id: 'earrings', name: 'Earrings', count: '20 items' }
];

export const products = [
  // Necklaces
  { id: 'n1', categoryId: 'necklaces', name: 'Celestial Star Chain', price: 1299, rating: '★★★★★ (48)', isNew: true, material: 'Premium Sterling Silver', antitarnish: 'Yes', image: 'placeholder' },
  { id: 'n2', categoryId: 'necklaces', name: 'Void Pendant', price: 1099, rating: '★★★★★ (29)', isNew: true, material: 'Stainless Steel', antitarnish: 'Yes', image: 'placeholder' },
  { id: 'n3', categoryId: 'necklaces', name: 'Diamond Cut Chain', price: 1599, rating: '★★★★★ (19)', isLtd: true, material: '18k Gold Plated', antitarnish: 'Yes', image: 'placeholder' },
  // Rings
  { id: 'r1', categoryId: 'rings', name: 'Eclipse Ring', price: 899, rating: '★★★★★ (62)', isHot: true, material: 'Matte Black Steel', antitarnish: 'Yes', image: 'placeholder' },
  { id: 'r2', categoryId: 'rings', name: 'Signet Classic', price: 999, rating: '★★★★☆ (15)', material: 'Sterling Silver', antitarnish: 'Yes', image: 'placeholder' },
  // Bracelets
  { id: 'b1', categoryId: 'bracelets', name: 'Arc Bracelet', price: 749, rating: '★★★★☆ (35)', material: 'Leather & Steel', antitarnish: 'Yes', image: 'placeholder' },
  { id: 'b2', categoryId: 'bracelets', name: 'Cuban Link Cuff', price: 1199, rating: '★★★★★ (42)', isNew: true, material: 'Titanium', antitarnish: 'Yes', image: 'placeholder' },
  // Earrings
  { id: 'e1', categoryId: 'earrings', name: 'Dual Stud Earrings', price: 649, rating: '★★★★☆ (41)', material: 'Surgical Steel', antitarnish: 'Yes', image: 'placeholder' },
  { id: 'e2', categoryId: 'earrings', name: 'Cross Drop', price: 599, rating: '★★★★★ (55)', material: 'Silver', antitarnish: 'Yes', image: 'placeholder' }
];

export const latestDrops = [
  products.find(p => p.id === 'n1'),
  products.find(p => p.id === 'r1'),
  products.find(p => p.id === 'b1'),
  products.find(p => p.id === 'n2'),
  products.find(p => p.id === 'e1'),
  products.find(p => p.id === 'n3')
];
