require('dns').setDefaultResultOrder('ipv4first');

require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Authroutes = require("./routes/api/LinkedinRoute.js");
const Conversation = require("./models/Conversation");
const app = express();
const eventQuestionsRoutes = require("./routes/api/eventQuestions");
const http = require("http").createServer(app);
const PORT = process.env.PORT || 5001;

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
app.use((req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("Referrer-Policy", "no-referrer");
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

http.listen(PORT, () => console.log(`Server is up on port ${PORT}`));

const io = require("socket.io")(http, {
	cors: {
		origin: `${process.env.CLIENT_URL}`,
		methods: ["GET" , "POST"]
	},
});
app.set("io", io); // ✅ makes io accessible in routes via req.app.get("io")

connectDB();

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

// define routes
app.use('/api/linkedin' , Authroutes);

app.use("/api/users", require("./routes/api/users"));
app.use("/api/profile", require("./routes/api/profile"));
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/requests", require("./routes/api/request"));
app.use("/api/block", require("./routes/api/blocking"));
app.use("/api/posts", require("./routes/api/posts"));
app.use("/api/feed", require("./routes/api/feed"));
app.use("/api/extras", require("./routes/api/extras"));
app.use("/api/conversations", require("./routes/api/conversations"));
app.use("/api/messages", require("./routes/api/messages"));
app.use("/api/channels", require("./routes/api/channel"));
app.use("/api/job", require("./routes/api/jobs"));
app.use("/api/event", require("./routes/api/event"));
app.use("/api/notifications", require("./routes/api/notifications"));
app.use("/api/stories", require("./routes/api/stories"));
app.use("/api/doubts", require("./routes/api/doubts"));
app.use("/api/mentorship", require("./routes/api/mentorship"));
app.use("/api/resources", require("./routes/api/resources"));
app.use("/api/event-questions", eventQuestionsRoutes);
app.use("/api/analytics", require("./routes/api/analytics"));
// upload route — handles all image uploads, returns Cloudinary secure_url
app.use("/api/upload", require("./routes/api/upload"));
app.use("/api/directory", require("./routes/api/directory"));
app.use("/api/support", require("./routes/api/support"));
app.use("/api/groups", require("./routes/api/groups"));

//ai help
app.use("/api/ai/insights", require("./routes/api/aiInsights"));
// app.use("/api/showcase", require("./routes/api/showcase"));

app.use('/api/showcase', require('./routes/showcaseRoutes')); //NEW


app.use("/api/achievements", achievementsRouter);
app.use("/api/achievement-categories", categoriesRouter);
app.use("/api/featured-achievements", featuredRouter);

// static file serving
app.use("/awards", express.static(path.join(__dirname, "/images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

	socket.on('sendMessage', async ({ receiverId, conversationId, text, isGroup } = {}) => {
		try {
			const senderId = socket.userId;

			if (isGroup) {
				if (!(await socketIsMember(socket, conversationId))) return;
				// Resolve recipients from the database, not from a client-supplied list.
				const conversation = await Conversation.findById(conversationId).select("members");
				(conversation?.members || []).forEach((memberId) => {
					const id = String(memberId);
					if (id === senderId) return;
					const receiverSocket = onlineUsers.get(id);
					if (receiverSocket) {
						io.to(receiverSocket).emit('receiveMessage', {
							senderId,
							text,
							conversationId,
							conversation: conversationId,
							isGroup: true,
						});
					}
				});
			} else if (receiverId) {
				const receiverSocket = onlineUsers.get(String(receiverId));
				if (receiverSocket) {
					io.to(receiverSocket).emit('receiveMessage', {
						senderId,
						text,
						conversationId,
						conversation: conversationId,
					});
				}
			}
		} catch (err) {
			console.error("Socket error in sendMessage:", err);
		}
	});

	socket.on("disconnect", () => {
		if (onlineUsers.get(socket.userId) === socket.id) {
			onlineUsers.delete(socket.userId);
			socket.broadcast.emit("user_offline", { userId: socket.userId });
		}
		console.log("Socket disconnected:", socket.id);
	});
});

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../client/build")));
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
	});
}