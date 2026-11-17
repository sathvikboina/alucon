import React from "react";
import { Link } from "react-router-dom";

/**
 * Wrap an avatar so pressing it opens that member's profile.
 *
 * `display: contents` keeps the wrapper out of the layout, so existing flex
 * rows and `img` rules look exactly as they did before. When the avatar
 * belongs to the signed-in member the profile page shows an Edit Profile
 * button, which is the only difference between viewing yourself and others.
 */
const ProfileAvatarLink = ({
  userId,
  children,
  className = "avatar-link",
  title = "View profile",
}) => {
  const id =
    userId && typeof userId === "object" ? userId._id : userId;

  if (!id) return <>{children}</>;

  return (
    <Link
      to={`/profile/${id}`}
      className={className}
      title={title}
      aria-label={title}
      style={{ display: "contents" }}
    >
      {children}
    </Link>
  );
};

export default ProfileAvatarLink;
