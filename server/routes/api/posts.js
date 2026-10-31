const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const authHeadAdmin = require("../../middleware/authHeadAdmin");
const User = require("../../models/User");
const Post = require("../../models/Post");
const Filter = require("bad-words");
const { check, validationResult } = require("express-validator");
var mongoose = require("mongoose");
const Channel = require("../../models/Channel");
const { canViewPost } = require("../../utils/postVisibility");
const { canViewGroupPost } = require("../../utils/groupAccess");

// Group-scoped posts need a database lookup (membership lives on the group),
// so every route that touches one loads the viewer once and asks the shared
// helper. Returning 404 keeps invite-only groups from leaking their existence.
const loadViewer = (req) =>
	User.findById(req.user.id).select("role isAdmin").lean();

async function viewerCanReadPost(req, post) {
	const user = await loadViewer(req);
	if (!user || !canViewPost(user, post)) return false;
	if (post.group) return canViewGroupPost(user, post);
	return true;
}

// @route    POST api/posts
// @desc     create a Post Directly
// @access   Private

router.post(
    "/create-post",
    [
        auth,
        [
            check("text", "Body Text is required").not().isEmpty(),
            check("heading", "Heading is required").not().isEmpty(),
            check("visibleStudent", "Student visibility value is required").isBoolean(),
            check("visibleFaculty", "Faculty visibility value is required").isBoolean(),
            check("visibleAlumni", "Alumni visibility value is required").isBoolean(),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const filter = new Filter();
        const { text, heading } = req.body;

        // Check for bad words
        const containsBadWords = filter.isProfane(text) || filter.isProfane(heading);
        if (containsBadWords) {
            return res.status(400).json({ errors: [{ msg: "Bad word detected" }] });
        }

        try {
            const user = await User.findById(req.user.id).select("-password");
            const {
                visibleStudent,
                visibleFaculty,
                visibleAlumni,
                channel,
                images,
            } = req.body;

            // Build visibility array
            const visibility = [];
            if (visibleStudent) visibility.push("student");
            if (visibleFaculty) visibility.push("faculty");
            if (visibleAlumni) visibility.push("alumni");

            const channelName = (channel || "").trim() || "General";

            // ✅ Find the channel properly. "General" is the default feed topic
            // and is provisioned on first use so the inline composer always works.
            let result_channel = await Channel.findOne({ name: channelName });

            if (!result_channel && channelName.toLowerCase() === "general") {
                result_channel = await Channel.create({ name: "General" });
            }

            if (!result_channel) {
                return res.status(400).json({ errors: [{ msg: "Channel does not exist" }] });
            }

            // ✅ Create the Post
            const post = new Post({
                user: req.user.id,
                heading,
                text,
                name: user.name,
                avatar: user.avatar,
                visibility,
                images,
                channel: channelName,
            });

            const savedPost = await post.save();
            const post_id = savedPost._id;

            // ✅ Update the Channel to push the post id
            await result_channel.updateOne({
  $push: { postRequests: post._id },
});

            console.log("Post Created");
            res.json(savedPost);

        } catch (error) {
            console.error(error.message);
            res.status(500).send("Server error in Create post");
        }
    }
);


// @route    get api/posts/all
// @desc     get all posts
// @access   Private

router.get("/search", auth, async (req, res) => {
	try {
		const searchTerm = (req.query.query || "").trim();
		const channel_name = (req.query.channel_name || "").trim();

		// Feed is scoped to the signed-in user so private/role-limited posts
		// never leave the server. Admins retain full visibility.
		const user = await User.findById(req.user.id).select("role isAdmin");

		const query = { group: null };
		if (channel_name) query.channel = channel_name;

		let posts;
		if (searchTerm) {
			posts = await Post.find(
				{ ...query, $text: { $search: searchTerm } },
				{ score: { $meta: "textScore" } }
			)
				.sort({ score: { $meta: "textScore" } })
				.limit(100)
				.lean();
		} else {
			posts = await Post.find(query).sort({ date: -1 }).limit(100).lean();
		}

		if (user && !user.isAdmin) {
			const role = String(user.role || "").toLowerCase();
			posts = posts.filter((p) => {
				const owns = p.user && p.user.toString() === req.user.id;
				const visibility = Array.isArray(p.visibility) ? p.visibility : [];
				const visibleToRole =
					visibility.length === 0 ||
					visibility.some((v) => String(v).toLowerCase() === role);
				return owns || visibleToRole;
			});
		}

		res.json(posts);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

// @route    get api/posts/:id
// @desc     get post by id
// @access   Private

router.get("/:id", auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ msg: "Post not found" });
		}

		if (!(await viewerCanReadPost(req, post))) {
			// 404 rather than 403 so the endpoint does not reveal that a
			// restricted post exists.
			return res.status(404).json({ msg: "Post not found" });
		}

		res.json(post);
	} catch (error) {
		console.error(error.message);
		if (error.kind === "ObjectId") {
			return res.status(404).json({ msg: "Post not found" });
		}
		res.status(500).send("Server Error");
	}
});

// @route    delete api/posts/:id
// @desc     delete post by id
// @access   Private

router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // ✅ check post exists
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // ✅ allow: creator OR head admin
    if (
      post.user.toString() !== req.user.id &&
      req.user.role !== "head_admin"
    ) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await post.deleteOne();

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    post api/posts/:post_id/likes
// @desc     Toggle Like of a post
// @access   Private

// router.post("/:id/likes", auth, async (req, res) => {
// 	try {
// 		const post = await Post.findById(req.params.id);
// 		if (post === null) {
// 			return res.status(404).json({ msg: "Post Not found" });
// 		}
// 		if (post.user.toString() === req.user.id) {
// 			return res
// 				.status(400)
// 				.json({ msg: "You can't like your own post" });
// 		}
// 		const liked = await Post.find({
// 			_id: req.params.id, //  match post id
// 			likes: {
// 				$elemMatch: { user: mongoose.Types.ObjectId(req.user.id) },
// 			},
// 		});

// 		if (liked.length) {
// 			return res.status(400).json({ msg: "Post already liked" });
// 		} else {
// 			// remove from dislikes
// 			await Post.findOneAndUpdate(
// 				{ _id: req.params.id },
// 				{
// 					$pull: {
// 						dislikes: {
// 							user: mongoose.Types.ObjectId(req.user.id),
// 						},
// 					},
// 				}
// 			);

// 			await Post.updateOne(
// 				{ _id: req.params.id },
// 				{
// 					$push: {
// 						likes: { user: mongoose.Types.ObjectId(req.user.id) },
// 					},
// 				}
// 			);
// 			const updatedPost = await Post.findById(req.params.id);

// 			const payload = {
// 				id: post._id,
// 				likes: updatedPost.likes,
// 				dislikes: updatedPost.dislikes,
// 			};

// 			return res.status(200).json(payload);
// 		}
// 	} catch (error) {
// 		console.error(error.message);
// 		res.status(500).send("Server Error");
// 	}
// });
router.post("/:id/likes", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post Not found" });
    }

    if (!(await viewerCanReadPost(req, post))) {
      return res.status(404).json({ msg: "Post Not found" });
    }

    if (post.user.toString() === req.user.id) {
      return res.status(400).json({ msg: "You can't like your own post" });
    }

    const alreadyLiked = post.likes.some(
      (like) => like.user && like.user.toString() === req.user.id
    );

    if (alreadyLiked) {
      return res.status(400).json({ msg: "Post already liked" });
    }

    post.dislikes = post.dislikes.filter(
      (dislike) =>
        dislike.user && dislike.user.toString() !== req.user.id
    );

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json({
      id: post._id,
      likes: post.likes,
      dislikes: post.dislikes,
    });
  } catch (error) {
    console.error("LIKE ERROR FULL:", error); // 🔥 important
    res.status(500).send("Server Error");
  }
});
// @route    post api/posts/:post_id/dislikes
// @desc     toggle DisLike of a post
// @access   Private

router.post("/:id/dislikes", auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (post === null) {
			return res.status(404).json({ msg: "Post Not found" });
		}
		if (!(await viewerCanReadPost(req, post))) {
			return res.status(404).json({ msg: "Post Not found" });
		}
		if (post.user.toString() === req.user.id) {
			return res
				.status(400)
				.json({ msg: "You can't dislike your own post" });
		}

		const disliked = await Post.find({
			_id: req.params.id, //  match post id
			dislikes: {
				$elemMatch: { user: mongoose.Types.ObjectId(req.user.id) },
			},
		});

		if (disliked.length) {
			return res.status(400).json({ msg: "Post already disliked" });
		} else {
			// remove from likes
			await Post.findOneAndUpdate(
				{ _id: req.params.id },
				{
					$pull: {
						likes: {
							user: mongoose.Types.ObjectId(req.user.id),
						},
					},
				}
			);
			// add to dislikes
			await Post.updateOne(
				{ _id: req.params.id },
				{
					$push: {
						dislikes: {
							user: mongoose.Types.ObjectId(req.user.id),
						},
					},
				}
			);
			const updatedPost = await Post.findById(req.params.id);

			const payload = {
				id: post._id,
				likes: updatedPost.likes,
				dislikes: updatedPost.dislikes,
			};
			return res.status(200).json(payload);
		}
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

// @route    POST api/posts/:id/comments
// @desc     comment on post
// @access   Private
router.post(
	"/:id/comments",
	[auth, [check("text", "Comment cannot be Empty").not().isEmpty()]],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log("validation check");

			return res.status(400).json({ errors: errors.array() });
		}

		const filter = new Filter();

		var containsBadWords = filter.isProfane(req.body.text);

		if (containsBadWords) {
			console.log();
			return res
				.status(400)
				.json({ errors: [{ msg: "Bad word detected" }] });
		}

		try {
			const user = await User.findById(req.user.id).select("-password");
			const post = await Post.findById(req.params.id);

			if (!post) {
				return res.status(404).json({ msg: "Post not found" });
			}
			if (!(await viewerCanReadPost(req, post))) {
				return res.status(404).json({ msg: "Post not found" });
			}

			const newComment = {
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id,
			};

			post.comments.unshift(newComment);

			await post.save();
			console.log("comment added to db");
			res.json(post.comments);
		} catch (error) {
			console.log("err block routes");
			console.error(error.message);
			res.status(500).send("server error");
		}
	}
);

// @route    DELETE api/posts/:id/comments/:comment_id
// @desc     delete comment
// @access   Private
router.delete("/:id/comments/:comment_id", auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		const comment = post.comments.find(
			(comment) => comment.id === req.params.comment_id
		);

		if (!comment) {
			return res.status(400).json({ msg: "comment does not exist" });
		}

		if (comment.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: "User not authorised" });
		}
		post.comments = post.comments.filter((comm) => comm.id !== comment.id);
		await post.save();
		res.json(post.comments);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("server error");
	}
});

// router.get("/search/:query_string", auth, async (req, res) => {
// 	try {
// 		const posts = await Post.find(
// 			{ $text: { $search: req.params.query_string } },
// 			{ score: { $meta: "textScore" } }
// 		).sort({ score: { $meta: "textScore" } });
// 		res.json(posts);
// 	} catch (err) {
// 		console.error(error.message);
// 		res.status(500).send("server error  in posts search");
// 	}
// });

module.exports = router;
