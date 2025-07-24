function openDialog(text,id="dialog") {
        const dialogTemplate = document.getElementById(id).content;
        const newDialogMenu = dialogTemplate.querySelector(".dialog").cloneNode(true);

        newDialogMenu.querySelector("#title").textContent = text;
        document.body.appendChild(newDialogMenu);

        const rect = newDialogMenu.getBoundingClientRect();
        newDialogMenu.style.left = ((window.innerWidth-rect.width)/2)+"px";
        newDialogMenu.style.top = ((window.innerHeight-rect.height)/2)+"px";

        const okButton = newDialogMenu.querySelector("#ok");
        const cancelButton = newDialogMenu.querySelector("#cancel");

        return {newDialogMenu:newDialogMenu,okButton:okButton,cancelButton:cancelButton}
}
function confirm(text) {
        const {newDialogMenu,okButton,cancelButton} = openDialog(text);

        return new Promise(r=>{
                function exitDialog() {
                        newDialogMenu.style.animation = "context-menu-hide 200ms";
                        newDialogMenu.addEventListener("animationend",()=>{newDialogMenu.remove()},{once:true});
                        okButton.onclick = null;
                        cancelButton.onclick = null;
                }
                okButton.onclick = ()=>{
                        okButton.style.animation = "context-menu-button-click 200ms";
                        exitDialog();
                        r(true);
                };
                cancelButton.onclick = ()=>{
                        cancelButton.style.animation = "context-menu-button-click 200ms";
                        exitDialog();
                        r(false);
                };
        })
}
function prompt(text) {
        const {newDialogMenu,okButton,cancelButton} = openDialog(text,"prompt");
        const editText = newDialogMenu.querySelector("input");
        editText.focus();

        return new Promise(r=>{
                function exitDialog() {
                        newDialogMenu.style.animation = "context-menu-hide 200ms";
                        newDialogMenu.addEventListener("animationend",()=>{newDialogMenu.remove()},{once:true});
                        okButton.onclick = null;
                        cancelButton.onclick = null;
                }
                okButton.onclick = ()=>{
                        okButton.style.animation = "context-menu-button-click 200ms";
                        exitDialog();
                        r(editText.value);
                };
                editText.addEventListener("keydown",e=>{
                        if (e.code !== "Enter") return;
                        okButton.style.animation = "context-menu-button-click 200ms";
                        exitDialog();
                        r(editText.value);
                });
                cancelButton.onclick = ()=>{
                        cancelButton.style.animation = "context-menu-button-click 200ms";
                        exitDialog();
                        r("");
                };
        })
}
function _createContextMenu(buttons=[
        {
                name: "I am a button!",
                func: ()=>{console.log("Hello, World!")}
        }
],x,y) {
        const contextMenuTemplate = document.getElementById("contextMenu").content;
        const contextMenuButtonTemplate = document.getElementById("contextMenuButton").content;

        const newContextMenu = contextMenuTemplate.querySelector(".context-menu").cloneNode(true);
        newContextMenu.style.position = "fixed";
        newContextMenu.style.left = x+"px";
        newContextMenu.style.top = y+"px";

        buttons.push({name:"Close",func:()=>{}});
        for (let button of buttons) {
                const buttonElement = contextMenuButtonTemplate.querySelector(".context-menu-button").cloneNode(true);;
                buttonElement.textContent = button.name;
                buttonElement.addEventListener("click",()=>{
                        buttonElement.style.animation = "context-menu-button-click 200ms";
                        newContextMenu.style.animation = "context-menu-hide 200ms";
                        newContextMenu.addEventListener("animationend",()=>{newContextMenu.remove()},{once:true});
                        button.func();
                });
                newContextMenu.appendChild(buttonElement);
        }
        document.body.appendChild(newContextMenu);
}

class Controller {
        modify = "sample";
        values = [];
        state = 0;
}
class RozInstr {
        constructor(name="Sampler",interface_=[]) {
                this.name = name;
                this.interface = interface_;
                this.updateFromControllerInterface();
        }
        updateFromControllerInterface() {
                for (let controller of this.interface) {
                        this[controller.modify] = controller.values?.[controller.state]??this[controller.modify];
                }
        }
}
class RozRack {
        constructor(instrument,sequence=new Array(16).fill(false)) {
                this.instrument = instrument;
                this.sequence = sequence;
                this.settings = {
                        cutItself: false
                }
        }
}
class Song {
        constructor(name="Unnamed Project") {
                this.name = name;
                this.channelRack = [];
        }
}
let song = new Song();

document.querySelector("#project").textContent = song.name+" ...";
document.querySelector("#project").addEventListener("click",e=>{
        let x = e.clientX;
        let y = e.clientY;
        document.querySelector("#project").style.animation = "context-menu-button-click 200ms";
        document.querySelector("#project").addEventListener("animationend",function(){this.style.animation=""},{once:true})
        _createContextMenu([
                {
                        name: "New Project",
                        func: async()=>{
                                if (!await confirm("Are you sure? Doing this will erradicate any unsaved work!")) return;
                                location.reload();
                        }
                },
                {
                        name: "Open Project",
                        func: async()=>{
                                if (!await confirm("Are you sure? Doing this will erradicate any unsaved work for the other project!")) return;
                                location.reload();
                        }
                },
                {
                        name: "Rename Project",
                        func: async()=>{
                                const input = await prompt("New name:");
                                song.name = input!==""?input:song.name;
                                document.querySelector("#project").textContent = song.name+" ...";
                        }
                }
        ],x,y);
});

if (!document.querySelector("#contextMenu").content) {
        document.body.innerHTML = "";
        const err = document.createElement("span");
        err.textContent = "Please use a browser that supports templates, thanks!";
        document.body.appendChild(err);
}