require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");

// Models
const User = require("./models/user");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Order = require("./models/Order");
const Payment = require("./models/Payment");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static("public"));

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummysecret",
});

// JWT Token helper
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

/* ================= SEED PRODUCTS ================= */
app.post("/api/seed", async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = [
      {
        name: "Classic Hoodie",
        price: 1999,
        category: "Men",
        image: "👕",
        badge: "NEW",
        stock: 50,
        sizes: ["S", "M", "L", "XL"],
      },
      {
        name: "Street Sneakers",
        price: 3499,
        category: "Footwear",
        image: "👟",
        badge: "HOT",
        stock: 30,
        sizes: ["6", "7", "8", "9", "10"],
      },
      {
        name: "Urban Cap",
        price: 799,
        category: "Accessories",
        image: "🧢",
        stock: 100,
        sizes: ["One Size"],
      },
      {
        name: "Tech Backpack",
        price: 2499,
        category: "Accessories",
        image: "🎒",
        badge: "SALE",
        stock: 25,
        sizes: ["One Size"],
      },
      {
        name: "Cargo Pants",
        price: 2799,
        category: "Men",
        image: "👖",
        stock: 40,
        sizes: ["28", "30", "32", "34", "36"],
      },
      {
        name: "Designer Shades",
        price: 1299,
        category: "Accessories",
        image: "🕶️",
        badge: "NEW",
        stock: 60,
        sizes: ["One Size"],
      },
    ];
    await Product.insertMany(products);
    res.json({ success: true, message: "Products seeded", count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Seeding failed", error: error.message });
  }
});

/* ================= AUTH ROUTES ================= */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || "",
    });

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user", error: error.message });
  }
});

/* ================= PRODUCTS ================= */
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products", error: error.message });
  }
});

/* ================= CART ================= */





// ✅ Get user's cart
app.get('/api/Cart', authenticateToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }

    const cartItems = cart.items.map(item => ({
      productId: item.productId?._id,
      product: item.productId ? {
        name: item.productId.name,
        price: item.productId.price,
        images: item.productId.images || []
      } : null,
      quantity: item.quantity,
      size: item.size
    }));

    res.json({ success: true, cart: cartItems });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
});

// ✅ Add to cart
app.post('/api/Cart', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1, size = 'M' } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) cart = new Cart({ userId: req.user.id, items: [] });

    const existingItem = cart.items.find(
      item => item.productId.toString() === productId && item.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, size });
    }

    await cart.save();
    res.json({ success: true, message: 'Product added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Error adding product to cart' });
  }
});

// ✅ Remove item from cart
app.delete('/api/Cart/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { size } = req.query;

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.json({ success: true, message: 'Cart already empty' });

    cart.items = cart.items.filter(
      item => !(item.productId.toString() === productId && item.size === size)
    );

    await cart.save();
    res.json({ success: true, message: 'Product removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Error removing product' });
  }
});

// ✅ Clear full cart (useful for logout or reset)
app.delete('/api/Cart/clear', authenticateToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
    } else {
      cart.items = [];
    }

    await cart.save();
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
});



/* ================= PAYMENT ================= */
app.post("/api/payment/create-order", authenticateToken, async (req, res) => {
  try {
    const { amount, currency, cartItems } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Invalid amount" });

    const options = {
      amount: amount * 100,
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { userId: req.user.id, itemCount: cartItems?.length || 0 },
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      userId: req.user.id,
      orderId: order.id,
      amount,
      currency: order.currency,
      status: "created",
      cartItems: cartItems || [],
    });

    res.json({
      success: true,
      message: "Order created",
      order: { id: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating order", error: error.message });
  }
});

app.post("/api/payment/verify-payment", authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: "success", paymentId: razorpay_payment_id, signature: razorpay_signature }
      );
      res.json({ success: true, message: "Payment verified" });
    } else {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: "failed", failureReason: "Invalid signature" }
      );
      res.status(400).json({ success: false, message: "Payment verification failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error verifying payment", error: error.message });
  }
});

/* ================= ORDERS ================= */
app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;
    const order = await Order.create({
      userId: req.user.id,
      items,
      shippingAddress,
      totalAmount,
      paymentStatus: "completed",
    });

    await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [] });
    res.status(201).json({ success: true, message: "Order placed", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating order", error: error.message });
  }
});

app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching orders", error: error.message });
  }
});

/* ================= SERVER STATUS ================= */
app.get("/", (req, res) => {
  res.send("<h1>🚀 9Hood API Running Successfully</h1>");
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
