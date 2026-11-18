require('dns').setDefaultResultOrder('ipv4first');

require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const jwt = require("jsonwebtoken");
const Conversation = require("./models/Conversation");
const app = express();
const eventQuestionsRoutes = require("./routes/api/eventQuestions");
const http = require("http").createServer(app);
const PORT = process.env.PORT || 5001;
// Vercel runs this file as a serverless function: no listen() and no WebSocket.
const isServerless = Boolean(process.env.VERCEL);

// Refuse to start without a signing secret instead of failing later with
// "jwt must be provided" on the first authenticated request.
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) {
	console.error(
		"No JWT secret configured. Set JWT_SECRET (or ACCESS_TOKEN_SECRET) before starting the API."
	);
	process.exit(1);
}

// Basic hardening that does not require another dependency.
app.disable("x-powered-by");

// Honour a configured reverse proxy so req.ip is the real client address.
// Set TRUST_PROXY to the number of proxy hops (for example 1 behind nginx).
if (process.env.TRUST_PROXY) {
	const hops = Number(process.env.TRUST_PROXY);
	app.set("trust proxy", Number.isFinite(hops) && hops > 0 ? hops : process.env.TRUST_PROXY);
}

app.use((req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("Referrer-Policy", "no-referrer");
	// The app uses inline React styles, so style-src needs 'unsafe-inline'.
	// Scripts stay same-origin; images/media may come from Cloudinary.
	res.setHeader(
		"Content-Security-Policy",
		[
			"default-src 'self'",
			"script-src 'self'",
			"style-src 'self' 'unsafe-inline' https://stackpath.bootstrapcdn.com https://cdnjs.cloudflare.com https://fonts.googleapis.com",
			"img-src 'self' data: blob: https:",
			"media-src 'self' blob: https:",
			"font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
			"connect-src 'self' ws: wss:",
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		].join("; ")
	);
	if (process.env.NODE_ENV === "production") {
		res.setHeader(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains"
		);
	}
	next();
});

// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const socketHandler = require("./socketHandler");

//achieve
const achievementsRouter = require("./routes/achievement/achievements");
const categoriesRouter = require("./routes/achievement/categories");
const featuredRouter = require("./routes/achievement/featured");
// app.use(express.json({ extended: false }));
app.use(express.json({ limit: "2mb" }));
app.use(compression());
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

if (!isServerless) {
	http.listen(PORT, () => console.log(`Server is up on port ${PORT}`));
}

// Socket.IO needs a long-lived process. On Vercel, expose a no-op emitter so
// routes that broadcast can still call res.app.get("io").to(...).emit(...).
const io = isServerless
	? { to: () => ({ emit() {} }), emit() {}, use() {}, on() {} }
	: require("socket.io")(http, {
			cors: {
				origin: `${process.env.CLIENT_URL}`,
				methods: ["GET", "POST"],
			},
	  });
app.set("io", io); // ✅ makes io accessible in routes via req.app.get("io")

if (!isServerless) {
	connectDB()
		.then(() => {
			// Build the BGE-small search index in the background when it is empty.
			// The API is already listening, so the first request is not blocked.
			if (process.env.SEARCH_INDEX_AUTO !== "0") {
				require("./services/searchIndex")
					.ensureSearchIndex()
					.then((stats) =>
						console.log(
							`Search index ready: ${stats.indexed} documents (${stats.model})`
						)
					)
					.catch((err) =>
						console.warn("[search] index warm-up failed:", err.message)
					);
			}
		})
		.catch((err) => console.error("[mongo] startup connection failed:", err.message));
}

// init middleware for parsing
const allowedOrigins = [
	process.env.CLIENT_URL,
	"http://localhost:3000",
	"http://127.0.0.1:3000",
]
	.filter(Boolean)
	.map((origin) => origin.replace(/\/$/, ""));

app.use(
	cors({
		origin(origin, callback) {
			// Same-origin/non-browser requests have no Origin header.
			if (!origin) return callback(null, true);
			const normalized = origin.replace(/\/$/, "");
			if (allowedOrigins.includes(normalized)) return callback(null, true);
			// Reject without throwing: the browser blocks the response, while
			// the API does not leak a stack trace or turn this into a 500.
			return callback(null, false);
		},
		credentials: true,
	})
);
app.use(express.json({ extended: false }));

// Public, rarely-changing reads are safe to cache at the edge. This keeps the
// showcase and navigation counts warm between visitors instead of paying a
// cold function + Mongo round trip every time.
const CACHEABLE_PREFIXES = ["/api/availability", "/api/showcase"];
app.use((req, res, next) => {
	if (
		req.method === "GET" &&
		CACHEABLE_PREFIXES.some((prefix) => req.path.startsWith(prefix))
	) {
		res.set(
			"Cache-Control",
			"public, max-age=0, s-maxage=120, stale-while-revalidate=600"
		);
	}
	next();
});

// define routes
// LinkedIn OAuth is intentionally not mounted. The old callback had no state
// or PKCE and created password-less accounts; rebuild it before enabling.
// The client only uses the CV/LinkedIn text importer, not this route.

app.use("/api/users", require("./routes/api/users"));
app.use("/api/profile", require("./routes/api/profile"));
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/requests", require("./routes/api/request"));
app.use("/api/block", require("./routes/api/blocking"));
app.use("/api/posts", require("./routes/api/posts"));
app.use("/api/feed", require("./routes/api/feed"));
app.use("/api/extras", require("./routes/api/extras"));
app.use("/api/availability", require("./routes/api/availability"));
app.use("/api/conversations", require("./routes/api/conversations"));
app.use("/api/messages", require("./routes/api/messages"));
app.use("/api/channels", require("./routes/api/channel"));
app.use("/api/job", require("./routes/api/jobs"));
app.use("/api/event", require("./routes/api/event"));
app.use("/api/notifications", require("./routes/api/notifications"));
app.use("/api/stories", require("./routes/api/stories"));
app.use("/api/doubts", require("./routes/api/doubts"));
app.use("/api/mentorship", require("./routes/api/mentorship"));
app.use("/api/doors", require("./routes/api/doors"));
app.use("/api/companies", require("./routes/api/companies"));
app.use("/api/warm-paths", require("./routes/api/warmPaths"));
app.use("/api/resources", require("./routes/api/resources"));
app.use("/api/event-questions", eventQuestionsRoutes);
app.use("/api/analytics", require("./routes/api/analytics"));
// upload route — handles all image uploads, returns Cloudinary secure_url
app.use("/api/upload", require("./routes/api/upload"));
// Public read path for uploads stored in MongoDB when Cloudinary is absent.
app.use("/api/media", require("./routes/api/media"));
app.use("/api/directory", require("./routes/api/directory"));
app.use("/api/support", require("./routes/api/support"));
app.use("/api/groups", require("./routes/api/groups"));
app.use("/api/search", require("./routes/api/search"));

//ai help
app.use("/api/ai/insights", require("./routes/api/aiInsights"));
app.use("/api/ai/assist", require("./routes/api/aiAssist"));
// app.use("/api/showcase", require("./routes/api/showcase"));

app.use('/api/showcase', require('./routes/showcaseRoutes')); //NEW


app.use("/api/achievements", achievementsRouter);
app.use("/api/achievement-categories", categoriesRouter);
app.use("/api/featured-achievements", featuredRouter);

// static file serving
app.use("/awards", express.static(path.join(__dirname, "/images")));

// User files are untrusted. Images/video/audio can render inline; everything
// else is forced to download so a crafted HTML/SVG file cannot run in the app
// origin. The sandbox CSP is defence in depth if a browser ignores the type.
const INLINE_UPLOAD_EXTENSIONS = new Set([
	".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif",
	".mp4", ".webm", ".mov", ".mp3", ".wav", ".weba", ".ogg",
]);
app.use(
	"/uploads",
	(req, res, next) => {
		const extension = path.extname(req.path).toLowerCase();
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
		if (!INLINE_UPLOAD_EXTENSIONS.has(extension)) {
			res.setHeader("Content-Disposition", "attachment");
		}
		next();
	},
	express.static(path.join(__dirname, "uploads"))
);

let onlineUsers = new Map();

// Only authenticated clients may open a socket. Identity is taken from the
// signed JWT in the handshake, never from event payloads.
io.use((socket, next) => {
	const token = socket.handshake.auth && socket.handshake.auth.token;
	if (!token) return next(new Error("unauthorized"));
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		socket.userId = String(decoded.user.id);
		next();
	} catch (err) {
		next(new Error("unauthorized"));
	}
});

const socketIsMember = async (socket, conversationId) => {
	if (!conversationId) return false;
	try {
		const conversation = await Conversation.findById(conversationId).select("members");
		return (
			!!conversation &&
			conversation.members.some((member) => String(member) === socket.userId)
		);
	} catch (err) {
		return false;
	}
};

io.on("connection", (socket) => {
	console.log("New socket connected:", socket.id);
	onlineUsers.set(socket.userId, socket.id);
	socket.broadcast.emit("user_online", { userId: socket.userId });

	// ---- Socket Actions ---- //
	socket.on("addUser", () => {
		try {
			// Ignore any client-supplied id; the verified handshake owns identity.
			onlineUsers.set(socket.userId, socket.id);
			socket.broadcast.emit("user_online", { userId: socket.userId });
		} catch (err) {
			console.error("Socket error in addUser:", err);
		}
	});

	socket.on("joinGroup", async (conversationId) => {
		if (await socketIsMember(socket, conversationId)) {
			socket.join(conversationId);
		}
	});

	// ✅ NEW: join/leave conversation rooms (used by messages.js route emits)
	socket.on("join_conversation", async (payload = {}) => {
		const conversationId = payload.conversationId || payload.convId;
		if (await socketIsMember(socket, conversationId)) {
			socket.join(conversationId);
		}
	});

	socket.on("leave_conversation", ({ conversationId, convId } = {}) => {
		const id = conversationId || convId;
		if (id) socket.leave(id);
	});

	socket.on("leaveGroup", (conversationId) => {
		if (conversationId) socket.leave(conversationId);
	});

	// ✅ NEW: typing indicators
	socket.on("typing_start", async (payload = {}) => {
		const conversationId = payload.conversationId || payload.convId;
		if (!conversationId) return;
		if (!(await socketIsMember(socket, conversationId))) return;
		socket.to(conversationId).emit("typing_start", {
			convId: conversationId,
			conversationId,
			userId: socket.userId,
			name: payload.name,
		});
	});

	socket.on("typing_stop", async (payload = {}) => {
		const conversationId = payload.conversationId || payload.convId;
		if (!conversationId) return;
		if (!(await socketIsMember(socket, conversationId))) return;
		socket.to(conversationId).emit("typing_stop", {
			convId: conversationId,
			conversationId,
			userId: socket.userId,
		});
	});

	// The legacy client-to-client sendMessage/receiveMessage path was removed.
	// Messages are sent through POST /api/messages/send, which checks
	// conversation membership, blocks and payload limits before emitting
	// new_message to the conversation room.

	socket.on("disconnect", () => {
		if (onlineUsers.get(socket.userId) === socket.id) {
			onlineUsers.delete(socket.userId);
			socket.broadcast.emit("user_offline", { userId: socket.userId });
		}
		console.log("Socket disconnected:", socket.id);
	});
});

if (!isServerless && process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../client/build")));
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
	});
}

module.exports = app;