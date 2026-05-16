import { useMemo, useState } from "react";
import {
  Camera,
  Download,
  Grid3X3,
  ImagePlus,
  Images,
  Lock,
  LogOut,
  Sparkles,
  Trash2,
} from "lucide-react";
import "./App.css";

const PRIVATE_USERS = [
  {
    username: "photobooth",
    password: "album123",
    role: "viewer",
    label: "Viewer",
  },
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    label: "Admin",
  },
];

const savedSession = JSON.parse(sessionStorage.getItem("photoboothSession") || "null");
const savedPhotos = JSON.parse(localStorage.getItem("photoboothPhotos") || "[]");

const albumStyles = [
  { id: "gallery", label: "Gallery", icon: Grid3X3 },
  { id: "polaroid", label: "Polaroid", icon: Camera },
  { id: "film", label: "Film Strip", icon: Images },
];

function App() {
  const [session, setSession] = useState(savedSession);
  const [loginError, setLoginError] = useState("");
  const [photos, setPhotos] = useState(savedPhotos);
  const [albumStyle, setAlbumStyle] = useState("gallery");
  const [albumTitle, setAlbumTitle] = useState("Private Memory Booth");

  const coverPhoto = photos[0]?.src;

  const albumStats = useMemo(() => {
    const count = photos.length;
    return {
      count,
      label: count === 1 ? "1 photo" : `${count} photos`,
    };
  }, [photos.length]);

  function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get("username")?.trim();
    const password = formData.get("password")?.trim();

    const matchedUser = PRIVATE_USERS.find(
      (user) => user.username === username && user.password === password,
    );

    if (matchedUser) {
      const nextSession = { role: matchedUser.role, label: matchedUser.label };
      sessionStorage.setItem("photoboothSession", JSON.stringify(nextSession));
      setSession(nextSession);
      setLoginError("");
      return;
    }

    setLoginError("Wrong username or password.");
  }

  function handleLogout() {
    sessionStorage.removeItem("photoboothSession");
    setSession(null);
  }

  function handleFiles(event) {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    Promise.all(
      files.map(
        (file, index) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `${file.name}-${file.lastModified}-${index}`,
                name: file.name,
                src: reader.result,
                caption: makeCaption(file.name),
              });
            };
            reader.readAsDataURL(file);
          }),
      ),
    ).then((nextPhotos) => {
      setPhotos((currentPhotos) => {
        const updatedPhotos = [...currentPhotos, ...nextPhotos];
        localStorage.setItem("photoboothPhotos", JSON.stringify(updatedPhotos));
        return updatedPhotos;
      });
    });

    event.target.value = "";
  }

  function updateCaption(photoId, caption) {
    setPhotos((currentPhotos) => {
      const updatedPhotos = currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, caption } : photo,
      );
      localStorage.setItem("photoboothPhotos", JSON.stringify(updatedPhotos));
      return updatedPhotos;
    });
  }

  function removePhoto(photoId) {
    setPhotos((currentPhotos) => {
      const updatedPhotos = currentPhotos.filter((item) => item.id !== photoId);
      localStorage.setItem("photoboothPhotos", JSON.stringify(updatedPhotos));
      return updatedPhotos;
    });
  }

  function clearAlbum() {
    setPhotos([]);
    localStorage.removeItem("photoboothPhotos");
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  const isAdmin = session.role === "admin";

  return (
    <div className="photobooth-app">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-icon">
            <Camera size={24} />
          </span>
          <div>
            <strong>PhotoBooth Vault</strong>
            <span>{session.label} access</span>
          </div>
        </div>

        <button className="ghost-button" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <main className="studio-shell">
        <section className="studio-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Lock size={15} />
              {isAdmin ? "Admin workspace" : "Private viewer"}
            </span>
            <input
              className="title-input"
              value={albumTitle}
              onChange={(event) => setAlbumTitle(event.target.value)}
              aria-label="Album title"
              readOnly={!isAdmin}
            />
            <p>
              {isAdmin
                ? "Add photos manually and arrange them into a private styled album."
                : "View the private album and download the photos you want to keep."}
            </p>
          </div>

          <div
            className="cover-preview"
            style={coverPhoto ? { backgroundImage: `url(${coverPhoto})` } : undefined}
          >
            {!coverPhoto && (
              <div>
                <Sparkles size={34} />
                <span>Your first image becomes the cover</span>
              </div>
            )}
          </div>
        </section>

        <section className={`control-panel ${isAdmin ? "" : "viewer-panel"}`} aria-label="Album controls">
          {isAdmin && (
            <label className="upload-zone">
              <ImagePlus size={28} />
              <span>Add Images Manually</span>
              <small>Admin-only upload area</small>
              <input type="file" accept="image/*" multiple onChange={handleFiles} />
            </label>
          )}

          <div className="style-switcher" aria-label="Album style">
            {albumStyles.map((style) => {
              const Icon = style.icon;
              return (
                <button
                  key={style.id}
                  className={albumStyle === style.id ? "active" : ""}
                  onClick={() => setAlbumStyle(style.id)}
                >
                  <Icon size={18} />
                  {style.label}
                </button>
              );
            })}
          </div>

          <div className="album-actions">
            <span>{albumStats.label}</span>
            {isAdmin && (
              <button onClick={clearAlbum} disabled={photos.length === 0}>
                <Trash2 size={17} />
                Clear
              </button>
            )}
          </div>
        </section>

        {photos.length === 0 ? (
          <section className="empty-album">
            <Images size={46} />
            <h2>No private photos added yet</h2>
            <p>Select images from your computer to create your album.</p>
          </section>
        ) : (
          <section className={`album-frame ${albumStyle}`}>
            <div className="album-heading">
              <span>{albumTitle}</span>
              <strong>{albumStats.label}</strong>
            </div>

            <div className="photo-collection">
              {photos.map((photo, index) => (
                <article className="photo-card" key={photo.id}>
                  {isAdmin && (
                    <button
                      className="remove-photo"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={`Remove ${photo.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <img src={photo.src} alt={photo.caption || photo.name} />
                  <div className="caption-row">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <input
                      value={photo.caption}
                      onChange={(event) => updateCaption(photo.id, event.target.value)}
                      aria-label={`Caption for ${photo.name}`}
                      readOnly={!isAdmin}
                    />
                    <a className="download-photo" href={photo.src} download={photo.name}>
                      <Download size={16} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin, error }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-art">
          <Camera size={42} />
          <h1>Private PhotoBooth</h1>
          <p>Login first, then build your personal album from manual image uploads.</p>
        </div>

        <form className="login-card" onSubmit={onLogin}>
          <span className="eyebrow">
            <Lock size={15} />
            Private access
          </span>
          <h2>Enter Vault</h2>
          <label>
            Username
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button">
            <Lock size={18} />
            Unlock Album
          </button>
        </form>
      </section>
    </main>
  );
}

function makeCaption(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default App;
