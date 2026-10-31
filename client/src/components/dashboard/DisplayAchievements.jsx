import React, { useState} from "react";
import PropTypes from "prop-types";
import { deleteAllAchievements } from "../../actions/extras";
import AchievementCard from "../extras/AchievementCard";
import { CSVLink } from "react-csv";
import Icon from "awesome-react-icons";

const DisplayAchievements = ({ achievements }) => {
	const [data, setData] = useState(achievements);
	const [month, setMonthValue] = useState("");

	const fields = [
		{ label: "ID", key: "_id" },
		{ label: "Name", key: "name" },
		{ label: "Enrollment number", key: "enrollment_number" },
		{ label: "Program", key: "program" },
		{ label: "Passing year", key: "passing_year" },
		{ label: "Awards", key: "rewards" },
		{ label: "Award Date", key: "award_date" },
		{ label: "Image Link", key: "imgUrl" },
		{ label: "Certificate Link", key: "proofUrl" },
	];

	const csvReport = {
		data: data,
		headers: fields,
		filename: "achievements.csv",
	};

	const deleteAll = (callback) => {
		const conf = window.confirm(
			"This action cannot be undone. Are you sure ?"
		);
		if (conf) {
			callback();
		}
	};

	const onChange = (e) => {
		setMonthValue(e.target.value);
		if (e.target.value === "00") {
			setData(achievements);
		} else {
			const filtered = achievements.filter((item) => {
				let date_string = item.award_date;
				let date = date_string.split("-");
				if (date[1] === e.target.value) {
					return item;
				}
			});
			setData(filtered);
		}
	};

	return (
		<React.Fragment>
			<ul
				style={{marginTop: "2em", marginLeft:"5.5em" }}
				className="award-actions"
			>
				<li>
					<CSVLink
						{...csvReport}
						className="btn btn btn-secondary btn-light mr-2"
					>
						Export All
						<Icon name="arrow-right" />
					</CSVLink>
				</li>
				<li>
					<button
						className="btn btn-danger ml-2"
						onClick={() => deleteAll(deleteAllAchievements)}
					>
						Delete All
						<Icon name="trash" />
					</button>
				</li>
				<li>
					<select
						className="ml-2"
						value={month}
						onChange={(e) => onChange(e)}
						style={{
							outline: "none",
							padding: "0.5em",
							border: "1.5px solid #ccc",
							borderRadius: "4px",
						}}
					>
						<option value="00">All</option>
						<option value="01">Jan</option>
						<option value="02">Feb</option>
						<option value="03">March</option>
						<option value="04">April</option>
						<option value="05">May</option>
						<option value="06">June</option>
						<option value="07">July</option>
						<option value="08">Aug</option>
						<option value="09">Sept</option>
						<option value="10">Oct</option>
						<option value="11">Nov</option>
						<option value="12">Dec</option>
					</select>
				</li>
			</ul>
			{data.length === 0 && (
				<div className="no-data-page mt-5 request-list-admin-dash">
					No achievements to display
				</div>
			)}

			<div className="request-list-admin-dash float-child">
				{data.map((item) => {
					return <AchievementCard key={item._id} data={item} />;
				})}
			</div>
		</React.Fragment>
	);
};

DisplayAchievements.propTypes = {
	achievements: PropTypes.array.isRequired,
};

export default DisplayAchievements;
