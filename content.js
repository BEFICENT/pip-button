const addPiPButton = (video) => {
  // Avoid adding duplicate buttons
  if (video.parentElement.querySelector(".pip-button")) return;

  // Create the PiP button
  const button = document.createElement("img");

  // Use verified base64-encoded black circular icon
  button.src = "data:image/png;base64,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";
  button.className = "pip-button";

  // Style the button
  button.style.position = "fixed";
  button.style.zIndex = "9999";
  button.style.width = "40px";
  button.style.height = "40px";
  button.style.cursor = "pointer";
  button.style.opacity = "0"; // Initially hidden
  button.style.transition = "opacity 0.3s ease";
  button.style.pointerEvents = "auto";
  button.style.borderRadius = "20%"; // Make it circular

  // Position the button
  const positionButton = () => {
    const rect = video.getBoundingClientRect();
    button.style.top = `${rect.top + rect.height / 2}px`;
    button.style.left = `${rect.left + rect.width / 2}px`;
    button.style.transform = "translate(-50%, -50%)";
  };

  // Show button only on hover
  video.addEventListener("mouseenter", () => {
    if (!document.fullscreenElement) {
      button.style.opacity = "1";
      positionButton(); // Update position on hover
    }
  });

  // Hide button when not hovering
  video.addEventListener("mouseleave", () => {
    button.style.opacity = "0";
  });

  // Hide in fullscreen
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === video) {
      button.style.opacity = "0";
    }
  });

  // Attach PiP functionality
  button.addEventListener("click", () => {
    video.requestPictureInPicture().catch((error) => {
      console.error("PiP failed:", error);
    });
  });

  // Append the button to the body
  document.body.appendChild(button);

  // Ensure the button stays centered when resizing the window
  window.addEventListener("resize", positionButton);
};

// Add PiP buttons to all videos on the page
document.querySelectorAll("video").forEach(addPiPButton);

// Monitor for dynamically added videos
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.tagName === "VIDEO") {
        addPiPButton(node);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
