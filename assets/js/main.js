/* RB Bearings — shared site behaviour (basket, rendering, forms) */
(function () {
  "use strict";

  var CART_KEY = "rb_basket";

  function money(n) {
    return "£" + Number(n).toFixed(2);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateBasketBadge();
  }

  function findProduct(id) {
    return window.PRODUCTS.find(function (p) { return p.id === String(id); });
  }

  function addToCart(id, qty) {
    var cart = getCart();
    var existing = cart.find(function (i) { return i.id === id; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: id, qty: qty });
    }
    saveCart(cart);
  }

  function removeFromCart(id) {
    var cart = getCart().filter(function (i) { return i.id !== id; });
    saveCart(cart);
  }

  function setQty(id, qty) {
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (item) {
      item.qty = qty;
      if (item.qty < 1) item.qty = 1;
    }
    saveCart(cart);
  }

  function cartLines() {
    return getCart().map(function (i) {
      var p = findProduct(i.id);
      return p ? { product: p, qty: i.qty } : null;
    }).filter(Boolean);
  }

  function cartCount() {
    return getCart().reduce(function (sum, i) { return sum + i.qty; }, 0);
  }

  function cartTotal() {
    return cartLines().reduce(function (sum, l) { return sum + l.product.price * l.qty; }, 0);
  }

  function updateBasketBadge() {
    var badges = document.querySelectorAll("[data-basket-count]");
    var count = cartCount();
    badges.forEach(function (b) {
      b.textContent = count;
      b.style.display = count > 0 ? "flex" : "none";
    });
  }

  /* ---------- Mobile nav ---------- */
  function initMobileNav() {
    var toggle = document.querySelector(".mobileNavToggle");
    var nav = document.querySelector(".headerNavRow");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
  }

  /* ---------- Search by size popover ---------- */
  function initSizeSearch() {
    var toggle = document.getElementById("sizeSearchToggle");
    var popover = document.getElementById("sizeSearchPopover");
    if (!toggle || !popover) return;
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      popover.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!popover.contains(e.target) && e.target !== toggle) {
        popover.classList.remove("open");
      }
    });

    var params = new URLSearchParams(location.search);
    ["bore", "od", "width"].forEach(function (key) {
      var input = document.getElementById("size" + key.charAt(0).toUpperCase() + key.slice(1));
      if (input && params.get(key)) input.value = params.get(key);
    });
  }

  function parseDims(dims) {
    if (!dims) return null;
    var parts = dims.replace(/mm/gi, "").split("x").map(function (s) { return parseFloat(s.trim()); });
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return { bore: parts[0], od: parts[1], width: parts[2] };
  }

  function initSizeFilter() {
    var grid = document.getElementById("productGrid");
    if (!grid) return;
    var params = new URLSearchParams(location.search);
    var bore = parseFloat(params.get("bore"));
    var od = parseFloat(params.get("od"));
    var width = parseFloat(params.get("width"));
    if (isNaN(bore) && isNaN(od) && isNaN(width)) return null;

    var tolerance = 0.5;
    return function (p) {
      var d = parseDims(p.dims);
      if (!d) return false;
      if (!isNaN(bore) && Math.abs(d.bore - bore) > tolerance) return false;
      if (!isNaN(od) && Math.abs(d.od - od) > tolerance) return false;
      if (!isNaN(width) && Math.abs(d.width - width) > tolerance) return false;
      return true;
    };
  }

  /* ---------- Product card markup ---------- */
  function productCardHTML(p) {
    return (
      '<a class="productCard" href="/product/?id=' + p.id + '">' +
      '<div class="imgWrap"><img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy"></div>' +
      '<div class="meta">' + (p.dims ? "Dimensions: " + escapeHtml(p.dims) : "Code: " + escapeHtml(p.code)) + "</div>" +
      "<h3>" + escapeHtml(p.name) + "</h3>" +
      '<div class="price">' + money(p.price) + " <small>excl. VAT</small></div>" +
      '<span class="btn btn-outline-dark btn-block">View product</span>' +
      "</a>"
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Category / grid rendering ---------- */
  function renderGrid(containerId, category, limit) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var items = window.PRODUCTS.filter(function (p) { return p.category === category; });
    if (limit) items = items.slice(0, limit);
    el.innerHTML = items.map(productCardHTML).join("");
    return items;
  }

  function initCategoryPage(category) {
    var grid = document.getElementById("productGrid");
    if (!grid) return;
    var all = window.PRODUCTS.filter(function (p) { return p.category === category; });
    var countEl = document.getElementById("resultCount");

    var sizeFilter = initSizeFilter();
    if (sizeFilter) all = all.filter(sizeFilter);

    function draw(list) {
      grid.innerHTML = list.length
        ? list.map(productCardHTML).join("")
        : '<p style="grid-column:1/-1;color:#777;">No products match your search.</p>';
      if (countEl) countEl.textContent = list.length + " product" + (list.length === 1 ? "" : "s");
    }
    draw(all);

    var search = document.getElementById("categorySearch");
    var sort = document.getElementById("categorySort");

    function applyFilters() {
      var term = (search && search.value || "").toLowerCase().trim();
      var list = all.filter(function (p) { return p.name.toLowerCase().indexOf(term) !== -1; });
      if (sort && sort.value === "price-asc") list.sort(function (a, b) { return a.price - b.price; });
      if (sort && sort.value === "price-desc") list.sort(function (a, b) { return b.price - a.price; });
      draw(list);
    }
    if (search) search.addEventListener("input", applyFilters);
    if (sort) sort.addEventListener("change", applyFilters);
  }

  /* ---------- Product detail page ---------- */
  function initProductPage() {
    var mount = document.getElementById("productDetail");
    if (!mount) return;
    var params = new URLSearchParams(location.search);
    var id = params.get("id");
    var p = findProduct(id);

    if (!p) {
      mount.innerHTML = '<p>Sorry, we couldn\'t find that product. <a href="/browse/">Browse all products</a>.</p>';
      return;
    }

    document.title = p.name + " | RB Bearings";
    var crumb = document.getElementById("breadcrumbCategory");
    if (crumb) {
      crumb.textContent = p.categoryLabel;
      crumb.href = "/browse/" + p.category + "/";
    }
    var crumbName = document.getElementById("breadcrumbProduct");
    if (crumbName) crumbName.textContent = p.name;

    mount.innerHTML =
      '<div class="imgWrap"><img src="' + p.image + '" alt="' + escapeHtml(p.name) + '"></div>' +
      '<div>' +
      '<div class="brand">' + escapeHtml(p.categoryLabel) + '</div>' +
      "<h1>" + escapeHtml(p.name) + "</h1>" +
      '<div class="productCode">Product code: ' + escapeHtml(p.code || "N/A") + "</div>" +
      '<div class="productPrice">' + money(p.price) + '</div>' +
      '<div class="vatFlag" style="margin-bottom:20px;">excl. VAT</div>' +
      '<div class="stockFlag">&#10003; In stock — usually despatched within 1 business day</div>' +
      '<div class="addedMsg" id="addedMsg">Item added to your basket. <a href="/basket/">View basket</a></div>' +
      '<div class="qtyRow">' +
      '<div class="qtyStepper">' +
      '<button type="button" id="qtyMinus" aria-label="Decrease quantity">&minus;</button>' +
      '<input type="number" id="qtyInput" value="1" min="1" max="999">' +
      '<button type="button" id="qtyPlus" aria-label="Increase quantity">+</button>' +
      "</div>" +
      '<button type="button" class="btn btn-primary" id="addToBasketBtn">Add to basket</button>' +
      "</div>" +
      '<div class="deliveryNote">' +
      '<svg width="27" height="27" viewBox="0 0 27 27" fill="none"><path d="M13.3236 26.087C20.6694 26.087 26.6473 20.2348 26.6473 13.0435C26.6473 5.85219 20.6695 0 13.3236 0C5.97782 0 0 5.85219 0 13.0435C0 20.2348 5.97789 26.087 13.3236 26.087Z" stroke="currentColor" stroke-width="1.6"/><path d="M13.3233 6v7l4 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      "<div><strong>Next day and fast delivery available</strong><span>Delivery options confirmed at checkout</span></div>" +
      "</div>" +
      '<div class="productDetailsSection">' +
      "<h3>Description</h3>" +
      "<p>" + escapeHtml(p.description) + "</p>" +
      "</div>" +
      '<div class="productDetailsSection">' +
      "<h3>Specification</h3>" +
      '<table class="specTable"><tbody>' +
      (p.dims ? "<tr><td>Dimensions</td><td>" + escapeHtml(p.dims) + "</td></tr>" : "") +
      "<tr><td>Product code</td><td>" + escapeHtml(p.code || "N/A") + "</td></tr>" +
      "<tr><td>Category</td><td>" + escapeHtml(p.categoryLabel) + "</td></tr>" +
      "</tbody></table>" +
      "</div>" +
      "</div>";

    var qtyInput = document.getElementById("qtyInput");
    document.getElementById("qtyMinus").addEventListener("click", function () {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
    });
    document.getElementById("qtyPlus").addEventListener("click", function () {
      qtyInput.value = parseInt(qtyInput.value || "1", 10) + 1;
    });
    document.getElementById("addToBasketBtn").addEventListener("click", function () {
      var qty = Math.max(1, parseInt(qtyInput.value || "1", 10));
      addToCart(p.id, qty);
      var msg = document.getElementById("addedMsg");
      msg.classList.add("show");
    });

    var related = window.PRODUCTS.filter(function (r) { return r.category === p.category && r.id !== p.id; }).slice(0, 4);
    var relatedMount = document.getElementById("relatedProducts");
    if (relatedMount && related.length) {
      relatedMount.innerHTML = '<h3>You may also need</h3><div class="productGrid">' + related.map(productCardHTML).join("") + "</div>";
    }
  }

  /* ---------- Basket page ---------- */
  function initBasketPage() {
    var mount = document.getElementById("basketItems");
    if (!mount) return;

    function draw() {
      var lines = cartLines();
      var summaryMount = document.getElementById("basketSummary");
      if (!lines.length) {
        mount.innerHTML = '<div class="emptyBasket"><p>Your basket is empty.</p><a href="/browse/" class="btn btn-dark">Continue shopping</a></div>';
        if (summaryMount) summaryMount.style.display = "none";
        return;
      }
      if (summaryMount) summaryMount.style.display = "block";

      mount.innerHTML = lines.map(function (l) {
        var p = l.product;
        return (
          '<div class="basketItem" data-id="' + p.id + '">' +
          '<div class="imgWrap"><img src="' + p.image + '" alt="' + escapeHtml(p.name) + '"></div>' +
          "<div><h4>" + escapeHtml(p.name) + '</h4><div class="code">Code: ' + escapeHtml(p.code || "N/A") + "</div></div>" +
          '<div class="qtyStepper">' +
          '<button type="button" class="basketQtyMinus">&minus;</button>' +
          '<input type="number" class="basketQtyInput" value="' + l.qty + '" min="1" max="999">' +
          '<button type="button" class="basketQtyPlus">+</button>' +
          "</div>" +
          '<div class="lineTotal">' + money(p.price * l.qty) + "</div>" +
          '<button type="button" class="removeBtn">Remove</button>' +
          "</div>"
        );
      }).join("");

      var total = cartTotal();
      document.getElementById("summarySubtotal").textContent = money(total);
      document.getElementById("summaryTotal").textContent = money(total);
      document.getElementById("summaryCount").textContent = cartCount();
    }

    mount.addEventListener("click", function (e) {
      var row = e.target.closest(".basketItem");
      if (!row) return;
      var id = row.getAttribute("data-id");
      if (e.target.classList.contains("removeBtn")) {
        removeFromCart(id);
        draw();
      } else if (e.target.classList.contains("basketQtyMinus")) {
        var input = row.querySelector(".basketQtyInput");
        var v = Math.max(1, parseInt(input.value || "1", 10) - 1);
        setQty(id, v);
        draw();
      } else if (e.target.classList.contains("basketQtyPlus")) {
        var input2 = row.querySelector(".basketQtyInput");
        var v2 = parseInt(input2.value || "1", 10) + 1;
        setQty(id, v2);
        draw();
      }
    });

    mount.addEventListener("change", function (e) {
      if (!e.target.classList.contains("basketQtyInput")) return;
      var row = e.target.closest(".basketItem");
      var id = row.getAttribute("data-id");
      var v = Math.max(1, parseInt(e.target.value || "1", 10));
      setQty(id, v);
      draw();
    });

    draw();
  }

  /* ---------- Checkout page ---------- */
  function initCheckoutPage() {
    var mount = document.getElementById("checkoutSummary");
    if (!mount) return;
    var lines = cartLines();
    var hiddenField = document.getElementById("orderSummaryField");
    var form = document.getElementById("checkoutForm");

    if (!lines.length) {
      mount.innerHTML = '<p>Your basket is empty. <a href="/browse/">Browse products</a> before checking out.</p>';
      if (form) form.style.display = "none";
      return;
    }

    var total = cartTotal();
    mount.innerHTML = lines.map(function (l) {
      return '<div class="item"><span>' + escapeHtml(l.product.name) + " &times; " + l.qty + "</span><span>" + money(l.product.price * l.qty) + "</span></div>";
    }).join("") + '<div class="summaryRow total"><span>Total (excl. VAT)</span><span>' + money(total) + "</span></div>";

    var summaryText = lines.map(function (l) {
      return l.qty + " x " + l.product.name + " (Code: " + (l.product.code || "N/A") + ") — " + money(l.product.price) + " each — line total " + money(l.product.price * l.qty);
    }).join("\n") + "\n\nOrder total (excl. VAT): " + money(total);

    if (hiddenField) hiddenField.value = summaryText;

    if (form) {
      form.addEventListener("submit", function () {
        if (hiddenField) hiddenField.value = summaryText;
        sessionStorage.setItem("rb_last_order", summaryText);
      });
    }
  }

  /* ---------- Browse hub (site-wide search) ---------- */
  function initBrowseHub() {
    var searchSection = document.getElementById("searchResultsSection");
    var tilesSection = document.getElementById("categoryTilesSection");
    if (!searchSection || !tilesSection) return;
    var params = new URLSearchParams(location.search);
    var q = (params.get("q") || "").trim();
    if (!q) return;

    tilesSection.style.display = "none";
    searchSection.style.display = "block";
    var term = q.toLowerCase();
    var results = window.PRODUCTS.filter(function (p) { return p.name.toLowerCase().indexOf(term) !== -1; });
    document.getElementById("searchTerm").textContent = q;
    document.getElementById("resultCount").textContent = results.length + " result" + (results.length === 1 ? "" : "s");
    document.getElementById("productGrid").innerHTML = results.length
      ? results.map(productCardHTML).join("")
      : '<p style="grid-column:1/-1;color:#777;">No products matched your search. Try a different part number or keyword.</p>';
  }

  /* ---------- Success page ---------- */
  function initSuccessPage() {
    var mount = document.getElementById("successOrder");
    if (!mount) return;
    localStorage.removeItem(CART_KEY);
    updateBasketBadge();
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    updateBasketBadge();
    initMobileNav();
    initSizeSearch();

    var body = document.body;
    var category = body.getAttribute("data-category-page");
    if (category) initCategoryPage(category);

    if (body.hasAttribute("data-featured-page")) {
      renderGrid("featuredGrid", "bearings", 8);
    }

    initProductPage();
    initBasketPage();
    initCheckoutPage();
    initSuccessPage();
    initBrowseHub();
  });

  window.RB = { addToCart: addToCart, cartCount: cartCount };
})();
