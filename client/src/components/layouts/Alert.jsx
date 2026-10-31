import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

const Alert = ({ alerts }) => {
	console.log("🚨 Alerts", alerts);
	if (alerts && alerts.length > 0) {
		return (
			<div className="alerts-container">
				{alerts.map((alert) => (
					<div key={alert.id} className={`alert alert-${alert.alertType}`}>
						{alert.msg}
					</div>
				))}
			</div>
		);
	}
	return null;
};

Alert.propTypes = {
	alerts: PropTypes.array.isRequired,
};

const mapStateToProps = (state) => ({
	alerts: state.alert.alerts,
});

export default connect(mapStateToProps)(Alert);
