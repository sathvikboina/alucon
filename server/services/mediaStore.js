// One place that turns an uploaded buffer into a public URL.
//
// Preferred store is Cloudinary. When its three variables are absent (or the
// deployment is Vercel and no CDN is configured) the bytes go into MongoDB and
// are served by /api/media/:id. Local development keeps using the disk.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const MediaBlob = require("../models/MediaBlob");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "../uploads");

// MongoDB documents max out at 16 MB. Stay well below that so a document plus
// its metadata always fits.
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

const EXTENSION_BY_MIME = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
	"image/gif": ".gif",
	"video/mp4": ".mp4",
	"video/webm": ".webm",
	"video/quicktime": ".mov",
	"audio/mpeg": ".mp3",
	"audio/wav": ".wav",
	"audio/webm": ".weba",
	"application/pdf": ".pdf",
	"application/msword": ".doc",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
	"application/vnd.ms-powerpoint": ".ppt",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
};

const cloudinaryConfigured = () =>
	Boolean(
		process.env.CLOUD_NAME &&
			process.env.CLOUDINARY_API_KEY &&
			process.env.CLOUDINARY_API_SECRET
	);

function streamUpload(buffer, folder) {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{ folder, resource_type: "auto" },
			(error, result) => (error ? reject(error) : resolve(result))
		);
		streamifier.createReadStream(buffer).pipe(stream);
	});
}

async function localUpload(buffer, mimetype, originalName) {
	await fs.promises.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
	const extension =
		EXTENSION_BY_MIME[mimetype] || path.extname(originalName || "") || "";
	const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
	await fs.promises.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
	return { url: `/uploads/${filename}`, publicId: filename, provider: "disk" };
}

/**
 * Store an uploaded buffer and return a URL the browser can load.
 *
 * @param {object} options
 * @param {Buffer} options.buffer
 * @param {string} options.mimetype
 * @param {string} [options.originalName]
 * @param {string} [options.folder]
 * @param {string} [options.baseUrl] absolute origin used for the inline store
 * @param {string} [options.uploadedBy] user id, for the inline store
 */
async function storeBuffer({
	buffer,
	mimetype,
	originalName = "",
	folder = "SHOWCASE",
	baseUrl = "",
	uploadedBy = null,
}) {
	if (cloudinaryConfigured()) {
		const result = await streamUpload(buffer, folder);
		return {
			url: result.secure_url,
			publicId: result.public_id,
			provider: "cloudinary",
		};
	}

	if (!process.env.VERCEL) {
		return localUpload(buffer, mimetype, originalName);
	}

	if (buffer.length > MAX_INLINE_BYTES) {
		const error = new Error(
			"Files above 8 MB need Cloudinary on this deployment. Set CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or upload a smaller file."
		);
		error.status = 413;
		throw error;
	}

	const blob = await MediaBlob.create({
		filename: originalName,
		mimetype,
		size: buffer.length,
		data: buffer,
		uploadedBy: uploadedBy || undefined,
	});

	return {
		url: `${baseUrl}/api/media/${blob._id}`,
		publicId: String(blob._id),
		provider: "inline",
	};
}

/** Remove a stored object; best effort so a failed delete still frees the row. */
async function destroyMedia(publicId, { resourceType = "image" } = {}) {
	if (!publicId) return;
	if (cloudinaryConfigured() && !/^[a-f0-9]{24}$/i.test(String(publicId))) {
		try {
			await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
		} catch (err) {
			console.error("[media] cloudinary delete failed:", err.message);
		}
		return;
	}
	try {
		await MediaBlob.deleteOne({ _id: publicId });
	} catch (err) {
		console.error("[media] inline delete failed:", err.message);
	}
}

module.exports = {
	storeBuffer,
	destroyMedia,
	cloudinaryConfigured,
	MAX_INLINE_BYTES,
};
