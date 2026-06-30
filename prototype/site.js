const range = document.querySelector("[data-discount-range]");
const valueOutput = document.querySelector("[data-discount-value]");
const message = document.querySelector("[data-discount-message]");
const saveButton = document.querySelector("[data-save-button]");
const clearButton = document.querySelector(".clear-button");
const rangeShell = document.querySelector(".range-shell");
const rangeTrack = document.querySelector(".range-track");
const buyers = [...document.querySelectorAll("[data-buyer]")];
const page = document.querySelector(".page");

const limits = {
  min: Number(range.min),
  max: Number(range.max)
};

const modalSize = {
  width: 655,
  height: 971
};

const layout = {
  contentTop: 36,
  footerHeight: 104,
  viewportGap: 20
};

const track = {
  left: 18,
  width: 539
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("ru-RU");
}

function formatMoney(value) {
  return `${formatNumber(value)} ₽`;
}

function getTone(value) {
  if (value <= 400) {
    return {
      background: "#e0f5ff",
      title: "Хорошая скидка!",
      text: `Для 80% покупателей доставка будет 0₽. Остальным скидка ${formatMoney(value)}`,
      color: "#0aa9f4"
    };
  }

  return {
    background: "#dcffd7",
    title: "Отличная скидка!",
    text: "Для большинства покупателей доставка будет бесплатной",
    color: "#10c766"
  };
}

function updateBuyer(card, discount) {
  const basePrice = Number(card.dataset.basePrice);
  const payment = Math.max(0, basePrice - discount);
  const deduction = Math.min(basePrice, discount);
  const price = card.querySelector("[data-pay-price]");
  const deduct = card.querySelector("[data-deduct-price]");

  price.classList.toggle("is-free", payment === 0);
  price.replaceChildren(
    document.createTextNode(formatMoney(payment)),
    Object.assign(document.createElement("span"), {
      className: "old-price",
      textContent: formatMoney(basePrice)
    })
  );
  deduct.textContent = formatMoney(deduction);
}

function updateDiscount() {
  const discount = Number(range.value);
  const progress = ((discount - limits.min) / (limits.max - limits.min)) * 100;
  const visualProgress = clamp(progress, 0, 100);
  const thumbLeft = track.left + (track.width * visualProgress) / 100;
  const tone = getTone(discount);

  document.documentElement.style.setProperty("--progress", `${visualProgress}%`);
  document.documentElement.style.setProperty("--thumb-left", `${thumbLeft}px`);
  document.documentElement.style.setProperty("--blue", tone.color);
  valueOutput.textContent = formatMoney(discount);
  message.style.background = tone.background;
  message.querySelector("strong").textContent = tone.title;
  message.querySelector("span").textContent = tone.text;
  saveButton.textContent = `Сохранить скидку ${formatMoney(discount)}`;
  buyers.forEach((card) => updateBuyer(card, discount));
}

function setRangeValue(value) {
  const step = Number(range.step) || 1;
  const steppedValue = limits.min + Math.round((value - limits.min) / step) * step;

  range.value = String(clamp(steppedValue, limits.min, limits.max));
  updateDiscount();
}

function setRangeFromPointer(event) {
  const rect = rangeTrack.getBoundingClientRect();
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);

  setRangeValue(limits.min + ratio * (limits.max - limits.min));
}

range.addEventListener("input", updateDiscount);
rangeShell.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  rangeShell.setPointerCapture(event.pointerId);
  setRangeFromPointer(event);
});
rangeShell.addEventListener("pointermove", (event) => {
  if (rangeShell.hasPointerCapture(event.pointerId)) {
    setRangeFromPointer(event);
  }
});
rangeShell.addEventListener("pointerup", (event) => {
  if (rangeShell.hasPointerCapture(event.pointerId)) {
    rangeShell.releasePointerCapture(event.pointerId);
  }
});
rangeShell.addEventListener("pointercancel", (event) => {
  if (rangeShell.hasPointerCapture(event.pointerId)) {
    rangeShell.releasePointerCapture(event.pointerId);
  }
});
clearButton.addEventListener("click", () => {
  setRangeValue(limits.min);
});

function updateModalScale() {
  const viewport = window.visualViewport || window;
  const viewportWidth = viewport.width || window.innerWidth;
  const viewportHeight = viewport.height || window.innerHeight;
  const modalTop = viewportWidth >= 900 && viewportHeight >= 1100 ? 146 : layout.viewportGap;
  const widthScale = (viewportWidth - 32) / modalSize.width;
  const heightScale = (viewportHeight - modalTop - layout.viewportGap) / modalSize.height;
  const scale = Math.min(1, widthScale, heightScale);
  const scaledWidth = modalSize.width * scale;
  const scaledHeight = modalSize.height * scale;
  const modalLeft = Math.max(16, (viewportWidth - scaledWidth) / 2);

  document.documentElement.style.setProperty("--modal-scale", String(scale));
  document.documentElement.style.setProperty("--modal-left", `${modalLeft}px`);
  document.documentElement.style.setProperty("--modal-top", `${modalTop}px`);
  document.documentElement.style.setProperty("--modal-height", `${modalSize.height}px`);
  document.documentElement.style.setProperty("--content-height", `${modalSize.height - layout.footerHeight - layout.contentTop}px`);
  page.style.minHeight = `${Math.max(viewportHeight, scaledHeight + modalTop + layout.viewportGap)}px`;
}

window.addEventListener("resize", updateModalScale);
window.visualViewport?.addEventListener("resize", updateModalScale);
window.visualViewport?.addEventListener("scroll", updateModalScale);

updateModalScale();
updateDiscount();
