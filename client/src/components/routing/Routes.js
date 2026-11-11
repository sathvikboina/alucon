import React from "react";
import { Route, Switch } from "react-router-dom";
import NotFound from "../layouts/NotFound";
import Register from "../auth/Register.jsx";
import Alert from "../layouts/Alert.jsx";
import Dashboard from "../dashboard/Dashboard";
import PrivateRoute from "../routing/PrivateRoute";
import AdminRoute from "../routing/AdminRoute";
import AlumniRoute from "../routing/AlumniRoute";
import Login from "../auth/Login.jsx";
import EditProfile from "../profile-form/EditProfile";
import AddExperience from "../profile-form/AddExperience";
import AddEducation from "../profile-form/AddEducation";
import Profile from "../profile/Profile";
import ForgotPassword from "../auth/ForgotPassword";
import ResetPassword from "../auth/ResetPassword";
import AdminDash from "../dashboard/AdminDash.jsx";
import Posts from "../posts/Posts";
import PostDisplay from "../posts/PostDisplay";
import Groups from "../groups/Groups";
import GroupDetail from "../groups/GroupDetail";
import Help from "../layouts/Help";
import Messenger from "../messenger/Messenger";

import Job from "../Jobs/jobs.jsx";
import ArchiveJobs from "../Jobs/archiveJobs.jsx";
import CreateJob from "../Jobs/createJob.jsx";


// ✅ Story Components
import StoryForm from "../story/StoryForm";

// ✅ Friends Components

import DoubtRoom from '../doubts/DoubtRoom';

import MentorDashBoard from "../mentorship/MentorDashBoard";
import InternshipMatches from "../matching/InternshipMatches";
import MentorMatches from "../matching/MentorMatches";
import Doors from "../doors/Doors";
import ResourceHub from "../resource/ResourceHub";
import AISearch from "../search/AISearch";

import AnalyticsDashboard from "../admin/AnalyticsDashboard.jsx";
import Event from "../Event/event.jsx";
import CreateEvent from "../Event/createEvent.jsx";
import AlumniDirectory from "../directory/AlumniDirectory";
import SupportInitiatives from "../support/SupportInitiatives";
import SupportResponses from "../support/SupportResponses";
const Routes = () => {
	return (
		<section
			style={{ minHeight: "100vh",width: "100%" }}
		>
			<Alert />
			<Switch>
				<Route exact path="/register" component={Register} />
				<Route exact path="/login" component={Login} />

				<PrivateRoute exact path="/profile/:id" component={Profile} />

				<Route exact path="/jobs" component={Job} />
				<PrivateRoute exact path="/internship-matches" component={InternshipMatches} />
				<PrivateRoute exact path="/mentor-matches" component={MentorMatches} />
				<PrivateRoute exact path="/doors" component={Doors} />
				<Route exact path="/archivejobs" component={ArchiveJobs} />
				<Route exact path="/createjob" component={CreateJob} />
				<Route exact path="/events" component={Event} />
				<Route exact path="/createEvent" component={CreateEvent} />

				<Route exact path="/forgotPassword" component={ForgotPassword} />
				<Route exact path="/resetPassword/:user_id/:reset_token" component={ResetPassword} />
				<Route exact path="/help" component={Help} />

				<PrivateRoute exact path="/userprofile" component={Dashboard} />
				<PrivateRoute exact path="/add-experience" component={AddExperience} />
				<PrivateRoute exact path="/add-education" component={AddEducation} />
				<PrivateRoute exact path="/feed" component={Posts} />
				<PrivateRoute exact path="/feed/topic/:channel_name" component={Posts} />
				<PrivateRoute exact path="/search" component={AISearch} />
				<PrivateRoute exact path="/posts/:id" component={PostDisplay} />
				<PrivateRoute exact path="/groups" component={Groups} />
				<PrivateRoute exact path="/groups/:id" component={GroupDetail} />
				<PrivateRoute exact path="/edit-profile" component={EditProfile} />

				<AdminRoute exact path="/dashboard" component={AdminDash} />
				<AdminRoute exact path="/analytics" component={AnalyticsDashboard} />

				{/* ✅ Messenger Pages */}
				<PrivateRoute path="/messenger" component={Messenger} />

				{/* ✅ Story Pages */}
				<AlumniRoute exact path="/stories/add" component={StoryForm} />
				<Route exact path="/doubts" component={DoubtRoom} />
				<PrivateRoute exact path="/mentorship" component={MentorDashBoard} />
				<Route exact path="/resources" component={ResourceHub} />
				<Route exact path="/alumni-directory" component={AlumniDirectory} />
				<PrivateRoute exact path="/support-initiatives" component={SupportInitiatives} />
				<AdminRoute exact path="/admin/support-responses" component={SupportResponses} />

				{/* Not Found Page */}
				<Route component={NotFound} />
			</Switch>
		</section>
	);
};

export default Routes;