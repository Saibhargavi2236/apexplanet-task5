document.addEventListener("DOMContentLoaded", () => {
  // --- DOM refs
  const productGrid = document.getElementById("productGrid");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortOption = document.getElementById("sortOption");

  const openWishlistBtn = document.getElementById("openWishlist");
  const openCartBtn = document.getElementById("openCart");
  const wishlistModal = document.getElementById("wishlistModal");
  const cartModal = document.getElementById("cartModal");
  const wishlistItemsEl = document.getElementById("wishlistItems");
  const cartItemsEl = document.getElementById("cartItems");
  const wishlistCountEl = document.getElementById("wishlistCount");
  const cartCountEl = document.getElementById("cartCount");
  const cartTotalEl = document.getElementById("cartTotal");

  // --- Read product cards defined in HTML
  const allProducts = Array.from(productGrid.querySelectorAll(".product"));

  // --- State (persisted)
  const load = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // wishlist: { [name]: {name, price, img} }
  // cart: { [name]: {name, price, img, qty} }
  let wishlist = load("wishlist", {});
  let cart = load("cart", {});

  // --- Helpers
  const fmt = (n) => Number(n).toFixed(2);

  function getCardData(card) {
    return {
      name: card.dataset.name || card.querySelector("h4")?.textContent?.trim(),
      price: Number(card.dataset.price || 0),
      img: card.querySelector("img")?.getAttribute("src") || "",
      category: (card.dataset.category || "").toLowerCase(),
      rating: Number(card.dataset.rating || 0),
    };
  }

  function filterAndSort() {
    const cat = (categoryFilter.value || "all").toLowerCase();

    // filter (case-insensitive category)
    let filtered = allProducts.filter((p) => {
      const pcat = (p.dataset.category || "").toLowerCase();
      return cat === "all" || pcat === cat;
    });

    // sort
    if (sortOption.value === "priceLow") {
      filtered.sort((a, b) => +a.dataset.price - +b.dataset.price);
    } else if (sortOption.value === "priceHigh") {
      filtered.sort((a, b) => +b.dataset.price - +a.dataset.price);
    } else if (sortOption.value === "ratingHigh") {
      filtered.sort((a, b) => +b.dataset.rating - +a.dataset.rating);
    }

    // re-render order
    productGrid.innerHTML = "";
    filtered.forEach((p) => productGrid.appendChild(p));

    // keep 3-col grid
    productGrid.style.display = "grid";
    productGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
    productGrid.style.gap = "18px";

    syncButtons();
  }

  function syncButtons() {
    // Update button text/state from wishlist/cart
    allProducts.forEach((card) => {
      const { name } = getCardData(card);
      const wBtn = card.querySelector(".btn-wishlist");
      const cBtn = card.querySelector(".btn-cart");

      if (wBtn) {
        const inW = !!wishlist[name];
        wBtn.textContent = inW ? "❤️ In Wishlist" : "❤️ Add to Wishlist";
        wBtn.classList.toggle("is-active", inW);
      }
      if (cBtn) {
        const inC = !!cart[name];
        cBtn.textContent = inC ? "🛒 In Cart" : "🛒 Add to Cart";
        cBtn.classList.toggle("is-active", inC);
      }
    });

    wishlistCountEl.textContent = Object.keys(wishlist).length;
    cartCountEl.textContent = Object.values(cart).reduce((acc, it) => acc + (it.qty || 0), 0);
  }

  function renderWishlist() {
    wishlistItemsEl.innerHTML = "";
    const items = Object.values(wishlist);
    if (!items.length) {
      wishlistItemsEl.innerHTML = `<p>No items in wishlist.</p>`;
      return;
    }
    for (const it of items) {
      const row = document.createElement("div");
      row.className = "modal-item";
      row.innerHTML = `
        <img src="${it.img}" alt="${it.name}"/>
        <div>
          <h5>${it.name}</h5>
          <p>$${fmt(it.price)}</p>
        </div>
        <button class="remove-btn" data-remove-wishlist="${it.name}">Remove</button>
      `;
      wishlistItemsEl.appendChild(row);
    }
  }

  function renderCart() {
    cartItemsEl.innerHTML = "";
    const items = Object.values(cart);
    if (!items.length) {
      cartItemsEl.innerHTML = `<p>Your cart is empty.</p>`;
      cartTotalEl.textContent = "0.00";
      return;
    }
    let total = 0;
    for (const it of items) {
      total += it.price * it.qty;
      const row = document.createElement("div");
      row.className = "modal-item";
      row.innerHTML = `
        <img src="${it.img}" alt="${it.name}"/>
        <div>
          <h5>${it.name}</h5>
          <p>$${fmt(it.price)} × ${it.qty} = $${fmt(it.price * it.qty)}</p>
        </div>
        <div class="qty">
          <button data-dec="${it.name}">−</button>
          <span>${it.qty}</span>
          <button data-inc="${it.name}">＋</button>
          <button class="remove-btn" data-remove-cart="${it.name}">Remove</button>
        </div>
      `;
      cartItemsEl.appendChild(row);
    }
    cartTotalEl.textContent = fmt(total);
  }

  // --- Event: Add to wishlist / cart (event delegation)
  productGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".product");
    if (!card) return;
    const data = getCardData(card);

    // Wishlist
    if (e.target.classList.contains("btn-wishlist")) {
      if (wishlist[data.name]) {
        delete wishlist[data.name];
      } else {
        wishlist[data.name] = { name: data.name, price: data.price, img: data.img };
      }
      save("wishlist", wishlist);
      syncButtons();
    }

    // Cart
    if (e.target.classList.contains("btn-cart")) {
      if (cart[data.name]) {
        // already in cart -> increment
        cart[data.name].qty += 1;
      } else {
        cart[data.name] = { name: data.name, price: data.price, img: data.img, qty: 1 };
      }
      save("cart", cart);
      syncButtons();
    }
  });

  // --- Open/Close modals
  openWishlistBtn.addEventListener("click", () => {
    renderWishlist();
    wishlistModal.showModal();
  });
  openCartBtn.addEventListener("click", () => {
    renderCart();
    cartModal.showModal();
  });
  document.addEventListener("click", (e) => {
    const closeId = e.target.getAttribute("data-close");
    if (closeId === "wishlistModal") wishlistModal.close();
    if (closeId === "cartModal") cartModal.close();
  });

  // --- Actions inside modals (remove / qty +/-)
  wishlistItemsEl.addEventListener("click", (e) => {
    const name = e.target.getAttribute("data-remove-wishlist");
    if (name) {
      delete wishlist[name];
      save("wishlist", wishlist);
      renderWishlist();
      syncButtons();
    }
  });

  cartItemsEl.addEventListener("click", (e) => {
    const inc = e.target.getAttribute("data-inc");
    const dec = e.target.getAttribute("data-dec");
    const rm = e.target.getAttribute("data-remove-cart");

    if (inc && cart[inc]) {
      cart[inc].qty += 1;
      save("cart", cart);
      renderCart();
      syncButtons();
    }
    if (dec && cart[dec]) {
      cart[dec].qty = Math.max(0, cart[dec].qty - 1);
      if (cart[dec].qty === 0) delete cart[dec];
      save("cart", cart);
      renderCart();
      syncButtons();
    }
    if (rm && cart[rm]) {
      delete cart[rm];
      save("cart", cart);
      renderCart();
      syncButtons();
    }
  });

  // --- Filters
  categoryFilter.addEventListener("change", filterAndSort);
  sortOption.addEventListener("change", filterAndSort);

  // --- Initial render
  filterAndSort();
});
