import "./closeFriend.css";

export default function CloseFriend({user}) {
  return (
    <li className="sidebarFriend">
      <img className="sidebarFriendImg" src={user.avatar} alt="" />
      <span className="sidebarFriendName">{user.name}</span>
    </li>
  );
}
