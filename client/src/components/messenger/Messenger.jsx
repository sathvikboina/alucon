// src/components/messenger/Messenger.jsx
import React, { useCallback } from "react";
import {
  Route, Switch, useRouteMatch, Link, useLocation, useHistory,
} from "react-router-dom";
import { connect } from "react-redux";

import ConversationSidebar from "./ConversationSidebar";
import ChatWindow          from "./ChatWindow";
import CreateGroup         from "./CreateGroup";
import FriendsList         from "../friends/FriendsList";
import BlockList           from "../friends/BlockList";

import { useMessengerSocket } from "../../hooks/useMessengerSocket";
import "./messenger.css";

// Inject socket helpers as props into ChatWindow without Redux
const ChatWindowWithHelpers = (helpers, extra) => (props) =>
  <ChatWindow {...props} {...helpers} {...extra} />;

// ── Mobile page shell with back button ────────────────────────────────────
const MobilePageShell = ({ title, onBack, children }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    {onBack && (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", height: 58, flexShrink: 0,
        background: "var(--navy-900)", color: "var(--white)",
      }}>
        <button
          onClick={onBack}
          style={{
            width: 34, height: 34, border: "none", borderRadius: 4,
            background: "rgba(255,255,255,0.08)", color: "var(--white)",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.9rem", flexShrink: 0,
          }}
        >
          <i className="fas fa-arrow-left" />
        </button>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.02em" }}>
          {title}
        </span>
      </div>
    )}
    <div style={{ flex: 1, overflowY: "auto" }}>
      {children}
    </div>
  </div>
);

const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 560;

const Messenger = ({ auth: { authUser } }) => {
  const { path, url } = useRouteMatch();
  const location      = useLocation();
  const history       = useHistory();

  // ── Mobile responsive ─────────────────────────────────────────────────────
  const [isMobile,     setIsMobile]     = React.useState(window.innerWidth <= 768);
  const [showSidebar,  setShowSidebar]  = React.useState(true);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // On mobile: any sub-page hides sidebar and shows main
  React.useEffect(() => {
    if (!isMobile) return;
    const onRoot = location.pathname === url || location.pathname === `${url}/`;
    setShowSidebar(onRoot);
  }, [location.pathname, isMobile, url]);

  const goBack = React.useCallback(() => {
    setShowSidebar(true);
    history.push(url);
  }, [history, url]);

  // ── Resizable sidebar ─────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = React.useState(380);
  const isResizing = React.useRef(false);

  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, e.clientX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // ── Real-time socket ──────────────────────────────────────────────────────
  const socketHelpers = useMessengerSocket(authUser);
  const ChatWindowWS  = React.useMemo(
    () => ChatWindowWithHelpers(socketHelpers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Active nav helper ─────────────────────────────────────────────────────
  const isActive = (subpath) => location.pathname.startsWith(`${url}${subpath}`);
  const navCls   = (subpath) =>
    `messenger-sidebar-nav-item${isActive(subpath) ? " active" : ""}`;
  const inboxCls = () =>
    `messenger-sidebar-nav-item${
      location.pathname === url || location.pathname === `${url}/` ? " active" : ""
    }`;

  return (
    <div className="messenger-wrapper">

      {/* ══════════════════════════════
          SIDEBAR
          ══════════════════════════════ */}
      <div
        className={`messenger-sidebar${isMobile && !showSidebar ? " hidden" : ""}`}
        style={!isMobile ? { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth } : {}}
      >
        {/* Header */}
        <div className="messenger-sidebar-header">
          <h3>Messages</h3>
        </div>

        {/* Nav tabs */}
        <nav className="messenger-sidebar-nav">
          <Link to={`${url}`} className={inboxCls()} title="Chats">
            <span className="nav-icon">💬</span><span className="nav-label"> Chats</span>
          </Link>
          <Link to={`${url}/friends/list`} className={navCls("/friends/list")} title="Following">
            <span className="nav-icon">👥</span><span className="nav-label"> Following</span>
          </Link>
          <Link to={`${url}/create-group`} className={navCls("/create-group")} title="New Group">
            <span className="nav-icon">＋</span><span className="nav-label"> Group</span>
          </Link>
        </nav>

        {/* Sidebar content area */}
        <div className="messenger-sidebar-content">
          <Switch>
            <Route
              path={`${path}/friends`}
              render={() => (
                <p style={{
                  fontSize: "0.78rem", color: "#9ca3af",
                  padding: "14px 16px", margin: 0,
                }}>
                  Use the tabs above to navigate.
                </p>
              )}
            />
            <Route
              path={`${path}/create-group`}
              render={() => (
                <p style={{
                  fontSize: "0.78rem", color: "#9ca3af",
                  padding: "14px 16px", margin: 0,
                }}>
                  Fill in the form to create a group.
                </p>
              )}
            />
            <Route path={`${path}`} component={ConversationSidebar} />
          </Switch>
        </div>
      </div>

      {/* ══════════════════════════════
          RESIZE HANDLE (desktop only)
          ══════════════════════════════ */}
      {!isMobile && (
        <div
          className="messenger-resize-handle"
          onMouseDown={onResizeMouseDown}
          title="Drag to resize sidebar"
        >
          <div className="messenger-resize-grip" />
        </div>
      )}

      {/* ══════════════════════════════
          MAIN AREA
          ══════════════════════════════ */}
      <div className={`messenger-main${isMobile && showSidebar ? " hidden" : ""}`}>
        <Switch>
          <Route exact path={`${path}/chat/:id`}
            render={(props) => <ChatWindowWS {...props} onBack={goBack} isMobile={isMobile} />}
          />
          <Route exact path={`${path}/group/:id`}
            render={(props) => <ChatWindowWS {...props} onBack={goBack} isMobile={isMobile} />}
          />
          <Route exact path={`${path}/create-group`} render={() => (
            <MobilePageShell title="New Group" onBack={isMobile ? goBack : null}>
              <CreateGroup />
            </MobilePageShell>
          )} />
          <Route exact path={`${path}/friends/list`} render={() => (
            <MobilePageShell title="Following" onBack={isMobile ? goBack : null}>
              <FriendsList />
            </MobilePageShell>
          )} />
          <Route exact path={`${path}/friends/blocklist`} render={() => (
            <MobilePageShell title="Blocked Users" onBack={isMobile ? goBack : null}>
              <BlockList />
            </MobilePageShell>
          )} />
          <Route
            exact
            path={`${path}`}
            render={() => (
              <div className="messenger-empty">
                <div className="messenger-empty-icon">💬</div>
                <h4>Your messages</h4>
                <p>Select a conversation or start a new one.</p>
              </div>
            )}
          />
        </Switch>
      </div>

    </div>
  );
};

const mapStateToProps = (state) => ({ auth: state.auth });
export default connect(mapStateToProps)(Messenger);