export default class EditorWindow{
	constructor(){
		this.el = document.createElement("div");
	}

	setRoot(){
		this.el.classList.add("editorWindowRoot");
	}

	updateEls(){}
}
