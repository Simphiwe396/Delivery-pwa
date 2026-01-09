self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("delivery").then(cache =>
      cache.addAll(["/", "/index.html", "/styles.css", "/app.js"])
    )
  );
});
