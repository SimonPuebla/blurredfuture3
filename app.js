// ===== CONFIG =====
const PRODUCTS = [
    {
        id: 1,
        name: "Lehman Brothers Tee",
        type: "Jersey",
        price: 49,
        hex: "#cc2222",
        views: [
            "models/shirt1-front.png",
            "models/shirt1-angle.png",
            "models/shirt1-back.png"
        ]
    },
    {
        id: 2,
        name: "Accendo Banco Tee",
        type: "Jersey",
        price: 49,
        hex: "#2d6b3f",
        views: [
            "models/shirt2-front.png",
            "models/shirt2-angle.png",
            "models/shirt2-back.png"
        ]
    },
    {
        id: 3,
        name: "Banesto Tee",
        type: "Jersey",
        price: 49,
        hex: "#1a1a4e",
        views: [
            "models/shirt3-front.png",
            "models/shirt3-angle.png",
            "models/shirt3-back.png"
        ]
    },
    {
        id: 4,
        name: "Banco Cruzeiro Tee",
        type: "Jersey",
        price: 49,
        hex: "#4a1a2a",
        views: [
            "models/shirt4-front.png",
            "models/shirt4-angle.png",
            "models/shirt4-back.png"
        ]
    },
    {
        id: 5,
        name: "Banco Grandherror Tee",
        type: "Jersey",
        price: 49,
        hex: "#2a5a3a",
        views: [
            "models/shirt5-front.png",
            "models/shirt5-angle.png",
            "models/shirt5-back.png"
        ]
    },
    {
        id: 6,
        name: "Caja Madrid Tee",
        type: "Jersey",
        price: 49,
        hex: "#1a4a4a",
        views: [
            "models/shirt6-front.png",
            "models/shirt6-angle.png",
            "models/shirt6-back.png"
        ]
    }
];

const DELIVERY_COSTS = { pickup: 3, caba: 7, interior: 12 };

const CRYPTO_ADDRESSES = {
    eth: "0xYOUR_ETH_ADDRESS_HERE",
    btc: "bc1YOUR_BTC_ADDRESS_HERE",
    sol: "YOUR_SOL_ADDRESS_HERE"
};

const STRIPE_KEY = "pk_test_REPLACE_WITH_YOUR_STRIPE_KEY";

const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
const OWNER_EMAIL = "simopuebla@gmail.com";

let cart = [];
let selectedSize = "M";
let selectedDelivery = "pickup";
let currentProduct = null;
let checkoutData = null;

// EmailJS init
try { if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e) {}

// ===== IMAGE PRELOADER =====
const imageCache = {};

function preloadImage(src) {
    if (imageCache[src]) return Promise.resolve(imageCache[src]);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { imageCache[src] = img; resolve(img); };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function preloadAllProducts() {
    const promises = [];
    PRODUCTS.forEach(p => {
        p.views.forEach(src => promises.push(preloadImage(src)));
    });
    return Promise.all(promises);
}

// ===== LOADER =====
window.addEventListener("load", () => {
    try { if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e) {}

    const fill = document.querySelector(".loader-bar-fill");
    let progress = 0;

    // Start preloading images immediately
    const preloadPromise = preloadAllProducts();

    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 90) progress = 90;
        fill.style.width = progress + "%";
    }, 200);

    preloadPromise.then(() => {
        clearInterval(interval);
        fill.style.width = "100%";
        setTimeout(() => {
            document.getElementById("loader").classList.add("hidden");
            document.body.style.overflow = "";
            animateOnScroll();
        }, 400);
    });
});

// ===== SHIRT SPINNER =====
// Cycles through: front → angle → back → angle(flipped) to simulate rotation
function createSpinner(container, product, options = {}) {
    const { speed = 1800, interactive = false, floatEffect = true } = options;

    // The spin sequence: front, angle, back, angle-mirrored
    const sequence = [0, 1, 2, 1]; // indices into product.views, index 1 gets flipped on 2nd pass
    let currentFrame = 0;
    let paused = false;

    const wrapper = document.createElement("div");
    wrapper.className = "spinner-wrapper";

    const img = document.createElement("img");
    img.className = "spinner-img";
    img.src = product.views[0];
    img.alt = product.name;
    img.draggable = false;

    wrapper.appendChild(img);
    container.appendChild(wrapper);

    // Float animation
    if (floatEffect) {
        wrapper.style.animation = `spinnerFloat ${3 + Math.random() * 2}s ease-in-out infinite`;
        wrapper.style.animationDelay = `${Math.random() * -3}s`;
    }

    function advance() {
        if (paused) return;
        currentFrame = (currentFrame + 1) % sequence.length;
        const viewIdx = sequence[currentFrame];
        const shouldFlip = currentFrame === 3; // flip on the return angle

        img.style.opacity = "0";
        img.style.transform = shouldFlip ? "scaleX(-1)" : "scaleX(1)";

        setTimeout(() => {
            img.src = product.views[viewIdx];
            img.style.opacity = "1";
        }, 150);
    }

    const intervalId = setInterval(advance, speed);

    // Interactive: mouse-drag to scrub through views
    if (interactive) {
        let dragging = false;
        let startX = 0;

        container.addEventListener("mousedown", (e) => {
            dragging = true;
            startX = e.clientX;
            paused = true;
            e.preventDefault();
        });

        container.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 60) {
                const dir = dx > 0 ? 1 : -1;
                currentFrame = (currentFrame + dir + sequence.length) % sequence.length;
                const viewIdx = sequence[currentFrame];
                const shouldFlip = currentFrame === 3;
                img.style.transform = shouldFlip ? "scaleX(-1)" : "scaleX(1)";
                img.src = product.views[viewIdx];
                startX = e.clientX;
            }
        });

        document.addEventListener("mouseup", () => {
            if (dragging) { dragging = false; paused = false; }
        });

        // Touch support
        container.addEventListener("touchstart", (e) => {
            dragging = true;
            startX = e.touches[0].clientX;
            paused = true;
        }, { passive: true });

        container.addEventListener("touchmove", (e) => {
            if (!dragging) return;
            const dx = e.touches[0].clientX - startX;
            if (Math.abs(dx) > 60) {
                const dir = dx > 0 ? 1 : -1;
                currentFrame = (currentFrame + dir + sequence.length) % sequence.length;
                const viewIdx = sequence[currentFrame];
                const shouldFlip = currentFrame === 3;
                img.style.transform = shouldFlip ? "scaleX(-1)" : "scaleX(1)";
                img.src = product.views[viewIdx];
                startX = e.touches[0].clientX;
            }
        }, { passive: true });

        container.addEventListener("touchend", () => {
            if (dragging) { dragging = false; paused = false; }
        });
    }

    return {
        destroy() { clearInterval(intervalId); },
        pause() { paused = true; },
        resume() { paused = false; }
    };
}

// ===== RENDER PRODUCTS =====
const cardSpinners = [];

function renderProducts() {
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "";

    PRODUCTS.forEach((product, index) => {
        const card = document.createElement("div");
        card.className = "product-card fade-in";
        card.style.transitionDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="product-card-3d" data-product-id="${product.id}"></div>
            <div class="product-card-info">
                <div>
                    <h3>${product.name}</h3>
                    <span class="product-type">${product.type}</span>
                </div>
                <div class="product-card-price">$${product.price}<span>USD</span></div>
            </div>
        `;
        card.addEventListener("click", () => openProductModal(product));
        grid.appendChild(card);

        const spinContainer = card.querySelector(".product-card-3d");
        const spinner = createSpinner(spinContainer, product, {
            speed: 1600 + index * 200,
            interactive: false,
            floatEffect: true
        });
        cardSpinners.push(spinner);
    });
}

// ===== PRODUCT MODAL =====
let modalSpinner = null;

function openProductModal(product) {
    currentProduct = product;
    selectedSize = "M";
    document.getElementById("modalTitle").textContent = product.name;
    document.querySelectorAll("#modalSizes .size-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.size === "M");
    });

    // Setup 3D spinner in modal
    const modal3d = document.getElementById("modal3d");
    modal3d.innerHTML = "";
    if (modalSpinner) { modalSpinner.destroy(); modalSpinner = null; }
    modalSpinner = createSpinner(modal3d, product, {
        speed: 2000,
        interactive: true,
        floatEffect: false
    });

    // Inject angle views as gallery below 3D
    const gallery = document.getElementById("modalGallery");
    gallery.innerHTML = "";
    product.views.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = product.name;
        img.loading = "lazy";
        img.addEventListener("click", (e) => {
            e.stopPropagation();
            openGalleryLightbox(src);
        });
        gallery.appendChild(img);
    });

    document.getElementById("modalOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeProductModal() {
    document.getElementById("modalOverlay").classList.remove("open");
    document.body.style.overflow = "";
    if (modalSpinner) { modalSpinner.destroy(); modalSpinner = null; }
}

// ===== SIZE SELECTOR =====
document.getElementById("modalSizes").addEventListener("click", (e) => {
    if (e.target.classList.contains("size-btn")) {
        document.querySelectorAll("#modalSizes .size-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        selectedSize = e.target.dataset.size;
    }
});

// ===== CART =====
function addToCart() {
    if (!currentProduct) return;
    const existing = cart.find(item => item.product.id === currentProduct.id && item.size === selectedSize);
    if (existing) { existing.qty++; }
    else { cart.push({ product: currentProduct, size: selectedSize, qty: 1 }); }
    updateCartUI();
    closeProductModal();
    showToast(`${currentProduct.name} (${selectedSize}) added to cart`);
}

function removeFromCart(index) { cart.splice(index, 1); updateCartUI(); }

function getProductsTotal() {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
}

function updateCartUI() {
    const countEl = document.getElementById("cartCount");
    const itemsEl = document.getElementById("cartItems");
    const footerEl = document.getElementById("cartFooter");
    const totalEl = document.getElementById("cartTotal");
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = getProductsTotal();

    countEl.textContent = totalItems;
    countEl.classList.toggle("show", totalItems > 0);

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
        footerEl.style.display = "none";
    } else {
        itemsEl.innerHTML = cart.map((item, i) => `
            <div class="cart-item">
                <div class="cart-item-color" style="background:${item.product.hex}; border: 1px solid #333;"></div>
                <div class="cart-item-details">
                    <h4>${item.product.name}</h4>
                    <span class="cart-item-meta">Size: ${item.size} · Qty: ${item.qty}</span>
                    <p class="cart-item-price">$${item.product.price * item.qty}</p>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${i})">&times;</button>
            </div>
        `).join("");
        footerEl.style.display = "block";
        totalEl.textContent = `$${totalPrice}`;
    }
}

// ===== CART SIDEBAR =====
function openCart() {
    document.getElementById("cartSidebar").classList.add("open");
    document.getElementById("cartOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
}
function closeCart() {
    document.getElementById("cartSidebar").classList.remove("open");
    document.getElementById("cartOverlay").classList.remove("open");
    document.body.style.overflow = "";
}

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
document.getElementById("cartOverlay").addEventListener("click", closeCart);
document.getElementById("modalClose").addEventListener("click", closeProductModal);
document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modalOverlay")) closeProductModal();
});
document.getElementById("addToCartBtn").addEventListener("click", addToCart);

// ===== CHECKOUT FLOW =====
document.getElementById("stripeCheckout").addEventListener("click", () => {
    if (cart.length === 0) return;
    closeCart(); openCheckoutModal("stripe");
});
document.getElementById("cryptoCheckout").addEventListener("click", () => {
    if (cart.length === 0) return;
    closeCart(); openCheckoutModal("crypto");
});

let pendingPaymentMethod = "stripe";

function openCheckoutModal(paymentMethod) {
    pendingPaymentMethod = paymentMethod;
    selectedDelivery = "pickup";
    updateDeliveryUI(); updateCheckoutSummary();
    document.getElementById("checkoutModalOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
}
function closeCheckoutModal() {
    document.getElementById("checkoutModalOverlay").classList.remove("open");
    document.body.style.overflow = "";
}

document.getElementById("checkoutModalClose").addEventListener("click", closeCheckoutModal);
document.getElementById("checkoutModalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("checkoutModalOverlay")) closeCheckoutModal();
});

document.querySelectorAll('.delivery-option input[name="delivery"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
        selectedDelivery = e.target.value;
        updateDeliveryUI(); updateCheckoutSummary();
    });
});

function updateDeliveryUI() {
    document.querySelectorAll(".delivery-option").forEach(opt => {
        opt.classList.toggle("active", opt.querySelector("input").value === selectedDelivery);
    });
    const show = selectedDelivery !== "pickup";
    document.getElementById("addressGroup").style.display = show ? "" : "none";
    document.getElementById("cityGroup").parentElement.style.display = show ? "" : "none";
    document.getElementById("provinceGroup").style.display = show ? "" : "none";
    document.getElementById("custAddress").required = show;
    document.getElementById("custCity").required = show;
    document.getElementById("custZip").required = show;
    document.getElementById("custProvince").required = show;
}

function updateCheckoutSummary() {
    const p = getProductsTotal();
    const s = DELIVERY_COSTS[selectedDelivery] || 3;
    document.getElementById("summaryProducts").textContent = `$${p}`;
    document.getElementById("summaryShipping").textContent = `$${s}`;
    document.getElementById("summaryTotal").textContent = `$${p + s}`;
}

function collectCheckoutData() {
    const name = document.getElementById("custName").value.trim();
    const email = document.getElementById("custEmail").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    if (!name || !email || !phone) { showToast("Please fill in all required fields"); return null; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("Please enter a valid email"); return null; }

    let address = "Pickup at Crecimiento Hub", city = "", zip = "", province = "";
    if (selectedDelivery !== "pickup") {
        address = document.getElementById("custAddress").value.trim();
        city = document.getElementById("custCity").value.trim();
        zip = document.getElementById("custZip").value.trim();
        province = document.getElementById("custProvince").value;
        if (!address || !city || !zip || !province) { showToast("Please fill in your complete shipping address"); return null; }
    }

    return {
        name, email, phone, delivery: selectedDelivery,
        deliveryCost: DELIVERY_COSTS[selectedDelivery], address, city, zip, province,
        fullAddress: selectedDelivery === "pickup" ? "Pickup at Crecimiento Hub" : `${address}, ${city}, ${province} ${zip}, Argentina`
    };
}

document.getElementById("checkoutStripe").addEventListener("click", () => {
    const data = collectCheckoutData(); if (!data) return;
    checkoutData = data;
    sendOrderEmail(data, "Card (Stripe)");
    closeCheckoutModal();
    showToast("Stripe integration ready — add your API key to go live!");
});

document.getElementById("checkoutCrypto").addEventListener("click", () => {
    const data = collectCheckoutData(); if (!data) return;
    checkoutData = data;
    closeCheckoutModal(); openCryptoModal();
});

// ===== EMAIL =====
function sendOrderEmail(customerData, paymentMethod) {
    const productsTotal = getProductsTotal();
    const total = productsTotal + customerData.deliveryCost;
    const itemsList = cart.map(item =>
        `${item.product.name} (Size: ${item.size}) x${item.qty} — $${item.product.price * item.qty}`
    ).join("\n");
    const deliveryLabel = { pickup:"Pickup at Crecimiento Hub ($3)", caba:"CABA & GBA ($7)", interior:"Interior Argentina ($12)" }[customerData.delivery];

    const ownerMessage = `NEW ORDER\n\nCustomer: ${customerData.name}\nEmail: ${customerData.email}\nPhone: ${customerData.phone}\nPayment: ${paymentMethod}\n\nITEMS:\n${itemsList}\n\nDelivery: ${deliveryLabel}\nShip to: ${customerData.fullAddress}\n\nProducts: $${productsTotal}\nShipping: $${customerData.deliveryCost}\nTOTAL: $${total} USD`;
    const buyerMessage = `Hey ${customerData.name}!\n\nWELCOME TO THE BLURRED FAMILY\n\nYour order:\n${itemsList}\n\nDelivery: ${deliveryLabel}\n${customerData.delivery !== 'pickup' ? `Ship to: ${customerData.fullAddress}` : 'Pickup at Crecimiento Hub'}\n\nProducts: $${productsTotal}\nShipping: $${customerData.deliveryCost}\nTOTAL: $${total} USD\n\nPayment: ${paymentMethod}\n\n— Blurred Future Inc.`;

    try {
        if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { subject:"NEW ORDER", to_email:OWNER_EMAIL, from_name:customerData.name, message:ownerMessage });
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { subject:"WELCOME TO THE BLURRED FAMILY", to_email:customerData.email, from_name:"Blurred Future Inc.", message:buyerMessage });
        } else { console.log("EmailJS not configured.", ownerMessage); }
    } catch(err) { console.error("Email error:", err); }
}

// ===== CRYPTO =====
let selectedChain = "eth";

function openCryptoModal() {
    document.getElementById("cryptoModalOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    updateCryptoDisplay();
}
function closeCryptoModal() {
    document.getElementById("cryptoModalOverlay").classList.remove("open");
    document.body.style.overflow = "";
    if (checkoutData) sendOrderEmail(checkoutData, `Crypto (${selectedChain.toUpperCase()})`);
}

document.getElementById("cryptoModalClose").addEventListener("click", closeCryptoModal);
document.getElementById("cryptoModalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("cryptoModalOverlay")) closeCryptoModal();
});

document.querySelectorAll(".crypto-option").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".crypto-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedChain = btn.dataset.chain;
        updateCryptoDisplay();
    });
});

function updateCryptoDisplay() {
    const total = getProductsTotal() + (checkoutData ? checkoutData.deliveryCost : DELIVERY_COSTS[selectedDelivery]);
    const rates = { eth:0.014, btc:0.00049, sol:0.24 };
    const symbols = { eth:"ETH", btc:"BTC", sol:"SOL" };
    document.getElementById("cryptoAmount").textContent = `${(total * (rates[selectedChain]||0.01)).toFixed(selectedChain==="btc"?6:4)} ${symbols[selectedChain]}`;
    document.getElementById("cryptoAddress").textContent = CRYPTO_ADDRESSES[selectedChain];
}

document.getElementById("copyAddress").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("cryptoAddress").textContent)
        .then(() => showToast("Address copied!"))
        .catch(() => showToast("Couldn't copy — select manually"));
});

// ===== GALLERY LIGHTBOX =====
function openGalleryLightbox(src) {
    let lightbox = document.querySelector(".gallery-lightbox");
    if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.className = "gallery-lightbox";
        lightbox.innerHTML = '<img src="" alt="Model photo">';
        lightbox.addEventListener("click", () => {
            lightbox.classList.remove("open");
        });
        document.body.appendChild(lightbox);
    }
    lightbox.querySelector("img").src = src;
    requestAnimationFrame(() => lightbox.classList.add("open"));
}

// ===== TOAST =====
function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 2500);
}

// ===== SCROLL ANIMATIONS =====
function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
}

// ===== KEYBOARD =====
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const lightbox = document.querySelector(".gallery-lightbox.open");
        if (lightbox) { lightbox.classList.remove("open"); return; }
        closeProductModal(); closeCart(); closeCryptoModal(); closeCheckoutModal();
    }
});

// ===== INIT =====
renderProducts();
updateDeliveryUI();
