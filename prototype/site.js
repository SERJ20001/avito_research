const app = document.querySelector("[data-app]");
const panels = [...document.querySelectorAll("[data-panel]")];
const sheetBackdrop = document.querySelector("[data-sheet-backdrop]");
const levelSheet = document.querySelector(".level-sheet");
const sheetScroll = document.querySelector("[data-sheet-scroll]");
const discountsScroll = document.querySelector('[data-scroll="discounts"]');
const stickyPanel = document.querySelector(".screen-discounts");
const stickyHeader = document.querySelector("[data-sticky-header]");
const carousels = [...document.querySelectorAll(".carousel")];
const verticalScrollContainers = [...document.querySelectorAll(".screen-scroll, .sheet-scroll")];
let sheetCloseTimer = null;
let lazyWarmupStarted = false;

if (new URLSearchParams(window.location.search).has("debug")) {
  document.body.classList.add("is-debug");
}

function syncViewport() {
  const viewport = window.visualViewport;
  const root = document.documentElement;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const screenWidth = Math.min(viewportWidth, 430);
  const appLeft = viewportLeft + Math.max((viewportWidth - screenWidth) / 2, 0);

  root.style.setProperty("--viewport-left", `${viewportLeft}px`);
  root.style.setProperty("--viewport-top", `${viewportTop}px`);
  root.style.setProperty("--viewport-width", `${viewportWidth}px`);
  root.style.setProperty("--viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--app-left", `${appLeft}px`);
  root.style.setProperty("--screen-width", `${screenWidth}px`);
  root.style.setProperty("--screen-scale", `${screenWidth / 375}`);

  updateStickyHeader();
  updateSheetFixedParts();
}

function hydrateImage(image) {
  if (!image.dataset.src) {
    return image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  if (image.dataset.loadingPromise === "true") {
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  image.dataset.loadingPromise = "true";

  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
  });
}

function hydrateImages(root) {
  return Promise.all([...root.querySelectorAll("img")].map(hydrateImage));
}

function warmLazyImages() {
  if (lazyWarmupStarted) {
    return;
  }

  lazyWarmupStarted = true;

  [...document.querySelectorAll("img[data-src]")].reduce(
    (chain, image) => chain.then(() => hydrateImage(image)),
    Promise.resolve(),
  );
}

async function setScreen(screen) {
  const targetPanel = panels.find((panel) => panel.dataset.panel === screen);

  if (!targetPanel) {
    return;
  }

  await hydrateImages(targetPanel);
  app.dataset.screen = screen;
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === screen);
    panel.querySelector(".screen-scroll")?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  carousels.forEach((carousel) => {
    carousel.scrollLeft = 0;
  });
  updateStickyHeader();
}

function logicalPx(value) {
  return value * (app.getBoundingClientRect().width / 375);
}

async function openSheet() {
  await hydrateImages(sheetBackdrop);
  window.clearTimeout(sheetCloseTimer);
  sheetBackdrop.classList.add("is-visible");
  levelSheet.classList.remove("is-scrolled");
  sheetBackdrop.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-sheet-open");
  sheetScroll.scrollTop = 0;
  window.requestAnimationFrame(() => {
    sheetBackdrop.classList.add("is-open");
  });
}

function closeSheet() {
  sheetBackdrop.classList.remove("is-open");
  document.body.classList.remove("is-sheet-open");
  sheetCloseTimer = window.setTimeout(() => {
    sheetBackdrop.classList.remove("is-visible");
    sheetBackdrop.setAttribute("aria-hidden", "true");
  }, 260);
}

function updateStickyHeader() {
  const isDiscounts = app.dataset.screen === "discounts";
  const shouldShow = isDiscounts && discountsScroll.scrollTop >= logicalPx(70);

  stickyPanel.classList.toggle("has-sticky", shouldShow);
  stickyHeader.setAttribute("aria-hidden", String(!shouldShow));
}

function updateSheetFixedParts() {
  levelSheet.classList.toggle("is-scrolled", sheetScroll.scrollTop > logicalPx(48));
}

function installRubberBandGuard(scrollable) {
  let lastX = 0;
  let lastY = 0;

  scrollable.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];

      lastX = touch.clientX;
      lastY = touch.clientY;
    },
    { passive: true },
  );

  scrollable.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - lastX;
      const deltaY = touch.clientY - lastY;

      lastX = touch.clientX;
      lastY = touch.clientY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return;
      }

      const maxScrollTop = scrollable.scrollHeight - scrollable.clientHeight;

      if (maxScrollTop <= 0) {
        event.preventDefault();
        return;
      }

      const isAtTop = scrollable.scrollTop <= 0;
      const isAtBottom = scrollable.scrollTop >= maxScrollTop - 1;
      const pullsPastTop = isAtTop && deltaY > 0;
      const pullsPastBottom = isAtBottom && deltaY < 0;

      if (pullsPastTop || pullsPastBottom) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "discounts") {
    setScreen("discounts");
  }

  if (action === "list") {
    setScreen("list");
  }

  if (action === "level") {
    openSheet();
  }

  if (action === "close-sheet") {
    closeSheet();
  }
});

sheetBackdrop.addEventListener("click", (event) => {
  if (event.target === sheetBackdrop) {
    closeSheet();
  }
});

window.addEventListener("resize", syncViewport);
window.visualViewport?.addEventListener("resize", syncViewport);
window.visualViewport?.addEventListener("scroll", syncViewport);
discountsScroll.addEventListener("scroll", updateStickyHeader, { passive: true });
sheetScroll.addEventListener("scroll", updateSheetFixedParts, { passive: true });
verticalScrollContainers.forEach(installRubberBandGuard);
syncViewport();
hydrateImages(document.querySelector(".screen-list")).then(warmLazyImages);
