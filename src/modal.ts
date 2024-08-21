function showModalSync(text: string, buttons: {[key: string]: () => void}): void {
  const modalBg = document.createElement("div");
  modalBg.classList.add("modal-bg");
  const modalWindow = document.createElement("div");
  modalWindow.classList.add("modal");
  modalWindow.innerHTML = text;
  const buttonPanel = document.createElement("div");
  buttonPanel.classList.add("buttonPanel");
  for (const caption in buttons) {
    const callback = buttons[caption];
    const closeButton = document.createElement("button");
    closeButton.innerText = caption;
    closeButton.addEventListener("click", () => {
      modalBg.remove();
      if (callback !== null) callback();
    });
    buttonPanel.appendChild(closeButton);
  }
  modalWindow.appendChild(buttonPanel);
  modalBg.appendChild(modalWindow);
  document.body.appendChild(modalBg);
}

export default async function showModal<T>(text: string, buttons: {[key: string]: () => T}): Promise<T> {
  return new Promise((resolve) => {
    const newButtons: {[key: string]: () => void} = {};
    for (const caption in buttons) {
      newButtons[caption] = () => resolve(buttons[caption]());
    }
    showModalSync(text, newButtons);
  });
}
