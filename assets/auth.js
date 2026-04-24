const AUTH_USERS_KEY = "rankforge-auth-users-v1";
const AUTH_SESSION_KEY = "rankforge-auth-session-v1";
const CURRENT_USER_STORAGE_KEY = "rankforge-current-user-id-v1";

function authNormalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function authSlugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "user";
}

function authLoadUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function authSaveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function authLoadSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function authSaveSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, session.userId);
}

function authSeedUsers() {
  const users = authLoadUsers();
  if (users.length) return;
  authSaveUsers([
    {
      id: "usr_demo_owner",
      fullName: "Demo Owner",
      agencyName: "RankForge Demo",
      email: "demo@rankforge.app",
      password: "rankforge123",
      createdAt: new Date().toISOString(),
    },
  ]);
}

function authGetNextUrl() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next || "../dashboard/";
}

function authGetProvider() {
  return {
    name: "local",
    getSession: authLoadSession,
    signOut() {
      authSaveSession(null);
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    },
    signIn({ email, password }) {
      const users = authLoadUsers();
      const match = users.find((user) => user.email === authNormalizeEmail(email) && user.password === password);
      if (!match) {
        throw new Error("Email veya sifre hatali.");
      }
      const session = {
        userId: match.id,
        email: match.email,
        fullName: match.fullName,
        agencyName: match.agencyName,
        provider: "local",
        signedInAt: new Date().toISOString(),
      };
      authSaveSession(session);
      return session;
    },
    signUp({ fullName, agencyName, email, password }) {
      const normalizedEmail = authNormalizeEmail(email);
      const users = authLoadUsers();
      if (users.some((user) => user.email === normalizedEmail)) {
        throw new Error("Bu email ile zaten bir hesap var.");
      }
      const newUser = {
        id: `usr_${authSlugify(normalizedEmail.split("@")[0])}_${Date.now().toString().slice(-6)}`,
        fullName: String(fullName || "").trim(),
        agencyName: String(agencyName || "").trim(),
        email: normalizedEmail,
        password,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      authSaveUsers(users);
      const session = {
        userId: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        agencyName: newUser.agencyName,
        provider: "local",
        signedInAt: new Date().toISOString(),
      };
      authSaveSession(session);
      return session;
    },
  };
}

function authInjectAccountPanel(session) {
  if (!session || document.getElementById("authAccountPanel")) return;
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  const panel = document.createElement("section");
  panel.className = "sidebar-panel sidebar-panel-auth";
  panel.id = "authAccountPanel";
  panel.innerHTML = `
    <p class="panel-eyebrow">Account</p>
    <h2>${session.agencyName || session.fullName || "Workspace"}</h2>
    <p class="auth-account-copy">${session.email}</p>
    <div class="auth-account-meta">
      <span>${session.userId}</span>
      <span>Authenticated workspace</span>
    </div>
    <button class="button ghost button-block" id="signOutButton" type="button">Sign Out</button>
  `;
  sidebar.appendChild(panel);
  panel.querySelector("#signOutButton")?.addEventListener("click", () => {
    authGetProvider().signOut();
    window.location.href = "../login/";
  });
}

function authHydrateWorkspacePanel(session) {
  const input = document.getElementById("currentUserIdInput");
  if (input) {
    input.value = session?.userId || "";
    input.setAttribute("readonly", "readonly");
  }
  const status = document.getElementById("currentUserStatus");
  if (status && session) {
    status.textContent = `${session.fullName || session.email} | ${session.userId}`;
    status.classList.add("is-success");
  }
}

function authProtectPage() {
  authSeedUsers();
  const provider = authGetProvider();
  const session = provider.getSession();
  const isProtected = document.body?.dataset?.auth === "protected";
  const isAuthPage = document.body?.dataset?.authPage === "true";

  if (isProtected && !session) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`../login/?next=${next}`);
    return;
  }

  if (isAuthPage && session) {
    window.location.replace(authGetNextUrl());
    return;
  }

  if (session) {
    authSaveSession(session);
    authInjectAccountPanel(session);
    authHydrateWorkspacePanel(session);
  }
}

function authBindForms() {
  const provider = authGetProvider();
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const status = document.getElementById("authFormStatus");
    try {
      provider.signIn({
        email: formData.get("email"),
        password: formData.get("password"),
      });
      if (status) {
        status.textContent = "Giris yapildi. Yonetim ekranina gidiliyor...";
        status.className = "auth-form-status is-success";
      }
      window.location.href = authGetNextUrl();
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.className = "auth-form-status is-error";
      }
    }
  });

  signupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const status = document.getElementById("authFormStatus");
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm_password") || "");
    if (password.length < 8) {
      status.textContent = "Sifre en az 8 karakter olmali.";
      status.className = "auth-form-status is-error";
      return;
    }
    if (password !== confirm) {
      status.textContent = "Sifreler eslesmiyor.";
      status.className = "auth-form-status is-error";
      return;
    }
    try {
      provider.signUp({
        fullName: formData.get("full_name"),
        agencyName: formData.get("agency_name"),
        email: formData.get("email"),
        password,
      });
      if (status) {
        status.textContent = "Hesap olusturuldu. Workspace aciliyor...";
        status.className = "auth-form-status is-success";
      }
      window.location.href = authGetNextUrl();
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.className = "auth-form-status is-error";
      }
    }
  });
}

window.rankforgeAuth = {
  provider: "local",
  getSession: authLoadSession,
  signOut: () => authGetProvider().signOut(),
};

authProtectPage();
authBindForms();
