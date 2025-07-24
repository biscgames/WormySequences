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
        return new Promise(r=>{
                if (buttons.length<1) {
                        confirm("Nothing here!");
                        r(-1);
                        return;
                }
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
                                r(button.name);
                        });
                        newContextMenu.appendChild(buttonElement);
                }
                document.body.appendChild(newContextMenu);
        })
}

const knownAudio = {}
const knownAudioKeys = ()=>{return Object.keys(knownAudio)};
let audioQueue = [];

class Controller {
        modify = "sample";
        values = [];
        state = 0;
        oneValue = false
        constructor(modify,values=[],state=0,oneValue) {
                this.modify = modify;
                this.values = values;
                this.state = state;
                this.oneValue = oneValue;
        }
}
class WInstr {
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
        clone() {
                const myClone = new this.constructor();
                myClone.name = this.name;
                myClone.interface = this.interface.map(controller=>{
                        return new Controller(
                                controller.modify,
                                [...controller.values],
                                controller.state,
                                controller.oneValue
                        );
                });
                myClone.updateFromControllerInterface();
                return myClone
        }
}
class WSampler extends WInstr {
        constructor() {
                super("WSampler",[
                        new Controller("audio",knownAudioKeys()),
                        new Controller("pushToQueue",["Yes","No"])
                ]);
        }
        whenPlayed() {
                if (!knownAudio?.[this.audio]) return;
                if (this.pushToQueue==="Yes") audioQueue.push(new Audio(knownAudio[this.audio].src));
                else {
                        if (!knownAudio[this.audio].ended) {
                                knownAudio[this.audio].pause();
                                knownAudio[this.audio].currentTime = 0;
                        };
                        knownAudio[this.audio].play();
                }
        }
}
class WConsole extends WInstr {
        constructor() {
                super("WConsole",[new Controller("log",[""],0,true)]);
        }
        whenPlayed() {
                console.log(this.log)
        }
}
class WRack {
        constructor(instrument,sequence=new Array(32).fill(false)) {
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
                this.BPM = 120;
        }
}
class Interface {
        instruments = {
                "WSampler": new WSampler(),
                "WConsole": new WConsole()
        };
        constructor(song) {
                this.song = song;
        }
        async selectNewInstrument(x,y,gui) {
                const buttons = Object.entries(this.instruments).map(([index,value])=>{
                        return {
                                name: index,
                                func: ()=>{this.song.channelRack.push(new WRack(value.clone()));}
                        };
                });
                await _createContextMenu(buttons,x,y);
                gui.updateChannelRack();
                this.update$$knownAudio();
        }
        update$$knownAudio() {
                const newKeys = knownAudioKeys();
                this.song.channelRack.flatMap(rack=>rack.instrument.interface).filter(controller=>controller.modify==="audio").forEach(controller=>controller.values = newKeys);
        }

}
class GUI {
        channelRackVerticalContainer = undefined;
        playButton = undefined;
        rewindButton = undefined;
        seekSpan = undefined;
        isPlaying = false;
        playInterval = -1;
        seek = 0;
        constructor(interface_) {
                this.interface = interface_;
        }
        updateChannelRack() {
                if (!this.channelRackVerticalContainer) {warn("Please make sure to define gui.channelRackVerticalContainer");return}
                this.channelRackVerticalContainer.innerHTML = "";
                for (let index in this.interface.song.channelRack) {
                        const f = document.createElement("div");
                        f.classList.add("horizontal-container");

                        const rack = this.interface.song.channelRack[index];

                        const name = document.createElement("span");
                        name.addEventListener("click",async()=>{
                                let selectedController = await _createContextMenu(Object.values(rack.instrument.interface).map(idx=>{
                                        return {
                                                name: idx.modify,
                                                func: ()=>{}
                                        }
                                }));
                                if (selectedController === "Close") return;
                                selectedController = rack.instrument.interface.findIndex(obj => obj.modify === selectedController);
                                if (rack.instrument.interface[selectedController].oneValue) {
                                        rack.instrument.interface[selectedController].values[0] = await prompt("Enter a value!");
                                        this.updateChannelRack();
                                        rack.instrument.updateFromControllerInterface()
                                        return;
                                }
                                let selectedModify = await _createContextMenu(rack.instrument.interface[selectedController].values.map(value=>{
                                        return {
                                                name: value,
                                                func: ()=>{}
                                        }
                                }));
                                if (selectedModify === "Close") return;
                                selectedModify = rack.instrument.interface[selectedController].values.indexOf(selectedModify);
                                rack.instrument.interface[selectedController].state = selectedModify;
                                rack.instrument.updateFromControllerInterface();
                                this.updateChannelRack();
                        })

                        name.textContent = rack.instrument.name;
                        f.appendChild(name);
                        for (let i in rack.sequence) {
                                const b = document.createElement("button");
                                b.style.border = "none";
                                b.style.backgroundColor = this.seek===i?"#FFFFFF":"#abababff";
                                b.textContent = rack.sequence[i]?"X":"O";

                                let temp = i;
                                b.addEventListener("click",()=>{
                                        rack.sequence[temp] = !rack.sequence[temp];
                                        this.updateChannelRack();
                                });
                                f.appendChild(b);
                        }
                        this.channelRackVerticalContainer.appendChild(f);
                }
        }
        updateButtons() {
                if (!this.playButton) {warn("Please make sure to define gui.playButton");return}
                this.playButton.addEventListener("click",()=>{
                        this.isPlaying = !this.isPlaying;
                        this.playButton.src = this.isPlaying?"pause.png":"play.png";

                        if (!this.isPlaying) {
                                clearInterval(this.playInterval);
                                return;
                        }
                        this.playInterval = setInterval(()=>{
                                for (let rack of this.interface.song.channelRack) {
                                        if (!rack.sequence[this.seek]) continue;
                                        rack.instrument.whenPlayed();
                                }
                                while (audioQueue.length > 0) {
                                        audioQueue[0].play();
                                        audioQueue[0].remove();
                                        audioQueue.shift();
                                }
                                this.seek = (this.seek+1)%32;
                                this.seekSpan.textContent = "Step "+this.seek;
                        },((60/this.interface.song.BPM)/4)*1000)
                });
                this.rewindButton.addEventListener("click",()=>{
                        this.seek = 0;
                        this.seekSpan.textContent = "Step "+this.seek;
                })
        }
}
let song = new Song();
let interface_ = new Interface(song);
let gui = new GUI(interface_);


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
document.querySelector("#sounds").addEventListener("click",async(e)=>{
        let x = e.clientX;
        let y = e.clientY;
        document.querySelector("#sounds").style.animation = "context-menu-button-click 200ms";
        document.querySelector("#sounds").addEventListener("animationend",function(){this.style.animation=""},{once:true})
        await _createContextMenu([
                {
                        name: "Import Sound",
                        func: async()=>{
                                const f = document.createElement("input");
                                f.type = "file";
                                f.click();
                                f.addEventListener("change",e=>{
                                        const files = e.target.files;
                                        for (let file of files) {
                                                const url = URL.createObjectURL(file);
                                                const audio = new Audio(url);
                                                knownAudio[file.name] = audio;
                                        }
                                        interface_.update$$knownAudio();
                                        gui.updateChannelRack();
                                });
                                f.remove();
                        }
                },
                {
                        name: "Review Sound List",
                        func: async()=>{
                                let arr = [];
                                for (i in knownAudio) {
                                        arr.push(`${i} (${knownAudio[i].src})`);
                                }
                                await confirm(arr.toString());
                        }
                },
                {
                        name: "Remove Sound",
                        func: async()=>{
                                let selectedSound = await _createContextMenu(Object.keys(knownAudio).map(key=>{return {name:key,func:()=>{}}}));
                                if (selectedSound === "Close") return;
                                delete knownAudio[selectedSound];
                                interface_.update$$knownAudio();
                        }
                }
        ],x,y);
})
document.querySelector("#newInstrument").addEventListener("click",e=>{
        let x = e.clientX;
        let y = e.clientY;
        document.querySelector("#newInstrument").style.animation = "context-menu-button-click 200ms";
        document.querySelector("#newInstrument").addEventListener("animationend",function(){this.style.animation=""},{once:true})
        interface_.selectNewInstrument(x,y,gui);
})

gui.channelRackVerticalContainer = document.querySelector("#channelRack");
gui.playButton = document.querySelector("#play");
gui.rewindButton = document.querySelector("#rewind");
gui.seekSpan = document.querySelector("#seek");
gui.updateButtons();

if (!document.querySelector("#contextMenu").content) {
        document.body.innerHTML = "";
        const err = document.createElement("span");
        err.textContent = "Please use a browser that supports templates, thanks!";
        document.body.appendChild(err);
}