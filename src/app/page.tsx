/**
 * Main Application Page
 * 
 * Hemköp product listing with Framer Motion animations.
 * Auto-generates recipes on load, updates on selection.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  priceDisplay: string;
  lowestPrice: number;
  lowestPriceDisplay: string;
  image: string | null;
  imageAlt: string;
  endDate: string;
}

interface Recipe {
  title: string;
  description: string;
  matchedProducts: string[];
  link?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Load products on mount
  useEffect(() => {
    fetch('/api/browse-ai')
      .then(res => res.json())
      .then(data => {
        const loadedProducts = data.products || [];
        setProducts(loadedProducts);
        
        // Generate initial recipes with all products
        if (loadedProducts.length > 0 && !hasInitiallyLoaded) {
          generateRecipes(loadedProducts);
          setHasInitiallyLoaded(true);
        }
      })
      .catch(console.error);
  }, []);

  // Update recipes when selection changes (only after initial load)
  useEffect(() => {
    if (!hasInitiallyLoaded) return;

    if (selectedIds.size === 0) {
      // No selection - show all products recipes
      generateRecipes(products);
    } else {
      // User has selected - show selected products recipes
      const selectedProducts = products.filter(p => selectedIds.has(p.id));
      generateRecipes(selectedProducts);
    }
  }, [selectedIds, hasInitiallyLoaded]);

  const generateRecipes = (productsToUse: Product[]) => {
    if (productsToUse.length === 0) {
      setRecipes([]);
      return;
    }

    setLoadingRecipes(true);

    fetch('/api/recipes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: productsToUse }),
    })
      .then(res => res.json())
      .then(data => setRecipes(data.recipes || []))
      .catch(console.error)
      .finally(() => setLoadingRecipes(false));
  };

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col lg:flex-row lg:h-screen">
        
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with animation */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0 px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-4 sm:pb-6 lg:pb-8 bg-white/80 backdrop-blur-sm border-b border-gray-200/60"
          >
            <h1 className="text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem] font-bold text-[#e4002b] mb-1 sm:mb-2 tracking-tight">
              Veckans erbjudanden
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-gray-600">
                {products.length} produkter
              </p>
              <AnimatePresence>
                {selectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <span className="text-[0.875rem] sm:text-[0.9375rem] text-[#e4002b] font-medium">
                      {selectedIds.size} valda
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              {products.map((product) => {
                const isSelected = selectedIds.has(product.id);
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleProduct(product.id)}
                    className={`
                      group relative bg-white rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300
                      ${isSelected 
                        ? 'ring-2 ring-[#e4002b] shadow-xl' 
                        : 'shadow-sm hover:shadow-xl ring-1 ring-gray-200/50'
                      }
                    `}
                  >
                    {/* Checkbox with animation */}
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
                      <motion.div
                        animate={{
                          scale: isSelected ? 1.1 : 1,
                          backgroundColor: isSelected ? '#e4002b' : 'rgba(255, 255, 255, 0.9)'
                        }}
                        className={`
                          w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center
                          ${isSelected ? 'shadow-lg' : 'backdrop-blur-sm border-2 border-gray-300'}
                        `}
                      >
                        <AnimatePresence>
                          {isSelected && (
                            <motion.svg
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              width="12" 
                              height="12" 
                              viewBox="0 0 14 14" 
                              fill="none"
                            >
                              <path 
                                d="M2 7L6 11L12 3" 
                                stroke="white" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              />
                            </motion.svg>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    {/* Product Image */}
                    <div className="aspect-square flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50/50 to-white rounded-t-xl sm:rounded-t-2xl overflow-hidden">
                      {product.image ? (
                        <motion.img
                          whileHover={{ scale: 1.1, rotate: 2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          src={product.image}
                          alt={product.imageAlt}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg sm:rounded-xl">
                          <svg className="w-10 h-10 sm:w-12 lg:w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4 lg:p-5">
                      {/* Price */}
                      <div className="mb-2 sm:mb-3">
                        {product.priceDisplay.includes('för') ? (
                          <div className="text-[1.25rem] sm:text-[1.5rem] lg:text-[1.625rem] font-bold text-[#e4002b] leading-tight tracking-tight">
                            {product.priceDisplay}
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1 sm:gap-1.5">
                            <span className="text-[1.5rem] sm:text-[1.75rem] lg:text-[2rem] font-bold text-[#e4002b] leading-none tracking-tight">
                              {product.price.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[0.75rem] sm:text-[0.875rem] lg:text-[0.9375rem] text-gray-500 font-medium">/st</span>
                          </div>
                        )}
                      </div>

                      {/* Lowest Price */}
                      {product.lowestPrice > 0 && (
                        <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100">
                          <p className="text-[0.6875rem] sm:text-[0.75rem] lg:text-[0.8125rem] text-gray-500 font-medium">
                            Lägsta 30 dgr: {product.lowestPrice.toFixed(2).replace('.', ',')} kr
                          </p>
                        </div>
                      )}

                      {/* Name */}
                      <h3 className="font-bold text-[0.8125rem] sm:text-[0.9375rem] lg:text-[1rem] text-gray-900 mb-1 sm:mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] leading-snug">
                        {product.name}
                      </h3>

                      {/* Brand */}
                      {product.brand && (
                        <p className="text-[0.75rem] sm:text-[0.8125rem] lg:text-[0.875rem] text-gray-600 mb-2 sm:mb-3 line-clamp-1">
                          {product.brand}
                        </p>
                      )}

                      {/* Expiry */}
                      {product.endDate && (
                        <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-100">
                          <p className="text-[0.6875rem] sm:text-[0.75rem] lg:text-[0.8125rem] text-gray-400 font-medium">
                            {product.endDate}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recipe Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full lg:w-[420px] flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-gray-200 lg:shadow-2xl max-h-[50vh] lg:max-h-none"
        >
          {/* Header */}
          <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-10 pb-4 sm:pb-6 lg:pb-8 border-b border-gray-200">
            <h2 className="text-[1.375rem] sm:text-[1.5rem] lg:text-[1.75rem] font-bold text-gray-900 mb-1 sm:mb-2 tracking-tight">
              Receptförslag
            </h2>
            <p className="text-[0.8125rem] sm:text-[0.875rem] lg:text-[0.9375rem] text-gray-600 leading-relaxed">
              {selectedIds.size === 0
                ? `Baserat på alla ${products.length} produkter`
                : `Baserat på ${selectedIds.size} vald${selectedIds.size > 1 ? 'a' : ''} produkt${selectedIds.size > 1 ? 'er' : ''}`
              }
            </p>
          </div>

          {/* Recipes */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <AnimatePresence mode="wait">
              {loadingRecipes ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-32 sm:h-48"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-gray-200 border-t-[#e4002b] rounded-full mb-3 sm:mb-4"
                  />
                  <p className="text-gray-500 text-[0.8125rem] sm:text-[0.9375rem] font-medium">Genererar recept...</p>
                </motion.div>
              ) : recipes.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center h-32 sm:h-48 text-center px-4 sm:px-6"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                  >
                    <svg className="w-7 h-7 sm:w-10 sm:h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </motion.div>
                  <p className="text-gray-900 text-[0.9375rem] sm:text-[1rem] font-semibold mb-1">Laddar recept...</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="recipes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3 sm:space-y-4"
                >
                  {recipes.map((recipe, idx) => (
                    <motion.a
                      key={idx}
                      href={recipe.link || `https://www.google.com/search?q=${encodeURIComponent(recipe.title + ' recept')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="group block p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-[#e4002b]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                        <h3 className="flex-1 text-gray-900 text-[0.9375rem] sm:text-[1rem] lg:text-[1.125rem] font-bold group-hover:text-[#e4002b] transition-colors">
                          {recipe.title}
                        </h3>
                        <svg 
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-[#e4002b] transition-colors flex-shrink-0 mt-0.5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-gray-600 text-[0.8125rem] sm:text-[0.875rem] lg:text-[0.9375rem] leading-relaxed mb-3 sm:mb-4">
                        {recipe.description}
                      </p>
                      <motion.div 
                        className="flex flex-wrap gap-1.5 sm:gap-2"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.05
                            }
                          }
                        }}
                      >
                        {recipe.matchedProducts.map((product, i) => (
                          <motion.span
                            key={i}
                            variants={{
                              hidden: { opacity: 0, scale: 0.8 },
                              visible: { opacity: 1, scale: 1 }
                            }}
                            className="text-[0.6875rem] sm:text-[0.75rem] lg:text-[0.8125rem] font-semibold text-[#e4002b] bg-red-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-red-100"
                          >
                            {product}
                          </motion.span>
                        ))}
                      </motion.div>
                    </motion.a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
