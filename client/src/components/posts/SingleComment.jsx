import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { deleteComment } from "../../actions/post";
import { connect } from "react-redux";

const SingleComment = ({
	comment: { _id, text, name, avatar, user },
	currentUser,
	postId,
	deleteComment,
}) => {
	return (
		<div
			className="row single-comment-display"
			style={{ marginTop: "0.5em" }}
		>
			<div
				className="col-md-1 col-sm-2 col-xs-2"
				style={{ textAlign: "center" }}
			>
				<div className="">
					<>
						<img 
							alt="" 
							src={(avatar || "").replace('d=mm', 'd=404')} 
							className="avatar avatar-sm rounded-circle" 
							onError={(e) => {
								e.target.style.display = 'none';
								if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
							}}
						/>
						<div className="avatar avatar-sm rounded-circle" style={{ display: 'none', background: "#eff6ff", alignItems: "center", justifyContent: "center", color: "#60a5fa", border: "1px solid #d8dde6" }}>
							<svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
								<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
							</svg>
						</div>
					</>
				</div>
				<div className="">
					<Link to={`/profile/${user}`}>{name}</Link>
				</div>
			</div>

			<div className="col-md-10 col-sm-8 col-xs-8">{text}</div>

			{user === currentUser && (
				<div className="col-md-1 col-sm-2 col-xs-2">
					<i
						className="fa fa-trash delete-comment-button"
						aria-hidden="true"
						onClick={() => deleteComment(postId, _id)}
					/>
				</div>
			)}
		</div>
	);
};

SingleComment.propTypes = {
	comment: PropTypes.object.isRequired,
	deleteComment: PropTypes.func.isRequired,
	postId: PropTypes.string.isRequired
};

export default connect(null, { deleteComment })(SingleComment);