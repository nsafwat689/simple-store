/*
 * Simple Store JavaScript
 *
 * This file implements a lightweight e‑commerce store with categories,
 * products, a shopping cart, user authentication, order history and an
 * admin dashboard. All data is stored in browser localStorage for
 * persistence between sessions. There is no backend; this is purely
 * client‑side code suitable for demonstration purposes.
 */

// Immediately invoked function expression to avoid polluting global scope
(function () {

    // ==============================================
  // API Helper Functions for Persistent Storage
  // ==============================================
  
  const API_BASE = window.location.origin;
  
  async function apiGet(type) {
    try {
      const response = await fetch(`${API_BASE}/api/data?type=${type}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      return [];
    }
  }
  
  async function apiSet(type, data) {
    try {
      await fetch(`${API_BASE}/api/data?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('API SET Error:', error);
    }
  }
  
  async function uploadImage(imageData, filename) {
    try {
      const response = await fetch(`${API_BASE}/api/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, filename })
      });
      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Image upload error:', error);
      return imageData; // fallback to base64
    }
  }

  /**
   * Default advertisements to display on the home page. These can be
   * updated later by editing this array or via the admin panel once
   * extended for ad management.
   */
  const adsData = [
    {
      image: 'https://via.placeholder.com/300x150.png?text=Ad+1',
      text: 'Big sale on Category 1! Up to 50% off.'
    },
    {
      image: 'https://via.placeholder.com/300x150.png?text=Ad+2',
      text: 'Discover the latest items in Category 5.'
    },
    {
      image: 'https://via.placeholder.com/300x150.png?text=Ad+3',
      text: 'Free shipping on orders over $99.'
    }
  ];

  /**
   * Banner image storage. Banners are used for the home page slider and
   * stored in localStorage as an array of data URIs. Up to 10 images
   * can be stored. Admin page allows adding, deleting, moving and
   * replacing these images.
   */
  function getBannerImages() {
    const imgs = localStorage.getItem('banners');
    return imgs ? JSON.parse(imgs) : [];
  }
  function saveBannerImages(imgs) {
    localStorage.setItem('banners', JSON.stringify(imgs || []));
  }

  /**
   * Utility functions for localStorage operations
   */
  function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  }
  function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
  }
  function getLoggedInUser() {
    return localStorage.getItem('loggedInUser');
  }
  function setLoggedInUser(username) {
    if (username) {
      localStorage.setItem('loggedInUser', username);
    } else {
      localStorage.removeItem('loggedInUser');
    }
  }
  function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  }
  function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  /**
   * Global orders storage. Orders are stored in localStorage
   * under the key 'orders'. Each order record contains an id,
   * date, username, items, total and a status field (pending,
   * shipped or cancelled). These helper functions retrieve
   * and persist the orders array.
   */
  function getOrders() {
    const orders = localStorage.getItem('orders');
    return orders ? JSON.parse(orders) : [];
  }
  function saveOrders(orders) {
    localStorage.setItem('orders', JSON.stringify(orders));
  }
  function getUserByUsername(username) {
    return getUsers().find(u => u.username === username);
  }
  function saveUser(user) {
    const users = getUsers();
    const idx = users.findIndex(u => u.username === user.username);
    if (idx !== -1) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    saveUsers(users);
  }

  /**
   * Render the home page banner slider. If no images are present in
   * localStorage, the banner section will be hidden. Otherwise,
   * cycle through images every few seconds. Each slide fills the
   * available container width.
   */
  function renderBanner() {
    const banner = document.getElementById('banner');
    if (!banner) return;
    const images = getBannerImages();
    if (!images || images.length === 0) {
      banner.innerHTML = '';
      return;
    }
    const slider = document.createElement('div');
    slider.className = 'banner-slider';
    images.forEach((src, idx) => {
      const slide = document.createElement('div');
      slide.className = 'banner-slide';
      if (idx === 0) slide.classList.add('active');
      slide.innerHTML = `<img src="${src}" alt="Banner ${idx + 1}">`;
      slider.appendChild(slide);
    });
    banner.innerHTML = '';
    banner.appendChild(slider);
    const slides = slider.children;
    let current = 0;
    if (slides.length > 1) {
      setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
      }, 5000);
    }
  }

  /**
   * Initialize the side panel: attach toggle and close listeners
   * and handle translating the main content and body classes. This
   * should be invoked on every page with a menu toggle element.
   */
  function setupSidePanel() {
    const toggle = document.getElementById('menu-toggle');
    const panel = document.getElementById('side-panel');
    if (!toggle || !panel) return;
    const closeBtn = panel.querySelector('.close-btn');
    toggle.addEventListener('click', () => {
      const open = panel.classList.contains('open');
      if (open) {
        panel.classList.remove('open');
        document.body.classList.remove('panel-open');
      } else {
        panel.classList.add('open');
        document.body.classList.add('panel-open');
      }
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        document.body.classList.remove('panel-open');
      });
    }
    // Close panel when clicking a link inside
    panel.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        panel.classList.remove('open');
        document.body.classList.remove('panel-open');
      }
    });
  }

  /**
   * Render links into the side panel. Uses the same category data
   * as the top navigation but displayed vertically. Should be
   * called whenever categories are created, deleted or renamed.
   */
  function renderSideCategoryLinks() {
    // Deprecated: side panel has been removed. No action required.
    return;
  }

  /**
   * Admin credentials are stored in localStorage under 'adminUser'. The
   * structure is {username, password}. There is also a boolean flag
   * 'adminLoggedIn' indicating whether the admin has an active session.
   */
  function getAdmin() {
    const admin = localStorage.getItem('adminUser');
    return admin ? JSON.parse(admin) : null;
  }
  function saveAdmin(admin) {
    localStorage.setItem('adminUser', JSON.stringify(admin));
  }
  function isAdminLoggedIn() {
    return localStorage.getItem('adminLoggedIn') === 'true';
  }
  function setAdminLoggedIn(flag) {
    localStorage.setItem('adminLoggedIn', flag ? 'true' : 'false');
  }

  /**
   * Category storage. Categories and items are persisted in
   * localStorage under the key 'categories'. If no data is present,
   * generate default categories with dummy products.
   */
  function getStoredCategories() {
    const cats = localStorage.getItem('categories');
    return cats ? JSON.parse(cats) : null;
  }
  function saveCategories(categories) {
    localStorage.setItem('categories', JSON.stringify(categories));
  }
  function generateDefaultCategories() {
    const cats = [];
    for (let i = 1; i <= 10; i++) {
      const items = [];
      for (let j = 1; j <= 10; j++) {
        items.push({
          id: j,
          name: `Item ${i}.${j}`,
          price: (Math.random() * 90 + 10).toFixed(2),
          image: `https://via.placeholder.com/300x180.png?text=Item+${i}.${j}`,
          description: `This is the description for item ${i}.${j}.`
        });
      }
      cats.push({ id: i, name: `Category ${i}`, items });
    }
    return cats;
  }

  let categoriesData = getStoredCategories();
  if (!categoriesData) {
    categoriesData = generateDefaultCategories();
    saveCategories(categoriesData);
  }

  /**
   * Current search query used to filter products on the home page. When
   * empty, all products are shown. Updated via the search input in
   * the navigation bar.
   */
  let searchQuery = '';

  /**
   * Render the auth and cart links in the navigation bar. This should
   * be called whenever the page loads or when cart/user state changes.
   */
  function renderAuthLinks() {
    // Populate the top-links container with account options based on login state
    const topLinks = document.getElementById('top-links');
    if (topLinks) {
      const username = getLoggedInUser();
      let html = '';
      const wishCount = 0; // placeholder for wish list count
      if (username) {
        const user = getUserByUsername(username);
        const displayName = user && user.fullName ? user.fullName : username;
        // My Account dropdown replaced with direct links
        html += `<a href="history.html">Orders</a>`;
        html += `<a href="cart.html">Shopping Cart</a>`;
        html += `<a href="cart.html">Checkout</a>`;
        html += `<span class="welcome">Hi, ${displayName}</span>`;
        html += `<a href="#" id="logout-link">Logout</a>`;
      } else {
        html += `<a href="login.html">Login</a>`;
        html += `<a href="register.html">Register</a>`;
        html += `<a href="cart.html">Shopping Cart</a>`;
        html += `<a href="cart.html">Checkout</a>`;
      }
      // Wish list removed per latest requirements
      topLinks.innerHTML = html;
      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          setLoggedInUser(null);
          window.location.href = 'index.html';
        });
      }
    }
    // Update the cart summary bar
    updateCartSummary();
  }

  /**
   * Update the cart summary displayed in the header. Shows number of items
   * and total price in KWD. Called whenever cart state changes or page loads.
   */
  function updateCartSummary() {
    const summaryEl = document.getElementById('cart-summary');
    if (!summaryEl) return;
    const cart = getCart();
    let count = 0;
    let total = 0;
    cart.forEach(ci => {
      count += ci.quantity;
      // Resolve price from categories data
      const category = categoriesData.find(c => c.id === ci.categoryId);
      if (!category) return;
      const item = category.items.find(it => it.id === ci.itemId);
      if (!item) return;
      total += ci.quantity * parseFloat(item.price);
    });
    summaryEl.textContent = `${count} item(s) - KWD ${total.toFixed(2)}`;
  }

  /**
   * Render category anchor links in the navigation bar.
   */
  function renderCategoryLinks() {
    const container = document.getElementById('category-links');
    if (!container) return;
    let html = '';
    // Link to dedicated category page. When a link is clicked it will load
    // category.html with the appropriate query string. This allows full
    // category views separate from the home page ads.
    categoriesData.forEach(cat => {
      html += `<a href="category.html?cat=${cat.id}">${cat.name}</a>`;
    });
    container.innerHTML = html;
  }

  /**
   * Render advertisements on the home page.
   */
  function renderAds() {
    const adsContainer = document.getElementById('ads-container');
    if (!adsContainer) return;
    adsData.forEach(ad => {
      const div = document.createElement('div');
      div.className = 'ad-item';
      div.innerHTML = `<img src="${ad.image}" alt="Advertisement"><p>${ad.text}</p>`;
      adsContainer.appendChild(div);
    });
  }

  /**
   * Render product sections on the home page similar to the "Specials"
   * section of the reference store. For each category, display up to
   * four products in a grid with quantity selectors and add to cart
   * buttons. When the search query is active, this function will
   * filter items across all categories and only show categories that
   * have matching products. Items are displayed using the shared
   * .product-card styles defined in the CSS.
   */
  function renderHomeProducts() {
    const productsSection = document.getElementById('products');
    if (!productsSection) return;
    productsSection.innerHTML = '';
    const query = searchQuery ? searchQuery.toLowerCase() : '';
    categoriesData.forEach(cat => {
      // Filter items by search query if present
      let items = cat.items;
      if (query) {
        items = items.filter(item => item.name.toLowerCase().includes(query));
      }
      if (!items || items.length === 0) return;
      // Limit to first 4 items for the home page
      const itemsToShow = items.slice(0, 4);
      const catDiv = document.createElement('div');
      catDiv.className = 'products-category';
      catDiv.innerHTML = `<div class="products-header"><h2>${cat.name}</h2><a class="view-all" href="category.html?cat=${cat.id}">View all</a></div>`;
      const grid = document.createElement('div');
      grid.className = 'products-grid';
      itemsToShow.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <h3 class="product-name">${item.name}</h3>
          <div class="product-price"><span class="price">KWD ${item.price}</span></div>
          <div class="product-actions">
            <label style="font-size:0.75rem;margin-right:4px;">Qty:</label>
            <input type="number" class="qty-input" min="1" value="1" style="width:60px;margin-right:8px;">
            <button class="btn add-cart" data-cat="${cat.id}" data-id="${item.id}">Add to Cart</button>
          </div>
        `;
        grid.appendChild(card);
      });
      catDiv.appendChild(grid);
      productsSection.appendChild(catDiv);
    });
    // Event delegation for Add to Cart buttons in products grid
    productsSection.addEventListener('click', function (e) {
      const btn = e.target.closest('button.add-cart');
      if (btn && btn.dataset.cat) {
        const categoryId = parseInt(btn.dataset.cat);
        const itemId = parseInt(btn.dataset.id);
        let qty = 1;
        const parentCard = btn.closest('.product-card');
        if (parentCard) {
          const input = parentCard.querySelector('.qty-input');
          if (input) {
            qty = parseInt(input.value) || 1;
          }
        }
        addToCart(categoryId, itemId, qty);
      }
    });
  }

  /**
   * Render categories and products on the home page. Clicking the
   * "Add to Cart" button will update localStorage and the cart count.
   */
  function renderCategories() {
    // On the home page, render each category as a small advertisement
    // highlight with one or two products. This function also honours
    // the search query: if the query is present, it will filter
    // products across all categories and show matching items.
    const categoriesSection = document.getElementById('categories');
    if (!categoriesSection) return;
    categoriesSection.innerHTML = '';
    const query = searchQuery ? searchQuery.toLowerCase() : '';
    categoriesData.forEach(cat => {
      // Filter items by search query
      const itemsToShow = !query
        ? cat.items
        : cat.items.filter(item => item.name.toLowerCase().includes(query));
      if (!itemsToShow || itemsToShow.length === 0) return;
      // Create category highlight container
      const catDiv = document.createElement('div');
      catDiv.className = 'category-highlight';
      // Title links to the full category page
      catDiv.innerHTML = `<div class="highlight-header"><h2>${cat.name}</h2><a class="view-all" href="category.html?cat=${cat.id}">View all</a></div>`;
      const itemsWrapper = document.createElement('div');
      itemsWrapper.className = 'highlight-items';
      // Show at most 2 items to act as advertisement
      itemsToShow.slice(0, 2).forEach(item => {
        const card = document.createElement('div');
        card.className = 'highlight-card';
        card.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <div class="highlight-details">
            <div class="highlight-name">${item.name}</div>
            <div class="highlight-price">KWD ${item.price}</div>
            <div class="highlight-qty">
              <label>Qty:</label>
              <input type="number" min="1" value="1" class="qty-input" style="width:60px;">
            </div>
            <button class="btn add-cart" data-cat="${cat.id}" data-id="${item.id}">Add to Cart</button>
          </div>
        `;
        itemsWrapper.appendChild(card);
      });
      catDiv.appendChild(itemsWrapper);
      categoriesSection.appendChild(catDiv);
    });
    // Event delegation for Add to Cart buttons inside highlights
    categoriesSection.addEventListener('click', function (e) {
      const btn = e.target.closest('button.add-cart');
      if (btn && btn.dataset.cat) {
        const categoryId = parseInt(btn.dataset.cat);
        const itemId = parseInt(btn.dataset.id);
        // Get quantity from the nearest input
        let qty = 1;
        const parent = btn.closest('.highlight-card');
        if (parent) {
          const input = parent.querySelector('.qty-input');
          if (input) {
            qty = parseInt(input.value) || 1;
          }
        }
        addToCart(categoryId, itemId, qty);
      }
    });
  }

  /**
   * Add item to cart. If the item already exists, increment quantity.
   */
  function addToCart(categoryId, itemId, qty = 1) {
    // Adds a product to the cart. If it already exists, increase its
    // quantity by the provided amount instead of just incrementing by one.
    const quantity = qty && qty > 0 ? parseInt(qty) : 1;
    const cart = getCart();
    const existing = cart.find(ci => ci.categoryId === categoryId && ci.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ categoryId, itemId, quantity });
    }
    saveCart(cart);
    renderAuthLinks();
    alert('Item added to cart');
  }

  /**
   * Render the cart page. Handles increasing/decreasing quantity and removal.
   */
  function renderCartPage() {
    const container = document.querySelector('.cart-container');
    if (!container) return;
    const cart = getCart();
    container.innerHTML = '';
    // Heading
    const heading = document.createElement('h2');
    heading.textContent = 'Shopping Cart';
    container.appendChild(heading);
    // If empty cart
    if (cart.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'Your cart is empty.';
      container.appendChild(emptyMsg);
      return;
    }
    // Create table
    const table = document.createElement('table');
    table.className = 'cart-table';
    table.innerHTML = `<thead><tr><th>Image</th><th>Product Name</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    let subTotal = 0;
    cart.forEach(ci => {
      const category = categoriesData.find(c => c.id === ci.categoryId);
      if (!category) return;
      const item = category.items.find(it => it.id === ci.itemId);
      if (!item) return;
      const itemTotal = ci.quantity * parseFloat(item.price);
      subTotal += itemTotal;
      const tr = document.createElement('tr');
      // Image cell
      const imgTd = document.createElement('td');
      imgTd.innerHTML = `<img src="${item.image}" alt="${item.name}">`;
      tr.appendChild(imgTd);
      // Name cell
      const nameTd = document.createElement('td');
      nameTd.innerHTML = `<strong>${item.name}</strong><br><small>Category: ${category.name}</small>`;
      tr.appendChild(nameTd);
      // Quantity cell
      const qtyTd = document.createElement('td');
      const qtyGroup = document.createElement('div');
      qtyGroup.className = 'qty-group';
      qtyGroup.innerHTML = `
        <button class="qty-btn" data-action="decrease" data-cat="${ci.categoryId}" data-id="${ci.itemId}">-</button>
        <span>${ci.quantity}</span>
        <button class="qty-btn" data-action="increase" data-cat="${ci.categoryId}" data-id="${ci.itemId}">+</button>
        <button class="remove-btn" data-action="remove" data-cat="${ci.categoryId}" data-id="${ci.itemId}">Remove</button>
      `;
      qtyTd.appendChild(qtyGroup);
      tr.appendChild(qtyTd);
      // Unit price cell
      const priceTd = document.createElement('td');
      priceTd.textContent = `KD ${parseFloat(item.price).toFixed(2)}`;
      tr.appendChild(priceTd);
      // Total cell
      const totalTd = document.createElement('td');
      totalTd.textContent = `KD ${itemTotal.toFixed(2)}`;
      tr.appendChild(totalTd);
      tbody.appendChild(tr);
    });
    container.appendChild(table);
    // Actions (continue shopping and checkout)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'cart-actions';
    const continueLink = document.createElement('a');
    continueLink.href = 'index.html';
    continueLink.className = 'continue-btn';
    continueLink.textContent = 'Continue Shopping';
    const checkoutBtn = document.createElement('button');
    checkoutBtn.className = 'checkout-btn';
    checkoutBtn.textContent = 'Checkout';
    checkoutBtn.addEventListener('click', () => checkout());
    actionsDiv.appendChild(continueLink);
    actionsDiv.appendChild(checkoutBtn);
    container.appendChild(actionsDiv);
    // Totals summary
    const totalsDiv = document.createElement('div');
    totalsDiv.className = 'cart-totals';
    const totalsTable = document.createElement('table');
    totalsTable.innerHTML = `
      <tr><td>Sub-Total:</td><td>KD ${subTotal.toFixed(2)}</td></tr>
      <tr><td><strong>Total:</strong></td><td><strong>KD ${subTotal.toFixed(2)}</strong></td></tr>
    `;
    totalsDiv.appendChild(totalsTable);
    container.appendChild(totalsDiv);
    // Payment method note (below totals)
    const paymentDiv = document.createElement('div');
    paymentDiv.className = 'payment-method';
    paymentDiv.style.marginTop = '12px';
    paymentDiv.textContent = 'Payment Method: Cash on Delivery';
    container.appendChild(paymentDiv);
    // Attach click handlers for qty and removal. Assign to onclick so previous handler is replaced
    container.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const action = btn.dataset.action;
      const categoryId = parseInt(btn.dataset.cat);
      const itemId = parseInt(btn.dataset.id);
      updateCartItem(action, categoryId, itemId);
      // Rerender and update nav
      renderCartPage();
      renderAuthLinks();
    };
  }

  /**
   * Adjust quantity or remove items in the cart.
   */
  function updateCartItem(action, categoryId, itemId) {
    let cart = getCart();
    const idx = cart.findIndex(ci => ci.categoryId === categoryId && ci.itemId === itemId);
    if (idx === -1) return;
    if (action === 'increase') {
      cart[idx].quantity += 1;
    } else if (action === 'decrease') {
      cart[idx].quantity -= 1;
      if (cart[idx].quantity <= 0) {
        cart.splice(idx, 1);
      }
    } else if (action === 'remove') {
      cart.splice(idx, 1);
    }
    saveCart(cart);
  }

  /**
   * Finalize purchase: ensures user is logged in, records order history, clears cart.
   */
  function checkout() {
    const username = getLoggedInUser();
    if (!username) {
      alert('Please log in to complete your purchase.');
      window.location.href = 'login.html';
      return;
    }
    const cart = getCart();
    if (cart.length === 0) return;
    const user = getUserByUsername(username);
    if (!user) return;
    const orderItems = cart.map(ci => {
      const category = categoriesData.find(c => c.id === ci.categoryId);
      const item = category.items.find(it => it.id === ci.itemId);
      return {
        catId: ci.categoryId,
        itemId: ci.itemId,
        name: item.name,
        quantity: ci.quantity,
        price: item.price
      };
    });
    const total = orderItems.reduce((sum, it) => sum + it.quantity * parseFloat(it.price), 0);
    const order = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      user: username,
      items: orderItems,
      total: total.toFixed(2)
      ,
      status: 'pending'
    };
    if (!user.history) {
      user.history = [];
    }
    user.history.push(order);
    saveUser(user);
    // Persist order in global orders list
    const allOrders = getOrders();
    allOrders.push(order);
    saveOrders(allOrders);
    saveCart([]);
    alert('Thank you for your purchase!');
    window.location.href = 'history.html';
  }

  /**
   * Render the order history page for logged in users.
   */
  function renderHistoryPage() {
    const container = document.querySelector('.history-container');
    if (!container) return;
    const username = getLoggedInUser();
    if (!username) {
      container.innerHTML = '<p>Please log in to see your order history.</p>';
      return;
    }

  /**
   * Render the billing section in the admin dashboard. This section allows
   * admins to filter orders by various criteria (status, amount, item count,
   * item name, username and date range) and export the filtered results to
   * a CSV file for billing analysis. The billing data is derived from the
   * global orders list stored in localStorage.
   * @param {HTMLElement} section The container into which the billing UI will be rendered.
   */
  function renderBillingSection(section) {
    if (!section) return;
    // Clear previous content
    section.innerHTML = '';
    const heading = document.createElement('h3');
    heading.textContent = 'Billing';
    section.appendChild(heading);
    // Filters container
    const filtersDiv = document.createElement('div');
    filtersDiv.className = 'billing-filters';
    filtersDiv.innerHTML = `
      <label>Status
        <select id="billing-status">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
        </select>
      </label>
      <label>Min Amount (KWD)
        <input type="number" id="billing-min-amount" min="0" step="0.01" placeholder="0.00">
      </label>
      <label>Max Amount (KWD)
        <input type="number" id="billing-max-amount" min="0" step="0.01" placeholder="">
      </label>
      <label>Min Items Count
        <input type="number" id="billing-min-count" min="0" step="1" placeholder="0">
      </label>
      <label>Max Items Count
        <input type="number" id="billing-max-count" min="0" step="1" placeholder="">
      </label>
      <label>Item Name
        <input type="text" id="billing-item-name" placeholder="e.g., Item 1">
      </label>
      <label>Username
        <input type="text" id="billing-username" placeholder="e.g., johndoe">
      </label>
      <label>Start Date
        <input type="date" id="billing-start-date">
      </label>
      <label>End Date
        <input type="date" id="billing-end-date">
      </label>
    `;
    section.appendChild(filtersDiv);
    // Actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'billing-actions';
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply Filter';
    applyBtn.className = 'checkout-btn';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export CSV';
    exportBtn.className = 'checkout-btn';
    actionsDiv.appendChild(applyBtn);
    actionsDiv.appendChild(exportBtn);
    section.appendChild(actionsDiv);
    // Results container
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'billing-results';
    section.appendChild(resultsDiv);
    // Variable to hold current filtered results
    let currentFiltered = [];
    // Helper to parse date string stored in orders
    function parseOrderDate(dateStr) {
      // Attempt to parse using Date constructor; fallback to new Date
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }
    // Render table with billing data
    function renderBillingTable(list) {
      resultsDiv.innerHTML = '';
      if (!list || list.length === 0) {
        resultsDiv.textContent = 'No orders found for the selected criteria.';
        return;
      }
      const table = document.createElement('table');
      table.className = 'orders-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>User</th>
            <th>Status</th>
            <th>Items</th>
            <th>Total (KWD)</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      list.forEach(o => {
        const tr = document.createElement('tr');
        const tdId = document.createElement('td');
        tdId.textContent = o.id;
        tr.appendChild(tdId);
        const tdDate = document.createElement('td');
        tdDate.textContent = o.date;
        tr.appendChild(tdDate);
        const tdUser = document.createElement('td');
        tdUser.textContent = o.user;
        tr.appendChild(tdUser);
        const tdStatus = document.createElement('td');
        tdStatus.textContent = o.status.charAt(0).toUpperCase() + o.status.slice(1);
        tr.appendChild(tdStatus);
        const tdItems = document.createElement('td');
        tdItems.textContent = o.items.map(it => `${it.quantity} x ${it.name}`).join(', ');
        tr.appendChild(tdItems);
        const tdTotal = document.createElement('td');
        tdTotal.textContent = parseFloat(o.total).toFixed(2);
        tr.appendChild(tdTotal);
        tbody.appendChild(tr);
      });
      resultsDiv.appendChild(table);
      // Compute total revenue
      const totalRevenue = list.reduce((sum, o) => sum + parseFloat(o.total), 0);
      const summary = document.createElement('div');
      summary.style.marginTop = '8px';
      summary.innerHTML = `<strong>Total Billing: KD ${totalRevenue.toFixed(2)}</strong>`;
      resultsDiv.appendChild(summary);
    }
    // Filter orders based on input values
    function applyFilters() {
      const statusVal = document.getElementById('billing-status').value;
      const minAmountVal = parseFloat(document.getElementById('billing-min-amount').value);
      const maxAmountVal = parseFloat(document.getElementById('billing-max-amount').value);
      const minCountVal = parseInt(document.getElementById('billing-min-count').value);
      const maxCountVal = parseInt(document.getElementById('billing-max-count').value);
      const itemNameVal = document.getElementById('billing-item-name').value.trim().toLowerCase();
      const usernameVal = document.getElementById('billing-username').value.trim().toLowerCase();
      const startDateVal = document.getElementById('billing-start-date').value;
      const endDateVal = document.getElementById('billing-end-date').value;
      const startDate = startDateVal ? new Date(startDateVal) : null;
      const endDate = endDateVal ? new Date(endDateVal) : null;
      let orders = getOrders();
      // Apply status filter
      if (statusVal !== 'all') {
        orders = orders.filter(o => o.status === statusVal);
      }
      // Apply amount filter
      orders = orders.filter(o => {
        const tot = parseFloat(o.total);
        if (!isNaN(minAmountVal) && tot < minAmountVal) return false;
        if (!isNaN(maxAmountVal) && tot > maxAmountVal) return false;
        return true;
      });
      // Apply items count filter
      orders = orders.filter(o => {
        const count = o.items.reduce((s, it) => s + it.quantity, 0);
        if (!isNaN(minCountVal) && count < minCountVal) return false;
        if (!isNaN(maxCountVal) && count > maxCountVal) return false;
        return true;
      });
      // Apply item name filter
      if (itemNameVal) {
        orders = orders.filter(o => o.items.some(it => it.name.toLowerCase().includes(itemNameVal)));
      }
      // Apply username filter
      if (usernameVal) {
        orders = orders.filter(o => o.user.toLowerCase().includes(usernameVal));
      }
      // Apply date range filter
      if (startDate || endDate) {
        orders = orders.filter(o => {
          const d = parseOrderDate(o.date);
          if (!d) return false;
          if (startDate && d < startDate) return false;
          if (endDate) {
            // Add one day to endDate to include orders on the end date
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            if (d >= end) return false;
          }
          return true;
        });
      }
      currentFiltered = orders;
      renderBillingTable(currentFiltered);
    }
    // Export current filtered orders to CSV
    function exportCSV() {
      // Ensure there is data to export
      if (!currentFiltered || currentFiltered.length === 0) {
        alert('No billing data to export. Please apply filters to generate results.');
        return;
      }
      const rows = [];
      rows.push(['ID','Date','User','Status','Items','Total']);
      currentFiltered.forEach(o => {
        const itemsStr = o.items.map(it => `${it.quantity} x ${it.name}`).join('; ');
        rows.push([o.id, o.date, o.user, o.status, itemsStr, o.total]);
      });
      const csvContent = rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'billing_data.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    applyBtn.addEventListener('click', applyFilters);
    exportBtn.addEventListener('click', exportCSV);
    // Initial render
    applyFilters();
  }
    const user = getUserByUsername(username);
    if (!user || !user.history || user.history.length === 0) {
      container.innerHTML = '<p>No orders yet.</p>';
      return;
    }
    container.innerHTML = '';
    // Display user information at top
    const infoDiv = document.createElement('div');
    infoDiv.className = 'user-info';
    infoDiv.style.marginBottom = '24px';
    infoDiv.innerHTML = `
      <h3>Your Information</h3>
      <p><strong>Name:</strong> ${user.fullName || user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Phone:</strong> ${user.phone || '-'}</p>
      <p><strong>Address:</strong> ${user.address || '-'}</p>
      <p><strong>Payment Method:</strong> Cash on Delivery</p>
    `;
    container.appendChild(infoDiv);
    // Display order history
    user.history.slice().reverse().forEach(order => {
      const orderDiv = document.createElement('div');
      orderDiv.className = 'order';
      orderDiv.innerHTML = `<div class="order-title">Order #${order.id} – ${order.date}</div>`;
      order.items.forEach(it => {
        const itemRow = document.createElement('div');
        itemRow.innerHTML = `${it.quantity} x ${it.name} – KWD ${(it.quantity * parseFloat(it.price)).toFixed(2)}`;
        orderDiv.appendChild(itemRow);
      });
      const totalRow = document.createElement('div');
      totalRow.style.marginTop = '8px';
      totalRow.innerHTML = `<strong>Total: KWD ${order.total}</strong>`;
      orderDiv.appendChild(totalRow);
      // Display order status so the customer knows the current state of their order
      const statusRow = document.createElement('div');
      statusRow.style.marginTop = '4px';
      const statusLabel = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown';
      statusRow.innerHTML = `<strong>Status:</strong> ${statusLabel}`;
      orderDiv.appendChild(statusRow);
      container.appendChild(orderDiv);
    });
  }

  /**
   * Render a single category page. The page URL should include a
   * query parameter `cat=<id>`. This view lists all products in the
   * selected category with quantity selectors and add-to-cart buttons.
   */
  function renderCategoryPage() {
    const itemsContainer = document.getElementById('category-items');
    if (!itemsContainer) return;
    const sidebar = document.getElementById('category-sidebar');
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('cat');
    const catId = catParam ? parseInt(catParam) : NaN;
    const category = categoriesData.find(c => c.id === catId);
    // Populate sidebar with all categories
    if (sidebar) {
      let html = '<h3>Categories</h3><ul>';
      categoriesData.forEach(cat => {
        const active = cat.id === catId ? 'active' : '';
        html += `<li><a href="category.html?cat=${cat.id}" class="${active}">${cat.name}</a></li>`;
      });
      html += '</ul>';
      sidebar.innerHTML = html;
    }
    if (!category) {
      itemsContainer.innerHTML = '<p>Category not found.</p>';
      return;
    }
    itemsContainer.innerHTML = '';
    // Category title
    const title = document.createElement('h2');
    title.textContent = category.name;
    itemsContainer.appendChild(title);
    // Items list grid
    const list = document.createElement('div');
    list.className = 'category-item-grid';
    category.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'category-item-card';
      card.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <div class="category-item-info">
          <div class="category-item-name">${item.name}</div>
          <div class="category-item-price">KWD ${item.price}</div>
          <div class="category-item-desc">${item.description}</div>
          <div class="category-item-qty">
            <label>Qty:</label>
            <input type="number" min="1" value="1" class="qty-input">
          </div>
          <button class="btn add-to-cart" data-cat="${category.id}" data-id="${item.id}">Add to Cart</button>
        </div>
      `;
      list.appendChild(card);
    });
    itemsContainer.appendChild(list);
    // Attach event listener for adding to cart
    itemsContainer.addEventListener('click', function (e) {
      const btn = e.target.closest('button.add-to-cart');
      if (!btn || !btn.dataset.cat) return;
      const catId2 = parseInt(btn.dataset.cat);
      const itemId2 = parseInt(btn.dataset.id);
      let qty = 1;
      const parent = btn.closest('.category-item-card');
      if (parent) {
        const input = parent.querySelector('.qty-input');
        if (input) {
          qty = parseInt(input.value) || 1;
        }
      }
      addToCart(catId2, itemId2, qty);
    });
  }

  /**
   * Handle user registration on the register page.
   */
  function handleRegister() {
    const form = document.getElementById('register-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Capture all registration fields including full name, phone and address
      const fullName = form.fullname ? form.fullname.value.trim() : '';
      const username = form.username.value.trim();
      const email = form.email.value.trim();
      const phone = form.phone ? form.phone.value.trim() : '';
      const address = form.address ? form.address.value.trim() : '';
      const password = form.password.value;
      // Ensure all fields are provided
      if (!fullName || !username || !email || !phone || !address || !password) {
        alert('Please fill out all fields');
        return;
      }
      // Check if username already exists
      if (getUserByUsername(username)) {
        alert('Username already exists');
        return;
      }
      // Create user object with extended information and default blocked flag
      const user = {
        username,
        fullName,
        email,
        phone,
        address,
        password,
        history: [],
        blocked: false
      };
      saveUser(user);
      setLoggedInUser(username);
      alert('Registration successful!');
      window.location.href = 'index.html';
    });
  }

  /**
   * Handle user login on the login page.
   */
  function handleLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const username = form.username.value.trim();
      const password = form.password.value;
      const user = getUserByUsername(username);
      if (!user || user.password !== password) {
        alert('Invalid credentials');
        return;
      }
      if (user.blocked) {
        alert('Your account has been blocked. Please contact support.');
        return;
      }
      // Persist login without showing an alert. The success message has been removed per latest requirements.
      setLoggedInUser(username);
      // Redirect to home page after successful login without any popup
      window.location.href = 'index.html';
    });
  }

  /**
   * Admin dashboard rendering and operations. The admin page (admin.html)
   * includes a login form and, upon successful login, displays forms
   * to modify categories and products as well as change the admin password.
   */
  function renderAdminPage() {
    const container = document.querySelector('.admin-container');
    if (!container) return;
    // Initialize admin account if none exists
    if (!getAdmin()) {
      saveAdmin({ username: 'admin', password: 'admin123' });
    }
    // If admin is logged in, show dashboard; otherwise show login form
    if (!isAdminLoggedIn()) {
      renderAdminLogin(container);
    } else {
      renderAdminDashboard(container);
    }
  }

  function renderAdminLogin(container) {
    container.innerHTML = '';
    const form = document.createElement('form');
    form.id = 'admin-login-form';
    form.className = 'form-container';
    form.innerHTML = `
      <h2>Admin Login</h2>
      <div class="form-group">
        <label for="admin-username">Username</label>
        <input type="text" id="admin-username" name="username" required>
      </div>
      <div class="form-group">
        <label for="admin-password">Password</label>
        <input type="password" id="admin-password" name="password" required>
      </div>
      <button type="submit" class="btn">Log In</button>
    `;
    container.appendChild(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const username = form.username.value.trim();
      const password = form.password.value;
      const admin = getAdmin();
      if (!admin || admin.username !== username || admin.password !== password) {
        alert('Invalid admin credentials');
        return;
      }
      setAdminLoggedIn(true);
      renderAdminDashboard(container);
    });
  }

  function renderAdminDashboard(container) {
    container.innerHTML = '';
    // Header with logout button
    const header = document.createElement('div');
    header.className = 'admin-section';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    const title = document.createElement('h2');
    title.textContent = 'Admin Dashboard';
    // color is handled by CSS
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn';
    logoutBtn.textContent = 'Log Out';
    logoutBtn.addEventListener('click', () => {
      setAdminLoggedIn(false);
      renderAdminLogin(container);
    });
    header.appendChild(title);
    header.appendChild(logoutBtn);
    container.appendChild(header);
    // Create a menu grid for admin actions. Icons will be added after sections are created.
    const menuGrid = document.createElement('div');
    menuGrid.className = 'admin-menu-grid';
    container.appendChild(menuGrid);
    // Password change section
    const pwdSection = document.createElement('div');
    pwdSection.className = 'admin-section';
    pwdSection.innerHTML = `
      <h3>Change Admin Password</h3>
      <form id="change-pwd-form">
        <div class="form-group">
          <label for="old-password">Current Password</label>
          <input type="password" id="old-password" required>
        </div>
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" required>
        </div>
        <button type="submit" class="btn">Change Password</button>
      </form>
    `;
    container.appendChild(pwdSection);
    const changePwdForm = pwdSection.querySelector('#change-pwd-form');
    changePwdForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const oldPwd = changePwdForm.querySelector('#old-password').value;
      const newPwd = changePwdForm.querySelector('#new-password').value;
      const admin = getAdmin();
      if (admin.password !== oldPwd) {
        alert('Incorrect current password');
        return;
      }
      admin.password = newPwd;
      saveAdmin(admin);
      alert('Password updated successfully');
      changePwdForm.reset();
    });
    // ---- Split management into separate sections: Categories and Items ----
    // Manage Categories section
    const catSection = document.createElement('div');
    catSection.className = 'admin-section';
    catSection.innerHTML = `<h3>Manage Categories</h3>`;
    // Add new category form with image upload option
    const addCatForm = document.createElement('form');
    addCatForm.id = 'add-category-form';
    addCatForm.innerHTML = `
      <div class="form-group">
        <label for="new-category-name">New Category Name</label>
        <input type="text" id="new-category-name" required>
      </div>
      <div class="form-group">
        <label for="new-category-image">Category Image (optional)</label>
        <input type="file" id="new-category-image" accept="image/*">
      </div>
      <button type="submit" class="btn">Add Category</button>
    `;
    catSection.appendChild(addCatForm);
    // Container for category list
    const catList = document.createElement('div');
    catList.id = 'admin-category-list';
    catList.style.marginTop = '24px';
    catSection.appendChild(catList);
    container.appendChild(catSection);

    // Manage Items section
    const itemSection = document.createElement('div');
    itemSection.className = 'admin-section';
    itemSection.innerHTML = `<h3>Manage Items</h3>`;
    // Dropdown to select category
    const selectWrap = document.createElement('div');
    selectWrap.className = 'form-group';
    selectWrap.innerHTML = `
      <label for="item-category-select">Select Category</label>
      <select id="item-category-select"></select>
      <button type="button" class="btn" id="add-item-btn">Add Item</button>
    `;
    itemSection.appendChild(selectWrap);
    // Container for item list
    const itemListDiv = document.createElement('div');
    itemListDiv.id = 'admin-item-list';
    itemListDiv.style.marginTop = '24px';
    itemSection.appendChild(itemListDiv);
    container.appendChild(itemSection);

    // Function to refresh the category list in the Manage Categories section
    function refreshCategoryList() {
      catList.innerHTML = '';
      categoriesData.forEach(cat => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '12px';
        row.style.border = '1px solid #333';
        row.style.marginBottom = '12px';
        let catImg = '';
        if (cat.image) {
          catImg = `<img src="${cat.image}" alt="${cat.name}" style="width:48px;height:48px;object-fit:cover;margin-right:8px;border-radius:4px;">`;
        }
        row.innerHTML = `
          <div style="display:flex;align-items:center;">
            ${catImg}
            <strong>${cat.name}</strong> (ID: ${cat.id})
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn" data-action="edit-cat" data-id="${cat.id}">Edit Name</button>
            <button class="btn" data-action="delete-cat" data-id="${cat.id}">Delete</button>
          </div>
        `;
        catList.appendChild(row);
      });
      // Also refresh the category dropdown for items
      refreshCategorySelect();
    }

    // Populate category dropdown used for items
    function refreshCategorySelect() {
      const select = itemSection.querySelector('#item-category-select');
      const currentValue = select.value;
      select.innerHTML = '';
      categoriesData.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
      // Restore previously selected value if still exists
      if (currentValue) {
        const opt = Array.from(select.options).find(o => o.value === currentValue);
        if (opt) {
          select.value = currentValue;
        }
      }
      // Trigger item list refresh after updating select options
      refreshItemList();
    }

    // Refresh item list for selected category
    function refreshItemList() {
      const select = itemSection.querySelector('#item-category-select');
      const catId = parseInt(select.value);
      const cat = categoriesData.find(c => c.id === catId);
      itemListDiv.innerHTML = '';
      if (!cat) return;
      cat.items.forEach(item => {
        const row = document.createElement('div');
        row.style.border = '1px solid #333';
        row.style.padding = '8px';
        row.style.marginBottom = '8px';
        row.innerHTML = `
          <strong>${item.name}</strong> – KWD ${item.price}<br>
          <span style="font-size:0.85rem;">${item.description}</span>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button class="btn" data-action="edit-item" data-cat="${cat.id}" data-id="${item.id}">Edit</button>
            <button class="btn" data-action="delete-item" data-cat="${cat.id}" data-id="${item.id}">Delete</button>
          </div>
        `;
        itemListDiv.appendChild(row);
      });
    }

    refreshCategoryList();

    // Add new category handler with optional image upload
    addCatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = addCatForm.querySelector('#new-category-name').value.trim();
      const fileInput = addCatForm.querySelector('#new-category-image');
      if (!name) {
        alert('Category name required');
        return;
      }
      const newId = categoriesData.length ? Math.max(...categoriesData.map(c => c.id)) + 1 : 1;
      const file = fileInput && fileInput.files && fileInput.files[0];
      function finishAddCategory(imageSrc) {
        categoriesData.push({ id: newId, name, items: [], image: imageSrc || '' });
        saveCategories(categoriesData);
        refreshCategoryList();
        addCatForm.reset();
        renderCategoryLinks();
        renderSideCategoryLinks();
      }
      if (file) {
        const reader = new FileReader();
        reader.onload = function () {
          finishAddCategory(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        finishAddCategory('');
      }
    });

    // Click handlers for categories (edit/delete)
    catList.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const action = btn.dataset.action;
      const categoryId = parseInt(btn.dataset.id);
      if (action === 'delete-cat') {
        if (!confirm('Are you sure you want to delete this category?')) return;
        const idx = categoriesData.findIndex(c => c.id === categoryId);
        if (idx !== -1) {
          categoriesData.splice(idx, 1);
          saveCategories(categoriesData);
          refreshCategoryList();
          renderCategoryLinks();
          renderSideCategoryLinks();
        }
      } else if (action === 'edit-cat') {
        const cat = categoriesData.find(c => c.id === categoryId);
        if (cat) {
          const newName = prompt('Enter new category name', cat.name);
          if (newName && newName.trim()) {
            cat.name = newName.trim();
            saveCategories(categoriesData);
            refreshCategoryList();
            renderCategoryLinks();
            renderSideCategoryLinks();
          }
        }
      }
    });

    // Category selection change to refresh items
    const catSelect = itemSection.querySelector('#item-category-select');
    catSelect.addEventListener('change', refreshItemList);

    // Handler for Add Item button
    const addItemBtn = itemSection.querySelector('#add-item-btn');
    addItemBtn.addEventListener('click', function () {
      const select = itemSection.querySelector('#item-category-select');
      const catId = parseInt(select.value);
      showItemForm(null, catId);
    });

    // Handle clicks within item list (edit/delete)
    itemListDiv.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const action = btn.dataset.action;
      const categoryId = parseInt(btn.dataset.cat);
      const itemId = parseInt(btn.dataset.id);
      if (action === 'delete-item') {
        if (!confirm('Delete this item?')) return;
        const cat = categoriesData.find(c => c.id === categoryId);
        if (cat) {
          const idx2 = cat.items.findIndex(i => i.id === itemId);
          if (idx2 !== -1) {
            cat.items.splice(idx2, 1);
            saveCategories(categoriesData);
            refreshItemList();
          }
        }
      } else if (action === 'edit-item') {
        showItemForm(itemId, categoryId);
      }
    });

    // Override showItemForm to refresh both category and item lists after saving
    function showItemForm(itemId, categoryId) {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.7)';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      const formContainer = document.createElement('div');
      formContainer.style.background = 'var(--secondary)';
      formContainer.style.padding = '24px';
      formContainer.style.borderRadius = '8px';
      formContainer.style.width = '90%';
      formContainer.style.maxWidth = '500px';
      const cat = categoriesData.find(c => c.id === categoryId);
      let existingItem = null;
      if (itemId) {
        existingItem = cat.items.find(i => i.id === itemId);
      }
      formContainer.innerHTML = `
        <h3>${existingItem ? 'Edit Item' : 'Add New Item'}</h3>
        <form id="item-form">
          <div class="form-group">
            <label for="item-name">Name</label>
            <input type="text" id="item-name" value="${existingItem ? existingItem.name : ''}" required>
          </div>
          <div class="form-group">
            <label for="item-price">Price (KWD)</label>
            <input type="number" step="0.01" id="item-price" value="${existingItem ? existingItem.price : ''}" required>
          </div>
          <div class="form-group">
            <label for="item-image-file">Upload Image (optional)</label>
            <input type="file" id="item-image-file" accept="image/*">
          </div>
          <div class="form-group">
            <label for="item-image">Image URL (optional)</label>
            <input type="text" id="item-image" value="${existingItem ? existingItem.image : ''}">
          </div>
          <div class="form-group">
            <label for="item-desc">Description</label>
            <input type="text" id="item-desc" value="${existingItem ? existingItem.description : ''}" required>
          </div>
          <button type="submit" class="btn">${existingItem ? 'Save Changes' : 'Add Item'}</button>
          <button type="button" class="btn" id="cancel-item-form">Cancel</button>
        </form>
      `;
      overlay.appendChild(formContainer);
      document.body.appendChild(overlay);
      const itemForm = formContainer.querySelector('#item-form');
      itemForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = itemForm.querySelector('#item-name').value.trim();
        const priceVal = itemForm.querySelector('#item-price').value;
        const urlInput = itemForm.querySelector('#item-image').value.trim();
        const fileInput = itemForm.querySelector('#item-image-file');
        const desc = itemForm.querySelector('#item-desc').value.trim();
        if (!name || !priceVal || !desc) {
          alert('Please fill out all required fields');
          return;
        }
        const price = parseFloat(priceVal).toFixed(2);
        const file = fileInput && fileInput.files && fileInput.files[0];
        function finishAdd(imageSrc) {
          if (existingItem) {
            existingItem.name = name;
            existingItem.price = price;
            existingItem.image = imageSrc;
            existingItem.description = desc;
          } else {
            const newId = cat.items.length ? Math.max(...cat.items.map(i => i.id)) + 1 : 1;
            cat.items.push({ id: newId, name, price, image: imageSrc, description: desc });
          }
          saveCategories(categoriesData);
          refreshCategoryList();
          refreshItemList();
          document.body.removeChild(overlay);
        }
        if (file) {
          const reader2 = new FileReader();
          reader2.onload = function () {
            finishAdd(reader2.result);
          };
          reader2.readAsDataURL(file);
        } else if (urlInput) {
          finishAdd(urlInput);
        } else {
          alert('Please provide an image via upload or URL');
        }
      });
      formContainer.querySelector('#cancel-item-form').addEventListener('click', function () {
        document.body.removeChild(overlay);
      });
    }

    // After management sections, render banner and user management and capture the sections
    const bannerSection = renderBannerAdmin(container);
    const usersSection = renderUserManagement(container);
    // Assign unique IDs to each admin section for easy toggling
    pwdSection.id = 'section-password';
    catSection.id = 'section-categories';
    itemSection.id = 'section-items';
    bannerSection.id = 'section-banners';
    usersSection.id = 'section-users';
    /* ---------------------------------------------------------------------
     * Orders management sections.
     *
     * We integrate order management directly into the admin dashboard. Three
     * separate sections are created for Pending, Shipped and Cancelled orders.
     * Each section contains a table listing orders of that status. Admins can
     * update the status via a dropdown; changes persist to localStorage and
     * the tables refresh automatically.
     */
    // Create pending orders section
    const pendingOrdersSection = document.createElement('div');
    pendingOrdersSection.className = 'admin-section';
    pendingOrdersSection.id = 'section-orders-pending';
    container.appendChild(pendingOrdersSection);
    // Create shipped orders section
    const shippedOrdersSection = document.createElement('div');
    shippedOrdersSection.className = 'admin-section';
    shippedOrdersSection.id = 'section-orders-shipped';
    container.appendChild(shippedOrdersSection);
    // Create cancelled orders section
    const cancelledOrdersSection = document.createElement('div');
    cancelledOrdersSection.className = 'admin-section';
    cancelledOrdersSection.id = 'section-orders-cancelled';
    container.appendChild(cancelledOrdersSection);
    // Helper to render a table of orders by status
    function renderOrdersByStatus(section, status) {
      const orders = getOrders();
      section.innerHTML = '';
      const heading = document.createElement('h3');
      // Capitalize status for heading
      heading.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} Orders`;
      section.appendChild(heading);
      const table = document.createElement('table');
      table.className = 'orders-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>User</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      orders
        .filter(o => o.status === status)
        .forEach(o => {
          const tr = document.createElement('tr');
          // ID
          const tdId = document.createElement('td');
          tdId.textContent = o.id;
          tr.appendChild(tdId);
          // Date
          const tdDate = document.createElement('td');
          tdDate.textContent = o.date;
          tr.appendChild(tdDate);
          // User
          const tdUser = document.createElement('td');
          tdUser.textContent = o.user;
          tr.appendChild(tdUser);
          // Items summary
          const tdItems = document.createElement('td');
          const summary = o.items.map(it => `${it.quantity} x ${it.name}`).join(', ');
          tdItems.textContent = summary;
          tr.appendChild(tdItems);
          // Total
          const tdTotal = document.createElement('td');
          tdTotal.textContent = `KD ${parseFloat(o.total).toFixed(2)}`;
          tr.appendChild(tdTotal);
          // Status select
          const tdStatus = document.createElement('td');
          const select = document.createElement('select');
          select.className = 'status-select';
          select.dataset.id = o.id;
          ['pending','shipped','cancelled'].forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal.charAt(0).toUpperCase() + optVal.slice(1);
            if (optVal === o.status) opt.selected = true;
            select.appendChild(opt);
          });
          // Disable status changes for cancelled orders so that once an order is final it cannot be altered
          if (o.status === 'cancelled') {
            select.disabled = true;
          }
          tdStatus.appendChild(select);
          tr.appendChild(tdStatus);
          tbody.appendChild(tr);
        });
      section.appendChild(table);
    }
    // Render all orders sections initially
    function refreshOrdersSections() {
      renderOrdersByStatus(pendingOrdersSection, 'pending');
      renderOrdersByStatus(shippedOrdersSection, 'shipped');
      renderOrdersByStatus(cancelledOrdersSection, 'cancelled');
    }
    refreshOrdersSections();
    // Listen for localStorage changes from other tabs/windows. When orders are updated
    // (e.g., a new order is placed), refresh the orders sections automatically
    window.addEventListener('storage', function (e) {
      if (e.key === 'orders') {
        refreshOrdersSections();
      }
    });
    // Listen for status changes within orders sections
    [pendingOrdersSection, shippedOrdersSection, cancelledOrdersSection].forEach(sec => {
      sec.addEventListener('change', function (e) {
        const select = e.target.closest('select.status-select');
        if (!select) return;
        const id = parseInt(select.dataset.id);
        const newStatus = select.value;
        const orders = getOrders();
        const idx = orders.findIndex(o => o.id === id);
        if (idx !== -1) {
          orders[idx].status = newStatus;
          saveOrders(orders);
          // Also update the status in each user's order history so customers see the latest status
          const users = getUsers();
          let updated = false;
          users.forEach(u => {
            if (u.history && Array.isArray(u.history)) {
              const hIdx = u.history.findIndex(ord => ord.id === id);
              if (hIdx !== -1) {
                u.history[hIdx].status = newStatus;
                updated = true;
              }
            }
          });
          if (updated) {
            saveUsers(users);
          }
          refreshOrdersSections();
        }
      });
    });
    // Hide all admin sections initially
    [pwdSection, catSection, itemSection, bannerSection, usersSection, pendingOrdersSection, shippedOrdersSection, cancelledOrdersSection].forEach(sec => {
      sec.style.display = 'none';
    });
    // Helper function to toggle sections. For user management, optionally show list or add form.
    function showSection(target) {
      // Hide all top-level sections
      [pwdSection, catSection, itemSection, bannerSection, usersSection, pendingOrdersSection, shippedOrdersSection, cancelledOrdersSection].forEach(sec => {
        sec.style.display = 'none';
      });
      if (target === 'password') {
        pwdSection.style.display = 'block';
      } else if (target === 'categories') {
        catSection.style.display = 'block';
      } else if (target === 'items') {
        itemSection.style.display = 'block';
      } else if (target === 'banners') {
        bannerSection.style.display = 'block';
      } else if (target === 'users-list' || target === 'users-add') {
        usersSection.style.display = 'block';
        const listEl = usersSection.querySelector('#user-list');
        const addForm = usersSection.querySelector('#add-user-form');
        const addHeader = usersSection.querySelector('h4');
        // Some elements may not exist if structure changes; check before using
        if (target === 'users-list') {
          if (listEl) listEl.style.display = 'block';
          if (addForm) addForm.style.display = 'none';
          if (addHeader) addHeader.style.display = 'none';
        } else {
          if (listEl) listEl.style.display = 'none';
          if (addForm) addForm.style.display = 'block';
          if (addHeader) addHeader.style.display = 'block';
        }
      } else if (target === 'orders-pending') {
        pendingOrdersSection.style.display = 'block';
      } else if (target === 'orders-shipped') {
        shippedOrdersSection.style.display = 'block';
      } else if (target === 'orders-cancelled') {
        cancelledOrdersSection.style.display = 'block';
      }
    }
    // Utility to create a menu item with icon and label
    function createMenuItem(icon, label, target) {
      const item = document.createElement('div');
      item.className = 'admin-menu-item';
      item.innerHTML = `<span class="menu-icon">${icon}</span><span class="menu-label">${label}</span>`;
      item.dataset.target = target;
      item.addEventListener('click', function () {
        // Remove active class from all icons
        menuGrid.querySelectorAll('.admin-menu-item').forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');
        showSection(target);
      });
      menuGrid.appendChild(item);
    }
    // Create menu icons for each admin function
    createMenuItem('🔒', 'Password', 'password');
    createMenuItem('📂', 'Categories', 'categories');
    createMenuItem('📦', 'Items', 'items');
    createMenuItem('🖼️', 'Banners', 'banners');
    createMenuItem('👥', 'Users', 'users-list');
    createMenuItem('➕', 'Add User', 'users-add');
    // Orders status icons
    createMenuItem('⌛', 'Pending Orders', 'orders-pending');
    createMenuItem('✅', 'Shipped Orders', 'orders-shipped');
    createMenuItem('❌', 'Cancelled Orders', 'orders-cancelled');
    // No returned or billing menu items in this version
  }

  /**
   * Render banner management section in the admin dashboard. Allows
   * uploading up to 10 images for the home page banner slider,
   * deleting images and moving them up or down in the order. Images
   * are stored as Data URIs in localStorage.
   */
  function renderBannerAdmin(parent) {
    // Create section container
    const section = document.createElement('div');
    section.className = 'admin-section';
    section.innerHTML = `
      <h3>Manage Home Banners</h3>
      <form id="add-banner-form">
        <div class="form-group">
          <label for="banner-files">Upload Banner Images (max 10)</label>
          <input type="file" id="banner-files" accept="image/*" multiple>
        </div>
        <button type="submit" class="btn">Add Images</button>
      </form>
      <div id="banner-list" style="margin-top:24px;"></div>
    `;
    parent.appendChild(section);
    const addForm = section.querySelector('#add-banner-form');
    const bannerListDiv = section.querySelector('#banner-list');
    function refreshBannerList() {
      const banners = getBannerImages();
      bannerListDiv.innerHTML = '';
      if (!banners || banners.length === 0) {
        bannerListDiv.innerHTML = '<p>No banner images uploaded.</p>';
        return;
      }
      banners.forEach((src, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '12px';
        row.style.marginBottom = '12px';
        row.innerHTML = `
          <img src="${src}" alt="Banner ${idx+1}" style="width:80px;height:50px;object-fit:cover;border-radius:4px;">
          <span>Banner ${idx + 1}</span>
          <button class="btn" data-action="up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''}>Up</button>
          <button class="btn" data-action="down" data-index="${idx}" ${idx === banners.length - 1 ? 'disabled' : ''}>Down</button>
          <button class="btn" data-action="delete" data-index="${idx}">Delete</button>
        `;
        bannerListDiv.appendChild(row);
      });
    }
    refreshBannerList();
    // Add banners
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const files = addForm.querySelector('#banner-files').files;
      if (!files || files.length === 0) return;
      let currentImages = getBannerImages();
      const filesArr = Array.from(files);
      // Only allow up to 10 images total
      if (currentImages.length >= 10) {
        alert('Maximum of 10 banner images reached. Please delete some before adding more.');
        return;
      }
      const promises = [];
      filesArr.forEach(file => {
        if (currentImages.length + promises.length >= 10) return;
        const reader = new FileReader();
        const p = new Promise(res => {
          reader.onload = () => res(reader.result);
        });
        reader.readAsDataURL(file);
        promises.push(p);
      });
      Promise.all(promises).then(results => {
        currentImages = currentImages.concat(results);
        saveBannerImages(currentImages);
        refreshBannerList();
        addForm.reset();
      });
    });
    // Banner list actions
    bannerListDiv.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index);
      let banners = getBannerImages();
      if (action === 'delete') {
        banners.splice(index, 1);
        saveBannerImages(banners);
        refreshBannerList();
      } else if (action === 'up' && index > 0) {
        const temp = banners[index - 1];
        banners[index - 1] = banners[index];
        banners[index] = temp;
        saveBannerImages(banners);
        refreshBannerList();
      } else if (action === 'down' && index < banners.length - 1) {
        const temp = banners[index + 1];
        banners[index + 1] = banners[index];
        banners[index] = temp;
        saveBannerImages(banners);
        refreshBannerList();
      }
    });
    // Return the section element so the caller can reference it
    return section;
  }

  /**
   * Render user management section in the admin dashboard. This allows
   * the admin to view all registered users, block/unblock them,
   * delete users and add new users manually. Blocked users will not
   * be able to log in.
   */
  function renderUserManagement(parent) {
    const section = document.createElement('div');
    section.className = 'admin-section';
    section.innerHTML = `
      <h3>Manage Users</h3>
      <div id="user-list" style="margin-bottom:24px;"></div>
      <h4>Add New User</h4>
      <form id="add-user-form">
        <div class="form-group">
          <label for="add-full-name">Full Name</label>
          <input type="text" id="add-full-name" required>
        </div>
        <div class="form-group">
          <label for="add-username">Username</label>
          <input type="text" id="add-username" required>
        </div>
        <div class="form-group">
          <label for="add-email">Email</label>
          <input type="email" id="add-email" required>
        </div>
        <div class="form-group">
          <label for="add-phone">Phone</label>
          <input type="tel" id="add-phone" required>
        </div>
        <div class="form-group">
          <label for="add-address">Address</label>
          <input type="text" id="add-address" required>
        </div>
        <div class="form-group">
          <label for="add-password">Password</label>
          <input type="password" id="add-password" required>
        </div>
        <button type="submit" class="btn">Add User</button>
      </form>
    `;
    parent.appendChild(section);
    const userListDiv = section.querySelector('#user-list');
    const addUserForm = section.querySelector('#add-user-form');
    function refreshUserList() {
      const users = getUsers();
      userListDiv.innerHTML = '';
      if (!users || users.length === 0) {
        userListDiv.innerHTML = '<p>No users found.</p>';
        return;
      }
      users.forEach(u => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.marginBottom = '12px';
        row.innerHTML = `
          <div style="flex:1;"><strong>${u.fullName || u.username}</strong> (${u.username}) – ${u.email}</div>
          <div style="flex:1;">Phone: ${u.phone || '-'} | Addr: ${u.address || '-'}</div>
          <button class="btn" data-action="${u.blocked ? 'unblock' : 'block'}" data-username="${u.username}">${u.blocked ? 'Unblock' : 'Block'}</button>
          <button class="btn" data-action="delete" data-username="${u.username}">Delete</button>
        `;
        userListDiv.appendChild(row);
      });
    }
    refreshUserList();
    // Add new user handler
    addUserForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const fullName = addUserForm.querySelector('#add-full-name').value.trim();
      const username = addUserForm.querySelector('#add-username').value.trim();
      const email = addUserForm.querySelector('#add-email').value.trim();
      const phone = addUserForm.querySelector('#add-phone').value.trim();
      const address = addUserForm.querySelector('#add-address').value.trim();
      const password = addUserForm.querySelector('#add-password').value;
      if (!fullName || !username || !email || !phone || !address || !password) {
        alert('Please fill out all fields');
        return;
      }
      if (getUserByUsername(username)) {
        alert('Username already exists');
        return;
      }
      const newUser = {
        username,
        fullName,
        email,
        phone,
        address,
        password,
        history: [],
        blocked: false
      };
      saveUser(newUser);
      refreshUserList();
      addUserForm.reset();
    });
    // Handle user list actions
    userListDiv.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const username = btn.dataset.username;
      const action = btn.dataset.action;
      const users = getUsers();
      const idx = users.findIndex(u => u.username === username);
      if (idx === -1) return;
      if (action === 'delete') {
        if (!confirm('Delete this user?')) return;
        users.splice(idx, 1);
        saveUsers(users);
        refreshUserList();
      } else if (action === 'block') {
        users[idx].blocked = true;
        saveUsers(users);
        refreshUserList();
      } else if (action === 'unblock') {
        users[idx].blocked = false;
        saveUsers(users);
        refreshUserList();
      }
    });
    // Return the user management section so the caller can hide/show it
    return section;
  }

  /**
   * Render the orders management page. This page allows the admin
   * (or authorized staff) to view all orders grouped by status and
   * update each order's status. If the admin is not logged in,
   * display the admin login form. Orders are stored in localStorage
   * and updated using the getOrders/saveOrders helpers.
   */
  function renderOrdersPage() {
    const container = document.querySelector('.orders-container');
    if (!container) return;
    // Ensure admin account exists
    if (!getAdmin()) {
      saveAdmin({ username: 'admin', password: 'admin123' });
    }
    // If admin not logged in, show login form
    if (!isAdminLoggedIn()) {
      renderOrdersLogin(container);
    } else {
      renderOrdersManagement(container);
    }
  }

  // Render admin login form for orders page
  function renderOrdersLogin(container) {
    container.innerHTML = '';
    const form = document.createElement('form');
    form.id = 'orders-login-form';
    form.className = 'form-container';
    form.innerHTML = `
      <h2>Admin Login</h2>
      <div class="form-group">
        <label for="orders-admin-username">Username</label>
        <input type="text" id="orders-admin-username" name="username" required>
      </div>
      <div class="form-group">
        <label for="orders-admin-password">Password</label>
        <input type="password" id="orders-admin-password" name="password" required>
      </div>
      <button type="submit" class="btn">Log In</button>
    `;
    container.appendChild(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const username = form.username.value.trim();
      const password = form.password.value;
      const admin = getAdmin();
      if (!admin || admin.username !== username || admin.password !== password) {
        alert('Invalid admin credentials');
        return;
      }
      setAdminLoggedIn(true);
      renderOrdersManagement(container);
    });
  }

  // Render orders management interface
  function renderOrdersManagement(container) {
    container.innerHTML = '';
    // Header with logout button
    const header = document.createElement('div');
    header.className = 'admin-section';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    const title = document.createElement('h2');
    title.textContent = 'Manage Orders';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn';
    logoutBtn.textContent = 'Log Out';
    logoutBtn.addEventListener('click', () => {
      setAdminLoggedIn(false);
      renderOrdersLogin(container);
    });
    header.appendChild(title);
    header.appendChild(logoutBtn);
    container.appendChild(header);
    // Fetch orders
    let orders = getOrders();
    // Group orders by status
    const statuses = ['pending', 'shipped', 'cancelled'];
    statuses.forEach(status => {
      const section = document.createElement('div');
      section.className = 'admin-section';
      const heading = document.createElement('h3');
      heading.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} Orders`;
      section.appendChild(heading);
      // Create table
      const table = document.createElement('table');
      table.className = 'orders-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>User</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      orders
        .filter(o => o.status === status)
        .forEach(o => {
          const tr = document.createElement('tr');
          // ID
          const tdId = document.createElement('td');
          tdId.textContent = o.id;
          tr.appendChild(tdId);
          // Date
          const tdDate = document.createElement('td');
          tdDate.textContent = o.date;
          tr.appendChild(tdDate);
          // User
          const tdUser = document.createElement('td');
          tdUser.textContent = o.user;
          tr.appendChild(tdUser);
          // Items summary
          const tdItems = document.createElement('td');
          const summary = o.items.map(it => `${it.quantity} x ${it.name}`).join(', ');
          tdItems.textContent = summary;
          tr.appendChild(tdItems);
          // Total
          const tdTotal = document.createElement('td');
          tdTotal.textContent = `KD ${parseFloat(o.total).toFixed(2)}`;
          tr.appendChild(tdTotal);
          // Status select
          const tdStatus = document.createElement('td');
          const select = document.createElement('select');
          select.className = 'status-select';
          select.dataset.id = o.id;
          ['pending','shipped','cancelled'].forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal.charAt(0).toUpperCase() + optVal.slice(1);
            if (optVal === o.status) opt.selected = true;
            select.appendChild(opt);
          });
          tdStatus.appendChild(select);
          tr.appendChild(tdStatus);
          tbody.appendChild(tr);
        });
      section.appendChild(table);
      container.appendChild(section);
    });
    // Listen for status change events
    container.addEventListener('change', function (e) {
      const select = e.target.closest('select.status-select');
      if (!select) return;
      const id = parseInt(select.dataset.id);
      const newStatus = select.value;
      orders = getOrders();
      const idx = orders.findIndex(o => o.id === id);
      if (idx !== -1) {
        orders[idx].status = newStatus;
        saveOrders(orders);
        // Re-render to reflect changes
        renderOrdersManagement(container);
      }
    });
  }

  /**
   * Initialize the appropriate functions depending on the current page.
   */
  function init() {
    // Determine which page we're on by checking the body class or unique element
    renderAuthLinks();
    // Side panel is no longer used; categories are displayed in the header
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
      renderCategoryLinks();
      renderBanner();
      // Render the home page product sections (specials) instead of category highlights
      renderHomeProducts();
    } else if (path.endsWith('cart.html')) {
      renderCartPage();
    } else if (path.endsWith('history.html')) {
      renderHistoryPage();
    } else if (path.endsWith('login.html')) {
      handleLogin();
    } else if (path.endsWith('register.html')) {
      handleRegister();
    } else if (path.endsWith('admin.html')) {
      renderAdminPage();
    } else if (path.endsWith('orders.html')) {
      renderOrdersPage();
    } else if (path.endsWith('category.html')) {
      renderCategoryPage();
    }
    // Attach search listener on any page that has the search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        // Update suggestions dropdown
        updateSearchSuggestions();
        // Re-render home products if on the index page
        if (document.getElementById('products')) {
          renderHomeProducts();
        }
      });
    }

    // Handle search button click to trigger search
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', function () {
        searchQuery = searchInput.value.trim();
        updateSearchSuggestions();
        if (document.getElementById('products')) {
          renderHomeProducts();
        }
      });
    }

    // Hide search suggestions when clicking outside the search box
    document.addEventListener('click', function (e) {
      const suggestions = document.getElementById('search-suggestions');
      const searchBox = document.querySelector('.search-box');
      if (suggestions && searchBox && !searchBox.contains(e.target)) {
        suggestions.style.display = 'none';
      }
    });
  }

  // Run init once DOM is loaded
  document.addEventListener('DOMContentLoaded', init);

  /**
   * Update the search suggestions dropdown. This function reads the
   * current query from the search input and finds matching items
   * across all categories. Each suggestion displays the product
   * image (thumbnail) and name. Clicking a suggestion takes the
   * user to the corresponding category page. The suggestions box is
   * hidden when there is no query or no matches.
   */
  function updateSearchSuggestions() {
    const searchInput = document.getElementById('search-input');
    const suggestions = document.getElementById('search-suggestions');
    if (!searchInput || !suggestions) return;
    const query = searchInput.value.trim().toLowerCase();
    suggestions.innerHTML = '';
    if (!query) {
      suggestions.style.display = 'none';
      return;
    }
    const matches = [];
    categoriesData.forEach(cat => {
      cat.items.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
          matches.push({
            catId: cat.id,
            itemId: item.id,
            name: item.name,
            image: item.image
          });
        }
      });
    });
    // Limit number of suggestions to 6
    const limited = matches.slice(0, 6);
    limited.forEach(match => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      const img = document.createElement('img');
      img.src = match.image;
      img.alt = match.name;
      div.appendChild(img);
      const span = document.createElement('span');
      span.textContent = match.name;
      div.appendChild(span);
      div.addEventListener('click', function () {
        // Navigate to category page for the item
        window.location.href = 'category.html?cat=' + match.catId;
      });
      suggestions.appendChild(div);
    });
    suggestions.style.display = limited.length > 0 ? 'block' : 'none';
  }
})();
