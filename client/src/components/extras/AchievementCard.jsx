import React from "react";
import PropTypes from "prop-types";
import { deleteAchievement } from "../../actions/extras";
import { connect } from "react-redux";

const AchievementCard = ({ data, deleteAchievement }) => {
	return (
		<div className="join-request-card achievement-card">
			<ul className="col-9 join-request-card-info">
				<li>
					<strong>Name: </strong>
					{data.name}
				</li>
				<li>
					<strong>Enrollment Number: </strong>
					<span style={{ textTransform: "uppercase" }}>
						{data.enrollment_number !== ""
							? data.enrollment_number
							: "Not Filled"}
					</span>
				</li>
				<li>
					<strong>Program: </strong>
					<span style={{ textTransform: "uppercase" }}>
						{data.program}
					</span>
				</li>
				<li>
					<strong>Pass out Year: </strong>
					{data.passing_year}
				</li>
				<li>
					<strong>Award Date: </strong>
					{data.award_date}
				</li>
				<li>
					<strong>Award Details:</strong>
					<ul style={{ marginLeft: "1em" }}>
						<li>
							<strong>Title:</strong> {data.reward?.title}
						</li>
						<li>
							<strong>Type:</strong> {data.reward?.type}
						</li>
						<li>
							<strong>Organization:</strong> {data.reward?.organization}
						</li>
						<li>
							<strong>Received By:</strong> {data.reward?.receivedBy}
						</li>
						<li>
							<strong>Cash Prize:</strong> {data.reward?.cashPrize}
						</li>
					</ul>
				</li>
				<div className="row">
					<li className="mr-2 ml-3">
						<a target="_blank" href={data.imgUrl} rel="noreferrer">
							View Image
						</a>
					</li>
					<li className="ml-1">
						<a target="_blank" href={data.proofUrl} rel="noreferrer">
							View Certificate
						</a>
					</li>
				</div>
			</ul>
			<div className="col-3">
				<div className="action-buttons-request-card">
					<button
						className="row action-button-request-card reject-button"
						onClick={() => deleteAchievement(data._id)}
					>
						<i
							className="fa fa-times"
							aria-hidden="true"
							style={{ marginTop: "3px" }}
						></i>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
};

AchievementCard.propTypes = {
	data: PropTypes.object.isRequired,
	deleteAchievement: PropTypes.func.isRequired,
};

export default connect(null, { deleteAchievement })(AchievementCard);
