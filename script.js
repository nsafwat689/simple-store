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
    const authContainer = document.getElementById('auth-links');
    if (!authContainer) return;
    const username = getLoggedInUser();
    const cart = getCart();
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    let html = '';
    if (username) {
      // Determine display name: use fullName if provided
      const user = getUserByUsername(username);
      const displayName = user && user.fullName ? user.fullName : username;
      html += `<a href="history.html">Orders</a>`;
      html += `<a href="cart.html" class="cart-count" data-count="${cartCount}">Cart</a>`;
      html += `<span class="welcome">Hi, ${displayName}</span>`;
      html += `<a href="#" id="logout-link">Logout</a>`;
    } else {
      html += `<a href="login.html">Login</a>`;
      html += `<a href="register.html">Register</a>`;
      html += `<a href="cart.html" class="cart-count" data-count="${cartCount}">Cart</a>`;
    }
    authContainer.innerHTML = html;
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        setLoggedInUser(null);
        window.location.reload();
      });
    }
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
    if (cart.length === 0) {
      container.innerHTML = '<p>Your cart is empty.</p>';
      return;
    }
    let total = 0;
    const itemsList = document.createElement('div');
    cart.forEach(ci => {
      const category = categoriesData.find(c => c.id === ci.categoryId);
      const item = category.items.find(it => it.id === ci.itemId);
      const itemTotal = ci.quantity * parseFloat(item.price);
      total += itemTotal;
      const itemDiv = document.createElement('div');
      itemDiv.className = 'cart-item';
      itemDiv.innerHTML = `
        <div class="cart-item-details">
          <strong>${item.name}</strong>
          <span>Price: KWD ${item.price}</span>
          <span>Quantity: ${ci.quantity}</span>
          <span>Subtotal: KWD ${itemTotal.toFixed(2)}</span>
        </div>
        <div class="cart-item-actions">
          <button class="btn btn-sm" data-action="decrease" data-cat="${ci.categoryId}" data-id="${ci.itemId}">-</button>
          <button class="btn btn-sm" data-action="increase" data-cat="${ci.categoryId}" data-id="${ci.itemId}">+</button>
          <button class="btn btn-sm" data-action="remove" data-cat="${ci.categoryId}" data-id="${ci.itemId}">Remove</button>
        </div>
      `;
      itemsList.appendChild(itemDiv);
    });
    container.innerHTML = '';
    container.appendChild(itemsList);
    const totalDiv = document.createElement('div');
    totalDiv.className = 'cart-total';
    totalDiv.textContent = `Total: KWD ${total.toFixed(2)}`;
    container.appendChild(totalDiv);
    // Payment method note
    const paymentDiv = document.createElement('div');
    paymentDiv.className = 'payment-method';
    paymentDiv.textContent = 'Payment Method: Cash on Delivery';
    container.appendChild(paymentDiv);
    const checkoutBtn = document.createElement('button');
    checkoutBtn.className = 'btn';
    checkoutBtn.textContent = 'Checkout';
    checkoutBtn.addEventListener('click', () => checkout());
    container.appendChild(checkoutBtn);
    // Attach handlers for quantity and removal
    container.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const action = btn.dataset.action;
      const categoryId = parseInt(btn.dataset.cat);
      const itemId = parseInt(btn.dataset.id);
      updateCartItem(action, categoryId, itemId);
      // Re-render cart page and nav after update
      renderCartPage();
      renderAuthLinks();
    });
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
        name: item.name,
        quantity: ci.quantity,
        price: item.price
      };
    });
    const total = orderItems.reduce((sum, it) => sum + it.quantity * parseFloat(it.price), 0);
    const order = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      items: orderItems,
      total: total.toFixed(2)
    };
    if (!user.history) {
      user.history = [];
    }
    user.history.push(order);
    saveUser(user);
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
      container.appendChild(orderDiv);
    });
  }

  /**
   * Render a single category page. The page URL should include a
   * query parameter `cat=<id>`. This view lists all products in the
   * selected category with quantity selectors and add-to-cart buttons.
   */
  function renderCategoryPage() {
    const container = document.getElementById('category-items');
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('cat');
    const catId = catParam ? parseInt(catParam) : NaN;
    const category = categoriesData.find(c => c.id === catId);
    if (!category) {
      container.innerHTML = '<p>Category not found.</p>';
      return;
    }
    container.innerHTML = '';
    // Category title
    const title = document.createElement('h2');
    title.textContent = category.name;
    container.appendChild(title);
    // Items list
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
    container.appendChild(list);
    // Attach event listener for adding to cart
    container.addEventListener('click', function (e) {
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
      // Create user object with extended information
      const user = {
        username,
        fullName,
        email,
        phone,
        address,
        password,
        history: []
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
      setLoggedInUser(username);
      alert('Login successful');
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
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    const title = document.createElement('h2');
    title.textContent = 'Admin Dashboard';
    title.style.color = 'var(--primary)';
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
    // Password change section
    const pwdSection = document.createElement('div');
    pwdSection.className = 'form-container';
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
    // Category and product management section
    const management = document.createElement('div');
    management.className = 'form-container';
    management.style.marginTop = '40px';
    management.innerHTML = `<h3>Manage Categories & Products</h3>`;
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
    management.appendChild(addCatForm);
    // Category list container
    const catList = document.createElement('div');
    catList.id = 'admin-category-list';
    catList.style.marginTop = '24px';
    management.appendChild(catList);
    container.appendChild(management);
    // Populate category list
    function refreshCategoryList() {
      catList.innerHTML = '';
      categoriesData.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.style.border = '1px solid #333';
        catDiv.style.padding = '12px';
        catDiv.style.marginBottom = '16px';
        // Display category image if provided
        let catImg = '';
        if (cat.image) {
          catImg = `<img src="${cat.image}" alt="${cat.name}" style="width:48px;height:48px;object-fit:cover;margin-right:8px;border-radius:4px;">`;
        }
        catDiv.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;">
              ${catImg}
              <strong>${cat.name}</strong> (ID: ${cat.id})
            </div>
            <div>
              <button class="btn" data-action="edit-cat" data-id="${cat.id}">Edit Name</button>
              <button class="btn" data-action="delete-cat" data-id="${cat.id}">Delete Category</button>
            </div>
          </div>
        `;
        // Products table for this category
        const itemList = document.createElement('div');
        cat.items.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.style.borderTop = '1px dashed #444';
          itemDiv.style.padding = '8px 0';
          itemDiv.innerHTML = `
            <div><strong>${item.name}</strong> – KWD ${item.price}</div>
            <div>Description: ${item.description}</div>
            <div>Image: <a href="${item.image}" target="_blank">${item.image.substring(0,50)}${item.image.length > 50 ? '...' : ''}</a></div>
            <button class="btn" data-action="edit-item" data-cat="${cat.id}" data-id="${item.id}">Edit</button>
            <button class="btn" data-action="delete-item" data-cat="${cat.id}" data-id="${item.id}">Delete</button>
          `;
          itemList.appendChild(itemDiv);
        });
        // Button to add new item
        const addItemBtn = document.createElement('button');
        addItemBtn.className = 'btn';
        addItemBtn.textContent = 'Add New Item';
        addItemBtn.dataset.action = 'add-item';
        addItemBtn.dataset.cat = cat.id;
        catDiv.appendChild(addItemBtn);
        catDiv.appendChild(itemList);
        catList.appendChild(catDiv);
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
      if (file) {
        const reader = new FileReader();
        reader.onload = function () {
          const dataUrl = reader.result;
          categoriesData.push({ id: newId, name, items: [], image: dataUrl });
          saveCategories(categoriesData);
          refreshCategoryList();
          addCatForm.reset();
        };
        reader.readAsDataURL(file);
      } else {
        categoriesData.push({ id: newId, name, items: [], image: '' });
        saveCategories(categoriesData);
        refreshCategoryList();
        addCatForm.reset();
      }
    });
    // Handle clicks on category list (delete, edit, add item, edit item, delete item)
    catList.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action) return;
      const action = btn.dataset.action;
      // For delete-cat and edit-cat, the id is in data-id; for items it's in data-cat
      const categoryId = parseInt(btn.dataset.cat || btn.dataset.id);
      if (action === 'delete-cat') {
        if (!confirm('Are you sure you want to delete this category?')) return;
        const idx = categoriesData.findIndex(c => c.id === categoryId);
        if (idx !== -1) {
          categoriesData.splice(idx, 1);
          saveCategories(categoriesData);
          refreshCategoryList();
        }
      } else if (action === 'edit-cat') {
        const cat = categoriesData.find(c => c.id === categoryId);
        if (cat) {
          const newName = prompt('Enter new category name', cat.name);
          if (newName && newName.trim()) {
            cat.name = newName.trim();
            saveCategories(categoriesData);
            refreshCategoryList();
          }
        }
      } else if (action === 'add-item') {
        showItemForm(null, categoryId);
      } else if (action === 'edit-item') {
        const itemId = parseInt(btn.dataset.id);
        showItemForm(itemId, categoryId);
      } else if (action === 'delete-item') {
        const itemId = parseInt(btn.dataset.id);
        if (!confirm('Delete this item?')) return;
        const cat = categoriesData.find(c => c.id === categoryId);
        if (cat) {
          const idx2 = cat.items.findIndex(i => i.id === itemId);
          if (idx2 !== -1) {
            cat.items.splice(idx2, 1);
            saveCategories(categoriesData);
            refreshCategoryList();
          }
        }
      }
    });
    // Item form popup
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
  }

  /**
   * Initialize the appropriate functions depending on the current page.
   */
  function init() {
    // Determine which page we're on by checking the body class or unique element
    renderAuthLinks();
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
      renderCategoryLinks();
      renderAds();
      renderCategories();
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
    } else if (path.endsWith('category.html')) {
      renderCategoryPage();
    }
    // Attach search listener on any page that has the search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim();
        // Re-render categories if the section exists
        if (document.getElementById('categories')) {
          renderCategories();
        }
      });
    }
  }

  // Run init once DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
})();