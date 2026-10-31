import React from "react";

const NotAuthorized = () => {
	return (
		<div style={{minHeight: "450px"}}>
			<h1 className="x-large text-danger">
				<i className="fas fa-exclamation-triangle" style={{marginRight: "1em"}}/>
				Not Authorized
			</h1>
			<p className="large">You do not have permission to access this page</p>
		</div>
	);
};

export default NotAuthorized;