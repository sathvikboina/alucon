import React from "react";

const NotFound = () => {
	return (
		<div style={{minHeight: "450px"}}>
			<h1 className="x-large text-danger">
				<i className="fas fa-exclamation-triangle" style={{marginRight: "1em"}}/>
				Page Not Found
			</h1>
			<p className="large">Sorry, this page does not exist</p>
		</div>
	);
};

export default NotFound;
