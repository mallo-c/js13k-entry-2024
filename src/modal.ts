function showModalSync(text: string, buttons: {[key: string]: (()=>void)}): void {
    let modalBg = document.createElement("div");
    modalBg.classList.add("modal-bg");
    let modalWindow = document.createElement("div");
    modalWindow.classList.add("modal")
    modalWindow.innerHTML = text;
    let buttonPanel = document.createElement("div");
    buttonPanel.classList.add("buttonPanel")
    for (let caption in buttons) {
        let callback = buttons[caption];
        let closeButton = document.createElement("button");
        closeButton.innerText = caption;
        closeButton.addEventListener("click", ()=>{
            modalBg.remove();
            if (callback !== null) callback();
        });
        buttonPanel.appendChild(closeButton);
    }
    modalWindow.appendChild(buttonPanel);
    modalBg.appendChild(modalWindow);
    document.body.appendChild(modalBg);
}
export default async function showModal<T>(text: string, buttons: {[key: string]: ()=>T}): Promise<T> {
    return new Promise((resolve)=>{
        let newButtons: {[key: string]: ()=>void} = {};
        for (let caption in buttons) {
            newButtons[caption] = ()=>resolve(buttons[caption]());
        }
        showModalSync(text, newButtons);
    });
}